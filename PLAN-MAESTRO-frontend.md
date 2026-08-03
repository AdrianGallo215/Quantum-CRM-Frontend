# Quantum CRM Frontend — Plan Maestro

> Plan de ejecución para Claude Code. Repo: `quantum-crm-frontend`. Cada tarea es atómica: una sesión, termina con tests pasando y CI verde. **Toda tarea es TDD** — test que falla primero, luego el código (ver `docs/TESTING-frontend.md`).

---

## Cómo usar este plan

- Ejecutar las tareas **en orden**. No avanzar a una tarea sin completar sus dependencias.
- Cada tarea indica su **esfuerzo** sugerido para Opus 4.8 en Claude Code: `low` · `medium` · `high` · `extra-high` · `max`.
- Al cerrar cada **hito** (marcado con 🔍 AUDIT) Claude Code:
  1. Ejecuta las skills de auditoría indicadas y emite el reporte.
  2. Corrige los hallazgos bloqueantes (CRÍTICO/ALTO).
  3. Entrega al desarrollador la lista de **revisión manual**: qué mirar en código y qué probar en el navegador (flujos UX, estados de carga/error, responsividad).
  4. **Se detiene y espera** la validación del desarrollador antes de continuar.
- Las skills de auditoría viven en `docs/skills/`. El plan solo dice qué auditar, no cómo.

---

## Dependencia del backend

El frontend consume la API del backend. Cada fase del frontend asume que los endpoints correspondientes del backend **ya existen y están auditados**. El orden de fases está alineado con el plan del backend. Si un endpoint no está listo, usar MSW con la respuesta esperada de `contrato_api.md` para no bloquear el desarrollo, y validar contra el backend real al integrar.

---

## Niveles de esfuerzo — referencia

| Nivel | Cuándo |
|---|---|
| `low` | Configuración mecánica, componente de presentación simple, página estática |
| `medium` | Pantalla con una query, formulario simple, tabla con datos |
| `high` | Pantalla con varias queries/mutaciones, formulario con validación compleja, sincronización de cache |
| `extra-high` | Pantalla con lógica de interacción densa, múltiples estados, cálculos en vivo, flujos condicionales |
| `max` | El detalle de oportunidad con todos sus flujos: modal de sugerencia, retroceso, cálculo en vivo, sincronización 360 |

---

# FASE 0 — Base

### F0.1 — Bootstrap del proyecto · `medium`
Crear el proyecto React 18 + Vite + TypeScript (strict). Instalar y configurar Ant Design v5, TanStack Query v5, Zustand, React Hook Form, Zod, React Router v6, Axios. Estructura de carpetas (`api/`, `components/`, `pages/`, `store/`, `hooks/`, `types/`, `utils/`, `router/`). Configurar el tema de Ant Design con los tokens de `docs/DESIGN.md`.
- **Depende de:** nada
- **Aceptación:** `npm run dev` levanta; `npm run build` compila; el tema de Ant Design refleja `DESIGN.md`.

### F0.2 — Calidad y CI · `medium`
Configurar ESLint, Prettier, Vitest con umbrales de cobertura (85% hooks/utils, 70% global), React Testing Library, MSW. Crear el workflow de CI de `DEVOPS-frontend.md` con todos los gates. Protección de ramas.
- **Depende de:** F0.1
- **Aceptación:** `npm run lint type-check test build` pasan; el CI corre en un PR de prueba.

### F0.3 — Cliente API y tipos base · `high`
Crear `/src/api/client.ts` (Axios con `baseURL` desde env, `withCredentials: true`, interceptor de 401 con un único intento de refresh y redirect a login). Crear los tipos TypeScript base en `/src/types/` espejo de los DTOs de `contrato_api.md` (envelope `ApiResponse`, enums, entidades principales). Configurar MSW con handlers base.
- **Depende de:** F0.1
- **Aceptación:** el cliente envía cookies; el interceptor maneja 401 sin bucle; los tipos compilan en strict.

### F0.4 — Routing, guards y layout · `high`
Configurar React Router con las rutas del MVP. Implementar guards por rol (UX, no seguridad — basados en el rol de `GET /empleados/me`). Layout común (navegación, header con usuario) según `DESIGN.md`. Pantalla de "sin acceso" para 403.
- **Depende de:** F0.3
- **Aceptación:** un rol sin acceso a una ruta es redirigido; el layout refleja `DESIGN.md`; la navegación funciona.

