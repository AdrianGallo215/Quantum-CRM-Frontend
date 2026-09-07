# Plan 01 — Informe de auditoría (T7.1)

**Fecha:** 2026-09-07
**Rama auditada:** `feature/multimodelo-v42` · diff `git diff main...feature/multimodelo-v42`
**Alcance:** §1.3 del encargo y T7.1 del `plan-01-multimodelo-tareas.md` — releer el diff
completo contra **cada** documento citado en `plan-00-mapa-multimodelo.md` §1.2, buscando
contradicciones con reglas que **ya estaban escritas correctamente** antes de empezar.
**Ejecutor:** Opus 5. **Sin correcciones aplicadas** (T7.1 Paso 6): solo se reporta.

---

## 0. Resumen

**13 hallazgos** (`B1`–`B13`). Ninguno rompe el build ni los tests; dos son de riesgo
funcional real:

- **B1** — `useActualizarItem` invalida menos vistas de las que toca. Es una violación de
  `CLAUDE.md` regla 4 (sincronización 360) del mismo tipo que las que este plan vino a
  corregir. **El plan la prescribió literalmente en T2.2 — el plan estaba equivocado.**
- **B3** — Los enums de notificación quedaron desincronizados tras la sync del contrato
  (T1.1): un `entidad_tipo: "simulacion"` navega a `/undefined/:id`. Es **exactamente la
  clase de bug K8** que este plan corrigió en las solicitudes, viva en otro módulo.

El resto son deuda menor, código muerto, duplicación y decisiones de alcance que necesitan
la firma del arquitecto.

**Los 5 criterios de "terminado" del mapa §5 se cumplen** (ver §3, §4 y §5 abajo).

---

## 1. Hallazgos

### B1 — `useActualizarItem` no invalida Inicio, Prospección, Reportes ni Tareas — regla 4 rota

- **Archivo:** `src/hooks/useOportunidades.ts:87`
- **Contradice:**
  - `CLAUDE.md` regla 4: *"tras cada mutación, invalidar TODAS las queries afectadas. Tras
    editar un dato, ninguna otra vista puede mostrar el valor viejo."*
  - `docs/TESTING-frontend.md` §4.4: *"Cada flujo donde una mutación debe propagarse a
    otras vistas tiene un test así."*
  - `docs/contrato_api.md` §28, changelog **2026-09-04**: los reportes *"ahora leen
    `oportunidad_items` directamente"* — editar el precio o el descuento de un ítem cambia
    `GET /reportes/ventas`, `/pipeline`, `/equipo` y `/descuentos`.
  - El propio archivo, líneas 40-49, ya lo tenía escrito bien antes de empezar:
    `invalidarOportunidad` documenta *"una oportunidad toca pipeline, inicio, cartera
    (estado_cartera derivado), prospección y reportes"* e invalida
    `oportunidades, inicio, empresas, prospeccion, reportes, tareas`.
- **Qué hace hoy:** `invalidar(qc, qk.oportunidad(id), qk.oportunidades, qk.empresas)` —
  tres claves. Toda otra mutación de oportunidad del mismo archivo invalida siete.
- **Consecuencia:** tras editar cantidad, precio o descuento de un ítem, el panel de Inicio,
  Prospección y Reportes siguen mostrando el `monto_total` viejo hasta un remount. Es el
  mismo modo de fallo que K5, un escalón más abajo: no se pierde el dato, se muestra
  desactualizado sin señal.
- **Origen:** el plan lo prescribió así — `plan-01` T2.2 Paso 4 trae ese `invalidar` textual.
  No es una desviación del ejecutor.
- **Corrección propuesta:** reutilizar el helper que ya existe en el mismo archivo:

```ts
onSuccess: () => {
  invalidarOportunidad(qc, idOportunidad)
},
```

  (`invalidarOportunidad` ya cubre `qk.empresas`, que a su vez cubre `qk.empresa(id)` por
  prefijo.)

---

### B2 — El hook y el cliente de API nuevos no tienen ni un test — regla 1 de TDD

- **Archivos:** `src/hooks/useOportunidades.ts:79-89` (`useActualizarItem`),
  `src/api/oportunidades.ts:39-52` (`oportunidadesApi.actualizarItem`)
