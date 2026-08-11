# Filtros de Cartera + Modal de Tarea en Detalle de Empresa — Spec e Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Fecha:** 2026-08-11
**Tickets:** (1) Filtros en la vista Cartera · (2) "Programar Nueva Actividad" abre modal in-situ en Detalle de Empresa

---

# PARTE I — SPEC

## 1. Contexto y objetivo

Dos tickets urgentes sobre pantallas ya en producción:

1. **Cartera** ([src/pages/Cartera/CarteraPage.tsx](../../../src/pages/Cartera/CarteraPage.tsx)) solo permite hoy filtrar por `estado_cartera` (tabs) y buscar texto (`?q=`). Se añade un panel de filtros con **vendedor asignado**, **segmento** y **estado** (este último sincronizado con los tabs existentes).
2. **Detalle de Empresa** ([src/pages/EmpresaDetalle/EmpresaDetallePage.tsx](../../../src/pages/EmpresaDetalle/EmpresaDetallePage.tsx)) tiene un botón "Programar nueva actividad" que hace `navigate('/actividades')`, sacando al usuario del contexto de la empresa. Debe abrir un modal de creación de tarea **en la misma vista**, con la empresa ya fijada.

## 2. Verificación previa: cero cambios de backend

Ambos tickets se resuelven con endpoints ya existentes. **No se solicita nada al equipo de backend y no se toca `docs/contrato_api.md`.**

| Necesidad | Endpoint existente | Evidencia |
|---|---|---|
| Filtrar empresas por vendedor | `GET /empresas?id_vendedor=` | `contrato_api.md` §GET /empresas, tabla de query params |
| Filtrar empresas por segmento | `GET /empresas?segmento=` | ídem |
| Filtrar empresas por estado | `GET /empresas?estado_cartera=` | ídem (ya en uso) |
| Lista de vendedores para el select | `GET /empleados?activo=true` | `contrato_api.md` §GET /empleados |
| Crear tarea con empresa fijada | `POST /tareas` | `contrato_api.md` §POST /tareas |
| Oportunidades activas de la empresa | `GET /oportunidades?id_empresa=&incluir_cerradas=false` | `contrato_api.md` §GET /oportunidades |

El tipo `EmpresasFiltros` ([src/types/empresa.ts:61-70](../../../src/types/empresa.ts)) **ya declara** `id_vendedor`, `segmento` y `distrito`. No hay que tocar `src/types/empresa.ts` ni `src/api/empresas.ts`.

## 3. Restricciones del contrato que condicionan el diseño

Tres reglas del backend son de cumplimiento obligatorio en el frontend. Ignorarlas produce errores en runtime:

### R1 — `id_vendedor` es solo para admin/gerencia/jdv
> `| id_vendedor | long | Filtrar por vendedor (solo admin/gerencia/jdv) |`

Además `GET /empleados` tiene **Roles:** `admin` `gerente` `jdv`. Un vendedor o analista no puede ni obtener la lista de vendedores ni filtrar por ella.
→ **El filtro de vendedor solo se renderiza para `ROLES_SUPERVISION`** (`['admin','gerencia','jdv']`, ya definido en [src/store/authStore.ts:34](../../../src/store/authStore.ts)), y el parámetro `id_vendedor` **nunca se envía** si el usuario no tiene ese rol (aunque manipule la URL a mano).

### R2 — `POST /tareas` rechaza tareas sin oportunidad si la empresa tiene oportunidades activas
> Si `id_oportunidad` es `null` y la empresa tiene oportunidades activas → `400 VALIDACION` con mensaje: `"Las tareas de empresas con oportunidades activas deben vincularse a una oportunidad"`.

→ **El modal de tarea debe ofrecer un selector de oportunidad**, obligatorio cuando la empresa tiene oportunidades activas. Sin esto el ticket 2 falla justo en las empresas más trabajadas del CRM.

> **Nota:** el modal "Nueva tarea" actual de `/actividades` ([ActividadesPage.tsx:318-358](../../../src/pages/Actividades/ActividadesPage.tsx)) **no** envía `id_oportunidad` y por tanto sufre este bug hoy. Al extraer el modal a un componente compartido, el bug queda arreglado también ahí.

### R3 — La Cartera Maestra no tiene vendedor asignado
Mover una empresa a la Cartera Maestra "desasigna su vendedor" (texto del propio `Popconfirm` en [EmpresaDetallePage.tsx:167](../../../src/pages/EmpresaDetalle/EmpresaDetallePage.tsx)).
→ Filtrar por vendedor dentro del tab "Cartera Maestra" siempre devolvería 0 resultados. **El filtro de vendedor se deshabilita y se limpia automáticamente en ese tab.**

## 4. Decisiones de diseño

### D1 — El querystring es la única fuente de verdad de los filtros de Cartera
Hoy `?q=` vive en la URL (`useSearchParams`) mientras `tab` y `pagina` viven en `useState`. Ese modelo mixto hace que al refrescar se pierda medio estado y que un link compartido no reproduzca lo que el otro ve.

Todo el estado de filtrado pasa al querystring:

| Param | Tipo | Ausente significa |
|---|---|---|
| `q` | string | sin búsqueda |
| `estado` | `EstadoCartera \| 'maestra'` | `todas` |
| `vendedor` | entero positivo | todos los vendedores |
| `segmento` | `Segmento` | todos los segmentos |
| `page` | entero positivo | página 1 |

Los valores por defecto **no se escriben** en la URL, para que un link sin filtros siga siendo `/cartera` limpio. Se usa `{ replace: true }` en todas las escrituras, para no llenar el historial con una entrada por cada tecleo de filtro (patrón ya usado en `cambiarBusqueda`).

Beneficio: refrescar conserva los filtros, el botón atrás funciona, y "mándame el link de las empresas de Juan en segmento urbano" es un copiar-pegar.

### D2 — Los tabs de estado y el select de estado del panel son **un solo control**
Renderizar `estado_cartera` en dos sitios con dos estados distintos es garantía de desincronización. El panel de filtros recibe **exactamente la misma lista de opciones** que alimenta los tabs y escribe **el mismo parámetro** `?estado=`. Cambiar el select mueve el tab y viceversa. No hay dos fuentes de verdad.

La opción "Cartera Maestra" aparece en ambos (tab y select) **solo** para `ROLES_BANDEJA_GERENCIA`, igual que hoy.

### D3 — Panel en `Drawer` lateral, con borrador y botón "Aplicar"
- **`Drawer` y no `Popover`/`Dropdown`:** la app se usa en móvil (existen `BottomNavBar` y `TopBarMobile`) y un panel lateral a ancho completo es lo único cómodo a 375px. Ya hay precedente de `Drawer` en [TopBarMobile.tsx:101](../../../src/components/TopBarMobile.tsx).
- **Borrador local + "Aplicar filtros":** si cada cambio de select disparara la query, componer un filtro de 3 campos generaría 3 peticiones y 3 parpadeos de tabla. El borrador se descarta al cerrar sin aplicar.
- **Ancho `min(100vw, 380px)`:** responsive sin ningún hook de breakpoint en JS, coherente con la regla CSS-only del plan de adaptabilidad mobile.

### D4 — Componente `CrearTareaModal` compartido
El formulario de "nueva tarea" ya existe inline en `ActividadesPage`. Duplicarlo en `EmpresaDetalle` dejaría dos formularios que hay que mantener en paralelo (y dos sitios donde arreglar R2). Se extrae a `src/components/CrearTareaModal.tsx` con prop `empresaPreseleccionada`, **exactamente el mismo patrón que `NuevaOportunidadModal`** ([EmpresaDetallePage.tsx:665-673](../../../src/pages/EmpresaDetalle/EmpresaDetallePage.tsx)), y se consume desde ambas pantallas.

### D5 — No se añade filtro por distrito
El backend lo soporta (`?distrito=`), pero no existe catálogo de distritos ni está documentada la semántica del match (exacto vs. parcial, sensible a mayúsculas o no). Un input de texto libre que devuelve 0 resultados por escribir "santa anita" en minúscula es peor que no tener el filtro. **Fuera de alcance**; se puede añadir después si el backend documenta la semántica o expone un catálogo.

### D6 — El contador del botón cuenta vendedor y segmento, no estado
El estado ya es visible permanentemente como tab activo. Contarlo como "1 filtro activo" cuando el usuario simplemente está en el tab "Cliente" es ruido. El badge cuenta **solo los filtros que de otro modo serían invisibles**: vendedor y segmento. Esos dos, además, se muestran como chips descartables bajo los tabs.

### D7 — Sin tests automatizados (excepción documentada a `CLAUDE.md`)
`npm run test` y `npm run lint` son stubs no-op en este repo y Vitest no está instalado. Mismo precedente y misma excepción que el plan `2026-08-03-adaptabilidad-mobile.md` (Decisión 7). **La verificación real de cada tarea es `npx tsc --noEmit` + el checklist de QA manual que acompaña a cada tarea.**

### D8 — Centralizar la constante `SEGMENTOS`
`const SEGMENTOS = ['urbano', ...]` está duplicada literal en [NuevaEmpresaModal.tsx:11](../../../src/components/NuevaEmpresaModal.tsx) y [EmpresaDetallePage.tsx:52](../../../src/pages/EmpresaDetalle/EmpresaDetallePage.tsx), como `string[]` sin tipar contra el enum `Segmento`. El filtro nuevo sería la tercera copia. Se centraliza en `src/types/enums.ts` (junto a `ESTADOS_CARTERA_MANUALES` y `ETAPAS_PIPELINE`, que ya viven ahí) con su mapa de etiquetas en `src/utils/etiquetas.ts`.

