#!/usr/bin/env bash
set -euo pipefail
WEB="${ZABBIX_WEB_CONTAINER:-zabbix-web}"
docker exec "$WEB" php -r '
if (!extension_loaded("pdo_pgsql")) {fwrite(STDERR, "Missing pdo_pgsql\n"); exit(2);}
foreach (["ZCM_DB_HOST", "ZCM_DB_USER", "ZCM_DB_PASSWORD"] as $k) {if (getenv($k) === false || getenv($k) === "") {fwrite(STDERR, "Missing environment: $k\n"); exit(3);}}
try {$db = new PDO("pgsql:host=".getenv("ZCM_DB_HOST").";port=".(getenv("ZCM_DB_PORT") ?: "5432").";dbname=".(getenv("ZCM_DB_NAME") ?: "canvas_map").";connect_timeout=3",getenv("ZCM_DB_USER"),getenv("ZCM_DB_PASSWORD"),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); $num = $db->query("SELECT COUNT(*) FROM zcm_schema_migrations WHERE version=1")->fetchColumn();if ((int)$num !== 1) throw new RuntimeException("Migration 1 missing");echo "Canvas database reachable, migration 1 detected\n";} catch (Throwable $e) {fwrite(STDERR,"Canvas database check failed\n");exit(4);}
'