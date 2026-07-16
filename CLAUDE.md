# LotoHN — Astro Frontend

Portal de resultados de loterías hondureñas. Muestra resultados en vivo de Jugá 3, Pega 3, Premia 2, La Diaria y Súper Premio. Dirigido a Honduras, Costa Rica y la diáspora hondureña en EE.UU.

## Stack

- **Astro 5** — SSG, sin SSR. Todo el dinamismo es client-side JS.
- **Tailwind CSS 3** — Estilos utilitarios.
- **Lucide Astro** — Iconos SVG.
- **Hosting:** Netlify (`public/_redirects`).
- **Dominio:** https://lotohn.com
- **Repo:** https://github.com/jzuniga1995/astroloto

## Arquitectura

Frontend estático. Los datos vienen del backend Python separado (`C:\Users\Jose\loto`) que hace scraping de `loteriasdehonduras.com` y sirve 3 endpoints JSON.

### Endpoints consumidos

| Endpoint | Descripción | Cache |
|----------|-------------|-------|
| `/api/resultados-v2` | Resultados del día por juego y tanda | `no-cache` |
| `/api/historial` | Historial acumulado `{ "YYYY-MM-DD": { ... } }` | `no-cache` |
| `/api/analizar` | Análisis IA del día `{ fecha, juegos: { patrones, tendencias, sugerencias[] } }` | `no-store` |

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

### Estructura de datos de `/api/historial`

```json
{
  "2026-06-01": {
    "juga3_11am": { "numero_ganador": "326", "numeros_adicionales": ["326"], ... },
    "pega3_10am": { ... }
  }
}
```

## Páginas

### Resultados (raíz)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `index.astro` | Todos los sorteos del día |
| `/juga-3` | `juga-3.astro` | Solo Jugá 3 |
| `/pega-3` | `pega-3.astro` | Solo Pega 3 |
| `/premia-2` | `premia-2.astro` | Solo Premia 2 |
| `/la-diaria` | `la-diaria.astro` | Solo La Diaria |
| `/loto-super-premio` | `loto-super-premio.astro` | Solo Súper Premio |
| `/historial` | `historial.astro` | Tabla paginada + exportar XLSX |
| `/estadisticas` | `estadisticas.astro` | Frecuencias: números calientes/fríos por juego |
| `/signos-la-diaria` | `signos-la-diaria.astro` | Tabla de 100 signos zodiacales |
| `/contacto` | `contacto.astro` | Formulario de contacto |
| `/sobre-nosotros` | `sobre-nosotros.astro` | Información del proyecto |

### Guías `/guia/` (evergreen, sin año en título)

| Ruta | Contenido |
|------|-----------|
| `/guia/como-jugar-juga-3` | Reglas, modalidades, horarios, FAQ |
| `/guia/como-jugar-pega-3` | Directo, combinado, por la mitad |
| `/guia/como-jugar-premia-2` | Ordena2, Mixea2, Posiciona2 |
| `/guia/como-jugar-la-diaria` | Número + signo + multiplicador, link a signos |
| `/guia/como-jugar-super-premio` | Jackpot, miércoles y sábado, premios |
| `/guia/horarios-sorteos-honduras` | Tabla completa con 6 zonas horarias EE.UU. |
| `/guia/donde-cobrar-premios-honduras` | Requisitos, pasos, plazo 90 días |
| `/guia/probabilidades-loterias-honduras` | Comparativa de odds de todas las modalidades |
| `/guia/estrategias-loto-honduras` | 3 estrategias + juego responsable |
| `/guia/loto-honduras-desde-costa-rica` | Para la diáspora en CR (misma zona UTC-6) |
| `/guia/loto-honduras-desde-estados-unidos` | Horarios para ET/CT/MT/PT |

**Regla importante:** Los títulos de las guías **nunca llevan año** — son páginas evergreen. El año puede aparecer en keywords y body, no en `<title>` ni H1.

## Componentes

