#!/usr/bin/env python3
import subprocess
import sys

IMAGE_PREFIX = "pateldarsh21/habit-tracker"

# Format: (service_name, new_version_tag, dockerfile_path)
# Only include services that need to be built/pushed
SERVICES_TO_BUILD = [
    ("user-service",         "v4", "services/user-service/Dockerfile"),
    ("habit-service",        "v4", "services/habit-service/Dockerfile"),
    ("tracking-service",     "v4", "services/tracking-service/Dockerfile"),
    ("analytics-service",    "v4", "services/analytics-service/Dockerfile"),
    ("notification-service", "v4", "services/notification-service/Dockerfile"),
    ("api-gateway",          "v7", "services/api-gateway/Dockerfile"),
]

def run(cmd, cwd=None):
    print(f"> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"❌ Failed: {cmd}")
        sys.exit(1)

def build_and_push():
    for service, version, dockerfile in SERVICES_TO_BUILD:
        image = f"{IMAGE_PREFIX}:{service}-{version}"
        print(f"\n=== Building {service} as {image} ===")
        run(f"docker build -t {image} -f {dockerfile} .")
        run(f"docker push {image}")
        print(f"✅ {image} pushed successfully")

if __name__ == "__main__":
    build_and_push()
    print("\n✅ All images built and pushed!")