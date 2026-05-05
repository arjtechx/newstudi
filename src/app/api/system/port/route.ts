import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const devScript = pkg.scripts?.dev || '';
    const match = devScript.match(/-p (\d+)/);
    const port = match ? match[1] : '3000';
    return NextResponse.json({ port });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { port } = await req.json();
    if (!port || isNaN(Number(port))) return NextResponse.json({ error: 'Porta inválida' }, { status: 400 });

    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    if (pkg.scripts && pkg.scripts.dev) {
      if (pkg.scripts.dev.includes('-p ')) {
        pkg.scripts.dev = pkg.scripts.dev.replace(/-p \d+/, `-p ${port}`);
      } else {
        pkg.scripts.dev += ` -p ${port}`;
      }
      
      if (pkg.scripts.tunnel) {
         pkg.scripts.tunnel = pkg.scripts.tunnel.replace(/localhost:\d+/, `localhost:${port}`);
      }
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    return NextResponse.json({ success: true, message: `Porta atualizada para ${port}. Reinicie o painel preta preta (terminal) para aplicar.` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
