# Tareas — Colaboradores + selector de Responsable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick a Responsable and multiple Colaboradores (employees only) when creating/editing a Tarea, show colaboradores as chips wherever asignado is shown, and surface the new `tarea_colaborador_agregado` notification type.

**Architecture:** Extend the `Tarea`/`CrearTareaInput`/`ActualizarTareaInput` types with `ids_colaboradores`/`colaboradores`. Add one shared hook (`useEmpleadosSeleccionables`) that returns the correct employee pool per role (self-only for vendedor/analista, all active employees otherwise), and one shared component (`EmpleadoSelect`/`EmpleadoMultiSelect`) that both creation forms and the edit modal consume. No new endpoints, no API client changes — the existing `tareasApi` methods pass the new fields through generically.

**Tech Stack:** React 18 + TypeScript, Ant Design v5 (`Select`, `Form`), TanStack Query v5, Zustand (`useAuthStore`), dayjs.

## Global Constraints

- **No tests for this feature.** Confirmed decision (see `docs/superpowers/specs/2026-07-22-tareas-colaboradores-design.md`): the repo has no test framework installed (`npm test` is a no-op stub) and the user chose to match current practice rather than bootstrap one. Steps below verify with `npm run type-check` and `npm run lint` instead of a test runner.
- **No git repository exists in this project** (`git rev-parse --is-inside-work-tree` fails). Skip all `git add`/`git commit` steps from the standard task template — there is nothing to commit to. Each task ends with a type-check/lint verification instead.
- **TypeScript strict, no `any`.** Every new prop/return type must be explicit.
- Follow existing formatting conventions exactly (2-space indent, no semicolons omitted... match surrounding file style — these files use no trailing semicolons removed, standard Prettier-ish AntD/Tailwind style already in place).
- `docs/contrato_api.md` is already updated by the user — do not touch it.

---

### Task 1: Types — `ids_colaboradores`/`colaboradores` and new notification type

**Files:**
- Modify: `src/types/tarea.ts`
- Modify: `src/types/notificacion.ts`

**Interfaces:**
- Produces: `Tarea.ids_colaboradores: number[]`, `Tarea.colaboradores: EmpleadoResumen[]`, `CrearTareaInput.ids_colaboradores?: number[]`, `ActualizarTareaInput.ids_colaboradores?: number[]`, `TipoNotificacion` including `'tarea_colaborador_agregado'`. Every later task relies on these exact names.

- [ ] **Step 1: Edit `src/types/tarea.ts`**

Replace the full file content with:

```typescript
import type { EstadoAccion, TipoAccion } from './enums'
import type { EmpleadoResumen } from './empleado'

export interface Tarea {
  id: number
  id_empresa: number
  empresa: { id: number; razon_social: string }
  id_oportunidad: number | null
  id_contacto: number | null
  contacto: { id: number; nombres: string; apellidos: string } | null
  id_asignado: number
  asignado: EmpleadoResumen | null
  ids_colaboradores: number[]
  colaboradores: EmpleadoResumen[]
  tipo_accion: TipoAccion
  estado_accion: EstadoAccion
  descripcion: string
  fecha_ejecucion: string
  created_at: string
}

export interface TareasFiltros {
  id_empresa?: number
  id_oportunidad?: number
  estado_accion?: EstadoAccion
  id_asignado?: number
  solo_prospeccion?: boolean
  vencidas?: boolean
}

export interface CrearTareaInput {
  id_empresa: number
  id_oportunidad?: number | null
  id_contacto?: number | null
  id_asignado?: number | null
  ids_colaboradores?: number[]
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: string
}

export interface ActualizarTareaInput {
  tipo_accion?: TipoAccion
  descripcion?: string
  fecha_ejecucion?: string
  id_contacto?: number | null
  id_asignado?: number | null
  ids_colaboradores?: number[]
}
```

- [ ] **Step 2: Edit `src/types/notificacion.ts`**

Change the `TipoNotificacion` union (lines 3-14) from:

```typescript
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
```

to:

```typescript
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
```

- [ ] **Step 3: Verify**

Run: `npm run type-check`
Expected: fails now, because `TareaDetalleModal.tsx`, `TareasCard.tsx`, and `ActividadesPage.tsx` construct `Tarea`-adjacent objects/inputs that don't yet have the new required fields wired up — actually since `ids_colaboradores`/`colaboradores` are non-optional on `Tarea` but that type is only ever *received* from the API (never constructed by hand in this codebase), this step should in fact PASS with no new errors. Confirm output has zero errors before moving on. If it fails, check whether some file constructs a literal `Tarea` object (e.g. a mock) — none currently exist per the codebase exploration, so a failure here means something unexpected was found; investigate before continuing.

---

### Task 2: `useEmpleadosSeleccionables` hook

**Files:**
- Modify: `src/hooks/useCatalogos.ts`

**Interfaces:**
- Consumes: `useEmpleados(params?, enabled)` (existing, same file), `useAuthStore`, `tieneRol` from `@/store/authStore` (existing), `EmpleadoResumen` from `@/types`.
- Produces: `useEmpleadosSeleccionables(): EmpleadoResumen[]` — the exact pool every later task's employee selector consumes.

- [ ] **Step 1: Add the hook**

