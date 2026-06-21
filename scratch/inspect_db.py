import urllib.request
import json
import os

url = "https://dnwsjvxitcndeqepovvo.supabase.co/rest/v1/"
headers = {
    "apikey": "sb_publishable_P3cAlUDSsQGQCJ2H9xrE3Q_BcICUlEj"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        
        # print definitions of mindmaps and public_mindmaps
        definitions = data.get("definitions", {})
        
        for table in ["mindmaps", "public_mindmaps"]:
            if table in definitions:
                print(f"Table: {table}")
                properties = definitions[table].get("properties", {})
                required = definitions[table].get("required", [])
                for col, info in properties.items():
                    req_str = " (REQUIRED)" if col in required else ""
                    print(f"  - {col}: {info.get('type')} / {info.get('format')}{req_str}")
            else:
                print(f"Table {table} not found in definitions. Available keys: {list(definitions.keys())}")
except Exception as e:
    print(f"Error fetching API spec: {e}")