- **Contradice:**
  - `CLAUDE.md` regla 1 y `docs/TESTING-frontend.md` §9 regla 1: *"Nunca escribir componente
    ni hook sin un test que falle primero."*
  - `docs/TESTING-frontend.md` §6: *"Hooks y utils con lógica: mínimo 85%"*, y su
    justificación explícita — *"los hooks (especialmente los de TanStack Query con su lógica
    de invalidación) […] sí tienen cobertura alta porque ahí vive lógica que puede fallar
    silenciosamente."*
  - `docs/TESTING-frontend.md` §4.4, "Cobertura obligatoria": *"Sincronización 360: tras
    mutación, las vistas dependientes muestran el dato actualizado."*
- **Detalle:** T2.2 no pidió tests (ni nombra un archivo `.test.ts` en "Archivos que toca"),
  así que el ejecutor cumplió su tarea. Pero el plan no podía dispensar de la regla 1: es la
  primera de `CLAUDE.md`. El resultado es que **D6** (no escribir la respuesta del `PUT` de
  ítem en la cache, porque trae `cuota_quantum`/`cuota_total` en `null`) no está verificada
  por ningún test, y **B1 habría salido en rojo si lo estuviera.**
- **Corrección propuesta:** un test con MSW (`§9.4`) que (a) haga `PUT` de ítem devolviendo
  cuotas en `null`, (b) verifique que se dispara un `GET /oportunidades/:id` posterior, y
  (c) verifique que las vistas dependientes se refetchean.

---

### B3 — Los enums de notificación quedaron desincronizados: `simulacion` navega a `/undefined/:id`

- **Archivos:** `src/types/notificacion.ts:3-21`,
  `src/components/NotificacionesDropdown.tsx:21-24` y `:48`
- **Contradice:**
  - `docs/contrato_api.md` §26 (Enums), sincronizado por T1.1 en este mismo diff:
    `tipo_notificacion_enum` incluye `simulacion_por_expirar` y `entidad_notificacion_enum`
    incluye `simulacion`. Ninguno de los dos existe en los tipos del frontend.
  - `CLAUDE.md`, "Coordinación con el backend": *"Mantén los tipos TS (`/src/types`)
    sincronizados con los DTOs del contrato."*
  - `docs/contrato_api.md` §28, changelog **2026-09-07**: *"los dos valores de enum son
    aditivos y se ignoran con un `default`/`else` como cualquier otro"* — el frontend **no
    tiene** ese `default`/`else`.
- **Consecuencia:** `RUTA_ENTIDAD` es un `Record` sin rama para `simulacion`; una
  notificación `simulacion_por_expirar` produce `navigate('/undefined/<id>')`. Es
  **literalmente el patrón de K8** —el ternario/Record que se traga un valor de enum nuevo
  en silencio y navega a una ruta equivocada— que D9 y T5.1 corrigieron en las solicitudes
  con un `switch` exhaustivo. La lección se aplicó en un módulo y no en el de al lado.
- **Nota de atribución:** el valor de enum lo agregó el backend el 2026-09-07; fue la sync
  del contrato de **T1.1, dentro de este diff**, la que lo trajo al repo y volvió el desfase
  demostrable. Cae dentro del alcance de esta auditoría.
- **Corrección propuesta:** añadir `simulacion_por_expirar` a `TipoNotificacion` y
  `simulacion` a `EntidadNotificacion`, y convertir `RUTA_ENTIDAD` en una función
  `rutaDeNotificacion(n): string | null` con `switch` exhaustivo sin `default`, calcada de
  `rutaDeSolicitud` (`src/utils/solicitudes.ts:69-79`): sin ruta honesta, no se navega.

---

### B4 — Referencias a "contrato §23" quedaron colgando tras el renumerado del contrato

- **Archivos y líneas:** `src/types/enums.ts:2`, `:26`, `:34` · `src/types/enums.test.ts:10`
  · `src/types/notificacion.ts:21`
- **Contradice:** `docs/contrato_api.md` §26, tras la sync de T1.1. En la copia vieja del
  repo "Enums" era §23; en la del backend es **§26** (§23 pasó a ser "Simulaciones"). Los
  cinco comentarios ahora apuntan a la sección equivocada.
- **Consecuencia:** quien siga la cita para verificar `aplicacion_enum` o
  `entidad_notificacion_enum` aterriza en Simulaciones. Es el fallo que K1 vino a evitar
  ("trabajar contra la copia vieja garantiza escribir tipos equivocados"), invertido: el
  documento se actualizó y los punteros al documento no.
- **Nota:** el código **nuevo** del diff cita bien (§10, §20, §26). El problema es solo el
  código preexistente que el renumerado dejó atrás.
