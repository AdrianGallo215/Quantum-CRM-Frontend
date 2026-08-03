# Documentos en Google Drive (Headless Storage) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un componente reutilizable `DocumentosDrive` que liste, permita subir y dé acceso a la carpeta de Google Drive de una Empresa o de una Oportunidad, montado en las dos pantallas de detalle.

**Architecture:** Mismo patrón por capas que el resto del proyecto: tipos en `src/types/archivo.ts` (espejo del DTO), cliente en `src/api/archivos.ts` sobre `apiClient`, hooks TanStack Query en `src/hooks/useArchivos.ts` con su propia query key `qk.archivos(tipo, id)`, helpers puros en `src/utils/archivos.ts`, y un único componente `src/components/DocumentosDrive.tsx` parametrizado por `tipo` (`'empresa' | 'oportunidad'`). El backend expone endpoints idénticos en forma para ambas entidades, así que el cliente API es genérico y traduce el `tipo` singular del prop al segmento plural de la URL. El link a la carpeta se arma en el frontend con `drive_folder_id`; **no existe endpoint para "abrir la carpeta"**.

**Tech Stack:** React 18 + TypeScript strict, Ant Design v5 (`Upload`, `Button`, `Tooltip`, `Skeleton`, `Alert`, `App.useApp`), TanStack Query v5, Axios (vía `src/api/client.ts`), Tailwind con los tokens de los prototipos Stitch, íconos Material Symbols vía `<Icono>`.

## Global Constraints

- TypeScript strict, **nunca `any`** — `unknown` + narrowing (CLAUDE.md regla 2).
- `tsconfig.json` tiene `noUnusedLocals` y `noUnusedParameters` en `true`: **un import sin usar rompe `npm run type-check`**. Y con `isolatedModules: true`, los imports de solo-tipo necesitan el modificador `type` (`import type {...}` o inline `{ A, type B }`).
- Toda llamada HTTP pasa por `/src/api/` (regla 5). Nunca `fetch`/`axios` directo en componentes.
- Server state solo en TanStack Query, nunca copiado a Zustand (regla 3). Invalidación tras cada mutación (regla 4).
- Sin lógica de negocio en componentes (regla 11) — mapeo de mime→ícono, formato de tamaño y traducción de errores viven en `utils/`.
- Nunca `dangerouslySetInnerHTML` (regla 9). Los nombres de archivo vienen del servidor y se renderizan como texto.
- **No hay framework de tests instalado** (`npm run test` es no-op: `"tests: omitidos en MVP por decision de producto"`; cero archivos `*.test.*`). Decisión confirmada con el usuario 2026-07-31: **no se instala Vitest para esta feature**. Verificación por tarea = `npm run type-check` + `npm run lint`; verificación funcional manual en Task 8.
- **No hay repositorio git en este directorio** (`Is a git repository: false`). Omitir todos los pasos de commit; **no ejecutar `git init`**.
- Envelope de API estándar `{ data, meta, error }` en toda respuesta. JSON siempre en snake_case; los tipos TS reflejan snake_case tal cual.
- **El campo del multipart es `file`, exacto y case-sensitive.** No se envía ningún otro campo.
- **Nunca fijar `Content-Type` a mano en la subida** — el browser debe generar el boundary. Se pasa `'Content-Type': undefined` para anular el default `application/json` de la instancia de Axios (patrón ya probado en `src/api/importCsvTemp.ts:11`).
- **Sin timeout corto en la subida** — archivos de hasta 100 MB. Se fija `timeout: 0` explícitamente para blindarlo ante un futuro timeout global en la instancia.
- El límite de tamaño es una **constante configurable**, nunca un número literal repetido: `MAX_TAMANO_ARCHIVO_MB` / `MAX_TAMANO_ARCHIVO_BYTES` en `src/utils/archivos.ts`.
- `"data": []` es un **estado válido y esperado**, no un error → "No hay documentos todavía".
- `url` puede venir `null` → el nombre **no debe ser clicable** en ese caso.
- `drive_folder_id` puede venir `null` (registros previos a la migración) → botón **deshabilitado con tooltip "Aún no hay documentos"**, nunca oculto.
- Textos de UI en español; nombres de código en español siguiendo el estilo existente.

## Fuera de alcance (NO construir)

- ❌ Endpoint/UI para **borrar** o **renombrar** documentos — no existen en el backend.
- ❌ Endpoint/UI para **crear carpetas** — las crea el backend automáticamente al crear la entidad.
- ❌ **Paginación** del listado — el backend no la expone.
- ❌ **Previsualización embebida** — el link abre el documento en Drive.
- ❌ Cualquier endpoint inventado para "abrir la carpeta" — el link se arma en el frontend.

