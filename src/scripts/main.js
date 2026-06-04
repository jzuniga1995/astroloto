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
// JUEGOS PRINCIPALES (tienen tanda _11am/_3pm/_9pm)
// ============================================

const JUEGOS_PRINCIPALES = ['juga3', 'pega3', 'premia2', 'la_diaria', 'multi_x'];

function obtenerJuegoBase(key) {
    return key.toLowerCase().replace(/_(11am|3pm|9pm)$/, '');
}

function esPrincipal(key) {
    return JUEGOS_PRINCIPALES.includes(obtenerJuegoBase(key));
}

// Normaliza logo_url eliminando el sufijo de tanda del nombre de archivo
// ej: /logos/juga3_11am.png → /logos/juga3.png
function normalizarLogo(logo_url) {
    if (!logo_url) return '';
    return logo_url.replace(/_(11am|3pm|9pm)(\.[^.]+)$/, '$2');
}

// ============================================
// FILTRAR SORTEOS POR TIPO
// ============================================

function filtrarSorteos(sorteos, tipoJuego) {
    if (tipoJuego === 'todos') return sorteos;
    const filtrados = {};
    for (const [key, value] of Object.entries(sorteos)) {
        if (obtenerJuegoBase(key).includes(tipoJuego)) {
            filtrados[key] = value;
        }
    }
    return filtrados;
}

// ============================================
// AGRUPAR SORTEOS POR TANDA (sufijo de la key)
// ============================================

const TANDAS = {
    '_11am': { label: 'SORTEO DE LA MAÑANA',  hora: '11:00 AM', icono: 'sunrise' },
    '_3pm':  { label: 'SORTEO DE LA TARDE',   hora: '3:00 PM',  icono: 'sun'     },
    '_9pm':  { label: 'SORTEO DE LA NOCHE',   hora: '9:00 PM',  icono: 'moon'    },
    'otros': { label: 'OTROS JUEGOS',          hora: null,       icono: 'layers'  }
};

function detectarTanda(key) {
    const k = key.toLowerCase();
    if (k.endsWith('_11am')) return '_11am';
    if (k.endsWith('_3pm'))  return '_3pm';
    if (k.endsWith('_9pm'))  return '_9pm';
    return 'otros';
}

function agruparPorTanda(sorteos) {
    const grupos = { '_11am': [], '_3pm': [], '_9pm': [], 'otros': [] };
    sorteos.forEach(entrada => {
        const key = entrada[0];
        // Solo los 5 juegos principales van en sus tandas; el resto a "otros"
        const tanda = esPrincipal(key) ? detectarTanda(key) : 'otros';
        grupos[tanda].push(entrada);
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
    Object.values(sorteos).forEach(datos => {
        const src = normalizarLogo(datos.logo_url);
        if (src && src.startsWith('/logos/')) logosUnicos.add(src);
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

    if (!datos.fecha_sorteo) {
        card.className = 'game-card';
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

    const fechaHoy = new Date();
    const [dia, mes, año] = datos.fecha_sorteo.split('-').map(Number);
    const fechaSorteo = new Date(año || fechaHoy.getFullYear(), mes - 1, dia);
    const esAnterior  = datos.estado === 'anterior' ||
                        fechaSorteo < new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), fechaHoy.getDate());

    card.className = esAnterior ? 'game-card resultado-anterior' : 'game-card';

    const nombreBase = datos.nombre_juego
        .replace(/\s*(11:00 AM|3:00 PM|9:00 PM|10:00 AM|2:00 PM)/gi, '')
        .trim();

    const logoSrc  = normalizarLogo(datos.logo_url);
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

    if (numeros.length > 0) {
        const titulo = key.toLowerCase().includes('diaria')
            ? 'NÚMERO · SIGNO · MULTIPLICADOR'
            : 'NÚMEROS GANADORES';
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
        '9:00 PM':  3, '21:00':    3
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
            header.innerHTML = `<i data-lucide="${tandaInfo.icono}" class="w-6 h-6 inline-block mr-2"></i>${etiqueta}`;

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

