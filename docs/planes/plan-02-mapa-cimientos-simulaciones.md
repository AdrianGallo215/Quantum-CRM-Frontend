# Plan 02 — Mapa: cimientos de Simulaciones y Calculadora

**Fecha:** 2026-09-07
**Autor del plan:** Opus 5 (§1.1 del encargo)
**Depende de:** Plan 00/01 (multi-modelo V42) **completo y verificado**
**Cubre del encargo:** §4.1 (5 campos de cuota) · §5.7 (indicador de tipo de cambio) ·
§6 (permisos) · la capa de datos completa de §5.1–§5.6

---

## 0. Criterio que separa este plan del Plan 04

Este plan contiene **todo lo que no requiere una vista nueva**, y por tanto **nada de
esto pasa por Stitch** (§1.6 del encargo):

- La capa de datos completa: tipos, `src/api/`, hooks de TanStack Query, query keys.
- El punto único de decisión de permisos.
- Las **dos modificaciones** que el encargo §5 identifica como tales: los 5 campos de
  cuota en la oportunidad (§5.2 parcial) y el indicador de tipo de cambio (§5.7).

El Plan 04 contiene las **5 vistas nuevas**, que sí requieren propuesta de diseño
aprobada antes de escribir UI.

Esta separación no es organizativa: permite que **todo el Plan 02 avance mientras el
diseño de las vistas nuevas se aprueba en paralelo**. Es el orden que más trabajo
desbloquea por unidad de espera.

---

## 1. Fase de investigación — qué dicen las fuentes (§1.3)

### 1.1 Documentos consultados

| Documento | Secciones leídas |
|---|---|
| `simulaciones_contrato_frontend.md` | completo |
| `docs/contrato_api.md` (ya sincronizado por T1.1) | §10, §22, §23, §24, §26 |
| `docs/reglas_simulaciones.md` | completo (439 líneas) |
| `docs/matriz_permisos.md` | §2.15 |
| `CLAUDE.md` | reglas 2, 3, 4, 5, 7, 11, 12 |
| `docs/TESTING-frontend.md` | §4.4, §9 |
| `src/store/authStore.ts` | constantes de rol existentes |
| `src/hooks/queryKeys.ts` | invariante de jerarquía |

### 1.2 Citas textuales que gobiernan este plan

**`matriz_permisos.md` §2.15 — la nota de implementación:**

> la decisión vive centralizada en `SimulacionPermisos` [...] **no** en los predicados
> compartidos de `UsuarioActual`: `esRolApoyo` agrupa `analista` con `otro`, que aquí
> están en extremos opuestos (el primero con acceso total, el segundo sin ninguno);
> `esSupervisor` incluye a `jdv`, que aquí no entra.

**Encargo §6:**

> Si el frontend tiene un helper tipo `esRolApoyo` o `esSupervisor` reutilizado de otros
> módulos, **no sirve para este**. El backend tuvo exactamente este problema y tuvo que
> centralizar la decisión en un punto propio. Hacé lo mismo: **un solo lugar** donde se
> decide el acceso a Simulaciones, no condicionales de rol repartidas por componente.

**Encargo §4.1 — la regla de `null`:**

> Los tres campos de nivel oportunidad son **`null` los tres a la vez** si *cualquier*
> ítem no tiene cuota calculable. Se muestra como **"todavía no se puede calcular"**,
> jamás como cero ni como guion suelto que parezca un monto.
>
> Un `cuota_quantum` de ítem en `null` es degradación silenciosa esperada [...] **nunca
> un error**. No dispares un toast de error por eso.

**Encargo §4.1 — la advertencia del nombre repetido:**

> ⚠ **Cuidado con el nombre repetido:** `cuota_total` existe **en dos niveles con
> significados distintos** — dentro de un ítem es la cuota mensual de *una unidad de ese
> modelo*; en la raíz es el total mensual de *toda la operación, ya multiplicado por
> cantidades*. No los mezcles al tipar ni al renderizar.

**`contrato_api.md` §22 — el `null` legítimo del tipo de cambio:**

> `data: null` con status 200 (no 404) es una respuesta válida y esperada [...] La
> ausencia del dato no es un recurso inexistente.

