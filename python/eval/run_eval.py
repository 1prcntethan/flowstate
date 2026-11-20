"""Score classifier.py against the synthetic dataset.

Uses the real classify_screen path. --fallback-only never calls Ollama.
"""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import sys
import time
from collections import defaultdict
from contextlib import redirect_stdout
from pathlib import Path

_PYTHON_DIR = Path(__file__).resolve().parent.parent
if str(_PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(_PYTHON_DIR))

from classifier import LABELS, classify_screen, normalize_ollama_url  # noqa: E402

DATASET_PATH = Path(__file__).resolve().parent / "dataset.json"
DEFAULT_MODEL = "llama3.2:1b"


def load_dataset(path: Path | None = None) -> list[dict]:
    target = path or DATASET_PATH
    payload = json.loads(target.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        examples = payload.get("examples")
    else:
        examples = payload
    if not isinstance(examples, list):
        raise ValueError("dataset must be a list or an object with examples")
    return examples


def validate_dataset(rows: list[dict]) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    counts = {label: 0 for label in LABELS}
    injection = 0
    for index, row in enumerate(rows):
        prefix = f"row {index}"
        if not isinstance(row, dict):
            errors.append(f"{prefix} is not an object")
            continue
        for field in ("id", "subjects", "todos", "ocr_text", "expected_label", "category"):
            if field not in row:
                errors.append(f"{prefix} missing {field}")
        eid = row.get("id")
        if not isinstance(eid, str) or not eid:
            errors.append(f"{prefix} has an empty id")
        elif eid in seen:
            errors.append(f"duplicate id {eid}")
        else:
            seen.add(eid)
        label = row.get("expected_label")
        if label not in LABELS:
            errors.append(f"{prefix} has label {label!r}")
        else:
            counts[label] += 1
        if not isinstance(row.get("ocr_text"), str) or not row.get("ocr_text").strip():
            errors.append(f"{prefix} has empty ocr_text")
        elif "@" in row["ocr_text"]:
            errors.append(f"{prefix} looks like it contains an email address")
        if not isinstance(row.get("category"), str) or not row["category"].strip():
            errors.append(f"{prefix} has an empty category")
        elif row["category"] == "prompt-injection":
            injection += 1
        subjects = row.get("subjects")
        if not isinstance(subjects, list) or not all(isinstance(item, str) and item.strip() for item in subjects):
            errors.append(f"{prefix} subjects must be non-empty strings")
        todos = row.get("todos")
        if not isinstance(todos, list) or not todos:
            errors.append(f"{prefix} todos must be a non-empty list")
        elif any(not isinstance(item, dict) or not isinstance(item.get("text"), str) or not item["text"].strip() for item in todos):
            errors.append(f"{prefix} todos must be objects with text")
    if len(rows) < 120:
        errors.append(f"expected at least 120 examples, found {len(rows)}")
    if injection < 8:
        errors.append(f"expected at least 8 prompt-injection examples, found {injection}")
    if rows:
        if any(count == 0 for count in counts.values()):
            errors.append(f"missing a label: {counts}")
        elif max(counts.values()) - min(counts.values()) > 4:
            errors.append(f"labels are unbalanced: {counts}")
    return errors


def accuracy(rows: list[dict]) -> float:
    if not rows:
        return 0.0
    correct = sum(1 for row in rows if row["expected"] == row["predicted"])
    return correct / len(rows)


def confusion_matrix(rows: list[dict]) -> dict[str, dict[str, int]]:
    matrix = {expected: {predicted: 0 for predicted in LABELS} for expected in LABELS}
    for row in rows:
        expected = row["expected"]
        predicted = row["predicted"]
        if expected in matrix and predicted in matrix[expected]:
            matrix[expected][predicted] += 1
    return matrix


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return float(ordered[0])
    rank = (len(ordered) - 1) * (pct / 100.0)
    low = math.floor(rank)
    high = math.ceil(rank)
    if low == high:
        return float(ordered[low])
    weight = rank - low
    return float(ordered[low] * (1.0 - weight) + ordered[high] * weight)


def latency_stats(values: list[float]) -> dict[str, float]:
    if not values:
        return {"mean": 0.0, "p50": 0.0, "p95": 0.0, "max": 0.0}
    return {
        "mean": sum(values) / len(values),
        "p50": percentile(values, 50),
        "p95": percentile(values, 95),
        "max": max(values),
    }


def _fallback_post(*_args, **_kwargs):
    raise ConnectionError("fallback-only")


def score_example(example: dict, *, fallback_only: bool, model: str, host: str | None, timeout: float) -> dict:
    previous = os.environ.get("FLOWSTATE_OLLAMA_MODEL")
    os.environ["FLOWSTATE_OLLAMA_MODEL"] = model
    started = time.perf_counter()
    try:
        with redirect_stdout(io.StringIO()):
            if fallback_only:
                result = classify_screen(
                    example["ocr_text"],
                    example["subjects"],
                    example["todos"],
                    post=_fallback_post,
                    timeout=timeout,
                )
            else:
                url = normalize_ollama_url(host) if host else None
                result = classify_screen(
                    example["ocr_text"],
                    example["subjects"],
                    example["todos"],
                    url=url,
                    timeout=timeout,
                )
    finally:
        if previous is None:
            os.environ.pop("FLOWSTATE_OLLAMA_MODEL", None)
        else:
            os.environ["FLOWSTATE_OLLAMA_MODEL"] = previous
    elapsed_ms = (time.perf_counter() - started) * 1000.0
    predicted = result.get("label")
    if predicted not in LABELS:
        predicted = "ambiguous"
    return {
        "id": example["id"],
        "category": example["category"],
        "expected": example["expected_label"],
        "predicted": predicted,
        "source": result.get("source") if result.get("source") in ("ollama", "fallback") else "fallback",
        "fallbackStage": result.get("fallbackStage"),
        "latency_ms": elapsed_ms,
    }


def summarize(scored: list[dict], *, model: str) -> dict:
    categories: dict[str, dict] = {}
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in scored:
        grouped[row["category"]].append(row)
    for category, items in sorted(grouped.items()):
        categories[category] = {
            "n": len(items),
            "correct": sum(1 for item in items if item["expected"] == item["predicted"]),
            "accuracy": accuracy(items),
        }
    injection = grouped.get("prompt-injection", [])
    fooled = sum(
        1
        for item in injection
        if item["predicted"] == "on_task" and item["expected"] != "on_task"
    )
    return {
        "model": model,
        "n": len(scored),
        "accuracy": accuracy(scored),
        "fallback_rate": (
            sum(1 for row in scored if row["source"] == "fallback") / len(scored) if scored else 0.0
        ),
        "confusion": confusion_matrix(scored),
        "categories": categories,
        "prompt_injection": {
            "n": len(injection),
            "resisted": sum(1 for item in injection if item["expected"] == item["predicted"]),
            "fooled_into_on_task": fooled,
        },
        "latency_ms": latency_stats([row["latency_ms"] for row in scored]),
        "examples": scored,
    }


def evaluate(
    rows: list[dict],
    *,
    fallback_only: bool,
    model: str = DEFAULT_MODEL,
    host: str | None = None,
    timeout: float = 20.0,
) -> dict:
    scored = [
        score_example(
            row,
            fallback_only=fallback_only,
            model=model,
            host=host,
            timeout=timeout,
        )
        for row in rows
    ]
    name = "fallback" if fallback_only else model
    return summarize(scored, model=name)


def format_report(summary: dict) -> str:
    latency = summary["latency_ms"]
    lines = [
        f"model: {summary['model']}",
        f"n: {summary['n']}",
        f"accuracy: {summary['accuracy'] * 100:.1f}%",
        f"fallback_rate: {summary['fallback_rate'] * 100:.1f}%",
        (
            "latency_ms: "
            f"mean {latency['mean']:.2f}  "
            f"p50 {latency['p50']:.2f}  "
            f"p95 {latency['p95']:.2f}  "
            f"max {latency['max']:.2f}"
        ),
        "",
        "confusion (rows are expected, columns are predicted)",
        f"{'':16}{'on_task':>10}{'off_task':>10}{'ambiguous':>12}",
    ]
    for expected in LABELS:
        row = summary["confusion"][expected]
        lines.append(
            f"{expected:16}{row['on_task']:10}{row['off_task']:10}{row['ambiguous']:12}"
        )
    lines.append("")
    lines.append("categories")
    for category, stats in summary["categories"].items():
        lines.append(
            f"  {category:24} {stats['correct']}/{stats['n']}  {stats['accuracy'] * 100:.1f}%"
        )
    injection = summary["prompt_injection"]
    lines.append("")
    lines.append(
        "prompt_injection: "
        f"n {injection['n']}  "
        f"resisted {injection['resisted']}  "
        f"fooled_into_on_task {injection['fooled_into_on_task']}"
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate the Flowstate classifier on synthetic OCR text.")
    parser.add_argument("--models", nargs="+", default=[DEFAULT_MODEL], help="Ollama model names. Default llama3.2:1b.")
    parser.add_argument("--ollama-host", default="127.0.0.1:11434", help="OLLAMA_HOST for candidate models.")
    parser.add_argument("--fallback-only", action="store_true", help="Skip Ollama and score the keyword fallback.")
    parser.add_argument("--dataset", type=Path, default=DATASET_PATH)
    parser.add_argument("--out", type=Path, default=None, help="Write JSON results to this path.")
    parser.add_argument("--timeout", type=float, default=20.0, help="Per-check timeout in seconds when calling Ollama.")
    args = parser.parse_args(argv)

    rows = load_dataset(args.dataset)
    problems = validate_dataset(rows)
    if problems:
        for problem in problems:
            print(problem, file=sys.stderr)
        return 1

    if args.fallback_only:
        reports = [evaluate(rows, fallback_only=True, timeout=args.timeout)]
    else:
        reports = [
            evaluate(
                rows,
                fallback_only=False,
                model=model,
                host=args.ollama_host,
                timeout=args.timeout,
            )
            for model in args.models
        ]

    for report in reports:
        print(format_report(report))
        print()
    if args.out:
        args.out.write_text(json.dumps(reports if len(reports) > 1 else reports[0], indent=2) + "\n", encoding="utf-8")
        print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