In `src/hooks/useCatalogos.ts`, change the import block (lines 1-12) from:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogoEventosApi, financiadorasApi, modelosApi } from '@/api/catalogos'
import { empleadosApi } from '@/api/empleados'
import type {
  ActualizarEmpleadoInput,
  CatalogoEventoInput,
  CrearEmpleadoInput,
  FinanciadoraInput,
  ModeloInput,
  Rol,
} from '@/types'
import { invalidar, qk } from './queryKeys'
```

to:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogoEventosApi, financiadorasApi, modelosApi } from '@/api/catalogos'
import { empleadosApi } from '@/api/empleados'
import { tieneRol, useAuthStore } from '@/store/authStore'
import type {
  ActualizarEmpleadoInput,
  CatalogoEventoInput,
  CrearEmpleadoInput,
  EmpleadoResumen,
  FinanciadoraInput,
  ModeloInput,
  Rol,
} from '@/types'
import { invalidar, qk } from './queryKeys'
```

Then, immediately after `useVendedoresAsignables` (after the closing brace of that function, before `export function useCrearEmpleado()`), insert:

```typescript
/**
 * Empleados que el usuario logueado puede elegir como responsable/colaborador
 * de una tarea (contrato §12: vendedor/analista solo pueden elegirse a sí
 * mismos; admin/gerencia/jdv pueden elegir a cualquier empleado activo).
 */
export function useEmpleadosSeleccionables(): EmpleadoResumen[] {
  const empleadoActual = useAuthStore((s) => s.empleado)
  const soloSelf = tieneRol(empleadoActual, ['vendedor', 'analista'])
  const empleados = useEmpleados({ activo: true }, !soloSelf)
  if (soloSelf) return empleadoActual ? [empleadoActual] : []
  return empleados.data ?? []
}
```

- [ ] **Step 2: Verify**

Run: `npm run type-check`
Expected: 0 errors. `EmpleadoResumen` and `Empleado` are structurally compatible (`Empleado extends EmpleadoResumen`), so returning `[empleadoActual]` (typed `Empleado`) where `EmpleadoResumen[]` is expected is valid.

---

### Task 3: `EmpleadoSelect` / `EmpleadoMultiSelect` shared component

**Files:**
- Create: `src/components/EmpleadoSelect.tsx`

**Interfaces:**
- Consumes: `EmpleadoResumen` from `@/types`, `nombreCompleto` from `@/utils/formato`, AntD `Select`.
- Produces: `EmpleadoSelect` (single-select) and `EmpleadoMultiSelect` (multi-select) React components, both used by Task 4, 5, and 6.

- [ ] **Step 1: Create the file**

```tsx
import { Select } from 'antd'
import type { EmpleadoResumen } from '@/types'
import { nombreCompleto } from '@/utils/formato'

function opciones(empleados: EmpleadoResumen[]) {
  return empleados.map((e) => ({ value: e.id, label: nombreCompleto(e) }))
}

interface EmpleadoSelectProps {
  empleados: EmpleadoResumen[]
  value?: number
  onChange?: (value: number | undefined) => void
  autoFocus?: boolean
  allowClear?: boolean
  placeholder?: string
}

/** Select de un solo empleado (para "Responsable"/`id_asignado`). */
export function EmpleadoSelect({
  empleados,
  value,
  onChange,
  autoFocus,
  allowClear,
  placeholder,
}: EmpleadoSelectProps) {
  return (
    <Select
      autoFocus={autoFocus}
      allowClear={allowClear}
      placeholder={placeholder}
      style={{ width: '100%' }}
      showSearch
      optionFilterProp="label"
      value={value}
      onChange={onChange}
      options={opciones(empleados)}
    />
  )
}

interface EmpleadoMultiSelectProps {
  empleados: EmpleadoResumen[]
  value?: number[]
  onChange?: (value: number[]) => void
  autoFocus?: boolean
  placeholder?: string
}

/** Select de varios empleados (para "Colaboradores"/`ids_colaboradores`). */
export function EmpleadoMultiSelect({
  empleados,
  value,
  onChange,
  autoFocus,
  placeholder,
}: EmpleadoMultiSelectProps) {
  return (
    <Select
      mode="multiple"
      autoFocus={autoFocus}
      placeholder={placeholder}
      style={{ width: '100%' }}
      showSearch
      optionFilterProp="label"
      value={value}
      onChange={onChange}
      options={opciones(empleados)}
    />
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run type-check`
Expected: 0 errors.

---

### Task 4: `TareaDetalleModal.tsx` — Colaboradores field + Responsable pool change

**Files:**
- Modify: `src/components/TareaDetalleModal.tsx`

**Interfaces:**
- Consumes: `EmpleadoSelect`, `EmpleadoMultiSelect` from `@/components/EmpleadoSelect` (Task 3), `EmpleadoResumen` from `@/types` (Task 1), `iniciales`/`nombreCompleto` from `@/utils/formato` (existing).
- Produces: `TareaDetalleModal` now requires `empleados: EmpleadoResumen[]` (no longer optional/`undefined`) — Task 5 and 6 must update their call sites accordingly.

- [ ] **Step 1: Replace the full file content**

