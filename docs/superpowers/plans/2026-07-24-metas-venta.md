# Metas de venta (unidades) — Panel de gestión + medidor en Inicio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consumir el nuevo dominio `/metas-venta` del backend: un medidor de cumplimiento (velocímetro) en Inicio para `vendedor`/`jdv`, y un flujo de gestión (proponer → aprobar/rechazar/editar) integrado en las páginas existentes `GerenciaPage` (gerencia/admin) y `SolicitudesPage` (jdv).

**Architecture:** Mismo patrón por capas que el dominio Solicitud ya existente: tipos en `src/types/metaVenta.ts` (espejo del DTO), cliente en `src/api/metasVenta.ts` sobre los helpers de `client.ts`, hooks TanStack Query en `src/hooks/useMetasVenta.ts` con invalidación 360 (`qk.metasVenta` + `qk.inicio`, porque el medidor de Inicio depende de las mutaciones de meta), un componente de gauge SVG puro (`GaugeMeta`) sin librerías nuevas, un formulario de 12 meses reutilizado (`MetaVentaFormModal`) entre "proponer" (jdv, POST), "crear directo" (gerencia/admin, POST) y "editar y aprobar" (gerencia/admin, PATCH), y dos componentes de listado (`BandejaMetasVenta` para gerencia/admin, `MisMetasEquipo` para jdv) montados como pestañas nuevas dentro de `GerenciaPage` y `SolicitudesPage` respectivamente — sin nuevas rutas ni ítems de navegación.

**Tech Stack:** React 18 + TypeScript strict, Ant Design v5 (`Tabs`, `Table`, `Form`, `InputNumber`, `Modal`, `Popconfirm`), TanStack Query v5, Axios (vía `src/api/client.ts`). Gauge construido con SVG plano — sin librería de charts nueva.

## Global Constraints

- TypeScript strict, **nunca `any`** — `unknown` + narrowing (CLAUDE.md regla 2).
- Toda llamada HTTP pasa por `/src/api/` (regla 5). Server state solo en TanStack Query, nunca copiado a Zustand (regla 3). Invalidación 360 tras cada mutación (regla 4) — toda mutación de meta invalida `qk.metasVenta` **y** `qk.inicio`.
- Guards de router/UI son solo UX (regla 8) — el backend ya rechaza con 403 cualquier acción fuera de la matriz de permisos del prompt. El frontend oculta acciones para evitar un fallo previsible, no como barrera de seguridad.
- `meta_ventas` en `GET /inicio` decide su propia visibilidad: si es `null`, **no se renderiza el bloque en absoluto** — la condición de render es sobre el dato (`d.meta_ventas`), no una comprobación de rol duplicada.
- **No hay framework de tests instalado** (`npm run test` es no-op: `"tests: omitidos en MVP por decision de producto"`; cero archivos `*.test.*`). Decisión confirmada con el usuario 2026-07-24: **no se instala Vitest para esta feature**. Verificación por tarea = `npm run type-check` + verificación manual en navegador (Task 13).
- **No hay repositorio git en este directorio** (`Is a git repository: false`). Omitir todos los pasos de commit; no ejecutar `git init`.
- `meta_anual` es **siempre** de solo lectura — se muestra calculada en vivo en el formulario pero nunca se envía en el body de `POST`/`PATCH`.
- `POST /metas-venta` **siempre** manda los 12 meses juntos. `PATCH /metas-venta/:id` manda **solo** los meses que cambiaron respecto al valor original.
- Textos de UI en español, nombres de código en español siguiendo el estilo existente (`empleado`, `aprobar`, `rechazar`, `motivo`…).
- Envelope de API estándar `{ data, meta, error }`, igual que el resto del contrato.

## Decisiones ya tomadas (con su justificación)

| # | Decisión | Justificación |
|---|---|---|
| D1 | El arco del gauge se llena hasta 100% como tope visual; si `porcentaje > 100` cambia a color de éxito (teal) y se muestra un badge `+X% sobre la meta` con el número exacto | Confirmado por el usuario 2026-07-24: escala siempre comparable entre periodos, más simple de construir y de leer que un arco que se reescala dinámicamente. |
| D2 | La gestión de metas se integra como pestaña nueva dentro de `GerenciaPage` ("Solicitudes" \| "Metas de venta") y dentro de `SolicitudesPage` (pestaña "Metas de venta" **solo si `rol === 'jdv'`**) — sin ruta ni ítem de nav nuevos | Confirmado por el usuario 2026-07-24: menos ítems de navegación; las metas son un dominio propio pero conviven con Solicitudes en las mismas pantallas por rol. |
| D3 | Formulario de 12 meses sin atajos de auto-relleno (12 `InputNumber` planos) | Confirmado por el usuario 2026-07-24: cubre el requisito del contrato sin la complejidad de repartir un total con residuos. |
| D4 | El rol `vendedor` no tiene pantalla de gestión de metas — solo ve el medidor en Inicio | Confirmado por el usuario 2026-07-24 (YAGNI): vendedor no propone ni aprueba nada; el contrato no exige una vista de historial para este rol. |
| D5 | Sin tests (Vitest no se instala) | Confirmado por el usuario 2026-07-24: consistente con el resto del repo, que no tiene infraestructura de test. |

---

### Task 1: Tipos del dominio `MetaVenta` + extensión de `InicioData`

**Files:**
- Create: `src/types/metaVenta.ts`
- Modify: `src/types/inicio.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `EstadoMeta`, `MesMeta`, `MESES_META`, `MetaVenta`, `CrearMetaVentaInput`, `EditarMetaVentaInput`, `MetaVentaFiltros`, `MetaPeriodo`, `MetaVentasResumen`, `InicioMetaVentas` — consumidos por Tasks 2–12.

- [ ] **Step 1: Crear `src/types/metaVenta.ts`**

```ts
import type { EmpleadoResumen } from './empleado'
import type { PaginationParams } from './common'

export type EstadoMeta = 'propuesta' | 'aprobada' | 'rechazada'