### F0.5 — Login y cambio de contraseña · `high`
Pantalla de Login (email + contraseña, mensaje genérico de error, Zod). Flujo de `requiereCambioContrasena` que bloquea el acceso hasta cambiarla. Pantalla de cambio de contraseña. Store de usuario autenticado (Zustand, solo client state — el token vive en cookie httpOnly). Logout que limpia el cache (`queryClient.clear()`).
- **Depende de:** F0.4
- **Aceptación:** login exitoso navega a Inicio; fallido muestra mensaje genérico; `requiereCambioContrasena` bloquea; logout limpia cache.

> ## 🔍 AUDIT — Hito 0: Base, auth y routing
> **Ejecutar skills:** `docs/skills/audit-code-frontend.md` · `docs/skills/audit-security-frontend.md`
> **Auditar:** el manejo del token (que NUNCA toque localStorage/sessionStorage, que no se lea por JS), el interceptor de 401 (un solo reintento, sin bucle), los guards como UX y no seguridad, la limpieza de cache al logout, y la separación server/client state en el store de usuario. Esta es la base de seguridad del cliente — rigor extra.

---

# FASE 1 — Admin y catálogos

### F1.1 — API y hooks de catálogos · `medium`
Clientes API y hooks de TanStack Query para empleados, financiadoras, modelos, catálogo de eventos. Mutaciones con invalidación de cache correcta.
- **Depende de:** Hito 0
- **Aceptación:** cada hook tiene su query/mutación; las mutaciones invalidan las queries correctas.

### F1.2 — Panel Admin: empleados · `high`
`/admin/empleados`: lista, crear, editar, activar/desactivar, resetear contraseña. Solo admin (guard). Formularios con Zod. Mostrar la contraseña temporal generada (si el backend la devuelve). Manejo de errores del backend.
- **Depende de:** F1.1
- **Aceptación:** CRUD funciona; guard bloquea no-admin; errores del backend se muestran legibles.

### F1.3 — Panel Admin: financiadoras, modelos, catálogo · `high`
`/admin/financiadoras`, `/admin/modelos` (con aplicaciones multi-select, error si vacío), `/admin/catalogo-eventos`. Formularios con validación. Solo admin.
- **Depende de:** F1.1
- **Aceptación:** crear modelo sin aplicaciones muestra el error de la API; los tres CRUD funcionan.

> ## 🔍 AUDIT — Hito 1: Admin y catálogos
> **Ejecutar skills:** `docs/skills/audit-code-frontend.md` · `docs/skills/audit-security-frontend.md`
> **Auditar:** la invalidación de cache en las mutaciones (sincronización 360), los guards de admin, el manejo de errores del backend en formularios, y la ausencia de `any` en los tipos de los catálogos.

---

# FASE 2 — Empresas y contactos

### F2.1 — API y hooks de empresas y contactos · `medium`
Clientes API y hooks para empresas (con filtros), check de RUC, contactos, vinculaciones. Mutaciones con invalidación completa (empresa afecta inicio, prospección, cartera).
- **Depende de:** Hito 1
- **Aceptación:** hooks completos; las mutaciones de empresa invalidan todas las vistas dependientes.

### F2.2 — Pantalla Cartera · `high`
Tabs por `estado_cartera` (los derivados read-only). Tabla con empresa, RUC, distrito, segmentos, contactos, estado de oportunidad. Búsqueda por razón social/RUC. Navegación al detalle.
- **Depende de:** F2.1
- **Aceptación:** tabs funcionan; los derivados no permiten mover empresas; búsqueda filtra; navega al detalle.

### F2.3 — Formulario de creación de empresa · `high`
Modal/página de creación con check de RUC al perder foco (antes de continuar). Segmentos multi-select. Validación Zod. Manejo del `409 RUC_DUPLICADO`.
- **Depende de:** F2.1
- **Aceptación:** RUC duplicado se detecta antes de enviar; segmentos funcionan; el 409 se maneja legible.

### F2.4 — Detalle de Empresa · `extra-high`
Datos editables (menos `estado_cartera` derivado, read-only). Segmentos como tags editables. Contactos con cargo/toma_decision: buscar existente antes de crear (evita duplicados), vincular/desvincular. Bloque adaptativo según `estado_cartera`: tareas de prospección / resumen de oportunidad activa / historial. Botón "Crear oportunidad".
- **Depende de:** F2.2, F2.3
- **Aceptación:** `estado_cartera` derivado read-only; búsqueda de contacto antes de crear; bloque adaptativo correcto según estado.

> ## 🔍 AUDIT — Hito 2: Empresas y contactos
> **Ejecutar skills:** `docs/skills/audit-code-frontend.md` · `docs/skills/audit-security-frontend.md`
> **Auditar:** la invalidación de cache de empresa hacia todas las vistas (sincronización 360), el flujo de búsqueda de contacto antes de crear (evita duplicados), el check de RUC, el read-only de estados derivados, y el manejo de errores del backend en los formularios.

