# Plan 06 — Tareas: Historial de Actividades (comentarios + auditoría)

**Encargo de entrada:** `docs/informe_frontend_historial_actividades.md` (backend, branch `feat/historial-actividades`, PR #16)
**Fecha:** 2026-09-08
**Repo:** `quantum-crm-frontend` · **Branch de trabajo sugerido:** `feature/historial-actividades`

---

# §0 — LEE ESTO ANTES DE TOCAR NADA

## 0.1 Para quién es este documento

Este plan lo ejecuta un **agente automático** (Google Antigravity). No asume que el
ejecutor conozca el repo. Cada tarea es **atómica**: toca 1–3 archivos, trae el código
casi completo, y termina con un comando de verificación que **debe pasar en verde**.

**Regla de oro:** si algo de lo que este documento afirma sobre el repo **no coincide**
con lo que encuentras al abrir el archivo, **PARA** y emite una escalación (§0.6). No
improvises, no "arregles" el repo, no inventes endpoints.

## 0.2 Orden de ejecución

Las tareas están agrupadas en **olas**. **Una ola no empieza hasta que la anterior está
completa y en verde.** Dentro de una ola, las tareas van en el orden numerado.

No saltes olas. No hagas "todo de una". No refactorices archivos que la tarea no lista.

## 0.3 TDD es obligatorio (no negociable)

`docs/TESTING-frontend.md` §1: **no se escribe componente ni hook sin un test que falle
primero**. Cada tarea con lógica tiene un **Paso 1 — TESTS PRIMERO**. El flujo literal es:

1. Escribe el archivo `.test.ts(x)` con los casos indicados.
2. Corre el comando de verificación. **Debe fallar** (RED). Si pasa a la primera, el test
   está mal escrito → escala.
3. Escribe la implementación.
4. Corre el comando otra vez. **Debe pasar** (GREEN).

## 0.4 Prohibiciones absolutas (violarlas invalida la tarea)

| # | Prohibido | Por qué |
|---|---|---|
| 1 | `any` en TypeScript | `CLAUDE.md` regla 2. ESLint lo marca como **error**. Usa `unknown` + narrowing. |
| 2 | `fetch` o `axios` directo en componentes o hooks | `CLAUDE.md` regla 5. **Toda** llamada HTTP pasa por `src/api/`. |
| 3 | `localStorage` / `sessionStorage` para nada de sesión | `CLAUDE.md` regla 6. El token vive en cookie httpOnly. |
| 4 | `dangerouslySetInnerHTML` | `CLAUDE.md` regla 9. El texto de un comentario es dato de usuario. |
| 5 | Copiar datos del servidor a Zustand | `CLAUDE.md` regla 3. Server state → **siempre** TanStack Query. |
| 6 | Modificar `docs/contrato_api.md`, `docs/matriz_permisos.md` o `docs/reglas_simulaciones.md` | Son propiedad del backend. La referencia de este plan es el **informe**. |
| 7 | Inventar endpoints, query params o campos que el informe no declara | Si falta algo → escalación, no invención. |
| 8 | Reordenar listas que el backend ya devuelve ordenadas | §9 del informe fija el orden de los 3 endpoints. Reordenar es un bug silencioso. |
| 9 | Unificar `fecha_hora` y `fecha_dia` en un solo campo `Date` | Advertencia explícita del informe §3 y §13.2. Introduce desfases de zona horaria. |
| 10 | `new Date(fecha_dia)` con un string `"YYYY-MM-DD"` | JS lo lee como medianoche **UTC**; en Lima (UTC-5) retrocede al día anterior. |

## 0.5 Trampas del compilador de este repo (te van a morder)

`tsconfig.json` tiene activadas opciones estrictas que rompen código que "se ve bien":

- **`noUncheckedIndexedAccess: true`** → `array[0]` tiene tipo `T | undefined`, **siempre**.
  Nunca lo uses sin `?? valorPorDefecto` o sin un guard `if (!x) return ...`.
- **`noUnusedLocals` / `noUnusedParameters`** → un import que dejaste de usar **rompe el
  build**. Al terminar cada tarea, revisa los imports.
- **`strict: true`** → nada de `null`/`undefined` implícitos.
- **`target: ES2020` / `lib: ES2020`** → **`String.prototype.replaceAll` NO existe**. Usa
  `.split('_').join(' ')`. Tampoco uses `Array.prototype.at`, `findLast` ni `Object.groupBy`.
- ESLint corre con `recommendedTypeChecked`: `@typescript-eslint/no-floating-promises` está
  activo. Una promesa sin `await` en un handler se marca con `void promesa` (patrón ya usado
  en todo el repo, p. ej. `onClick={() => void guardar()}`).

## 0.6 Formato de escalación

Cuando algo no cuadra, **no sigas**. Emite exactamente esto y detente:

```
ESCALACION
Tarea: <ID de la tarea, p. ej. T3.2>
Paso: <nº de paso>
Esperado: <lo que este plan decía que ibas a encontrar>
Encontrado: <lo que realmente hay, con ruta de archivo y línea>
Pregunta: <la decisión concreta que necesitas que alguien tome>
```

## 0.7 Comandos del repo

```bash
npm run test                    # toda la suite (vitest run)
npm run test -- <patrón>        # solo los tests cuyo nombre de archivo casa con <patrón>
npm run type-check              # tsc --noEmit
npm run lint                    # eslint .
```

**Antes de dar una tarea por terminada:** su comando de verificación en verde **y**
`npm run type-check` en verde. Antes de cerrar cada **ola**: `npm run test && npm run lint
&& npm run type-check`, los tres en verde.

---

# §1 — Qué hizo el backend (resumen operativo)

Referencia completa: `docs/informe_frontend_historial_actividades.md`. Léelo entero una vez
antes de la Ola 0. Lo esencial:

Se añadió un módulo **`/api/v1/actividades`** con 4 endpoints:

| # | Método | Ruta | Devuelve |
|---|---|---|---|
| 1 | `GET` | `/actividades` | Historial unificado (tareas + eventos) de **un** empleado. **Paginado.** |
| 2 | `GET` | `/actividades/{tipo}/{id}/comentarios` | Todos los comentarios de una actividad. Sin paginar. |
| 3 | `POST` | `/actividades/{tipo}/{id}/comentarios` | Crea un comentario. Devuelve `201`. |
| 4 | `GET` | `/actividades/{tipo}/{id}/auditoria` | Historial de ediciones campo a campo. Sin paginar. |

`{tipo}` es **siempre** `tarea` o `evento` (minúsculas, singular). Cualquier otro valor →
`400 VALIDACION_ERROR`.

### Hechos que gobiernan el diseño del frontend

1. **`id_empleado` es obligatorio** en `GET /actividades`. Sin él no hay historial.
2. **Permiso:** ver el historial de **otro** empleado exige rol supervisor
   (`admin`, `gerencia`, `jdv`). Si no → `403 PERMISO_INSUFICIENTE`. Ver el propio: cualquier rol.
3. **`desde`/`hasta` filtran por `created_at`** (cuándo se creó la actividad), **NO** por la
   fecha planificada. La UI debe decirlo con todas las letras.
4. **Dos campos de fecha, a propósito:** `fecha_hora` (Instant, TIMESTAMP) y `fecha_dia`
   (LocalDate, `"YYYY-MM-DD"`, DATE). Para tareas `fecha_dia` es **siempre** `null`. Para
   eventos `fecha_hora` puede ser `null`. **Nunca se unifican.**
5. **`comentarios` es un entero** (el conteo), no una lista. La lista se pide aparte.
6. **`valor_anterior` / `valor_nuevo` de auditoría siempre son `String` o `null`**, incluso
   para fechas y para IDs.
7. **Órdenes fijados por el backend:** historial `created_at DESC`; comentarios
   `created_at ASC` (cronológico); auditoría `changed_at DESC`.
8. **404 en comentarios/auditoría** significa "no existe **o** no tienes visibilidad" — es
   ambiguo a propósito. El mensaje al usuario debe cubrir ambos casos.
9. `EventoDto` ganó `created_by` y `created_at`. Cambio **aditivo**, no rompe nada.

---

# §2 — Decisiones ya tomadas (NO las re-decidas)

Estas decisiones están cerradas. Ejecútalas tal cual. Si crees que alguna está mal,
escala (§0.6) — no la cambies por tu cuenta.

| ID | Decisión | Por qué |
|---|---|---|
| **D1** | El historial vive en una **ruta nueva**, `/actividades/historial`, **no** en una pestaña dentro de `ActividadesPage`. | `ActividadesPage` ya existe y funciona (tareas pendientes + eventos por seguir). Meterle pestañas obliga a reestructurarla entera: más superficie de error para cero beneficio. |
| **D2** | La ruta va bajo `RequireAuth`, **sin `RequireRol`**. | Cualquier rol puede ver **su propio** historial (informe §7). Lo que se restringe por rol es el **selector de empleado**, no la pantalla. |
| **D3** | **No** se añade entrada al menú de navegación (`navItems.ts`). El acceso es un botón **"Ver historial"** en la cabecera de `ActividadesPage`. | Evita tocar `navItems.ts` + `navItems.test.ts` + `BottomNavBar` y evita saturar el menú. El historial es una vista secundaria de la sección Actividades. |
| **D4** | El selector de empleado se muestra **solo si** `tieneRol(empleado, ROLES_SUPERVISION)`. Si no, `id_empleado` queda fijo al propio id y el selector no se renderiza. | Espeja la regla del backend (informe §7). Es UX, no seguridad: el 403 real lo pone el backend (`CLAUDE.md` regla 8). |
| **D5** | **NO reutilizar `useEmpleadosSeleccionables()`** para el selector del historial. | Ese hook implementa otra regla (contrato §12: vendedor/analista solo se eligen a sí mismos, pero `otro` sí ve a todos). La regla del historial es distinta: **solo** `admin`/`gerencia`/`jdv` ven a otros. Reutilizarlo dejaría a un empleado con rol `otro` pidiendo historiales ajenos y comiéndose un 403. |
| **D6** | Filtros con control en pantalla: **empleado**, **rango de fechas de creación**, **tipo**. | Son los tres que un supervisor usa a diario. |
| **D7** | `id_empresa` e `id_oportunidad` se leen de la **query string de la URL** (`?id_empresa=3`), y se muestran como *chips* removibles. Sin selector propio. | No hay un buscador de oportunidades barato en el frontend, y un input numérico suelto es peor que nada. Con la URL, enlazar desde el detalle de una empresa/oportunidad ya funciona. |
| **D8** | Comentarios y auditoría se implementan como **dos paneles conectados reutilizables** (`PanelComentarios`, `PanelAuditoria`) + dos componentes tontos (`ListaComentarios`, `TimelineAuditoria`). | El mismo panel de comentarios se usa en el modal del historial **y** dentro de `TareaDetalleModal`/`EventoDetalleModal`. Un solo lugar donde vive la lógica. |
| **D9** | El detalle de una actividad del historial es un **modal** (`ActividadDetalleModal`) con dos pestañas: *Comentarios* y *Cambios*. | Es el flujo del informe §14 y es coherente con `TareaDetalleModal`/`EventoDetalleModal`, que ya son modales. |
| **D10** | `rowKey` de la tabla del historial es **`` `${tipo}-${id}` ``**, nunca `id` solo. | Los IDs de tareas y eventos son secuencias **independientes**: la tarea 42 y el evento 42 conviven en la misma página. Con `rowKey="id"` React colapsa filas y muestra datos cruzados. |
| **D11** | El texto de un comentario se renderiza con `whitespace-pre-wrap` en un nodo de texto normal. | Preserva los saltos de línea sin `dangerouslySetInnerHTML` (`CLAUDE.md` regla 9). |
| **D12** | `Evento.created_by` y `Evento.created_at` se declaran **opcionales** (`?`). | Son aditivos en el backend, pero el repo tiene *fixtures* de `Evento` en tests y en código que no los traen. Declararlos obligatorios rompería el `type-check` en archivos que esta tarea no toca. |

---

# §3 — Inventario de archivos

### Se CREAN (12 de producción + 10 de test)

```
src/types/actividad.ts
src/api/actividades.ts
src/hooks/useActividades.ts
src/hooks/useActividades.test.ts
src/utils/actividades.ts
src/utils/actividades.test.ts
src/components/actividades/ListaComentarios.tsx
src/components/actividades/ListaComentarios.test.tsx
src/components/actividades/FormularioComentario.tsx
src/components/actividades/FormularioComentario.test.tsx
src/components/actividades/TimelineAuditoria.tsx
src/components/actividades/TimelineAuditoria.test.tsx
src/components/actividades/PanelComentarios.tsx
src/components/actividades/PanelComentarios.test.tsx
src/components/actividades/PanelAuditoria.tsx
src/components/actividades/ActividadDetalleModal.tsx
src/components/actividades/ActividadDetalleModal.test.tsx
src/pages/Actividades/FiltrosHistorial.tsx
src/pages/Actividades/HistorialActividadesPage.tsx
src/pages/Actividades/HistorialActividadesPage.test.tsx
```

### Se MODIFICAN (7)

```
src/types/index.ts                      (una línea de re-export)
src/types/evento.ts                     (dos campos opcionales)
src/hooks/queryKeys.ts                  (tres keys nuevas)
src/hooks/queryKeys.test.ts             (dos tests nuevos)
src/hooks/useEventosTareas.ts           (invalidaciones)
src/router/rutas.ts                     (una constante)
src/router/index.tsx                    (un lazy + una ruta)
src/pages/Actividades/ActividadesPage.tsx     (un botón)
src/components/TareaDetalleModal.tsx    (un panel al pie)
src/components/EventoDetalleModal.tsx   (un panel al pie)
```

### NO se tocan (bajo ninguna circunstancia)

```
src/api/client.ts          src/store/authStore.ts     src/components/navItems.ts
docs/contrato_api.md       docs/matriz_permisos.md    docs/reglas_simulaciones.md
```

---

# §4 — Grafo de olas

```
OLA 0  Tipos                     T0.1 → T0.2                         (sin UI, sin red)
   │
OLA 1  Red y cache               T1.1 → T1.2 → T1.3 → T1.4
   │
OLA 2  Utilidades puras          T2.1
   │
OLA 3  Componentes tontos        T3.1 ‖ T3.2 ‖ T3.3       (independientes entre sí)
   │
OLA 4  Componentes conectados    T4.1 → T4.2 → T4.3
   │
OLA 5  Pantalla del historial    T5.1 → T5.2 → T5.3
   │
OLA 6  Integración en fichas     T6.1 ‖ T6.2   ·   T6.3 (OPCIONAL)
   │
OLA 7  Verificación final        T7.1
```

---
---

# OLA 0 — Tipos

## T0.1 — Crear `src/types/actividad.ts` y registrarlo

**Effort:** bajo · **Depende de:** nada

### Archivos
- `src/types/actividad.ts` (**crea**)
- `src/types/index.ts` (**modifica**: añade una línea)

### Paso 1 — Crea el archivo con **exactamente** este contenido

```ts
import type { EmpleadoResumen } from './empleado'

/**
 * Resumen de empresa que devuelve el módulo de actividades (informe §8).
 *
 * Es un tipo NUEVO: `types/empresa.ts` no exporta ningún `EmpresaResumen` —
 * tiene `EmpresaListItem` y `Empresa`, ambos mucho más anchos. No los reutilices
 * aquí: el backend solo manda estos tres campos y declarar de más haría que el
 * compilador acepte accesos a propiedades que llegan `undefined` en runtime.
 */
export interface EmpresaResumen {
  id: number
  razon_social: string
  distrito: string | null
}

/**
 * Discriminante de todo el módulo. Va en la URL de 3 de los 4 endpoints, en
 * minúscula y singular; cualquier otro valor devuelve 400 (informe §2).
 *
 * OJO: `types/contacto.ts` exporta `TipoActividadContacto`, que ADEMÁS incluye
 * `'nota'`. Son tipos distintos y no intercambiables — no importes ese aquí.
 */
export type TipoActividad = 'tarea' | 'evento'

/** Una fila del historial unificado (informe §3). */
export interface Actividad {
  tipo: TipoActividad
  id: number
  /** `tipo_accion` si es tarea; nombre del evento si es evento. Ya viene legible. */
  titulo: string
  descripcion: string | null
  /**
   * `estado_accion` de la tarea o `estado` del evento. Es `string` a propósito:
   * son DOS enums distintos del backend y unificarlos en un union type mentiría
   * sobre los valores posibles.
   */
  estado: string
  /**
   * Instant ISO 8601 (columna TIMESTAMP: `fecha_ejecucion` de tarea /
   * `fecha_ocurrencia` de evento). Puede ser null en eventos que aún no ocurrieron.
   */
  fecha_hora: string | null
  /**
   * Fecha calendario "YYYY-MM-DD" (columna DATE: `fecha_estimada`, solo eventos).
   * Para tareas es SIEMPRE null.
   *
   * ⚠ Campo separado de `fecha_hora` POR DISEÑO (informe §3, WARNING). No los
   * unifiques ni lo pases por `new Date()`: usa `formatoFechaDia` de
   * `utils/actividades.ts`.
   */
  fecha_dia: string | null
  id_empresa: number | null
  /** null si el backend no pudo resolverla. */
  empresa: EmpresaResumen | null
  /** null en tareas de prospección. */
  id_oportunidad: number | null
  /** `id_asignado` de la tarea o `created_by` del evento. */
  id_empleado: number | null
  /** null si el backend no pudo resolverlo. */
  empleado: EmpleadoResumen | null
  /** CONTEO de comentarios de seguimiento, no la lista. La lista se pide aparte. */
  comentarios: number
  created_at: string
}

/**
 * Query params de `GET /actividades` (informe §3).
 *
 * `id_empleado` es OBLIGATORIO — no lo hagas opcional "por comodidad": sin él el
 * backend responde 400 y la pantalla no tiene forma de recuperarse.
 *
 * `desde`/`hasta` filtran por `created_at` (cuándo se CREÓ la actividad), NO por
 * la fecha planificada. La etiqueta en la UI tiene que decirlo.
 */
export interface ActividadesFiltros {
  id_empleado: number
  /** Instant ISO 8601. */
  desde?: string
  /** Instant ISO 8601. */
  hasta?: string
  tipo?: TipoActividad
  id_empresa?: number
  id_oportunidad?: number
  /** 1-based. Default del backend: 1. */
  page?: number
  /** Default del backend: 20. Máximo: 100. */
  per_page?: number
}

/** Un comentario de seguimiento (informe §4). Append-only: no hay editar ni borrar. */
export interface ComentarioActividad {
  id: number
  tipo: TipoActividad
  /** id de la tarea o evento al que pertenece. */
  id_actividad: number
  texto: string
  created_at: string
  created_by: number
  autor: EmpleadoResumen | null
}

/**
 * Body de `POST /actividades/{tipo}/{id}/comentarios` (informe §5).
 * `created_by` NO va aquí: lo toma el backend del token.
 */
export interface CrearComentarioInput {
  /** 1–5000 caracteres. El backend aplica trim(). */
  texto: string
}

/** Una entrada de auditoría: el cambio de UN campo (informe §6). */
export interface CambioAuditoria {
  id: number
  /** Nombre del campo en snake_case, tal como lo expone el contrato de API. */
  campo: string
  /**
   * SIEMPRE String o null, incluso para fechas y para IDs. No lo tipes como
   * number ni intentes parsearlo a Date sin saber de qué campo viene.
   */
  valor_anterior: string | null
  valor_nuevo: string | null
  changed_at: string
  changed_by: number
  autor: EmpleadoResumen | null
}
```

### Paso 2 — Registra el módulo en el barrel

En `src/types/index.ts`, añade **una** línea. Colócala **inmediatamente después** de
`export * from './tarea'`:

```ts
export * from './tarea'
export * from './actividad'
```

No reordenes ni borres ninguna otra línea del archivo.

### Verificación
```bash
npm run type-check && npm run lint
```
Ambos en verde. (No hay test propio: son declaraciones puras.)

---

## T0.2 — `Evento` gana `created_by` y `created_at`

**Effort:** bajo · **Depende de:** nada

### Archivo
- `src/types/evento.ts` (**modifica**)

### Paso 1

En la interfaz `Evento`, **después** de la línea `etapa_asociada?: EstadoOportunidad | null`,
añade:

```ts
  /**
   * Añadidos por el backend en el PR #16 (informe §12). Son ADITIVOS: los
   * endpoints existentes que devuelven EventoDto ahora los incluyen.
   *
   * Opcionales a propósito (D12): el repo construye objetos `Evento` en tests y
   * en código que no los traen. Declararlos obligatorios rompería el type-check
   * en archivos que esta tarea no toca.
   */
  created_by?: number
  created_at?: string
```

No cambies ningún otro campo de `Evento` ni ninguna otra interfaz del archivo.

### Verificación
```bash
npm run type-check && npm run test
```

**Si `npm run test` falla aquí:** es una regresión que introdujiste. Los campos son
opcionales, así que **no debería** fallar nada. Si falla → escala.

---
---

# OLA 1 — Red y cache

## T1.1 — Crear `src/api/actividades.ts`

**Effort:** bajo · **Depende de:** T0.1

### Contexto obligatorio
Abre y lee `src/api/tareas.ts` y `src/api/empresas.ts` **antes** de escribir. El patrón del
repo es:
- Los helpers `get`/`post` de `./client` devuelven el **envelope completo** `ApiResponse<T>`.
- Un método que **no** necesita `meta` devuelve `res.data` (ver `tareasApi.listar`).
- Un método **paginado** devuelve el envelope entero para que la pantalla lea `meta`
  (ver `empresasApi.listar`).

### Archivo
- `src/api/actividades.ts` (**crea**)

### Paso 1 — Contenido exacto

```ts
import { get, post } from './client'
import type {
  Actividad,
  ActividadesFiltros,
  ApiResponse,
  CambioAuditoria,
  ComentarioActividad,
  CrearComentarioInput,
  TipoActividad,
} from '@/types'

/**
 * Módulo de actividades (informe `informe_frontend_historial_actividades.md`).
 *
 * `{tipo}` va SIEMPRE en minúscula y singular (`tarea` | `evento`); cualquier
 * otro valor devuelve 400 VALIDACION_ERROR. Por eso el parámetro está tipado
 * como `TipoActividad` y no como `string`: el compilador impide construir la URL
 * mal.
 */
export const actividadesApi = {
  /**
   * Historial unificado. Devuelve el ENVELOPE completo, no solo `data`: es el
   * único endpoint paginado del módulo y la pantalla necesita `meta.total` y
   * `meta.total_pages` para la paginación (informe §13.6).
   */
  listar: async (filtros: ActividadesFiltros): Promise<ApiResponse<Actividad[]>> => {
    return get<Actividad[]>('/actividades', filtros as Record<string, unknown>)
  },

  /** Todos los comentarios de una actividad, en orden cronológico ASC. Sin paginar. */
  comentarios: async (tipo: TipoActividad, id: number): Promise<ComentarioActividad[]> => {
    const res = await get<ComentarioActividad[]>(`/actividades/${tipo}/${id}/comentarios`)
    return res.data
  },

  /** Crea un comentario (201). El autor lo resuelve el backend desde el token. */
  crearComentario: async (
    tipo: TipoActividad,
    id: number,
    input: CrearComentarioInput,
  ): Promise<ComentarioActividad> => {
    const res = await post<ComentarioActividad>(`/actividades/${tipo}/${id}/comentarios`, input)
    return res.data
  },

  /** Cambios campo a campo, del más reciente al más antiguo. Sin paginar. */
  auditoria: async (tipo: TipoActividad, id: number): Promise<CambioAuditoria[]> => {
    const res = await get<CambioAuditoria[]>(`/actividades/${tipo}/${id}/auditoria`)
    return res.data
  },
}
```

### Verificación
```bash
npm run type-check && npm run lint
```

---

## T1.2 — Query keys del módulo + sus tests

**Effort:** bajo · **Depende de:** T0.1

### Contexto obligatorio
Lee la cabecera de `src/hooks/queryKeys.ts`. El **invariante** del repo es:

> la key de un detalle SIEMPRE empieza por la key de su lista

Es lo que hace que `invalidar(qc, qk.actividades)` alcance también a los comentarios y a la
auditoría abiertos en pantalla. `queryKeys.test.ts` lo verifica.

### Archivos
- `src/hooks/queryKeys.ts` (**modifica**)
- `src/hooks/queryKeys.test.ts` (**modifica**: añade un `describe`)

### Paso 1 — TESTS PRIMERO

En `src/hooks/queryKeys.test.ts`, **al final del `describe` existente** (antes de su `})`
de cierre), añade:

```ts
  it('los comentarios y la auditoría cuelgan del árbol de actividades', () => {
    // Es lo que permite que crear un comentario invalide de una sola vez la
    // lista de comentarios Y el contador `comentarios` del historial.
    expect(esPrefijoDe(qk.actividades, qk.actividadComentarios('tarea', 42))).toBe(true)
    expect(esPrefijoDe(qk.actividades, qk.actividadAuditoria('tarea', 42))).toBe(true)
  })

  it('tarea 42 y evento 42 no comparten key: son secuencias de ID independientes', () => {
    // Sin el `tipo` en la key, los comentarios del evento 42 servirían del cache
    // de la tarea 42 y la ficha mostraría comentarios de otra actividad.
    expect(esPrefijoDe(qk.actividadComentarios('tarea', 42), qk.actividadComentarios('evento', 42))).toBe(false)
    expect(esPrefijoDe(qk.actividadComentarios('tarea', 42), qk.actividadAuditoria('tarea', 42))).toBe(false)
  })
```

Corre `npm run test -- queryKeys`. **Debe fallar** (las funciones aún no existen; fallará el
type-check del test o el runtime).

### Paso 2 — Implementación

En `src/hooks/queryKeys.ts`:

**2a.** Cambia la línea de import de tipos (primera zona del archivo) para añadir
`TipoActividad`:

```ts
import type { TipoActividad, TipoEntidadArchivo } from '@/types'
```

**2b.** Dentro del objeto `qk`, **inmediatamente después** de la línea `tareas: ['tareas'] as const,`,
añade:

```ts
  /**
   * Módulo de actividades (historial unificado + comentarios + auditoría).
   * Sigue el invariante de arriba: comentarios y auditoría cuelgan del árbol
   * `actividades`, así que `invalidar(qc, qk.actividades)` los arrastra a los dos.
   *
   * El `tipo` va DENTRO de la key, antes del id: los IDs de tareas y de eventos
   * son secuencias independientes y sin el discriminante la tarea 42 y el evento
   * 42 compartirían entrada de cache.
   */
  actividades: ['actividades'] as const,
  actividadComentarios: (tipo: TipoActividad, id: number) =>
    ['actividades', 'detalle', tipo, id, 'comentarios'] as const,
  actividadAuditoria: (tipo: TipoActividad, id: number) =>
    ['actividades', 'detalle', tipo, id, 'auditoria'] as const,
```

### Verificación
```bash
npm run test -- queryKeys && npm run type-check
```

---

## T1.3 — Hooks del módulo + tests

**Effort:** medio · **Depende de:** T1.1, T1.2

### Contexto obligatorio
Lee `src/hooks/useEventosTareas.ts` (patrón de query + mutación + invalidación) y
`src/hooks/useSimulaciones.test.ts` (patrón de test de hook con MSW y espía de
invalidaciones). **Copia esos patrones, no inventes otros.**

### Archivos
- `src/hooks/useActividades.ts` (**crea**)
- `src/hooks/useActividades.test.ts` (**crea**)

### Paso 1 — TESTS PRIMERO

`src/hooks/useActividades.test.ts`:

```ts
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { crearQueryClientDePrueba } from '@/test/utilidades'
import type { Actividad } from '@/types'
import { useActividades, useComentariosActividad, useCrearComentario } from './useActividades'

function envoltorio(queryClient: QueryClient) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function actividad(): Actividad {
  return {
    tipo: 'tarea',
    id: 42,
    titulo: 'llamada',
    descripcion: 'Llamar al contacto',
    estado: 'pendiente',
    fecha_hora: '2026-09-10T15:00:00Z',
    fecha_dia: null,
    id_empresa: 3,
    empresa: { id: 3, razon_social: 'ACME SAC', distrito: 'Miraflores' },
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 3,
    created_at: '2026-09-01T10:00:00Z',
  }
}

/** Espía sobre invalidateQueries — mismo patrón que `useSimulaciones.test.ts`. */
function espiarInvalidaciones(queryClient: QueryClient): unknown[][] {
  const invalidadas: unknown[][] = []
  const original = queryClient.invalidateQueries.bind(queryClient)
  queryClient.invalidateQueries = (filtro?: { queryKey?: readonly unknown[] }) => {
    if (filtro?.queryKey) invalidadas.push([...filtro.queryKey])
    return original(filtro)
  }
  return invalidadas
}

describe('useActividades', () => {
  it('no dispara la petición mientras id_empleado no sea válido', async () => {
    // `id_empleado` es obligatorio (informe §3). Sin él el backend responde 400;
    // la query se queda deshabilitada en vez de pedir algo que va a fallar.
    // No se declara NINGÚN handler: con `onUnhandledRequest: 'error'` en el
    // setup, cualquier request haría fallar este test — que es justo la aserción.
    const qc = crearQueryClientDePrueba()
    const { result } = renderHook(() => useActividades({ id_empleado: 0 }), {
      wrapper: envoltorio(qc),
    })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('manda los filtros como query params y devuelve el envelope con meta', async () => {
    let urlVista = ''
    servidorMock.use(
      http.get(`${BASE_API}/actividades`, ({ request }) => {
        urlVista = request.url
        return HttpResponse.json({
          data: [actividad()],
          meta: { page: 1, per_page: 20, total: 47, total_pages: 3 },
          error: null,
        })
      }),
    )
    const qc = crearQueryClientDePrueba()
    const { result } = renderHook(
      () => useActividades({ id_empleado: 7, tipo: 'tarea', page: 2, per_page: 20 }),
      { wrapper: envoltorio(qc) },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(urlVista).toContain('id_empleado=7')
    expect(urlVista).toContain('tipo=tarea')
    expect(urlVista).toContain('page=2')
    expect(result.current.data?.meta?.total).toBe(47)
    expect(result.current.data?.data).toHaveLength(1)
  })
})

describe('useComentariosActividad', () => {
  it('pide la URL con el tipo en minúscula y singular', async () => {
    let urlVista = ''
    servidorMock.use(
      http.get(`${BASE_API}/actividades/evento/15/comentarios`, ({ request }) => {
        urlVista = request.url
        return HttpResponse.json({ data: [], meta: null, error: null })
      }),
    )
    const qc = crearQueryClientDePrueba()
    const { result } = renderHook(() => useComentariosActividad('evento', 15), {
      wrapper: envoltorio(qc),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(urlVista).toContain('/actividades/evento/15/comentarios')
  })
})

describe('useCrearComentario', () => {
  it('invalida todo el árbol de actividades, no solo la lista de comentarios', async () => {
    // Sincronización 360 (CLAUDE.md regla 4): el badge con el conteo
    // `comentarios` vive en la fila del historial, en OTRA query. Invalidar solo
    // los comentarios deja la tabla mostrando el número viejo.
    servidorMock.use(
      http.post(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json(
          {
            data: {
              id: 5,
              tipo: 'tarea',
              id_actividad: 42,
              texto: 'ok',
              created_at: '2026-09-08T10:00:00Z',
              created_by: 7,
              autor: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
            },
            meta: null,
            error: null,
          },
          { status: 201 },
        ),
      ),
    )
    const qc = crearQueryClientDePrueba()
    const invalidadas = espiarInvalidaciones(qc)
    const { result } = renderHook(() => useCrearComentario('tarea', 42), {
      wrapper: envoltorio(qc),
    })

    await result.current.mutateAsync({ texto: 'ok' })

    await waitFor(() =>
      expect(invalidadas.some((k) => k[0] === 'actividades' && k.length === 1)).toBe(true),
    )
  })
})
```

Corre `npm run test -- useActividades`. **Debe fallar** (el hook no existe).

### Paso 2 — Implementación

`src/hooks/useActividades.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { actividadesApi } from '@/api/actividades'
import type { ActividadesFiltros, CrearComentarioInput, TipoActividad } from '@/types'
import { invalidar, qk } from './queryKeys'

/**
 * Historial unificado de un empleado.
 *
 * `enabled` cubre el requisito duro del informe §3: `id_empleado` es obligatorio.
 * Mientras no haya uno válido la query no se dispara — pedirlo sin él solo
 * produce un 400 que la pantalla no puede resolver.
 *
 * `placeholderData: (anterior) => anterior` mantiene en pantalla la página
 * previa mientras carga la siguiente. Sin eso la tabla parpadea a vacío en cada
 * cambio de página y el salto de scroll es desagradable.
 */
export function useActividades(filtros: ActividadesFiltros) {
  return useQuery({
    queryKey: [...qk.actividades, filtros],
    queryFn: () => actividadesApi.listar(filtros),
    enabled: Number.isFinite(filtros.id_empleado) && filtros.id_empleado > 0,
    placeholderData: (anterior) => anterior,
  })
}

/**
 * Comentarios de una actividad. Sin paginación (informe §4): llegan todos, ya
 * ordenados cronológicamente ASC. NO los reordenes en el cliente.
 *
 * `activo` deja apagar la query mientras la ficha esté cerrada: es lo que evita
 * que abrir una página con 20 modales montados dispare 20 peticiones inútiles.
 */
export function useComentariosActividad(tipo: TipoActividad, id: number, activo = true) {
  return useQuery({
    queryKey: qk.actividadComentarios(tipo, id),
    queryFn: () => actividadesApi.comentarios(tipo, id),
    enabled: activo && Number.isFinite(id) && id > 0,
  })
}

/**
 * Alta de comentario (append-only: no hay editar ni borrar).
 *
 * Invalida el árbol `actividades` ENTERO, no solo la lista de comentarios: el
 * contador `comentarios` de cada fila del historial vive en otra query, y el
 * invariante de `queryKeys.ts` garantiza que la key de comentarios cuelga de
 * `qk.actividades` — una sola invalidación arrastra las dos (CLAUDE.md regla 4).
 */
export function useCrearComentario(tipo: TipoActividad, id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearComentarioInput) => actividadesApi.crearComentario(tipo, id, input),
    onSuccess: () => invalidar(qc, qk.actividades),
  })
}

/**
 * Auditoría de ediciones. Sin paginación (informe §6). Llega del cambio más
 * reciente al más antiguo — ese orden es del backend, NO lo reordenes.
 */
export function useAuditoriaActividad(tipo: TipoActividad, id: number, activo = true) {
  return useQuery({
    queryKey: qk.actividadAuditoria(tipo, id),
    queryFn: () => actividadesApi.auditoria(tipo, id),
    enabled: activo && Number.isFinite(id) && id > 0,
  })
}
```

### Verificación
```bash
npm run test -- useActividades && npm run type-check && npm run lint
```

---

## T1.4 — Editar una tarea o un evento debe invalidar su auditoría

**Effort:** bajo · **Depende de:** T1.2

**Por qué existe:** cada edición de tarea/evento genera filas de auditoría en el backend.
Si el panel de Cambios está abierto y no se invalida, sigue mostrando el historial de antes
de la edición: exactamente el fallo que `CLAUDE.md` regla 4 prohíbe.

### Archivo
- `src/hooks/useEventosTareas.ts` (**modifica**: 3 funciones)

### Paso 1

En `src/hooks/useEventosTareas.ts` hay **tres** funciones privadas de invalidación. Añade
`qk.actividades` a la llamada `invalidar(...)` de cada una. Quedan así:

```ts
function invalidarEventos(qc: ReturnType<typeof useQueryClient>, idOportunidad: number) {
  invalidar(
    qc,
    qk.oportunidadEventos(idOportunidad),
    qk.oportunidad(idOportunidad),
    qk.oportunidades,
    qk.inicio,
    qk.prospeccion,
    // Editar un evento escribe filas en `actividad_auditoria` y puede cambiar su
    // fila del historial unificado. Sin esto, el panel de Cambios abierto sigue
    // mostrando el historial previo a la edición (CLAUDE.md regla 4).
    qk.actividades,
  )
}
```

```ts
function invalidarEventosEmpresa(qc: ReturnType<typeof useQueryClient>, idEmpresa: number) {
  invalidar(qc, qk.empresaEventos(idEmpresa), qk.empresa(idEmpresa), qk.prospeccion, qk.inicio, qk.actividades)
}
```

```ts
function invalidarTareas(qc: ReturnType<typeof useQueryClient>, idOportunidad?: number | null) {
  invalidar(qc, qk.tareas, qk.inicio, qk.prospeccion, qk.oportunidades, qk.actividades)
  if (idOportunidad) invalidar(qc, qk.oportunidad(idOportunidad))
}
```

No cambies nada más del archivo.

### Verificación
```bash
npm run test && npm run type-check && npm run lint
```

**Cierre de OLA 1:** los tres comandos en verde.

---
---

# OLA 2 — Utilidades puras

## T2.1 — `src/utils/actividades.ts` + tests

**Effort:** medio · **Depende de:** T0.1

**Por qué es su propia tarea:** aquí vive la regla más peligrosa del informe (la de las dos
fechas). Aislarla en funciones puras la hace testeable sin renderizar nada, y `CLAUDE.md`
regla 11 prohíbe dejar esta lógica dentro de un componente.

### Archivos
- `src/utils/actividades.ts` (**crea**)
- `src/utils/actividades.test.ts` (**crea**)

### Paso 1 — TESTS PRIMERO

`src/utils/actividades.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatoFechaHora } from './formato'
import {
  etiquetaCampoAuditado,
  fechaDisplayActividad,
  formatoFechaDia,
  valorAuditadoDisplay,
} from './actividades'

describe('formatoFechaDia', () => {
  it('no retrocede un día al formatear una fecha calendario', () => {
    // informe §13.2 (CAUTION): `new Date('2026-09-15')` es medianoche UTC; en
    // Lima (UTC-5) eso cae el 14. Esta función NO puede pasar por `Date`.
    expect(formatoFechaDia('2026-09-15')).toContain('15')
    expect(formatoFechaDia('2026-09-15')).not.toContain('14')
  })

  it('devuelve un guion cuando no hay fecha', () => {
    expect(formatoFechaDia(null)).toBe('—')
  })

  it('devuelve el string tal cual si no tiene la forma YYYY-MM-DD', () => {
    expect(formatoFechaDia('no-es-fecha')).toBe('no-es-fecha')
  })
})

describe('fechaDisplayActividad', () => {
  it('prefiere fecha_hora cuando existe', () => {
    const texto = fechaDisplayActividad({
      fecha_hora: '2026-09-10T15:00:00Z',
      fecha_dia: '2026-09-15',
    })
    expect(texto).toBe(formatoFechaHora('2026-09-10T15:00:00Z'))
  })

  it('cae a fecha_dia cuando fecha_hora es null (evento no ocurrido)', () => {
    expect(fechaDisplayActividad({ fecha_hora: null, fecha_dia: '2026-09-15' })).toBe(
      formatoFechaDia('2026-09-15'),
    )
  })

  it('dice "Sin fecha" cuando las dos son null', () => {
    expect(fechaDisplayActividad({ fecha_hora: null, fecha_dia: null })).toBe('Sin fecha')
  })
})

describe('etiquetaCampoAuditado', () => {
  it('traduce los campos que el backend audita hoy', () => {
    // informe §6: tareas → tipo_accion, descripcion, fecha_ejecucion,
    // id_contacto, id_asignado. Eventos → fecha_estimada, fecha_seguimiento,
    // descripcion.
    expect(etiquetaCampoAuditado('fecha_ejecucion')).toBe('Fecha de ejecución')
    expect(etiquetaCampoAuditado('id_asignado')).toBe('Responsable')
  })

  it('no se rompe con un campo que el backend empiece a auditar mañana', () => {
    expect(etiquetaCampoAuditado('campo_nuevo_del_backend')).toBe('campo nuevo del backend')
  })
})

describe('valorAuditadoDisplay', () => {
  it('muestra "(vacío)" cuando el campo no tenía valor', () => {
    expect(valorAuditadoDisplay('descripcion', null)).toBe('(vacío)')
  })

  it('etiqueta los IDs como ID, porque el backend no manda el nombre', () => {
    expect(valorAuditadoDisplay('id_asignado', '12')).toBe('ID 12')
  })

  it('formatea fecha_estimada sin desfase de zona horaria', () => {
    expect(valorAuditadoDisplay('fecha_estimada', '2026-09-15')).toBe(formatoFechaDia('2026-09-15'))
  })

  it('devuelve el texto tal cual para campos de texto libre', () => {
    expect(valorAuditadoDisplay('descripcion', 'Llamar hoy')).toBe('Llamar hoy')
  })
})
```

Corre `npm run test -- utils/actividades`. **Debe fallar.**

### Paso 2 — Implementación

`src/utils/actividades.ts`:

```ts
import type { Actividad, TipoActividad } from '@/types'
import { formatoFechaHora } from './formato'

export const ETIQUETA_TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
  tarea: 'Tarea',
  evento: 'Evento',
}

/** Ícono Material Symbols por tipo (informe §13.3). Única librería de íconos permitida. */
export const ICONO_TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
  tarea: 'task_alt',
  evento: 'event',
}

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/**
 * Formatea una fecha CALENDARIO ("YYYY-MM-DD") sin pasar nunca por `Date`.
 *
 * ⚠ `new Date('2026-09-15')` se interpreta como medianoche UTC: en Lima (UTC-5)
 * eso muestra el 14 (informe §13.2, CAUTION). Por eso se parte el string a mano
 * en vez de usar dayjs o Date. No "simplifiques" esto.
 */
export function formatoFechaDia(fechaDia: string | null | undefined): string {
  if (!fechaDia) return '—'
  const partes = fechaDia.split('-')
  if (partes.length !== 3) return fechaDia
  const anio = partes[0] ?? ''
  const mes = Number(partes[1])
  const dia = partes[2] ?? ''
  const nombreMes = MESES_CORTOS[mes - 1]
  if (!nombreMes || anio === '' || dia === '') return fechaDia
  return `${dia} ${nombreMes} ${anio}`
}

/**
 * Fecha visible de una actividad (informe §13.2).
 *
 * `fecha_hora` es un Instant (TIMESTAMP) y `fecha_dia` una fecha calendario
 * (DATE). Son campos SEPARADOS por diseño y cada uno se formatea con su propia
 * función. Este helper elige cuál mostrar; NO los mezcla.
 */
export function fechaDisplayActividad(
  actividad: Pick<Actividad, 'fecha_hora' | 'fecha_dia'>,
): string {
  if (actividad.fecha_hora) return formatoFechaHora(actividad.fecha_hora)
  if (actividad.fecha_dia) return formatoFechaDia(actividad.fecha_dia)
  return 'Sin fecha'
}

const ETIQUETA_CAMPO_AUDITADO: Record<string, string> = {
  tipo_accion: 'Tipo de acción',
  descripcion: 'Descripción',
  fecha_ejecucion: 'Fecha de ejecución',
  id_contacto: 'Contacto',
  id_asignado: 'Responsable',
  fecha_estimada: 'Fecha estimada',
  fecha_seguimiento: 'Fecha de seguimiento',
}

/**
 * Nombre legible del campo auditado.
 *
 * `Record<string, string>` y NO un Record cerrado sobre un union: el backend
 * puede empezar a auditar un campo nuevo sin que este repo se entere, y una
 * pantalla de auditoría que revienta ante un campo desconocido es peor que una
 * que muestra el nombre crudo.
 */
export function etiquetaCampoAuditado(campo: string): string {
  // `replaceAll` no existe con `lib: ES2020` (ver tsconfig.json).
  return ETIQUETA_CAMPO_AUDITADO[campo] ?? campo.split('_').join(' ')
}

/**
 * Valor de auditoría listo para mostrar.
 *
 * `valor_anterior`/`valor_nuevo` SIEMPRE llegan como String o null (informe §6),
 * también para fechas y para IDs. El backend no manda el nombre del empleado ni
 * del contacto detrás de un id: por eso se muestra "ID 12" y no se inventa una
 * petición extra para resolverlo.
 */
export function valorAuditadoDisplay(campo: string, valor: string | null): string {
  if (valor === null || valor === '') return '(vacío)'
  if (campo === 'id_asignado' || campo === 'id_contacto') return `ID ${valor}`
  if (campo === 'fecha_ejecucion') return formatoFechaHora(valor)
  if (campo === 'fecha_estimada' || campo === 'fecha_seguimiento') return formatoFechaDia(valor)
  return valor
}
```

### Verificación
```bash
npm run test -- utils/actividades && npm run type-check && npm run lint
```

---
---

# OLA 3 — Componentes tontos (sin red)

> Las tres tareas de esta ola son **independientes**. Ninguna llama a la API ni usa hooks
> de TanStack Query: reciben todo por props. Es lo que las hace triviales de testear.

## T3.1 — `<ListaComentarios/>`

**Effort:** bajo · **Depende de:** T0.1

### Archivos
- `src/components/actividades/ListaComentarios.tsx` (**crea** — la carpeta `actividades/` es nueva)
- `src/components/actividades/ListaComentarios.test.tsx` (**crea**)

### Paso 1 — TESTS PRIMERO

```tsx
import { describe, expect, it } from 'vitest'
import { renderConProviders, screen } from '@/test/utilidades'
import type { ComentarioActividad } from '@/types'
import { ListaComentarios } from './ListaComentarios'

function comentario(over: Partial<ComentarioActividad> = {}): ComentarioActividad {
  return {
    id: 1,
    tipo: 'tarea',
    id_actividad: 42,
    texto: 'Se habló con el contacto, pide cotización.',
    created_at: '2026-09-05T09:30:00Z',
    created_by: 7,
    autor: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    ...over,
  }
}

describe('ListaComentarios', () => {
  it('muestra el texto y el autor de cada comentario', () => {
    renderConProviders(<ListaComentarios comentarios={[comentario()]} />)
    expect(screen.getByText(/pide cotización/i)).toBeInTheDocument()
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument()
  })

  it('respeta el orden en que llegan: el backend ya los manda cronológicos', () => {
    // informe §9: `created_at ASC`. Reordenar en el cliente es un bug silencioso.
    renderConProviders(
      <ListaComentarios
        comentarios={[
          comentario({ id: 1, texto: 'primero' }),
          comentario({ id: 2, texto: 'segundo' }),
        ]}
      />,
    )
    const textos = screen.getAllByTestId('texto-comentario').map((n) => n.textContent)
    expect(textos).toEqual(['primero', 'segundo'])
  })

  it('muestra un vacío explícito cuando no hay comentarios', () => {
    renderConProviders(<ListaComentarios comentarios={[]} />)
    expect(screen.getByText(/sin comentarios/i)).toBeInTheDocument()
  })

  it('no muestra el vacío mientras está cargando', () => {
    renderConProviders(<ListaComentarios comentarios={[]} cargando />)
    expect(screen.queryByText(/sin comentarios/i)).not.toBeInTheDocument()
  })

  it('muestra un autor desconocido sin romperse si `autor` es null', () => {
    renderConProviders(<ListaComentarios comentarios={[comentario({ autor: null })]} />)
    expect(screen.getByText(/pide cotización/i)).toBeInTheDocument()
  })
})
```

### Paso 2 — Implementación

```tsx
import type { ComentarioActividad } from '@/types'
import { formatoFechaHora, iniciales, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'

interface Props {
  /** Ya vienen ordenados cronológicamente (ASC) del backend. NO reordenar. */
  comentarios: ComentarioActividad[]
  cargando?: boolean
  error?: unknown
  onReintentar?: () => void
}

/**
 * Lista de comentarios de seguimiento. Componente tonto: recibe los datos ya
 * pedidos y no consulta nada.
 *
 * El texto se renderiza como nodo de texto con `whitespace-pre-wrap` para
 * preservar los saltos de línea. NUNCA `dangerouslySetInnerHTML`: es contenido
 * escrito por usuarios (CLAUDE.md regla 9).
 */
export function ListaComentarios({ comentarios, cargando, error, onReintentar }: Props) {
  if (cargando) return <Cargando mensaje="Cargando comentarios…" />
  if (error) return <ErrorCarga error={error} onReintentar={onReintentar} />
  if (comentarios.length === 0) {
    return <p className="text-body-md text-on-surface-variant py-4">Sin comentarios todavía.</p>
  }

  return (
    <ul className="space-y-4 list-none p-0 m-0">
      {comentarios.map((c) => (
        <li key={c.id} className="flex gap-3">
          <div
            title={nombreCompleto(c.autor)}
            className="shrink-0 w-8 h-8 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center text-[11px] font-bold"
          >
            {iniciales(c.autor?.nombres, c.autor?.apellidos)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-on-surface">{nombreCompleto(c.autor)}</span>
              <span className="text-label-md text-on-surface-variant">
                {formatoFechaHora(c.created_at)}
              </span>
            </div>
            <p
              data-testid="texto-comentario"
              className="text-body-md text-on-surface whitespace-pre-wrap break-words m-0"
            >
              {c.texto}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
```

### Verificación
```bash
npm run test -- ListaComentarios && npm run type-check && npm run lint
```

---

## T3.2 — `<FormularioComentario/>`

**Effort:** medio · **Depende de:** nada (solo props)

### Archivos
- `src/components/actividades/FormularioComentario.tsx` (**crea**)
- `src/components/actividades/FormularioComentario.test.tsx` (**crea**)

### Paso 1 — TESTS PRIMERO

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { FormularioComentario } from './FormularioComentario'

describe('FormularioComentario', () => {
  it('deshabilita el botón cuando el campo solo tiene espacios', async () => {
    // El backend rechaza texto vacío con 400 (informe §5). Es validación de UX:
    // la autoritativa sigue siendo la del backend (CLAUDE.md regla 7).
    const onEnviar = vi.fn().mockResolvedValue(undefined)
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    await userEvent.type(screen.getByLabelText(/nuevo comentario/i), '   ')
    expect(screen.getByRole('button', { name: /comentar/i })).toBeDisabled()
  })

  it('envía el texto recortado', async () => {
    const onEnviar = vi.fn().mockResolvedValue(undefined)
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    await userEvent.type(screen.getByLabelText(/nuevo comentario/i), '  hola  ')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(onEnviar).toHaveBeenCalledWith('hola'))
  })

  it('limpia el campo tras un envío exitoso', async () => {
    const onEnviar = vi.fn().mockResolvedValue(undefined)
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    const campo = screen.getByLabelText(/nuevo comentario/i)
    await userEvent.type(campo, 'hola')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('NO limpia el campo si el envío falla', async () => {
    // Perder lo que el usuario escribió porque el servidor falló es el peor
    // desenlace posible de este formulario.
    const onEnviar = vi.fn().mockRejectedValue(new Error('boom'))
    renderConProviders(<FormularioComentario onEnviar={onEnviar} enviando={false} />)

    const campo = screen.getByLabelText(/nuevo comentario/i)
    await userEvent.type(campo, 'hola')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(onEnviar).toHaveBeenCalled())
    expect(campo).toHaveValue('hola')
  })
})
```

### Paso 2 — Implementación

```tsx
import { useState } from 'react'
import { App, Button, Input } from 'antd'
import { mensajeDeError } from '@/api/client'

/** Límite del backend (informe §5). El `maxLength` es UX; el rechazo real es del servidor. */
const MAX_TEXTO = 5000

interface Props {
  /** Persiste el comentario. Debe RECHAZAR en error para que el campo no se limpie. */
  onEnviar: (texto: string) => Promise<unknown>
  enviando: boolean
}

/**
 * Alta de un comentario de seguimiento. Los comentarios son append-only: no hay
 * editar ni borrar, así que este formulario no tiene modo edición.
 */
export function FormularioComentario({ onEnviar, enviando }: Props) {
  const { message } = App.useApp()
  const [texto, setTexto] = useState('')
  const recortado = texto.trim()

  const enviar = async () => {
    if (recortado === '') return
    try {
      await onEnviar(recortado)
      setTexto('')
      message.success('Comentario agregado')
    } catch (e) {
      // No se limpia el campo: el usuario no puede perder lo que escribió.
      message.error(mensajeDeError(e, 'No se pudo agregar el comentario'))
    }
  }

  return (
    <div className="space-y-2">
      <Input.TextArea
        aria-label="Nuevo comentario"
        rows={3}
        maxLength={MAX_TEXTO}
        showCount
        placeholder="Escribe un comentario de seguimiento…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={enviando}
      />
      <div className="flex justify-end">
        <Button
          type="primary"
          loading={enviando}
          disabled={recortado === ''}
          onClick={() => void enviar()}
        >
          Comentar
        </Button>
      </div>
    </div>
  )
}
```

### Verificación
```bash
npm run test -- FormularioComentario && npm run type-check && npm run lint
```

---

## T3.3 — `<TimelineAuditoria/>`

**Effort:** bajo · **Depende de:** T2.1

### Archivos
- `src/components/actividades/TimelineAuditoria.tsx` (**crea**)
- `src/components/actividades/TimelineAuditoria.test.tsx` (**crea**)

### Paso 1 — TESTS PRIMERO

```tsx
import { describe, expect, it } from 'vitest'
import { renderConProviders, screen } from '@/test/utilidades'
import type { CambioAuditoria } from '@/types'
import { TimelineAuditoria } from './TimelineAuditoria'

function cambio(over: Partial<CambioAuditoria> = {}): CambioAuditoria {
  return {
    id: 10,
    campo: 'descripcion',
    valor_anterior: 'Llamar mañana',
    valor_nuevo: 'Llamar hoy urgente',
    changed_at: '2026-09-07T16:00:00Z',
    changed_by: 1,
    autor: { id: 1, nombres: 'Admin', apellidos: 'Sistema' },
    ...over,
  }
}

describe('TimelineAuditoria', () => {
  it('muestra el campo traducido, el valor anterior y el nuevo', () => {
    renderConProviders(<TimelineAuditoria cambios={[cambio()]} />)
    expect(screen.getByText(/Descripción/)).toBeInTheDocument()
    expect(screen.getByText(/Llamar mañana/)).toBeInTheDocument()
    expect(screen.getByText(/Llamar hoy urgente/)).toBeInTheDocument()
  })

  it('muestra "(vacío)" cuando el campo no tenía valor previo', () => {
    renderConProviders(<TimelineAuditoria cambios={[cambio({ valor_anterior: null })]} />)
    expect(screen.getByText(/\(vacío\)/)).toBeInTheDocument()
  })

  it('muestra un vacío explícito cuando la actividad nunca se editó', () => {
    renderConProviders(<TimelineAuditoria cambios={[]} />)
    expect(screen.getByText(/sin ediciones/i)).toBeInTheDocument()
  })
})
```

### Paso 2 — Implementación

```tsx
import { Timeline } from 'antd'
import type { CambioAuditoria } from '@/types'
import { etiquetaCampoAuditado, valorAuditadoDisplay } from '@/utils/actividades'
import { formatoFechaHora, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'

interface Props {
  /** Ya vienen del más reciente al más antiguo (informe §9). NO reordenar. */
  cambios: CambioAuditoria[]
  cargando?: boolean
  error?: unknown
  onReintentar?: () => void
}

/**
 * Changelog campo a campo de una tarea o evento. Componente tonto.
 *
 * Cada entrada del backend es UN campo: una edición que tocó tres campos llega
 * como tres filas con el mismo `changed_at`. No se agrupan — agruparlas obligaría
 * a inventar una clave de "edición" que el backend no expone.
 */
export function TimelineAuditoria({ cambios, cargando, error, onReintentar }: Props) {
  if (cargando) return <Cargando mensaje="Cargando cambios…" />
  if (error) return <ErrorCarga error={error} onReintentar={onReintentar} />
  if (cambios.length === 0) {
    return <p className="text-body-md text-on-surface-variant py-4">Sin ediciones registradas.</p>
  }

  return (
    <Timeline
      items={cambios.map((c) => ({
        key: c.id,
        children: (
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold text-on-surface">{etiquetaCampoAuditado(c.campo)}</span>
              <span className="text-label-md text-on-surface-variant">
                {nombreCompleto(c.autor)} · {formatoFechaHora(c.changed_at)}
              </span>
            </div>
            <div className="text-body-md break-words">
              <span className="line-through text-on-surface-variant">
                {valorAuditadoDisplay(c.campo, c.valor_anterior)}
              </span>
              <span className="mx-2">→</span>
              <span className="text-on-surface">
                {valorAuditadoDisplay(c.campo, c.valor_nuevo)}
              </span>
            </div>
          </div>
        ),
      }))}
    />
  )
}
```

### Verificación
```bash
npm run test -- TimelineAuditoria && npm run type-check && npm run lint
```

**Cierre de OLA 3:** `npm run test && npm run lint && npm run type-check` en verde.

---
---

# OLA 4 — Componentes conectados

## T4.1 — `<PanelComentarios/>`

**Effort:** medio · **Depende de:** T1.3, T3.1, T3.2

### Archivos
- `src/components/actividades/PanelComentarios.tsx` (**crea**)
- `src/components/actividades/PanelComentarios.test.tsx` (**crea**)

### Paso 1 — TESTS PRIMERO

```tsx
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { PanelComentarios } from './PanelComentarios'

const COMENTARIO = {
  id: 1,
  tipo: 'tarea',
  id_actividad: 42,
  texto: 'Se habló con el contacto.',
  created_at: '2026-09-05T09:30:00Z',
  created_by: 7,
  autor: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
}

describe('PanelComentarios', () => {
  it('carga y muestra los comentarios de la actividad', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json({ data: [COMENTARIO], meta: null, error: null }),
      ),
    )
    renderConProviders(<PanelComentarios tipo="tarea" id={42} />)
    expect(await screen.findByText(/Se habló con el contacto/)).toBeInTheDocument()
  })

  it('no pide nada mientras `activo` es false', () => {
    // Sin handler declarado: con `onUnhandledRequest: 'error'` cualquier
    // petición haría fallar el test, que es justo la aserción.
    renderConProviders(<PanelComentarios tipo="tarea" id={42} activo={false} />)
    expect(screen.queryByText(/Se habló/)).not.toBeInTheDocument()
  })

  it('tras comentar, el nuevo comentario aparece en la lista', async () => {
    // Sincronización 360 (CLAUDE.md regla 4): la mutación invalida y el GET
    // se rehace. El segundo GET ya devuelve los dos comentarios.
    let vecesGet = 0
    servidorMock.use(
      http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () => {
        vecesGet += 1
        const datos = vecesGet === 1 ? [COMENTARIO] : [COMENTARIO, { ...COMENTARIO, id: 2, texto: 'Cotización enviada.' }]
        return HttpResponse.json({ data: datos, meta: null, error: null })
      }),
      http.post(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json({ data: { ...COMENTARIO, id: 2, texto: 'Cotización enviada.' }, meta: null, error: null }, { status: 201 }),
      ),
    )
    renderConProviders(<PanelComentarios tipo="tarea" id={42} />)
    await screen.findByText(/Se habló con el contacto/)

    await userEvent.type(screen.getByLabelText(/nuevo comentario/i), 'Cotización enviada.')
    await userEvent.click(screen.getByRole('button', { name: /comentar/i }))

    await waitFor(() => expect(screen.getByText(/Cotización enviada/)).toBeInTheDocument())
  })

  it('ante un 404 explica que la actividad no existe o no es visible', async () => {
    // informe §4: el 404 es ambiguo A PROPÓSITO. El mensaje debe cubrir los dos casos.
    servidorMock.use(
      http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
        HttpResponse.json(
          { data: null, meta: null, error: { code: 'NO_ENCONTRADO', message: 'No encontrado' } },
          { status: 404 },
        ),
      ),
    )
    renderConProviders(<PanelComentarios tipo="tarea" id={42} />)
    expect(await screen.findByText(/no existe o no tienes acceso/i)).toBeInTheDocument()
  })
})
```

### Paso 2 — Implementación

```tsx
import { Alert } from 'antd'
import { estadoHttpDeError } from '@/api/client'
import type { TipoActividad } from '@/types'
import { useComentariosActividad, useCrearComentario } from '@/hooks/useActividades'
import { ListaComentarios } from './ListaComentarios'
import { FormularioComentario } from './FormularioComentario'

