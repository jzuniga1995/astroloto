// ============================================
// ICONOS INLINE
// ============================================
//
// El sitio nunca cargó el runtime `lucide`: los <i data-lucide="..."> que
// generaba el render de tarjetas se quedaban como un <i> vacío y el icono no
// aparecía nunca (`lucide.createIcons()` sale por la rama del `typeof
// undefined`). Con el SVG escrito acá el icono se ve igual en el HTML que sirve
// el build y en el re-render del cliente, que es justo lo que hace falta para
// que el bot y el visitante vean lo mismo.
//
// Trazos copiados de lucide-astro para que coincidan con los iconos que las
// páginas ya pintan en tiempo de build.

const TRAZOS = {
    'clock':     '<path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/>',
    'calendar':  '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    'sunrise':   '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
    'sun':       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    'moon':      '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
    'layers':    '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    'loader':    '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
    'info':      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'alerta':    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};

export function icono(nombre, clase = 'w-4 h-4') {
    const trazos = TRAZOS[nombre];
    if (!trazos) return '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" `
         + `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" `
         + `stroke-linejoin="round" class="lucide ${clase}" aria-hidden="true" focusable="false">`
         + `${trazos}</svg>`;
}
