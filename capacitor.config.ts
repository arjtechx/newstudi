import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aprovaconcursos.app',
  appName: 'Aprova Concursos',
  webDir: 'out',
  bundledWebRuntime: false,
  // Se o seu site estiver hospedado (ex: Vercel), você pode apontar o app diretamente para lá.
  // Descomente as linhas abaixo e coloque o seu domínio para criar um app tipo "WebView".
  // server: {
  //   url: 'https://seusite.com',
  //   cleartext: true
  // }
};

export default config;
