// src/scripts/app.js
//
// Comportamiento de «app nativa» en móvil y tableta. El marcado sale del build
// (`Header.astro` y `NavegacionMovil.astro`) y funciona sin este script: las
// pestañas y el selector de juegos son enlaces, y «Más» baja al pie. Esto sólo
// añade lo que una app tiene y una web no:
//
//   · La hoja «Más» sube desde abajo, se arrastra para cerrarla y responde al
//     botón atrás de Android (el <dialog> modal lo trae de serie).
//   · La barra superior se esconde al bajar y vuelve al subir.
//   · Tocar la pestaña en la que ya estás te sube arriba del todo.
//   · Volver, compartir e instalar.
//   · Con la app instalada, deslizar hacia abajo desde arriba actualiza.

const MOVIL = window.matchMedia('(max-width: 1023px)');
const SIN_MOVIMIENTO = window.matchMedia('(prefers-reduced-motion: reduce)');
const CLAVE_INSTALAR = 'lotohn:instalar-descartado';
const DIAS_SIN_INSISTIR = 7;

const raiz = document.documentElement;

function esAppInstalada() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function esIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

if (esAppInstalada()) raiz.classList.add('modo-app');

// ============================================
// AVISO FLOTANTE
// ============================================

let temporizadorAviso = 0;
let temporizadorOcultar = 0;

function aviso(texto) {
    const el = document.querySelector('.app-aviso');
    if (!el) return;
    clearTimeout(temporizadorAviso);
    clearTimeout(temporizadorOcultar);
    el.textContent = texto;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('visible'));
    temporizadorAviso = setTimeout(() => {
        el.classList.remove('visible');
        temporizadorOcultar = setTimeout(() => { el.hidden = true; }, 250);
    }, 2400);
}

// ============================================
// HOJA «MÁS»
// ============================================

function prepararHoja() {
    const hoja = document.getElementById('menuApp');
    // Sin <dialog> (navegadores muy viejos) el enlace «Más» baja al pie, que
    // tiene los mismos enlaces.
    if (!hoja || typeof hoja.showModal !== 'function') return;

    const panel = hoja.querySelector('.hoja-panel');
    const disparadores = document.querySelectorAll('[data-abrir-menu]');
    let cerrando = false;

    const marcar = (abierta) => {
        raiz.classList.toggle('hoja-abierta', abierta);
        disparadores.forEach(d => d.setAttribute('aria-expanded', String(abierta)));
    };

    function abrir(e) {
        e?.preventDefault();
        if (hoja.open) return;
        cerrando = false;
        hoja.showModal();
        marcar(true);
        // Dos frames: el primero pinta el panel abajo, el segundo lo sube.
        requestAnimationFrame(() => requestAnimationFrame(() => hoja.classList.add('abierta')));
    }

    function terminarCierre() {
        if (!hoja.open) return;
        hoja.classList.remove('abierta', 'arrastrando');
        panel.style.transform = '';
        hoja.close();
        marcar(false);
        cerrando = false;
    }

    function cerrar({ inmediato = false } = {}) {
        if (!hoja.open || cerrando) return;
        cerrando = true;
        hoja.classList.remove('arrastrando');
        panel.style.transform = '';
        hoja.classList.remove('abierta');
        if (inmediato || SIN_MOVIMIENTO.matches) { terminarCierre(); return; }
        panel.addEventListener('transitionend', terminarCierre, { once: true });
        setTimeout(terminarCierre, 450);   // por si el transitionend no llega
    }

    disparadores.forEach(d => d.addEventListener('click', abrir));
    hoja.querySelectorAll('[data-cerrar-menu]').forEach(b => b.addEventListener('click', () => cerrar()));

    // Escape y el botón atrás de Android llegan como `cancel`: se cierra con
    // la animación en vez de desaparecer de golpe.
    hoja.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(); });

    // El <dialog> ocupa la pantalla entera; tocar fuera del panel es tocar el
    // propio dialog.
    hoja.addEventListener('click', (e) => { if (e.target === hoja) cerrar(); });

    // Volver con el botón atrás restaura la página tal cual desde la bfcache,
    // con la hoja abierta encima. Se cierra sin animación.
    window.addEventListener('pageshow', (e) => { if (e.persisted) cerrar({ inmediato: true }); });

    // Al pasar a escritorio (girar una tableta) la hoja no tiene sentido.
    MOVIL.addEventListener?.('change', (e) => { if (!e.matches) cerrar({ inmediato: true }); });

    // ---------- Arrastrar para cerrar ----------
    const zona = hoja.querySelector('[data-arrastre]');
    if (!zona) return;

    let inicioY = 0, ultimoY = 0, ultimoT = 0, velocidad = 0, arrastrando = false;

    zona.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        arrastrando = true;
        inicioY = ultimoY = e.clientY;
        ultimoT = e.timeStamp;
        velocidad = 0;
        hoja.classList.add('arrastrando');
        zona.setPointerCapture?.(e.pointerId);
    });

    zona.addEventListener('pointermove', (e) => {
        if (!arrastrando) return;
        const dy = Math.max(0, e.clientY - inicioY);
        const dt = Math.max(1, e.timeStamp - ultimoT);
        velocidad = (e.clientY - ultimoY) / dt;
        ultimoY = e.clientY;
        ultimoT = e.timeStamp;
        panel.style.transform = `translateY(${dy}px)`;
    });

    const soltar = (e) => {
        if (!arrastrando) return;
        arrastrando = false;
        const dy = Math.max(0, e.clientY - inicioY);
        hoja.classList.remove('arrastrando');
        if (dy > Math.min(140, panel.offsetHeight * 0.3) || velocidad > 0.6) {
            cerrar();
        } else {
            panel.style.transform = '';
        }
    };
    zona.addEventListener('pointerup', soltar);
    zona.addEventListener('pointercancel', soltar);
}

