# Adaptabilidad Mobile — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que las 13 pantallas del CRM Quantum sean usables en pantallas de 320–767px, agregando navegación mobile (BottomNavBar + Drawer) y adaptando layouts, tablas y modales, sin alterar el comportamiento actual desde 768px en adelante.

**Architecture:** Enfoque CSS-only. Ambos layouts (desktop y mobile) coexisten en el DOM y Tailwind decide cuál se muestra vía `hidden md:flex` / `flex md:hidden`. No se introduce ningún hook JS de detección de breakpoint. Los 31 modales de Ant Design se vuelven fullscreen con una única regla CSS global con media query, sin tocar sus archivos. Los grids con `gridTemplateColumns` inline (que CSS externo no puede sobrescribir de forma responsive) se convierten a clases de Tailwind uno por uno.

**Tech Stack:** React 18 + TypeScript strict · Vite 5 · Tailwind CSS · Ant Design v5 · React Router v6 · Material Symbols Outlined.

## Global Constraints

- **Breakpoint único:** `768px` = `md` de Tailwind. Mobile es `< 768px`. Desde `768px` (incluye tablets) el layout desktop actual no cambia en absoluto.
- **CSS-only:** la decisión desktop-vs-mobile se toma con clases de Tailwind (`hidden md:flex`, `md:grid-cols-2`), nunca con `matchMedia`, `useBreakpoint`, `Grid.useBreakpoint` de Ant Design ni escuchando `resize`.
- **Sin tests automatizados.** Excepción documentada a la regla de TDD de `CLAUDE.md` (ver spec, Decisión 7). `npm run test` y `npm run lint` son stubs no-op en este repo. La verificación real de cada tarea es `npm run type-check` + QA visual manual.
- **TypeScript strict, nunca `any`** (regla 2 de `CLAUDE.md`).
- **Anchos de QA obligatorios:** 375px (iPhone SE/12 mini), 390px (iPhone 12/13/14), 768px (límite inferior del layout desktop). En cada tarea se verifican los tres.
- **Regla de oro de QA:** en ningún ancho el `<body>` debe hacer scroll horizontal. Contenido ancho (tablas, kanban, stepper) scrollea dentro de su propio contenedor.
- **No se toca `docs/contrato_api.md`** ni ningún archivo de `src/api/`, `src/hooks/`, `src/types/`. Este trabajo es exclusivamente de presentación.
- **Paleta y tokens:** usar los ya definidos en `tailwind.config.js` e `index.css`. No inventar colores ni tamaños nuevos.

## Comandos

```bash
npm run type-check   # única verificación automatizada real
npm run dev          # servidor en http://localhost:5173 para el QA manual
npm run build        # tsc --noEmit + vite build
```

## Procedimiento de QA manual (idéntico en todas las tareas)

1. `npm run dev`
2. Abrir `http://localhost:5173`, iniciar sesión.
3. Chrome DevTools → `Ctrl+Shift+M` (device toolbar) → seleccionar "Responsive".
4. Fijar el ancho en **375**, luego **390**, luego **768**.
5. Recorrer el checklist específico de la tarea en cada ancho.
6. En 375px, confirmar que `document.body.scrollWidth <= window.innerWidth` en la consola (sin scroll horizontal del body).

## Estructura de archivos

| Archivo | Responsabilidad | Estado |
|---|---|---|
| `src/components/navItems.ts` | Tipo `NavItem` + hook `useNavItems()` con el filtrado por rol. Fuente única para sidebar, drawer y bottom nav. | **Crear** (Task 1) |
| `src/components/BottomNavBar.tsx` | Barra fija inferior de 5 accesos rápidos. Solo mobile. | **Crear** (Task 2) |
| `src/components/TopBarMobile.tsx` | Topbar mobile: hamburguesa + Drawer de navegación completa, buscador expandible, notificaciones, avatar. | **Crear** (Task 3) |
| `src/components/AppLayout.tsx` | Shell raíz. Oculta el sidebar en mobile y monta TopBarMobile + BottomNavBar. | Modificar (Tasks 1, 4) |
| `src/index.css` | Reglas globales mobile: modales fullscreen, `.page-container`, `.kanban-column`, títulos de Ant Design. | Modificar (Task 5) |
| `src/components/CotizadorFab.tsx` | Reposicionar sobre el BottomNavBar. | Modificar (Task 4) |
| `src/pages/Login/LoginPage.tsx` | Card de ancho fijo 400px → fluida. | Modificar (Task 5) |
| Páginas de Fase 2/3/4 | Grids, tablas y cabeceras responsive. | Modificar (Tasks 6–12) |
| 16 grids con `gridTemplateColumns` inline | Convertir a clases Tailwind (CSS externo no los alcanza). | Modificar (Tasks 8–12) |

---

# FASE 1 — Shell fundacional

## Task 1: Extraer los ítems de navegación a una fuente única

Hoy `AppLayout.tsx` construye el array `items` inline (líneas 47–63). El Drawer mobile necesita exactamente la misma lista con el mismo filtrado por rol. Extraerla evita que ambas copias se desincronicen cuando se agregue una pantalla.

**Files:**
- Create: `src/components/navItems.ts`
- Modify: `src/components/AppLayout.tsx` (eliminar la interfaz `NavItem` local y la construcción inline de `items`)

**Interfaces:**
- Produces: `NavItem` (interfaz con `to: string`, `icono: string`, `label: string`) y `useNavItems(): NavItem[]`. Las Tasks 2, 3 y 4 consumen ambos.

- [ ] **Step 1: Crear `src/components/navItems.ts`**

```ts
import {
  useAuthStore,
  ROLES_REPORTES,
  ROLES_BANDEJA_GERENCIA,
  ROLES_SOLICITANTES,
  tieneRol,
} from '@/store/authStore'

export interface NavItem {
  to: string
  icono: string
  label: string
}

/**
 * Ítems de navegación principales, ya filtrados por el rol del usuario.
 *
 * Fuente única para el sidebar (desktop), el drawer del topbar mobile y —en su
 * subconjunto fijo— el BottomNavBar. Antes esta lista vivía inline en
 * `AppLayout`; al necesitarla también el drawer, se extrajo para que agregar
 * una pantalla no obligue a recordar dos lugares.
 */
export function useNavItems(): NavItem[] {
  const empleado = useAuthStore((s) => s.empleado)

  const items: NavItem[] = [
    { to: '/', icono: 'dashboard', label: 'Inicio' },
    { to: '/pipeline', icono: 'view_kanban', label: 'Pipeline' },
    { to: '/cartera', icono: 'account_balance_wallet', label: 'Cartera' },
    { to: '/contactos', icono: 'contacts', label: 'Contactos' },
    { to: '/prospeccion', icono: 'person_search', label: 'Prospección' },
    { to: '/actividades', icono: 'calendar_today', label: 'Actividades' },
  ]
  if (tieneRol(empleado, ROLES_REPORTES)) {
    items.push({ to: '/reportes', icono: 'monitoring', label: 'Reportes' })
  }
  if (tieneRol(empleado, ROLES_BANDEJA_GERENCIA)) {
    items.push({ to: '/gerencia', icono: 'fact_check', label: 'Gerencia' })
  }
  if (tieneRol(empleado, ROLES_SOLICITANTES)) {
    items.push({ to: '/solicitudes', icono: 'approval', label: 'Solicitudes' })
  }
  return items
}
```