- **`Header.astro`** — Navegación sticky. Nav desktop + menú móvil hamburguesa. Links: Inicio, Jugá 3, Pega 3, Premia 2, La Diaria, Súper Premio, Historial, Estadísticas, Signos.
- **`Footer.astro`** — Nav de resultados + sección Guías (11 links) + nav legal.
- **`AnalizadorIA.astro`** — Banner de análisis IA con tabs por juego. Fetch a `/api/analizar`. Sugerencias se revelan al hacer clic.
- **`CoberturaPaises.astro`** — Sección visible de cobertura geográfica (HN · CR · US con ciudades).
- **`Layout.astro`** — Template base: Google Analytics, PWA (manifest + SW), preload logos, estilos globales.

## Scripts client-side

- **`src/scripts/main.js`** — Fetch `/api/resultados-v2` con `cache: 'no-cache'`. Renderiza cards por tanda. Auto-refresh 1 min en horarios de sorteo, 5 min el resto. Reloj Honduras (UTC-6).
- **`src/scripts/historial.js`** — Tabla interactiva, filtros juego/tanda, paginación 20 filas, exportar XLSX vía SheetJS CDN.

## Estilos

- `public/styles_dinamicos.css` — Cards de sorteo (`.game-card`, `.bola`, `.sorteo-grid`, skeletons). Archivo estático, no pasa por Tailwind.
- Estilos de guías y estadísticas van en `<style>` dentro de cada `.astro`.

## PWA

- `public/manifest.webmanifest` — Instalable. Shortcuts a Jugá 3, La Diaria e Historial.
- `public/sw.js` — Service worker **mínimo**. Sin caché offline — garantiza datos frescos en cada visita.

## SEO — Patrón por página

Cada página sigue este patrón en el `<slot name="head">`:

1. `<title>` — Sin año en páginas evergreen. Con descripción clara del tema.
2. `<meta name="description">` — 150–160 chars, incluye emoji inicial.
3. `<meta name="keywords">` — 30–50 términos, 3 países (HN + CR + US).
4. SEO técnico — `robots`, `googlebot`, `bingbot`, `revisit-after`, `HandheldFriendly`.
5. Geolocalización triple — `geo.region` HN + CR + US con ciudades.
6. Open Graph completo — `og:image:width/height/alt`, `og:locale:alternate`.
7. Twitter Card — `@LotoHN` en `twitter:site` y `twitter:creator`.
8. Hreflang — 5 variantes: `es-HN`, `es-CR`, `es-US`, `es`, `x-default`.
9. Schema.org — `WebPage` o `Article` + `FAQPage` + `BreadcrumbList`. `Organization` global vive en `Layout.astro`.
10. Cobertura geográfica VISIBLE — componente `CoberturaPaises.astro` (HN · CR · US con ciudades). Sustituye a los antiguos bloques ocultos.
11. Contenido visible — Párrafos reales, FAQ visible, links internos. Un solo `<h1>` por página.

**Regla crítica (anti-penalización):** PROHIBIDO el texto oculto para SEO (`clip:rect(0,0,0,0)`, `left:-9999px`, `display:none`, `aria-hidden` con keywords). Google lo penaliza como cloaking. Todo el contenido con keywords debe ser **visible y legible**; para las palabras geolocalizadas usar `<CoberturaPaises />`. Nada de listas de keywords separadas por comas: integrarlas en prosa natural.

## Monetización

**Sin anuncios (julio 2026).** Todo el código de redes publicitarias (Monetag, Adsterra, Ezoic) fue eliminado del sitio durante la recuperación de tráfico: los formatos intrusivos (push, vignette, smartlinks) coincidieron con caídas de indexación en Google. **No reintroducir anuncios hasta que el tráfico orgánico se recupere de forma estable**, y en ese momento usar solo formatos no intrusivos (nada de popunders, push, vignettes ni smartlinks).

## Google Analytics

ID: `G-B9L2HSP4B6` — en `Layout.astro`.

## Comandos

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción → /dist (build limpio, 25 páginas, ~350ms)
npm run preview  # Preview del build
```

## Build

El build compila sin errores. Las advertencias del IDE sobre `is:inline` en scripts con atributos son normales en Astro — no afectan el build.

## Backend relacionado

`C:\Users\Jose\loto` — Python. Scraper con Playwright + generador de Oráculo con Gemini. Corre vía GitHub Actions (`workflow_dispatch` — sin cron automático). Genera `resultados_hoy.json`, `historial.json` y `oraculo.json`.