export type MesMeta =
  | 'meta_enero'
  | 'meta_febrero'
  | 'meta_marzo'
  | 'meta_abril'
  | 'meta_mayo'
  | 'meta_junio'
  | 'meta_julio'
  | 'meta_agosto'
  | 'meta_septiembre'
  | 'meta_octubre'
  | 'meta_noviembre'
  | 'meta_diciembre'

/** Los 12 meses en orden — base de iteración para formularios y diffs de PATCH. */
export const MESES_META: MesMeta[] = [
  'meta_enero',
  'meta_febrero',
  'meta_marzo',
  'meta_abril',
  'meta_mayo',
  'meta_junio',
  'meta_julio',
  'meta_agosto',
  'meta_septiembre',
  'meta_octubre',
  'meta_noviembre',
  'meta_diciembre',
]

export type MetaVenta = {
  id: number
  id_empleado: number
  empleado: EmpleadoResumen
  anio: number
  meta_anual: number
  estado: EstadoMeta
  propuesto_por: EmpleadoResumen
  resolutor: EmpleadoResumen | null
  motivo_rechazo: string | null
  resolved_at: string | null
  created_at: string
} & Record<MesMeta, number>

/** POST siempre manda los 12 meses juntos + id_empleado + anio. meta_anual NUNCA se envía. */
export type CrearMetaVentaInput = {
  id_empleado: number
  anio: number
} & Record<MesMeta, number>

/** PATCH manda solo el subconjunto de meses que cambian. */
export type EditarMetaVentaInput = Partial<Record<MesMeta, number>>

export interface MetaVentaFiltros extends PaginationParams {
  id_empleado?: number
  anio?: number
  estado?: EstadoMeta
}
```

- [ ] **Step 2: Extender `src/types/inicio.ts` con el bloque `meta_ventas`**

Agregar estas tres interfaces nuevas al final del archivo (después del cierre de `InicioData`):

```ts
export interface MetaPeriodo {
  tiene_meta: boolean
  unidades_meta: number | null
  unidades_logradas: number
  porcentaje: number | null
}

export interface MetaVentasResumen {
  mensual: MetaPeriodo
  anual: MetaPeriodo
}

export interface InicioMetaVentas extends MetaVentasResumen {
  /** Solo poblado para rol jdv (agregado del equipo). null para vendedor. */
  equipo: MetaVentasResumen | null
}
```

Y en la interfaz `InicioData`, agregar el campo:

```ts
export interface InicioData {
  tareas_pendientes: InicioTarea[]
  eventos_por_seguir: InicioEvento[]
  resumen_pipeline: {
    valor_total: string
    oportunidades_activas: number
    cantidad_unidades: number
    por_etapa: Record<string, ResumenPipelineEtapa>
  }
  resumen_prospeccion: {
    total: number
    listas_para_convertir: number
    requieren_atencion: number
  }
  /** null para cualquier rol que no sea vendedor/jdv — no renderizar el bloque en ese caso. */
  meta_ventas: InicioMetaVentas | null
}
```

- [ ] **Step 3: Agregar el barrel export en `src/types/index.ts`**

```ts
export * from './metaVenta'
```

(agregar como última línea, después de `export * from './solicitud'`)

- [ ] **Step 4: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores (el campo `meta_ventas` nuevo en `InicioData` no rompe nada porque nadie más lo usa todavía).

---

### Task 2: Cliente API `metasVentaApi`

**Files:**
- Create: `src/api/metasVenta.ts`

**Interfaces:**
- Consumes: `get`, `post`, `patch` de `src/api/client.ts`; tipos de Task 1.
- Produces: `metasVentaApi.{listar,obtener,crear,editar,aprobar,rechazar}` — consumidos por Task 3.

- [ ] **Step 1: Crear `src/api/metasVenta.ts`**

```ts
import { get, post, patch } from './client'
import type {
  ApiResponse,
  CrearMetaVentaInput,
  EditarMetaVentaInput,
  MetaVenta,
  MetaVentaFiltros,
} from '@/types'

export const metasVentaApi = {
  listar: async (filtros?: MetaVentaFiltros): Promise<ApiResponse<MetaVenta[]>> => {
    return get<MetaVenta[]>('/metas-venta', filtros as Record<string, unknown>)
  },

  /** Propone (rol jdv, queda 'propuesta') o crea ya aprobada (rol gerencia/admin). Body: 12 meses + id_empleado + anio. */
  crear: async (input: CrearMetaVentaInput): Promise<MetaVenta> => {
    const res = await post<MetaVenta>('/metas-venta', input)
    return res.data
  },

  /** Edita un subconjunto de meses; la meta queda siempre 'aprobada' tras esta llamada. */
  editar: async (id: number, input: EditarMetaVentaInput): Promise<MetaVenta> => {
    const res = await patch<MetaVenta>(`/metas-venta/${id}`, input)
    return res.data
  },

  /** Aprueba tal cual fue propuesta. Body vacío. */
  aprobar: async (id: number): Promise<MetaVenta> => {
    const res = await patch<MetaVenta>(`/metas-venta/${id}/aprobar`, {})
    return res.data
  },

  /** Rechaza; el motivo es obligatorio. */
  rechazar: async (id: number, motivo: string): Promise<MetaVenta> => {
    const res = await patch<MetaVenta>(`/metas-venta/${id}/rechazar`, { motivo })
    return res.data
  },
}
```

Nota: `GET /metas-venta/:id` del contrato no se envuelve aquí a propósito (YAGNI) — esta feature no incluye una vista de detalle separada; las filas de `GET /metas-venta` (listar) ya traen el objeto `MetaVenta` completo con los 12 meses, que es todo lo que el formulario "Editar y aprobar" necesita para precargarse.

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 3: Query keys + hooks TanStack Query

**Files:**
- Modify: `src/hooks/queryKeys.ts`
- Create: `src/hooks/useMetasVenta.ts`

**Interfaces:**
- Consumes: `qk`, `invalidar` de `queryKeys.ts`; `metasVentaApi` de Task 2.
- Produces: `useMetasVenta`, `useCrearMetaVenta`, `useEditarMetaVenta`, `useAprobarMetaVenta`, `useRechazarMetaVenta` — consumidos por Tasks 6, 8, 9, 10.

- [ ] **Step 1: Agregar la query key en `src/hooks/queryKeys.ts`**

Dentro del objeto `qk`, agregar (después de `solicitud`):

```ts
  metasVenta: ['metas-venta'] as const,
