#!/usr/bin/env python3
import subprocess
import sys
import os

DOCKER_USERNAME = "pateldarsh21"
IMAGE_PREFIX = "habit-tracker"

SERVICES = [
    {
        "name": "user-service",
        "dockerfile": "./services/user-service/Dockerfile",
        "context": "."
    },
    {
        "name": "habit-service",
        "dockerfile": "./services/habit-service/Dockerfile",
        "context": "."
    },
    {
        "name": "tracking-service",
        "dockerfile": "./services/tracking-service/Dockerfile",
        "context": "."
    },
    {
        "name": "analytics-service",
        "dockerfile": "./services/analytics-service/Dockerfile",
        "context": "."
    },
    {
        "name": "notification-service",
        "dockerfile": "./services/notification-service/Dockerfile",
        "context": "."
    },
    {
        "name": "api-gateway",
        "dockerfile": "./services/api-gateway/Dockerfile",
        "context": "."
    },
    {
        "name": "frontend",
        "dockerfile": "./frontend/Dockerfile",
        "context": "."
    },
]

VERSION = "v1"

def run_command(cmd, description):
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}")
    print(f"CMD: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, capture_output=False)

    if result.returncode != 0:
        print(f"❌ FAILED: {description}")
        return False

    print(f"✅ SUCCESS: {description}")
    return True

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("\n" + "="*60)
    print("  DOCKER BUILD AND PUSH SCRIPT")
    print("="*60)
    print(f"  Username: {DOCKER_USERNAME}")
    print(f"  Version: {VERSION}")
    print("="*60)

    failed = []

    for service in SERVICES:
        image_name = f"{DOCKER_USERNAME}/{IMAGE_PREFIX}:{service['name']}-{VERSION}"
        tag_cmd = ["docker", "build", "-t", image_name, "-f", service['dockerfile'], service['context']]

        if not run_command(tag_cmd, f"Building {service['name']}"):
            failed.append(service['name'])
            continue

        push_cmd = ["docker", "push", image_name]
        if not run_command(push_cmd, f"Pushing {service['name']}"):
            failed.append(service['name'])
            continue

    print("\n" + "="*60)
    print("  BUILD SUMMARY")
    print("="*60)

    if not failed:
        print("✅ ALL SERVICES BUILT AND PUSHED SUCCESSFULLY!")
    else:
        print(f"❌ FAILED SERVICES: {', '.join(failed)}")

    print("="*60 + "\n")

    return 0 if not failed else 1

if __name__ == "__main__":
    sys.exit(main())
