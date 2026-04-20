# 🏛️ BLUEPRINT: AGENCIA AI EMPIRE - ESTRUCTURA MULTI-AGENTE

## 1. VISIÓN ESTRATÉGICA
Convertir la infraestructura actual en una organización de IA jerárquica capaz de escalar infinitamente. El sistema debe operar con el menor consumo de tokens posible, delegando tareas de investigación a Antigravity y tareas de lógica a Claude Code.

## 2. JERARQUÍA DE AGENTES (.agentes/)

### NIVEL 1: DIRECTOR CENTRAL (Claude / Antigravity)
- **Rol:** Recibir el input del CEO (Usuario) y definir el Roadmap.
- **Habilidad Especial: [SKILL ROUTER]**
  - Analiza la petición del usuario.
  - Identifica el proyecto (Automatízame, Destino Abril o General).
  - Determina las habilidades necesarias (Marketing, n8n, UI, Backend).
  - Deriva la tarea al Ejecutivo correspondiente.

### NIVEL 2: EJECUTIVOS DE PROYECTO (Business Units)
- **Agente Automatízame:** Gestión de la agencia propia, CRM y lanzamientos.
- **Agente Destino Abril:** Scraping inmobiliario, procesamiento de leads y Maps.
- **Agente General:** Laboratorio R&D y proyectos de terceros.

### NIVEL 3: ESPECIALISTAS (Dynamic Skills)
Invocados bajo demanda por los Ejecutivos.
- **Skill_Workflow:** Especialista en JSON y nodos de n8n.
- **Skill_Marketing:** Especialista en Branding y Content Strategy.
- **Skill_Contexto:** Encargado de mantener la memoria y coherencia del proyecto.

## 3. PROTOCOLO DE CONEXIÓN Y COWORK
- **NotebookLM (NLM):** Actualmente accesible solo vía Antigravity.
  - **Procedimiento:** Si Claude necesita investigar documentos profundos o prompts de marca, debe escribir la solicitud en `docs/coordinacion_ias.md`. Antigravity ejecutará el análisis en NLM y devolverá el resultado en `docs/investigacion_nlm.md`.
- **Diseño UI:** Antigravity (vía StitchMCP) es el encargado de la estética. Claude se enfoca en la lógica funcional del código.

## 4. ESTRATEGIA DE EFICIENCIA (TOKEN SAVER)
- **Modelos Flash (Gemini 3 Flash / Haiku):** Para lectura de logs, listado de archivos y tareas de ruteo.
- **Modelos Pro (Gemini 3 Pro / Claude 3.5 Sonnet):** Exclusivamente para diseño de arquitectura inicial, lógica compleja de n8n o debugging crítico.
- **Memoria:** Usar archivos `.md` en cada proyecto para que el agente no tenga que releer todo el repositorio en cada turno.

## 5. TAREA INMEDIATA PARA CLAUDE CODE
1. Crea la estructura de carpetas en `.agentes/` según lo definido arriba.
2. Crea un archivo `instrucciones.md` base para cada nivel.
3. Configura el **Skill Router** como el cerebro que decide a quién despertar.
4. Busca e implementa una forma de "Coworking persistente" (Skill específica) para que la comunicación con Antigravity sea fluida mediante archivos de estado.
