# Progress ledger — Gerencia, Solicitudes y Cartera Maestra

Plan: `2026-07-16-gerencia-solicitudes-cartera-maestra.md`. Sin git en este repo — el estado real es el filesystem, no commits. Este ledger existe para sobrevivir compactación de contexto.

Proceso: 4 lotes secuenciales en cascada (nunca en paralelo) + Task 15 en la sesión principal. Cada lote se marca DONE solo después de que `npm run type-check` pasa limpio sobre el estado acumulado en disco.

## Lotes

- [x] Lote 1 — Infraestructura (Tasks 1-4: rol gerencia, tipos, API, utils) — DONE, `npm run type-check` limpio (verificado por orquestador), `grep -rn "gerente" src/` = 0 resultados.
- [x] Lote 2 — Estado y Lógica (Tasks 5-6: hooks TanStack Query, selector filtrado) — DONE, `npm run type-check` limpio (verificado por orquestador).
- [x] Lote 3 — Flujos de error y Modales (Tasks 7-10: SolicitudModal, captura 422/403) — DONE, `npm run type-check` limpio (verificado por orquestador).
- [x] Lote 4 — Vistas principales (Tasks 11-14: bandejas, /gerencia, /solicitudes, notificaciones, Cartera Maestra) — DONE, `npm run type-check` limpio (verificado por orquestador).
- [ ] Task 15 — Verificación final integral (sesión principal)

## Interfaces expuestas por lote (para que el siguiente lote no las reinvente)

### Lote 1 (Tasks 1-4)

Archivos nuevos: `src/types/solicitud.ts`, `src/api/solicitudes.ts`, `src/utils/solicitudes.ts`.

- `src/types/solicitud.ts`: `TipoSolicitud`, `EstadoSolicitud`, `EntidadSolicitud`, `RolAprobador`, `Solicitud`, `CrearSolicitudDescuentoInput`, `CrearSolicitudReasignacionInput`, `CrearSolicitudInput`, `SolicitudesFiltros` (todos re-exportados desde `@/types`).
- `src/types/empresa.ts`: `CarteraMaestraInput { en_cartera_maestra: boolean; id_vendedor?: number }`; `en_cartera_maestra: boolean` agregado a `EmpresaListItem` y `Empresa`; `cartera_maestra?: boolean` agregado a `EmpresasFiltros`.
- `src/types/oportunidad.ts`: `id_vendedor?: number` agregado a `CrearOportunidadInput`.
- `src/types/notificacion.ts`: `TipoNotificacion` incluye `solicitud_creada`/`solicitud_aprobada`/`solicitud_denegada`; `EntidadNotificacion` incluye `'solicitud'`.
- `src/api/solicitudes.ts` → `solicitudesApi.{listar(filtros?), obtener(id), crear(input), aprobar(id), denegar(id, motivo)}`.
- `src/api/empresas.ts` → `empresasApi.cambiarCarteraMaestra(id: number, input: CarteraMaestraInput): Promise<void>`.
- `src/api/client.ts` → `codigoDeError(error: unknown): string | null` (junto a `extraerApiError`, `mensajeDeError` ya existentes).
- `src/hooks/queryKeys.ts` → `qk.solicitudes`, `qk.solicitud(id)`.
- `src/utils/solicitudes.ts` → `limiteDctoDirecto(rol)`, `aprobadorParaDcto(rol, dcto)`, `descripcionPayloadSolicitud(s)`, `puedeResolverSolicitud(s, rol)`.
- `src/utils/etiquetas.ts` → `ETIQUETA_ROL.gerencia = 'Gerencia'`, `ETIQUETA_TIPO_SOLICITUD`, `ETIQUETA_ESTADO_SOLICITUD`, `ETIQUETA_ROL_APROBADOR`.
- `Rol` en `src/types/enums.ts` ya es `'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista'`.

Sin desviaciones del plan. Verificado por el orquestador: `npm run type-check` limpio, `grep gerente` = 0, código de `solicitudes.ts`/`solicitud.ts` inspeccionado y coincide con el plan.

### Lote 2 (Tasks 5-6)

Archivo nuevo: `src/hooks/useSolicitudes.ts` → `useSolicitudes(filtros?, enabled?)`, `useSolicitud(id: number | null)`, `useCrearSolicitud()`, `useAprobarSolicitud()`, `useDenegarSolicitud()`.

- `src/hooks/useEmpresas.ts` → agregado `useCambiarCarteraMaestra(id: number)` → `mutate(input: CarteraMaestraInput) → void`.
- `src/hooks/useCatalogos.ts` → agregado `ROLES_ASIGNABLES: Rol[] = ['vendedor', 'jdv']` y `useVendedoresAsignables(enabled = true)` (misma forma que `useEmpleados` pero `data` filtrada).
- `NuevaEmpresaModal.tsx`, `EmpresaDetallePage.tsx`, `ReportesPage.tsx` ya usan `useVendedoresAsignables` en vez de `useEmpleados({ activo: true })` (P6 = sí aplicado).

Sin desviaciones del plan. Verificado por el orquestador: `npm run type-check` limpio, código de `useSolicitudes.ts` y `useVendedoresAsignables` inspeccionado y coincide con el plan.

### Lote 3 (Tasks 7-10)

