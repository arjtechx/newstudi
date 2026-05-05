
"use client"

import React from 'react';
import { cn } from '@/lib/utils';

export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[400px] w-full py-20", className)}>
      <div className="relative w-24 h-20 animate-float">
        {/* SVG Livro Abrindo */}
        <svg 
          viewBox="0 0 100 80" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full text-primary drop-shadow-xl"
        >
          {/* Capa Traseira */}
          <path d="M50 75C50 75 10 75 10 10H50V75Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
          <path d="M50 75C50 75 90 75 90 10H50V75Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
          
          {/* Páginas Fixas */}
          <path d="M50 70C50 70 15 70 15 15H50V70Z" fill="white" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M50 70C50 70 85 70 85 15H50V70Z" fill="white" stroke="currentColor" strokeWidth="1.5"/>
          
          {/* Página Animada (Vira-página) */}
          <g className="book-page" style={{ transformOrigin: '50% 70%' }}>
            <path d="M50 70C50 70 15 70 15 15H50V70Z" fill="white" stroke="currentColor" strokeWidth="1.5"/>
          </g>
          
          {/* Lombada */}
          <path d="M50 10V75" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="space-y-2 text-center mt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          Sincronizando Base de Conhecimento
        </p>
        <div className="loader-progress-bar">
          <div className="loader-progress-fill" />
        </div>
      </div>
      
      <p className="mt-8 text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
        AprovaConcursos v1.0.0-Beta
      </p>
    </div>
  );
}