// ============================================
// BARRA SUPERIOR: se esconde al bajar, vuelve al subir
// ============================================

function prepararBarra() {
    const barra = document.querySelector('[data-app-barra]');
    if (!barra) return;

    const UMBRAL = 6;
    let ultimaY = Math.max(0, window.scrollY);
    let oculta = false;
    let pendiente = false;

    const mostrar = () => {
        if (!oculta) return;
        oculta = false;
        barra.classList.remove('app-barra--oculta');
    };

    function revisar() {
        pendiente = false;
        const y = Math.max(0, window.scrollY);
        barra.classList.toggle('app-barra--elevada', y > 4);

        if (!MOVIL.matches || raiz.classList.contains('hoja-abierta')) { ultimaY = y; return; }

        const delta = y - ultimaY;
        if (Math.abs(delta) < UMBRAL) return;
        ultimaY = y;

        // No se esconde hasta haber dejado atrás su propio alto: arriba del
        // todo la barra siempre está.
        const ocultar = delta > 0 && y > barra.offsetHeight + 24;
        if (ocultar === oculta) return;
        oculta = ocultar;
        barra.classList.toggle('app-barra--oculta', oculta);
    }

    window.addEventListener('scroll', () => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(revisar);
    }, { passive: true });

    // Con teclado, lo que recibe el foco tiene que verse.
    barra.addEventListener('focusin', mostrar);
    window.addEventListener('pageshow', () => { ultimaY = Math.max(0, window.scrollY); mostrar(); revisar(); });
    revisar();
}

// ============================================
// SELECTOR DE JUEGOS: el activo, a la vista
// ============================================

function centrarJuegoActivo() {
    const tira = document.querySelector('.app-chips');
    const activo = tira?.querySelector('[aria-current]');
    if (!tira || !activo) return;
    // scrollLeft y no scrollIntoView: éste también movería la página en vertical.
    tira.scrollLeft = activo.offsetLeft - (tira.clientWidth - activo.offsetWidth) / 2;
}

// ============================================
// TOCAR LA PESTAÑA ACTUAL → ARRIBA DEL TODO
// ============================================

function prepararVolverArriba() {
    document.addEventListener('click', (e) => {
        const enlace = e.target.closest?.('.tab[aria-current="page"], .app-chip[aria-current="page"]');
        if (!enlace || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: SIN_MOVIMIENTO.matches ? 'auto' : 'smooth' });
    });
}

// ============================================
// VOLVER
// ============================================

