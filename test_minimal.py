#!/usr/bin/env python3
"""Minimal test: create 1 habit, log 1 day, check analytics."""
import json, subprocess, time

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

def delay(ms=500):
    import time; time.sleep(ms/1000)

# Login
r = api("POST", "/api/auth/login", {"email": EMAIL, "password": PASSWORD})
token = r["data"]["token"]
print(f"Logged in: {token[:20]}...")

# Create 1 habit
r = api("POST", "/api/habits", {
    "name": "Test Habit",
    "description": "Test",
    "type": "binary",
    "target": {"value": 1, "unit": "none"},
    "schedule": {"type": "daily"},
    "color": "#4CAF50"
}, token)
delay(500)
if not r.get("success"):
    print(f"Failed to create habit: {r}")
    exit(1)
habit_id = r["data"]["id"]
print(f"Habit created: {habit_id}")

# Log today
from datetime import datetime
today = datetime.now().strftime("%Y-%m-%d")
r = api("POST", "/api/tracking/log", {"habitId": habit_id, "date": today, "value": 1, "notes": "Test log"}, token)
delay(500)
print(f"Logged: {r}")

# Wait for event processing
print("Waiting 5s for event processing...")
time.sleep(5)

# Check analytics
r = api("GET", "/api/analytics/insights?days=1", token=token)
print(f"Insights: {json.dumps(r, indent=2)}")

# Check DB directly
r = subprocess.run(["docker", "exec", "habit-tracker-mongo-analytics", "mongosh", "habit-tracker-analytics",
    "--eval", "db.dailySummaries.find().forEach(d => printjson({date: d.date, due: d.habitsDue, completed: d.habitsCompleted, rate: d.completionRate}))"],
    capture_output=True, text=True)
print(f"DB contents:\n{r.stdout}")
print(f"DB errors:\n{r.stderr}")

# Check analytics logs
r = subprocess.run(["docker", "logs", "habit-tracker-analytics-service"], capture_output=True, text=True)
logs = r.stdout + r.stderr
for line in logs.split("\n"):
    if "Updating" in line or "Saved" in line or "Error" in line or "error" in line:
        print(f"LOG: {line}")
