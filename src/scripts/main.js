// ============================================
// CONFIGURACIÓN
// ============================================

import { fetchJSON } from './api.js';
import { icono } from '../lib/iconos.js';
import {
    seccionesHTML,
    formatearFechaLarga,
    horaHondurasTexto,
    fechaHondurasISO,
} from '../lib/sorteos.js';

const JSON_URL = '/api/resultados-v2';

// ============================================
// DETECTAR TIPO DE PÁGINA
// ============================================

function obtenerTipoJuego() {
    const path = window.location.pathname.toLowerCase();

    const mapeo = {
        'juga-3': 'juga3',
        'juga3': 'juga3',
        'pega-3': 'pega3',
        'pega3': 'pega3',
        'premia-2': 'premia2',
        'premia2': 'premia2',
        'la-diaria': 'diaria',
        'diaria': 'diaria',
        'loto-super-premio': 'super',
        'super-premio': 'super',
        'superpremio': 'super'
    };

    for (const [key, value] of Object.entries(mapeo)) {
        if (path.includes(key)) {
            return value;
        }
    }

    return 'todos';
}

// ============================================
// RELOJ HONDURAS
// ============================================

let relojInterval;

function actualizarReloj() {
    const relojElement = document.getElementById('relojHonduras');
    if (!relojElement) return;
    relojElement.textContent = horaHondurasTexto();
    relojElement.setAttribute('datetime', fechaHondurasISO());
}

function iniciarReloj() {
    if (document.visibilityState === 'visible') {
        actualizarReloj();
        relojInterval = setInterval(actualizarReloj, 1000);
    }
}

function detenerReloj() {
    if (relojInterval) {
        clearInterval(relojInterval);
        relojInterval = null;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        detenerReloj();
    } else {
        iniciarReloj();
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarReloj);
} else {
    iniciarReloj();
}

// ============================================
// SKELETON PLACEHOLDERS
// ============================================

function crearSkeletonCards(cantidad = 3) {
    let html = '';
    for (let i = 0; i < cantidad; i++) {
        html += `
            <div class="game-card skeleton">
                <div class="skeleton-line" style="width:60%;height:24px;"></div>
                <div class="skeleton-line" style="width:40%;height:16px;margin-top:8px;"></div>
                <div style="display:flex;justify-content:center;gap:8px;margin-top:20px;">
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-circle"></div>
                </div>
            </div>
        `;
    }
    return html;
}

// ============================================
// PRELOAD DE LOGOS
// ============================================

const logosPreloadCache = new Set();

function preloadLogos(html) {
    const encontrados = html.match(/\/logos\/[a-z0-9_]+\.png/g) || [];
    new Set(encontrados).forEach(logoUrl => {
        if (logosPreloadCache.has(logoUrl)) return;
        const link = document.createElement('link');
        link.rel  = 'preload';
        link.as   = 'image';
        link.href = logoUrl;
        document.head.appendChild(link);
        logosPreloadCache.add(logoUrl);
    });
}

// ============================================
// CARGAR RESULTADOS
// ============================================

// Momento del último intento de carga: lo usa el refresco al volver a la
// página para no repetir la petición si acaba de hacerse.
let ultimaCarga = 0;