```tsx
import { useEffect, useState } from 'react'
import { App, Button, DatePicker, Input, Modal, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { mensajeDeError } from '@/api/client'
import type { ActualizarTareaInput, EmpleadoResumen, Tarea, TipoAccion } from '@/types'
import { ETIQUETA_ESTADO_ACCION, ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { formatoFechaHora, iniciales, nombreCompleto } from '@/utils/formato'
import { CampoEditable } from './CampoEditable'
import { EmpleadoMultiSelect, EmpleadoSelect } from './EmpleadoSelect'

type ContactoOpcion = { id: number; nombres: string; apellidos: string }

interface Props {
  /** Tarea a mostrar; `null` mantiene el modal cerrado */
  tarea: Tarea | null
  onClose: () => void
  /** Persiste los cambios (PUT /tareas/:id). Debe rechazar en error. */
  onSave: (input: ActualizarTareaInput) => Promise<unknown>
  guardando: boolean
  /** Contactos seleccionables para `id_contacto`. Si no se pasan, el campo es de solo lectura. */
  contactos?: ContactoOpcion[]
  /** Empleados que el usuario logueado puede elegir como responsable/colaborador (ver useEmpleadosSeleccionables). */
  empleados: EmpleadoResumen[]
  /** Navega al detalle relacionado (opcional, se muestra como enlace en el pie) */
  irADetalle?: () => void
}

interface Borrador {
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_contacto: number | null
  id_asignado: number
  ids_colaboradores: number[]
}

type Campo = keyof Borrador

function mismoConjunto(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((x) => setB.has(x))
}

/**
 * Ficha de una tarea con edición campo a campo (lápiz sutil por campo).
 * Solo las tareas `pendiente` son editables (según contrato PUT /tareas/:id).
 * Cerrar sin guardar descarta los cambios.
 */
export function TareaDetalleModal({
  tarea,
  onClose,
  onSave,
  guardando,
  contactos,
  empleados,
  irADetalle,
}: Props) {
  const { message } = App.useApp()
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [editando, setEditando] = useState<Record<Campo, boolean>>({
    tipo_accion: false,
    descripcion: false,
    fecha_ejecucion: false,
    id_contacto: false,
    id_asignado: false,
    ids_colaboradores: false,
  })

  // Reinicia el borrador cada vez que se abre otra tarea (o se reabre la misma)
  useEffect(() => {
    if (!tarea) return
    setBorrador({
      tipo_accion: tarea.tipo_accion,
      descripcion: tarea.descripcion,
      fecha_ejecucion: dayjs(tarea.fecha_ejecucion),
      id_contacto: tarea.id_contacto,
      id_asignado: tarea.id_asignado,
      ids_colaboradores: tarea.ids_colaboradores,
    })
    setEditando({
      tipo_accion: false,
      descripcion: false,
      fecha_ejecucion: false,
      id_contacto: false,
      id_asignado: false,
      ids_colaboradores: false,
    })
  }, [tarea])

  if (!tarea || !borrador) {
    return <Modal open={false} footer={null} />
  }

  const esPendiente = tarea.estado_accion === 'pendiente'
  const puedeEditarContacto = esPendiente && !!contactos
  const puedeEditarAsignado = esPendiente
  const puedeEditarColaboradores = esPendiente

  const toggle = (campo: Campo) => setEditando((e) => ({ ...e, [campo]: !e[campo] }))
  const set = <K extends Campo>(campo: K, valor: Borrador[K]) =>
    setBorrador((b) => (b ? { ...b, [campo]: valor } : b))

  const cambios: ActualizarTareaInput = {}
  if (borrador.tipo_accion !== tarea.tipo_accion) cambios.tipo_accion = borrador.tipo_accion
  if (borrador.descripcion !== tarea.descripcion) cambios.descripcion = borrador.descripcion
  if (!borrador.fecha_ejecucion.isSame(dayjs(tarea.fecha_ejecucion)))
    cambios.fecha_ejecucion = borrador.fecha_ejecucion.toISOString()
  if (borrador.id_contacto !== tarea.id_contacto) cambios.id_contacto = borrador.id_contacto
  if (borrador.id_asignado !== tarea.id_asignado) cambios.id_asignado = borrador.id_asignado
  if (!mismoConjunto(borrador.ids_colaboradores, tarea.ids_colaboradores))
    cambios.ids_colaboradores = borrador.ids_colaboradores
  const hayCambios = Object.keys(cambios).length > 0

  const guardar = async () => {
    if (!hayCambios) {
      onClose()
      return
    }
    try {
      await onSave(cambios)
      message.success('Tarea actualizada')
      onClose()
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo actualizar la tarea'))
    }
  }

  const buscarEmpleado = (id: number): EmpleadoResumen | null =>
    empleados.find((e) => e.id === id) ?? tarea.colaboradores.find((c) => c.id === id) ?? null

  return (
    <Modal
      title={`Tarea ID-${tarea.id}`}
      open
      onCancel={onClose}
      width={560}
      footer={
        <div className="flex items-center justify-between">
          <span>
            {irADetalle && (
              <Button type="link" onClick={irADetalle} style={{ paddingLeft: 0 }}>
                Ver detalle relacionado
              </Button>
            )}
          </span>
          <span className="flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            {esPendiente && (
              <Button type="primary" loading={guardando} disabled={!hayCambios} onClick={() => void guardar()}>
                Guardar
              </Button>
            )}
          </span>
        </div>
      }
    >
      {!esPendiente && (
        <p className="text-body-md text-on-surface-variant mb-4">
          Esta tarea está <strong>{ETIQUETA_ESTADO_ACCION[tarea.estado_accion].toLowerCase()}</strong>; solo las
          tareas pendientes se pueden editar.
        </p>
      )}

      <div className="grid grid-cols-2 gap-y-5 gap-x-8">
        <CampoEditable label="Empresa" ancho display={tarea.empresa.razon_social} />

        <CampoEditable
          label="Tipo de acción"
          editable={esPendiente}
          enEdicion={editando.tipo_accion}
          onToggle={() => toggle('tipo_accion')}
          display={ETIQUETA_TIPO_ACCION[borrador.tipo_accion]}
          edit={
            <Select
              autoFocus
              style={{ width: '100%' }}
              value={borrador.tipo_accion}
              onChange={(v) => set('tipo_accion', v)}
              options={Object.entries(ETIQUETA_TIPO_ACCION).map(([value, label]) => ({ value, label }))}
            />
          }
        />

        <CampoEditable
          label="Fecha y hora"
          editable={esPendiente}
          enEdicion={editando.fecha_ejecucion}
          onToggle={() => toggle('fecha_ejecucion')}
          display={formatoFechaHora(borrador.fecha_ejecucion.toISOString())}
          edit={
            <DatePicker
              autoFocus
              style={{ width: '100%' }}
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              allowClear={false}
              value={borrador.fecha_ejecucion}
              onChange={(v) => v && set('fecha_ejecucion', v)}
            />
          }
        />

        <CampoEditable
          label="Contacto"
          editable={puedeEditarContacto}
          enEdicion={editando.id_contacto}
          onToggle={() => toggle('id_contacto')}
          display={
            borrador.id_contacto
              ? (contactos?.find((c) => c.id === borrador.id_contacto)
                  ? nombreCompleto(contactos.find((c) => c.id === borrador.id_contacto))
                  : nombreCompleto(tarea.contacto))
              : '—'
          }
          edit={
            <Select
              autoFocus
              allowClear
              style={{ width: '100%' }}
              placeholder="Sin contacto"
              value={borrador.id_contacto ?? undefined}
              onChange={(v) => set('id_contacto', v ?? null)}
              options={(contactos ?? []).map((c) => ({ value: c.id, label: nombreCompleto(c) }))}
            />
          }
        />

        <CampoEditable
          label="Asignado"
          editable={puedeEditarAsignado}
          enEdicion={editando.id_asignado}
          onToggle={() => toggle('id_asignado')}
          display={nombreCompleto(buscarEmpleado(borrador.id_asignado) ?? tarea.asignado)}
          edit={
            <EmpleadoSelect
              autoFocus
              empleados={empleados}
              value={borrador.id_asignado}
              onChange={(v) => v !== undefined && set('id_asignado', v)}
            />
          }
        />

        <CampoEditable label="Estado" display={ETIQUETA_ESTADO_ACCION[tarea.estado_accion]} />

        <CampoEditable
          label="Colaboradores"
          ancho
          editable={puedeEditarColaboradores}
          enEdicion={editando.ids_colaboradores}
          onToggle={() => toggle('ids_colaboradores')}
          display={
            borrador.ids_colaboradores.length === 0 ? (
              '—'
            ) : (
              <div className="flex -space-x-2">
                {borrador.ids_colaboradores.map((id) => {
                  const c = buscarEmpleado(id)
                  return (
                    <div
                      key={id}
                      title={nombreCompleto(c)}
                      className="w-6 h-6 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center text-[10px] font-bold"
                    >
                      {iniciales(c?.nombres, c?.apellidos)}
                    </div>
                  )
                })}
              </div>
            )
          }
          edit={
            <EmpleadoMultiSelect
              autoFocus
              empleados={empleados}
              value={borrador.ids_colaboradores}
              onChange={(v) => set('ids_colaboradores', v)}
            />
          }
        />

        <CampoEditable
          label="Descripción"
          ancho
          editable={esPendiente}
          enEdicion={editando.descripcion}
          onToggle={() => toggle('descripcion')}
          display={borrador.descripcion || '—'}
          edit={
            <Input.TextArea
              autoFocus
              rows={3}
              value={borrador.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          }
        />
      </div>
    </Modal>
  )
}
```

