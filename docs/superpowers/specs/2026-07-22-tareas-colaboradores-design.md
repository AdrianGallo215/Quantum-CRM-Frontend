# Tareas — Colaboradores + selector de Responsable

**Fecha:** 2026-07-22
**Origen:** Encargo del equipo de backend (mensaje "Tareas — agregar colaboradores + exponer selector de responsable"). El backend ya soporta `id_asignado` (dueño, opcional) y ahora también `ids_colaboradores` (colaboradores adicionales). `docs/contrato_api.md §12` y notas de `§19` ya están actualizados por el usuario con la forma exacta del contrato.

## Contexto

Las tareas (`Tarea`) tienen un dueño único (`id_asignado`/`asignado`). El backend ahora soporta además una lista de colaboradores (`ids_colaboradores`/`colaboradores`) que trabajan la tarea junto al dueño. Un vendedor/analista ve una tarea si es dueño **o** colaborador. Asignar a alguien distinto de uno mismo (como dueño o colaborador) requiere rol admin/gerencia/jdv; si no, el backend responde `403 PERMISO_INSUFICIENTE`.

Hoy el frontend:
- No tiene selector de "Responsable" en los formularios de creación de tarea (el backend autoasigna al usuario autenticado si no viene `id_asignado`).
- Sí tiene un selector de "Asignado" en el modal de edición (`TareaDetalleModal.tsx`), pero solo se habilita (recibe la lista de empleados) para roles de supervisión; para vendedor/analista el campo es de solo lectura.
- No tiene ningún campo ni UI para colaboradores.
- El patrón de "Select de empleado" está duplicado inline en 3 lugares distintos, sin componente compartido.
- El centro de notificaciones no tiene mapeo de `tipo` → texto/ícono: renderiza `n.mensaje` tal cual viene del backend. Añadir un tipo nuevo no requiere lógica adicional, solo ampliar el union type.
- No existe infraestructura de testing en el repo (`npm test` es un stub no-op; no hay Vitest/RTL/MSW instalados), pese a que `CLAUDE.md` documenta TDD obligatorio. Decisión explícita del usuario para este trabajo: no se agregan tests, se mantiene la práctica actual del repo.

## Decisiones (confirmadas con el usuario)

1. **Testing:** no se escriben tests para este feature (match con la práctica actual del repo, no se bootstrapea infraestructura de testing).
2. **Componente compartido:** se extrae un selector de empleado reutilizable (`EmpleadoSelect`) en vez de seguir duplicando el `Select` inline.
3. **Superficies de visualización:** los chips/avatares de colaboradores se muestran en los mismos lugares donde hoy se muestra `asignado` (tarjetas de lista en `TareasCard.tsx`/`ActividadesPage.tsx` y el modal de detalle/edición).
4. **Selector de Responsable en creación:** se agrega a ambos formularios de creación (`TareasCard.tsx`, `ActividadesPage.tsx`), no solo al de edición.
5. **`docs/contrato_api.md`:** el usuario ya lo mantiene actualizado; el frontend no lo modifica en este trabajo.
6. **Pool de empleados seleccionables:** ambos selectores (Responsable y Colaboradores) buscan sobre **todos los empleados activos**, sin restricción de rol — a diferencia del pool `vendedor`/`jdv` (`useVendedoresAsignables`) usado hoy para `id_asignado`. Este cambio también amplía quién puede elegirse como responsable (antes limitado a vendedor/jdv).

## Alcance

### 1. Tipos (`src/types/tarea.ts`, `src/types/notificacion.ts`)

- `Tarea`: agregar `ids_colaboradores: number[]` y `colaboradores: EmpleadoResumen[]`.
- `CrearTareaInput`: agregar `ids_colaboradores?: number[]`.
- `ActualizarTareaInput`: agregar `ids_colaboradores?: number[]` (ausencia del campo = "no tocar colaboradores existentes", presencia aunque sea `[]` = reemplazo completo, según contrato PUT).
- `TipoNotificacion` (`src/types/notificacion.ts`): agregar `'tarea_colaborador_agregado'`.

No se requieren cambios en `src/api/tareas.ts`: los tipos fluyen genéricamente a través de `get`/`post`/`put`.

### 2. Selección de empleados compartida

