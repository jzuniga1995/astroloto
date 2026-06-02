# LotoHN — Astro Frontend

Portal de resultados de loterías hondureñas. Muestra resultados en vivo de Jugá 3, Pega 3, Premia 2, La Diaria y Súper Premio. Dirigido a Honduras, Costa Rica y la diáspora hondureña en EE.UU.

## Stack

- **Astro 5** — SSG, sin SSR. Todo el dinamismo es client-side JS.
- **Tailwind CSS 3** — Estilos utilitarios.
- **Lucide Astro** — Iconos SVG.
- **Hosting:** Netlify (ver `public/_redirects`).
- **Dominio:** https://lotohn.com

## Arquitectura

Este es el **frontend únicamente**. Los datos vienen de un backend Python separado (`C:\Users\Jose\loto`) que:
- Hace web scraping de `loteriasdehonduras.com` con Playwright.
- Genera los JSON de resultados y los sirve como endpoints.
- Corre en GitHub Actions en las horas de sorteo.

### Endpoints que consume este frontend

| Endpoint | Descripción |
|----------|-------------|
| `/api/resultados-v2` | Resultados del día, agrupados por juego y tanda |
| `/api/historial` | Historial acumulado por fecha `{ "YYYY-MM-DD": { ... } }` |
| `/api/oraculo` | Cábala del día `{ acertijo, numeros[], frase, fecha }` |

### Estructura de datos de `/api/resultados-v2`

```json
{
  "sorteos": {
    "juga3_11am": {
      "nombre_juego": "Jugá 3 11:00 AM",
      "fecha_sorteo": "01-06",
      "hora_sorteo": "11:00 AM",
      "numero_ganador": "326",
      "numeros_individuales": ["3", "2", "6"],
      "numeros_adicionales": ["326"],
      "logo_url": "/logos/juga3.png",
      "estado": "completado"
    }
  }
}
```

## Páginas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `index.astro` | Todos los sorteos del día |
| `/juga-3` | `juga-3.astro` | Solo Jugá 3 |
| `/pega-3` | `pega-3.astro` | Solo Pega 3 |
| `/premia-2` | `premia-2.astro` | Solo Premia 2 |
| `/la-diaria` | `la-diaria.astro` | Solo La Diaria |
| `/loto-super-premio` | `loto-super-premio.astro` | Solo Súper Premio |
| `/historial` | `historial.astro` | Tabla paginada + exportar XLSX |
| `/estadisticas` | `estadisticas.astro` | Frecuencias: números calientes/fríos |
| `/signos-la-diaria` | `signos-la-diaria.astro` | Tabla de 100 signos zodiacales |
| `/contacto` | `contacto.astro` | Formulario de contacto |
| `/sobre-nosotros` | `sobre-nosotros.astro` | Información del proyecto |

## Componentes clave

- **`Header.astro`** — Navegación sticky con menú móvil.
- **`Footer.astro`** — Links + aviso legal.
- **`Oraculo.astro`** — Card de cábala del día. Llama a `/api/oraculo` en client-side. Colores cambian por día de la semana.
- **`Layout.astro`** — Template base: Google Analytics, Ezoic ads, PWA (manifest + SW), preload de logos, estilos globales.

## Scripts client-side

- **`src/scripts/main.js`** — Carga `/api/resultados-v2`, renderiza cards por tanda horaria, auto-refresh cada 1 min en horas de sorteo o cada 5 min el resto del día. Reloj Honduras (UTC-6) en tiempo real.
- **`src/scripts/historial.js`** — Tabla interactiva con filtros por juego/tanda, paginación (20 filas), exportar a XLSX vía SheetJS.

## Estilos dinámicos

`public/styles_dinamicos.css` — Estilos de las cards de sorteo (`.game-card`, `.bola`, `.sorteo-grid`, skeleton loaders). Se sirve como archivo estático, no pasa por el build de Tailwind.

## PWA

- `public/manifest.webmanifest` — Solo habilita instalación ("Añadir a inicio"). **Sin caché offline** para garantizar carga de anuncios y datos frescos.
- `public/sw.js` — Service worker mínimo, sin handler de fetch.

## SEO

Cada página tiene su propio bloque SEO en el `<slot name="head">`. **No modificar** los bloques de meta tags, keywords, Schema.org ni Open Graph existentes — están optimizados y funcionando. Solo agregar encima o debajo si se necesita algo nuevo.

El `index.astro` incluye un bloque de texto invisible para crawlers con ~250 keywords georeferencializadas (Honduras, Costa Rica, EE.UU.). No es black-hat — está con `clip:rect(0,0,0,0)` dentro de `aria-hidden`.

## Monetización

Ezoic activo en `Layout.astro`:
- Gatekeeper Consent CMP
- `ezojs.com/ezoic/sa.min.js`
- Native Banner (effectivegatecpm.com)
- Banner 300×250 (highperformanceformat.com)
- Popunder + Social Bar (effectivegatecpm.com)

## Comandos

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción (genera /dist)
npm run preview  # Preview del build
```

## Google Analytics

ID: `G-B9L2HSP4B6` — configurado en `Layout.astro`.
