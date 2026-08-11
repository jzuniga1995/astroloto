// ============================================
// CONFIGURACIÓN
// ============================================

const JSON_URL = '/api/resultados-v2';

const DATOS_EMBEBIDOS = null;

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
    const ahora = new Date();
    const offsetHonduras = -6;
    const utc = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const horaHonduras = new Date(utc + (3600000 * offsetHonduras));
    
    const horas   = String(horaHonduras.getHours()).padStart(2, '0');
    const minutos = String(horaHonduras.getMinutes()).padStart(2, '0');
    const segundos = String(horaHonduras.getSeconds()).padStart(2, '0');
    
    const relojElement = document.getElementById('relojHonduras');
    if (relojElement) {
        relojElement.textContent = `${horas}:${minutos}:${segundos}`;
    }
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
// UTILIDADES
// ============================================

function formatearFecha() {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fecha = new Date();
    return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

function formatearFechaSorteo(fechaSorteo) {
    if (fechaSorteo && fechaSorteo.split('-').length === 3) {
        return fechaSorteo;
    }
    
    const [dia, mes] = fechaSorteo.split('-').map(Number);
    const ahora = new Date();
    const yearActual  = ahora.getFullYear();
    const mesActual   = ahora.getMonth() + 1;
    const diaActual   = ahora.getDate();
    
    let year = yearActual;
    if (mes < mesActual || (mes === mesActual && dia < diaActual)) {
        year = yearActual;
    } else if (mes > mesActual || (mes === mesActual && dia > diaActual)) {
        year = yearActual - 1;
    }
    
    return `${fechaSorteo}-${year}`;
}

// ============================================
// JUEGOS PRINCIPALES Y LOGOS
// ============================================

// Normaliza nombre quitando underscores/espacios: pega_3 → pega3, la_diaria → ladiaria
function normalizarNombre(str) {
    return str.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
}

// Quita el sufijo de tanda (_11am, _10am, _3pm, _2pm, _9pm)
function obtenerJuegoBase(key) {
    return key.toLowerCase().replace(/_(11am|10am|3pm|2pm|9pm)$/, '');
}

const JUEGOS_PRINCIPALES_NORM = ['juga3', 'pega3', 'premia2', 'ladiaria', 'diaria'];

// Mapea variantes al nombre canónico para deduplicación
function canonicalizar(normName) {
    if (normName === 'diaria') return 'ladiaria';
    return normName;
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

function resolverLogo(key) {
    return LOGO_MAP[normalizarNombre(obtenerJuegoBase(key))] || '';
}

// Devuelve true si fecha_sorteo corresponde a hoy en Honduras (UTC-6)
function esFechaHoy(fechaSorteo) {
    if (!fechaSorteo) return false;
    const ahora = new Date();
    const hn = new Date(ahora.getTime() + (ahora.getTimezoneOffset() * 60000) + 3600000 * -6);
    const [dia, mes] = fechaSorteo.split('-').map(Number);
    return dia === hn.getDate() && mes === (hn.getMonth() + 1);
}

// ============================================
// FILTRAR SORTEOS POR TIPO
// ============================================

function filtrarSorteos(sorteos, tipoJuego) {
    if (tipoJuego === 'todos') return sorteos;
    const filtrados = {};
    for (const [key, value] of Object.entries(sorteos)) {
        if (normalizarNombre(obtenerJuegoBase(key)).includes(tipoJuego)) {
            filtrados[key] = value;
        }
    }
    return filtrados;
}

// ============================================
// AGRUPAR SORTEOS POR TANDA (sufijo de la key)
// ============================================

const TANDAS = {
    '_11am': { label: 'SORTEO DE LA MAÑANA',  hora: '11:00 AM', icono: 'sunrise', horaNum: 11 },
    // Bingo con Todo y Multi X ya no existen: la fuente dejó de publicarlos
    '_3pm':  { label: 'SORTEO DE LA TARDE',   hora: '3:00 PM',  icono: 'sun',     horaNum: 15 },
    '_9pm':  { label: 'SORTEO DE LA NOCHE',   hora: '9:00 PM',  icono: 'moon',    horaNum: 21 },
    'otros': { label: 'OTROS JUEGOS',          hora: null,       icono: 'layers',  horaNum: null }
};

// Devuelve el HTML del badge de estado de una tanda según la hora actual en Honduras (UTC-6)
function estadoTandaHTML(horaNum) {
    if (horaNum == null) return '';
    const ahora = new Date();
    const utc = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const horaHN = new Date(utc + (3600000 * -6)).getHours();
    const completado = horaHN >= horaNum;
    return completado
        ? '<span class="tanda-estado completado"><span class="dot"></span>Completado</span>'
        : '<span class="tanda-estado pendiente"><span class="dot"></span>Pendiente</span>';
}

// _10am y _2pm son alias de la tanda de mañana y tarde respectivamente
function detectarTanda(key) {
    const k = key.toLowerCase();
    if (k.endsWith('_11am') || k.endsWith('_10am')) return '_11am';
    if (k.endsWith('_3pm')  || k.endsWith('_2pm'))  return '_3pm';
    if (k.endsWith('_9pm'))                          return '_9pm';
    return 'otros';
}

function esPrincipal(key) {
    if (detectarTanda(key) === 'otros') return false;
    return JUEGOS_PRINCIPALES_NORM.includes(normalizarNombre(obtenerJuegoBase(key)));
}

// Juegos que van en "Otros Juegos" (sin tanda diaria fija)
const OTROS_PERMITIDOS = new Set(['superpremio']);

function agruparPorTanda(sorteos) {
    const grupos  = { '_11am': [], '_3pm': [], '_9pm': [], 'otros': [] };
    const vistos  = new Set(); // deduplicar: gameNorm+tanda

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

function preloadLogos(sorteos) {
    const logosUnicos = new Set();
    Object.entries(sorteos).forEach(([key, datos]) => {
        const src = resolverLogo(key);
        if (src) logosUnicos.add(src);
    });
    logosUnicos.forEach(logoUrl => {
        if (!logosPreloadCache.has(logoUrl)) {
            const link = document.createElement('link');
            link.rel  = 'preload';
            link.as   = 'image';
            link.href = logoUrl;
            document.head.appendChild(link);
            logosPreloadCache.add(logoUrl);
        }
    });
}

// ============================================
// CREAR CARDS DE JUEGOS
// ============================================

function crearCardJuego(key, datos) {
    const card = document.createElement('div');
    card.dataset.juego = canonicalizar(normalizarNombre(obtenerJuegoBase(key)));

    if (!datos.fecha_sorteo) {
        card.className = 'game-card resultado-anterior';
        card.innerHTML = `
            <div class="game-header">
                <div class="game-title-row">
                    <div class="game-name">${datos.nombre_juego}</div>
                </div>
            </div>
            <div class="pendiente">
                <i data-lucide="clock" class="w-5 h-5 inline-block mr-2"></i>Próximamente
            </div>`;
        return card;
    }

    card.className = esFechaHoy(datos.fecha_sorteo) ? 'game-card' : 'game-card resultado-anterior';

    const nombreBase = datos.nombre_juego
        .replace(/\s*(11:00 AM|3:00 PM|9:00 PM|10:00 AM|2:00 PM)/gi, '')
        .trim();

    const logoSrc  = resolverLogo(key);
    const logoHTML = logoSrc
        ? `<img src="${logoSrc}" alt="${nombreBase}" class="game-logo"
               width="72" height="72" loading="lazy" decoding="async">`
        : '';

    // Determinar qué números mostrar: individuales (3 dígitos separados), adicionales, o número ganador
    const tieneIndividuales = datos.numeros_individuales && datos.numeros_individuales.length > 0;
    const tieneAdicionales  = datos.numeros_adicionales  && datos.numeros_adicionales.length  > 0;
    const numeros = tieneIndividuales ? datos.numeros_individuales
                  : tieneAdicionales  ? datos.numeros_adicionales
                  : datos.numero_ganador ? [datos.numero_ganador]
                  : [];

    let contenidoPrincipal = '';

    const esDiaria = normalizarNombre(obtenerJuegoBase(key)) === 'ladiaria'
                  || normalizarNombre(obtenerJuegoBase(key)) === 'diaria';

    if (numeros.length > 0) {
        if (esDiaria && numeros.length >= 2) {
            // La Diaria: primeros N-1 como bolas normales, último con badge Más 1
            const principales = numeros.slice(0, -1);
            const mas1        = numeros[numeros.length - 1];
            const mas1EsNum   = !isNaN(String(mas1).trim()) && String(mas1).trim() !== '';
            // el Más 1 no se nombra en el título: su bola ya lleva el distintivo
            const tituloDiaria = principales.length >= 3
                ? 'NÚMERO · SIGNO · MULTIPLICADOR'
                : 'NÚMERO · SIGNO';
            contenidoPrincipal = `
                <div class="numeros-container">
                    <div class="numeros-titulo">${tituloDiaria}</div>
                    <div class="numeros-grid">
                        ${principales.map((num, i) => {
                            const esTexto = isNaN(num) || String(num).trim() === '';
                            return `<div class="bola ${esTexto ? 'texto' : ''}" style="animation-delay:${i * 0.1}s">${num}</div>`;
                        }).join('')}
                        <div class="mas1-bola" style="display:inline-flex;flex-direction:row;align-items:center;gap:6px;animation-delay:${principales.length * 0.1}s">
                            <img src="/logos/mas1.png" alt="Más 1" width="32" height="32" style="width:32px;height:32px;object-fit:contain;flex-shrink:0;display:block;">
                            <div class="mas1-num">${mas1}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const titulo = 'NÚMEROS GANADORES';
            contenidoPrincipal = `
                <div class="numeros-container">
                    <div class="numeros-titulo">${titulo}</div>
                    <div class="numeros-grid">
                        ${numeros.map((num, i) => {
                            const esTexto = isNaN(num) || String(num).trim() === '';
                            return `<div class="bola ${esTexto ? 'texto' : ''}" style="animation-delay:${i * 0.1}s">${num}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    } else {
        contenidoPrincipal = `<div class="pendiente"><i data-lucide="clock" class="w-5 h-5 inline-block mr-2"></i>Pendiente</div>`;
    }

    const fechaConAnio = formatearFechaSorteo(datos.fecha_sorteo);

    card.innerHTML = `
        <div class="game-header">
            <div class="game-title-row">
                <div class="game-name">${nombreBase}</div>
                ${logoHTML}
            </div>
            <div class="game-meta">
                <div class="game-date">
                    <i data-lucide="calendar" class="w-4 h-4 inline-block mr-1"></i>${fechaConAnio}
                </div>
                ${datos.hora_sorteo
                    ? `<div class="game-time"><i data-lucide="clock" class="w-4 h-4 inline-block mr-1"></i>${datos.hora_sorteo}</div>`
                    : ''}
            </div>
        </div>
        ${contenidoPrincipal}
        ${!datos.numero_ganador && (!datos.numeros_adicionales || datos.numeros_adicionales.length === 0) ? `
            <div style="text-align:center;">
                <span class="estado-badge">
                    <i data-lucide="clock" class="w-4 h-4 inline-block mr-1"></i>Próximamente
                </span>
            </div>
        ` : ''}
    `;

    return card;
}

// ============================================
// ORDENAR SORTEOS
// ============================================

function ordenarPorFechaYHora(sorteos) {
    const ordenHoras = {
        '11:00 AM': 1, '10:00 AM': 1,
        '3:00 PM':  2, '2:00 PM':  2, '15:00': 2,
        '9:00 PM':  4, '21:00':    4
    };

    return Object.entries(sorteos).sort((a, b) => {
        const [keyA, datosA] = a;
        const [keyB, datosB] = b;

        if (!datosA.fecha_sorteo || !datosB.fecha_sorteo) return 0;

        const [diaA, mesA, yearA = new Date().getFullYear()] = datosA.fecha_sorteo.split('-').map(Number);
        const [diaB, mesB, yearB = new Date().getFullYear()] = datosB.fecha_sorteo.split('-').map(Number);

        if (yearA !== yearB) return yearB - yearA;
        if (mesA  !== mesB)  return mesB  - mesA;
        if (diaA  !== diaB)  return diaB  - diaA;

        const horaA = ordenHoras[datosA.hora_sorteo] || 0;
        const horaB = ordenHoras[datosB.hora_sorteo] || 0;
        return horaA - horaB;
    });
}

// ============================================
// CARGAR RESULTADOS
// ============================================

async function cargarResultados() {
    const contenido = document.getElementById('contenido');
    if (!contenido) return;

    contenido.innerHTML = `
        <div class="sorteo-section">
            <h2 class="sorteo-header">
                <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
                CARGANDO RESULTADOS...
            </h2>
            <div class="sorteo-grid">${crearSkeletonCards(3)}</div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        let data;

        if (DATOS_EMBEBIDOS) {
            data = DATOS_EMBEBIDOS;
        } else {
            const response = await fetch(JSON_URL, {
                cache: 'no-cache'
            });
            if (!response.ok) throw new Error('No se pudieron cargar los resultados.');
            data = await response.json();
        }

        const fechaElement = document.getElementById('fechaActual');
        if (fechaElement) {
            const span = fechaElement.querySelector('span');
            if (span) span.textContent = formatearFecha();
        }

        const sorteos         = data.sorteos || data;
        const tipoJuego       = obtenerTipoJuego();
        const sorteosFiltrados = filtrarSorteos(sorteos, tipoJuego);

        if (Object.keys(sorteosFiltrados).length === 0) {
            contenido.innerHTML = `
                <div class="error-message">
                    <i data-lucide="info" class="w-6 h-6 inline-block mr-2"></i>
                    No hay resultados disponibles todavía.
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        preloadLogos(sorteosFiltrados);

        const sorteosOrdenados   = ordenarPorFechaYHora(sorteosFiltrados);
        const gruposPorTanda     = agruparPorTanda(sorteosOrdenados);
        const esPaginaIndividual = tipoJuego !== 'todos';

        contenido.innerHTML = '';

        Object.entries(TANDAS).forEach(([tandaKey, tandaInfo]) => {
            const lista = gruposPorTanda[tandaKey];
            if (!lista || lista.length === 0) return;

            const section = document.createElement('div');
            section.className = 'sorteo-section';

            const header = document.createElement('h2');
            header.className = 'sorteo-header';
            const etiqueta = tandaInfo.hora
                ? `${tandaInfo.label} - ${tandaInfo.hora}`
                : tandaInfo.label;
            header.innerHTML = `<i data-lucide="${tandaInfo.icono}" class="w-6 h-6 inline-block mr-2"></i>${etiqueta}${estadoTandaHTML(tandaInfo.horaNum)}`;

            const grid = document.createElement('div');
            grid.className = esPaginaIndividual || lista.length <= 3
                ? 'sorteo-grid horizontal'
                : 'sorteo-grid';

            lista.forEach(([key, datos]) => grid.appendChild(crearCardJuego(key, datos)));

            section.appendChild(header);
            section.appendChild(grid);
            contenido.appendChild(section);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error('Error:', error);
        contenido.innerHTML = `
            <div class="error-message">
                <i data-lucide="alert-triangle" class="w-6 h-6 inline-block mr-2"></i>
                Error al cargar los resultados<br>
                <small>${error.message}</small>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } finally {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('contenido')) cargarResultados();
    });
} else {
    if (document.getElementById('contenido')) cargarResultados();
}

// ============================================
// ACTUALIZACIÓN AUTOMÁTICA
// ============================================

function obtenerIntervaloActualizacion() {
    const ahora = new Date();
    const utc   = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const horaHN = new Date(utc + (3600000 * -6));
    const hour   = horaHN.getHours();
    const minute = horaHN.getMinutes();

    if (
        (hour === 11 && minute <= 30) ||
        (hour === 15 && minute <= 30) ||
        (hour === 21 && minute <= 30)
    ) {
        return 1 * 60 * 1000;  // cada 1 min cerca de los sorteos
    }
    return 5 * 60 * 1000;      // cada 5 min el resto del día
}

function programarSiguienteActualizacion() {
    setTimeout(() => {
        if (document.getElementById('contenido')) cargarResultados();
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