function prepararVolver() {
    document.querySelectorAll('[data-atras]').forEach((boton) => {
        boton.addEventListener('click', (e) => {
            // Si se llegó desde otra página del sitio, «volver» es volver de
            // verdad. Si se entró directo (desde Google, un enlace compartido)
            // el enlace lleva al inicio en vez de sacar al visitante del sitio.
            let desdeElSitio = false;
            try {
                desdeElSitio = Boolean(document.referrer)
                    && new URL(document.referrer).origin === location.origin;
            } catch { /* referrer raro */ }
            if (desdeElSitio && history.length > 1) {
                e.preventDefault();
                history.back();
            }
        });
    });
}

// ============================================
// COMPARTIR
// ============================================

function prepararCompartir() {
    const botones = document.querySelectorAll('[data-compartir]');
    if (!botones.length) return;
    const puedeCompartir = typeof navigator.share === 'function';
    const puedeCopiar = Boolean(navigator.clipboard?.writeText);
    if (!puedeCompartir && !puedeCopiar) return;

    const url = document.querySelector('link[rel="canonical"]')?.href || location.href;

    botones.forEach((boton) => {
        boton.hidden = false;
        boton.addEventListener('click', async () => {
            if (puedeCompartir) {
                try {
                    await navigator.share({ title: document.title, url });
                } catch (err) {
                    // Cancelar el menú de compartir no es un error.
                    if (err?.name !== 'AbortError' && puedeCopiar) copiar(url);
                }
                return;
            }
            copiar(url);
        });
    });

    async function copiar(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            aviso('Enlace copiado');
        } catch {
            aviso('No se pudo copiar el enlace');
        }
    }
}

// ============================================
// INSTALAR
// ============================================

function descartadoHacePoco() {
    try {
        const t = Number(localStorage.getItem(CLAVE_INSTALAR) || 0);
        return Date.now() - t < DIAS_SIN_INSISTIR * 864e5;
    } catch { return false; }
}

function prepararInstalar() {
    if (esAppInstalada()) return;

    const bloque = document.querySelector('[data-instalar-bloque]');
    const pildora = document.querySelector('.app-barra [data-instalar]');
    const botonHoja = bloque?.querySelector('[data-instalar]');
    let diferido = null;

    // iPhone/iPad: no hay aviso del sistema, sólo el menú Compartir.
    if (esIOS() && bloque) {
        bloque.hidden = false;
        bloque.querySelector('[data-instalar-ayuda]')?.setAttribute('hidden', '');
        bloque.querySelector('[data-instalar-ios]')?.removeAttribute('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Sin la mini-barra del navegador: se ofrece desde la barra de la app
        // y desde el menú, que es donde un visitante lo busca.
        e.preventDefault();
        diferido = e;
        if (bloque) bloque.hidden = false;
        if (botonHoja) botonHoja.hidden = false;
        if (pildora && !descartadoHacePoco()) pildora.hidden = false;
    });

    async function instalar() {
        if (!diferido) return;
        const evento = diferido;
        diferido = null;
        evento.prompt();
        try {
            const { outcome } = await evento.userChoice;
            if (outcome !== 'accepted') {
                try { localStorage.setItem(CLAVE_INSTALAR, String(Date.now())); } catch { /* modo privado */ }
            }
        } catch { /* sin respuesta */ }
        if (pildora) pildora.hidden = true;
        if (botonHoja) botonHoja.hidden = true;
    }

    pildora?.addEventListener('click', instalar);
    botonHoja?.addEventListener('click', instalar);

    window.addEventListener('appinstalled', () => {
        diferido = null;
        if (pildora) pildora.hidden = true;
        if (bloque) bloque.hidden = true;
        aviso('LotoHN quedó instalada');
    });
}

// ============================================
// TECLADO EN PANTALLA
// ============================================

const CAMPOS_DE_TEXTO = 'input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="tel"], input[type="url"], input[type="number"], input[type="password"], textarea, [contenteditable="true"]';

