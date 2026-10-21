import React from 'react';
import { createRoot } from 'react-dom/client';
import ReactFlow, { Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodes: Node[] = [
  {id:'business', position:{x:150,y:40}, data:{label:'Processo de negócio'}},
  {id:'service', position:{x:150,y:170}, data:{label:'Sistema / Serviço'}},
  {id:'device', position:{x:150,y:300}, data:{label:'Infraestrutura'}}
];
const edges: Edge[] = [
  {id:'e1',source:'business',target:'service',type:'smoothstep'},
  {id:'e2',source:'service',target:'device',type:'smoothstep'}
];
function App() {
  return <div style={{height:580,width:'100%',border:'1px solid #77889944',borderRadius:12,overflow:'hidden'}}>
    <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={true}>
      <Background/><Controls/>
    </ReactFlow>
  </div>;
}
const root = document.getElementById('zcm-root');
if (root) createRoot(root).render(<App/>);