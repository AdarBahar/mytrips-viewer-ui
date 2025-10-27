#!/usr/bin/env python3
"""
Test script to verify Location API connectivity
"""
import httpx
import os
from dotenv import load_dotenv
from pathlib import Path
import json

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

LOC_API_BASEURL = os.environ.get('LOC_API_BASEURL')
LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')

print("=" * 60)
print("Location API Connection Test")
print("=" * 60)
print(f"API Base URL: {LOC_API_BASEURL}")
print(f"LOC_API_TOKEN: {LOC_API_TOKEN[:20]}..." if LOC_API_TOKEN else "LOC_API_TOKEN: Not set")
print("=" * 60)

# Test /users.php endpoint
print("\n🔍 Testing: /users.php")
print("-" * 60)

# Test all three authentication methods
auth_methods = [
    ("Bearer Token", {"Authorization": f"Bearer {LOC_API_TOKEN}"}),
    ("X-API-Token", {"X-API-Token": LOC_API_TOKEN}),
    ("X-Auth-Token", {"X-Auth-Token": LOC_API_TOKEN}),
]

for method_name, auth_headers in auth_methods:
    print(f"\n  🔐 Testing with: {method_name}")
    print("-" * 60)

    try:
        with httpx.Client(timeout=10.0) as client:
            api_url = f"{LOC_API_BASEURL}/users.php"

            print(f"  📤 GET {api_url}")
            print(f"  📤 Headers: {auth_headers}")

            headers = {**auth_headers, "Accept": "application/json"}

            response = client.get(
                api_url,
                params={
                    "with_location_data": "true",
                    "include_counts": "true",
                    "include_metadata": "true"
                },
                headers=headers
            )

            print(f"  📥 Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"  📥 Response:")
                print(json.dumps(data, indent=2))

                if data.get('success'):
                    print(f"\n  ✅ SUCCESS with {method_name}!")
                    print(f"  📊 Users count: {data.get('count', 0)}")
                    if data.get('data'):
                        print(f"  👤 First user: {data['data'][0].get('display_name')} (ID: {data['data'][0].get('id')})")
                    break  # Success, no need to try other methods
                else:
                    print(f"  ⚠️  API returned success=false")
            else:
                print(f"  ❌ Error: {response.status_code}")
                print(f"  📥 Body: {response.text[:200]}")

    except httpx.ConnectError as e:
        print(f"  ❌ Connection Error: {e}")
    except httpx.TimeoutException:
        print(f"  ❌ Timeout (10 seconds)")
    except Exception as e:
        print(f"  ❌ Error: {e}")

# Test /locations.php endpoint
print("\n\n🔍 Testing: /locations.php")
print("=" * 60)

try:
    with httpx.Client(timeout=10.0) as client:
        api_url = f"{LOC_API_BASEURL}/locations.php"

        print(f"  📤 GET {api_url}")
        print(f"  📤 Params: user=Adar2, limit=5")

        response = client.get(
            api_url,
            params={
                "user": "Adar2",
                "limit": "5"
            },
            headers={
                "X-API-Token": LOC_API_TOKEN,
                "Accept": "application/json"
            }
        )

        print(f"  📥 Status: {response.status_code}")
        print(f"  📥 Response text length: {len(response.text)}")

        if response.status_code == 200:
            if not response.text:
                print(f"  ⚠️  Empty response body")
            else:
                try:
                    data = response.json()
                    print(f"  📥 Response (first 1000 chars):")
                    print(json.dumps(data, indent=2)[:1000])
                except json.JSONDecodeError as e:
                    print(f"  ❌ JSON decode error: {e}")
                    print(f"  📥 Raw response: {response.text[:500]}")

                if data.get('success'):
                    print(f"\n  ✅ SUCCESS!")
                    print(f"  📊 Locations count: {data.get('count', 0)}")
                    print(f"  📊 Total available: {data.get('total', 0)}")
                    if data.get('data') and len(data['data']) > 0:
                        loc = data['data'][0]
                        print(f"  📍 First location: lat={loc.get('latitude')}, lng={loc.get('longitude')}, time={loc.get('server_time')}")
                else:
                    print(f"  ⚠️  API returned success=false")
        else:
            print(f"  ❌ Error: {response.status_code}")
            print(f"  📥 Body: {response.text[:200]}")

except Exception as e:
    print(f"  ❌ Error: {e}")

# Test /driving-records.php endpoint
print("\n\n🔍 Testing: /driving-records.php")
print("=" * 60)

try:
    with httpx.Client(timeout=10.0) as client:
        api_url = f"{LOC_API_BASEURL}/driving-records.php"

        print(f"  📤 GET {api_url}")
        print(f"  📤 Params: user=Adar2, limit=5")

        response = client.get(
            api_url,
            params={
                "user": "Adar2",
                "limit": "5"
            },
            headers={
                "X-API-Token": LOC_API_TOKEN,
                "Accept": "application/json"
            }
        )

        print(f"  📥 Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"  📥 Response (first 1000 chars):")
            print(json.dumps(data, indent=2)[:1000])

            if data.get('success'):
                print(f"\n  ✅ SUCCESS!")
                print(f"  📊 Driving records count: {data.get('count', 0)}")
                print(f"  📊 Total available: {data.get('total', 0)}")
                if data.get('data') and len(data['data']) > 0:
                    rec = data['data'][0]
                    print(f"  🚗 First record: type={rec.get('event_type')}, trip_id={rec.get('trip_id')}, time={rec.get('server_time')}")
            else:
                print(f"  ⚠️  API returned success=false")
        else:
            print(f"  ❌ Error: {response.status_code}")
            print(f"  📥 Body: {response.text[:200]}")

except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n" + "=" * 60)
print("Test Complete")
print("=" * 60)