**Efecto visible aceptado:** las etiquetas pasan de minúscula cruda (`urbano`) a capitalizada (`Urbano`) en los dos modales existentes. Los **valores enviados al backend no cambian**.

## 5. Alcance

### Dentro
- Panel de filtros en Cartera: estado (sincronizado con tabs), vendedor (solo supervisión), segmento.
- Persistencia de todo el estado de Cartera en el querystring.
- Chips de filtros activos + "Limpiar filtros" + badge con el contador.
- Componente `CrearTareaModal` compartido, con selector de oportunidad obligatorio según R2.
- Cableado en Detalle de Empresa y sustitución del modal inline de Actividades.
- Centralización de `SEGMENTOS` / `ETIQUETA_SEGMENTO`.

### Fuera
- Filtro por distrito (D5).
- Cualquier cambio en `src/api/`, `src/types/empresa.ts`, `src/types/tarea.ts` o `docs/contrato_api.md`.
- Rediseño de la tabla de Cartera, de sus columnas o de la paginación.
- Tests automatizados (D7).
- Filtros en otras pantallas (Pipeline, Contactos, Prospección).

## 6. Criterios de aceptación

**Ticket 1 — Filtros de Cartera**
1. En `/cartera` hay un botón "Filtros" a la derecha de la barra de tabs.
2. El botón muestra un badge con el número de filtros activos (vendedor + segmento). Sin filtros, no hay badge.
3. Al pulsarlo abre un `Drawer` lateral con: Estado de cartera, Vendedor asignado (solo admin/gerencia/jdv) y Segmento.
4. Cambiar algo en el drawer no afecta a la tabla hasta pulsar "Aplicar filtros". Cerrar sin aplicar descarta los cambios.
5. "Limpiar" dentro del drawer deja el borrador en: estado `todas`, sin vendedor, sin segmento.
6. Aplicar escribe los filtros en la URL. Refrescar (F5) conserva exactamente el mismo resultado.
7. Cambiar el select "Estado de cartera" del drawer mueve el tab activo; cambiar el tab actualiza el select.
8. Un vendedor o analista **no ve** el campo "Vendedor asignado" y, si fuerza `?vendedor=3` en la URL, el parámetro no se envía a la API ni aparece chip ni badge.
9. En el tab "Cartera Maestra" el select de vendedor está deshabilitado con nota explicativa, y cualquier vendedor previamente filtrado se limpia. Lo mismo si se entra directo a `?estado=maestra&vendedor=3`.
10. Bajo los tabs aparece un chip por cada filtro activo (vendedor, segmento) con "×" para quitarlo individualmente, más un enlace "Limpiar filtros".
11. Aplicar, quitar un chip o cambiar de tab devuelve la paginación a la página 1.
12. Si la combinación de filtros no devuelve nada, la tabla muestra "Ninguna empresa coincide con los filtros aplicados".

**Ticket 2 — Modal de tarea en Detalle de Empresa**
13. En `/empresas/:id`, tab "Tareas" del bloque "Actividades Recientes", el botón "Programar nueva actividad" **no navega**: abre un modal sobre la misma vista.
14. El modal llega con la empresa preseleccionada y su select **deshabilitado**.
15. Si la empresa tiene oportunidades activas, aparece el campo "Oportunidad" **obligatorio** con un aviso explicativo; si hay exactamente una, viene preseleccionada.
16. Si la empresa no tiene oportunidades activas, el campo "Oportunidad" no se muestra y la tarea se crea con `id_oportunidad: null`.
17. El modal permite elegir contacto de la empresa (opcional), tipo de acción, descripción, fecha/hora, responsable y colaboradores.
18. Al crear la tarea, se cierra el modal, sale un `message.success` y **la lista de tareas del bloque Actividades se actualiza sola**, sin recargar la página (sincronización 360).
19. El tab "Eventos" sigue abriendo `CrearEventoEmpresaModal` como hasta ahora, sin cambios.
20. `/actividades` sigue funcionando igual (botón "Nueva tarea" y FAB), ahora con el modal compartido y con el campo de oportunidad cuando corresponde.

---

# PARTE II — PLAN DE IMPLEMENTACIÓN

## Stack y comandos

React 18 + TypeScript strict · Vite 5 · Ant Design v5 · TanStack Query v5 · React Router v6 · Tailwind · Material Symbols Outlined.

```bash
npx tsc --noEmit     # verificación por tarea (npm run type-check es lo mismo)
npm run dev          # http://localhost:5173 para el QA manual
npm run build        # tsc --noEmit + vite build — verificación final
```

## Restricciones globales (aplican a TODAS las tareas)

- **TypeScript strict. Prohibido `any`.** Si un tipo es incierto: `unknown` + narrowing.
- **Ninguna llamada HTTP fuera de `src/api/`.** Nada de `fetch`/`axios` en componentes.
- **Server state siempre en TanStack Query.** Nunca copiar datos del servidor a `useState`/Zustand.
- **No se tocan** `docs/contrato_api.md`, `src/api/**`, `src/types/empresa.ts`, `src/types/tarea.ts`.
- **Sin tests** (D7). No instalar Vitest ni ninguna dependencia nueva. `package.json` no se modifica.
- Los comentarios de código se escriben **en español**, explicando el *porqué* y no el *qué*, como el resto del repo.
- Los textos de interfaz van **en español**.

## Regla de paralelismo (CRÍTICA para el orquestador)

Los subagentes trabajan **sobre el mismo working tree**. Por tanto:

1. **Dos agentes en la misma ola NUNCA pueden tocar el mismo archivo.** Los conjuntos de archivos de los agentes de una ola son disjuntos por construcción; están listados explícitamente en cada tarea.
2. **Las olas son estrictamente secuenciales.** No se lanza la Ola B hasta que **todos** los agentes de la Ola A han terminado y el orquestador ha corrido `npx tsc --noEmit` con el árbol quieto.
3. **`tsc` ve el trabajo a medias de los demás.** Cada agente ejecuta `npx tsc --noEmit` al terminar, pero **solo debe corregir errores cuyo path esté en su propia lista de archivos**. Los errores en archivos ajenos se **reportan verbatim y se ignoran** — son del compañero de ola, no suyos. Un agente que "arregle" el archivo de otro rompe la ola.

## Mapa de archivos

| Archivo | Responsabilidad | Estado | Tarea |
|---|---|---|---|
| `src/types/enums.ts` | Constante `SEGMENTOS` tipada contra el enum `Segmento` | Modificar | T1 |
| `src/utils/etiquetas.ts` | Mapa `ETIQUETA_SEGMENTO` | Modificar | T1 |
| `src/pages/Cartera/FiltrosCarteraDrawer.tsx` | Panel de filtros. Presentacional puro: props entran, callback sale | **Crear** | T2 |
| `src/pages/Cartera/CarteraPage.tsx` | Estado en querystring, tabs, badge, chips, drawer | Modificar | T3 |
| `src/hooks/useOportunidades.ts` | `useOportunidades` acepta `enabled` | Modificar | T4 |
| `src/components/CrearTareaModal.tsx` | Modal de creación de tarea reutilizable | **Crear** | T5 |
| `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` | Botón abre modal + dedupe de `SEGMENTOS` | Modificar | T6 |
| `src/pages/Actividades/ActividadesPage.tsx` | Sustituye su modal inline por el compartido | Modificar | T7 |
| `src/components/NuevaEmpresaModal.tsx` | Dedupe de `SEGMENTOS` | Modificar | T8 |

## Flujo de desarrollo por olas

```
OLA A  (2 agentes en paralelo — archivos disjuntos)
├── Agente A1 «cartera-filtros»   → T1 → T2 → T3   (secuencial dentro del agente)
│     src/types/enums.ts, src/utils/etiquetas.ts,
│     src/pages/Cartera/FiltrosCarteraDrawer.tsx, src/pages/Cartera/CarteraPage.tsx
└── Agente A2 «modal-tarea»       → T4 → T5        (secuencial dentro del agente)
      src/hooks/useOportunidades.ts, src/components/CrearTareaModal.tsx

        ▼  GATE: orquestador corre `npx tsc --noEmit` con el árbol quieto

OLA B  (2 agentes en paralelo — archivos disjuntos; dependen de T1 y T5)
├── Agente B1 «empresa-detalle»   → T6
│     src/pages/EmpresaDetalle/EmpresaDetallePage.tsx
└── Agente B2 «consumidores»      → T7 → T8        (secuencial dentro del agente)
      src/pages/Actividades/ActividadesPage.tsx, src/components/NuevaEmpresaModal.tsx

        ▼  GATE: orquestador corre `npx tsc --noEmit`

OLA C  (1 agente, sin paralelismo)
└── Agente C1 «verificación»      → T9
      Sin edición de archivos salvo para corregir defectos hallados.
```

**Por qué este agrupamiento:**
- T1→T2→T3 son una cadena de dependencias dura (T2 importa `SEGMENTOS` de T1; T3 importa el componente de T2). Van a un solo agente en orden, nunca en paralelo.
- T4→T5 igual (T5 llama a `useOportunidades` con el `enabled` que añade T4).
- A1 y A2 no comparten un solo archivo → paralelizables sin riesgo.
- T6, T7 y T8 **todos** dependen de que A1 y A2 hayan terminado (T6/T8 importan `SEGMENTOS` de T1; T6/T7 importan `CrearTareaModal` de T5). Por eso son ola posterior, nunca paralelos a A.
- Dentro de la Ola B, T6 y (T7+T8) tocan archivos distintos → paralelizables.