interface Props {
  tipo: TipoActividad
  id: number
  /**
   * `false` mientras la ficha que lo contiene esté cerrada: evita pedir
   * comentarios que nadie va a ver. Por defecto `true` porque el uso normal es
   * dentro de un modal que solo se monta abierto.
   */
  activo?: boolean
}

/**
 * Comentarios de seguimiento de una actividad: lista + alta.
 *
 * Componente CONECTADO — es el único lugar del módulo que junta las dos queries
 * de comentarios. Se reutiliza en `ActividadDetalleModal`, `TareaDetalleModal` y
 * `EventoDetalleModal`.
 */
export function PanelComentarios({ tipo, id, activo = true }: Props) {
  const comentarios = useComentariosActividad(tipo, id, activo)
  const crear = useCrearComentario(tipo, id)

  // El 404 del backend significa "no existe O no lo puedes ver" — es ambiguo a
  // propósito (informe §7), así que el mensaje no puede afirmar ninguna de las
  // dos cosas por separado.
  if (comentarios.isError && estadoHttpDeError(comentarios.error) === 404) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Sin comentarios disponibles"
        description="Esta actividad no existe o no tienes acceso a ella."
      />
    )
  }

  return (
    <div className="space-y-4">
      <ListaComentarios
        comentarios={comentarios.data ?? []}
        cargando={comentarios.isLoading}
        error={comentarios.isError ? comentarios.error : undefined}
        onReintentar={() => void comentarios.refetch()}
      />
      <FormularioComentario
        enviando={crear.isPending}
        onEnviar={(texto) => crear.mutateAsync({ texto })}
      />
    </div>
  )
}
```

### Verificación
```bash
npm run test -- PanelComentarios && npm run type-check && npm run lint
```

---

## T4.2 — `<PanelAuditoria/>`

**Effort:** bajo · **Depende de:** T1.3, T3.3

### Archivo
- `src/components/actividades/PanelAuditoria.tsx` (**crea**)

**No lleva test propio:** es un envoltorio de 20 líneas sin lógica; su comportamiento queda
cubierto por el test de `ActividadDetalleModal` (T4.3) y por el de `TimelineAuditoria` (T3.3).

### Paso 1 — Implementación

```tsx
import { Alert } from 'antd'
import { estadoHttpDeError } from '@/api/client'
import type { TipoActividad } from '@/types'
import { useAuditoriaActividad } from '@/hooks/useActividades'
import { TimelineAuditoria } from './TimelineAuditoria'

