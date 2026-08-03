# Importación masiva de empresas por CSV (herramienta temporal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated, easy-to-remove admin tool that uploads a CSV to the temporary backend endpoint `POST /import-csv-temp/empresas` and displays the per-row import result.

**Architecture:** A new tab inside the existing `AdminPage.tsx` tab shell (same pattern as `AdminEmpleados.tsx`), backed by a dedicated types file, API file, and TanStack Query mutation hook. Only one existing file (`AdminPage.tsx`) is touched, with a two-line diff.

**Tech Stack:** React 18 + TypeScript (strict), Ant Design v5 (`Upload`, `Table`, `Alert`), TanStack Query v5 (`useMutation`), Axios (via the existing `apiClient` instance).

## Global Constraints

- TypeScript strict, **never `any`** — use `unknown` + narrowing where the type is uncertain (`CLAUDE.md` rule 2).
- All HTTP calls go through `/src/api/` (`CLAUDE.md` rule 5) — this feature's one exception is documented in Task 2 (it uses `apiClient` directly instead of the generic `post<T>` helper, but still lives inside `src/api/`, not in a component).
- Server state lives in TanStack Query, never copied into Zustand/useState beyond local UI state (selected file, error message) (`CLAUDE.md` rule 3).
- After the mutation succeeds, invalidate every affected query — "sincronización 360" (`CLAUDE.md` rule 4).
- No secrets in code; no `dangerouslySetInnerHTML` (`CLAUDE.md` rules 9, 12).
- Icons: only the `Icono` component (Material Symbols Outlined) — never `@ant-design/icons`, which isn't installed (`src/components/Icono.tsx`).
- **No automated tests for this feature.** The repo has no test framework installed (no `vitest`/`@testing-library`/`msw` in `package.json`; `npm run test` is a no-op with the message `"tests: omitidos en MVP por decision de producto"`; zero `*.test.*` files exist under `src/`). The user confirmed explicitly: do not bootstrap a testing framework for this disposable feature. Verification is `npm run type-check` after each task plus a manual browser pass at the end (Task 6).
- No `git` repository is initialized in this working directory (confirmed: `Is a git repository: false`). Do not run `git init` or any `git` command as part of this plan — there is nothing to commit to. Skip all "commit" steps that a normal plan would include.

---

### Task 1: DTO types for the import contract

**Files:**
- Create: `src/types/importCsvTemp.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `ImportCsvFilaResultado` (per-row result), `ImportCsvResultado` (full response `data` shape), both re-exported from `@/types`.

- [ ] **Step 1: Create the types file**

```ts
// src/types/importCsvTemp.ts
export interface ImportCsvFilaResultado {
  fila: number
  ruc: string
  razon_social: string
  estado: 'creada' | 'error'
  motivo: string | null
}

export interface ImportCsvResultado {
  total_filas: number
  creadas: number
  con_error: number
  detalle: ImportCsvFilaResultado[]
}
```

- [ ] **Step 2: Re-export it from the types barrel**

In `src/types/index.ts`, add this line after `export * from './reportes'` (last line of the file):

```ts
export * from './importCsvTemp'
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run type-check`
Expected: no errors (the file isn't imported anywhere yet, so this just confirms the syntax and the barrel export are valid).

---

### Task 2: API call — `src/api/importCsvTemp.ts`

**Files:**
- Create: `src/api/importCsvTemp.ts`

**Interfaces:**
- Consumes: `apiClient` (named export from `src/api/client.ts`), `ApiResponse<T>` and `ImportCsvResultado` from `@/types` (both produced by Task 1 / already existing).
- Produces: `importCsvTempApi.importarEmpresas(file: File): Promise<ImportCsvResultado>`, consumed by Task 3.

- [ ] **Step 1: Create the API file**

```ts
// src/api/importCsvTemp.ts
import { apiClient } from './client'
import type { ApiResponse, ImportCsvResultado } from '@/types'

