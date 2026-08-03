# Gerencia, Solicitudes de aprobación y Cartera Maestra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar el frontend al contrato `docs/gerencia_contrato_frontend.md`: rol `gerente` → `gerencia`, flujo de Solicitudes de aprobación (422/403 → modal → `POST /solicitudes`), bandeja de aprobación `/gerencia`, vista única `/solicitudes` (jdv + vendedor/analista, fusionando bandeja jdv y "Mis solicitudes"), 3 tipos nuevos de notificación y Cartera Maestra.

**Architecture:** Se sigue el patrón existente por capas: tipos en `src/types/solicitud.ts` (espejo del DTO), cliente en `src/api/solicitudes.ts` sobre los helpers de `client.ts`, hooks TanStack Query en `src/hooks/useSolicitudes.ts` con invalidación 360 vía `qk`/`invalidar`, y componentes reutilizables (`SolicitudModal`, `BandejaSolicitudes`, `SolicitudDetalleModal`) consumidos por las páginas nuevas (`GerenciaPage`, `SolicitudesPage`) y por los formularios existentes que hoy pueden recibir `422 APROBACION_REQUERIDA` / `403 PERMISO_INSUFICIENTE`. El backend es la autoridad: el frontend usa la tabla de límites SOLO para avisos proactivos y siempre maneja la respuesta real.

**Tech Stack:** React 18 + TypeScript strict, Ant Design v5, TanStack Query v5, React Router v6, Axios (vía `src/api/client.ts`), Tailwind utility classes del design system existente.

## Global Constraints

- TypeScript strict, **nunca `any`** — `unknown` + narrowing (CLAUDE.md regla 2).
- Toda llamada HTTP pasa por `/src/api/` (regla 5). Server state solo en TanStack Query (regla 3). Invalidación 360 tras cada mutación (regla 4).
- **La validación de negocio es del backend** (contrato §7): la tabla de límites de descuento (§2) se usa solo para avisos proactivos de UX; el `422`/`403`/`409` real del backend es siempre la fuente de verdad.
- **No hay framework de tests instalado** (`npm run test` es un no-op: `"tests: omitidos en MVP por decision de producto"`; cero archivos `*.test.*`). Verificación por tarea = `npm run type-check` + verificación manual en navegador. No instalar Vitest para esta feature sin decisión explícita del usuario.
- **No hay repositorio git en este directorio** (confirmado: `Is a git repository: false`). Omitir todos los pasos de commit; no ejecutar `git init`.
- Iconos: solo el componente `Icono` / clases `material-symbols-outlined` — `@ant-design/icons` NO está instalado.
- Textos de UI en español, código con nombres en español siguiendo el estilo existente (`solicitante`, `aprobar`, `motivo`…).
- Envelope de API estándar: `{ data, meta, error }`; montos y `dcto` viajan como **string** con 2 decimales en respuestas (`"5.00"`), `dcto` numérico en inputs de formularios (igual que hoy: `v.dcto.toFixed(2)` al enviar el PUT).
- Nunca listar empleados con rol `gerencia`/`admin`/`analista` como destino de asignación de vendedor (contrato §3.2); selectores de "vendedor asignado" solo `vendedor` + `jdv` activos (§7.4, pendiente P5).

## Decisiones ya tomadas (con su justificación)

| # | Decisión | Justificación |
|---|---|---|
| D1 | Bandeja de gerencia en ruta `/gerencia` (roles `gerencia`, `admin`). Ruta `/solicitudes` (roles `vendedor`, `analista`, `jdv`) con **una sola tabla unificada**, sin split "Por aprobar"/"Mis solicitudes" | Confirmado por el usuario 2026-07-16: el jdv debe ver en la misma vista tanto lo que creó como lo que tiene por aprobar. El backend ya mezcla ambos conjuntos en `GET /solicitudes` sin filtros para el rol jdv (§4.2), así que basta una tabla donde cada fila muestra Aprobar/Denegar solo si `rol_aprobador` coincide con el rol del usuario y sigue `pendiente`. |
| D9 | Modal `SolicitudDetalleModal` (usa `GET /solicitudes/:id`) accesible con "Ver detalle" desde `/gerencia` y `/solicitudes` | Confirmado por el usuario 2026-07-16 (respuesta a P9): sí debe poder abrirse el detalle completo de una solicitud, aunque no haya una ruta `/solicitudes/:id` dedicada. |
| D2 | Cartera Maestra como tab adicional de `CarteraPage` visible solo para `gerencia`/`admin` | La vista de Cartera ya está organizada por tabs de `estado_cartera`; el contrato §5 dice "la vista de Cartera incluye el acceso a la Cartera Maestra". **Confirmar en P7 el comportamiento del resto de tabs.** |
| D3 | Selector de vendedores asignables = lista de empleados activos filtrada client-side a roles `vendedor` y `jdv` | `GET /empleados` acepta un solo `rol` por query; con una sola llamada (`activo=true`) y filtro client-side cubrimos vendedor+jdv sin dos requests. No es "replicar validación de negocio": es poblar un selector según §3.2/§7.4. |
| D4 | El helper de límites (`limiteDctoDirecto`, `aprobadorParaDcto`) vive en `src/utils/solicitudes.ts` y se usa SOLO para el aviso proactivo bajo el input de descuento | Contrato §2: "El frontend PUEDE usar esta tabla para UX proactiva… la validación autoritativa es del backend". El submit nunca se bloquea client-side por límite. |

---

### Task 1: Renombrar rol `gerente` → `gerencia` en todo el frontend

**Files:**
- Modify: `src/types/enums.ts:1`
- Modify: `src/store/authStore.ts:30-34`
- Modify: `src/router/index.tsx:43`
- Modify: `src/utils/etiquetas.ts:34-40`
- Modify: `src/pages/Admin/AdminEmpleados.tsx:17`
- Modify: `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx:72,141` (textos de UI)

**Interfaces:**
- Produces: `Rol = 'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista'` — todas las tareas posteriores usan este union.

- [ ] **Step 1: Actualizar el union type `Rol`**

En `src/types/enums.ts`:

```ts
export type Rol = 'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista'
```

- [ ] **Step 2: Actualizar las constantes de roles en `authStore.ts`**

```ts
/** Roles que pueden confirmar el paso a facturado */
export const ROLES_FACTURA: Rol[] = ['admin', 'gerencia', 'analista']
/** Roles con acceso a reportes */
export const ROLES_REPORTES: Rol[] = ['admin', 'gerencia', 'jdv']
/** Roles de supervisión (reasignar, traspasar, ver equipo) */
export const ROLES_SUPERVISION: Rol[] = ['admin', 'gerencia', 'jdv']
```

- [ ] **Step 3: Actualizar el guard de la ruta `/reportes` en `src/router/index.tsx`**

```tsx
<RequireRol roles={['admin', 'gerencia', 'jdv']}>
```

- [ ] **Step 4: Actualizar `ETIQUETA_ROL` en `src/utils/etiquetas.ts`**

```ts
export const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  gerencia: 'Gerencia',
  jdv: 'Jefe de Ventas',
  vendedor: 'Vendedor',
  analista: 'Analista',
}
```

- [ ] **Step 5: Actualizar el array `ROLES` de `AdminEmpleados.tsx`**

```ts
const ROLES: Rol[] = ['admin', 'gerencia', 'jdv', 'vendedor', 'analista']
```

- [ ] **Step 6: Actualizar los textos de UI que dicen "gerente"**

En `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx`:
- Línea 72: `message.warning('El paso a Facturado solo lo confirman admin, gerencia o analista')`
- Línea 141: `'Solo admin, gerencia o analista pueden confirmar Facturado'`

- [ ] **Step 7: Verificar que no queda ninguna referencia**

Run: `grep -rn "gerente" src/` (o Grep tool) → **0 resultados**.
Run: `npm run type-check` → sin errores.

- [ ] **Step 8: Verificación manual**

Con el backend de la rama nueva corriendo, iniciar sesión con un usuario `gerencia`: el chip de rol del header debe decir "Gerencia", debe ver "Reportes" en el sidebar y poder confirmar Facturado. (Si el backend aún devuelve `gerente` para sesiones viejas, cerrar sesión y volver a entrar para regenerar el JWT.)

---

### Task 2: Tipos del dominio Solicitud + extensiones a tipos existentes

**Files:**
- Create: `src/types/solicitud.ts`
- Modify: `src/types/empresa.ts` (campo `en_cartera_maestra`, filtro `cartera_maestra`)
- Modify: `src/types/oportunidad.ts` (campo `id_vendedor` en `CrearOportunidadInput`)
- Modify: `src/types/notificacion.ts` (3 tipos nuevos + entidad `solicitud`)
- Modify: `src/types/index.ts` (barrel)

**Interfaces:**
- Produces: `Solicitud`, `CrearSolicitudInput` (union discriminada), `SolicitudesFiltros`, `TipoSolicitud`, `EstadoSolicitud`, `RolAprobador`, `CarteraMaestraInput` — consumidos por Tasks 3–14.

- [ ] **Step 1: Crear `src/types/solicitud.ts`** (espejo de §4.1–§4.2 del contrato)

```ts
import type { EmpleadoResumen } from './empleado'
import type { PaginationParams } from './common'

export type TipoSolicitud = 'descuento' | 'reasignacion_cliente'
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'denegada'
export type EntidadSolicitud = 'oportunidad' | 'empresa'
export type RolAprobador = 'jdv' | 'gerencia'

export interface Solicitud {
  id: number
  tipo: TipoSolicitud
  estado: EstadoSolicitud
  rol_aprobador: RolAprobador
  entidad_tipo: EntidadSolicitud
  entidad_id: number
  entidad_descripcion: string
  dcto_solicitado: string | null
  id_vendedor_nuevo: number | null
  vendedor_nuevo: EmpleadoResumen | null
  motivo: string
  solicitante: EmpleadoResumen
  resolutor: EmpleadoResumen | null
  motivo_resolucion: string | null
  resolved_at: string | null
  created_at: string
}

export interface CrearSolicitudDescuentoInput {
  tipo: 'descuento'
  entidad_tipo: 'oportunidad'
  entidad_id: number
  /** String con 2 decimales, igual que el resto de montos del contrato: "5.00" */
  dcto_solicitado: string
  motivo: string
}

export interface CrearSolicitudReasignacionInput {
  tipo: 'reasignacion_cliente'
  entidad_tipo: 'empresa'
  entidad_id: number
  id_vendedor_nuevo: number
  motivo: string
}

export type CrearSolicitudInput =
  | CrearSolicitudDescuentoInput
  | CrearSolicitudReasignacionInput

export interface SolicitudesFiltros extends PaginationParams {
  estado?: EstadoSolicitud
  tipo?: TipoSolicitud
  /** true fuerza "solo las que yo creé" (útil para jdv) */
  mias?: boolean
}
```

