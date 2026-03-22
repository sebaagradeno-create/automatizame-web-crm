import urllib.request
import json
import ssl

def test_endpoint(path, token):
    url = f"https://automatizacion1-n8n.gc7erq.easypanel.host{path}"
    print(f"\n--- Probando: {url} ---")
    
    data = {
        "jsonrpc": "2.0",
        "method": "listTools",
        "params": {},
        "id": 1
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res_data = response.read().decode('utf-8')
            print(f"✅ EXITO en {path}")
            print(json.dumps(json.loads(res_data), indent=2))
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ Error HTTP {e.code} en {path}")
        try:
            body = e.read().decode('utf-8')
            print(f"Cuerpo: {body[:200]}")
        except:
            pass
    except Exception as e:
        print(f"🛑 Error en {path}: {e}")
    return False

if __name__ == "__main__":
    TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImM4YjlkNDU3LTFmNWEtNGM3Ni05ZmNmLTA2MjdlY2VlNDRhZSIsImlhdCI6MTc3MzY0NDE3NX0.rA-nXmoNVIVb8zvGEEQpmhkMaU6KF5cltuCLhir36FA"
    
    # Probamos ambas rutas comunes
    test_endpoint("/mcp", TOKEN)
    test_endpoint("/api/v1/mcp", TOKEN)
