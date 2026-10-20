# Zabbix Canvas Map — v0.7.0 (desenvolvimento)

## Arquitetura definitiva
Frontend PHP nativo para Zabbix 7.0; JavaScript e CSS no próprio módulo; API interna autenticada; persistência no MESMO banco do Zabbix com tabela exclusiva zcm_maps. Sem banco separado, Python, Redis ou containers adicionais.

## Roadmap
| Fase | Estado |
| --- | --- |
| 0 Fundação | Implementada em código; homologação pendente |
| 1 Editor | Implementada em código; homologação pendente |
| 2 Conectores | Implementada em código; homologação pendente |
| 3 API e estados | Implementação inicial; teste real pendente |
| 4 Popups e navegação | Parcial |
| 5 Correlação | Parcial |
| 6 Qualidade | Pendente |
| 7 Persistência (nova frente) | Implementação local inicial; publicação integral pendente |

**Avanço:** sem percentual confiável de conclusão; nenhuma fase homologada em Zabbix 7.0.

## Persistência na base existente
Após backup, aplicar somente migrations/postgresql/001_zcm_maps.sql ou migrations/mysql/001_zcm_maps.sql conforme o SGBD já usado pelo Zabbix. Não alterar tabelas nativas.

Projeto v0.7.0 local adiciona módulo PHP CanvasStore, controle de revisão por mapa e interface de salvamento no banco. Publicação integral do código e testes de integração ainda pendentes. Não instalar em produção sem homologação.

## Limitações
Popup gráfico completo, regras avançadas de propagação, RBAC granular e migração automatizada ainda não concluídos. O editor da versão de desenvolvimento ainda usa JavaScript nativo, não React em produção.