"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PenTool, Eraser, Trash2, Maximize2, Minimize2, GripHorizontal, Type, Undo2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const MATH_TERMS = ['x', 'y', 'z', '=', '+', '-', '×', '÷', 'x²', 'x³', '√', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function ScratchpadWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [color, setColor] = useState('#1e293b');
  const [isExpanded, setIsExpanded] = useState(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  
  // Estado do Input de Texto Livre
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: '' });
  
  // Estados para Drag & Resize
  const [pos, setPos] = useState({ x: 0, y: 0 }); 
  const [size, setSize] = useState({ width: 340, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Cursor virtual para a "maquininha de escrever" matemática
  const [textCursor, setTextCursor] = useState({ x: 20, y: 40 });

  useEffect(() => {
    if (textInput.visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [textInput.visible]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPos = localStorage.getItem('scratchpad_pos');
      const savedSize = localStorage.getItem('scratchpad_size');
      if (savedPos) setPos(JSON.parse(savedPos));
      else setPos({ x: window.innerWidth - 360, y: window.innerHeight - 450 });
      
      if (savedSize) setSize(JSON.parse(savedSize));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
  }, [size, isExpanded, color]); // Re-aplica estilos quando redimensiona ou muda cor

  // --- LOGICA DE DESENHO ---
  const saveStateForUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      setUndoStack(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)].slice(-10));
    }
  };
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (tool === 'text') {
      if (textInput.visible) {
        // Se já tem um input aberto, apenas deixa o onBlur fechar ele, não abre outro por cima.
        return;
      }
      setTextInput({ visible: true, x: clientX - rect.left, y: clientY - rect.top, value: '' });
      return;
    }

    saveStateForUndo();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'text') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 20;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
    }
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    saveStateForUndo();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTextCursor({ x: 20, y: 40 }); // Reseta o cursor de texto
  };

  const insertTerm = (term: string) => {
    saveStateForUndo();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = color;

    // Se a palavra for muito larga, pular linha
    const metrics = ctx.measureText(term);
    let nextX = textCursor.x;
    let nextY = textCursor.y;

    if (nextX + metrics.width > canvas.width - 20) {
      nextX = 20;
      nextY += 35;
    }

    ctx.fillText(term, nextX, nextY);
    setTextCursor({ x: nextX + metrics.width + 5, y: nextY });
  };

  const commitText = () => {
    if (!textInput.visible) return;
    if (textInput.value.trim()) {
      saveStateForUndo();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = color;
        ctx.fillText(textInput.value, textInput.x, textInput.y + 16);
      }
    }
    setTextInput({ ...textInput, visible: false, value: '' });
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const lastState = undoStack[undoStack.length - 1];
      ctx.putImageData(lastState, 0, 0);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Criar um fundo branco antes de salvar (porque o canvas transparente fica preto no PNG)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tCtx.drawImage(canvas, 0, 0);
      
      const link = document.createElement('a');
      link.download = `rascunho-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL();
      link.click();
    }
  };

  // --- LOGICA DE DRAG & DROP ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos({
          x: dragStart.current.posX + (e.clientX - dragStart.current.x),
          y: dragStart.current.posY + (e.clientY - dragStart.current.y)
        });
      } else if (isResizing) {
        setSize({
          width: Math.max(250, resizeStart.current.width + (e.clientX - resizeStart.current.x)),
          height: Math.max(250, resizeStart.current.height + (e.clientY - resizeStart.current.y))
        });
      }
    };
    const handleMouseUp = () => {
      if (isDragging && typeof window !== 'undefined') localStorage.setItem('scratchpad_pos', JSON.stringify(pos));
      if (isResizing && typeof window !== 'undefined') localStorage.setItem('scratchpad_size', JSON.stringify(size));
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const onDragStart = (e: React.MouseEvent) => {
    if (isExpanded) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpanded) return;
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
  };

  return (
    <Card 
      ref={containerRef}
      className={cn(
        "border-2 shadow-xl overflow-hidden bg-white flex flex-col transition-shadow",
        isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "fixed z-40"
      )}
      style={!isExpanded ? { 
        left: pos.x, 
        top: pos.y, 
        width: size.width, 
        height: size.height 
      } : {}}
    >
      <CardHeader 
        className="p-2 bg-slate-100 border-b flex flex-row items-center justify-between shrink-0 cursor-move touch-none select-none"
        onMouseDown={onDragStart}
      >
        <CardTitle className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
          <GripHorizontal className="w-3 h-3" /> Quadro
        </CardTitle>
        <div className="flex gap-1 items-center">
          <div className="flex bg-slate-200/50 p-0.5 rounded-md mr-1">
            <button onClick={() => setColor('#1e293b')} className={cn("w-4 h-4 rounded-full mx-0.5 border-2", color === '#1e293b' ? "border-slate-400" : "border-transparent")} style={{backgroundColor: '#1e293b'}} />
            <button onClick={() => setColor('#2563eb')} className={cn("w-4 h-4 rounded-full mx-0.5 border-2", color === '#2563eb' ? "border-slate-400" : "border-transparent")} style={{backgroundColor: '#2563eb'}} />
            <button onClick={() => setColor('#dc2626')} className={cn("w-4 h-4 rounded-full mx-0.5 border-2", color === '#dc2626' ? "border-slate-400" : "border-transparent")} style={{backgroundColor: '#dc2626'}} />
            <button onClick={() => setColor('#16a34a')} className={cn("w-4 h-4 rounded-full mx-0.5 border-2", color === '#16a34a' ? "border-slate-400" : "border-transparent")} style={{backgroundColor: '#16a34a'}} />
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={undo} disabled={undoStack.length === 0}>
            <Undo2 className="w-3 h-3 text-slate-500" />
          </Button>
          <div className="w-px h-4 bg-slate-300 mx-0.5" />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTool('pen')}>
            <PenTool className={cn("w-3 h-3", tool === 'pen' ? "text-primary" : "text-slate-400")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTool('text')}>
            <Type className={cn("w-3 h-3", tool === 'text' ? "text-primary" : "text-slate-400")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTool('eraser')}>
            <Eraser className={cn("w-3 h-3", tool === 'eraser' ? "text-primary" : "text-slate-400")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={clearCanvas}>
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50" onClick={downloadImage}>
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </CardHeader>

      {/* Barra de Ferramentas / Símbolos */}
      <div className="grid grid-cols-7 gap-1 p-2 bg-slate-100 border-b shrink-0">
        {MATH_TERMS.map(term => (
          <Button 
            key={term} 
            variant="outline" 
            size="sm" 
            className="h-7 w-full p-0 text-[11px] font-black font-mono shadow-sm hover:border-primary hover:text-primary transition-colors bg-white"
            onClick={(e) => { e.stopPropagation(); insertTerm(term); }}
          >
            {term}
          </Button>
        ))}
      </div>

      <CardContent className="p-0 flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0iI2U1ZTdlYiIvPjwvc3ZnPg==')] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={isExpanded ? (typeof window !== 'undefined' ? window.innerWidth - 32 : 800) : size.width}
          height={isExpanded ? (typeof window !== 'undefined' ? window.innerHeight - 100 : 600) : size.height - 70}
          className="w-full h-full touch-none cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {textInput.visible && (
          <input
            ref={inputRef}
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText();
              if (e.key === 'Escape') setTextInput({ ...textInput, visible: false });
            }}
            onBlur={commitText}
            className="absolute bg-transparent border-b-2 border-primary/50 font-bold font-mono text-[20px] outline-none px-1 py-0 min-w-[50px] z-10"
            style={{ left: textInput.x, top: textInput.y - 4, color: color }}
          />
        )}
        
        {/* Alça de redimensionamento */}
        {!isExpanded && (
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-primary/20 hover:bg-primary/50 transition-colors z-10"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
            onMouseDown={onResizeStart}
          />
        )}
      </CardContent>
    </Card>
  );
}
