#!/usr/bin/env python3
"""Clean up duplicate habits and verify final state."""
import json, subprocess

BASE = "http://localhost:3000"
EMAIL = "demo@habittracker.com"
PASSWORD = "demo123456"

def api(method, path, data=None, token=None):
    cmd = ["curl", "-s", "-X", method, f"{BASE}{path}", "-H", "Content-Type: application/json"]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    if data:
        cmd += ["-d", json.dumps(data)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(r.stdout)

# Login
r = api("POST", "/api/auth/login", {"email": EMAIL, "password": PASSWORD})
token = r["data"]["token"]

# Get all habits
r = api("GET", "/api/habits", token=token)
habits = r.get("data", [])
print(f"Total habits: {len(habits)}")

# Group by name
from collections import Counter
names = Counter(h["name"] for h in habits)
print(f"Unique names: {dict(names)}")

# Delete duplicates (keep the first of each name)
seen = set()
deleted = 0
for h in habits:
    if h["name"] in seen:
        r = api("DELETE", f"/api/habits/{h['id']}", token=token)
        if r.get("success"):
            deleted += 1
            print(f"  Deleted duplicate: {h['name']}")
    else:
        seen.add(h["name"])

print(f"\nDeleted {deleted} duplicates, {len(seen)} unique habits remain")
print(f"\n✅ Account ready!")
print(f"   URL: http://localhost:80")
print(f"   Email: {EMAIL}")
print(f"   Password: {PASSWORD}")