export const importCsvTempApi = {
  importarEmpresas: async (file: File): Promise<ImportCsvResultado> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post<ApiResponse<ImportCsvResultado>>(
      '/import-csv-temp/empresas',
      formData,
      { headers: { 'Content-Type': undefined } },
    )
    return res.data.data
  },
}
```

**Why `apiClient.post` directly, not the generic `post<T>` helper from `client.ts`:** `apiClient` sets `Content-Type: application/json` as an instance-level default header (`src/api/client.ts:9`). Axios's default `transformRequest` (verified in `node_modules/axios/lib/defaults/index.js:53-57`) only forwards a `FormData` body as-is when the *effective* `Content-Type` is not `application/json` — if it is, it calls `JSON.stringify` on the `FormData`, which breaks the upload entirely (the file never reaches the backend as multipart data). The generic `post<T>` helper takes no per-call config, so it can't override the header. Passing `{ headers: { 'Content-Type': undefined } }` on this one call clears the JSON default for this request only, letting the browser set `multipart/form-data; boundary=...` itself. `client.ts` itself is not modified — the 401/refresh interceptor still applies because this uses the same `apiClient` instance.

No `try/catch` here — errors propagate to the caller, matching every other file in `src/api/` (e.g. `src/api/empresas.ts`).

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: no errors.

---

### Task 3: Mutation hook — `src/hooks/useImportCsvTemp.ts`

**Files:**
- Create: `src/hooks/useImportCsvTemp.ts`

**Interfaces:**
- Consumes: `importCsvTempApi.importarEmpresas` (Task 2), `invalidar` and `qk` from `./queryKeys` (existing, `src/hooks/queryKeys.ts`).
- Produces: `useImportarEmpresasCsv()` — a TanStack Query mutation hook returning the standard `useMutation` result (`mutateAsync`, `isPending`, etc.), consumed by Task 4.

- [ ] **Step 1: Create the hook file**

```ts
// src/hooks/useImportCsvTemp.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importCsvTempApi } from '@/api/importCsvTemp'
import { invalidar, qk } from './queryKeys'

