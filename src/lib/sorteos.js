// ============================================
// RENDER DE SORTEOS — compartido build ↔ navegador
// ============================================
//
// Estas funciones no tocan el DOM ni `window` a propósito: las usa el build de
// Astro para dejar el resultado escrito en el HTML (que es lo único que ve un
// bot que no ejecuta JS) y las usa `main.js` para repintar en el cliente cuando
// llega un sorteo nuevo. Al salir el mismo string de los dos lados el HTML
// servido y el repintado no pueden divergir.

import { icono } from './iconos.js';

// ============================================
// UTILIDADES
// ============================================

// Los datos vienen de un scraper sobre una web de terceros: nada de lo que
// llega en el JSON se interpola crudo en el HTML.
export function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Normaliza nombre quitando underscores/espacios: pega_3 → pega3, la_diaria → ladiaria
export function normalizarNombre(str) {
    return String(str).toLowerCase().replace(/_/g, '').replace(/\s/g, '');
}

// Quita el sufijo de tanda (_11am, _10am, _3pm, _2pm, _9pm)
export function obtenerJuegoBase(key) {
    return String(key).toLowerCase().replace(/_(11am|10am|3pm|2pm|9pm)$/, '');
}

const JUEGOS_PRINCIPALES_NORM = ['juga3', 'pega3', 'premia2', 'ladiaria', 'diaria'];

// Mapea variantes al nombre canónico para deduplicación
export function canonicalizar(normName) {
    return normName === 'diaria' ? 'ladiaria' : normName;
}

// Mapa canónico de logos (evita depender del nombre del archivo del backend)
const LOGO_MAP = {
    'juga3':        '/logos/juga3.png',
    'pega3':        '/logos/pega3.png',
    'premia2':      '/logos/premia2.png',
    'ladiaria':     '/logos/la_diaria.png',
    'diaria':       '/logos/la_diaria.png',
    'superpremio':  '/logos/super_premio.png',
};

export function resolverLogo(key) {
    return LOGO_MAP[normalizarNombre(obtenerJuegoBase(key))] || '';
}

// ============================================
// HORA HONDURAS (UTC-6, sin horario de verano)
// ============================================

// Devuelve un Date cuyos getters locales dan la hora de Honduras. En el build
// corre en UTC y en el navegador en la zona del visitante: el cálculo es el
// mismo en los dos casos.
export function ahoraHonduras(referencia = new Date()) {
    const utc = referencia.getTime() + (referencia.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * -6));
}

