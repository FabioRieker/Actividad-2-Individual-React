# Tarea 4: tabla comparativa de accesibilidad (WCAG 2.1 AA)

Lighthouse 12.8.2, categoría Accesibilidad, emulación móvil, Chrome headless.

| Medición | Tema claro | Tema oscuro |
|---|---|---|
| Inicial (commit 8576778) | 94 | 94 |
| Final | 100 | 100 |

Informes: `evidence/tarea4/inicial/lh-inicial-{claro,oscuro}.report.{json,html}` y `evidence/tarea4/final/lh-final-{claro,oscuro}.report.{json,html}`.
En la medición inicial la única auditoría fallida fue `aria-required-parent` (8 nodos). En la final no falla ninguna.

| Hallazgo | Criterio WCAG 2.1 | Evidencia inicial (archivo) | Corrección (commit) | Evidencia final (archivo) | Estado |
|---|---|---|---|---|---|
| H1. `listitem` anidado (`ion-item-sliding` y `ion-item`), `aria-required-parent` en 8 nodos | 1.3.1 Información y relaciones, 4.1.2 Nombre, función, valor | `evidence/tarea4/inicial/lh-inicial-claro.report.json` | `e3e9140` fix(a11y): corregir estructura de lista del listado | `evidence/tarea4/final/lh-final-claro.report.json`, `evidence/tarea4/final/a11y-probe.log` (listitem sin anidar) | Corregido y verificado |
| H2. Placeholder del buscador en tema oscuro rgb(38,38,38) sobre #2b303c (ratio 1.15:1) | 1.4.3 Contraste (mínimo) | `evidence/tarea4/inicial/probe-dark-320.png` | `065cb87` fix(a11y): asegurar contraste del texto de ayuda de búsqueda | `evidence/tarea4/final/a11y-probe.log` (6.36:1 claro, 6.91:1 oscuro) | Corregido y verificado |
| H3. A 320 px el buscador y el selector miden 362 px y el selector se recorta | 1.4.10 Reflujo | `evidence/tarea4/inicial/probe-light-320.png`, `evidence/tarea4/inicial/probe-dark-320.png` | `d7eef86` fix(a11y): permitir reflujo de los controles a 320 px | `evidence/tarea4/final/a11y-probe.log` (288 px <= 320 px, sin desbordamiento) | Corregido y verificado |
| H4. El input interno del buscador tiene `aria-label="search text"` (inglés) | 2.5.3 Etiqueta en el nombre, 4.1.2 Nombre, función, valor | Observado en el DOM durante la auditoría inicial (sin archivo específico; ver `evidence/tarea4/inicial/lh-inicial-claro.report.json`, nodo del buscador) | `50d4965` fix(a11y): etiquetar en español el campo de búsqueda | `evidence/tarea4/final/a11y-probe.log` ("Buscar código o destino", igual que el placeholder visible) | Corregido y verificado |
| H5. Tras activar «Marcar como inspeccionado» con teclado el foco pasa a `BODY` (botón `disabled`) y no hay anuncio | 2.4.3 Orden del foco, 4.1.3 Mensajes de estado | Observado por teclado en la auditoría inicial (sin archivo específico) | `2ceafda` fix(a11y): conservar el foco y anunciar cambios de estado | `evidence/tarea4/final/a11y-probe.log` (foco en `ION-BUTTON`, `aria-disabled=true`, anuncio «LTK-0001-ES marcado como inspeccionado») | Corregido y verificado |

## Notas

- Las pruebas automáticas que cubren H1, H4 y H5 están en `src/pages/Home.test.tsx`, `src/pages/Home.a11y.test.tsx` y `src/components/PackageCard.test.tsx`.
- La sonda `scripts/a11y-probe.mjs` mide a 320 px en ambos temas; su salida está en `evidence/tarea4/final/a11y-probe.log`.
- El tema oscuro de Lighthouse se obtiene con `--force-dark-mode --enable-features=WebContentsForceDark`; la página adapta su paleta con `prefers-color-scheme`.
- La auditoría automática no sustituye una revisión manual con lector de pantalla.
- El diff de código fuente está en `evidence/tarea4/diff-a11y.patch`.
- Pendiente: el job `lighthouse` de CI no se ha ejecutado en GitHub (no se ha hecho push).
