# Adaptabilidad a Mobile

**Fecha:** 2026-08-03
**Origen:** Encargo directo del usuario ("hacer la adaptabilidad a Mobile"). No hay ticket ni requerimiento de backend asociado — es puramente frontend/CSS/layout.

## Contexto

El frontend hoy no tiene ningún tratamiento responsive sistemático:

- `AppLayout.tsx` (sidebar de 280px/80px colapsado + topbar) es un layout fijo, sin media queries, sin drawer, sin bottom nav. Por debajo de ~1024px de ancho la UI se corta o se vuelve inutilizable.
- `docs/DESIGN.md` §9.11 ya especifica un `BottomNavBar` "solo mobile", y `tailwind.config.js` ya tiene tokens sin usar pensados para mobile (`margin-mobile: 16px`, `headline-lg-mobile`). El sistema de diseño anticipó mobile; el código nunca lo implementó.
- Solo 7 archivos en todo `src/` usan alguna clase `sm:`/`md:`/`lg:` de Tailwind, de forma puntual y no coordinada.
- Hay 13 pantallas (`src/pages/*`), con patrones de layout heterogéneos: kanban horizontal (Pipeline), tablas densas de Ant Design (Cartera, Contactos, TablaOportunidades), grids de cards y métricas (Inicio, Reportes), y ~8 modales de Ant Design para crear/editar entidades.
- `index.html` ya tiene el `<meta name="viewport">` correcto — no requiere cambios.
- No existe infraestructura de testing de comportamiento visual/CSS en el repo; `TESTING-frontend.md` mandata TDD pero está orientado a lógica, no a layout.

## Decisiones (confirmadas con el usuario)

1. **Alcance:** un solo spec para las 13 pantallas de la app (no se decompone en specs por pantalla). El plan de implementación sí se divide en fases.
2. **Breakpoint único:** corte en `768px` (Tailwind `md`). Por debajo: layout mobile. Desde `768px` en adelante (incluye tablets): se mantiene el layout desktop actual, sin tratamiento intermedio para tablet.
3. **Enfoque técnico — CSS-only:** ambos layouts (desktop y mobile) coexisten en el DOM; Tailwind (`hidden md:flex` / `flex md:hidden`) decide cuál se muestra según el viewport real. No se introduce un hook JS de detección de breakpoint (`matchMedia`/`useBreakpoint`) para esta decisión.
4. **Navegación mobile:** `BottomNavBar` fijo (según DESIGN.md §9.11) con 5 accesos rápidos, **más** un botón hamburguesa en el topbar mobile que abre un `Drawer` con el listado completo de navegación (mismo contenido que el sidebar desktop hoy). No se usa el patrón "5 ítems + botón 'Más' en el propio bottom nav": el acceso a todo lo demás vive en el drawer del hamburguesa.
5. **Tablas:** se mantiene `<Table>` de Ant Design con scroll horizontal + primera columna `fixed: 'left'`. No se convierten a listas de cards.
6. **Modales:** fullscreen en mobile (`width: 100vw`, sin `borderRadius`, contenido a `100dvh` con scroll interno), no bottom sheet.
7. **Testing:** excepción documentada a la regla de TDD de `CLAUDE.md` para esta iniciativa. Es mayormente CSS/layout, no verificable de forma significativa con Vitest + Testing Library (no renderiza CSS real ni viewport). Verificación exclusivamente por QA visual manual (Chrome DevTools responsive: 375px, 390px, 768px) al cierre de cada fase.
8. **Orden de fases:** shell fundacional primero, luego por prioridad de uso real en campo (no por orden del menú).

## Alcance

### Fase 1 — Shell fundacional

#### 1.1 `src/components/AppLayout.tsx`

