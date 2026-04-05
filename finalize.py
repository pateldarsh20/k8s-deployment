#!/usr/bin/env python3
"""Remove test habit and show final state."""
import json, subprocess

BASE = "http://localhost:3000"
def api(method, path, data=None, token=None):
    cmd = ["curl", "-s", "-X", method, f"{BASE}{path}", "-H", "Content-Type: application/json"]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    if data:
        cmd += ["-d", json.dumps(data)]
    return json.loads(subprocess.run(cmd, capture_output=True, text=True).stdout)

r = api("POST", "/api/auth/login", {"email":"demo@habittracker.com","password":"demo123456"})
token = r["data"]["token"]

r = api("GET", "/api/habits", token=token)
for h in r.get("data", []):
    if h["name"] == "Test Habit":
        api("DELETE", f"/api/habits/{h['id']}", token=token)
        print(f"Deleted: {h['name']}")

r = api("GET", "/api/habits", token=token)
print(f"\n📝 Final habits ({len(r['data'])}):")
for h in r["data"]:
    print(f"   • {h['name']} ({h['type']}, {h['schedule']['type']})")

print(f"\n📋 Login Details:")
print(f"   URL: http://localhost:80")
print(f"   Email: demo@habittracker.com")
print(f"   Password: demo123456")