---

# OLA A · AGENTE A1 — «cartera-filtros»

**Archivos que este agente puede tocar (y solo estos):**
`src/types/enums.ts` · `src/utils/etiquetas.ts` · `src/pages/Cartera/FiltrosCarteraDrawer.tsx` · `src/pages/Cartera/CarteraPage.tsx`

Ejecutar T1, T2 y T3 **en este orden**. No saltar al siguiente hasta terminar el anterior.

---

## Task 1: Centralizar `SEGMENTOS` y sus etiquetas

`const SEGMENTOS = ['urbano', ...]` está duplicada como `string[]` sin tipar en dos archivos, y el filtro nuevo sería la tercera copia. Se centraliza junto al enum del que deriva.

**Files:**
- Modify: `src/types/enums.ts`
- Modify: `src/utils/etiquetas.ts`

**Interfaces:**
- Produce: `SEGMENTOS: Segmento[]` (consumida por T2, T6 y T8) y `ETIQUETA_SEGMENTO: Record<Segmento, string>` (consumida por T2, T3, T6 y T8).

- [ ] **Step 1.1 — `src/types/enums.ts`: añadir la constante al final del archivo**

Añadir al final del archivo, después del bloque `ETAPAS_PIPELINE`:

```ts

/**
 * Segmentos de negocio de una empresa, en el orden en que se muestran.
 *
 * Fuente única para todos los selects de segmento. Antes vivía duplicada como
 * `string[]` en NuevaEmpresaModal y EmpresaDetallePage, sin ninguna relación de
 * tipos con el enum `Segmento`: añadir un segmento al enum no rompía nada y las
 * copias se quedaban atrás en silencio.
 */
export const SEGMENTOS: Segmento[] = [
  'urbano',
  'interprovincial',
  'turismo',
  'personal',
  'otro',
]
```

> Al ser `Segmento[]`, si algún día se añade un valor al enum `Segmento` sin añadirlo aquí, TypeScript **no** avisa (un array no tiene que ser exhaustivo). El que sí obliga a la exhaustividad es `ETIQUETA_SEGMENTO` del paso siguiente, que es un `Record<Segmento, string>`.

- [ ] **Step 1.2 — `src/utils/etiquetas.ts`: importar el tipo `Segmento`**

Localizar el bloque de import de tipos al inicio del archivo (líneas 1-12) y añadir `Segmento,` en orden alfabético, entre `RolAprobador,` y `TipoAccion,`:

```ts
import type {
  EstadoAccion,
  EstadoCartera,
  EstadoMeta,
  EstadoOportunidad,
  EstadoSolicitud,
  MesMeta,
  OrigenLead,
  RolAprobador,
  Segmento,
  TipoAccion,
  TipoSolicitud,
} from '@/types'
```

- [ ] **Step 1.3 — `src/utils/etiquetas.ts`: añadir el mapa de etiquetas**

Insertar justo **después** del bloque `ETIQUETA_ORIGEN_LEAD` (que termina en la línea 75) y **antes** de `export function etiquetaEtapa`:

```ts

/**
 * `Record<Segmento, string>` a propósito: si mañana se añade un valor al enum
 * `Segmento`, TypeScript falla aquí hasta que se le dé etiqueta. Es la red que
 * el array `SEGMENTOS` no puede dar.
 */
export const ETIQUETA_SEGMENTO: Record<Segmento, string> = {
  urbano: 'Urbano',
  interprovincial: 'Interprovincial',
  turismo: 'Turismo',
  personal: 'Personal',
  otro: 'Otro',
}
```

- [ ] **Step 1.4 — Verificar**

```bash
npx tsc --noEmit
```
Debe pasar sin errores en `src/types/enums.ts` ni en `src/utils/etiquetas.ts`. Errores en otros archivos: reportar e ignorar (Regla de paralelismo §3).

---

## Task 2: Crear el panel de filtros (`FiltrosCarteraDrawer`)

Componente **presentacional puro**: no llama a la API, no lee el store de auth, no toca la URL. Recibe todo por props y devuelve el resultado por `onAplicar`. Así toda la política (qué rol ve qué, cómo se escribe la URL) vive en un único sitio: `CarteraPage` (T3).

**Files:**
- Create: `src/pages/Cartera/FiltrosCarteraDrawer.tsx`

**Interfaces:**
- Produce: `FiltrosCarteraDrawer`, y los tipos `ClaveEstadoCartera` y `FiltrosCartera`. T3 consume los tres.

- [ ] **Step 2.1 — Crear el archivo completo**

Crear `src/pages/Cartera/FiltrosCarteraDrawer.tsx` con **exactamente** este contenido:

```tsx
import { useEffect, useState } from 'react'
import { Button, Drawer, Form, Select } from 'antd'
import { SEGMENTOS, type EmpleadoResumen, type EstadoCartera, type Segmento } from '@/types'
import { ETIQUETA_SEGMENTO } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'

/**
 * Clave del tab de Cartera. Es a la vez el valor del select "Estado de cartera"
 * del panel: tabs y select son el mismo control renderizado dos veces, para que
 * no puedan desincronizarse.
 *
 * - `'todas'`  → sin filtro de estado
 * - `'maestra'`→ no es un estado, es `cartera_maestra=true` (solo gerencia/admin)
 */
export type ClaveEstadoCartera = EstadoCartera | 'todas' | 'maestra'

export interface FiltrosCartera {
  estado: ClaveEstadoCartera
  idVendedor?: number
  segmento?: Segmento
}

interface Props {
  open: boolean
  onClose: () => void
  /** Filtros actualmente aplicados. Inicializa el borrador cada vez que se abre. */
  valor: FiltrosCartera
  /** Se llama solo al pulsar "Aplicar filtros". Cerrar sin aplicar descarta el borrador. */
  onAplicar: (filtros: FiltrosCartera) => void
  /** Misma lista que alimenta los tabs — la pasa el padre para que no puedan divergir. */
  opcionesEstado: { value: ClaveEstadoCartera; label: string }[]
  /** Solo admin/gerencia/jdv. El backend rechaza `id_vendedor` al resto de roles. */
  mostrarVendedor: boolean
  vendedores: EmpleadoResumen[]
  cargandoVendedores: boolean
}

const VACIO: FiltrosCartera = { estado: 'todas' }

/**
 * Panel lateral de filtros de la Cartera.
 *
 * Trabaja sobre un borrador local y solo notifica al padre al pulsar "Aplicar":
 * con aplicación inmediata, componer un filtro de tres campos dispararía tres
 * peticiones y tres parpadeos de la tabla.
 */
export function FiltrosCarteraDrawer({
  open,
  onClose,
  valor,
  onAplicar,
  opcionesEstado,
  mostrarVendedor,
  vendedores,
  cargandoVendedores,
}: Props) {
  const [borrador, setBorrador] = useState<FiltrosCartera>(valor)

  // Cada apertura parte de lo que hay aplicado ahora mismo, no de lo que el
  // usuario dejó a medias la vez anterior y no llegó a aplicar.
  useEffect(() => {
    if (open) setBorrador(valor)
  }, [open, valor])

  // Las empresas de la Cartera Maestra no tienen vendedor asignado (se les
  // desasigna al moverlas), así que filtrar por vendedor ahí siempre daría cero.
  const esMaestra = borrador.estado === 'maestra'

  const aplicar = () => {
    onAplicar(esMaestra ? { ...borrador, idVendedor: undefined } : borrador)
    onClose()
  }

  return (
    <Drawer
      title="Filtrar empresas"
      placement="right"
      open={open}
      onClose={onClose}
      width="min(100vw, 380px)"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={() => setBorrador(VACIO)}>Limpiar</Button>
          <Button type="primary" onClick={aplicar}>
            Aplicar filtros
          </Button>
        </div>
      }
    >
      <Form layout="vertical" requiredMark={false}>
        <Form.Item label="Estado de cartera">
          <Select<ClaveEstadoCartera>
            value={borrador.estado}
            onChange={(estado) => setBorrador((b) => ({ ...b, estado }))}
            options={opcionesEstado}
          />
        </Form.Item>

        {mostrarVendedor && (
          <Form.Item
            label="Vendedor asignado"
            extra={
              esMaestra
                ? 'Las empresas de la Cartera Maestra no tienen vendedor asignado.'
                : undefined
            }
          >
            <Select<number>
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={esMaestra}
              loading={cargandoVendedores}
              placeholder="Todos los vendedores"
              value={borrador.idVendedor}
              onChange={(idVendedor) => setBorrador((b) => ({ ...b, idVendedor }))}
              options={vendedores.map((v) => ({ value: v.id, label: nombreCompleto(v) }))}
            />
          </Form.Item>
        )}

        <Form.Item label="Segmento">
          <Select<Segmento>
            allowClear
            placeholder="Todos los segmentos"
            value={borrador.segmento}
            onChange={(segmento) => setBorrador((b) => ({ ...b, segmento }))}
            options={SEGMENTOS.map((s) => ({ value: s, label: ETIQUETA_SEGMENTO[s] }))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
```

**Puntos que NO se deben cambiar al escribirlo:**
- `width="min(100vw, 380px)"` es una cadena CSS a propósito: da el panel a ancho completo en móvil sin ningún `matchMedia` ni hook de breakpoint.
- `allowClear` en vendedor y segmento hace que `onChange` reciba `undefined` al limpiar, que es justo el valor "sin filtro". No convertir a `null`.
- El `useEffect` depende de `[open, valor]`. `valor` viene del padre; en T3 se construye con `useMemo` precisamente para que su identidad sea estable y este efecto no corra en bucle.