**Nuevo hook** `useEmpleadosSeleccionables()` en `src/hooks/useCatalogos.ts`:
- Internamente usa `useEmpleados({ activo: true })` (todos los empleados activos, cualquier rol).
- Si `tieneRol(empleado, ['vendedor', 'analista'])` → devuelve solo `[empleadoActual]` (self-only, ya sea que el empleado esté o no en la lista de activos por algún filtro futuro, se construye directamente desde `empleado` del auth store).
- Si no (admin/gerencia/jdv) → devuelve la lista completa de empleados activos.
- Reemplaza el patrón `esSupervision ? empleados.data : undefined` usado hoy en `TareasCard.tsx`/`ActividadesPage.tsx` para alimentar `TareaDetalleModal`.

**Nuevo componente** `src/components/EmpleadoSelect.tsx`:
- Envuelve AntD `Select` (`showSearch`, `optionFilterProp="label"`).
- Props: `empleados: EmpleadoResumen[]`, `multiple?: boolean`, más las props estándar de value/onChange (single: `number | undefined`; multiple: `number[]`).
- `options` se construye una sola vez con `nombreCompleto(e)` como label.
- Usado tanto para "Responsable" (single) como "Colaboradores" (multiple), alimentado siempre por el mismo resultado de `useEmpleadosSeleccionables()` — así un vendedor/analista ve solo su propio nombre como única opción en ambos selectores, sin necesidad de deshabilitar nada explícitamente ni de manejar el 403 como caso principal (aunque el backend lo seguiría rechazando si se fuerza el envío).

### 3. Formularios de creación (`TareasCard.tsx`, `ActividadesPage.tsx`)

- Agregar `Form.Item name="id_asignado" label="Responsable"` (opcional) con `EmpleadoSelect` single, `allowClear`.
- Agregar `Form.Item name="ids_colaboradores" label="Colaboradores"` (opcional) con `EmpleadoSelect` multiple.
- En el submit (`onCrear`): pasar `id_asignado: v.id_asignado ?? null` (o simplemente omitir si no viene, dejando que el backend autoasigne) y `ids_colaboradores: v.ids_colaboradores ?? []` solo si el usuario tocó el campo; si no fue tocado, omitir la clave del payload (no forzar `[]` innecesariamente, aunque `[]` también sería inocuo en creación).
- Ambos formularios usan `useEmpleadosSeleccionables()` en vez de `useVendedoresAsignables(esSupervision)`.

### 4. Modal de edición (`TareaDetalleModal.tsx`)

- `Props.empleados` pasa a alimentarse desde `useEmpleadosSeleccionables()` (se sigue llamando `empleados` para minimizar el diff, o se renombra si conviene en el plan de implementación).
- `Borrador` gana `ids_colaboradores: number[]`, inicializado desde `tarea.ids_colaboradores` en el `useEffect` de reset.
- Nuevo `CampoEditable` "Colaboradores":
  - `display`: fila de badges circulares de iniciales (mismo estilo que el badge de `asignado` en las tarjetas), uno por colaborador, con `title` (tooltip nativo) mostrando `nombreCompleto`.
  - `edit`: `EmpleadoSelect` multiple.
  - `editable`: `esPendiente && !!empleados` (mismo gate que `puedeEditarAsignado`).
- Diff (`cambios`): comparar el array de `borrador.ids_colaboradores` contra `tarea.ids_colaboradores` como conjuntos (orden no importa); si difieren, incluir `ids_colaboradores` completo (no un delta) en el payload de `PUT`.

### 5. Badges de colaboradores en listas (`TareaItem` en `TareasCard.tsx`, fila equivalente en `ActividadesPage.tsx`)

- Junto al badge existente de `asignado`, renderizar una fila de badges superpuestos (`-ml-2`) por cada `t.colaboradores`, mismo estilo visual (`iniciales`, círculo `w-6 h-6`).
- Si hay más de 3, mostrar los primeros 3 + un badge `+N`.
- `title` nativo con `nombreCompleto` por badge para accesibilidad básica sin nueva dependencia.

### 6. Notificaciones

- Solo agregar `'tarea_colaborador_agregado'` a `TipoNotificacion`. No hay mapeo tipo→ícono/texto en el frontend (`NotificacionesDropdown.tsx` renderiza `n.mensaje` tal cual); no se requiere lógica adicional.

### 7. Fuera de alcance

- No se modifica `docs/contrato_api.md` (lo mantiene el usuario).
- No se agrega infraestructura de testing ni tests para este feature.
- No se cambia el comportamiento de `useVendedoresAsignables` existente (queda como está, usado en otros lugares como asignación de vendedor a empresa); simplemente deja de usarse para el flujo de tareas.
