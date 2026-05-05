import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// ─── Persistência global do processo (sobrevive ao HMR em dev) ────────────────
declare global {
  var _tunnelProcess: ReturnType<typeof spawn> | null;
  var _tunnelLogs: string[];
  var _ipv6WatchInterval: ReturnType<typeof setInterval> | null;
  var _lastKnownIPv6: string;
}
global._tunnelProcess    = global._tunnelProcess    ?? null;
global._tunnelLogs       = global._tunnelLogs       ?? [];
global._ipv6WatchInterval= global._ipv6WatchInterval?? null;
global._lastKnownIPv6    = global._lastKnownIPv6    ?? '';

const DATA_FILE = path.join(process.cwd(), '.tunnel-config.json');

// ─── Resolução do binário (multi-plataforma, sem instalação no sistema) ───────
async function getCloudflaredBin(): Promise<string> {
  try {
    // O pacote npm 'cloudflared' baixa automaticamente o binário correto
    // para Windows (.exe), Linux ou macOS, na pasta node_modules
    const { bin, install } = await import('cloudflared');

    // Se o binário ainda não foi baixado, faz o download agora
    if (!fs.existsSync(bin)) {
      addLog('[SETUP] Baixando binário cloudflared para este sistema operacional...');
      await install(bin);
      addLog(`[SETUP] Binário instalado em: ${bin}`);
    }

    return bin;
  } catch {
    // Fallback: tenta usar cloudflared do PATH do sistema se instalado manualmente
    addLog('[WARN] Pacote npm cloudflared não encontrado, tentando PATH do sistema...');
    return 'cloudflared';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addLog(msg: string) {
  const ts = new Date().toLocaleTimeString('pt-BR');
  msg.trim().split('\n').filter(Boolean).forEach(line => {
    global._tunnelLogs.push(`[${ts}] ${line}`);
  });
  if (global._tunnelLogs.length > 300) global._tunnelLogs = global._tunnelLogs.slice(-300);
}

function readData() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) : null; }
  catch { return null; }
}

function saveData(d: object) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

function sanitize(s: string) { return s.replace(/[^a-zA-Z0-9.\-_]/g, ''); }

function getRoutesFromConfig(yml: string) {
  const lines = yml.split('\n');
  const routes = [];
  let currentName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.startsWith('# ROUTE_NAME:')) {
      currentName = line.replace('# ROUTE_NAME:', '').trim();
    } else if (line.startsWith('- hostname:')) {
      const hostname = line.replace('- hostname:', '').trim();
      // Procurar a próxima linha de service que não seja comentário ou vazia
      let service = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('service:')) {
          service = nextLine.replace('service:', '').trim();
          break;
        }
        if (nextLine.startsWith('- hostname:') || nextLine.startsWith('# ROUTE_NAME:')) break;
      }
      
      if (service) {
        routes.push({ name: currentName || 'Rota Adicional', hostname, service, paused: false });
        currentName = '';
      }
    } else if (line.startsWith('# PAUSED_ROUTE:')) {
      // # PAUSED_ROUTE: name=X hostname=Y service=Z
      const match = line.match(/# PAUSED_ROUTE: name=(.*?) hostname=([^\s]+) service=([^\n]+)/);
      if (match) {
        routes.push({ name: match[1], hostname: match[2], service: match[3], paused: true });
      }
    }
  }
  
  // Deduplicação por hostname (mantém a última ocorrência encontrada)
  const uniqueMap = new Map<string, any>();
  routes.forEach(r => uniqueMap.set(r.hostname, r));
  return Array.from(uniqueMap.values());
}

