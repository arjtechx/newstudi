"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Wifi, WifiOff, Play, Square, Plus, RefreshCcw,
  Monitor, Globe, Zap, AlertTriangle, CheckCircle2,
  Terminal, Settings, Loader2, Download, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TunnelData {
  name: string;
  domain: string;
  port: number;
  tunnelId: string;
  credPath: string;
  configPath: string;
  createdAt: string;
}

export default function TunnelManagerPage() {
  const [name, setName]     = useState('');
  const [domain, setDomain] = useState('');
  const [target, setTarget] = useState('127.0.0.1');
  const [port, setPort]     = useState('3000');

  const [running, setRunning]       = useState(false);
  const [tunnel, setTunnel]         = useState<TunnelData | null>(null);
  const [logs, setLogs]             = useState<string[]>([]);
  const [loading, setLoading]       = useState<string | null>(null); // 'create' | 'start' | 'stop' | ...
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const logsRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Auto-scroll logs ────────────────────────────────────────────────────
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  // ─── Polling de status e logs ─────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch('/api/tunnel?action=status'),
        fetch('/api/tunnel?action=logs'),
      ]);
      const statusData = await statusRes.json();
      const logsData   = await logsRes.json();
      setRunning(statusData.running ?? false);
      setTunnel(statusData.tunnel ?? null);
      setLogs(logsData.logs ?? []);

      if (statusData.tunnel) {
        setName(statusData.tunnel.name);
        setDomain(statusData.tunnel.domain);
        setTarget(statusData.tunnel.target || '127.0.0.1');
        setPort(String(statusData.tunnel.port));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const callApi = async (action: string, extra?: object) => {
    setLoading(action);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, domain, port: parseInt(port), target, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'Erro desconhecido'); }
      else {
        const msgs: Record<string, string> = {
          create: 'Túnel criado! Agora clique em "Iniciar Tunnel".',
          start: 'Túnel iniciado com sucesso!',
          stop: 'Túnel parado.',
          reconfigure: 'Configuração apagada. Pronto para recriar.',
          autostart: `AutoStart ativado! Arquivo criado em:\n${data.path}`,
        };
        setSuccessMsg(msgs[action] || 'Operação concluída.');
        fetchStatus();
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(null);
    }
  };

  const logColor = (line: string) => {
    if (line.includes('[ERROR]') || line.includes('ERR')) return 'text-red-400';
    if (line.includes('[WARN]'))   return 'text-amber-400';
    if (line.includes('[OK]') || line.includes('SUCCESS') || line.includes('Connected')) return 'text-emerald-400';
    if (line.includes('[START]') || line.includes('[CREATE]')) return 'text-blue-400';
    if (line.includes('[INFO]'))   return 'text-slate-300';
    if (line.includes('[DNS]'))    return 'text-purple-400';
    return 'text-slate-400';
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-24">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">
              Tunnel Manager
            </h1>
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            Cloudflare Tunnel — Gerenciador Integrado
          </p>
        </div>

        {/* Status Badge */}
        <div className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-2xl border-2 font-black uppercase italic text-sm",
          running
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
        )}>
          <span className={cn("w-3 h-3 rounded-full", running ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
          {running ? "ONLINE" : "OFFLINE"}
          {tunnel && <span className="text-xs font-bold opacity-60 ml-1">| {tunnel.name}</span>}
        </div>
      </div>

      {/* ─── Alerts ─────────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <pre className="text-red-700 text-sm font-bold whitespace-pre-wrap">{errorMsg}</pre>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <pre className="text-emerald-700 text-sm font-bold whitespace-pre-wrap">{successMsg}</pre>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ─── Configuração ──────────────────────────────────────────────── */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-black uppercase italic flex items-center gap-2 text-slate-700">
              <Settings className="w-4 h-4 text-orange-500" /> Configuração do Túnel
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400">
              Preencha os campos e clique em "Criar e Conectar"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome do Túnel</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                placeholder="ex: meu-servidor"
                disabled={!!tunnel}
                className="font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Domínio / Subdomínio</Label>
              <Input
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="ex: app.meudominio.com"
                disabled={!!tunnel}
                className="font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Host / IP de Destino</Label>
              <Input
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="ex: 127.0.0.1"
                disabled={!!tunnel}
                className="font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Porta Local</Label>
              <Input
                value={port}
                onChange={e => setPort(e.target.value.replace(/\D/g, ''))}
                placeholder="ex: 3000"
                disabled={!!tunnel}
                className="font-mono font-bold"
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Ações ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Info do túnel configurado */}
          {tunnel && (
            <Card className="border-2 border-blue-100 bg-blue-50/50">
              <CardContent className="p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> Túnel Configurado
                </p>
                {[
                  { label: 'Nome',   val: tunnel.name },
                  { label: 'Domínio', val: tunnel.domain },
                  { label: 'Porta',  val: String(tunnel.port) },
                  { label: 'ID',     val: tunnel.tunnelId?.substring(0, 18) + '...' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400 uppercase">{label}</span>
                    <span className="text-slate-700 font-mono">{val}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-blue-100 text-[10px] text-slate-400 font-mono truncate">
                  {tunnel.configPath}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="grid grid-cols-1 gap-3">

            {!tunnel ? (
              <Button
                onClick={() => callApi('create')}
                disabled={!!loading || !name || !domain || !port}
                className="h-14 text-base font-black uppercase italic bg-orange-500 hover:bg-orange-600 shadow-[0_5px_0_0_#c2410c] active:translate-y-1 active:shadow-none gap-2"
              >
                {loading === 'create' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Criar e Conectar
              </Button>
            ) : !running ? (
              <Button
                onClick={() => callApi('start')}
                disabled={!!loading}
                className="h-14 text-base font-black uppercase italic bg-emerald-600 hover:bg-emerald-700 shadow-[0_5px_0_0_#065f46] active:translate-y-1 active:shadow-none gap-2"
              >
                {loading === 'start' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                Iniciar Tunnel
              </Button>
            ) : (
              <Button
                onClick={() => callApi('stop')}
                disabled={!!loading}
                className="h-14 text-base font-black uppercase italic bg-red-600 hover:bg-red-700 shadow-[0_5px_0_0_#7f1d1d] active:translate-y-1 active:shadow-none gap-2"
              >
                {loading === 'stop' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
                Parar Tunnel
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => callApi('autostart')}
                disabled={!!loading || !tunnel}
                variant="outline"
                className="h-10 text-xs font-black uppercase italic border-2 gap-1"
              >
                {loading === 'autostart' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Auto Start
              </Button>
              <Button
                onClick={() => { if (confirm('Apagar configuração e recriar?')) callApi('reconfigure'); }}
                disabled={!!loading}
                variant="outline"
                className="h-10 text-xs font-black uppercase italic border-2 border-red-200 text-red-600 hover:bg-red-50 gap-1"
              >
                {loading === 'reconfigure' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Reconfigurar
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* ─── Terminal de Logs ─────────────────────────────────────────────── */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-black uppercase italic flex items-center gap-2 text-slate-700">
              <Terminal className="w-4 h-4 text-slate-500" /> Logs em Tempo Real
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-mono">
                {logs.length} linhas
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLogs([])}
                className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={logsRef}
            className="bg-slate-950 rounded-b-2xl h-72 overflow-y-auto p-4 font-mono text-xs space-y-0.5"
          >
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <Terminal className="w-8 h-8 mb-2" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Aguardando operação...</span>
              </div>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={cn("leading-relaxed", logColor(line))}>
                  {line}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Guia Rápido ─────────────────────────────────────────────────── */}
      <Card className="border-2 border-dashed border-slate-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-black uppercase italic text-slate-700 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Guia Rápido de Uso
          </h3>
          <ol className="space-y-2">
            {[
              { n: 1, text: 'Certifique-se de que o cloudflared está instalado e autenticado (cloudflared tunnel login)' },
              { n: 2, text: 'Preencha o Nome do Túnel (sem espaços), Domínio e Porta Local' },
              { n: 3, text: 'Clique em "Criar e Conectar" — o sistema cria o túnel, roteia o DNS e gera o config.yml automaticamente' },
              { n: 4, text: 'Clique em "Iniciar Tunnel" para ativar a conexão em segundo plano' },
              { n: 5, text: 'Use "Auto Start" para iniciar o túnel automaticamente ao ligar o Windows' },
              { n: 6, text: 'Se precisar mudar algo, clique em "Reconfigurar" e repita o processo' },
            ].map(({ n, text }) => (
              <li key={n} className="flex items-start gap-3 text-sm">
                <span className="bg-slate-900 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                <span className="text-slate-600 font-bold">{text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

    </div>
  );
}
