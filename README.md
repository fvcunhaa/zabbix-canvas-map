# Zabbix Canvas Map — v0.12.0 RC1

Módulo frontend Zabbix 7.0, sem serviços adicionais; persistência na tabela `zcm_maps` no banco existente do Zabbix.

## Roadmap e estado

| Fase | Código | Homologação |
|---|---|---|
| 0 Fundação | Implementação inicial | Pendente |
| 1 Editor | Implementação inicial | Pendente |
| 2 Conectores | Implementação inicial | Pendente |
| 3 Integração Zabbix | Implementação inicial | Pendente |
| 4 Popups e drill-down | Parcial | Pendente |
| 5 Correlação e agregação | Parcial | Pendente |
| 6 Segurança e entrega | RC1 de pré-validação | Pendente |

**Nenhuma fase foi homologada contra um Zabbix 7.0 em execução.** Evitar percentuais que confundam código preparado com software pronto para produção.

## Arquitetura aprovada

PHP e JavaScript no módulo frontend; a API do Zabbix é utilizada na sessão autenticada. O JSON do mapa é armazenado no mesmo banco do Zabbix, em uma tabela separada prefixada `zcm_`. Migrações SQL: `migrations/postgresql/001_zcm_maps.sql` ou `migrations/mysql/001_zcm_maps.sql`.

## Entrega de desenvolvimento RC1

A versão local v0.12.0 RC1 foi preparada com verificações de permissão Super Admin para mapas, validação de payload e revisão de escrita. Foram aprovados **13 testes unitários locais** e checagens de sintaxe PHP/JavaScript/Bash.

**ATENÇÃO:** a publicação integral dos arquivos do editor e dos controllers atualizados no GitHub ainda está pendente. A versão instalável está no pacote ZIP entregue no ChatGPT. O repositório não deve ser tratado como uma release completa até a sincronização de todos os arquivos.

## Pré-deploy

1. Backup do banco e do módulo anterior.
2. Validar versão/contêiner Docker Zabbix Web e SGBD.
3. Executar preflight, depois revisar e aplicar somente a migração correspondente ao banco já existente.
4. Instalar em volume persistente, registrar e habilitar o módulo.
5. Homologar sessão, CSRF, leitura de API, permissões, concorrência, telas e recriação do contêiner.
6. Manter rollback preservando a tabela `zcm_maps`.

Confira `docs/RELEASE-CANDIDATE.md` para os critérios detalhados.

**Não instalar em produção antes de homologação.**
