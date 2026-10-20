# Zabbix Canvas Map — v0.3.0 (Fase 2)

Módulo frontend nativo para Zabbix 7.0 LTS, executado em Docker, para construção de mapas visuais de processos, serviços e infraestrutura.

> **Avanço do roadmap: 42,9% — 3 de 7 fases implementadas em código.** Este número é um indicador simplificado de fases (pesos iguais), não mede esforço concluído, testes em produção ou homologação. As fases 0–2 ainda dependem de validação em um Zabbix 7.0 real.

## Roadmap

| Fase | Escopo | Situação |
|---|---|---|
| **0 — Fundação** | Estrutura de módulo PHP, manifest, menu, Docker e scripts | Código preparado; homologação pendente |
| **1 — Editor visual** | Shapes, imagens, textos, drag-and-drop, zoom e salvamento local | Código preparado; homologação pendente |
| **2 — Conectores** | Setas retas/curvas/ortogonais, estilos, rótulos, animações e JSON schema 2 | Código preparado; homologação pendente |
| **3 — Integração Zabbix** | Hosts, grupos, triggers, tags, problemas, thresholds e refresh | Pendente |
| **4 — Navegação** | Popups de mapas e problemas, três níveis de drill-down | Pendente |
| **5 — Correlação** | Tag `depends_on`, relações, propagação e investigação de impacto | Pendente |
| **6 — Qualidade e entrega** | Testes integrados, segurança, documentação, empacotamento e homologação | Pendente |

**Fases em código:** 3 / 7 = **42,9%**.  
**Fases homologadas em Zabbix 7.0:** 0 / 7.  
**Próxima fase:** 3 — integração com dados reais do Zabbix.

## Funcionalidades da versão 0.3.0

- Canvas com shapes (retângulos, círculos, losangos e texto), imagens e edição visual.
- Movimentação, redimensionamento, zoom, duplicação, exclusão e undo/redo.
- Conexões entre shapes com estilos sólido, tracejado ou pontilhado; setas e rótulos.
- Conectores retos, curvos e ortogonais, animação opcional e posicionamento associado aos shapes.
- Exportação/importação JSON, com compatibilidade de mapas schema 1 e 2.
- Salvamento apenas no `localStorage` do navegador.

**Limitações:** sem integração com eventos reais do Zabbix, popup/drill-down, correlação de dependências ou persistência multiusuário. A ação de seta é local. O editor distribuído usa JavaScript nativo; a estrutura experimental React não é utilizada em produção.

## Instalação Docker

Com os arquivos do módulo disponíveis localmente:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}'
ZABBIX_WEB_CONTAINER=zabbix-web ./scripts/install.sh
ZABBIX_WEB_CONTAINER=zabbix-web ./scripts/check.sh
```

No Zabbix: **Administration → General → Modules → Scan directory** e habilitar o Canvas Map. Substitua o nome de container conforme seu ambiente.

Para atualizar uma instalação anterior:

```bash
ZABBIX_WEB_CONTAINER=zabbix-web ./scripts/upgrade.sh
```

Para persistência entre recriações de container, adicione um bind mount para `/usr/share/zabbix/modules/zabbix-canvas-map` no serviço Zabbix Web. Não substitua todo o diretório nativo de módulos.

## Teste manual mínimo

1. Abrir o módulo no Zabbix 7.0.
2. Criar e editar shapes com texto e imagem.
3. Conectar dois shapes e alterar formatos e animações da seta.
4. Mover os shapes e confirmar que os conectores acompanham.
5. Salvar, recarregar, importar e exportar um mapa JSON.
6. Verificar se a console não apresenta erros e se o menu respeita permissões.

## Estado da publicação

Este README registra o planejamento e progresso. A publicação do código-fonte completo deve incluir `module/`, `scripts/`, `frontend/` e o ambiente Docker do pacote local da Fase 2. **README sozinho não constitui instalação funcional.**

## Segurança

O JSON importado tem validação parcial nesta fase; use somente arquivos confiáveis. Imagens estão limitadas a PNG/JPEG/WebP até 1 MB. Dados locais podem ser perdidos se o navegador for limpo. Não use a versão 0.3.0 como implantação de produção sem homologação.
