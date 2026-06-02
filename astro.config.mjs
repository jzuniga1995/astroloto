import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lotohn.com',
  integrations: [
    tailwind(),
    sitemap({
      serialize(item) {
        const url = item.url;
        const hoy = new Date().toISOString().split('T')[0];

        // Inicio
        if (url === 'https://lotohn.com/') {
          return { ...item, changefreq: 'daily', priority: 1.0, lastmod: hoy };
        }

        // Páginas de resultados por juego — se actualizan cada día
        if (/\/(juga-3|pega-3|premia-2|la-diaria|loto-super-premio)$/.test(url)) {
          return { ...item, changefreq: 'daily', priority: 0.9, lastmod: hoy };
        }

        // Signos La Diaria — contenido estático muy buscado
        if (url.includes('signos-la-diaria')) {
          return { ...item, changefreq: 'monthly', priority: 0.9 };
        }

        // Historial y estadísticas — crecen con cada sorteo
        if (/\/(historial|estadisticas)$/.test(url)) {
          return { ...item, changefreq: 'daily', priority: 0.9, lastmod: hoy };
        }

        // Guías evergreen — contenido permanente
        if (url.includes('/guia/')) {
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }

        // Contacto y sobre nosotros
        if (/\/(contacto|sobre-nosotros)$/.test(url)) {
          return { ...item, changefreq: 'monthly', priority: 0.5 };
        }

        // Páginas legales
        if (/\/(privacidad|terminos)$/.test(url)) {
          return { ...item, changefreq: 'yearly', priority: 0.3 };
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
