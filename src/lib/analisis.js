// ============================================
// ANALIZADOR IA — render compartido build ↔ navegador
// ============================================
//
// Mismo trato que `sorteos.js`: sin DOM y sin `window`, para que el HTML que
// deja el build y el que repinta el navegador salgan de la misma función y no
// puedan divergir. Antes el banner se armaba sólo en el cliente, así que la
// primera pintura era un skeleton y el contenido —que es texto real, útil y
// rastreable— no existía para nadie que no ejecutara JavaScript.

import { icono } from './iconos.js';
import { escaparHTML, normalizarNombre } from './sorteos.js';

// Orden de las pestañas y nombre que ve el visitante. El backend nombra las
// claves con guiones bajos (`pega_3`, `la_diaria`) y los ha cambiado de forma
// alguna vez, así que se buscan normalizadas y no por igualdad exacta.
const CATALOGO = [
    { id: 'juga3',       nombre: 'Jugá 3',       alias: ['juga3'] },
    { id: 'pega3',       nombre: 'Pega 3',       alias: ['pega3'] },
    { id: 'premia2',     nombre: 'Premia 2',     alias: ['premia2'] },
    { id: 'ladiaria',    nombre: 'La Diaria',    alias: ['ladiaria', 'diaria'] },
    { id: 'superpremio', nombre: 'Súper Premio', alias: ['superpremio'] },
];

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const AVISO_POR_DEFECTO =
    'Son frecuencias del historial, no predicciones: cada sorteo es independiente. Jugá con responsabilidad.';

