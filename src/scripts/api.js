// ============================================
// LECTURA DE LA API — a prueba de caché intermedia
// ============================================
//
// /api/* pasa por Cloudflare. `cache: 'no-cache'` solo obliga al navegador a
// revalidar contra el borde: si el borde guarda una copia vieja, la devuelve
// igual y el visitante nunca llega a ver el sorteo que el backend ya publicó.
//
// Un parámetro que cambia con el tiempo forma una URL que el borde no tiene
// guardada, así que la petición llega hasta el origen. Se agrupa en ventanas
// de 30 s en lugar de usar Date.now() a secas para que el CDN siga absorbiendo
// el tráfico: como mucho dos URLs distintas por minuto entre todos los
// visitantes, y el dato nunca se atrasa más de esos 30 s.
//
// `unico: true` rompe esa agrupación para una petición concreta. Se usa cuando
// ya sabemos que la copia del borde está atrasada —la respuesta anterior era
// más vieja que lo que hay en pantalla— y reintentar dentro de la misma ventana
// devolvería exactamente el mismo JSON viejo.

const VENTANA_MS = 30_000;

export function urlFresca(url, { unico = false } = {}) {
    const marca = unico ? Date.now() : Math.floor(Date.now() / VENTANA_MS);
    return `${url}${url.includes('?') ? '&' : '?'}v=${marca}`;
}

export async function fetchJSON(url, opciones = {}) {
    const resp = await fetch(urlFresca(url, opciones), { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}