- [ ] **Step 2.2 — Verificar**

```bash
npx tsc --noEmit
```
Sin errores en `src/pages/Cartera/FiltrosCarteraDrawer.tsx`. (Es normal que aún no lo importe nadie; TypeScript no se queja de eso.)

---

## Task 3: Integrar filtros y querystring en `CarteraPage`

Reescritura del estado de la pantalla: todo pasa al querystring y los tabs se derivan de la misma lista que el select del panel.

**Files:**
- Modify: `src/pages/Cartera/CarteraPage.tsx`

**Interfaces:**
- Consume: `FiltrosCarteraDrawer`, `ClaveEstadoCartera`, `FiltrosCartera` (T2); `SEGMENTOS`, `ETIQUETA_SEGMENTO` (T1).

- [ ] **Step 3.1 — Sustituir el bloque de imports**

Reemplazar las líneas 1-15 completas por:

```tsx
import { useMemo, useState } from 'react'
import { Badge, Button, Input, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import {
  useAuthStore,
  ROLES_ADMIN,
  ROLES_BANDEJA_GERENCIA,
  ROLES_SUPERVISION,
  tieneRol,
} from '@/store/authStore'
import { SEGMENTOS, type EmpresaListItem, type EstadoCartera, type Segmento } from '@/types'
import { ETIQUETA_CARTERA, ETIQUETA_SEGMENTO } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'
import { CarteraTag, NeutralTag } from '@/components/EstadoTag'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { Icono } from '@/components/Icono'
import { NuevaEmpresaModal } from '@/components/NuevaEmpresaModal'
import { EliminarEmpresaModal } from '@/components/EliminarEmpresaModal'
import { LiberarEmpresaModal } from './LiberarEmpresaModal'
import {
  FiltrosCarteraDrawer,
  type ClaveEstadoCartera,
  type FiltrosCartera,
} from './FiltrosCarteraDrawer'
```

- [ ] **Step 3.2 — Sustituir la constante `TABS` por las opciones de estado y los lectores de querystring**

Borrar por completo el bloque `const TABS: { key: string; estado?: EstadoCartera }[] = [ ... ]` (líneas 17-25) y poner en su lugar:

```tsx
/**
 * Opciones de estado de la Cartera. Alimentan a la vez la barra de tabs y el
 * select del panel de filtros: son el mismo control renderizado dos veces, así
 * que no pueden desincronizarse.
 * "Cartera Maestra" se añade aparte, solo para los roles que la ven.
 */
const OPCIONES_ESTADO: { value: ClaveEstadoCartera; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'no_contactado', label: ETIQUETA_CARTERA.no_contactado },
  { value: 'prospeccion', label: ETIQUETA_CARTERA.prospeccion },
  { value: 'oportunidad_activa', label: ETIQUETA_CARTERA.oportunidad_activa },
  { value: 'cliente', label: ETIQUETA_CARTERA.cliente },
  { value: 'no_interesado', label: ETIQUETA_CARTERA.no_interesado },
  { value: 'no_aplica', label: ETIQUETA_CARTERA.no_aplica },
]

const OPCION_MAESTRA: { value: ClaveEstadoCartera; label: string } = {
  value: 'maestra',
  label: 'Cartera Maestra',
}

/**
 * Lee y valida `?estado=`. Todo lo que no sea una clave conocida cae a 'todas',
 * igual que 'maestra' pedida por un rol que no la ve: el querystring lo escribe
 * el usuario y puede traer cualquier cosa.
 */
function leerEstado(crudo: string | null, veCarteraMaestra: boolean): ClaveEstadoCartera {
  if (crudo === null) return 'todas'
  if (crudo === 'maestra') return veCarteraMaestra ? 'maestra' : 'todas'
  const opcion = OPCIONES_ESTADO.find((o) => o.value === crudo)
  return opcion?.value ?? 'todas'
}

/** Lee un entero positivo del querystring; `undefined` si no lo es. */
function leerEnteroPositivo(crudo: string | null): number | undefined {
  if (crudo === null) return undefined
  const n = Number(crudo)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/** Lee y valida `?segmento=` contra el enum. */
function leerSegmento(crudo: string | null): Segmento | undefined {
  return SEGMENTOS.find((s) => s === crudo)
}

/** Estado completo de filtrado de la pantalla, tal y como vive en la URL. */
interface EstadoUrl {
  q: string
  estado: ClaveEstadoCartera
  vendedor?: number
  segmento?: Segmento
  page: number
}
```

- [ ] **Step 3.3 — Sustituir el cuerpo de estado del componente**

Reemplazar el bloque que va desde `export function CarteraPage() {` hasta el cierre de la llamada a `useEmpresas({...})` (líneas 27-70 del archivo original) por:

```tsx
export function CarteraPage() {
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const veCarteraMaestra = tieneRol(empleado, ROLES_BANDEJA_GERENCIA)
  const esAdmin = tieneRol(empleado, ROLES_ADMIN)
  // El backend solo acepta `id_vendedor` de admin/gerencia/jdv, y `GET /empleados`
  // tiene esos mismos roles: para el resto no hay ni filtro ni lista que mostrar.
  const esSupervision = tieneRol(empleado, ROLES_SUPERVISION)

  /* El querystring es la ÚNICA fuente de verdad del filtrado de esta pantalla.
     Antes solo `?q=` vivía aquí y el tab y la página estaban en useState: al
     refrescar se perdía medio estado y un link compartido no reproducía lo que
     el otro veía. */
  const [searchParams, setSearchParams] = useSearchParams()
  const busqueda = searchParams.get('q') ?? ''
  const estado = leerEstado(searchParams.get('estado'), veCarteraMaestra)
  const segmento = leerSegmento(searchParams.get('segmento'))
  const pagina = leerEnteroPositivo(searchParams.get('page')) ?? 1

  /* El filtro de vendedor se anula EN LECTURA en dos casos, no solo al escribir
     la URL: quien pega `?estado=maestra&vendedor=3` o `?vendedor=3` sin ser
     supervisión se saltaría cualquier invariante puesta solo en la escritura.
     Anularlo aquí lo apaga de una vez en la query, el badge, el chip y el panel. */
  const vendedorCrudo = leerEnteroPositivo(searchParams.get('vendedor'))
  const idVendedor = estado === 'maestra' || !esSupervision ? undefined : vendedorCrudo

  // Client state puro: apertura de modales y del panel
  const [modalNueva, setModalNueva] = useState(false)
  const [panelFiltros, setPanelFiltros] = useState(false)
  const [aLiberar, setALiberar] = useState<{ id: number; razon_social: string } | null>(null)
  const [aEliminar, setAEliminar] = useState<{ id: number; razon_social: string } | null>(null)

  const opcionesEstado = veCarteraMaestra ? [...OPCIONES_ESTADO, OPCION_MAESTRA] : OPCIONES_ESTADO

  // Misma queryKey que usa el panel: TanStack Query deduplica, no hay petición extra.
  const vendedores = useVendedoresAsignables(esSupervision)

  /**
   * Único punto de escritura del querystring. Aplica dos invariantes que, si se
   * dejaran a cada llamador, se olvidarían tarde o temprano:
   *  1. En la Cartera Maestra no hay vendedor asignado → nunca se filtra por él.
   *  2. Cualquier cambio que no sea de página vuelve a la página 1: quedarse en
   *     la página 7 de un listado que ahora tiene 2 devuelve una tabla vacía.
   * Los valores por defecto no se escriben, para que /cartera siga siendo limpio.
   * `replace` evita una entrada de historial por cada tecleo.
   */
  const escribirUrl = (cambios: Partial<EstadoUrl>) => {
    const siguiente: EstadoUrl = {
      q: busqueda,
      estado,
      vendedor: idVendedor,
      segmento,
      page: pagina,
      ...cambios,
    }
    if (siguiente.estado === 'maestra') siguiente.vendedor = undefined
    if (cambios.page === undefined) siguiente.page = 1

    const params: Record<string, string> = {}
    if (siguiente.q.trim()) params.q = siguiente.q.trim()
    if (siguiente.estado !== 'todas') params.estado = siguiente.estado
    if (siguiente.vendedor !== undefined) params.vendedor = String(siguiente.vendedor)
    if (siguiente.segmento !== undefined) params.segmento = siguiente.segmento
    if (siguiente.page !== 1) params.page = String(siguiente.page)
    setSearchParams(params, { replace: true })
  }

  /* Identidad estable: es la prop `valor` del drawer, que la usa como dependencia
     de su useEffect de inicialización. Un objeto nuevo en cada render lo haría
     reinicializar el borrador continuamente. */
  const filtrosAplicados = useMemo<FiltrosCartera>(
    () => ({ estado, idVendedor, segmento }),
    [estado, idVendedor, segmento],
  )

  // El estado ya se ve permanentemente como tab activo: contarlo aquí sería
  // ruido. El badge cuenta solo lo que de otro modo quedaría invisible.
  const totalFiltros = (idVendedor !== undefined ? 1 : 0) + (segmento !== undefined ? 1 : 0)
  const vendedorFiltrado = (vendedores.data ?? []).find((v) => v.id === idVendedor)

  const empresas = useEmpresas({
    q: busqueda.trim() || undefined,
    estado_cartera: estado === 'todas' || estado === 'maestra' ? undefined : estado,
    // Ya viene anulado arriba si el rol no puede filtrar por vendedor: ocultar el
    // campo es UX, el que decide qué se envía es este derivado.
    id_vendedor: idVendedor,
    segmento,
    page: pagina,
    // P7 confirmado: por defecto el backend MEZCLA cartera maestra con el resto
    // para gerencia/admin. Para que los tabs normales no incluyan las empresas
    // reservadas, gerencia/admin deben enviar cartera_maestra=false explícito
    // ahí; en el tab Cartera Maestra, true. Otros roles nunca ven mezcla
    // (el backend ya excluye la cartera maestra para ellos, §3.4).
    ...(veCarteraMaestra ? { cartera_maestra: estado === 'maestra' } : {}),
  })
```