- [ ] **Step 2: Extender `src/types/empresa.ts`**

Agregar `en_cartera_maestra: boolean` a `EmpresaListItem` (después de `id_vendedor`/`vendedor`) **y también a `Empresa`** (ver pendiente P8), y el filtro a `EmpresasFiltros`:

```ts
export interface EmpresaListItem {
  // ...campos existentes sin cambios...
  en_cartera_maestra: boolean
}

export interface Empresa {
  // ...campos existentes sin cambios...
  en_cartera_maestra: boolean
}

export interface EmpresasFiltros {
  // ...campos existentes sin cambios...
  cartera_maestra?: boolean
}

/** Input de PATCH /empresas/:id/cartera-maestra (contrato §4.6) */
export interface CarteraMaestraInput {
  en_cartera_maestra: boolean
  /** Obligatorio al liberar (en_cartera_maestra: false) */
  id_vendedor?: number
}
```

- [ ] **Step 3: Extender `CrearOportunidadInput` en `src/types/oportunidad.ts`** (contrato §3.3)

```ts
export interface CrearOportunidadInput {
  // ...campos existentes sin cambios...
  /** Solo cuando la empresa no tiene vendedor asignado (gerencia/admin/jdv). §3.3 */
  id_vendedor?: number
}
```

- [ ] **Step 4: Extender `src/types/notificacion.ts`** (contrato §6)

```ts
export type TipoNotificacion =
  | 'oportunidad_cambio_estado'
  | 'empresa_convertida'
  | 'evento_creado'
  | 'tarea_creada'
  | 'empresa_asignada'
  | 'oportunidad_traspasada'
  | 'tarea_recordatorio'
  | 'evento_recordatorio'
  | 'solicitud_creada'
  | 'solicitud_aprobada'
  | 'solicitud_denegada'

export type EntidadNotificacion = 'oportunidad' | 'empresa' | 'solicitud'
```

- [ ] **Step 5: Re-exportar desde el barrel `src/types/index.ts`**

```ts
export * from './solicitud'
```

- [ ] **Step 6: Verificar**

Run: `npm run type-check` → sin errores (los literales `en_cartera_maestra` nuevos son campos requeridos en tipos de respuesta: no rompen código existente porque solo se leen).

---

### Task 3: API layer — `solicitudes.ts`, cartera maestra y query keys

**Files:**
- Create: `src/api/solicitudes.ts`
- Modify: `src/api/empresas.ts` (método `cambiarCarteraMaestra`)
- Modify: `src/hooks/queryKeys.ts` (keys `solicitudes`)

**Interfaces:**
- Produces: `solicitudesApi.{listar, obtener, crear, aprobar, denegar}`, `empresasApi.cambiarCarteraMaestra(id, input)`, `qk.solicitudes`, `qk.solicitud(id)`.

- [ ] **Step 1: Crear `src/api/solicitudes.ts`**

```ts
import { get, post, patch } from './client'
import type { ApiResponse, CrearSolicitudInput, Solicitud, SolicitudesFiltros } from '@/types'

export const solicitudesApi = {
  listar: async (filtros?: SolicitudesFiltros): Promise<ApiResponse<Solicitud[]>> => {
    return get<Solicitud[]>('/solicitudes', filtros as Record<string, unknown>)
  },

  obtener: async (id: number): Promise<Solicitud> => {
    const res = await get<Solicitud>(`/solicitudes/${id}`)
    return res.data
  },

  crear: async (input: CrearSolicitudInput): Promise<Solicitud> => {
    const res = await post<Solicitud>('/solicitudes', input)
    return res.data
  },

  /** Aprueba y APLICA el cambio en la misma transacción (contrato §4.4). Body vacío. */
  aprobar: async (id: number): Promise<Solicitud> => {
    const res = await patch<Solicitud>(`/solicitudes/${id}/aprobar`, {})
    return res.data
  },

  /** Deniega; el motivo es obligatorio (contrato §4.5). */
  denegar: async (id: number, motivo: string): Promise<Solicitud> => {
    const res = await patch<Solicitud>(`/solicitudes/${id}/denegar`, { motivo })
    return res.data
  },
}
```

- [ ] **Step 2: Agregar `cambiarCarteraMaestra` a `src/api/empresas.ts`**

```ts
  cambiarCarteraMaestra: async (id: number, input: CarteraMaestraInput): Promise<void> => {
    await patch(`/empresas/${id}/cartera-maestra`, input)
  },
```

(Agregar `CarteraMaestraInput` al import de tipos del archivo.)

- [ ] **Step 3: Agregar keys a `src/hooks/queryKeys.ts`**

```ts
  solicitudes: ['solicitudes'] as const,
  solicitud: (id: number) => ['solicitud', id] as const,
```

- [ ] **Step 4: Verificar**

Run: `npm run type-check` → sin errores.

---

### Task 4: Utils — límites de descuento (UX proactiva), helpers de error y etiquetas

**Files:**
- Create: `src/utils/solicitudes.ts`
- Modify: `src/api/client.ts` (helper `codigoDeError`)
- Modify: `src/utils/etiquetas.ts` (etiquetas de tipo/estado de solicitud)

**Interfaces:**
- Produces:
  - `codigoDeError(error: unknown): string | null` (en `src/api/client.ts`)
  - `limiteDctoDirecto(rol: Rol): number | null`
  - `aprobadorParaDcto(rol: Rol, dcto: number): RolAprobador | null`
  - `descripcionPayloadSolicitud(s: Solicitud): string`
  - `ETIQUETA_TIPO_SOLICITUD`, `ETIQUETA_ESTADO_SOLICITUD`, `ETIQUETA_ROL_APROBADOR`

- [ ] **Step 1: Agregar `codigoDeError` a `src/api/client.ts`** (debajo de `mensajeDeError`)

```ts
/** Código de negocio del envelope (p. ej. 'APROBACION_REQUERIDA'), o null. */
export function codigoDeError(error: unknown): string | null {
  return extraerApiError(error)?.code ?? null
}
```

- [ ] **Step 2: Crear `src/utils/solicitudes.ts`**

```ts
import type { Rol, RolAprobador, Solicitud } from '@/types'
import { nombreCompleto } from './formato'

/**
 * Tabla de límites del contrato §2 — SOLO para UX proactiva (avisos antes de
 * enviar). La validación autoritativa es del backend: siempre manejar el 422.
 */
export function limiteDctoDirecto(rol: Rol): number | null {
  switch (rol) {
    case 'vendedor':
    case 'analista':
      return 3
    case 'jdv':
      return 7
    case 'gerencia':
    case 'admin':
      return null // sin límite
  }
}

/** Quién aprobaría un dcto dado para este rol, según §2. null = no requiere solicitud. */
export function aprobadorParaDcto(rol: Rol, dcto: number): RolAprobador | null {
  const limite = limiteDctoDirecto(rol)
  if (limite === null || dcto <= limite) return null
  if ((rol === 'vendedor' || rol === 'analista') && dcto <= 7) return 'jdv'
  return 'gerencia'
}

/** Payload legible por fila de bandeja (contrato §5): "5% de descuento" / "Reasignar a Juan Pérez" */
export function descripcionPayloadSolicitud(s: Solicitud): string {
  if (s.tipo === 'descuento') {
    return `${Number(s.dcto_solicitado ?? 0)}% de descuento`
  }
  return `Reasignar a ${nombreCompleto(s.vendedor_nuevo)}`
}

/**
 * Determina si el usuario actual puede aprobar/denegar esta fila en la vista
 * unificada de /solicitudes (decisión D1, 2026-07-16). Una solicitud es
 * accionable por el usuario si sigue pendiente y su rol es el rol_aprobador
 * — para vendedor/analista esto nunca es true (nunca son aprobadores),
 * así que ven la lista en modo solo-lectura sin ramas de código extra.
 */
export function puedeResolverSolicitud(s: Solicitud, rol: Rol | undefined): boolean {
  return s.estado === 'pendiente' && rol !== undefined && s.rol_aprobador === rol
}
```

- [ ] **Step 3: Agregar etiquetas a `src/utils/etiquetas.ts`**

```ts
import type { EstadoSolicitud, RolAprobador, TipoSolicitud } from '@/types'

export const ETIQUETA_TIPO_SOLICITUD: Record<TipoSolicitud, string> = {
  descuento: 'Descuento',
  reasignacion_cliente: 'Reasignación de cliente',
}

export const ETIQUETA_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  denegada: 'Denegada',
}

export const ETIQUETA_ROL_APROBADOR: Record<RolAprobador, string> = {
  jdv: 'el Jefe de Ventas',
  gerencia: 'Gerencia',
}
```

- [ ] **Step 4: Verificar**

Run: `npm run type-check` → sin errores. El `switch` de `limiteDctoDirecto` es exhaustivo sobre `Rol` (sin `default`): si mañana se agrega un rol, TypeScript obliga a decidir su límite.

---

### Task 5: Hooks — `useSolicitudes` y cartera maestra

**Files:**
- Create: `src/hooks/useSolicitudes.ts`
- Modify: `src/hooks/useEmpresas.ts` (hook `useCambiarCarteraMaestra`)

**Interfaces:**
- Produces:
  - `useSolicitudes(filtros?: SolicitudesFiltros)` → query con envelope (lista + meta paginación)
  - `useSolicitud(id: number)` → query del detalle (para `SolicitudDetalleModal`, Task 11)
  - `useCrearSolicitud()` → mutation `CrearSolicitudInput → Solicitud`
  - `useAprobarSolicitud()` / `useDenegarSolicitud()` → mutations que reciben la `Solicitud` para invalidar la entidad afectada
  - `useCambiarCarteraMaestra(id: number)` → mutation `CarteraMaestraInput → void`

