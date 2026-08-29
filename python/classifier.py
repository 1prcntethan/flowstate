import re
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
        f"relative to the subjects and todos. "
        f'Respond as JSON: {{"label": "...", "confidence": 0.0}}'
    )
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False, "format": "json"},
            timeout=5,
        )
        response.raise_for_status()
        parsed = json.loads(response.json()["response"])
        if parsed.get("label") in ("on_task", "off_task", "ambiguous"):
            return parsed
        print("AI classification failed")
        return None
    except (requests.RequestException, KeyError, ValueError, json.JSONDecodeError):
        return None


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