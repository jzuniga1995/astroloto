import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { obtenerResultados } from './src/lib/datos-build.js';
import { ultimaModificacionGit } from './src/lib/fechas.js';

// El lastmod de las páginas de resultados sale del dato, no del reloj del
// build: si un despliegue no trajo sorteo nuevo, la fecha no debe moverse.
// `serialize` es síncrono, así que la petición se resuelve acá arriba —el
// resultado queda cacheado y las páginas reutilizan la misma respuesta.
const { actualizado } = await obtenerResultados();
const lastmodResultados = (actualizado || new Date()).toISOString();

// Las páginas de contenido llevan la fecha de su último commit. Si el checkout
// no tiene historial del archivo se omite el lastmod, que es mejor que
// inventar uno.
const ARCHIVO_POR_RUTA = {
  'signos-la-diaria': 'src/pages/signos-la-diaria.astro',
  'contacto':         'src/pages/contacto.astro',
  'sobre-nosotros':   'src/pages/sobre-nosotros.astro',
  'privacidad':       'src/pages/privacidad.astro',
  'terminos':         'src/pages/terminos.astro',
};

function lastmodDeContenido(url) {
  const ruta = new URL(url).pathname.replace(/^\/|\/$/g, '');
  const archivo = ruta.startsWith('guia/')
    ? `src/pages/${ruta}.astro`
    : ARCHIVO_POR_RUTA[ruta];
  if (!archivo) return {};
  const fecha = ultimaModificacionGit(archivo);
  return fecha ? { lastmod: fecha } : {};
}

export default defineConfig({
  site: 'https://lotohn.com',
  integrations: [
    tailwind(),
    sitemap({
      serialize(item) {
        const url = item.url;

        // Inicio
        if (url === 'https://lotohn.com/') {
          return { ...item, changefreq: 'hourly', priority: 1.0, lastmod: lastmodResultados };
        }

        // Páginas de resultados por juego — cambian con cada sorteo
        if (/\/(juga-3|pega-3|premia-2|la-diaria|loto-super-premio)$/.test(url)) {
          return { ...item, changefreq: 'hourly', priority: 0.9, lastmod: lastmodResultados };
        }

        // Signos La Diaria — contenido estático muy buscado
        if (url.includes('signos-la-diaria')) {
          return { ...item, changefreq: 'monthly', priority: 0.9, ...lastmodDeContenido(url) };
        }

        // Historial y estadísticas — crecen con cada sorteo
        if (/\/(historial|estadisticas)$/.test(url)) {
          return { ...item, changefreq: 'daily', priority: 0.9, lastmod: lastmodResultados };
        }

        // Guías evergreen — contenido permanente
        if (url.includes('/guia/')) {
          return { ...item, changefreq: 'monthly', priority: 0.8, ...lastmodDeContenido(url) };
        }

        // Contacto y sobre nosotros
        if (/\/(contacto|sobre-nosotros)$/.test(url)) {
          return { ...item, changefreq: 'monthly', priority: 0.5, ...lastmodDeContenido(url) };
        }

        // Páginas legales
        if (/\/(privacidad|terminos)$/.test(url)) {
          return { ...item, changefreq: 'yearly', priority: 0.3, ...lastmodDeContenido(url) };
        }

        return item;
      }
    })
  ],
  trailingSlash: "never",
  build: {
    format: 'file'
  }
});
