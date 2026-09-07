# Plan 00 — Mapa: migración del frontend a oportunidades multi-modelo (V42)

**Fecha:** 2026-09-07
**Autor del plan:** Opus 5 (§1.1 del encargo — los planes no se redactan en Sonnet)
**Origen:** investigación previa exigida por `simulaciones_contrato_frontend.md` §1.3.
**Estado:** prerrequisito **bloqueante** de todo el módulo de Simulaciones.

---

## 0. Por qué existe este plan (y por qué no estaba en el encargo)

El encargo `simulaciones_contrato_frontend.md` §4.1 pide mostrar `cuota_quantum` y
`cuota_total` **"por ítem, dentro de `items[]`"**.

**Este frontend no tiene `items[]`.** Sigue modelando una oportunidad de un solo
modelo, con `id_modelo` / `cantidad` / `precio_unitario` / `dcto` en la raíz — campos
que el backend **retiró** el 2026-09-03 (migraciones V42 y V46).

El encargo dio por hecho que esta migración ya estaba adoptada. No lo está. Las Fases
1 a 7 que propone §10 son inejecutables sin ella: no existe el objeto dentro del cual
colgar los campos de cuota.

De ahí este Plan 00, que el encargo no contemplaba.

---

## 1. Fase de investigación — documentos consultados y qué dicen (§1.3)

> El encargo exige que las reglas ya escritas queden **citadas textualmente** en el
> plan, para que no se pierdan por el volumen de contexto de una sesión larga.

### 1.1 Documentos leídos

| Documento | Ubicación real | Estado |
|---|---|---|
| `simulaciones_contrato_frontend.md` | adjunto del encargo | vigente |
| `contrato_api.md` §10, §20, §22–§24, §28 | **`CRM BackEnd - copia/docs/`** | vigente |
| `reglas_simulaciones.md` (439 líneas) | **`CRM BackEnd - copia/docs/`** | vigente |
| `matriz_permisos.md` §2.15 | **`CRM BackEnd - copia/docs/`** | vigente |
| `CLAUDE.md` (este repo) | raíz | vigente |
| `docs/TESTING-frontend.md` | este repo | vigente |
| `docs/contrato_api.md` | este repo | **DESACTUALIZADO — ver K1** |

### 1.2 Citas textuales que gobiernan este plan

**`contrato_api.md` §10, notas de V42 (backend):**

> `id_modelo`, `modelo`, `cantidad`, `precio_unitario`, `dcto` **ya no viven en la
> raíz** de la oportunidad: cada modelo vendido es un `item` dentro de `items`. Una
> oportunidad con un solo modelo sigue teniendo un `items` de un solo elemento — no
> cambia el caso de uso simple, solo dónde vive el dato.

**`contrato_api.md` §28, changelog 2026-09-03, columna "Acción para frontend":**

> **Dejar de leer `id_modelo`/`modelo`/`cantidad`/`precio_unitario`/`dcto` de la raíz
> de la oportunidad** y leerlos de `items[]` [...] **Empezar a usar
> `POST/PUT/DELETE /oportunidades/:id/items`** — `PUT /oportunidades/:id` ya no sirve
> para eso. Actualizar el formulario de edición de oportunidad para no enviar los
> campos viejos (se ignoran, no rompen, pero ya no hacen nada). Quitar
> `precio_unitario` de cualquier selector de orden del listado. Para el flujo de
> solicitar descuento, enviar `entidad_tipo: "oportunidad_item"` con el `id` del ítem,
> no de la oportunidad.

**`contrato_api.md` §10, `PUT /oportunidades/:id`:**

> Este endpoint **ya NO acepta** `id_modelo`, `cantidad`, `precio_unitario`/`precio_venta`,
> `dcto`/`descuento` ni `monto_total` [...] Si vienen en el body, **se ignoran en
> silencio (no hay error)**: el DTO simplemente no los declara.

**`contrato_api.md` §20, nota V42 sobre solicitudes:**

> para `tipo: "descuento"`, `entidad_tipo` **debe** ser `oportunidad_item` — el valor
> `oportunidad` ya no se acepta para este tipo [...] `entidad_id` es el `id` del
> **ítem**, no el de la oportunidad. Un `entidad_tipo` distinto de `oportunidad_item`
> en una solicitud de tipo `descuento` responde `400 VALIDACION`.

