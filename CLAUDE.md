# LotoHN — Astro Frontend

Portal de resultados de loterías hondureñas. Muestra resultados en vivo de Jugá 3, Pega 3, Premia 2, La Diaria y Súper Premio. Dirigido a Honduras, Costa Rica y la diáspora hondureña en EE.UU.

## Stack

- **Astro 5** — SSG, sin SSR. Todo el dinamismo es client-side JS.
- **Tailwind CSS 3** — Estilos utilitarios.
- **Lucide Astro** — Iconos SVG.
- **Hosting:** Cloudflare Pages (`public/_redirects`), con el dominio detrás
  del proxy de Cloudflare.
- **`/api/*`:** un Cloudflare Worker aparte (no hay `functions/` en este repo).
  No tiene lógica propia: reenvía el JSON crudo del repo del backend tal cual.
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

### El resultado nunca va hacia atrás

El build y el navegador leen el mismo archivo pero no a la vez: el Worker lo
trae de `raw.githubusercontent.com`, cuyo CDN sirve la copia anterior unos
minutos después de cada commit. Justo tras publicarse un sorteo eso daba el
parpadeo clásico —el HTML traía el número nuevo, la primera petición del
navegador devolvía el viejo y lo pisaba— hasta el siguiente refresco.

Por eso el build incrusta, junto al HTML, un `<script type="application/json"
id="datos-sorteos">` con el recorte de datos usado y el `momento` en que el
backend generó ese JSON:

- **Puerta de frescura.** Una respuesta con `fecha_actualizacion` anterior a la
  que hay en pantalla se descarta y se reintenta cada 20 s (hasta 5 min) con la
  URL forzada, porque dentro de la misma ventana de 30 s el borde devolvería el
  mismo JSON viejo.
- **Fusión por sorteo.** `fusionarSorteos()` se queda, juego por juego, con la
  versión más avanzada. Un número ya publicado no lo borra una lectura a medias
  del scraper.
- **Repintado quirúrgico.** Las tarjetas llevan `data-key` y las secciones
  `data-tanda`; el cliente sólo reemplaza las que cambiaron y les pone
  `.recien-actualizada`. El resto ni se toca, así que las esferas no repiten su
  animación de entrada cada minuto.

**El recorte embebido tiene que reproducir el HTML del build carácter por
carácter** (`datosMinimos()` guarda exactamente los campos que usa el render).
Si deja de hacerlo, el primer refresco reemplaza todas las tarjetas sin motivo.

Si el build no logra leer la API cae a un respaldo
(`raw.githubusercontent.com/jzuniga1995/lotohn/main/resultados_hoy.json`) y, si
tampoco responde, deja el placeholder de siempre. **Un fallo de red nunca tumba
el build.**

**Un sorteo nuevo necesita un despliegue nuevo.** El workflow del backend
dispara un deploy hook de Cloudflare Pages cuando cambian los números (ver
*Backend relacionado*). Sin ese hook el HTML se queda con el sorteo del último
despliegue: los visitantes lo ven igual, los bots no.

### Endpoints consumidos

El Worker enruta por prefijo y devuelve el archivo del repo `lotohn` sin tocarlo
(sólo le quita el BOM):

| Endpoint | Archivo que sirve | Descripción |
|----------|-------------------|-------------|
| `/api/historial` | `historial.json` | Historial acumulado `{ "YYYY-MM-DD": { ... } }` |
| `/api/analizar` | `analisis.json` | Análisis del día `{ fecha, juegos: { patrones, tendencias, sugerencias[] } }`. También se incrusta en el build |
| *cualquier otra* | `resultados_hoy.json` | Resultados del día por juego y tanda |

`/api/resultados-v2` cae en el `else`: no es una ruta declarada, es el caso por
defecto. Los tres responden `no-store, no-cache, must-revalidate`, y el Worker
cachea en el borde su petición a GitHub 30 s (`cacheTtl: 30`).

`Access-Control-Allow-Origin` está fijado a `https://lotohn.com`, así que en un
preview de Pages (`*.pages.dev`) el fetch del navegador no pasa. Desde que el
resultado va incrustado en el build, un preview igual muestra números — los del
momento en que se construyó.

**Por eso el respaldo del build no es un plan B degradado:** el Worker sirve
exactamente `raw.githubusercontent.com/jzuniga1995/lotohn/main/resultados_hoy.json`,
que es justo lo que `datos-build.js` pide si la API no responde. Mismo archivo,
mismos bytes.

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

