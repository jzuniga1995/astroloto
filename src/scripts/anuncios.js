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
import { ANUNCIOS_ACTIVOS, documentoBanner, medidaPara, PUNTO_MOVIL } from '../lib/anuncios.js';

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

function arrancar() {
    prepararAncla();
    observarHuecos();
}

if (ANUNCIOS_ACTIVOS) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', arrancar, { once: true });
    } else {
        arrancar();
    }
}
