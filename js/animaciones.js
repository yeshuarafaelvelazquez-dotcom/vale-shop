/* ================= VALE SHOP · Animaciones =================
 * Plasma   → fondo líquido en blanco y negro en la portada (WebGL)
 * TechText → letras que aparecen una por una (logo y título)
 * Strands  → hebras de luz que cruzan los botones al pasar el mouse (CSS)
 * Revelar  → secciones que suben suavemente al hacer scroll
 */
(function () {
  'use strict';
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- TechText: separar en letras ---------- */
  function techText(el, retraso = 0) {
    if (!el || el.dataset.tt) return;
    const texto = el.textContent;
    el.dataset.tt = '1';
    el.setAttribute('aria-label', texto);
    el.innerHTML = [...texto].map((c, i) =>
      '<span class="tt" aria-hidden="true" style="--i:' + i + ';--d:' + retraso + 'ms">' + (c === ' ' ? '&nbsp;' : c) + '</span>').join('');
    requestAnimationFrame(() => el.classList.add('tt-listo'));
  }
  window.ValeTechText = techText;

  /* ---------- Plasma ---------- */
  function plasma(contenedor) {
    if (!contenedor || reducir) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'plasma';
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    if (!gl) return;
    contenedor.prepend(canvas);
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = [
      'precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;',
      'float n(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453)-.5;}',
      'void main(){',
      ' vec2 uv=(gl_FragCoord.xy-.5*r)/r.y; float T=t*.06;',
      ' vec2 q=uv*2.2+m*.25;',
      ' for(int i=1;i<5;i++){float fi=float(i);q+=vec2(.55/fi*sin(fi*q.y+T*1.7+.3*fi),.45/fi*cos(fi*q.x+T*1.3+.6*fi));}',
      ' float v=.5+.5*sin(q.x+q.y+T*2.);',
      ' v=smoothstep(.15,.95,v);',
      ' float vig=smoothstep(1.25,.2,length(uv));',
      ' vec3 c=mix(vec3(.02),vec3(.34),v)*vig;',
      ' c+=.03*n(gl_FragCoord.xy+t);', // grano fino
      ' gl_FragColor=vec4(c,1.);',
      '}'].join('');
    function sh(tipo, src) { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm');
    let mx = 0, my = 0, tx = 0, ty = 0, visible = true;
    function tam() { const k = Math.min(window.devicePixelRatio, 1.5) * .6; canvas.width = contenedor.clientWidth * k; canvas.height = contenedor.clientHeight * k; gl.viewport(0, 0, canvas.width, canvas.height); }
    window.addEventListener('resize', tam); tam();
    contenedor.parentElement.addEventListener('pointermove', e => { const b = contenedor.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width - .5; ty = .5 - (e.clientY - b.top) / b.height; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(contenedor);
    const t0 = performance.now();
    (function cuadro(ahora) {
      requestAnimationFrame(cuadro);
      if (!visible || document.hidden) return;
      mx += (tx - mx) * .03; my += (ty - my) * .03;
      gl.uniform2f(uR, canvas.width, canvas.height); gl.uniform1f(uT, (ahora - t0) / 100); gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    })(t0);
    requestAnimationFrame(() => canvas.classList.add('visible'));
  }

  /* ---------- Revelar al hacer scroll ---------- */
  function revelar() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revelado'); io.unobserve(e.target); } }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('[data-revelar]').forEach(el => io.observe(el));
    // tarjetas del catálogo: se observan cuando se pintan
    const rej = document.getElementById('rejilla');
    if (rej) new MutationObserver(() => rej.querySelectorAll('.tarjeta:not(.revelado)').forEach((el, i) => { el.style.setProperty('--r', (i % 4) * 70 + 'ms'); io.observe(el); })).observe(rej, { childList: true });
  }

  /* ---------- Contador de la bolsa que "salta" ---------- */
  function saltoBolsa() {
    const c = document.getElementById('contBolsa'); if (!c) return;
    let antes = c.textContent;
    new MutationObserver(() => { if (c.textContent !== antes && +c.textContent > +antes) { c.classList.remove('salto'); void c.offsetWidth; c.classList.add('salto'); } antes = c.textContent; }).observe(c, { childList: true });
  }

  function iniciar() {
    if (reducir) { document.documentElement.classList.add('sin-movimiento'); return; }
    techText(document.querySelector('.portada .bienvenida'), 250);
    revelar(); saltoBolsa();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
