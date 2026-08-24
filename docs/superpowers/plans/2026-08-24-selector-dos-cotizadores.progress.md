# Progress ledger — Selector de dos cotizadores + FAB para admin

Plan: `2026-08-24-selector-dos-cotizadores.md`

**Este archivo es la única memoria entre subagentes.** Los agentes se crean y destruyen por tarea. El estado real es el filesystem; este ledger lo hace legible.

---

## Protocolo (resumen de §0.4 del plan)

**Antes de empezar:**
1. Si tu tarea ya está `[x]` → **PARA**, no hagas nada. Los `Edit` **no son idempotentes**: aplicarlos dos veces corrompe el archivo.
2. Comprueba tus dependencias (solo T2 tiene: espera a T1).

**Al terminar:**
1. Cambia `- [ ] TX` por `- [x] TX`.
2. Añade una línea a **Bitácora** (solo añadir; usa `Edit` con contexto único, nunca reescribas el archivo entero).
3. Fuera de alcance → **Observaciones fuera de alcance**.
4. Si falló → `- [!] TX` + detalle en Bitácora.

**Nunca commitees.** El orquestador hace el único commit, al final, tras la PARTE 2 del plan.

**Leyenda:** `[ ]` pendiente · `[x]` hecho y verificado · `[!]` falló

---

## Estado de las tareas

```
T1 ──▶ T2
T3  (independiente)
T4  (independiente)
```

- [x] T1 — `src/utils/cotizadores.ts` (+test), `src/vite-env.d.ts`, `src/store/authStore.ts` (+test) — catálogo, env var y rol `admin`
- [ ] T2 — `src/index.css`, `src/components/CotizadorFab.tsx` (+test) — speed-dial · **Depende de: T1**
- [ ] T3 — `.env.example`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy.yml` — cableado de `VITE_COTIZADOR_LEASING_URL`
- [ ] T4 — `docs/AUDITORIA-SEGURIDAD-2026-08-13.md` — actualizar el hallazgo M-2

### Verificación final (sesión principal, NO subagente)

- [ ] VF — PARTE 2 del plan: `type-check` + `lint` + `test` + `build`, greps de control, y las 9 pruebas manuales en navegador

---

## Bitácora

> Formato: `- TX — DONE|FALLO — 2026-08-24 — verificación: <comando> → <resultado>. <Qué cambió.>`
> Solo se añaden líneas. Nunca se editan ni se borran las anteriores.

- (vacío — aún no se ha ejecutado ninguna tarea)
- T1 — DONE — 2026-08-24 — verificación: `npm run test -- src/utils/cotizadores.test.ts` → 11/11 pasan; `npm run test -- src/store/authStore.test.ts` → 5/5 pasan; `npm run type-check` → sin errores; `npm run lint` → sin errores nuevos (los 50 errores/7 warnings preexistentes son en archivos ajenos a esta tarea); `npm run test` (suite completa) → 51/55 pasan, los 4 fallos son el baseline preexistente de `src/api/client.test.ts` y `src/components/NotificacionesDropdown.test.tsx`, no tocados. Creado `src/utils/cotizadores.ts` (+test) con `Cotizador`, `EnvCotizadores`, `construirCotizadores`, `buscarCotizador`, `COTIZADORES`, `enRutaCotizable`. Añadida `VITE_COTIZADOR_LEASING_URL` a `src/vite-env.d.ts`. Añadido `ROLES_COTIZADOR` (incluye `admin`) a `src/store/authStore.ts` (+test).

---

## Observaciones fuera de alcance

> Cosas vistas al editar y **NO tocadas**, por diseño. Entrada para la próxima auditoría de código.
> Formato: `- [TX] <archivo:línea> — <qué viste>. No tocado (fuera de alcance).`

- (vacío)

---

## Contexto que los agentes NO deben re-derivar

Verificado por el orquestador el 2026-08-24 leyendo el repo. No lo cuestiones, no lo re-verifiques:

- **El repo SÍ tiene tests y ESLint.** `npm run test` (Vitest), `npm run lint` (ESLint 9) y `npm run type-check` son reales. El ledger del plan `2026-08-17` afirma lo contrario: era cierto en esa fecha, ya no.
- **`tsconfig.json` tiene `noUncheckedIndexedAccess: true`.** `cotizadores[0]` es `Cotizador | undefined`. Por eso existe el helper `buscarCotizador`.
- **`src/test/utilidades.tsx` exporta `renderConProviders`, `screen`, `userEvent`, `waitFor`.** Monta `QueryClientProvider` + `ConfigProvider` + `AntApp` + `MemoryRouter`. El parámetro `rutaInicial` alimenta `initialEntries` del `MemoryRouter`, así que `useLocation().pathname` devuelve lo que le pases.
- **MSW corre con `onUnhandledRequest: 'error'`.** Este plan no hace ninguna petición HTTP; si aparece una, es un fallo real.
- **jsdom no implementa `window.open`.** Sin `vi.spyOn(window, 'open')` cada click imprime "Not implemented" y no se puede verificar la llamada.
- **Vitest corre con `css: false`.** Las clases de Tailwind **no** producen estilos computados en los tests: `toBeVisible()` no distingue una clase `invisible` de una visible. Por eso el diseño monta y desmonta las opciones en vez de ocultarlas — así los tests pueden usar `queryByRole`, que es además la aserción semánticamente correcta.
- **`src/index.css` es donde viven las clases y keyframes propios** (`custom-scrollbar`, `custom-shadow`, `sidebar-active-gradient`…). `tailwind.config.js` está **autogenerado** por `gen-tokens.mjs`: no añadas nada ahí, se perdería.
- **`src/store/authStore.ts` es donde viven TODAS las listas `ROLES_*`** (`ROLES_FACTURA`, `ROLES_APOYO`, `ROLES_REPORTES`, `ROLES_SUPERVISION`, `ROLES_BANDEJA_GERENCIA`, `ROLES_SOLICITANTES`, `ROLES_ADMIN`). `ROLES_COTIZADOR` estaba fuera de sitio en el componente; T1 lo corrige.
- **`Rol` es `'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista' | 'otro'`** (`src/types/enums.ts:6`).
- **`Empleado`** (`src/types/empleado.ts`): `id`, `nombres`, `apellidos`, `email`, `rol`, `area`, `puesto`, `activo?`, `requiere_cambio_contrasena?`.
- **El FAB se monta una sola vez**, en `src/components/AppLayout.tsx:190`, dentro del `<main>` que tiene `position: relative`. Por eso el posicionamiento es `absolute` y no `fixed`. **No toques `AppLayout.tsx`.**
- **`bottom-[88px] md:bottom-6`** existe para librar el `BottomNavBar` (64px) en móvil. Se conserva tal cual.
- **`.env` local no define `VITE_COTIZADOR_URL`** ni la nueva, así que en tests ambas resuelven a su URL por defecto de forma determinista.
- **La URL de Leasing es** `https://quantumleasing.okserver51.com/app/modulos/cotizacion/` — con `https://` y con la barra final. Cópiala exacta.