Note: `Select` is still used directly for `tipo_accion` and `id_contacto` (unrelated to employees), so the import from `antd` keeps `Select` alongside `App, Button, DatePicker, Input, Modal`.

- [ ] **Step 2: Verify**

Run: `npm run type-check`
Expected: errors in `TareasCard.tsx` and `ActividadesPage.tsx` only (they still pass `empleados={esSupervision ? empleados.data : undefined}`, which is now the wrong shape/type) — confirms the prop-type tightening took effect. Fixed in Tasks 5 and 6.

---

### Task 5: `TareasCard.tsx` — Responsable/Colaboradores in create form, badges in list, pool switch

**Files:**
- Modify: `src/pages/OportunidadDetalle/TareasCard.tsx`

**Interfaces:**
- Consumes: `useEmpleadosSeleccionables` (Task 2), `EmpleadoSelect`/`EmpleadoMultiSelect` (Task 3), tightened `TareaDetalleModal` props (Task 4), `nombreCompleto`/`iniciales` (existing).

- [ ] **Step 1: Replace the full file content**

```tsx
import { useState } from 'react'
import { App, DatePicker, Form, Input, Modal, Popconfirm, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  useActualizarTarea,
  useCancelarTarea,
  useCompletarTarea,
  useCrearTarea,
  useTareas,
} from '@/hooks/useEventosTareas'
import { useEmpleadosSeleccionables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { OportunidadDetalle, Tarea, TipoAccion } from '@/types'
import { ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { TareaDetalleModal } from '@/components/TareaDetalleModal'
import { EmpleadoMultiSelect, EmpleadoSelect } from '@/components/EmpleadoSelect'

interface FormValues {
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_contacto?: number
  id_asignado?: number
  ids_colaboradores?: number[]
}

/** Sección de tareas con los task-items del prototipo gestión_de_actividades */
export function TareasCard({ oportunidad: o }: { oportunidad: OportunidadDetalle }) {
  const { message } = App.useApp()
  const [modalNueva, setModalNueva] = useState(false)
  const [tareaSel, setTareaSel] = useState<Tarea | null>(null)
  const [form] = Form.useForm<FormValues>()

  const empleados = useEmpleadosSeleccionables()

  const tareas = useTareas({ id_oportunidad: o.id })
  const crear = useCrearTarea()
  const completar = useCompletarTarea(o.id)
  const cancelar = useCancelarTarea(o.id)
  const actualizar = useActualizarTarea(o.id)

  const lista = tareas.data ?? []
  const pendientes = lista.filter((t) => t.estado_accion === 'pendiente')
  const historicas = lista.filter((t) => t.estado_accion !== 'pendiente')

  const onCrear = async () => {
    const v = await form.validateFields()
    try {
      await crear.mutateAsync({
        id_empresa: o.id_empresa,
        id_oportunidad: o.id,
        id_contacto: v.id_contacto ?? null,
        id_asignado: v.id_asignado ?? null,
        ids_colaboradores: v.ids_colaboradores ?? [],
        tipo_accion: v.tipo_accion,
        descripcion: v.descripcion,
        fecha_ejecucion: v.fecha_ejecucion.toISOString(),
      })
      message.success('Tarea creada')
      form.resetFields()
      setModalNueva(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo crear la tarea'))
    }
  }

  return (
    <section className="bg-surface-container-low rounded-lg border border-border-subtle flex flex-col">
      <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-container-lowest rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            assignment
          </span>
          <h2 className="font-headline-md text-headline-md">Tareas</h2>
        </div>
        <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-md font-bold">
          {pendientes.length} Active
        </span>
      </div>

      <div className="flex-grow p-4 space-y-3 custom-scrollbar">
        {pendientes.length === 0 && !tareas.isLoading && (
          <p className="text-center text-on-surface-variant py-4">Sin tareas pendientes</p>
        )}
        {pendientes.map((t) => (
          <TareaItem
            key={t.id}
            tarea={t}
            onAbrir={() => setTareaSel(t)}
            onCompletar={() =>
              completar.mutate(
                { id: t.id },
                {
                  onSuccess: () => message.success('Tarea completada'),
                  onError: (e) => message.error(mensajeDeError(e)),
                },
              )
            }
            onCancelar={() =>
              cancelar.mutate(t.id, {
                onSuccess: () => message.success('Tarea cancelada'),
                onError: (e) => message.error(mensajeDeError(e)),
              })
            }
          />
        ))}

        {/* Historial colapsado por defecto */}
        {historicas.length > 0 && (
          <details>
            <summary className="cursor-pointer text-primary font-bold text-label-md uppercase tracking-widest py-2">
              Historial ({historicas.length})
            </summary>
            <div className="space-y-3 mt-2">
              {historicas.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-3 border border-border-subtle rounded-lg opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => setTareaSel(t)}
                >
                  <h3
                    className={`font-bold text-on-surface mb-1 ${t.estado_accion === 'cancelada' ? 'line-through' : ''}`}
                  >
                    {t.descripcion}
                  </h3>
                  <div className="flex items-center gap-1.5 text-label-md text-text-muted">
                    <span className="material-symbols-outlined text-[14px]">
                      {t.estado_accion === 'completada' ? 'check_circle' : 'cancel'}
                    </span>
                    {t.estado_accion} · {dayjs(t.fecha_ejecucion).format('DD MMM YYYY')}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="p-4 border-t border-border-subtle">
        <button
          className="w-full text-primary font-bold text-button flex items-center justify-center gap-2 hover:bg-surface-container transition-colors py-2 rounded-lg"
          onClick={() => setModalNueva(true)}
        >
          <span className="material-symbols-outlined">add_circle</span>
          Quick Task
        </button>
      </div>

      <TareaDetalleModal
        tarea={tareaSel}
        onClose={() => setTareaSel(null)}
        onSave={(input) => actualizar.mutateAsync({ id: tareaSel!.id, input })}
        guardando={actualizar.isPending}
        contactos={o.contactos}
        empleados={empleados}
      />

      <Modal
        title="Nueva tarea"
        open={modalNueva}
        onCancel={() => setModalNueva(false)}
        onOk={() => void onCrear()}
        okText="Crear tarea"
        cancelText="Cancelar"
        confirmLoading={crear.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ tipo_accion: 'llamada' }}>
          <Form.Item name="tipo_accion" label="Tipo de acción" rules={[{ required: true, message: 'Requerido' }]}>
            <Select options={Object.entries(ETIQUETA_TIPO_ACCION).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, message: 'Requerido' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="fecha_ejecucion" label="Fecha y hora" rules={[{ required: true, message: 'Requerido' }]}>
            <DatePicker style={{ width: '100%' }} showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="id_contacto" label="Contacto">
            <Select
              allowClear
              options={o.contactos.map((c) => ({ value: c.id, label: `${c.nombres} ${c.apellidos}` }))}
            />
          </Form.Item>
          <Form.Item name="id_asignado" label="Responsable">
            <EmpleadoSelect empleados={empleados} allowClear placeholder="Te asignas a ti mismo si lo dejas vacío" />
          </Form.Item>
          <Form.Item name="ids_colaboradores" label="Colaboradores">
            <EmpleadoMultiSelect empleados={empleados} placeholder="Sin colaboradores" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

/** Task item literal del prototipo */
function TareaItem({
  tarea: t,
  onAbrir,
  onCompletar,
  onCancelar,
}: {
  tarea: Tarea
  onAbrir: () => void
  onCompletar: () => void
  onCancelar: () => void
}) {
  const vencida = dayjs(t.fecha_ejecucion).isBefore(dayjs())
  return (
    <div
      className="bg-white p-3 border border-border-subtle rounded-lg hover:border-primary transition-all group cursor-pointer"
      onClick={onAbrir}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-label-md font-label-md text-text-muted">ID-{t.id}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="material-symbols-outlined text-[18px] text-outline hover:text-primary"
            title="Completar"
            onClick={onCompletar}
          >
            check_circle
          </button>
          <Popconfirm title="¿Cancelar esta tarea?" okText="Sí, cancelar" cancelText="No" onConfirm={onCancelar}>
            <button className="material-symbols-outlined text-[18px] text-outline hover:text-error" title="Cancelar">
              cancel
            </button>
          </Popconfirm>
        </div>
      </div>
      <h3 className="font-bold text-on-surface mb-1">{ETIQUETA_TIPO_ACCION[t.tipo_accion]}</h3>
      <p className="text-body-md text-text-muted line-clamp-1">{t.descripcion}</p>
      <div className="mt-3 flex items-center justify-between">
        {vencida ? (
          <div className="flex items-center gap-1.5 text-label-md text-error">
            <span className="material-symbols-outlined text-[14px]">priority_high</span>
            Vencida · {dayjs(t.fecha_ejecucion).format('DD MMM, HH:mm')}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-label-md text-primary">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {dayjs(t.fecha_ejecucion).format('DD MMM, HH:mm')}
          </div>
        )}
        <div className="flex -space-x-2">
          <div
            title={nombreCompleto(t.asignado)}
            className="w-6 h-6 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center text-[10px] font-bold"
          >
            {iniciales(t.asignado?.nombres, t.asignado?.apellidos)}
          </div>
          {t.colaboradores.slice(0, 3).map((c) => (
            <div
              key={c.id}
              title={nombreCompleto(c)}
              className="w-6 h-6 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center text-[10px] font-bold"
            >
              {iniciales(c.nombres, c.apellidos)}
            </div>
          ))}
          {t.colaboradores.length > 3 && (
            <div
              title={`${t.colaboradores.length - 3} colaborador(es) más`}
              className="w-6 h-6 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center text-[9px] font-bold"
            >
              +{t.colaboradores.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run type-check`
