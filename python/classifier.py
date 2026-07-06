import re

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

def classify_screen(window_title: str, ocr_text: str, subjects: list, todos: list) -> dict:
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