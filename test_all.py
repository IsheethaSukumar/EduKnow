import requests

BASE = "http://127.0.0.1:8000/api"
results = []

# 1. Login
r = requests.post(f"{BASE}/auth/login", json={"username": "student1", "password": "password123"}, timeout=5)
print(f"1. LOGIN: {r.status_code}")
results.append(r.status_code == 200)
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# 2. Create a note
r = requests.post(f"{BASE}/notes/", json={"title": "Test Note", "text": "This works!", "color": "#6366f1"}, headers=h, timeout=5)
print(f"2. CREATE NOTE: {r.status_code} -> {r.json().get('title', 'FAIL')}")
results.append(r.status_code == 200)

# 3. List notes
r = requests.get(f"{BASE}/notes/", headers=h, timeout=5)
print(f"3. LIST NOTES: {r.status_code} -> {len(r.json())} notes")
results.append(r.status_code == 200)

# 4. Chatbot - normal question
r = requests.post(f"{BASE}/chatbot/chat", json={"message": "What are the library hours?", "history": []}, headers=h, timeout=15)
print(f"4. CHATBOT NORMAL: {r.status_code}")
data = r.json()
has_response = bool(data.get("response"))
has_sources = "sources" in data
print(f"   Response: {data.get('response', '')[:80]}...")
print(f"   Sources: {len(data.get('sources', []))}")
results.append(r.status_code == 200 and has_response)

# 5. Chatbot - /flashcards command
r = requests.post(f"{BASE}/chatbot/chat", json={"message": "/flashcards data structures", "history": []}, headers=h, timeout=15)
print(f"5. /FLASHCARDS: {r.status_code}")
data = r.json()
has_rich = "rich_content" in data
if has_rich:
    print(f"   Rich Content Type: {data['rich_content']['type']}")
    print(f"   Cards saved: {data['rich_content']['data'].get('saved_count', 0)}")
else:
    print(f"   NO rich_content in response! Keys: {list(data.keys())}")
results.append(r.status_code == 200 and has_rich)

# 6. Chatbot - /quiz command
r = requests.post(f"{BASE}/chatbot/chat", json={"message": "/quiz algorithms", "history": []}, headers=h, timeout=15)
print(f"6. /QUIZ: {r.status_code}")
data = r.json()
has_rich = "rich_content" in data
if has_rich:
    print(f"   Rich Content Type: {data['rich_content']['type']}")
    print(f"   Questions: {len(data['rich_content']['data'].get('questions', []))}")
else:
    print(f"   NO rich_content! Keys: {list(data.keys())}")
results.append(r.status_code == 200 and has_rich)

# 7. Flashcards - check they were auto-saved from /flashcards
r = requests.get(f"{BASE}/flashcards/", headers=h, timeout=5)
print(f"7. ALL FLASHCARDS: {r.status_code} -> {len(r.json())} total cards")
results.append(r.status_code == 200 and len(r.json()) > 0)

# 8. Flashcards - check due (all just created should be due now)
r = requests.get(f"{BASE}/flashcards/due", headers=h, timeout=5)
print(f"8. DUE FLASHCARDS: {r.status_code} -> {len(r.json())} due")
results.append(r.status_code == 200 and len(r.json()) > 0)

# 9. Create manual flashcard
r = requests.post(f"{BASE}/flashcards/", json={"deck_name": "My Deck", "front": "What is a stack?", "back": "LIFO data structure"}, headers=h, timeout=5)
print(f"9. CREATE FLASHCARD: {r.status_code}")
results.append(r.status_code == 200)

print()
passed = sum(results)
total = len(results)
if passed == total:
    print(f"=== ALL {total} TESTS PASSED ===")
else:
    print(f"=== {passed}/{total} TESTS PASSED ===")
    for i, ok in enumerate(results, 1):
        if not ok:
            print(f"   FAILED: Test {i}")