- [ ] **Step 1: Crear `src/hooks/useSolicitudes.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { solicitudesApi } from '@/api/solicitudes'
import type { CrearSolicitudInput, Solicitud, SolicitudesFiltros } from '@/types'
import { invalidar, qk } from './queryKeys'

export function useSolicitudes(filtros?: SolicitudesFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.solicitudes, filtros ?? {}],
    queryFn: () => solicitudesApi.listar(filtros),
    enabled,
  })
}

export function useSolicitud(id: number | null) {
  return useQuery({
    queryKey: qk.solicitud(id ?? 0),
    queryFn: () => solicitudesApi.obtener(id as number),
    enabled: id !== null,
  })
}

export function useCrearSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearSolicitudInput) => solicitudesApi.crear(input),
    onSuccess: () => invalidar(qc, qk.solicitudes),
  })
}

/**
 * Sincronización 360: aprobar APLICA el cambio (dcto nuevo + monto_total
 * recalculado, o reasignación de empresa) en la misma transacción — hay que
 * invalidar la entidad afectada y todas las vistas que la muestran.
 */
function invalidarResolucion(qc: ReturnType<typeof useQueryClient>, s: Solicitud) {
  invalidar(qc, qk.solicitudes, qk.oportunidades, qk.empresas, qk.inicio, qk.prospeccion, qk.reportes)
  if (s.entidad_tipo === 'oportunidad') {
    invalidar(qc, qk.oportunidad(s.entidad_id), qk.oportunidadLog(s.entidad_id))
  } else {
    invalidar(qc, qk.empresa(s.entidad_id))
  }
}

export function useAprobarSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => solicitudesApi.aprobar(id),
    onSuccess: (s) => invalidarResolucion(qc, s),
    // 409 (ya resuelta) también deja la bandeja desactualizada → refrescar
    onError: () => invalidar(qc, qk.solicitudes),
  })
}

export function useDenegarSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      solicitudesApi.denegar(id, motivo),
    onSuccess: (s) => invalidarResolucion(qc, s),
    onError: () => invalidar(qc, qk.solicitudes),
  })
}
```

- [ ] **Step 2: Agregar `useCambiarCarteraMaestra` a `src/hooks/useEmpresas.ts`**

```ts
export function useCambiarCarteraMaestra(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CarteraMaestraInput) => empresasApi.cambiarCarteraMaestra(id, input),
    // Mover/liberar cambia visibilidad y asignación → invalidación amplia
    onSuccess: () => invalidarEmpresa(qc, id),
  })
}
```

(Agregar `CarteraMaestraInput` al import de tipos del archivo.)

- [ ] **Step 3: Verificar**

Run: `npm run type-check` → sin errores.

---

### Task 6: Selector compartido de vendedores asignables (excluir gerencia/admin/analista)

**Files:**
- Modify: `src/hooks/useCatalogos.ts` (hook `useVendedoresAsignables`)
- Modify: `src/components/NuevaEmpresaModal.tsx:39` (usar el hook nuevo)
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx:61` (usar el hook nuevo)
- Modify: `src/pages/Reportes/ReportesPage.tsx:28` (pendiente P6 — ver nota)

**Interfaces:**
- Produces: `useVendedoresAsignables(enabled?: boolean)` — misma forma que `useEmpleados` pero `data` filtrada a empleados activos con rol `vendedor` o `jdv`.

- [ ] **Step 1: Agregar el hook a `src/hooks/useCatalogos.ts`** (debajo de `useEmpleados`)

```ts
/**
 * Empleados que pueden figurar como "vendedor asignado" (contrato §3.2 y §7.4):
 * activos con rol vendedor o jdv. NUNCA gerencia/admin/analista.
 */
const ROLES_ASIGNABLES: Rol[] = ['vendedor', 'jdv']

export function useVendedoresAsignables(enabled = true) {
  const empleados = useEmpleados({ activo: true }, enabled)
  return {
    ...empleados,
    data: empleados.data?.filter((e) => ROLES_ASIGNABLES.includes(e.rol)),
  }
}
```

- [ ] **Step 2: Reemplazar en `NuevaEmpresaModal.tsx`**

```ts
const empleados = useVendedoresAsignables(esSupervision && open)
```

(El resto del componente no cambia: sigue leyendo `empleados.data`.)

- [ ] **Step 3: Reemplazar en `EmpresaDetallePage.tsx`** (selector "Vendedor Asignado", línea 61)

```ts
const empleados = useVendedoresAsignables(esSupervision)
```

- [ ] **Step 4: Reportes (según respuesta a P6)**

Si P6 = sí: en `ReportesPage.tsx` reemplazar `useEmpleados({ activo: true })` por `useVendedoresAsignables()`. Si P6 = no, dejarlo como está.

- [ ] **Step 5: Verificar**

`npm run type-check` sin errores. Manual: abrir "Nueva empresa" como jdv y el detalle de una empresa como gerencia → los selectores de vendedor no muestran usuarios gerencia/admin/analista.

---

### Task 7: Componente `SolicitudModal` (crear solicitud tras 422/403)

**Files:**
- Create: `src/components/SolicitudModal.tsx`

**Interfaces:**
- Consumes: `useCrearSolicitud` (Task 5), `codigoDeError`/`mensajeDeError` (Task 4), `ETIQUETA_ROL_APROBADOR`.
- Produces:

```ts
/** Qué solicitud se va a crear. null = modal cerrado. */
export type SolicitudPendiente =
  | {
      tipo: 'descuento'
      idOportunidad: number
      /** dcto que el usuario intentó aplicar (numérico, del formulario) */
      dctoSolicitado: number
      /** message del 422 del backend — se muestra tal cual (autoridad) */
      mensajeBackend: string
    }
  | {
      tipo: 'reasignacion_cliente'
      idEmpresa: number
      idVendedorNuevo: number
      nombreVendedorNuevo: string
      mensajeBackend: string
    }

interface Props {
  solicitud: SolicitudPendiente | null
  onClose: () => void
  /** Se llama con la solicitud creada (para navegar, mostrar toast extra, etc.) */
  onEnviada?: (s: Solicitud) => void
}
export function SolicitudModal({ solicitud, onClose, onEnviada }: Props): JSX.Element
```

- [ ] **Step 1: Crear el componente**

```tsx
import { App, Alert, Form, Input, Modal } from 'antd'
import { useCrearSolicitud } from '@/hooks/useSolicitudes'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { Solicitud } from '@/types'

export type SolicitudPendiente =
  | { tipo: 'descuento'; idOportunidad: number; dctoSolicitado: number; mensajeBackend: string }
  | {
      tipo: 'reasignacion_cliente'
      idEmpresa: number
      idVendedorNuevo: number
      nombreVendedorNuevo: string
      mensajeBackend: string
    }

interface Props {
  solicitud: SolicitudPendiente | null
  onClose: () => void
  onEnviada?: (s: Solicitud) => void
}

/**
 * Modal genérico de "enviar solicitud de aprobación" (contrato §1.2, §3.1, §3.2).
 * Se abre cuando el backend respondió 422 APROBACION_REQUERIDA (descuento)
 * o 403 PERMISO_INSUFICIENTE (reasignación por jdv). El backend decide solo
 * el aprobador — este modal no lo envía.
 */