## Decisiones ya tomadas (con su justificación)

| # | Decisión | Justificación |
|---|---|---|
| D1 | Sin tests; verificación por `type-check` + `lint` + prueba manual | Confirmado por el usuario 2026-07-31: consistente con el resto del repo, que no tiene infraestructura de test (`npm run test` es no-op). |
| D2 | Módulo genérico `src/api/archivos.ts` con `listar(tipo, id)` / `subir(tipo, id, file)` en vez de funciones duplicadas por entidad al estilo `eventos.ts` | Confirmado por el usuario 2026-07-31: las tres llamadas son idénticas en forma; duplicarlas no aporta nada y multiplica el mantenimiento. |
| D3 | Límite como constante TS exportada, no variable de entorno | Confirmado por el usuario 2026-07-31: no depende del despliegue y es más simple de cambiar en código. |
| D4 | Un solo componente `DocumentosDrive` con shell de tarjeta fijo, usado en las dos pantallas | Los tokens de color son variables CSS con ámbito por pantalla (`src/styles/proto-tokens.css`), así que la misma tarjeta adopta la paleta de cada prototipo automáticamente. |
| D5 | El campo preexistente `Empresa.file_drive` **no se toca ni se elimina** | Es un campo anterior sin relación con esta migración; tocarlo sería scope creep. `drive_folder_id` se agrega aparte. |
| D6 | El botón "Abrir File" usa `onClick` + `window.open`, no `href` en el `<Button>` de AntD | Un `Button` con `href` renderiza un `<a>`; el estado `disabled` en anclas es frágil. Con `onClick`, un botón deshabilitado simplemente no dispara el handler. |

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/types/archivo.ts` | **Crear.** `TipoEntidadArchivo`, `ArchivoDrive` — espejo exacto del DTO. |
| `src/types/index.ts` | **Modificar.** Re-exportar `./archivo`. |
| `src/types/empresa.ts` | **Modificar.** Agregar `drive_folder_id: string \| null` a `Empresa`. |
| `src/types/oportunidad.ts` | **Modificar.** Agregar `drive_folder_id: string \| null` a `Oportunidad`. |
| `src/utils/archivos.ts` | **Crear.** Constantes de límite, `iconoDeMime`, `mensajeErrorSubida`. Helpers puros del dominio Drive. |
| `src/utils/formato.ts` | **Modificar.** Agregar `formatoTamanoArchivo` (formateador genérico, va con sus hermanos). |
| `src/api/archivos.ts` | **Crear.** `archivosApi.listar` / `archivosApi.subir`. Único punto que conoce las URLs. |
| `src/hooks/queryKeys.ts` | **Modificar.** Agregar `qk.archivos(tipo, id)`. |
| `src/hooks/useArchivos.ts` | **Crear.** `useArchivos`, `useSubirArchivo` con invalidación. |
| `src/components/DocumentosDrive.tsx` | **Crear.** El componente de UI. Única implementación, dos usos. |
| `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` | **Modificar.** Montar entre "Contactos Clave" y "Actividades Recientes". |
| `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx` | **Modificar.** Montar debajo de `<ContactosCard>`. |
| `src/pages/OportunidadDetalle/ContactosCard.tsx` | **Modificar.** Quitar `h-full` (deja de ser el único hijo de su columna). |
| `docs/contrato_api.md` | **Modificar.** Documentar §22 con los endpoints ya implementados por el backend. |

---

### Task 1: Tipos del dominio `ArchivoDrive` + `drive_folder_id` en Empresa y Oportunidad

**Files:**
- Create: `src/types/archivo.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/empresa.ts:30-57`
- Modify: `src/types/oportunidad.ts:18-42`

**Interfaces:**
- Produces: `TipoEntidadArchivo`, `ArchivoDrive`, `Empresa.drive_folder_id`, `Oportunidad.drive_folder_id` — consumidos por Tasks 2–7.

- [ ] **Step 1: Crear `src/types/archivo.ts`**

```ts
/**
 * Headless Storage: el CRM no guarda documentos en disco propio — viven en la
 * carpeta de Google Drive que el backend crea automáticamente para cada
 * Empresa y cada Oportunidad.
 */

/** Entidad dueña de la carpeta. El cliente API lo traduce al segmento de URL. */
export type TipoEntidadArchivo = 'empresa' | 'oportunidad'