**`CLAUDE.md` regla 3:**

> server state → SIEMPRE TanStack Query. Client state (modales, tabs, filtros) →
> Zustand/useState. **Nunca copiar datos del servidor a Zustand.**

**`CLAUDE.md` regla 7:**

> **Validación con Zod = UX, no seguridad.** La validación real es del backend. Siempre
> maneja el rechazo del backend.

**`hooks/queryKeys.ts` — el invariante documentado en el propio archivo:**

> INVARIANTE: la key de un detalle SIEMPRE empieza por la key de su lista
> (`['empresas','detalle',id]`, no `['empresa',id]`). Solo así `invalidar(qc,
> qk.empresas)` alcanza también a las fichas abiertas.

---

## 2. Hallazgos (K)

### K16 — El reparto de roles de este módulo invierte el del resto del CRM

`src/store/authStore.ts` define hoy `ROLES_APOYO = ['analista', 'otro']` y
`ROLES_SUPERVISION = ['admin', 'gerencia', 'jdv']`. **Ninguna de las dos sirve acá:**

| Rol | En el resto del CRM | En Simulaciones |
|---|---|---|
| `analista` | apoyo, solo lectura, sin escritura en oportunidades | **acceso total — es el rol dueño del módulo** |
| `jdv` | supervisor, ve el equipo, aprueba descuentos | **sin ningún acceso** |

Reutilizar `ROLES_APOYO` daría acceso a `otro` (que no debe tener) y se lo negaría a
`analista` (que es el dueño). Es exactamente el error que el backend cometió y documentó.

### K17 — Son **tres** permisos distintos, no uno

`matriz_permisos.md` §2.15 distingue tres capacidades que no coinciden:

| Rol | Módulo Simulaciones | Simulador en su oportunidad | Calculadora |
|---|---|---|---|
| `admin` | Total | Sí | Sí |
| `analista` | Total | Sí | Sí |
| `gerencia` | Total | Sí | Sí |
| `vendedor` | **Sin acceso** | Solo donde es el vendedor asignado | **Sí** |
| `jdv`, `otro` | Sin acceso | No | No |

Una sola constante `ROLES_SIMULACIONES` sería incorrecta: el `vendedor` entra a la
Calculadora y al simulador de su oportunidad, pero **no** al listado del módulo.

Además, el permiso del simulador es **por recurso**, no por rol: depende de si el
`vendedor` es el vendedor asignado de *esa* oportunidad.

### K18 — El backend responde `404` donde uno esperaría `403`

`contrato_api.md` §23:

> Un recurso fuera del alcance del rol (una simulación ajena para `vendedor`, o
> cualquiera para `jdv`/`otro`) responde **`404 NO_ENCONTRADO`**, nunca `403` [...] la
> única excepción es el listado completo del módulo (`GET /simulaciones`) y el acceso a
> "alguna función", que sí son `403 PERMISO_INSUFICIENTE`.

Y el encargo §9 lo remacha: *"**No** inferir 'existe pero no tenés permiso' — el backend
devuelve 404 para recursos ajenos a propósito (IDOR)."*

La UI debe decir "no existe", no "no tenés permiso". Decir lo segundo filtra la
existencia del recurso, que es justo lo que el 404 protege.

### K19 — Los montos viajan como `string`, y hay una excepción

Convención general del contrato: los montos son `string` para no perder precisión.
`cuota_final`, `precio_venta`, `tea`, `valor_residual`, etc. son todos `string`.

**Excepción:** `tasa_nominal_mensual` viene `string` pero **sin redondear** a propósito
(`reglas_simulaciones.md` §3.1: *"La Tasa Nominal Mensual **no se redondea nunca**"*). El
encargo §5.4 avisa: *"no la trates como un monto de 2 decimales."*

Y `plazo_meses` / `dias_trabajados` son `number` (enteros), no `string`.

### K20 — La escala de `tea` difiere entre módulos

Encargo §7.6:

> Ojo con la escala de `tea`: acá va de **1 a 100** (ej. `14.00` = 14%). En
> `financiadoras` es fraccionaria. **No las mezcles.**

