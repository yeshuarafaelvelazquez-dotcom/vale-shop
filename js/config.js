// ============ CONFIGURACIÓN DE LA TIENDA ============
// Solo cambia lo que está entre comillas si algo cambia.
window.VALE_CONFIG = {
  // Enlace de la aplicación web de Apps Script (la "API" que lee la hoja de Google)
  API: 'https://script.google.com/macros/s/AKfycbwcKwzcnyBKOGK7lKzp4ZqIOEsKWQse3DylXSVwWoTJG77MyiyQ2jD9W2gpWIYjiHa9ug/exec',

  // Foto grande de la portada (puede ser un link de Google Drive o de cualquier imagen)
  FOTO_PORTADA: 'img/portada.jpg',

  // Mientras se conecta la paquetería, el envío se cotiza y se confirma por WhatsApp
  ENVIO_POR_COTIZAR: true,

  // Cuentas de clientas (Firebase). Se llena con los datos del proyecto de Firebase.
  // Si se deja vacío, las cuentas se guardan solo en el navegador de cada clienta.
  // (Esta clave es pública por diseño; la seguridad la dan las reglas de Firestore)
  FIREBASE: {
    apiKey: 'AIzaSyD9QrrWLBi1nhV3HsISVZ3mPTdp2bhTR8U',
    authDomain: 'vale-shop-467bb.firebaseapp.com',
    projectId: 'vale-shop-467bb',
    storageBucket: 'vale-shop-467bb.firebasestorage.app',
    messagingSenderId: '299302029210',
    appId: '1:299302029210:web:0214fd80978ff7cd4d1c23'
  }
};
