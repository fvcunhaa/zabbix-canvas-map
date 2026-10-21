# Checklist de implantação v0.13.0 (primeiro em homologação)

- [ ] Backup PostgreSQL da instância e código do módulo atual, com plano de recuperação testado.
- [ ] Verificar capacidade compartilhada da instância (CPU, conexões, I/O, storage).
- [ ] Criar database `canvas_map` e role `canvas_map_app` com `000_provision_admin.sql` em conexão administrativa ao database `postgres`.
- [ ] Executar `001_schema.sql` **dentro do database canvas_map**, autenticado como `canvas_map_app`.
- [ ] Confirmar que **nenhuma tabela do database zabbix foi alterada**.
- [ ] Validar a extensão PHP `pdo_pgsql` no container web.
- [ ] Passar ZCM_DB_* ao PHP do Zabbix Web, evitando registrar senha em arquivos públicos e logs.
- [ ] Instalar módulo em todos os frontends web com mesma versão e configuração.
- [ ] Executar scripts/check-db.sh antes de habilitar o módulo.
- [ ] Testar autenticação, CSRF, autorização e concorrência com duas abas.
- [ ] Testar consulta hosts, triggers, tags, eventos, popups, navegação e refresh.
- [ ] Validar perda de conexão PostgreSQL e fallback de erro sem quebrar Zabbix.
- [ ] Testar 100 nós e 150 conexões sem sobrecarregar APIs.
- [ ] Efetuar rollback apenas da pasta do módulo; preservar canvas_map.

**RC em desenvolvimento; não homologado em Docker Zabbix 7.0.**