Verificado: `src/types/catalogos.ts` tipa `Financiadora.tea` y el contrato §13 la muestra
como `"0.0000"`. Son escalas distintas para el mismo nombre de campo. Un formateador
compartido las mostraría mal por un factor de 100.

### K21 — El indicador de tipo de cambio es requisito del layout global

Encargo §5.7 y `reglas_simulaciones.md` §12: *"Se muestra de forma permanente y discreta
en una esquina del layout del CRM (**requisito del layout global, no de este módulo**)."*

Va en `src/components/AppLayout.tsx`, y es visible para **todos** los roles autenticados
(§22: *"Sin restricción de rol"*) — no hereda los permisos de Simulaciones.

### K22 — `AppLayout` ya tiene un patrón de elemento flotante

`src/components/AppLayout.tsx` monta `<CotizadorFab />`, con su propio filtro de rol
(`ROLES_COTIZADOR`) y su test. Es el precedente a seguir para el indicador: componente
propio, montado por el layout, con su test.

### K23 — Los defaults del formulario son constantes de código

`reglas_simulaciones.md` §6.1: *"Parámetros por defecto (constantes de código, no
configurables en BD)"*. Encargo §7.7 los repite:

| Parámetro | Default |
|---|---|
| `plazo_meses` | 48 |
| `tea` | 14 |
| `cuota_inicial` | 45 000 |
| `valor_residual` | 25 000 |
| `dias_trabajados` | 22 |
| `comision_estructuracion` | 1 180 |

`precio_venta` y `descuento` se toman del ítem. Solo `modo`, `precio_venta`,
`cuota_inicial`, `plazo_meses` y `tea` son obligatorios en el request.

### K24 — Dos valores de enum nuevos en notificaciones

Changelog 2026-09-07: `tipo_notificacion_enum` gana `simulacion_por_expirar` y
`entidad_notificacion_enum` gana `simulacion`. Son aditivos.

`src/components/NotificacionesDropdown.tsx:41-48` navega con un mapa `RUTA_ENTIDAD`. Una
notificación de entidad `simulacion` caería en un `undefined` y navegaría a
`/undefined/87`. Hay que tiparlo y darle destino — o, mientras la ruta del módulo no
exista (Plan 04), no hacerlo clicable.

### K25 — `queryKeys.ts` tiene un invariante que hay que respetar

Citado en §1.2. Las keys de simulaciones deben seguirlo:
`qk.simulacion(id) = ['simulaciones', 'detalle', id]`, y el cronograma y el historial
cuelgan de ahí. Hay un test (`queryKeys.test.ts`) que verifica la forma.

### K26 — El cronograma y el historial son **queries**, no derivados

`GET /simulaciones/:id/cronograma` y `/historial` son endpoints propios que se
recalculan/leen al vuelo. Son server state: TanStack Query, nunca Zustand
(`CLAUDE.md` regla 3).

El cronograma se recalcula server-side en cada lectura
(`reglas_simulaciones.md` §4), así que **no debe cachearse agresivamente** tras editar
parámetros: invalidar en cada mutación de la simulación.

---

## 3. Decisiones (D)

### D11 — Un módulo `utils/simulacionPermisos.ts`, espejo del backend

Se crea **un solo archivo** con las tres preguntas de K17, y **nada de lógica de rol de
simulaciones fuera de él**:

```ts
export function puedeVerModuloSimulaciones(empleado: Empleado | null): boolean
export function puedeUsarCalculadora(empleado: Empleado | null): boolean
export function puedeSimularEnOportunidad(empleado: Empleado | null, o: Oportunidad): boolean
```

Las constantes de rol viven **dentro de este archivo**, no en `authStore.ts`. Ponerlas
junto a `ROLES_APOYO` y `ROLES_SUPERVISION` invita exactamente a la confusión que K16
describe: alguien vería tres listas parecidas y reutilizaría la equivocada.

El archivo abre con un comentario que explica la inversión de roles y cita
`matriz_permisos.md` §2.15, para que quien lo lea en seis meses no "corrija" la anomalía.

`puedeSimularEnOportunidad` recibe la oportunidad porque para `vendedor` el permiso es
por recurso (K17): `o.id_vendedor === empleado.id`.