interface Props {
  tipo: TipoActividad
  id: number
  /** `false` mientras la ficha esté cerrada. */
  activo?: boolean
}

/** Historial de ediciones de una actividad. Componente conectado. */
export function PanelAuditoria({ tipo, id, activo = true }: Props) {
  const auditoria = useAuditoriaActividad(tipo, id, activo)

  if (auditoria.isError && estadoHttpDeError(auditoria.error) === 404) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Sin historial disponible"
        description="Esta actividad no existe o no tienes acceso a ella."
      />
    )
  }

  return (
    <TimelineAuditoria
      cambios={auditoria.data ?? []}
      cargando={auditoria.isLoading}
      error={auditoria.isError ? auditoria.error : undefined}
      onReintentar={() => void auditoria.refetch()}
    />
  )
}
```

### Verificación
```bash
npm run type-check && npm run lint
```

---

## T4.3 — `<ActividadDetalleModal/>`

**Effort:** medio · **Depende de:** T2.1, T4.1, T4.2

### Archivos
- `src/components/actividades/ActividadDetalleModal.tsx` (**crea**)
- `src/components/actividades/ActividadDetalleModal.test.tsx` (**crea**)

### Contexto obligatorio
Lee `src/components/EventoDetalleModal.tsx`. Nota el patrón de "modal cerrado": cuando no
hay entidad, devuelve `<Modal open={false} footer={null} />`. **Replícalo.**

### Paso 1 — TESTS PRIMERO

```tsx
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import type { Actividad } from '@/types'
import { ActividadDetalleModal } from './ActividadDetalleModal'

