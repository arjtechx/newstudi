"use client"

import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const tasks = [
  "Inicializando módulos do sistema...",
  "Carregando banco de questões...",
  "Estabelecendo conexão segura...",
  "Sincronizando perfil tático...",
  "Preparando ambiente de estudos..."
];

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);

  useEffect(() => {
    // A simulação de carregamento para dar o efeito de progresso
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 8) + 2;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const taskIndex = Math.floor((progress / 100) * tasks.length);
    setCurrentTask(Math.min(taskIndex, tasks.length - 1));
  }, [progress]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center gap-10 relative z-10">
        
        {/* Book Animation */}
        <div className="relative group perspective-1000">
          <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse" />
          <div className="relative bg-white p-8 rounded-[2rem] shadow-2xl border-4 border-primary/10 flex items-center justify-center transition-transform duration-700 ease-in-out transform hover:scale-110">
            <BookOpen 
              className="w-24 h-24 text-primary animate-bounce shadow-primary" 
              style={{ animationDuration: '2s' }} 
              strokeWidth={1.5}
            />
            {/* Efeito de páginas abrindo (simulado com div absolutas) */}
            <div className="absolute inset-0 border-4 border-transparent border-l-primary/20 rounded-[2rem] animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-0 border-4 border-transparent border-r-primary/20 rounded-[2rem] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        {/* Títulos */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 drop-shadow-sm">
            Carregando <span className="text-primary">Sistema...</span>
          </h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest bg-slate-200/50 inline-block px-4 py-1 rounded-full">
            AprovaConcursos v1.0
          </p>
        </div>

        {/* Progress & Tasks Card */}
        <div className="w-full space-y-6 bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-black uppercase text-slate-400 tracking-wider">
              <span>Progresso</span>
              <span className="text-primary">{Math.min(100, Math.round(progress))}%</span>
            </div>
            <Progress value={progress} className="h-4 rounded-full bg-slate-100" />
          </div>
          
          <div className="space-y-4 pt-2 border-t-2 border-dashed border-slate-100">
            {tasks.map((task, index) => {
              const isCompleted = index < currentTask || progress >= 100;
              const isActive = index === currentTask && progress < 100;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center gap-4 text-sm font-bold transition-all duration-500 ${
                    isCompleted 
                      ? 'text-green-600 translate-x-1' 
                      : isActive 
                        ? 'text-primary scale-105 origin-left' 
                        : 'text-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                  )}
                  <span className={`${isActive ? 'animate-pulse' : ''} ${isCompleted ? 'opacity-80' : ''}`}>
                    {task}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