- [ ] **Step 2: En `AppLayout.tsx`, borrar la interfaz `NavItem` local**

Eliminar por completo este bloque (líneas 17–21):

```tsx
interface NavItem {
  to: string
  icono: string
  label: string
}
```

- [ ] **Step 3: En `AppLayout.tsx`, borrar la construcción inline de `items`**

Eliminar por completo este bloque (líneas 47–63):

```tsx
  const items: NavItem[] = [
    { to: '/', icono: 'dashboard', label: 'Inicio' },
    { to: '/pipeline', icono: 'view_kanban', label: 'Pipeline' },
    { to: '/cartera', icono: 'account_balance_wallet', label: 'Cartera' },
    { to: '/contactos', icono: 'contacts', label: 'Contactos' },
    { to: '/prospeccion', icono: 'person_search', label: 'Prospección' },
    { to: '/actividades', icono: 'calendar_today', label: 'Actividades' },
  ]
  if (tieneRol(empleado, ROLES_REPORTES)) {
    items.push({ to: '/reportes', icono: 'monitoring', label: 'Reportes' })
  }
  if (tieneRol(empleado, ROLES_BANDEJA_GERENCIA)) {
    items.push({ to: '/gerencia', icono: 'fact_check', label: 'Gerencia' })
  }
  if (tieneRol(empleado, ROLES_SOLICITANTES)) {
    items.push({ to: '/solicitudes', icono: 'approval', label: 'Solicitudes' })
  }
```

Y en su lugar, junto a las demás llamadas a hooks (justo debajo de `const [busqueda, setBusqueda] = useState('')`), poner:

```tsx
  const items = useNavItems()
```

- [ ] **Step 4: Ajustar los imports de `AppLayout.tsx`**

El import del store queda solo con lo que el componente sigue usando (`useAuthStore` para `empleado`; `tieneRol` y las constantes de rol ya no se usan aquí porque se fueron a `navItems.ts`). Reemplazar el bloque de import (líneas 5–10):

```tsx
import {
  useAuthStore,
  ROLES_REPORTES,
  ROLES_BANDEJA_GERENCIA,
  ROLES_SOLICITANTES,
  tieneRol,
} from '@/store/authStore'
```

por:

```tsx
import { useAuthStore } from '@/store/authStore'
```

Y agregar junto a los demás imports de componentes locales:

```tsx
import { useNavItems } from './navItems'
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores. Si aparece `'tieneRol' is declared but its value is never read`, es que quedó algún uso viejo — revisar que el bloque del Step 3 se haya borrado entero. Nota: el condicional `empleado?.rol === 'admin'` del ítem "Configuración" (línea ~131) **se queda tal cual en AppLayout**, no usa `tieneRol`.

- [ ] **Step 6: QA manual — refactor sin cambio visible**

Seguir el "Procedimiento de QA manual". A ancho **1440px** (desktop normal, sin device toolbar):
- El sidebar muestra exactamente los mismos ítems que antes del cambio.
- Iniciar sesión con un rol de gerencia/admin si está disponible y confirmar que aparecen Reportes / Gerencia / Solicitudes.
- El ítem "Configuración" sigue apareciendo solo para admin.
- Colapsar y expandir el sidebar sigue funcionando.

Esta tarea es un refactor puro: no debe haber ningún cambio visual.

- [ ] **Step 7: Commit**

```bash
git add src/components/navItems.ts src/components/AppLayout.tsx
git commit -m "refactor(nav): extraer items de navegacion a navItems.ts"
```

---

## Task 2: BottomNavBar

Barra fija inferior con 5 accesos rápidos, según `docs/DESIGN.md` §9.11. La lista es fija y no varía por rol: las 5 pantallas elegidas (Inicio, Pipeline, Cartera, Prospección, Actividades) son accesibles para todos los roles. Todo lo demás vive en el Drawer de la Task 3.

**Files:**
- Create: `src/components/BottomNavBar.tsx`

**Interfaces:**
- Consumes: `NavItem` de `./navItems` (Task 1).
- Produces: `<BottomNavBar />` — componente sin props. La Task 4 lo monta en `AppLayout`.

- [ ] **Step 1: Crear `src/components/BottomNavBar.tsx`**

Especificación visual literal de `DESIGN.md` §9.11: `fixed bottom-0` full-width, fondo `surface`, borde superior `outline-variant`, ítems en `flex-col items-center` con color `on-surface-variant`, ítem activo con `bg-secondary-container` + `on-secondary-container` + `rounded-full` + `scale-95`, tipografía 10px, ícono Material Symbols 24px.

```tsx
import { NavLink } from 'react-router-dom'
import type { NavItem } from './navItems'

/**
 * Barra de navegación inferior, solo mobile (`< 768px`). Implementa
 * `docs/DESIGN.md` §9.11.
 *
 * La lista es fija y deliberadamente NO se filtra por rol: son las 5 pantallas
 * que cualquier rol puede abrir. Reportes, Gerencia, Solicitudes y
 * Configuración —que sí dependen del rol— viven en el drawer de
 * `TopBarMobile`, para no tener una barra que cambie de tamaño según quién
 * inicie sesión.
 */
const ITEMS: NavItem[] = [
  { to: '/', icono: 'dashboard', label: 'Inicio' },
  { to: '/pipeline', icono: 'view_kanban', label: 'Pipeline' },
  { to: '/cartera', icono: 'account_balance_wallet', label: 'Cartera' },
  { to: '/prospeccion', icono: 'person_search', label: 'Prospección' },
  { to: '/actividades', icono: 'calendar_today', label: 'Actividades' },
]

export function BottomNavBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden h-16 bg-surface border-t border-outline-variant"
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 transition-all ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container rounded-full scale-95'
                : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-[24px]">{item.icono}</span>
          <span className="text-[10px] font-semibold tracking-wide leading-none">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

Todavía no se ve nada: el componente existe pero no está montado. Se monta en la Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/components/BottomNavBar.tsx
git commit -m "feat(mobile): componente BottomNavBar segun DESIGN.md 9.11"
```

---

## Task 3: TopBarMobile — hamburguesa, Drawer de navegación y buscador expandible

Topbar de 64px (mismo alto que el desktop) para `< 768px`. Contiene: botón hamburguesa que abre un `Drawer` con la navegación completa filtrada por rol, un buscador que se expande al tocar la lupa, notificaciones y avatar.

El buscador se expande en vez de mostrarse siempre porque a 375px no caben input + notificaciones + avatar simultáneamente. Al expandirse ocupa toda la barra y oculta temporalmente el resto.

**Files:**
- Create: `src/components/TopBarMobile.tsx`

**Interfaces:**
- Consumes: `useNavItems()` de `./navItems` (Task 1); `NotificacionesDropdown` de `./NotificacionesDropdown`; `useLogout` de `@/hooks/useAuth`; `iniciales`, `nombreCompleto` de `@/utils/formato`; `useAuthStore` de `@/store/authStore`.
- Produces: `<TopBarMobile />` — componente sin props. La Task 4 lo monta en `AppLayout`.

- [ ] **Step 1: Crear `src/components/TopBarMobile.tsx`**

Notas de implementación relevantes:
- El submit del buscador replica exactamente el del topbar desktop: navega a `/cartera?q=<término>` y no hace nada si el término está vacío.
- Cada `NavLink` del drawer lo cierra al navegar (`onClick={() => setDrawerAbierto(false)}`), si no el drawer queda abierto sobre la pantalla nueva.
- El drawer incluye "Configuración" (solo admin) y "Cerrar sesión", igual que el sidebar desktop.
- `styles={{ body: { padding: 0 } }}` para que los `NavLink` ocupen todo el ancho del drawer y sean cómodos de tocar.

```tsx
import { useState } from 'react'
import { Drawer } from 'antd'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { useNavItems } from './navItems'