**`CLAUDE.md` regla 10 (este repo):**

> **`monto_total` es read-only**, se muestra calculado.

**`CLAUDE.md` regla 4 — sincronización 360:**

> tras cada mutación, invalidar TODAS las queries afectadas. Tras editar un dato,
> ninguna otra vista puede mostrar el valor viejo.

---

## 2. Hallazgos (K)

### K1 — El `contrato_api.md` de este repo está desactualizado

`docs/contrato_api.md` (frontend) tiene §23 = "Enums" y §24 = "Notas Drive". La copia
del backend tiene §22 = "Tipo de cambio", §23 = "Simulaciones", §24 = "Calculadora",
§26 = "Enums", §27 = "Notas Drive".

Faltan **4 entradas de changelog**: `2026-09-01` (tipo de cambio), `2026-09-03` (V42
multi-modelo, **breaking**), `2026-09-04` (reportes leen ítems), `2026-09-07` (los 11
endpoints de simulaciones + 5 campos de cuota).

`CLAUDE.md` dice que el contrato es *"copia de referencia — dueño es el backend"*.
Trabajar contra la copia vieja garantiza escribir tipos equivocados.

### K2 — El tipo `Oportunidad` del frontend es el shape pre-V42

`src/types/oportunidad.ts:20-45` declara en la raíz: `id_modelo`, `modelo`, `cantidad`,
`precio_unitario`, `dcto`, `monto_total`. De esos, **solo `monto_total` sigue
existiendo** en el DTO del backend. No existe `items`.

### K3 — Alcance medido: 111 usos en 17 archivos

```
src/api/oportunidades.ts                  src/pages/Contactos/ContactoDetallePage.tsx
src/components/CrearTareaModal.tsx        src/pages/EmpresaDetalle/EmpresaDetallePage.tsx
src/components/NuevaOportunidadModal.tsx  src/pages/OportunidadDetalle/OportunidadDetallePage.tsx
src/components/SolicitudModal.tsx         src/pages/OportunidadDetalle/PropiedadesCard.tsx
src/hooks/useSolicitudes.ts               src/pages/Pipeline/PipelinePage.tsx
src/types/contacto.ts                     src/pages/Pipeline/TablaOportunidades.tsx
src/types/oportunidad.ts                  src/pages/Reportes/ReportesPage.tsx
src/types/reportes.ts                     src/utils/monto.ts
src/utils/solicitudes.ts
```

### K4 — `cuota_financiadora` no existe en el frontend

Campo nuevo del ítem, **editable por el vendedor**, default `937.50`
(`reglas_simulaciones.md` §1.2). Sin él no hay `cuota_total`: el encargo §4.1 define
`cuota_total = cuota_quantum + cuota_financiadora`. Cero ocurrencias en `src/`.

### K5 — El peligro silencioso: `PUT /oportunidades/:id` acepta y descarta

Hoy `PropiedadesCard` envía `id_modelo`, `cantidad`, `precio_unitario` y `dcto` en el
`PUT`. El backend **no devuelve error**: los ignora. El usuario ve "Guardado", cierra
el modal, y **ningún cambio se persistió**. Es el peor modo de fallo posible — pérdida
de datos sin señal. Es, además, la única parte de este plan que corrige un bug **ya
activo en producción**, no solo una deuda de contrato.

### K6 — `POST /oportunidades` NO cambia

El alta sigue aceptando `id_modelo`, `cantidad` y `descuento` planos (crea el primer
ítem internamente), *"para no romper el flujo de alta de un solo modelo"*. Es decir:
**`NuevaOportunidadModal.tsx` no necesita cambiar su request.** Solo la lectura de la
respuesta. Nota: el campo se llama `descuento` (renombrado de `dcto`) en el body.

### K7 — Tres endpoints de ítems que el frontend no conoce

- `POST /oportunidades/:id/items` — agrega un modelo
- `PUT /oportunidades/:id/items/:item_id` — edita uno
- `DELETE /oportunidades/:id/items/:item_id` — elimina uno; **`409 ULTIMO_ITEM_NO_ELIMINABLE`**
  si es el único (una oportunidad no puede quedarse sin ítems)

Y una trampa documentada: `POST` y `PUT` de ítems devuelven `cuota_quantum` y
`cuota_total` **siempre `null`** — no porque no sean calculables, sino porque esos
endpoints no las resuelven (encargo §4.2). Hay que **repedir la oportunidad**.