---

# FASE 3 — Pipeline y oportunidades (núcleo crítico)

### F3.1 — API y hooks de oportunidades · `high`
Clientes API y hooks para oportunidades (listado con filtros, detalle, creación, edición, cambio de estado, traspaso, log, eventos, contactos). Invalidación de cache cuidadosa: un cambio de estado afecta pipeline, inicio, detalle, y potencialmente cartera (estado_cartera derivado).
- **Depende de:** Hito 2
- **Aceptación:** hooks completos; las mutaciones de oportunidad invalidan todas las vistas afectadas incluyendo las que dependen de estado_cartera.

### F3.2 — Pantalla Pipeline · `high`
Oportunidades agrupadas por etapa (cerradas ocultas por defecto, toggle). Cada fila: empresa, monto, modelo, cantidad, cierre, indicador de pendientes. Indicador de pronta facturación cuando aplica. Navegación al detalle. Botón nueva oportunidad.
- **Depende de:** F3.1
- **Aceptación:** agrupación correcta; cerradas ocultas por defecto; navega al detalle.

### F3.3 — Formulario de creación de oportunidad · `extra-high`
Selector de empresa (con opción de crear nueva). Financiadora precargada como Calidda (editable). Modelo obligatorio. Cálculo de `monto_total` en vivo (read-only) al cambiar cantidad/precio/dcto. Validación Zod. Campos opcionales (dcto, garantía, finc_paralelo) visibles pero no obligatorios.
- **Depende de:** F3.1
- **Aceptación:** monto se calcula en vivo y es read-only; modelo obligatorio; financiadora default editable; crear empresa desde aquí funciona.

### F3.4 — Detalle de Oportunidad: estructura y propiedades · `extra-high`
Encabezado (empresa, etapa, monto read-only). Barra de progreso de etapas (sin cerrado en la barra positiva). Banner de cierre negativo con motivo si aplica. Propiedades editables (financiadora por JOIN, modelo, precio, dcto, garantía, cierre) menos monto_total. Contactos con rol. Edición inline con recálculo de monto.
- **Depende de:** F3.2
- **Aceptación:** monto read-only recalculado; propiedades editables salvo monto; banner de cierre correcto; términos de financiadora mostrados.

### F3.5 — Detalle de Oportunidad: cambio de estado y flujos críticos · `max`
Cambio de estado manual con: aviso crítico de retroceso (diálogo de confirmación antes de ejecutar), advertencias de eventos recomendados sin registrar (no bloquea), restricción del paso a `facturado` según rol del usuario. El flujo completo de cambio de estado respetando que la confirmación dispara la llamada real.
- **Depende de:** F3.4
- **Aceptación:** el retroceso muestra el aviso crítico antes de ejecutar; el paso a facturado está deshabilitado para roles sin permiso; las advertencias se muestran sin bloquear.

> ## 🔍 AUDIT — Hito 3: Núcleo de oportunidades (auditoría más exhaustiva)
> **Ejecutar skills:** `docs/skills/audit-code-frontend.md` · `docs/skills/audit-security-frontend.md`
> **Auditar:** el cálculo de `monto_total` en vivo (que sea read-only y nunca se envíe al backend), la sincronización 360 de los cambios de estado (que invaliden pipeline, inicio, cartera, detalle), el aviso crítico de retroceso, la restricción del paso a facturado por rol (ausente del DOM, no solo oculta con CSS), y la separación server/client state en toda la pantalla de detalle.

---

# FASE 4 — Eventos y tareas

### F4.1 — Tareas en el detalle de oportunidad · `high`
Sección de tareas pendientes con crear/completar/cancelar. Historial de tareas completadas colapsado por defecto. Tipos de acción, contacto, fecha. Invalidación de cache.
- **Depende de:** Hito 3
- **Aceptación:** crear/completar tarea actualiza la vista; historial colapsado por defecto.

### F4.2 — Eventos y modal de sugerencia · `max`
Sección de eventos pendientes (con fechas estimada/seguimiento) y ocurridos. Crear evento (catálogo o personalizado). **El flujo crítico:** marcar evento como ocurrido → si dispara cambio de estado, mostrar el modal de sugerencia no invasivo → confirmar ejecuta la segunda llamada (cambio de estado), descartar no. Este es el flujo de `reglas_negocio.md` más delicado del frontend.
- **Depende de:** F4.1
- **Aceptación:** marcar evento ocurrido que dispara muestra el modal; confirmar ejecuta el cambio de estado (segunda llamada); descartar deja la oportunidad sin cambio; eventos personalizados no muestran sugerencia.

