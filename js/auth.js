/* ================= VALE SHOP · Cuentas con Firebase =================
 * Si VALE_CONFIG.FIREBASE está vacío, la tienda sigue funcionando con cuentas locales.
 * Datos en Firestore:
 *   clientas/{uid}                 → perfil (nombre, correo, whatsapp, dirección), deseos[], pedidos[]
 *   resenas/{autoId}               → { producto, uid, nombre, estrellas, texto, fecha }
 */
(function () {
  'use strict';
  const CFG = window.VALE_CONFIG || {};
  const V = '10.14.1';
  const URL = n => 'https://www.gstatic.com/firebasejs/' + V + '/firebase-' + n + '.js';
  let fb = null, auth = null, db = null, usuario = null;
  const oyentes = [];

  const ERRORES = {
    'auth/email-already-in-use': 'Ese correo ya tiene cuenta. Inicia sesión.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No hay cuenta con ese correo.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google.',
    'auth/network-request-failed': 'Sin conexión. Intenta de nuevo.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase.'
  };
  const mensaje = e => ERRORES[e && e.code] || 'Algo salió mal. Intenta de nuevo.';

  async function iniciar() {
    if (!CFG.FIREBASE || !CFG.FIREBASE.apiKey) return false;
    if (location.protocol === 'file:') { console.warn('[VALE] Firebase necesita abrir la página desde un servidor (GitHub Pages o Live Server), no con doble clic.'); return false; }
    const [app, a, f] = await Promise.all([import(URL('app')), import(URL('auth')), import(URL('firestore'))]);
    fb = Object.assign({}, a, f);
    const inst = app.initializeApp(CFG.FIREBASE);
    auth = a.getAuth(inst); db = f.getFirestore(inst);
    auth.languageCode = 'es';
    await a.setPersistence(auth, a.browserLocalPersistence);
    a.onAuthStateChanged(auth, async u => {
      usuario = u;
      let perfil = null;
      if (u) {
        const snap = await f.getDoc(f.doc(db, 'clientas', u.uid));
        perfil = snap.exists() ? snap.data() : null;
        if (!perfil) { perfil = { nombre: u.displayName || '', correo: u.email, whatsapp: '', deseos: [], pedidos: [] }; await guardarPerfil(perfil); }
      }
      oyentes.forEach(cb => cb(u, perfil));
    });
    return true;
  }

  async function registrar({ nombre, correo, pass, whatsapp }) {
    try {
      const cred = await fb.createUserWithEmailAndPassword(auth, correo, pass);
      await fb.updateProfile(cred.user, { displayName: nombre });
      await fb.setDoc(fb.doc(db, 'clientas', cred.user.uid), { nombre, correo, whatsapp, deseos: [], pedidos: [], creada: fb.serverTimestamp() }, { merge: true });
      return { ok: true };
    } catch (e) { return { ok: false, error: mensaje(e) }; }
  }
  async function entrar(correo, pass) {
    try { await fb.signInWithEmailAndPassword(auth, correo, pass); return { ok: true }; }
    catch (e) { return { ok: false, error: mensaje(e) }; }
  }
  async function entrarGoogle() {
    try { await fb.signInWithPopup(auth, new fb.GoogleAuthProvider()); return { ok: true }; }
    catch (e) { return { ok: false, error: mensaje(e) }; }
  }
  async function recuperar(correo) {
    try { await fb.sendPasswordResetEmail(auth, correo); return { ok: true }; }
    catch (e) { return { ok: false, error: mensaje(e) }; }
  }
  const salir = () => fb.signOut(auth);

  async function guardarPerfil(datos) {
    if (!usuario) return;
    const limpio = {}; Object.keys(datos).forEach(k => { if (datos[k] !== undefined) limpio[k] = datos[k]; });
    await fb.setDoc(fb.doc(db, 'clientas', usuario.uid), limpio, { merge: true });
  }
  const guardarDeseos = deseos => guardarPerfil({ deseos });
  async function agregarPedido(p) {
    if (!usuario) return;
    await fb.updateDoc(fb.doc(db, 'clientas', usuario.uid), { pedidos: fb.arrayUnion(p) });
  }

  async function resenas(producto) {
    if (!db) return [];
    const q = fb.query(fb.collection(db, 'resenas'), fb.where('producto', '==', producto), fb.limit(30));
    const s = await fb.getDocs(q);
    return s.docs.map(d => d.data()).sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
  }
  async function agregarResena(producto, estrellas, texto, nombre) {
    if (!usuario) return { ok: false, error: 'Inicia sesión para opinar' };
    try {
      // un documento por clienta y producto: si vuelve a opinar, se actualiza
      await fb.setDoc(fb.doc(db, 'resenas', producto + '_' + usuario.uid),
        { producto, uid: usuario.uid, nombre: nombre.split(' ')[0], estrellas, texto: texto.slice(0, 500), fecha: Date.now() });
      return { ok: true };
    } catch (e) { return { ok: false, error: 'No se pudo guardar tu reseña' }; }
  }

  window.ValeAuth = {
    iniciar, registrar, entrar, entrarGoogle, recuperar, salir,
    guardarPerfil, guardarDeseos, agregarPedido, resenas, agregarResena,
    alCambiar: cb => oyentes.push(cb),
    activo: () => !!auth,
    usuario: () => usuario
  };
})();