function evento(): Actividad {
  return {
    tipo: 'evento',
    id: 15,
    titulo: 'Visita a planta',
    descripcion: null,
    estado: 'pendiente',
    fecha_hora: null,
    fecha_dia: '2026-09-15',
    id_empresa: null,
    empresa: null,
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 0,
    created_at: '2026-09-02T14:30:00Z',
  }
}

function handlersVacios(tipo: string, id: number) {
  return [
    http.get(`${BASE_API}/actividades/${tipo}/${id}/comentarios`, () =>
      HttpResponse.json({ data: [], meta: null, error: null }),
    ),
    http.get(`${BASE_API}/actividades/${tipo}/${id}/auditoria`, () =>
      HttpResponse.json({ data: [], meta: null, error: null }),
    ),
  ]
}

describe('ActividadDetalleModal', () => {
  it('no renderiza nada abierto cuando la actividad es null', () => {
    renderConProviders(<ActividadDetalleModal actividad={null} onClose={() => {}} />)
    expect(screen.queryByText(/Visita a planta/)).not.toBeInTheDocument()
  })

  it('muestra la fecha de un evento sin desplazar el día', async () => {
    // informe §13.2: `fecha_dia` es una fecha calendario. `new Date()` la
    // retrocedería al 14 en Lima.
    servidorMock.use(...handlersVacios('evento', 15))
    renderConProviders(<ActividadDetalleModal actividad={evento()} onClose={() => {}} />)
    expect(await screen.findByText(/15 sep 2026/)).toBeInTheDocument()
  })

  it('la pestaña de cambios pide la auditoría solo al abrirla', async () => {
    servidorMock.use(...handlersVacios('evento', 15))
    renderConProviders(<ActividadDetalleModal actividad={evento()} onClose={() => {}} />)

    await userEvent.click(screen.getByRole('tab', { name: /cambios/i }))
    expect(await screen.findByText(/sin ediciones/i)).toBeInTheDocument()
  })
})
```

> **Nota para el ejecutor:** si el último test resulta frágil por cómo Ant Design monta las
> pestañas, es aceptable simplificarlo a "al hacer clic en la pestaña Cambios se ve el
> estado vacío de auditoría". Lo que **no** es aceptable es borrarlo.

### Paso 2 — Implementación

```tsx
import { Modal, Tabs } from 'antd'
import type { Actividad } from '@/types'
import { ETIQUETA_TIPO_ACTIVIDAD, fechaDisplayActividad } from '@/utils/actividades'
import { formatoFechaHora, nombreCompleto } from '@/utils/formato'
import { CampoEditable } from '@/components/CampoEditable'
import { PanelComentarios } from './PanelComentarios'
import { PanelAuditoria } from './PanelAuditoria'