- **Corrección propuesta:** `§23` → `§26` en los cinco sitios.

---

### B5 — Lógica de negocio duplicada en cinco componentes — regla 11

- **Archivos:**
  - `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx:405`
  - `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx:107`
  - `src/pages/Pipeline/PipelinePage.tsx:235`
  - `src/pages/Pipeline/TablaOportunidades.tsx:115`, `:117-118`
- **Contradice:** `CLAUDE.md` regla 11 (*"Sin lógica de negocio en componentes. Extraer a
  hooks o utils."*) y el criterio que el propio plan aplicó una línea antes: T4.1 Paso 2
  puso `etiquetaModelos` en `src/utils/` *"porque es lógica, no markup (`CLAUDE.md` regla
  11)"*.
- **Detalle:** `o.items.reduce((acc, it) => acc + it.cantidad, 0)` está escrito seis veces,
  copiado literalmente. Es la agregación hermana de `etiquetaModelos` —la que resuelve
  "cuántas unidades vende esta oportunidad" con N ítems— y se quedó fuera de `utils/`.
  Mismo criterio, decisión opuesta, sin motivo declarado.
- **Segundo caso, en el archivo de mayor riesgo:**
  `src/pages/OportunidadDetalle/PropiedadesCard.tsx:446` — `const bruto = it.cantidad *
  Number(it.precio_venta)` calcula el bruto del ítem a mano dentro del componente, mientras
  `calcularDescuento` (línea siguiente) sí sale de `utils/monto.ts`. El JSDoc de
  `calcularDescuento` advierte que vive en utils *"para que use exactamente el mismo
  redondeo […]: si divergen, el desglose no cuadra con el total que muestra al lado"* — y el
  bruto de al lado no comparte ese redondeo. (Este caso ya existía en `main` como
  `o.cantidad * Number(o.precio_unitario)`: el diff lo trasladó, no lo introdujo.)
- **Corrección propuesta:** `export function unidadesTotales(items: readonly
  OportunidadItem[]): number` en `src/utils/oportunidades.ts`, junto a `etiquetaModelos`, y
  consumirla en los seis sitios. Para el bruto, exponer un `calcularBrutoItem` en
  `utils/monto.ts` con el mismo redondeo que sus hermanas.

---

### B6 — `calcularMontoOportunidad` es código muerto

- **Archivo:** `src/utils/monto.ts:26-42`; tests en `src/utils/monto.test.ts:43-66`
- **Contradice:** no una regla, sino la justificación que lo pidió. D4 y K12 lo motivaron
  con *"el monto en vivo del modal de edición debe calcularse por ítem y sumarse"* — pero el
  modal (`EditarTerminosModal`) edita **un** ítem y muestra el monto **de ese ítem** con
  `calcularMontoItem`, y el total de la operación se lee de `o.monto_total` de la raíz, que
  es lo correcto por K11 y `CLAUDE.md` regla 10.
- **Verificación:** cero call sites fuera de su propio test
  (`grep -rn "calcularMontoOportunidad" src`).
- **Consecuencia:** `TESTING-frontend.md` §6 exige ≥85% en utils "con lógica" porque *"ahí
  vive lógica que puede fallar silenciosamente"*; una función que nadie llama infla la
  cobertura sin proteger nada, y su redondeo-por-ítem —el detalle fino que D4 se tomó el
  trabajo de razonar— nunca se contrasta contra un `monto_total` real del backend.
- **Corrección propuesta:** decisión del arquitecto — (a) consumirla, mostrando el total de
  la oportunidad en vivo en el modal (ítems no editados + el editado), que es lo que D4
  parecía querer; o (b) eliminarla con sus tests y dejar constancia de que K12 se resolvió
  con `calcularMontoItem` a secas.

---

### B7 — El mismo campo tipado como `number` en un input y como `string` en el otro

- **Archivos:** `src/types/oportunidad.ts:111` (`CrearOportunidadInput.descuento?: number`)
  vs `src/types/oportunidad.ts:149-155` (`ActualizarItemInput.descuento?: string`,
  `precio_venta?: string`)
