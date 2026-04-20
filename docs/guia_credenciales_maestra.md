# 🗝️ Guía Maestra de Credenciales - n8n & Agencia

Para que todos los flujos funcionen al 100%, necesitamos configurar estas 5 llaves maestras en tu instancia de n8n. Sigue estos pasos:

## 1. Meta (Instagram DM & Comentarios) 📸
*   **Qué se necesita**: `Page Access Token` (Token de acceso de página) y `Verify Token`.
*   **Cómo obtenerlo**:
    1. Ve a [Meta for Developers](https://developers.facebook.com/).
    2. Entra en tu App "Automatizame".
    3. En el menú lateral: **Messenger > Instagram Settings**.
    4. Genera un token para la página `@automatizame_uy`.
    5. **Paso Crucial**: Copia ese token y guárdalo en n8n como una credencial de tipo "HTTP Header Auth" o "Instagram API".
*   **Verify Token**: Es una palabra secreta que tú inventas (ej: `automatizame_secret_key`) y la pones tanto en el Webhook de n8n como en la configuración de Webhooks de Meta.

## 2. Groq (El Cerebro de ARIA) 🧠
*   **Qué se necesita**: `API Key`.
*   **Cómo obtenerlo**:
    1. Ve a [Groq Cloud Console](https://console.groq.com/).
    2. Sección **API Keys**.
    3. Crea una nueva (ej: `n8n_production`).
*   **En n8n**: Crea una credencial de tipo "Groq API" y pega la llave.

## 3. PostgreSQL (La Memoria de Leads) 💾
*   **Qué se necesita**: `Host`, `Port`, `Database`, `User`, `Password`.
*   **Cómo obtenerlo**:
    1. Ve a tu panel de **Easypanel** (o donde tengas el n8n).
    2. Busca el servicio de Base de Datos (Postgres).
    3. Copia las credenciales internas. 
    *   *Nota: Si n8n y Postgres están en el mismo Easypanel, el Host suele ser el nombre del servicio de red.*
*   **En n8n**: Crea una credencial de tipo "PostgreSQL".

## 4. Telegram (Alertas al Celular) 📱
*   **Qué se necesita**: `Access Token` y `Chat ID`.
*   **Cómo obtenerlo**:
    1. Habla con `@BotFather` en Telegram para crear un bot o recuperar el token.
    2. **Token ARIA (Automatizame)**: `8781151379:AAHA9yXyX6V_hF78E3iZ2d1uGhMj-Zgi0bs`
    3. **Token Asistente Personal**: `8746380733:AAGTQHNhFdhGydLXijezQqT0kGYZlZfp1to`
    4. Para el **Chat ID**: Envía un mensaje a tu bot y luego entra a `https://api.telegram.org/bot<TU_TOKEN>/getUpdates` para ver tu ID (es un número largo).
*   **En n8n**: Crea una credencial de tipo "Telegram API".

## 5. ElevenLabs & HeyGen (Contenido IA) 🎙️🎥
*   **Estado**: Ya las tenemos en `docs/credenciales_agencia.md`.
*   **Acción**: Copiarlas y pegarlas en n8n como credenciales de tipo "Header Auth" (ElevenLabs usa `xi-api-key`) o según pida el nodo.

---
### 💡 Próximo Paso Recomendado
Una vez que tengas estas llaves, avísame para que Claude o yo configuremos los nodos de n8n para que las usen en lugar de tener "IDs de cuenta" genéricos o tokens pegados en el código. Esto hará que tu sistema sea mucho más robusto.