### K8 — La bandeja de solicitudes se rompe con `oportunidad_item`

`src/components/BandejaSolicitudes.tsx:20` y `src/pages/Solicitudes/SolicitudesPage.tsx:22`
construyen el enlace así:

```ts
return s.entidad_tipo === 'oportunidad' ? `/oportunidades/${s.entidad_id}` : `/empresas/${s.entidad_id}`
```

Con `entidad_tipo: "oportunidad_item"` cae al `else` y navega a **`/empresas/<id del
ítem>`** — un enlace a una empresa que no existe o, peor, a **la empresa equivocada**.
Es un bug de corrupción de navegación, no solo un enlace muerto.

Lo mismo en `src/hooks/useSolicitudes.ts:37-41`, que invalida `qk.empresa(entidad_id)`
en vez de la oportunidad: rompe la sincronización 360 de `CLAUDE.md` regla 4.

### K9 — El DTO de `Solicitud` no permite reconstruir el enlace

Verificado contra `contrato_api.md` §20: el objeto solicitud expone `id`, `tipo`,
`estado`, `rol_aprobador`, `entidad_tipo`, `entidad_id`, `entidad_descripcion`,
`dcto_solicitado`, `id_vendedor_nuevo`, `motivo`, `solicitante`, `created_at`.

**No trae `id_oportunidad`.** Con `entidad_id` = id del ítem, el cliente no tiene forma
de saber a qué oportunidad navegar sin pedir cada oportunidad y buscar el ítem —
inaceptable en una bandeja paginada.

Es el mismo patrón que las limitaciones §8.1 y §8.2 del encargo: **se pide al backend,
no se parchea en el cliente** (§2 del encargo). Ver D9.

### K10 — `sort=precio_unitario` ya no es válido

Verificar si algún selector de orden del Pipeline lo ofrece. Si lo hace, el backend
responde `400 VALIDACION`.

### K11 — `monto_total` se queda en la raíz

Sigue siendo read-only y calculado (`CLAUDE.md` regla 10). Ahora es la suma de
`monto_item` de todos los ítems. Cada ítem trae además su propio `monto_item`.

### K12 — `utils/monto.ts` calcula a nivel oportunidad

`calcularMontoTotal(cantidad, precioUnitario, dcto)` y `calcularDescuento(...)` asumen
un solo modelo. Con N ítems, el monto en vivo del modal de edición debe calcularse por
ítem y sumarse. Es la única lógica de negocio real en `utils/` del flujo.

### K13 — Los reportes no requieren acción

Changelog 2026-09-04: *"La forma del contrato no cambia — ningún campo se agrega, quita
ni renombra en ningún DTO."* Solo cambió la fuente de datos server-side. `ReportesPage`
y `types/reportes.ts` aparecen en el grep por coincidencia de nombre (`monto_total` del
reporte), **no** por el shape de oportunidad.

### K14 — `PropiedadesCard.tsx` concentra el riesgo

22.978 bytes. Contiene el modal de edición de términos, el cálculo de monto en vivo, el
disparo de solicitud de descuento y la ficha del bus, todo acoplado a los campos planos.
Es el archivo que más cambia y el que más fácil rompe.

### K36 — `id_financiadora` nunca fue editable por `PUT /oportunidades/:id`, ni antes de V42

Hallazgo escalado por el ejecutor de T3.1, verificado contra el contrato **pre-sync**
(el `docs/contrato_api.md` de este repo antes de T1.1, recuperado con
`git show <commit-de-T1.1>^:docs/contrato_api.md`):

> **Body:** `id_modelo`, `cantidad`, `precio_unitario`, `dcto`, `garantia`,
> `finc_paralelo`, `ficha_venta`, `notas`, `fecha_cierre_estimado` — todos opcionales.

`id_financiadora` **nunca estuvo** en ese body, ni antes ni después de V42. Y no existe
ningún otro endpoint (`PATCH /oportunidades/:id/financiadora` o similar) que la edite tras
la creación — verificado contra el índice completo de endpoints de oportunidad en el
contrato sincronizado (§10).

**No es una regresión de este plan.** Es un bug de la misma familia que K5 —un `<select>`
de financiadora en `PropiedadesCard` que llamaba `guardarCampo({ id_financiadora })` vía
`PUT /oportunidades/:id`, y el backend lo descartaba en silencio— que **ya existía en
producción antes de V42** y que T3.1 destapó al corregir K5 en el mismo archivo.

