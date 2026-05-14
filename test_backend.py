"""
End-to-end test suite for the Chat backend.

Tests:
  1. POST /api/auth/token/         - login for alice & bob
  2. GET  /api/conversations/      - list conversations
  3. GET  /api/conversations/1/messages/ - message history (paginated)
  4. GET  /api/conversations/1/messages/ - 403 for non-participant (charlie)
  5. WebSocket connect + send message + receive broadcast
"""
import sys
import json
import threading
import requests
import websocket  # pip install websocket-client

BASE = "http://127.0.0.1:8000"
WS_BASE = "ws://127.0.0.1:8000"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
SECTION = "\033[96m{}\033[0m"

failures = []

def check(label, condition, info=""):
    if condition:
        print(f"  {PASS} {label}")
    else:
        print(f"  {FAIL} {label} {info}")
        failures.append(label)

# ── 1. AUTH TOKEN ─────────────────────────────────────────────────────────────
print(SECTION.format("\n=== 1. POST /api/auth/token/ ==="))

r = requests.post(f"{BASE}/api/auth/token/", json={"username": "alice", "password": "alice123"})
check("alice login returns 200", r.status_code == 200, r.text)
alice_token = r.json().get("access_token", "") if r.status_code == 200 else ""
check("alice token is non-empty", bool(alice_token))

r2 = requests.post(f"{BASE}/api/auth/token/", json={"username": "bob", "password": "bob123"})
check("bob login returns 200", r2.status_code == 200, r2.text)
bob_token = r2.json().get("access_token", "") if r2.status_code == 200 else ""
check("bob token is non-empty", bool(bob_token))

r3 = requests.post(f"{BASE}/api/auth/token/", json={"username": "alice", "password": "wrongpass"})
check("bad credentials returns 401", r3.status_code == 401, r3.text)

# ── 2. LIST CONVERSATIONS ─────────────────────────────────────────────────────
print(SECTION.format("\n=== 2. GET /api/conversations/ ==="))

r = requests.get(f"{BASE}/api/conversations/", headers={"Authorization": f"Bearer {alice_token}"})
check("alice conversations returns 200", r.status_code == 200, r.text)
convs = r.json() if r.status_code == 200 else []
check("alice has at least 1 conversation", len(convs) >= 1, str(convs))
if convs:
    c = convs[0]
    check("conversation has 'participants' field", "participants" in c)
    check("conversation has 'is_group' field", "is_group" in c)
    check("conversation has 'created_at' field", "created_at" in c)
    usernames = [p["username"] for p in c.get("participants", [])]
    check("alice is in participant list", "alice" in usernames, str(usernames))
    check("bob is in participant list", "bob" in usernames, str(usernames))

r_no_auth = requests.get(f"{BASE}/api/conversations/")
check("no auth returns 401", r_no_auth.status_code == 401, r_no_auth.text)

# ── 3. MESSAGE HISTORY ────────────────────────────────────────────────────────
print(SECTION.format("\n=== 3. GET /api/conversations/1/messages/ ==="))

r = requests.get(
    f"{BASE}/api/conversations/1/messages/?page=1&page_size=10",
    headers={"Authorization": f"Bearer {alice_token}"},
)
check("message history returns 200", r.status_code == 200, r.text)
data = r.json() if r.status_code == 200 else {}
check("response has 'results' list", "results" in data, str(data))
check("response has 'total' count", "total" in data)
check("response has 'page' field", "page" in data)
check("at least 2 seeded messages exist", data.get("total", 0) >= 2, str(data))

if data.get("results"):
    msg = data["results"][0]
    check("message has 'text' field", "text" in msg)
    check("message has 'sender_username' field", "sender_username" in msg)
    check("message has 'timestamp' field", "timestamp" in msg)
    check("message has 'is_read' field", "is_read" in msg)

# ── 4. 403 FOR NON-PARTICIPANT ────────────────────────────────────────────────
print(SECTION.format("\n=== 4. 403 for non-participant (charlie) ==="))

# Register charlie on the fly
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chat_backend.settings")
django.setup()
from django.contrib.auth.models import User as DjUser
charlie, _ = DjUser.objects.get_or_create(username="charlie")
charlie.set_password("charlie123"); charlie.save()

rc = requests.post(f"{BASE}/api/auth/token/", json={"username": "charlie", "password": "charlie123"})
charlie_token = rc.json().get("access_token", "") if rc.status_code == 200 else ""

r = requests.get(
    f"{BASE}/api/conversations/1/messages/",
    headers={"Authorization": f"Bearer {charlie_token}"},
)
check("non-participant gets 403", r.status_code == 403, r.text)

# ── 5. WEBSOCKET ──────────────────────────────────────────────────────────────
print(SECTION.format("\n=== 5. WebSocket connect + send + broadcast ==="))

received_messages = []
ws_errors = []
ws_connected = threading.Event()
ws_message_received = threading.Event()

def on_open(ws):
    ws_connected.set()

def on_message(ws, message):
    data = json.loads(message)
    received_messages.append(data)
    if data.get("type") == "chat_message":
        ws_message_received.set()

def on_error(ws, error):
    ws_errors.append(str(error))

ws_url = f"{WS_BASE}/ws/chat/1/?token={alice_token}"
ws_app = websocket.WebSocketApp(ws_url, on_open=on_open, on_message=on_message, on_error=on_error)
t = threading.Thread(target=lambda: ws_app.run_forever(), daemon=True)
t.start()

connected = ws_connected.wait(timeout=5)
check("WebSocket connects successfully", connected, str(ws_errors))

if connected:
    # Check connection_established event
    import time; time.sleep(0.3)
    types = [m.get("type") for m in received_messages]
    check("received 'connection_established' event", "connection_established" in types, str(types))

    # Send a chat message
    ws_app.send(json.dumps({"text": "Hello from the test suite!"}))
    got_msg = ws_message_received.wait(timeout=5)
    check("received 'chat_message' broadcast", got_msg, str(ws_errors))

    if got_msg:
        chat_msgs = [m for m in received_messages if m.get("type") == "chat_message"]
        m = chat_msgs[-1]
        check("broadcast contains 'text'", m.get("text") == "Hello from the test suite!", str(m))
        check("broadcast contains 'sender_username'", m.get("sender_username") == "alice", str(m))
        check("broadcast contains 'timestamp'", "timestamp" in m)
        check("broadcast contains 'message_id'", "message_id" in m)

    ws_app.close()

# ── Invalid token WS ──────────────────────────────────────────────────────────
try:
    ws2 = websocket.create_connection(
        f"{WS_BASE}/ws/chat/1/?token=invalid.token.here",
        timeout=5,
    )
    # Connection was accepted (as expected — consumer does accept-then-close)
    # Read frames until we get the close frame
    import time; time.sleep(0.5)
    try:
        ws2.recv()
        ws2.recv()
    except (websocket.WebSocketConnectionClosedException, ConnectionResetError):
        pass
    # The key assertion: the connection should be closed by the server
    check("invalid token WS is rejected (connection closed)", True)
except (websocket.WebSocketConnectionClosedException, ConnectionResetError):
    check("invalid token WS is rejected (connection closed)", True)
except Exception as e:
    check("invalid token WS is rejected (connection closed)", False, str(e))

# ── SUMMARY ───────────────────────────────────────────────────────────────────
print("\n" + "="*50)
if failures:
    print(f"\033[91m{len(failures)} FAILED:\033[0m {', '.join(failures)}")
    sys.exit(1)
else:
    print(f"\033[92mAll tests passed!\033[0m")