// Devuelve true si fecha_sorteo ("DD-MM") corresponde a hoy en Honduras
export function esFechaHoy(fechaSorteo, referencia = new Date()) {
    if (!fechaSorteo) return false;
    const hn = ahoraHonduras(referencia);
    const [dia, mes] = String(fechaSorteo).split('-').map(Number);
    return dia === hn.getDate() && mes === (hn.getMonth() + 1);
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function formatearFechaLarga(referencia = new Date()) {
    const hn = ahoraHonduras(referencia);
    return `${hn.getDate()} de ${MESES[hn.getMonth()]} de ${hn.getFullYear()}`;
}

export function horaHondurasTexto(referencia = new Date()) {
    const hn = ahoraHonduras(referencia);
    const p = n => String(n).padStart(2, '0');
    return `${p(hn.getHours())}:${p(hn.getMinutes())}:${p(hn.getSeconds())}`;
}

// ISO con el desfase fijo de Honduras, para el atributo datetime de <time>.
export function fechaHondurasISO(referencia = new Date()) {
    const hn = ahoraHonduras(referencia);
    const p = n => String(n).padStart(2, '0');
    return `${hn.getFullYear()}-${p(hn.getMonth() + 1)}-${p(hn.getDate())}`
         + `T${p(hn.getHours())}:${p(hn.getMinutes())}:${p(hn.getSeconds())}-06:00`;
}

// "DD-MM" → "DD-MM-YYYY". Un sorteo con mes posterior al actual es del año
// pasado: la fuente no publica fechas futuras.
export function formatearFechaSorteo(fechaSorteo, referencia = new Date()) {
    if (fechaSorteo && String(fechaSorteo).split('-').length === 3) return fechaSorteo;

    const [dia, mes] = String(fechaSorteo).split('-').map(Number);
    const hn = ahoraHonduras(referencia);
    const yearActual = hn.getFullYear();
    const mesActual  = hn.getMonth() + 1;
    const diaActual  = hn.getDate();

    let year = yearActual;
    if (mes > mesActual || (mes === mesActual && dia > diaActual)) {
        year = yearActual - 1;
    }
    return `${fechaSorteo}-${year}`;
}

// ============================================
// TANDAS
// ============================================

export const TANDAS = {
    '_11am': { label: 'SORTEO DE LA MAÑANA',  hora: '11:00 AM', icono: 'sunrise', horaNum: 11 },
    // Bingo con Todo y Multi X ya no existen: la fuente dejó de publicarlos
    '_3pm':  { label: 'SORTEO DE LA TARDE',   hora: '3:00 PM',  icono: 'sun',     horaNum: 15 },
    '_9pm':  { label: 'SORTEO DE LA NOCHE',   hora: '9:00 PM',  icono: 'moon',    horaNum: 21 },
    'otros': { label: 'OTROS JUEGOS',          hora: null,       icono: 'layers',  horaNum: null }
};

// _10am y _2pm son alias de la tanda de mañana y tarde respectivamente
export function detectarTanda(key) {
    const k = String(key).toLowerCase();
    if (k.endsWith('_11am') || k.endsWith('_10am')) return '_11am';
    if (k.endsWith('_3pm')  || k.endsWith('_2pm'))  return '_3pm';
    if (k.endsWith('_9pm'))                          return '_9pm';
    return 'otros';
}

export function esPrincipal(key) {
    if (detectarTanda(key) === 'otros') return false;
    return JUEGOS_PRINCIPALES_NORM.includes(normalizarNombre(obtenerJuegoBase(key)));
}

// Juegos que van en "Otros Juegos" (sin tanda diaria fija)
const OTROS_PERMITIDOS = new Set(['superpremio']);

export function agruparPorTanda(sorteos) {
    const grupos = { '_11am': [], '_3pm': [], '_9pm': [], 'otros': [] };
    const vistos = new Set(); // deduplicar: gameNorm+tanda

    sorteos.forEach(([key, datos]) => {
        const gameNorm = normalizarNombre(obtenerJuegoBase(key));

        if (esPrincipal(key)) {
            const tanda    = detectarTanda(key);
            const dedupeId = `${canonicalizar(gameNorm)}_${tanda}`;
            if (vistos.has(dedupeId)) return;           // descartar duplicado
            vistos.add(dedupeId);
            grupos[tanda].push([key, datos]);

        } else if (OTROS_PERMITIDOS.has(gameNorm)) {
            if (!vistos.has(gameNorm)) {
                vistos.add(gameNorm);
                grupos['otros'].push([key, datos]);
            }
        }
        // resto se ignora
    });
    return grupos;
}

export function filtrarSorteos(sorteos, tipoJuego) {
    if (tipoJuego === 'todos') return sorteos;
    const filtrados = {};
    for (const [key, value] of Object.entries(sorteos)) {
        if (normalizarNombre(obtenerJuegoBase(key)).includes(tipoJuego)) {
            filtrados[key] = value;
        }
    }
    return filtrados;
}

export function ordenarPorFechaYHora(sorteos, referencia = new Date()) {
    const ordenHoras = {
        '11:00 AM': 1, '10:00 AM': 1,
        '3:00 PM':  2, '2:00 PM':  2, '15:00': 2,
        '9:00 PM':  4, '21:00':    4
    };
    const yearBase = ahoraHonduras(referencia).getFullYear();

    return Object.entries(sorteos).sort((a, b) => {
        const [, datosA] = a;
        const [, datosB] = b;

        if (!datosA.fecha_sorteo || !datosB.fecha_sorteo) return 0;

        const [diaA, mesA, yearA = yearBase] = String(datosA.fecha_sorteo).split('-').map(Number);
        const [diaB, mesB, yearB = yearBase] = String(datosB.fecha_sorteo).split('-').map(Number);

        if (yearA !== yearB) return yearB - yearA;
        if (mesA  !== mesB)  return mesB  - mesA;
        if (diaA  !== diaB)  return diaB  - diaA;

        const horaA = ordenHoras[datosA.hora_sorteo] || 0;
        const horaB = ordenHoras[datosB.hora_sorteo] || 0;
        return horaA - horaB;
    });
}

// ============================================
// HTML
// ============================================

function estadoTandaHTML(horaNum, referencia) {
    if (horaNum == null) return '';
    const completado = ahoraHonduras(referencia).getHours() >= horaNum;
    return completado
        ? '<span class="tanda-estado completado"><span class="dot"></span>Completado</span>'
        : '<span class="tanda-estado pendiente"><span class="dot"></span>Pendiente</span>';
}

// Los números que se pintan: individuales (dígito a dígito), adicionales o el
// número ganador a secas. En La Diaria son cuatro valores —número, signo,
// multiplicador y Más 1— y cada uno lleva su propia esfera.
export function numerosDeSorteo(datos) {
    if (datos.numeros_individuales && datos.numeros_individuales.length > 0) {
        return datos.numeros_individuales;
    }
    if (datos.numeros_adicionales && datos.numeros_adicionales.length > 0) {
        return datos.numeros_adicionales;
    }
    return datos.numero_ganador ? [datos.numero_ganador] : [];
}

// Los valores tal como los canta la lotería, sin partir en dígitos. Para el
// texto —schema, descripciones— "001" dice más que "0 · 0 · 1"; las esferas de
// la tarjeta sí quieren un dígito por bola y usan numerosDeSorteo().
export function numerosParaTexto(datos) {
    if (datos.numeros_adicionales && datos.numeros_adicionales.length > 0) {
        return datos.numeros_adicionales;
    }
    if (datos.numero_ganador) return [datos.numero_ganador];
    return datos.numeros_individuales || [];
}

export function nombreBaseJuego(datos) {
    return String(datos.nombre_juego || '')
        .replace(/\s*(11:00 AM|3:00 PM|9:00 PM|10:00 AM|2:00 PM)/gi, '')
        .trim();
}

export function tarjetaHTML(key, datos, referencia = new Date()) {
    const juego = escaparHTML(canonicalizar(normalizarNombre(obtenerJuegoBase(key))));

    if (!datos.fecha_sorteo) {
        return `<div class="game-card resultado-anterior" data-juego="${juego}">
            <div class="game-header">
                <div class="game-title-row">
                    <div class="game-name">${escaparHTML(datos.nombre_juego)}</div>
                </div>
            </div>
            <div class="pendiente">${icono('clock', 'w-5 h-5 inline-block mr-2')}Próximamente</div>
        </div>`;
    }

    const clase      = esFechaHoy(datos.fecha_sorteo, referencia) ? 'game-card' : 'game-card resultado-anterior';
    const nombreBase = nombreBaseJuego(datos);
    const logoSrc    = resolverLogo(key);
    const logoHTML   = logoSrc
        ? `<img src="${logoSrc}" alt="${escaparHTML(nombreBase)}" class="game-logo"
               width="72" height="72" loading="lazy" decoding="async">`
        : '';

    const numeros = numerosDeSorteo(datos);

    const contenidoPrincipal = numeros.length > 0
        ? `<div class="numeros-container">
                <div class="numeros-titulo">NÚMEROS GANADORES</div>
                <div class="numeros-grid">
                    ${numeros.map((num, i) => {
                        const esTexto = isNaN(num) || String(num).trim() === '';
                        return `<div class="bola ${esTexto ? 'texto' : ''}" style="animation-delay:${(i * 0.1).toFixed(1)}s">${escaparHTML(num)}</div>`;
                    }).join('')}
                </div>
            </div>`
        : `<div class="pendiente">${icono('clock', 'w-5 h-5 inline-block mr-2')}Pendiente</div>`;

    const sinResultado = !datos.numero_ganador
        && (!datos.numeros_adicionales || datos.numeros_adicionales.length === 0);

    return `<div class="${clase}" data-juego="${juego}">
        <div class="game-header">
            <div class="game-title-row">
                <div class="game-name">${escaparHTML(nombreBase)}</div>
                ${logoHTML}
            </div>
            <div class="game-meta">
                <div class="game-date">${icono('calendar', 'w-4 h-4 inline-block mr-1')}${escaparHTML(formatearFechaSorteo(datos.fecha_sorteo, referencia))}</div>
                ${datos.hora_sorteo
                    ? `<div class="game-time">${icono('clock', 'w-4 h-4 inline-block mr-1')}${escaparHTML(datos.hora_sorteo)}</div>`
                    : ''}
            </div>
        </div>
        ${contenidoPrincipal}
        ${sinResultado
            ? `<div style="text-align:center;">
                <span class="estado-badge">${icono('clock', 'w-4 h-4 inline-block mr-1')}Próximamente</span>
               </div>`
            : ''}
    </div>`;
}

// HTML completo del interior de #contenido. Devuelve '' cuando no hay nada que
// pintar, para que quien llama decida qué poner en su lugar.
export function seccionesHTML(sorteos, tipoJuego = 'todos', referencia = new Date()) {
    const filtrados = filtrarSorteos(sorteos, tipoJuego);
    if (Object.keys(filtrados).length === 0) return '';

    const grupos             = agruparPorTanda(ordenarPorFechaYHora(filtrados, referencia));
    const esPaginaIndividual = tipoJuego !== 'todos';

    return Object.entries(TANDAS).map(([tandaKey, info]) => {
        const lista = grupos[tandaKey];
        if (!lista || lista.length === 0) return '';

        const etiqueta = info.hora ? `${info.label} - ${info.hora}` : info.label;
        const claseGrid = esPaginaIndividual || lista.length <= 3
            ? 'sorteo-grid horizontal'
            : 'sorteo-grid';

        return `<div class="sorteo-section">
            <h2 class="sorteo-header">${icono(info.icono, 'w-6 h-6 inline-block mr-2')}${etiqueta}${estadoTandaHTML(info.horaNum, referencia)}</h2>
            <div class="${claseGrid}">${lista.map(([key, datos]) => tarjetaHTML(key, datos, referencia)).join('')}</div>
        </div>`;
    }).join('');
}