- **`Header.astro`** — Dos cabeceras. En escritorio (lg+) la barra blanca de
  enlaces de siempre. En móvil y tableta (< 1024 px) la **barra de app**
  violeta (ver *App en móvil*): marca en las vistas de Resultados, título en
  las otras pestañas, botón de volver en las páginas de detalle, y debajo el
  selector de juegos (Todos · Jugá 3 · … · Súper Premio) sólo en Resultados.
- **`NavegacionMovil.astro`** — Barra de pestañas inferior (Resultados,
  Historial, Estadísticas, Signos, Más), hoja «Más» (`<dialog>`), aviso flotante
  e indicador de «desliza para actualizar». Lo pinta `Layout.astro` una vez.
- **`Footer.astro`** — Nav de resultados + sección Guías (11 links) + nav legal.
- **`AnalizadorIA.astro`** — Banner de análisis con pestañas por juego. Se pinta
  en el build (`obtenerAnalisis()`) y el navegador lo refresca contra
  `/api/analizar` cuando `main.js` avisa con el evento `lotohn:resultados`; si la
  firma del análisis no cambió, no toca el DOM. Pestañas ARIA con navegación por
  flechas. Las sugerencias se revelan con un clic y **el desbloqueo se recuerda
  toda la visita** (`sessionStorage`), no una vez por pestaña. Al pie lleva el
  `<Anuncio formato="enlace" />`, fuera de `.an-cuerpo` porque ese nodo lo
  reescribe el cliente en cada repintado. **El candado se abre gratis:** el
  enlace patrocinado es una invitación rotulada, nunca un peaje — condicionar el
  contenido a un clic en el anuncio es incentivación, y eso cierra la cuenta de
  la red.
- **`CoberturaPaises.astro`** — Sección visible de cobertura geográfica (HN · CR · US con ciudades).
- **`Layout.astro`** — Template base: Google Analytics, PWA (manifest + SW),
  preload logos, speculation rules, transiciones entre páginas, variables de la
  app de móvil (`--tab-alto`, `--tab-hueco`) y estilos globales. **Único sitio**
  donde van `theme-color` y las metas `apple-mobile-web-app-*`: las páginas no
  los repiten.
- **`ResultadosSorteos.astro`** — `#contenido` con los sorteos ya pintados en el build. Props: `tipoJuego`, `ariaLabel`, `textoCargando`.
- **`SchemaResultados.astro`** — JSON-LD `WebPage` + `ItemList` con los resultados y el `dateModified` real.
- **`FechasSEO.astro`** — `article:published_time` / `article:modified_time`.
- **`Anuncio.astro`** — Un hueco publicitario. Prop `formato` (ver *Monetización*).
- **`AnunciosGlobales.astro`** — Rieles laterales, ancla de móvil y script global de la red. Lo pinta `Layout.astro` una vez.
- **`PromoBanner.astro`** — Banner propio de EmprendeHN (ver *Promoción propia:
  EmprendeHN*). Sin `id` pinta el que le toca a la página.

## Librerías compartidas (`src/lib/`)

- **`sorteos.js`** — Toda la lógica de agrupar, ordenar y pintar sorteos. Sin DOM
  ni `window`: la usan el build y el navegador. Escapa todo lo que llega del
  scraper antes de meterlo en el HTML.
- **`datos-build.js`** — Lee la API durante el build. Una sola petición por
  build (cacheada en `globalThis`, que es lo que comparten `astro.config.mjs` y
  el render de páginas). Nunca lanza.
- **`analisis.js`** — Normaliza y pinta el análisis del día. Sin DOM ni `window`:
  la usan el build y el navegador, igual que `sorteos.js`. Parte las sugerencias
  (`"11-58-88"` → tres esferas de una misma combinación) y ordena las pestañas.
- **`iconos.js`** — SVG inline. El sitio nunca cargó el runtime `lucide`, así
  que los `<i data-lucide="…">` que generaba el JS quedaban en un `<i>` vacío y
  el icono no aparecía. **No volver a `data-lucide` en HTML generado.**
- **`fechas.js`** — `dateModified` de las guías a partir del último commit de
  git, con la fecha escrita a mano de respaldo si el checkout no trae historial.
- **`seo.js`** — `PUBLICADO_SITIO`, fijo a propósito.
- **`navegacion.js`** — Listas de juegos, guías y páginas informativas, y qué
  pestaña, título y tipo de barra le toca a cada ruta (`pestanaActiva()`,
  `tituloBarra()`, `esDetalle()`). Sin DOM ni `window`.