- **Contradice:** `docs/contrato_api.md` §1 (*"Montos: NUMERIC como string en JSON […]
  `"45000.00"`"*) frente a los ejemplos de body de §10, donde **tanto** `POST /oportunidades`
  (`"descuento": 3.00`) **como** `POST/PUT /oportunidades/:id/items` (`"precio_venta":
  92000.00`, `"cuota_financiadora": 937.50`) muestran los montos **sin comillas**.
- **Consecuencia:** hoy no rompe (el backend acepta ambas formas para el campo viejo, y
  `PropiedadesCard` envía `.toFixed(2)`), pero deja el mismo dato con dos tipos en el mismo
  archivo, sin una nota que lo explique. Es el tipo de ambigüedad que produce un
  `400 VALIDACION` intermitente meses después.
- **Corrección propuesta:** no resolverlo por inferencia (§2 del encargo: *"si el frontend
  necesita un cambio de contrato, se pide"*). Añadir la pregunta a
  `docs/solicitud-backend-simulaciones.md`: ¿los bodies de ítems aceptan string, number, o
  ambos? Unificar el tipo cuando responda.

---

### B8 — `OportunidadItem.modelo: Modelo` declara más campos de los que el DTO envía

- **Archivo:** `src/types/oportunidad.ts:26` (`modelo: Modelo`)
- **Contradice:** `docs/contrato_api.md` §10 — dentro de `items[]`, el objeto anidado es
  `{ "id": 1, "codigo": "KinWin K12", "precio_base": "92000.00" }`, tres campos. El tipo
  `Modelo` (`src/types/catalogos.ts:24-33`) declara además `longitud`, `capacidad_tanques`,
  `max_asientos`, `ficha_tecnica` y `aplicaciones`, todos requeridos.
  `CLAUDE.md`, "Coordinación con el backend": *"Mantén los tipos TS sincronizados con los
  DTOs del contrato."*
- **Consecuencia:** `it.modelo.ficha_tecnica` compila y devuelve `undefined` en runtime. El
  código de este diff lo evita —`PropiedadesCard.tsx:503-505` incluso lo documenta: *"El
  modelo embebido en el ítem trae lo justo para el listado; la ficha del bus necesita el
  registro completo del catálogo"*— pero el tipo no lo impide, y los fixtures de los tests
  nuevos (`PropiedadesCard.test.tsx:26-34`, `TablaOportunidades.test.tsx:6-14`) construyen
  `Modelo` completos, reforzando la ficción.
- **Atribución:** preexistía en `Oportunidad.modelo` en `main`; T1.2 lo trasladó tal cual,
  siguiendo el plan al pie de la letra.
- **Corrección propuesta:** `interface ModeloRef { id: number; codigo: string; precio_base:
  string }` y usarla en `OportunidadItem`. El compilador señalará cualquier acceso a los
  campos que el backend no manda.

---

### B9 — Falta el tooltip de D3 en la cabecera del detalle

- **Archivo:** `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx:105-108`
- **Contradice:** D3 del mapa: *"N ítems → `"K12 +2"` **con tooltip que lista los N**"*.
- **Detalle:** `TablaOportunidades.tsx:62-69` y `EmpresaDetallePage.tsx:397-404` sí envuelven
  en `<Tooltip>`; la cabecera del detalle usa `etiquetaModelos(o.items)` pelado. Con dos
  modelos el usuario ve `KinWin K12 +1` sin ninguna forma de saber cuál es el otro, en la
  pantalla donde más lo necesita.
- **Corrección propuesta:** extraer `<EtiquetaModelos items={o.items} />` —el `Tooltip`
  condicional ya está copiado dos veces— y usarla en los tres sitios.

---

### B10 — `CrearTareaModal` perdió la cantidad en la etiqueta

- **Archivo:** `src/components/CrearTareaModal.tsx:178`
- **Antes:** `OP-101 · KinWin K12 × 8 · Documentos legales`. **Ahora:**
  `OP-101 · KinWin K12 · Documentos legales`.
- **Contradice:** T4.3 Paso 3, que solo pedía *"aplicar `etiquetaModelos`"*, no quitar la
  cantidad. Es un cambio de UI no autorizado por el plan; con dos oportunidades del mismo
  modelo para la misma empresa, el selector deja de distinguirlas.
- **Corrección propuesta:** `${etiquetaModelos(o.items)} × ${unidadesTotales(o.items)}`
  (ver B5).

---

### B11 — Se eliminaron dos columnas del Pipeline; el plan solo autorizaba quitar un `sort`

- **Archivo:** `src/pages/Pipeline/TablaOportunidades.tsx:182-187` (bloque de comentario que
  reemplaza las definiciones de columna `precio_unitario` y `dcto`)
- **Contradice:** T4.1 Paso 5, cuyo alcance era: *"Buscar cualquier selector de orden que
  ofrezca `precio_unitario` (K10). **Si aparece como valor de `sort`, eliminar esa
  opción.**"*
- **Verificado en la auditoría:** este frontend **nunca envía `sort` al backend** — no existe
  `sort` en `OportunidadesFiltros` ni en `src/api/oportunidades.ts`; los 18 `sorter` de la
  tabla son ordenaciones de antd en cliente. Es decir: **K10 nunca aplicó a este archivo**, y
  el `400 VALIDACION` que T4.1 temía no era alcanzable desde aquí.
- **Qué pasó realmente:** las dos columnas leían `o.precio_unitario` y `o.dcto` de la raíz,
  así que `tsc` obligaba a tocarlas. Eliminarlas es defendible por el principio de D3 (con N
  ítems no hay un valor único que mostrar sin mentir) y está bien comentado, pero es una
  **baja de funcionalidad** —dos columnas opcionales que el usuario podía activar— que
  ninguna decisión del mapa autoriza, y que `CLAUDE.md` marca como pausa obligatoria: *"Si
  parece necesario algo no listado en el PRD, pausa y pregunta. No inventes."*
- **Corrección propuesta:** decisión del arquitecto. Alternativa que preserva la
  funcionalidad sin mentir: mantener las columnas mostrando el valor del ítem cuando hay uno
  solo y `"—"` con tooltip "varios modelos" cuando hay varios — el mismo criterio que la
  columna Modelo.

---

### B12 — `etiquetaModelos` no tiene test propio; su rama de lista vacía queda sin cubrir

- **Archivo:** `src/utils/oportunidades.ts:8-13` — no existe `src/utils/oportunidades.test.ts`
- **Contradice:** `docs/TESTING-frontend.md` §6 (*"Hooks y utils con lógica: mínimo 85%"*) y
  §9 regla 1. Es un util nuevo, con lógica, creado por T4.1.
- **Detalle:** solo se ejercita indirectamente desde `TablaOportunidades.test.tsx`, que cubre
  los casos de 1 y 3 ítems. La rama `if (!primero) return '—'` no la ejecuta ningún test — y
  es la rama defensiva que existe precisamente porque `items` vacío no debería pasar.
- **Corrección propuesta:** `src/utils/oportunidades.test.ts` con los tres casos (0, 1, N).
  Es una función pura: cuesta minutos y cubre la utilidad más usada del diff.

---

### B13 — Con más de un ítem se pierde el acceso a campos de nivel oportunidad

- **Archivo:** `src/pages/OportunidadDetalle/PropiedadesCard.tsx:604` y `:608`
  (`esRolDeApoyo || !unico`), y `:374-386` (el lápiz del encabezado, `!esRolDeApoyo && unico`)
- **Contradice:** `docs/contrato_api.md` §10, `PUT /oportunidades/:id` — `garantia`,
  `finc_paralelo`, `ficha_venta`, `notas` y `fecha_cierre_estimado` siguen siendo editables
  **sin importar cuántos ítems tenga la oportunidad**. Y `matriz_permisos.md` §2.4, que da a
  los mismos roles el permiso de gestionar ítems y de editar la oportunidad.
- **Consecuencia:** con dos o más ítems, "Fecha Cierre Estimado" deja de ser clicable y el
  lápiz del encabezado desaparece. El acceso sobrevive solo escondido dentro del modal de
  términos de una fila cualquiera — el usuario tiene que adivinar que editar "el modelo K15"
  es el camino para cambiar la fecha de cierre de toda la oportunidad.
- **Impacto hoy: cero.** Ninguna oportunidad en producción tiene más de un ítem (changelog
  2026-09-04). Es una trampa que se arma sola el día que D8 se levante.
- **Corrección propuesta:** separar los dos modales, o dar a los campos de raíz su propio
  acceso independiente del recuento de ítems. Mismo espíritu que la nota de K36: un control
  que desaparece sin explicación es una forma más suave del mismo problema que un control
  que finge guardar.

---

## 2. Qué se revisó y salió limpio (inventario)

Documentos releídos contra el diff, uno por uno, según `plan-00` §1.2:

| Documento / regla | Veredicto |
|---|---|
| `CLAUDE.md` regla 1 (TDD) | **Parcial** — `PropiedadesCard`, `TablaOportunidades`, `monto` y `rutaDeSolicitud` tienen test; `useActualizarItem`/`actualizarItem` y `etiquetaModelos` no → **B2**, **B12** |
| `CLAUDE.md` regla 2 (nunca `any`) | ✅ grep limpio; `PropiedadesCard.test.tsx` usa `Record<string, unknown>` y narrowing |
| `CLAUDE.md` regla 3 (server state ≠ Zustand) | ✅ nada del servidor entra a `authStore`; el diff no toca `src/store/` |
| `CLAUDE.md` regla 4 (sincronización 360) | **Rota en un sitio** → **B1**. `invalidarResolucion` (`useSolicitudes.ts:36-48`) sí es correcta: la rama nueva de `oportunidad_item` queda cubierta por el `invalidar` general de la línea 36 |
| `CLAUDE.md` regla 5 (HTTP solo por `/src/api/`) | ✅ `actualizarItem` vive en `src/api/oportunidades.ts`; ningún `fetch`/`axios` en componentes; los tests usan MSW |
| `CLAUDE.md` regla 6 (token en cookie httpOnly) | ✅ el diff no toca auth; `localStorage` solo aparece en `AppLayout.tsx` para el colapso del sidebar |
| `CLAUDE.md` regla 7 (Zod = UX, el backend manda) | ✅ el `422 APROBACION_REQUERIDA` se maneja explícitamente en `PropiedadesCard` y `NuevaOportunidadModal`; los avisos de límite se declaran "UX proactiva, no bloquea el submit" |
| `CLAUDE.md` regla 8 (guards = UX) | ✅ `esRolDeApoyo` solo oculta/deshabilita; nada depende de él para seguridad |
| `CLAUDE.md` regla 9 (`dangerouslySetInnerHTML`) | ✅ cero ocurrencias en `src/` |
| `CLAUDE.md` regla 10 (`monto_total` read-only) | ✅ nunca se envía en ningún body; se muestra desde `o.monto_total`. El modal renombró su etiqueta a "Monto del modelo (calculado)", más honesta que la anterior |
| `CLAUDE.md` regla 11 (sin lógica en componentes) | **Rota** → **B5** |
| `CLAUDE.md` regla 12 (sin secretos) | ✅ el diff no toca `.env` ni `VITE_*` |
| `CLAUDE.md` "pausa y pregunta, no inventes" | **Un caso** → **B11** |
| `CLAUDE.md` "tipos sincronizados con los DTOs" | **Dos casos** → **B3**, **B8** |
| `contrato_api.md` §10 — `items[]`, cuotas, `monto_total` | ✅ `OportunidadItem` y los 3 campos de cuota de raíz coinciden campo a campo, incluida la nota de que `cuota_quantum`/`cuota_total` vienen `null` en `POST`/`PUT` de ítem (D6 respetada: se invalida, no se escribe en cache) |
| `contrato_api.md` §10 — `PUT /oportunidades/:id` | ✅ `ActualizarOportunidadInput` quedó con exactamente los 5 campos que el endpoint acepta. **K5 corregido y con test de regresión** |
| `contrato_api.md` §10 — `POST /oportunidades` (K6) | ✅ el request no cambió; `dcto`→`descuento` renombrado como manda el contrato; el `items[0]` de la respuesta está justificado, comentado y con guard por si el array llegara vacío |
| `contrato_api.md` §10 — `id_financiadora` (K36) | ✅ retirado de `ActualizarOportunidadInput` y el `<select>` degradado a texto, con la cita del contrato en el comentario |
| `contrato_api.md` §10 — `POST`/`DELETE` de ítems (D8) | ✅ no implementados. Grep de `crearItem`/`eliminarItem`/`ULTIMO_ITEM` limpio |
| `contrato_api.md` §10 — `sort=precio_unitario` (K10) | ✅ sin impacto real: este frontend nunca envía `sort`. Ver **B11** por el efecto colateral |
| `contrato_api.md` §20 — solicitudes de descuento | ✅ `entidad_tipo: 'oportunidad_item'` forzado por el tipo; `entidad_id` es el id del ítem en los dos call sites (`PropiedadesCard.tsx:171`, `NuevaOportunidadModal.tsx:148`); `dcto_solicitado` viaja como string con 2 decimales |
| `contrato_api.md` §20 — K9 (falta `id_oportunidad`) | ✅ degradado con criterio (D9): `rutaDeSolicitud` devuelve `null`, la celda cae a texto plano, y el `switch` exhaustivo sin `default` impide que K8 se repita en ese módulo |
| `contrato_api.md` §26 — enums | **Un desfase** → **B3** (y **B4** por el renumerado) |
| `contrato_api.md` §9 — `ContactoOportunidadRef` | ✅ **verificado, no era un error**: T4.2 declaraba tocar `src/types/contacto.ts` y `ContactoDetallePage.tsx` y no lo hizo. §9 mantiene `modelo` plano en el resumen de contacto a propósito (*"`oportunidades[].modelo.codigo` usa el mismo campo que el resto del contrato"*). No tocarlo fue lo correcto |
| `contrato_api.md` §18 — reportes (K13) | ✅ sin cambios en `ReportesPage`/`types/reportes.ts`, como predijo K13 |
| `reglas_simulaciones.md` §1.2 | ✅ `cuota_financiadora` editable por el vendedor, default 937.50, documentada en el tipo y expuesta en el formulario con el tooltip correcto |
| `matriz_permisos.md` §2.4 | ✅ los ítems heredan los permisos de editar la oportunidad; `esRolDeApoyo` bloquea el botón de guardar y los accesos de edición |
| `TESTING-frontend.md` §9.4 (MSW) | ✅ `PropiedadesCard.test.tsx` usa `servidorMock`/`http` de MSW; **cero mocks del cliente de API** en todo el diff |
| `TESTING-frontend.md` §7 (nombres) | ✅ todos los `it()` describen comportamiento de usuario, en español |
| `TESTING-frontend.md` §9.5 (bug → test primero) | ✅ el test de regresión de K5 existe, comprueba que **no** se llama al endpoint que descarta, y verifica el body enviado |
| `TESTING-frontend.md` §4.4 / §6 (cobertura) | **Parcial** → **B2**, **B12** |
| D2 (sin azúcar de "ítem único") | ✅ no hay getter `oportunidad.modelo`; `itemUnico()` devuelve `null` con varios ítems en vez del primero |
| D3 (multi-ítem explícito) | ✅ en Pipeline, EmpresaDetalle y PropiedadesCard; **B9** por el tooltip que falta en el detalle |
| D4 (redondeo por ítem) | ✅ implementado y con test; **B6** por no usarse |
| D5, D6, D7, D9, D10 | ✅ implementadas tal como se describen |

---

## 3. Greps de control (T7.1 Paso 3) — salida completa

```
$ grep -rn "items\[0\]" src --include=*.ts --include=*.tsx
src/components/NuevaOportunidadModal.tsx:144:          // items[0] es seguro acá y solo acá: POST /oportunidades crea exactamente un
src/components/NuevaOportunidadModal.tsx:148:          const itemCreado = creada.items[0]
src/pages/Pipeline/TablaOportunidades.test.tsx:102:    // Nunca items[0] a secas: mostraría un modelo como si fuera toda la operación.
src/utils/oportunidades.ts:9:  // Desestructurar en vez de indexar: con `noUncheckedIndexedAccess`, `items[0]`

$ grep -rn "\.precio_unitario\|\.dcto\b" src --include=*.ts --include=*.tsx
(vacío)

$ grep -rn "crearItem\|eliminarItem\|ULTIMO_ITEM" src --include=*.ts --include=*.tsx
(vacío)

$ grep -rn ": any\|as any" src --include=*.ts --include=*.tsx
(vacío)
```

**Veredicto: los cuatro cumplen.**

- `NuevaOportunidadModal.tsx:148` es la **única ocurrencia real** de `items[0]` en código, y
  es la autorizada por K6 / T4.3 Paso 4, con el comentario exigido.
- `TablaOportunidades.test.tsx:102` es un **comentario** que cita la regla para explicar qué
  prueba el test. No es código.
- `src/utils/oportunidades.ts:9` es un **comentario** dentro de `etiquetaModelos`. El caso es
  incluso más limpio de lo que anticipaba la "Nota de ejecución" de D3: el ejecutor **no
  indexa**, desestructura (`const [primero, ...resto] = items`) porque
  `noUncheckedIndexedAccess` tipaba `items[0]` como posiblemente `undefined`. El grep
  encuentra la palabra en la explicación, no la operación. **Cierra como "cumple".**

---

## 4. Verificación completa (T7.1 Paso 4)

```
$ npm run type-check    →  ✅ tsc --noEmit, cero errores
$ npm run lint          →  ✖ 58 problemas (50 errores, 8 warnings)  — ver análisis abajo
$ npm run test          →  ✅ 13 archivos, 79 tests, todos verdes (27.35 s)
$ npm run build         →  ✅ built in 25.34s
```

### Análisis del fallo de `lint`: no es una regresión de este plan — verificado línea a línea

Se comprobó de forma independiente, sin confiar en la nota previa de T1.1/T5.1. Método: para
**cada** error de lint en un archivo que este plan sí toca, se contrastó su línea contra los
hunks modificados (`git diff main...feature/multimodelo-v42 -U0 -- <archivo>`).

| Archivo tocado por el plan | Líneas con error de lint | Líneas nuevas/modificadas por el diff | ¿Dentro de un hunk? |
|---|---|---|---|
| `EmpresaDetallePage.tsx` | 128, 130, 183, 298, 299, 321, 435, 436, 530, 531, 620, 621, 629, 630 | 2 · 42 · 395-405 | **No, ninguna** |
| `OportunidadDetallePage.tsx` | 66 | 11 · 105-108 | **No** |
| `PropiedadesCard.tsx` | 406, 513, 514 | 5-10, 16, 18, 21-35, 42-76, 79-263 (disperso), 374-384, 419-491, 494-660 (disperso) | **No** — 406 cae entre los hunks 384 y 419; 513-514 entre 506 y 536 |
| `PipelinePage.tsx` | 217, 218 | 234-236 | **No** |
| `TablaOportunidades.tsx` | 350, 351 | 13, 15, 60-70, 111, 113-118, 182-187 | **No** |
| `SolicitudesPage.tsx` | 59 | 10-14, 25-33, 113 | **No** |
| `BandejaSolicitudes.tsx` | 52 | 9, 19-27, 110 | **No** |

**Cero errores de lint caen dentro de una línea que este plan escribió o modificó.**

Evidencia adicional de que la deriva es global y anterior: los mismos errores
(`@typescript-eslint/no-misused-promises`, `no-unsafe-assignment`,
`react-hooks/set-state-in-effect`, `Compilation Skipped`) aparecen en archivos que **el diff
no toca en absoluto** — `BandejaMetasVenta.tsx`, `EliminarEmpresaModal.tsx`,
`EventoDetalleModal.tsx`, `TareaDetalleModal.tsx`, `LoginPage.tsx`,
`CambiarContrasenaPage.tsx`, `ActividadesPage.tsx`, `AdminEmpleados.tsx`, `CarteraPage.tsx`,
`ContactosCard.tsx`, `EventosCard.tsx`, `TareasCard.tsx`, `ProspeccionPage.tsx`,
`NuevaEmpresaModal.tsx`, `FiltrosCarteraDrawer.tsx`.

**Única salvedad, y es un warning, no un error:**
`PropiedadesCard.tsx:436` — `react-refresh/only-export-components` sobre el `FilaItem` nuevo
(T3.1 Paso 8). Es una **instancia más** de un warning que el archivo ya emitía cuatro veces
antes del diff (líneas 77, 293, 367, 493, todas fuera de hunks). No cambia el exit code ni
introduce una regla nueva. No se cuenta como hallazgo.

**Conclusión:** `npm run lint` falla por deriva de dependencias preexistente
(`react-hooks`/`eslint-plugin`, `typescript-eslint`) sobre código que este plan nunca tocó.
Sanear los 50 errores es un trabajo propio, ajeno a este plan.

---

## 5. Estado de los criterios de "terminado" (`plan-00` §5)

| # | Criterio | Estado |
|---|---|---|
| 1 | `type-check`, `lint` y `test` en verde | ✅ / ⚠ / ✅ — `lint` falla por deriva preexistente, verificada línea a línea (§4) |
| 2 | Cero lecturas de campos planos en la raíz | ✅ grep limpio |
| 3 | Editar los términos de un ítem persiste de verdad, con test de K5 | ✅ `PropiedadesCard.test.tsx` |
| 4 | Ninguna solicitud navega a `/empresas/<id de ítem>` | ✅ `rutaDeSolicitud` + tests. **Pero el mismo bug vive en notificaciones** → B3 |
| 5 | Auditoría final ejecutada | ✅ este documento |

---

## 6. Recomendación de orden al arquitecto

1. **B1** y **B3** antes de desplegar el hotfix: son los dos que degradan lo que el usuario ve.
2. **B2** junto con B1 — el test es lo que impide que B1 vuelva.
3. **B4**, **B12**, **B9**, **B10**: minutos cada uno, sin riesgo.
4. **B5**, **B6**, **B8**: refactor, sin urgencia.
5. **B7**, **B11**, **B13**: necesitan una decisión (pregunta al backend, alcance de producto,
   o esperar a que se levante D8). No las resuelva el frontend por su cuenta.