export function useImportarEmpresasCsv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => importCsvTempApi.importarEmpresas(file),
    onSuccess: () => invalidar(qc, qk.empresas, qk.inicio, qk.prospeccion),
  })
}
```

This mirrors `useCrearEmpresa` in `src/hooks/useEmpresas.ts:35-41`, minus `qk.tareas`/`qk.oportunidades` (not applicable — freshly imported companies have no tasks or opportunities yet). Invalidating `qk.empresas`, `qk.inicio`, and `qk.prospeccion` means Cartera, Inicio, and Prospección all pick up the newly-created companies without a manual refresh — this is the "sincronización 360" requirement from `CLAUDE.md`.

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: no errors.

---

### Task 4: Page component — `src/pages/Admin/AdminImportCsvTemp.tsx`

**Files:**
- Create: `src/pages/Admin/AdminImportCsvTemp.tsx`

**Interfaces:**
- Consumes: `useImportarEmpresasCsv` (Task 3), `mensajeDeError` from `@/api/client` (existing), `ImportCsvFilaResultado`/`ImportCsvResultado` from `@/types` (Task 1), `PositivoTag`/`UrgenteTag` from `@/components/EstadoTag` (existing), `Icono` from `@/components/Icono` (existing).
- Produces: `AdminImportCsvTemp` component, consumed by Task 5.

- [ ] **Step 1: Create the component**

```tsx
// src/pages/Admin/AdminImportCsvTemp.tsx
import { useState } from 'react'
import { Alert, Button, Table, Typography, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd'
import { useImportarEmpresasCsv } from '@/hooks/useImportCsvTemp'
import { mensajeDeError } from '@/api/client'
import type { ImportCsvFilaResultado, ImportCsvResultado } from '@/types'
import { PositivoTag, UrgenteTag } from '@/components/EstadoTag'
import { Icono } from '@/components/Icono'

const columnas: ColumnsType<ImportCsvFilaResultado> = [
  { title: 'Fila', dataIndex: 'fila', width: 80 },
  { title: 'RUC', dataIndex: 'ruc' },
  { title: 'Razón social', dataIndex: 'razon_social' },
  {
    title: 'Estado',
    dataIndex: 'estado',
    render: (estado: ImportCsvFilaResultado['estado']) =>
      estado === 'creada' ? <PositivoTag>Creada</PositivoTag> : <UrgenteTag>Error</UrgenteTag>,
  },
  {
    title: 'Motivo',
    dataIndex: 'motivo',
    render: (motivo: string | null) =>
      motivo ? <span style={{ color: '#93000a' }}>{motivo}</span> : '—',
  },
]

export function AdminImportCsvTemp() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<ImportCsvResultado | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const importar = useImportarEmpresasCsv()

  const seleccionarArchivo = (file: File) => {
    setArchivo(file)
    setResultado(null)
    setErrorArchivo(null)
    return false
  }

  const quitarArchivo = () => {
    setArchivo(null)
    setResultado(null)
    setErrorArchivo(null)
  }

  const onImportar = async () => {
    if (!archivo) return
    setErrorArchivo(null)
    try {
      const data = await importar.mutateAsync(archivo)
      setResultado(data)
    } catch (e) {
      setResultado(null)
      setErrorArchivo(mensajeDeError(e, 'No se pudo importar el archivo'))
    }
  }

  return (
    <div className="bento-card">
      <span className="eyebrow">Herramienta temporal</span>
      <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
        Importación temporal — solo empresas, columnas RUC/Razón Social/Segmento.
      </Typography.Paragraph>

      <Upload
        accept=".csv"
        maxCount={1}
        fileList={
          archivo
            ? [{ uid: 'archivo-csv', name: archivo.name, status: 'done' } as UploadFile]
            : []
        }
        beforeUpload={seleccionarArchivo}
        onRemove={quitarArchivo}
      >
        <Button icon={<Icono nombre="upload_file" tamano={18} />}>Seleccionar CSV</Button>
      </Upload>

      <Button
        type="primary"
        style={{ marginTop: 16, display: 'block' }}
        disabled={!archivo}
        loading={importar.isPending}
        onClick={() => void onImportar()}
      >
        Importar
      </Button>

      {errorArchivo && (
        <Alert
          type="error"
          showIcon
          message="No se pudo importar el archivo"
          description={errorArchivo}
          style={{ marginTop: 24, borderRadius: 4 }}
        />
      )}

      {resultado && (
        <div style={{ marginTop: 24 }}>
          <Typography.Text strong>
            {resultado.creadas} de {resultado.total_filas} filas creadas
            {resultado.con_error > 0 ? ` — ${resultado.con_error} con error` : ''}
          </Typography.Text>
          <Table
            style={{ marginTop: 12 }}
            rowKey="fila"
            dataSource={resultado.detalle}
            columns={columnas}
            pagination={false}
            size="middle"
          />
        </div>
      )}
    </div>
  )
}
```

Behavior notes tying this back to the spec:
- Selecting a new file (or removing the current one) clears both `resultado` and `errorArchivo`, so stale results never linger next to a different file.
- `beforeUpload` returns `false` so AntD never auto-uploads — the file only leaves the browser when the user clicks "Importar".
- Success (200): summary line + `Table` of `detalle`; error rows get a red `UrgenteTag` and their `motivo` rendered in red text — no separate error alert needed since the row itself carries the message.
- Full-file failure (400 `VALIDACION`, network error, etc.): `mensajeDeError` extracts the backend's `error.message` (or a fallback for network failures) into a persistent `Alert`, and no table is rendered, matching that `data` is `null` in that response shape.

- [ ] **Step 2: Verify it compiles**

Run: `npm run type-check`
Expected: no errors.

---

### Task 5: Wire the new tab into `AdminPage.tsx`

**Files:**
- Modify: `src/pages/Admin/AdminPage.tsx`

**Interfaces:**
- Consumes: `AdminImportCsvTemp` (Task 4).

- [ ] **Step 1: Import the new component**

In `src/pages/Admin/AdminPage.tsx`, after the existing import on line 6 (`import { AdminCatalogoEventos } from './AdminCatalogoEventos'`), add:

```tsx
import { AdminImportCsvTemp } from './AdminImportCsvTemp'
```

- [ ] **Step 2: Add the tab entry**

Change the `secciones` array (currently lines 8–13) from:

```tsx
const secciones = [
  { to: 'empleados', label: 'Empleados' },
  { to: 'financiadoras', label: 'Financiadoras' },
  { to: 'modelos', label: 'Modelos' },
  { to: 'catalogo-eventos', label: 'Catálogo de eventos' },
]
```

to:

```tsx
const secciones = [
  { to: 'empleados', label: 'Empleados' },
  { to: 'financiadoras', label: 'Financiadoras' },
  { to: 'modelos', label: 'Modelos' },
  { to: 'catalogo-eventos', label: 'Catálogo de eventos' },
  { to: 'import-csv-temp', label: 'Importar CSV (temporal)' },
]
```

- [ ] **Step 3: Add the route**

Change the `<Routes>` block (currently lines 56–62) from:

```tsx
      <Routes>
        <Route index element={<Navigate to="empleados" replace />} />
        <Route path="empleados" element={<AdminEmpleados />} />
        <Route path="financiadoras" element={<AdminFinanciadoras />} />
        <Route path="modelos" element={<AdminModelos />} />
        <Route path="catalogo-eventos" element={<AdminCatalogoEventos />} />
      </Routes>