Archivo nuevo: `src/components/SolicitudModal.tsx` → `export function SolicitudModal({ solicitud, onClose, onEnviada }: Props)`, `export type SolicitudPendiente = { tipo: 'descuento'; idOportunidad; dctoSolicitado; mensajeBackend } | { tipo: 'reasignacion_cliente'; idEmpresa; idVendedorNuevo; nombreVendedorNuevo; mensajeBackend }`.

- `PropiedadesCard.tsx` (`EditarTerminosModal`) → maneja 422 `APROBACION_REQUERIDA` al editar oportunidad, con aviso proactivo y `SolicitudModal`.
- `NuevaOportunidadModal.tsx` → prop `empresaPreseleccionada` ampliada con `id_vendedor?`; pide "Vendedor responsable" cuando la empresa no tiene vendedor; flujo asistido en 422 de creación.
- `EmpresaDetallePage.tsx` → pasa `id_vendedor` a `NuevaOportunidadModal`; nuevo estado `solicitudReasignacion: SolicitudPendiente | null` + `setSolicitudReasignacion` dentro de `Contenido` (junto a `modalEditar`/`modalContacto`/`modalOportunidad`/`modalEvento`/`tabActividad`); el select "Vendedor Asignado" captura 403 `PERMISO_INSUFICIENTE` del jdv y abre `SolicitudModal`; `<SolicitudModal>` ya renderizado al final del `<main>`. **Importante para el Lote 4 (Task 14, mismo archivo):** no reutilizar el nombre `solicitudReasignacion` ni chocar con el `<SolicitudModal>` ya presente; reutilizar la variable `empleados` (de `useVendedoresAsignables`) ya existente para resolver nombres si hace falta.

Sin desviaciones del plan. Verificado por el orquestador: `npm run type-check` limpio, código de `SolicitudModal.tsx` y del handler de reasignación en `EmpresaDetallePage.tsx` inspeccionado y coincide con el plan.

### Lote 4 (Tasks 11-14)

Archivos nuevos: `src/components/BandejaSolicitudes.tsx`, `src/components/SolicitudDetalleModal.tsx`, `src/pages/Gerencia/GerenciaPage.tsx`, `src/pages/Solicitudes/SolicitudesPage.tsx`, `src/pages/Cartera/LiberarEmpresaModal.tsx`.

- `authStore.ts` → agregadas `ROLES_BANDEJA_GERENCIA`/`ROLES_SOLICITANTES`.
- `router/index.tsx` → rutas `/gerencia` y `/solicitudes` con sus `RequireRol`.
- `AppLayout.tsx` → nav "Gerencia"/"Solicitudes" condicionales.
- `NotificacionesDropdown.tsx` → `irANotificacion` mapea `entidad_tipo === 'solicitud'` a `/gerencia` o `/solicitudes` según rol.
- `CarteraPage.tsx` → tab "Cartera Maestra" condicional, `cartera_maestra` explícito en la query (P7), columna "Liberar", `LiberarEmpresaModal`.
- `EmpresaDetallePage.tsx` → botones "Mover a Cartera Maestra"/"Liberar", badge, estado `aLiberar` — **verificado que `solicitudReasignacion`/`setSolicitudReasignacion` y el `<SolicitudModal>` del Lote 3 quedaron intactos** (confirmado por el orquestador vía Grep: líneas 60/598-600 sin tocar).
- Confirmado D1: `SolicitudesPage.tsx` NO importa `Tabs` — tabla única, acciones condicionadas por `puedeResolverSolicitud(s, empleado?.rol)`.

Sin desviaciones del plan. Verificado por el orquestador: `npm run type-check` limpio; inspeccionados `EmpresaDetallePage.tsx` (coexistencia de estados), `SolicitudesPage.tsx` (sin tabs, D1), `CarteraPage.tsx` (cartera_maestra explícito, P7).

## Estado final: 4/4 lotes de subagentes completos. Task 15 (sesión principal) también completa.

### Task 15 — Verificación final integral

- `npm run type-check` (estado acumulado completo): limpio, 0 errores.
- `npm run build`: build de producción exitoso (`vite build`, 17.6s). El único warning es de tamaño de chunk (>500kB), preexistente al proyecto — no introducido por esta feature.
- `grep -rn "gerente" src/`: 0 resultados.
- `grep -rn "useEmpleados(" src/`: solo la definición en `useCatalogos.ts`, su uso interno en `useVendedoresAsignables`, y `AdminEmpleados.tsx` (tabla de administración de roles — uso legítimo, no es un selector de vendedor).
- Inspección manual de código (orquestador) de `SolicitudesPage.tsx` (sin `Tabs`, tabla única — D1 aplicado literalmente) y `BandejaSolicitudes.tsx` (tabs Pendientes/Historial, solo para `/gerencia`): ambos coinciden con el plan.
- Rutas `/gerencia` y `/solicitudes` confirmadas en `router/index.tsx` con los guards de rol correctos.

**Pendiente — fuera del alcance de este agente:** la pasada manual con un usuario real por rol (vendedor/jdv/gerencia/admin/analista) contra un backend corriendo con la rama `feature/b08-auth-endpoints`, descrita en el plan (Task 15, tabla de verificación por rol). Requiere el backend real; no se puede automatizar desde aquí.