export function SolicitudModal({ solicitud, onClose, onEnviada }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ motivo: string }>()
  const crear = useCrearSolicitud()

  const onEnviar = async () => {
    if (!solicitud) return
    const { motivo } = await form.validateFields()
    try {
      const creada = await crear.mutateAsync(
        solicitud.tipo === 'descuento'
          ? {
              tipo: 'descuento',
              entidad_tipo: 'oportunidad',
              entidad_id: solicitud.idOportunidad,
              dcto_solicitado: solicitud.dctoSolicitado.toFixed(2),
              motivo,
            }
          : {
              tipo: 'reasignacion_cliente',
              entidad_tipo: 'empresa',
              entidad_id: solicitud.idEmpresa,
              id_vendedor_nuevo: solicitud.idVendedorNuevo,
              motivo,
            },
      )
      message.success('Solicitud enviada — te notificaremos cuando se resuelva')
      form.resetFields()
      onClose()
      onEnviada?.(creada)
    } catch (e) {
      if (codigoDeError(e) === 'SOLICITUD_DUPLICADA') {
        message.warning('Ya existe una solicitud pendiente del mismo tipo sobre esta entidad')
        form.resetFields()
        onClose()
        return
      }
      message.error(mensajeDeError(e, 'No se pudo enviar la solicitud'))
    }
  }

  const resumen =
    solicitud?.tipo === 'descuento'
      ? `Se enviará una solicitud para aplicar ${solicitud.dctoSolicitado}% de descuento.`
      : solicitud
        ? `Se enviará una solicitud para reasignar este cliente a ${solicitud.nombreVendedorNuevo}.`
        : ''

  return (
    <Modal
      title="Enviar solicitud de aprobación"
      open={solicitud !== null}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void onEnviar()}
      okText="Enviar solicitud"
      cancelText="Cancelar"
      confirmLoading={crear.isPending}
      destroyOnHidden
      width={480}
    >
      {solicitud && (
        <div className="flex flex-col gap-4">
          {/* El mensaje del backend ES la explicación autoritativa (quién aprueba y por qué) */}
          <Alert type="info" showIcon message={solicitud.mensajeBackend} description={resumen} />
          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              name="motivo"
              label="Motivo de la solicitud"
              rules={[{ required: true, whitespace: true, message: 'El motivo es obligatorio' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Ej.: Cliente frecuente, tercera compra del año"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Form>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Verificar**

`npm run type-check` sin errores. (La verificación funcional se hace integrado en Tasks 8–10.)

---

### Task 8: Manejo de `422 APROBACION_REQUERIDA` al EDITAR oportunidad + aviso proactivo

**Files:**
- Modify: `src/pages/OportunidadDetalle/PropiedadesCard.tsx` (función `EditarTerminosModal`)

**Interfaces:**
- Consumes: `SolicitudModal`/`SolicitudPendiente` (Task 7), `codigoDeError`, `extraerApiError`, `aprobadorParaDcto`, `ETIQUETA_ROL_APROBADOR`, `useAuthStore`.

Flujo del contrato §3.1 (edición): al recibir 422 → abrir modal de solicitud; el resto de campos SÍ puede guardarse con un `PUT` sin el `dcto` fuera de límite (decisión D-P4: se re-envía automáticamente con el `dcto` original de la oportunidad).

- [ ] **Step 1: Agregar estado y aviso proactivo en `EditarTerminosModal`**

Imports nuevos en `PropiedadesCard.tsx`:

```ts
import { Alert } from 'antd' // agregar al import existente de antd
import { useAuthStore } from '@/store/authStore'
import { codigoDeError, extraerApiError } from '@/api/client' // ampliar import existente
import { aprobadorParaDcto } from '@/utils/solicitudes'
import { ETIQUETA_ROL_APROBADOR } from '@/utils/etiquetas'
import { SolicitudModal, type SolicitudPendiente } from '@/components/SolicitudModal'
```

Dentro de `EditarTerminosModal`, junto a los `useWatch` existentes:

```ts
const empleado = useAuthStore((s) => s.empleado)
const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudPendiente | null>(null)

// UX proactiva (contrato §2): avisar ANTES de guardar. No bloquea el submit.
const aprobador = empleado ? aprobadorParaDcto(empleado.rol, dcto ?? 0) : null
```

Inmediatamente después del cierre del `</div>` del grid de 3 columnas que contiene el `Form.Item` de `dcto`:

```tsx
{aprobador && (
  <Alert
    type="warning"
    showIcon
    style={{ marginBottom: 16 }}
    message={`${dcto}% supera tu límite de descuento — al guardar podrás enviar una solicitud a ${ETIQUETA_ROL_APROBADOR[aprobador]}`}
  />
)}
```

- [ ] **Step 2: Capturar el 422 en `onGuardar`**

Reemplazar el `catch` de `onGuardar` por:

```ts
} catch (e) {
  if (codigoDeError(e) === 'APROBACION_REQUERIDA') {
    // §3.1: el backend NO guardó nada. Guardamos el resto de campos con el
    // dcto actual de la oportunidad y ofrecemos solicitar el dcto nuevo.
    try {
      await actualizar.mutateAsync({
        id_modelo: v.id_modelo,
        id_financiadora: v.id_financiadora,
        cantidad: v.cantidad,
        precio_unitario: v.precio_unitario.toFixed(2),
        dcto: o.dcto, // el vigente — el nuevo queda pendiente de aprobación
        garantia: v.garantia,
        finc_paralelo: v.finc_paralelo,
        fecha_cierre_estimado: v.fecha_cierre_estimado
          ? v.fecha_cierre_estimado.format('YYYY-MM-DD')
          : null,
        notas: v.notas ?? null,
      })
    } catch {
      // Si también falla, el modal de solicitud sigue siendo lo importante
    }
    setSolicitudPendiente({
      tipo: 'descuento',
      idOportunidad: o.id,
      dctoSolicitado: v.dcto,
      mensajeBackend: extraerApiError(e)?.message ?? 'El descuento requiere aprobación',
    })
    return
  }
  message.error(mensajeDeError(e, 'No se pudieron guardar los términos'))
}
```

- [ ] **Step 3: Renderizar el `SolicitudModal`**

Antes del cierre del `<Modal>` de EditarTerminosModal (como hermano del `<Form>`):

```tsx
<SolicitudModal
  solicitud={solicitudPendiente}
  onClose={() => setSolicitudPendiente(null)}
  onEnviada={() => onClose()}
/>
```

- [ ] **Step 4: Verificar**

`npm run type-check` sin errores. Manual (backend corriendo): como vendedor, editar términos de una oportunidad propia con `dcto = 5`:
1. Al teclear 5 aparece el warning proactivo.
2. Al guardar: los demás campos quedan guardados, se abre el modal de solicitud con el mensaje del backend.
3. Enviar con motivo → toast de éxito; la oportunidad conserva el dcto anterior.
4. Reintentar la misma solicitud → warning "Ya existe una solicitud pendiente…" (409).

---

### Task 9: `NuevaOportunidadModal` — campo `id_vendedor` condicional + 422 en creación

**Files:**
- Modify: `src/components/NuevaOportunidadModal.tsx`
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` (pasar `id_vendedor` en `empresaPreseleccionada`)

**Interfaces:**
- Consumes: `useVendedoresAsignables` (Task 6), `SolicitudModal` (Task 7), `aprobadorParaDcto`, `limiteDctoDirecto`, `ETIQUETA_ROL_APROBADOR`, `codigoDeError`, `extraerApiError`, `mensajeDeError`.
- Produces: prop ampliada `empresaPreseleccionada?: { id: number; razon_social: string; id_vendedor?: number | null }`.

Reglas del contrato:
- §3.3: si la empresa no tiene vendedor, el body debe incluir `id_vendedor` (lo verán gerencia/admin/jdv; si falta → `400 VALIDACION field id_vendedor`).
- §3.1: en creación el 422 **bloquea la creación completa** — crear primero con dcto dentro del límite y luego solicitar sobre la oportunidad creada. UX asistida confirmada por el usuario (P3, 2026-07-16): "Crear con tu límite y enviar la solicitud por el resto".

- [ ] **Step 1: Ampliar la prop y detectar empresa sin vendedor**

Imports nuevos en `NuevaOportunidadModal.tsx` (se suman a los ya existentes: `App`, `DatePicker`, `Form`, `Input`, `InputNumber`, `Modal`, `Select`, `Switch`, `useCrearOportunidad`, `useEmpresas`, `useFinanciadoras`/`useModelos`, `mensajeDeError`, `calcularMontoTotal`, `formatoMonto`):

```ts
import { Alert } from 'antd' // ampliar el import existente de antd
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import { useAuthStore, ROLES_SUPERVISION, tieneRol } from '@/store/authStore'
import { codigoDeError, extraerApiError } from '@/api/client' // ampliar import existente
import { aprobadorParaDcto, limiteDctoDirecto } from '@/utils/solicitudes'
import { ETIQUETA_ROL_APROBADOR } from '@/utils/etiquetas'
import { SolicitudModal, type SolicitudPendiente } from '@/components/SolicitudModal'
```

```ts
interface Props {
  open: boolean
  onClose: () => void
  empresaPreseleccionada?: { id: number; razon_social: string; id_vendedor?: number | null } | null
}
```

Dentro del componente:

```ts
const empleado = useAuthStore((s) => s.empleado)
const esSupervision = tieneRol(empleado, ROLES_SUPERVISION)
const idEmpresa = Form.useWatch('id_empresa', form)

// id_vendedor de la empresa elegida: del listado de búsqueda (EmpresaListItem
// trae id_vendedor) o de la preseleccionada.
const empresaElegida =
  (empresas.data?.data ?? []).find((e) => e.id === idEmpresa) ??
  (empresaPreseleccionada && empresaPreseleccionada.id === idEmpresa
    ? empresaPreseleccionada
    : null)
const empresaSinVendedor = empresaElegida !== null && empresaElegida.id_vendedor == null
const pedirVendedor = empresaSinVendedor && esSupervision

const vendedores = useVendedoresAsignables(pedirVendedor && open)
```

Nota: si la empresa se eligió por búsqueda pero `empresaElegida` es `null` (caso borde: la lista cambió), no se muestra el campo y el backend responderá `400 VALIDACION field id_vendedor`; ese error ya se muestra con `mensajeDeError` — comportamiento aceptable y honesto con la autoridad del backend.

- [ ] **Step 2: Agregar el `Form.Item` condicional** (después del Form.Item de `id_empresa`)

```tsx
{pedirVendedor && (
  <Form.Item
    name="id_vendedor"
    label="Vendedor responsable"
    extra="Esta empresa no tiene vendedor asignado: se le asignará también la empresa."
    rules={[{ required: true, message: 'Elige el vendedor responsable' }]}
  >
    <Select
      showSearch
      optionFilterProp="label"
      loading={vendedores.isLoading}
      options={(vendedores.data ?? []).map((e) => ({
        value: e.id,
        label: `${e.nombres} ${e.apellidos}`,
      }))}
    />
  </Form.Item>
)}
```

Y en `FormValues` agregar `id_vendedor?: number`. En el payload de `crear.mutateAsync` agregar:

```ts
...(pedirVendedor ? { id_vendedor: v.id_vendedor } : {}),
```

- [ ] **Step 3: Aviso proactivo de dcto** (igual que Task 8, debajo del InputNumber de dcto)

```tsx
{aprobador && (
  <Alert
    type="warning"
    showIcon
    style={{ marginBottom: 16 }}
    message={`${dcto}% supera tu límite — la oportunidad se creará con tu límite y podrás solicitar el ${dcto}% a ${ETIQUETA_ROL_APROBADOR[aprobador]}`}
  />
)}
```

con `const aprobador = empleado ? aprobadorParaDcto(empleado.rol, dcto ?? 0) : null`.

- [ ] **Step 4: Manejar el 422 en `onGuardar` (flujo asistido, decisión P3)**

Estado nuevo: `const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudPendiente | null>(null)` y `const [idCreadaConSolicitud, setIdCreadaConSolicitud] = useState<number | null>(null)`.

Reemplazar el `catch` de `onGuardar`:

```ts
} catch (e) {
  if (codigoDeError(e) === 'APROBACION_REQUERIDA' && empleado) {
    // §3.1 creación: el 422 bloquea todo. Creamos con el límite propio y
    // abrimos la solicitud por el dcto deseado sobre la oportunidad creada.
    const limite = limiteDctoDirecto(empleado.rol) ?? 0
    try {
      const creada = await crear.mutateAsync({
        id_empresa: v.id_empresa,
        id_modelo: v.id_modelo,
        id_financiadora: v.id_financiadora ?? null,
        cantidad: v.cantidad,
        dcto: limite,
        garantia: v.garantia ?? false,
        finc_paralelo: v.finc_paralelo ?? false,
        fecha_cierre_estimado: v.fecha_cierre_estimado
          ? v.fecha_cierre_estimado.format('YYYY-MM-DD')
          : null,
        notas: v.notas ?? null,
        ...(pedirVendedor ? { id_vendedor: v.id_vendedor } : {}),
      })
      message.success(`Oportunidad creada con ${limite}% de descuento`)
      setIdCreadaConSolicitud(creada.id)
      setSolicitudPendiente({
        tipo: 'descuento',
        idOportunidad: creada.id,
        dctoSolicitado: v.dcto ?? 0,
        mensajeBackend: extraerApiError(e)?.message ?? 'El descuento requiere aprobación',
      })
    } catch (e2) {
      message.error(mensajeDeError(e2, 'No se pudo crear la oportunidad'))
    }
    return
  }
  message.error(mensajeDeError(e, 'No se pudo crear la oportunidad'))
}
```

Y renderizar (hermano del `<Form>`):

```tsx
<SolicitudModal
  solicitud={solicitudPendiente}
  onClose={() => {
    setSolicitudPendiente(null)
    // Con o sin solicitud enviada, la oportunidad YA existe: ir al detalle
    if (idCreadaConSolicitud !== null) {
      form.resetFields()
      onClose()
      navigate(`/oportunidades/${idCreadaConSolicitud}`)
    }
  }}
/>
```

- [ ] **Step 5: Pasar `id_vendedor` desde `EmpresaDetallePage`**

Donde se renderiza `<NuevaOportunidadModal empresaPreseleccionada={...}>`, pasar también `id_vendedor: empresa.id_vendedor`.

- [ ] **Step 6: Verificar**

`npm run type-check`. Manual:
1. Como gerencia, crear oportunidad sobre una empresa sin vendedor → aparece el selector "Vendedor responsable" (solo vendedores/jdv); al crear, la empresa queda asignada a ese vendedor (verificar en el detalle de empresa).
2. Como gerencia, empresa CON vendedor → el selector no aparece.
3. Como vendedor con `dcto = 5` → warning proactivo; al crear: se crea con 3%, se abre el modal de solicitud por 5%; al cerrar/enviar → navega al detalle.

---

### Task 10: Reasignación de cliente — 403 del jdv → modal de solicitud

**Files:**
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` (selector "Vendedor Asignado", líneas ~219–242)

**Interfaces:**
- Consumes: `SolicitudModal`/`SolicitudPendiente`, `codigoDeError`, `extraerApiError`.

Reglas del contrato §3.2: `PATCH /empresas/:id/vendedor` ahora es solo `admin`/`gerencia`; el `jdv` recibe `403 PERMISO_INSUFICIENTE` → modal de solicitud `reasignacion_cliente`. `vendedor`/`analista` no ven el selector (ya cubierto: `esSupervision`).

- [ ] **Step 1: Estado del modal en `Contenido`**

```ts
const [solicitudReasignacion, setSolicitudReasignacion] = useState<SolicitudPendiente | null>(null)
```

- [ ] **Step 2: Capturar el 403 en el `onChange` del select**

Reemplazar el handler actual por:

```tsx
onChange={(e) => {
  const idNuevo = Number(e.target.value)
  reasignar.mutate(idNuevo, {
    onSuccess: () => message.success('Vendedor reasignado'),
    onError: (err) => {
      if (codigoDeError(err) === 'PERMISO_INSUFICIENTE') {
        const destino = (empleados.data ?? []).find((emp) => emp.id === idNuevo)
        setSolicitudReasignacion({
          tipo: 'reasignacion_cliente',
          idEmpresa: empresa.id,
          idVendedorNuevo: idNuevo,
          nombreVendedorNuevo: destino ? `${destino.nombres} ${destino.apellidos}` : `#${idNuevo}`,
          mensajeBackend:
            extraerApiError(err)?.message ??
            'Reasignar clientes requiere aprobación de Gerencia',
        })
        return
      }
      message.error(mensajeDeError(err))
    },
  })
}}
```

Nota: el `<select>` es no-controlado respecto al valor optimista — como la mutación falla, la invalidación no ocurre y `empresa.id_vendedor` no cambia; al re-render el select vuelve al valor real. No hace falta revertir a mano.

- [ ] **Step 3: Renderizar el modal** (junto a los demás modales de la página)

```tsx
<SolicitudModal
  solicitud={solicitudReasignacion}
  onClose={() => setSolicitudReasignacion(null)}
