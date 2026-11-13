/* ================= VALE SHOP · Animaciones =================
 * Reglas (Emil Kowalski + design taste):
 *  - La portada entra una sola vez al cargar (CSS).
 *  - Nada aparece ni se mueve por hacer scroll.
 *  - Botones, tarjetas e íconos responden al pasar el mouse y al presionar (CSS).
 *  - El contador de la bolsa da un pequeño salto cuando agregas algo.
 */
(function () {
  'use strict';
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function saltoBolsa() {
    const c = document.getElementById('contBolsa'); if (!c) return;
    let antes = c.textContent;
    new MutationObserver(() => {
      if (c.textContent !== antes && +c.textContent > +antes) { c.classList.remove('salto'); void c.offsetWidth; c.classList.add('salto'); }
      antes = c.textContent;
    }).observe(c, { childList: true });
  }

  function iniciar() { if (!reducir) saltoBolsa(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
