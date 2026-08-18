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

const FUENTES = [
    // Producción: la API que ya consume el navegador (Cloudflare al frente).
    process.env.LOTO_API_URL || 'https://lotohn.com/api/resultados-v2',
    // Respaldo: el JSON crudo que publica el scraper. Misma forma, con campos
    // de más que el frontend ignora.
    'https://raw.githubusercontent.com/jzuniga1995/lotohn/main/resultados_hoy.json',
];

const TIMEOUT_MS = 8000;
const CLAVE_CACHE = Symbol.for('lotohn.datos-build');

// "2026-08-18 03:09:33" viene del scraper en UTC, sin sufijo de zona: hay que
// marcarlo explícitamente o Node lo interpreta como hora local y el
// article:modified_time sale corrido seis horas.
function parsearUTC(texto) {
    if (!texto) return null;
    const fecha = new Date(String(texto).trim().replace(' ', 'T') + 'Z');
    return isNaN(fecha.getTime()) ? null : fecha;
}

// Momento real del dato: lo que dice el JSON, y si no viene, la consulta más
// reciente entre los sorteos.
function momentoDelDato(json) {
    const declarado = parsearUTC(json.fecha_actualizacion);
    if (declarado) return declarado;

    const consultas = Object.values(json.sorteos || {})
        .map(s => parsearUTC(s && s.fecha_consulta))
        .filter(Boolean);
    return consultas.length ? new Date(Math.max(...consultas.map(d => d.getTime()))) : null;
}

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
            const actualizado = momentoDelDato(json);
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
