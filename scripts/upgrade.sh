#!/usr/bin/env bash
set -euo pipefail
CONTAINER="${ZABBIX_WEB_CONTAINER:-zabbix-web}"
DEST="${ZABBIX_MODULE_DIR:-/usr/share/zabbix/modules/zabbix-canvas-map}"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/module"
[[ "$DEST" == /* && "$DEST" != *'..'* ]] || { echo 'Caminho inválido' >&2; exit 1; }
docker inspect "$CONTAINER" >/dev/null || { echo 'Container não encontrado' >&2; exit 1; }
if ! docker exec "$CONTAINER" test -f "$DEST/manifest.json"; then
  echo 'Módulo não encontrado: use install.sh na primeira instalação.' >&2;exit 1
fi
BACKUP="${DEST}.backup.$(date +%Y%m%d%H%M%S)"
echo "Fazendo backup para $BACKUP"
docker exec "$CONTAINER" cp -a "$DEST" "$BACKUP"
# Atualiza apenas os arquivos distribuídos; preserva diretórios futuros não gerenciados.
docker cp "$SOURCE/." "$CONTAINER:$DEST/"
echo "Arquivos atualizados em $DEST"
echo 'Recarregue o Zabbix (Ctrl+Shift+R). Em instalações com OPcache persistente pode ser necessário reciclar o container web.'
echo "Backup: $BACKUP"