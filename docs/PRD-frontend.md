# Quantum CRM Frontend — Product Requirements Document

> **Documento vivo.** Fuente de verdad para el desarrollo del frontend. Repo: `quantum-crm-frontend`. Cualquier contradicción entre este documento y una conversación anterior: este documento gana.

---

## 1. Contexto y visión

**Producto:** Interfaz web del CRM a medida para Quantum Investment, representante exclusivo de la marca de buses KinWin en Perú. Modelo de venta tripartita: Quantum + cliente + entidad financiadora (Calidda como default).

**Rol de este repo:** el frontend es una SPA que consume la API REST del backend (repo separado `quantum-crm-backend`). No contiene lógica de negocio — la lógica vive en el backend. El frontend presenta datos, captura inputs, valida por UX y mantiene la sincronización de su cache con el servidor.

**Usuarios y sus pantallas principales:**
- **Vendedores** — Inicio, Pipeline, Prospección, detalle de oportunidades y empresas. Herramienta de trabajo diario.
- **Aldo (jdv)** — Todo lo anterior sobre el equipo completo + Reportes.
- **Gustavo (gerente)** — Reportes principalmente.
- **Admin** — Panel de administración.

---

## 2. Documentos de referencia

### En este repo (`docs/`)

| Archivo | Contenido |
|---|---|
| `docs/contrato_api.md` | Copia de referencia del contrato de API (DUEÑO: backend) |
| `docs/DESIGN.md` | Sistema de diseño normativo (provisto por el equipo) |
| `docs/stitch-prototypes/` | Carpetas de Prototipos HTML y PNG de referencia (NO definitivos) |
| `docs/TESTING-frontend.md` | Estrategia TDD del frontend |
| `docs/SECURITY-frontend.md` | Requisitos de seguridad del cliente |
| `docs/DEVOPS-frontend.md` | Pipeline CI/CD y deploy del frontend |

### Contrato de API — propiedad del backend

`docs/contrato_api.md` es una **copia de referencia**. El dueño del contrato es el repo backend. El frontend lo consume tal como está. **Si el frontend necesita un cambio en la API, se solicita al equipo de backend — no se modifica este documento unilateralmente ni se asume un comportamiento distinto.** Cuando el backend actualiza el contrato, se sincroniza esta copia.

La matriz de permisos también vive en el backend. El frontend la respeta a nivel de UX (ocultar/deshabilitar acciones según rol), pero **la autorización real la impone el backend**. El frontend nunca asume que ocultar un botón es seguridad.

**Regla:** si algo no está en estos documentos ni en este PRD, preguntar antes de implementar.

---

## 3. Stack tecnológico

```
Framework:      React 18 + Vite
Lenguaje:       TypeScript (strict mode)
UI:             Ant Design v5
Server state:   TanStack Query v5
Client state:   Zustand
Formularios:    React Hook Form + Zod
Routing:        React Router v6
HTTP:           Axios (cliente centralizado en /src/api)
Node:           20.x
```

---

## 4. Comandos de desarrollo

```bash
npm install              # Instalar dependencias
npm ci                   # Instalar exacto desde package-lock (CI)
npm run dev              # Dev server (puerto 5173)
npm run build            # Build de producción
npm run preview          # Previsualizar el build
npm run lint             # ESLint
npm run type-check       # TypeScript sin emitir (tsc --noEmit)
npm run test             # Vitest
npm run test:coverage    # Vitest con cobertura
```

---

## 5. Estructura del proyecto

