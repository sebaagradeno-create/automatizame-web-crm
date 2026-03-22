import jwt
import datetime

def generate_supabase_keys(jwt_secret):
    # Payload para Anon Key
    anon_payload = {
        "role": "anon",
        "iss": "supabase",
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=3650)  # 10 años
    }
    
    # Payload para Service Role Key
    service_payload = {
        "role": "service_role",
        "iss": "supabase",
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=3650)  # 10 años
    }
    
    anon_key = jwt.encode(anon_payload, jwt_secret, algorithm="HS256")
    service_key = jwt.encode(service_payload, jwt_secret, algorithm="HS256")
    
    return anon_key, service_key

if __name__ == "__main__":
    print("--- Generador de Keys para Supabase ---")
    secret = input("Introduce tu JWT_SECRET (mínimo 32 caracteres): ")
    
    if len(secret) < 32:
        print("Error: El secreto debe tener al menos 32 caracteres para ser seguro.")
    else:
        anon, service = generate_supabase_keys(secret)
        print("\n✅ Keys generadas con éxito:")
        print(f"\nANON_KEY:\n{anon}")
        print(f"\nSERVICE_ROLE_KEY:\n{service}")
        print("\nCopia estas llaves en tus variables de entorno de Easypanel.")