function writeRoutesToConfig(baseYml: string, routes: {name?: string, hostname: string, service: string, paused?: boolean}[]) {
  // Remove rotas pausadas legadas do YAML base para evitar duplicação no "head"
  const cleanBase = baseYml.split('\n').filter(line => !line.trim().startsWith('# PAUSED_ROUTE:')).join('\n');
  
  // Regex mais flexível para encontrar o início do bloco ingress
  const ingressMatch = cleanBase.match(/^\s*ingress:\s*$/m);
  const head = ingressMatch ? cleanBase.substring(0, ingressMatch.index).trim() : cleanBase.trim();
  
  let newIngress = '\ningress:\n';
  let pausedLines = '';
  
  routes.forEach(r => {
    const rName = r.name || 'Rota';
    if (r.paused) {
      pausedLines += `# PAUSED_ROUTE: name=${rName} hostname=${r.hostname} service=${r.service}\n`;
    } else {
      newIngress += `  # ROUTE_NAME: ${rName}\n  - hostname: ${r.hostname}\n    service: ${r.service}\n`;
    }
  });
  newIngress += `  - service: http_status:404\n`;
  return head + '\n' + (pausedLines ? '\n' + pausedLines : '') + newIngress;
}

// ─── Detectar IPs locais ──────────────────────────────────────────────────────
function getLocalIPs(): { ipv4: string; ipv6: string } {
  const nets = os.networkInterfaces();
  let ipv4 = '', ipv6 = '';
  for (const iface of Object.values(nets)) {
    for (const addr of iface ?? []) {
      if (addr.internal) continue;
      if (addr.family === 'IPv4' && !ipv4) ipv4 = addr.address;
      // Ignorar link-local (fe80::) e loopback
      if (addr.family === 'IPv6' && !addr.address.startsWith('fe80') && !addr.address.startsWith('::1') && !ipv6) {
        ipv6 = addr.address;
      }
    }
  }
  return { ipv4, ipv6 };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');

  if (action === 'logs') {
    return NextResponse.json({ logs: global._tunnelLogs.slice(-150) });
  }

  // ── DIAGNÓSTICO COMPLETO ────────────────────────────────────────────────────
  if (action === 'diagnose') {
    const data = readData();
    const checks: Record<string, { ok: boolean; detail: string }> = {};

    // 1. Processo rodando?
    checks.process = {
      ok: !!global._tunnelProcess,
      detail: global._tunnelProcess ? `PID: ${global._tunnelProcess.pid}` : 'Processo não encontrado. Clique em "Iniciar Tunnel".',
    };

    // 2. Config existe?
    const configPath = data?.configPath ?? path.join(os.homedir(), '.cloudflared', 'config.yml');
    const configExists = fs.existsSync(configPath);
    checks.config = {
      ok: configExists,
      detail: configExists ? configPath : `config.yml não encontrado em: ${configPath}`,
    };

    // 3. Config.yml legível — extrai tunnel ID
    let configTunnelId = '';
    if (configExists) {
      try {
        const yml = fs.readFileSync(configPath, 'utf-8');
        const match = yml.match(/^tunnel:\s*(.+)$/m);
        configTunnelId = match?.[1]?.trim() ?? '';
        checks.configId = { ok: !!configTunnelId, detail: configTunnelId || 'Tunnel ID não encontrado no config.yml' };

        // Verifica domínio configurado
        const hostMatch = yml.match(/hostname:\s*(.+)/);
        const svcMatch  = yml.match(/service:\s*(.+)/);
        checks.ingress = {
          ok: !!(hostMatch && svcMatch),
          detail: hostMatch ? `${hostMatch[1].trim()} → ${svcMatch?.[1]?.trim()}` : 'Ingress não configurado',
        };
      } catch (e: any) {
        checks.config.ok = false;
        checks.config.detail = `Erro ao ler config.yml: ${e.message}`;
      }
    }

    // 4. Credenciais JSON existem?
    const credPath = data?.credPath ?? '';
    checks.credentials = {
      ok: credPath ? fs.existsSync(credPath) : false,
      detail: credPath ? (fs.existsSync(credPath) ? credPath : `Arquivo não encontrado: ${credPath}`) : 'Caminho de credenciais não salvo',
    };

    // 4b. cert.pem (autenticação Cloudflare) existe?
    const certPath = path.join(os.homedir(), '.cloudflared', 'cert.pem');
    const certExists = fs.existsSync(certPath);
    checks.auth = {
      ok: certExists,
      detail: certExists
        ? `cert.pem encontrado: ${certPath} (autenticação OK)`
        : `⚠️ cert.pem NÃO encontrado! Execute "Autenticar Cloudflare" para fazer login.`,
    };

    // 5. Métricas do cloudflared (confirma conexões ativas)
    let metricsOk = false;
    let metricsDetail = 'Porta de métricas não acessível (túnel pode não estar rodando)';
    try {
      const metricsRes = await fetch('http://127.0.0.1:20242/metrics', { signal: AbortSignal.timeout(2000) });
      const text = await metricsRes.text();
      const connMatch = text.match(/cloudflared_tunnel_total_requests.*?(\d+)/);
      const regMatch  = (text.match(/cloudflared_tunnel_ha_connections\{.*?\}\s+(\d+)/g) ?? []).length;
      metricsOk = metricsRes.ok;
      metricsDetail = metricsOk
        ? `Métricas ativas. Conexões HA detectadas: ${regMatch}`
        : 'Sem resposta das métricas';
    } catch {
      metricsDetail = 'Porta 20242 inacessível — cloudflared não está rodando ou ainda iniciando';
    }
    checks.metrics = { ok: metricsOk, detail: metricsDetail };

    // 6. Consistência: ID salvo == ID no config?
    if (data?.tunnelId && configTunnelId) {
      checks.idMatch = {
        ok: data.tunnelId === configTunnelId,
        detail: data.tunnelId === configTunnelId
          ? `IDs consistentes: ${data.tunnelId.substring(0, 18)}...`
          : `INCONSISTÊNCIA: salvo=${data.tunnelId.substring(0,8)}... config=${configTunnelId.substring(0,8)}... → Reconfigurar!`,
      };
    }

    // 7. Extrair Múltiplas Rotas
    let routes: {hostname: string, service: string}[] = [];
    if (configExists) {
      try {
        const yml = fs.readFileSync(configPath, 'utf-8');
        routes = getRoutesFromConfig(yml);
      } catch (e) {}
    }

    return NextResponse.json({ checks, data, routes });
  }

  if (action === 'ip') {
    const { ipv4, ipv6 } = getLocalIPs();
    const data = readData();
    return NextResponse.json({
      ipv4,
      ipv6,
      port: data?.port ?? null,
      ipv6WatchActive: !!global._ipv6WatchInterval,
    });
  }

  if (action === 'status') {
    const platform = os.platform();
    const platformLabel = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux';
    const { ipv4, ipv6 } = getLocalIPs();
    const data = readData();
    let routes = [];
    const configPath = data?.configPath ?? path.join(os.homedir(), '.cloudflared', 'config.yml');
    if (fs.existsSync(configPath)) {
      try { routes = getRoutesFromConfig(fs.readFileSync(configPath, 'utf-8')); } catch(e){}
    }
    return NextResponse.json({
      running: !!global._tunnelProcess,
      tunnel: data,
      platform: platformLabel,
      ipv4,
      ipv6,
      ipv6WatchActive: !!global._ipv6WatchInterval,
      routes
    });
  }

  return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, name, domain, port, protocol, target, oldHostname } = body;

  // Resolve o binário correto para o SO atual
  const cfBin = await getCloudflaredBin();

  const run = async (args: string) => execAsync(`"${cfBin}" ${args}`);

  // ── GERENCIAR ROTAS (MÚLTIPLOS SITES) ──────────────────────────────────────────────────
  if (['add_route', 'remove_route', 'toggle_route', 'edit_route'].includes(action)) {
    const data = readData();
    const configPath = data?.configPath ?? path.join(os.homedir(), '.cloudflared', 'config.yml');
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ error: 'config.yml não encontrado. Crie um túnel primeiro.' }, { status: 400 });
    }

    let yml = fs.readFileSync(configPath, 'utf-8');
    let routes = getRoutesFromConfig(yml);

    if (action === 'add_route') {
      const safeDomain = sanitize(domain || '');
      const safePort = parseInt(port) || 3000;
      const safeProtocol = ['http','https','ssh','tcp','rdp','smb'].includes(protocol) ? protocol : 'http';
      if (!safeDomain) return NextResponse.json({ error: 'Domínio é obrigatório.' }, { status: 400 });
      
      try {
        const tunnelId = data?.tunnelId ?? yml.match(/^tunnel:\s*(.+)$/m)?.[1]?.trim();
        if (tunnelId) {
          addLog(`[DNS] Roteando ${safeDomain} no Cloudflare...`);
          const dr = await run(`tunnel route dns ${tunnelId} ${safeDomain}`);
          addLog(dr.stdout + dr.stderr);
        }
      } catch (e: any) { addLog(`[WARN] Erro ao rotear DNS: ${e.message}`); }

      const safeTarget = target ? target.replace(/[^a-zA-Z0-9.\-_]/g, '') : '127.0.0.1';
      routes = routes.filter(r => r.hostname !== safeDomain);
      routes.push({ name: name || 'Rota', hostname: safeDomain, service: `${safeProtocol}://${safeTarget}:${safePort}`, paused: false });
      addLog(`[ROTA] Adicionada nova rota: ${safeDomain} -> ${safeProtocol}://${safeTarget}:${safePort}`);
    }

    if (action === 'edit_route') {
      const targetDomain = sanitize(oldHostname || '');
      const bodyService = body.service; // nova prop para edição completa
      
      const routeIdx = routes.findIndex(r => r.hostname === targetDomain);
      if (routeIdx !== -1) {
        if (name) routes[routeIdx].name = name;
        if (domain && domain !== targetDomain) routes[routeIdx].hostname = sanitize(domain);
        
        if (bodyService) {
          routes[routeIdx].service = bodyService;
        } else if (port) {
          const newPort = parseInt(port) || 3000;
          const newProtocol = ['http','https','ssh','tcp','rdp','smb'].includes(protocol) ? protocol : 'http';
          const newTarget = target ? target.replace(/[^a-zA-Z0-9.\-_]/g, '') : '127.0.0.1';
          routes[routeIdx].service = `${newProtocol}://${newTarget}:${newPort}`;
        }
        addLog(`[ROTA] Editada rota: ${routes[routeIdx].hostname} -> ${routes[routeIdx].service}`);
      }
    }

    if (action === 'toggle_route') {
      const targetDomain = sanitize(domain || '');
      const route = routes.find(r => r.hostname === targetDomain);
      if (route) {
        route.paused = !route.paused;
        addLog(`[ROTA] Rota ${targetDomain} ${route.paused ? 'pausada' : 'ativada'}`);
      }
    }

    if (action === 'remove_route') {
      const targetDomain = sanitize(oldHostname || '');
      routes = routes.filter(r => r.hostname !== targetDomain);
      addLog(`[ROTA] Removida a rota: ${targetDomain}`);
    }

    yml = writeRoutesToConfig(yml, routes);
    fs.writeFileSync(configPath, yml);

    // Reiniciar se estiver rodando
    if (global._tunnelProcess) {
      addLog('[SISTEMA] Reiniciando túnel para aplicar novas rotas...');
      try {
        if (os.platform() === 'win32') {
          exec(`taskkill /F /T /PID ${global._tunnelProcess.pid}`);
        } else {
          global._tunnelProcess.kill('SIGKILL');
        }
      } catch (e) {}
      global._tunnelProcess = null;
      
      setTimeout(async () => {
        try {
          const tunnelName = data?.name || 'main';
          const restartArgs = ['tunnel', '--config', configPath, 'run', tunnelName];
          const runP = spawn(cfBin, restartArgs, { stdio: ['ignore', 'pipe', 'pipe'], detached: false });
          runP.stdout?.on('data', d => addLog(d.toString()));
          runP.stderr?.on('data', d => addLog(d.toString()));
          global._tunnelProcess = runP;
          addLog(`[SISTEMA] Túnel (${tunnelName}) reiniciado com sucesso!`);
        } catch (e: any) {
          addLog(`[ERRO] Falha ao reiniciar o túnel: ${e.message}`);
        }
      }, 1000);
    }

    return NextResponse.json({ success: true, message: 'Rotas atualizadas com sucesso!' });
  }

  // ── LOGIN / AUTENTICAÇÃO CLOUDFLARE ──────────────────────────────────────────────────────
  if (action === 'login') {
    const cfBinForLogin = await getCloudflaredBin();
    addLog('[AUTH] Iniciando autenticação do Cloudflare...');
    addLog('[AUTH] Uma janela do browser será aberta. Faça login e selecione o domínio correto.');
    addLog(`[AUTH] Binário: ${cfBinForLogin}`);

    // Executa cloudflared tunnel login em background (abre browser automaticamente)
    const loginProc = spawn(cfBinForLogin, ['tunnel', 'login'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    loginProc.stdout?.on('data', d => addLog(d.toString()));
    loginProc.stderr?.on('data', d => addLog(d.toString()));
    loginProc.on('exit', code => {
      if (code === 0) {
        addLog('[AUTH] ✅ Autenticação concluída! cert.pem salvo em ~/.cloudflared/');
        addLog('[AUTH] Agora você pode criar e iniciar o túnel normalmente.');
      } else {
        addLog(`[AUTH] ❌ Autenticação falhou (código ${code}). Tente novamente.`);
      }
    });
    loginProc.on('error', err => addLog(`[AUTH] ERRO: ${err.message}`));

    return NextResponse.json({ success: true, message: 'Login iniciado. Verifique os logs e o browser.' });
  }

  // ── CRIAR TÚNEL ───────────────────────────────────────────────────────────
  if (action === 'create') {
    global._tunnelLogs = [];
    const safeName     = sanitize(name     || '');
    const safeDomain   = sanitize(domain   || '');
    const safePort     = parseInt(port)    || 3000;
    const safeProtocol = ['http','https','ssh','tcp','rdp','smb'].includes(protocol) ? protocol : 'http';
    const safeTarget   = target ? target.replace(/[^a-zA-Z0-9.\-_]/g, '') : '127.0.0.1';

    if (!safeName || !safeDomain) return NextResponse.json({ error: 'Nome e domínio são obrigatórios.' }, { status: 400 });

    const platform = os.platform();
    addLog(`[SISTEMA] Plataforma detectada: ${platform} (${os.arch()})`);
    addLog(`[SISTEMA] Binário: ${cfBin}`);

    try {
      addLog(`[CREATE] Criando túnel: ${safeName} ...`);
      let createOut = '';
      try {
        const r = await run(`tunnel create ${safeName}`);
        createOut = r.stdout + r.stderr;
      } catch (e: any) {
        createOut = (e.stdout ?? '') + (e.stderr ?? '') + (e.message ?? '');
        if (!createOut.includes('already exists')) throw e;
        addLog('[WARN] Túnel já existe, reutilizando...');
      }
      addLog(createOut);

      // Extrair TUNNEL_ID
      const idMatch = createOut.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      const tunnelId = idMatch?.[1] ?? '';
      addLog(tunnelId ? `[INFO] TUNNEL_ID: ${tunnelId}` : '[WARN] TUNNEL_ID não detectado, continuando...');

      // Localizar credenciais JSON
      const cfDir = path.join(os.homedir(), '.cloudflared');
      let credPath = tunnelId ? path.join(cfDir, `${tunnelId}.json`) : '';
      if (!credPath || !fs.existsSync(credPath)) {
        const files = fs.existsSync(cfDir)
          ? fs.readdirSync(cfDir).filter(f => f.endsWith('.json') && f !== 'cert.json')
          : [];
        credPath = files.length ? path.join(cfDir, files[files.length - 1]) : '';
      }
      addLog(credPath ? `[INFO] Credenciais: ${credPath}` : '[WARN] Arquivo .json não encontrado');

      // Rotear DNS
      try {
        addLog(`[DNS] Roteando ${safeDomain} → ${safeName} ...`);
        const dr = await run(`tunnel route dns ${safeName} ${safeDomain}`);
        addLog(dr.stdout + dr.stderr);
      } catch (e: any) {
        const msg: string = (e.stdout ?? '') + (e.stderr ?? '') + (e.message ?? '');
        if (msg.includes('already exists') || msg.includes('Conflict')) addLog('[WARN] DNS já existe, ignorando.');
        else addLog(`[WARN] DNS: ${msg}`);
      }

      // Gerar config.yml preservando rotas extras
      if (!fs.existsSync(cfDir)) fs.mkdirSync(cfDir, { recursive: true });
      const configPath = path.join(cfDir, 'config.yml');
      
      let existingRoutes: any[] = [];
      if (fs.existsSync(configPath)) {
        try {
           const oldYml = fs.readFileSync(configPath, 'utf-8');
           const dataData = readData();
           existingRoutes = getRoutesFromConfig(oldYml);
           // remove a rota antiga se for diferente (edição)
           if (dataData && dataData.domain) {
              existingRoutes = existingRoutes.filter(r => r.hostname !== dataData.domain);
           }
        } catch(e){}
      }

      // Garante que a nova rota principal seja a primeira
      existingRoutes = existingRoutes.filter(r => r.hostname !== safeDomain);
      existingRoutes.unshift({ name: safeName, hostname: safeDomain, service: `${safeProtocol}://${safeTarget}:${safePort}`, paused: false });

      let yml = `tunnel: ${tunnelId || safeName}\ncredentials-file: ${credPath.replace(/\\/g, '/')}\n`;
      yml = writeRoutesToConfig(yml, existingRoutes);

      fs.writeFileSync(configPath, yml);
      addLog(`[INFO] config.yml gerado em: ${configPath}`);
      addLog(`[INFO] Serviço: ${safeProtocol}://${safeTarget}:${safePort}`);

      const tunnelData = { name: safeName, domain: safeDomain, port: safePort, target: safeTarget, protocol: safeProtocol, tunnelId, credPath, configPath, createdAt: new Date().toISOString(), platform };
      saveData(tunnelData);
      addLog('[OK] Túnel configurado com sucesso! Clique em "Iniciar Tunnel".');
      return NextResponse.json({ success: true, tunnelData });

    } catch (e: any) {
      const msg: string = (e?.stdout ?? '') + (e?.stderr ?? '') + (e?.message ?? '');
      addLog(`[ERROR] ${msg}`);
      if (msg.includes('already exists')) return NextResponse.json({ error: 'Túnel já existe. Clique em "Reconfigurar" antes de criar.' }, { status: 409 });
      return NextResponse.json({ error: msg || 'Erro desconhecido' }, { status: 500 });
    }
  }

  // ── INICIAR ───────────────────────────────────────────────────────────────
  if (action === 'start') {
    if (global._tunnelProcess) return NextResponse.json({ error: 'Túnel já está ativo.' }, { status: 400 });

    const data = readData();
    if (!data) return NextResponse.json({ error: 'Nenhum túnel configurado. Crie um primeiro.' }, { status: 400 });

    addLog(`[START] Iniciando ${data.name} → porta ${data.port} (${cfBin}) ...`);
    const child = spawn(cfBin, ['tunnel', '--config', data.configPath, 'run', data.name], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    global._tunnelProcess = child;
    child.stdout?.on('data', d => addLog(d.toString()));
    child.stderr?.on('data', d => addLog(d.toString()));
    child.on('exit', code => { addLog(`[INFO] Processo encerrado (código ${code})`); global._tunnelProcess = null; });
    child.on('error', err => { addLog(`[ERROR] ${err.message}`); global._tunnelProcess = null; });

    return NextResponse.json({ success: true, pid: child.pid });
  }

  // ── PARAR ─────────────────────────────────────────────────────────────────
  if (action === 'stop') {
    if (!global._tunnelProcess) return NextResponse.json({ error: 'Nenhum túnel em execução.' }, { status: 400 });
    global._tunnelProcess.kill('SIGTERM');
    global._tunnelProcess = null;
    addLog('[STOP] Túnel parado com sucesso.');
    return NextResponse.json({ success: true });
  }

  // ── RECONFIGURAR ──────────────────────────────────────────────────────────
  if (action === 'reconfigure') {
    if (global._tunnelProcess) { global._tunnelProcess.kill(); global._tunnelProcess = null; }
    const data = readData();
    if (data?.name) {
      try {
        const r = await run(`tunnel delete ${data.name} -f`);
        addLog(r.stdout + r.stderr);
      } catch (e: any) { addLog(`[WARN] Delete: ${e.message}`); }
    }
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    global._tunnelLogs = [];
    addLog('[INFO] Configuração removida. Pronto para recriar.');
    return NextResponse.json({ success: true });
  }

  // ── AUTOSTART (Windows: Startup folder / Linux: systemd user) ─────────────
  if (action === 'autostart') {
    const data = readData();
    if (!data) return NextResponse.json({ error: 'Crie um túnel primeiro.' }, { status: 400 });

    const platform = os.platform();

    if (platform === 'win32') {
      // Windows: criar .bat na pasta Startup
      const startupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
      const batContent = `@echo off\n"${cfBin}" tunnel --config "${data.configPath}" run ${data.name}`;
      const batPath = path.join(startupDir, 'cloudflared-tunnel.bat');
      try {
        fs.writeFileSync(batPath, batContent);
        addLog(`[AUTOSTART] Windows Startup ativado!\n${batPath}`);
        return NextResponse.json({ success: true, path: batPath });
      } catch (e: any) {
        addLog(`[ERROR] Autostart: ${e.message}`);
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    if (platform === 'linux') {
      // Linux: criar serviço systemd --user
      const serviceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
      fs.mkdirSync(serviceDir, { recursive: true });
      const serviceContent = `[Unit]
Description=Cloudflare Tunnel (${data.name})
After=network.target

[Service]
ExecStart=${cfBin} tunnel --config ${data.configPath} run ${data.name}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;
      const servicePath = path.join(serviceDir, 'cloudflared-tunnel.service');
      fs.writeFileSync(servicePath, serviceContent);
      addLog(`[AUTOSTART] Serviço systemd criado em:\n${servicePath}`);
      addLog('[AUTOSTART] Execute: systemctl --user enable cloudflared-tunnel && systemctl --user start cloudflared-tunnel');
      return NextResponse.json({ success: true, path: servicePath });
    }

    if (platform === 'darwin') {
      // macOS: criar LaunchAgent plist
      const launchDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
      fs.mkdirSync(launchDir, { recursive: true });
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.cloudflare.tunnel.${data.name}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${cfBin}</string>
    <string>tunnel</string>
    <string>--config</string>
    <string>${data.configPath}</string>
    <string>run</string>
    <string>${data.name}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>`;
      const plistPath = path.join(launchDir, `com.cloudflare.tunnel.${data.name}.plist`);
      fs.writeFileSync(plistPath, plistContent);
      addLog(`[AUTOSTART] LaunchAgent criado em:\n${plistPath}`);
      addLog(`[AUTOSTART] Execute: launchctl load ${plistPath}`);
      return NextResponse.json({ success: true, path: plistPath });
    }

    return NextResponse.json({ error: `Plataforma não suportada: ${platform}` }, { status: 400 });
  }

  // ── IPV6 AUTO-WATCH ───────────────────────────────────────────────────────
  if (action === 'ipv6_watch') {
    const { enable } = body as { enable: boolean };

    if (enable) {
      if (global._ipv6WatchInterval) return NextResponse.json({ error: 'Watch já ativo.' }, { status: 400 });

      // Salva o IPv6 atual como baseline
      const { ipv6: initial } = getLocalIPs();
      global._lastKnownIPv6 = initial;
      addLog(`[IPv6-WATCH] Monitoramento iniciado. IPv6 atual: ${initial || '(nenhum)'}`);

      global._ipv6WatchInterval = setInterval(() => {
        const { ipv6: current } = getLocalIPs();

        if (current !== global._lastKnownIPv6) {
          const prev = global._lastKnownIPv6;
          global._lastKnownIPv6 = current;
          const ts = new Date().toLocaleTimeString('pt-BR');

          global._tunnelLogs.push(`[${ts}] [IPv6-CHANGE] Endereço mudou!`);
          global._tunnelLogs.push(`[${ts}] [IPv6-CHANGE]   Anterior: ${prev || '(nenhum)'}`);
          global._tunnelLogs.push(`[${ts}] [IPv6-CHANGE]   Novo:     ${current || '(nenhum)'}`);
          global._tunnelLogs.push(`[${ts}] [IPv6-WATCH] ⚠️  Atualizar DNS manualmente se necessário.`);
        }
      }, 30_000); // Verifica a cada 30 segundos

      return NextResponse.json({ success: true, message: 'Watch de IPv6 ativado (intervalo: 30s).' });
    } else {
      if (global._ipv6WatchInterval) {
        clearInterval(global._ipv6WatchInterval);
        global._ipv6WatchInterval = null;
        addLog('[IPv6-WATCH] Monitoramento desativado.');
      }
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}
