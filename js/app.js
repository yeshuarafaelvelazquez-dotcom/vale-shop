/* ================= VALE SHOP · lógica de la tienda ================= */
(function () {
  'use strict';
  const CFG = window.VALE_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const dinero = n => '$' + Math.round(n).toLocaleString('es-MX');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Almacenamiento local (cuenta, bolsa, deseos, pedidos) ---------- */
  const guardar = (k, v) => { try { localStorage.setItem('vs_' + k, JSON.stringify(v)); } catch (e) {} };
  const leer = (k, d) => { try { const v = JSON.parse(localStorage.getItem('vs_' + k)); return v == null ? d : v; } catch (e) { return d; } };

  const estado = {
    tienda: {}, productos: [], filtro: 'Todo', busqueda: '',
    bolsa: leer('bolsa', []),       // [{sku, id, cantidad}]
    deseos: leer('deseos', []),     // [idProducto]
    cuenta: leer('cuenta', null),   // {nombre, correo, whatsapp, calle, colonia, ciudad, edo, cp}
    pedidos: leer('pedidos', [])    // [{pedido, fecha, total, metodo}]
  };

  const COLORES = { negro: '#111', blanco: '#fff', gris: '#9a9a9a', rosa: '#f2b8c6', 'rosa palo': '#e8c4c0', rojo: '#b3242b', vino: '#5e1a26', azul: '#2b4a8b', marino: '#1c2541', celeste: '#9cc8e8', verde: '#3e6b48', olivo: '#6b6b3a', beige: '#d9c7a7', cafe: '#6b4a2e', 'café': '#6b4a2e', morado: '#5b3b7a', lila: '#c8b2e0', amarillo: '#f1d36b', naranja: '#e48a3a', crema: '#f3ead8', arena: '#cdb999' };
  const colorHex = c => COLORES[String(c).toLowerCase().trim()] || '#d6d3ce';

  /* ---------- API ---------- */
  async function api(params) {
    const r = await fetch(CFG.API + '?' + new URLSearchParams(params));
    return r.json();
  }
  async function apiPost(cuerpo) {
    // text/plain evita el bloqueo CORS de Apps Script
    const r = await fetch(CFG.API, { method: 'POST', body: JSON.stringify(cuerpo) });
    return r.json();
  }

  /* ---------- Utilidades de producto ---------- */
  const producto = id => estado.productos.find(p => p.id === id);
  const variante = sku => { for (const p of estado.productos) { const v = p.variantes.find(x => x.sku === sku); if (v) return { p, v }; } return null; };
  const stockTotal = p => p.variantes.reduce((s, v) => s + v.stock, 0);
  const minimo = () => estado.tienda.minimoMayoreo || 12;
  const piezasBolsa = () => estado.bolsa.reduce((s, it) => s + it.cantidad, 0);
  const esMayoreo = () => piezasBolsa() >= minimo();
  const precioDe = p => (esMayoreo() && p.precioMayoreo ? p.precioMayoreo : p.precio);
  function foto(p, i = 0, clase = '') {
    const src = p.fotos && p.fotos[i];
    if (!src || src.indexOf('...') >= 0) return i === 0 ? '<div class="sin-foto">' + esc(p.nombre.charAt(0)) + '</div>' : '';
    return '<img class="' + clase + '" src="' + esc(src) + '" alt="' + esc(p.nombre) + '" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;sin-foto&quot;>' + esc(p.nombre.charAt(0)) + '</div>\'">';
  }

  /* ---------- Toast ---------- */
  let tt;
  function aviso(txt) { const t = $('#toast'); t.textContent = txt; t.classList.add('visible'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('visible'), 2600); }

  /* ---------- Paneles ---------- */
  function abrir(el) { cerrarTodo(); el.classList.add('abierto'); el.setAttribute('aria-hidden', 'false'); if (el.id === 'panelMenu') $('#btnMenu').setAttribute('aria-expanded', 'true'); $('#velo').classList.add('visible'); document.body.style.overflow = 'hidden'; }
  function cerrarTodo() { $$('.panel.abierto, .modal.abierto').forEach(e => { e.classList.remove('abierto'); e.setAttribute('aria-hidden', 'true'); }); $('#btnMenu').setAttribute('aria-expanded', 'false'); $('#velo').classList.remove('visible'); document.body.style.overflow = ''; }
  function panelGen(titulo, html) { $('#genTitulo').textContent = titulo; $('#genCuerpo').innerHTML = html; abrir($('#panelGen')); $('#genCuerpo').scrollTop = 0; }

  /* ---------- Catálogo ---------- */
  function pintarCatalogo() {
    let lista = estado.productos;
    if (estado.filtro === 'Drop') lista = lista.filter(p => p.drop);
    else if (estado.filtro !== 'Todo') lista = lista.filter(p => p.categoria === estado.filtro);
    if (estado.busqueda) {
      const q = estado.busqueda.toLowerCase();
      lista = lista.filter(p => (p.nombre + ' ' + p.categoria + ' ' + p.descripcion + ' ' + p.variantes.map(v => v.color).join(' ')).toLowerCase().includes(q));
    }
    $('#tituloCatalogo').textContent = estado.busqueda ? 'Resultados' : estado.filtro;
    $('#totalProductos').textContent = lista.length + (lista.length === 1 ? ' pieza' : ' piezas');
    $$('.filtros button').forEach(b => b.classList.toggle('activo', b.dataset.filtro === estado.filtro && !estado.busqueda));
    if (!lista.length) { $('#rejilla').innerHTML = '<div class="vacio">No encontramos piezas aquí todavía</div>'; return; }
    $('#rejilla').innerHTML = lista.map((p, i) => {
      const agotado = stockTotal(p) <= 0;
      const colores = [...new Set(p.variantes.map(v => v.color))];
      const fotoColor = (p.variantes.find(v => v.foto) || {}).foto;
      const principal = (p.fotos[0] && p.fotos[0].indexOf('...') < 0) ? foto(p) : (fotoColor ? '<img src="' + esc(fotoColor) + '" alt="' + esc(p.nombre) + '" loading="lazy">' : foto(p));
      return '<article class="tarjeta" data-id="' + esc(p.id) + '" style="animation-delay:' + Math.min(i, 12) * 40 + 'ms">' +
        '<div class="tarjeta-foto">' + principal + (p.fotos[1] ? foto(p, 1, 'segunda') : '') +
          (agotado ? '<span class="etiqueta">Agotado</span>' : p.drop ? '<span class="etiqueta negra">Nuevo</span>' : '') +
          '<button class="corazon' + (estado.deseos.includes(p.id) ? ' lleno' : '') + '" data-deseo="' + esc(p.id) + '" aria-label="Agregar a deseos"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>' +
        '</div>' +
        '<div class="tarjeta-info"><h3>' + esc(p.nombre) + '</h3><p class="precio">' + dinero(p.precio) + '</p>' +
          (p.precioMayoreo ? '<p class="mayoreo">Mayoreo ' + dinero(p.precioMayoreo) + ' c/u</p>' : '') +
          '<div class="colores">' + colores.slice(0, 6).map(c => '<span class="punto" title="' + esc(c) + '" style="background:' + colorHex(c) + '"></span>').join('') + '</div>' +
        '</div></article>';
    }).join('');
  }

  /* ---------- Ficha de producto ---------- */
  function abrirFicha(id) {
    const p = producto(id); if (!p) return;
    const tallas = [...new Set(p.variantes.map(v => v.talla))];
    const colores = [...new Set(p.variantes.map(v => v.color))];
    let talla = tallas.length === 1 ? tallas[0] : null;
    const conStock = p.variantes.find(v => v.stock > 0);
    let color = colores.length === 1 ? colores[0] : (conStock ? conStock.color : null);
    const fotos = p.fotos.filter(f => f && f.indexOf('...') < 0);

    function pintar() {
      const vSel = p.variantes.find(v => v.talla === talla && v.color === color);
      const hayStock = (t, c) => p.variantes.some(v => (t == null || v.talla === t) && (c == null || v.color === c) && v.stock > 0);
      $('#ficha').innerHTML =
        '<div class="ficha-fotos">' + (() => {
          const vc = color && p.variantes.find(v => v.color === color && v.foto);
          const lista = [vc ? vc.foto : ''].concat(fotos).filter(Boolean).filter((f, i, a) => a.indexOf(f) === i);
          return lista.length ? lista.map(src => '<img src="' + esc(src) + '" alt="' + esc(p.nombre + (color ? ' ' + color : '')) + '" loading="lazy">').join('') : foto(p);
        })() + '</div>' +
        '<div class="ficha-datos">' +
          '<p class="sobre">' + esc(p.categoria || '') + (p.drop ? ' · Nuevo' : '') + '</p>' +
          '<h2>' + esc(p.nombre) + '</h2>' +
          '<p class="precio">' + dinero(p.precio) + '</p>' +
          (p.precioMayoreo ? '<p class="mayoreo">' + dinero(p.precioMayoreo) + ' c/u en mayoreo (desde ' + minimo() + ' piezas combinadas)</p>' : '') +
          (p.descripcion ? '<p class="desc">' + esc(p.descripcion) + '</p>' : '') +
          '<div class="opciones-titulo">Color <b>' + esc(color || 'Elige un color') + '</b></div>' +
          '<div class="chips">' + colores.map(c => '<button class="chip' + (c === color ? ' activo' : '') + (hayStock(talla, c) ? '' : ' agotado') + '" data-color="' + esc(c) + '"><span class="punto" style="display:inline-block;vertical-align:-1px;margin-right:6px;background:' + colorHex(c) + '"></span>' + esc(c) + '</button>').join('') + '</div>' +
          '<div class="opciones-titulo">Talla <b>' + esc(talla || 'Elige una talla') + '</b></div>' +
          '<div class="chips">' + tallas.map(t => '<button class="chip' + (t === talla ? ' activo' : '') + (hayStock(t, color) ? '' : ' agotado') + '" data-talla="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
          '<p class="stock">' + (vSel ? (vSel.stock <= 0 ? 'Agotado en esta combinación' : vSel.stock <= 3 ? '¡Quedan solo ' + vSel.stock + '!' : 'Disponible') : '') + '</p>' +
          '<div class="acciones-ficha"><button class="btn" id="agregar" ' + (vSel && vSel.stock > 0 ? '' : 'disabled') + '>Agregar a la bolsa</button>' +
          '<button class="corazon' + (estado.deseos.includes(p.id) ? ' lleno' : '') + '" data-deseo="' + esc(p.id) + '" aria-label="Deseos"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button></div>' +
          '<div class="resenas" id="resenas">' + htmlResenas() + '</div>' +
        '</div>';
      $$('#ficha [data-color]').forEach(b => b.onclick = () => { color = b.dataset.color; pintar(); });
      $$('#ficha [data-talla]').forEach(b => b.onclick = () => { talla = b.dataset.talla; pintar(); });
      const btn = $('#agregar');
      if (btn) btn.onclick = () => { agregar(vSel.sku, p.id); };
      enlazarResenas();
    }

    /* Reseñas (solo con cuentas de Firebase) */
    let lista = null, estrellas = 5;
    const estrellasHtml = n => '<span class="estrellas">' + [1, 2, 3, 4, 5].map(i => i <= Math.round(n) ? '★' : '☆').join('') + '</span>';
    function htmlResenas() {
      if (!FB()) return '';
      if (lista === null) return '<p class="opciones-titulo">Reseñas <b>Cargando…</b></p>';
      const prom = lista.length ? lista.reduce((s, r) => s + r.estrellas, 0) / lista.length : 0;
      const yo = window.ValeAuth.usuario();
      return '<div class="opciones-titulo">Reseñas <b>' + (lista.length ? estrellasHtml(prom) + ' ' + prom.toFixed(1) + ' (' + lista.length + ')' : 'Aún no hay reseñas') + '</b></div>' +
        lista.slice(0, 6).map(r => '<div class="resena">' + estrellasHtml(r.estrellas) + '<p>' + esc(r.texto) + '</p><small>' + esc(r.nombre) + '</small></div>').join('') +
        (yo ? '<form class="form-resena" id="fResena"><div class="elegir-estrellas">' + [1, 2, 3, 4, 5].map(i => '<button type="button" data-estrella="' + i + '" class="' + (i <= estrellas ? 'on' : '') + '">★</button>').join('') + '</div>' +
              '<textarea name="texto" maxlength="500" rows="2" placeholder="¿Qué te pareció esta pieza?"></textarea><button class="btn btn-borde" type="submit">Publicar reseña</button></form>'
            : '<button class="quitar" data-abrir="cuenta">Inicia sesión para dejar tu reseña</button>');
    }
    function enlazarResenas() {
      $$('#resenas [data-estrella]').forEach(b => b.onclick = () => { estrellas = +b.dataset.estrella; $$('#resenas [data-estrella]').forEach(x => x.classList.toggle('on', +x.dataset.estrella <= estrellas)); });
      const f = $('#fResena');
      if (f) f.onsubmit = async e => {
        e.preventDefault();
        const texto = f.texto.value.trim(); if (texto.length < 3) { aviso('Escribe tu opinión'); return; }
        const r = await window.ValeAuth.agregarResena(p.id, estrellas, texto, estado.cuenta.nombre || 'Clienta');
        if (!r.ok) { aviso(r.error); return; }
        aviso('¡Gracias por tu reseña!'); lista = await window.ValeAuth.resenas(p.id);
        $('#resenas').innerHTML = htmlResenas(); enlazarResenas();
      };
    }
    pintar();
    abrir($('#modal'));
    if (FB()) window.ValeAuth.resenas(p.id).then(l => { lista = l; const box = $('#resenas'); if (box) { box.innerHTML = htmlResenas(); enlazarResenas(); } }).catch(() => { lista = []; });
  }

  /* ---------- Bolsa ---------- */
  function agregar(sku, id, cant = 1) {
    const x = variante(sku); if (!x) return;
    const it = estado.bolsa.find(i => i.sku === sku);
    const actual = it ? it.cantidad : 0;
    if (actual + cant > x.v.stock) { aviso('Solo hay ' + x.v.stock + ' disponibles'); return; }
    if (it) it.cantidad += cant; else estado.bolsa.push({ sku, id, cantidad: cant });
    guardar('bolsa', estado.bolsa); contadores(); aviso('Agregado a tu bolsa');
    abrirBolsa();
  }
  function cambiar(sku, delta) {
    const it = estado.bolsa.find(i => i.sku === sku); const x = variante(sku); if (!it) return;
    it.cantidad += delta;
    if (x && it.cantidad > x.v.stock) { it.cantidad = x.v.stock; aviso('Solo hay ' + x.v.stock + ' disponibles'); }
    if (it.cantidad <= 0) estado.bolsa = estado.bolsa.filter(i => i.sku !== sku);
    guardar('bolsa', estado.bolsa); contadores(); pintarBolsa();
  }
  function limpiarBolsa() {
    // quita productos que ya no existen
    estado.bolsa = estado.bolsa.filter(i => variante(i.sku));
    guardar('bolsa', estado.bolsa);
  }
  function totales() {
    let sub = 0, normal = 0;
    estado.bolsa.forEach(i => { const x = variante(i.sku); if (x) { sub += precioDe(x.p) * i.cantidad; normal += x.p.precio * i.cantidad; } });
    return { sub, normal, ahorro: normal - sub };
  }
  function pintarBolsa() {
    const cuerpo = $('#bolsaCuerpo'), pie = $('#bolsaPie');
    if (!estado.bolsa.length) {
      cuerpo.innerHTML = '<div class="vacio" style="padding:60px 0">Tu bolsa está vacía</div>';
      pie.innerHTML = '<button class="btn btn-bloque" data-cerrar>Seguir comprando</button>'; return;
    }
    const piezas = piezasBolsa(), min = minimo(), may = esMayoreo();
    const prog = '<div class="progreso"><p>' + (may ? '✓ Precio de mayoreo aplicado' : 'Agrega ' + (min - piezas) + ' pieza' + (min - piezas === 1 ? '' : 's') + ' más para precio de mayoreo') + '</p><div class="barra"><div style="width:' + Math.min(100, piezas / min * 100) + '%"></div></div></div>';
    cuerpo.innerHTML = prog + estado.bolsa.map(i => {
      const x = variante(i.sku); if (!x) return '';
      const pu = precioDe(x.p);
      return '<div class="linea"><div class="linea-foto">' + (x.v.foto ? '<img src="' + esc(x.v.foto) + '" alt="">' : foto(x.p)) + '</div><div><h4>' + esc(x.p.nombre) + '</h4><small>' + esc(x.v.color) + ' · Talla ' + esc(x.v.talla) + '</small>' +
        '<div class="cantidad"><button data-menos="' + esc(i.sku) + '">−</button><span>' + i.cantidad + '</span><button data-mas="' + esc(i.sku) + '">+</button></div><br><button class="quitar" data-quitar="' + esc(i.sku) + '">Quitar</button></div>' +
        '<div class="linea-precio">' + (may && pu < x.p.precio ? '<s>' + dinero(x.p.precio * i.cantidad) + '</s>' : '') + dinero(pu * i.cantidad) + '</div></div>';
    }).join('');
    const t = totales();
    pie.innerHTML = '<div class="fila"><span>Piezas</span><span>' + piezas + '</span></div>' +
      (t.ahorro > 0 ? '<div class="fila"><span>Ahorro mayoreo</span><span>−' + dinero(t.ahorro) + '</span></div>' : '') +
      '<div class="fila"><span>Envío</span><span>Se calcula con tu C.P.</span></div>' +
      '<div class="fila total"><span>Subtotal</span><span>' + dinero(t.sub) + '</span></div>' +
      '<button class="btn btn-bloque" id="irPagar" style="margin-top:14px">Continuar con la compra</button>';
    $('#irPagar').onclick = iniciarCompra;
  }
  function abrirBolsa() { pintarBolsa(); abrir($('#panelBolsa')); }
  function contadores() {
    const n = piezasBolsa(), d = estado.deseos.length;
    $('#contBolsa').textContent = n; $('#contBolsa').hidden = !n;
    $('#contDeseos').textContent = d; $('#contDeseos').hidden = !d;
  }

  /* ---------- Deseos ---------- */
  function alternarDeseo(id) {
    const i = estado.deseos.indexOf(id);
    if (i >= 0) estado.deseos.splice(i, 1); else estado.deseos.push(id);
    guardar('deseos', estado.deseos); contadores();
    if (FB() && window.ValeAuth.usuario()) window.ValeAuth.guardarDeseos(estado.deseos);
    $$('[data-deseo="' + CSS.escape(id) + '"]').forEach(b => b.classList.toggle('lleno', estado.deseos.includes(id)));
    aviso(i >= 0 ? 'Quitado de tu lista de deseos' : 'Guardado en tu lista de deseos');
  }
  function verDeseos() {
    const lista = estado.deseos.map(producto).filter(Boolean);
    panelGen('Lista de deseos', lista.length ? '<div class="rejilla" style="grid-template-columns:1fr 1fr">' + lista.map(p =>
      '<article class="tarjeta" data-id="' + esc(p.id) + '"><div class="tarjeta-foto">' + foto(p) + '<button class="corazon lleno" data-deseo="' + esc(p.id) + '"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button></div><div class="tarjeta-info"><h3>' + esc(p.nombre) + '</h3><p class="precio">' + dinero(p.precio) + '</p></div></article>').join('') + '</div>'
      : '<div class="vacio">Toca el ♡ de cualquier pieza para guardarla aquí</div>');
  }

  /* ---------- Cuenta ---------- */
  const FB = () => window.ValeAuth && window.ValeAuth.activo();
  let pendiente = null; // acción a seguir después de iniciar sesión (ej. pagar)

  function guardarCuenta(datos) {
    estado.cuenta = Object.assign({}, estado.cuenta || {}, datos);
    if (FB()) { if (window.ValeAuth.usuario()) window.ValeAuth.guardarPerfil(datos); }
    else guardar('cuenta', estado.cuenta);
  }

  function formCuenta(despues) {
    if (!FB()) return formCuentaLocal(despues);
    if (window.ValeAuth.usuario() && estado.cuenta) return formPerfil();
    pendiente = despues || null;
    pantallaAcceso('entrar');
  }

  function pantallaAcceso(modo) {
    const tabs = '<div class="pestanas"><button class="' + (modo === 'entrar' ? 'activo' : '') + '" data-modo="entrar">Iniciar sesión</button><button class="' + (modo === 'crear' ? 'activo' : '') + '" data-modo="crear">Crear cuenta</button></div>';
    const google = '<div class="separador"><span>o</span></div><button class="btn btn-borde btn-bloque" type="button" id="conGoogle"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>Continuar con Google</button>';
    const html = modo === 'entrar'
      ? tabs + '<p class="nota">Entra para guardar tus datos, tu lista de deseos y seguir tus pedidos desde cualquier dispositivo.</p>' +
        '<form class="form" id="fAcceso" novalidate>' + campo('correo', 'Correo electrónico', '', 'email', 'email') + campo('pass', 'Contraseña', '', 'password', 'current-password') +
        '<button class="btn btn-bloque" type="submit">Entrar</button><button class="quitar" type="button" id="olvide" style="justify-self:start">¿Olvidaste tu contraseña?</button>' + google + '</form>'
      : tabs + '<p class="nota">Crea tu cuenta con tu correo. Solo te pedimos lo necesario para enviarte tus pedidos.</p>' +
        '<form class="form" id="fAcceso" novalidate>' + campo('nombre', 'Nombre completo', '', 'text', 'name') + campo('correo', 'Correo electrónico', '', 'email', 'email') +
        campo('whatsapp', 'WhatsApp (10 dígitos)', '', 'tel', 'tel') + campo('pass', 'Contraseña (mínimo 6)', '', 'password', 'new-password') +
        '<button class="btn btn-bloque" type="submit">Crear cuenta</button>' + '<p class="nota-aviso">Al continuar aceptas nuestro <a data-aviso>Aviso de privacidad</a>.</p>' + google + '</form>';
    panelGen(modo === 'entrar' ? 'Mi cuenta' : 'Crear cuenta', html);
    $$('#genCuerpo [data-modo]').forEach(b => b.onclick = () => pantallaAcceso(b.dataset.modo));
    const f = $('#fAcceso');
    f.onsubmit = async e => {
      e.preventDefault();
      const d = datosForm(f);
      const req = modo === 'entrar' ? ['correo', 'pass'] : ['nombre', 'correo', 'whatsapp', 'pass'];
      if (!validar(f, d, req)) return;
      const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Un momento…';
      const r = modo === 'entrar' ? await window.ValeAuth.entrar(d.correo, d.pass) : await window.ValeAuth.registrar(d);
      if (!r.ok) { aviso(r.error); btn.disabled = false; btn.textContent = modo === 'entrar' ? 'Entrar' : 'Crear cuenta'; }
    };
    $('#conGoogle').onclick = async () => { const r = await window.ValeAuth.entrarGoogle(); if (!r.ok) aviso(r.error); };
    const ol = $('#olvide');
    if (ol) ol.onclick = async () => {
      const correo = f.querySelector('[name=correo]').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { aviso('Escribe tu correo primero'); return; }
      const r = await window.ValeAuth.recuperar(correo);
      aviso(r.ok ? 'Te enviamos un correo para cambiar tu contraseña' : r.error);
    };
  }

  function formPerfil() {
    const c = estado.cuenta;
    panelGen('Mi cuenta',
      '<p class="sobre" style="color:var(--gris-3)">Hola</p><h3 class="seccion-titulo" style="margin-bottom:20px">' + esc(c.nombre || c.correo) + '</h3>' +
      '<form class="form" id="fPerfil" novalidate>' + campo('nombre', 'Nombre completo', c.nombre, 'text', 'name') +
        '<div class="campo"><label>Correo</label><input value="' + esc(c.correo) + '" disabled></div>' +
        campo('whatsapp', 'WhatsApp (10 dígitos)', c.whatsapp, 'tel', 'tel') +
        '<button class="btn btn-bloque" type="submit">Guardar cambios</button></form>' +
      '<div class="form" style="margin-top:14px"><button class="btn btn-borde btn-bloque" data-abrir="pedidos">Mis pedidos</button><button class="btn btn-borde btn-bloque" data-abrir="deseos">Lista de deseos</button><button class="quitar" id="salir" style="justify-self:start">Cerrar sesión</button></div>');
    $('#fPerfil').onsubmit = e => {
      e.preventDefault(); const d = datosForm(e.target);
      if (!validar(e.target, d, ['nombre', 'whatsapp'])) return;
      guardarCuenta({ nombre: d.nombre, whatsapp: d.whatsapp }); aviso('Datos guardados');
    };
    $('#salir').onclick = async () => { await window.ValeAuth.salir(); aviso('Sesión cerrada'); cerrarTodo(); };
  }

  function alIniciarSesion(u, perfil) {
    if (!u) {
      estado.cuenta = null; estado.pedidos = leer('pedidos', []);
      pintarCatalogo(); contadores(); return;
    }
    estado.cuenta = Object.assign({ correo: u.email, nombre: u.displayName || '' }, perfil || {});
    // unir lista de deseos y pedidos del navegador con los de la cuenta
    const deseos = [...new Set([...(perfil && perfil.deseos || []), ...estado.deseos])];
    estado.deseos = deseos; guardar('deseos', deseos); window.ValeAuth.guardarDeseos(deseos);
    const remotos = (perfil && perfil.pedidos) || [];
    const locales = leer('pedidos', []).filter(p => !remotos.some(r => r.pedido === p.pedido));
    locales.forEach(p => window.ValeAuth.agregarPedido(p));
    estado.pedidos = [...locales, ...remotos].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    contadores(); pintarCatalogo();
    if ($('#panelGen').classList.contains('abierto') && $('#fAcceso')) {
      aviso('¡Hola, ' + (estado.cuenta.nombre || '').split(' ')[0] + '!');
      if (pendiente) { const p = pendiente; pendiente = null; p(); } else formPerfil();
    }
  }

  function formCuentaLocal(despues) {
    const c = estado.cuenta || {};
    panelGen(estado.cuenta ? 'Mi cuenta' : 'Crea tu cuenta',
      (estado.cuenta ? '' : '<p class="nota" style="margin-top:0">Regístrate con tu correo para guardar tus datos, tu lista de deseos y seguir tus pedidos.</p>') +
      '<form class="form" id="fCuenta" novalidate>' +
        campo('nombre', 'Nombre completo', c.nombre, 'text', 'name') +
        campo('correo', 'Correo electrónico', c.correo, 'email', 'email') +
        campo('whatsapp', 'WhatsApp (10 dígitos)', c.whatsapp, 'tel', 'tel') +
        '<button class="btn btn-bloque" type="submit">' + (despues ? 'Continuar' : 'Guardar') + '</button>' +
        (estado.cuenta ? '<button class="btn btn-borde btn-bloque" type="button" id="salir">Cerrar sesión</button>' : '') +
      '</form>');
    $('#fCuenta').onsubmit = e => {
      e.preventDefault();
      const d = datosForm(e.target);
      if (!validar(e.target, d, ['nombre', 'correo', 'whatsapp'])) return;
      guardarCuenta(d);
      aviso('¡Listo, ' + d.nombre.split(' ')[0] + '!');
      if (despues) despues(); else cerrarTodo();
    };
    const s = $('#salir');
    if (s) s.onclick = () => { estado.cuenta = null; guardar('cuenta', null); aviso('Sesión cerrada'); cerrarTodo(); };
  }
  function campo(n, etiqueta, valor, tipo = 'text', auto = '') {
    return '<div class="campo"><label for="c_' + n + '">' + etiqueta + '</label><input id="c_' + n + '" name="' + n + '" type="' + tipo + '" autocomplete="' + auto + '" value="' + esc(valor || '') + '"></div>';
  }
  function datosForm(f) { const o = {}; new FormData(f).forEach((v, k) => o[k] = String(v).trim()); return o; }
  function validar(f, d, req) {
    let ok = true;
    $$('.campo', f).forEach(c => c.classList.remove('error'));
    req.forEach(k => {
      let bien = !!d[k];
      if (k === 'correo') bien = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d[k] || '');
      if (k === 'whatsapp') { d[k] = (d[k] || '').replace(/\D/g, '').slice(-10); bien = d[k].length === 10; }
      if (k === 'cp') bien = /^\d{5}$/.test(d[k] || '');
      if (!bien) { ok = false; const inp = f.querySelector('[name="' + k + '"]'); if (inp) inp.closest('.campo').classList.add('error'); }
    });
    if (!ok) aviso('Revisa los datos marcados en rojo');
    return ok;
  }

  /* ---------- Compra ---------- */
  function iniciarCompra() {
    if (!estado.bolsa.length) return;
    if (!estado.cuenta) formCuenta(checkout); else checkout();
  }
  function checkout() {
    const c = estado.cuenta, t = totales();
    panelGen('Finalizar compra',
      '<form class="form" id="fPago" novalidate>' +
        '<h3 class="seccion-titulo">Tus datos</h3>' +
        '<div class="dos">' + campo('nombre', 'Nombre completo', c.nombre, 'text', 'name') + campo('whatsapp', 'WhatsApp (10 dígitos)', c.whatsapp, 'tel', 'tel') + '</div>' +
        '<h3 class="seccion-titulo">Dirección de envío</h3>' +
        campo('calle', 'Calle y número', c.calle, 'text', 'address-line1') +
        campo('colonia', 'Colonia', c.colonia, 'text', 'address-line2') +
        '<div class="dos">' + campo('ciudad', 'Ciudad o municipio', c.ciudad, 'text', 'address-level2') + campo('edo', 'Estado', c.edo, 'text', 'address-level1') + '</div>' +
        '<div class="dos">' + campo('cp', 'Código postal', c.cp, 'text', 'postal-code') + campo('referencias', 'Referencias (opcional)', c.referencias) + '</div>' +
        '<h3 class="seccion-titulo">Forma de pago</h3>' +
        '<div class="metodos">' +
          '<label class="metodo"><input type="radio" name="metodo" value="Transferencia" checked><span><b>Transferencia</b><small>Te damos la CLABE y nos mandas tu comprobante por WhatsApp.</small></span></label>' +
          '<label class="metodo"><input type="radio" name="metodo" value="Depósito"><span><b>Depósito</b><small>En OXXO o banco. Nos mandas tu comprobante por WhatsApp.</small></span></label>' +
        '</div>' +
        '<h3 class="seccion-titulo">Envío</h3><div id="envioOpciones" class="metodos"><p class="nota" style="margin:0">Escribe tu código postal para ver las paqueterías y precios.</p></div>' +
        '<div class="resumen"><div class="fila"><span>' + piezasBolsa() + ' piezas · ' + (esMayoreo() ? 'Mayoreo' : 'Menudeo') + '</span><span>' + dinero(t.sub) + '</span></div>' +
          '<div class="fila"><span>Envío</span><span id="resEnvio">—</span></div>' +
          '<div class="fila total"><span>Total</span><span id="resTotal">' + dinero(t.sub) + '</span></div></div>' +
        '<button class="btn btn-bloque" type="submit" id="confirmar">Confirmar pedido</button>' + '<p class="nota-aviso">Al continuar aceptas nuestro <a data-aviso>Aviso de privacidad</a>.</p>' +
      '</form>');
    let envioSel = null, cotizado = false, ultimoCp = '';
    const pintarTotal = () => {
      const e = envioSel ? envioSel.precio : 0;
      $('#resEnvio').textContent = envioSel ? (e === 0 ? 'Gratis' : dinero(e)) : (cotizado ? '—' : 'Por cotizar');
      $('#resTotal').textContent = dinero(t.sub + e) + (envioSel ? '' : ' + envío');
      $('#confirmar').textContent = 'Confirmar pedido · ' + dinero(t.sub + e) + (envioSel ? '' : ' + envío');
    };
    async function cotizar() {
      const cp = ($('#c_cp').value || '').replace(/\D/g, '');
      if (cp.length !== 5 || cp === ultimoCp) return;
      ultimoCp = cp; envioSel = null;
      const box = $('#envioOpciones');
      box.innerHTML = '<p class="nota cotizando" style="margin:0">Buscando la paquetería más barata…</p>';
      try {
        const r = await api({ accion: 'envio', cp, items: JSON.stringify(estado.bolsa.map(i => ({ sku: i.sku, cantidad: i.cantidad }))) });
        if (!r.ok) {
          box.innerHTML = '<p class="nota" style="margin:0">' + (r.porCotizar || r.error === 'Acción no válida' ? 'Te confirmamos el costo del envío por WhatsApp con la paquetería más barata.' : esc(r.error)) + '</p>';
          cotizado = !(r.porCotizar || r.error === 'Acción no válida'); pintarTotal(); return;
        }
        cotizado = true;
        box.innerHTML = r.opciones.map((o, i) =>
          '<label class="metodo"><input type="radio" name="envio" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span style="flex:1"><b>' + esc(o.nombre) + (i === 0 ? ' <em class="mas-barata">Más barata</em>' : '') + '</b><small>' + esc(o.dias || '') + '</small></span><span class="precio-envio">' + (o.precio === 0 ? 'Gratis' : dinero(o.precio)) + '</span></label>').join('') +
          (r.gratisDesde && !r.opciones[0].gratis ? '<p class="nota" style="margin:4px 0 0">Envío gratis en compras desde ' + dinero(r.gratisDesde) + '.</p>' : '');
        envioSel = r.opciones[0];
        $$('#envioOpciones input[name=envio]').forEach(inp => inp.onchange = () => { envioSel = r.opciones[+inp.value]; pintarTotal(); });
        pintarTotal();
      } catch (err) { box.innerHTML = '<p class="nota" style="margin:0">No pudimos cotizar ahora. Te confirmamos el envío por WhatsApp.</p>'; ultimoCp = ''; }
    }
    $('#c_cp').addEventListener('input', () => { if (($('#c_cp').value || '').replace(/\D/g, '').length === 5) cotizar(); });
    pintarTotal(); cotizar();
    $('#fPago').onsubmit = async e => {
      e.preventDefault();
      const d = datosForm(e.target);
      if (!validar(e.target, d, ['nombre', 'whatsapp', 'calle', 'colonia', 'ciudad', 'edo', 'cp'])) return;
      guardarCuenta({ nombre: d.nombre, whatsapp: d.whatsapp, calle: d.calle, colonia: d.colonia, ciudad: d.ciudad, edo: d.edo, cp: d.cp, referencias: d.referencias });
      const btn = $('#confirmar'); btn.disabled = true; btn.textContent = 'Procesando…';
      try {
        const res = await apiPost({
          accion: 'pedido', metodo: d.metodo, envio: envioSel ? { carrier: envioSel.carrier, servicio: envioSel.servicio } : null,
          clienta: { nombre: d.nombre, correo: estado.cuenta.correo, whatsapp: d.whatsapp, cp: d.cp,
            direccion: d.calle + ', Col. ' + d.colonia + ', ' + d.ciudad + ', ' + d.edo + (d.referencias ? ' (Ref: ' + d.referencias + ')' : '') },
          items: estado.bolsa.map(i => ({ sku: i.sku, cantidad: i.cantidad }))
        });
        if (!res.ok) {
          btn.disabled = false; pintarTotal();
          aviso(res.error || 'No se pudo crear el pedido');
          if (res.pedido) recordarPedido(res, d.metodo);
          return;
        }
        recordarPedido(res, d.metodo);
        estado.bolsa = []; guardar('bolsa', []); contadores();
        cargarCatalogo(true);
        if (res.linkPago) { window.location.href = res.linkPago; return; }
        mostrarDatosPago(res, d.metodo);
      } catch (err) {
        btn.disabled = false; pintarTotal();
        aviso('Sin conexión. Intenta de nuevo.');
      }
    };
  }
  function recordarPedido(res, metodo) {
    if (estado.pedidos.some(p => p.pedido === res.pedido)) return;
    const p = { pedido: res.pedido, fecha: new Date().toISOString(), total: res.total, metodo };
    estado.pedidos.unshift(p);
    if (FB() && window.ValeAuth.usuario()) window.ValeAuth.agregarPedido(p);
    else guardar('pedidos', estado.pedidos);
  }
  function linkWhats(texto) {
    const num = String(estado.tienda.whatsapp || '').replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(texto);
  }
  function mostrarDatosPago(res, metodo) {
    const T = estado.tienda;
    panelGen('Pedido recibido',
      '<div class="exito"><p class="num">Pedido ' + esc(res.pedido) + '</p><h3>¡Gracias, ' + esc(estado.cuenta.nombre.split(' ')[0]) + '!</h3>' +
      '<p class="nota">' + (res.envioCotizado ? 'Total a pagar: <b>' + dinero(res.total) + '</b> (productos ' + dinero(res.subtotal) + ' + envío ' + (res.envio ? dinero(res.envio) : 'gratis') + ' con ' + esc(res.paqueteria) + ')' : 'Total de productos: <b>' + dinero(res.total) + '</b> + envío por cotizar.') + '</p></div>' +
      '<div class="caja-banco">' + (metodo === 'Transferencia'
        ? '<b>Transferencia</b><br>Banco: ' + esc(T.banco || 'Pendiente') + '<br>Titular: ' + esc(T.titular || 'Pendiente') + '<br>CLABE: <b>' + esc(T.clabe || 'Pendiente') + '</b>'
        : '<b>Depósito</b><br>Banco: ' + esc(T.banco || 'Pendiente') + '<br>Titular: ' + esc(T.titular || 'Pendiente') + '<br>Tarjeta: <b>' + esc(T.tarjeta || 'Pendiente') + '</b>') +
      '<br>Concepto: <b>' + esc(res.pedido) + '</b></div>' +
      '<p class="nota">' + (res.envioCotizado ? '1. Haz tu ' + (metodo === 'Transferencia' ? 'transferencia' : 'depósito') + ' por el total.<br>2. Mándanos tu comprobante por WhatsApp.<br>3. Empacamos y te enviamos tu número de guía.' : '1. Te mandamos el costo del envío por WhatsApp.<br>2. Pagas el total y nos mandas tu comprobante.<br>3. Empacamos y te enviamos tu número de guía.') + '</p>' +
      '<a class="btn btn-bloque" target="_blank" rel="noopener" href="' + linkWhats(res.envioCotizado ? 'Hola, hice el pedido ' + res.pedido + ' en Vale Shop por ' + dinero(res.total) + ' (' + metodo + '). Te mando mi comprobante.' : 'Hola, hice el pedido ' + res.pedido + ' en Vale Shop por ' + dinero(res.total) + ' (' + metodo + '). Mi C.P. es ' + estado.cuenta.cp + '. ¿Me confirmas el envío?') + '">Enviar mensaje por WhatsApp</a>');
  }

  /* ---------- Mis pedidos ---------- */
  async function verPedidos() {
    if (!estado.pedidos.length) { panelGen('Mis pedidos', '<div class="vacio">Aún no tienes pedidos</div>'); return; }
    panelGen('Mis pedidos', '<div id="listaPed">' + estado.pedidos.map(p =>
      '<div class="pedido-item"><div><b style="font-weight:400">' + esc(p.pedido) + '</b><small>' + new Date(p.fecha).toLocaleDateString('es-MX') + ' · ' + esc(p.metodo) + '</small></div><div style="text-align:right">' + dinero(p.total || 0) + '<small data-est="' + esc(p.pedido) + '">Consultando…</small></div></div>').join('') + '</div>');
    for (const p of estado.pedidos.slice(0, 10)) {
      try {
        const r = await api({ accion: 'pedido', id: p.pedido });
        const el = $('[data-est="' + CSS.escape(p.pedido) + '"]');
        if (el) el.textContent = r.ok ? (r.estado || '') + ' · ' + (r.pago || '') + (r.guia ? ' · Guía ' + r.guia : '') : 'No encontrado';
      } catch (e) {}
    }
  }

  /* ---------- Regreso desde Mercado Pago ---------- */
  async function revisarRegreso() {
    const q = new URLSearchParams(location.search);
    if (!q.get('pedido')) return;
    const id = q.get('pedido'), pago = q.get('pago');
    history.replaceState(null, '', location.pathname);
    const msg = pago === 'ok' ? ['¡Pago recibido!', 'Ya estamos preparando tu pedido. Te avisaremos por WhatsApp cuando salga.']
      : pago === 'pendiente' ? ['Pago pendiente', 'Cuando Mercado Pago confirme tu pago, empacamos tu pedido.']
      : ['El pago no se completó', 'Puedes intentarlo de nuevo o escribirnos por WhatsApp.'];
    panelGen('Tu pedido', '<div class="exito"><p class="num">Pedido ' + esc(id) + '</p><h3>' + msg[0] + '</h3><p class="nota">' + msg[1] + '</p></div>' +
      '<a class="btn btn-bloque" target="_blank" rel="noopener" href="' + linkWhats('Hola, tengo una duda de mi pedido ' + id) + '">Escribir por WhatsApp</a>');
  }

  /* ---------- Aviso de privacidad (se llena solo con los datos de Mi Tienda) ---------- */
  function abrirAviso() {
    const T = estado.tienda, tienda = esc(T.nombre || 'Vale Shop');
    const resp = esc(T.titular || T.nombre || 'Vale Shop');
    const contacto = [T.correo ? 'el correo <b>' + esc(T.correo) + '</b>' : '', T.whatsapp ? 'WhatsApp <b>' + esc(T.whatsapp) + '</b>' : ''].filter(Boolean).join(' o ') || 'nuestro WhatsApp';
    const fecha = new Date(2026, 10, 12).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    $('#avisoTexto').innerHTML =
      '<h3>Aviso de privacidad</h3>' +
      '<p><b>' + resp + '</b>, que opera la tienda en línea <b>' + tienda + '</b>, es responsable del uso y protección de tus datos personales, de acuerdo con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Puedes contactarnos por ' + contacto + '.</p>' +
      '<h4>¿Qué datos recabamos?</h4><ul><li>Nombre completo.</li><li>Correo electrónico.</li><li>Número de teléfono / WhatsApp.</li><li>Dirección de envío y código postal.</li><li>Tu historial de pedidos, lista de deseos y reseñas.</li></ul>' +
      '<p>No recabamos datos sensibles ni datos bancarios: los pagos se hacen por transferencia o depósito directamente en tu banco.</p>' +
      '<h4>¿Para qué los usamos?</h4><p>Finalidades necesarias para darte el servicio:</p><ul><li>Procesar, confirmar y enviar tus pedidos.</li><li>Cotizar el envío y generar la guía con la paquetería.</li><li>Comunicarnos contigo por WhatsApp o correo sobre tu pedido, tu pago y el estado de tu paquete.</li><li>Crear y administrar tu cuenta, tu lista de deseos y tus reseñas.</li><li>Atender cambios, devoluciones y aclaraciones.</li></ul>' +
      '<p>Finalidad adicional (no necesaria): enviarte novedades y promociones. Si no quieres recibirlas, avísanos por ' + contacto + ' y dejaremos de enviarlas; esto no afecta tus compras.</p>' +
      '<h4>¿Con quién compartimos tus datos?</h4><p>Solo con quienes lo necesitan para entregarte tu pedido: la paquetería y la plataforma de envíos que la contrata (nombre, teléfono y dirección). También usamos servicios de Google (Google Sheets y Firebase) para guardar la información de forma segura. No vendemos ni rentamos tus datos.</p>' +
      '<h4>Tus derechos (ARCO)</h4><p>Tienes derecho a <b>A</b>cceder a tus datos, <b>R</b>ectificarlos, <b>C</b>ancelarlos u <b>O</b>ponerte a su uso, así como a revocar tu consentimiento. Para hacerlo, escríbenos por ' + contacto + ' con tu nombre, el derecho que quieres ejercer y una forma de identificarte. Te responderemos en un máximo de 20 días hábiles. También puedes corregir tus datos desde "Mi cuenta".</p>' +
      '<h4>Cookies y almacenamiento</h4><p>La página guarda en tu navegador tu bolsa de compra y tu sesión para que no se pierdan. No usamos cookies de publicidad.</p>' +
      '<h4>Cambios a este aviso</h4><p>Si este aviso cambia, publicaremos la versión nueva en esta misma página.</p>' +
      '<p class="nota">Última actualización: ' + fecha + '.</p>';
    const m = $('#avisoModal'); m.classList.add('abierto'); m.setAttribute('aria-hidden', 'false'); $('#avisoTexto').parentNode.scrollTop = 0;
  }
  function cerrarAviso() { const m = $('#avisoModal'); m.classList.remove('abierto'); m.setAttribute('aria-hidden', 'true'); }

  /* ---------- Cargar datos ---------- */
  async function cargarCatalogo(silencioso) {
    try {
      const d = await api({ accion: 'catalogo' });
      if (!d.ok) throw new Error(d.error);
      estado.tienda = d.tienda || {}; estado.productos = d.productos || [];
      limpiarBolsa(); aplicarTienda(); pintarCategorias(d.categorias); pintarCatalogo(); contadores();
    } catch (e) {
      if (!silencioso) $('#rejilla').innerHTML = '<div class="vacio">No pudimos cargar la colección. Recarga la página.</div>';
    }
  }
  /* Botones de categorías: salen de la tabla "Categorías" de la hoja Configuración */
  function pintarCategorias(lista) {
    if (!Array.isArray(lista)) return;
    const usadas = lista.filter(c => estado.productos.some(p => String(p.categoria).trim() === c));
    const boton = c => { const b = document.createElement('button'); b.setAttribute('data-cat', ''); b.dataset.filtro = c; b.textContent = c; return b; };
    const filtros = $('#filtros'), menu = $('#menuLista');
    filtros.querySelectorAll('[data-cat]').forEach(b => b.remove());
    usadas.forEach(c => filtros.appendChild(boton(c)));
    if (menu) {
      menu.querySelectorAll('[data-cat]').forEach(b => b.remove());
      const hr = menu.querySelector('hr');
      usadas.forEach(c => menu.insertBefore(boton(c), hr));
    }
    $$('.nav-principal [data-filtro="Accesorios"], header [data-filtro="Accesorios"]').forEach(b => b.hidden = usadas.indexOf('Accesorios') < 0);
    if (!['Todo', 'Drop'].includes(estado.filtro) && usadas.indexOf(estado.filtro) < 0) estado.filtro = 'Todo';
  }
  function aplicarTienda() {
    const T = estado.tienda;
    $$('[data-minimo]').forEach(e => e.textContent = minimo());
    if (T.banner) $('#bannerTexto').textContent = T.banner;
    $('#lnkWhats').href = linkWhats('Hola, vengo de la página de Vale Shop');
    [['#lnkInsta', T.instagram], ['#lnkFace', T.facebook], ['#lnkTik', T.tiktok]].forEach(([s, u]) => { if (u) { $(s).href = u; $(s).hidden = false; } });
    $('#pieHorario').textContent = T.horario ? 'Atención: ' + T.horario : '';
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const deseo = t.closest('[data-deseo]'); if (deseo) { e.stopPropagation(); alternarDeseo(deseo.dataset.deseo); return; }
    const tarjeta = t.closest('.tarjeta'); if (tarjeta) { abrirFicha(tarjeta.dataset.id); return; }
    const f = t.closest('[data-filtro]'); if (f) { estado.filtro = f.dataset.filtro; estado.busqueda = ''; $('#inputBuscar').value = ''; cerrarTodo(); pintarCatalogo(); document.querySelector('.filtros').scrollIntoView({ behavior: 'smooth' }); return; }
    if (t.closest('[data-aviso]')) { e.preventDefault(); abrirAviso(); return; }
    if (t.closest('[data-cerrar-aviso]') || t.id === 'avisoModal') { cerrarAviso(); return; }
    if (t.closest('[data-cerrar]') || t.id === 'velo' || t.id === 'modal') { cerrarTodo(); return; }
    const ab = t.closest('[data-abrir]'); if (ab) { ({ cuenta: () => formCuenta(), deseos: verDeseos, pedidos: verPedidos })[ab.dataset.abrir](); return; }
    const mas = t.closest('[data-mas]'); if (mas) { cambiar(mas.dataset.mas, 1); return; }
    const menos = t.closest('[data-menos]'); if (menos) { cambiar(menos.dataset.menos, -1); return; }
    const q = t.closest('[data-quitar]'); if (q) { cambiar(q.dataset.quitar, -9999); return; }
    if (t.closest('[data-ir="inicio"]')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  $('#btnMenu').onclick = () => abrir($('#panelMenu'));
  $('#btnBolsa').onclick = abrirBolsa;
  $('#btnDeseos').onclick = verDeseos;
  $('#btnCuenta').onclick = () => formCuenta();
  $('#btnBuscar').onclick = () => { $('#buscador').hidden = false; $('#inputBuscar').focus(); };
  $('#cerrarBuscar').onclick = () => { $('#buscador').hidden = true; estado.busqueda = ''; $('#inputBuscar').value = ''; pintarCatalogo(); };
  $('#inputBuscar').oninput = e => { estado.busqueda = e.target.value.trim(); pintarCatalogo(); };
  $('#inputBuscar').onkeydown = e => { if (e.key === 'Enter') document.querySelector('.catalogo').scrollIntoView({ behavior: 'smooth' }); };
  $('#lnkPoliticas').onclick = e => { e.preventDefault(); panelGen('Cambios y devoluciones', '<p class="desc" style="line-height:1.8">' + esc(estado.tienda.politicas || 'Escríbenos por WhatsApp para cualquier cambio.') + '</p>'); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarTodo(); });
  window.addEventListener('scroll', () => $('#cabecera').classList.toggle('con-borde', window.scrollY > 10), { passive: true });
  $('#anio').textContent = new Date().getFullYear();

  if (CFG.FOTO_PORTADA) { $('#portadaImg').style.backgroundImage = 'url("' + CFG.FOTO_PORTADA + '")'; $('#portada').classList.add('con-foto'); }
  contadores();
  if (window.ValeAuth) {
    // con Firebase, la cuenta viene de la sesión y no del navegador
    if (CFG.FIREBASE && CFG.FIREBASE.apiKey && location.protocol !== 'file:') estado.cuenta = null;
    window.ValeAuth.alCambiar(alIniciarSesion);
    window.ValeAuth.iniciar().catch(e => console.warn('[VALE] Firebase no inició', e));
  }
  cargarCatalogo().then(revisarRegreso);
})();
