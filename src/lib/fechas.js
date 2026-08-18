// ============================================
// FECHAS REALES DE CONTENIDO
// ============================================
//
// Las guías son evergreen y su `dateModified` estaba escrito a mano, así que se
// quedaba viejo en cuanto se editaba el texto y nadie se acordaba de subirlo.
// Git ya sabe cuándo se tocó cada archivo por última vez: se lo preguntamos en
// el build y se acabó el mantenimiento manual.
//
// En un checkout superficial puede no haber ningún commit que toque el archivo
// dentro del historial disponible. En ese caso devuelve null y quien llama se
// queda con la fecha declarada a mano, que es lo que había antes.

import { execFileSync } from 'node:child_process';

const cache = new Map();

export function ultimaModificacionGit(rutaRelativa) {
    if (cache.has(rutaRelativa)) return cache.get(rutaRelativa);

    let iso = null;
    try {
        const salida = execFileSync(
            'git', ['log', '-1', '--format=%cI', '--', rutaRelativa],
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 },
        ).trim();
        if (salida) iso = salida;
    } catch {
        // git ausente, no es un repo, o el archivo no aparece en el historial
    }

    cache.set(rutaRelativa, iso);
    return iso;
}

// Fecha de modificación de una página, con la fecha escrita a mano de respaldo.
export function modificadoDePagina(rutaRelativa, respaldo) {
    return ultimaModificacionGit(rutaRelativa) || respaldo;
}