```
quantum-crm-frontend/
├── src/
│   ├── api/             # Clientes de API por dominio
│   │   ├── client.ts    # Instancia Axios con interceptores
│   │   ├── empresas.ts
│   │   ├── oportunidades.ts
│   │   ├── eventos.ts
│   │   ├── tareas.ts
│   │   └── ...
│   ├── components/      # Componentes reutilizables (no atados a una página)
│   ├── pages/           # Una carpeta por pantalla
│   │   ├── Login/
│   │   ├── Inicio/
│   │   ├── Pipeline/
│   │   ├── Prospeccion/
│   │   ├── Cartera/
│   │   ├── OportunidadDetalle/
│   │   ├── EmpresaDetalle/
│   │   ├── Reportes/
│   │   └── Admin/
│   ├── store/           # Zustand stores (solo client state)
│   ├── hooks/           # Custom hooks (incluye los de TanStack Query)
│   ├── types/           # Tipos TypeScript (espejo de los DTOs del backend)
│   ├── utils/           # Helpers puros (formato de fechas, montos, etc.)
│   └── router/          # Configuración de rutas y guards por rol
├── docs/                # contrato_api (ref), DESIGN, stitch-prototypes
├── Dockerfile
├── nginx.conf
├── .env.example
└── vite.config.ts
```

---

## 6. Convenciones de código

### 6.1 TypeScript estricto

```typescript
// strict mode. NUNCA 'any'. Usar 'unknown' + narrowing si el tipo es incierto.
interface Empresa {
  id: number
  ruc: string
  razonSocial: string
  estadoCartera: EstadoCartera
  segmentos: Segmento[]
  vendedor: EmpleadoResumen | null
}

// Enums como union types de strings, espejo exacto de los enums del backend.
type EstadoCartera =
  | 'no_contactado'
  | 'no_aplica'
  | 'no_interesado'
  | 'prospeccion'
  | 'oportunidad_activa'
  | 'cliente'
```

Los tipos del frontend reflejan los DTOs del `contrato_api.md`. Mantenerlos sincronizados manualmente (o generar desde OpenAPI en fase posterior).

### 6.2 Separación de estado: servidor vs. cliente

Esta distinción es la base de la sincronización 360 en el cliente:

- **Server state** (empresas, oportunidades, tareas — todo lo que vive en el backend) → **siempre** TanStack Query. Es la única fuente de verdad del lado del cliente para datos del servidor. **Nunca copiar datos del servidor a Zustand.**
- **Client state** (modales abiertos, tabs seleccionados, filtros locales, pasos de wizard) → Zustand o `useState` local.

Mezclar los dos es la causa raíz de datos desincronizados en el frontend.

### 6.3 Queries y mutations

```typescript
// Lectura con TanStack Query
const { data: empresa, isLoading, error } = useQuery({
  queryKey: ['empresa', id],
  queryFn: () => empresasApi.getById(id),
})

// Mutación: invalida TODAS las queries afectadas para mantener sincronización 360
const { mutate } = useMutation({
  mutationFn: empresasApi.actualizar,
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ['empresa', variables.id] })
    queryClient.invalidateQueries({ queryKey: ['empresas'] })
    queryClient.invalidateQueries({ queryKey: ['inicio'] })
    queryClient.invalidateQueries({ queryKey: ['prospeccion'] })
  },
})
```

### 6.4 Llamadas HTTP

- Toda llamada pasa por `/src/api/`, nunca `fetch` o `axios` directo en componentes.
- El cliente Axios (`/src/api/client.ts`) centraliza: base URL desde env, envío de cookies (`withCredentials: true`), e interceptor que ante un 401 intenta refrescar el token y reintenta, o redirige a login.

### 6.5 Formularios

- React Hook Form + Zod. El schema de Zod es la única fuente de validación del lado del cliente.
- La validación del frontend es solo para UX. La validación autoritativa es del backend.

```typescript
const schema = z.object({
  ruc: z.string().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos'),
  razonSocial: z.string().min(1, 'Requerido'),
  idModelo: z.number({ required_error: 'El modelo es obligatorio' }),
})
```

### 6.6 Reglas generales

- Componentes funcionales con hooks. Nunca componentes de clase.
- Componentes: `PascalCase`. Hooks custom: `useCamelCase`. Archivos de componente: `NombreComponente.tsx`.
- `const` por defecto, `let` solo cuando se reasigna. Nunca `var`.
- Sin lógica de negocio en componentes de UI. Extraer a hooks custom o utils.
- ESLint + Prettier. El CI falla ante errores de lint o formato.
- Nunca `dangerouslySetInnerHTML` con datos del usuario o del servidor (ver `SECURITY-frontend.md`).

