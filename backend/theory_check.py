import requests

# Assuming the server is NOT running, but we can check the route definition by looking at the code.
# But I can also try to run a small part of it.

# Actually, I'll just check if my theory about FastAPI parameter binding is correct.
# Yes, FastAPI post with single str param = query param.

print("Checking interaction.py:check_plagiarism route...")
# The route is:
# @router.post("/plagiarism-check")
# def check_plagiarism(text: str, ...)

# This will expect /api/interaction/plagiarism-check?text=...
# But frontend calls: api.post('/interaction/plagiarism-check', { text: text })
# This sends JSON body.

print("Theory: Route in interaction.py:93 is incorrect for body-based POST.")
