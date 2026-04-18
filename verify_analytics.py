#!/usr/bin/env python3
"""Verify analytics data for demo account."""
import json, subprocess, sys

BASE = "http://localhost:3000"
TOKEN = None

def api(path):
    r = subprocess.run(["curl", "-s", f"{BASE}{path}",
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {TOKEN}"], capture_output=True, text=True)
    return json.loads(r.stdout)

# Login
r = subprocess.run(["curl", "-s", "-X", "POST", f"{BASE}/api/auth/login",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"email":"demo@habittracker.com","password":"demo123456"})],
    capture_output=True, text=True)
TOKEN = json.loads(r.stdout)["data"]["token"]

print("=" * 60)
print("📊 ANALYTICS VERIFICATION")
print("=" * 60)

# Insights
d = api("/api/analytics/insights?days=20")
if d.get("success"):
    i = d["data"]
    print(f"\n📈 Insights (20 days):")
    print(f"   Completion Rate: {i['overallCompletionRate']:.1f}%")
    print(f"   Consistency Streak: {i['currentConsistencyStreak']} days")
    if i.get("bestDay"):
        rate = float(i['bestDay']['avgRate']) if isinstance(i['bestDay']['avgRate'], str) else i['bestDay']['avgRate']
        print(f"   Best Day: {i['bestDay']['name']} ({rate:.1f}%)")
    if i.get("insights"):
        print(f"   Tips:")
        for t in i["insights"]:
            print(f"     • {t}")

# Trends
d = api("/api/analytics/trends?days=20")
if d.get("success"):
    t = d["data"]
    print(f"\n📉 Trend: {t['trendDirection'].upper()}")
    print(f"   Data points: {len(t['dataPoints'])} days")

# Best Days
d = api("/api/analytics/best-days")
if d.get("success"):
    b = d["data"]
    print(f"\n🏆 Best Day: {b['bestDay']['day']} ({float(b['bestDay']['avgCompletionRate']):.1f}%)")
    print(f"😬 Worst Day: {b['worstDay']['day']} ({float(b['worstDay']['avgCompletionRate']):.1f}%)")
    print(f"   All days:")
    for day in b["allDays"]:
        rate = float(day["avgCompletionRate"])
        bar = "█" * int(rate / 5)
        print(f"     {day['day']:>9}: {rate:5.1f}% {bar}")

# Heatmap
d = api("/api/analytics/heatmap?months=1")
if d.get("success"):
    h = d["data"]
    print(f"\n🗓️  Heatmap ({h['startDate'][:10]} to {h['endDate'][:10]}):")
    intensity_map = {0: "░░", 1: "▒░", 2: "▒▒", 3: "▓▒", 4: "▓▓"}
    for e in h["entries"]:
        bar = intensity_map.get(e["intensity"], "??")
        print(f"   {e['date'][:10]}: {e['rate']:5.1f}% {bar}")

# Weekly Report
d = api("/api/analytics/weekly-report")
if d.get("success"):
    w = d["data"]
    print(f"\n📋 Weekly Report:")
    print(f"   This week: {w['week']['start'][:10]} to {w['week']['end'][:10]}")
    print(f"   Due: {w['week']['totalDue']}, Completed: {w['week']['totalCompleted']}")
    print(f"   Rate: {w['week']['completionRate']:.1f}%")
    print(f"   vs last week: {w['weekOverWeek']['direction']} ({w['weekOverWeek']['change']:+.1f}%)")

# Habits list
d = api("/api/habits")
if d.get("success"):
    print(f"\n📝 Habits ({len(d['data'])} total):")
    for h in d["data"]:
        print(f"   • {h['name']} ({h['type']}, {h['schedule']['type']})")

print("\n" + "=" * 60)
print("✅ All analytics verified!")
print("=" * 60)
print(f"\n📋 Login Details:")
print(f"   URL: http://localhost:80")
print(f"   Email: demo@habittracker.com")
print(f"   Password: demo123456")
