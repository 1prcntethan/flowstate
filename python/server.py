from flask import Flask, request, jsonify
from classifier import classify_screen
import mss
from PIL import Image
import pytesseract
import platform
import os

if platform.system() == 'Windows':
    username = os.getlogin()
    pytesseract.pytesseract.tesseract_cmd = rf'C:\Users\{username}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'

app = Flask(__name__)

def get_active_window_title() -> str:
    try:
        if platform.system() == 'Windows':
            import pygetwindow as gw
            win = gw.getActiveWindow()
            return win.title if win else ''
        elif platform.system() == 'Darwin':
            from AppKit import NSWorkspace
            active_app = NSWorkspace.sharedWorkspace().activeApplication()
            return active_app.get('NSApplicationName', '')
    except Exception:
        return ''
    return ''

def take_screenshot() -> Image.Image:
    with mss.mss() as sct:
        monitor = sct.monitors[1]
        raw = sct.grab(monitor)
        return Image.frombytes('RGB', raw.size, raw.rgb)

def ocr_image(img: Image.Image) -> str:
    img = img.resize((1280, 800))
    return pytesseract.image_to_string(img)

@app.route('/classify', methods=['POST'])
def classify():
    data = request.json
    subjects = data.get('subjects', [])
    todos = data.get('todos', [])

    window_title = get_active_window_title()
    img = take_screenshot()
    ocr_text = ocr_image(img)
    img = None  # discard immediately, never written to disk

    result = classify_screen(window_title, ocr_text, subjects, todos)
    return jsonify(result)

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(port=5001, debug=False)