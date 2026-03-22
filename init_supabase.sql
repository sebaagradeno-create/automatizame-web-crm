-- 1. Crear roles básicos de Supabase
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

-- 2. Esquemas básicos
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. Tabla de ejemplo para la Agencia
CREATE TABLE IF NOT EXISTS public.ideas_negocio (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_creacion timestamptz DEFAULT now(),
  idea text NOT NULL,
  analisis_ia text,
  categoria text,
  prioridad text,
  estado text DEFAULT 'Nueva'
);

-- 4. Permisos básicos para que n8n pueda leer (usando el rol anon para la prueba)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE public.ideas_negocio TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