```

to:

```tsx
      <Routes>
        <Route index element={<Navigate to="empleados" replace />} />
        <Route path="empleados" element={<AdminEmpleados />} />
        <Route path="financiadoras" element={<AdminFinanciadoras />} />
        <Route path="modelos" element={<AdminModelos />} />
        <Route path="catalogo-eventos" element={<AdminCatalogoEventos />} />
        <Route path="import-csv-temp" element={<AdminImportCsvTemp />} />
      </Routes>
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run type-check`
Expected: no errors.

---

### Task 6: Manual verification

No automated tests exist for this feature (see Global Constraints). This task is a manual QA pass — run it yourself in the browser before considering the feature done.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite starts on `http://localhost:5173` with no compile errors.

- [ ] **Step 2: Log in as an admin user and navigate to the new tab**

Go to `http://localhost:5173/admin/import-csv-temp` (or click the "Importar CSV (temporal)" tab from `/admin`). Confirm:
- The tab appears alongside Empleados/Financiadoras/Modelos/Catálogo de eventos.
- The page shows the "Importación temporal — solo empresas..." notice.
- The "Importar" button is disabled with no file selected.

- [ ] **Step 3: Exercise the success path**

Select a small valid CSV (e.g. the example from the backend contract: header row + `20999999999,Beta SRL,urbano`) and click "Importar". Confirm:
- The button shows a loading state during the request.
- A summary line appears (e.g. "1 de 1 filas creadas").
- A table row appears with the row data.
- Navigate to Cartera and confirm the newly created company appears there without a manual page refresh being required beyond navigation (this validates the `qk.empresas` invalidation from Task 3).

- [ ] **Step 4: Exercise the partial-error path**

Upload a CSV with one valid row and one invalid row (e.g. a RUC that isn't 11 digits). Confirm the resulting table shows one green "Creada" row and one red "Error" row with its `motivo` text visible in red.

- [ ] **Step 5: Exercise the full-file-error path**

Upload an empty CSV (header row only, no data rows) or any file that the backend rejects outright. Confirm a red `Alert` appears with the backend's error message and no table is rendered.

- [ ] **Step 6: Confirm role gating**

Log in (or switch) as a non-admin role and confirm `/admin/import-csv-temp` is not reachable (redirected the same way any other `/admin/*` route already is for non-admin roles — this is existing `RequireRol` behavior in `src/router/guards.tsx`, not new code, but worth confirming nothing in this feature broke it).
