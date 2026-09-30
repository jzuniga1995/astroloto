// src/lib/navegacion.js
//
// Mapa de navegación del sitio: juegos, guías y páginas informativas, y qué
// sección le toca a cada ruta. Lo usan la cabecera y la barra de pestañas de
// móvil para marcar la sección activa y decidir si la barra superior enseña la
// marca o un botón de volver. Sin DOM ni `window`.

export const JUEGOS = [
    { href: '/juga-3',            nombre: 'Jugá 3',       logo: '/logos/juga3.png' },
    { href: '/pega-3',            nombre: 'Pega 3',       logo: '/logos/pega3.png' },
    { href: '/premia-2',          nombre: 'Premia 2',     logo: '/logos/premia2.png' },
    { href: '/la-diaria',         nombre: 'La Diaria',    logo: '/logos/la_diaria.png' },
    { href: '/loto-super-premio', nombre: 'Súper Premio', logo: '/logos/super_premio.png' },
];

export const GUIAS = [
    { href: '/guia/como-jugar-juga-3',                  nombre: 'Cómo jugar Jugá 3' },
    { href: '/guia/como-jugar-pega-3',                  nombre: 'Cómo jugar Pega 3' },
    { href: '/guia/como-jugar-premia-2',                nombre: 'Cómo jugar Premia 2' },
    { href: '/guia/como-jugar-la-diaria',               nombre: 'Cómo jugar La Diaria' },
    { href: '/guia/como-jugar-super-premio',            nombre: 'Cómo jugar Súper Premio' },
    { href: '/guia/horarios-sorteos-honduras',          nombre: 'Horarios de sorteos' },
    { href: '/guia/donde-cobrar-premios-honduras',      nombre: 'Dónde cobrar premios' },
    { href: '/guia/probabilidades-loterias-honduras',   nombre: 'Probabilidades' },
    { href: '/guia/estrategias-loto-honduras',          nombre: 'Estrategias' },
    { href: '/guia/loto-honduras-desde-costa-rica',     nombre: 'Loto desde Costa Rica' },
    { href: '/guia/loto-honduras-desde-estados-unidos', nombre: 'Loto desde EE.UU.' },
];

export const INFO = [
    { href: '/sobre-nosotros', nombre: 'Sobre nosotros', icono: 'info' },
    { href: '/contacto',       nombre: 'Contacto',       icono: 'correo' },
    { href: '/terminos',       nombre: 'Términos y condiciones', icono: 'documento' },
    { href: '/privacidad',     nombre: 'Política de privacidad', icono: 'escudo' },
];

// Con `build.format: 'file'` el `Astro.url.pathname` del build llega como
// `/juga-3.html`, y en el navegador como `/juga-3`. Todo se compara sin
// extensión, sin barra final y en minúsculas.
export function rutaLimpia(ruta) {
    const limpia = String(ruta || '/')
        .toLowerCase()
        .replace(/\.html?$/, '')
        .replace(/\/index$/, '')
        .replace(/\/+$/, '');
    return limpia || '/';
}

// Las páginas de un juego son vistas de la pestaña Resultados, no pestañas
// propias: el selector de juegos va dentro de ella.
export function esResultados(ruta) {
    const r = rutaLimpia(ruta);
    return r === '/' || JUEGOS.some(j => j.href === r);
}

// Pestaña de la barra inferior que queda marcada en cada ruta. Todo lo que no
// es una pestaña (guías, legales, contacto) vive en el menú «Más».
export function pestanaActiva(ruta) {
    const r = rutaLimpia(ruta);
    if (esResultados(r)) return 'resultados';
    if (r === '/historial') return 'historial';
    if (r === '/estadisticas') return 'estadisticas';
    if (r === '/signos-la-diaria') return 'signos';
    return 'mas';
}

const TITULOS = {
    '/historial':        'Historial',
    '/estadisticas':     'Estadísticas',
    '/signos-la-diaria': 'Signos La Diaria',
    '/contacto':         'Contacto',
    '/sobre-nosotros':   'Sobre nosotros',
    '/terminos':         'Términos',
    '/privacidad':       'Privacidad',
    '/404':              'Página no encontrada',
};

// Título corto de la barra superior. `null` en las vistas de Resultados, que
// llevan la marca.
export function tituloBarra(ruta) {
    const r = rutaLimpia(ruta);
    if (esResultados(r)) return null;
    if (r.startsWith('/guia/')) return 'Guías';
    return TITULOS[r] || null;
}

// Páginas «de detalle»: se llega a ellas desde el menú y en la barra superior
// llevan un botón de volver en vez de la marca, como una pantalla apilada de
// una app. Las pestañas raíz (Resultados, Historial, Estadísticas, Signos) no.
export function esDetalle(ruta) {
    return pestanaActiva(ruta) === 'mas';
}