- **`anuncios.js`** — Claves y medidas de la red publicitaria, los interruptores
  `ANUNCIOS_ACTIVOS` (todo) y `SOCIAL_ACTIVO` (solo la barra social), y
  `rutaSobria()`, que deja las legales y el formulario sin barra social. Sin DOM
  ni `window`: la usan el build y el navegador.
- **`banners.js`** — Los 4 banners de EmprendeHN (`{ id, image, alt, campaign }`),
  la URL de registro con UTM, el interruptor `PROMO_ACTIVA` y `bannerDeRuta()`.
  Sin DOM ni `window`.

## Scripts client-side

- **`src/scripts/main.js`** — Fetch `/api/resultados-v2`, puerta de frescura,
  fusión por sorteo y repintado quirúrgico (ver *El resultado nunca va hacia
  atrás*). Auto-refresh 1 min en horarios de sorteo, 5 min el resto, y nada
  mientras la pestaña está de fondo. Reloj Honduras (UTC-6).
- **`src/scripts/app.js`** — Comportamiento de app en móvil: hoja «Más»
  (arrastrar para cerrar, Escape/atrás de Android), barra superior que se
  esconde al bajar, tocar la pestaña actual sube arriba, volver, compartir,
  instalar, ocultar pestañas con el teclado abierto y «desliza para
  actualizar» con la app instalada (emite `lotohn:refrescar`; `main.js` pone
  su petición en `detail.tareas`, y sin tareas se recarga la página).
- **`src/scripts/historial.js`** — Tabla interactiva, filtros juego/tanda, paginación 20 filas, exportar XLSX vía SheetJS CDN.
- **`src/scripts/anuncios.js`** — Carga perezosa de los huecos publicitarios,
  cierre del ancla de móvil y carga diferida de la barra social (tras `load`,
  `RETARDO_SOCIAL` de margen y solo con la pestaña a la vista).

## Estilos

- `public/styles_dinamicos.css` — Cards de sorteo (`.game-card`, `.bola`, `.sorteo-grid`, skeletons). Archivo estático, no pasa por Tailwind.
- Estilos de guías y estadísticas van en `<style>` dentro de cada `.astro`.

## PWA

- `public/manifest.webmanifest` — Instalable. `theme_color` igual al violeta de
  la barra de app (`#6d28d9`). Shortcuts a La Diaria, Jugá 3, Pega 3 e Historial.
- `public/sw.js` — Service worker **mínimo**. Sin caché offline — garantiza datos frescos en cada visita.

## App en móvil (< 1024 px)

En móvil y tableta el sitio se comporta como una app instalada. Todo es
**progresivo**: sin JavaScript las pestañas y los chips son enlaces normales y
«Más» es un enlace a `#pie`, donde el footer tiene los mismos enlaces.

- **Barra de app** (`Header.astro`) pegada arriba, violeta, con `theme-color`
  del mismo tono para que la barra de estado se funda con ella. En iOS
  instalada la barra de estado es `black-translucent` y el relleno superior
  es `env(safe-area-inset-top)` (viewport con `viewport-fit=cover`). Se
  esconde al bajar y vuelve al subir; la franja del notch se queda.
- **Barra de pestañas** fija abajo. Los juegos no son pestañas: son vistas de
  Resultados, que marca `aria-current="true"` en ellas. Las páginas que no son
  pestaña (guías, legales, contacto, 404) cuelgan de «Más» y llevan botón de
  volver: `history.back()` si se llegó desde el sitio, el inicio si no.
- **Hoja «Más»** = `<dialog>` modal: el velo es el propio dialog, el botón atrás
  de Android y Escape llegan como `cancel`. Al volver desde la bfcache se cierra.
- **El ancla de publicidad se apoya encima de la barra de pestañas**
  (`bottom: var(--tab-hueco)`), nunca pegada a los botones de navegación.
- **Transiciones entre páginas** con `@view-transition` (sin router de
  cliente: los scripts siguen corriendo en cada carga como siempre). Las
  barras tienen `view-transition-name` propio y se quedan quietas.
- **Speculation rules** con `prefetch` `moderate`: se baja el HTML al apoyar
  el dedo en un enlace. Sólo prefetch, nunca prerender — un prerender contaría
  visitas en Analytics y pediría anuncios.
- `html, body` usan `overflow-x: clip` y no `hidden`: con `hidden` en los dos
  el body se vuelve contenedor de scroll y el `sticky` de las cabeceras no se
  pega. **No volver a `hidden`.**
- Los `:hover` que levantan cosas van dentro de `@media (hover: hover)`: en
  táctil el hover se queda pegado tras el toque.
