// src/scripts/anuncios.js
//
// Carga perezosa de los huecos publicitarios.
//
// Cada hueco sale del build como un iframe vacío con el alto ya reservado. Acá
// se le mete el `srcdoc` con el snippet del proveedor solo cuando el hueco se
// acerca a la pantalla. Consecuencias que importan:
//
//   · Nada de terceros se pide en la carga inicial → el LCP no lo paga.
//   · El `document.write()` del banner ocurre dentro del iframe, no en la página.
//   · Cada iframe tiene su propio `atOptions`, así que caben todos los banners
//     que haga falta sin pisarse.
//   · Un hueco oculto por CSS (rieles en móvil, ancla en escritorio) nunca
//     intersecta, así que nunca pide un anuncio que nadie va a ver.
//
// Acá vive también la barra social, que es el único script de la red que corre
// en la página y no dentro de un iframe (pinta su propio widget flotante, y
// encerrado no se vería). Se pide lo más tarde posible — ver `pedirSocial()`.
import {
    ANUNCIOS_ACTIVOS, documentoBanner, medidaPara, PUNTO_MOVIL,
    SOCIAL_ACTIVO, SCRIPT_SOCIAL, RETARDO_SOCIAL,
} from '../lib/anuncios.js';

const CLAVE_ANCLA = 'lotohn:ancla-cerrada';

function activarHueco(marco) {
    const medida = medidaPara(marco.dataset.anuncio, window.innerWidth);
    if (!medida) return false;
    marco.srcdoc = documentoBanner(medida);
    marco.dataset.cargado = medida;
    return true;
}

function observarHuecos() {
    const marcos = document.querySelectorAll('iframe[data-anuncio]:not([data-cargado])');
    if (!marcos.length) return;

    // Sin IntersectionObserver (navegadores viejos) se cargan todos de una:
    // vale más un anuncio servido que una página sin ingresos.
    if (!('IntersectionObserver' in window)) {
        marcos.forEach(activarHueco);
        return;
    }

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            if (activarHueco(entrada.target)) observador.unobserve(entrada.target);
        });
    }, { rootMargin: '400px 0px' });

    marcos.forEach((marco) => observador.observe(marco));
}

// El ancla tapa el final de la página en móvil: se le devuelve el espacio al
// body y se puede cerrar. Cerrada, no vuelve en toda la sesión.
function prepararAncla() {
    const ancla = document.getElementById('anuncioAncla');
    if (!ancla) return;

    let cerrada = false;
    try { cerrada = sessionStorage.getItem(CLAVE_ANCLA) === '1'; } catch { /* modo privado */ }

    if (cerrada || window.innerWidth >= PUNTO_MOVIL) {
        ancla.remove();
        return;
    }

    document.body.classList.add('con-ancla');

    ancla.querySelector('.anuncio-ancla-cerrar')?.addEventListener('click', () => {
        ancla.remove();
        document.body.classList.remove('con-ancla');
        try { sessionStorage.setItem(CLAVE_ANCLA, '1'); } catch { /* modo privado */ }
    });
}

// Barra social. Tres condiciones antes de pedirla, y las tres importan:
//
//   · La marca `#anuncioSocial` sólo existe en las rutas donde toca. Sin ella no
//     se pide nada: las legales y el formulario se quedan limpios.
//   · Se espera al `load` y RETARDO_SOCIAL más, así que ningún recurso de
//     tercero compite con el primer pintado ni con el LCP.
//   · Con la pestaña de fondo no se carga: a quien no está mirando no se le
//     gasta el plan de datos ni se le pone un widget esperando.
function pedirSocial() {
    const marca = document.getElementById('anuncioSocial');
    if (!marca) return;
    // Consumida: si `arrancar()` volviera a correr, no se duplica el script.
    marca.remove();

    const script = document.createElement('script');
    script.src = SCRIPT_SOCIAL;
    script.async = true;
    document.body.appendChild(script);
}

function programarSocial() {
    if (!SOCIAL_ACTIVO || !document.getElementById('anuncioSocial')) return;

    const cuandoSeVea = () => {
        if (document.hidden) {
            document.addEventListener('visibilitychange', cuandoSeVea, { once: true });
            return;
        }
        setTimeout(pedirSocial, RETARDO_SOCIAL);
    };

    if (document.readyState === 'complete') cuandoSeVea();
    else window.addEventListener('load', cuandoSeVea, { once: true });
}

function arrancar() {
    prepararAncla();
    observarHuecos();
    programarSocial();
}

if (ANUNCIOS_ACTIVOS) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', arrancar, { once: true });
    } else {
        arrancar();
    }
}
