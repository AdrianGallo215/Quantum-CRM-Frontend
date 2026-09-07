# Solicitud al equipo de backend — Campos faltantes para Solicitudes y Simulaciones (V42)

> Estado: **pendiente de implementar en el backend**. Son dos pedidos aditivos, sin relación funcional entre sí, agrupados en un solo documento porque surgieron del mismo plan (`plan-01-multimodelo-tareas.md`, T6.1) y comparten el mismo principio: *"si el frontend necesita un cambio de contrato, se pide — no se parchea en el cliente"*. No se modifica `contrato_api.md` unilateralmente — este documento es la solicitud formal, a incorporar ahí por el equipo de backend cuando se implemente.

---

## 1. `id_oportunidad` en el DTO de `Solicitud` (§20)

### Contexto / por qué se necesita

Con la migración a multi-modelo (V42), `POST /solicitudes` para `tipo: "descuento"` exige `entidad_tipo: "oportunidad_item"`, y `entidad_id` pasó a ser el `id` del **ítem** (`OportunidadItemDto.id`), no el de la oportunidad (`contrato_api.md` §20, nota V42-multimodelo).

El DTO de solicitud que devuelven `POST /solicitudes`, `GET /solicitudes` y `GET /solicitudes/:id` expone: `id`, `tipo`, `estado`, `rol_aprobador`, `entidad_tipo`, `entidad_id`, `entidad_descripcion`, `dcto_solicitado`, `id_vendedor_nuevo`, `motivo`, `solicitante`, `created_at`. **No trae `id_oportunidad`.**

Con `entidad_id` apuntando al ítem, la bandeja de solicitudes (`BandejaSolicitudes.tsx`, `SolicitudesPage.tsx`) no tiene forma de construir el enlace `/oportunidades/:id` sin pedir cada oportunidad y buscar en qué `items[]` aparece ese `entidad_id` — inviable en una lista paginada.

Esto no es hipotético: motivó un bug real de corrupción de navegación que `T5.1` acaba de corregir en este mismo plan. Antes de la corrección, el código construía el enlace asumiendo `entidad_id === id_empresa` (arrastre de un patrón pre-V42), lo que llevaba a `/empresas/<id del ítem>` — **un enlace a una empresa que no existe, o peor, a la empresa equivocada**. La corrección (`src/utils/solicitudes.ts`, función `rutaDeSolicitud`) degrada la fila a **no clicable** para `entidad_tipo: 'oportunidad_item'`, mostrando solo `entidad_descripcion` — es la lectura segura del principio de `CLAUDE.md`: un enlace que no navega es mejor que uno que navega mal. Pero deja a las filas de descuento permanentemente sin acción hasta que este campo exista.

### Pedido

Exponer `id_oportunidad` (nullable — solo aplica cuando `entidad_tipo: "oportunidad_item"`) en el DTO de `Solicitud`, en las respuestas de:
- `POST /solicitudes`
- `GET /solicitudes`
- `GET /solicitudes/:id`

**Respuesta 200/201 propuesta** (campo nuevo en negrita conceptual, resto sin cambios):
```json
{
  "id": 45,
  "tipo": "descuento",
  "estado": "pendiente",
  "rol_aprobador": "jdv",
  "entidad_tipo": "oportunidad_item",
  "entidad_id": 502,
  "id_oportunidad": 101,
  "entidad_descripcion": "KinWin K12 · Transportes Lima SAC",
  "dcto_solicitado": "5.00",
  "id_vendedor_nuevo": null,
  "motivo": "Cliente frecuente, tercera compra del año",
  "solicitante": { "id": 8, "nombre": "Juan Pérez" },
  "created_at": "2026-09-07T10:00:00Z"
}
```

### Impacto actual sin este campo

Las filas de solicitud con `entidad_tipo: "oportunidad_item"` **no son clicables** desde V42 — es el estado actual del frontend (mitigación aplicada en `T5.1`/D9 del mapa, no un bug pendiente).

---

## 2. `id_empresa` / `empresa` en el DTO de simulación (§23)

### Contexto / por qué se necesita

`reglas_simulaciones.md` §8.2 pide poder agrupar la vista de simulaciones **por oportunidad o por empresa**. El DTO de simulación (`GET /simulaciones`, `GET /simulaciones/:id`, y por extensión `POST/PATCH /simulaciones`) expone `id`, `nombre`, `nombre_es_manual`, `modo`, `id_oportunidad_item`, `id_oportunidad`, `id_modelo`, `modelo`, `id_simulacion_origen`, `precio_venta`, `descuento`, `cuota_inicial`, `plazo_meses`, `tea`, `valor_residual`, `dias_trabajados`, `comision_estructuracion`, `cuota_final`, `es_principal`, `created_at`, `updated_at`, `eliminacion_prevista_el` (`contrato_api.md` §23, `GET /simulaciones`).

**No trae `id_empresa` ni el objeto empresa.** La razón social aparece embebida dentro del `nombre` autogenerado (p. ej. `"Transportes Lima SAC · KinWin K12 · Leasing · #1"`), pero eso es un string de presentación, no un dato para agrupar: desaparece si el usuario puso `nombre` manual (`nombre_es_manual: true`), y parsearlo para extraer la razón social sería exactamente el tipo de inferencia que el encargo prohíbe (§8.1: *"eso es un string de presentación, no un dato para agrupar [...] no lo resuelvas parseando el nombre"*).

Agrupar por empresa hoy solo sería posible pidiendo cada `id_oportunidad` y leyendo su empresa — inviable en una lista paginada de simulaciones, igual que el pedido 1 de este documento.

### Pedido

Exponer `id_empresa` y `empresa: { id, razon_social }` en el DTO de simulación, en las respuestas de:
- `GET /simulaciones`
- `GET /simulaciones/:id`
- `POST /simulaciones`
- `PATCH /simulaciones/:id`

**Respuesta 200 propuesta** (campos nuevos, resto igual al ejemplo de `contrato_api.md` §23):
```json
{
  "id": 87,
  "nombre": "Transportes Lima SAC · KinWin K12 · Leasing · #1",
  "nombre_es_manual": false,
  "modo": "leasing",
  "id_oportunidad_item": 502,
  "id_oportunidad": 101,
  "id_empresa": 12,
  "empresa": { "id": 12, "razon_social": "Transportes Lima SAC" },
  "id_modelo": 1,
  "modelo": { "id": 1, "codigo": "KinWin K12" },
  "...": "resto de campos sin cambios"
}
```

Es un cambio chico: `id_oportunidad` ya está en el DTO, y de ahí a `id_empresa` hay un solo join adicional (`oportunidad.id_empresa`) del lado del backend.

---

## 3. Lo que NO se pide (constancia)

**`cantidad` en el DTO de simulación** (`reglas_simulaciones.md` §8.2) — **no se pide** un campo nuevo para esto. Se resuelve en el flujo real vía `GET /oportunidades/:id` → `items[].cantidad`, sin necesidad de un request adicional: la vista de simulación siempre se llega a través de una oportunidad ya cargada, o de su ítem enlazado (`id_oportunidad_item`), y esa oportunidad ya trae `items[]` completo. Se reevalúa en `plan-04-mapa-vistas-simulaciones.md` al construir `<PropuestaFinanciera/>`, por si ese componente en particular necesitara la cantidad sin tener la oportunidad cargada — hoy no es el caso.

---

## No rompe nada existente

- No modifica ningún endpoint ya implementado.
- No cambia ninguna regla de negocio, permiso ni cálculo.
- Es aditivo: campos nuevos en shapes ya existentes (`Solicitud`, Simulación). Ningún campo se quita ni se renombra.
