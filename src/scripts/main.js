// ============================================
// RESULTADOS EN EL CLIENTE
// ============================================
//
// El HTML ya llega con el último sorteo escrito por el build. Este script no
// está para pintarlo de cero, sino para mantenerlo al día sin que el visitante
// note el relevo: comprueba que lo que llega sea más nuevo que lo que hay, lo
// funde tarjeta por tarjeta y sólo toca del DOM lo que de verdad cambió.

import { fetchJSON } from './api.js';
import { icono } from '../lib/iconos.js';
import {
    seccionesHTML,
    filtrarSorteos,
    fusionarSorteos,
    momentoDelDato,
    clavesConCambio,
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

const TIPO_JUEGO = obtenerTipoJuego();

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
    if (relojInterval) return;
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
// ESTADO: QUÉ HAY AHORA MISMO EN PANTALLA
// ============================================
//
// `momento` es la marca de tiempo del JSON con el que se pintó lo que se está
// viendo. Es la pieza que faltaba: sin ella el cliente no podía distinguir una
// respuesta nueva de una atrasada y aceptaba las dos por igual.

let estado = { momento: 0, sorteos: null };

function leerEstadoEmbebido() {
    const nodo = document.getElementById('datos-sorteos');
    if (!nodo) return;
    try {
        const datos = JSON.parse(nodo.textContent || '{}');
        if (datos && datos.sorteos && Object.keys(datos.sorteos).length > 0) {
            estado = { momento: Number(datos.momento) || 0, sorteos: datos.sorteos };
        }
    } catch (error) {
        // El HTML del build se sigue viendo igual; sólo se pierde la
        // comparación, así que el primer refresco vuelve a mandar como antes.
        console.warn('Estado embebido ilegible:', error.message);
    }
}

// ============================================
// REPINTADO QUIRÚRGICO
// ============================================
//
// Antes cada refresco hacía `contenido.innerHTML = html`, y eso rehacía las
// trece tarjetas aunque no hubiera cambiado ni un número: las esferas repetían
// su animación de entrada cada minuto y los logos volvían a montarse. Acá se
// comparan las tarjetas por su clave y sólo se reemplazan las distintas.

function marcarActualizada(tarjeta) {
    tarjeta.classList.add('recien-actualizada');
    const limpiar = () => tarjeta.classList.remove('recien-actualizada');
    // Con `prefers-reduced-motion` la animación no existe y `animationend` no
    // llega nunca, así que el temporizador es el que quita la clase.
    tarjeta.addEventListener('animationend', limpiar, { once: true });
    setTimeout(limpiar, 2500);
}

function reconciliarGrid(gridActual, gridNueva, destacadas) {
    let cambios = 0;
    if (gridActual.className !== gridNueva.className) gridActual.className = gridNueva.className;

    const previas = new Map();
    Array.from(gridActual.children).forEach((tarjeta, i) => {
        previas.set(tarjeta.dataset.key || `__${i}`, tarjeta);
    });

    let anterior = null;
    for (const nueva of Array.from(gridNueva.children)) {
        const clave  = nueva.dataset.key;
        const previa = previas.get(clave);
        let colocada = previa;

        if (!previa) {
            colocada = nueva;
            cambios++;
        } else {
            previas.delete(clave);
            if (previa.outerHTML !== nueva.outerHTML) {
                previa.replaceWith(nueva);
                colocada = nueva;
                cambios++;
            }
        }

        const esperado = anterior ? anterior.nextSibling : gridActual.firstChild;
        if (esperado !== colocada) gridActual.insertBefore(colocada, esperado);
        if (destacadas.has(clave)) marcarActualizada(colocada);
        anterior = colocada;
    }

    previas.forEach(tarjeta => { tarjeta.remove(); cambios++; });
    return cambios;
}

function reconciliarSeccion(actual, nueva, destacadas) {
    const cabActual = actual.querySelector('.sorteo-header');
    const cabNueva  = nueva.querySelector('.sorteo-header');
    if (cabActual && cabNueva && cabActual.innerHTML !== cabNueva.innerHTML) {
        cabActual.innerHTML = cabNueva.innerHTML;
    }

    const gridActual = actual.querySelector('.sorteo-grid');
    const gridNueva  = nueva.querySelector('.sorteo-grid');
    if (!gridActual || !gridNueva) {
        actual.replaceWith(nueva);
        return 1;
    }
    return reconciliarGrid(gridActual, gridNueva, destacadas);
}

function aplicarHTML(contenido, html, destacadas = new Set()) {
    // Sin nada pintado todavía (o con el placeholder estático) no hay qué
    // comparar: se escribe de una vez.
    if (!contenido.querySelector('.sorteo-section')) {
        contenido.innerHTML = html;
        return true;
    }

    const molde = document.createElement('div');
    molde.innerHTML = html;

    const existentes = new Map();
    contenido.querySelectorAll(':scope > .sorteo-section')
        .forEach(seccion => existentes.set(seccion.dataset.tanda, seccion));

    let cambios = 0;
    let anterior = null;
    for (const seccionNueva of Array.from(molde.querySelectorAll(':scope > .sorteo-section'))) {
        const tanda = seccionNueva.dataset.tanda;
        const actual = existentes.get(tanda);
        let colocada = actual;

        if (!actual) {
            colocada = seccionNueva;
            cambios++;
        } else {
            existentes.delete(tanda);
            cambios += reconciliarSeccion(actual, seccionNueva, destacadas);
            colocada = actual.isConnected ? actual : seccionNueva;
        }

        const esperado = anterior ? anterior.nextSibling : contenido.firstChild;
        if (esperado !== colocada) contenido.insertBefore(colocada, esperado);
        anterior = colocada;
    }

    existentes.forEach(seccion => { seccion.remove(); cambios++; });
    return cambios > 0;
}

// ============================================
// CARGAR RESULTADOS
// ============================================

// Momento del último intento de carga: lo usa el refresco al volver a la
// página para no repetir la petición si acaba de hacerse.
let ultimaCarga = 0;
let enVuelo = false;

// Cuando la respuesta viene atrasada no sirve esperar al refresco normal: el
// CDN de GitHub suelta la copia nueva en unos minutos y hasta entonces hay que
// insistir. Se reintenta seguido y con la URL forzada —dentro de la misma
// ventana de 30 s el borde devolvería el mismo JSON— durante un rato acotado.
const REINTENTO_ATRASADO_MS = 20 * 1000;
const MAX_REINTENTOS_ATRASADOS = 15;   // ~5 min, que es lo que tarda el CDN
let reintentosAtrasados = 0;
let temporizadorAtrasado = null;

function programarReintentoAtrasado() {
    if (temporizadorAtrasado) return;
    if (reintentosAtrasados >= MAX_REINTENTOS_ATRASADOS) return;
    reintentosAtrasados++;
    temporizadorAtrasado = setTimeout(() => {
        temporizadorAtrasado = null;
        cargarResultados({ forzarOrigen: true });
    }, REINTENTO_ATRASADO_MS);
}

// `mostrarSkeleton: false` es el refresco de fondo: no borra lo que ya está en
// pantalla, así que no parpadea el "CARGANDO..." ni se pierde un resultado
// bueno si la petición falla.
async function cargarResultados({ mostrarSkeleton = true, forzarOrigen = false } = {}) {
    const contenido = document.getElementById('contenido');
    if (!contenido) return;
    if (enVuelo) return;
    enVuelo = true;

    if (mostrarSkeleton) {
        contenido.innerHTML = `
            <div class="sorteo-section">
                <h2 class="sorteo-header">
                    ${icono('loader', 'w-6 h-6 inline-block mr-2')}
                    CARGANDO RESULTADOS...
                </h2>
                <div class="sorteo-grid">${crearSkeletonCards(3)}</div>
            </div>
        `;
    }

    try {
        const data = await fetchJSON(JSON_URL, { unico: forzarOrigen });

        // Puerta de frescura. El HTML del build y la API salen del mismo
        // archivo pero no lo leen a la vez, así que justo después de publicarse
        // un sorteo la API puede ir un paso atrás. Antes esa respuesta pisaba
        // el número nuevo con el anterior hasta el siguiente refresco: eso es
        // el parpadeo que se veía. Ahora se descarta y se vuelve a preguntar.
        const momentoNuevo = momentoDelDato(data);
        if (estado.momento && momentoNuevo && momentoNuevo < estado.momento) {
            programarReintentoAtrasado();
            return;
        }
        reintentosAtrasados = 0;

        const fechaElement = document.getElementById('fechaActual');
        if (fechaElement) {
            const span = fechaElement.querySelector('span');
            if (span) span.textContent = formatearFechaLarga();
        }

        const recibidos = filtrarSorteos(data.sorteos || data, TIPO_JUEGO);
        const fusion    = fusionarSorteos(estado.sorteos, recibidos);
        const cambiadas = estado.sorteos ? clavesConCambio(estado.sorteos, fusion) : new Set();

        estado = {
            momento: Math.max(estado.momento, momentoNuevo || 0),
            sorteos: fusion,
        };

        const html = seccionesHTML(fusion, TIPO_JUEGO);

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
        aplicarHTML(contenido, html, cambiadas);
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
        enVuelo = false;
        ultimaCarga = Date.now();
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        // Que el analizador se entere: su análisis envejece con los sorteos.
        document.dispatchEvent(new CustomEvent('lotohn:resultados'));
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

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        detenerReloj();
    } else {
        iniciarReloj();
        refrescarSiEstaVieja();
    }
});

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
        // Con la pestaña de fondo la petición no le sirve a nadie: al volver,
        // el visibilitychange ya refresca.
        if (document.visibilityState === 'visible' && document.getElementById('contenido')) {
            cargarResultados({ mostrarSkeleton: false });
        }
        programarSiguienteActualizacion();
    }, obtenerIntervaloActualizacion());
}

// ============================================
// ARRANQUE
// ============================================

function iniciar() {
    iniciarReloj();
    leerEstadoEmbebido();
    cargaInicial();
    if (document.getElementById('contenido')) programarSiguienteActualizacion();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}