- Nada que se desplace en horizontal usa `scrollIntoView`: también mueve la
  página en vertical. Con él el inicio saltaba solo hasta el analizador al
  cargar.

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

**Con anuncios de Adsterra (agosto 2026).** En julio de 2026 el sitio quedó sin
publicidad: los formatos intrusivos (push, vignette, smartlinks) de Monetag,
Adsterra y Ezoic coincidieron con caídas de indexación y se quitó todo. La
publicidad volvió en agosto de 2026, esta vez con display y nativo, montada de
forma que no pueda repetir el daño.

Todo vive en tres archivos:

| Archivo | Papel |
|---------|-------|
| `src/lib/anuncios.js` | Claves, medidas, formatos. **Único sitio donde tocar nada.** |
| `src/components/Anuncio.astro` | Un hueco en el flujo de la página |
| `src/components/AnunciosGlobales.astro` | Rieles laterales, ancla de móvil, script global y permiso de la barra social |
| `src/scripts/anuncios.js` | Carga perezosa por `IntersectionObserver` + barra social diferida |

**`ANUNCIOS_ACTIVOS = false` en `src/lib/anuncios.js` apaga todo el sitio de un
golpe:** los huecos dejan de renderizarse y no se pide un solo script de
terceros. Es la palanca a usar si la indexación vuelve a moverse.
**`SOCIAL_ACTIVO = false` apaga solo la barra social**, que es el único formato
flotante del sitio y por tanto el primer sospechoso si algo se mueve.

### Por qué cada banner va dentro de un iframe

El `invoke.js` de los banners hace dos cosas incompatibles con una página con
varios huecos: lee un **`atOptions` global** al ejecutarse (dos banners se
pisan) y pinta con **`document.write()`** (inyectado después de cargar, borra la
página entera). Metiendo cada banner en un iframe con `srcdoc` los dos problemas
desaparecen —documento aparte, `atOptions` aparte, `document.write` encerrado— y
de paso el script del proveedor deja de bloquear el parser.

El `srcdoc` **no** viaja en el HTML: el build deja el iframe vacío con el alto ya
reservado y `anuncios.js` se lo pone cuando el hueco se acerca a la pantalla. De
ahí salen tres propiedades que importan:

- **Cero terceros en la carga inicial** → el LCP no lo paga.
- **Cero salto de layout** → el alto está reservado desde el HTML.
- **Un hueco oculto por CSS nunca intersecta**, así que los rieles no piden
  anuncios en móvil ni el ancla en escritorio.

Los iframes van con `sandbox` explícito: el creativo puede pintarse, abrir su
enlace al hacer clic y enviar formularios, pero **no puede navegar la pestaña sin
que el usuario haga clic** (`allow-top-navigation-by-user-activation`). Eso corta
los redirects automáticos, que es justo el comportamiento que hundió la
indexación en julio.

### Huecos por página

`Layout.astro` pone el líder de cabecera y el de cierre, así que **toda ruta
nueva los hereda sin tocar su archivo**. El resto se coloca a mano:

| Formato | Escritorio | Móvil | Dónde |
|---------|-----------|-------|-------|
| `lider` | 728×90 | 320×50 | Cabecera y cierre (en `Layout.astro`) |
| `rectangulo` | 300×250 | 300×250 | Bajo los sorteos, y a un tercio de las guías |
| `medio` | 468×60 | 300×250 | Fondo del artículo SEO |
| `nativo` | — | — | A un tercio del contenido. **Uno por página**: el id del contenedor lo fija el proveedor |
| `vertical` / `columna` | 160×600 / 160×300 | oculto | Rieles laterales, solo a partir de 1660 px |
| `ancla` | oculto | 320×50 | Barra inferior de móvil, con X que la cierra por toda la sesión |
| `enlace` | — | — | Enlace directo de la red. Pie del analizador (solo `/`). **No pide nada a un tercero**: es un `<a>` del sitio |

**El banner nativo es el único que va inline** en el HTML: trae su propio
contenedor, carga `async` y no usa `atOptions`.

**El `enlace` no es un banner.** Es el Direct Link de la red usado como lo que
es —un enlace— y no como popunder ni como captura de los clics de la página:
sale una tarjeta rotulada con `rel="nofollow sponsored noopener"` que solo navega
si el visitante la toca, y el texto avisa de que abre un anuncio. Cero scripts,
cero salto de layout, cero redirección automática. El `titulo` y el `detalle` se
pueden pasar por props, **pero el aviso de que abre un anuncio no se quita.**

### La barra social