> **Importante:** `esTabMaestra` deja de existir como variable. Más abajo en el archivo se usa en dos sitios; se sustituyen en el Step 3.5.

- [ ] **Step 3.4 — Ajustar la cabecera: buscador y botón "Nueva empresa"**

Localizar el `<div>` de la cabecera (líneas 185-200 del original: el que contiene `Input.Search` y el botón "Nueva empresa"). Sustituir **solo** el `onSearch`/`onChange` del `Input.Search` para que escriban en la URL con el nuevo helper:

```tsx
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', maxWidth: 420 }}>
          <Input.Search
            placeholder="Buscar por razón social o RUC"
            allowClear
            style={{ flex: 1, minWidth: 200 }}
            defaultValue={busqueda}
            key={busqueda}
            onSearch={(q) => escribirUrl({ q })}
            onChange={(e) => {
              if (e.target.value === '') escribirUrl({ q: '' })
            }}
          />
          <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => setModalNueva(true)}>
            Nueva empresa
          </Button>
        </div>
```

Las funciones `cambiarBusqueda` y `cambiarTab` del original ya desaparecieron al reemplazar el bloque en el Step 3.3. Aquí solo se re-cablean los handlers del buscador a `escribirUrl`.

- [ ] **Step 3.5 — Sustituir el `<Tabs>` y añadir el botón de filtros y los chips**

Reemplazar el bloque `<Tabs ... />` completo (líneas 203-211 del original) por:

```tsx
      {/* El botón vive en la barra de tabs (`tabBarExtraContent`) en vez de en la
          cabecera: así queda pegado al control de estado con el que se combina, y
          en móvil los tabs siguen scrolleando mientras el botón queda fijo. */}
      <Tabs
        activeKey={estado}
        onChange={(clave) => escribirUrl({ estado: clave as ClaveEstadoCartera })}
        items={opcionesEstado.map((o) => ({ key: o.value, label: o.label }))}
        tabBarExtraContent={{
          right: (
            <Badge count={totalFiltros} size="small">
              <Button icon={<Icono nombre="filter_list" tamano={18} />} onClick={() => setPanelFiltros(true)}>
                Filtros
              </Button>
            </Badge>
          ),
        }}
      />

      {totalFiltros > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          {idVendedor !== undefined && (
            <Tag closable onClose={() => escribirUrl({ vendedor: undefined })}>
              Vendedor: {vendedorFiltrado ? nombreCompleto(vendedorFiltrado) : `#${idVendedor}`}
            </Tag>
          )}
          {segmento !== undefined && (
            <Tag closable onClose={() => escribirUrl({ segmento: undefined })}>
              Segmento: {ETIQUETA_SEGMENTO[segmento]}
            </Tag>
          )}
          <Button
            type="link"
            size="small"
            style={{ paddingInline: 0 }}
            onClick={() => escribirUrl({ vendedor: undefined, segmento: undefined })}
          >
            Limpiar filtros
          </Button>
        </div>
      )}
```

> `vendedorFiltrado` puede ser `undefined` mientras `GET /empleados` está en vuelo o si el vendedor ya no está activo. El fallback `#${idVendedor}` evita un chip vacío durante ese hueco.

- [ ] **Step 3.6 — Ajustar la `<Table>`: columnas, paginación y estado vacío**

En el bloque de la tabla (líneas 218-242 del original) hay tres cambios. Sustituir el bloque completo por:

```tsx
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table
            rowKey="id"
            dataSource={empresas.data?.data ?? []}
            columns={
              estado === 'maestra' ? columnasMaestra : esAdmin ? [...columnas, columnaEliminar] : columnas
            }
            size="middle"
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText:
                totalFiltros > 0
                  ? 'Ninguna empresa coincide con los filtros aplicados'
                  : 'Sin empresas',
            }}
            onRow={(e) => ({
              onClick: () => navigate(`/empresas/${e.id}`),
              style: { cursor: 'pointer' },
            })}
            /* Paginación del SERVIDOR: `current` y `onChange` son obligatorios.
               Sin ellos AntD paginaba en cliente sobre los 20 registros ya
               cargados mientras dibujaba los botones con el total real, así que
               pulsar "2" mostraba una tabla vacía. */
            pagination={{
              current: pagina,
              total: empresas.data?.meta?.total ?? 0,
              pageSize: empresas.data?.meta?.per_page ?? 20,
              showSizeChanger: false,
              onChange: (page) => escribirUrl({ page }),
              showTotal: (total) => `${total} empresa${total === 1 ? '' : 's'}`,
            }}
          />
        </div>
```

Cambios respecto al original: `esTabMaestra` → `estado === 'maestra'`, `onChange: setPagina` → `onChange: (page) => escribirUrl({ page })`, y el `locale.emptyText` nuevo.

- [ ] **Step 3.7 — Montar el drawer**

Junto al resto de modales al final del `return` (después de `<EliminarEmpresaModal ... />`), añadir:

```tsx
      <FiltrosCarteraDrawer
        open={panelFiltros}
        onClose={() => setPanelFiltros(false)}
        valor={filtrosAplicados}
        onAplicar={(f) =>
          escribirUrl({ estado: f.estado, vendedor: f.idVendedor, segmento: f.segmento })
        }
        opcionesEstado={opcionesEstado}
        mostrarVendedor={esSupervision}
        vendedores={vendedores.data ?? []}
        cargandoVendedores={vendedores.isLoading}
      />
```

- [ ] **Step 3.8 — Verificar compilación**

```bash
npx tsc --noEmit
```
Sin errores en `src/pages/Cartera/CarteraPage.tsx`. Comprobar en particular que no queda ninguna referencia a `TABS`, `tab`, `setTab`, `cambiarTab`, `cambiarBusqueda`, `estadoActivo`, `esTabMaestra`, `pagina`/`setPagina` de `useState` ni `tabs`:

```bash
grep -nE "TABS|setTab|cambiarTab|cambiarBusqueda|estadoActivo|esTabMaestra|setPagina" src/pages/Cartera/CarteraPage.tsx
```
Debe no devolver **ninguna** línea.

- [ ] **Step 3.9 — QA manual del ticket 1**

`npm run dev` → `http://localhost:5173/cartera`. Con una sesión **admin o gerencia**:

1. La barra de tabs muestra a la derecha un botón "Filtros" sin badge.
2. Abrirlo: el drawer entra por la derecha con Estado, Vendedor y Segmento.
3. Elegir un vendedor y pulsar "Aplicar filtros" → la tabla se filtra, la URL pasa a `?vendedor=N`, el botón muestra badge `1` y aparece un chip "Vendedor: Nombre Apellido".
4. **F5** → mismos filtros, mismo resultado, mismos chips.
5. Añadir un segmento → badge `2`, dos chips, URL `?vendedor=N&segmento=urbano`.
6. Pulsar la "×" del chip de segmento → queda badge `1` y la URL pierde `segmento`.
7. "Limpiar filtros" → sin badge, sin chips, URL sin `vendedor` ni `segmento`.
8. En el drawer, cambiar "Estado de cartera" a "Cliente" y aplicar → **el tab activo pasa a Cliente** y la URL a `?estado=cliente`.
9. Pulsar el tab "Prospección" → al reabrir el drawer, el select muestra "Prospección".
10. Ir al tab "Cartera Maestra": el select de vendedor del drawer aparece **deshabilitado** con la nota, y si había `?vendedor=` en la URL, desaparece.
11. Con filtros aplicados, ir a la página 2 y luego cambiar de tab → vuelve a la página 1 (la URL pierde `page`).
12. Aplicar una combinación imposible (p. ej. vendedor A + segmento que no trabaja) → la tabla muestra "Ninguna empresa coincide con los filtros aplicados".
13. Copiar la URL con filtros, abrirla en una pestaña nueva → reproduce exactamente la misma vista.

Con una sesión **vendedor**:

14. El botón "Filtros" existe; al abrirlo **no** aparece el campo "Vendedor asignado" (solo Estado y Segmento).
15. Escribir a mano `/cartera?vendedor=1` en la barra de direcciones → la petición a `GET /empresas` en la pestaña Network **no** lleva `id_vendedor`, y no aparecen ni badge ni chip.

De vuelta con la sesión **admin/gerencia**:

15b. Entrar directo a `/cartera?estado=maestra&vendedor=1` → se muestra la Cartera Maestra completa, sin badge ni chip de vendedor, y la petición **no** lleva `id_vendedor` (invariante aplicada también en lectura).

Responsive (DevTools → 375px):

16. El drawer ocupa el ancho completo de la pantalla.
17. La barra de tabs scrollea horizontalmente y el botón "Filtros" sigue accesible.
18. `document.body.scrollWidth <= window.innerWidth` en consola.

---

# OLA A · AGENTE A2 — «modal-tarea»

