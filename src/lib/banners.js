// src/lib/banners.js
//
// Promoción propia de EmprendeHN (https://emprendehn.com), el directorio
// gratuito de negocios de Honduras. No tiene nada que ver con la red de
// anuncios (`anuncios.js`): son cuatro imágenes servidas desde el sitio, un
// enlace y cero scripts de terceros. Cada banner lleva al formulario de
// registro con sus UTM, que es lo único que se quiere medir: negocios
// registrados.
//
// Lo usan el build (`PromoBanner.astro`) y nada más. Sin DOM ni `window`.
import { JUEGOS, GUIAS, rutaLimpia } from './navegacion.js';

// Para quitar los banners de todo el sitio de un golpe.
export const PROMO_ACTIVA = true;

const DESTINO = 'https://emprendehn.com/registro';

// Medidas de la imagen original. Las cuatro comparten formato (3:2), así que el
// alto se reserva igual para todas y la imagen no mueve nada al cargar.
export const ANCHO = 1264;
export const ALTO = 848;

// Anchos en los que existe cada imagen. La de `image` es la grande (1264);
// las otras se llaman igual con el ancho al final: `…-800.webp`, `…-480.webp`.
const ANCHOS = [480, 800];

// `campaign` sale del mensaje de cada imagen y es el `utm_campaign`.
export const BANNERS = [
    {
        id: 'sin-web',
        image: '/logos/emprendehn-sin-web.webp',
        alt: '¿Tu negocio no tiene página web? Crea tu perfil gratis en EmprendeHN y llega a más clientes hoy mismo. Registrar mi negocio.',
        campaign: 'sin-web',
    },
    {
        id: 'whatsapp',
        image: '/logos/emprendehn-whatsapp.webp',
        alt: 'Que tus clientes te escriban directo a WhatsApp. Registra tu negocio gratis en EmprendeHN. Empezar gratis.',
        campaign: 'whatsapp',
    },
    {
        id: 'primero',
        image: '/logos/emprendehn-primero.webp',
        alt: 'Sé el primero de tu ciudad. Registra tu negocio gratis en EmprendeHN. Registrarme ahora.',
        campaign: 'primero',
    },
    {
        id: '5-minutos',
        image: '/logos/emprendehn-5-minutos.webp',
        alt: 'Registra tu negocio en 5 minutos, 100% gratis en EmprendeHN. Registrar gratis.',
        campaign: '5-minutos',
    },
];

export function bannerPorId(id) {
    return BANNERS.find(b => b.id === id) || null;
}

export function urlDestino(banner) {
    const p = new URLSearchParams({
        utm_source: 'lotohn',
        utm_medium: 'banner',
        utm_campaign: banner.campaign,
    });
    return `${DESTINO}?${p}`;
}

export function srcsetDe(banner) {
    const variantes = ANCHOS.map(w => `${banner.image.replace(/\.webp$/, `-${w}.webp`)} ${w}w`);
    return [...variantes, `${banner.image} ${ANCHO}w`].join(', ');
}

// Qué banner le toca a cada página. Tiene que ser fijo por página —si se
// sorteara en el navegador, la imagen cambiaría tras pintar— y repartido, para
// que no salga siempre el mismo. Un hash de la ruta cumple lo primero pero no
// lo segundo: con tan pocas rutas cae desparejo (uno salía en 8 páginas y otro
// en 2). Así que se va rotando en el orden de las secciones del sitio
// (Resultados, Historial, Estadísticas, Guías), y una ruta que no esté en esa
// lista cae a un hash. Con este orden la página de un juego y su guía tampoco
// repiten banner.
const ORDEN = [
    '/',
    ...JUEGOS.map(j => j.href),
    '/historial',
    '/estadisticas',
    ...GUIAS.map(g => g.href),
];

function hash(texto) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

export function bannerDeRuta(ruta) {
    const r = rutaLimpia(ruta);
    const i = ORDEN.indexOf(r);
    return BANNERS[(i >= 0 ? i : hash(r)) % BANNERS.length];
}
