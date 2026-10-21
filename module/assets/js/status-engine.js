/* Zabbix Canvas Map: deterministic status aggregation, with no network dependencies. */
(function (root, factory) {
  'use strict';
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.ZCMStatusEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const RANK = Object.freeze({unknown:-1, ok:0, warning:1, critical:2});
  function normalize(input) { return Object.prototype.hasOwnProperty.call(RANK, input) ? input : 'unknown'; }
  function maximum(statuses) {
    const s = statuses.map(normalize);
    if (!s.length || s.every(v=>v==='unknown')) return 'unknown';
    if (s.includes('critical')) return 'critical';
    if (s.includes('warning')) return 'warning';
    if (s.includes('unknown')) return 'unknown'; // fail closed for partially unknown groups
    return 'ok';
  }
  function aggregate(statuses, rule) {
    const s = statuses.map(normalize);
    if (!s.length) return 'unknown';
    const mode = rule?.mode || 'worst';
    if (mode === 'all') {
      if (s.every(x=>x==='critical')) return 'critical';
      if (s.some(x=>x==='unknown')) return 'unknown';
      return s.some(x=>x==='critical'||x==='warning')?'warning':'ok';
    }
    if (mode === 'count') {
      const threshold = Number(rule?.criticalCount);
      if (!Number.isInteger(threshold) || threshold<1) return 'unknown';
      if (s.filter(x=>x==='critical').length>=threshold) return 'critical';
      if (s.includes('unknown')) return 'unknown';
      return s.some(x=>x==='critical'||x==='warning')?'warning':'ok';
    }
    if (mode === 'percent') {
      const threshold = Number(rule?.criticalPercent);
      if (!Number.isFinite(threshold)||threshold<0||threshold>100) return 'unknown';
      if (s.includes('unknown')) return 'unknown';
      if (s.filter(x=>x==='critical').length*100/s.length>=threshold) return 'critical';
      return s.some(x=>x==='critical'||x==='warning')?'warning':'ok';
    }
    return maximum(s);
  }
  // Edges point from the dependent host toward the required upstream host.
  function propagate(hostId, relations, issues, options={}) {
    const limit = Math.min(12,Math.max(1,Number(options.maxDepth)||4));
    const start=String(hostId), visited=new Set([start]), queue=[{id:start,depth:0}];
    const causes=[]; let missing=false; let truncated=false;
    const adj=new Map();
    for (const r of relations||[]) {
      const from=String(r.from||'');
      if (r.missing) { if(from===start) missing=true; continue; }
      if (!r.to) continue;
      if(!adj.has(from)) adj.set(from,[]);
      adj.get(from).push(String(r.to));
    }
    while(queue.length) {
      const current=queue.shift();
      if(current.depth>=limit) {if((adj.get(current.id)||[]).some(x=>!visited.has(x)))truncated=true;continue;}
      for(const to of adj.get(current.id)||[]) {
        if(visited.has(to))continue;
        visited.add(to);
        const events=Array.isArray(issues?.[to])?issues[to]:[];
        for(const p of events)causes.push({hostid:to,eventid:String(p.eventid||''),name:String(p.name||''),severity:Number(p.severity)||0});
        queue.push({id:to,depth:current.depth+1});
      }
    }
    return {impact:causes.length>0, causes, missing, truncated};
  }
  function applyImpact(own, impact, rule={}) {
    const state=normalize(own);
    if(!impact?.impact||rule.mode==='own') return {status:state,impact:false,originalStatus:state};
    const threshold=Number.isFinite(Number(rule.criticalSeverity))?Number(rule.criticalSeverity):4;
    const inferred=impact.causes.some(c=>c.severity>=threshold)?'critical':'warning';
    const combined=rule.mode==='inherited'?inferred:maximum([state,inferred]);
    return {status:combined,impact:true,originalStatus:state,impactCount:impact.causes.length};
  }
  // Child map aggregation is pure and cycle-safe; unknown data never means healthy.
  function hierarchy(maps, rootId, nodeStates={}, options={}) {
    const maxDepth=Math.min(3,Math.max(1,Number(options.maxDepth)||3));
    const cache={}, visiting=new Set();
    function visit(id,depth) {
      if(visiting.has(id))return {status:'unknown',reason:'cycle'};
      if(depth>maxDepth)return {status:'unknown',reason:'depth'};
      const doc=maps?.[id];if(!doc||!Array.isArray(doc.nodes))return {status:'unknown',reason:'missing'};
      visiting.add(id);
      const perNode={};
      for(const node of doc.nodes){
        const own=normalize(nodeStates?.[id]?.[node.id]?.status);
        const child=node.action==='map'&&node.targetMap?visit(String(node.targetMap),depth+1):null;
        const mode=node.statusRule?.source||'own';
        let status=own;
        if(mode==='children')status=child?.status||'unknown';
        else if(mode==='combined'&&child)status=maximum([own,child.status]);
        perNode[node.id]={status,ownStatus:own,childStatus:child?.status||null};
      }
      visiting.delete(id);
      const included=doc.nodes.filter(n=>n.statusRule?.includeInMap!==false).map(n=>perNode[n.id].status);
      const result={status:aggregate(included,doc.aggregationRule||{mode:'worst'}),nodes:perNode};
      cache[id]=result;return result;
    }
    const result=visit(String(rootId),1);return {result,maps:cache};
  }
  return Object.freeze({normalize,maximum,aggregate,propagate,applyImpact,hierarchy});
});