"""One-line operational logs. Screen text and model replies are not loggable."""

import json

# Long strings are refused so a prompt, OCR blob, or model body cannot be logged
# by passing it as a field.
_MAX_STR = 80
_FORBIDDEN = {
    "ocr",
    "ocr_text",
    "prompt",
    "response",
    "screenshot",
    "image",
    "screen",
    "raw",
    "body",
}


def log_event(event: str, **fields: object) -> None:
    payload: dict[str, object] = {"event": event}
    for key, value in fields.items():
        if key in _FORBIDDEN or not _safe_value(value):
            continue
        payload[key] = value
    print(json.dumps(payload, separators=(",", ":")), flush=True)


def _safe_value(value: object) -> bool:
    if value is None or isinstance(value, (bool, int, float)):
        return True
    if isinstance(value, str):
        return len(value) <= _MAX_STR
    return False