interface Props {
  /** Actividad a mostrar; `null` mantiene el modal cerrado. */
  actividad: Actividad | null
  onClose: () => void
  /** Navega al detalle de la oportunidad o empresa relacionada (opcional). */
  irADetalle?: () => void
}

/**
 * Ficha de una actividad del historial unificado: cabecera de solo lectura +
 * pestañas de comentarios y de cambios (informe §14).
 *
 * Es SOLO LECTURA sobre la actividad: para editar una tarea o un evento están
 * `TareaDetalleModal` y `EventoDetalleModal`, que hablan con los endpoints de
 * sus propios módulos. Este modal solo escribe comentarios.
 */
export function ActividadDetalleModal({ actividad, onClose, irADetalle }: Props) {
  if (!actividad) {
    return <Modal open={false} footer={null} />
  }

  const { tipo, id } = actividad

  return (
    <Modal
      title={`${ETIQUETA_TIPO_ACTIVIDAD[tipo]} · ${actividad.titulo}`}
      open
      onCancel={onClose}
      width={640}
      footer={null}
    >
      <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
        <CampoEditable label="Empresa" display={actividad.empresa?.razon_social ?? '—'} />
        <CampoEditable label="Responsable" display={nombreCompleto(actividad.empleado)} />
        <CampoEditable label="Estado" display={actividad.estado} />
        {/* Una sola fecha visible: `fecha_hora` si existe, si no `fecha_dia`.
            Los dos campos NO se mezclan (informe §3, WARNING). */}
        <CampoEditable label="Fecha" display={fechaDisplayActividad(actividad)} />
        <CampoEditable label="Creada" display={formatoFechaHora(actividad.created_at)} />
        <CampoEditable label="Descripción" ancho display={actividad.descripcion ?? '—'} />
      </div>

      <Tabs
        items={[
          {
            key: 'comentarios',
            label: `Comentarios${actividad.comentarios > 0 ? ` (${actividad.comentarios})` : ''}`,
            children: <PanelComentarios tipo={tipo} id={id} />,
          },
          {
            key: 'auditoria',
            label: 'Cambios',
            children: <PanelAuditoria tipo={tipo} id={id} />,
          },
        ]}
      />

      {irADetalle && (
        <div className="mt-4">
          <button type="button" className="text-primary font-bold hover:underline" onClick={irADetalle}>
            Ver detalle relacionado
          </button>
        </div>
      )}
    </Modal>
  )
}
```

### Verificación
```bash
npm run test -- ActividadDetalleModal && npm run type-check && npm run lint
```

**Cierre de OLA 4:** `npm run test && npm run lint && npm run type-check` en verde.

---
---

# OLA 5 — Pantalla del historial

## T5.1 — `<FiltrosHistorial/>`

**Effort:** medio · **Depende de:** T0.1

### Archivo
- `src/pages/Actividades/FiltrosHistorial.tsx` (**crea**)

**Sin test propio:** es un componente controlado sin lógica (todo el estado vive en la
página). Su comportamiento se verifica en `HistorialActividadesPage.test.tsx` (T5.2).

### Paso 1 — Implementación

```tsx
import { DatePicker, Segmented } from 'antd'
import type { Dayjs } from 'dayjs'
import type { EmpleadoResumen, TipoActividad } from '@/types'
import { EmpleadoSelect } from '@/components/EmpleadoSelect'