- El `<aside>` sidebar actual se envuelve en `hidden md:flex` (se oculta por debajo de 768px, sin cambios de comportamiento desde 768px en adelante).
- **Topbar mobile** (nuevo bloque, `flex md:hidden`, mismo alto `h-16` que el desktop):
  - Botón hamburguesa a la izquierda (ícono `menu`) que abre un `Drawer` de Ant Design (`placement="left"`, ancho ~85% o 300px).
  - El `Drawer` reutiliza el mismo array `items: NavItem[]` que ya arma `AppLayout` (incluye los ítems condicionales por rol: Reportes, Gerencia, Solicitudes) más el ítem "Configuración" (solo admin) y "Cerrar sesión" al final. Mismo comportamiento de navegación (`NavLink`) que el sidebar desktop; se cierra el drawer al navegar (`onClick` adicional a cada link dentro del drawer).
  - El buscador global (`<form role="search">`) no se muestra expandido: se reemplaza por un ícono de lupa. Al tocarlo, un input full-width se superpone al topbar (oculta temporalmente logo/hamburguesa) con un botón de cerrar; mismo `onSubmit` que hoy (navega a `/cartera?q=...`).
  - Notificaciones (`NotificacionesDropdown`) y avatar se mantienen a la derecha; en mobile el avatar se muestra solo con iniciales (sin nombre/rol en texto, por espacio). El `Dropdown` de logout sigue funcionando igual al tocar el avatar.
- **`BottomNavBar`** (nuevo componente, `fixed bottom-0 left-0 right-0 z-40`, `flex md:hidden`, estilo según DESIGN.md §9.11: fondo `surface`, borde superior `outline-variant`, ítem activo `bg-secondary-container` + `rounded-full` + `scale-95`):
  - 5 ítems fijos, sin variar por rol: Inicio, Pipeline, Cartera, Prospección, Actividades.
  - Cada ítem es un `NavLink` con ícono Material Symbols 24px + label 10px, igual que especifica DESIGN.md.
- El contenedor de contenido (`<div className="flex-1 overflow-y-auto ...">` que envuelve `<Outlet/>`) gana `pb-20 md:pb-0` para que el `BottomNavBar` no tape el final del contenido en mobile.

#### 1.2 `src/components/CotizadorFab.tsx`

- Reposicionar en mobile: `bottom-6` pasa a `bottom-[88px] md:bottom-6` (encima del `BottomNavBar` de 64px + margen, sin cambiar su posición actual en desktop).
- Sin cambios de comportamiento (el hover-expand simplemente no se activa en touch, lo cual es aceptable: el estado de reposo ya es solo el ícono).

#### 1.3 Patrón de modal fullscreen

**Hallazgo durante la exploración detallada:** la app tiene **31 usos de `<Modal>`** repartidos en 24 archivos (no 8-9 como se estimó inicialmente), de los cuales 14 declaran un `width` fijo entre 440 y 640px.

Editar 31 modales uno por uno sería costoso y frágil. En su lugar se usa **una sola regla CSS global** con media query en `src/index.css`, que cubre los 31 modales de una vez y es 100% consistente con la Decisión 3 (CSS-only, sin `matchMedia` en JS):

```css
@media (max-width: 767px) {
  .ant-modal { max-width: 100vw !important; margin: 0 !important; top: 0 !important; padding-bottom: 0 !important; }
  .ant-modal-content { border-radius: 0 !important; min-height: 100dvh; display: flex; flex-direction: column; }
  .ant-modal-body { flex: 1; overflow-y: auto; }
}
```

El `width={560}` que Ant Design aplica como estilo inline sobre `.ant-modal` queda neutralizado por `max-width: 100vw !important`. No se modifica ningún archivo de modal.

#### 1.4 Grids con `gridTemplateColumns` inline

**Segundo hallazgo:** hay **16 grids declarados como estilo inline** (`style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}`), la mayoría pares/tríos de campos dentro de formularios de modal. Un estilo inline **no puede hacerse responsive con clases de Tailwind ni con la regla global de 1.3** — hay que convertir cada uno a clases (`className="grid grid-cols-1 md:grid-cols-2 gap-3"`). Como los modales pasan a ocupar 100vw (≈375px) en mobile, dejar `1fr 1fr` ahí produce campos de formulario inservibles. Estos 15 sitios se convierten en la fase que corresponda a su pantalla.

