import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

import server
from classifier import classify_screen

SECRET_OCR = "UNIQUE_OCR_SENTINEL"
SECRET_MODEL = "SECRET_MODEL_REPLY"


def _run(fn):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        result = fn()
    return result, out.getvalue(), err.getvalue()


class Shot:
    def __init__(self, width, height, rgb):
        self.size = (width, height)
        self.rgb = bytes(rgb) * (width * height)


class FakeSct:
    def __init__(self, monitors, shots):
        self.monitors = monitors
        self.shots = shots
        self.grabbed = []

    def grab(self, mon):
        self.grabbed.append(mon)
        return self.shots[id(mon)]


class CaptureTests(unittest.TestCase):
    def test_grabs_every_real_monitor_and_does_not_write_a_file(self):
        virtual = {"left": 0, "top": 0, "width": 30, "height": 10}
        left = {"left": 0, "top": 0, "width": 2, "height": 2}
        right = {"left": 2, "top": 0, "width": 1, "height": 2}
        sct = FakeSct(
            [virtual, left, right],
            {id(left): Shot(2, 2, (255, 0, 0)), id(right): Shot(1, 2, (0, 0, 255))},
        )
        before = set(os.listdir("."))
        image = server.capture_from_sct(sct)
        try:
            self.assertEqual(sct.grabbed, [left, right])
            self.assertNotIn(virtual, sct.grabbed)
            self.assertEqual(image.size, (3, 2))
            self.assertEqual(image.getpixel((0, 0)), (255, 0, 0))
            self.assertEqual(image.getpixel((2, 0)), (0, 0, 255))
            self.assertEqual(set(os.listdir(".")), before)
        finally:
            image.close()

    def test_single_monitor_and_empty_list(self):
        only = {"width": 2, "height": 1}
        sct = FakeSct([only], {id(only): Shot(2, 1, (0, 255, 0))})
        image = server.capture_from_sct(sct)
        try:
            self.assertEqual(image.size, (2, 1))
            self.assertEqual(sct.grabbed, [only])
        finally:
            image.close()
        with self.assertRaises(RuntimeError):
            server.capture_from_sct(FakeSct([], {}))


