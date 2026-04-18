#!/usr/bin/env python3
"""Seed script: creates habits and 20 days of tracking data for demo account."""

import json
import subprocess
import sys
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:3000"
EMAIL = "demo@habittracker.com"
PASSWORD = "demo123456"

def api(method, path, data=None, token=None):
    cmd = ["curl", "-s", "-X", method, f"{BASE_URL}{path}",
           "-H", "Content-Type: application/json"]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    if data:
        cmd += ["-d", json.dumps(data)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

def delay(ms=200):
    """Small delay between requests to avoid rate limiting."""
    import time
    time.sleep(ms / 1000)

def login():
    resp = api("POST", "/api/auth/login", {"email": EMAIL, "password": PASSWORD})
    if not resp.get("success"):
        print(f"Login failed: {resp}")
        sys.exit(1)
    return resp["data"]["token"]

def create_habit(token, name, description, habit_type, target_value=1, target_unit="none",
                 schedule_type="daily", days_of_week=None, reminder_time=None, color="#4CAF50"):
    data = {
        "name": name,
        "description": description,
        "type": habit_type,
        "target": {"value": target_value, "unit": target_unit},
        "schedule": {"type": schedule_type},
        "color": color
    }
    if days_of_week is not None:
        data["schedule"]["daysOfWeek"] = days_of_week
    if reminder_time:
        data["reminders"] = [{"time": reminder_time, "enabled": True}]

    resp = api("POST", "/api/habits", data, token)
    delay(300)
    if resp.get("success"):
        habit_id = resp["data"]["id"]
        print(f"  ✅ Created: {name} (ID: {habit_id})")
        return habit_id
    else:
        print(f"  ❌ Failed to create {name}: {resp.get('error')}")
        return None

def log_habit(token, habit_id, date_str, value=1, notes=""):
    data = {"habitId": habit_id, "date": date_str, "value": value}
    if notes:
        data["notes"] = notes
    resp = api("POST", "/api/tracking/log", data, token)
    delay(150)
    return resp.get("success", False)

def main():
    print("=" * 60)
    print("🌱 Seeding Demo Data for Demo User")
    print("=" * 60)

    token = login()
    print("\n📝 Creating habits...")

    habits = [
        {
            "name": "Morning Meditation",
            "description": "10 minutes of mindfulness",
            "habit_type": "time",
            "target_value": 10,
            "target_unit": "minutes",
            "schedule_type": "daily",
            "reminder_time": "07:00",
            "color": "#9C27B0"
        },
        {
            "name": "Read 30 Pages",
            "description": "Read before bed",
            "habit_type": "count",
            "target_value": 30,
            "target_unit": "pages",
            "schedule_type": "daily",
            "reminder_time": "21:00",
            "color": "#2196F3"
        },
        {
            "name": "Exercise",
            "description": "30 min workout",
            "habit_type": "time",
            "target_value": 30,
            "target_unit": "minutes",
            "schedule_type": "weekly",
            "days_of_week": [1, 2, 3, 4, 5],  # Mon-Fri
            "reminder_time": "06:30",
            "color": "#F44336"
        },
        {
            "name": "Drink 8 Glasses of Water",
            "description": "Stay hydrated throughout the day",
            "habit_type": "count",
            "target_value": 8,
            "target_unit": "glasses",
            "schedule_type": "daily",
            "color": "#00BCD4"
        },
        {
            "name": "Journal Writing",
            "description": "Write about your day",
            "habit_type": "binary",
            "target_value": 1,
            "target_unit": "none",
            "schedule_type": "daily",
            "reminder_time": "22:00",
            "color": "#FF9800"
        },
    ]

    habit_ids = {}
    for h in habits:
        hid = create_habit(token, **h)
        if hid:
            habit_ids[h["name"]] = hid

    if not habit_ids:
        print("No habits created. Exiting.")
        sys.exit(1)

    # Generate 20 days of tracking data
    today = datetime.now()
    print(f"\n📊 Generating 20 days of tracking data...")
    print(f"   Date range: {(today - timedelta(days=19)).strftime('%Y-%m-%d')} to {today.strftime('%Y-%m-%d')}")

    # Realistic completion patterns
    completion_rates = {
        "Morning Meditation": 0.75,
        "Read 30 Pages": 0.80,
        "Exercise": 0.65,
        "Drink 8 Glasses of Water": 0.70,
        "Journal Writing": 0.55,
    }

    notes_pool = {
        "Morning Meditation": ["Felt very peaceful today", "Struggled to focus", "Great session", "Used guided meditation", "15 minutes instead"],
        "Read 30 Pages": ["Interesting chapter", "Could not put it down", "A bit tired while reading", "Finished a great book", "Started a new one"],
        "Exercise": ["Morning run", "Gym session - legs", "Yoga day", "HIIT workout", "Light stretching"],
        "Drink 8 Glasses of Water": ["Hit target by 6pm", "Struggled in afternoon", "Used reminder app", "Felt great", "Almost missed last glass"],
        "Journal Writing": ["Productive day", "Reflective evening", "Quick notes today", "Long entry about goals", "Gratitude focused"],
    }

    # Target values for each habit
    target_values = {
        "Morning Meditation": 10,
        "Read 30 Pages": 30,
        "Exercise": 30,
        "Drink 8 Glasses of Water": 8,
        "Journal Writing": 1,
    }

    total_logged = 0
    total_skipped = 0

    for day_offset in range(20):
        date = today - timedelta(days=19 - day_offset)
        date_str = date.strftime("%Y-%m-%d")
        day_of_week = date.weekday()  # 0=Monday, 6=Sunday
        is_weekend = day_of_week >= 5

        print(f"\n  📅 {date_str} ({date.strftime('%A')})")

        for habit_name, habit_id in habit_ids.items():
            # Skip exercise on weekends
            if habit_name == "Exercise" and is_weekend:
                print(f"    ⏭️  {habit_name}: skipped (weekend)")
                continue

            rate = completion_rates.get(habit_name, 0.5)

            # Add some streak/slump patterns
            if day_offset > 3 and random.random() < 0.3:
                rate = min(rate + 0.1, 0.95)

            if random.random() < rate:
                notes = random.choice(notes_pool.get(habit_name, [""]))
                value = target_values.get(habit_name, 1)
                success = log_habit(token, habit_id, date_str, value, notes)
                if success:
                    total_logged += 1
                    print(f"    ✅ {habit_name}: logged (value: {value})")
                else:
                    total_skipped += 1
                    print(f"    ❌ {habit_name}: failed to log")
            else:
                total_skipped += 1
                print(f"    ⬜ {habit_name}: not completed")

    print("\n" + "=" * 60)
    print(f"✅ Seeding complete!")
    print(f"   Habits created: {len(habit_ids)}")
    print(f"   Completions logged: {total_logged}")
    print(f"   Days skipped: {total_skipped}")
    print("=" * 60)

    # Fetch analytics to verify
    print("\n📈 Fetching analytics to verify...")

    insights = api("GET", "/api/analytics/insights?days=20", token=token)
    if insights.get("success"):
        d = insights["data"]
        print(f"\n  Insights (last 20 days):")
        print(f"    Completion Rate: {d.get('overallCompletionRate', 0):.1f}%")
        print(f"    Consistency Streak: {d.get('currentConsistencyStreak', 0)} days")
        if d.get('bestDay'):
            print(f"    Best Day: {d['bestDay'].get('name')} ({d['bestDay'].get('avgRate', 0):.1f}%)")
        if d.get('insights'):
            print(f"    Tips:")
            for tip in d['insights']:
                print(f"      • {tip}")

    trends = api("GET", "/api/analytics/trends?days=20", token=token)
    if trends.get("success"):
        d = trends["data"]
        print(f"\n  Trend: {d.get('trendDirection', 'unknown').upper()}")

    print("\n🎉 All done! Login to see the dashboard and analytics.")
    print(f"\n📋 Account Details:")
    print(f"   Email: {EMAIL}")
    print(f"   Password: {PASSWORD}")
    print(f"   Frontend: http://localhost:80")

if __name__ == "__main__":
    main()
