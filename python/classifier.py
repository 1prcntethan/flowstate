import re
from urllib import response
import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:1b"


OFF_TASK_KEYWORDS = [
    'youtube', 'netflix', 'twitter', 'instagram', 'tiktok',
    'reddit', 'twitch', 'hulu', 'facebook', 'snapchat',
    'pinterest', 'buzzfeed', 'espn'
]

ON_TASK_KEYWORDS = [
    'notion', 'overleaf', 'coursera', 'khanacademy', 'chegg',
    'stackoverflow', 'github', 'docs.google', 'desmos',
    'wolframalpha', 'wikipedia', 'scholar.google', 'quizlet',
    'visual studio code', 'pycharm', 'intellij', 'jupyter',
    'anki', 'zoom', '.pdf', 'onenote', 'obsidian'
]

def classify_screen(window_title: str, ocr_text: str, subjects: list[str], todos: list[dict]) -> dict:
    print("running general screen classification")
    ai_result = classify_with_ai(window_title, ocr_text, subjects, todos)
    if ai_result is not None:
        print("attempted AI classification")
        return ai_result
    print("attempted text match classification")
    return classify_match(window_title, ocr_text, subjects, todos)

def classify_with_ai(window_title: str, ocr_text: str, subjects: list[str], todos: list[dict]) -> dict | None:
    todo_texts = [t.get('text', '') for t in todos]
    prompt = (
        f"Active window: {window_title}. "
        f"Subjects: {', '.join(subjects)}. "
        f"Todos: {', '.join(todo_texts)}. "
        f"Screen text: \"{ocr_text[:500]}\". "
        f"Classify the screen as on_task, off_task, or ambiguous "
        f"relative to the subjects and todos, based off the screen text. "

        f"Return ONLY valid JSON in exactly this format: "
        f'{{"label":"on_task","confidence":0.0,"reason":"brief explanation"}} '

        f"Rules: "
        f"label must be exactly one of: on_task, off_task, ambiguous. "
        f"confidence must be a number between 0 and 1. "
        f"reason must always be a short explanation between 2-3 words."
    )
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False, "format": "json"},
            timeout=5,
        )
        response.raise_for_status()

        response_json = response.json()
        print(f"[Ollama] RAW RESPONSE: {response_json}", flush=True)

        raw_text = response_json["response"]
        print(f"[Ollama] MODEL TEXT: {raw_text!r}", flush=True)

        parsed = json.loads(raw_text)
        print(f"[Ollama] PARSED JSON: {parsed}", flush=True)

        if parsed.get("label") in ("on_task", "off_task", "ambiguous"):
            print("[Ollama] AI classification successful", flush=True)
            return parsed

        print(f"[Ollama] INVALID LABEL: {parsed.get('label')!r}", flush=True)
        return None
    except Exception as e:
        print(f"[Ollama ERROR] {type(e).__name__}: {e}", flush=True)
        return None
    # except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError):
    #     return None


def classify_match(window_title: str, ocr_text: str, subjects: list, todos: list) -> dict:
    combined = (window_title + ' ' + ocr_text).lower()
    combined = re.sub(r'\s+', ' ', combined)

    for kw in OFF_TASK_KEYWORDS:
        if kw in combined:
            return {'label': 'off_task', 'confidence': 0.95, 'reason': f'detected: {kw}'}

    for kw in ON_TASK_KEYWORDS:
        if kw in combined:
            return {'label': 'on_task', 'confidence': 0.90, 'reason': f'detected: {kw}'}

    matched_subjects = [s for s in subjects if s.lower() in combined]
    if matched_subjects:
        return {'label': 'on_task', 'confidence': 0.80, 'reason': f'subject: {matched_subjects[0]}'}

    matched_todo_words = []
    for todo in todos:
        words = [w for w in todo['text'].lower().split() if len(w) > 3]
        matched_todo_words += [w for w in words if w in combined]
    if matched_todo_words:
        return {'label': 'on_task', 'confidence': 0.70, 'reason': f'todo: {matched_todo_words[0]}'}

    return {'label': 'ambiguous', 'confidence': 0.5, 'reason': 'no keyword match'}