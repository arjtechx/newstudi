import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  BackgroundVariant,
  Panel,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, PlusSquare, Diamond, Edit2, Network, Share2, Clock, GitCommit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- Custom Nodes ---
const ProcessNode = ({ data, selected }: any) => (
  <div className={cn("px-4 py-3 shadow-md rounded-lg bg-white border-2 min-w-[150px] flex items-center justify-center transition-all", selected ? "border-blue-500 shadow-xl ring-4 ring-blue-500/20" : "border-slate-300", data.colorClass || "text-slate-800")}>
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    <Handle type="target" position={Position.Left} id="left-t" className="w-3 h-3 bg-blue-500" />
    <Handle type="source" position={Position.Right} id="right-s" className="w-3 h-3 bg-blue-500" />
    <div className="font-bold text-sm text-center">{data.label || 'Processo'}</div>
  </div>
);

const DecisionNode = ({ data, selected }: any) => (
  <div className={cn("w-[120px] h-[120px] shadow-md bg-amber-50 flex items-center justify-center relative transition-all", selected ? "shadow-xl border-blue-500" : "border-amber-400")} style={{ transform: 'rotate(45deg)', border: '2px solid', borderColor: selected ? '#3b82f6' : '#fbbf24', borderRadius: '8px' }}>
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500" style={{ transform: 'rotate(-45deg)' }} />
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500" style={{ transform: 'rotate(-45deg)' }} />
    <Handle type="target" position={Position.Left} id="left-t" className="w-3 h-3 bg-amber-500" style={{ transform: 'rotate(-45deg)' }} />
    <Handle type="source" position={Position.Right} id="right-s" className="w-3 h-3 bg-amber-500" style={{ transform: 'rotate(-45deg)' }} />
    <div className="font-bold text-[11px] text-amber-900 text-center w-full px-1" style={{ transform: 'rotate(-45deg)' }}>{data.label || 'Decisão?'}</div>
  </div>
);

const MindmapCoreNode = ({ data, selected }: any) => (
  <div className={cn("px-6 py-4 shadow-lg rounded-full bg-purple-600 border-4 min-w-[180px] flex items-center justify-center transition-all", selected ? "border-purple-300 shadow-xl ring-4 ring-purple-500/30" : "border-purple-700")}>
    <Handle type="source" position={Position.Top} className="w-3 h-3 bg-white" />
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white" />
    <Handle type="source" position={Position.Left} className="w-3 h-3 bg-white" />
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-white" />
    <div className="font-black text-lg text-white text-center tracking-wide">{data.label || 'Ideia Central'}</div>
  </div>
);

const MindmapTopicNode = ({ data, selected }: any) => (
  <div className={cn("px-4 py-2 shadow-sm rounded-full bg-white border-2 min-w-[120px] flex items-center justify-center transition-all", selected ? "border-purple-500 shadow-md ring-4 ring-purple-500/20" : "border-purple-200")}>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-purple-500" />
    <Handle type="target" position={Position.Bottom} className="w-2 h-2 bg-purple-500" />
    <Handle type="target" position={Position.Left} className="w-2 h-2 bg-purple-500" />
    <Handle type="target" position={Position.Right} className="w-2 h-2 bg-purple-500" />
    <div className="font-semibold text-sm text-purple-900 text-center">{data.label || 'Tópico'}</div>
  </div>
);

const TimelineEventNode = ({ data, selected }: any) => (
  <div className="relative flex flex-col items-center">
    <div className={cn("w-6 h-6 rounded-full border-4 border-white shadow-md z-10 transition-all", selected ? "bg-blue-500 scale-125" : "bg-emerald-500")} />
    <div className={cn("mt-4 px-4 py-3 shadow-lg rounded-xl bg-white border-2 min-w-[160px] flex flex-col items-center justify-center transition-all", selected ? "border-blue-500 shadow-xl" : "border-emerald-100")}>
      <Handle type="target" position={Position.Left} className="w-0 h-0 opacity-0" />
      <Handle type="source" position={Position.Right} className="w-0 h-0 opacity-0" />
      <div className="font-black text-emerald-800 text-lg">{data.label || '2025'}</div>
      {data.subtitle && <div className="font-medium text-slate-500 text-xs mt-1 text-center">{data.subtitle}</div>}
    </div>
  </div>
);

const nodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  mindmapCore: MindmapCoreNode,
  mindmapTopic: MindmapTopicNode,
  timelineEvent: TimelineEventNode,
};

interface DiagramBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onChange?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

let idCounter = 1000;
const getId = () => `node_${idCounter++}_${Date.now()}`;

export const DiagramBuilder = ({ initialNodes = [], initialEdges = [], onChange, readOnly = false }: DiagramBuilderProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (isInternalChange.current && onChange) {
      onChange(nodes, edges);
      isInternalChange.current = false;
    }
  }, [nodes, edges, onChange]);

  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { strokeWidth: 2, stroke: '#94a3b8' } } as any, eds));
    isInternalChange.current = true;
  }, [setEdges]);

  const addNode = (type: string, label: string, position: {x: number, y: number}, subtitle?: string) => {
    const newNode: Node = { id: getId(), type, position, data: { label, subtitle } };
    setNodes((nds) => nds.concat(newNode));
    isInternalChange.current = true;
  };

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    if (nodes.length === 1) setSelectedNode(nodes[0]);
    else setSelectedNode(null);
  }, []);

  const updateSelectedNodeLabel = (label: string) => {
    if (!selectedNode) return;
    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, label } } : n));
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, label } } : null);
    isInternalChange.current = true;
  };

  const updateSelectedNodeSubtitle = (subtitle: string) => {
    if (!selectedNode) return;
    setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, subtitle } } : n));
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, subtitle } } : null);
    isInternalChange.current = true;
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    isInternalChange.current = true;
  };

  const applyTemplate = (type: 'flow' | 'mindmap' | 'timeline') => {
    let newNodes: Node[] = [];
    let newEdges: Edge[] = [];
    
    if (type === 'flow') {
      const n1 = getId(); const n2 = getId(); const n3 = getId();
      newNodes = [
        { id: n1, type: 'process', position: { x: 250, y: 50 }, data: { label: 'Início' } },
        { id: n2, type: 'decision', position: { x: 265, y: 150 }, data: { label: 'Aprovado?' } },
        { id: n3, type: 'process', position: { x: 250, y: 300 }, data: { label: 'Fim' } }
      ];
      newEdges = [
        { id: `e-${n1}-${n2}`, source: n1, target: n2, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { strokeWidth: 2, stroke: '#94a3b8' } },
        { id: `e-${n2}-${n3}`, source: n2, target: n3, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, style: { strokeWidth: 2, stroke: '#94a3b8' }, label: 'Sim' }
      ];
    } else if (type === 'mindmap') {
      const core = getId(); const t1 = getId(); const t2 = getId(); const t3 = getId(); const t4 = getId();
      newNodes = [
        { id: core, type: 'mindmapCore', position: { x: 300, y: 200 }, data: { label: 'Ideia Central' } },
        { id: t1, type: 'mindmapTopic', position: { x: 100, y: 50 }, data: { label: 'Tópico 1' } },
        { id: t2, type: 'mindmapTopic', position: { x: 500, y: 50 }, data: { label: 'Tópico 2' } },
        { id: t3, type: 'mindmapTopic', position: { x: 100, y: 350 }, data: { label: 'Tópico 3' } },
        { id: t4, type: 'mindmapTopic', position: { x: 500, y: 350 }, data: { label: 'Tópico 4' } }
      ];
      newEdges = [
        { id: `e-${core}-${t1}`, source: core, target: t1, type: 'straight', style: { strokeWidth: 2, stroke: '#c084fc' } },
        { id: `e-${core}-${t2}`, source: core, target: t2, type: 'straight', style: { strokeWidth: 2, stroke: '#c084fc' } },
        { id: `e-${core}-${t3}`, source: core, target: t3, type: 'straight', style: { strokeWidth: 2, stroke: '#c084fc' } },
        { id: `e-${core}-${t4}`, source: core, target: t4, type: 'straight', style: { strokeWidth: 2, stroke: '#c084fc' } }
      ];
    } else if (type === 'timeline') {
      const e1 = getId(); const e2 = getId(); const e3 = getId();
      newNodes = [
        { id: e1, type: 'timelineEvent', position: { x: 50, y: 200 }, data: { label: '2023', subtitle: 'Início do projeto' } },
        { id: e2, type: 'timelineEvent', position: { x: 350, y: 200 }, data: { label: '2024', subtitle: 'Lançamento Beta' } },
        { id: e3, type: 'timelineEvent', position: { x: 650, y: 200 }, data: { label: '2025', subtitle: 'Expansão Global' } }
      ];
      newEdges = [
        { id: `e-${e1}-${e2}`, source: e1, target: e2, type: 'straight', style: { strokeWidth: 6, stroke: '#a7f3d0' } },
        { id: `e-${e2}-${e3}`, source: e2, target: e3, type: 'straight', style: { strokeWidth: 6, stroke: '#a7f3d0' } }
      ];
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
    isInternalChange.current = true;
  };

  return (
    <div className="w-full h-[600px] border-2 border-slate-200 rounded-xl overflow-hidden relative bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(c) => { onNodesChange(c); isInternalChange.current = true; }}
        onEdgesChange={(c) => { onEdgesChange(c); isInternalChange.current = true; }}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid={!readOnly}
        snapGrid={[15, 15]}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} color="#cbd5e1" />
        <MiniMap zoomable pannable nodeColor={(n) => n.type === 'decision' ? '#fbbf24' : n.type?.startsWith('mindmap') ? '#c084fc' : n.type === 'timelineEvent' ? '#10b981' : '#3b82f6'} />
        <Controls />
        
        {!readOnly && (
          <Panel position="top-left" className="bg-white/90 backdrop-blur shadow-md rounded-lg p-2 border border-slate-200 flex flex-col md:flex-row gap-2 md:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="h-8 text-xs font-bold gap-1 bg-slate-800 hover:bg-slate-900">
                  <Network className="w-4 h-4" /> Predefinições
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => applyTemplate('flow')} className="gap-2 cursor-pointer font-medium text-blue-700"><Share2 className="w-4 h-4" /> Fluxograma Básico</DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate('mindmap')} className="gap-2 cursor-pointer font-medium text-purple-700"><Network className="w-4 h-4" /> Mapa Mental</DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate('timeline')} className="gap-2 cursor-pointer font-medium text-emerald-700"><Clock className="w-4 h-4" /> Linha do Tempo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
  
            <div className="w-px h-6 bg-slate-200 hidden md:block"></div>
  
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addNode('process', 'Novo Processo', {x: 100, y: 100})} className="h-8 text-[11px] font-bold gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 px-2"><PlusSquare className="w-3.5 h-3.5" /> Processo</Button>
              <Button variant="outline" size="sm" onClick={() => addNode('decision', 'Decisão?', {x: 150, y: 150})} className="h-8 text-[11px] font-bold gap-1 text-amber-600 border-amber-200 hover:bg-amber-50 px-2"><Diamond className="w-3.5 h-3.5" /> Decisão</Button>
              <Button variant="outline" size="sm" onClick={() => addNode('mindmapTopic', 'Novo Tópico', {x: 200, y: 200})} className="h-8 text-[11px] font-bold gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 px-2"><Network className="w-3.5 h-3.5" /> Tópico Mental</Button>
              <Button variant="outline" size="sm" onClick={() => addNode('timelineEvent', 'Ano/Data', {x: 250, y: 250}, 'Detalhes...')} className="h-8 text-[11px] font-bold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 px-2"><Clock className="w-3.5 h-3.5" /> Evento</Button>
            </div>
          </Panel>
        )}

        {!readOnly && selectedNode && (
          <Panel position="top-right" className="bg-white shadow-xl rounded-xl p-3 border border-slate-200 w-64 flex flex-col gap-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Edit2 className="w-3 h-3" /> Editar Bloco
            </div>
            <Input 
              value={(selectedNode.data.label as string) || ''} 
              onChange={(e) => updateSelectedNodeLabel(e.target.value)}
              className="text-sm font-semibold h-9"
              placeholder="Texto principal..."
              autoFocus
            />
            {selectedNode.type === 'timelineEvent' && (
              <Input 
                value={(selectedNode.data.subtitle as string) || ''} 
                onChange={(e) => updateSelectedNodeSubtitle(e.target.value)}
                className="text-xs font-medium h-8 text-slate-600"
                placeholder="Detalhes adicionais..."
              />
            )}
            <Button variant="destructive" size="sm" onClick={deleteSelectedNode} className="h-8 text-xs font-bold gap-1 w-full mt-1">
              <Trash2 className="w-3.5 h-3.5" /> Excluir Bloco
            </Button>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};