Expected: 0 errors from this file. (`ActividadesPage.tsx` will still error until Task 6.)

---

### Task 6: `ActividadesPage.tsx` — Responsable/Colaboradores in create form, badges in list, pool switch

**Files:**
- Modify: `src/pages/Actividades/ActividadesPage.tsx`

**Interfaces:**
- Consumes: same as Task 5 (`useEmpleadosSeleccionables`, `EmpleadoSelect`, `EmpleadoMultiSelect`, tightened `TareaDetalleModal` props).

- [ ] **Step 1: Replace the full file content**

```tsx
import { useState } from 'react'
import { App, DatePicker, Form, Input, Modal, Popconfirm, Select } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  useActualizarTarea,
  useCancelarTarea,
  useCompletarTarea,
  useCrearTarea,
  useTareas,
} from '@/hooks/useEventosTareas'
import { useInicio } from '@/hooks/usePantallas'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useEmpleadosSeleccionables } from '@/hooks/useCatalogos'
import { mensajeDeError } from '@/api/client'
import type { Tarea, TipoAccion } from '@/types'
import { ETIQUETA_TIPO_ACCION } from '@/utils/etiquetas'
import { iniciales, nombreCompleto } from '@/utils/formato'
import { Cargando, ErrorCarga } from '@/components/Estados'
import { TareaDetalleModal } from '@/components/TareaDetalleModal'
import { EmpleadoMultiSelect, EmpleadoSelect } from '@/components/EmpleadoSelect'

interface FormValues {
  id_empresa: number
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: Dayjs
  id_asignado?: number
  ids_colaboradores?: number[]
}

/** Pantalla de actividades según el prototipo gestión_de_actividades (paleta teal) */
export function ActividadesPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [modalNueva, setModalNueva] = useState(false)
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('')
  const [tareaSel, setTareaSel] = useState<Tarea | null>(null)
  const [form] = Form.useForm<FormValues>()

  const empleados = useEmpleadosSeleccionables()

  const tareas = useTareas({ estado_accion: 'pendiente' })
  const inicio = useInicio()
  const empresas = useEmpresas(
    busquedaEmpresa.trim().length >= 2 ? { q: busquedaEmpresa } : undefined,
  )
  const crear = useCrearTarea()
  const completar = useCompletarTarea()
  const cancelar = useCancelarTarea()
  const actualizar = useActualizarTarea()

  const pendientes = tareas.data ?? []
  const eventos = inicio.data?.eventos_por_seguir ?? []

  const onCrear = async () => {
    const v = await form.validateFields()
    try {
      await crear.mutateAsync({
        id_empresa: v.id_empresa,
        id_asignado: v.id_asignado ?? null,
        ids_colaboradores: v.ids_colaboradores ?? [],
        tipo_accion: v.tipo_accion,
        descripcion: v.descripcion,
        fecha_ejecucion: v.fecha_ejecucion.toISOString(),
      })
      message.success('Tarea creada')
      form.resetFields()
      setModalNueva(false)
    } catch (e) {
      message.error(mensajeDeError(e, 'No se pudo crear la tarea'))
    }
  }

  return (
    <div className="proto-teal bg-surface min-h-full font-body-md text-body-md text-on-background">
      <div className="p-8 max-w-container-max mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Gestión de Actividades</h1>
          <p className="text-text-muted">
            Tareas del vendedor y eventos operativos externos en seguimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Tareas (col 4) */}
          <section className="lg:col-span-4 bg-surface-container-low rounded-lg border border-border-subtle flex flex-col">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-container-lowest rounded-t-lg">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  assignment
                </span>
                <h2 className="font-headline-md text-headline-md">Tareas</h2>
              </div>
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-md font-bold">
                {pendientes.length} Active
              </span>
            </div>
            <div className="flex-grow p-4 space-y-3 custom-scrollbar max-h-[calc(100vh-280px)] overflow-y-auto">
              {tareas.isLoading && <Cargando />}
              {tareas.isError && (
                <ErrorCarga error={tareas.error} onReintentar={() => void tareas.refetch()} />
              )}
              {pendientes.length === 0 && !tareas.isLoading && !tareas.isError && (
                <p className="text-center text-on-surface-variant py-6">Sin tareas pendientes 🎉</p>
              )}
              {pendientes.map((t) => {
                const vencida = dayjs(t.fecha_ejecucion).isBefore(dayjs())
                return (
                  <div
                    key={t.id}
                    className="bg-white p-3 border border-border-subtle rounded-lg hover:border-primary transition-all group cursor-pointer"
                    onClick={() => setTareaSel(t)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-label-md font-label-md text-text-muted">ID-{t.id}</span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="material-symbols-outlined text-[18px] text-outline hover:text-primary"
                          title="Completar"
                          onClick={() =>
                            completar.mutate(
                              { id: t.id },
                              {
                                onSuccess: () => message.success('Tarea completada'),
                                onError: (e) => message.error(mensajeDeError(e)),
                              },
                            )
                          }
                        >
                          check_circle
                        </button>
                        <Popconfirm
                          title="¿Cancelar esta tarea?"
                          okText="Sí, cancelar"
                          cancelText="No"
                          onConfirm={() =>
                            cancelar.mutate(t.id, {
                              onSuccess: () => message.success('Tarea cancelada'),
                              onError: (e) => message.error(mensajeDeError(e)),
                            })
                          }
                        >
                          <button
                            className="material-symbols-outlined text-[18px] text-outline hover:text-error"
                            title="Cancelar"
                          >
                            cancel
                          </button>
                        </Popconfirm>
                      </div>
                    </div>
                    <h3 className="font-bold text-on-surface mb-1">{ETIQUETA_TIPO_ACCION[t.tipo_accion]}</h3>
                    <p className="text-body-md text-text-muted line-clamp-1">
                      {t.descripcion} — {t.empresa.razon_social}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      {vencida ? (
                        <div className="flex items-center gap-1.5 text-label-md text-error">
                          <span className="material-symbols-outlined text-[14px]">priority_high</span>
                          Overdue
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-label-md text-primary">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {dayjs(t.fecha_ejecucion).format('DD MMM, HH:mm')}
                        </div>
                      )}
                      <div className="flex -space-x-2">
                        <div
                          title={nombreCompleto(t.asignado)}
                          className="w-6 h-6 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center text-[10px] font-bold"
                        >
                          {iniciales(t.asignado?.nombres, t.asignado?.apellidos)}
                        </div>
                        {t.colaboradores.slice(0, 3).map((c) => (
                          <div
                            key={c.id}
                            title={nombreCompleto(c)}
                            className="w-6 h-6 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center text-[10px] font-bold"
                          >
                            {iniciales(c.nombres, c.apellidos)}
                          </div>
                        ))}
                        {t.colaboradores.length > 3 && (
                          <div
                            title={`${t.colaboradores.length - 3} colaborador(es) más`}
                            className="w-6 h-6 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center text-[9px] font-bold"
                          >
                            +{t.colaboradores.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-border-subtle">
              <button
                className="w-full text-primary font-bold text-button flex items-center justify-center gap-2 hover:bg-surface-container transition-colors py-2 rounded-lg"
                onClick={() => setModalNueva(true)}
              >
                <span className="material-symbols-outlined">add_circle</span>
                Quick Task
              </button>
            </div>
          </section>

          {/* Eventos (col 8) */}
          <section className="lg:col-span-8 space-y-gutter">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  hub
                </span>
                <h2 className="font-headline-md text-headline-md">Eventos Operativos</h2>
              </div>
            </div>

            {inicio.isLoading && <Cargando />}
            {eventos.length === 0 && !inicio.isLoading && (
              <div className="bg-white border border-border-subtle rounded-lg p-8 text-center text-text-muted">
                Sin eventos por seguir
              </div>
            )}
            {eventos.map((ev) => {
              const fecha = dayjs(ev.fecha_seguimiento)
              return (
                <div
                  key={ev.id}
                  className="bg-white border border-border-subtle rounded-lg overflow-hidden flex flex-col sm:flex-row transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]"
                >
                  <div className="w-full sm:w-48 bg-surface-container-low p-6 flex flex-col justify-center items-center text-center border-b sm:border-b-0 sm:border-r border-border-subtle">
                    <div className="text-label-md font-bold text-text-muted mb-1 uppercase tracking-widest">
                      {fecha.format('MMM YYYY')}
                    </div>
                    <div
                      className={`text-[48px] font-bold leading-none ${ev.seguimiento_vencido ? 'text-error' : 'text-tertiary'}`}
                    >
                      {fecha.format('DD')}
                    </div>
                    <div
                      className={`text-label-md font-bold mt-1 ${ev.seguimiento_vencido ? 'text-error' : 'text-tertiary'}`}
                    >
                      {ev.seguimiento_vencido ? 'Vencido' : 'Pending'}
                    </div>
                  </div>
                  <div className="flex-grow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-label-md font-bold mb-3">
                          <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                          {ev.empresa.razon_social}
                        </div>
                        <h3 className="text-headline-md font-bold text-on-surface">{ev.nombre}</h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 border-t border-border-subtle pt-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline text-[20px]">event</span>
                        <span className="text-body-md font-medium text-on-surface">
                          Seguimiento: {fecha.format('DD MMM YYYY')}
                        </span>
                      </div>
                      <button
                        className="ml-auto text-primary font-bold text-button hover:underline"
                        onClick={() =>
                          navigate(
                            ev.id_oportunidad
                              ? `/oportunidades/${ev.id_oportunidad}`
                              : `/empresas/${ev.empresa.id}`,
                          )
                        }
                      >
                        Follow-up
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        </div>
      </div>

      {/* FAB del prototipo */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
        onClick={() => setModalNueva(true)}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <TareaDetalleModal
        tarea={tareaSel}
        onClose={() => setTareaSel(null)}
        onSave={(input) => actualizar.mutateAsync({ id: tareaSel!.id, input })}
        guardando={actualizar.isPending}
        empleados={empleados}
        irADetalle={
          tareaSel
            ? () => {
                const t = tareaSel
                setTareaSel(null)
                navigate(t.id_oportunidad ? `/oportunidades/${t.id_oportunidad}` : `/empresas/${t.id_empresa}`)
              }
            : undefined
        }
      />

      <Modal
        title="Nueva tarea"
        open={modalNueva}
        onCancel={() => setModalNueva(false)}
        onOk={() => void onCrear()}
        okText="Crear tarea"
        cancelText="Cancelar"
        confirmLoading={crear.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ tipo_accion: 'llamada' }}>
          <Form.Item name="id_empresa" label="Empresa" rules={[{ required: true, message: 'Requerido' }]}>
            <Select
              showSearch
              filterOption={false}
              onSearch={setBusquedaEmpresa}
              placeholder="Busca por razón social o RUC"
              options={(empresas.data?.data ?? []).map((e) => ({ value: e.id, label: e.razon_social }))}
              loading={empresas.isFetching}
              notFoundContent={
                busquedaEmpresa.trim().length < 2 ? 'Escribe al menos 2 caracteres' : undefined
              }
            />
          </Form.Item>
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
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run type-check` then `npm run lint`
Expected: 0 errors in both. This is the last task, so also run `npm run build` to confirm the whole app still compiles end-to-end.