```

- [ ] **Step 2: Crear `src/hooks/useMetasVenta.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { metasVentaApi } from '@/api/metasVenta'
import type { CrearMetaVentaInput, EditarMetaVentaInput, MetaVentaFiltros } from '@/types'
import { invalidar, qk } from './queryKeys'

export function useMetasVenta(filtros?: MetaVentaFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.metasVenta, filtros ?? {}],
    queryFn: () => metasVentaApi.listar(filtros),
    enabled,
  })
}

/**
 * Sincronización 360: el medidor de Inicio (meta_ventas) depende de estas
 * mutaciones, así que toda escritura invalida también qk.inicio.
 */
function invalidarMetas(qc: ReturnType<typeof useQueryClient>) {
  invalidar(qc, qk.metasVenta, qk.inicio)
}

export function useCrearMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearMetaVentaInput) => metasVentaApi.crear(input),
    onSuccess: () => invalidarMetas(qc),
  })
}

export function useEditarMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: EditarMetaVentaInput }) =>
      metasVentaApi.editar(id, input),
    onSuccess: () => invalidarMetas(qc),
  })
}

export function useAprobarMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => metasVentaApi.aprobar(id),
    onSuccess: () => invalidarMetas(qc),
    // 409 (ya resuelta) también deja la bandeja desactualizada → refrescar
    onError: () => invalidar(qc, qk.metasVenta),
  })
}

export function useRechazarMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      metasVentaApi.rechazar(id, motivo),
    onSuccess: () => invalidarMetas(qc),
    onError: () => invalidar(qc, qk.metasVenta),
  })
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 4: Etiquetas — estado de meta y nombres de mes

**Files:**
- Modify: `src/utils/etiquetas.ts`

**Interfaces:**
- Consumes: `EstadoMeta`, `MesMeta` de Task 1.
- Produces: `ETIQUETA_ESTADO_META`, `ETIQUETA_MES` — consumidos por Tasks 7, 8, 10.

- [ ] **Step 1: Agregar el import de tipos**

En la parte superior de `src/utils/etiquetas.ts`, agregar `EstadoMeta` y `MesMeta` al import existente de `@/types`:

```ts
import type {
  EstadoAccion,
  EstadoCartera,
  EstadoMeta,
  EstadoOportunidad,
  EstadoSolicitud,
  MesMeta,
  RolAprobador,
  TipoAccion,
  TipoSolicitud,
} from '@/types'
```

- [ ] **Step 2: Agregar las constantes de etiquetas**

Al final del archivo:

```ts
export const ETIQUETA_ESTADO_META: Record<EstadoMeta, string> = {
  propuesta: 'Propuesta',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

export const ETIQUETA_MES: Record<MesMeta, string> = {
  meta_enero: 'Enero',
  meta_febrero: 'Febrero',
  meta_marzo: 'Marzo',
  meta_abril: 'Abril',
  meta_mayo: 'Mayo',
  meta_junio: 'Junio',
  meta_julio: 'Julio',
  meta_agosto: 'Agosto',
  meta_septiembre: 'Septiembre',
  meta_octubre: 'Octubre',
  meta_noviembre: 'Noviembre',
  meta_diciembre: 'Diciembre',
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 5: Componente `GaugeMeta` (velocímetro SVG)

**Files:**
- Create: `src/components/GaugeMeta.tsx`

**Interfaces:**
- Consumes: `MetaPeriodo` de Task 1.
- Produces: `<GaugeMeta titulo={string} periodo={MetaPeriodo} />` — consumido por Task 6.

- [ ] **Step 1: Crear `src/components/GaugeMeta.tsx`**

```tsx
import type { MetaPeriodo } from '@/types'

interface GaugeMetaProps {
  titulo: string
  periodo: MetaPeriodo
}

const CX = 90
const CY = 90
const RADIO = 70
const GROSOR = 14

/** Punto sobre el semicírculo superior: 0° = izquierda, 90° = arriba, 180° = derecha. */
function puntoEnArco(anguloGrados: number) {
  const rad = ((anguloGrados - 180) * Math.PI) / 180
  return { x: CX + RADIO * Math.cos(rad), y: CY + RADIO * Math.sin(rad) }
}

function arcoPath(anguloInicio: number, anguloFin: number) {
  const inicio = puntoEnArco(anguloInicio)
  const fin = puntoEnArco(anguloFin)
  const granArco = anguloFin - anguloInicio > 180 ? 1 : 0
  return `M ${inicio.x} ${inicio.y} A ${RADIO} ${RADIO} 0 ${granArco} 1 ${fin.x} ${fin.y}`
}

const TRACK_PATH = arcoPath(0, 180)

/**
 * Gauge tipo velocímetro (semicírculo). El arco se llena hasta 100% como
 * tope visual — sobre esa marca el color pasa a éxito (teal) y se agrega un
 * badge con el excedente, en vez de reescalar el arco (decisión D1).
 */
