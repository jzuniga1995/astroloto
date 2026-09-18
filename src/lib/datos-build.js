// ============================================
// DATOS EN TIEMPO DE BUILD
// ============================================
//
// El sitio es estático: hasta ahora el resultado lo pedía sólo el navegador,
// así que el HTML que recibía un bot sin JS no traía ningún número. Acá se pide
// el mismo JSON durante `astro build` y el resultado queda escrito en el HTML.
// El cliente sigue refrescando encima, así que un visitante nunca ve un dato
// más viejo que el del último despliegue.
//
// Reglas de la casa:
//  - Esto NO puede tumbar el build. Si la API no responde se devuelve null y
//    las páginas caen al render por JS de siempre.
//  - Una sola petición por build: el resultado se cachea en globalThis porque
//    astro.config.mjs y el render de páginas comparten proceso pero no
//    necesariamente el mismo grafo de módulos.

import { momentoDelDato } from './sorteos.js';

const FUENTES = [
    // Producción: la API que ya consume el navegador (Cloudflare al frente).
    process.env.LOTO_API_URL || 'https://lotohn.com/api/resultados-v2',
    // Respaldo: el mismo archivo, sin el Worker en medio. La API no transforma
    // nada —sólo reenvía este JSON—, así que el respaldo no devuelve un dato
    // peor, devuelve el mismo.
    'https://raw.githubusercontent.com/jzuniga1995/lotohn/main/resultados_hoy.json',
];

// El análisis del día sale del mismo backend y por los mismos dos caminos.
// Incrustarlo en el build es lo que quita el salto del skeleton: el banner ya
// llega escrito y el navegador sólo lo pone al día.
const FUENTES_ANALISIS = [
    process.env.LOTO_ANALISIS_URL || 'https://lotohn.com/api/analizar',
    'https://raw.githubusercontent.com/jzuniga1995/lotohn/main/analisis.json',
];

const TIMEOUT_MS = 8000;
const CLAVE_CACHE = Symbol.for('lotohn.datos-build');
const CLAVE_CACHE_ANALISIS = Symbol.for('lotohn.datos-build.analisis');

async function pedir(url) {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), TIMEOUT_MS);
    try {
        const resp = await fetch(url, {
            signal: control.signal,
            headers: { 'accept': 'application/json', 'user-agent': 'lotohn-build' },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } finally {
        clearTimeout(corte);
    }
}

async function cargar() {
    for (const url of FUENTES) {
        try {
            const json = await pedir(url);
            const sorteos = json.sorteos || json;
            if (!sorteos || typeof sorteos !== 'object' || Object.keys(sorteos).length === 0) {
                throw new Error('respuesta sin sorteos');
            }
            const ms = momentoDelDato(json);
            const actualizado = ms ? new Date(ms) : null;
            console.log(`[lotohn] Resultados embebidos desde ${url}`
                      + ` (${Object.keys(sorteos).length} sorteos`
                      + `${actualizado ? `, dato de ${actualizado.toISOString()}` : ''})`);
            return { sorteos, actualizado, origen: url };
        } catch (error) {
            console.warn(`[lotohn] No se pudo leer ${url}: ${error.message}`);
        }
    }

    console.warn('[lotohn] Ninguna fuente respondió: el HTML sale sin resultado '
               + 'y el navegador lo pinta como antes.');
    return { sorteos: null, actualizado: null, origen: null };
}

export function obtenerResultados() {
    if (!globalThis[CLAVE_CACHE]) {
        globalThis[CLAVE_CACHE] = cargar();
    }
    return globalThis[CLAVE_CACHE];
}

// Fecha que representa "cuándo cambió esta página por última vez". Con datos,
// el momento del sorteo; sin datos, el del despliegue —que es lo más honesto
// que se puede decir de un HTML recién generado.
export function fechaModificacion({ actualizado }) {
    return (actualizado || new Date()).toISOString();
}

// ============================================
// ANÁLISIS IA EN TIEMPO DE BUILD
// ============================================
//
// Mismas reglas que los resultados: una sola petición por build, nunca lanza y
// si ninguna fuente responde se devuelve null para que el banner lo pinte el
// navegador como venía haciéndolo.

async function cargarAnalisis() {
    for (const url of FUENTES_ANALISIS) {
        try {
            const json = await pedir(url);
            if (!json || !json.juegos || Object.keys(json.juegos).length === 0) {
                throw new Error('respuesta sin juegos');
            }
            console.log(`[lotohn] Análisis embebido desde ${url}`
                      + ` (${Object.keys(json.juegos).length} juegos, fecha ${json.fecha || 's/f'})`);
            return json;
        } catch (error) {
            console.warn(`[lotohn] No se pudo leer ${url}: ${error.message}`);
        }
    }

    console.warn('[lotohn] Sin análisis en el build: el banner lo pide el navegador.');
    return null;
}

export function obtenerAnalisis() {
    if (!globalThis[CLAVE_CACHE_ANALISIS]) {
        globalThis[CLAVE_CACHE_ANALISIS] = cargarAnalisis();
    }
    return globalThis[CLAVE_CACHE_ANALISIS];
}