class TesseractPathTests(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.copy()
        os.environ.pop("FLOWSTATE_TESSERACT_CMD", None)
        os.environ.pop("FLOWSTATE_RESOURCES_DIR", None)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_windows_and_mac_layouts_and_path_fallback(self):
        with tempfile.TemporaryDirectory() as root:
            base = os.path.join(root, "tesseract")
            tessdata = os.path.join(base, "tessdata")
            os.makedirs(tessdata)
            exe = os.path.join(base, "tesseract.exe")
            unix = os.path.join(base, "tesseract")
            open(exe, "wb").close()
            open(unix, "wb").close()

            windows = server.resolve_tesseract(root, "Windows")
            mac = server.resolve_tesseract(root, "Darwin")
            self.assertEqual(windows["cmd"], exe)
            self.assertEqual(mac["cmd"], unix)
            self.assertEqual(windows["tessdata"], tessdata)
            self.assertEqual(windows["tessdata_prefix"], base)

            with tempfile.TemporaryDirectory() as empty:
                missing = server.resolve_tesseract(empty, "Darwin")
                self.assertIsNone(missing["cmd"])
                self.assertIsNone(missing["tessdata"])

            explicit = os.path.join(root, "custom-tess")
            open(explicit, "wb").close()
            os.environ["FLOWSTATE_TESSERACT_CMD"] = explicit
            chosen = server.resolve_tesseract(root, "Windows")
            self.assertEqual(chosen["cmd"], explicit)

    def test_configure_points_pytesseract_at_the_bundle(self):
        import pytesseract

        previous_cmd = pytesseract.pytesseract.tesseract_cmd
        previous_prefix = os.environ.get("TESSDATA_PREFIX")
        try:
            with tempfile.TemporaryDirectory() as root:
                base = os.path.join(root, "tesseract")
                os.makedirs(os.path.join(base, "tessdata"))
                binary = os.path.join(base, "tesseract")
                open(binary, "wb").close()
                resolved = server.configure_tesseract(root, "Darwin")
                self.assertEqual(pytesseract.pytesseract.tesseract_cmd, binary)
                self.assertEqual(os.environ["TESSDATA_PREFIX"], base)
                self.assertEqual(resolved["cmd"], binary)
        finally:
            pytesseract.pytesseract.tesseract_cmd = previous_cmd
            if previous_prefix is None:
                os.environ.pop("TESSDATA_PREFIX", None)
            else:
                os.environ["TESSDATA_PREFIX"] = previous_prefix


class AuthAndPortTests(unittest.TestCase):
    def test_every_route_fails_closed_without_a_matching_token(self):
        calls = {"capture": 0}

        def capture():
            calls["capture"] += 1
            raise AssertionError("capture should not run")

        app = server.create_app(token="secret", capture=capture)
        client = app.test_client()
        self.assertEqual(client.get("/health").status_code, 401)
        self.assertEqual(client.get("/health", headers={"Authorization": "Bearer no"}).status_code, 401)
        self.assertEqual(client.get("/health", headers={"Authorization": "secre"}).status_code, 401)
        self.assertEqual(client.post("/classify", json={"subjects": ["Math"]}).status_code, 401)
        self.assertEqual(calls["capture"], 0)
        denied = client.get("/health").get_json()
        self.assertEqual(denied, {"error": "unauthorized"})

        empty = server.create_app(token="")
        self.assertEqual(empty.test_client().get("/health", headers={"Authorization": "Bearer secret"}).status_code, 401)
        self.assertFalse(server.tokens_match("", "secret"))
        self.assertFalse(server.tokens_match("secret", "secret-extra"))
        self.assertTrue(server.tokens_match("secret", "secret"))
        self.assertEqual(server.presented_token("bearer secret"), "secret")

    def test_health_and_classify_contract_discards_the_image_and_hides_screen_text(self):
        class Img:
            def __init__(self):
                self.closed = False

            def close(self):
                self.closed = True

        img = Img()

        def capture():
            return img

        def ocr(image):
            self.assertIs(image, img)
            return SECRET_OCR + " youtube"

        def post(url, json=None, timeout=None):
            raise TimeoutError("down " + SECRET_OCR + " " + SECRET_MODEL)

        def classify(text, subjects, todos):
            return classify_screen(text, subjects, todos, post=post)

        app = server.create_app(token="secret", capture=capture, ocr=ocr, classify=classify)
        client = app.test_client()
        headers = {"Authorization": "Bearer secret"}

        def call():
            health = client.get("/health", headers=headers)
            classified = client.post(
                "/classify",
                headers=headers,
                json={"subjects": ["Math"], "todos": [{"text": "worksheet"}]},
            )
            return health, classified

        (health, classified), out, err = _run(call)
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.get_json(), {"status": "ok"})
        self.assertTrue(img.closed)
        body = classified.get_json()
        self.assertEqual(classified.status_code, 200)
        self.assertEqual(body["label"], "off_task")
        self.assertEqual(body["source"], "fallback")
        self.assertEqual(body["fallbackStage"], "domain")
        self.assertNotIn(SECRET_OCR, json.dumps(body))
        self.assertNotIn(SECRET_MODEL, json.dumps(body))
        self.assertNotIn(SECRET_OCR, out + err)
        self.assertNotIn(SECRET_MODEL, out + err)
        self.assertNotIn("secret", out + err)

    def test_ocr_failure_returns_ambiguous_without_the_exception_text(self):
        class Img:
            def close(self):
                self.closed = True

        img = Img()
        img.closed = False

        def capture():
            return img

        def ocr(image):
            raise RuntimeError("disk write " + SECRET_OCR)

        app = server.create_app(token="secret", capture=capture, ocr=ocr)
        client = app.test_client()

        def call():
            return client.post("/classify", headers={"Authorization": "Bearer secret"})

        response, out, err = _run(call)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["label"], "ambiguous")
        self.assertEqual(response.get_json()["fallbackStage"], "none")
        self.assertTrue(img.closed)
        self.assertNotIn(SECRET_OCR, out + err)
        self.assertIn("capture_failed", out)

    def test_random_port_binds_only_on_loopback(self):
        app = server.create_app(token="secret")
        first = server.bind_server(app, 0)
        second = server.bind_server(app, 0)
        try:
            self.assertEqual(first.server_address[0], "127.0.0.1")
            self.assertEqual(second.server_address[0], "127.0.0.1")
            self.assertGreater(first.server_port, 0)
            self.assertNotEqual(first.server_port, second.server_port)
            line = server.readiness_line(first.server_port)
            self.assertNotIn("\n", line)
            payload = json.loads(line)
            self.assertEqual(payload, {"event": "ready", "host": "127.0.0.1", "port": first.server_port})
        finally:
            first.server_close()
            second.server_close()

    def test_configured_port_and_missing_token_startup(self):
        previous = os.environ.get("FLOWSTATE_SIDECAR_PORT")
        token = os.environ.get("FLOWSTATE_SIDECAR_TOKEN")
        try:
            os.environ["FLOWSTATE_SIDECAR_PORT"] = "8765"
            self.assertEqual(server.configured_port(), 8765)
            os.environ["FLOWSTATE_SIDECAR_PORT"] = "0"
            self.assertEqual(server.configured_port(), 0)
            os.environ.pop("FLOWSTATE_SIDECAR_PORT")
            self.assertEqual(server.configured_port(), 0)
            os.environ["FLOWSTATE_SIDECAR_PORT"] = "nope"
            with self.assertRaises(ValueError):
                server.configured_port()
            os.environ.pop("FLOWSTATE_SIDECAR_PORT", None)
            os.environ.pop("FLOWSTATE_SIDECAR_TOKEN", None)
            code, out, err = _run(server.main)
            self.assertEqual(code, 1)
            self.assertIn("missing_token", out)
            self.assertNotIn("ready", out)
            self.assertNotIn(SECRET_OCR, out + err)
        finally:
            if previous is None:
                os.environ.pop("FLOWSTATE_SIDECAR_PORT", None)
            else:
                os.environ["FLOWSTATE_SIDECAR_PORT"] = previous
            if token is None:
                os.environ.pop("FLOWSTATE_SIDECAR_TOKEN", None)
            else:
                os.environ["FLOWSTATE_SIDECAR_TOKEN"] = token

    def test_python_pin_is_311_or_312(self):
        self.assertTrue(server.python_is_supported((3, 12)))
        self.assertTrue(server.python_is_supported((3, 11)))
        self.assertFalse(server.python_is_supported((3, 14)))
        self.assertFalse(server.python_is_supported((3, 13)))
        self.assertFalse(server.python_is_supported((3, 10)))
        with open(os.path.join(os.path.dirname(__file__), "runtime.txt"), encoding="utf-8") as handle:
            runtime = handle.read().strip()
        self.assertEqual(runtime, "3.12")


if __name__ == "__main__":
    unittest.main()
