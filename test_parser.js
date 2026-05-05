const fs = require('fs');
const path = require('path');

function getRoutesFromConfig(yml) {
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
    }
  }
  return routes;
}

const yml = `tunnel: aplicativob
credentials-file: C:\\Users\\gcarv\\.cloudflared\\f7eb8357-fce6-4393-a28a-533ab4242b81.json

ingress:
  # ROUTE_NAME: aplicativob
  - hostname: web.arjtechbr.site
    service: http://127.0.0.1:3000
  - service: http_status:404`;

console.log(JSON.stringify(getRoutesFromConfig(yml), null, 2));