**Archivos que este agente puede tocar (y solo estos):**
`src/hooks/useOportunidades.ts` · `src/components/CrearTareaModal.tsx`

Ejecutar T4 y luego T5. **No tocar `EmpresaDetallePage.tsx` ni `ActividadesPage.tsx`** — son de la Ola B.

---

## Task 4: `useOportunidades` acepta `enabled`

`useOportunidades` no tiene forma de desactivarse. El modal necesita consultar las oportunidades **de la empresa seleccionada**, y esa empresa no existe hasta que el usuario la elige: sin `enabled`, el hook dispararía una petición de *todas* las oportunidades del CRM cada vez que se monta el modal.

`useTareas(filtros, enabled)` y `useEmpleados(params, enabled)` ya usan exactamente esta firma; se replica.

**Files:**
- Modify: `src/hooks/useOportunidades.ts`

**Interfaces:**
- Produce: `useOportunidades(filtros?, enabled?)`. Consumida por T5.

- [ ] **Step 4.1 — Añadir el parámetro**

Sustituir las líneas 11-16 (la función `useOportunidades` completa) por:

```ts
/**
 * `enabled` sigue el patrón de `useTareas`/`useEmpleados`: permite montar el
 * hook antes de saber por qué empresa se filtra, sin disparar mientras tanto una
 * consulta de todas las oportunidades del CRM.
 */
export function useOportunidades(filtros?: OportunidadesFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.oportunidades, filtros ?? {}],
    queryFn: () => oportunidadesApi.listar(filtros),
    enabled,
  })
}
```

El valor por defecto `true` mantiene el comportamiento de las 4 llamadas existentes (`PipelinePage`, `EmpresaDetallePage`, `OportunidadDetallePage`, `ContactoDetallePage`) sin tocarlas.

- [ ] **Step 4.2 — Verificar que ninguna llamada existente cambia**

```bash
npx tsc --noEmit
grep -rn "useOportunidades(" src/ --include=*.tsx --include=*.ts
```
Todas las llamadas existentes pasan 0 o 1 argumento → siguen compilando sin cambios.

---

## Task 5: Crear `CrearTareaModal`

Modal reutilizable de creación de tarea. Reemplaza al formulario inline de `ActividadesPage` (Ola B) y da servicio al Detalle de Empresa.

**Files:**
- Create: `src/components/CrearTareaModal.tsx`

**Interfaces:**
- Produce: `CrearTareaModal` y el tipo `EmpresaPreseleccionada`. Consumidos por T6 y T7.

- [ ] **Step 5.1 — Crear el archivo completo**

Crear `src/components/CrearTareaModal.tsx` con **exactamente** este contenido:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Alert, App, DatePicker, Form, Input, Modal, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import { useCrearTarea } from '@/hooks/useEventosTareas'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useOportunidades } from '@/hooks/useOportunidades'
import { useEmpleadosSeleccionables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { TipoAccion } from '@/types'
import { ETIQUETA_ETAPA, ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'
import { EmpleadoMultiSelect, EmpleadoSelect } from './EmpleadoSelect'

export interface EmpresaPreseleccionada {
  id: number
  razon_social: string
}

interface ContactoOpcion {
  id: number
  nombres: string
  apellidos: string
}

interface FormValues {
  id_empresa: number
  id_oportunidad?: number
  id_contacto?: number
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_asignado?: number
  ids_colaboradores?: number[]
}

interface Props {
  open: boolean
  onClose: () => void
  /** Empresa fijada (Detalle de Empresa). Si viene, el select queda bloqueado. */
  empresaPreseleccionada?: EmpresaPreseleccionada | null
  /** Contactos seleccionables. Solo tiene sentido con empresa preseleccionada. */
  contactos?: ContactoOpcion[]
}

/**
 * Creación de una tarea, reutilizable desde cualquier pantalla.
 *
 * Antes este formulario vivía inline en ActividadesPage; al necesitarlo también
 * el Detalle de Empresa se extrajo, siguiendo el mismo patrón de
 * `NuevaOportunidadModal` con su `empresaPreseleccionada`.
 *
 * El campo "Oportunidad" no es cosmético: `POST /tareas` responde 400 si la
 * empresa tiene oportunidades activas y la tarea llega sin `id_oportunidad`
 * (contrato §POST /tareas). Por eso es obligatorio cuando las hay.
 */
export function CrearTareaModal({ open, onClose, empresaPreseleccionada, contactos }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('')

  const empleados = useEmpleadosSeleccionables()
  const crear = useCrearTarea()

  // Solo se busca cuando NO hay empresa fija: si la hay, no hay nada que elegir.
  const empresas = useEmpresas(
    busquedaEmpresa.trim().length >= 2 ? { q: busquedaEmpresa } : undefined,
  )

  const idEmpresaForm = Form.useWatch('id_empresa', form)
  const idEmpresa = empresaPreseleccionada?.id ?? idEmpresaForm

  const oportunidades = useOportunidades(
    idEmpresa ? { id_empresa: idEmpresa, incluir_cerradas: false } : undefined,
    Boolean(open && idEmpresa),
  )

  /* useMemo obligatorio: `activas` es dependencia del efecto de abajo. Sin
     memoizar sería un array nuevo en cada render y el efecto correría en bucle. */
  const activas = useMemo(
    () => (oportunidades.data?.data ?? []).filter((o) => o.estado !== 'cerrado'),
    [oportunidades.data],
  )
  const requiereOportunidad = activas.length > 0

  // Si solo hay una candidata, elegirla por el usuario. Se depende del id (un
  // número estable), no del objeto, para no reintroducir el bucle de render.
  const idUnicaActiva = activas.length === 1 ? activas[0].id : null
  useEffect(() => {
    if (open && idUnicaActiva !== null) {
      form.setFieldValue('id_oportunidad', idUnicaActiva)
    }
  }, [open, idUnicaActiva, form])

  const opcionesEmpresa = empresaPreseleccionada
    ? [{ value: empresaPreseleccionada.id, label: empresaPreseleccionada.razon_social }]
    : (empresas.data?.data ?? []).map((e) => ({ value: e.id, label: e.razon_social }))

  const cerrar = () => {
    form.resetFields()
    setBusquedaEmpresa('')
    onClose()
  }

  const onCrear = async () => {
    const v = await form.validateFields()
    try {
      await crear.mutateAsync({
        id_empresa: v.id_empresa,
        id_oportunidad: v.id_oportunidad ?? null,
        id_contacto: v.id_contacto ?? null,
        id_asignado: v.id_asignado ?? null,
        ids_colaboradores: v.ids_colaboradores ?? [],
        tipo_accion: v.tipo_accion,
        descripcion: v.descripcion,
        fecha_ejecucion: v.fecha_ejecucion.toISOString(),
      })
      message.success('Tarea creada')
      cerrar()
    } catch (e) {
      // El backend es la validación real: aunque el formulario cubra el caso de
      // las oportunidades activas, su rechazo se muestra tal cual.
      message.error(mensajeDeError(e, 'No se pudo crear la tarea'))
    }
  }

  return (
    <Modal
      title="Nueva tarea"
      open={open}
      onCancel={cerrar}
      onOk={() => void onCrear()}
      okText="Crear tarea"
      cancelText="Cancelar"
      confirmLoading={crear.isPending}
      destroyOnHidden
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          id_empresa: empresaPreseleccionada?.id,
          tipo_accion: 'llamada',
        }}
      >
        <Form.Item name="id_empresa" label="Empresa" rules={[{ required: true, message: 'Requerido' }]}>
          <Select
            showSearch
            filterOption={false}
            onSearch={setBusquedaEmpresa}
            placeholder="Busca por razón social o RUC"
            options={opcionesEmpresa}
            loading={empresas.isFetching}
            disabled={Boolean(empresaPreseleccionada)}
            notFoundContent={busquedaEmpresa.trim().length < 2 ? 'Escribe al menos 2 caracteres' : undefined}
          />
        </Form.Item>

        {requiereOportunidad && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Esta empresa tiene oportunidades activas: la tarea debe vincularse a una de ellas."
            />
            <Form.Item
              name="id_oportunidad"
              label="Oportunidad"
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <Select
                loading={oportunidades.isLoading}
                options={activas.map((o) => ({
                  value: o.id,
                  label: `OP-${o.id} · ${o.modelo.codigo} × ${o.cantidad} · ${ETIQUETA_ETAPA[o.estado]}`,
                }))}
              />
            </Form.Item>
          </>
        )}

        {contactos !== undefined && contactos.length > 0 && (
          <Form.Item name="id_contacto" label="Contacto">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Sin contacto"
              options={contactos.map((c) => ({ value: c.id, label: nombreCompleto(c) }))}
            />
          </Form.Item>
        )}

        <Form.Item name="tipo_accion" label="Tipo de acción" rules={[{ required: true, message: 'Requerido' }]}>
          <Select options={Object.entries(ETIQUETA_TIPO_ACCION).map(([value, label]) => ({ value, label }))} />
        </Form.Item>

        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, message: 'Requerido' }]}>
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item name="fecha_ejecucion" label="Fecha y hora" rules={[{ required: true, message: 'Requerido' }]}>
          <DatePicker style={{ width: '100%' }} showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>

        <Form.Item name="id_asignado" label="Responsable">
          <EmpleadoSelect empleados={empleados} allowClear placeholder="Te asignas a ti mismo si lo dejas vacío" />
        </Form.Item>

        <Form.Item name="ids_colaboradores" label="Colaboradores">
          <EmpleadoMultiSelect empleados={empleados} placeholder="Sin colaboradores" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

