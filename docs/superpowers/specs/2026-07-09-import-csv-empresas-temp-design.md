# Importación masiva de empresas por CSV (herramienta temporal) — Design

Estado: aprobado por el usuario, listo para implementación.

## Contexto

El backend expone un endpoint temporal y desechable, `POST /import-csv-temp/empresas`, para cargar empresas en lote vía CSV mientras no existe el módulo de importación definitivo. Se necesita una UI mínima, aislada del flujo normal de creación de empresas, y fácil de eliminar por completo el día que el endpoint se retire.

## Decisiones (confirmadas con el usuario)

- **Acceso:** el backend no restringe por rol, pero la UI vive dentro de `AdminPage.tsx`, que ya está protegida en el router con `RequireRol roles={['admin']}`. Se hereda ese guard tal cual — no se modifica el router. En la práctica, solo `admin` la ve/usa desde la UI.
- **Ubicación:** una sección/tab más dentro de `AdminPage.tsx`, siguiendo el mismo patrón que `AdminEmpleados.tsx`, `AdminFinanciadoras.tsx`, `AdminModelos.tsx`, `AdminCatalogoEventos.tsx` (entrada en el array `secciones` + una `<Route>` anidada).
- **Aislamiento:** toda la lógica nueva vive en archivos propios; el único archivo existente que se toca es `AdminPage.tsx`, con un diff de pocas líneas.

## Arquitectura

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `src/types/importCsvTemp.ts` | DTOs de request/response del endpoint |
| `src/api/importCsvTemp.ts` | Llamada HTTP (`multipart/form-data`) |
| `src/hooks/useImportCsvTemp.ts` | `useMutation` + invalidación de queries |
| `src/pages/Admin/AdminImportCsvTemp.tsx` | Componente de página (upload + resultado) |

### Archivo modificado

- `src/pages/Admin/AdminPage.tsx`: un ítem nuevo en `secciones` + una `<Route>` apuntando al componente nuevo. Nada más cambia.

## Contrato de datos (tal como lo definió el backend, sin inventar campos)

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

`ApiResponse<ImportCsvResultado>` (envelope estándar `{ data, meta, error }`) ya está tipado en `src/types/common.ts` — se reutiliza sin cambios.

## Flujo de datos

1. **`src/api/importCsvTemp.ts`** expone:
   ```ts
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
   **Corrección respecto al borrador inicial:** `apiClient` fija `Content-Type: application/json` como header por defecto de la instancia (`src/api/client.ts:9`). El `transformRequest` por defecto de axios (`node_modules/axios/lib/defaults/index.js:53-57`, verificado en el código instalado) sólo deja pasar un `FormData` tal cual cuando el `Content-Type` efectivo NO es `application/json` — si lo es, hace `JSON.stringify` del `FormData`, lo cual rompe el upload. Por eso esta llamada usa `apiClient.post` directamente (no el helper genérico `post<T>` de `client.ts`, que no acepta config por request) y pisa el header a `undefined` sólo para esta petición, dejando que el navegador fije `multipart/form-data; boundary=...`. `client.ts` no se modifica — sigue sin tocarse, tal como estaba previsto. `apiClient` y `ApiResponse` se importan desde `@/api/client` y `@/types` respectivamente.

   No se captura el error aquí — se propaga al caller, igual que el resto de `src/api/`. El interceptor de 401/refresh de `client.ts` sigue aplicando igual, porque se usa la misma instancia `apiClient`.

2. **`src/hooks/useImportCsvTemp.ts`**:
   ```ts
   export function useImportarEmpresasCsv() {
     const qc = useQueryClient()
     return useMutation({
       mutationFn: (file: File) => importCsvTempApi.importarEmpresas(file),
       onSuccess: () => invalidar(qc, qk.empresas, qk.inicio, qk.prospeccion),
     })
   }
   ```
   Se invalida lo mismo que invalida `crear` en `useEmpresas.ts` (menos `qk.tareas`/`qk.oportunidades`, que no aplican a empresas recién creadas sin oportunidad). Esto cumple la regla de sincronización 360 de `CLAUDE.md`: tras la importación, Cartera/Prospección/Inicio deben reflejar las empresas nuevas sin refrescar manualmente.

3. **`src/pages/Admin/AdminImportCsvTemp.tsx`**:
   - Texto fijo, pequeño, no editable: *"Importación temporal — solo empresas, columnas RUC/Razón Social/Segmento"*.
   - `Upload` de AntD, `accept=".csv"`, `maxCount={1}`, `beforeUpload` retorna `false` (no auto-sube; solo guarda el `File` en estado local). Al seleccionar un archivo nuevo se limpia cualquier resultado previo.
   - Botón "Importar": deshabilitado sin archivo seleccionado; `loading` mientras `mutation.isPending`. Al click, llama a `mutation.mutateAsync(file)`.
   - **Éxito (200):** resumen (`creadas` de `total_filas`, `con_error` con error) + `Table` con columnas `fila`, `ruc`, `razón social`, `estado` (Tag verde "creada" / Tag rojo "error"), `motivo`. Filas en estado `error` resaltadas (`rowClassName` condicional).
   - **Error de archivo completo (400, `error.code === 'VALIDACION'`, o cualquier otro fallo — red, 401 ya lo maneja el interceptor global):** `Alert type="error"` con `mensajeDeError(e)`. No se renderiza tabla (no hay `data`).

## Manejo de errores

- Reutiliza `mensajeDeError` / `extraerApiError` de `src/api/client.ts` sin cambios — ya narrowa `unknown` correctamente y ya maneja el envelope `{ data, meta, error }`.
- 401 (sesión inválida) ya lo intercepta `client.ts` globalmente (refresh + redirect a `/login`); no requiere manejo especial en este feature.
- No se valida el CSV en el cliente más allá del `accept=".csv"` del input — toda la validación real (RUC de 11 dígitos, segmento válido, máx. 1000 filas, etc.) es responsabilidad del backend, igual que el resto del proyecto (regla "validación con Zod = UX, no seguridad").

## Testing — decisión revisada

El repo, en su estado actual, no tiene infraestructura de testing instalada: no hay `vitest`, `@testing-library/*` ni `msw` en `package.json`, no existe ningún archivo `*.test.*` bajo `src/`, y `npm run test` es explícitamente un no-op (`"tests: omitidos en MVP por decision de producto"`). Esto es una decisión de producto ya tomada a nivel de repo, previa a este feature.

Dado que (a) instalar y configurar un framework de testing completo (vitest + RTL + msw + jsdom) para una única herramienta desechable sería un cambio de infraestructura desproporcionado, y (b) el usuario confirmó explícitamente esta ruta, **este feature se implementa sin tests automatizados**, siguiendo el estado real del repo en vez de la aspiración documentada en `TESTING-frontend.md`. Verificación manual (type-check + prueba en el navegador) reemplaza el ciclo TDD para este caso puntual.

## Fuera de alcance (explícito, por pedido del usuario)

- Sin plantilla descargable, sin preview antes de confirmar, sin soporte para Excel u otras entidades.
- Sin nuevos campos ni endpoints inventados — el contrato es exactamente el descrito arriba.
- Sin cambios al router (`RequireRol`) ni a `client.ts`.

## Cómo eliminarlo cuando el endpoint se retire

Borrar los 4 archivos nuevos listados arriba + revertir el diff de dos líneas en `AdminPage.tsx` (el ítem de `secciones` y la `<Route>`). No hay ningún otro punto de acoplamiento en el resto de la app.
