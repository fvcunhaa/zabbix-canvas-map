const zcmBoot = () => {
'use strict';
const root=document.getElementById('zcm-root');if(!root)return;
const KEY='zcm:v0.2:map';const LIBKEY='zcm:v0.6:maps';let revisions={};let mapId='main';let mapName='Mapa principal';let library={};const apiEndpoint='zabbix.php?action=canvas.data';let states={},latest=0,refreshTimer=null;let selected=null,selectedEdge=null,drag=null,dirty=false,connectFrom=null;
const uid=()=> 'n'+Math.random().toString(36).slice(2,10);
const make=(type,x=100,y=100)=>({id:uid(),type,action:'none',targetMap:'',x,y,w:type==='text'?210:180,h:type==='text'?64:120,text:type==='text'?'Edite este texto':type==='circle'?'Serviço':'Novo processo',fill:type==='text'?'transparent':'#233a5a',stroke:'#61b4f7',color:'#ffffff',font:17,image:'',binding:{type:'none',id:'',tag:'',value:'',warning:2,critical:4}});
let nodes=[],edges=[],history=[],future=[];const edgeMake=(source,target)=>({id:uid(),source,target,kind:'bezier',stroke:'#67c8ff',width:3,pattern:'solid',animation:'none',arrow:'end',label:'',action:'none'});const serialize=()=>JSON.stringify({schema:3,nodes,edges});const applySnapshot=s=>{const p=JSON.parse(s);nodes=p.nodes||[];edges=p.edges||[]};
function snapshot(){history.push(serialize());if(history.length>40)history.shift();future=[];dirty=true}
function restore(){try{library=JSON.parse(localStorage.getItem(LIBKEY)||'{}')||{};const current=library.main||JSON.parse(localStorage.getItem(KEY)||'null');let p=current;if([1,2,3].includes(p?.schema)&&Array.isArray(p.nodes)){nodes=p.nodes.filter(n=>n&&typeof n.id==='string').slice(0,300);edges=validateEdges(p.edges||[],nodes)}}catch(e){console.warn('Canvas Map: dados locais inválidos',e)}if(!nodes.length){nodes=[make('rect',120,100),make('circle',390,130),make('text',150,310)];nodes[0].text='Processo de negócio';nodes[1].text='Sistema / Serviço';nodes[2].text='Duplo clique para editar texto';}}
const safe=s=>String(s??'');
root.innerHTML=`<section class="zcm-app"><header class="zcm-toolbar"><strong>▦ Zabbix Canvas Map</strong><span class="zcm-muted">Editor visual · v0.13.0 preview · Homologação pendente</span><span class="zcm-spacer"></span><button data-act="undo" title="Desfazer">↶</button><button data-act="redo" title="Refazer">↷</button><button data-act="save" class="zcm-primary">Salvar Canvas</button><button data-act="refresh" title="Atualizar estados">↻ Atualizar</button><button data-act="maps" title="Administrar mapas">▤ Mapas</button><button data-act="preview" title="Visualizar mapa">▶ Visualizar</button><button data-act="dependencies" title="Analisar dependências dos hosts vinculados">⤴ Dependências</button><button data-act="export">Exportar JSON</button><label class="zcm-upload">Importar JSON<input id="zcm-import" type="file" accept="application/json,.json" hidden></label></header><div class="zcm-layout"><div class="zcm-panel"><h3>Elementos</h3><p class="zcm-help">Clique para adicionar. Arraste para mover e use a alça azul para redimensionar.</p><button data-add="rect">▭ Retângulo</button><button data-add="round">▢ Retângulo arredondado</button><button data-add="circle">◯ Círculo</button><button data-add="diamond">◇ Losango</button><button data-add="text">T Caixa de texto</button><div class="zcm-divider"></div><h3>Conectores</h3><p class="zcm-help">Clique em Conectar, depois escolha o shape de origem e o de destino.</p><button data-act="connect" id="zcm-connect">↗ Conectar shapes</button><button data-act="cancel-connect">Cancelar conexão</button><div class="zcm-divider"></div><button data-act="duplicate">Duplicar selecionado</button><button data-act="delete">Excluir selecionado</button><div class="zcm-divider"></div><h3>Navegação</h3><p class="zcm-help">Roda do mouse para rolar. Ctrl + roda para zoom. Mantenha espaço pressionado e arraste o fundo para navegar.</p><button data-act="zoom-out">− Zoom</button><button data-act="zoom-in">+ Zoom</button><button data-act="reset-view">Ajustar vista</button></div><div class="zcm-stage-wrap"><div id="zcm-stage" class="zcm-stage"><div id="zcm-world" class="zcm-world"><svg id="zcm-svg" xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600"></svg></div></div><div class="zcm-status"><span id="zcm-message">Editor carregado · sincronização com canvas_map</span><span id="zcm-scale"></span></div></div><div class="zcm-panel zcm-props"><h3>Propriedades</h3><p id="zcm-none" class="zcm-help">Selecione um elemento para editar.</p><div id="zcm-edge-fields" hidden><label>Tipo<select data-edge="kind"><option value="bezier">Curva</option><option value="straight">Reta</option><option value="orthogonal">Ortogonal</option></select></label><label>Estilo<select data-edge="pattern"><option value="solid">Sólida</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option></select></label><label>Animação<select data-edge="animation"><option value="none">Nenhuma</option><option value="flow">Fluxo</option><option value="pulse">Pulsar</option></select></label><label>Seta<select data-edge="arrow"><option value="end">Destino</option><option value="both">Ambas as pontas</option><option value="none">Sem seta</option></select></label><label>Cor<input data-edge="stroke" type="color"></label><label>Espessura<input data-edge="width" type="number" min="1" max="12"></label><label>Rótulo<input data-edge="label" maxlength="80"></label><label>Ação ao clicar<select data-edge="action"><option value="none">Somente selecionar</option><option value="detail">Exibir detalhes</option></select></label><p class="zcm-help">A ação de detalhes é uma prévia local; eventos Zabbix estarão disponíveis nas próximas fases.</p></div><div id="zcm-fields" hidden><h3>Navegação</h3><label>Ação ao clicar<select data-nav="action"><option value="none">Nenhuma</option><option value="map">Abrir mapa filho</option><option value="problems">Problemas do shape</option></select></label><label>ID do mapa filho<input data-nav="targetMap" placeholder="Ex.: cctv"></label><p class="zcm-help">Use o botão Mapas para criar e selecionar mapas filhos.</p><div class="zcm-divider"></div><h3>Monitoramento Zabbix</h3><label>Origem de status<select data-bind="type"><option value="none">Não monitorado</option><option value="host">Host</option><option value="group">Grupo de hosts</option><option value="tag">Tag de host</option></select></label><label>Pesquisar hosts/grupos<input id="zcm-search" placeholder="Digite 2+ caracteres"></label><div id="zcm-search-results" class="zcm-search-results"></div><label>ID selecionado<input data-bind="id" readonly></label><label>Tag (nome)<input data-bind="tag" maxlength="128" placeholder="service"></label><label>Valor da tag<input data-bind="value" maxlength="128" placeholder="CCTV"></label><label>Severidade para atenção<select data-bind="warning"><option value="0">Not classified</option><option value="1">Information</option><option value="2">Warning</option><option value="3">Average</option><option value="4">High</option><option value="5">Disaster</option></select></label><label>Severidade para crítico<select data-bind="critical"><option value="0">Not classified</option><option value="1">Information</option><option value="2">Warning</option><option value="3">Average</option><option value="4">High</option><option value="5">Disaster</option></select></label><div class="zcm-divider"></div><h3>Regras de status</h3><label>Origem do status<select data-rule="source"><option value="own">Status próprio</option><option value="children">Mapa filho</option><option value="combined">Pior entre próprio e filho</option></select></label><label>Propagação de dependência<select data-rule="mode"><option value="own">Não herdar</option><option value="combined">Próprio + dependências</option><option value="inherited">Somente dependências quando houver impacto</option></select></label><label>Severidade mínima de impacto<select data-rule="criticalSeverity"><option value="2">Warning</option><option value="3">Average</option><option value="4">High</option><option value="5">Disaster</option></select></label><label><input type="checkbox" data-rule="includeInMap"> Participar da agregação do mapa</label><p id="zcm-node-status" class="zcm-help">Sem vínculo</p><div class="zcm-divider"></div><label>Texto<textarea data-field="text" rows="4"></textarea></label><div class="zcm-two"><label>X<input data-field="x" type="number"></label><label>Y<input data-field="y" type="number"></label><label>Largura<input data-field="w" min="36" type="number"></label><label>Altura<input data-field="h" min="30" type="number"></label></div><div class="zcm-two"><label>Fundo<input data-field="fill" type="color"></label><label>Borda<input data-field="stroke" type="color"></label><label>Texto<input data-field="color" type="color"></label><label>Fonte<input data-field="font" min="8" max="80" type="number"></label></div><label>Imagem no shape<input id="zcm-image" type="file" accept="image/png,image/jpeg,image/webp"></label><button data-act="remove-image">Remover imagem</button><p class="zcm-help">A imagem fica incorporada ao mapa exportado. Limite recomendado: 1 MB.</p></div></div></div><input id="zcm-text-input" class="zcm-inline-editor" hidden><div class="zcm-note">Fases 4–5: mapas com popup e análise de dependências. Persistência centralizada disponível após provisionar canvas_map; atualizações a cada 30 segundos.</div></section>`;
// Collapsible, independently resizable tool panels. Persist only harmless UI preferences.
const layout=root.querySelector('.zcm-layout');
const leftPanel=layout?.querySelector('.zcm-panel:not(.zcm-props)');
const rightPanel=layout?.querySelector('.zcm-props');
if(layout&&leftPanel&&rightPanel){
 const prefKey='zcm:workspace-layout:v1';
 let pref={left:true,right:true,leftWidth:228,rightWidth:290};
 try {const stored=JSON.parse(localStorage.getItem(prefKey)||'null');if(stored&&typeof stored==='object')pref={...pref,...stored};}catch(_){}
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 pref.leftWidth=clamp(Number(pref.leftWidth)||228,190,430);
 pref.rightWidth=clamp(Number(pref.rightWidth)||290,230,500);
 const savePref=()=>{try{localStorage.setItem(prefKey,JSON.stringify(pref));}catch(_){}};
 const controls=document.createElement('div');
 controls.className='zcm-workspace-controls';
 controls.innerHTML='<button type="button" data-zcm-toggle="left" aria-label="Alternar painel de elementos">☰ Elementos</button><button type="button" data-zcm-toggle="right" aria-label="Alternar painel de propriedades">⚙ Propriedades</button><button type="button" data-zcm-toggle="focus" aria-label="Foco no canvas">⛶ Foco no mapa</button>';
 root.querySelector('.zcm-toolbar')?.prepend(controls);
 const leftHandle=document.createElement('div'),rightHandle=document.createElement('div');
 leftHandle.className='zcm-split-handle zcm-split-left';
 rightHandle.className='zcm-split-handle zcm-split-right';
 layout.append(leftHandle,rightHandle);
 let focus=false;
 function apply(){
   layout.classList.toggle('zcm-left-closed',!pref.left);
   layout.classList.toggle('zcm-right-closed',!pref.right);
   layout.style.setProperty('--zcm-left-width',pref.leftWidth+'px');
   layout.style.setProperty('--zcm-right-width',pref.rightWidth+'px');
   for(const b of controls.querySelectorAll('[data-zcm-toggle]')){
     const x=b.dataset.zcmToggle;
     const expanded=x==='left'?pref.left:x==='right'?pref.right:focus;
     b.setAttribute('aria-pressed',String(expanded));
   }
   savePref();
 }
 controls.addEventListener('click',e=>{
   const btn=e.target.closest('[data-zcm-toggle]');if(!btn)return;
   if(btn.dataset.zcmToggle==='left') {pref.left=!pref.left;focus=false;}
   if(btn.dataset.zcmToggle==='right') {pref.right=!pref.right;focus=false;}
   if(btn.dataset.zcmToggle==='focus'){
     focus=!(focus&& !pref.left&&!pref.right);
     pref.left=!focus;pref.right=!focus;
   }
   apply();
 });
 for(const [handle,side] of [[leftHandle,'left'],[rightHandle,'right']]){
   handle.addEventListener('pointerdown',e=>{
     if(e.button!==0)return;
     e.preventDefault();
     const start=e.clientX,initial=side==='left'?pref.leftWidth:pref.rightWidth;
     handle.setPointerCapture(e.pointerId);
     const move=ev=>{
       const delta=(ev.clientX-start)*(side==='left'?1:-1);
       pref[side+'Width']=clamp(initial+delta,side==='left'?190:230,side==='left'?430:500);
       apply();
     };
     const stop=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);};
     handle.addEventListener('pointermove',move);
     handle.addEventListener('pointerup',stop);
     handle.addEventListener('pointercancel',stop);
   });
 }
 apply();
}
const edgeFields=root.querySelector('#zcm-edge-fields');const svg=root.querySelector('#zcm-svg'),world=root.querySelector('#zcm-world'),stage=root.querySelector('#zcm-stage'),fields=root.querySelector('#zcm-fields');let scale=1,offset={x:0,y:0},space=false;
function esc(s){return safe(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function validateEdges(list,available){const valid=new Set(available.map(n=>n.id));return Array.isArray(list)?list.filter(e=>e&&typeof e.id==='string'&&valid.has(e.source)&&valid.has(e.target)&&e.source!==e.target).slice(0,600).map(e=>({...edgeMake(e.source,e.target),...e,kind:['bezier','straight','orthogonal'].includes(e.kind)?e.kind:'bezier',pattern:['solid','dashed','dotted'].includes(e.pattern)?e.pattern:'solid',animation:['none','flow','pulse'].includes(e.animation)?e.animation:'none',arrow:['none','end','both'].includes(e.arrow)?e.arrow:'end',action:['none','detail'].includes(e.action)?e.action:'none',stroke:/^#[0-9a-f]{6}$/i.test(e.stroke)?e.stroke:'#67c8ff',width:Math.max(1,Math.min(12,Number(e.width)||3)),label:safe(e.label).slice(0,80)})):[]}
function endpoint(n,toward){const x=Number(n.x)+Number(n.w)/2,y=Number(n.y)+Number(n.h)/2,tx=Number(toward.x)+Number(toward.w)/2,ty=Number(toward.y)+Number(toward.h)/2,dx=tx-x,dy=ty-y;const factor=1/Math.max(Math.abs(dx)/(Math.max(36,+n.w)/2),Math.abs(dy)/(Math.max(30,+n.h)/2),1);return {x:x+dx*factor,y:y+dy*factor}}
function drawEdges(){const byId=new Map(nodes.map(n=>[n.id,n]));return `<defs><marker id="zcm-arrow-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 z" fill="context-stroke"/></marker></defs>`+edges.map(e=>{let a=byId.get(e.source),b=byId.get(e.target);if(!a||!b)return '';let p=endpoint(a,b),q=endpoint(b,a),dx=q.x-p.x,dy=q.y-p.y;let d=e.kind==='straight'?`M ${p.x} ${p.y} L ${q.x} ${q.y}`:e.kind==='orthogonal'?`M ${p.x} ${p.y} L ${p.x+dx/2} ${p.y} L ${p.x+dx/2} ${q.y} L ${q.x} ${q.y}`:`M ${p.x} ${p.y} C ${p.x+dx*.55} ${p.y} ${q.x-dx*.55} ${q.y} ${q.x} ${q.y}`;let stroke=esc(e.stroke),dash=e.pattern==='dashed'?'10 7':e.pattern==='dotted'?'2 7':'none',cls=e.animation==='flow'?'zcm-edge-flow':e.animation==='pulse'?'zcm-edge-pulse':'';let markers=`${e.arrow==='end'||e.arrow==='both'?'marker-end="url(#zcm-arrow-end)"':''} ${e.arrow==='both'?'marker-start="url(#zcm-arrow-end)"':''}`;const chosen=e.id===selectedEdge;return `<g data-edge="${esc(e.id)}" class="zcm-edge ${cls}"><path d="${d}" fill="none" stroke="transparent" stroke-width="20" class="zcm-edge-hit"/><path d="${d}" fill="none" stroke="${stroke}" stroke-width="${chosen?Number(e.width)+2:e.width}" stroke-dasharray="${dash}" ${markers} class="zcm-edge-visible" pointer-events="none"/>${chosen?`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff"/><circle cx="${q.x}" cy="${q.y}" r="5" fill="#fff"/>`:''}${e.label?`<text x="${(p.x+q.x)/2}" y="${(p.y+q.y)/2-11}" text-anchor="middle" fill="white" font-size="14" paint-order="stroke" stroke="#142335" stroke-width="4" pointer-events="none">${esc(e.label)}</text>`:''}</g>`}).join('')}
function draw(){svg.innerHTML=drawEdges()+nodes.map(n=>{const x=Number(n.x)||0,y=Number(n.y)||0,w=Math.max(36,Number(n.w)||36),h=Math.max(30,Number(n.h)||30),stroke=esc(n.stroke||'#61b4f7'),fill=esc(n.fill||'#233a5a');let shape=n.type==='circle'?`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-2}" ry="${h/2-2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`:n.type==='diamond'?`<polygon points="${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`:`<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="${n.type==='round'?20:2}" fill="${fill}" stroke="${n.type==='text'?'none':stroke}" stroke-width="2"/>`;
const lines=safe(n.text).split('\n').slice(0,10);const img=n.image?`<image href="${esc(n.image)}" x="4" y="4" width="${w-8}" height="${h-8}" preserveAspectRatio="xMidYMid meet" opacity=".72"/>`:'';const st=states[n.id];const statusRing=st?`<rect x="-3" y="-3" width="${w+6}" height="${h+6}" rx="7" fill="none" stroke="${st.status==='critical'?'#e03131':st.status==='warning'?'#efb700':st.status==='ok'?'#24ac5a':'#8894a5'}" stroke-width="5" pointer-events="none"/>`:'';const txt=lines.map((s,i)=>`<text x="${w/2}" y="${h/2+(i-(lines.length-1)/2)*((n.font||17)*1.2)}" dominant-baseline="middle" text-anchor="middle" fill="${esc(n.color)}" font-size="${Math.max(8,Math.min(80,+n.font||17))}" font-family="Arial,sans-serif" font-weight="600" pointer-events="none">${esc(s)}</text>`).join('');const sel=selected===n.id?`<rect x="-5" y="-5" width="${w+10}" height="${h+10}" stroke="#17b9fe" stroke-width="1.5" stroke-dasharray="5 4" fill="none" pointer-events="none"/><rect data-resize="${esc(n.id)}" x="${w-7}" y="${h-7}" width="14" height="14" rx="3" fill="#17b9fe" stroke="white" stroke-width="1"/>`:'';return `<g data-node="${esc(n.id)}" transform="translate(${x},${y})" style="cursor:move">${shape}${img}${statusRing}${txt}<rect width="${w}" height="${h}" fill="transparent"/>${sel}</g>`}).join('');root.querySelector('#zcm-scale').textContent=Math.round(scale*100)+'%';}
function sync(){const n=nodes.find(n=>n.id===selected),edge=edges.find(e=>e.id===selectedEdge);fields.hidden=!n;edgeFields.hidden=!edge;root.querySelector('#zcm-none').hidden=!!(n||edge);if(edge){edgeFields.querySelectorAll('[data-edge]').forEach(el=>el.value=edge[el.dataset.edge]??'')} if(n){fields.querySelectorAll('[data-nav]').forEach(el=>el.value=n[el.dataset.nav]||'');let b=n.binding||{type:'none',id:'',tag:'',value:'',warning:2,critical:4};fields.querySelectorAll('[data-bind]').forEach(el=>el.value=b[el.dataset.bind]??'');const r=n.statusRule||{};fields.querySelectorAll('[data-rule]').forEach(el=>{el.type==='checkbox'?el.checked=r.includeInMap!==false:el.value=r[el.dataset.rule]??({source:'own',mode:'own',criticalSeverity:4}[el.dataset.rule]||'own')});const st=states[n.id];root.querySelector('#zcm-node-status').textContent=st?`Estado: ${st.status} · ${st.count||0} problema(s) · ${st.hostCount||0} host(s)`:'Sem leitura ou vínculo';fields.querySelectorAll('[data-field]').forEach(el=>{let v=n[el.dataset.field];el.value=(['fill','stroke','color'].includes(el.dataset.field)&&!/^#[0-9a-f]{6}$/i.test(v))?'#ffffff':v??''});}}
function message(t){root.querySelector('#zcm-message').textContent=t}
function pick(id){selected=id;selectedEdge=null;sync();draw()}function pickEdge(id){selected=null;selectedEdge=id;sync();draw()}
function render(){sync();draw()}
function add(type){snapshot();let n=make(type,Math.round(110+Math.random()*170),Math.round(100+Math.random()*100));nodes.push(n);pick(n.id);message('Elemento adicionado · alterações não salvas')}
async function store(op,id,doc){
 const token=root.dataset.csrf;
 if(!token)throw Error('Token CSRF não disponível');
 const body=new URLSearchParams({op,map_id:id||'',revision:String(revisions[id]||0)});
 if(doc)body.set('document',JSON.stringify(doc));
 const response=await fetch('zabbix.php?action=canvas.store&_csrf_token='+encodeURIComponent(token),{
  method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded'},body
 });
 const raw=await response.text();
 let result;
 try { result=JSON.parse(raw); }
 catch (_) {
   const isHtml=/^\\s*<(?:!doctype|html|div|body|head)/i.test(raw);
   throw Error('Endpoint canvas.store retornou '+(isHtml?'HTML':'conteúdo não-JSON')+
     ' (HTTP '+response.status+'). Verifique permissão da action, CSRF e resposta do PHP-FPM.');
 }
 if(!response.ok)throw Error(result.error || ('HTTP '+response.status));
 if(result.error)throw Error(result.error);
 return result;
}
async function saveRemote(){
 try{const r=await store('save',mapId,JSON.parse(serialize()));revisions[mapId]=r.revision;
 library[mapId]=JSON.parse(serialize());dirty=false;message('Mapa salvo no banco canvas_map · revisão '+r.revision);
 }catch(e){message('Falha ao salvar no Zabbix: '+e.message)}
}
async function bootstrapRemote(){
 try{const r=await store('list','');if(!Array.isArray(r.maps))return;
 for(const m of r.maps){const x=await store('read',m.map_id);if(x.map){library[m.map_id]=x.map;revisions[m.map_id]=x.revision}}
 if(library.main){mapId='main';nodes=structuredClone(library.main.nodes||[]);edges=validateEdges(library.main.edges||[],nodes);render();refreshStates()}
 message('Biblioteca carregada do banco canvas_map · '+r.maps.length+' mapa(s)');
 }catch(e){message('Banco não disponível: '+e.message+' · mapas locais somente como recuperação')}
}
function action(a){const n=nodes.find(n=>n.id===selected);if(a==='refresh'){refreshStates();return}if(a==='maps'){manageMaps();return}if(a==='preview'){openMapModal(mapId,0,[]);return}if(a==='dependencies'){showDependencies();return}if(a==='connect'){connectFrom=null;root.querySelector('#zcm-connect').classList.add('zcm-connecting');message('Selecione a origem e depois o destino da seta');return}if(a==='cancel-connect'){connectFrom=null;root.querySelector('#zcm-connect').classList.remove('zcm-connecting');message('Conexão cancelada');return}if(a==='save'){saveRemote();return}if(a==='export'){let blob=new Blob([JSON.stringify({schema:2,nodes,edges},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='zabbix-canvas-map.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return}if(a==='undo'&&history.length){future.push(serialize());applySnapshot(history.pop());pick(null);return}if(a==='redo'&&future.length){history.push(serialize());applySnapshot(future.pop());pick(null);return}if(a==='duplicate'&&n){snapshot();let copy={...n,id:uid(),x:+n.x+25,y:+n.y+25};nodes.push(copy);pick(copy.id);return}if(a==='delete'&&selectedEdge){snapshot();edges=edges.filter(x=>x.id!==selectedEdge);pickEdge(null);return}if(a==='delete'&&n){snapshot();nodes=nodes.filter(x=>x.id!==n.id);edges=edges.filter(e=>e.source!==n.id&&e.target!==n.id);pick(null);return}if(a==='remove-image'&&n){snapshot();n.image='';render();return}if(a==='zoom-in'||a==='zoom-out'){scale=Math.max(.3,Math.min(2.5,scale*(a==='zoom-in'?1.2:1/1.2)));transform()}if(a==='reset-view'){scale=1;offset={x:0,y:0};transform()}}
function transform(){world.style.transform=`translate(${offset.x}px,${offset.y}px) scale(${scale})`;draw()}
edgeFields.addEventListener('change',e=>{const el=e.target.closest('[data-edge]'),edge=edges.find(x=>x.id===selectedEdge);if(!el||!edge)return;snapshot();edge[el.dataset.edge]=el.dataset.edge==='width'?Math.max(1,Math.min(12,Number(el.value)||3)):el.dataset.edge==='label'?el.value.slice(0,80):el.value;render()});
svg.addEventListener('click',e=>{const group=e.target.closest('[data-edge]');if(!group||e.target.closest('[data-node]'))return;const edge=edges.find(x=>x.id===group.dataset.edge);if(!edge)return;pickEdge(edge.id);if(edge.action==='detail'&&!connectFrom)message('Relação: '+(nodes.find(n=>n.id===edge.source)?.text||edge.source)+' → '+(nodes.find(n=>n.id===edge.target)?.text||edge.target));});
root.addEventListener('click',e=>{let b=e.target.closest('[data-add],[data-act]');if(!b)return;if(b.dataset.add)add(b.dataset.add);else action(b.dataset.act)});
fields.addEventListener('change',e=>{const el=e.target.closest('[data-nav]'),n=nodes.find(n=>n.id===selected);if(!el||!n)return;snapshot();n[el.dataset.nav]=String(el.value).slice(0,80);render()});
function saveActiveMap(){library[mapId]=JSON.parse(serialize());localStorage.setItem(LIBKEY,JSON.stringify(library));if(mapId==='main')localStorage.setItem(KEY,serialize());dirty=false}
function loadMap(id){if(!library[id])throw new Error('Mapa não encontrado: '+id);if(dirty)saveActiveMap();mapId=id;nodes=structuredClone(library[id].nodes||[]);edges=validateEdges(library[id].edges||[],nodes);selected=null;selectedEdge=null;states={};history=[];future=[];render();refreshStates();message('Editando mapa: '+id)}
function makeOverlay(title){const old=root.querySelector('.zcm-dependency-overlay.zcm-nav-modal');old?.remove();const overlay=document.createElement('div');overlay.className='zcm-dependency-overlay zcm-nav-modal';const panel=document.createElement('section');panel.className='zcm-dependency-panel zcm-map-panel';const heading=document.createElement('h2');heading.textContent=title;panel.append(heading);overlay.append(panel);root.append(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});return {overlay,panel}}
function manageMaps(){const {overlay,panel}=makeOverlay('Mapas disponíveis');const actions=document.createElement('div');actions.className='zcm-map-actions';const entry=document.createElement('input');entry.placeholder='Identificador (ex.: cctv)';entry.maxLength=60;const create=document.createElement('button');create.textContent='Criar mapa';create.addEventListener('click',()=>{const id=entry.value.trim();if(!/^[a-z][a-z0-9_-]{1,59}$/.test(id)){alert('Use letras minúsculas, números, _ e - (2 a 60 caracteres)');return}if(library[id]){alert('Mapa já existe');return}saveActiveMap();library[id]={schema:3,nodes:[],edges:[]};localStorage.setItem(LIBKEY,JSON.stringify(library));overlay.remove();loadMap(id)});actions.append(entry,create);panel.append(actions);saveActiveMap();Object.keys(library).sort().forEach(id=>{const row=document.createElement('div');row.className='zcm-map-actions';const name=document.createElement('strong');name.textContent=id+(id===mapId?' (atual)':'');const edit=document.createElement('button');edit.textContent='Editar';edit.addEventListener('click',()=>{overlay.remove();loadMap(id)});const preview=document.createElement('button');preview.textContent='Visualizar';preview.addEventListener('click',()=>{overlay.remove();openMapModal(id,0,[])});row.append(name,edit,preview);panel.append(row)});const close=document.createElement('button');close.textContent='Fechar';close.addEventListener('click',()=>overlay.remove());panel.append(close)}
function previewSvg(doc,liveStates={}){
 const list=(doc.nodes||[]).slice(0,300), links=validateEdges(doc.edges||[],list),byId=new Map(list.map(n=>[n.id,n]));
 const maxX=Math.max(800,...list.map(n=>Number(n.x||0)+Number(n.w||180)+80));
 const maxY=Math.max(480,...list.map(n=>Number(n.y||0)+Number(n.h||100)+80));
 const edgeMarkup=links.map(e=>{const from=byId.get(e.source),to=byId.get(e.target);if(!from||!to)return '';const a=endpoint(from,to),b=endpoint(to,from),dx=b.x-a.x;const d=e.kind==='straight'?`M${a.x},${a.y}L${b.x},${b.y}`:e.kind==='orthogonal'?`M${a.x},${a.y}H${a.x+dx/2}V${b.y}H${b.x}`:`M${a.x},${a.y}C${a.x+dx*.5},${a.y} ${b.x-dx*.5},${b.y} ${b.x},${b.y}`;const dash=e.pattern==='dashed'?'9,7':e.pattern==='dotted'?'2,6':'none';return `<g class="zcm-preview-edge ${e.animation==='flow'?'zcm-edge-flow':e.animation==='pulse'?'zcm-edge-pulse':''}"><path d="${d}" fill="none" stroke="${esc(e.stroke)}" stroke-width="${e.width}" stroke-dasharray="${dash}" ${e.arrow!=='none'?'marker-end="url(#zcm-preview-arrow)"':''}/>${e.label?`<text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-8}" fill="white" text-anchor="middle" font-size="13">${esc(e.label)}</text>`:''}</g>`}).join('');
 const nodeMarkup=list.map(n=>{const x=Number(n.x)||0,y=Number(n.y)||0,w=Math.max(36,Number(n.w)||180),h=Math.max(30,Number(n.h)||100);const st=liveStates[n.id]?.status;const impacted=!!liveStates[n.id]?.impact;const color=st==='critical'?'#ef4444':st==='warning'?'#facc15':st==='ok'?'#22c55e':n.stroke||'#61b4f7';const fill=/^#[\da-f]{6}$/i.test(n.fill)?n.fill:'#233a5a';const shape=n.type==='circle'?`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}"/>`:n.type==='diamond'?`<polygon points="${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}"/>`:`<rect width="${w}" height="${h}" rx="${n.type==='round'?18:4}"/>`;const image=typeof n.image==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(n.image)?`<image href="${esc(n.image)}" x="3" y="3" width="${w-6}" height="${h-6}" preserveAspectRatio="xMidYMid slice"/>`:'';const rows=safe(n.text).slice(0,500).split('\n').slice(0,8);const label=rows.map((t,i)=>`<tspan x="${w/2}" dy="${i?Number(n.font)||17:0}">${esc(t)}</tspan>`).join('');return `<g data-preview-node="${esc(n.id)}" transform="translate(${x},${y})" style="cursor:${n.action==='map'||n.action==='problems'?'pointer':'default'}"><g fill="${n.type==='text'?'transparent':fill}" stroke="${esc(color)}" stroke-width="${st?3:2}" stroke-dasharray="${impacted?'8 5':'none'}">${shape}</g>${image}<text x="${w/2}" y="${h/2}" font-size="${Math.max(8,Math.min(80,Number(n.font)||17))}" fill="${esc(n.color||'#ffffff')}" text-anchor="middle" dominant-baseline="middle" pointer-events="none">${label}</text></g>`}).join('');
 return `<svg class="zcm-map-svg" viewBox="0 0 ${maxX} ${maxY}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa visual"><defs><marker id="zcm-preview-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#67c8ff"/></marker></defs>${edgeMarkup}${nodeMarkup}</svg>`;
}
async function getMapDoc(id){if(id===mapId)return JSON.parse(serialize());if(library[id])return library[id];try{const response=await store('read',id);if(response.map){library[id]=response.map;return response.map}}catch(e){message('Erro ao carregar mapa: '+e.message)}return null}
// Visual-only correlation: declared dependencies indicate possible impact, not proven root cause.
async function enrichedStates(doc){
 const list=(doc.nodes||[]).filter(n=>n.binding&&n.binding.type!=='none');
 const result=list.length?await request({op:'status',bindings:JSON.stringify(list.map(n=>({nodeid:n.id,...n.binding})))}):{states:{}};
 const values=result.states||{};
 const ids=[...new Set(list.filter(n=>n.binding.type==='host'&&/^\d+$/.test(String(n.binding.id||''))).map(n=>String(n.binding.id)))];
 if(ids.length){
  try{
   const deps=await request({op:'dependencies',hostids:JSON.stringify(ids.slice(0,50))});
   const problems=deps.issues||{}; const relationships=deps.relations||[];
   const engine=window.ZCMStatusEngine;
   if(!engine)throw new Error('Motor de status não carregado');
   for(const n of list){if(n.binding.type!=='host')continue;
    const own=values[n.id]||{status:'unknown',count:0,hostCount:0};
    const impact=engine.propagate(n.binding.id,relationships,problems,{maxDepth:4});
    const rule=n.statusRule||{};
    const evaluated=engine.applyImpact(own.status,impact,rule);
    values[n.id]={...own,...evaluated,impactCount:evaluated.impactCount||0};
   }
  }catch(e){message('Estados carregados; correlação indisponível: '+e.message)}
 }
 // When configured, a parent shape may aggregate the states of its child map.
 // Recursion is bounded by the three-level navigation contract.
 for(const n of doc.nodes||[]){
  if(n.statusRule?.source!=='children'&&n.statusRule?.source!=='combined')continue;
  const id=String(n.targetMap||'');
  if(n.action!=='map'||!id){values[n.id]={...values[n.id],status:'unknown',reason:'missing child map'};continue;}
  if(doc.__depth>=3||doc.__path?.includes(id)){values[n.id]={...values[n.id],status:'unknown',reason:'cycle/depth'};continue;}
  try{
   const child=await getMapDoc(id);
   if(!child){values[n.id]={...values[n.id],status:'unknown',reason:'missing child map'};continue;}
   const deeper={...child,__depth:(doc.__depth||1)+1,__path:[...(doc.__path||[mapId]),id]};
   const childStates=await enrichedStates(deeper);
   const engine=window.ZCMStatusEngine;
   const childValues=(child.nodes||[]).filter(item=>item.statusRule?.includeInMap!==false).map(item=>childStates[item.id]?.status||'unknown');
   const derived=engine.aggregate(childValues,child.aggregationRule||{mode:'worst'});
   const own=values[n.id]?.status||'unknown';
   values[n.id]={...values[n.id],status:n.statusRule.source==='children'?derived:engine.maximum([own,derived]),childStatus:derived};
  }catch(e){values[n.id]={...values[n.id],status:'unknown',reason:'child read failed'}}
 }
 return values;
}
async function showProblemsForNode(n){
 const {overlay,panel}=makeOverlay('Problemas: '+(n.text||n.id));
 const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>overlay.remove();panel.append(close);
 const info=document.createElement('div');info.className='zcm-problem-list';info.textContent='Consultando problemas...';panel.append(info);
 if(!['host','group'].includes(n.binding?.type)){info.textContent='Detalhes disponíveis para vínculos diretos de host ou grupo. Consulte os problemas filtrados no Zabbix para vínculos por tag.';return}
 try{const data=await request({op:'problems',binding:JSON.stringify(n.binding)});info.replaceChildren();
  if(!data.problems?.length){info.textContent='Nenhum problema ativo encontrado para os hosts visíveis.';return}
  for(const pr of data.problems){const row=document.createElement('div');row.className='zcm-problem-row';
   const title=document.createElement('strong');title.textContent=pr.name;const meta=document.createElement('small');meta.textContent=(pr.hosts||[]).join(', ')+' · severidade '+pr.severity+' · '+new Date(pr.clock*1000).toLocaleString();row.append(title,meta);info.append(row)}
  if(data.limited){const note=document.createElement('p');note.textContent='Exibidos no máximo 100 problemas recentes.';info.append(note)}
 }catch(e){info.textContent='Falha na consulta: '+e.message}
}
async function openMapModal(id,depth=0,trail=[]){
 if(depth>2||trail.includes(id)){message('Limite de 3 níveis ou navegação circular');return}
 const doc=await getMapDoc(id);if(!doc){message('Mapa filho não encontrado: '+id);return}
 const {overlay,panel}=makeOverlay('Mapa: '+id);panel.classList.add('zcm-full-map-panel');
 const nav=document.createElement('div');nav.className='zcm-map-actions';const crumb=document.createElement('strong');crumb.textContent=[...trail,id].join(' › ');
 const back=document.createElement('button');back.textContent='← Voltar';back.disabled=!trail.length;back.onclick=()=>{overlay.remove();if(trail.length)openMapModal(trail.at(-1),depth-1,trail.slice(0,-1))};
 const full=document.createElement('button');full.textContent='⛶ Tela cheia';full.onclick=()=>panel.classList.toggle('zcm-map-fullscreen');
 const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>overlay.remove();nav.append(crumb,back,full,close);panel.append(nav);
 const content=document.createElement('div');content.className='zcm-rendered-preview';panel.append(content);
 let closed=false;const observer=new MutationObserver(()=>{if(!overlay.isConnected){closed=true;observer.disconnect()}});observer.observe(root,{childList:true});
 const paint=(statuses={})=>{if(!closed)content.innerHTML=previewSvg(doc,statuses)};paint(id===mapId?states:{});
 content.addEventListener('click',e=>{const el=e.target.closest('[data-preview-node]');if(!el)return;const n=(doc.nodes||[]).find(x=>x.id===el.dataset.previewNode);if(!n)return;if(n.action==='map'&&n.targetMap){overlay.remove();openMapModal(n.targetMap,depth+1,[...trail,id])}else if(n.action==='problems'){showProblemsForNode(n)}});
 const bindings=(doc.nodes||[]).filter(n=>n.binding&&n.binding.type!=='none').map(n=>({nodeid:n.id,...n.binding}));
 let timer=null;let busy=false;
 const update=async()=>{if(closed||busy||!bindings.length)return;busy=true;try{const next=await enrichedStates(doc);if(!closed&&overlay.isConnected)paint(next)}catch(e){message('Falha ao consultar estados do mapa: '+e.message)}finally{busy=false}};
 await update();
 timer=setInterval(()=>{if(closed||!overlay.isConnected){clearInterval(timer);return}update()},30000);
}
function showNodeProblems(n){return showProblemsForNode(n)}
fields.addEventListener('change',e=>{let el=e.target.closest('[data-field]');if(!el)return;let n=nodes.find(n=>n.id===selected);if(!n)return;snapshot();n[el.dataset.field]=['x','y','w','h','font'].includes(el.dataset.field)?Number(el.value):el.value;render()});
fields.addEventListener('input',e=>{let el=e.target.closest('[data-field]');if(!el)return;let n=nodes.find(n=>n.id===selected);if(!n)return;n[el.dataset.field]=['x','y','w','h','font'].includes(el.dataset.field)?Number(el.value):el.value;dirty=true;draw()});
// Phase 3: all requests use the Zabbix-authenticated controller; no API token in the browser.
async function request(params){const url=new URL(apiEndpoint,location.href);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));const response=await fetch(url,{credentials:'same-origin',headers:{'Accept':'application/json'}});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(data.error)throw Error(data.error);return data}
async function showDependencies(){
 const ids=[...new Set(nodes.filter(n=>n.binding?.type==='host'&&/^\d+$/.test(String(n.binding.id||''))).map(n=>String(n.binding.id)))];
 if(!ids.length){message('Vincule ao menos um shape a um host para analisar dependências');return;}
 message('Consultando dependências declaradas nos hosts...');
 try{
  const result=await request({op:'dependencies',hostids:JSON.stringify(ids)});
  root.querySelector('#zcm-dependencies-modal')?.remove();
  const overlay=document.createElement('div');overlay.id='zcm-dependencies-modal';overlay.className='zcm-dependency-overlay';
  const panel=document.createElement('section');panel.className='zcm-dependency-panel';
  const title=document.createElement('h2');title.textContent='Dependências e problemas associados';panel.append(title);
  const note=document.createElement('p');note.textContent=result.note||'Relações declaradas por depends_on';panel.append(note);
  const lookup=new Map((result.hosts||[]).map(h=>[h.id,h.name+' ('+h.technical+')']));
  const list=document.createElement('ul');list.className='zcm-dependency-list';
  (result.relations||[]).forEach(r=>{
   const li=document.createElement('li');const origin=lookup.get(r.from)||r.from;const target=lookup.get(r.to)||r.targetName;
   li.textContent=origin+' → '+target+(r.missing?' [não encontrado ou sem permissão]':'');
   if(r.to&&(result.issues?.[r.to]||[]).length){const p=document.createElement('small');p.textContent=' Problemas no dependência: '+result.issues[r.to].map(i=>i.name).slice(0,3).join('; ');li.append(p)}
   list.append(li);
  });
  if(!list.children.length){const empty=document.createElement('li');empty.textContent='Nenhuma tag depends_on encontrada nos hosts selecionados.';list.append(empty)}
  panel.append(list);
  const cyc=document.createElement('p');cyc.textContent='Ciclos identificados: '+(result.cycles||[]).length;panel.append(cyc);
  const close=document.createElement('button');close.textContent='Fechar';close.addEventListener('click',()=>overlay.remove());panel.append(close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});overlay.append(panel);root.append(overlay);
  message('Dependências consultadas: '+(result.relations||[]).length+' relações');
 }catch(e){message('Falha ao consultar dependências: '+e.message)}
}
async function refreshStates(){const bindings=nodes.filter(n=>n.binding&&n.binding.type!=='none').map(n=>({nodeid:n.id,...n.binding}));if(!bindings.length&&!nodes.some(n=>['children','combined'].includes(n.statusRule?.source))){states={};draw();return}let seq=++latest;try{const updated=await enrichedStates({nodes});if(seq!==latest)return;states=updated;message('Monitoramento atualizado: '+new Date().toLocaleTimeString());render()}catch(e){if(seq!==latest)return;states=Object.fromEntries(bindings.map(b=>[b.nodeid,{status:'unknown',count:0,hostCount:0}]));render();message('Falha na consulta Zabbix: '+e.message)}}
fields.addEventListener('change',e=>{const el=e.target.closest('[data-rule]');const n=nodes.find(item=>item.id===selected);if(!el||!n)return;snapshot();n.statusRule={source:'own',mode:'own',criticalSeverity:4,includeInMap:true,...n.statusRule,[el.dataset.rule]:el.type==='checkbox'?el.checked:el.dataset.rule==='criticalSeverity'?Number(el.value):el.value};render();refreshStates()});
fields.addEventListener('change',e=>{let el=e.target.closest('[data-bind]'),n=nodes.find(n=>n.id===selected);if(!el||!n)return;snapshot();n.binding={type:'none',id:'',tag:'',value:'',warning:2,critical:4,...n.binding,[el.dataset.bind]:el.value};if(el.dataset.bind==='type')n.binding.id='';states={};render();refreshStates()});
let searchCounter=0;root.querySelector('#zcm-search').addEventListener('input',async e=>{const term=e.target.value.trim(),list=root.querySelector('#zcm-search-results'),n=nodes.find(n=>n.id===selected),seq=++searchCounter;list.replaceChildren();if(term.length<2||!n||!['host','group'].includes(n.binding?.type))return;try{const response=await request({op:'search',type:n.binding.type,q:term});if(seq!==searchCounter)return;(response.results||[]).forEach(item=>{const b=document.createElement('button');b.type='button';b.textContent=item.name+' ['+item.id+']';b.addEventListener('click',()=>{const target=nodes.find(x=>x.id===selected);if(!target)return;snapshot();target.binding.id=item.id;list.replaceChildren();root.querySelector('#zcm-search').value=item.name;render();refreshStates()});list.appendChild(b)})}catch(e){list.textContent='Pesquisa indisponível: '+e.message}});
root.querySelector('#zcm-image').addEventListener('change',e=>{let file=e.target.files?.[0],n=nodes.find(n=>n.id===selected);if(!file||!n)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1024*1024){alert('Escolha PNG, JPEG ou WebP com no máximo 1 MB');return}const id=n.id;const reader=new FileReader();reader.onload=()=>{let item=nodes.find(t=>t.id===id);if(!item)return;snapshot();item.image=reader.result;render()};reader.readAsDataURL(file);e.target.value=''});
root.querySelector('#zcm-import').addEventListener('change',async e=>{let file=e.target.files?.[0];if(!file)return;try{let p=JSON.parse(await file.text());if(![1,2,3].includes(p.schema)||!Array.isArray(p.nodes)||p.nodes.length>300||!p.nodes.every(n=>typeof n.id==='string'&&['rect','round','circle','diamond','text'].includes(n.type)&&Number.isFinite(+n.x)&&Number.isFinite(+n.y)))throw Error('Formato inválido');snapshot();nodes=p.nodes.map(n=>({...make(n.type),...n,image:typeof n.image==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(n.image)?n.image:'',text:safe(n.text).slice(0,500),font:Math.min(80,Math.max(8,+n.font||17))}));edges=validateEdges(p.edges||[],nodes);pick(null);message('Mapa importado · clique em Salvar local')}catch(err){alert('Não foi possível importar: '+err.message)}e.target.value=''});
const editor=root.querySelector('#zcm-text-input');
svg.addEventListener('dblclick',e=>{let id=e.target.closest('[data-node]')?.dataset.node,n=nodes.find(n=>n.id===id);if(!n)return;pick(id);let box=stage.getBoundingClientRect();editor.hidden=false;editor.value=n.text;editor.style.left=(offset.x+n.x*scale+12)+'px';editor.style.top=(offset.y+n.y*scale+12)+'px';editor.style.width=Math.max(120,n.w*scale-24)+'px';editor.focus();editor.select();});
function closeEdit(){if(editor.hidden)return;let n=nodes.find(n=>n.id===selected);if(n&&n.text!==editor.value){snapshot();n.text=editor.value.slice(0,500)}editor.hidden=true;render()}
editor.addEventListener('blur',closeEdit);editor.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();closeEdit()}if(e.key==='Escape'){editor.hidden=true;render()}});
svg.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-resize]'),g=e.target.closest('[data-node]');if(!g)return;const n=nodes.find(n=>n.id===g.dataset.node);if(!n)return;if(root.querySelector('#zcm-connect').classList.contains('zcm-connecting')){if(!connectFrom){connectFrom=n.id;message('Agora selecione o shape de destino');}else if(connectFrom!==n.id){snapshot();edges.push(edgeMake(connectFrom,n.id));connectFrom=null;root.querySelector('#zcm-connect').classList.remove('zcm-connecting');message('Conector criado. Clique na linha para personalizar');pickEdge(edges[edges.length-1].id)}e.preventDefault();return;}pick(n.id);snapshot();drag={kind:handle?'resize':'move',id:n.id,startX:e.clientX,startY:e.clientY,x:n.x,y:n.y,w:n.w,h:n.h};svg.setPointerCapture(e.pointerId);e.preventDefault()});
stage.addEventListener('pointerdown',e=>{if(e.target===stage||e.target===world||e.target===svg){if(space){drag={kind:'pan',startX:e.clientX,startY:e.clientY,x:offset.x,y:offset.y};stage.setPointerCapture(e.pointerId)}else pick(null)}});
document.addEventListener('pointermove',e=>{if(!drag)return;let dx=(e.clientX-drag.startX)/scale,dy=(e.clientY-drag.startY)/scale;if(drag.kind==='pan'){offset.x=drag.x+(e.clientX-drag.startX);offset.y=drag.y+(e.clientY-drag.startY);transform();return}let n=nodes.find(n=>n.id===drag.id);if(!n)return;if(drag.kind==='resize'){n.w=Math.max(36,Math.round(drag.w+dx));n.h=Math.max(30,Math.round(drag.h+dy))}else{n.x=Math.round(drag.x+dx);n.y=Math.round(drag.y+dy)}draw()});document.addEventListener('pointerup',()=>{if(drag){drag=null;sync()}});
stage.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();scale=Math.max(.3,Math.min(2.5,scale*(e.deltaY>0?.9:1.1)));transform()},{passive:false});
document.addEventListener('keydown',e=>{if(!root.isConnected)return;let focused=document.activeElement;if(focused&&(focused.tagName==='INPUT'||focused.tagName==='TEXTAREA'))return;if(e.code==='Space')space=true;if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();action(e.shiftKey?'redo':'undo')}if((e.key==='Delete'||e.key==='Backspace')&&selected){e.preventDefault();action('delete')}});document.addEventListener('keyup',e=>{if(e.code==='Space')space=false});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
restore();library.main ||= JSON.parse(serialize());render();refreshStates();bootstrapRemote();refreshTimer=setInterval(()=>{if(root.isConnected)refreshStates();else clearInterval(refreshTimer)},30000);
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', zcmBoot, { once: true });
} else {
  zcmBoot();
}