function prepararTeclado() {
    let temporizador = 0;
    document.addEventListener('focusin', (e) => {
        if (!e.target.matches?.(CAMPOS_DE_TEXTO)) return;
        clearTimeout(temporizador);
        raiz.classList.add('teclado-abierto');
    });
    document.addEventListener('focusout', () => {
        // El foco puede saltar de un campo a otro: se espera un instante.
        temporizador = setTimeout(() => {
            if (!document.activeElement?.matches?.(CAMPOS_DE_TEXTO)) raiz.classList.remove('teclado-abierto');
        }, 120);
    });
}

// ============================================
// DESLIZA PARA ACTUALIZAR (solo app instalada)
// ============================================
//
// Instalada no hay barra del navegador ni botón de recargar, y en iPhone
// tampoco el gesto. Arriba del todo, arrastrar hacia abajo actualiza: en las
// páginas de resultados se piden los datos de nuevo sin recargar (`main.js`
// escucha `lotohn:refrescar`); en el resto, se recarga la página.

function prepararRefresco() {
    if (!esAppInstalada()) return;
    const indicador = document.querySelector('.app-refresco');
    if (!indicador) return;
    const icono = indicador.querySelector('svg');

    const UMBRAL = 70;
    const MAXIMO = 110;
    let inicioX = 0, inicioY = null, tiron = 0, siguiendo = false, cargando = false;

    function pintar(px) {
        indicador.style.transform = `translate(-50%, ${px - 64}px)`;
        indicador.style.opacity = String(Math.min(1, px / UMBRAL));
        if (icono) icono.style.transform = `rotate(${px * 3}deg)`;
        indicador.classList.toggle('listo', px >= UMBRAL);
    }

    function recoger() {
        indicador.classList.add('soltando');
        indicador.classList.remove('listo', 'cargando');
        pintar(0);
        indicador.style.opacity = '0';
        setTimeout(() => indicador.classList.remove('soltando'), 260);
    }

    async function refrescar() {
        cargando = true;
        indicador.classList.add('soltando', 'cargando');
        indicador.style.transform = 'translate(-50%, 16px)';
        indicador.style.opacity = '1';
        if (icono) icono.style.transform = '';

        const evento = new CustomEvent('lotohn:refrescar', { detail: { tareas: [] } });
        document.dispatchEvent(evento);
        if (!evento.detail.tareas.length) {
            location.reload();
            return;
        }
        const minimo = new Promise(r => setTimeout(r, 600));
        await Promise.allSettled([...evento.detail.tareas, minimo]);
        cargando = false;
        recoger();
    }

    window.addEventListener('touchstart', (e) => {
        inicioY = null;
        if (cargando || e.touches.length !== 1 || window.scrollY > 0) return;
        if (raiz.classList.contains('hoja-abierta')) return;
        inicioX = e.touches[0].clientX;
        inicioY = e.touches[0].clientY;
        tiron = 0;
        siguiendo = false;
        const barra = document.querySelector('[data-app-barra]');
        const bajoLaBarra = barra ? barra.getBoundingClientRect().bottom : 0;
        if (bajoLaBarra > 0) indicador.style.top = `${bajoLaBarra}px`;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (inicioY === null) return;
        const dx = e.touches[0].clientX - inicioX;
        const dy = e.touches[0].clientY - inicioY;
        // Un gesto horizontal (tiras de juegos, pestañas) no es un refresco.
        if (!siguiendo && Math.abs(dx) > Math.abs(dy)) { inicioY = null; return; }
        if (dy <= 0 || window.scrollY > 0) {
            if (siguiendo) { siguiendo = false; tiron = 0; pintar(0); }
            return;
        }
        siguiendo = true;
        tiron = Math.min(MAXIMO, dy * 0.5);
        pintar(tiron);
    }, { passive: true });

    const terminar = () => {
        if (inicioY === null) return;
        inicioY = null;
        if (!siguiendo) return;
        siguiendo = false;
        if (tiron >= UMBRAL) refrescar();
        else recoger();
    };
    window.addEventListener('touchend', terminar, { passive: true });
    window.addEventListener('touchcancel', terminar, { passive: true });
}

// ============================================
// ARRANQUE
// ============================================

prepararHoja();
prepararBarra();
centrarJuegoActivo();
prepararVolverArriba();
prepararVolver();
prepararCompartir();
prepararInstalar();
prepararTeclado();
prepararRefresco();