**Puntos que NO se deben cambiar al escribirlo:**
- `destroyOnHidden` es lo que hace que `initialValues` se vuelva a aplicar en cada apertura. Sin él, la empresa preseleccionada de una empresa anterior podría sobrevivir.
- El `useEffect` depende de `idUnicaActiva` (número) y **no** de `activas` (array). Cambiar esa dependencia reintroduce un bucle de renders.
- `incluir_cerradas: false` es el default del backend; se pasa explícito para que se lea la intención. El `.filter(o => o.estado !== 'cerrado')` posterior es la misma definición de "activa" que ya usa `EmpresaDetallePage`.
- La sincronización 360 la da `useCrearTarea`, que ya invalida `qk.tareas`, `qk.inicio`, `qk.prospeccion`, `qk.oportunidades` y `qk.oportunidad(id)`. **No añadir invalidaciones aquí.**
- `useEmpresas` y `useEmpleadosSeleccionables` se llaman aunque el modal esté cerrado (el componente está siempre montado y `open` solo controla la visibilidad). **No es una petición extra:** `EmpresaDetallePage` ya monta `NuevaOportunidadModal`, que consulta la misma `queryKey` `['empresas', {}]`, y ya llama a `useEmpleadosSeleccionables` para `TareaDetalleModal` — TanStack Query deduplica ambas. No intentar "optimizarlo" con hooks condicionales: rompería las reglas de hooks. La que sí se apaga es `useOportunidades`, y para eso existe la Task 4.

- [ ] **Step 5.2 — Verificar**

```bash
npx tsc --noEmit
```
Sin errores en `src/components/CrearTareaModal.tsx`. (Aún no lo importa nadie: es esperado.)

---

> ## 🚦 GATE DE OLA A
> El orquestador espera a que **A1 y A2 hayan terminado los dos**, y solo entonces ejecuta:
> ```bash
> npm run type-check
> ```
> Debe pasar limpio. Si hay errores, se corrigen antes de lanzar la Ola B. **No lanzar la Ola B con el type-check en rojo.**

---

# OLA B · AGENTE B1 — «empresa-detalle»

**Archivos que este agente puede tocar (y solo este):**
`src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`

---

## Task 6: El botón abre el modal en vez de navegar

**Files:**
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`

**Interfaces:**
- Consume: `CrearTareaModal` (T5), `SEGMENTOS` y `ETIQUETA_SEGMENTO` (T1).

- [ ] **Step 6.1 — Ajustar imports**

En el bloque de import de `@/types` (líneas 31-37), añadir `SEGMENTOS`:

```tsx
import {
  ESTADOS_CARTERA_MANUALES,
  SEGMENTOS,
  type Empresa,
  type EstadoCartera,
  type Evento,
  type Tarea,
} from '@/types'
```

En el import de etiquetas (línea 38), añadir `ETIQUETA_SEGMENTO`:

```tsx
import { ETIQUETA_CARTERA, ETIQUETA_SEGMENTO, etiquetaEtapa } from '@/utils/etiquetas'
```

Y añadir el import del modal junto a los otros de `@/components` (después de la línea de `EventoDetalleModal`):

```tsx
import { CrearTareaModal } from '@/components/CrearTareaModal'
```

- [ ] **Step 6.2 — Borrar la constante local `SEGMENTOS`**

Borrar por completo la línea 52:

```tsx
const SEGMENTOS = ['urbano', 'interprovincial', 'turismo', 'personal', 'otro']
```

- [ ] **Step 6.3 — Usar las etiquetas centralizadas en el `Select` de segmentos**

En el modal de edición, sustituir la línea del `Select` de segmentos (línea 633):

```tsx
            <Select mode="multiple" options={SEGMENTOS.map((s) => ({ value: s, label: s }))} />
```
por:
```tsx
            <Select
              mode="multiple"
              options={SEGMENTOS.map((s) => ({ value: s, label: ETIQUETA_SEGMENTO[s] }))}
            />
```

- [ ] **Step 6.4 — Añadir el estado del modal**

Junto al resto de `useState` del componente `Contenido` (después de la línea 77, `const [modalEvento, setModalEvento] = useState(false)`), añadir:

```tsx
  const [modalTarea, setModalTarea] = useState(false)
```

- [ ] **Step 6.5 — Cambiar el `onClick` del botón**

Localizar el botón al final del bloque "ACTIVITIES BLOCK" (líneas 606-611). Sustituir su `onClick`:

```tsx
                onClick={() => (tabActividad === 'eventos' ? setModalEvento(true) : navigate('/actividades'))}
```
por:
```tsx
                onClick={() => (tabActividad === 'eventos' ? setModalEvento(true) : setModalTarea(true))}
```

El resto del botón (clases y label) **no cambia**: el tab "Eventos" sigue abriendo `CrearEventoEmpresaModal` exactamente igual que hoy.

- [ ] **Step 6.6 — Montar el modal**

Justo después de `<CrearEventoEmpresaModal ... />` (línea 678), añadir:

```tsx
      <CrearTareaModal
        open={modalTarea}
        onClose={() => setModalTarea(false)}
        empresaPreseleccionada={{ id: empresa.id, razon_social: empresa.razon_social }}
        contactos={empresa.contactos}
      />