Los grids que usan `repeat(auto-fit, minmax(Npx, 1fr))` (Inicio, Reportes) **ya son responsive por construcción** — colapsan solos a 1 columna por debajo del `minmax`. No requieren cambios.

### Fase 2 — Pantallas de campo (Inicio, Pipeline, Cartera, OportunidadDetalle, EmpresaDetalle)

- **Inicio / Reportes (grids de métricas):** `grid-cols-4`/`grid-cols-3` → `grid-cols-1 md:grid-cols-4` (o el conteo que corresponda por pantalla), siguiendo la regla ya definida en DESIGN.md §4 ("en sm: 1 columna").
- **Pipeline — kanban:** ya usa `overflow-x-auto` con scroll horizontal por swipe táctil; sin cambios estructurales. Ajustar el `min-width` de `.kanban-column` (definido en CSS/Tailwind) para que una columna sea legible en 320–375px sin quedar demasiado angosta ni demasiado ancha.
- **Pipeline — vista tabla / Cartera / Contactos (tablas Ant Design):** agregar `scroll={{ x: 'max-content' }}` donde no exista, y `fixed: 'left'` + `width` explícito en la columna de razón social/nombre para que quede visible durante el scroll horizontal. (`TablaOportunidades.tsx` ya tiene `scroll={{ x: 'max-content' }}` y `fixed: 'right'` en Acciones; solo le falta fijar la primera columna.)
- **OportunidadDetalle / EmpresaDetalle:** las cards en grid de 2 columnas (`PropiedadesCard`, `ContactosCard`, `EventosCard`, `TareasCard`, etc.) pasan a apilarse en 1 columna en mobile.
- Títulos de página: `headline-lg` (32px) → usar el token ya existente `headline-lg-mobile` (24px) por debajo de 768px.
- Padding de página: `p-8` (32px) → `p-4 md:p-8`, alineado con el token `margin-mobile` (16px) ya definido en `tailwind.config.js`.

### Fase 3 — Contactos, Prospección, Actividades

Mismos patrones ya establecidos en Fase 2 (grids a 1 columna, tablas con scroll + columna fija, padding/tipografía mobile). Sin patrones nuevos.

### Fase 4 — Reportes, Gerencia, Solicitudes, Admin

Mismos patrones. Estas pantallas son de uso mayoritariamente administrativo/gerencial desde escritorio; se llevan al mismo estándar por consistencia, sin optimizaciones mobile adicionales más allá de lo ya definido.

## Fuera de alcance

- Drag-and-drop táctil en el kanban de Pipeline (no existe hoy ni en desktop).
- Rediseño del cotizador externo (sistema fuera de este repo).
- Tratamiento intermedio específico para tablet (768–1023px reciben el layout desktop tal cual).
- Dark mode (ya excluido por `CLAUDE.md`).
- Tests automatizados de layout/CSS (ver Decisión 7).

## Riesgos / notas abiertas

- El ícono de búsqueda expandible en el topbar mobile (1.1) es nuevo, sin equivalente actual — se implementa como estado local (`useState`) del propio `AppLayout`, igual que ya existe para `colapsado`/`busqueda`.
- La regla global de modales (1.3) usa `!important` sobre clases internas de Ant Design (`.ant-modal`, `.ant-modal-content`, `.ant-modal-body`). Es un acoplamiento a nombres de clase que Ant Design podría cambiar en un major. Se acepta el riesgo por el ahorro de tocar 31 archivos; una actualización mayor de Ant Design requiere revalidar esta regla.
- El stepper de `OportunidadDetallePage` (5 pasos horizontales con `justify-between` y `w-10 h-10` por paso) no cabe en 375px. Se resuelve con scroll horizontal en el contenedor del stepper, no apilándolo en vertical (perdería la lectura de progreso lineal que le da sentido).
- `LoginPage` usa `style={{ width: 400 }}` fijo en la card — se desborda por debajo de ~430px. Requiere `maxWidth: '100%'`. Login no está listado en ninguna fase por no ser una pantalla del shell; se corrige en Fase 1 junto con el resto de lo fundacional.
