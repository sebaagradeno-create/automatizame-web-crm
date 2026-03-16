# 🔗 WORKFLOW_LIBRARY - Automatizame_uy
## Flujo Principal: Captación y Análisis Estratégico (v3.0)

### Descripción:
Este flujo centraliza la entrada de leads desde la web y dispara el análisis de la IA para preparar a Seba.

### Estructura Técnica:
1. **Webhook**: Recibe {nombre, telefono, email, dolor}.
2. **Postgres**: Guarda los datos para CRM local.
3. **Telegram**: Envía aviso instantáneo a Seba.
4. **AI Agent (Gemini)**: Analiza el dolor usando el MASTER_PROMPT_v1.0.
5. **Email Send**: Envía el reporte a contacto@automatizameuy.com.
6. **Respond to Webhook**: Avisa a la web que todo está OK para abrir Calendly.

### JSON de Respaldo (Localización):
- d:\Agencia_IA\web-automatizame\n8n-workflows\website-leads-v3.json

---

## Flujo Futuro: WhatsApp con Evolution API (Planificación)

### Descripción:
Conexión de n8n con Evolution API para respuestas automáticas en WhatsApp de forma profesional.

### Estructura Técnica:
1. **Webhook (In)**: Lee mensajes de WhatsApp.
2. **AI Agent (Estratega)**: Interpreta el mensaje del cliente.
3. **Evolution (Out)**: Responde con empatía técnica y califica presupuesto.
4. **Resumen**: Registra toda la conversación en Postgres.