**Guards de UX, no de seguridad** (`CLAUDE.md` regla 8): ocultar un botón no protege
nada, lo protege el backend.

### D12 — Un formateador de cuota que distingue "null" de "cero"

`utils/formato.ts` gana `formatoCuota(valor: string | null): string` que devuelve
`'—'`… **no**. Un guion suelto parece un monto vacío, y el encargo §4.1 lo prohíbe
explícitamente.

Devuelve el texto `'Sin calcular'` para `null`, y el monto formateado para el resto. Los
tres campos de nivel oportunidad se renderizan con un componente
`<CuotaOportunidad />` que, cuando son `null`, muestra **"Todavía no se puede
calcular"** con un tooltip que explica por qué (algún ítem sin cuota calculable).

Un `cuota_quantum` de ítem en `null` se muestra igual de discreto, **sin toast, sin
color de error** (encargo §4.1).

### D13 — Los dos `cuota_total` se tipan y se nombran distinto en la UI

Por K19 y la advertencia del encargo §4.1. En los tipos conservan el nombre del contrato
(`OportunidadItem.cuota_total` y `Oportunidad.cuota_total`) porque son espejo del DTO
(`CLAUDE.md`: *"Mantén los tipos TS sincronizados con los DTOs"*).

Pero en la **UI** y en los nombres de variables locales se distinguen siempre:
- ítem → "Cuota mensual por unidad"
- raíz → "Cuota mensual total"

Y los JSDoc de ambos campos (ya escritos en T1.2) advierten de la colisión.

### D14 — `tea` se formatea con un helper propio del módulo

Por K20. `formatoTea(valor: string): string` vive en `utils/simulaciones.ts` y asume
escala 1-100. **No** se toca el formateo de `Financiadora.tea`, que es fraccionaria.

El JSDoc cita el encargo §7.6 para que nadie los unifique "por DRY".

### D15 — `tasa_nominal_mensual` se muestra con 6 decimales

Por K19. No es un monto. Se muestra con precisión suficiente para que se vea que no está
redondeada, sin volcar los 18 dígitos que llegan. Seis decimales es legible y honesto.
Helper propio, `formatoTasa`, separado de `formatoMonto`.

### D16 — El indicador de tipo de cambio no renderiza nada si no hay dato

Por K21 y §22 del contrato. `data: null` con 200 es normal. El componente devuelve `null`
y el layout queda sin el indicador — **no** un placeholder, **no** un error, **no** un
skeleton permanente.

Tampoco reintenta agresivamente: es un dato que cambia una vez al día. `staleTime` alto
(1 hora) y sin `refetchOnWindowFocus`.

### D17 — Las query keys de simulaciones siguen el invariante de K25

```ts
simulaciones: ['simulaciones'] as const,
simulacion: (id: number) => ['simulaciones', 'detalle', id] as const,
simulacionCronograma: (id: number) => ['simulaciones', 'detalle', id, 'cronograma'] as const,
simulacionHistorial: (id: number) => ['simulaciones', 'detalle', id, 'historial'] as const,
tipoCambio: ['tipo-cambio'] as const,
```

La Calculadora **no tiene query key**: es un `POST` efímero sin persistencia
(`reglas_simulaciones.md` §9). Se modela como `useMutation`, no como `useQuery` — es la
única forma honesta de representar "cero persistencia" en TanStack Query.

### D18 — Toda mutación de simulación invalida la oportunidad

Sincronización 360 (`CLAUDE.md` regla 4). Crear, editar, restaurar, bifurcar, marcar
principal o borrar una simulación **cambia `cuota_quantum` del ítem** y por tanto los
tres agregados de la oportunidad.

Cada mutación invalida: `qk.simulaciones`, `qk.simulacion(id)`,
`qk.simulacionCronograma(id)`, `qk.simulacionHistorial(id)`, `qk.oportunidades` y
`qk.oportunidad(idOportunidad)` cuando se conoce.

Esto es exactamente el caso que `TESTING-frontend.md` §4.4 llama "el principio crítico":
tras editar un dato, ninguna otra vista puede mostrar el valor viejo.

