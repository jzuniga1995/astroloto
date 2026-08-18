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

### Los resultados se pintan dos veces

1. **En el build** (`src/lib/datos-build.js`): `astro build` pide
   `/api/resultados-v2` y deja el último sorteo escrito en el HTML. Es lo único
   que ve un rastreador que no ejecuta JavaScript.
2. **En el cliente** (`src/scripts/main.js`): al cargar repinta con el dato
   fresco y sigue refrescando solo. El visitante nunca ve algo más viejo que el
   último despliegue.

Los dos lados generan el HTML con las **mismas funciones** (`src/lib/sorteos.js`),
así que no pueden divergir. El bloque pre-renderizado lleva
`data-prerender="true"`; el cliente lo quita al tomar el control, y ese atributo
es lo que decide si la primera carga muestra skeleton o refresca por detrás.

Si el build no logra leer la API cae a un respaldo
(`raw.githubusercontent.com/jzuniga1995/lotohn/main/resultados_hoy.json`) y, si
tampoco responde, deja el placeholder de siempre. **Un fallo de red nunca tumba
el build.**

**Un sorteo nuevo necesita un despliegue nuevo.** El workflow del backend
dispara un build hook de Netlify cuando cambian los números (ver *Backend
relacionado*). Sin ese hook el HTML se queda con el sorteo del último
despliegue: los visitantes lo ven igual, los bots no.

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

La Diaria trae 4 valores en `numeros_adicionales` / `numeros_individuales`:
número, signo, multiplicador y Más 1 (`["87", "León", "JG", "4"]`).

### Estructura de datos de `/api/historial`

Cada sorteo es un **array** de números (el mismo `numeros_adicionales`), no un objeto:

```json
{
  "2026-08-10": {
    "juga3_11am":   ["457"],
    "premia2_11am": ["38", "24"],
    "pega_3_11am":  ["35", "36", "39"],
    "diaria_11am":  ["87", "León", "JG", "4"],
    "super_premio": ["01", "04", "05", "10", "20", "28"]
  }
}
```

### Juegos vigentes

Jugá 3, Premia 2, Pega 3 y La Diaria (11:00 AM, 3:00 PM y 9:00 PM) más Súper
Premio (miércoles y sábado, 9:00 PM). **Bingo con Todo, Multi X, InstaCash,
Apostemos y Ganagol se eliminaron**: la fuente dejó de publicarlos.

Las claves del historial cambiaron de forma con el tiempo (`pega3_10am` /
`pega_3_11am`, `la_diaria_10am` / `diaria_11am`), así que los scripts las
detectan por coincidencia parcial y no por igualdad exacta.

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
- **`ResultadosSorteos.astro`** — `#contenido` con los sorteos ya pintados en el build. Props: `tipoJuego`, `ariaLabel`, `textoCargando`.
- **`SchemaResultados.astro`** — JSON-LD `WebPage` + `ItemList` con los resultados y el `dateModified` real.
- **`FechasSEO.astro`** — `article:published_time` / `article:modified_time`.

## Librerías compartidas (`src/lib/`)

- **`sorteos.js`** — Toda la lógica de agrupar, ordenar y pintar sorteos. Sin DOM
  ni `window`: la usan el build y el navegador. Escapa todo lo que llega del
  scraper antes de meterlo en el HTML.
- **`datos-build.js`** — Lee la API durante el build. Una sola petición por
  build (cacheada en `globalThis`, que es lo que comparten `astro.config.mjs` y
  el render de páginas). Nunca lanza.
- **`iconos.js`** — SVG inline. El sitio nunca cargó el runtime `lucide`, así
  que los `<i data-lucide="…">` que generaba el JS quedaban en un `<i>` vacío y
  el icono no aparecía. **No volver a `data-lucide` en HTML generado.**
- **`fechas.js`** — `dateModified` de las guías a partir del último commit de
  git, con la fecha escrita a mano de respaldo si el checkout no trae historial.
- **`seo.js`** — `PUBLICADO_SITIO`, fijo a propósito.

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
   En las páginas de resultados el `WebPage` lo emite `<SchemaResultados />` con
   `dateModified` real y un `ItemList` de los sorteos.
   **Nada de `Event` para los sorteos**: Google reserva esas rich results para
   cosas a las que se asiste y su guía antispam de datos estructurados trata como
   abuso etiquetar de `Event` lo que no lo es.
10. Cobertura geográfica VISIBLE — componente `CoberturaPaises.astro` (HN · CR · US con ciudades). Sustituye a los antiguos bloques ocultos.
11. Contenido visible — Párrafos reales, FAQ visible, links internos. Un solo `<h1>` por página.

**Regla de fechas:** `datePublished` es fijo (cuándo nació la página, en
`src/lib/seo.js`). `dateModified` y `article:modified_time` salen del
`fecha_actualizacion` que escribe el scraper — en UTC y sin sufijo de zona, hay
que parsearlo como UTC o sale corrido seis horas. En las guías la fecha viene
del último commit de git. **Nunca volver a escribir una fecha de modificación a
mano.**

Los bloques `<script type="application/ld+json" is:inline>` **no interpolan
expresiones de Astro**: un `{variable}` ahí dentro sale literal en el HTML. Para
JSON-LD con datos hay que usar `set:html={...}` (ver `SchemaResultados.astro` y
las guías).

**Regla crítica (anti-penalización):** PROHIBIDO el texto oculto para SEO (`clip:rect(0,0,0,0)`, `left:-9999px`, `display:none`, `aria-hidden` con keywords). Google lo penaliza como cloaking. Todo el contenido con keywords debe ser **visible y legible**; para las palabras geolocalizadas usar `<CoberturaPaises />`. Nada de listas de keywords separadas por comas: integrarlas en prosa natural.

## Sitemap

`lastmod` en `astro.config.mjs`:

- Resultados, historial y estadísticas → el timestamp del dato, **no** la hora
  del build. Si un despliegue no trajo sorteo nuevo, la fecha no se mueve.
- Guías y páginas estáticas → fecha del último commit del archivo.
- Sin fecha fiable → se omite `lastmod` en vez de inventar uno.

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

`jzuniga1995/lotohn` — Python. Scraper con Playwright sobre `loteriasdehonduras.com` + analizador. Corre vía GitHub Actions (`workflow_dispatch` — sin cron automático). Genera `resultados_hoy.json`, `historial.json` y `analisis.json`.

Tras publicar y purgar Cloudflare, el workflow dispara el build hook de Netlify
para que el HTML se regenere con el sorteo nuevo. Requiere el secret
`NETLIFY_BUILD_HOOK` en el repo del backend; sin él, el paso simplemente se
salta.

El disparo va por `firma_resultados.py` (hash de los números, sin sellos de
tiempo) y **no** por el `git diff`: `resultados_hoy.json` cambia en todas las
corridas porque `fecha_actualizacion` y cada `fecha_consulta` llevan la hora de
la corrida, así que el diff nunca está vacío. Enganchar el hook ahí sería
reconstruir el sitio cada pocos minutos sin motivo.