export function GaugeMeta({ titulo, periodo }: GaugeMetaProps) {
  const { tiene_meta, unidades_meta, unidades_logradas, porcentaje } = periodo
  const pct = tiene_meta ? (porcentaje ?? 0) : 0
  const pctVisible = Math.max(0, Math.min(pct, 100))
  const excedente = tiene_meta ? Math.max(0, pct - 100) : 0
  const enMeta = tiene_meta && pct >= 100
  const colorRelleno = !tiene_meta ? '#c4c6d1' : enMeta ? '#006a64' : '#244481'
  const anguloFin = 180 * (pctVisible / 100)
  const fillPath = pctVisible > 0 ? arcoPath(0, anguloFin) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 160 }}>
      <svg viewBox="0 0 180 100" width="100%" style={{ maxWidth: 180 }}>
        <path d={TRACK_PATH} fill="none" stroke="#e4e7ff" strokeWidth={GROSOR} strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke={colorRelleno} strokeWidth={GROSOR} strokeLinecap="round" />
        )}
        <text x={CX} y={CY - 12} textAnchor="middle" fontSize={22} fontWeight={700} fill={colorRelleno}>
          {tiene_meta ? `${porcentaje}%` : '—'}
        </text>
      </svg>
      {excedente > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, color: '#006a64', marginTop: -8 }}>
          +{excedente}% sobre la meta
        </span>
      )}
      <span className="eyebrow" style={{ marginTop: 4 }}>
        {titulo}
      </span>
      <span style={{ fontSize: 12, color: '#747781' }}>
        {tiene_meta
          ? `${unidades_logradas} / ${unidades_meta} unidades`
          : `${unidades_logradas} unidades · sin meta asignada`}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 6: Integrar el medidor en `InicioPage`

**Files:**
- Modify: `src/pages/Inicio/InicioPage.tsx`

**Interfaces:**
- Consumes: `GaugeMeta` de Task 5, `InicioData.meta_ventas` de Task 1.

- [ ] **Step 1: Importar `GaugeMeta`**

En `src/pages/Inicio/InicioPage.tsx`, agregar el import:

```tsx
import { GaugeMeta } from '@/components/GaugeMeta'
```

- [ ] **Step 2: Agregar el bloque de medidores**

Insertar el siguiente bloque justo antes del `<div style={{ marginTop: 24, fontSize: 12, ...}}>Última actualización...</div>` final (es decir, después del grid de dos columnas que contiene "Tareas pendientes" / "Eventos por seguir" / "Pipeline por etapa"):

```tsx
      {/* Medidor de metas de venta — el dato decide su propia visibilidad, sin chequeo de rol duplicado */}
      {d.meta_ventas && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="bento-card">
            <span className="eyebrow">Mi meta de venta</span>
            <div
              style={{
                display: 'flex',
                gap: 24,
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                marginTop: 12,
              }}
            >
              <GaugeMeta titulo="Este mes" periodo={d.meta_ventas.mensual} />
              <GaugeMeta titulo="Este año" periodo={d.meta_ventas.anual} />
            </div>
          </div>
          {d.meta_ventas.equipo && (
            <div className="bento-card">
              <span className="eyebrow">Meta del equipo</span>
              <div
                style={{
                  display: 'flex',
                  gap: 24,
                  flexWrap: 'wrap',
                  justifyContent: 'space-around',
                  marginTop: 12,
                }}
              >
                <GaugeMeta titulo="Este mes" periodo={d.meta_ventas.equipo.mensual} />
                <GaugeMeta titulo="Este año" periodo={d.meta_ventas.equipo.anual} />
              </div>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 4: Verificación visual rápida**

Run: `npm run dev`, iniciar sesión con un usuario `vendedor` o `jdv`. En `/`, debajo del grid de tareas/eventos debe aparecer la card "Mi meta de venta" con dos gauges. Con un usuario `admin`/`gerencia`/`analista`, el bloque no debe aparecer en absoluto (verificar en el DOM, no solo visualmente, que no exista `.bento-card` con el texto "Mi meta de venta").

---

### Task 7: Formulario compartido de 12 meses (`MetaVentaFormModal`)

**Files:**
- Create: `src/components/MetaVentaFormModal.tsx`

**Interfaces:**
- Consumes: `useCrearMetaVenta`, `useEditarMetaVenta` (Task 3); `MESES_META`, `MetaVenta`, `MesMeta` (Task 1); `ETIQUETA_MES` (Task 4); `codigoDeError`, `mensajeDeError` (`@/api/client`).
- Produces: `<MetaVentaFormModal open modo tituloModal textoBoton empleadosDisponibles metaAEditar? onGuardada? onClose />` — consumido por Tasks 8 y 10.

- [ ] **Step 1: Crear `src/components/MetaVentaFormModal.tsx`**

```tsx
import { useEffect } from 'react'
import { App, Form, InputNumber, Modal, Select } from 'antd'
import { useCrearMetaVenta, useEditarMetaVenta } from '@/hooks/useMetasVenta'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { EditarMetaVentaInput, EmpleadoResumen, MesMeta, MetaVenta } from '@/types'
import { MESES_META } from '@/types'
import { ETIQUETA_MES } from '@/utils/etiquetas'
import { nombreCompleto } from '@/utils/formato'

type FormValues = { id_empleado: number; anio: number } & Record<MesMeta, number>

interface Props {
  open: boolean
  onClose: () => void
  /** 'nueva' = POST (proponer o crear directo, según el rol del caller). 'editar' = PATCH sobre metaAEditar. */
  modo: 'nueva' | 'editar'
  tituloModal: string
  textoBoton: string
  empleadosDisponibles: EmpleadoResumen[]
  /** Requerido si modo === 'editar'. Si se pasa en modo 'nueva', precarga el form (caso "volver a proponer" sobre una rechazada). */
  metaAEditar?: MetaVenta | null
  onGuardada?: (m: MetaVenta) => void
}

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS_DISPONIBLES = [ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1]

/**
 * Formulario de 12 meses reutilizado por Gerencia (crear directo / editar y
 * aprobar) y JDV (proponer / volver a proponer). meta_anual se muestra
 * calculada en vivo pero NUNCA se envía en el body — la calcula el backend.
 */
