// src/lib/anuncios.js
//
// Único lugar donde viven las claves de la red publicitaria. Lo usan el build
// (los componentes .astro) y el navegador (`src/scripts/anuncios.js`), así que
// no puede tocar el DOM ni `window`.
//
// Para apagar TODA la publicidad del sitio de un golpe: `ANUNCIOS_ACTIVOS = false`.
// Los huecos dejan de renderizarse y no se pide un solo script de terceros.
export const ANUNCIOS_ACTIVOS = true;

// El `invoke.js` de los banners lee un `atOptions` global al ejecutarse, así que
// dos banners en la misma página se pisan. Cada hueco se pinta dentro de su
// propio iframe (`srcdoc`): documento aparte, `atOptions` aparte, y el
// `document.write()` del proveedor queda encerrado ahí dentro en vez de borrar
// la página. De paso el iframe no bloquea el parser y reserva su alto, que es
// lo que evita el salto de layout.
const BASE_BANNER = 'https://www.highrevenueformat.com';

// Medidas disponibles. La clave es la que da el proveedor por cada tamaño.
export const MEDIDAS = {
    '728x90':  { key: 'e61f9f9611a9f9a07aeb3d538f766887', ancho: 728, alto: 90  },
    '468x60':  { key: 'b9844eb1a158475c00a6737269bdd8be', ancho: 468, alto: 60  },
    '320x50':  { key: 'bac206d57ea1b4613435e01ca3dd35ff', ancho: 320, alto: 50  },
    '300x250': { key: '4adb7d49b21a18585b492d5dc304a3c0', ancho: 300, alto: 250 },
    '160x600': { key: 'e6fb013fd1caca20d3e97cfb0a6a9ee3', ancho: 160, alto: 600 },
    '160x300': { key: 'd2513f3a093a8e45085556b3c3d2c269', ancho: 160, alto: 300 },
};

// Formatos con nombre: cada hueco pide un formato y el cargador elige la medida
// según el ancho de pantalla. `null` = ese formato no se muestra ahí.
export const FORMATOS = {
    lider:      { escritorio: '728x90',  movil: '320x50'  },
    medio:      { escritorio: '468x60',  movil: '300x250' },
    rectangulo: { escritorio: '300x250', movil: '300x250' },
    vertical:   { escritorio: '160x600', movil: null      },
    columna:    { escritorio: '160x300', movil: null      },
    ancla:      { escritorio: null,      movil: '320x50'  },
};

// Corte móvil/escritorio. 800 y no 768: el líder de 728 px no entra en la
// columna de contenido hasta ese ancho. Las media queries de los componentes
// usan este mismo número (799/800) — si cambia acá, cambia allá.
export const PUNTO_MOVIL = 800;

// Banner nativo: se integra con el contenido y trae su propio contenedor. No usa
// `atOptions`, carga `async` y no hace `document.write`, así que va inline. El id
// del contenedor es fijo → un solo nativo por página.
export const NATIVO = {
    src: 'https://pl28417320.profitableratecpmnetwork.com/c053bb82e7e2a6d39cd34a6acda6a322/invoke.js',
    contenedor: 'container-c053bb82e7e2a6d39cd34a6acda6a322',
};

// Script global de la red (una sola vez, al final del <body>).
export const SCRIPT_GLOBAL =
    'https://pl28763916.profitableratecpmnetwork.com/35/14/fd/3514fdd317f29f6fae7476c399c70d81.js';

// El iframe va con permisos explícitos: el creativo puede pintarse, abrir su
// enlace al hacer clic y enviar formularios, pero NO puede navegar la pestaña
// por su cuenta sin que el usuario haga clic. Eso corta los redirects
// automáticos, que es justo el comportamiento que hundió la indexación antes.
export const PERMISOS_IFRAME = [
    'allow-scripts',
    'allow-same-origin',
    'allow-popups',
    'allow-popups-to-escape-sandbox',
    'allow-forms',
    'allow-top-navigation-by-user-activation',
].join(' ');

// El literal `</script>` nunca se escribe entero: si el bundler llegara a
// meter este módulo dentro de un <script> del HTML, esa secuencia cerraría el
// bloque y rompería la página.
const ABRE = '<' + 'script';
const CIERRA = '<' + '/script>';

// Documento completo del iframe para una medida. Se genera igual en el build y
// en el navegador para que no puedan divergir.
export function documentoBanner(medida) {
    const m = MEDIDAS[medida];
    if (!m) return '';
    const opciones = `{'key':'${m.key}','format':'iframe','height':${m.alto},'width':${m.ancho},'params':{}}`;
    return [
        '<!DOCTYPE html><html><head><meta charset="utf-8">',
        '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>',
        '</head><body>',
        `${ABRE}>atOptions=${opciones};${CIERRA}`,
        `${ABRE} src="${BASE_BANNER}/${m.key}/invoke.js">${CIERRA}`,
        '</body></html>',
    ].join('');
}

// Medida que le toca a un formato según el ancho de la ventana.
export function medidaPara(formato, ancho) {
    const f = FORMATOS[formato];
    if (!f) return null;
    return (ancho < PUNTO_MOVIL ? f.movil : f.escritorio) || null;
}
