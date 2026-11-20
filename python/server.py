"""Local capture -> OCR -> classify server. Screenshots never touch disk."""

import hashlib
import hmac
import json
import os
import platform
import sys

from flask import Flask, jsonify, request

from classifier import classify_screen
from safe_log import log_event

SUPPORTED_PYTHON = {(3, 11), (3, 12)}


def python_is_supported(version: tuple[int, int] | None = None) -> bool:
    if version is None:
        version = sys.version_info[:2]
    return version in SUPPORTED_PYTHON


def resolve_tesseract(
    resources_dir: str | None = None,
    platform_name: str | None = None,
) -> dict:
    """Find a bundled Tesseract binary and tessdata, or leave the binary to PATH."""
    system = platform_name or platform.system()
    resources = resources_dir
    if resources is None:
        resources = os.environ.get("FLOWSTATE_RESOURCES_DIR", "")
    resources = resources.strip()

    cmd = _bundled_binary(resources, system)
    explicit = os.environ.get("FLOWSTATE_TESSERACT_CMD", "").strip()
    if explicit and os.path.isfile(explicit):
        cmd = explicit

    tessdata = _tessdata_beside(cmd) or _bundled_tessdata(resources)
    prefix = os.path.dirname(tessdata) if tessdata else None
    return {"cmd": cmd, "tessdata": tessdata, "tessdata_prefix": prefix}


def _binary_names(system: str) -> tuple[str, ...]:
    if system == "Windows":
        return ("tesseract.exe", "tesseract")
    return ("tesseract", "tesseract.exe")


def _bundled_binary(resources: str, system: str) -> str | None:
    if not resources:
        return None
    base = os.path.join(resources, "tesseract")
    for name in _binary_names(system):
        candidate = os.path.join(base, name)
        if os.path.isfile(candidate):
            return candidate
    return None


def _bundled_tessdata(resources: str) -> str | None:
    if not resources:
        return None
    tessdata = os.path.join(resources, "tesseract", "tessdata")
    if os.path.isdir(tessdata):
        return tessdata
    return None


def _tessdata_beside(cmd: str | None) -> str | None:
    if not cmd:
        return None
    tessdata = os.path.join(os.path.dirname(cmd), "tessdata")
    if os.path.isdir(tessdata):
        return tessdata
    return None


def configure_tesseract(
    resources_dir: str | None = None,
    platform_name: str | None = None,
) -> dict:
    resolved = resolve_tesseract(resources_dir, platform_name)
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = resolved["cmd"] or "tesseract"
    if resolved["tessdata_prefix"]:
        os.environ["TESSDATA_PREFIX"] = resolved["tessdata_prefix"]
    return resolved


def real_monitors(monitors: list) -> list:
    """mss puts the combined desktop at index 0. Capture every real display."""
    if len(monitors) > 1:
        return list(monitors[1:])
    return list(monitors)


def capture_from_sct(sct):
    from PIL import Image

    monitors = real_monitors(list(sct.monitors))
    if not monitors:
        raise RuntimeError("no_monitors")
    images = []
    try:
        for mon in monitors:
            raw = sct.grab(mon)
            images.append(Image.frombytes("RGB", raw.size, raw.rgb))
        if len(images) == 1:
            return images.pop()
        width = sum(im.width for im in images)
        height = max(im.height for im in images)
        canvas = Image.new("RGB", (width, height))
        x = 0
        for im in images:
            canvas.paste(im, (x, 0))
            x += im.width
        return canvas
    finally:
        for im in images:
            im.close()


def take_screenshot():
    import mss

    with mss.mss() as sct:
        return capture_from_sct(sct)


def ocr_image(img) -> str:
    import pytesseract

    text = pytesseract.image_to_string(img)
    if not isinstance(text, str):
        return ""
    return text


def tokens_match(expected: str, presented: str) -> bool:
    if not expected or not presented:
        return False
    return hmac.compare_digest(
        hashlib.sha256(expected.encode("utf-8")).digest(),
        hashlib.sha256(presented.encode("utf-8")).digest(),
    )


def presented_token(header: str | None) -> str:
    if not header:
        return ""
    scheme, _, rest = header.partition(" ")
    if scheme.lower() != "bearer":
        return ""
    return rest.strip()


def configured_port() -> int:
    raw = os.environ.get("FLOWSTATE_SIDECAR_PORT", "").strip()
    if not raw:
        return 0
    port = int(raw)
    if port < 0 or port > 65535:
        raise ValueError("bad port")
    return port


def readiness_line(port: int) -> str:
    return json.dumps(
        {"event": "ready", "host": "127.0.0.1", "port": port},
        separators=(",", ":"),
    )


def bind_server(app: Flask, port: int = 0):
    from werkzeug.serving import make_server

    if port < 0 or port > 65535:
        raise ValueError("bad port")
    return make_server("127.0.0.1", port, app, threaded=True)


def _ambiguous() -> dict:
    return {
        "label": "ambiguous",
        "confidence": 0.5,
        "reason": "no match",
        "source": "fallback",
        "fallbackStage": "none",
    }


def create_app(token: str, capture=None, ocr=None, classify=None) -> Flask:
    app = Flask(__name__)
    app.config["SIDECAR_TOKEN"] = token or ""

    def do_capture():
        return (capture or take_screenshot)()

    def do_ocr(img) -> str:
        return (ocr or ocr_image)(img)

    def do_classify(text: str, subjects, todos) -> dict:
        return (classify or classify_screen)(text, subjects, todos)

    @app.before_request
    def require_token():
        if not tokens_match(app.config["SIDECAR_TOKEN"], presented_token(request.headers.get("Authorization"))):
            return jsonify({"error": "unauthorized"}), 401
        return None

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.post("/classify")
    def classify_route():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            payload = {}
        subjects = payload.get("subjects") if isinstance(payload.get("subjects"), list) else []
        todos = payload.get("todos") if isinstance(payload.get("todos"), list) else []
        try:
            img = do_capture()
            try:
                text = do_ocr(img)
            finally:
                closer = getattr(img, "close", None)
                if callable(closer):
                    closer()
            result = do_classify(text, subjects, todos)
        except Exception as exc:
            log_event("capture_failed", error=type(exc).__name__)
            result = _ambiguous()
        log_event(
            "classified",
            label=result.get("label"),
            source=result.get("source"),
            fallbackStage=result.get("fallbackStage"),
        )
        return jsonify(result)

    return app


def main() -> int:
    if not python_is_supported():
        log_event(
            "error",
            error="unsupported_python",
            python=".".join(str(part) for part in sys.version_info[:3]),
        )
        return 1
    token = os.environ.get("FLOWSTATE_SIDECAR_TOKEN", "").strip()
    if not token:
        log_event("error", error="missing_token")
        return 1
    try:
        port = configured_port()
    except ValueError:
        log_event("error", error="bad_port")
        return 1
    configure_tesseract()
    app = create_app(token)
    try:
        httpd = bind_server(app, port)
    except OSError:
        log_event("error", error="bind_failed")
        return 1
    print(readiness_line(httpd.server_port), flush=True)
    try:
        httpd.serve_forever()
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