---

## 7. Sincronización 360 en el cliente

**Principio:** tras modificar un dato en una pantalla, ninguna otra pantalla puede mostrar el valor antiguo al revisitarse.

Cómo se garantiza:

- **TanStack Query es la única fuente de verdad** para datos del servidor. Nunca se copia un dato del servidor a estado local; los componentes lo leen de la query.
- **Tras cada mutación, se invalidan todas las queries afectadas.** Una empresa modificada invalida `['empresa', id]`, `['empresas']`, `['inicio']`, `['prospeccion']`, `['cartera']` según corresponda. Esto fuerza refetch y propaga el cambio a toda la app.
- **Las `queryKey` se diseñan jerárquicamente** para que la invalidación sea precisa y completa.

**Criterio de aceptación transversal:** este comportamiento se valida explícitamente en los tests de integración (ver `TESTING-frontend.md`).

---

## 8. Referencia de diseño: DESIGN.md y prototipos de Stitch

- **`docs/DESIGN.md`** — sistema de diseño oficial (paleta, tipografía, espaciado, componentes). **Fuente normativa** de la estética. Se sigue con precisión.

- **`docs/stitch-prototypes/`** — carpetas de prototipos HTML y PNG generados en Google Stitch. **No son el diseño definitivo.** Son una referencia de alta calidad sobre disposición, flujo e intención de cada pantalla.

**Cómo tratar los prototipos de Stitch:**

- ❌ **No copiarlos literalmente.** No portar el HTML/CSS de Stitch tal cual. Son prototipos, no usan Ant Design ni respetan necesariamente todos los tokens de `DESIGN.md`.
- ❌ **No ignorarlos ni recrear desde cero.** Contienen decisiones de layout y UX pensadas que deben respetarse.
- ✅ **Usarlos como referencia de estructura e intención**, reconstruyendo con Ant Design v5 y los tokens de `DESIGN.md`. La disposición, jerarquía visual, flujo e información mostrada vienen del prototipo; la implementación concreta (componentes, estilos) viene de Ant Design y `DESIGN.md`.

En resumen: el prototipo dice *qué va y dónde*; `DESIGN.md` y Ant Design dicen *cómo se ve y con qué se construye*.

---

## 9. Pantallas del MVP

Cada pantalla consume endpoints definidos en `contrato_api.md`. La autorización la impone el backend; el frontend ajusta la UX según el rol del usuario autenticado.

### 9.1 Login
**Ruta:** `/login` · **Acceso:** público

- Formulario email + contraseña. Token en cookie httpOnly (lo setea el backend).
- Si `empleado.requiereCambioContrasena = true` → redirigir a `/cambiar-contrasena` antes de entrar.
- Error genérico ante credenciales inválidas: `"Email o contraseña incorrectos"`.
- Sin "olvidé mi contraseña" en MVP.

**Criterios de aceptación:**
- [ ] Login exitoso redirige al Inicio
- [ ] Login fallido muestra mensaje genérico
- [ ] `requiereCambioContrasena` bloquea el acceso al resto hasta cambiarla

### 9.2 Inicio
**Ruta:** `/` · **Acceso:** todos

- Una sola llamada: `GET /inicio`
- Tareas pendientes ordenadas (vencidas, hoy, próximas), eventos por seguir, resumen de pipeline y prospección
- Cada ítem navega al detalle correspondiente

**Criterios de aceptación:**
- [ ] El vendedor ve solo sus datos; jdv/gerente/admin ven los del equipo
- [ ] Tareas vencidas y eventos vencidos se destacan visualmente
- [ ] Carga con una sola llamada HTTP

### 9.3 Pipeline
**Ruta:** `/pipeline` · **Acceso:** todos

