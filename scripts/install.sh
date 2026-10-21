#!/usr/bin/env bash
set -euo pipefail
CONTAINER="${ZABBIX_WEB_CONTAINER:-zabbix-web}"
DEST="${ZABBIX_MODULE_DIR:-/usr/share/zabbix/modules/zabbix-canvas-map}"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/module"
if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "ERRO: container '$CONTAINER' não encontrado. Defina ZABBIX_WEB_CONTAINER." >&2; exit 1
fi
if [[ "$DEST" != /* || "$DEST" == *'..'* ]]; then echo 'Destino inválido' >&2; exit 1; fi
if ! docker exec "$CONTAINER" test -d "$(dirname "$DEST")"; then
  echo "ERRO: diretório de módulos não encontrado: $(dirname "$DEST")" >&2; exit 1
fi
# No destructive overwrite of a live existing module.
if docker exec "$CONTAINER" test -e "$DEST"; then
  echo "ERRO: destino já existe ($DEST). Faça backup e atualize manualmente." >&2; exit 1
fi
docker cp "$SOURCE" "$CONTAINER:$DEST"
echo "Instalado em $CONTAINER:$DEST"
echo 'Acesse Zabbix > Administration > General > Modules > Scan directory > Enable.'