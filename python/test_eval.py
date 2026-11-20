import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from eval.run_eval import (
    accuracy,
    confusion_matrix,
    evaluate,
    format_report,
    latency_stats,
    load_dataset,
    main,
    percentile,
    validate_dataset,
)


class DatasetTests(unittest.TestCase):
    def test_shipped_dataset_is_synthetic_and_balanced(self):
        rows = load_dataset()
        problems = validate_dataset(rows)
        self.assertEqual(problems, [])
        self.assertGreaterEqual(len(rows), 120)
        labels = {row["expected_label"] for row in rows}
        self.assertEqual(labels, {"on_task", "off_task", "ambiguous"})
        injection = [row for row in rows if row["category"] == "prompt-injection"]
        self.assertGreaterEqual(len(injection), 8)
        for row in injection:
            self.assertNotEqual(row["expected_label"], "on_task")
            lowered = row["ocr_text"].lower()
            self.assertIn("on_task", lowered)
            self.assertTrue(
                "ignore" in lowered or "instruction" in lowered or "system:" in lowered or "label=" in lowered
            )
        categories = {row["category"] for row in rows}
        for required in (
            "study-coding",
            "study-math",
            "off-social",
            "off-gaming",
            "off-streaming",
            "off-shopping",
            "ambiguous-edu-video",
            "ambiguous-chat",
            "ambiguous-music",
            "ambiguous-email",
            "ambiguous-desktop",
            "ambiguous-research",
            "prompt-injection",
        ):
            self.assertIn(required, categories)


class MetricTests(unittest.TestCase):
    def test_accuracy_confusion_and_latency(self):
        rows = [
            {"expected": "on_task", "predicted": "on_task"},
            {"expected": "on_task", "predicted": "off_task"},
            {"expected": "off_task", "predicted": "off_task"},
            {"expected": "ambiguous", "predicted": "on_task"},
        ]
        self.assertEqual(accuracy(rows), 0.5)
        matrix = confusion_matrix(rows)
        self.assertEqual(matrix["on_task"]["on_task"], 1)
        self.assertEqual(matrix["on_task"]["off_task"], 1)
        self.assertEqual(matrix["off_task"]["off_task"], 1)
        self.assertEqual(matrix["ambiguous"]["on_task"], 1)
        self.assertEqual(sum(sum(row.values()) for row in matrix.values()), 4)

        samples = [10.0, 20.0, 30.0, 40.0, 100.0]
        stats = latency_stats(samples)
        self.assertEqual(stats["mean"], 40.0)
        self.assertEqual(stats["p50"], 30.0)
        self.assertEqual(stats["max"], 100.0)
        self.assertAlmostEqual(stats["p95"], percentile(samples, 95))
        self.assertAlmostEqual(percentile(samples, 95), 88.0)

    def test_fallback_only_runs_the_real_classifier_without_ollama(self):
        rows = load_dataset()
        summary = evaluate(rows, fallback_only=True, timeout=1.0)
        self.assertEqual(summary["model"], "fallback")
        self.assertEqual(summary["n"], len(rows))
        self.assertEqual(summary["fallback_rate"], 1.0)
        self.assertGreaterEqual(summary["accuracy"], 0.0)
        self.assertLessEqual(summary["accuracy"], 1.0)
        self.assertEqual(
            sum(sum(row.values()) for row in summary["confusion"].values()),
            len(rows),
        )
        by_id = {item["id"]: item for item in summary["examples"]}
        self.assertEqual(by_id["off-015"]["predicted"], "off_task")
        self.assertEqual(by_id["on-009"]["predicted"], "on_task")
        self.assertEqual(by_id["amb-026"]["predicted"], "ambiguous")
        self.assertEqual(by_id["inj-001"]["predicted"], "off_task")
        self.assertEqual(by_id["inj-001"]["source"], "fallback")
        self.assertGreater(summary["latency_ms"]["max"], 0.0)
        text = format_report(summary)
        self.assertIn("model: fallback", text)
        self.assertIn("prompt_injection:", text)
        self.assertNotIn("netflix", text)

    def test_cli_fallback_only_writes_json(self):
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder) / "report.json"
            buffer = io.StringIO()
            with redirect_stdout(buffer):
                code = main(["--fallback-only", "--out", str(out)])
            self.assertEqual(code, 0)
            self.assertIn("model: fallback", buffer.getvalue())
            saved = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(saved["model"], "fallback")
            self.assertGreaterEqual(saved["n"], 120)
            self.assertEqual(saved["fallback_rate"], 1.0)


if __name__ == "__main__":
    unittest.main()
