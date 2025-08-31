from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import json
import base64

app = FastAPI()

# === Настройки (заберём из переменных окружения на Render) ===
GITHUB_TOKEN = "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"
OWNER = "artem-web-hue"
REPO = "Lichess"
BRANCH = "main"
CHAT_PATH = "creck/chat.json"
PLAYERS_PATH = "creck/players.json"

# === Вспомогательная: получить SHA файла ===
def get_sha(path):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{path}"
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()["sha"]
    return None

# === Модель сообщения ===
class Message(BaseModel):
    user: str
    text: str

# === Получить чат ===
@app.get("/api/chat")
def get_chat():
    try:
        url = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/{CHAT_PATH}"
        response = requests.get(url)
        return response.json() if response.status_code == 200 else []
    except:
        return []

# === Отправить сообщение ===
@app.post("/api/chat")
def send_message(msg: Message):
    # 1. Получить текущий чат
    try:
        url = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/{CHAT_PATH}"
        response = requests.get(url)
        chat = response.json() if response.status_code == 200 else []
    except:
        chat = []

    # 2. Добавить сообщение
    chat.append({"user": msg.user, "text": msg.text, "time": __import__('datetime').datetime.utcnow().isoformat()})
    chat = chat[-50:]

    # 3. Кодируем
    content = json.dumps(chat, ensure_ascii=False, indent=2)
    encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")

    # 4. Обновить
    sha = get_sha(CHAT_PATH)
    update_url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{CHAT_PATH}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "message": f"💬 {msg.user}: {msg.text[:30]}...",
        "content": encoded,
        "sha": sha,
        "branch": BRANCH
    }

    response = requests.put(update_url, headers=headers, json=data)
    if response.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="GitHub API error")

    # 5. Добавить игрока (опционально)
    try:
        players_sha = get_sha(PLAYERS_PATH)
        players_url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{PLAYERS_PATH}"
        p_response = requests.get(players_url, headers=headers)
        players = json.loads(p_response.json()["content"]) if p_response.status_code == 200 else []
        if msg.user not in players:
            players.append(msg.user)
        p_content = json.dumps(players, ensure_ascii=False, indent=2)
        p_encoded = base64.b64encode(p_content.encode("utf-8")).decode("utf-8")
        p_data = {
            "message": f"👤 {msg.user} вошёл в чат",
            "content": p_encoded,
            "sha": players_sha,
            "branch": BRANCH
        }
        requests.put(players_url, headers=headers, json=p_data)
    except:
        pass

    return {"status": "ok", "message": "Сообщение добавлено"}
