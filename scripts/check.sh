#!/usr/bin/env bash
set -euo pipefail
CONTAINER="${ZABBIX_WEB_CONTAINER:-zabbix-web}"
DEST="${ZABBIX_MODULE_DIR:-/usr/share/zabbix/modules/zabbix-canvas-map}"
docker exec "$CONTAINER" test -r "$DEST/manifest.json"
docker exec "$CONTAINER" test -r "$DEST/Module.php"
docker exec "$CONTAINER" test -r "$DEST/actions/CanvasMapView.php"
docker exec "$CONTAINER" test -r "$DEST/views/canvas.map.php"
docker exec "$CONTAINER" php -l "$DEST/Module.php"
docker exec "$CONTAINER" php -l "$DEST/actions/CanvasMapView.php"
docker exec "$CONTAINER" php -l "$DEST/views/canvas.map.php"
echo 'OK: arquivos presentes e PHP sintaticamente válido.'