import urllib.request
import json
import ssl

def check_mcp(url, token):
    print(f"Probando conexion MCP en: {url}")
    
    # Payload estandar del Protocolo MCP para listar herramientas
    data = {
        "jsonrpc": "2.0",
        "method": "listTools",
        "params": {},
        "id": 1
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Ignorar errores de certificados SSL auto-firmados o vencidos para la prueba
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            res_data = response.read().decode('utf-8')
            print("\n✅ ¡CONEXIÓN EXITOSA!")
            print("Resultado del servidor:")
            print(json.dumps(json.loads(res_data), indent=2))
    except urllib.error.HTTPError as e:
        print(f"\n❌ Error HTTP: {e.code} {e.reason}")
        print(f"Cuerpo del error: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"\n🛑 Error inesperado: {e}")

if __name__ == "__main__":
    URL = "https://automatizacion1-n8n.gc7erq.easypanel.host/mcp"
    TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmN2Q4MjA4YS1jMDFlLTQwZDctODVlYS1lMTI4NjQ3NGM5OTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImM4YjlkNDU3LTFmNWEtNGM3Ni05ZmNmLTA2MjdlY2VlNDRhZSIsImlhdCI6MTc3MzY0NDE3NX0.rA-nXmoNVIVb8zvGEEQpmhkMaU6KF5cltuCLhir36FA"
    check_mcp(URL, TOKEN)