/**
 * Topbar de mobile (`< 768px`). El sidebar de desktop no cabe a este ancho, así
 * que la navegación completa se mueve a un Drawer lateral que abre la
 * hamburguesa; el BottomNavBar cubre aparte los 5 accesos frecuentes.
 *
 * El buscador se muestra colapsado como una lupa y se expande al tocarlo: a
 * 375px no caben a la vez el input, las notificaciones y el avatar.
 */
export function TopBarMobile() {
  const empleado = useAuthStore((s) => s.empleado)
  const logout = useLogout()
  const navigate = useNavigate()
  const items = useNavItems()
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const [buscadorAbierto, setBuscadorAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const cerrarDrawer = () => setDrawerAbierto(false)

  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    const q = busqueda.trim()
    if (q.length === 0) return
    navigate(`/cartera?q=${encodeURIComponent(q)}`)
    setBuscadorAbierto(false)
  }

  return (
    <>
      <header className="flex md:hidden h-16 shrink-0 items-center justify-between gap-2 px-4 bg-white border-b border-outline-variant/30">
        {buscadorAbierto ? (
          <form className="flex items-center gap-2 w-full" role="search" onSubmit={buscar}>
            <label className="sr-only" htmlFor="buscador-mobile">
              Buscar empresa por razón social o RUC
            </label>
            <input
              id="buscador-mobile"
              autoFocus
              className="flex-1 min-w-0 bg-surface-container-low border-none rounded-pill px-4 py-2 text-body-sm focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Razón social o RUC…"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button
              type="button"
              className="p-2 text-on-surface-variant shrink-0"
              aria-label="Cerrar búsqueda"
              onClick={() => setBuscadorAbierto(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className="p-2 -ml-2 text-on-surface shrink-0"
              aria-label="Abrir menú de navegación"
              onClick={() => setDrawerAbierto(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <img
              alt="Quantum Investment"
              className="h-7 object-contain"
              src="/logo-quantum.png"
            />

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className="p-2 text-on-surface-variant"
                aria-label="Buscar empresa"
                onClick={() => setBuscadorAbierto(true)}
              >
                <span className="material-symbols-outlined">search</span>
              </button>
              <NotificacionesDropdown />
              <div
                className="w-9 h-9 rounded-pill bg-brand-secondary/30 flex items-center justify-center border-2 border-brand-secondary/20 text-brand-tertiary font-bold text-xs shrink-0"
                title={nombreCompleto(empleado)}
              >
                {iniciales(empleado?.nombres, empleado?.apellidos)}
              </div>
            </div>
          </>
        )}
      </header>

      <Drawer
        placement="left"
        open={drawerAbierto}
        onClose={cerrarDrawer}
        width={280}
        closable={false}
        styles={{ body: { padding: 0 } }}
        className="md:hidden"
      >
        <div className="flex flex-col h-full bg-primary text-white">
          <div className="flex items-center justify-between px-6 pt-6 pb-8">
            <img
              alt="Quantum Investment"
              className="h-9 object-contain brightness-0 invert"
              src="/logo-quantum.png"
            />
            <button
              type="button"
              className="p-2 rounded-md text-white/80"
              aria-label="Cerrar menú"
              onClick={cerrarDrawer}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="flex-1 flex flex-col px-4 gap-1 overflow-y-auto">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={cerrarDrawer}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-6 py-3 font-body-md text-body-md transition-all ${
                    isActive ? 'sidebar-active-gradient font-bold text-white' : 'opacity-70'
                  }`
                }
              >
                <span className="material-symbols-outlined">{item.icono}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 flex flex-col gap-1">
            {empleado?.rol === 'admin' && (
              <NavLink
                to="/admin"
                onClick={cerrarDrawer}
                className="flex items-center gap-3 rounded-md px-6 py-3 text-body-md text-white opacity-70"
              >
                <span className="material-symbols-outlined">settings</span>
                Configuración
              </NavLink>
            )}
            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-6 py-3 text-body-md text-white opacity-70 text-left"
              onClick={() => {
                cerrarDrawer()
                logout()
              }}
            >
              <span className="material-symbols-outlined">logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

Si `useLogout()` no devolviera una función invocable sin argumentos, ajustar la llamada — en `AppLayout.tsx` ya se usa como `onClick: logout`, así que la forma es la misma.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBarMobile.tsx
git commit -m "feat(mobile): TopBarMobile con drawer de navegacion y buscador expandible"
```

---

## Task 4: Montar el shell mobile en AppLayout

Conecta las piezas de las Tasks 2 y 3: oculta el sidebar y el topbar de desktop por debajo de 768px, monta `TopBarMobile` y `BottomNavBar`, y da aire al contenido para que la barra inferior no lo tape. Incluye el reposicionamiento del `CotizadorFab`.

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/components/CotizadorFab.tsx:37`

**Interfaces:**
- Consumes: `<BottomNavBar />` (Task 2), `<TopBarMobile />` (Task 3).

- [ ] **Step 1: Importar los dos componentes nuevos en `AppLayout.tsx`**

Agregar junto a los demás imports de componentes locales:

```tsx
import { BottomNavBar } from './BottomNavBar'
import { TopBarMobile } from './TopBarMobile'
```

- [ ] **Step 2: Ocultar el sidebar en mobile**

En el `<aside>` (línea ~68), la clase empieza con `flex flex-col h-full`. Cambiar ese arranque a `hidden md:flex`:

```tsx
      <aside
        className={`hidden md:flex flex-col h-full ${colapsado ? 'w-20' : 'w-sidebar-width'} bg-primary text-white z-50 rounded-sidebar-curve shrink-0 shadow-xl overflow-hidden transition-all duration-200`}
      >
```

- [ ] **Step 3: Ocultar el topbar de desktop en mobile y montar el de mobile**

El `<header>` de desktop (línea ~148) empieza con `h-16 shrink-0 flex items-center`. Anteponer `hidden md:flex` y quitar el `flex` suelto para que no compita:

```tsx
        <header className="hidden md:flex h-16 shrink-0 items-center justify-between px-8 bg-white border-b border-outline-variant/30">
```

Inmediatamente **antes** de ese `<header>`, agregar:

```tsx
        <TopBarMobile />
```

- [ ] **Step 4: Dar espacio inferior al contenido y montar el BottomNavBar**

El contenedor del `<Outlet/>` (línea ~211) y el cierre del `<main>` quedan así — `pb-16` compensa exactamente los 64px de alto del BottomNavBar, y desde `md` vuelve a cero:

```tsx
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
          <Outlet />
        </div>
        <CotizadorFab />
        <BottomNavBar />
      </main>
```

- [ ] **Step 5: Reposicionar el CotizadorFab sobre la barra inferior**

En `src/components/CotizadorFab.tsx:37`, la clase contiene `absolute bottom-6 right-6`. El FAB quedaría tapado por el BottomNavBar (64px). Cambiar solo esa parte a:

```tsx
      className="group absolute bottom-[88px] md:bottom-6 right-6 z-40 flex h-14 w-14 items-center gap-3 overflow-hidden rounded-full bg-brand-primary pl-4 text-white shadow-xl transition-[width] duration-300 ease-out hover:w-48 hover:shadow-2xl"
```

`88px` = 64px de barra + 24px de margen. En `md` y arriba vuelve a `bottom-6`, idéntico a hoy.

- [ ] **Step 6: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 7: QA manual — el shell mobile completo**

Seguir el "Procedimiento de QA manual". En **375px** y **390px**:
- No se ve el sidebar navy; sí se ve el topbar mobile (hamburguesa, logo, lupa, campana, avatar) y el BottomNavBar con 5 ítems.
- Tocar la hamburguesa abre el drawer desde la izquierda con **todos** los ítems según el rol, más Configuración (si admin) y Cerrar sesión.
- Tocar un ítem del drawer navega **y cierra el drawer**.
- Tocar la lupa expande el buscador ocupando toda la barra; escribir "a" + Enter navega a `/cartera?q=a` y colapsa el buscador; la X lo cierra sin navegar.
- El ítem activo del BottomNavBar se resalta (fondo `secondary-container`, pill) y cambia al navegar.
- Ir a `/pipeline`: el FAB del cotizador se ve **por encima** del BottomNavBar, sin taparlo ni quedar tapado.
- Hacer scroll hasta el final de cualquier pantalla: el último contenido no queda oculto detrás del BottomNavBar.
- En la consola: `document.body.scrollWidth <= window.innerWidth` → `true`.

En **768px**:
- Reaparecen el sidebar y el topbar de desktop; desaparecen el topbar mobile y el BottomNavBar. No debe haber ningún ancho en el que se vean los dos a la vez.
- El FAB vuelve a `bottom-6`.

- [ ] **Step 8: Commit**

```bash
git add src/components/AppLayout.tsx src/components/CotizadorFab.tsx
git commit -m "feat(mobile): montar shell mobile (topbar + bottom nav) en AppLayout"
```

---

## Task 5: Reglas CSS globales de mobile

Una sola tanda de CSS que resuelve tres cosas transversales sin tocar componentes: los 31 modales pasan a fullscreen, el padding de página se reduce, y las columnas del kanban se ajustan a pantallas angostas. Incluye también el arreglo puntual de la card de Login.

**Files:**
- Modify: `src/index.css` (agregar bloque al final; ajustar `.kanban-column` en línea 77)
- Modify: `src/pages/Login/LoginPage.tsx:88`

- [ ] **Step 1: Agregar el bloque de reglas mobile al final de `src/index.css`**

```css
/* ── Adaptaciones mobile (< 768px) ──────────────────────────────────────
   Ver docs/superpowers/specs/2026-08-03-adaptabilidad-mobile-design.md */
@media (max-width: 767px) {
  /* Modales fullscreen.
     La app tiene 31 usos de <Modal>, 14 de ellos con un `width` fijo (440–640px)
     que Ant Design aplica como estilo inline sobre `.ant-modal`. A 375px eso
     desborda o deja el contenido apretado. Una regla global los cubre todos sin
     editar 31 archivos; `max-width` neutraliza el width inline.
     Acoplado a nombres de clase internos de Ant Design v5: revalidar si se
     actualiza a un major nuevo. */
  .ant-modal {
    max-width: 100vw !important;
    margin: 0 !important;
    top: 0 !important;
    padding-bottom: 0 !important;
  }

  .ant-modal-content {
    border-radius: 0 !important;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  /* El cuerpo absorbe el alto sobrante y scrollea solo, para que el título y
     los botones de acción queden siempre visibles en formularios largos. */
  .ant-modal-body {
    flex: 1;
    overflow-y: auto;
  }

  /* Padding de página: 32px se come demasiado ancho útil a 375px.
     16px es el token `margin-mobile` de tailwind.config.js. */
  .page-container {
    padding: 16px 16px 32px;
  }

  /* Columna de kanban: 320px fijos no dejan ver que hay más columnas al lado
     en una pantalla de 375px. 82vw deja asomar la siguiente y sugiere el swipe. */
  .kanban-column {
    min-width: 82vw;
    max-width: 82vw;
  }

  /* Títulos de página de Ant Design (`Typography.Title level={2}`, usado por
     Inicio, Cartera, Contactos, Solicitudes, Reportes, Gerencia y Admin).
     A su tamaño de desktop ocupan dos o tres líneas en 375px. 24px es el token
     `headline-lg-mobile` de tailwind.config.js. */
  h2.ant-typography {
    font-size: 24px !important;
    line-height: 32px !important;
    letter-spacing: -0.01em;
  }
}
```

- [ ] **Step 2: Arreglar el ancho fijo de la card de Login**

`src/pages/Login/LoginPage.tsx:88` tiene `style={{ width: 400, padding: 32 }}`. A 375px se desborda. Cambiar a:

```tsx
      <div className="bento-card" style={{ width: 400, maxWidth: '100%', padding: 32 }}>
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 4: QA manual — modales, padding y login**

Seguir el "Procedimiento de QA manual". En **375px**:
- Cerrar sesión: la card de login entra completa, sin scroll horizontal.
- Iniciar sesión → Cartera → "Nueva empresa": el modal ocupa toda la pantalla, sin bordes redondeados ni márgenes; el título se ve arriba y los botones Cancelar/Crear abajo; el formulario scrollea dentro del cuerpo del modal.
- Los títulos de página ("Hola, …", "Cartera", "Contactos") se ven a 24px, en una o dos líneas, no en tres.
- Pipeline → "Nueva Oportunidad": mismo comportamiento (es un modal más largo — verificar que el scroll interno funciona y los botones no se van fuera de pantalla).
- Pipeline (vista kanban): se ve una columna casi completa y asoma la siguiente; el swipe horizontal desplaza las columnas y el body **no** scrollea horizontalmente.
- Inicio y Cartera: el contenido respira 16px a cada lado, no 32px.

En **768px**:
- Los modales vuelven a estar centrados con su ancho original y esquinas redondeadas.
- `.page-container` vuelve a 32px de padding y `.kanban-column` a 320px.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/pages/Login/LoginPage.tsx
git commit -m "feat(mobile): reglas globales de modales fullscreen, padding y kanban"
```

---

# FASE 2 — Pantallas de campo

## Task 6: Inicio y cabeceras de página

`InicioPage` usa grids `repeat(auto-fit, minmax(220px, 1fr))` y `minmax(400px, 1fr)`, que **ya colapsan solos** a una columna por debajo de esos anchos — no requieren cambios. Lo que sí falta es que las cabeceras de página con título + botones no se desborden.

**Files:**
- Modify: `src/pages/Cartera/CarteraPage.tsx:183-198`
- Modify: `src/pages/Contactos/ContactosPage.tsx` (bloque de acciones de la cabecera)
- Modify: `src/pages/Solicitudes/SolicitudesPage.tsx` (bloque de acciones de la cabecera)

- [ ] **Step 1: Verificar primero que Inicio y Reportes no necesitan cambios**

Run: `npm run dev`, ir a `/` a 375px.
Expected: las 4 `MetricCard` se apilan en una sola columna y las dos tarjetas grandes (Tareas / lo que siga) también. Si es así, `InicioPage.tsx` no se toca en esta tarea.

Si alguna quedara en 2 columnas apretadas, el motivo sería un `minmax` menor al ancho disponible — anotarlo y bajar solo ese valor. No se espera que ocurra.

- [ ] **Step 2: Hacer que la barra de acciones de Cartera no se desborde**

En `src/pages/Cartera/CarteraPage.tsx`, el `Input.Search` tiene `style={{ width: 300 }}` fijo (línea ~187) y su contenedor no envuelve. A 375px, input de 300px + botón "Nueva empresa" se salen. Cambiar el contenedor (línea ~183) y el input:

```tsx
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', maxWidth: 420 }}>
          <Input.Search
            placeholder="Buscar por razón social o RUC"
            allowClear
            style={{ flex: 1, minWidth: 200 }}
            defaultValue={busqueda}
            key={busqueda}
            onSearch={cambiarBusqueda}
            onChange={(e) => {
              if (e.target.value === '') cambiarBusqueda('')
            }}
          />
```

El contenedor externo (línea ~167) ya tiene `flexWrap: 'wrap'`, así que el bloque de acciones cae debajo del título automáticamente.

- [ ] **Step 3: Contactos — buscador fluido**

`src/pages/Contactos/ContactosPage.tsx` ya tiene `flexWrap: 'wrap'` en el contenedor de la cabecera (línea ~52), así que el buscador ya cae debajo del título. Lo único que desborda es su ancho fijo de 300px. Cambiar el `Input.Search` (línea ~68):

```tsx
        <Input.Search
          placeholder="Buscar por nombre o teléfono"
          allowClear
          style={{ width: '100%', maxWidth: 420 }}
          onSearch={cambiarBusqueda}
          onChange={(e) => {
            if (e.target.value === '') cambiarBusqueda('')
          }}
        />
```

- [ ] **Step 4: Solicitudes — selector de estado fluido**

`src/pages/Solicitudes/SolicitudesPage.tsx` también tiene ya `flexWrap: 'wrap'` (línea ~196). Su `Select` de estados tiene `style={{ width: 200 }}` (línea ~212), que a 375px cabe pero queda desproporcionadamente angosto tras envolver. Cambiarlo a:

```tsx
          style={{ width: '100%', maxWidth: 260 }}
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 6: QA manual**

Seguir el "Procedimiento de QA manual". En **375px**:
- `/` (Inicio): métricas en una columna, sin desbordes.
- `/cartera`: el título queda arriba y el buscador + botón "Nueva empresa" debajo, ambos dentro de la pantalla. El buscador ocupa el ancho disponible.
- `/contactos` y `/solicitudes`: misma cabecera ordenada, sin scroll horizontal del body.

En **768px**: las cabeceras vuelven a mostrarse en una sola línea (título izquierda, acciones derecha), como hoy.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Cartera/CarteraPage.tsx src/pages/Contactos/ContactosPage.tsx src/pages/Solicitudes/SolicitudesPage.tsx
git commit -m "feat(mobile): cabeceras de pagina que envuelven en pantallas angostas"
```

---

## Task 7: Tablas con scroll horizontal y primera columna fija

Según la Decisión 5 del spec, las tablas se mantienen como `<Table>` de Ant Design con scroll horizontal y la columna identificadora fija a la izquierda, para no perder de vista de qué fila se trata al desplazarse.

Ant Design exige que **toda** columna con `fixed` tenga un `width` explícito; si falta, la columna fija se descuadra respecto al resto.

**Files:**
- Modify: `src/pages/Cartera/CarteraPage.tsx:72-84, 217-238`
- Modify: `src/pages/Contactos/ContactosPage.tsx` (definición de columnas y `<Table>`)
- Modify: `src/pages/Pipeline/TablaOportunidades.tsx:49-59`

- [ ] **Step 1: Cartera — fijar la columna Empresa y activar el scroll**

En `src/pages/Cartera/CarteraPage.tsx`, la primera columna del array `columnas` (línea ~73) pasa a:

```tsx
    {
      title: 'Empresa',
      key: 'empresa',
      fixed: 'left',
      width: 220,
      render: (_, e) => (
        <div>
          <div style={{ fontWeight: 600 }}>{e.razon_social}</div>
          <div className="metric-value" style={{ fontSize: 12, color: '#747781' }}>
            RUC {e.ruc}
          </div>
        </div>
      ),
    },
```

Y el `<Table>` (línea ~217) recibe `scroll`:

```tsx
          <Table
            rowKey="id"
            dataSource={empresas.data?.data ?? []}
            columns={esTabMaestra ? columnasMaestra : esAdmin ? [...columnas, columnaEliminar] : columnas}
            size="middle"
            scroll={{ x: 'max-content' }}
```

(el resto de las props del `<Table>` queda igual)

- [ ] **Step 2: Cartera — verificar que `columnasMaestra` hereda bien la columna fija**

`columnasMaestra` (línea ~115) se construye filtrando `columnas`, así que hereda `fixed: 'left'` y `width` de la columna Empresa automáticamente. No requiere cambios. Confirmarlo leyendo el código; no editar.

- [ ] **Step 3: Contactos — mismo tratamiento**

En `src/pages/Contactos/ContactosPage.tsx`, la primera columna del array `columnas` (línea ~25) pasa a:

```tsx
    {
      title: 'Contacto',
      key: 'contacto',
      fixed: 'left',
      width: 200,
      render: (_, c) => (
        <div>
          <div style={{ fontWeight: 600 }}>{nombreCompleto(c)}</div>
          <div className="metric-value" style={{ fontSize: 12, color: '#747781' }}>
            {c.email_1 ?? c.tlf_1 ?? '—'}
          </div>
        </div>
      ),
    },
```

Y agregar al `<Table>` (línea ~85), junto a `size="middle"`:

```tsx
            scroll={{ x: 'max-content' }}
```

- [ ] **Step 4: Pipeline — fijar la primera columna de TablaOportunidades**

`src/pages/Pipeline/TablaOportunidades.tsx` **ya tiene** `scroll={{ x: 'max-content' }}` (línea 399) y `fixed: 'right'` en la columna Acciones (línea 336). Solo falta fijar la primera. La columna `'Id'` (línea ~49) es la primera del array `DEFINICIONES` — pero el usuario puede ocultarla con el selector de columnas, y una columna fija que desaparece deja el scroll sin ancla.

Por eso se fija **`'Nombre de Oportunidad'`** (línea ~60), que es la que identifica la fila. Agregarle:

```tsx
      fixed: 'left',
      width: 220,
```

Nota: si `'Id'` sigue activa quedará a la izquierda de una columna fija, lo que Ant Design resuelve sin romper el layout (la fija se ancla igual). No requiere lógica adicional.

- [ ] **Step 5: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores. Si TypeScript se queja del literal `'left'`, es porque `ColumnsType` espera el tipo `FixedType` — anotar la columna como parte del array tipado `ColumnsType<T>` ya existente resuelve el ensanchamiento a `string`. Ambos archivos ya declaran `const columnas: ColumnsType<...>`, así que no debería ocurrir.

- [ ] **Step 6: QA manual**

Seguir el "Procedimiento de QA manual". En **375px**:
- `/cartera`: la tabla scrollea horizontalmente **dentro de su card**; la columna "Empresa" (razón social + RUC) permanece visible a la izquierda mientras se desplaza. El body no scrollea horizontalmente.
- Tocar una fila sigue navegando al detalle de la empresa (el scroll horizontal no debe romper el `onRow`/`onClick`).
- La paginación de abajo sigue funcionando y se ve completa.
- `/contactos`: mismo comportamiento con la columna de nombre.
- `/pipeline` → vista "Tabla": la columna "Nombre de Oportunidad" queda fija a la izquierda y "Acciones" a la derecha.

En **768px**: las tablas se ven igual que hoy (si el contenido cabe, no aparece scroll).

- [ ] **Step 7: Commit**

```bash
git add src/pages/Cartera/CarteraPage.tsx src/pages/Contactos/ContactosPage.tsx src/pages/Pipeline/TablaOportunidades.tsx
git commit -m "feat(mobile): tablas con scroll horizontal y primera columna fija"
```

---

## Task 8: Pipeline y modales de creación

La cabecera de Pipeline tiene el título más tres bloques de acciones (toggle Kanban/Tabla, "Mostrar cerradas", "Nueva Oportunidad") en un `flex` sin `wrap`, que a 375px se salen de la pantalla. Además el contenedor de página usa `p-8`.

Se incluyen aquí los dos modales de creación principales (`NuevaOportunidadModal`, abierto desde Pipeline, y `NuevaEmpresaModal`, abierto desde Cartera) porque tienen grids inline de 2 y 3 columnas que quedarían inservibles al pasar el modal a 375px de ancho.

**Files:**
- Modify: `src/pages/Pipeline/PipelinePage.tsx:57, 58, 65`
- Modify: `src/components/NuevaOportunidadModal.tsx:239, 279`
- Modify: `src/components/NuevaEmpresaModal.tsx:148`

- [ ] **Step 1: Reducir el padding de la sección en mobile**

Línea 57:

```tsx
    <section className="flex-1 overflow-hidden flex flex-col p-4 md:p-8 h-full">
```

- [ ] **Step 2: Hacer que la cabecera envuelva**

Línea 58 — el contenedor pasa a envolver y a alinear al inicio cuando hay dos filas:

```tsx
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
```

- [ ] **Step 3: Hacer que el bloque de botones envuelva**

Línea 65 — los tres controles se reparten y envuelven en vez de salirse:

```tsx
        <div className="flex flex-wrap gap-3">
```

- [ ] **Step 4: Convertir los grids inline de NuevaOportunidadModal**

Las líneas 239 y 279 tienen el mismo patrón. Reemplazar en **ambas**:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
```

por:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

- [ ] **Step 5: Convertir el grid inline de NuevaEmpresaModal**

Línea 148:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
```

por:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
```

- [ ] **Step 6: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 7: QA manual**

Seguir el "Procedimiento de QA manual". En **375px**, en `/pipeline`:
- El título "Pipeline de Ventas" y su subtítulo se ven completos.
- Los controles (Kanban/Tabla, Mostrar cerradas, Nueva Oportunidad) caen debajo del título y envuelven en varias líneas si hace falta, todos dentro de la pantalla.
- El kanban ocupa el resto del alto y scrollea horizontalmente (ya cubierto por `.kanban-column` de la Task 5).
- Alternar a vista "Tabla" y volver a "Kanban" funciona.
- Abrir "Nueva Oportunidad": modal fullscreen, campos apilados en una columna, botones de acción alcanzables al final del scroll.
- Ir a `/cartera` → "Nueva empresa": modal fullscreen, los 3 campos del grid apilados en una columna.
- El body no scrollea horizontalmente.

En **768px**: la cabecera vuelve a una sola línea con las acciones a la derecha, y los grids de los modales a 2 y 3 columnas.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Pipeline/PipelinePage.tsx src/components/NuevaOportunidadModal.tsx src/components/NuevaEmpresaModal.tsx
git commit -m "feat(mobile): Pipeline y modales de creacion responsive"
```

---

## Task 9: OportunidadDetalle

Tres problemas a 375px: el padding `px-margin-page` y `py-10`, el stepper de 5 pasos horizontales que no cabe, y los grids de `PropiedadesCard` / `EventosCard` con `gridTemplateColumns` inline de 2 y 3 columnas.

El stepper se resuelve con scroll horizontal, no apilándolo en vertical: la lectura de progreso lineal es lo que le da sentido, y en vertical se pierde.

**Files:**
- Modify: `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx:91, 101, 126, 127`
- Modify: `src/pages/OportunidadDetalle/PropiedadesCard.tsx:152, 187, 233`
- Modify: `src/pages/OportunidadDetalle/EventosCard.tsx:244`

- [ ] **Step 1: Reducir padding del contenedor principal**

`OportunidadDetallePage.tsx` línea 91:

```tsx
      <main className="max-w-7xl mx-auto px-4 md:px-margin-page py-6 md:py-10 flex flex-col gap-8">
```

- [ ] **Step 2: Hacer que el título y el botón de editar envuelvan, y reducir el título**

Línea 101 — a 375px el nombre largo de la oportunidad y el botón "Editar" compiten por el ancho:

```tsx
          <div className="flex flex-wrap justify-between items-end gap-3">
```

Y el `<h1>` de la línea 102 usa `text-headline-lg` (32px), que con un título tan largo ocupa media pantalla. Aplicar el token `headline-lg-mobile` (24px) por debajo de 768px:

```tsx
            <h1 className="font-headline text-headline-lg-mobile md:text-headline-lg text-primary">
```

- [ ] **Step 3: Dar scroll horizontal al stepper**

Línea 126 (la `<section>` que contiene el stepper) y línea 127 (el contenedor interno). La sección pierde el padding grande en mobile y gana el scroll; el contenedor interno recibe un ancho mínimo para que los 5 pasos no se compriman:

```tsx
        <section className="bg-white p-4 md:p-8 rounded border border-outline-variant custom-shadow overflow-x-auto custom-scrollbar">
          <div className="relative flex items-center justify-between w-full min-w-[520px] max-w-3xl mx-auto py-2">
```

`520px` es el ancho mínimo con el que los 5 pasos (círculo de 40px + label) siguen siendo legibles.

- [ ] **Step 4: Convertir los grids inline de PropiedadesCard**

Las líneas 152 y 187 tienen el mismo patrón de 3 columnas dentro de un modal. Reemplazar en **ambas**:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
```

por:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
```

Y la línea 233, que ya usa clases de Tailwind:

```tsx
          <div className="grid grid-cols-2 gap-4">
```

por:

```tsx
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

- [ ] **Step 5: Convertir el grid inline de EventosCard**

`EventosCard.tsx` línea 244:

```tsx
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
```

por:

```tsx
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

- [ ] **Step 6: Hacer responsive el grid de 12 columnas**

`OportunidadDetallePage.tsx` línea 194 usa `grid grid-cols-12` con hijos `col-span-12`, así que ya ocupa el ancho completo y no requiere cambios. Confirmarlo leyendo el código; no editar.

- [ ] **Step 7: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 8: QA manual**

Seguir el "Procedimiento de QA manual". En **375px**, abrir una oportunidad desde Pipeline:
- El título largo (`CÓDIGO × N — Razón Social`) envuelve y el botón "Editar" cae debajo, sin desbordar.
- El stepper scrollea horizontalmente **dentro de su card blanca**; los 5 pasos se leen sin comprimirse. El body no scrollea.
- Tocar un paso del stepper sigue disparando el cambio de etapa (el scroll no debe interferir con el click).
- Abrir "Editar" (PropiedadesCard): el modal es fullscreen y sus campos se apilan en una columna, no en tres apretadas.
- Abrir el formulario de evento (EventosCard): sus campos también se apilan en una columna.
- La franja de empresa y las cards inferiores ocupan el ancho completo.

En **768px**: el stepper vuelve a verse completo sin scroll, y los grids de los modales vuelven a 3 y 2 columnas.

- [ ] **Step 9: Commit**

```bash
git add src/pages/OportunidadDetalle/
git commit -m "feat(mobile): OportunidadDetalle con stepper scrollable y grids apilados"
```

---

## Task 10: EmpresaDetalle

Cabecera con muchos botones de acción condicionales por rol (hasta 4 a la vez), un grid de 2 columnas de datos corporativos, y grids inline en sus modales.

**Files:**
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx:134, 137, 152, 213, 222, 644`
- Modify: `src/pages/EmpresaDetalle/AgregarContactoModal.tsx:171, 182`
- Modify: `src/pages/EmpresaDetalle/CrearEventoEmpresaModal.tsx:116`

- [ ] **Step 1: Reducir el padding del contenedor**

`EmpresaDetallePage.tsx` línea 134:

```tsx
      <div className="p-4 md:p-margin-page flex flex-col gap-gutter max-w-[1400px] mx-auto w-full">
```

- [ ] **Step 2: Hacer que la cabecera envuelva y reducir el título**

Línea 137:

```tsx
        <div className="flex flex-wrap justify-between items-end gap-4">
```

Y el `<h2>` de la razón social (línea ~147) usa `text-headline-lg` (32px). Aplicarle el token mobile:

```tsx
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">{empresa.razon_social}</h2>
```

- [ ] **Step 3: Hacer que la botonera de acciones envuelva**

Línea 152 (el `<div className="flex gap-3">` que agrupa "Editar Datos", "Nueva Gestión", "Mover a Cartera Maestra", "Liberar", "Eliminar empresa"):

```tsx
          <div className="flex flex-wrap gap-3">
```

Con hasta 4 botones tipo pill de `px-6`, a 375px necesitan envolver en varias líneas.

- [ ] **Step 4: Apilar el grid de información corporativa**

Línea 222:

```tsx
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
```

- [ ] **Step 5: Convertir el grid inline del modal de edición**

Línea 644:

```tsx
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
```

por:

```tsx
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
```

- [ ] **Step 6: Convertir los grids inline de AgregarContactoModal**

Líneas 171 y 182 — **ambas** tienen el mismo patrón. Reemplazar cada una:

```tsx
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
```

por:

```tsx
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

- [ ] **Step 7: Convertir el grid inline de CrearEventoEmpresaModal**

Línea 116:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
```

por:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

- [ ] **Step 8: Confirmar el grid de 12 columnas**

Línea 213 (`grid grid-cols-12`) tiene hijos con `col-span-12 lg:col-span-8`, es decir ya ocupa el ancho completo por debajo de `lg`. No requiere cambios. Confirmarlo leyendo el código; no editar.

- [ ] **Step 9: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 10: QA manual**

Seguir el "Procedimiento de QA manual". En **375px**, abrir una empresa desde Cartera:
- La razón social se lee completa y los botones de acción caen debajo, envolviendo en varias líneas, todos dentro de la pantalla.
- "Información Corporativa": los pares dato/valor se apilan en una columna.
- Abrir "Editar Datos": modal fullscreen con campos en una columna.
- Abrir "Agregar contacto" y el formulario de evento: campos en una columna.
- El body no scrollea horizontalmente.

Si es posible, iniciar sesión con un rol de gerencia o admin para ver la botonera en su versión más larga (4 botones).

En **768px**: la cabecera vuelve a una línea y los grids a 2 y 3 columnas.

- [ ] **Step 11: Commit**

```bash
git add src/pages/EmpresaDetalle/
git commit -m "feat(mobile): EmpresaDetalle con cabecera y grids responsive"
```

---

# FASE 3 — Contactos, Prospección, Actividades

## Task 11: ContactoDetalle, Prospección y Actividades

Sin patrones nuevos: se aplican los mismos de la Fase 2. `ProspeccionPage` usa una `<table>` HTML cruda dentro de `overflow-x-auto` (línea 99) que **ya scrollea**; `ActividadesPage` ya usa `grid-cols-1 lg:grid-cols-12` (línea 85), también correcto.

**Files:**
- Modify: `src/pages/Contactos/ContactoDetallePage.tsx:59, 95`
- Modify: `src/pages/Contactos/EditarContactoModal.tsx:74, 82, 90`
- Modify: `src/pages/Prospeccion/ProspeccionPage.tsx:41`
- Modify: `src/pages/Actividades/ActividadesPage.tsx:77`

- [ ] **Step 1: ContactoDetalle — apilar el grid de datos**

`ContactoDetallePage.tsx` línea 95:

```tsx
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 pt-6 border-t border-outline-variant/30">
```

Ese grid tiene un hijo con `col-span-2` (línea 117) — un campo que ocupa el ancho completo de las 2 columnas. Al pasar el padre a 1 columna en mobile, ese hijo debe acompañarlo:

```tsx
                  <div className="col-span-1 md:col-span-2">
```

Línea 59 (`grid grid-cols-12`): sus dos hijos (líneas 61 y 176) ya declaran `col-span-12 lg:col-span-8` y `col-span-12 lg:col-span-4`, es decir ya ocupan el ancho completo por debajo de `lg`. **No requiere cambios** — confirmarlo leyendo el código, no editar.

- [ ] **Step 2: EditarContactoModal — convertir los tres grids inline**

Líneas 74, 82 y 90 — las **tres** tienen el mismo patrón. Reemplazar cada una:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
```

por:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

- [ ] **Step 3: Prospección — reducir el padding y el título**

`ProspeccionPage.tsx` línea 41:

```tsx
      <main className="p-4 md:p-8">
```

Y el `<h2>` de la línea 45 usa `text-headline-lg` (32px) — "Prospección Comercial" ocupa dos líneas a 375px:

```tsx
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary tracking-tight">
```

La barra de filtros (línea 54) ya tiene `flex-wrap`, y la tabla (línea 99) ya está en `overflow-x-auto`. No requieren cambios.

- [ ] **Step 4: Actividades — reducir el padding**

`ActividadesPage.tsx` línea 77:

```tsx
      <div className="p-4 md:p-8 max-w-container-max mx-auto w-full">
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 6: QA manual**

Seguir el "Procedimiento de QA manual". En **375px**:
- `/prospeccion`: la barra de filtros envuelve; la tabla scrollea dentro de su contenedor; el body no.
- `/actividades`: las columnas se apilan (ya lo hacían por `lg:`), con 16px de padding lateral.
- `/contactos` → abrir un contacto: los datos se apilan en una columna.
- Abrir "Editar contacto": modal fullscreen con campos en una columna.

En **768px**: todo vuelve al layout actual. Ojo: `ActividadesPage` usa `lg:` (1024px), no `md:` — entre 768px y 1024px seguirá apilado, que es su comportamiento de hoy y no se modifica.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Contactos/ src/pages/Prospeccion/ src/pages/Actividades/
git commit -m "feat(mobile): Contactos, Prospeccion y Actividades responsive"
```

---

# FASE 4 — Reportes, Gerencia, Solicitudes, Admin

## Task 12: Pantallas administrativas

Uso mayoritariamente de escritorio; se llevan al mismo estándar por consistencia, sin optimizaciones adicionales. Todas usan `.page-container` (ya cubierto por la Task 5) y tablas de Ant Design.

`ReportesPage` usa grids `repeat(auto-fit, minmax(200px|300px, 1fr))` que **ya colapsan solos**. Lo único pendiente ahí son las 8 tablas sin `scroll`.

**Files:**
- Modify: `src/pages/Reportes/ReportesPage.tsx:120, 134, 148, 182, 198, 238, 254, 316, 345`
- Modify: `src/pages/Solicitudes/SolicitudesPage.tsx:146`
- Modify: `src/pages/Admin/AdminEmpleados.tsx:135`
- Modify: `src/pages/Admin/AdminModelos.tsx:121`
- Modify: `src/pages/Admin/AdminFinanciadoras.tsx:129`
- Modify: `src/pages/Admin/AdminCatalogoEventos.tsx:132`
- Modify: `src/pages/Admin/AdminImportCsvTemp.tsx:107`
- Modify: `src/components/BandejaSolicitudes.tsx:194`
- Modify: `src/components/BandejaMetasVenta.tsx:154`
- Modify: `src/components/MisMetasEquipo.tsx:74`
- Modify: `src/components/MetaVentaFormModal.tsx:122, 139`

- [ ] **Step 1: Agregar `scroll` a todas las tablas listadas**

En **cada** uno de los `<Table ...>` de las líneas indicadas arriba, agregar la prop:

```tsx
        scroll={{ x: 'max-content' }}
```

No se agrega `fixed: 'left'` en estas pantallas: sus tablas tienen menos columnas y no hay una columna identificadora tan dominante como la razón social en Cartera. Si en el QA alguna resulta ilegible al desplazarse, anotarlo y tratarlo aparte.

- [ ] **Step 2: Convertir los grids inline de MetaVentaFormModal**

`MetaVentaFormModal.tsx` línea 122:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
```

por:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
```

Y línea 139, que son 4 columnas (una fila de campos numéricos) — a 375px se apilan en 2, no en 1, porque son campos cortos:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
```

por:

```tsx
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 4: QA manual**

Seguir el "Procedimiento de QA manual". En **375px**, con un usuario admin o gerencia:
- `/reportes`: las tarjetas de métricas se apilan; **cada** tabla scrollea dentro de su propio contenedor; el body no scrollea horizontalmente.
- `/gerencia`: las bandejas (solicitudes, metas) muestran sus tablas con scroll propio.
- `/solicitudes`: la tabla scrollea; abrir el detalle de una solicitud muestra un modal fullscreen legible.
- `/admin`: recorrer las pestañas (Empleados, Modelos, Financiadoras, Catálogo de Eventos) — todas las tablas con scroll propio; los modales de alta/edición fullscreen.
- Abrir el formulario de meta de venta: la fila de 4 campos numéricos se muestra en 2×2, no en 4 apretados.

En **768px**: sin cambios respecto a hoy.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Reportes/ src/pages/Solicitudes/ src/pages/Admin/ src/components/BandejaSolicitudes.tsx src/components/BandejaMetasVenta.tsx src/components/MisMetasEquipo.tsx src/components/MetaVentaFormModal.tsx
git commit -m "feat(mobile): pantallas administrativas con tablas scrollables"
```

---

## Task 13: QA final de regresión y cierre

Barrido completo de las 13 pantallas para detectar lo que las tareas individuales hayan dejado pasar, más una verificación explícita de que el layout desktop no sufrió regresiones.

**Files:** ninguno a priori. Cualquier arreglo que surja se hace aquí y se documenta en el commit.

- [ ] **Step 1: Verificación automatizada completa**

```bash
npm run type-check
npm run build
```
Expected: ambos pasan sin errores.

- [ ] **Step 2: Barrido mobile a 375px**

Con `npm run dev` y el device toolbar en 375px, recorrer **todas** las rutas: `/`, `/pipeline` (kanban y tabla), `/cartera` (todos los tabs), `/contactos` y un detalle, `/prospeccion`, `/actividades`, un detalle de oportunidad, un detalle de empresa, `/reportes`, `/gerencia`, `/solicitudes`, `/admin`.

En cada una, en la consola:

```js
document.body.scrollWidth <= window.innerWidth
```

Expected: `true` en todas. Cualquier `false` señala un desborde no detectado — localizar el elemento culpable con:

```js
[...document.querySelectorAll('*')].filter(el => el.scrollWidth > window.innerWidth)
```

- [ ] **Step 3: Barrido mobile a 320px (ancho mínimo soportado)**

Repetir el recorrido a 320px. Es el mínimo declarado en el spec. Se acepta que el contenido quede apretado; **no** se acepta que se desborde, que un botón quede fuera de alcance ni que un modal corte sus acciones.

- [ ] **Step 4: Verificación de no-regresión en desktop**

Con el device toolbar **desactivado**, a ancho completo (≥1440px), recorrer las mismas rutas y confirmar:
- El sidebar navy se ve, colapsa y expande.
- El topbar de desktop muestra el buscador ancho, notificaciones y el bloque nombre + rol + avatar.
- **No** se ve el BottomNavBar ni el topbar mobile.
- Los modales están centrados, con su ancho original y esquinas redondeadas.
- Las tablas se ven sin scroll horizontal cuando el contenido cabe.
- El FAB del cotizador está en `bottom-6`.

- [ ] **Step 5: Verificación del punto de corte**

Arrastrar el ancho lentamente entre 700px y 820px y confirmar que el cambio entre ambos layouts ocurre **una sola vez, exactamente en 768px**, sin ningún ancho intermedio donde se vean los dos shells a la vez o ninguno.

- [ ] **Step 6: Commit de cierre**

Si el barrido no encontró nada que arreglar, no hay commit y la tarea cierra aquí. Si hubo arreglos:

```bash
git add -A
git commit -m "fix(mobile): correcciones del QA final de regresion"
```

---

## Notas de mantenimiento

- Al agregar una pantalla nueva, sumarla a `useNavItems()` en `src/components/navItems.ts`. Aparecerá automáticamente en el sidebar desktop y en el drawer mobile. El `BottomNavBar` tiene su lista fija aparte, a propósito: solo se toca si la pantalla nueva desplaza a una de las 5 frecuentes.
- Al crear un modal nuevo con Ant Design, **no** hace falta ningún tratamiento mobile: la regla global de `index.css` lo cubre. Sí hace falta usar clases de Tailwind (`grid-cols-1 md:grid-cols-2`) en vez de `style={{ gridTemplateColumns }}` para los grids internos, porque el estilo inline no es sobrescribible desde CSS externo.
- Al crear una tabla nueva, incluir `scroll={{ x: 'max-content' }}` desde el inicio.