const { RangePicker } = DatePicker

/** El valor del Segmented: 'todas' es el "sin filtro", no un tipo del backend. */
type OpcionTipo = 'todas' | TipoActividad

interface Props {
  /** Solo admin/gerencia/jdv ven el selector de empleado (D4, informe §7). */
  esSupervisor: boolean
  empleados: EmpleadoResumen[]
  cargandoEmpleados: boolean
  errorEmpleados: boolean
  idEmpleado: number
  onIdEmpleado: (id: number) => void
  rango: [Dayjs, Dayjs] | null
  onRango: (rango: [Dayjs, Dayjs] | null) => void
  tipo: TipoActividad | undefined
  onTipo: (tipo: TipoActividad | undefined) => void
}

/**
 * Barra de filtros del historial.
 *
 * ⚠ La etiqueta del rango dice "Creadas entre" a propósito: `desde`/`hasta`
 * filtran por `created_at` (cuándo se registró la actividad), NO por la fecha
 * planificada (informe §3, NOTE). Llamarlo "Fecha" haría que un supervisor
 * interprete mal todos los resultados.
 */
export function FiltrosHistorial({
  esSupervisor,
  empleados,
  cargandoEmpleados,
  errorEmpleados,
  idEmpleado,
  onIdEmpleado,
  rango,
  onRango,
  tipo,
  onTipo,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      {esSupervisor && (
        <label className="flex flex-col gap-1 min-w-[240px]">
          <span className="text-label-md text-on-surface-variant uppercase">Empleado</span>
          <EmpleadoSelect
            empleados={empleados}
            value={idEmpleado > 0 ? idEmpleado : undefined}
            onChange={(v) => v !== undefined && onIdEmpleado(v)}
            cargando={cargandoEmpleados}
            error={errorEmpleados}
            placeholder="Selecciona un empleado"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-label-md text-on-surface-variant uppercase">Creadas entre</span>
        <RangePicker
          format="DD/MM/YYYY"
          value={rango}
          onChange={(valores) => {
            const desde = valores?.[0]
            const hasta = valores?.[1]
            onRango(desde && hasta ? [desde, hasta] : null)
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-md text-on-surface-variant uppercase">Tipo</span>
        <Segmented<OpcionTipo>
          value={tipo ?? 'todas'}
          onChange={(valor) => onTipo(valor === 'todas' ? undefined : valor)}
          options={[
            { label: 'Todas', value: 'todas' },
            { label: 'Tareas', value: 'tarea' },
            { label: 'Eventos', value: 'evento' },
          ]}
        />
      </label>
    </div>
  )
}
```

> Si `Segmented<OpcionTipo>` da problemas de tipos con la versión de antd instalada, usa
> `<Segmented value={...} onChange={(v) => onTipo(v === 'todas' ? undefined : (v as TipoActividad))} .../>`.
> **No uses `any`** — `as TipoActividad` sobre un valor que sabes acotado sí está permitido.

### Verificación
```bash
npm run type-check && npm run lint
```

---

## T5.2 — `<HistorialActividadesPage/>` + tests

**Effort:** alto · **Depende de:** T1.3, T2.1, T4.3, T5.1

Esta es la tarea más grande del plan. Léela entera antes de escribir una línea.

### Archivos
- `src/pages/Actividades/HistorialActividadesPage.tsx` (**crea**)
- `src/pages/Actividades/HistorialActividadesPage.test.tsx` (**crea**)

### Contexto obligatorio
- `src/pages/Prospeccion/ProspeccionPage.tsx` líneas ~130–155: patrón de paginación real
  contra el servidor (`meta.total`, `meta.per_page`, `<Pagination/>`).
- `src/components/NotificacionesDropdown.test.tsx`: patrón de test de pantalla con MSW +
  `useAuthStore.setState(...)`.
- `src/store/authStore.ts`: `ROLES_SUPERVISION` y `tieneRol`.

### Paso 1 — TESTS PRIMERO

```tsx
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { BASE_API, servidorMock } from '@/test/servidor-mock'
import { useAuthStore } from '@/store/authStore'
import type { Actividad, Empleado, Rol } from '@/types'
import { HistorialActividadesPage } from './HistorialActividadesPage'

function empleadoCon(rol: Rol): Empleado {
  return {
    id: 7,
    nombres: 'Juan',
    apellidos: 'Pérez',
    email: 'juan@quantum.pe',
    rol,
    area: 'Ventas',
    puesto: 'Vendedor',
    activo: true,
  }
}

function actividadTarea(): Actividad {
  return {
    tipo: 'tarea',
    id: 42,
    titulo: 'llamada',
    descripcion: 'Llamar al contacto',
    estado: 'pendiente',
    fecha_hora: '2026-09-10T15:00:00Z',
    fecha_dia: null,
    id_empresa: 3,
    empresa: { id: 3, razon_social: 'ACME SAC', distrito: 'Miraflores' },
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 3,
    created_at: '2026-09-01T10:00:00Z',
  }
}

/** El evento 42: mismo ID que la tarea, secuencias independientes (D10). */
function actividadEvento(): Actividad {
  return {
    tipo: 'evento',
    id: 42,
    titulo: 'Visita a planta',
    descripcion: null,
    estado: 'pendiente',
    fecha_hora: null,
    fecha_dia: '2026-09-15',
    id_empresa: null,
    empresa: null,
    id_oportunidad: 20,
    id_empleado: 7,
    empleado: { id: 7, nombres: 'Juan', apellidos: 'Pérez' },
    comentarios: 0,
    created_at: '2026-09-02T14:30:00Z',
  }
}

function handlerHistorial(datos: Actividad[], total = datos.length) {
  return http.get(`${BASE_API}/actividades`, () =>
    HttpResponse.json({
      data: datos,
      meta: { page: 1, per_page: 20, total, total_pages: Math.max(1, Math.ceil(total / 20)) },
      error: null,
    }),
  )
}

const handlerEmpleados = http.get(`${BASE_API}/empleados`, () =>
  HttpResponse.json({ data: [empleadoCon('vendedor')], meta: null, error: null }),
)

describe('HistorialActividadesPage', () => {
  afterEach(() => useAuthStore.setState({ empleado: null, cargando: false }))

  describe('como vendedor', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('no muestra el selector de empleado', async () => {
      // informe §7: un no-supervisor solo puede ver su propio historial. Ofrecer
      // el selector solo consigue que se coma un 403.
      servidorMock.use(handlerHistorial([actividadTarea()]))
      renderConProviders(<HistorialActividadesPage />)
      await screen.findByText('ACME SAC')
      expect(screen.queryByText(/^Empleado$/i)).not.toBeInTheDocument()
    })

    it('pide el historial con su propio id_empleado', async () => {
      let urlVista = ''
      servidorMock.use(
        http.get(`${BASE_API}/actividades`, ({ request }) => {
          urlVista = request.url
          return HttpResponse.json({
            data: [actividadTarea()],
            meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
            error: null,
          })
        }),
      )
      renderConProviders(<HistorialActividadesPage />)
      await screen.findByText('ACME SAC')
      expect(urlVista).toContain('id_empleado=7')
    })
  })

  describe('como gerencia', () => {
    beforeEach(() => useAuthStore.setState({ empleado: { ...empleadoCon('gerencia'), id: 1 }, cargando: false }))

    it('muestra el selector de empleado', async () => {
      servidorMock.use(handlerHistorial([actividadTarea()]), handlerEmpleados)
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/^Empleado$/i)).toBeInTheDocument()
    })
  })

  describe('render de filas', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('muestra una tarea y un evento con el mismo ID sin colapsarlos', async () => {
      // D10: los IDs de tareas y eventos son secuencias independientes. Con
      // rowKey="id" React descarta una de las dos filas.
      servidorMock.use(handlerHistorial([actividadTarea(), actividadEvento()]))
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText('llamada')).toBeInTheDocument()
      expect(screen.getByText('Visita a planta')).toBeInTheDocument()
    })

    it('muestra la fecha del evento sin retroceder un día', async () => {
      servidorMock.use(handlerHistorial([actividadEvento()]))
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/15 sep 2026/)).toBeInTheDocument()
    })

    it('muestra el estado vacío cuando no hay actividades', async () => {
      servidorMock.use(handlerHistorial([], 0))
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/sin actividades/i)).toBeInTheDocument()
    })
  })

  describe('errores', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('ante un 403 explica que hace falta ser supervisor', async () => {
      servidorMock.use(
        http.get(`${BASE_API}/actividades`, () =>
          HttpResponse.json(
            { data: null, meta: null, error: { code: 'PERMISO_INSUFICIENTE', message: 'Sin permiso' } },
            { status: 403 },
          ),
        ),
      )
      renderConProviders(<HistorialActividadesPage />)
      expect(await screen.findByText(/historial de otro empleado/i)).toBeInTheDocument()
    })
  })

  describe('detalle', () => {
    beforeEach(() => useAuthStore.setState({ empleado: empleadoCon('vendedor'), cargando: false }))

    it('al hacer clic en una fila abre la ficha con sus comentarios', async () => {
      servidorMock.use(
        handlerHistorial([actividadTarea()]),
        http.get(`${BASE_API}/actividades/tarea/42/comentarios`, () =>
          HttpResponse.json({ data: [], meta: null, error: null }),
        ),
        http.get(`${BASE_API}/actividades/tarea/42/auditoria`, () =>
          HttpResponse.json({ data: [], meta: null, error: null }),
        ),
      )
      renderConProviders(<HistorialActividadesPage />)
      await userEvent.click(await screen.findByText('llamada'))
      await waitFor(() => expect(screen.getByLabelText(/nuevo comentario/i)).toBeInTheDocument())
    })
  })
})
```

> **Nota:** el interceptor de `client.ts` reintenta una vez tras un 401, **no** tras un 403,
> así que el test del 403 no necesita handler de `/auth/refresh`.

### Paso 2 — Implementación

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Pagination, Result, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { estadoHttpDeError } from '@/api/client'
import { ROLES_SUPERVISION, tieneRol, useAuthStore } from '@/store/authStore'
import { useEmpleados } from '@/hooks/useCatalogos'
import { useActividades } from '@/hooks/useActividades'
import type { Actividad, ActividadesFiltros, TipoActividad } from '@/types'
import {
  ETIQUETA_TIPO_ACTIVIDAD,
  ICONO_TIPO_ACTIVIDAD,
  fechaDisplayActividad,
} from '@/utils/actividades'
import { formatoFechaHora, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { Icono } from '@/components/Icono'
import { ActividadDetalleModal } from '@/components/actividades/ActividadDetalleModal'
import { FiltrosHistorial } from './FiltrosHistorial'

const POR_PAGINA = 20

/** Lee un query param numérico. Devuelve undefined si falta o no es un número > 0. */
function numeroDeParam(valor: string | null): number | undefined {
  if (valor === null) return undefined
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Historial unificado de actividades de un empleado (informe §3).
 *
 * Es una vista pensada para supervisores, pero cualquier rol puede ver el suyo:
 * por eso la ruta va bajo `RequireAuth` sin `RequireRol` (D2) y lo que se
 * restringe por rol es el selector de empleado (D4).
 */
export function HistorialActividadesPage() {
  const navigate = useNavigate()
  const empleadoActual = useAuthStore((s) => s.empleado)
  const esSupervisor = tieneRol(empleadoActual, ROLES_SUPERVISION)

  const [searchParams, setSearchParams] = useSearchParams()
  // `id_empresa` e `id_oportunidad` viven en la URL, no en el estado local (D7):
  // así el enlace "ver el historial de esta empresa" funciona sin selector propio.
  const idEmpresa = numeroDeParam(searchParams.get('id_empresa'))
  const idOportunidad = numeroDeParam(searchParams.get('id_oportunidad'))

  const [idEmpleado, setIdEmpleado] = useState(empleadoActual?.id ?? 0)
  const [rango, setRango] = useState<[Dayjs, Dayjs] | null>(null)
  const [tipo, setTipo] = useState<TipoActividad | undefined>(undefined)
  const [pagina, setPagina] = useState(1)
  const [seleccionada, setSeleccionada] = useState<Actividad | null>(null)

  // El empleado del store llega asíncrono (RequireAuth ya esperó, pero el estado
  // inicial de useState se calcula una sola vez). Sin esto, un refresco directo
  // sobre esta URL deja `idEmpleado` en 0 y la query nunca se habilita.
  useEffect(() => {
    if (empleadoActual && idEmpleado === 0) setIdEmpleado(empleadoActual.id)
  }, [empleadoActual, idEmpleado])

  // Cualquier cambio de filtro vuelve a la página 1: quedarse en la 3 de un
  // conjunto que ahora tiene una sola página muestra una tabla vacía sin motivo.
  useEffect(() => {
    setPagina(1)
  }, [idEmpleado, tipo, rango, idEmpresa, idOportunidad])

  // Solo los supervisores necesitan la lista de empleados. `useEmpleados` con
  // `enabled=false` para el resto evita una petición que además puede dar 403.
  //
  // ⚠ NO uses `useEmpleadosSeleccionables()` aquí (D5): implementa otra regla
  // (contrato §12) y dejaría a un empleado con rol `otro` pidiendo historiales
  // ajenos.
  const empleados = useEmpleados({ activo: true }, esSupervisor)

  const filtros: ActividadesFiltros = useMemo(
    () => ({
      id_empleado: idEmpleado,
      page: pagina,
      per_page: POR_PAGINA,
      ...(tipo ? { tipo } : {}),
      // `desde`/`hasta` son Instants y filtran por `created_at` (informe §3).
      ...(rango
        ? {
            desde: rango[0].startOf('day').toISOString(),
            hasta: rango[1].endOf('day').toISOString(),
          }
        : {}),
      ...(idEmpresa ? { id_empresa: idEmpresa } : {}),
      ...(idOportunidad ? { id_oportunidad: idOportunidad } : {}),
    }),
    [idEmpleado, pagina, tipo, rango, idEmpresa, idOportunidad],
  )

  const actividades = useActividades(filtros)
  const filas = actividades.data?.data ?? []
  const total = actividades.data?.meta?.total ?? filas.length
  const porPagina = actividades.data?.meta?.per_page ?? POR_PAGINA

  const quitarParam = (clave: 'id_empresa' | 'id_oportunidad') => {
    const siguientes = new URLSearchParams(searchParams)
    siguientes.delete(clave)
    setSearchParams(siguientes, { replace: true })
  }

  const columnas: ColumnsType<Actividad> = [
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      width: 110,
      render: (_valor, fila) => (
        <span className="inline-flex items-center gap-1.5">
          <Icono nombre={ICONO_TIPO_ACTIVIDAD[fila.tipo]} tamano={18} />
          {ETIQUETA_TIPO_ACTIVIDAD[fila.tipo]}
        </span>
      ),
    },
    { title: 'Título', dataIndex: 'titulo' },
    {
      title: 'Empresa',
      key: 'empresa',
      render: (_valor, fila) => fila.empresa?.razon_social ?? '—',
    },
    {
      title: 'Responsable',
      key: 'empleado',
      // `empleado` puede llegar null si el backend no pudo resolverlo (informe §3).
      render: (_valor, fila) => nombreCompleto(fila.empleado),
    },
    {
      title: 'Fecha',
      key: 'fecha',
      // Un solo texto derivado de fecha_hora O fecha_dia. Los dos campos NO se
      // mezclan en un Date (informe §3, WARNING).
      render: (_valor, fila) => fechaDisplayActividad(fila),
    },
    { title: 'Estado', dataIndex: 'estado', width: 130 },
    {
      title: 'Creada',
      key: 'created_at',
      render: (_valor, fila) => formatoFechaHora(fila.created_at),
    },
    {
      title: 'Coment.',
      key: 'comentarios',
      width: 90,
      align: 'center',
      render: (_valor, fila) => <Badge count={fila.comentarios} showZero={false} />,
    },
  ]

  if (actividades.isError && estadoHttpDeError(actividades.error) === 403) {
    return (
      <div className="page-container">
        <Result
          status="403"
          title="Sin acceso"
          subTitle="Solo administración, gerencia y jefatura de ventas pueden ver el historial de otro empleado."
          extra={
            <Button type="primary" onClick={() => navigate('/actividades')}>
              Volver a actividades
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Historial de actividades
          </h1>
          <p className="text-text-muted">
            Tareas y eventos registrados, con sus comentarios de seguimiento y sus ediciones.
          </p>
        </div>
        <Button onClick={() => navigate('/actividades')}>Volver a actividades</Button>
      </div>

      <FiltrosHistorial
        esSupervisor={esSupervisor}
        empleados={empleados.data ?? []}
        cargandoEmpleados={empleados.isLoading}
        errorEmpleados={empleados.isError}
        idEmpleado={idEmpleado}
        onIdEmpleado={setIdEmpleado}
        rango={rango}
        onRango={setRango}
        tipo={tipo}
        onTipo={setTipo}
      />

      {(idEmpresa || idOportunidad) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {idEmpresa && (
            <Tag closable onClose={() => quitarParam('id_empresa')}>
              Empresa #{idEmpresa}
            </Tag>
          )}
          {idOportunidad && (
            <Tag closable onClose={() => quitarParam('id_oportunidad')}>
              Oportunidad #{idOportunidad}
            </Tag>
          )}
        </div>
      )}

      {actividades.isLoading && <Cargando />}
      {actividades.isError && (
        <ErrorCarga error={actividades.error} onReintentar={() => void actividades.refetch()} />
      )}

      {!actividades.isLoading && !actividades.isError && (
        <>
          <Table<Actividad>
            // ⚠ `${tipo}-${id}` y NUNCA `id` (D10): la tarea 42 y el evento 42
            // conviven en la misma página y con `id` React descarta una fila.
            rowKey={(fila) => `${fila.tipo}-${fila.id}`}
            columns={columnas}
            dataSource={filas}
            pagination={false}
            scroll={{ x: 1050 }}
            locale={{ emptyText: 'Sin actividades para estos filtros' }}
            onRow={(fila) => ({
              onClick: () => setSeleccionada(fila),
              style: { cursor: 'pointer' },
            })}
          />
          <div className="flex justify-end mt-4">
            <Pagination
              size="small"
              current={pagina}
              total={total}
              pageSize={porPagina}
              showSizeChanger={false}
              onChange={setPagina}
            />
          </div>
        </>
      )}

      <ActividadDetalleModal
        actividad={seleccionada}
        onClose={() => setSeleccionada(null)}
        irADetalle={
          seleccionada
            ? () => {
                const a = seleccionada
                setSeleccionada(null)
                if (a.id_oportunidad) navigate(`/oportunidades/${a.id_oportunidad}`)
                else if (a.id_empresa) navigate(`/empresas/${a.id_empresa}`)
              }
            : undefined
        }
      />
    </div>
  )
}
```

