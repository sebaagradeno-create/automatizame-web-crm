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

## 🌐 Infraestructura y Despliegue (CI/CD)

### Hostinger Auto-deploy (GitHub Webhook)
- **Repositorio**: `https://github.com/sebaagradeno-create/automatizame-web-crm.git`
- **Rama**: `main`
- **Configuración**: Conectado vía Webhook a GitHub para actualización automática al hacer `git push`.
- **Nota**: El directorio `public_html` debe gestionarse exclusivamente vía Git para evitar conflictos.

### Servidor n8n (Easypanel VPS)
- **URL**: `https://automatizacion1-n8n.gc7erq.easypanel.host`
- **Variables Críticas (Base de Datos)**:
  - `DB_POSTGRESDB_HOST`: `automatizacion1_data-base-n8n`
  - `DB_POSTGRESDB_DATABASE`: `automatizacion1`
  - `DB_POSTGRESDB_USER`: `postgres`
- **Idioma**: `N8N_DEFAULT_LOCALE=es`
- **Zona Horaria**: `America/Montevideo`
