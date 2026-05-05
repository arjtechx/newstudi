import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

if (!(global as any)._noipLogs) {
  (global as any)._noipLogs = [];
}

function addLog(msg: string) {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  const log = `[${ts}] ${msg}`;
  console.log(log);
  (global as any)._noipLogs.push(log);
  if ((global as any)._noipLogs.length > 150) (global as any)._noipLogs.shift();
}

const NOIP_CONFIG_PATH = path.join(os.homedir(), '.noip_config.json');

// Helper to get public IPs
async function getPublicIPs() {
  let ipv4 = '';
  let ipv6 = '';
  try {
    const res4 = await fetch('https://api.ipify.org', { signal: AbortSignal.timeout(3000) });
    if (res4.ok) ipv4 = await res4.text();
  } catch (e) { addLog('[WARN] Falha ao obter IPv4 da api.ipify.org'); }

  try {
    // api6 FORÇA o uso de IPv6. O api64 falhava pois o Node.js prioriza IPv4
    const res6 = await fetch('https://api6.ipify.org', { signal: AbortSignal.timeout(3000) });
    if (res6.ok) {
      const ip = await res6.text();
      if (ip.includes(':')) ipv6 = ip;
    }
  } catch (e) { addLog('[WARN] Falha ao obter IPv6 (Rede pode não suportar ou servidor timeout)'); }

  return { ipv4, ipv6 };
}

// Background Auto-Updater
if (!(global as any)._noipWatchActive) {
  (global as any)._noipWatchActive = false;
  (global as any)._noipWatchInterval = null;
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');

  if (action === 'logs') {
    return NextResponse.json({ logs: (global as any)._noipLogs || [] });
  }

  if (action === 'status') {
    return NextResponse.json({
      autoUpdate: (global as any)._noipWatchActive
    });
  }

  try {
    if (fs.existsSync(NOIP_CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(NOIP_CONFIG_PATH, 'utf-8'));
      data.autoUpdate = (global as any)._noipWatchActive;
      return NextResponse.json(data);
    }
    return NextResponse.json({ username: '', password: '', hostname: '', mode: 'ipv4', autoUpdate: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function performUpdate(username: string, password: string, hostname: string, mode: string) {
  addLog(`[NO-IP] Resolvendo IPs para o modo: ${mode.toUpperCase()}...`);
  const { ipv4, ipv6 } = await getPublicIPs();
  
  if (mode === 'ipv6' && !ipv6) {
    throw new Error('Modo IPv6 selecionado, mas a rede local não possui suporte a IPv6 público.');
  }
  if (mode === 'ipv4' && !ipv4) {
    throw new Error('IPv4 não detectado.');
  }

  let url = `https://dynupdate.no-ip.com/nic/update?hostname=${hostname}`;
  let finalIps = [];

  if ((mode === 'ipv4' || mode === 'mixed') && ipv4) {
    url += `&myip=${ipv4}`;
    finalIps.push(ipv4);
  }
  if ((mode === 'ipv6' || mode === 'mixed') && ipv6) {
    url += `&myipv6=${ipv6}`;
    finalIps.push(ipv6);
  }

  const ipsText = finalIps.join(', ') || 'Vazio (Auto)';
  addLog(`[NO-IP] IP final para envio: ${ipsText}`);

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  addLog(`[NO-IP] Conectando ao servidor dynupdate.no-ip.com...`);
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'NewstudiApp/1.0 gcarv'
    }
  });

  const result = await response.text();
  addLog(`[NO-IP] Resposta bruta do servidor: ${result.trim()}`);
  return { result, myip: ipsText };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'toggle_auto_update') {
      const { enable } = body;
      if (enable) {
        if (!(global as any)._noipWatchInterval) {
          (global as any)._noipWatchActive = true;
          addLog('[AUTO-UPDATE] Serviço ativado. Próxima checagem em 5 minutos.');
          // Rodar a cada 5 minutos (evitar rate limit do No-IP)
          (global as any)._noipWatchInterval = setInterval(async () => {
            if (fs.existsSync(NOIP_CONFIG_PATH)) {
              const data = JSON.parse(fs.readFileSync(NOIP_CONFIG_PATH, 'utf-8'));
              addLog('[AUTO-UPDATE] Executando verificação em background...');
              try {
                await performUpdate(data.username, data.password, data.hostname, data.mode || 'ipv4');
              } catch (e: any) {
                addLog(`[ERROR] Auto-Update falhou: ${e.message}`);
              }
            }
          }, 300000); 
        }
      } else {
        (global as any)._noipWatchActive = false;
        addLog('[AUTO-UPDATE] Serviço desativado.');
        if ((global as any)._noipWatchInterval) {
          clearInterval((global as any)._noipWatchInterval);
          (global as any)._noipWatchInterval = null;
        }
      }
      return NextResponse.json({ success: true, autoUpdate: (global as any)._noipWatchActive });
    }

    const { username, password, hostname, mode } = body;

    if (!username || !password || !hostname || !mode) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Save config
    fs.writeFileSync(NOIP_CONFIG_PATH, JSON.stringify({ username, password, hostname, mode }));

    addLog(`[MANUAL] Iniciando atualização forçada para ${hostname}`);
    const { result, myip } = await performUpdate(username, password, hostname, mode);

    if (result.startsWith('good') || result.startsWith('nochg')) {
      addLog(`[OK] Sucesso! IP configurado: ${myip}`);
      return NextResponse.json({ success: true, message: `IP [${myip}] Atualizado com sucesso: ${result}` });
    } else {
      addLog(`[ERROR] Erro na API do No-IP: ${result}`);
      return NextResponse.json({ success: false, message: `Falha na atualização: ${result}` }, { status: 400 });
    }

  } catch (error: any) {
    addLog(`[FATAL] Erro: ${error.message}`);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