---

### Task 7: `EmpresaDetallePage.tsx` — third `TareaDetalleModal` caller (discovered during Batch B implementation, missing from the original plan)

**Why this task exists:** the original plan (Tasks 1-6) only accounted for two `TareaDetalleModal` callers (`TareasCard.tsx`, `ActividadesPage.tsx`). During implementation of Task 4 (tightening `TareaDetalleModal`'s `empleados` prop from optional to required `EmpleadoResumen[]`), a third caller was found: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx:674-681`. It reuses the `empleados` variable from `useVendedoresAsignables(esSupervision)` — a hook call that exists for a *different, unrelated* feature on this page (reassigning `empresa.id_vendedor`, the "Vendedor Asignado" native `<select>` around line 301-337) — and passes `esSupervision ? empleados.data : undefined` into `TareaDetalleModal`'s `empleados` prop. That reused variable does not match the new required `EmpleadoResumen[]` shape and does not apply the self-only-for-vendedor/analista rule via `useEmpleadosSeleccionables` like Tasks 5/6 do elsewhere.

This page does not create tasks (no "Nueva tarea" form here — confirmed no `useCrearTarea`/`CrearTareaInput` usage in this file) and does not render asignado/colaborador badges in its tarea timeline (the tarea rows at lines 547-564 show only `descripcion` and `fecha_ejecucion`, no avatar). So the only change needed is the modal wiring — no new form fields, no badges.

**Files:**
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`

**Interfaces:**
- Consumes: `useEmpleadosSeleccionables` from `@/hooks/useCatalogos` (Task 2, already implemented).
- Does NOT touch `useVendedoresAsignables` or the `empleados`/`esSupervision` variables already used for the vendor-reassignment `<select>` (lines 90, 301-337) — those stay exactly as they are; this task adds a second, separate hook call for the tarea modal.

- [ ] **Step 1: Add the import**

In `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`, change line 22 from:

```typescript
import { useVendedoresAsignables } from '@/hooks/useCatalogos'
```

to:

```typescript
import { useEmpleadosSeleccionables, useVendedoresAsignables } from '@/hooks/useCatalogos'
```

- [ ] **Step 2: Add the hook call**

Immediately after line 90 (`const empleados = useVendedoresAsignables(esSupervision)`), add:

```typescript
  const empleadosTareas = useEmpleadosSeleccionables()
```

- [ ] **Step 3: Fix the `TareaDetalleModal` call site**

Change (around line 674-681):

```tsx
      <TareaDetalleModal
        tarea={tareaSel}
        onClose={() => setTareaSel(null)}
        onSave={(input) => actualizarTarea.mutateAsync({ id: tareaSel!.id, input })}
        guardando={actualizarTarea.isPending}
        contactos={empresa.contactos}
        empleados={esSupervision ? empleados.data : undefined}
      />
```

to:

```tsx
      <TareaDetalleModal
        tarea={tareaSel}
        onClose={() => setTareaSel(null)}
        onSave={(input) => actualizarTarea.mutateAsync({ id: tareaSel!.id, input })}
        guardando={actualizarTarea.isPending}
        contactos={empresa.contactos}
        empleados={empleadosTareas}
      />
```

- [ ] **Step 4: Verify**

Run: `npm run type-check` then `npm run lint`
Expected: 0 errors. Combined with Tasks 5 and 6 already done, this should be the point where the whole app compiles clean end-to-end — run `npm run build` to confirm.

---

## Post-plan manual check (not a task, just a reminder)

Once all 6 tasks are done, manually click through in the dev server (`npm run dev`):
1. Log in as a vendedor/analista → open "Nueva tarea" → confirm Responsable/Colaboradores only offer yourself.
2. Log in as admin/gerencia/jdv → confirm both selectors list all active employees.
3. Create a task with 2 colaboradores → confirm the chips render in the list row and in the detail modal.
4. Edit a pending task's colaboradores (remove one, add another) → confirm `PUT` payload sends the full replacement array (check Network tab), and the list/detail reflect the change after refetch.