/** Ítem del listado y respuesta 201 de la subida — misma forma en ambos casos. */
export interface ArchivoDrive {
  /** ID de Drive (string alfanumérico, NO numérico como el resto de IDs del CRM) */
  id: string
  nombre: string
  /** Puede venir null en casos raros → el nombre no debe ser clicable */
  url: string | null
  tamano_bytes: number
  mime_type: string
}
```

- [ ] **Step 2: Re-exportar en `src/types/index.ts`**

Agregar la línea al final del archivo (después de `export * from './metaVenta'`):

```ts
export * from './archivo'
```

- [ ] **Step 3: Agregar `drive_folder_id` a `Empresa`**

En `src/types/empresa.ts`, dentro de `interface Empresa`, agregar el campo justo después de `file_drive` (línea 47). **No borrar ni renombrar `file_drive`** — es un campo anterior sin relación con esta migración (D5):

```ts
  file_drive: string | null
  /** ID de la carpeta de Drive de la empresa. null en registros previos a la migración Headless Storage. */
  drive_folder_id: string | null
```

- [ ] **Step 4: Agregar `drive_folder_id` a `Oportunidad`**

En `src/types/oportunidad.ts`, dentro de `interface Oportunidad`, agregar el campo después de `ficha_venta` (línea 35). `OportunidadDetalle extends Oportunidad`, así que lo hereda:

```ts
  ficha_venta: string | null
  /** ID de la carpeta de Drive de la oportunidad. null en registros previos a la migración Headless Storage. */
  drive_folder_id: string | null
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run type-check`
Expected: PASS, sin errores. (Agregar un campo requerido a una interfaz de respuesta no rompe nada: solo se lee, nunca se construye un `Empresa`/`Oportunidad` literal en el frontend.)

---

### Task 2: Helpers puros — límite, formato de tamaño, ícono por mime, traducción de errores

**Files:**
- Create: `src/utils/archivos.ts`
- Modify: `src/utils/formato.ts` (agregar al final)

**Interfaces:**
- Consumes: nada de tasks anteriores (solo `codigoDeError` / `mensajeDeError` de `src/api/client.ts`, ya existentes).
- Produces:
  - `MAX_TAMANO_ARCHIVO_MB: number`
  - `MAX_TAMANO_ARCHIVO_BYTES: number`
  - `iconoDeMime(mime: string | null | undefined): string`
  - `ErrorSubida { mensaje: string; reintentable: boolean }`
  - `mensajeErrorSubida(error: unknown): ErrorSubida`
  - `formatoTamanoArchivo(bytes: number | null | undefined): string`

  Consumidos por Task 5.

- [ ] **Step 1: Agregar `formatoTamanoArchivo` al final de `src/utils/formato.ts`**

```ts
/** Formatea bytes a una unidad legible: 900 → "900 B", 284512 → "277.8 KB", 5242880 → "5.0 MB" */
export function formatoTamanoArchivo(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
```

- [ ] **Step 2: Crear `src/utils/archivos.ts`**

```ts
import { codigoDeError, mensajeDeError } from '@/api/client'

/**
 * Límite de subida. Debe coincidir con el del backend (100 MB); se valida en el
 * cliente para no gastar una subida larga que terminará en 413.
 * Constante configurable — nunca escribir el número suelto en la UI.
 */
export const MAX_TAMANO_ARCHIVO_MB = 100
export const MAX_TAMANO_ARCHIVO_BYTES = MAX_TAMANO_ARCHIVO_MB * 1024 * 1024

/**
 * Ícono Material Symbols según el mime_type, con genérico de respaldo.
 *
 * ⚠️ El ORDEN de los checks importa: los mimes de Office comparten el fragmento
 * "officedocument" (p. ej. `...officedocument.spreadsheetml.sheet`), así que
 * hoja de cálculo y presentación se evalúan ANTES que el check genérico de
 * documento; al revés, un Excel se mostraría con ícono de Word.
 */
export function iconoDeMime(mime: string | null | undefined): string {
  const m = (mime ?? '').toLowerCase()
  if (m === 'application/pdf') return 'picture_as_pdf'
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'movie'
  if (m.startsWith('audio/')) return 'audio_file'
  if (m.includes('spreadsheet') || m.includes('ms-excel') || m === 'text/csv') return 'table'
  if (m.includes('presentation') || m.includes('ms-powerpoint')) return 'slideshow'
  if (m.includes('word') || m.includes('document')) return 'description'
  if (m.includes('zip') || m.includes('compressed') || m.includes('rar') || m.includes('tar')) {
    return 'folder_zip'
  }
  if (m.startsWith('text/')) return 'article'
  return 'draft'
}

export interface ErrorSubida {
  mensaje: string
  /** true → ofrecer al usuario un botón de reintento con el mismo archivo */
  reintentable: boolean
}

/**
 * Traduce el error del envelope a lo que ve el usuario.
 * NO_ENCONTRADO (404) cae al caso por defecto, que usa el mensaje del backend —
 * mismo tratamiento que cualquier otro 404 del proyecto.
 */
export function mensajeErrorSubida(error: unknown): ErrorSubida {
  switch (codigoDeError(error)) {
    case 'VALIDACION':
      return { mensaje: 'Selecciona un archivo antes de subir', reintentable: false }

    case 'ARCHIVO_DEMASIADO_GRANDE':
      return {
        mensaje: `El archivo supera el tamaño máximo permitido (${MAX_TAMANO_ARCHIVO_MB} MB)`,
        reintentable: false,
      }

    case 'DRIVE_NO_DISPONIBLE':
      return {
        mensaje: 'No se pudo conectar con Google Drive. Intenta de nuevo en unos minutos',
        reintentable: true,
      }

    case 'DRIVE_SIN_CUOTA':
      // Error de configuración del backend, no accionable por el usuario. El
      // frontend no tiene servicio de error reporting (no hay Sentry ni similar),
      // así que se registra en consola con prefijo crítico para soporte.
      console.error(
        '[CRITICO][DRIVE_SIN_CUOTA] Google Drive sin cuota disponible — requiere revisión del backend',
        error,
      )
      return {
        mensaje: 'No se pudo subir el documento. Avisa al equipo técnico',
        reintentable: false,
      }

    default:
      return { mensaje: mensajeDeError(error, 'No se pudo subir el documento'), reintentable: false }
  }
}
```

- [ ] **Step 3: Verificar que compila y pasa lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

---

### Task 3: Cliente API — `src/api/archivos.ts`

**Files:**
- Create: `src/api/archivos.ts`

**Interfaces:**
- Consumes: `TipoEntidadArchivo`, `ArchivoDrive` (Task 1); `apiClient`, `get` de `src/api/client.ts`.
- Produces:
  - `archivosApi.listar(tipo: TipoEntidadArchivo, id: number): Promise<ArchivoDrive[]>`
  - `archivosApi.subir(tipo: TipoEntidadArchivo, id: number, file: File): Promise<ArchivoDrive>`

  Consumidos por Task 4.

- [ ] **Step 1: Crear `src/api/archivos.ts`**

```ts
import { apiClient, get } from './client'
import type { ApiResponse, ArchivoDrive, TipoEntidadArchivo } from '@/types'

/**
 * El backend expone el recurso bajo el segmento plural de cada entidad.
 * Los tres endpoints son idénticos en forma para empresa y oportunidad, por eso
 * un solo módulo genérico en vez de funciones duplicadas.
 */
const SEGMENTO: Record<TipoEntidadArchivo, string> = {
  empresa: 'empresas',
  oportunidad: 'oportunidades',
}

export const archivosApi = {
  /** GET /{empresas|oportunidades}/:id/archivos — el backend devuelve orden alfabético por nombre. */
  listar: async (tipo: TipoEntidadArchivo, id: number): Promise<ArchivoDrive[]> => {
    const res = await get<ArchivoDrive[]>(`/${SEGMENTO[tipo]}/${id}/archivos`)
    return res.data
  },

  /** POST /{empresas|oportunidades}/:id/archivos — multipart/form-data, campo `file`. */
  subir: async (tipo: TipoEntidadArchivo, id: number, file: File): Promise<ArchivoDrive> => {
    const formData = new FormData()
    // El nombre del campo es exacto y case-sensitive. No mandar otros campos.
    formData.append('file', file)
    const res = await apiClient.post<ApiResponse<ArchivoDrive>>(
      `/${SEGMENTO[tipo]}/${id}/archivos`,
      formData,
      {
        // Content-Type: undefined anula el default JSON de la instancia para que
        // el browser genere el boundary del multipart. Fijarlo a mano rompe el
        // parseo en el backend. (Mismo patrón que src/api/importCsvTemp.ts)
        headers: { 'Content-Type': undefined },
        // Sin límite de tiempo: los archivos pueden pesar hasta 100 MB.
        timeout: 0,
      },
    )
    return res.data.data
  },
}
```

- [ ] **Step 2: Verificar que compila y pasa lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

---

### Task 4: Hooks de TanStack Query + query key

**Files:**
- Create: `src/hooks/useArchivos.ts`
- Modify: `src/hooks/queryKeys.ts`

**Interfaces:**
- Consumes: `archivosApi` (Task 3); `TipoEntidadArchivo`, `ArchivoDrive` (Task 1); `invalidar`, `qk` de `src/hooks/queryKeys.ts`.
- Produces:
  - `qk.archivos(tipo: TipoEntidadArchivo, id: number)` → `readonly ['archivos', TipoEntidadArchivo, number]`
  - `useArchivos(tipo, id)` → `UseQueryResult<ArchivoDrive[]>`
  - `useSubirArchivo(tipo, id)` → `UseMutationResult<ArchivoDrive, Error, File>`

  Consumidos por Task 5.

- [ ] **Step 1: Agregar la query key en `src/hooks/queryKeys.ts`**

Agregar el import de tipo al inicio del archivo, junto al de `QueryClient`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import type { TipoEntidadArchivo } from '@/types'
```

Y la entrada dentro del objeto `qk`, después de `metasVenta`:

```ts
  metasVenta: ['metas-venta'] as const,
  archivos: (tipo: TipoEntidadArchivo, id: number) => ['archivos', tipo, id] as const,
```

- [ ] **Step 2: Crear `src/hooks/useArchivos.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { archivosApi } from '@/api/archivos'
import type { TipoEntidadArchivo } from '@/types'
import { invalidar, qk } from './queryKeys'

export function useArchivos(tipo: TipoEntidadArchivo, id: number) {
  return useQuery({
    queryKey: qk.archivos(tipo, id),
    queryFn: () => archivosApi.listar(tipo, id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/**
 * Subida de un documento. Ninguna otra vista muestra datos de esta carpeta
 * (no hay contadores de archivos en listados ni en el panel de Inicio), así que
 * la invalidación 360 se reduce a la lista de la propia carpeta.
 */
export function useSubirArchivo(tipo: TipoEntidadArchivo, id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => archivosApi.subir(tipo, id, file),
    onSuccess: () => invalidar(qc, qk.archivos(tipo, id)),
  })
}
```

- [ ] **Step 3: Verificar que compila y pasa lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

---

### Task 5: Componente `DocumentosDrive`

**Files:**
- Create: `src/components/DocumentosDrive.tsx`

**Interfaces:**
- Consumes: `useArchivos`, `useSubirArchivo` (Task 4); `MAX_TAMANO_ARCHIVO_BYTES`, `MAX_TAMANO_ARCHIVO_MB`, `iconoDeMime`, `mensajeErrorSubida`, `ErrorSubida` (Task 2); `formatoTamanoArchivo` (Task 2); `TipoEntidadArchivo` (Task 1); `<Icono>` de `src/components/Icono.tsx`.
- Produces: `DocumentosDrive` con props `{ tipo: TipoEntidadArchivo; id: number; driveFolderId: string | null; titulo: string }` — consumido por Tasks 6 y 7.

- [ ] **Step 1: Crear `src/components/DocumentosDrive.tsx`**

```tsx
import { useState } from 'react'
import { Alert, App, Button, Skeleton, Tooltip, Upload } from 'antd'
import { useArchivos, useSubirArchivo } from '@/hooks/useArchivos'
import {
  MAX_TAMANO_ARCHIVO_BYTES,
  MAX_TAMANO_ARCHIVO_MB,
  iconoDeMime,
  mensajeErrorSubida,
  type ErrorSubida,
} from '@/utils/archivos'
import { formatoTamanoArchivo } from '@/utils/formato'
import { mensajeDeError } from '@/api/client'
import { Icono } from '@/components/Icono'
import type { TipoEntidadArchivo } from '@/types'

/**
 * No existe endpoint para "abrir la carpeta": el link se arma en el frontend
 * a partir del drive_folder_id que ya viene en el detalle de la entidad.
 */
const URL_CARPETA_DRIVE = 'https://drive.google.com/drive/folders/'

interface DocumentosDriveProps {
  tipo: TipoEntidadArchivo
  id: number
  /** null en registros previos a la migración → botón deshabilitado, nunca oculto */
  driveFolderId: string | null
  /** Texto del botón principal: "Abrir File del Cliente" / "Abrir File de la Oportunidad" */
  titulo: string
}

export function DocumentosDrive({ tipo, id, driveFolderId, titulo }: DocumentosDriveProps) {
  const { message } = App.useApp()
  const archivos = useArchivos(tipo, id)
  const subir = useSubirArchivo(tipo, id)

  const [errorSubida, setErrorSubida] = useState<ErrorSubida | null>(null)
  /** Se guarda para poder reintentar la misma subida sin volver a elegir el archivo */
  const [ultimoArchivo, setUltimoArchivo] = useState<File | null>(null)

  const enviar = async (file: File) => {
    setErrorSubida(null)
    setUltimoArchivo(file)

    // Validación en cliente antes de gastar una subida larga que terminaría en 413.
    if (file.size > MAX_TAMANO_ARCHIVO_BYTES) {
      setErrorSubida({
        mensaje: `El archivo supera el tamaño máximo permitido (${MAX_TAMANO_ARCHIVO_MB} MB)`,
        reintentable: false,
      })
      return
    }

    try {
      await subir.mutateAsync(file)
      message.success('Documento subido')
      setUltimoArchivo(null)
    } catch (e) {
      setErrorSubida(mensajeErrorSubida(e))
    }
  }

  const abrirCarpeta = () => {
    if (!driveFolderId) return
    window.open(`${URL_CARPETA_DRIVE}${driveFolderId}`, '_blank', 'noopener,noreferrer')
  }

  const lista = archivos.data ?? []

  return (
    <section className="bg-white p-container-padding rounded-lg custom-shadow border border-outline-variant/30">
      <div className="flex items-center gap-2 mb-6 text-primary">
        <Icono nombre="folder_shared" />
        <h3 className="font-headline-sm text-headline-sm">Documentos</h3>
      </div>

      {/* Botón primario — el <span> es necesario: AntD no muestra Tooltip sobre
          un Button deshabilitado (pointer-events: none) si no hay wrapper. */}
      <Tooltip title={driveFolderId ? '' : 'Aún no hay documentos'}>
        <span className="block">
          <Button
            type="primary"
            block
            disabled={!driveFolderId}
            onClick={abrirCarpeta}
            icon={<Icono nombre="drive_folder_upload" tamano={18} />}
          >
            {titulo}
          </Button>
        </span>
      </Tooltip>

      {/* Listado */}
      <div className="mt-6">
        {archivos.isLoading ? (
          <Skeleton active title={false} paragraph={{ rows: 3 }} />
        ) : archivos.isError ? (
          <Alert
            type="error"
            showIcon
            message="No se pudieron cargar los documentos"
            description={mensajeDeError(archivos.error)}
            action={
              <Button size="small" onClick={() => void archivos.refetch()}>
                Reintentar
              </Button>
            }
            style={{ borderRadius: 4 }}
          />
        ) : lista.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No hay documentos todavía</p>
        ) : (
          <ul className="flex flex-col">
            {lista.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 py-3 border-b border-outline-variant/30 last:border-b-0"
              >
                <Icono
                  nombre={iconoDeMime(a.mime_type)}
                  tamano={22}
                  className="text-on-surface-variant shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <Tooltip title={a.nombre}>
                    {a.url ? (
                      <a
                        className="block truncate text-body-md font-semibold text-primary hover:underline"
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.nombre}
                      </a>
                    ) : (
                      // url null → el nombre no debe ser clicable
                      <span className="block truncate text-body-md font-semibold text-on-surface">
                        {a.nombre}
                      </span>
                    )}
                  </Tooltip>
                  <p className="text-label-md text-on-surface-variant">
                    {formatoTamanoArchivo(a.tamano_bytes)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Control de subida */}
      <div className="mt-6 pt-4 border-t border-outline-variant/30">
        <Upload
          maxCount={1}
          showUploadList={false}
          disabled={subir.isPending}
          // return false → AntD no sube nada por su cuenta; la subida la hace el hook.
          beforeUpload={(file) => {
            void enviar(file)
            return false
          }}
        >
          <Button
            block
            loading={subir.isPending}
            disabled={subir.isPending}
            icon={<Icono nombre="upload_file" tamano={18} />}
          >
            {subir.isPending ? 'Subiendo…' : 'Subir documento'}
          </Button>
        </Upload>

        {errorSubida && (
          <Alert
            type="error"
            showIcon
            message={errorSubida.mensaje}
            action={
              errorSubida.reintentable && ultimoArchivo ? (
                <Button size="small" onClick={() => void enviar(ultimoArchivo)}>
                  Reintentar
                </Button>
              ) : undefined
            }
            style={{ marginTop: 12, borderRadius: 4 }}
          />
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar que compila y pasa lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

Si `npm run lint` se queja de `Promise` sin manejar en `beforeUpload`, la causa sería un `void` faltante — ya está puesto en `void enviar(file)`.

---

### Task 6: Montar en el Detalle de Empresa

**Files:**
- Modify: `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`

**Interfaces:**
- Consumes: `DocumentosDrive` (Task 5); `Empresa.drive_folder_id` (Task 1).

- [ ] **Step 1: Agregar el import**

En el bloque de imports de componentes de `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`, después de `import { EliminarEmpresaModal } from '@/components/EliminarEmpresaModal'` (línea 46):

```ts
import { DocumentosDrive } from '@/components/DocumentosDrive'
```

- [ ] **Step 2: Montar el componente entre "Contactos Clave" y "Actividades Recientes"**

En la columna derecha, entre el `</section>` que cierra el bloque de contactos (línea 513) y el comentario `{/* ACTIVITIES BLOCK */}` (línea 515), insertar:

```tsx
            {/* DOCUMENTOS EN DRIVE */}
            <DocumentosDrive
              tipo="empresa"
              id={empresa.id}
              driveFolderId={empresa.drive_folder_id}
              titulo="Abrir File del Cliente"
            />
```

La columna ya es `flex flex-col gap-gutter` (línea 448), así que el espaciado sale solo — no hay que tocar el contenedor.

- [ ] **Step 3: Verificar que compila y pasa lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

---

### Task 7: Montar en el Detalle de Oportunidad

**Files:**
- Modify: `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx:239-241`
- Modify: `src/pages/OportunidadDetalle/ContactosCard.tsx:41`

**Interfaces:**
- Consumes: `DocumentosDrive` (Task 5); `Oportunidad.drive_folder_id` (Task 1, heredado por `OportunidadDetalle`).

- [ ] **Step 1: Quitar `h-full` de `ContactosCard`**

En `src/pages/OportunidadDetalle/ContactosCard.tsx` línea 41, el `div` raíz tiene `h-full` porque hasta ahora era el único hijo de su columna. Al agregar un segundo hijo, `h-full` haría que la tarjeta ocupe toda la altura de la columna y empuje a `DocumentosDrive` fuera de vista.

Cambiar:

```tsx
    <div className="bg-white p-container-padding rounded border border-outline-variant custom-shadow h-full">
```

por:

```tsx
    <div className="bg-white p-container-padding rounded border border-outline-variant custom-shadow">
```

- [ ] **Step 2: Agregar el import en `OportunidadDetallePage.tsx`**

Después de `import { ContactosCard } from './ContactosCard'` (línea 15):

```ts
import { DocumentosDrive } from '@/components/DocumentosDrive'
```

- [ ] **Step 3: Montar el componente debajo de `<ContactosCard>`**

Reemplazar el bloque de la columna derecha (líneas 238–241):

```tsx
          {/* Right: Contactos */}
          <div className="col-span-12 lg:col-span-4">
            <ContactosCard oportunidad={o} />
          </div>
```

por:

```tsx
          {/* Right: Contactos + Documentos */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
            <ContactosCard oportunidad={o} />
            <DocumentosDrive
              tipo="oportunidad"
              id={o.id}
              driveFolderId={o.drive_folder_id}
              titulo="Abrir File de la Oportunidad"
            />
          </div>
```

- [ ] **Step 4: Verificar que compila y pasa lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

---

### Task 8: Documentar el contrato y verificación manual end-to-end

**Files:**
- Modify: `docs/contrato_api.md` (insertar §22 antes del `## Apéndice — Endpoints no implementados en MVP`, línea 1904)

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Documentar la sección §22 en `docs/contrato_api.md`**

`contrato_api.md` es una **copia de referencia — el dueño es el backend**. Esto no cambia el contrato: solo refleja localmente lo que el backend ya implementó y probó. Insertar antes de la línea `## Apéndice — Endpoints no implementados en MVP`:

````markdown
## 22. Archivos (Headless Storage — Google Drive)

El CRM no guarda documentos en su propio disco: los guarda en Google Drive. Cada Empresa y cada Oportunidad tiene su propia carpeta, **creada automáticamente por el backend** al crear la entidad. Su ID viene en el detalle de la entidad como `drive_folder_id` (puede ser `null` en registros previos a la migración).

**No hay endpoint para "abrir la carpeta"** — el link se arma en el frontend: `https://drive.google.com/drive/folders/{drive_folder_id}`.

### 22.1 Listar documentos

```
GET /api/v1/empresas/:id/archivos
GET /api/v1/oportunidades/:id/archivos
```

Respuesta 200 — orden alfabético por `nombre`:

```json
{
  "data": [
    {
      "id": "1AbCdEfGhIjKlMnOpQrStUvWxYz",
      "nombre": "contrato-firmado.pdf",
      "url": "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view",
      "tamano_bytes": 284512,
      "mime_type": "application/pdf"
    }
  ]
}
```

- `"data": []` es un **estado válido y esperado** (carpeta sin documentos), no un error.
- `url` puede venir `null` en casos raros.

### 22.2 Subir un documento

```
POST /api/v1/empresas/:id/archivos
POST /api/v1/oportunidades/:id/archivos
Content-Type: multipart/form-data
```

- El archivo va en el campo **`file`** (exacto, case-sensitive). No se envían otros campos.
- El cliente **no debe fijar el header `Content-Type` a mano** — el browser genera el boundary.
- Respuesta **201**: un objeto con la misma forma que un ítem del listado.

### 22.3 Errores

| HTTP | `error.code` | Significado |
|---|---|---|
| 400 | `VALIDACION` | No se envió archivo |
| 404 | `NO_ENCONTRADO` | Recurso ajeno o inexistente |
| 413 | `ARCHIVO_DEMASIADO_GRANDE` | Supera el máximo de 100 MB |
| 502 | `DRIVE_NO_DISPONIBLE` | Fallo transitorio de Drive — reintentable |
| 502 | `DRIVE_SIN_CUOTA` | Error de configuración del backend — no accionable por el usuario |

### 22.4 No implementado

No existen endpoints para borrar, renombrar, crear carpetas ni paginar el listado.

---
````

- [ ] **Step 2: Levantar el dev server**

Run: `npm run dev`
Expected: arranca en `http://localhost:5173` sin errores de compilación.

- [ ] **Step 3: Verificar el checklist completo de estados de UI**

Recorrer ambas pantallas (`/empresas/:id` y `/oportunidades/:id`) y confirmar cada punto:

- [ ] **Cargando lista:** al entrar a la pantalla se ve el `Skeleton` de 3 líneas antes de que llegue la respuesta.
- [ ] **Lista vacía:** en una entidad sin documentos se ve "No hay documentos todavía" — **no** un mensaje de error.
- [ ] **Lista con documentos:** ícono correcto por tipo (PDF → `picture_as_pdf`, imagen → `image`, Excel → `table`, Word → `description`, desconocido → `draft`), nombre, y tamaño legible ("277.8 KB").
- [ ] **Nombres largos:** se truncan con `…` en una sola línea y el nombre completo aparece en el tooltip al pasar el mouse.
- [ ] **Link del documento:** clic en el nombre abre Drive en **pestaña nueva**. Si `url` es `null`, el nombre se ve como texto plano no clicable.
- [ ] **Botón "Abrir File":** abre `https://drive.google.com/drive/folders/{drive_folder_id}` en pestaña nueva, con el texto correcto en cada pantalla ("Abrir File del Cliente" / "Abrir File de la Oportunidad").
- [ ] **`drive_folder_id` null:** el botón se ve **deshabilitado, no oculto**, y al pasar el mouse muestra el tooltip "Aún no hay documentos". (Si no hay un registro así a mano, forzarlo temporalmente pasando `driveFolderId={null}` en la página y revirtiéndolo después.)
- [ ] **Subiendo archivo:** durante la subida el botón muestra "Subiendo…" con spinner y está deshabilitado — un segundo clic no dispara una segunda subida.
- [ ] **Subida exitosa:** aparece el toast "Documento subido" y el nuevo archivo aparece en la lista **sin recargar la página**.
- [ ] **Archivo > 100 MB:** se rechaza en el cliente **sin llegar a hacer la petición** (verificar en la pestaña Network del navegador que no sale ningún POST) y muestra "El archivo supera el tamaño máximo permitido (100 MB)".
- [ ] **Subida fallida:** el control vuelve a habilitarse y el mensaje corresponde a la tabla de errores. Para `DRIVE_NO_DISPONIBLE` aparece además el botón "Reintentar", que reenvía el mismo archivo sin volver a seleccionarlo.

- [ ] **Step 4: Verificar el multipart en la pestaña Network**

Subir un archivo cualquiera y en DevTools → Network → el POST a `/archivos`:

- [ ] El header `Content-Type` es `multipart/form-data; boundary=----WebKitFormBoundary...` — **generado por el browser**, no `application/json`.
- [ ] El payload tiene un único campo llamado exactamente `file`.

- [ ] **Step 5: Verificación final del proyecto**

Run: `npm run type-check && npm run lint && npm run build`
Expected: los tres PASS.

---

## Notas para el implementador

- **No hay repositorio git aquí.** No ejecutes `git init` ni ningún `git commit`; los pasos de commit del formato estándar de planes están intencionalmente omitidos.
- **No hay tests.** `npm run test` es un `echo` que sale con 0 — ejecutarlo no verifica nada. La verificación real es `type-check` + `lint` + el checklist manual de Task 8.
- Si el backend devuelve un `error.code` que no está en la tabla, cae al caso `default` de `mensajeErrorSubida` y muestra el mensaje del backend. Eso es correcto, no hay que agregar casos especulativos.
- Si al probar aparece que `drive_folder_id` **no** viene en la respuesta del backend, **para y consulta al equipo de backend** — no inventes un endpoint alternativo ni derives el ID de otro campo (CLAUDE.md: coordinación con el backend).
