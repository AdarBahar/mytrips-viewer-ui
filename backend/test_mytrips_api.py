#!/usr/bin/env python3
"""
Test script to verify MyTrips API connectivity and authentication
"""
import httpx
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MYTRIPS_API_BASEURL = os.environ.get('MYTRIPS_API_BASEURL')
LOC_API_TOKEN = os.environ.get('LOC_API_TOKEN')

print("=" * 60)
print("MyTrips API Connection Test")
print("=" * 60)
print(f"API Base URL: {MYTRIPS_API_BASEURL}")
print(f"LOC_API_TOKEN: {LOC_API_TOKEN[:20]}..." if LOC_API_TOKEN else "LOC_API_TOKEN: Not set")
print("=" * 60)

# Test credentials
test_email = "adar.bahar@gmail.com"
test_password = "admin123"

# Test the correct endpoint
endpoints_to_test = [
    "/auth/app-login",
]

for endpoint in endpoints_to_test:
    login_url = f"{MYTRIPS_API_BASEURL}{endpoint}"
    print(f"\n🔍 Testing: {login_url}")
    print("-" * 60)
    
    try:
        with httpx.Client(timeout=10.0) as client:
            # Test: app-login endpoint (no Authorization header needed)
            print("  📤 Sending request...")
            response = client.post(
                login_url,
                json={
                    "email": test_email,
                    "password": test_password
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            print(f"  📥 Status: {response.status_code}")
            print(f"  📥 Headers: {dict(response.headers)}")
            print(f"  📥 Body: {response.text[:500]}")
            
            if response.status_code == 200:
                print("  ✅ SUCCESS!")
                try:
                    data = response.json()
                    print(f"  📦 JSON Response: {data}")
                except:
                    print("  ⚠️  Response is not JSON")
                break
            elif response.status_code == 404:
                print("  ❌ Endpoint not found (404)")
            elif response.status_code == 401:
                print("  ❌ Unauthorized (401) - Check credentials or token")
            elif response.status_code == 403:
                print("  ❌ Forbidden (403) - Check authorization")
            else:
                print(f"  ❌ Error: {response.status_code}")
                
    except httpx.ConnectError as e:
        print(f"  ❌ Connection Error: {e}")
    except httpx.TimeoutException:
        print(f"  ❌ Timeout (10 seconds)")
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "=" * 60)
print("Test Complete")
print("=" * 60)

