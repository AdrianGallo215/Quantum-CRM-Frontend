# Plan — Notificaciones (campana del header)

> Documento de diseño para la primera entrega de notificaciones in-app. No confundir con "Notificaciones push" (fuera del MVP según `PRD-frontend.md §11`) — esto es un centro de notificaciones dentro de la propia SPA, no push del sistema operativo/navegador.

## Alcance de esta entrega

Solo la campana del header ([AppLayout.tsx:111-114](../src/components/AppLayout.tsx#L111-L114)). El ícono de reloj (historial de cambios global) queda fuera de esta entrega. Ya existe un log parcial y distinto por oportunidad (`GET /oportunidades/:id/log`, tipo `OportunidadLogEntry`) que no se toca.

## Lógica de negocio (quién ve qué)

- Un usuario recibe notificación por acciones relacionadas a él pero **no** accionadas por él mismo. Nadie se notifica por su propia acción.
- **Vendedor / analista:** solo notificaciones sobre sus propios registros (empresas y oportunidades asignadas a él).
- **JDV / Gerente / Admin:** además de lo anterior si les aplica, ven acciones relevantes del equipo completo (mismo alcance que `ROLES_SUPERVISION` en `authStore.ts`).
- Las notificaciones también cubren recordatorios de tareas y eventos próximos a vencer o vencidos.

## Decisiones de arquitectura

| Decisión | Elegido | Razón |
|---|---|---|
| Entrega al frontend | Polling con TanStack Query | Consistente con el stack actual (sin WebSocket/SSE hoy); simple para un MVP |
| Superficie UI | Solo dropdown de la campana | Sin página/inbox dedicada por ahora |
| Reglas de recordatorio | Fijas (no configurables por usuario) | Evita entidad de preferencias y UI extra en esta primera entrega |
| Alcance del Gerente | Igual que JDV/Admin (equipo completo) | Consistente con `ROLES_SUPERVISION` ya existente |
| Retención | 30 días, máx. 20 en el dropdown | Evita crecimiento indefinido de la tabla; no hay inbox paginado que use más |

## Catálogo de eventos que disparan notificación

| Evento | Actor | Destinatario | `tipo` |
|---|---|---|---|
| Cambio de estado de oportunidad | vendedor/analista | su jdv, gerente, admin | `oportunidad_cambio_estado` |
| Empresa convertida de prospección a oportunidad | vendedor/jdv | jdv, gerente, admin del equipo | `empresa_convertida` |
| Evento creado en oportunidad/empresa | cualquiera | vendedor asignado (si el actor no es él mismo); si el actor es el vendedor, también su jdv/gerente/admin | `evento_creado` |
| Tarea creada/asignada | cualquiera | vendedor asignado (si el actor no es él mismo) | `tarea_creada` |
| Empresa asignada o reasignada | jdv/gerente/admin | vendedor destino | `empresa_asignada` |
| Oportunidad traspasada | jdv/gerente/admin | vendedor destino | `oportunidad_traspasada` |
| Recordatorio: tarea por vencer/vencida | sistema (job programado) | vendedor asignado a la tarea | `tarea_recordatorio` |
| Recordatorio: evento próximo/vencido sin registrar | sistema (job programado) | vendedor asignado a la oportunidad/empresa | `evento_recordatorio` |

## Modelo de datos (entidad `Notificacion`, backend)

```
id                          -- long
id_empleado_destinatario    -- a quién le llega
tipo                        -- enum, ver catálogo arriba
mensaje                     -- texto ya armado por el backend, listo para mostrar
entidad_tipo                -- 'oportunidad' | 'empresa'
entidad_id                  -- long
leida                       -- boolean
created_at                  -- timestamp ISO 8601
actor                       -- EmpleadoResumen de quien generó la acción (nombre para mostrar "Juan cambió...")
```

El frontend no arma el texto ni decide destinatarios — solo renderiza `mensaje` y navega a `/{entidad_tipo}s/{entidad_id}` al hacer clic (sin lógica de negocio en el cliente, regla 11 de `CLAUDE.md`).

## Responsabilidad del backend

1. Entidad `notificacion` (tabla nueva) + generación en cada flujo mutador existente que dispare un evento del catálogo (cambio de estado, crear evento, crear tarea, asignar/reasignar empresa, traspasar oportunidad, convertir prospección a oportunidad).
2. Job programado (p.ej. cada hora, `@Scheduled`) que evalúa tareas/eventos próximos a vencer o vencidos y genera el recordatorio **una sola vez por umbral** — necesita evitar duplicados (constraint único o flag "ya notificado" por tarea/evento + umbral).
3. Job de limpieza que purga notificaciones leídas con más de 30 días.
4. Endpoints nuevos, bajo `/api/v1`, mismo envelope `{data, meta, error}` del contrato:
   - `GET /notificaciones/no-leidas/count` → `{ count: number }`
   - `GET /notificaciones` → últimas 20 (leídas + no leídas) del usuario autenticado, orden desc por `created_at`
   - `PATCH /notificaciones/:id/leida` → marca una como leída
   - `PATCH /notificaciones/leidas` → marca todas como leídas (del usuario autenticado)
5. El filtrado por destinatario y por rol ya queda resuelto en el momento de creación de la notificación (no hace falta lógica de visibilidad adicional en el `GET`, solo `WHERE id_empleado_destinatario = usuario_actual`).
6. Actualizar `contrato_api.md` (dueño: backend) con la nueva sección "Notificaciones", incluyendo el catálogo de `tipo` como enum documentado.

## Responsabilidad del frontend (siguiente sesión de implementación)

- `src/types/notificacion.ts` — `Notificacion`, `TipoNotificacion` (union type espejo del enum del backend).
- `src/api/notificaciones.ts` — `notificacionesApi.listar()`, `.contarNoLeidas()`, `.marcarLeida(id)`, `.marcarTodasLeidas()`.
- `src/hooks/useNotificaciones.ts`:
  - `useNotificacionesNoLeidasCount()` — `refetchInterval` 30-60s, solo el contador para el badge.
  - `useNotificaciones(enabled)` — atado a la apertura del dropdown, trae las últimas 20.
  - `useMarcarNotificacionLeida()` / `useMarcarTodasLeidas()` — invalidan `qk.notificaciones` y `qk.notificacionesNoLeidasCount`.
- `qk.notificaciones` / `qk.notificacionesNoLeidasCount` en `queryKeys.ts`.
- Modificar `AppLayout.tsx`: envolver el botón de campana ([AppLayout.tsx:111-114](../src/components/AppLayout.tsx#L111-L114)) en un `Dropdown`/`Popover` de AntD (mismo patrón que el dropdown de usuario en [AppLayout.tsx:120-144](../src/components/AppLayout.tsx#L120-L144)); el punto rojo pasa de hardcodeado a condicional (`count > 0`); lista con mensaje + tiempo relativo; clic navega a la entidad y marca leída; botón "marcar todas como leídas".
- TDD: tests de los hooks (mock de `notificacionesApi`) y del dropdown (badge, click, navegación, marcar todas) antes del código, según `TESTING-frontend.md`.

## Fuera de alcance de esta entrega

- Ícono de reloj / historial de cambios global.
- Notificaciones push del navegador/SO.
- Preferencias de notificación configurables por usuario.
- Página/inbox dedicada con filtros y paginación.