> **Verificación (T3.1, 2026-09-07):** el ejecutor de T3.1 señaló, sin desviarse del
> plan, si este conjunto no repite el error de B1 (Plan 00/01) — invalidar de menos
> porque otra vista también muestra el dato mutado. Se verificó contra el contrato:
> `GET /inicio` (§17), `GET /prospeccion` (§16) y `GET /reportes/*` (§18) **no exponen
> ningún campo `cuota_*`** — usan `monto_total`/`monto`, no las cuotas nuevas de §10.
> A diferencia de `monto_total` (que sí se propaga a reportes, motivo de B1), los tres
> campos de cuota son exclusivos de `GET /oportunidades` y `GET /oportunidades/:id`.
> El conjunto de D18 es correcto tal como está — **no es un B1 repetido**. Si algún día
> Inicio/Prospección/Reportes empiezan a mostrar cuotas, este análisis hay que
> rehacerlo.

### D19 — Los defaults viven en una constante exportada

Por K23. `DEFAULTS_SIMULACION` en `utils/simulaciones.ts`, con un comentario que cita
`reglas_simulaciones.md` §6.1 y aclara que **el backend los rellena igual** si se omiten:
el frontend los usa para prellenar el formulario, no para completar el request.

Enviar explícitamente lo que el backend ya rellena es redundante pero inofensivo; lo que
sería un bug es que las dos tablas divergieran. El comentario lo advierte.

### D20 — La notificación de simulación no es clicable todavía

Por K24. Se añaden los dos valores al enum (para que `tsc` obligue a tratarlos) y la
entidad `simulacion` se renderiza **sin enlace** hasta que exista la ruta del módulo
(Plan 04). Mejor una notificación no clicable que una que navega a `/undefined/87`.

El Plan 04 la conecta cuando la ruta exista. Queda anotado como TODO con referencia a D20.

### D21 — El simulador dentro de la oportunidad **no** entra en este plan

El encargo §5.2 lo llama "modificación", y lo es. Pero contiene *"formulario de
parámetros + cronograma + guardar"*, y el **cronograma es un componente nuevo** que el
propio encargo §5.4 manda a Stitch.

Este plan entrega de §5.2 solo la parte que no depende del cronograma: **mostrar los 5
campos de cuota** (§4.1). El simulador completo es del Plan 04, después de que el
cronograma exista.

Es una división del §5.2 que el encargo no hace explícita; se justifica en que la
dependencia técnica manda sobre la etiqueta "modificación vs vista nueva".

---

## 4. Riesgos

| Riesgo | Mitigación |
|---|---|
| Reutilizar `ROLES_APOYO`/`ROLES_SUPERVISION` por parecido (K16) | D11: constantes dentro del módulo de permisos, con comentario que cita §2.15. Grep de control en la auditoría |
| Confundir los dos `cuota_total` (K19) | D13: nombres distintos en UI, JSDoc en ambos campos, y un test que verifica que la raíz no muestra el valor del ítem |
| Mostrar `null` como `0` o como `—` | D12 + test explícito por cada uno de los cinco campos |
| Tratar `data: null` del tipo de cambio como error | D16 + test del caso 200-con-null |
| Escala de `tea` (K20) | D14: helper propio, sin tocar el de financiadoras |

---

## 5. Criterio de "terminado"

1. `npm run type-check`, `npm run lint`, `npm run test`, `npm run build` en verde.
2. Los 5 campos de cuota se muestran en la oportunidad, con los `null` tratados según D12.
3. El indicador de tipo de cambio aparece en el layout y desaparece limpiamente con
   `data: null`.
4. Cero condicionales de rol de simulaciones fuera de `utils/simulacionPermisos.ts`.
5. La capa `src/api/simulaciones.ts` + `calculadora.ts` + `tipoCambio.ts` cubre los 11
   endpoints, con sus hooks e invalidaciones (D18).
6. **Auditoría final** (§1.3) contra los documentos de §1.2.

---

## 6. Qué habilita

Con los tipos, la API, los hooks, los permisos y los formateadores en su sitio, el Plan
04 solo escribe **UI**: cada vista consume hooks que ya existen y están testeados. Es lo
que hace viable aprobar diseños y construir en paralelo.