// "2026-09-18" → "Jueves 18 de septiembre". Se construye con el constructor de
// componentes (no con Date.parse) para que el día de la semana no dependa de la
// zona horaria: en el build corre en UTC y en el navegador en la del visitante.
export function fechaLegible(fecha) {
    const [year, mes, dia] = String(fecha || '').split('-').map(Number);
    if (!year || !mes || !dia) return '';
    const d = new Date(year, mes - 1, dia);
    if (isNaN(d.getTime())) return '';
    const nombre = DIAS[d.getDay()];
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${dia} de ${MESES[mes - 1]}`;
}

// Una sugerencia puede llegar como "803", como "11-58-88" o ya partida en
// array. Sale siempre como lista de valores, uno por esfera.
//
// El render viejo no hacía esta distinción: con Pega 3 pintaba una sola píldora
// con el texto "11-58-88" dentro, y con Jugá 3 juntaba tres sugerencias
// distintas en una misma fila, como si fueran una combinación de tres números.
export function separarValores(sugerencia) {
    const lista = Array.isArray(sugerencia) ? sugerencia : String(sugerencia).split(/[-–—/,·]+/);
    return lista.map(v => String(v).trim()).filter(Boolean);
}

// El JSON crudo del backend → lo que necesita el render, en orden fijo.
export function normalizarAnalisis(json) {
    const crudos = (json && json.juegos) || {};
    const pendientes = new Map(Object.entries(crudos));
    const juegos = [];

    const agregar = (id, nombre, clave, datos) => {
        if (!datos || typeof datos !== 'object') return;
        const sugerencias = (Array.isArray(datos.sugerencias) ? datos.sugerencias : [])
            .map(separarValores)
            .filter(combo => combo.length > 0);

        juegos.push({
            id,
            clave,
            nombre,
            patrones:   String(datos.patrones   || '').trim(),
            tendencias: String(datos.tendencias || '').trim(),
            aviso:      String(datos.advertencia || '').trim() || AVISO_POR_DEFECTO,
            analizados: Number(datos.sorteos_analizados) || 0,
            sugerencias,
        });
    };

    for (const entrada of CATALOGO) {
        for (const [clave, datos] of pendientes) {
            if (!entrada.alias.includes(normalizarNombre(clave))) continue;
            agregar(entrada.id, entrada.nombre, clave, datos);
            pendientes.delete(clave);
            break;
        }
    }

    // Un juego que el backend agregue mañana no se queda fuera del banner.
    for (const [clave, datos] of pendientes) {
        agregar(normalizarNombre(clave), clave, clave, datos);
    }

    return {
        fecha: String((json && json.fecha) || ''),
        generadoEn: String((json && json.generado_en) || ''),
        juegos,
    };
}

// Huella del contenido: el cliente la compara con la del build para no repintar
// —ni reiniciar las animaciones— cuando el análisis sigue siendo el mismo.
export function firmaAnalisis(datos) {
    if (!datos || !datos.juegos || datos.juegos.length === 0) return '';
    return [datos.fecha, datos.generadoEn, datos.juegos.map(j =>
        `${j.id}:${j.patrones}:${j.tendencias}:${j.sugerencias.map(c => c.join('-')).join('|')}`
    ).join(';')].join('#');
}

// ============================================
// HTML
// ============================================

function esferasHTML(valores) {
    return valores.map((valor, i) => {
        const texto = String(valor);
        const esNumero = /^\d+$/.test(texto);
        return `<span class="an-esfera${esNumero ? '' : ' texto'}"`
             + ` style="animation-delay:${(i * 0.06).toFixed(2)}s">${escaparHTML(texto)}</span>`;
    }).join('');
}

function sugerenciasHTML(juego) {
    if (juego.sugerencias.length === 0) {
        return `<p class="an-sin-sugerencias">Todavía no hay combinaciones sugeridas para este juego.</p>`;
    }
    const filas = juego.sugerencias.map((combo, i) => `
                    <li class="an-sug">
                        <span class="an-sug-n">${i + 1}</span>
                        <span class="an-esferas">${esferasHTML(combo)}</span>
                    </li>`).join('');

    return `<div class="an-sug-caja">
                    <ol class="an-sug-lista">${filas}
                    </ol>
                    <div class="an-candado">
                        <p class="an-candado-txt">${icono('candado', 'an-ico')}<span>${juego.sugerencias.length} combinaciones listas</span></p>
                        <button class="an-btn" type="button" data-accion="revelar">Ver sugerencias de hoy</button>
                    </div>
                </div>`;
}

function lecturaHTML(nombreIcono, titulo, texto) {
    if (!texto) return '';
    return `<div class="an-lectura">
                        <span class="an-lectura-ico">${icono(nombreIcono, 'an-ico')}</span>
                        <div>
                            <h3 class="an-lectura-tit">${escaparHTML(titulo)}</h3>
                            <p class="an-lectura-txt">${escaparHTML(texto)}</p>
                        </div>
                    </div>`;
}

function panelHTML(juego, activo) {
    const muestra = juego.analizados > 0
        ? `<p class="an-muestra">Calculado sobre los últimos ${juego.analizados} sorteos publicados.</p>`
        : '';

    return `<div class="an-panel" id="an-panel-${escaparHTML(juego.id)}" role="tabpanel"
             aria-labelledby="an-tab-${escaparHTML(juego.id)}" tabindex="0"${activo ? '' : ' hidden'}>
                <div class="an-lecturas">
                    ${lecturaHTML('grafico', 'Patrones', juego.patrones)}
                    ${lecturaHTML('tendencia', 'Tendencias', juego.tendencias)}
                    ${muestra}
                </div>
                <div class="an-sugerencias">
                    <h3 class="an-sug-tit">${icono('diana', 'an-ico')}Sugerencias para ${escaparHTML(juego.nombre)}</h3>
                    ${sugerenciasHTML(juego)}
                </div>
            </div>`;
}

// Cuerpo completo del banner: cabecera, pestañas y paneles. El contenedor y los
// estilos los pone el componente; acá sólo sale el contenido, que es lo que el
// cliente reemplaza cuando llega un análisis nuevo.
export function analizadorHTML(datos, { activo = '' } = {}) {
    const juegos = (datos && datos.juegos) || [];
    if (juegos.length === 0) return '';

    const idActivo = juegos.some(j => j.id === activo) ? activo : juegos[0].id;
    const fecha = fechaLegible(datos.fecha);
    // El backend manda la misma advertencia en todos los juegos: va una sola vez
    // y fuera de las pestañas, porque es lo único del banner que no debería
    // depender de qué juego estás mirando.
    const aviso = juegos.find(j => j.aviso)?.aviso || AVISO_POR_DEFECTO;

    const tabs = juegos.map(juego => {
        const esActivo = juego.id === idActivo;
        return `<button class="an-tab" type="button" role="tab"
                    id="an-tab-${escaparHTML(juego.id)}"
                    aria-controls="an-panel-${escaparHTML(juego.id)}"
                    aria-selected="${esActivo}" tabindex="${esActivo ? '0' : '-1'}"
                    data-id="${escaparHTML(juego.id)}">${escaparHTML(juego.nombre)}</button>`;
    }).join('');

    return `<div class="an-cabecera">
            <span class="an-marca">${icono('chispas', 'an-ico-marca')}</span>
            <div class="an-titulos">
                <h2 class="an-titulo">Analizador de números</h2>
                <p class="an-sub">${fecha
                    ? `Frecuencias del historial · ${escaparHTML(fecha)}`
                    : 'Frecuencias calculadas sobre el historial de sorteos'}</p>
            </div>
        </div>
        <div class="an-tabs" role="tablist" aria-label="Juego a analizar">${tabs}</div>
        <div class="an-paneles">${juegos.map(j => panelHTML(j, j.id === idActivo)).join('')}</div>
        <p class="an-aviso">${icono('alerta', 'an-ico')}<span>${escaparHTML(aviso)}</span></p>`;
}