- Oportunidades agrupadas por etapa (`evaluacion_calidda`, `documentos_legales`, `facturado`). Cerradas ocultas por defecto.
- Cada fila: empresa, monto, modelo, cantidad, cierre estimado, indicador de pendientes
- Indicador de pronta facturación cuando aplica

**Criterios de aceptación:**
- [ ] El backend ya filtra por rol; el frontend muestra lo que recibe
- [ ] Las cerradas están ocultas por defecto con opción de mostrarlas
- [ ] Botón "Nueva oportunidad" abre el formulario

### 9.4 Detalle de Oportunidad
**Ruta:** `/oportunidades/:id` · **Acceso:** todos

- Encabezado con empresa, etapa, monto total (solo lectura)
- Barra de progreso de etapas (sin `cerrado` en la barra positiva)
- Si está `cerrado`: banner con motivo y nota de recuperable
- Propiedades editables (financiadora por JOIN, modelo, precio unitario, descuento, garantía, cierre) excepto `monto_total`
- Tareas pendientes; historial de tareas completadas colapsado por defecto
- Eventos pendientes (con fechas) y ocurridos en sección separada
- Contactos con su rol
- Al marcar evento ocurrido que dispara cambio: modal no invasivo de sugerencia
- Al cambiar estado con eventos recomendados sin registrar: advertencia (no bloquea)
- Al retroceder estado: aviso crítico antes de confirmar

**Criterios de aceptación:**
- [ ] `monto_total` visible pero no editable; se recalcula al cambiar cantidad, precio o descuento
- [ ] El paso a `facturado` solo habilitado para admin, gerente, analista (según rol del usuario)
- [ ] Historial de tareas colapsado al cargar
- [ ] El modal de sugerencia NO cambia el estado solo; requiere confirmación → segunda llamada HTTP
- [ ] El retroceso muestra diálogo de confirmación antes de ejecutar

### 9.5 Prospección
**Ruta:** `/prospeccion` · **Acceso:** todos

- Dos zonas: **Requieren acción ahora** (3/3 hitos listas para convertir + 0 hitos con +14 días sin actividad) y **En proceso** (resto, ordenado por avance y antigüedad)
- Por empresa: nombre, contacto principal, indicador de 3 hitos, días sin actividad, siguiente tarea
- "Convertir a oportunidad" solo visible con 3/3 hitos

**Criterios de aceptación:**
- [ ] Los datos vienen calculados de `GET /prospeccion`; el frontend no recalcula hitos
- [ ] "Convertir a oportunidad" abre el formulario con la empresa precargada
- [ ] El botón de convertir no aparece sin los 3 hitos

### 9.6 Cartera
**Ruta:** `/cartera` · **Acceso:** todos

- Tabs por `estado_cartera`. Tabs `oportunidad_activa` y `cliente` de solo lectura
- Tabla con empresa, RUC, distrito, segmentos, contactos, estado de oportunidad
- Búsqueda por razón social o RUC
- "Nueva empresa" con check de RUC duplicado antes de continuar

**Criterios de aceptación:**
- [ ] Los tabs derivados no permiten mover empresas manualmente
- [ ] El check de RUC (`GET /empresas/ruc/:ruc`) corre al perder foco del campo, antes de continuar

### 9.7 Detalle de Empresa
**Ruta:** `/empresas/:id` · **Acceso:** todos

- Datos editables menos `estado_cartera` derivado
- Segmentos como tags editables
- Contactos con cargo y toma_decision; vincular existente o crear nuevo
- Bloque adaptativo según `estado_cartera`: tareas de prospección / resumen de oportunidad activa / historial de oportunidades

**Criterios de aceptación:**
- [ ] `estado_cartera` derivado se muestra read-only
- [ ] Al agregar contacto, se busca entre existentes antes de crear
- [ ] Contacto existente en otra empresa se vincula, no se duplica

### 9.8 Reportes
**Ruta:** `/reportes` · **Acceso:** admin, gerente, jdv

- Seis reportes con filtros de fecha y vendedor donde aplica
- Si un vendedor o analista llega a esta ruta, el router lo redirige (la API devolvería 403)

