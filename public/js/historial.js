// ============================================
// HISTORIAL — historial.js
// ============================================

const HISTORIAL_URL = '/api/historial';

// ============================================
// UTILIDADES
// ============================================

function formatearFechaLegible(fechaKey) {
    // fechaKey viene como '2026-03-05'
    const [year, mes, dia] = fechaKey.split('-').map(Number);
    const fecha = new Date(year, mes - 1, dia);
    const dias  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${dias[fecha.getDay()]} ${dia} de ${meses[mes - 1]} de ${year}`;
}

function esHoy(fechaKey) {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    return fechaKey === fechaHoy;
}

// ============================================
// CREAR CARD DE JUEGO (reutiliza estilos de bola)
// ============================================

function crearCardHistorial(key, datos) {
    const card = document.createElement('div');
    card.className = 'game-card';

    const nombreBase = datos.nombre_juego
        .replace(/\s*(11:00 AM|3:00 PM|9:00 PM)/gi, '')
        .trim();

    const logoHTML = datos.logo_url
        ? `<img src="${datos.logo_url}" alt="${nombreBase}" class="game-logo" width="56" height="56" loading="lazy">`
        : '';

    let bolasHTML = '';

    if (key.includes('juga3')) {
        const digitos = datos.numeros_individuales.length ? datos.numeros_individuales : list(datos.numero_ganador);
        bolasHTML = `
            <div class="numeros-titulo">NÚMEROS GANADORES</div>
            <div class="numeros-individuales">
                ${digitos.map((n, i) => `<div class="bola" style="animation-delay:${i * 0.1}s">${n}</div>`).join('')}
            </div>`;
    } else {
        const numeros = datos.numeros_adicionales || [];
        const titulo  = key.includes('diaria') ? 'NÚMERO · SIGNO · MULTIPLICADOR' : 'NÚMEROS GANADORES';
        bolasHTML = `
            <div class="numeros-titulo">${titulo}</div>
            <div class="numeros-grid">
                ${numeros.map((n, i) => {
                    const esTexto = isNaN(n);
                    return `<div class="bola ${esTexto ? 'texto' : ''}" style="animation-delay:${i * 0.1}s">${n}</div>`;
                }).join('')}
            </div>`;
    }

    card.innerHTML = `
        <div class="game-header">
            <div class="game-title-row">
                <div class="game-name">${nombreBase}</div>
                ${logoHTML}
            </div>
            ${datos.hora_sorteo ? `<div class="game-meta"><div class="game-time"><i data-lucide="clock" class="w-4 h-4 inline-block mr-1"></i>${datos.hora_sorteo}</div></div>` : ''}
        </div>
        <div class="numeros-container">${bolasHTML}</div>
    `;

    return card;
}

// ============================================
// ORDENAR JUEGOS DENTRO DE UN DÍA
// ============================================

function ordenarJuegosDelDia(sorteos) {
    const ordenTipo  = ['juga3', 'pega3', 'premia2', 'diaria', 'super'];
    const ordenHora  = { '11:00 AM': 1, '3:00 PM': 2, '9:00 PM': 3 };

    return Object.entries(sorteos).sort((a, b) => {
        const [keyA, dA] = a;
        const [keyB, dB] = b;
        const horaA = ordenHora[dA.hora_sorteo] || 4;
        const horaB = ordenHora[dB.hora_sorteo] || 4;
        if (horaA !== horaB) return horaA - horaB;
        const tipoA = ordenTipo.findIndex(t => keyA.includes(t));
        const tipoB = ordenTipo.findIndex(t => keyB.includes(t));
        return tipoA - tipoB;
    });
}

// ============================================
// AGRUPAR POR TANDA DENTRO DE UN DÍA
// ============================================

function agruparPorTanda(sorteos) {
    const tandas = { '11:00 AM': [], '3:00 PM': [], '9:00 PM': [], 'super': [] };

    sorteos.forEach(([key, datos]) => {
        if (key.includes('super')) {
            tandas['super'].push([key, datos]);
        } else {
            const hora = datos.hora_sorteo;
            if (tandas[hora]) tandas[hora].push([key, datos]);
        }
    });
    return tandas;
}

// ============================================
// RENDER DE UN DÍA (acordeón item)
// ============================================

function crearItemAcordeon(fechaKey, sorteos, abierto = false) {
    const item = document.createElement('div');
    item.className = 'historial-item';

    const totalSorteos = Object.keys(sorteos).length;
    const etiquetaHoy  = esHoy(fechaKey) ? ' <span class="badge-hoy">HOY</span>' : '';

    const header = document.createElement('div');
    header.className = `historial-header ${abierto ? 'abierto' : ''}`;
    header.innerHTML = `
        <div class="historial-fecha-info">
            <i data-lucide="calendar" class="w-5 h-5"></i>
            <span class="historial-fecha-texto">${formatearFechaLegible(fechaKey)}${etiquetaHoy}</span>
            <span class="historial-badge">${totalSorteos} sorteos</span>
        </div>
        <i data-lucide="chevron-down" class="w-5 h-5 historial-chevron"></i>
    `;

    const contenido = document.createElement('div');
    contenido.className = `historial-contenido ${abierto ? 'abierto' : ''}`;

    const sorteosOrdenados = ordenarJuegosDelDia(sorteos);
    const tandas = agruparPorTanda(sorteosOrdenados);

    const nombresTanda = { '11:00 AM': 'MAÑANA', '3:00 PM': 'TARDE', '9:00 PM': 'NOCHE', 'super': 'SÚPER PREMIO' };
    const iconosTanda  = { '11:00 AM': 'sunrise', '3:00 PM': 'sun', '9:00 PM': 'moon', 'super': 'trophy' };

    ['11:00 AM', '3:00 PM', '9:00 PM', 'super'].forEach(tanda => {
        const juegos = tandas[tanda];
        if (!juegos || juegos.length === 0) return;

        const seccion = document.createElement('div');
        seccion.className = 'historial-tanda';

        const tituloTanda = document.createElement('div');
        tituloTanda.className = 'historial-tanda-titulo';
        tituloTanda.innerHTML = `
            <i data-lucide="${iconosTanda[tanda]}" class="w-4 h-4 inline-block mr-1"></i>
            ${nombresTanda[tanda]}${tanda !== 'super' ? ` - ${tanda}` : ''}
        `;

        const grid = document.createElement('div');
        grid.className = 'sorteo-grid horizontal';

        juegos.forEach(([key, datos]) => {
            grid.appendChild(crearCardHistorial(key, datos));
        });

        seccion.appendChild(tituloTanda);
        seccion.appendChild(grid);
        contenido.appendChild(seccion);
    });

    // Toggle acordeón
    header.addEventListener('click', () => {
        const estaAbierto = header.classList.toggle('abierto');
        contenido.classList.toggle('abierto', estaAbierto);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    item.appendChild(header);
    item.appendChild(contenido);
    return item;
}

// ============================================
// CARGAR HISTORIAL
// ============================================

async function cargarHistorial() {
    const contenedor = document.getElementById('historial-contenido');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="sorteo-section">
            <div class="sorteo-grid">
                ${[1,2,3].map(() => `
                    <div class="game-card skeleton">
                        <div class="skeleton-line" style="width:60%;height:24px;"></div>
                        <div class="skeleton-line" style="width:40%;height:16px;margin-top:8px;"></div>
                        <div style="display:flex;gap:8px;margin-top:20px;">
                            <div class="skeleton-circle"></div>
                            <div class="skeleton-circle"></div>
                            <div class="skeleton-circle"></div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;

    try {
        const resp = await fetch(`${HISTORIAL_URL}?t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!resp.ok) throw new Error('No se pudo cargar el historial');

        const historial = await resp.json();
        contenedor.innerHTML = '';

        // Ordenar fechas de más reciente a más antigua
        const fechas = Object.keys(historial).sort((a, b) => b.localeCompare(a));

        if (fechas.length === 0) {
            contenedor.innerHTML = `<div class="error-message">No hay historial disponible aún.</div>`;
            return;
        }

        fechas.forEach((fechaKey, index) => {
            const sorteos = historial[fechaKey];
            if (Object.keys(sorteos).length === 0) return;
            // El primero (más reciente) abierto por defecto
            const item = crearItemAcordeon(fechaKey, sorteos, index === 0);
            contenedor.appendChild(item);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = `
            <div class="error-message">
                <i data-lucide="alert-triangle" class="w-6 h-6 inline-block mr-2"></i>
                Error al cargar el historial<br><small>${error.message}</small>
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ============================================
// INIT
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('historial-contenido')) cargarHistorial();
    });
} else {
    if (document.getElementById('historial-contenido')) cargarHistorial();
}