**Resolución aplicada en T3.1:** el `<select>` se convirtió en texto de solo lectura
(`o.financiadora?.nombre`), con un comentario que cita el contrato §10. Es la lectura
correcta del mismo principio que motiva este plan entero: un control que finge guardar es
peor que un dato visible que no se puede editar.

**No se pide un endpoint nuevo al backend.** No hay evidencia de que la financiadora deba
ser editable tras la creación — podría ser una decisión de negocio deliberada (se fija al
crear la oportunidad). Si el negocio necesita poder cambiarla después, es una pregunta
para el equipo de producto/backend, no una inferencia del frontend (§1.7 del encargo:
"no infieras comportamiento de negocio").

### K15 — Cobertura de tests actual: 11 archivos

`npm run test` (Vitest) con MSW disponible. `TESTING-frontend.md` §9 regla 4: *"MSW para
todo lo que toque la red. Nunca mockear el cliente de API directamente."* Regla 1:
*"Nunca escribir componente ni hook sin un test que falle primero."*

---

## 3. Decisiones (D)

### D1 — Sincronizar `docs/contrato_api.md` antes de escribir una línea de código

Copiar íntegro el del backend. Justificación: K1. Sin esto cada tarea posterior se apoya
en una fuente que miente. **No se edita a mano** — el frontend no es dueño del contrato
(§2 del encargo).

Se copian también `reglas_simulaciones.md` y `matriz_permisos.md`, que el encargo §2
declara fuentes de verdad y no existen en este repo.

### D2 — `items[]` se tipa como array, sin azúcar de "ítem único"

`OportunidadItem` como interfaz propia; `Oportunidad.items: OportunidadItem[]`.

**No** se agrega un getter `oportunidad.modelo` que devuelva `items[0].modelo`. Tentador
(arreglaría 40 usos con una línea) y equivocado: esconde el caso multi-ítem y garantiza
que en la fase de simulaciones alguien muestre la cuota del primer modelo como si fuera
la de toda la operación. La molestia de migrar 111 usos a mano es el precio de que el
código diga la verdad.

### D3 — Las vistas de listado muestran el multi-ítem explícitamente

Pipeline y tablas hoy muestran una columna "Modelo". Con N ítems:
- 1 ítem → el código del modelo, igual que hoy.
- N ítems → `"K12 +2"` con tooltip que lista los N.

Nunca `items[0]` a secas: sería mentir en pantalla.

### D4 — `utils/monto.ts` pasa a operar por ítem, conservando el redondeo

Se agrega `calcularMontoItem(cantidad, precioVenta, descuento)` — idéntica a la actual,
solo renombrada por claridad — y `calcularMontoOportunidad(items)` que redondea **por
ítem** (`Math.round(x*100)/100`) y luego suma. Redondear solo al final daría un centavo
de diferencia contra `monto_total` del backend, que suma `monto_item` ya redondeados.

Se conserva `calcularDescuento` con la misma firma, aplicada por ítem.

### D5 — La edición de términos pasa a ser edición **de un ítem**

`PropiedadesCard` deja de mandar términos por `PUT /oportunidades/:id` (que los descarta
— K5) y usa `PUT /oportunidades/:id/items/:item_id`.

`PUT /oportunidades/:id` se conserva **solo** para `garantia`, `finc_paralelo`,
`ficha_venta`, `notas`, `fecha_cierre_estimado`.

Alcance de este plan: **editar** ítems existentes y **listarlos**. Agregar y eliminar
ítems (`POST`/`DELETE`, K7) queda **fuera** — ver D8.

### D6 — Tras escribir un ítem, se repide la oportunidad

Por K7: las respuestas de `POST`/`PUT` de ítem traen `cuota_quantum`/`cuota_total` en
`null` siempre. Escribir esa respuesta en la cache de TanStack Query metería nulos falsos
en pantalla. Se invalida `qk.oportunidad(id)` y `qk.oportunidades`, y se deja que la
query se refetchee. Es exactamente lo que pide `CLAUDE.md` regla 4.

### D7 — `SolicitudModal` recibe el ítem, no la oportunidad