### Paso 3 — Detalles que fallan si los ignoras

- `useEmpleados(params, enabled)` — el **segundo** argumento es `enabled`. Comprueba la
  firma en `src/hooks/useCatalogos.ts` antes de llamarlo.
- `ColumnsType` se importa de `'antd/es/table'`. Si tu versión de antd no expone esa ruta,
  usa `import type { TableProps } from 'antd'` y tipa como
  `NonNullable<TableProps<Actividad>['columns']>`.
- La página **debe** estar envuelta en `<div className="page-container">` (convención del
  repo desde el commit `ea2ad79`, para que el footer quede abajo con poco contenido).
- `useSearchParams` viene de `react-router-dom`. La página se renderiza en tests dentro de
  `MemoryRouter` (lo pone `renderConProviders`), así que funciona sin más.

### Verificación
```bash
npm run test -- HistorialActividadesPage && npm run type-check && npm run lint
```

---

## T5.3 — Ruta y punto de entrada

**Effort:** bajo · **Depende de:** T5.2

### Archivos
- `src/router/rutas.ts` (**modifica**)
- `src/router/index.tsx` (**modifica**)
- `src/pages/Actividades/ActividadesPage.tsx` (**modifica**: añade un botón)

### Paso 1 — Constante de ruta

En `src/router/rutas.ts`, al final del archivo:

