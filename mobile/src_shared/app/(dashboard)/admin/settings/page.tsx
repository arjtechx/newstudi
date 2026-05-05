
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getSystemSettings, saveSystemSettings, getNotifications, saveNotification, deleteNotification } from '@/lib/store';
import { SystemSettings, SoundSettings, DashboardWidgetConfig, DashboardWidgetId, AppNotification, AIProviderConfig, AIProviderName } from '@/lib/types';
import { AI_PROVIDER_DEFAULTS, testProviderSlot, callAI } from '@/lib/ai-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Settings2, Save, Music, Sparkles, Upload, Play, Square, Volume2, Layout, ArrowUp, ArrowDown, Eye, EyeOff, Bell, Plus, Trash2, Megaphone, Copy, Link, Globe, Terminal, AlertTriangle, CheckCircle2, Monitor, Download, Database, Rocket, ShieldAlert, Zap, FileCode, Activity, RefreshCw, ArrowRight, Check, Bot, Key, Cpu, ExternalLink, Wifi, WifiOff, Search } from 'lucide-react';
import { runFullDataAudit, purgeOrphanAttempts, migrateToGCMMarica, runLoadSimulator, toggleMaintenanceMode } from '@/lib/maintenance-actions';
import { getSystemLogs } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { audioManager } from '@/lib/audio-manager';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotifDialogOpen, setIsNotifDialogOpen] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Tunnel Manager State ─────────────────────────────────────────────────
  const [tunnelName, setTunnelName]         = useState('');
  const [tunnelDomain, setTunnelDomain]     = useState('');
  const [tunnelPort, setTunnelPort]         = useState('3000');
  const [tunnelTarget, setTunnelTarget]     = useState('127.0.0.1');
  const [tunnelProtocol, setTunnelProtocol] = useState('http');
  const [tunnelRunning, setTunnelRunning]   = useState(false);
  const [tunnelData, setTunnelData]         = useState<any>(null);
  const [tunnelLogs, setTunnelLogs]         = useState<string[]>([]);
  const [tunnelRoutes, setTunnelRoutes]     = useState<{name?:string, hostname:string, service:string, paused?:boolean}[]>([]);
  const [editingRouteHost, setEditingRouteHost] = useState<string | null>(null);

  const [appPort, setAppPort] = useState('3000');
  const [appPortSaving, setAppPortSaving] = useState(false);

  const [tunnelLoading, setTunnelLoading]   = useState<string | null>(null);
  const [tunnelError, setTunnelError]       = useState('');
  const [tunnelSuccess, setTunnelSuccess]   = useState('');
  const [logsExpanded, setLogsExpanded]     = useState(false);
  const tunnelLogsRef = useRef<HTMLDivElement>(null);
  const tunnelPollRef = useRef<NodeJS.Timeout | null>(null);

  // IP / IPv6 Watch
  const [localIPv4, setLocalIPv4]             = useState('');
  const [localIPv6, setLocalIPv6]             = useState('');
  const [ipv6WatchActive, setIpv6WatchActive] = useState(false);

  // ─── Wizard de Configuração ─────────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen]       = useState(false);
  const [wizardStep, setWizardStep]       = useState(0);
  const [wizardChecked, setWizardChecked] = useState<'idle'|'checking'|'ok'|'error'>('idle');
  const [wizardName, setWizardName]       = useState('');
  const [wizardDomain, setWizardDomain]   = useState('');
  const [wizardPort, setWizardPort]       = useState('3000');
  const [wizardTarget, setWizardTarget]   = useState('127.0.0.1');
  const [wizardProtocol, setWizardProtocol] = useState('http');
  const [wizardCreating, setWizardCreating] = useState(false);
  const [wizardDone, setWizardDone]       = useState(false);

  // Diagnóstico
  const [diagChecks, setDiagChecks]   = useState<Record<string, {ok:boolean;detail:string}> | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // ─── AI Config State ─────────────────────────────────────────────────────────
  const DEFAULT_AI_CONFIG: AIMultiConfig = { 
    defaultProvider: 'none', 
    systemPrompt: 'Você é um assistente de estudos especializado em concursos públicos. Seja objetivo, didático e responda em português.', 
    fallbackEnabled: true,
    providers: {} 
  };
  const [aiConfig, setAiConfig]       = useState<AIMultiConfig>(DEFAULT_AI_CONFIG);
  const [aiWizardStep, setAiWizardStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderName | 'none'>('none');
  const [aiTesting, setAiTesting]     = useState<AIProviderName | null>(null);
  const [aiTestResults, setAiTestResults] = useState<Record<string, {ok: boolean; message: string}>>({});
  const [aiShowKey, setAiShowKey] = useState<Record<string, boolean>>({});
  const [isAuditorOpen, setIsAuditorOpen] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any[]>([]);
  const [aiSaving, setAiSaving]       = useState(false);

  // ─── No-IP / DDNS State ─────────────────────────────────────────────────────
  const [noipUsername, setNoipUsername] = useState('');
  const [noipPassword, setNoipPassword] = useState('');
  const [noipHostname, setNoipHostname] = useState('');
  const [noipMode, setNoipMode]         = useState('ipv4');
  const [noipAutoUpdate, setNoipAutoUpdate] = useState(false);
  const [noipStatus, setNoipStatus]     = useState<{success?: boolean; message?: string}>({});
  const [noipLoading, setNoipLoading]   = useState(false);
  const [noipLogs, setNoipLogs]         = useState<string[]>([]);
  const noipLogsRef = useRef<HTMLDivElement>(null);
  const noipPollRef = useRef<NodeJS.Timeout | null>(null);
  
  const [editingNotif, setEditingNotif] = useState<Partial<AppNotification>>({
    title: '',
    message: '',
    type: 'info',
    active: true
  });

  const currentTargetKey = useRef<keyof SoundSettings | null>(null);

  const runDeepAudit = async () => {
    setIsAuditing(true);
    setAuditResults([]);
    const results: any[] = [];

    const providers = Object.entries(aiConfig.providers || {}) as [AIProviderName, AIProviderSlot][];
    
    for (const [pName, slot] of providers) {
      if (!slot.enabled) continue;
      
      const start = Date.now();
      try {
        const res = await callAI(aiConfig, [{ role: 'user', content: 'Explique o que é o Princípio da Impessoalidade em exatamente 1 frase.' }], { forceProvider: pName, useCache: false });
        const latency = Date.now() - start;
        
        results.push({
          provider: pName,
          status: res.error ? 'error' : 'ok',
          message: res.error || res.response,
          latency
        });
      } catch (e: any) {
        results.push({ provider: pName, status: 'error', message: e.message, latency: Date.now() - start });
      }
      setAuditResults([...results]);
    }
    setIsAuditing(false);
  };

  const handleUploadAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage || !settings) return;
    setIsUploadingAudio(true);
    try {
        const fileId = Date.now().toString();
        const storageRef = ref(storage, `sounds/${fileId}_${file.name}`);
        const uploadTask = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        const newAudio = { id: fileId, name: file.name, url: downloadURL, createdAt: Date.now() };
        const updatedLibrary = [...(settings.sounds.library || []), newAudio];
        
        setSettings({ ...settings, sounds: { ...settings.sounds, library: updatedLibrary } });
        toast({ title: "Áudio Adicionado", description: "O arquivo foi enviado para a biblioteca." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro no Upload", description: error.message });
    } finally {
        setIsUploadingAudio(false);
        if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const playAudio = (url: string, id: string) => {
    if (!url || url === 'none') return;
    
    // Parar o atual se estiver tocando
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        if (playingAudioId === id) {
            setPlayingAudioId(null);
            return; // Se clicou no que já estava tocando, apenas pausa
        }
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAudioId(id);

    audio.play().catch(e => {
        console.error("Erro ao tocar áudio:", e);
        toast({ variant: "destructive", title: "Erro de Reprodução", description: "Verifique o formato do arquivo ou tente novamente." });
        setPlayingAudioId(null);
    });

    audio.onended = () => {
        setPlayingAudioId(null);
        audioRef.current = null;
    };
  };

  const copyToClipboard = async (text: string) => {
      try {
          await navigator.clipboard.writeText(text);
          toast({ title: "Copiado!", description: "URL pública do arquivo copiada para a área de transferência." });
      } catch (err) {
          toast({ variant: "destructive", title: "Erro", description: "Não foi possível copiar." });
      }
  };

  const deleteAudio = async (audioId: string, url: string) => {
    if (!storage || !settings) return;
    try {
       const storageRef = ref(storage, url);
       await deleteObject(storageRef).catch(e => console.warn("Erro ao deletar arquivo remoto", e));
       
       const updatedLibrary = (settings.sounds.library || []).filter(a => a.id !== audioId);
       setSettings({ ...settings, sounds: { ...settings.sounds, library: updatedLibrary } });
       toast({ title: "Áudio Removido" });
    } catch (error: any) {
       toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    }
  };

  const fetchData = async () => {
    if (!firestore) return;
    const [sData, nData] = await Promise.all([
      getSystemSettings(firestore),
      getNotifications(firestore)
    ]);
    setSettings(sData);
    setNotifications(nData);
    setIsLoading(false);
    
    // Carrega estados do túnel/porta de volta se existirem
    if (sData?.tunnelConfig) {
      setTunnelName(sData.tunnelConfig.name);
      setTunnelDomain(sData.tunnelConfig.domain);
      setTunnelPort(sData.tunnelConfig.port);
      setTunnelTarget(sData.tunnelConfig.target || '127.0.0.1');
      setTunnelProtocol(sData.tunnelConfig.protocol);
    }
    if (sData?.serverPort) {
      setAppPort(sData.serverPort);
    }
    if ((sData as any)?.aiConfig) {
      const savedConfig = (sData as any).aiConfig;
      // Garante que a estrutura nova exista mesmo se o dado no banco for antigo
      const normalizedConfig: AIMultiConfig = {
        ...DEFAULT_AI_CONFIG,
        ...savedConfig,
        providers: savedConfig.providers || {}
      };
      setAiConfig(normalizedConfig);
      if (normalizedConfig.defaultProvider !== 'none') {
        setSelectedProvider(normalizedConfig.defaultProvider);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [firestore]);

  // ─── Tunnel: Polling ──────────────────────────────────────────────────────
  const fetchTunnelStatus = React.useCallback(async () => {
    try {
      const [sRes, lRes, pRes] = await Promise.all([
        fetch('/api/tunnel?action=status'),
        fetch('/api/tunnel?action=logs'),
        fetch('/api/system/port').catch(()=>({ json:()=>({}) } as Response)),
      ]);
      const s = await sRes.json();
      const l = await lRes.json();
      const p = await pRes.json().catch(()=>({}));
      
      setTunnelRunning(s.running ?? false);
      setTunnelData(s.tunnel ?? null);
      setTunnelLogs(l.logs ?? []);
      setLocalIPv4(s.ipv4 ?? '');
      setLocalIPv6(s.ipv6 ?? '');
      setIpv6WatchActive(s.ipv6WatchActive ?? false);
      if (s.routes) setTunnelRoutes(s.routes);
      if (p.port && !appPortSaving) setAppPort(p.port);
    } catch {}
  }, [appPortSaving]);

  useEffect(() => {
    fetchTunnelStatus();
    tunnelPollRef.current = setInterval(fetchTunnelStatus, 2500);
    return () => { if (tunnelPollRef.current) clearInterval(tunnelPollRef.current); };
  }, [fetchTunnelStatus]);

  useEffect(() => {
    if (tunnelLogsRef.current) tunnelLogsRef.current.scrollTop = tunnelLogsRef.current.scrollHeight;
  }, [tunnelLogs]);

  // ─── No-IP Methods ──────────────────────────────────────────────────────
  const fetchNoipData = async () => {
    try {
      const res = await fetch('/api/noip');
      const data = await res.json();
      if (data.username) setNoipUsername(data.username);
      if (data.password) setNoipPassword(data.password);
      if (data.hostname) setNoipHostname(data.hostname);
      if (data.mode) setNoipMode(data.mode);
      setNoipAutoUpdate(data.autoUpdate || false);
    } catch (e) { console.error('Erro ao buscar dados No-IP', e); }
  };

  const fetchNoipLogs = async () => {
    try {
      const res = await fetch('/api/noip?action=logs');
      const data = await res.json();
      if (data.logs) setNoipLogs(data.logs);
    } catch (e) {}
  };

  useEffect(() => {
    fetchNoipData();
    fetchNoipLogs();
    noipPollRef.current = setInterval(fetchNoipLogs, 2500);
    return () => { if (noipPollRef.current) clearInterval(noipPollRef.current); };
  }, []);

  useEffect(() => {
    if (noipLogsRef.current) noipLogsRef.current.scrollTop = noipLogsRef.current.scrollHeight;
  }, [noipLogs]);

  const handleUpdateNoip = async () => {
    setNoipLoading(true);
    setNoipStatus({});
    try {
      const res = await fetch('/api/noip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: noipUsername, password: noipPassword, hostname: noipHostname, mode: noipMode }),
      });
      const data = await res.json();
      setNoipStatus({ success: res.ok, message: data.message || (res.ok ? 'Atualizado com sucesso!' : 'Erro') });
    } catch (e: any) {
      setNoipStatus({ success: false, message: e.message });
    } finally {
      setNoipLoading(false);
    }
  };

  const toggleNoipAutoUpdate = async (enable: boolean) => {
    try {
      const res = await fetch('/api/noip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_auto_update', enable })
      });
      const data = await res.json();
      setNoipAutoUpdate(data.autoUpdate);
    } catch (e) { console.error('Erro ao ativar auto update no-ip', e); }
  };

  const callTunnelApi = async (action: string, extraArgs: any = {}) => {
    setTunnelLoading(action); setTunnelError(''); setTunnelSuccess('');
    try {
      const payload = { action, name: tunnelName, domain: tunnelDomain, port: parseInt(tunnelPort), target: tunnelTarget, protocol: tunnelProtocol, ...extraArgs };
      const res = await fetch('/api/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setTunnelError(data.error || 'Erro'); }
      else {
        const msgs: Record<string, string> = {
          create: 'Túnel criado! Clique em "Iniciar Tunnel".',
          start: 'Túnel iniciado!', stop: 'Túnel parado.',
          reconfigure: 'Configuração removida.',
          autostart: `AutoStart ativado!\n${data.path}`,
          add_route: 'Nova rota adicionada!',
          remove_route: 'Rota removida.'
        };
        setTunnelSuccess(msgs[action] || 'Concluído.');
        fetchTunnelStatus();
      }
    } catch (e: any) { setTunnelError(e.message); }
    finally { setTunnelLoading(null); }
  };

  const tunnelLogColor = (line: string) => {
    if (line.includes('[ERROR]') || line.includes('ERR')) return 'text-red-400';
    if (line.includes('[WARN]')) return 'text-amber-400';
    if (line.includes('[OK]') || line.includes('Connected')) return 'text-emerald-400';
    if (line.includes('[START]') || line.includes('[CREATE]') || line.includes('[DNS]')) return 'text-blue-400';
    return 'text-slate-400';
  };

  const handleSaveAppPort = async () => {
    setAppPortSaving(true);
    try {
      const res = await fetch('/api/system/port', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ port: appPort })
      });
      const data = await res.json();
      if(res.ok) toast({ title: 'Porta Modificada', description: data.message });
      else toast({ variant: 'destructive', title: 'Erro', description: data.error });
    } catch(e:any) { toast({ variant: 'destructive', title: 'Erro', description: e.message }); }
    finally { setAppPortSaving(false); }
  };

  // ─── Auditoria & Scripts State ──────────────────────────────────────────────
  const [auditLogs, setAuditLogs]         = useState<string[]>([]);
  const [auditProgress, setAuditProgress] = useState(0);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [systemLogs, setSystemLogs]       = useState<any[]>([]);
  const auditScrollRef = useRef<HTMLDivElement>(null);

  const addAuditLog = (msg: string) => {
    setAuditLogs(prev => [...prev, `> [${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    if (auditScrollRef.current) auditScrollRef.current.scrollTop = auditScrollRef.current.scrollHeight;
  }, [auditLogs]);

  useEffect(() => {
    if (firestore) getSystemLogs(firestore).then(setSystemLogs);
  }, [firestore]);

  const runAudit = async () => {
    setIsProcessing(true); setAuditProgress(10);
    setAuditLogs(['> [INIT] DEEP SCAN ATIVADO...']);
    try { await runFullDataAudit(addAuditLog); setAuditProgress(100); toast({ title: 'Deep Scan Concluído' }); }
    catch (e: any) { addAuditLog(`! ERRO CRÍTICO: ${e.message}`); setAuditProgress(0); }
    finally { setIsProcessing(false); }
  };

  const handleMigrateGCM = async () => {
    setIsProcessing(true); setAuditProgress(5);
    setAuditLogs(['> [PROTOCOL] INICIANDO MIGRAÇÃO GCM MARICÁ...']);
    try { await migrateToGCMMarica(addAuditLog); setAuditProgress(100); toast({ title: 'Migração Finalizada' }); }
    catch (e: any) { addAuditLog(`! ERRO: ${e.message}`); setAuditProgress(0); }
    finally { setIsProcessing(false); }
  };

  const runSimulator = async () => {
    setIsProcessing(true);
    addAuditLog('Iniciando Simulador de Stress...');
    await runLoadSimulator(addAuditLog);
    setIsProcessing(false);
    toast({ title: 'Carga Sintética Gerada' });
  };

  const handleCopyLog = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado', description: 'Linha de log salva.', duration: 2000 });
  };

  const handleSaveSettings = async () => {
    if (!firestore || !settings) return;
    setIsSaving(true);
    try {
      // Sincroniza configurações locais do túnel e porta para o objeto de settings antes de salvar
      const updatedSettings = {
        ...settings,
        tunnelConfig: {
          name: tunnelName,
          domain: tunnelDomain,
          port: tunnelPort,
          target: tunnelTarget,
          protocol: tunnelProtocol
        },
        serverPort: appPort
      };
      
      await saveSystemSettings(firestore, updatedSettings, adminUser);
      setSettings(updatedSettings as SystemSettings);
      
      // Salva porta também na API de sistema
      await fetch('/api/system/port', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ port: appPort })
      });

      audioManager.init(settings.sounds);
      toast({ title: "Configurações Sincronizadas" });
    } catch (error: any) {
      console.error("Erro completo ao salvar:", error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message || "Erro desconhecido" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotif = async () => {
    if (!editingNotif.title || !editingNotif.message) {
      toast({ variant: "destructive", title: "Campos obrigatórios" });
      return;
    }
    await saveNotification(firestore, editingNotif, adminUser);
    await fetchData();
    setIsNotifDialogOpen(false);
    toast({ title: "Notificação Disparada" });
  };

  const handleDeleteNotif = async (id: string) => {
    await deleteNotification(firestore, id, adminUser);
    await fetchData();
    toast({ title: "Notificação Removida" });
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    setSettings(prev => {
      if (!prev) return null;
      const widgets = [...prev.dashboard.widgets];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= widgets.length) return prev;
      [widgets[index], widgets[targetIndex]] = [widgets[targetIndex], widgets[index]];
      const orderedWidgets = widgets.map((w, i) => ({ ...w, order: i }));
      return { ...prev, dashboard: { ...prev.dashboard, widgets: orderedWidgets } };
    });
  };

  if (isLoading || !settings) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <Settings2 className="w-10 h-10 text-primary" /> Painel de Sistema
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Gestão Global de Experiência e Layout</p>
        </div>
        <Button size="lg" className="h-14 px-10 text-lg font-black gap-2 shadow-[0_5px_0_0_#1e40af]" onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          SALVAR ALTERAÇÕES
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/50 border-2 rounded-xl mb-8 p-1">
          <TabsTrigger value="dashboard"     className="font-black uppercase text-[10px] gap-1"><Layout className="w-3 h-3" /> Layout</TabsTrigger>
          <TabsTrigger value="notifications" className="font-black uppercase text-[10px] gap-1"><Megaphone className="w-3 h-3" /> Notificações</TabsTrigger>
          <TabsTrigger value="sounds"        className="font-black uppercase text-[10px] gap-1"><Music className="w-3 h-3" /> Sons</TabsTrigger>
          <TabsTrigger value="tunnel"        className="font-black uppercase text-[10px] gap-1"><Globe className="w-3 h-3" /> Tunnel</TabsTrigger>
          <TabsTrigger value="noip"          className="font-black uppercase text-[10px] gap-1"><Link className="w-3 h-3" /> No-IP</TabsTrigger>
          <TabsTrigger value="audit"         className="font-black uppercase text-[10px] gap-1"><Terminal className="w-3 h-3" /> Auditoria</TabsTrigger>
          <TabsTrigger value="ai"            className="font-black uppercase text-[10px] gap-1"><Bot className="w-3 h-3" /> IA</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Card className="material-card border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 italic uppercase"><Layout className="w-5 h-5 text-primary" /> Widgets do Aluno</CardTitle>
              <CardDescription>Defina a ordem e visibilidade dos módulos no Dashboard do estudante.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               {settings.dashboard.widgets.sort((a, b) => a.order - b.order).map((widget, idx) => (
                  <div key={widget.id} className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all", widget.enabled ? "bg-white border-primary/20" : "bg-muted/30 opacity-60")}>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveWidget(idx, 'up')} disabled={idx === 0}><ArrowUp className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveWidget(idx, 'down')} disabled={idx === settings.dashboard.widgets.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                      </div>
                      <div>
                        <p className="font-black text-xs uppercase tracking-widest">{widget.label}</p>
                        <p className="text-[8px] text-muted-foreground font-bold">POSIÇÃO: #{idx + 1}</p>
                      </div>
                    </div>
                    <Switch checked={widget.enabled} onCheckedChange={(checked) => {
                      const widgets = settings.dashboard.widgets.map(w => w.id === widget.id ? { ...w, enabled: checked } : w);
                      setSettings({ ...settings, dashboard: { ...settings.dashboard, widgets } });
                    }} />
                  </div>
               ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="material-card border-2 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 italic uppercase"><Megaphone className="w-5 h-5 text-primary" /> Broadcast de Avisos</CardTitle>
                <CardDescription>Envie mensagens diretas para o dashboard de todos os alunos.</CardDescription>
              </div>
              <Button onClick={() => { setEditingNotif({ title: '', message: '', type: 'info', active: true }); setIsNotifDialogOpen(true); }} className="gap-2 font-black">
                <Plus className="w-4 h-4" /> NOVO AVISO
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground font-bold italic">Nenhuma notificação cadastrada.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {notifications.map((n) => (
                    <div key={n.id} className={cn("p-6 rounded-3xl border-2 flex items-center justify-between group", !n.active && "opacity-50 grayscale")}>
                      <div className="flex items-start gap-4">
                        <div className={cn("p-3 rounded-2xl", n.type === 'danger' ? "bg-red-100 text-red-600" : n.type === 'warning' ? "bg-amber-100 text-amber-600" : n.type === 'success' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>
                          <Bell className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-lg leading-tight">{n.title}</h4>
                          <p className="text-sm font-medium text-muted-foreground line-clamp-1">{n.message}</p>
                          <div className="flex gap-2 mt-2">
                             <Badge variant="outline" className="text-[8px] font-black uppercase">{n.type}</Badge>
                             {n.active ? <Badge className="bg-emerald-500 text-[8px] font-black uppercase">ATIVO</Badge> : <Badge variant="secondary" className="text-[8px] font-black uppercase">INATIVO</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingNotif(n); setIsNotifDialogOpen(true); }}><Settings2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteNotif(n.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sounds" className="space-y-6">
           <Card className="material-card border-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="italic uppercase flex items-center gap-2"><Music className="w-5 h-5 text-primary" /> Biblioteca de Áudio</CardTitle>
                <CardDescription>Envie e gerencie efeitos sonoros para os eventos do sistema.</CardDescription>
              </div>
              <div>
                <input type="file" accept="audio/*" ref={audioInputRef} className="hidden" onChange={handleUploadAudio} />
                <Button onClick={() => audioInputRef.current?.click()} disabled={isUploadingAudio} className="gap-2 font-black">
                  {isUploadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} ENVIAR ÁUDIO
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(settings.sounds.library || []).length === 0 ? (
                  <div className="col-span-full p-8 text-center text-muted-foreground font-bold italic border-2 border-dashed rounded-2xl bg-muted/20">
                    Nenhum arquivo de áudio na biblioteca. Envie o primeiro!
                  </div>
                ) : (
                   (settings.sounds.library || []).map(audio => (
                     <div key={audio.id} className="p-4 border-2 rounded-2xl flex items-center justify-between group bg-white hover:border-primary/40 transition-colors">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                            <Music className="w-5 h-5" />
                         </div>
                         <div className="flex flex-col">
                            <span className="font-bold text-sm truncate max-w-[200px]" title={audio.name}>{audio.name}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{new Date(audio.createdAt).toLocaleDateString('pt-BR')}</span>
                         </div>
                       </div>
                       <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(audio.url)} title="Copiar URL Pública">
                              <Link className="w-3 h-3" />
                          </Button>
                          <Button variant={playingAudioId === audio.id ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => playAudio(audio.url, audio.id)} title={playingAudioId === audio.id ? "Parar" : "Tocar"}>
                              {playingAudioId === audio.id ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteAudio(audio.id, audio.url)} title="Excluir Arquivo">
                              <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                     </div>
                   ))
                )}
              </div>

              <div className="border-t-2 pt-6">
                 <h3 className="font-black uppercase italic mb-4 text-primary flex items-center gap-2"><Volume2 className="w-5 h-5" /> Associação de Efeitos</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['success', 'error', 'tick', 'timeout', 'fanfare'].map((soundKey) => (
                        <div key={soundKey} className="space-y-2 bg-muted/20 p-4 rounded-2xl border-2">
                            <Label className="font-black uppercase text-[10px] tracking-widest text-slate-500">
                                {soundKey === 'success' ? 'Acerto / Sucesso' : 
                                 soundKey === 'error' ? 'Erro / Falha' : 
                                 soundKey === 'tick' ? 'Tic-Tac (Temporizador)' : 
                                 soundKey === 'timeout' ? 'Tempo Esgotado' : 
                                 'Fanfarra / Subida de Nível'}
                            </Label>
                            <div className="flex gap-2">
                                <Select 
                                  value={(settings.sounds as any)[soundKey] || 'none'} 
                                  onValueChange={(val) => setSettings({ ...settings, sounds: { ...settings.sounds, [soundKey]: val } })}
                                >
                                    <SelectTrigger className="font-bold flex-1 bg-white">
                                        <SelectValue placeholder="Selecione um áudio..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Silencioso (Nenhum)</SelectItem>
                                        {(settings.sounds.library || []).map(audio => (
                                            <SelectItem key={audio.id} value={audio.url}>{audio.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="icon" onClick={() => playAudio((settings.sounds as any)[soundKey], soundKey)} disabled={!(settings.sounds as any)[soundKey] || (settings.sounds as any)[soundKey] === 'none'}>
                                  {playingAudioId === soundKey ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────── TUNNEL MANAGER ─────────── */}

        <TabsContent value="tunnel" className="space-y-6">
          {/* Header de Status Dinâmico */}
          {tunnelData && (
            <div className="flex items-center justify-between bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-4 h-4 rounded-full ${tunnelRunning ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-slate-300'} transition-all duration-500`} />
                  {tunnelRunning && <div className="absolute inset-0 w-4 h-4 rounded-full bg-emerald-500 animate-ping opacity-40" />}
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase italic flex items-center gap-2 tracking-tight">
                    <span className={tunnelRunning ? 'text-emerald-600' : 'text-slate-400'}>
                      {tunnelRunning ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <span className="text-slate-300 mx-1">|</span>
                    <span className="text-slate-700">{tunnelData.name}</span>
                  </h2>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{tunnelData.domain}</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <div className={`px-3 py-1 rounded-full text-[10px] font-black border-2 ${tunnelRunning ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                    ID: {tunnelData.tunnelId?.slice(0,8) || 'LOC-DEV'}
                 </div>
              </div>
            </div>
          )}

          {/* Grid de 2 Colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUNA ESQUERDA: CONFIGURAÇÃO (5/12) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card: Configuração (Main Form) */}
              <Card className="material-card border-2 shadow-xl overflow-hidden">
                <div className="bg-slate-50 border-b-2 border-slate-100 p-4">
                  <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2 text-slate-700">
                    <Settings2 className="w-4 h-4 text-orange-500" /> Configuração
                  </CardTitle>
                </div>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-4">
                    {[
                      {label:'Nome do Túnel', val:tunnelName, set:setTunnelName, ph:'ex: aplicativob'},
                      {label:'Domínio / Subdomínio', val:tunnelDomain, set:setTunnelDomain, ph:'ex: web.arjtechbr.site'},
                      {label:'Host / IP de Destino', val:tunnelTarget, set:setTunnelTarget, ph:'ex: 127.0.0.1'},
                      {label:'Porta Local', val:tunnelPort, set:(v:string)=>setTunnelPort(v.replace(/\D/g,'')), ph:'ex: 3000'},
                    ].map(({label,val,set,ph}) => (
                      <div key={label} className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
                        <input
                          value={val}
                          onChange={e => set(e.target.value)}
                          placeholder={ph}
                          disabled={!!tunnelLoading}
                          className="w-full h-11 px-4 rounded-xl border-2 border-slate-100 text-sm outline-none focus:border-primary focus:bg-white bg-slate-50/50 transition-all font-mono font-bold disabled:opacity-50"
                        />
                      </div>
                    ))}

                    {/* Protocolo Grid 2x3 */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Método / Protocolo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'http',  label: 'HTTP',  desc: 'Web padrão',  color: 'blue'   },
                          { id: 'https', label: 'HTTPS', desc: 'Web seguro',   color: 'emerald'},
                          { id: 'ssh',   label: 'SSH',   desc: 'Terminal',    color: 'purple' },
                          { id: 'tcp',   label: 'TCP',   desc: 'Genérico',   color: 'orange' },
                          { id: 'rdp',   label: 'RDP',   desc: 'Desktop',    color: 'rose'   },
                          { id: 'smb',   label: 'SMB',   desc: 'Arquivo',    color: 'amber'  },
                        ].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={!!tunnelLoading}
                            onClick={() => setTunnelProtocol(p.id)}
                            className={`p-2.5 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                              tunnelProtocol === p.id
                                ? `border-${p.color}-400 bg-${p.color}-50 text-${p.color}-700 ring-2 ring-${p.color}-100`
                                : 'border-slate-100 hover:border-slate-200 text-slate-500 bg-white'
                            }`}
                          >
                            <p className="text-[11px] font-black uppercase leading-tight">{p.label}</p>
                            <p className="text-[8px] font-bold opacity-60 italic">{p.desc}</p>
                            {tunnelProtocol === p.id && (
                              <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-${p.color}-500`} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Form */}
                  <div className="flex flex-col gap-3 pt-2">
                    {editingRouteHost ? (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            callTunnelApi('edit_route', { oldHostname: editingRouteHost, name: tunnelName, domain: tunnelDomain, port: tunnelPort, protocol: tunnelProtocol });
                            setEditingRouteHost(null);
                            setTunnelName(''); setTunnelDomain(''); setTunnelPort('3000'); setTunnelTarget('127.0.0.1');
                          }}
                          disabled={!!tunnelLoading || !tunnelName || !tunnelDomain || !tunnelPort}
                          className="flex-1 h-14 text-sm font-black uppercase italic bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-[0_5px_0_0_#059669] active:translate-y-1 active:shadow-none transition-all gap-2"
                        >
                          {tunnelLoading === 'edit_route' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                          Salvar Alterações
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingRouteHost(null); setTunnelName(''); setTunnelDomain(''); setTunnelPort('3000'); setTunnelTarget('127.0.0.1'); }} className="px-5 h-14 font-black uppercase italic border-2 rounded-2xl">
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button 
                          onClick={() => callTunnelApi(tunnelData ? 'add_route' : 'create')}
                          disabled={!!tunnelLoading || !tunnelName || !tunnelDomain || !tunnelPort}
                          className={`w-full h-14 text-sm font-black uppercase italic transition-all flex items-center justify-center gap-3 ${tunnelData ? 'bg-blue-600 hover:bg-blue-700 shadow-[0_5px_0_0_#1d4ed8]' : 'bg-orange-500 hover:bg-orange-600 shadow-[0_5px_0_0_#ea580c]'} text-white rounded-2xl active:translate-y-1 active:shadow-none`}
                        >
                          {tunnelLoading === 'create' || tunnelLoading === 'add_route' ? <Loader2 className="w-5 h-5 animate-spin" /> : tunnelData ? <Plus className="w-5 h-5" /> : <Rocket className="w-5 h-5" />}
                          {tunnelData ? '➕ ADICIONAR NOVA ROTA' : '🚀 CRIAR E CONECTAR'}
                        </Button>
                        {(tunnelName || tunnelDomain || tunnelPort !== '3000' || tunnelTarget !== '127.0.0.1') && (
                          <button onClick={() => { setTunnelName(''); setTunnelDomain(''); setTunnelPort('3000'); setTunnelTarget('127.0.0.1'); setTunnelProtocol('http'); }} className="w-full text-[10px] font-black uppercase italic text-slate-400 hover:text-primary transition-colors py-1">Limpar Campos</button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card: Servidor & Auth (Compactos) */}
              <div className="grid grid-cols-1 gap-4">
                 <Card className="material-card border-2">
                    <CardHeader className="py-3 px-4 border-b border-slate-50 flex flex-row items-center justify-between">
                      <CardTitle className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Settings2 className="w-3 h-3"/> Porta Local</CardTitle>
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md">Ativo: {appPort}</span>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex gap-2">
                        <Input type="number" value={appPort} onChange={e => setAppPort(e.target.value)} className="h-9 w-20 font-bold border-2" />
                        <Button onClick={handleSaveAppPort} disabled={appPortSaving} className="flex-1 h-9 text-[10px] font-black uppercase"><Save className="w-3 h-3 mr-1.5"/> Atualizar</Button>
                      </div>
                    </CardContent>
                 </Card>

                 <Card className="material-card border-2 border-amber-100 bg-amber-50/20">
                    <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500 rounded-lg"><ShieldAlert className="w-4 h-4 text-white"/></div>
                          <div>
                             <p className="text-[11px] font-black text-amber-800 uppercase italic">Acesso Cloudflare</p>
                             <p className="text-[8px] font-bold text-amber-600/60 uppercase tracking-tighter">Login no Browser Necessário</p>
                          </div>
                       </div>
                       <button onClick={() => callTunnelApi('login')} className="h-9 px-4 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase shadow-[0_3px_0_0_#d97706] active:translate-y-0.5 transition-all">Autenticar</button>
                    </CardContent>
                 </Card>
              </div>

              {/* IPv6 Monitor */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${ipv6WatchActive ? 'border-purple-100 bg-purple-50/30' : 'border-slate-100 bg-slate-50/30'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${ipv6WatchActive ? 'bg-purple-500' : 'bg-slate-300'}`}><Globe className="w-4 h-4 text-white" /></div>
                  <div>
                    <p className="text-xs font-black uppercase italic text-slate-700 leading-tight">Auto-Monitor IPv6</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Checar IP a cada 30s</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/tunnel', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'ipv6_watch', enable: !ipv6WatchActive }),
                    });
                    if (res.ok) { setIpv6WatchActive(v => !v); fetchTunnelStatus(); }
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${ipv6WatchActive ? 'bg-purple-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ipv6WatchActive ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            {/* COLUNA DIREITA: EXECUÇÃO / STATUS (7/12) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Card de IPs e Status Compacto */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'IPv4 Público', val: localIPv4 || '---', icon: Zap, color: 'blue' },
                  { label: 'IPv6 Resumido', val: localIPv6 ? localIPv6.slice(0,18)+'...' : '---', icon: Globe, color: 'purple' },
                  { label: 'Porta Ativa', val: tunnelData ? tunnelData.port : '---', icon: Settings2, color: 'emerald' },
                ].map(item => (
                  <div key={item.label} className="bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm">
                    <item.icon className={`w-4 h-4 text-${item.color}-500 mb-2`} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                    <p className="text-xs font-mono font-bold text-slate-700 truncate">{item.val}</p>
                  </div>
                ))}
              </div>

              {/* Controles do Túnel */}
              <Card className="material-card border-2">
                <CardContent className="p-4 space-y-4">
                   <div className="flex flex-col gap-3">
                      {!tunnelData ? (
                        <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
                           <p className="text-xs font-black text-slate-400 uppercase italic">Configure o túnel à esquerda primeiro</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                           {tunnelRunning ? (
                             <button onClick={() => callTunnelApi('stop')} className="col-span-2 h-14 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_5px_0_0_#b91c1c] active:translate-y-1 active:shadow-none transition-all">
                                <Square className="w-5 h-5"/> Parar Túnel
                             </button>
                           ) : (
                             <button onClick={() => callTunnelApi('start')} className="col-span-2 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_5px_0_0_#047857] active:translate-y-1 active:shadow-none transition-all">
                                <Play className="w-5 h-5"/> Iniciar Túnel
                             </button>
                           )}
                           <button onClick={() => callTunnelApi('restart')} className="h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 shadow-[0_5px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all">
                              <RefreshCw className={`w-5 h-5 ${tunnelLoading === 'restart' ? 'animate-spin' : ''}`}/> 
                           </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => callTunnelApi('autostart')} disabled={!tunnelData} className="h-11 border-2 border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl font-black uppercase text-[10px] italic flex items-center justify-center gap-2 transition-all">
                            <Download className="w-4 h-4"/> Auto Start
                         </button>
                         <button onClick={() => { if(confirm('Apagar tudo e recriar?')) callTunnelApi('reconfigure'); }} className="h-11 border-2 border-red-50 text-red-400 hover:bg-red-50 rounded-xl font-black uppercase text-[10px] italic flex items-center justify-center gap-2 transition-all">
                            <Trash2 className="w-4 h-4"/> Reconfigurar
                         </button>
                      </div>
                   </div>
                </CardContent>
              </Card>

              {/* Lista de Rotas Criadas */}
              {tunnelData && (
                <Card className="material-card border-2 overflow-hidden shadow-sm">
                  <div className="bg-slate-50/50 border-b-2 border-slate-100 p-4 flex items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase italic flex items-center gap-2 text-slate-600">
                      <Globe className="w-4 h-4 text-blue-500" /> Rotas Ativas
                    </CardTitle>
                    <span className="text-[9px] font-black text-slate-400 border rounded-full px-2 py-0.5">{tunnelRoutes.length} SITES</span>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    {tunnelRoutes.map((r, i) => (
                      <div key={i} className={`group flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${r.paused ? 'border-amber-100 bg-amber-50/20 grayscale' : 'border-slate-50 bg-white hover:border-blue-100 shadow-sm'}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <div className={`w-1.5 h-1.5 rounded-full ${r.paused ? 'bg-amber-400' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                             <span className="text-xs font-black uppercase text-slate-700 truncate leading-none">{r.hostname}</span>
                          </div>
                          <p className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                             <ArrowRight className="w-3 h-3 text-slate-200" /> {r.service}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => callTunnelApi('toggle_route', { domain: r.hostname })} className={`p-2 rounded-xl transition-all ${r.paused ? 'text-emerald-500 bg-emerald-50' : 'text-amber-500 bg-amber-50 hover:bg-amber-100'}`}>
                            {r.paused ? <Play className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => {
                            setEditingRouteHost(r.hostname);
                            setTunnelName(r.name || '');
                            setTunnelDomain(r.hostname);
                            const parts = r.service.split('://');
                            if (parts.length > 1) {
                              setTunnelProtocol(parts[0]);
                              const hostPort = parts[1].split(':');
                              setTunnelTarget(hostPort[0]);
                              setTunnelPort(hostPort.length > 1 ? hostPort[1] : '80');
                            }
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Settings2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if(confirm('Remover permanente?')) callTunnelApi('remove_route', { oldHostname: r.hostname }); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Logs (Colapsáveis) */}
              <Card className="material-card border-2 overflow-hidden bg-slate-900 border-slate-800">
                <button 
                  onClick={() => setLogsExpanded(!logsExpanded)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                >
                   <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-black uppercase italic text-slate-400 group-hover:text-slate-200">▼ Logs em Tempo Real</span>
                   </div>
                   {tunnelLogs.some(l => l.toLowerCase().includes('err failed to refresh dns')) && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-[9px] font-black text-red-400 animate-pulse">
                         <AlertTriangle className="w-3 h-3" /> PROBLEMA DE DNS DETECTADO
                      </div>
                   )}
                </button>
                {logsExpanded && (
                  <CardContent className="p-0 border-t border-slate-800">
                    <div ref={tunnelLogsRef} className="h-[250px] overflow-y-auto p-4 font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                      {tunnelLogs.map((line, i) => (
                        <div key={i} className={`py-0.5 border-b border-white/[0.03] last:border-0 ${tunnelLogColor(line)}`}>
                          {line}
                        </div>
                      ))}
                      {tunnelLogs.length === 0 && <p className="text-slate-600 italic">Aguardando logs...</p>}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Diagnóstico (Opcional/Secundário) */}
              <button 
                onClick={async () => {
                   setDiagLoading(true);
                   const r = await fetch('/api/tunnel?action=diagnose');
                   const d = await r.json();
                   setDiagChecks(d.checks);
                   setDiagLoading(false);
                }}
                className="w-full h-10 border-2 border-dashed border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-slate-200 hover:text-slate-500 transition-all flex items-center justify-center gap-2"
              >
                 {diagLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                 Executar Diagnóstico do Sistema
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ────────────────────────── NO-IP / DDNS ──────────── */}
        <TabsContent value="noip" className="space-y-6">
          <Card className="material-card border-2">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase italic flex items-center gap-2 text-slate-700">
                <Link className="w-5 h-5 text-primary" /> Conexão No-IP (DDNS)
              </CardTitle>
              <CardDescription>
                Atualize o IP do seu domínio No-IP automaticamente para acessar o site via rede externa sem precisar do Cloudflare Tunnel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {noipStatus.message && (
                <div className={`p-4 rounded-xl border-2 font-bold text-sm flex gap-3 items-center ${noipStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {noipStatus.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {noipStatus.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">E-mail / Usuário No-IP</Label>
                  <Input 
                    value={noipUsername} 
                    onChange={e => setNoipUsername(e.target.value)} 
                    placeholder="ex: seu_email@teste.com"
                    className="border-2 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senha (DDNS Key)</Label>
                  <Input 
                    type="password"
                    value={noipPassword} 
                    onChange={e => setNoipPassword(e.target.value)} 
                    placeholder="Sua senha do No-IP"
                    className="border-2 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hostname (Domínio)</Label>
                  <Input 
                    value={noipHostname} 
                    onChange={e => setNoipHostname(e.target.value)} 
                    placeholder="ex: meuapp.ddns.net"
                    className="border-2 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modo de IP</Label>
                  <Select value={noipMode} onValueChange={setNoipMode}>
                    <SelectTrigger className="border-2 font-bold h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ipv4">Somente IPv4</SelectItem>
                      <SelectItem value="ipv6">Somente IPv6</SelectItem>
                      <SelectItem value="mixed">Misto (IPv4 + IPv6)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t-2 mt-4">
                <div className="flex items-center gap-3">
                  <Switch checked={noipAutoUpdate} onCheckedChange={toggleNoipAutoUpdate} />
                  <div>
                    <p className="text-sm font-black uppercase italic text-slate-700">Auto Update</p>
                    <p className="text-[10px] font-bold text-slate-400">Verifica e atualiza o IP a cada 5 minutos em background</p>
                  </div>
                </div>

                <Button 
                  onClick={handleUpdateNoip}
                  disabled={noipLoading || !noipUsername || !noipPassword || !noipHostname}
                  className="w-full md:w-auto h-12 font-black uppercase italic gap-2"
                >
                  {noipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  ATUALIZAR IP AGORA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Terminal de Logs do No-IP */}
          <Card className="material-card border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black uppercase italic flex items-center gap-2 text-slate-700">
                  <Terminal className="w-4 h-4 text-slate-500" /> Logs do No-IP (Tempo Real)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono border rounded px-2 py-0.5 text-slate-400">{noipLogs.length} linhas</span>
                  <button onClick={() => setNoipLogs([])} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div ref={noipLogsRef} className="bg-slate-950 rounded-b-2xl h-56 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
                {noipLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600">
                    <Terminal className="w-7 h-7 mb-2" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Aguardando execução...</span>
                  </div>
                ) : noipLogs.map((line, i) => {
                  let color = 'text-slate-400';
                  if (line.includes('[ERROR]') || line.includes('[FATAL]')) color = 'text-red-400';
                  else if (line.includes('[WARN]')) color = 'text-amber-400';
                  else if (line.includes('[OK]')) color = 'text-emerald-400';
                  else if (line.includes('[NO-IP]')) color = 'text-blue-400';
                  else if (line.includes('[AUTO-UPDATE]') || line.includes('[MANUAL]')) color = 'text-purple-400';

                  return <div key={i} className={color}>{line}</div>;
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────────────────── AUDITORIA & SCRIPTS ──────────── */}
        <TabsContent value="audit" className="space-y-6">

          {/* Barra de progresso */}
          <Progress value={auditProgress} className="h-2 bg-slate-200" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Terminal */}
            <div className="lg:col-span-2">
              <Card className="material-card border-2 bg-slate-950 text-emerald-500 overflow-hidden shadow-2xl font-mono text-xs">
                <CardHeader className="border-b border-emerald-500/20 bg-emerald-500/5 flex flex-row items-center justify-between space-y-0 py-3 px-6">
                  <CardTitle className="text-sm font-black flex items-center gap-2 italic">
                    <Activity className="w-4 h-4" /> ENGINE_v3.2_ROOT
                  </CardTitle>
                  <span className="text-[9px] uppercase font-bold opacity-50">Clique nas linhas para copiar</span>
                </CardHeader>
                <CardContent className="p-0">
                  <div ref={auditScrollRef} className="h-[420px] p-6 overflow-y-auto custom-scrollbar">
                    {auditLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-emerald-900 opacity-40">
                        <Terminal className="w-10 h-10 mb-3" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Aguardando protocolo...</span>
                      </div>
                    ) : auditLogs.map((log, i) => (
                      <p
                        key={i}
                        className={cn('flex gap-2 mb-1 group cursor-pointer hover:bg-emerald-500/10 transition-colors rounded px-1', log.includes('!') ? 'text-amber-400' : '')}
                        onClick={() => handleCopyLog(log)}
                      >
                        <span className="opacity-30 shrink-0">admin@base:~$</span>
                        <span className="flex-1">{log}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-40 ml-2" />
                      </p>
                    ))}
                    {isProcessing && <div className="w-2 h-4 bg-emerald-500 animate-pulse ml-2 inline-block align-middle" />}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Protocolos */}
            <div className="space-y-4">
              <Card className="material-card border-2 border-primary/20 bg-white">
                <CardHeader><CardTitle className="text-lg font-black uppercase italic">Protocolos Root</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full h-16 font-black justify-start gap-4 shadow-[0_4px_0_0_#1e40af] text-sm" onClick={runAudit} disabled={isProcessing}>
                    <Database className="w-6 h-6" /> DEEP SCAN (INTEGRIDADE)
                  </Button>
                  <Button className="w-full h-16 font-black justify-start gap-4 border-2 border-primary text-primary shadow-[0_4px_0_0_#2563eb] text-sm group" variant="outline" onClick={handleMigrateGCM} disabled={isProcessing}>
                    <Rocket className="w-6 h-6 group-hover:animate-bounce" /> MIGRAÇÃO: GCM MARICÁ
                  </Button>
                  <Button variant="outline" className="w-full h-14 font-black justify-start gap-4 border-2 border-primary text-primary" onClick={runSimulator} disabled={isProcessing}>
                    <Zap className="w-5 h-5" /> SIMULADOR DE STRESS
                  </Button>
                  <Button variant="outline" className="w-full h-14 font-black justify-start gap-4 border-2 border-amber-500 text-amber-600" onClick={() => toggleMaintenanceMode(true, ['questions'])} disabled={isProcessing}>
                    <ShieldAlert className="w-5 h-5" /> MODO MANUTENÇÃO
                  </Button>
                </CardContent>
                <CardFooter className="bg-muted/30 p-4">
                  <p className="text-[9px] font-black text-amber-800 uppercase italic leading-tight">
                    AVISO: Ações de Root são permanentes e afetam todos os usuários simultaneamente.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>

          {/* Logs de Versão */}
          <Card className="material-card border-2 overflow-hidden shadow-xl">
            <CardHeader>
              <CardTitle className="font-black uppercase italic flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" /> Logs de Versão
              </CardTitle>
              <CardDescription>Histórico de ações administrativas no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {systemLogs.length > 0 ? systemLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleCopyLog(`${log.userName} executou ${log.action} em ${log.entityType} ID: ${log.entityId}`)}>
                    <div className="flex items-center gap-4">
                      <div className={cn('p-2 rounded-lg text-white', log.action === 'DELETE' ? 'bg-red-500' : 'bg-blue-500')}>
                        {log.action === 'DELETE' ? <Trash2 className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight">{log.userName} executou {log.action}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{log.entityType} ID: {log.entityId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="font-mono text-[9px]">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd/MM HH:mm') : '-'}</Badge>
                      <Copy className="w-3 h-3 opacity-20" />
                    </div>
                  </div>
                )) : <div className="p-16 text-center text-muted-foreground font-black uppercase text-xs italic">Nenhum log de versão localizado.</div>}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ───────────────────── ABA DE IA ───────────────────── */}
        <TabsContent value="ai" className="space-y-6">

          {/* Header & Global Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="material-card border-2 lg:col-span-2 overflow-hidden">
              <div className="h-1 bg-primary" />
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase italic flex items-center gap-2">
                  <Bot className="w-6 h-6 text-primary" /> Motor de IA Multi-Provedor
                </CardTitle>
                <CardDescription>Configure múltiplas APIs e o sistema gerenciará falhas e custos automaticamente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Provedor Padrão</Label>
                    <Select 
                      value={aiConfig.defaultProvider} 
                      onValueChange={(v: any) => setAiConfig(prev => ({ ...prev, defaultProvider: v }))}
                    >
                      <SelectTrigger className="h-12 border-2 rounded-xl font-bold uppercase italic">
                        <SelectValue placeholder="Selecione o motor principal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="font-bold">DESATIVADO</SelectItem>
                        {Object.keys(AI_PROVIDER_DEFAULTS).map(p => (
                          <SelectItem key={p} value={p} className="font-bold uppercase italic">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gerenciamento de Falhas</Label>
                    <div className="flex items-center justify-between h-12 px-4 rounded-xl border-2 bg-slate-50/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase italic leading-none">Fallback Automático</span>
                        <span className="text-[8px] font-bold text-slate-400">TENTA OUTRA IA SE A PADRÃO FALHAR</span>
                      </div>
                      <Switch 
                        checked={aiConfig.fallbackEnabled} 
                        onCheckedChange={v => setAiConfig(prev => ({ ...prev, fallbackEnabled: v }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Prompt Global</Label>
                  <Textarea 
                    value={aiConfig.systemPrompt}
                    onChange={e => setAiConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    className="min-h-[80px] rounded-2xl border-2 font-medium text-sm resize-none"
                    placeholder="Instruções base para a IA..."
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t-2 p-6">
                <div className="flex flex-col w-full gap-3">
                  <Button 
                    variant="outline"
                    className="w-full h-12 text-sm font-black border-2 border-indigo-200 text-indigo-700 gap-2 bg-white shadow-sm hover:bg-indigo-50"
                    onClick={() => setIsAuditorOpen(true)}
                  >
                    <Search className="w-4 h-4" /> AUDITORIA PROFUNDA DE IA
                  </Button>
                  <Button 
                    onClick={async () => {
                      setAiSaving(true);
                      try {
                        await saveSystemSettings(firestore, { aiConfig } as any, adminUser);
                        toast({ title: "Configuração Sincronizada", description: "Todos os provedores foram atualizados." });
                      } catch (e: any) {
                        toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
                      } finally {
                        setAiSaving(false);
                      }
                    }}
                    disabled={aiSaving}
                    className="w-full h-14 font-black uppercase italic gap-2 shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none"
                  >
                    {aiSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    SALVAR CONFIGURAÇÃO GLOBAL
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card className="material-card border-2 bg-amber-50 border-amber-200">
               <CardHeader>
                  <CardTitle className="text-sm font-black uppercase italic text-amber-800">📊 Status do Cache</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-100">
                    <span className="text-[10px] font-black uppercase text-slate-400">Tempo de Vida (TTL)</span>
                    <span className="font-bold text-xs">30 Minutos</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-10 border-2 border-amber-300 text-amber-800 font-black text-[10px] uppercase gap-2 bg-white"
                    onClick={async () => {
                      const r = await fetch('/api/ai?action=cache_stats');
                      const d = await r.json();
                      toast({ title: `Cache: ${d.valid}/${d.total} válidas`, description: `Minimizando custos em tempo real.` });
                    }}
                  >
                    <Database className="w-3 h-3" /> VER ESTATÍSTICAS
                  </Button>
                  <div className="p-4 rounded-2xl bg-amber-100/50 border-2 border-amber-200">
                    <p className="text-[9px] font-bold text-amber-800 uppercase italic leading-relaxed">
                      💡 Dica: Use o Groq ou OpenRouter como padrão para obter a melhor performance gratuita atual.
                    </p>
                  </div>
               </CardContent>
            </Card>
          </div>

          {/* Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Object.entries(AI_PROVIDER_DEFAULTS) as [AIProviderName, any][]).map(([pName, info]) => {
              const slot = (aiConfig.providers || {})[pName] || { apiKey: '', model: info.defaultModel, enabled: false };
              const testResult = aiTestResults[pName];
              
              return (
                <Card key={pName} className={cn(
                  "material-card border-2 transition-all overflow-hidden",
                  slot.enabled ? "border-emerald-200 bg-white shadow-lg" : "border-slate-100 bg-slate-50/30 opacity-80"
                )}>
                  <div className={cn("h-1", slot.enabled ? "bg-emerald-500" : "bg-slate-300")} />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                        <Cpu className={cn("w-4 h-4", slot.enabled ? "text-emerald-500" : "text-slate-400")} /> {pName}
                      </CardTitle>
                      <Switch 
                        checked={slot.enabled}
                        onCheckedChange={(v) => {
                          setAiConfig(prev => ({
                            ...prev,
                            providers: {
                              ...prev.providers,
                              [pName]: { ...slot, enabled: v }
                            }
                          }));
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 bg-slate-50">{info.freeLimit}</Badge>
                      {aiConfig.defaultProvider === pName && <Badge className="text-[8px] font-black uppercase px-1.5 py-0 bg-primary">PADRÃO</Badge>}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">CHAVES DE API (REDUNDÂNCIA)</Label>
                        <Button variant="ghost" size="sm" className="h-4 p-0 text-[8px] font-black uppercase text-primary" onClick={() => {
                          const currentKeys = slot.apiKeys || (slot.apiKey ? [slot.apiKey] : ['']);
                          setAiConfig(prev => ({
                            ...prev,
                            providers: {
                              ...prev.providers,
                              [pName]: { ...slot, apiKeys: [...currentKeys, ''] }
                            }
                          }));
                        }}>+ Adicionar</Button>
                      </div>
                      
                      <div className="space-y-2">
                        {(slot.apiKeys || (slot.apiKey ? [slot.apiKey] : [''])).map((key: string, kIdx: number) => (
                          <div key={kIdx} className="relative flex gap-1">
                            <Input 
                              type={aiShowKey[pName] ? "text" : "password"}
                              value={key}
                              placeholder={info.placeholder}
                              className="h-9 text-[10px] font-mono border-2 pr-10 rounded-xl"
                              onChange={(e) => {
                                const newKeys = [...(slot.apiKeys || (slot.apiKey ? [slot.apiKey] : ['']))];
                                newKeys[kIdx] = e.target.value;
                                setAiConfig(prev => ({
                                  ...prev,
                                  providers: {
                                    ...prev.providers,
                                    [pName]: { ...slot, apiKeys: newKeys }
                                  }
                                }));
                              }}
                            />
                            {kIdx > 0 && (
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => {
                                const newKeys = (slot.apiKeys || []).filter((_, i) => i !== kIdx);
                                setAiConfig(prev => ({
                                  ...prev,
                                  providers: {
                                    ...prev.providers,
                                    [pName]: { ...slot, apiKeys: newKeys }
                                  }
                                }));
                              }}><Trash2 className="w-3 h-3" /></Button>
                            )}
                            <button
                              onClick={() => setAiShowKey(prev => ({ ...prev, [pName]: !prev[pName] }))}
                              className="absolute right-2 top-2 text-slate-300 hover:text-slate-500 h-5 w-5 flex items-center justify-center"
                            >
                              {aiShowKey[pName] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Modelo Selecionado</Label>
                      <Select 
                        value={slot.model} 
                        onValueChange={(v) => {
                          setAiConfig(prev => ({
                            ...prev,
                            providers: {
                              ...prev.providers,
                              [pName]: { ...slot, model: v }
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="h-9 border-2 rounded-xl text-[10px] font-bold font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {info.models.map((m: string) => (
                            <SelectItem key={m} value={m} className="font-mono text-[10px]">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {testResult && (
                      <div className={cn(
                        "p-2 rounded-xl border flex items-center gap-2 text-[9px] font-bold",
                        testResult.ok ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                      )}>
                        {testResult.ok ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        <span className="truncate">{testResult.message}</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 h-9 border-2 font-black text-[9px] uppercase italic gap-1"
                      onClick={async () => {
                        setAiTesting(pName);
                        const currentKey = (slot.apiKeys && slot.apiKeys[0]) || slot.apiKey;
                        const result = await testProviderSlot(pName, { ...slot, apiKey: currentKey } as any);
                        setAiTestResults(prev => ({ ...prev, [pName]: result }));
                        setAiTesting(null);
                      }}
                      disabled={aiTesting === pName || (!slot.apiKeys?.length && !slot.apiKey)}
                    >
                      {aiTesting === pName ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Testar Conexão
                    </Button>
                    <a 
                      href={info.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="h-9 w-9 flex items-center justify-center border-2 rounded-xl text-slate-400 hover:text-primary hover:border-primary transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

      </Tabs>


      <Dialog open={isNotifDialogOpen} onOpenChange={setIsNotifDialogOpen}>
        <DialogContent className="max-w-md border-4 border-primary/20 rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2">
              <Megaphone className="text-primary" /> Configurar Aviso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-primary">Título do Alerta</Label>
              <Input value={editingNotif.title} onChange={e => setEditingNotif({...editingNotif, title: e.target.value})} className="font-bold border-2" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-primary">Mensagem Operacional</Label>
              <Textarea value={editingNotif.message} onChange={e => setEditingNotif({...editingNotif, message: e.target.value})} className="font-medium border-2 min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-primary">Nível de Severidade</Label>
                <Select value={editingNotif.type} onValueChange={(v: any) => setEditingNotif({...editingNotif, type: v})}>
                  <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="danger">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-primary">Status</Label>
                <div className="flex items-center h-10 gap-3">
                   <Switch checked={editingNotif.active} onCheckedChange={a => setEditingNotif({...editingNotif, active: a})} />
                   <span className="text-xs font-bold">{editingNotif.active ? 'Visível' : 'Oculto'}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveNotif} className="w-full h-14 font-black text-lg shadow-[0_5px_0_0_#1e40af]">
              {editingNotif.id ? 'ATUALIZAR BROADCAST' : 'DISPARAR AGORA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────── WIZARD DE CONFIGURAÇÃO ───────────────────── */}
      <Dialog open={wizardOpen} onOpenChange={v => { setWizardOpen(v); if (!v) { setWizardStep(0); setWizardChecked('idle'); setWizardDone(false); } }}>
        <DialogContent className="max-w-2xl border-4 border-primary/20 rounded-[2rem] overflow-hidden p-0">
          <DialogTitle className="sr-only">Assistente de Configuração do Tunnel</DialogTitle>

          {/* Progress Bar */}
          <div className="h-1 bg-slate-100">
            <div className="h-1 bg-primary transition-all duration-500" style={{ width: `${Math.round((wizardStep / 4) * 100)}%` }} />
          </div>

          {/* Steps Header */}
          <div className="flex gap-0 border-b bg-slate-50">
            {['Pré-requisitos','Protocolo','Serviço','Criar','Concluído'].map((s, i) => (
              <div key={i} className={`flex-1 py-3 text-center text-[9px] font-black uppercase tracking-widest transition-all ${
                i === wizardStep ? 'text-primary border-b-2 border-primary bg-white' :
                i < wizardStep ? 'text-emerald-500' : 'text-slate-300'
              }`}>
                <div className={`w-5 h-5 rounded-full mx-auto mb-1 flex items-center justify-center text-[9px] font-black ${
                  i < wizardStep ? 'bg-emerald-500 text-white' :
                  i === wizardStep ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                }`}>{i < wizardStep ? '✓' : i + 1}</div>
                <span className="hidden sm:block">{s}</span>
              </div>
            ))}
          </div>

          <div className="p-8 space-y-6">

            {/* ── PASSO 0: PRÉ-REQUISITOS ── */}
            {wizardStep === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black uppercase italic text-slate-800">Verificação Inicial</h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">Vamos confirmar se tudo está pronto antes de começar.</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Binário cloudflared', detail: 'Baixado automaticamente pelo npm', ok: true },
                    { label: 'Autenticação Cloudflare', detail: 'Execute: cloudflared tunnel login (uma vez)', ok: wizardChecked === 'ok' },
                    { label: 'Acesso à internet', detail: 'Necessário para criar o túnel', ok: wizardChecked === 'ok' },
                  ].map(({ label, detail, ok }) => (
                    <div key={label} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${ ok ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ ok ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        {ok ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="w-3 h-3 rounded-full bg-slate-400" />}
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-700">{label}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setWizardChecked('checking');
                      try {
                        const r = await fetch('/api/tunnel?action=status');
                        const d = await r.json();
                        setWizardChecked(r.ok ? 'ok' : 'error');
                      } catch { setWizardChecked('error'); }
                    }}
                    className="flex-1 h-12 rounded-xl border-2 border-slate-200 font-black text-sm uppercase italic hover:border-primary transition-all flex items-center justify-center gap-2"
                  >
                    {wizardChecked === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {wizardChecked === 'checking' ? 'Verificando...' : 'Verificar Sistema'}
                  </button>
                  <button
                    disabled={wizardChecked !== 'ok'}
                    onClick={() => setWizardStep(1)}
                    className="flex-1 h-12 rounded-xl bg-primary text-white font-black text-sm uppercase italic hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_0_0_#1e40af] active:translate-y-0.5"
                  >Continuar →</button>
                </div>
              </div>
            )}

            {/* ── PASSO 1: PROTOCOLO ── */}
            {wizardStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black uppercase italic text-slate-800">Método de Conexão</h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">Qual serviço você quer expor para a internet?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id:'http',  icon:'🌐', label:'HTTP',  desc:'Aplicações web (Next.js, React, Express...)', hint:'Porta padrão: 3000 / 8080' },
                    { id:'https', icon:'🔒', label:'HTTPS', desc:'Web com SSL local (certificado próprio)',   hint:'Porta padrão: 443' },
                    { id:'ssh',   icon:'🖥️', label:'SSH',  desc:'Acesso remoto ao terminal da máquina',    hint:'Porta padrão: 22' },
                    { id:'tcp',   icon:'🔌', label:'TCP',  desc:'Qualquer serviço TCP genérico',           hint:'Porta customizável' },
                    { id:'rdp',   icon:'🖥️', label:'RDP',  desc:'Área de trabalho remota Windows',          hint:'Porta padrão: 3389' },
                    { id:'smb',   icon:'📁', label:'SMB',  desc:'Compartilhamento de arquivos em rede',    hint:'Porta padrão: 445' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setWizardProtocol(p.id); setWizardPort(
                        p.id==='https'?'443':p.id==='ssh'?'22':p.id==='rdp'?'3389':p.id==='smb'?'445':'3000'
                      ); }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        wizardProtocol === p.id ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{p.icon}</span>
                        <span className="font-black text-sm uppercase">{p.label}</span>
                        {wizardProtocol === p.id && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                      </div>
                      <p className="text-xs text-slate-500 font-bold">{p.desc}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-1">{p.hint}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setWizardStep(0)} className="h-12 px-6 rounded-xl border-2 border-slate-200 font-black text-sm uppercase italic">← Voltar</button>
                  <button onClick={() => setWizardStep(2)} className="flex-1 h-12 rounded-xl bg-primary text-white font-black text-sm uppercase italic hover:opacity-90 shadow-[0_4px_0_0_#1e40af] active:translate-y-0.5">Continuar →</button>
                </div>
              </div>
            )}

            {/* ── PASSO 2: SERVIÇO ── */}
            {wizardStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black uppercase italic text-slate-800">Configurar Serviço</h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">Preencha os dados do seu túnel.</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label:'Nome do Túnel', val:wizardName, set:setWizardName, ph:'ex: meu-app (sem espaços)' },
                    { label:'Domínio Destino', val:wizardDomain, set:setWizardDomain, ph:'ex: app.meusite.com' },
                    { label:'Host / IP de Destino', val:wizardTarget, set:setWizardTarget, ph:'ex: 127.0.0.1' },
                    { label:'Porta Local', val:wizardPort, set:(v:string)=>setWizardPort(v.replace(/\D/g,'')), ph:'ex: 3000' },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label} className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
                      <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                        className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 font-mono font-bold text-sm outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                </div>
                {/* Preview */}
                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-xs text-emerald-400 space-y-1">
                  <p className="text-slate-500 text-[9px] uppercase font-bold mb-2">Preview config.yml</p>
                  <p>tunnel: <span className="text-white">{wizardName || '<nome>'}</span></p>
                  <p>ingress:</p>
                  <p>{'  '}- hostname: <span className="text-white">{wizardDomain || '<dominio>'}</span></p>
                  <p>{'    '}service: <span className="text-amber-400">{wizardProtocol}://{wizardTarget}:{wizardPort || '?'}</span></p>
                  <p>{'  '}- service: <span className="text-slate-500">http_status:404</span></p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setWizardStep(1)} className="h-12 px-6 rounded-xl border-2 border-slate-200 font-black text-sm uppercase italic">← Voltar</button>
                  <button
                    disabled={!wizardName || !wizardDomain || !wizardPort}
                    onClick={() => setWizardStep(3)}
                    className="flex-1 h-12 rounded-xl bg-primary text-white font-black text-sm uppercase italic hover:opacity-90 shadow-[0_4px_0_0_#1e40af] active:translate-y-0.5 disabled:opacity-40"
                  >Revisar e Criar →</button>
                </div>
              </div>
            )}

            {/* ── PASSO 3: CRIAR ── */}
            {wizardStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black uppercase italic text-slate-800">Criar Túnel</h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">Confirme os dados e execute a criação.</p>
                </div>
                <div className="space-y-2">
                  {[
                    ['Nome', wizardName],
                    ['Domínio', wizardDomain],
                    ['Destino', `${wizardProtocol}://${wizardTarget}:${wizardPort}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k}</span>
                      <span className="font-mono font-black text-slate-700 text-sm">{v}</span>
                    </div>
                  ))}
                </div>
                {wizardCreating && (
                  <div className="bg-slate-950 rounded-2xl p-4 font-mono text-xs text-emerald-400 max-h-40 overflow-y-auto space-y-1">
                    {tunnelLogs.slice(-15).map((l, i) => <div key={i} className="opacity-80">{l}</div>)}
                    <div className="w-2 h-3 bg-emerald-400 animate-pulse inline-block" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button disabled={wizardCreating} onClick={() => setWizardStep(2)} className="h-12 px-6 rounded-xl border-2 border-slate-200 font-black text-sm uppercase italic disabled:opacity-40">← Voltar</button>
                  <button
                    disabled={wizardCreating}
                    onClick={async () => {
                      setWizardCreating(true);
                      const res = await fetch('/api/tunnel', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'create', name: wizardName, domain: wizardDomain, port: parseInt(wizardPort), target: wizardTarget, protocol: wizardProtocol }),
                      });
                      setWizardCreating(false);
                      if (res.ok) { fetchTunnelStatus(); setWizardStep(4); setWizardDone(true); }
                      else { const d = await res.json(); setTunnelError(d.error || 'Erro ao criar túnel.'); }
                    }}
                    className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-black text-sm uppercase italic hover:opacity-90 shadow-[0_4px_0_0_#065f46] active:translate-y-0.5 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {wizardCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : <><CheckCircle2 className="w-4 h-4" /> Criar Agora</>}
                  </button>
                </div>
              </div>
            )}

            {/* ── PASSO 4: CONCLUÍDO ── */}
            {wizardStep === 4 && (
              <div className="space-y-5 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase italic text-slate-800">Túnel Configurado!</h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">Seu túnel está pronto para ser iniciado.</p>
                </div>
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-left space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">🚀 Próximos passos</p>
                  <p className="text-sm font-bold text-slate-700">1. Feche este assistente</p>
                  <p className="text-sm font-bold text-slate-700">2. Clique em <strong>"Iniciar Tunnel"</strong> na aba</p>
                  <p className="text-sm font-bold text-slate-700">3. Acesse: <span className="font-mono text-primary">{wizardDomain}</span></p>
                </div>
                <button
                  onClick={() => {
                    setWizardOpen(false);
                    setWizardStep(0);
                    setWizardChecked('idle');
                    setWizardDone(false);
                    // Sincroniza com o formulário principal
                    setTunnelName(wizardName);
                    setTunnelDomain(wizardDomain);
                    setTunnelPort(wizardPort);
                    setTunnelTarget(wizardTarget);
                    setTunnelProtocol(wizardProtocol);
                  }}
                  className="w-full h-12 rounded-xl bg-primary text-white font-black text-sm uppercase italic hover:opacity-90 shadow-[0_4px_0_0_#1e40af] active:translate-y-0.5"
                >
                  Concluir e Iniciar Tunnel →
                </button>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isAuditorOpen} onOpenChange={setIsAuditorOpen}>
        <DialogContent className="max-w-2xl border-4 border-indigo-200 rounded-[2.5rem]">
           <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic flex items-center gap-2">
                 <Search className="text-indigo-600" /> Auditoria Profunda de IA
              </DialogTitle>
              <DialogDescription className="font-bold">
                 Testando a inteligência e a qualidade pedagógica dos motores ativos.
              </DialogDescription>
           </DialogHeader>

           <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                 <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Desafio Pedagógico do Teste:</p>
                 <p className="text-xs font-bold italic">"Explique o Princípio da Impessoalidade em 1 frase."</p>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                 <div className="space-y-3">
                    {auditResults.map((res, i) => (
                       <div key={i} className={cn(
                          "p-4 rounded-2xl border-2 transition-all",
                          res.status === 'ok' ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                       )}>
                          <div className="flex justify-between items-center mb-2">
                             <span className="font-black uppercase text-xs">{res.provider}</span>
                             <Badge variant="outline" className="font-mono text-[9px]">{res.latency}ms</Badge>
                          </div>
                          <p className={cn(
                             "text-[11px] leading-relaxed",
                             res.status === 'ok' && res.message ? "font-medium text-slate-800" : "font-black text-red-600"
                          )}>
                             {res.message || "A IA não retornou nenhum texto (Resposta em Branco)."}
                          </p>
                          {(res.status === 'error' || !res.message) && (
                            <div className="mt-3 p-2 rounded-xl bg-slate-900 text-[9px] text-slate-300 border border-slate-700">
                               <p className="font-black uppercase text-amber-500 mb-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Dica de Configuração:
                               </p>
                               {(AI_PROVIDER_DEFAULTS as any)[res.provider]?.setupNotes || "Verifique se a chave de API está correta e possui saldo/cota."}
                            </div>
                          )}
                       </div>
                    ))}
                    {isAuditing && (
                       <div className="p-10 text-center space-y-4">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                          <p className="text-[10px] font-black uppercase text-indigo-600 animate-pulse">Auditando próximo motor...</p>
                       </div>
                    )}
                    {auditResults.length === 0 && !isAuditing && (
                       <div className="p-20 text-center text-slate-400">
                          <Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-bold">Clique no botão abaixo para iniciar a auditoria.</p>
                       </div>
                    )}
                 </div>
              </ScrollArea>
           </div>

           <DialogFooter>
              <Button 
                className="w-full h-14 font-black text-lg gap-2 bg-indigo-600 shadow-[0_6px_0_0_#4338ca] active:translate-y-1 active:shadow-none"
                onClick={runDeepAudit}
                disabled={isAuditing}
              >
                 <Zap className="w-5 h-5 fill-current" /> {auditResults.length > 0 ? 'REPETIR AUDITORIA' : 'INICIAR AUDITORIA AGORA'}
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
