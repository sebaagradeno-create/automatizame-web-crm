import requests
import sys

def check_mcp_endpoint(base_url, api_key):
    print(f"--- Iniciando validacion de n8n MCP en: {base_url} ---")
    
    # Limpiar URL por si tiene barra al final
    base_url = base_url.rstrip('/')
    mcp_endpoint = f"{base_url}/mcp" # Ruta estandar del protocolo MCP en n8n
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    try:
        # El protocolo MCP usa el metodo JSON-RPC 2.0. 
        # Esta es una peticion de prueba para listar herramientas.
        payload = {
            "jsonrpc": "2.0",
            "method": "listTools",
            "params": {},
            "id": 1
        }
        
        response = requests.post(mcp_endpoint, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print("✅ ¡EXITO! El endpoint MCP esta activo y respondiendo correctamente.")
            print(f"Herramientas detectadas: {response.json().get('result', {}).get('tools', 'No hay herramientas habilitadas todavia')}")
        elif response.status_code == 404:
            print("❌ ERROR 404: El endpoint /mcp no existe. ¿Activaste el MCP en Advanced AI dentro de n8n?")
        elif response.status_code == 401:
            print("❌ ERROR 401: API Key invalida o falta de permisos en n8n.")
        else:
            print(f"⚠️ El servidor respondio con status {response.status_code}.")
            print(f"Detalle: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"🛑 Error de conexion: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python validar_n8n_mcp.py URL_N8N API_KEY")
    else:
        check_mcp_endpoint(sys.argv[1], sys.argv[2])
