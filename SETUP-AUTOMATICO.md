# Provisionamento automático do banco do Zabbix Canvas Map

No servidor Docker, com o pacote descompactado:

```bash
cd zabbix-canvas-map
python3 scripts/setup-database.py --postgres-container NOME_DO_CONTAINER_POSTGRES --admin-user postgres
```

O instalador solicita a senha de administrador PostgreSQL sem exibi-la, cria `canvas_map`, `canvas_map_app` (senha forte gerada automaticamente), tabelas, índice e controle de migrations. Ele guarda **somente** a senha do usuário da aplicação em `.canvas-map-db.env` (permissões 600), no diretório do projeto. A senha administrativa não é armazenada.

**Importante:** pressupõe PostgreSQL rodando em um container Docker local com `psql` e um administrador capaz de criar bancos e roles. Se o banco já existir sob outro proprietário, o instalador para sem alterar a base. Reexecutar é suportado: o mesmo segredo é reutilizado. O parâmetro `--rotate-app-password` troca a senha existente (atualize todos os frontends depois).

Após a criação, o frontend Zabbix precisa receber as variáveis `ZCM_DB_HOST`, `ZCM_DB_PORT`, `ZCM_DB_NAME`, `ZCM_DB_USER`, `ZCM_DB_PASSWORD` via Docker Compose ou equivalente. Essa etapa depende da configuração existente de Docker; **o instalador não reinicia nem altera containers Zabbix em execução**. O container deve incluir a extensão PHP `pdo_pgsql`.

A senha local de aplicação deve ser mantida fora do Git, não enviada ao chat e guardada com proteção de backup. O PostgreSQL é compartilhado com o Zabbix; faça backup e avalie capacidade antes da primeira execução.