> ## 🔍 AUDIT — Hito 4: Eventos y tareas
> **Ejecutar skills:** `docs/skills/audit-code-frontend.md` · `docs/skills/audit-security-frontend.md`
> **Auditar:** el flujo del modal de sugerencia (confirmar dispara segunda llamada, descartar no ejecuta nada), la invalidación de cache tras marcar eventos/tareas, el historial colapsable, y que la lógica de "confirmar" no cambie el estado directamente sin pasar por el endpoint de estado.

---

# FASE 5 — Prospección e Inicio

### F5.1 — Pantalla Prospección · `extra-high`
Dos zonas: "Requieren acción ahora" (3/3 hitos + 0 hitos con +14 días) y "En proceso" (resto ordenado). Por empresa: nombre, contacto, indicador de 3 hitos, días sin actividad, siguiente tarea. "Convertir a oportunidad" solo con 3/3 hitos (abre formulario con empresa precargada). Los datos vienen calculados del backend — el frontend no recalcula.
- **Depende de:** Hito 4
- **Aceptación:** las dos zonas se separan correctamente; convertir solo aparece con 3 hitos; navega al formulario precargado.

### F5.2 — Pantalla Inicio · `high`
Consumir `GET /inicio` (una sola llamada). Tareas pendientes (vencidas/hoy/próximas destacadas), eventos por seguir (vencidos destacados), resumen de pipeline, resumen de prospección. Cada ítem navega al detalle correspondiente.
- **Depende de:** F5.1
- **Aceptación:** una sola llamada carga todo; destacados visuales correctos; navegación desde cada ítem.

> ## 🔍 AUDIT — Hito 5: Prospección e Inicio
> **Ejecutar skills:** `docs/skills/audit-code-frontend.md` · `docs/skills/audit-security-frontend.md`
> **Auditar:** que el frontend no recalcule hitos (los toma del backend), la correcta separación de zonas en prospección, que Inicio use una sola llamada, los estados de carga/error de ambas pantallas, y la navegación.

---

# FASE 6 — Reportes

### F6.1 — Pantalla Reportes · `extra-high`
Los seis reportes con filtros de fecha (default mes actual) y vendedor donde aplica. Guard de ruta (vendedor/analista redirigidos). Visualizaciones apropiadas por reporte. Mostrar la advertencia de muestra pequeña que devuelve la API en velocidad-etapas. Estados de carga/error.
- **Depende de:** Hito 5
- **Aceptación:** los seis reportes renderizan; vendedor no accede a la ruta; la advertencia de muestra pequeña se muestra; filtros funcionan.

> ## 🔍 AUDIT — Hito 6: Reportes y cierre del frontend
> **Ejecutar skills:** `docs/skills/audit-code-frontend.md` · `docs/skills/audit-security-frontend.md`
> **Auditar:** el guard de reportes (vendedor/analista nunca acceden), la correcta visualización de cada reporte, y una **auditoría final integral** del frontend completo: cobertura global, ausencia de `any`, ausencia de secretos en el bundle, sincronización 360 en todos los flujos, manejo de token seguro, y el pipeline CI verde en todos los gates.

---

## Resumen de hitos y esfuerzo

| Hito | Tareas | Esfuerzo dominante |
|---|---|---|
| 0 — Base, auth, routing | F0.1–F0.5 | medium/high |
| 1 — Admin y catálogos | F1.1–F1.3 | high |
| 2 — Empresas y contactos | F2.1–F2.4 | high/extra-high |
| 3 — Núcleo de oportunidades | F3.1–F3.5 | **max** |
| 4 — Eventos y tareas | F4.1–F4.2 | **max** |
| 5 — Prospección e Inicio | F5.1–F5.2 | extra-high |
| 6 — Reportes | F6.1 | extra-high |

Las tareas `max` (F3.5 y F4.2) son los flujos donde la UX debe respetar exactamente las reglas de negocio: el cambio de estado con retroceso y el modal de sugerencia de eventos. Un error ahí rompe la coherencia entre lo que el vendedor ve y lo que el sistema hace.

---

## Nota de integración final

Tras completar ambos repos, realizar una **sesión de integración end-to-end** (fuera de este plan por repo): levantar backend y frontend juntos, verificar los flujos completos contra el backend real (no MSW), confirmar CORS, cookies cross-origin, y los flujos críticos: crear empresa → prospección → convertir a oportunidad → avanzar etapas vía eventos → facturar → verificar que la empresa pasó a cliente. Esta sesión valida que la sincronización 360 funciona de extremo a extremo entre los dos repos.