**Criterios de aceptación:**
- [ ] Vendedor/analista no pueden navegar a `/reportes` (guard de router + 403 del backend)
- [ ] El reporte de velocidad muestra la advertencia de muestra pequeña que devuelve la API
- [ ] Filtros de fecha con default al mes actual

### 9.9 Panel de Administración
**Ruta:** `/admin` · **Acceso:** solo admin

- `/admin/empleados`, `/admin/financiadoras`, `/admin/modelos`, `/admin/catalogo-eventos`

**Criterios de aceptación:**
- [ ] Rol distinto de admin no puede navegar a `/admin/*`
- [ ] Crear modelo sin aplicaciones muestra el error `MODELO_SIN_APLICACIONES` de la API

---

## 10. Routing y guards por rol

- React Router v6 con guards que verifican el rol del usuario autenticado antes de renderizar una ruta protegida.
- Los guards son **UX, no seguridad** — evitan que un usuario navegue a una pantalla que no le corresponde, pero la seguridad real la impone el backend con cada request.
- Ante un 401 del backend (sesión expirada), el interceptor de Axios intenta refrescar; si falla, redirige a `/login`.
- Ante un 403, mostrar una pantalla de "sin acceso" amigable.

---

## 11. Límites del MVP — qué NO implementar

| No implementar | Razón |
|---|---|
| Vistas de módulo financiero (comisiones, cuotas) | Post-MVP |
| Gestión de buses entregados | Post-MVP |
| Import de Excel/CSV | Post-MVP |
| Visualización de pronta facturación | El backend no la expone en MVP |
| "Olvidé mi contraseña" | El admin resetea |
| Dark mode | No está en el alcance |
| Notificaciones push | Sin integración en MVP |

Si parece necesario algo no listado, **pausar y preguntar**.

---

## 12. Plan de implementación por fases

Construir en este orden, alineado con la disponibilidad de endpoints del backend. Cada tarea es TDD (ver `TESTING-frontend.md`).

### Fase 0 — Base
- [ ] Proyecto React + Vite + TypeScript + Ant Design
- [ ] Cliente Axios con interceptores (cookies, refresh de token)
- [ ] Routing base con guards por rol
- [ ] Pantalla de Login con flujo de cambio de contraseña obligatorio
- [ ] Layout común (navegación, header) según `DESIGN.md`
- [ ] Pipeline CI con gates (ver `DEVOPS-frontend.md`)

### Fase 1 — Admin y catálogos
- [ ] Panel de administración con sus cuatro subsecciones
- [ ] Formularios de empleados, financiadoras, modelos, catálogo de eventos

### Fase 2 — Empresas y contactos
- [ ] Pantalla Cartera con tabs y búsqueda
- [ ] Pantalla Detalle de Empresa con bloque adaptativo
- [ ] Formularios de creación de empresa (con check de RUC) y contactos

### Fase 3 — Pipeline y oportunidades
- [ ] Pantalla Pipeline agrupada por etapa
- [ ] Pantalla Detalle de Oportunidad completa
- [ ] Formulario de creación de oportunidad con cálculo de monto en vivo
- [ ] Modal de sugerencia de cambio de estado y aviso de retroceso

### Fase 4 — Eventos y tareas
- [ ] Gestión de tareas y eventos en el detalle de oportunidad
- [ ] Historial colapsable

### Fase 5 — Prospección e Inicio
- [ ] Pantalla Prospección con dos zonas
- [ ] Pantalla Inicio

### Fase 6 — Reportes
- [ ] Pantalla Reportes con los seis reportes y filtros

---

## 13. Variables de entorno

Ver `.env.example`:

```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

En producción apunta al dominio del backend. Nunca commitear `.env` (solo `.env.example`).

---

## 14. Testing

Desarrollo **TDD**. Estrategia completa en `docs/TESTING-frontend.md`. Regla resumida: ninguna tarea se considera completa sin sus tests escritos primero y pasando.

```bash
npm run test    # debe pasar antes de cada commit
```
