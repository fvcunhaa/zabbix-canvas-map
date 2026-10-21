-- Admin-only script. Run with psql connected to postgres (NOT zabbix) as PostgreSQL admin.
-- Use -v zcm_password='strong-password' to supply password, not a hardcoded secret.
\if :{?zcm_password}
\else
  \echo 'ERROR: supply -v zcm_password=...'
  \quit 1
\endif
SELECT 'CREATE ROLE canvas_map_app LOGIN PASSWORD ' || quote_literal(:'zcm_password')
WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='canvas_map_app') \gexec
SELECT 'CREATE DATABASE canvas_map OWNER canvas_map_app'
WHERE NOT EXISTS(SELECT 1 FROM pg_database WHERE datname='canvas_map') \gexec
REVOKE ALL ON DATABASE canvas_map FROM PUBLIC;
GRANT CONNECT ON DATABASE canvas_map TO canvas_map_app;