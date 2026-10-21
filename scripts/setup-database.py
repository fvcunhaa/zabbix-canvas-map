#!/usr/bin/env python3
"""One-command database bootstrap for Zabbix Canvas Map. Requires Python 3 + Docker CLI.
Only creates/updates the isolated canvas_map database and canvas_map_app role.
Never connects to or changes the Zabbix application database.
"""
import argparse
import getpass
import os
import re
import secrets
import shlex
import subprocess
import sys
from pathlib import Path

DB = 'canvas_map'
ROLE = 'canvas_map_app'
BASE = Path(__file__).resolve().parents[1]
ENV_FILE = BASE / '.canvas-map-db.env'
SCHEMA = (BASE / 'migrations/canvas_map/001_schema.sql').read_text()


def sqlstr(value):
    if '\n' in value or '\r' in value or '\0' in value:
        raise ValueError('Password contains an unsupported character')
    return "'" + value.replace("'", "''") + "'"


def run_psql(container, admin_user, admin_password, database, sql):
    # Password is passed over stdin (never Docker argv, shell history, or logs).
    cmd = ['docker', 'exec', '-i', container, 'sh', '-c',
           'IFS= read -r PGPASSWORD; export PGPASSWORD; exec psql -X -v ON_ERROR_STOP=1 -q -U "$1" -d "$2" -f -',
           'zcm-setup', admin_user, database]
    result = subprocess.run(cmd, input=admin_password+'\n'+sql, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('psql failed: '+result.stderr.strip()[-2500:])
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser(description='Provision the Canvas Map database inside an existing PostgreSQL Docker container')
    parser.add_argument('--postgres-container', help='Existing PostgreSQL container name')
    parser.add_argument('--admin-user', default='postgres', help='PostgreSQL administrative role (default: postgres)')
    parser.add_argument('--rotate-app-password', action='store_true', help='Rotate Canvas role password and local configuration')
    args = parser.parse_args()
    if not shutil_which('docker'):
        parser.error('Docker CLI not found. Run on the Docker host.')
    container = args.postgres_container or input('Nome do container PostgreSQL existente: ').strip()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', container):
        parser.error('Invalid Docker container name')
    user = args.admin_user
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]{0,62}', user):
        parser.error('Invalid PostgreSQL admin username')
    admin_password = getpass.getpass('Senha administrativa do PostgreSQL (não será salva): ')
    if not admin_password:
        parser.error('Administrative password required')
    if ENV_FILE.exists() and not args.rotate_app_password:
        existing = ENV_FILE.read_text()
        m = re.search(r'^ZCM_DB_PASSWORD=(.+)$', existing, re.M)
        if not m:
            parser.error('Existing credentials file malformed: '+str(ENV_FILE))
        app_password = m.group(1)
    else:
        app_password = secrets.token_urlsafe(36)
    print('\nVerificando PostgreSQL e objetos existentes...')
    # Nothing destructive: fail when a preexisting DB has a different owner.
    precheck = """SELECT CASE WHEN EXISTS (
      SELECT 1 FROM pg_database d JOIN pg_roles r ON r.oid=d.datdba
      WHERE d.datname='canvas_map' AND r.rolname <> 'canvas_map_app'
    ) THEN 'ERROR_DB_OWNER' ELSE 'OK' END;"""
    if 'ERROR_DB_OWNER' in run_psql(container, user, admin_password, 'postgres', precheck):
        raise RuntimeError('Database canvas_map already exists but is not owned by canvas_map_app. No changes made.')
    provision = f"""
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', '{ROLE}', {sqlstr(app_password)})
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='{ROLE}') \\gexec
ALTER ROLE {ROLE} WITH LOGIN PASSWORD {sqlstr(app_password)};
SELECT 'CREATE DATABASE canvas_map OWNER canvas_map_app'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='{DB}') \\gexec
REVOKE ALL ON DATABASE {DB} FROM PUBLIC;
GRANT CONNECT ON DATABASE {DB} TO {ROLE};
"""
    run_psql(container, user, admin_password, 'postgres', provision)
    # Restrict object ownership to app role, not admin role.
    migrations = f"SET ROLE {ROLE};\nBEGIN;\n" + SCHEMA + "\nCOMMIT;\nRESET ROLE;\n"
    run_psql(container, user, admin_password, DB, migrations)
    result = run_psql(container, user, admin_password, DB,
                      "SELECT CASE WHEN EXISTS(SELECT 1 FROM zcm_schema_migrations WHERE version=1) AND to_regclass('public.zcm_maps') IS NOT NULL THEN 'ZCM_OK' ELSE 'ZCM_FAIL' END;")
    if 'ZCM_OK' not in result:
        raise RuntimeError('Database validation failed after migrations')
    if not ENV_FILE.exists() or args.rotate_app_password:
        fd = os.open(str(ENV_FILE), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            with os.fdopen(fd, 'w') as f:
                f.write(f'ZCM_DB_NAME={DB}\nZCM_DB_USER={ROLE}\nZCM_DB_PASSWORD={app_password}\n')
        finally:
            os.chmod(ENV_FILE, 0o600)
    print('\nSUCESSO: base canvas_map, usuário canvas_map_app e schema versionado conferidos.')
    print('Credenciais da aplicação salvas em:', ENV_FILE)
    print('ATENÇÃO: configurar ZCM_DB_HOST/PORT e as variáveis ZCM_DB_* no container Zabbix Web.')
    print('O banco zabbix não foi acessado ou alterado por este instalador.')


def shutil_which(name):
    import shutil
    return shutil.which(name)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.SubprocessError) as exc:
        print('ERRO:', exc, file=sys.stderr)
        sys.exit(1)