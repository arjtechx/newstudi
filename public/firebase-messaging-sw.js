// Scripts de importação para o Firebase Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// O Firebase Studio injetará as configurações automaticamente se disponível, 
// caso contrário, o worker tentará inicializar com dados padrão ou aguardará.
firebase.initializeApp({
  apiKey: "AIzaSyBSjoIE-nDG0-rx37B2SJbNBI4Qj2EVIe0",
  authDomain: "aprovaconcursos-39292868-895af.firebaseapp.com",
  projectId: "aprovaconcursos-39292868-895af",
  storageBucket: "aprovaconcursos-39292868-895af.appspot.com",
  messagingSenderId: "596031963442",
  appId: "1:596031963442:web:c92c42d1ea05a787c5172b"
});

const messaging = firebase.messaging();

// Escuta de mensagens em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem em segundo plano recebida: ', payload);
  
  const notificationTitle = payload.notification.title || 'AprovaConcursos Alerta';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/award-icon.png', // Deve existir na pasta public
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