```

`empresa.contactos` es `ContactoEnEmpresa[]`, que tiene `id`, `nombres` y `apellidos` → satisface `ContactoOpcion[]` estructuralmente. No hace falta ningún `map` ni cast.

- [ ] **Step 6.7 — Verificar**

```bash
npx tsc --noEmit
grep -n "navigate('/actividades')" src/pages/EmpresaDetalle/EmpresaDetallePage.tsx
```
El `grep` no debe devolver nada. `navigate` **sigue usándose** en el archivo (filas de oportunidades, `/pipeline`, `EliminarEmpresaModal`), así que su import se queda.

- [ ] **Step 6.8 — QA manual del ticket 2 (Detalle de Empresa)**

`npm run dev`. Necesitas **dos** empresas para cubrir los dos caminos:

**Empresa SIN oportunidades activas** (estado `no_contactado` o `prospeccion`):
1. `/empresas/:id` → bloque "Actividades Recientes", tab "Tareas" → pulsar "Programar nueva actividad".
2. La URL **no cambia**: se abre un modal sobre la misma vista.
3. El select "Empresa" muestra la razón social y está **deshabilitado**.
4. **No** aparece el campo "Oportunidad" ni el aviso azul.
5. Aparece el campo "Contacto" si la empresa tiene contactos.
6. Rellenar tipo/descripción/fecha y crear → toast "Tarea creada", modal cerrado y **la tarea aparece en la lista del bloque sin recargar**.

**Empresa CON oportunidades activas** (estado `oportunidad_activa`):
7. Mismo botón → el modal muestra el aviso azul y el campo "Oportunidad" marcado como obligatorio.
8. Si la empresa tiene **una** oportunidad activa, viene ya seleccionada.
9. Si tiene varias, el campo llega vacío; intentar crear sin elegirla muestra "Requerido" y no envía nada.
10. Elegir una y crear → "Tarea creada" y la tarea aparece en la lista.
11. Abrir la tarea recién creada (click en ella) → `TareaDetalleModal` muestra la empresa correcta.

**Regresión del tab Eventos:**
12. Cambiar al tab "Eventos" → el botón dice "Registrar evento" y abre `CrearEventoEmpresaModal`, no el de tareas.

**Responsive (375px):**
13. El modal ocupa la pantalla completa (regla global `.ant-modal` de `index.css`) y el formulario scrollea con el título y los botones visibles.

---

# OLA B · AGENTE B2 — «consumidores»

**Archivos que este agente puede tocar (y solo estos):**
`src/pages/Actividades/ActividadesPage.tsx` · `src/components/NuevaEmpresaModal.tsx`

Ejecutar T7 y luego T8.

---

## Task 7: `ActividadesPage` usa el modal compartido

Sustituye el formulario inline por `CrearTareaModal`. Elimina ~60 líneas duplicadas y, de paso, arregla ahí el bug de `id_oportunidad` (R2).

**Files:**
- Modify: `src/pages/Actividades/ActividadesPage.tsx`

**Interfaces:**
- Consume: `CrearTareaModal` (T5).

- [ ] **Step 7.1 — Sustituir el bloque de imports**

Reemplazar las líneas 1-21 completas por:

```tsx
import { useState } from 'react'
import { App, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  useActualizarTarea,
  useCancelarTarea,
  useCompletarTarea,
  useTareas,
} from '@/hooks/useEventosTareas'
import { useInicio } from '@/hooks/usePantallas'
import { useEmpleadosSeleccionables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { Tarea } from '@/types'
import { ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { TareaDetalleModal } from '@/components/TareaDetalleModal'
import { CrearTareaModal } from '@/components/CrearTareaModal'
```

Qué se ha quitado y por qué:
| Símbolo eliminado | Motivo |
|---|---|
| `DatePicker`, `Form`, `Input`, `Modal`, `Select` de `antd` | solo los usaba el formulario inline |
| `type Dayjs` de `dayjs` | solo lo usaba `FormValues` |
| `useCrearTarea` | la mutación vive ahora en `CrearTareaModal` |
| `useEmpresas` | la búsqueda de empresa vive ahora en `CrearTareaModal` |
| `type TipoAccion` | solo lo usaba `FormValues` |
| `EmpleadoMultiSelect`, `EmpleadoSelect` | solo los usaba el formulario inline |

Qué se **mantiene** aunque parezca huérfano: `ETIQUETA_TIPO_ACCION` (línea 156, tarjeta de tarea), `useEmpleadosSeleccionables` (lo consume `TareaDetalleModal`), `mensajeDeError` (handlers de completar/cancelar), `App` (`message`), `dayjs`, `Popconfirm`.

- [ ] **Step 7.2 — Borrar la interfaz `FormValues`**

Borrar por completo el bloque de las líneas 23-30:

```tsx
interface FormValues {
  id_empresa: number
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_asignado?: number
  ids_colaboradores?: number[]
}
```

- [ ] **Step 7.3 — Limpiar el estado del componente**

Sustituir el bloque de las líneas 36-54 (desde `const [modalNueva, ...]` hasta `const eventos = ...`) por:

```tsx
  const [modalNueva, setModalNueva] = useState(false)
  const [tareaSel, setTareaSel] = useState<Tarea | null>(null)

  const empleados = useEmpleadosSeleccionables()

  const tareas = useTareas({ estado_accion: 'pendiente' })
  const inicio = useInicio()
  const completar = useCompletarTarea()
  const cancelar = useCancelarTarea()
  const actualizar = useActualizarTarea()

  const pendientes = tareas.data ?? []
  const eventos = inicio.data?.eventos_por_seguir ?? []
```

Se han eliminado: `busquedaEmpresa`/`setBusquedaEmpresa`, `form`, `empresas`, `crear`.

- [ ] **Step 7.4 — Borrar la función `onCrear`**

Borrar por completo el bloque de las líneas 56-73 (`const onCrear = async () => { ... }`).

- [ ] **Step 7.5 — Sustituir el `<Modal>` inline por el componente compartido**

Borrar el bloque completo `<Modal title="Nueva tarea" ... </Modal>` (líneas 318-358) y poner en su lugar:

```tsx
      <CrearTareaModal open={modalNueva} onClose={() => setModalNueva(false)} />
```

Sin `empresaPreseleccionada`: desde esta pantalla el usuario elige la empresa, que es el comportamiento actual.

El `<TareaDetalleModal ... />` de las líneas 301-316 **no se toca**.

- [ ] **Step 7.6 — Verificar**

```bash
npx tsc --noEmit
grep -nE "FormValues|busquedaEmpresa|useCrearTarea|onCrear|EmpleadoSelect" src/pages/Actividades/ActividadesPage.tsx
```
El `grep` no debe devolver **ninguna** línea. TypeScript en strict avisa de imports sin usar solo si `noUnusedLocals` está activo; el `grep` es la comprobación de verdad.

- [ ] **Step 7.7 — QA manual de regresión en `/actividades`**

1. `/actividades` carga con la lista de tareas pendientes y los eventos operativos, igual que antes.
2. El botón "Nueva tarea" del pie de la columna izquierda abre el modal.
3. El FAB flotante de abajo a la derecha abre el mismo modal.
4. El select "Empresa" está **habilitado**; escribir 2+ caracteres busca empresas.
5. Elegir una empresa **con** oportunidades activas → aparecen el aviso azul y el campo "Oportunidad" obligatorio (esto **es nuevo**: antes esta pantalla devolvía un error 400 del backend en ese caso).
6. Elegir una empresa **sin** oportunidades activas → no aparece el campo.
7. Crear la tarea → toast "Tarea creada" y la tarea aparece en la columna izquierda sin recargar.
8. Click en una tarea → `TareaDetalleModal` sigue abriendo y permite editar campo a campo.
9. Los botones de completar y cancelar de cada tarjeta siguen funcionando.

---

## Task 8: `NuevaEmpresaModal` usa `SEGMENTOS` centralizado

**Files:**
- Modify: `src/components/NuevaEmpresaModal.tsx`

**Interfaces:**
- Consume: `SEGMENTOS`, `ETIQUETA_SEGMENTO` (T1).

- [ ] **Step 8.1 — Ajustar imports**

Sustituir la línea 8:
```tsx
import { ETIQUETA_ORIGEN_LEAD } from '@/utils/etiquetas'
```
por:
```tsx
import { ETIQUETA_ORIGEN_LEAD, ETIQUETA_SEGMENTO } from '@/utils/etiquetas'
```

Sustituir la línea 9 (import solo de tipos → necesita también un valor):
```tsx
import type { Empresa, OrigenLead } from '@/types'
```
por:
```tsx
import { SEGMENTOS, type Empresa, type OrigenLead } from '@/types'
```

- [ ] **Step 8.2 — Borrar la constante local**

Borrar por completo la línea 11:
```tsx
const SEGMENTOS = ['urbano', 'interprovincial', 'turismo', 'personal', 'otro']
```

- [ ] **Step 8.3 — Usar las etiquetas centralizadas**

Sustituir la línea 137:
```tsx
          <Select mode="multiple" options={SEGMENTOS.map((s) => ({ value: s, label: s }))} />
```
por:
```tsx
          <Select
            mode="multiple"
            options={SEGMENTOS.map((s) => ({ value: s, label: ETIQUETA_SEGMENTO[s] }))}
          />
```

- [ ] **Step 8.4 — Verificar**

```bash
npx tsc --noEmit
grep -rn "const SEGMENTOS" src/
```
El `grep` debe devolver **solo** `src/types/enums.ts`.

- [ ] **Step 8.5 — QA manual**

1. `/cartera` → "Nueva empresa" → el select "Segmentos" muestra las opciones capitalizadas (Urbano, Interprovincial, Turismo, Personal, Otro).
2. Crear una empresa con segmento "Urbano" → en la tabla de Cartera el chip de segmento muestra `urbano` (valor crudo del backend, sin cambios).
3. Filtrar en Cartera por segmento "Urbano" → la empresa recién creada aparece. **Esto confirma de punta a punta que los valores enviados no cambiaron.**

---

> ## 🚦 GATE DE OLA B
> El orquestador espera a **B1 y B2**, y solo entonces ejecuta `npm run type-check`. Debe pasar limpio.

---

# OLA C · AGENTE C1 — «verificación»

Un solo agente. **Sin paralelismo.**

## Task 9: Verificación integral

- [ ] **Step 9.1 — Compilación y build de producción**

```bash
npm run type-check
npm run build
```
Ambos deben terminar con código 0. `npm run build` corre `tsc --noEmit && vite build`, así que también valida que no se rompió el troceado de chunks.

- [ ] **Step 9.2 — Auditoría de las reglas de `CLAUDE.md`**

```bash
# Regla 2: prohibido `any` en el código nuevo
grep -nE "\bany\b" src/pages/Cartera/FiltrosCarteraDrawer.tsx src/components/CrearTareaModal.tsx src/pages/Cartera/CarteraPage.tsx

# Regla 5: ninguna llamada HTTP fuera de src/api/
grep -rnE "axios\.|fetch\(" src/pages/ src/components/

# Regla 9: nunca dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" src/
```
Los tres `grep` deben devolver **cero** líneas.

```bash
# Regla 3/4: el contrato de API no se ha tocado y src/api/ tampoco
git status --porcelain docs/contrato_api.md src/api/ src/types/empresa.ts src/types/tarea.ts package.json
```
Debe devolver **cero** líneas.

- [ ] **Step 9.3 — Recorrido de los 20 criterios de aceptación**

Recorrer uno a uno los criterios 1-20 de la Parte I §6, con `npm run dev`, en **dos** sesiones distintas (una admin/gerencia y una vendedor). Marcar cada uno. Cualquier fallo se corrige antes de dar el trabajo por terminado.

- [ ] **Step 9.4 — Sincronización 360 cruzada (regla 4 de `CLAUDE.md`)**

La prueba real de que no queda ninguna vista con datos viejos:

1. Abrir `/empresas/:id` de una empresa con oportunidad activa.
2. Crear una tarea desde el modal, vinculada a esa oportunidad.
3. **Sin recargar**, navegar a `/actividades` → la tarea nueva está en la columna de pendientes.
4. **Sin recargar**, navegar a `/oportunidades/:idOportunidad` → la tarea aparece en su `TareasCard`.
5. **Sin recargar**, navegar a `/` (Inicio) → la tarea aparece si su fecha cae en el rango del panel del día.
6. **Sin recargar**, volver a `/pipeline` → el contador `tareas_pendientes_count` de esa oportunidad ha subido en 1.

- [ ] **Step 9.5 — Regresión de pantallas no tocadas**

Cargar y comprobar que siguen funcionando sin errores en consola: `/` · `/pipeline` · `/contactos` · `/prospeccion` · `/reportes` · `/solicitudes` · `/gerencia` · `/admin`. Son las que consumen `useOportunidades` (T4) o los tipos tocados en T1.

- [ ] **Step 9.6 — Informe final**

Reportar: resultado literal de `npm run type-check` y `npm run build`, la tabla de los 20 criterios con su estado, y cualquier defecto encontrado y corregido.

---

## Resumen de esfuerzo

| Ola | Agente | Tareas | Archivos | Nuevos / Modificados |
|---|---|---|---|---|
| A | A1 «cartera-filtros» | T1, T2, T3 | 4 | 1 nuevo, 3 modificados |
| A | A2 «modal-tarea» | T4, T5 | 2 | 1 nuevo, 1 modificado |
| B | B1 «empresa-detalle» | T6 | 1 | 1 modificado |
| B | B2 «consumidores» | T7, T8 | 2 | 2 modificados |
| C | C1 «verificación» | T9 | — | — |

**Total: 2 archivos nuevos, 7 modificados. Cero cambios de backend. Cero dependencias nuevas.**