// `mostrarSkeleton: false` es el refresco de fondo: no borra lo que ya está en
// pantalla, así que no parpadea el "CARGANDO..." ni se pierde un resultado
// bueno si la petición falla.
async function cargarResultados({ mostrarSkeleton = true } = {}) {
    const contenido = document.getElementById('contenido');
    if (!contenido) return;

    if (mostrarSkeleton) {
        contenido.innerHTML = `
            <div class="sorteo-section">
                <h2 class="sorteo-header">
                    ${icono('loader', 'w-6 h-6 inline-block mr-2 animate-spin')}
                    CARGANDO RESULTADOS...
                </h2>
                <div class="sorteo-grid">${crearSkeletonCards(3)}</div>
            </div>
        `;
    }

    try {
        const data = await fetchJSON(JSON_URL);

        const fechaElement = document.getElementById('fechaActual');
        if (fechaElement) {
            const span = fechaElement.querySelector('span');
            if (span) span.textContent = formatearFechaLarga();
        }

        const sorteos = data.sorteos || data;
        const html    = seccionesHTML(sorteos, obtenerTipoJuego());

        if (!html) {
            if (mostrarSkeleton) {
                contenido.innerHTML = `
                    <div class="error-message">
                        ${icono('info', 'w-6 h-6 inline-block mr-2')}
                        No hay resultados disponibles todavía.
                    </div>
                `;
            }
            return;
        }

        preloadLogos(html);
        contenido.innerHTML = html;
        // El HTML del build ya no manda: a partir de acá el bloque es del cliente.
        contenido.removeAttribute('data-prerender');

    } catch (error) {
        console.error('Error:', error);
        // En un refresco de fondo se conserva lo que ya está en pantalla: vale
        // más un resultado de hace un minuto que un cartel de error.
        if (mostrarSkeleton) {
            contenido.innerHTML = `
                <div class="error-message">
                    ${icono('alerta', 'w-6 h-6 inline-block mr-2')}
                    Error al cargar los resultados<br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    } finally {
        ultimaCarga = Date.now();
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

// La primera carga sólo enseña el skeleton cuando no hay nada que enseñar. Si
// el build dejó el resultado escrito en el HTML se refresca por detrás: el
// visitante ve el número desde el primer frame y no un hueco gris.
function cargaInicial() {
    const contenido = document.getElementById('contenido');
    if (!contenido) return;
    const yaPintado = contenido.dataset.prerender === 'true';
    cargarResultados({ mostrarSkeleton: !yaPintado });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargaInicial);
} else {
    cargaInicial();
}

// ============================================
// REFRESCO AL VOLVER A LA PÁGINA
// ============================================
//
// El temporizador no alcanza cuando la pestaña estuvo en segundo plano (el
// navegador lo frena) o cuando se vuelve al home con el botón atrás, que
// restaura la página tal cual estaba desde la bfcache sin ejecutar de nuevo el
// script. Sin esto, el visitante se queda mirando el sorteo anterior.

const EDAD_MAXIMA_MS = 20 * 1000;

function refrescarSiEstaVieja() {
    if (document.visibilityState !== 'visible') return;
    if (!document.getElementById('contenido')) return;
    if (Date.now() - ultimaCarga < EDAD_MAXIMA_MS) return;
    cargarResultados({ mostrarSkeleton: false });
}

document.addEventListener('visibilitychange', refrescarSiEstaVieja);
window.addEventListener('pageshow', (e) => {
    if (e.persisted) refrescarSiEstaVieja();   // vuelta desde la bfcache
});

// ============================================
// ACTUALIZACIÓN AUTOMÁTICA
// ============================================

// Los sorteos son a las 11:00, 15:00 y 21:00 (hora Honduras) y el backend
// publica unos minutos después. La ventana rápida cubre la hora y cuarto
// siguiente a cada sorteo — no solo los primeros 30 minutos — porque si una
// corrida del scraper se atrasa el resultado puede llegar bastante más tarde.
const HORAS_SORTEO       = [11, 15, 21];
const VENTANA_RAPIDA_MIN = 75;

function minutosDesdeUltimoSorteo() {
    const ahora  = new Date();
    const utc    = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const horaHN = new Date(utc + (3600000 * -6));
    const minutosDelDia = horaHN.getHours() * 60 + horaHN.getMinutes();

    let menor = Infinity;
    HORAS_SORTEO.forEach(hora => {
        const delta = minutosDelDia - hora * 60;
        if (delta >= 0 && delta < menor) menor = delta;
    });
    return menor;
}

function obtenerIntervaloActualizacion() {
    return minutosDesdeUltimoSorteo() <= VENTANA_RAPIDA_MIN
        ? 1 * 60 * 1000   // cada 1 min mientras se espera el resultado
        : 5 * 60 * 1000;  // cada 5 min el resto del día
}

function programarSiguienteActualizacion() {
    setTimeout(() => {
        if (document.getElementById('contenido')) {
            cargarResultados({ mostrarSkeleton: false });
        }
        programarSiguienteActualizacion();
    }, obtenerIntervaloActualizacion());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('contenido')) programarSiguienteActualizacion();
    });
} else {
    if (document.getElementById('contenido')) programarSiguienteActualizacion();
}