```ts
/**
 * Historial unificado de actividades (Plan 06). Se referencia desde
 * `router/index.tsx` y desde el botón de `ActividadesPage`, por eso vive acá.
 */
export const RUTA_HISTORIAL_ACTIVIDADES = '/actividades/historial'
```

### Paso 2 — Registrar la ruta

En `src/router/index.tsx`:

**2a.** Añade `RUTA_HISTORIAL_ACTIVIDADES` al `import { ... } from './rutas'` que ya existe.

**2b.** Junto a los demás `lazy(...)`, después del de `ActividadesPage`:

```tsx
const HistorialActividadesPage = lazy(() =>
  import('@/pages/Actividades/HistorialActividadesPage').then((m) => ({
    default: m.HistorialActividadesPage,
  })),
)
```

**2c.** Dentro del bloque de rutas protegidas, **justo debajo** de
`<Route path="/actividades" element={<ActividadesPage />} />`:

```tsx
{/* Sin RequireRol a propósito (D2): cualquier rol puede ver SU historial. Lo
    que se restringe por rol es el selector de empleado, no la pantalla. */}
<Route path={RUTA_HISTORIAL_ACTIVIDADES} element={<HistorialActividadesPage />} />
```

**No toques** `RequireRol`, ni `navItems.ts`, ni ninguna otra ruta.

### Paso 3 — Botón de entrada

En `src/pages/Actividades/ActividadesPage.tsx`:

**3a.** Añade al import de rutas (créalo si no existe):
```tsx
import { RUTA_HISTORIAL_ACTIVIDADES } from '@/router/rutas'
```

**3b.** El bloque de cabecera de la página es este (búscalo tal cual):

```tsx
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Gestión de Actividades</h1>
          <p className="text-text-muted">
            Tareas del vendedor y eventos operativos externos en seguimiento.
          </p>
        </div>
```

Reemplázalo por:

```tsx
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Gestión de Actividades</h1>
            <p className="text-text-muted">
              Tareas del vendedor y eventos operativos externos en seguimiento.
            </p>
          </div>
          {/* Entrada al historial unificado (Plan 06, D3): no se añadió al menú
              de navegación — es una vista secundaria de esta sección. */}
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-lg text-primary font-bold hover:bg-surface-container transition-colors"
            onClick={() => navigate(RUTA_HISTORIAL_ACTIVIDADES)}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            Ver historial
          </button>
        </div>
```

`navigate` ya existe en ese componente (`const navigate = useNavigate()`, línea ~25). **No lo
vuelvas a declarar.**

### Verificación
```bash
npm run test && npm run type-check && npm run lint
```

Además, verificación manual (si tienes el backend a mano):
```bash
npm run dev
# 1. Entrar a /actividades → debe verse el botón "Ver historial".
# 2. Clic → llega a /actividades/historial y carga la tabla.
# 3. Como vendedor: NO debe verse el selector de empleado.
# 4. /actividades/historial?id_empresa=3 → debe verse el chip "Empresa #3".
```

**Cierre de OLA 5:** `npm run test && npm run lint && npm run type-check` en verde.

---
---

# OLA 6 — Integración en las fichas existentes

> Objetivo: que los comentarios de seguimiento se puedan leer y escribir **también** desde
> donde el usuario ya gestiona tareas y eventos, no solo desde el historial.

## T6.1 — Comentarios dentro de `TareaDetalleModal`

**Effort:** bajo · **Depende de:** T4.1

### Archivo
- `src/components/TareaDetalleModal.tsx` (**modifica**)

### Por qué es seguro
El modal solo se monta cuando `tarea !== null` (hace `return <Modal open={false} />` en caso
contrario, **antes** de llegar al JSX principal). Como el panel vive dentro de ese JSX, la
petición de comentarios **solo se dispara con el modal abierto**. Ninguna pantalla que lo
tenga cerrado hará peticiones nuevas.

### Paso 1

**1a.** Añade el import:
```tsx
import { PanelComentarios } from './actividades/PanelComentarios'
```

**1b.** Al final del JSX, **después** del `</div>` que cierra
`<div className="grid grid-cols-2 gap-y-5 gap-x-8">` y **antes** de `</Modal>`:

```tsx
      {/* Comentarios de seguimiento (Plan 06). Append-only y separados de
          `descripcion`: nunca la sobrescriben (informe §1). */}
      <div className="mt-6 border-t border-border-subtle pt-4">
        <h4 className="text-label-md text-on-surface-variant uppercase mb-3">Seguimiento</h4>
        <PanelComentarios tipo="tarea" id={tarea.id} />
      </div>
```

No cambies nada más del archivo — ni el footer, ni la lógica de `cambios`, ni `guardar`.

### Verificación
```bash
npm run test && npm run type-check && npm run lint
```

**Si algún test empieza a fallar con un error de "unhandled request"**, significa que hay
una prueba que abre este modal. Ese test necesita un handler MSW extra:
```ts
http.get(`${BASE_API}/actividades/tarea/:id/comentarios`, () =>
  HttpResponse.json({ data: [], meta: null, error: null }),
)
```
Añádelo **solo** al test que falla. Si no sabes cuál es → escala.

---

## T6.2 — Comentarios dentro de `EventoDetalleModal`

**Effort:** bajo · **Depende de:** T4.1

### Archivo
- `src/components/EventoDetalleModal.tsx` (**modifica**)

Idéntico a T6.1, cambiando la entidad:

**1a.** `import { PanelComentarios } from './actividades/PanelComentarios'`

**1b.** Después del `</div>` de la grilla de campos y antes de `</Modal>`:

```tsx
      <div className="mt-6 border-t border-border-subtle pt-4">
        <h4 className="text-label-md text-on-surface-variant uppercase mb-3">Seguimiento</h4>
        <PanelComentarios tipo="evento" id={evento.id} />
      </div>
```

### Verificación
```bash
npm run test && npm run type-check && npm run lint
```

---

## T6.3 — Enlaces desde empresa y oportunidad `[OPCIONAL]`

**Effort:** bajo · **Depende de:** T5.3

> **Esta tarea es opcional.** Ejecútala solo si las olas 0–6 están completas y en verde.
> Si algo va mal aquí, revierte **solo** esta tarea: el plan se da por cumplido sin ella.

**Qué hace:** aprovechar D7 (filtros por URL) para enlazar desde los detalles.

En `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`, en la zona de acciones de la
cabecera, un enlace a:
```
`${RUTA_HISTORIAL_ACTIVIDADES}?id_empresa=${empresa.id}`
```

En `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx`, análogo con
`?id_oportunidad=${oportunidad.id}`.

Antes de escribir, **abre cada archivo y localiza dónde están los demás botones de acción**.
Si no encuentras un lugar evidente donde encaje sin reestructurar el layout → **no la hagas**
y reporta que quedó pendiente. No reestructures esas páginas.

### Verificación
```bash
npm run test && npm run type-check && npm run lint
```

---
---

# OLA 7 — Verificación final

## T7.1 — Cierre

**Effort:** bajo · **Depende de:** todas

### Paso 1 — Suite completa

```bash
npm run test
npm run type-check
npm run lint
npm run build
```

Los cuatro **en verde**. Si `npm run build` falla pero `type-check` pasa, el problema es de
bundling: reporta el error íntegro y escala.

### Paso 2 — Checklist de integración del informe (§16)

Marca cada punto **solo** si puedes señalar el archivo y la línea que lo cumple:

- [ ] Tipos TS para `Actividad`, `ComentarioActividad`, `CambioAuditoria` → `src/types/actividad.ts`
- [ ] Servicio/hook para `GET /actividades` con todos los filtros → `src/api/actividades.ts`, `src/hooks/useActividades.ts`
- [ ] Selector de empleado (obligatorio) → `src/pages/Actividades/FiltrosHistorial.tsx`
- [ ] Filtros opcionales: fecha desde/hasta, tipo, empresa, oportunidad → `FiltrosHistorial.tsx` + chips por URL en `HistorialActividadesPage.tsx`
- [ ] Tabla con diferenciación visual tarea vs evento → columna "Tipo" con `ICONO_TIPO_ACTIVIDAD`
- [ ] `fecha_hora` (Instant) vs `fecha_dia` (LocalDate) manejadas por separado → `src/utils/actividades.ts`
- [ ] Badge con conteo de `comentarios` → columna "Coment."
- [ ] Vista de detalle carga y muestra comentarios → `PanelComentarios`
- [ ] Formulario para agregar comentario → `FormularioComentario`
- [ ] Vista de auditoría campo a campo → `TimelineAuditoria` / `PanelAuditoria`
- [ ] Paginación del historial (`meta.page`, `meta.total_pages`) → `<Pagination/>` en la página
- [ ] Manejo de `403` (no supervisor) y `404` (actividad no visible) → `Result 403` en la página, `Alert` en los paneles
- [ ] `created_by`/`created_at` nuevos de `EventoDto` no rompen nada → T0.2 + suite en verde

### Paso 3 — Checklist de reglas de `CLAUDE.md`

```bash
# 1. Ningún `any` en lo que se añadió
grep -rn ": any\|<any>\|as any" src/types/actividad.ts src/api/actividades.ts src/hooks/useActividades.ts src/utils/actividades.ts src/components/actividades src/pages/Actividades

# 2. Ningún fetch/axios fuera de src/api
grep -rn "axios\|fetch(" src/components/actividades src/pages/Actividades src/hooks/useActividades.ts

# 3. Ningún dangerouslySetInnerHTML
grep -rn "dangerouslySetInnerHTML" src/components/actividades src/pages/Actividades

# 4. Ningún localStorage/sessionStorage
grep -rn "localStorage\|sessionStorage" src/components/actividades src/pages/Actividades

# 5. Ningún new Date() sobre fecha_dia
grep -rn "new Date(" src/utils/actividades.ts src/components/actividades src/pages/Actividades
```

Los cinco `grep` deben devolver **cero resultados**. Si alguno devuelve algo, arréglalo antes
de cerrar.

### Paso 4 — Reporte final

Emite un resumen con:
- Tareas completadas y tareas omitidas (con el motivo de cada omisión).
- Salida literal de `npm run test` (línea de resumen: `Test Files … / Tests …`).
- Cualquier escalación pendiente.
- Cualquier archivo que hayas tenido que tocar **fuera** del inventario de §3, con
  justificación. (Si no hay ninguno, dilo explícitamente.)

---
---

# §5 — Apéndice: errores que este plan intenta evitar

Lista de los fallos concretos que un ejecutor comete en esta integración. Si te encuentras a
punto de hacer alguno, para.

| Error | Consecuencia |
|---|---|
| Unificar `fecha_hora` y `fecha_dia` en un `Date` | Eventos que se muestran un día antes en Lima. Silencioso: nada falla, solo miente. |
| `rowKey="id"` en la tabla | Filas que desaparecen cuando una tarea y un evento comparten ID. |
| Reordenar comentarios o auditoría en el cliente | El orden del backend es parte del contrato (§9). Reordenar rompe la lectura cronológica. |
| Reutilizar `useEmpleadosSeleccionables()` | Un empleado con rol `otro` pide historiales ajenos y se come un 403 sin explicación. |
| Invalidar solo `qk.actividadComentarios(...)` al comentar | El badge del historial sigue mostrando el conteo viejo. |
| Hacer `id_empleado` opcional en `ActividadesFiltros` | 400 del backend en cuanto alguien olvide pasarlo, sin recuperación posible en la UI. |
| Etiquetar el rango de fechas como "Fecha" | El supervisor cree que filtra por fecha de ejecución cuando filtra por fecha de creación. |
| `Record<CampoAuditado, string>` cerrado para las etiquetas | La pantalla revienta el día que el backend audite un campo nuevo. |
| `String.prototype.replaceAll` | No existe con `lib: ES2020`. Rompe el build. |
| `array[0]` sin `?? valor` | `noUncheckedIndexedAccess` hace que sea `T | undefined`. Rompe el `type-check`. |
| Escribir la implementación antes del test | Viola `TESTING-frontend.md` §1. La tarea se rechaza. |