export function MetaVentaFormModal({
  open,
  onClose,
  modo,
  tituloModal,
  textoBoton,
  empleadosDisponibles,
  metaAEditar,
  onGuardada,
}: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const crear = useCrearMetaVenta()
  const editar = useEditarMetaVenta()
  const guardando = crear.isPending || editar.isPending
  const valoresForm = Form.useWatch([], form) as Partial<FormValues> | undefined

  useEffect(() => {
    if (!open) return
    if (metaAEditar) {
      const valoresIniciales = {
        id_empleado: metaAEditar.id_empleado,
        anio: metaAEditar.anio,
        ...Object.fromEntries(MESES_META.map((mes) => [mes, metaAEditar[mes]])),
      } as FormValues
      form.setFieldsValue(valoresIniciales)
    } else {
      form.resetFields()
      form.setFieldsValue({ anio: ANIO_ACTUAL } as Partial<FormValues>)
    }
  }, [open, metaAEditar, form])

  const metaAnualEnVivo = MESES_META.reduce((total, mes) => total + (valoresForm?.[mes] ?? 0), 0)

  const onGuardar = async () => {
    const v = await form.validateFields()
    try {
      if (modo === 'editar' && metaAEditar) {
        const cambios: EditarMetaVentaInput = {}
        for (const mes of MESES_META) {
          if (v[mes] !== metaAEditar[mes]) cambios[mes] = v[mes]
        }
        if (Object.keys(cambios).length === 0) {
          message.info('No hay cambios que guardar')
          onClose()
          return
        }
        const actualizada = await editar.mutateAsync({ id: metaAEditar.id, input: cambios })
        message.success('Meta actualizada y aprobada')
        onClose()
        onGuardada?.(actualizada)
        return
      }
      const meses = Object.fromEntries(MESES_META.map((mes) => [mes, v[mes]])) as Record<MesMeta, number>
      const creada = await crear.mutateAsync({ id_empleado: v.id_empleado, anio: v.anio, ...meses })
      message.success('Meta guardada')
      onClose()
      onGuardada?.(creada)
    } catch (e) {
      if (codigoDeError(e) === 'META_YA_EXISTE') {
        message.warning(
          'Ya existe una meta propuesta o aprobada para este vendedor y año — edítala en vez de crear una nueva',
        )
        return
      }
      if (codigoDeError(e) === 'META_RECHAZADA') {
        message.warning('Esta meta está rechazada: no se puede editar, debe volver a proponerse')
        return
      }
      message.error(mensajeDeError(e, 'No se pudo guardar la meta'))
    }
  }

  return (
    <Modal
      title={tituloModal}
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      onOk={() => void onGuardar()}
      okText={textoBoton}
      cancelText="Cancelar"
      confirmLoading={guardando}
      destroyOnHidden
      width={640}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="id_empleado" label="Vendedor" rules={[{ required: true, message: 'Elige el vendedor' }]}>
            <Select
              disabled={modo === 'editar'}
              showSearch
              optionFilterProp="label"
              options={empleadosDisponibles.map((e) => ({ value: e.id, label: nombreCompleto(e) }))}
            />
          </Form.Item>
          <Form.Item name="anio" label="Año" rules={[{ required: true, message: 'Elige el año' }]}>
            <Select
              disabled={modo === 'editar'}
              options={ANIOS_DISPONIBLES.map((a) => ({ value: a, label: String(a) }))}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {MESES_META.map((mes) => (
            <Form.Item key={mes} name={mes} label={ETIQUETA_MES[mes]} initialValue={0}>
              <InputNumber style={{ width: '100%' }} min={0} precision={0} />
            </Form.Item>
          ))}
        </div>

        <div
          style={{
            background: '#f3f2ff',
            borderRadius: 4,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="eyebrow">Meta anual (calculada)</span>
          <span className="metric-value" style={{ fontSize: 20, fontWeight: 700, color: '#244481' }}>
            {metaAnualEnVivo} unidades
          </span>
        </div>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 8: Bandeja de Gerencia (`BandejaMetasVenta`)

**Files:**
- Create: `src/components/BandejaMetasVenta.tsx`

**Interfaces:**
- Consumes: `useMetasVenta`, `useAprobarMetaVenta`, `useRechazarMetaVenta` (Task 3); `useVendedoresAsignables` (`@/hooks/useCatalogos`, ya existente); `MetaVentaFormModal` (Task 7); `ETIQUETA_ESTADO_META` (Task 4).
- Produces: `<BandejaMetasVenta />` — consumido por Task 9.

- [ ] **Step 1: Crear `src/components/BandejaMetasVenta.tsx`**

```tsx
import { useState } from 'react'
import { App, Button, Form, Input, Modal, Popconfirm, Select, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAprobarMetaVenta, useMetasVenta, useRechazarMetaVenta } from '@/hooks/useMetasVenta'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import { codigoDeError, mensajeDeError } from '@/api/client'
import type { EstadoMeta, MetaVenta } from '@/types'
import { ETIQUETA_ESTADO_META } from '@/utils/etiquetas'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { MetaVentaFormModal } from './MetaVentaFormModal'

const COLOR_ESTADO: Record<EstadoMeta, string> = {
  propuesta: 'gold',
  aprobada: 'green',
  rechazada: 'red',
}

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS_DISPONIBLES = [ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1]

/** Bandeja de aprobación de metas, usada solo en /gerencia (roles gerencia/admin). */
export function BandejaMetasVenta() {
  const { message } = App.useApp()
  const [tab, setTab] = useState<'pendientes' | 'historial'>('pendientes')
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL)
  const [pagina, setPagina] = useState(1)
  const [aRechazar, setARechazar] = useState<MetaVenta | null>(null)
  const [aEditar, setAEditar] = useState<MetaVenta | null>(null)
  const [creando, setCreando] = useState(false)
  const [formRechazar] = Form.useForm<{ motivo: string }>()

  const vendedores = useVendedoresAsignables()
  const metas = useMetasVenta({
    anio,
    page: pagina,
    ...(tab === 'pendientes' ? { estado: 'propuesta' as const } : {}),
  })
  const aprobar = useAprobarMetaVenta()
  const rechazar = useRechazarMetaVenta()

  const onAprobar = (m: MetaVenta) => {
    aprobar.mutate(m.id, {
      onSuccess: () => message.success('Meta aprobada'),
      onError: (e) => {
        if (codigoDeError(e) === 'META_YA_RESUELTA') {
          message.info('Otro usuario ya resolvió esta meta — bandeja actualizada')
          return
        }
        message.error(mensajeDeError(e, 'No se pudo aprobar la meta'))
      },
    })
  }

  const onRechazar = async () => {
    if (!aRechazar) return
    const { motivo } = await formRechazar.validateFields()
    rechazar.mutate(
      { id: aRechazar.id, motivo },
      {
        onSuccess: () => {
          message.success('Meta rechazada')
          formRechazar.resetFields()
          setARechazar(null)
        },
        onError: (e) => {
          if (codigoDeError(e) === 'META_YA_RESUELTA') {
            message.info('Otro usuario ya resolvió esta meta — bandeja actualizada')
            formRechazar.resetFields()
            setARechazar(null)
            return
          }
          message.error(mensajeDeError(e, 'No se pudo rechazar la meta'))
        },
      },
    )
  }

  const columnasBase: ColumnsType<MetaVenta> = [
    { title: 'Vendedor', key: 'empleado', render: (_, m) => nombreCompleto(m.empleado) },
    { title: 'Año', dataIndex: 'anio' },
    { title: 'Meta anual', dataIndex: 'meta_anual', render: (v: number) => `${v} unidades` },
    { title: 'Propuesto por', key: 'propuesto_por', render: (_, m) => nombreCompleto(m.propuesto_por) },
    { title: 'Fecha', dataIndex: 'created_at', render: (f: string) => formatoFecha(f) },
  ]

  const columnasPendientes: ColumnsType<MetaVenta> = [
    ...columnasBase,
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, m) => (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button size="small" onClick={() => setAEditar(m)}>
            Editar y aprobar
          </Button>
          <Popconfirm
            title={`¿Aprobar la meta de ${nombreCompleto(m.empleado)} para ${m.anio}?`}
            okText="Aprobar"
            cancelText="Cancelar"
            onConfirm={() => onAprobar(m)}
          >
            <Button type="primary" size="small" loading={aprobar.isPending}>
              Aprobar
            </Button>
          </Popconfirm>
          <Button danger size="small" onClick={() => setARechazar(m)}>
            Rechazar
          </Button>
        </span>
      ),
    },
  ]

  const columnasHistorial: ColumnsType<MetaVenta> = [
    ...columnasBase,
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: EstadoMeta) => <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_META[e]}</Tag>,
    },
    { title: 'Motivo de rechazo', dataIndex: 'motivo_rechazo', render: (m: string | null) => m ?? '—' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Select
            value={anio}
            style={{ width: 110 }}
            onChange={(v) => {
              setAnio(v)
              setPagina(1)
            }}
            options={ANIOS_DISPONIBLES.map((a) => ({ value: a, label: String(a) }))}
          />
          <Button type="primary" onClick={() => setCreando(true)}>
            Crear meta
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        loading={metas.isLoading}
        dataSource={metas.data?.data ?? []}
        columns={tab === 'pendientes' ? columnasPendientes : columnasHistorial}
        pagination={{
          current: pagina,
          total: metas.data?.meta?.total ?? 0,
          pageSize: metas.data?.meta?.per_page ?? 20,
          onChange: setPagina,
          showSizeChanger: false,
        }}
      />

      <Modal
        title="Rechazar meta"
        open={aRechazar !== null}
        onCancel={() => {
          formRechazar.resetFields()
          setARechazar(null)
        }}
        onOk={() => void onRechazar()}
        okText="Rechazar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={rechazar.isPending}
        destroyOnHidden
      >
        <Form form={formRechazar} layout="vertical" requiredMark={false}>
          <Form.Item
            name="motivo"
            label="Motivo del rechazo (se notificará al JDV)"
            rules={[{ required: true, whitespace: true, message: 'El motivo es obligatorio' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <MetaVentaFormModal
        open={aEditar !== null}
        onClose={() => setAEditar(null)}
        modo="editar"
        tituloModal="Editar y aprobar meta"
        textoBoton="Guardar y aprobar"
        empleadosDisponibles={vendedores.data ?? []}
        metaAEditar={aEditar}
      />

      <MetaVentaFormModal
        open={creando}
        onClose={() => setCreando(false)}
        modo="nueva"
        tituloModal="Crear meta de venta"
        textoBoton="Crear meta"
        empleadosDisponibles={vendedores.data ?? []}
      />
    </>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 9: Integrar pestaña "Metas de venta" en `GerenciaPage`

**Files:**
- Modify: `src/pages/Gerencia/GerenciaPage.tsx`

**Interfaces:**
- Consumes: `BandejaMetasVenta` de Task 8.

- [ ] **Step 1: Reemplazar el contenido de `src/pages/Gerencia/GerenciaPage.tsx`**

```tsx
import { Tabs, Typography } from 'antd'
import { BandejaSolicitudes } from '@/components/BandejaSolicitudes'
import { BandejaMetasVenta } from '@/components/BandejaMetasVenta'

/** Vista Gerencia (contrato §5): bandeja de solicitudes y metas de venta con historial. */
export function GerenciaPage() {
  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
        Gerencia
      </Typography.Title>
      <span style={{ color: '#444750' }}>
        Solicitudes de aprobación y metas de venta dirigidas a Gerencia
      </span>
      <div style={{ marginTop: 16 }}>
        <Tabs
          items={[
            { key: 'solicitudes', label: 'Solicitudes', children: <BandejaSolicitudes /> },
            { key: 'metas', label: 'Metas de venta', children: <BandejaMetasVenta /> },
          ]}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Verificación visual rápida**

Run: `npm run dev`, iniciar sesión con un usuario `gerencia` o `admin`, ir a `/gerencia`. Deben verse dos pestañas ("Solicitudes", "Metas de venta"). En "Metas de venta": selector de año, botón "Crear meta" que abre el formulario de 12 meses, y pestañas internas Pendientes/Historial.

---

### Task 10: Vista JDV (`MisMetasEquipo`)

**Files:**
- Create: `src/components/MisMetasEquipo.tsx`

**Interfaces:**
- Consumes: `useMetasVenta` (Task 3); `useVendedoresAsignables` (`@/hooks/useCatalogos`); `MetaVentaFormModal` (Task 7); `ETIQUETA_ESTADO_META` (Task 4).
- Produces: `<MisMetasEquipo />` — consumido por Task 11.

- [ ] **Step 1: Crear `src/components/MisMetasEquipo.tsx`**

```tsx
import { useState } from 'react'
import { Button, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMetasVenta } from '@/hooks/useMetasVenta'
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
import type { EstadoMeta, MetaVenta } from '@/types'
import { ETIQUETA_ESTADO_META } from '@/utils/etiquetas'
import { formatoFecha, nombreCompleto } from '@/utils/formato'
import { MetaVentaFormModal } from './MetaVentaFormModal'

const COLOR_ESTADO: Record<EstadoMeta, string> = {
  propuesta: 'gold',
  aprobada: 'green',
  rechazada: 'red',
}

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS_DISPONIBLES = [ANIO_ACTUAL - 1, ANIO_ACTUAL, ANIO_ACTUAL + 1]

/**
 * Vista del JDV: propone metas para su equipo o para sí mismo. GET
 * /metas-venta sin filtro de id_empleado ya devuelve equipo + propia para
 * el rol jdv — no hay filtrado adicional del lado del frontend.
 */
export function MisMetasEquipo() {
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL)
  const [pagina, setPagina] = useState(1)
  const [proponiendo, setProponiendo] = useState(false)
  const [reproponiendo, setReproponiendo] = useState<MetaVenta | null>(null)

  const vendedores = useVendedoresAsignables()
  const metas = useMetasVenta({ anio, page: pagina })

  const columnas: ColumnsType<MetaVenta> = [
    { title: 'Vendedor', key: 'empleado', render: (_, m) => nombreCompleto(m.empleado) },
    { title: 'Año', dataIndex: 'anio' },
    { title: 'Meta anual', dataIndex: 'meta_anual', render: (v: number) => `${v} unidades` },
    {
      title: 'Estado',
      dataIndex: 'estado',
      render: (e: EstadoMeta) => <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_META[e]}</Tag>,
    },
    { title: 'Motivo de rechazo', dataIndex: 'motivo_rechazo', render: (m: string | null) => m ?? '—' },
    { title: 'Fecha', dataIndex: 'created_at', render: (f: string) => formatoFecha(f) },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, m) =>
        m.estado === 'rechazada' ? (
          <Button size="small" onClick={() => setReproponiendo(m)}>
            Volver a proponer
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Select
          value={anio}
          style={{ width: 110 }}
          onChange={(v) => {
            setAnio(v)
            setPagina(1)
          }}
          options={ANIOS_DISPONIBLES.map((a) => ({ value: a, label: String(a) }))}
        />
        <Button type="primary" onClick={() => setProponiendo(true)}>
          Proponer meta
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={metas.isLoading}
        dataSource={metas.data?.data ?? []}
        columns={columnas}
        pagination={{
          current: pagina,
          total: metas.data?.meta?.total ?? 0,
          pageSize: metas.data?.meta?.per_page ?? 20,
          onChange: setPagina,
          showSizeChanger: false,
        }}
      />

      <MetaVentaFormModal
        open={proponiendo}
        onClose={() => setProponiendo(false)}
        modo="nueva"
        tituloModal="Proponer meta de venta"
        textoBoton="Enviar propuesta"
        empleadosDisponibles={vendedores.data ?? []}
      />

      <MetaVentaFormModal
        open={reproponiendo !== null}
        onClose={() => setReproponiendo(null)}
        modo="nueva"
        tituloModal="Volver a proponer meta"
        textoBoton="Enviar propuesta"
        empleadosDisponibles={vendedores.data ?? []}
        metaAEditar={reproponiendo}
      />
    </>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 11: Integrar pestaña "Metas de venta" (solo jdv) en `SolicitudesPage`

**Files:**
- Modify: `src/pages/Solicitudes/SolicitudesPage.tsx`

**Interfaces:**
- Consumes: `MisMetasEquipo` de Task 10.

- [ ] **Step 1: Envolver la tabla existente en una pestaña condicional**

En `src/pages/Solicitudes/SolicitudesPage.tsx`, agregar el import:

```tsx
import { Tabs } from 'antd'
import { MisMetasEquipo } from '@/components/MisMetasEquipo'
```

(agregar `Tabs` al import existente de `'antd'` en vez de duplicar la línea de import).

Reemplazar el bloque final del `return` — desde `<Table ...` hasta el cierre de `<SolicitudDetalleModal ... />` (justo antes del `</div>` de cierre de `page-container`) — envolviendo ese contenido en una constante `contenidoSolicitudes` y renderizando condicionalmente:

```tsx
  const contenidoSolicitudes = (
    <>
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
    </>
  )

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

      {empleado?.rol === 'jdv' ? (
        <Tabs
          items={[
            { key: 'solicitudes', label: 'Solicitudes', children: contenidoSolicitudes },
            { key: 'metas', label: 'Metas de venta', children: <MisMetasEquipo /> },
          ]}
        />
      ) : (
        contenidoSolicitudes
      )}
    </div>
  )
}
```

Nota: el `<Select>` de filtro de estado de solicitudes queda fuera de las pestañas (aplica solo a la tabla de Solicitudes) — si se quiere ocultarlo cuando la pestaña activa es "Metas de venta" es una mejora opcional, no bloqueante: el filtro simplemente no tiene efecto visible mientras esa pestaña está abierta, ya que `contenidoSolicitudes` no se desmonta (antd `Tabs` mantiene los `children` de cada `items` renderizados, controlado por CSS `display: none` por defecto).

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Verificación visual rápida**

Run: `npm run dev`. Con usuario `jdv`, ir a `/solicitudes`: deben verse dos pestañas. Con usuario `vendedor` o `analista`, `/solicitudes` debe verse exactamente igual que antes (sin pestañas, tabla directa) — confirmar que no se rompió el flujo existente de Solicitudes.

---

### Task 12: Notificaciones — extender tipos y enrutamiento de clicks

**Files:**
- Modify: `src/types/notificacion.ts`
- Modify: `src/components/NotificacionesDropdown.tsx`

**Interfaces:**
- Produces: `TipoNotificacion` y `EntidadNotificacion` extendidos.

- [ ] **Step 1: Extender `TipoNotificacion` y `EntidadNotificacion` en `src/types/notificacion.ts`**

```ts
export type TipoNotificacion =
  | 'oportunidad_cambio_estado'
  | 'empresa_convertida'
  | 'evento_creado'
  | 'tarea_creada'
  | 'tarea_colaborador_agregado'
  | 'empresa_asignada'
  | 'oportunidad_traspasada'
  | 'tarea_recordatorio'
  | 'evento_recordatorio'
  | 'solicitud_creada'
  | 'solicitud_aprobada'
  | 'solicitud_denegada'
  | 'meta_propuesta'
  | 'meta_aprobada'
  | 'meta_rechazada'
  | 'meta_modificada'

export type EntidadNotificacion = 'oportunidad' | 'empresa' | 'solicitud' | 'meta'
```

- [ ] **Step 2: Enrutar el click de notificaciones de tipo `meta` en `NotificacionesDropdown.tsx`**

En `src/components/NotificacionesDropdown.tsx`, modificar la función `irANotificacion`:

```tsx
  const irANotificacion = (n: Notificacion) => {
    if (!n.leida) marcarLeida.mutate(n.id)
    setAbierto(false)
    if (n.entidad_tipo === 'solicitud' || n.entidad_tipo === 'meta') {
      // solicitud_creada / meta_propuesta llegan al aprobador; el resto al
      // solicitante/JDV. En ambos casos su vista vive en /gerencia
      // (gerencia/admin) o /solicitudes (jdv, incluye la pestaña Metas).
      navigate(tieneRol(empleado, ROLES_BANDEJA_GERENCIA) ? '/gerencia' : '/solicitudes')
      return
    }
    navigate(`/${n.entidad_tipo}s/${n.entidad_id}`)
  }
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

---

### Task 13: Verificación manual end-to-end

**Files:** (ninguno — solo verificación)

- [ ] **Step 1: Levantar el frontend contra el backend real**

Run: `npm run dev` (backend con el feature de metas ya desplegado, según el prompt original).

- [ ] **Step 2: Recorrer el checklist del prompt original**

Con al menos un usuario de cada rol (`admin`, `gerencia`, `jdv`, `vendedor`, `analista`; puede ser el mismo backend de pruebas si ya tiene semillas de cada rol), verificar:

1. El velocímetro no se renderiza en absoluto para `admin`/`gerencia`/`analista` en `/` (inspeccionar el DOM, no solo visualmente).
2. Con `vendedor`: aparece "Mi meta de venta" (mensual + anual). Si el vendedor no tiene meta ese periodo, el estado se ve distinto de "0%" (gris, "sin meta asignada").
3. Con `jdv`: aparecen "Mi meta de venta" **y** "Meta del equipo" como bloques separados.
4. Forzar (o encontrar en los datos de prueba) un caso con `porcentaje > 100`: el arco se ve lleno y en teal, con el badge "+X% sobre la meta".
5. En `/solicitudes` con `jdv`: pestaña "Metas de venta" — proponer una meta nueva (12 meses) para un vendedor del equipo → debe quedar en estado "Propuesta".
6. En `/gerencia` con `gerencia`/`admin`: pestaña "Metas de venta" — la propuesta anterior aparece en "Pendientes". Probar las 3 acciones: Aprobar (Popconfirm), Rechazar (modal, motivo obligatorio — confirmar que el botón OK no envía con el campo vacío), Editar y aprobar (formulario precargado, cambiar un mes y guardar).
7. Crear una meta directa desde Gerencia (botón "Crear meta") → debe quedar "Aprobada" de inmediato, sin pasar por pendientes.
8. Volver a `/` con el vendedor afectado por la meta recién aprobada: el medidor debe reflejar el cambio sin recargar manualmente el navegador más de una vez (confirma que la invalidación de `qk.inicio` funciona).
9. Repetir el flujo de propuesta con una meta que ya está `propuesta`/`aprobada` para el mismo vendedor/año → debe mostrar el mensaje de `META_YA_EXISTE`, no un error genérico.
10. Rechazar una propuesta y luego usar "Volver a proponer" desde `/solicitudes` (jdv) → el formulario debe precargar los 12 valores anteriores y el submit debe crear una propuesta nueva (no fallar con 409).
11. Confirmar que `/solicitudes` con `vendedor`/`analista` se ve exactamente igual que antes de esta feature (sin pestañas).
12. Con las DevTools abiertas en la pestaña Red: inspeccionar el body del `POST /metas-venta` (proponer o crear directo) y confirmar que siempre viaja con los 12 `meta_*` + `id_empleado` + `anio`, y que `meta_anual` **no** está presente en el body. Inspeccionar un `PATCH /metas-venta/:id` (editar un solo mes) y confirmar que el body trae únicamente el mes modificado, no los 12.
13. En el modal de rechazo, intentar guardar con el campo de motivo vacío → el formulario debe bloquear el submit en el cliente (mensaje "El motivo es obligatorio") sin llegar a golpear el backend.

- [ ] **Step 3: Confirmar `npm run type-check` y `npm run build` limpios de punta a punta**

Run: `npm run type-check && npm run build`
Expected: ambos comandos terminan sin errores.