Su prop pasa de `idOportunidad` a `idOportunidadItem`, y envía
`entidad_tipo: 'oportunidad_item'`. El tipo `SolicitudDescuentoInput` en
`src/types/solicitud.ts:30-31` se corrige a `entidad_tipo: 'oportunidad_item'`.

Es un cambio de tipo, así que el compilador encuentra los call sites — no hay que confiar
en el grep.

### D8 — Agregar/eliminar ítems queda fuera de alcance

`POST` y `DELETE` de ítems (K7) habilitan una **funcionalidad de producto nueva** (vender
varios modelos en una oportunidad) que nadie pidió en este encargo y que no está en
ningún prototipo. `CLAUDE.md`: *"Si parece necesario algo no listado en el PRD, pausa y
pregunta. No inventes."*

Este plan **adopta el contrato** (leer `items[]`, editar el ítem existente) sin
**estrenar la funcionalidad**. Con los datos de hoy toda oportunidad tiene exactamente un
ítem — el changelog 2026-09-04 lo confirma: *"ninguna oportunidad tiene más de un ítem en
producción"*.

Consecuencia deliberada: la UI queda **correcta para N ítems en lectura** y limitada a
editar los que existan. Es una decisión de alcance, no un olvido.

### D9 — Enlace de solicitudes de descuento: degradar, y pedir el campo

Por K9 no hay forma honesta de construir el enlace. Se resuelve en dos tiempos:

1. **Ahora:** una fila con `entidad_tipo: 'oportunidad_item'` **no es clicable** y
   muestra `entidad_descripcion` (que el DTO sí trae). Nunca se navega a `/empresas/<id
   del ítem>`: eso es peor que no navegar.
2. **Pedido al backend:** exponer `id_oportunidad` en el DTO de `Solicitud` para
   `entidad_tipo: 'oportunidad_item'`. Queda redactado en
   `docs/solicitud-backend-simulaciones.md` junto con el pedido de §8.1 del encargo.

`BandejaSolicitudes.tsx` y `SolicitudesPage.tsx` duplican esta lógica (K8): se extrae a
`utils/solicitudes.ts` como `rutaDeSolicitud(s)` y ambas la consumen.

### D10 — TDD, con el test de regresión de K5 primero

`CLAUDE.md` regla 1 y `TESTING-frontend.md` §9. El primer test de la ola de
`PropiedadesCard` es el que reproduce K5: *"editar el precio del ítem lo persiste vía el
endpoint de ítems"* — hoy falla porque el componente llama al endpoint que descarta.

---

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| **El frontend en producción ya está roto** — si el backend V42 está desplegado, hoy lee `o.modelo.codigo` de un campo inexistente | Verificar el estado del deploy **antes** de ejecutar (Tarea T0.0). Si está desplegado, este plan es un hotfix, no una deuda técnica |
| `PropiedadesCard` (K14) es grande y toca 3 flujos | Una sola ola, un solo agente, effort alto; nada en paralelo sobre ese archivo |
| El compilador no ve los usos en JSX de campos opcionales | `npm run type-check` **y** `npm run lint` **y** `npm run test` en cada tarea; el arquitecto los corre, no el subagente (§1.4) |
| Migrar tipos y UI a la vez deja el repo sin compilar a mitad | La ola de tipos rompe el build **a propósito**: los errores de `tsc` son la lista de trabajo de las olas siguientes |

---

## 5. Criterio de "terminado"

1. `npm run type-check`, `npm run lint` y `npm run test` en verde.
2. Cero lecturas de `id_modelo`/`modelo`/`cantidad`/`precio_unitario`/`dcto` en la raíz
   de una oportunidad (grep limpio).
3. Editar los términos de un ítem **persiste de verdad** (regresión de K5 cubierta por
   test).
4. Ninguna solicitud de descuento navega a `/empresas/<id de ítem>`.
5. **Tarea de auditoría final (§1.3):** releer el diff completo de la rama contra los
   documentos citados en §1.2 de este mapa, buscando contradicciones con reglas que **ya
   estaban escritas correctamente** antes de empezar.

---

## 6. Qué habilita

Con `items[]` en el tipo y en la UI, el Plan 02 puede colgar `cuota_quantum` y
`cuota_total` del ítem, y `cuota_quantum_total` / `cuota_total` / `cuota_diaria_total` de
la raíz — que es la Fase 1 del encargo (§10).
