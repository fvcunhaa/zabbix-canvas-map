# Zabbix Canvas Map v0.12.0 RC1 — Pré-deploy

**Não homologada em Zabbix 7.0 real. Não instalar em produção sem validar os cenários abaixo.**

## Pré-requisitos e backup

- Registrar nome/imagem Docker Zabbix Web 7.0 e SGBD em uso.
- Realizar backup consistente do banco e snapshot do módulo anterior.
- Executar scripts/preflight.sh no pacote v0.12.0 RC1.
- Aplicar somente uma migração de migrations/{postgresql,mysql}/001_zcm_maps.sql, na base existente, após revisão e backup.
- Garantir diretório do módulo persistido com bind mount/volume Docker.

## Aceite funcional

- Módulo aparece e carrega sem erros PHP/JS.
- Super Admin cria mapa, salva no banco, fecha navegador e reabre.
- Usuário não autorizado não consegue editar ou ler mapas na RC1.
- O CSRF bloqueia requisições adulteradas.
- Um mesmo mapa salvo em duas abas identifica conflito de revisão.
- Hosts e grupos respeitam as permissões da sessão Zabbix.
- Eventos e tags atualizam shapes sem sinalizar verde por falta de dados.
- Popup com mapa filho e três níveis funciona sem navegação circular.
- Container pode ser recriado sem perder mapas.
- Cenário de 100 shapes/150 conectores mantém navegabilidade.

## Rollback

Desabilitar módulo, restaurar os arquivos anteriores do módulo, preservar zcm_maps e restaurar banco somente por procedimento aprovado. Nunca executar DROP TABLE automaticamente.

## Estado do GitHub

O repositório registra arquitetura e checklist, mas a sincronização do código do pacote RC1 ainda está pendente. Não clonar como instalação completa até que todos os arquivos sejam publicados.