/>
```

- [ ] **Step 4: Verificar**

`npm run type-check`. Manual: como jdv, cambiar el vendedor de una empresa → se abre el modal de solicitud (el select vuelve al vendedor actual); enviar con motivo → toast; como gerencia, el mismo cambio se aplica directo.

---

### Task 11: Componentes `BandejaSolicitudes` (aprobar / denegar / historial) y `SolicitudDetalleModal`

**Files:**
- Create: `src/components/BandejaSolicitudes.tsx`
- Create: `src/components/SolicitudDetalleModal.tsx`

**Interfaces:**
- Consumes: `useSolicitudes`, `useAprobarSolicitud`, `useDenegarSolicitud`, `useSolicitud` (Task 5), etiquetas y `descripcionPayloadSolicitud`, `puedeResolverSolicitud` (Task 4).
- Produces:
  - `export function BandejaSolicitudes(): JSX.Element` — sin props; el alcance (qué solicitudes ve cada rol) lo decide el backend (§4.2). Se usa solo en `/gerencia`, donde el 100% de las filas visibles son responsabilidad del usuario (siempre accionables en la tab Pendientes).
  - `export function SolicitudDetalleModal({ solicitud, onClose }: { solicitud: Solicitud | null; onClose: () => void }): JSX.Element` — modal de solo-detalle (contrato §4.3 `GET /solicitudes/:id`, punto P9 confirmado por el usuario). Reutilizado desde `BandejaSolicitudes` y desde `SolicitudesPage` (Task 12).

Contenido de `BandejaSolicitudes` (contrato §5): tabs **Pendientes** (`estado=pendiente`, default) / **Historial** (sin filtro de estado, mostrando resolutor, fecha y motivo de denegación). Columnas: solicitante, tipo (chip), entidad (`entidad_descripcion` clickeable → `/oportunidades/:id` o `/empresas/:id`), payload legible, motivo, fecha; en Pendientes: acciones Ver detalle / Aprobar (confirmación simple) / Denegar (modal con motivo obligatorio); en Historial: Ver detalle + estado/resolutor/fecha/motivo de denegación.

- [ ] **Step 1: Crear el componente**

```tsx
import { useState } from 'react'
import { App, Button, Form, Input, Modal, Popconfirm, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import { useAprobarSolicitud, useDenegarSolicitud, useSolicitudes } from '@/hooks/useSolicitudes'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { Solicitud } from '@/types'
import { ETIQUETA_ESTADO_SOLICITUD, ETIQUETA_TIPO_SOLICITUD } from '@/utils/etiquetas'
import { descripcionPayloadSolicitud } from '@/utils/solicitudes'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { SolicitudDetalleModal } from './SolicitudDetalleModal'

const COLOR_ESTADO: Record<Solicitud['estado'], string> = {
  pendiente: 'gold',
  aprobada: 'green',
  denegada: 'red',
}

function rutaEntidad(s: Solicitud): string {
  return s.entidad_tipo === 'oportunidad' ? `/oportunidades/${s.entidad_id}` : `/empresas/${s.entidad_id}`
}

/**
 * Bandeja de aprobación (contrato §5), usada solo en /gerencia (roles
 * gerencia/admin) — el backend filtra el alcance por rol y ahí el 100% de
 * lo visible es responsabilidad del usuario. La vista de jdv vive fusionada
 * en /solicitudes (Task 12, decisión D1), no en este componente.
 */
export function BandejaSolicitudes() {
  const { message, notification } = App.useApp()
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes')
  const [pagina, setPagina] = useState(1)
  const [aDenegar, setADenegar] = useState<Solicitud | null>(null)
  const [aVerDetalle, setAVerDetalle] = useState<Solicitud | null>(null)
  const [formDenegar] = Form.useForm<{ motivo: string }>()

  const solicitudes = useSolicitudes(
    tab === 'pendientes' ? { estado: 'pendiente', page: pagina } : { page: pagina },
  )
  const aprobar = useAprobarSolicitud()
  const denegar = useDenegarSolicitud()

  const onAprobar = (s: Solicitud) => {
    aprobar.mutate(s.id, {
      onSuccess: () => message.success('Solicitud aprobada — el cambio ya está aplicado'),
      onError: (e) => {
        const codigo = codigoDeError(e)
        if (codigo === 'SOLICITUD_YA_RESUELTA') {
          message.info('Otro aprobador ya resolvió esta solicitud — bandeja actualizada')
          return // el hook ya invalida la bandeja en onError
        }
        if (codigo === 'SOLICITUD_NO_APLICABLE') {
          notification.warning({
            message: 'La solicitud ya no aplica',
            description:
              'La entidad cambió y el efecto ya no puede aplicarse (p. ej. la oportunidad se cerró). Deniégala manualmente indicando el motivo.',
          })
          return
        }
        message.error(mensajeDeError(e, 'No se pudo aprobar la solicitud'))
      },
    })
  }

  const onDenegar = async () => {
    if (!aDenegar) return
    const { motivo } = await formDenegar.validateFields()
    denegar.mutate(
      { id: aDenegar.id, motivo },
      {
        onSuccess: () => {
          message.success('Solicitud denegada')
          formDenegar.resetFields()
          setADenegar(null)
        },
        onError: (e) => {
          if (codigoDeError(e) === 'SOLICITUD_YA_RESUELTA') {
            message.info('Otro aprobador ya resolvió esta solicitud — bandeja actualizada')
            formDenegar.resetFields()
            setADenegar(null)
            return
          }
          message.error(mensajeDeError(e, 'No se pudo denegar la solicitud'))
        },
      },
    )
  }

  const columnasBase: ColumnsType<Solicitud> = [
    {
      title: 'Solicitante',
      key: 'solicitante',
      render: (_, s) => nombreCompleto(s.solicitante),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      render: (t: Solicitud['tipo']) => <Tag>{ETIQUETA_TIPO_SOLICITUD[t]}</Tag>,
    },
    {
      title: 'Entidad',
      key: 'entidad',
      render: (_, s) => <Link to={rutaEntidad(s)}>{s.entidad_descripcion}</Link>,
    },
    {
      title: 'Cambio solicitado',
      key: 'payload',
      render: (_, s) => descripcionPayloadSolicitud(s),
    },
    { title: 'Motivo', dataIndex: 'motivo' },
    {
      title: 'Fecha',
      dataIndex: 'created_at',
      render: (f: string) => formatoFecha(f),
    },
  ]

  const columnasPendientes: ColumnsType<Solicitud> = [
    ...columnasBase,
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, s) => (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button size="small" onClick={() => setAVerDetalle(s)}>
            Ver detalle
          </Button>
          <Popconfirm
            title={`¿Aprobar y aplicar "${descripcionPayloadSolicitud(s)}"?`}
            okText="Aprobar"
            cancelText="Cancelar"
            onConfirm={() => onAprobar(s)}
          >
            <Button type="primary" size="small" loading={aprobar.isPending}>
              Aprobar
            </Button>
          </Popconfirm>
          <Button danger size="small" onClick={() => setADenegar(s)}>
            Denegar
          </Button>
        </span>
      ),
    },
  ]

  const columnasHistorial: ColumnsType<Solicitud> = [
    ...columnasBase,
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: Solicitud['estado']) => (
        <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_SOLICITUD[e]}</Tag>
      ),
    },
    {
      title: 'Resolutor',
      key: 'resolutor',
      render: (_, s) => (s.resolutor ? nombreCompleto(s.resolutor) : '—'),
    },
    {
      title: 'Resuelta',
      dataIndex: 'resolved_at',
      render: (f: string | null) => (f ? formatoFecha(f) : '—'),
    },
    {
      title: 'Motivo de denegación',
      dataIndex: 'motivo_resolucion',
      render: (m: string | null) => m ?? '—',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, s) => (
        <Button size="small" onClick={() => setAVerDetalle(s)}>
          Ver detalle
        </Button>
      ),
    },
  ]

  return (
    <>
      <Tabs
        activeKey={tab}
        onChange={(k) => {
          setTab(k as 'pendientes' | 'historial')
          setPagina(1)
        }}
        items={[
          { key: 'pendientes', label: 'Pendientes' },
          { key: 'historial', label: 'Historial' },
        ]}
      />
      <Table
        rowKey="id"
        loading={solicitudes.isLoading}
        dataSource={solicitudes.data?.data ?? []}
        columns={tab === 'pendientes' ? columnasPendientes : columnasHistorial}
        pagination={{
          current: pagina,
          total: solicitudes.data?.meta?.total ?? 0,
          pageSize: solicitudes.data?.meta?.per_page ?? 20,
          onChange: setPagina,
          showSizeChanger: false,
        }}
      />

      <Modal
        title="Denegar solicitud"
        open={aDenegar !== null}
        onCancel={() => {
          formDenegar.resetFields()
          setADenegar(null)
        }}
        onOk={() => void onDenegar()}
        okText="Denegar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={denegar.isPending}
        destroyOnHidden
      >
        <Form form={formDenegar} layout="vertical" requiredMark={false}>
          <Form.Item
            name="motivo"
            label="Motivo de la denegación (se notificará al solicitante)"
            rules={[{ required: true, whitespace: true, message: 'El motivo es obligatorio' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <SolicitudDetalleModal solicitud={aVerDetalle} onClose={() => setAVerDetalle(null)} />
    </>
  )
}
```

- [ ] **Step 2: Crear `src/components/SolicitudDetalleModal.tsx`**

```tsx
import { Descriptions, Modal, Tag } from 'antd'
import { useSolicitud } from '@/hooks/useSolicitudes'
import type { Solicitud } from '@/types'
import { ETIQUETA_ESTADO_SOLICITUD, ETIQUETA_TIPO_SOLICITUD } from '@/utils/etiquetas'
import { descripcionPayloadSolicitud } from '@/utils/solicitudes'
import { formatoFecha, nombreCompleto } from '@/utils/formato'

const COLOR_ESTADO: Record<Solicitud['estado'], string> = {
  pendiente: 'gold',
  aprobada: 'green',
  denegada: 'red',
}

interface Props {
  /** Fila de la tabla que originó la apertura; se usa solo para el id — el
   * contenido se refresca siempre desde GET /solicitudes/:id (contrato §4.3). */
  solicitud: Solicitud | null
  onClose: () => void
}

/** Detalle completo de una solicitud, de solo lectura (punto P9 confirmado). */
export function SolicitudDetalleModal({ solicitud, onClose }: Props) {
  const detalle = useSolicitud(solicitud?.id ?? null)
  const s = detalle.data ?? solicitud

  return (
    <Modal
      title="Detalle de la solicitud"
      open={solicitud !== null}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnHidden
    >
      {!s ? null : (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Tipo">{ETIQUETA_TIPO_SOLICITUD[s.tipo]}</Descriptions.Item>
          <Descriptions.Item label="Estado">
            <Tag color={COLOR_ESTADO[s.estado]}>{ETIQUETA_ESTADO_SOLICITUD[s.estado]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Entidad">{s.entidad_descripcion}</Descriptions.Item>
          <Descriptions.Item label="Cambio solicitado">
            {descripcionPayloadSolicitud(s)}
          </Descriptions.Item>
          <Descriptions.Item label="Solicitante">{nombreCompleto(s.solicitante)}</Descriptions.Item>
          <Descriptions.Item label="Motivo">{s.motivo}</Descriptions.Item>
          <Descriptions.Item label="Enviada">{formatoFecha(s.created_at)}</Descriptions.Item>
          {s.estado !== 'pendiente' && (
            <>
              <Descriptions.Item label="Resolutor">
                {s.resolutor ? nombreCompleto(s.resolutor) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Resuelta">
                {s.resolved_at ? formatoFecha(s.resolved_at) : '—'}
              </Descriptions.Item>
              {s.estado === 'denegada' && (
                <Descriptions.Item label="Motivo de denegación">
                  {s.motivo_resolucion ?? '—'}
                </Descriptions.Item>
              )}
            </>
          )}
        </Descriptions>
      )}
    </Modal>
  )
}
```

- [ ] **Step 3: Verificar**

`npm run type-check` sin errores. (Verificación funcional en Task 12.)

---

### Task 12: Páginas y navegación — `/gerencia` y `/solicitudes` (vista única unificada)

**Files:**
- Create: `src/pages/Gerencia/GerenciaPage.tsx`
- Create: `src/pages/Solicitudes/SolicitudesPage.tsx`
- Modify: `src/router/index.tsx` (2 rutas nuevas)
- Modify: `src/components/AppLayout.tsx` (entradas de navegación)
- Modify: `src/store/authStore.ts` (constante `ROLES_BANDEJA_GERENCIA`)

**Interfaces:**
- Consumes: `BandejaSolicitudes`, `SolicitudDetalleModal` (Task 11), `useSolicitudes`, `useAprobarSolicitud`, `useDenegarSolicitud` (Task 5), `puedeResolverSolicitud` (Task 4), etiquetas.
- Produces: rutas `/gerencia` y `/solicitudes`; constante `ROLES_BANDEJA_GERENCIA: Rol[] = ['gerencia', 'admin']`.

`/solicitudes` es **una sola vista, sin tabs internas** (decisión D1, confirmado por el usuario 2026-07-16): el jdv ve en la misma tabla tanto lo que él creó como lo que tiene por aprobar. El backend ya mezcla ambos conjuntos en `GET /solicitudes` sin filtros para el rol jdv (§4.2: "las dirigidas a jdv + las que él mismo creó"), así que basta pedir la lista sin `mias`. Una fila es accionable (Aprobar/Denegar) solo si `puedeResolverSolicitud(s, empleado.rol)` es `true` — para vendedor/analista esa condición nunca se cumple, así que ven la tabla en modo solo-lectura sin código condicional adicional.

- [ ] **Step 1: Constante de roles en `authStore.ts`**

```ts
/** Roles que ven la vista Gerencia (bandeja de aprobación global) */
export const ROLES_BANDEJA_GERENCIA: Rol[] = ['gerencia', 'admin']
/** Roles que ven /solicitudes: crean solicitudes y/o aprueban las suyas (§4.1, §4.2) */
export const ROLES_SOLICITANTES: Rol[] = ['vendedor', 'analista', 'jdv']
```

- [ ] **Step 2: Crear `src/pages/Gerencia/GerenciaPage.tsx`**

```tsx
import { Typography } from 'antd'
import { BandejaSolicitudes } from '@/components/BandejaSolicitudes'

/** Vista Gerencia (contrato §5): bandeja de solicitudes con historial. */
export function GerenciaPage() {
  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
        Gerencia
      </Typography.Title>
      <span style={{ color: '#444750' }}>
        Solicitudes de aprobación dirigidas a Gerencia
      </span>
      <div style={{ marginTop: 16 }}>
        <BandejaSolicitudes />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear `src/pages/Solicitudes/SolicitudesPage.tsx`** — tabla única fusionando §5 (bandeja jdv) y §6 ("Mis solicitudes")

```tsx
import { useState } from 'react'
import { App, Button, Form, Input, Modal, Popconfirm, Select, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
import { useAprobarSolicitud, useDenegarSolicitud, useSolicitudes } from '@/hooks/useSolicitudes'
import { useAuthStore } from '@/store/authStore'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { EstadoSolicitud, Solicitud } from '@/types'
import { ETIQUETA_ESTADO_SOLICITUD, ETIQUETA_TIPO_SOLICITUD } from '@/utils/etiquetas'
import { descripcionPayloadSolicitud, puedeResolverSolicitud } from '@/utils/solicitudes'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { SolicitudDetalleModal } from '@/components/SolicitudDetalleModal'

const COLOR_ESTADO: Record<Solicitud['estado'], string> = {
  pendiente: 'gold',
  aprobada: 'green',
  denegada: 'red',
}

function rutaEntidad(s: Solicitud): string {
  return s.entidad_tipo === 'oportunidad' ? `/oportunidades/${s.entidad_id}` : `/empresas/${s.entidad_id}`
}

/**
 * "Solicitudes" — vista única para vendedor/analista/jdv (decisión D1,
 * confirmada 2026-07-16): fusiona la bandeja de aprobación del jdv (§5) y
 * "Mis solicitudes" (§6) en una sola tabla, porque el backend ya mezcla
 * ambos conjuntos para el rol jdv en GET /solicitudes sin filtros (§4.2).
 * Cada fila es accionable solo si el usuario es su rol_aprobador y sigue
 * pendiente — para vendedor/analista nunca ocurre, quedan en solo-lectura.
 */
export function SolicitudesPage() {
  const { message, notification } = App.useApp()
  const empleado = useAuthStore((s) => s.empleado)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoSolicitud | undefined>(undefined)
  const [pagina, setPagina] = useState(1)
  const [aDenegar, setADenegar] = useState<Solicitud | null>(null)
  const [aVerDetalle, setAVerDetalle] = useState<Solicitud | null>(null)
  const [formDenegar] = Form.useForm<{ motivo: string }>()

  const solicitudes = useSolicitudes({ estado: estadoFiltro, page: pagina })
  const aprobar = useAprobarSolicitud()
  const denegar = useDenegarSolicitud()

  const onAprobar = (s: Solicitud) => {
    aprobar.mutate(s.id, {
      onSuccess: () => message.success('Solicitud aprobada — el cambio ya está aplicado'),
      onError: (e) => {
        const codigo = codigoDeError(e)
        if (codigo === 'SOLICITUD_YA_RESUELTA') {
          message.info('Otro aprobador ya resolvió esta solicitud — lista actualizada')
          return
        }
        if (codigo === 'SOLICITUD_NO_APLICABLE') {
          notification.warning({
            message: 'La solicitud ya no aplica',
            description:
              'La entidad cambió y el efecto ya no puede aplicarse (p. ej. la oportunidad se cerró). Deniégala manualmente indicando el motivo.',
          })
          return
        }
        message.error(mensajeDeError(e, 'No se pudo aprobar la solicitud'))
      },
    })
  }

  const onDenegar = async () => {
    if (!aDenegar) return
    const { motivo } = await formDenegar.validateFields()
    denegar.mutate(
      { id: aDenegar.id, motivo },
      {
        onSuccess: () => {
          message.success('Solicitud denegada')
          formDenegar.resetFields()
          setADenegar(null)
        },
        onError: (e) => {
          if (codigoDeError(e) === 'SOLICITUD_YA_RESUELTA') {
            message.info('Otro aprobador ya resolvió esta solicitud — lista actualizada')
            formDenegar.resetFields()
            setADenegar(null)
            return
          }
          message.error(mensajeDeError(e, 'No se pudo denegar la solicitud'))
        },
      },
    )
  }

  const columnas: ColumnsType<Solicitud> = [
    { title: 'Solicitante', key: 'solicitante', render: (_, s) => nombreCompleto(s.solicitante) },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      render: (t: Solicitud['tipo']) => <Tag>{ETIQUETA_TIPO_SOLICITUD[t]}</Tag>,
    },
    {
      title: 'Entidad',
      key: 'entidad',
      render: (_, s) => <Link to={rutaEntidad(s)}>{s.entidad_descripcion}</Link>,
    },
    { title: 'Cambio solicitado', key: 'payload', render: (_, s) => descripcionPayloadSolicitud(s) },
    { title: 'Motivo', dataIndex: 'motivo' },
    { title: 'Fecha', dataIndex: 'created_at', render: (f: string) => formatoFecha(f) },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: Solicitud['estado']) => (
        <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_SOLICITUD[e]}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, s) => (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button size="small" onClick={() => setAVerDetalle(s)}>
            Ver detalle
          </Button>
          {puedeResolverSolicitud(s, empleado?.rol) && (
            <>
              <Popconfirm
                title={`¿Aprobar y aplicar "${descripcionPayloadSolicitud(s)}"?`}
                okText="Aprobar"
                cancelText="Cancelar"
                onConfirm={() => onAprobar(s)}
              >
                <Button type="primary" size="small" loading={aprobar.isPending}>
                  Aprobar
                </Button>
              </Popconfirm>
              <Button danger size="small" onClick={() => setADenegar(s)}>
                Denegar
              </Button>
            </>
          )}
        </span>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
            Solicitudes
          </Typography.Title>
          <span style={{ color: '#444750' }}>
            {empleado?.rol === 'jdv'
              ? 'Solicitudes que enviaste y las que tienes por aprobar'
              : 'Estado de tus solicitudes de aprobación'}
          </span>
        </div>
        <Select
          allowClear
          placeholder="Todos los estados"
          style={{ width: 200 }}
          value={estadoFiltro}
          onChange={(v) => {
            setEstadoFiltro(v)
            setPagina(1)
          }}
          options={(['pendiente', 'aprobada', 'denegada'] as const).map((e) => ({
            value: e,
            label: ETIQUETA_ESTADO_SOLICITUD[e],
          }))}
        />
      </div>

      <Table
        rowKey="id"
        loading={solicitudes.isLoading}
        dataSource={solicitudes.data?.data ?? []}
        columns={columnas}
        pagination={{
          current: pagina,
          total: solicitudes.data?.meta?.total ?? 0,
          pageSize: solicitudes.data?.meta?.per_page ?? 20,
          onChange: setPagina,
          showSizeChanger: false,
        }}
      />

      <Modal
        title="Denegar solicitud"
        open={aDenegar !== null}
        onCancel={() => {
          formDenegar.resetFields()
          setADenegar(null)
        }}
        onOk={() => void onDenegar()}
        okText="Denegar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={denegar.isPending}
        destroyOnHidden
      >
        <Form form={formDenegar} layout="vertical" requiredMark={false}>
          <Form.Item
            name="motivo"
            label="Motivo de la denegación (se notificará al solicitante)"
            rules={[{ required: true, whitespace: true, message: 'El motivo es obligatorio' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <SolicitudDetalleModal solicitud={aVerDetalle} onClose={() => setAVerDetalle(null)} />
    </div>
  )
}
```

- [ ] **Step 4: Rutas en `src/router/index.tsx`**

```tsx
<Route
  path="/gerencia"
  element={
    <RequireRol roles={['gerencia', 'admin']}>
      <GerenciaPage />
    </RequireRol>
  }
/>
<Route
  path="/solicitudes"
  element={
    <RequireRol roles={['vendedor', 'analista', 'jdv']}>
      <SolicitudesPage />
    </RequireRol>
  }
/>
```

(con sus imports). Recordar: guards = UX, no seguridad.

- [ ] **Step 5: Navegación en `AppLayout.tsx`**

Después del push condicional de Reportes:

```ts
if (tieneRol(empleado, ROLES_BANDEJA_GERENCIA)) {
  items.push({ to: '/gerencia', icono: 'fact_check', label: 'Gerencia' })
}
if (tieneRol(empleado, ROLES_SOLICITANTES)) {
  items.push({ to: '/solicitudes', icono: 'approval', label: 'Solicitudes' })
}
```

(ampliar el import de `authStore`). Cada rol ve como máximo una de las dos entradas — `admin` no está en `ROLES_SOLICITANTES` (no solicita, ejecuta directo), así que solo ve "Gerencia".

- [ ] **Step 6: Verificar**

`npm run type-check`. Manual:
1. Vendedor: ve "Solicitudes" (no "Gerencia"); sus solicitudes de Tasks 8–10 aparecen en la tabla, sin botones Aprobar/Denegar (`puedeResolverSolicitud` da `false` siempre para su rol).
2. jdv: ve "Solicitudes"; en la misma tabla aparecen tanto las que él creó (descuentos >7%, reasignaciones) como las dirigidas a él (descuentos 3–7% de sus vendedores) — solo estas últimas muestran Aprobar/Denegar. Aprobar una → la oportunidad muestra el dcto nuevo y `monto_total` recalculado al navegar (invalidación 360).
3. Gerencia: ve "Gerencia"; aprueba/deniega (denegar exige motivo); historial muestra resolutor/fecha/motivo.
4. Dos ventanas (gerencia + admin): aprobar la misma solicitud en ambas → la segunda recibe "Otro aprobador ya resolvió…" y su bandeja se refresca.
5. Desde `/gerencia` y desde `/solicitudes`: click en "Ver detalle" abre `SolicitudDetalleModal` con el detalle completo vía `GET /solicitudes/:id`.

---

### Task 13: Notificaciones — 3 tipos nuevos y navegación por destino

**Files:**
- Modify: `src/components/NotificacionesDropdown.tsx` (función `irANotificacion`)

**Interfaces:**
- Consumes: tipos extendidos de Task 2, `ROLES_BANDEJA_GERENCIA`.

Destinos (contrato §6): `solicitud_creada` → bandeja del aprobador (`/gerencia` para gerencia/admin, `/solicitudes` para jdv); `solicitud_aprobada`/`solicitud_denegada` → "Mis solicitudes" (`/solicitudes`; el `motivo_resolucion` es visible en la columna Resolución). La navegación actual (`/${entidad_tipo}s/${entidad_id}`) produciría `/solicituds/7` — hay que mapear.

- [ ] **Step 1: Reemplazar `irANotificacion`**

```tsx
import { useAuthStore, ROLES_BANDEJA_GERENCIA, tieneRol } from '@/store/authStore'
// dentro del componente:
const empleado = useAuthStore((s) => s.empleado)

const irANotificacion = (n: Notificacion) => {
  if (!n.leida) marcarLeida.mutate(n.id)
  setAbierto(false)
  if (n.entidad_tipo === 'solicitud') {
    // solicitud_creada llega al aprobador; aprobada/denegada al solicitante.
    // En ambos casos su vista vive en /gerencia (gerencia/admin) o /solicitudes.
    navigate(tieneRol(empleado, ROLES_BANDEJA_GERENCIA) ? '/gerencia' : '/solicitudes')
    return
  }
  navigate(`/${n.entidad_tipo}s/${n.entidad_id}`)
}
```

- [ ] **Step 2: Verificar**

`npm run type-check`. Manual: vendedor envía solicitud → al jdv le aparece la notificación (polling 45 s) y al clickearla aterriza en su bandeja; jdv la aprueba → el vendedor recibe `solicitud_aprobada` y al clickearla aterriza en "Mis solicitudes"; denegar → ídem con el motivo visible.

---

### Task 14: Cartera Maestra — tab en Cartera, liberar y mover

**Files:**
- Modify: `src/pages/Cartera/CarteraPage.tsx` (tab condicional + columna de acción "Liberar")
- Create: `src/pages/Cartera/LiberarEmpresaModal.tsx`
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` (acción "Mover a Cartera Maestra" / badge + "Liberar")

**Interfaces:**
- Consumes: `useCambiarCarteraMaestra` (Task 5), `useVendedoresAsignables` (Task 6), `codigoDeError`.
- Produces: `LiberarEmpresaModal` con props `{ empresa: { id: number; razon_social: string } | null; onClose: () => void }`.

Reglas §4.6: mover requiere que la empresa no tenga oportunidades activas (`409 CARTERA_MAESTRA_CON_OPORTUNIDADES`) y desasigna al vendedor; liberar exige `id_vendedor` (vendedor/jdv activo) y dispara `empresa_asignada`. El frontend NO filtra visibilidad: el backend ya la aplica (§7.1) — aquí solo se renderiza la sección para `gerencia`/`admin`.

- [ ] **Step 1: Crear `src/pages/Cartera/LiberarEmpresaModal.tsx`**

```tsx
import { App, Form, Modal, Select } from 'antd'
import { useCambiarCarteraMaestra } from '@/hooks/useEmpresas'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'

interface Props {
  empresa: { id: number; razon_social: string } | null
  onClose: () => void
}

/** Libera una empresa de la Cartera Maestra asignándole vendedor (contrato §4.6). */
export function LiberarEmpresaModal({ empresa, onClose }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<{ id_vendedor: number }>()
  const vendedores = useVendedoresAsignables(empresa !== null)
  const cambiar = useCambiarCarteraMaestra(empresa?.id ?? 0)

  const onLiberar = async () => {
    const { id_vendedor } = await form.validateFields()
    try {
      await cambiar.mutateAsync({ en_cartera_maestra: false, id_vendedor })
      message.success('Empresa liberada — el vendedor asignado fue notificado')
      form.resetFields()
      onClose()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo liberar la empresa'))
    }
  }

  return (
    <Modal
      title={empresa ? `Liberar "${empresa.razon_social}"` : 'Liberar empresa'}
      open={empresa !== null}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void onLiberar()}
      okText="Liberar y asignar"
      cancelText="Cancelar"
      confirmLoading={cambiar.isPending}
      destroyOnHidden
      width={440}
    >
      <p style={{ marginBottom: 16 }}>
        La empresa saldrá de la Cartera Maestra y será visible para el vendedor asignado y el
        Jefe de Ventas.
      </p>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="id_vendedor"
          label="Vendedor asignado"
          rules={[{ required: true, message: 'Elige el vendedor que la recibirá' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            loading={vendedores.isLoading}
            options={(vendedores.data ?? []).map((e) => ({
              value: e.id,
              label: `${e.nombres} ${e.apellidos}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

Nota: `useCambiarCarteraMaestra(empresa?.id ?? 0)` con id 0 nunca dispara porque el modal cerrado (`empresa === null`) no permite `onOk`; alternativa equivalente: montar el modal solo cuando hay empresa.

- [ ] **Step 2: Tab "Cartera Maestra" en `CarteraPage.tsx`**

Cambios:

```ts
import { useAuthStore, ROLES_BANDEJA_GERENCIA, tieneRol } from '@/store/authStore'
import { LiberarEmpresaModal } from './LiberarEmpresaModal'

// dentro del componente:
const empleado = useAuthStore((s) => s.empleado)
const veCarteraMaestra = tieneRol(empleado, ROLES_BANDEJA_GERENCIA)
const [aLiberar, setALiberar] = useState<{ id: number; razon_social: string } | null>(null)

const tabs = veCarteraMaestra ? [...TABS, { key: 'cartera_maestra' as const }] : TABS
const esTabMaestra = tab === 'cartera_maestra'

const empresas = useEmpresas({
  q: busqueda.trim() || undefined,
  estado_cartera: esTabMaestra ? undefined : estadoActivo,
  // P7 confirmado: por defecto el backend MEZCLA cartera maestra con el resto
  // para gerencia/admin. Para que los tabs normales no incluyan las empresas
  // reservadas, gerencia/admin deben enviar cartera_maestra=false explícito
  // ahí; en el tab Cartera Maestra, true. Otros roles nunca ven mezcla
  // (el backend ya excluye la cartera maestra para ellos, §3.4).
  ...(veCarteraMaestra ? { cartera_maestra: esTabMaestra } : {}),
})
```

Etiquetas de tabs — reemplazar el mapping actual del `<Tabs>` por:

```tsx
<Tabs
  activeKey={tab}
  onChange={setTab}
  items={tabs.map((t) => ({
    key: t.key,
    label:
      t.key === 'cartera_maestra' ? 'Cartera Maestra' : t.estado ? ETIQUETA_CARTERA[t.estado] : 'Todas',
  }))}
/>
```

Columnas: en el tab maestra, quitar la columna "Vendedor" (siempre vacía: al mover se desasigna) y agregar una de acciones. Debajo de la definición actual de `columnas`:

```tsx
const columnasMaestra: ColumnsType<EmpresaListItem> = [
  ...columnas.filter((c) => c.key !== 'vendedor' && !('dataIndex' in c && c.dataIndex === 'vendedor')),
  {
    title: 'Acciones',
    key: 'acciones',
    render: (_, e) => (
      <Button
        size="small"
        onClick={(ev) => {
          ev.stopPropagation() // no navegar al detalle al clickear el botón
          setALiberar({ id: e.id, razon_social: e.razon_social })
        }}
      >
        Liberar
      </Button>
    ),
  },
]
```

y en la `<Table>`: `columns={esTabMaestra ? columnasMaestra : columnas}`. Renderizar `<LiberarEmpresaModal empresa={aLiberar} onClose={() => setALiberar(null)} />` al final del JSX de la página.

- [ ] **Step 3: "Mover a Cartera Maestra" en `EmpresaDetallePage.tsx`**

En el header de acciones (junto a "Editar Datos"), solo para `gerencia`/`admin`:

```tsx
{veCarteraMaestra && !empresa.en_cartera_maestra && (
  <Popconfirm
    title="¿Mover a la Cartera Maestra?"
    description="La empresa dejará de ser visible para vendedores y jdv, y se desasignará su vendedor."
    okText="Mover"
    cancelText="Cancelar"
    onConfirm={() =>
      moverCarteraMaestra.mutate(
        { en_cartera_maestra: true },
        {
          onSuccess: () => message.success('Empresa movida a la Cartera Maestra'),
          onError: (e) => {
            if (codigoDeError(e) === 'CARTERA_MAESTRA_CON_OPORTUNIDADES') {
              message.warning(
                'No se puede mover: la empresa tiene oportunidades activas. Ciérralas primero.',
              )
              return
            }
            message.error(mensajeDeError(e))
          },
        },
      )
    }
  >
    <button className="btn-circular px-6 py-2 border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container-low transition-colors">
      Mover a Cartera Maestra
    </button>
  </Popconfirm>
)}
{veCarteraMaestra && empresa.en_cartera_maestra && (
  <button
    className="btn-circular px-6 py-2 border border-brand-cyan text-brand-cyan font-bold hover:bg-brand-cyan/5 transition-colors"
    onClick={() => setALiberar({ id: empresa.id, razon_social: empresa.razon_social })}
  >
    Liberar de Cartera Maestra
  </button>
)}
```

con `const veCarteraMaestra = tieneRol(empleado, ROLES_BANDEJA_GERENCIA)`, `const moverCarteraMaestra = useCambiarCarteraMaestra(empresa.id)`, estado `aLiberar` y el `<LiberarEmpresaModal>` (importado desde `../Cartera/LiberarEmpresaModal`). Cuando `empresa.en_cartera_maestra`, mostrar además un `<NeutralTag>Cartera Maestra</NeutralTag>` junto al breadcrumb de estado. (Depende de P8: que el detalle incluya el campo.)

- [ ] **Step 4: Verificar**

`npm run type-check`. Manual:
1. Gerencia: tab "Cartera Maestra" visible en Cartera con las empresas reservadas; vendedor/jdv NO ven el tab y sus listados no incluyen esas empresas (lo garantiza el backend, solo confirmar).
2. Mover una empresa sin oportunidades → desaparece del listado normal, aparece en el tab maestra sin vendedor.
3. Intentar mover una con oportunidad activa → warning del 409.
4. Liberar con vendedor → vuelve al listado normal con ese vendedor; el vendedor recibe la notificación `empresa_asignada`.

---

### Task 15: Verificación final integral

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Type-check y build**

Run: `npm run type-check` → sin errores. Run: `npm run build` → build OK.

- [ ] **Step 2: Grep de regresiones**

- `grep -rn "gerente" src/` → 0 resultados.
- `grep -rn "useEmpleados({ activo: true }" src/` → solo usos legítimos que NO son selectores de vendedor (AdminEmpleados usa `useEmpleados({})` para la tabla de administración — correcto, ahí sí se listan todos los roles).

- [ ] **Step 3: Pasada manual del checklist §8 con un usuario por rol**

| Rol | Verificar |
|---|---|
| vendedor | dcto ≤3 directo · 3<dcto≤7 → solicitud a jdv · >7 → solicitud a gerencia · "Solicitudes" en nav (vista única, sin botones de acción) · no ve reasignación · no ve Cartera Maestra |
| jdv | dcto ≤7 directo · >7 → solicitud · reasignar → modal de solicitud · "Solicitudes" muestra en una sola tabla lo propio Y lo que tiene por aprobar (3–7%) · no ve Cartera Maestra |
| gerencia | sin límite de dcto · reasigna directo · `/gerencia` con bandeja + historial · tabs normales de Cartera NO mezclan cartera maestra (envían `cartera_maestra=false`) · Cartera Maestra (mover/liberar) · no aparece en ningún selector de vendedor · crea oportunidad en empresa sin vendedor pidiendo `id_vendedor` · "Ver detalle" abre el modal con `GET /solicitudes/:id` |
| admin | todo lo de gerencia + `/admin` |
| analista | como vendedor pero sin opción de solicitar reasignación |

---

## Cobertura del checklist §8 del contrato

| Punto §8 | Tarea(s) |
|---|---|
| Reemplazar `rol === "gerente"` por `"gerencia"` | Task 1 |
| Manejar `422 APROBACION_REQUERIDA` en formularios de oportunidad → modal | Tasks 7, 8 (edición), 9 (creación) |
| Manejar `403` en reasignación para jdv → modal | Tasks 7, 10 |
| Vista `/gerencia` (bandeja + historial) y bandeja jdv | Tasks 11, 12 (bandeja jdv fusionada en `/solicitudes` por decisión D1) |
| "Mis solicitudes" + 3 tipos nuevos de notificación | Tasks 12 (página unificada), 2 y 13 (notificaciones) |
| Cartera Maestra: listado, mover/liberar, ocultar sección | Task 14 (+ tipos/API en 2, 3, 5) |
| Modal crear oportunidad: pedir `id_vendedor` si empresa sin vendedor | Task 9 |
| Excluir `gerencia`/`admin` de selectores de vendedor | Task 6 (+ 9 y 14 usan el hook filtrado) |

## Decisiones confirmadas por el usuario (2026-07-16)

Todas las preguntas abiertas de la primera versión del plan fueron respondidas antes de implementar. Quedan registradas aquí para trazabilidad; el cuerpo del plan ya refleja cada una.

| # | Pregunta | Respuesta | Dónde se aplicó |
|---|---|---|---|
| P1 | ¿El encabezado "propuesta, pendiente de implementación backend" del contrato está desactualizado? | Correcto — el contrato es la versión final y estable. | Sin cambios de código; nota informativa. |
| P2 | Navegación de `/gerencia` y `/solicitudes` | **Una sola vista/tab** para vendedor/analista/jdv en `/solicitudes` (no "Por aprobar" + "Mis solicitudes" separadas); el jdv ve en la misma tabla lo que creó y lo que tiene por aprobar. | Decisión D1; Tasks 11 y 12 reescritas. |
| P3 | UX de creación con dcto sobre el límite | Confirmado el flujo asistido: crear con el límite del rol y abrir la solicitud por el % deseado. | Task 9, Step 4. |
| P4 | Edición con 422 | Confirmado: re-guardar automáticamente el resto de campos con el dcto vigente y abrir el modal de solicitud. | Task 8, Step 2. |
| P5 | ¿jdv como destino de asignación de vendedor? | Sí. | Task 6 (`ROLES_ASIGNABLES = ['vendedor', 'jdv']`). |
| P6 | ¿Excluir gerencia/admin del selector de vendedor en Reportes? | Sí. | Task 6, Step 4. |
| P7 | Comportamiento por defecto de los tabs normales de Cartera para gerencia/admin | Por defecto el backend **mezcla** cartera maestra con el resto (sin el query param). Para no mezclarlas, gerencia/admin deben enviar `cartera_maestra=false` explícito en los tabs normales. | Task 14, Step 2 (`cartera_maestra: esTabMaestra` cuando `veCarteraMaestra`). |
| P8 | ¿`GET /empresas/:id` incluye `en_cartera_maestra`? | Sí. | Task 2, Step 2 (`en_cartera_maestra` también en el tipo `Empresa`, no solo en `EmpresaListItem`). |
| P9 | ¿Se necesita un modal de detalle de solicitud aunque no haya ruta `/solicitudes/:id`? | Sí — debe poder abrirse el detalle completo desde ambas vistas. | Decisión D9; Task 11 agrega `SolicitudDetalleModal` (`GET /solicitudes/:id`), usado desde `BandejaSolicitudes` y `SolicitudesPage`. |
