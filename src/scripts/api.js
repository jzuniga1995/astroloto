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

const VENTANA_MS = 30_000;

export function urlFresca(url) {
    const ventana = Math.floor(Date.now() / VENTANA_MS);
    return `${url}${url.includes('?') ? '&' : '?'}v=${ventana}`;
}

export async function fetchJSON(url) {
    const resp = await fetch(urlFresca(url), { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}
