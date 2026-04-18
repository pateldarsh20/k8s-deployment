#!/usr/bin/env python3
import subprocess
import sys

SERVICES = [
    "user-service",
    "habit-service",
    "tracking-service",
    "analytics-service",
    "notification-service",
    "api-gateway",
    "frontend"
]

IMAGE_PREFIX = "pateldarsh21/habit-tracker"

def run(cmd, cwd=None):
    print(f"> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"Failed: {cmd}")
        sys.exit(1)

def build_and_push():
    for service in SERVICES:
        image = f"{IMAGE_PREFIX}:{service}-v1"
        dockerfile = f"services/{service}/Dockerfile" if service != "frontend" else "frontend/Dockerfile"
        
        print(f"\n=== Building {service} ===")
        run(f"docker build -t {image} -f {dockerfile} .")
        run(f"docker push {image}")

if __name__ == "__main__":
    build_and_push()
    print("\nDone!")