El otro script global (`SCRIPT_SOCIAL`) pinta su propio widget flotante en el
documento de arriba, así que es el único que **no** se puede encerrar en un
iframe: encerrado no se vería. Lo que lo mantiene a raya son tres condiciones, no
una:

- **No entra en la carga inicial.** No va en el HTML: `AnunciosGlobales.astro`
  deja una marca `#anuncioSocial` y `src/scripts/anuncios.js` inyecta el script
  tras el evento `load`, con `RETARDO_SOCIAL` de margen. El LCP no lo paga.
- **Ni con la pestaña de fondo.** Si `document.hidden`, espera al
  `visibilitychange`.
- **Ni en las rutas sobrias.** Sin la marca en el HTML no se pide nunca, y
  `rutaSobria()` no la deja salir en legales, formulario ni 404.

`rutaSobria()` quita la extensión antes de comparar: con `build.format: 'file'`
el `Astro.url.pathname` del build llega como `/privacidad.html`, no como
`/privacidad`.

Las páginas legales (`privacidad`, `terminos`) y las de formulario se quedan
solo con los dos huecos del layout: nada de llenar de anuncios una política de
privacidad.

**Reglas al añadir huecos:** nada de popunders, push ni vignettes — son
exactamente los formatos que costaron la indexación, y lo que tienen en común es
que **se mueven solos**: aparecen encima o navegan la pestaña sin que nadie los
toque. Esa es la línea, no el nombre del formato. El Direct Link entró por eso:
como `<a>` rotulado que solo navega con un clic, no se mueve solo. Como popunder
o como `onclick` de la página, sería lo mismo que se quitó en julio.

Un solo `nativo` por página y un solo `enlace` por página. Nunca condicionar
contenido a un clic en un anuncio: eso es incentivación y la red cierra la
cuenta. Y cualquier hueco nuevo se declara con `<Anuncio />`, nunca pegando el
snippet del proveedor en el HTML.

### Promoción propia: EmprendeHN

Aparte de la red, el sitio promociona EmprendeHN (directorio gratuito de
negocios de Honduras). El único objetivo es que se registren negocios: cada
banner lleva a `https://emprendehn.com/registro` con
`utm_source=lotohn&utm_medium=banner&utm_campaign=<campaña>`, y el clic manda
`banner_click` a Analytics con `banner_campaign` y `banner_id`.

- Son imágenes del propio sitio (`public/logos/emprendehn-*.webp`, a 480, 800 y
  1264 px) dentro de un `<a>` rotulado «Para emprendedores», con
  `rel="noopener sponsored"`. Cero scripts de terceros.
- Clases y atributos con prefijo `promo-emprendehn`. **Nada de `.anuncio` ni de
  sus contenedores**: los scripts de la red no deben tocarlos y los bloqueadores
  que buscan `.anuncio` no deben esconderlos.
- El banner de cada página sale fijo del build (`bannerDeRuta()`: rota en el
  orden de secciones del sitio, con un hash para rutas fuera de esa lista).
  Nunca se sortea en el cliente: la imagen cambiaría después de pintarse.
- **Uno por página**, como una tarjeta más: siempre después de los resultados y
  con al menos una sección de contenido entre él y cualquier anuncio de la red.
  Inicio: entre los resultados y el analizador. Juegos: dentro del artículo,
  entre el `nativo` y el `medio`. Estadísticas y guías: justo antes de los
  enlaces relacionados.
- Sin banner: historial (no hay hueco a una sección de distancia de la red),
  la guía de estrategias (la sección de antes es «Juego responsable»), signos,
  legales, contacto y 404.
- `PROMO_ACTIVA = false` en `src/lib/banners.js` los quita todos.

La regla de la sección de por medio vale en los dos sentidos: un hueco nuevo de
la red tampoco se pega a un `<PromoBanner />`.

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

Tras publicar y purgar Cloudflare, el workflow dispara el deploy hook de
Cloudflare Pages para que el HTML se regenere con el sorteo nuevo. Requiere el
secret `CF_PAGES_DEPLOY_HOOK` en el repo del backend; sin él, el paso
simplemente se salta.

Son ~3 despliegues al día (uno por tanda con números nuevos), muy por debajo de
los 500 builds/mes del plan gratuito de Pages.

El disparo va por `firma_resultados.py` (hash de los números, sin sellos de
tiempo) y **no** por el `git diff`: `resultados_hoy.json` cambia en todas las
corridas porque `fecha_actualizacion` y cada `fecha_consulta` llevan la hora de
la corrida, así que el diff nunca está vacío. Enganchar el hook ahí sería
reconstruir el sitio cada pocos minutos sin motivo.
