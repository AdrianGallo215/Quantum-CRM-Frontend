# Plan 05 — Auditoría del diff de vistas de Simulaciones (T8.1)

**Fecha:** 2026-09-08
**Rama auditada:** `feature/vistas-simulaciones-cronograma` (diff `main...HEAD`)
**Exigida por:** §1.3 del encargo · `plan-05-vistas-simulaciones-tareas.md` OLA 8
**Alcance:** toda la rama activa (T1.1 → T7.2 + los dos ajustes post-T7.1), contrastada
contra `CLAUDE.md`, `plan-00`, `plan-02`, `plan-04`, `plan-05`, `reglas_simulaciones.md`,
`DESIGN.md` y `matriz_permisos.md`.

> **No se corrigió nada.** Este documento solo reporta. La decisión es del arquitecto.

---

## 0. Resumen

| Severidad | Cantidad | IDs |
|---|---|---|
| **Alta** (contradice una regla explícita del encargo, del plan o de `CLAUDE.md`) | 4 | C1, C2, C3, C4 |
| **Media** | 1 | C5 |
| **Baja** (inconsistencia menor, deuda o mejora) | 7 | C6 · C7 · C8 · C9 · C10 · C11 · C12 |

Superficie auditada: 28 archivos, +5 790 / −35 líneas.

**Lo que está bien y merece decirse:** las tres reglas que el encargo marca como *no
negociables* —el selector de ítem con `items.length === 1`, los dos juegos de columnas del
cronograma y la `cantidad: null` en la propuesta huérfana— están implementadas
literalmente, comentadas con su cita y clavadas por tests. `exceljs` quedó fuera del bundle
principal, no entró ninguna librería de PDF, y los seis greps de control salen limpios.

---

## 1. Verificación completa del proyecto

### `npm run type-check`
```
exit 0 — sin errores
```
✅ **Verde.**

### `npm run test` — **inestable** (ver C2)

Dos corridas consecutivas, sin tocar código entre ellas:

| Corrida | Test Files | Tests | Duración |
|---|---|---|---|
| 1ª | **8 failed** · 23 passed (31) | **19 failed** · 228 passed (247) | 119,15 s |
| 2ª | 31 passed (31) | **247 passed (247)** | 78,95 s |

Todos los fallos de la 1ª corrida fueron `Error: Test timed out in 5000ms.` — ninguno una
aserción rota. Ejemplo capturado:
`SimulacionesPage > marcar como principal ya siendo principal no muestra error (no-op exitoso)`.

### `npm run lint` — **rojo** (ver C1)
```
✖ 88 problems (80 errors, 8 warnings)   [exit 1]
```
Desglose contra `git diff main...HEAD --stat`:

| Origen | Errores |
|---|---|
| Archivos **creados por esta rama** | **2** (`SimulacionDetallePage.tsx:128`, `:171`) |
| Archivos preexistentes que la rama **no** tocó | 78 errores + 8 warnings |

El único archivo modificado por la rama que ya tenía errores —
`OportunidadDetalle/OportunidadDetallePage.tsx:68`— los tenía **antes**: la rama solo le
añadió 5 líneas (import + montaje de `<SimuladorCard/>`), ninguna en esa línea.

### `npm run build`
```
✓ built in 9.93s   [exit 0]
dist/assets/exceljs.min-CTcz8-3q.js   940.20 kB │ gzip: 271.33 kB   ← chunk propio
dist/assets/index-9Cil9TkG.js         730.20 kB │ gzip: 230.28 kB   ← bundle principal
dist/assets/exportarCronograma-D7C6iuXW.js  20.18 kB
```
✅ **Verde**, y `exceljs` viaja en su propio chunk, fuera del principal (D28 cumplido).

---

## 2. Los 6 greps de control

| # | Grep | Resultado |
|---|---|---|
| 1 | `dangerouslySetInnerHTML` | ✅ **Limpio.** 2 coincidencias, ambas **comentarios** que prohíben su uso (`PropuestaFinanciera.tsx:23`, `.test.tsx:209`). Cero usos reales. |
| 2 | `Math.pow…1/12` · `**(1/12)` · `calcularPMT` · `cuotaFinanciera =` | ✅ **Limpio.** Cero coincidencias. *(Pero ver **C3**: hay cálculo de negocio en el cliente que este patrón no detecta.)* |
| 3 | `cuota_final` en body/input/payload/post/patch | ✅ **Limpio.** 3 coincidencias, todas comentario o test (`SimuladorCard.test.tsx:190,206` es el test que *verifica* que no se envía; `SimuladorCard.tsx:224` es el comentario que lo prohíbe). |
| 4 | `ROLES_APOYO`/`ROLES_SUPERVISION` + simulaciones | ✅ **Limpio.** 4 coincidencias, todas en `utils/simulacionPermisos.ts` / su test, y todas **negativas** ("NO se reutilizan"). D11 respetado. |
| 5 | `axios.` · `fetch(` en `.tsx` | ✅ **Limpio.** 25 coincidencias, **todas** falsos positivos del substring `fetch(` dentro de `refetch()` de TanStack Query. Cero `axios`/`fetch` directos. |
| 6 | `: any` · `as any` | ✅ **Limpio.** Cero coincidencias. |

**Los seis salen vacíos.** ✅

---

## 3. Hallazgos

### C1 — `npm run lint` no está en verde: 2 errores nuevos de esta rama — **ALTA**

**Archivo:línea:** `src/pages/Simulaciones/SimulacionDetallePage.tsx:128` y `:171`

```
128:7  error  Promises must be awaited, end with a call to .catch, end with a call to
              .then with a rejection handler or be explicitly marked as ignored with
              the `void` operator   @typescript-eslint/no-floating-promises
171:7  error  (idem)
```

Las dos líneas son llamadas a `navigate(...)`:
- `:128` → `navigate(\`${RUTA_SIMULACIONES}/${nueva.id}\`)` dentro de `handleBifurcar`
- `:171` → `navigate(RUTA_SIMULACIONES)` dentro de `handleEliminar`

**Qué contradice:**
- `plan-04-mapa-vistas-simulaciones.md` §6.1 — *"`type-check`, `lint`, `test`, `build` en verde"*
- `plan-05-vistas-simulaciones-tareas.md`, Checklist de cierre — *"`type-check`, `lint`, `test`, `build` en verde"*
- T5.1 y T7.2 declaran `npm run lint` en su bloque de verificación.

El resto del repo (78 errores) es deuda preexistente y **no** es responsabilidad de esta
rama; pero estos dos sí son nuevos y la rama los introdujo.

**Corrección propuesta:** prefijar ambas llamadas con `void`, igual que el propio archivo
ya hace en `onClick={() => void handleEliminar()}` (`:210`):
```ts
void navigate(`${RUTA_SIMULACIONES}/${nueva.id}`)
void navigate(RUTA_SIMULACIONES)
```

---

### C2 — La suite de tests es inestable: 19 fallos por timeout en la primera corrida — **ALTA**

**Archivos:** transversal. `vitest.config.ts` no define `testTimeout`, y `src/test/setup.ts`
tampoco → rige el default de **5 000 ms**.

Corrida 1: `19 failed | 228 passed (247)`, `8 failed | 23 passed (31)` archivos. Todos los
fallos con el mismo mensaje: `Error: Test timed out in 5000ms.`
Corrida 2, sin cambiar nada: `247 passed (247)`.

La causa es que los tests de página son estructuralmente lentos: en la corrida verde,
`CalculadoraPage.test.tsx` tardó **48 650 ms** para 6 tests, con casos individuales de
**5 562 ms a 10 067 ms** — es decir, rozando o superando el propio timeout. El margen
es tan estrecho que el resultado depende de la carga de la máquina.

**Qué contradice:** `plan-04` §6.1 y el checklist de cierre del `plan-05` piden `test` **en
verde**, no "en verde a veces". `CLAUDE.md` §Comandos: *"Antes de cada commit: `npm run test`
debe pasar"* — hoy eso es una tirada de dados, y en CI (que suele ser más lento que una
máquina de desarrollo) el modo más probable es el rojo.

**Corrección propuesta:** dos opciones, no excluyentes:
1. Subir `testTimeout` en `vitest.config.ts` (p. ej. `test: { testTimeout: 20000 }`) —
   arreglo inmediato, esconde el síntoma.
2. Atacar la causa: los `findBy*` de estas páginas esperan cadenas largas de queries
   encadenadas (`useOportunidades` → `useSimulacionesListado` → `useCronograma`). Revisar
   si los handlers de MSW y los `waitFor` se pueden acotar, y si `CalculadoraPage.test.tsx`
   necesita renderizar la página entera en los 6 casos.

Recomendado hacer las dos, y dejar constancia de que la cifra "247 passed" solo es
reproducible con el timeout ampliado.

---

### C3 — El frontend calcula el `principal` (con el IGV 1.18 hardcodeado) — **ALTA**

**Archivo:línea:** `src/components/simulaciones/FormularioParametros.tsx:129-136`

```ts
const avisoValorResidual = (() => {
  if (!precioVenta || valorResidual === null || valorResidual === undefined) return null
  const pvEfectivo = precioVenta * (1 - (descuento ?? 0) / 100)
  const ci = cuotaInicial ?? 0
  const principal =
    modo === 'credito_directo' ? pvEfectivo - ci : pvEfectivo / 1.18 - ci / 1.18
  return validarValorResidual(valorResidual, principal)
})()
```

**Qué contradice:**
- `plan-05-vistas-simulaciones-tareas.md`, **Reglas globales**: *"**El motor de cálculo es
  del backend.** El frontend nunca calcula una cuota ni una fila de cronograma: las pide.
  **Si te parece que hace falta calcular algo → ESCALAR.**"* No consta ninguna escalación
  con el formato de §"Formato de escalación" en la rama.
- `CLAUDE.md` regla 11 — *"Sin lógica de negocio en componentes. Extraer a hooks o utils."*
  La fórmula vive inline en el cuerpo de un componente.
- `CLAUDE.md` — *"El frontend no tiene lógica de negocio."*
- `reglas_simulaciones.md` §3.2-§3.4 (la definición del `principal` por modo) es propiedad
  del backend: acá queda duplicada, sin ninguna prueba de que siga sincronizada.

Agravantes:
1. El **1.18** es una constante de negocio (el IGV peruano) escrita a mano, sin nombre y
   sin referencia a la sección de `reglas_simulaciones.md` que la fija.
2. El comentario adyacente (`:126-128`) afirma *"sin duplicar el motor de cálculo del
   backend"* — describe exactamente lo contrario de lo que hace el código de abajo. Un
   lector futuro leerá el comentario y no auditará la fórmula.
3. El grep de control nº 2 no lo detecta: sus patrones buscan `Math.pow`/`calcularPMT`,
   no una división por 1.18.

**Nota de contexto:** T2.1 paso 4 sí manda usar `validarValorResidual` (Plan 03, T2.2), y
esa función exige un `principal: number` como argumento — o sea, la tarea pide una
validación proactiva para la que el frontend **no tiene el dato**. Es precisamente el caso
que las reglas globales del plan mandan **escalar**, no resolver inventando la fórmula.

**Corrección propuesta (a decidir por el arquitecto), en orden de preferencia:**
1. **Escalar**, con el formato del plan: *Esperado: `validarValorResidual` recibe un
   principal / Encontrado: el frontend no lo tiene / Pregunta: ¿se elimina el aviso
   proactivo del valor residual, o el backend expone el principal?*
2. Si se mantiene: extraer la fórmula a `src/utils/simulaciones.ts` (junto a
   `DEFAULTS_SIMULACION` y las otras validaciones), con la constante nombrada
   (`const TASA_IGV = 1.18`), la cita literal de `reglas_simulaciones.md` §3.2-§3.4, un
   comentario que **admita** que es una duplicación aceptada y solo para UX, y un test que
   la fije. Y corregir el comentario `:126-128`, que hoy dice lo contrario.
3. Eliminar el aviso proactivo de valor residual y dejar que el `400 VALIDACION` del
   backend haga el trabajo, que es la validación autoritativa igual (`CLAUDE.md` regla 7).

---

### C4 — La propuesta impresa arrastra todo el cromo de la aplicación — **ALTA**

**Archivos:línea:**
- `src/styles/impresion.css:24-35` (la regla `.no-imprimir`)
- `src/components/AppLayout.tsx:44` (`<aside>` del sidebar), `:125` (`<header>` de la
  topbar), `:192-193` (`<CotizadorFab/>`, `<BottomNavBar/>`) — **ninguno lleva la clase**
- `src/pages/Calculadora/CalculadoraPage.tsx:204-215` y
  `src/pages/Simulaciones/SimulacionDetallePage.tsx:301-323` (la propuesta se monta dentro
  de un `<Modal>` de antd, sobre la página viva)

`grep -rn "no-imprimir" src` devuelve **solo tres archivos**: la propia hoja de impresión,
`PropuestaFinanciera.tsx:55` (el botón) y su test. El comentario de `impresion.css:24-27`
promete cubrir *"botones, sidebar, topbar, navegación inferior"*, pero ningún elemento del
layout la lleva.

Consecuencia: `window.print()` imprime **el documento entero**. La hoja oculta el
`.ant-modal-mask` y el botón, pero detrás del modal siguen el sidebar (azul, a sangre), la
topbar con el buscador, la `BottomNavBar` y —en el detalle— la propia página de la
simulación con sus botones. La primera página del PDF no será la propuesta.

**Qué contradice:**
- `plan-05` T7.1 paso 5, literal: *"`@media print { /* ocultar sidebar, topbar, botones; …"*
- `plan-04` D27 — la decisión de `window.print()` se justificó por dar *"texto vectorial y
  seleccionable"*; con el cromo dentro, el entregable no es la propuesta.
- `plan-05` T7.1 paso 7 — *"Verificar que la propuesta se ve bien impresa **de verdad**"*.
  El test existente (`PropuestaFinanciera.test.tsx:193`) solo comprueba que el botón está
  dentro de un `.no-imprimir` y que `window.print` fue llamado; en jsdom no hay motor de
  impresión, así que este defecto pasa el test sin problema.

**Corrección propuesta:** no depender de que cada elemento del layout recuerde una clase.
Invertir la regla en `impresion.css`: ocultar todo el árbol y revelar solo la propuesta.
Por ejemplo, marcar el contenedor de la propuesta con `.solo-imprimir` y añadir

```css
@media print {
  body * { visibility: hidden !important; }
  .propuesta-impresa, .propuesta-impresa * { visibility: visible !important; }
  .propuesta-impresa { position: absolute; inset: 0; }
  .no-imprimir, .no-imprimir * { visibility: hidden !important; }
}
```

(o, alternativamente, añadir `no-imprimir` a `<aside>`, `<header>`, `CotizadorFab` y
`BottomNavBar` en `AppLayout.tsx` — más frágil, porque cada pantalla futura vuelve a
poder romperlo). Y verificar el resultado real con Playwright, como pedía T7.1 paso 7.

---

### C5 — El simulador de la oportunidad no muestra el cronograma — **MEDIA**

**Archivo:** `src/pages/OportunidadDetalle/SimuladorCard.tsx` (completo; no importa ni
renderiza `CronogramaTabla` — ver los imports en `:1-18`)

`SimuladorCard` entrega formulario + guardar, pero no el cronograma ni ninguna vía para
verlo desde la oportunidad.

**Qué contradice:** `plan-04` K27 cita el contenido de §5.2 como
*"formulario de parámetros + cronograma + guardar"*, y de hecho **toda la razón de ser de
K27/D21** es que §5.2 se retrasó a este plan *porque* incluye el cronograma:

> *"Pero su contenido —'formulario de parámetros + cronograma + guardar'— incluye el
> **cronograma**, que el propio encargo §5.4 manda a diseño como componente nuevo. […] El
> **simulador** propiamente dicho vive acá y hereda el hito de diseño del cronograma."*

También `plan-04` §4, fila 3: *"Simulador en la oportunidad (§5.2) — El flujo principal del
vendedor, **ya con cronograma probado**"*. El cronograma se construyó primero para que
cuatro vistas lo reutilizaran (D23); esta es la única de las cuatro que no lo usa.

**Corrección propuesta:** tras guardar, pedir `useCronograma(simulacion.id)` y montar
`<CronogramaTabla cronograma={...} modo={...} />` dentro de la card (o en un panel
colapsable, si el mockup H0 aprobado lo prefiere así). Si el mockup H0 **decidió
deliberadamente** dejarlo fuera, entonces la desviación es de la aprobación de diseño y no
del código — pero debe quedar escrita, porque hoy contradice a K27 sin explicación.

---

### C6 — Fallback silencioso a `'leasing'` en la Calculadora — **BAJA**

**Archivo:línea:** `src/pages/Calculadora/CalculadoraPage.tsx:85` y `:168`

```ts
modo={ultimosValores?.modo ?? 'leasing'}                      // :168 — la tabla
await descargarCronogramaExcel(resultado.cronograma, ultimosValores?.modo ?? 'leasing', …) // :85
```

Si `ultimosValores` fuera `null` con `resultado` presente, la tabla y el Excel mostrarían
las columnas de **leasing** para un cronograma de crédito directo: sin la columna de IGV y
con el último rótulo equivocado. Hoy los tres `setState` van juntos en `handleCalcular`, así
que no ocurre — pero es un default que enmascara el bug en vez de exponerlo, justo en la
regla que D23 protege ("no es la misma tabla con celdas vacías").

**Corrección propuesta:** derivar el modo de `ultimoInput`, que es el input realmente
enviado y ya está en el estado (`:39`), y usarlo como condición de render:
`{resultado && ultimoInput && (<CronogramaTabla … modo={ultimoInput.modo} />)}`. Sin
fallback: si falta el input, no hay nada que mostrar.

---

### C7 — La tercera implementación de D24 no tiene test — **BAJA**

**Archivo:línea:** `src/pages/Simulaciones/SimulacionesPage.tsx:199-206` y `:315-328`
(`ModalNuevaSimulacion`)

La condición literal está y está comentada, pero `SimulacionesPage.test.tsx` (7 casos) no
cubre ni el selector de ítem ni el modal de guardado sin ítem (D29, aviso 1 de 3). Las otras
dos superficies sí tienen su test: `SimuladorCard.test.tsx:132,142` y
`CalculadoraPage.test.tsx > "enlaza a la oportunidad con id_oportunidad_item cuando tiene un
solo ítem (D24)"`.

**Qué contradice:** `plan-04` D24 — *"Se escribe un test que falla si aparece un selector con
un solo ítem. **Es el tipo de regla que se pierde en una refactorización si no está clavada
por un test.**"* Y `plan-04` §5, tabla de riesgos, fila 1.

**Corrección propuesta:** añadir a `SimulacionesPage.test.tsx` dos casos: (a) abrir el modal
de nueva simulación, elegir una oportunidad de un solo ítem y afirmar
`queryByLabelText(/ítem a enlazar/i)` es `null`; (b) el modal de advertencia sin ítem
muestra las **dos** salidas ("Buscar oportunidad" y "Guardar sin vincular") y no promete
ningún aviso futuro.

---

### C8 — El `400 VALIDACION` se muestra como toast, no inline, en los dos modales de enlace — **BAJA**

**Archivos:línea:** `src/pages/Calculadora/CalculadoraPage.tsx:273-275`
(`ModalEnlazarAOportunidad.handleEnlazar`) y `src/pages/Simulaciones/SimulacionesPage.tsx:231-233`
y `:242-244` (`handleGuardarSinEnlace`, `handleEnlazarYGuardar`) — los tres usan
`message.error(mensajeDeError(e, …))`.

**Qué contradice:** `plan-04` D30 — *"`400 VALIDACION`: mensaje **inline en el campo** cuando
viene `error.field`; si no, a nivel de formulario"*. Estos tres `POST /simulaciones` pueden
devolver un `error.field` (`cuota_inicial`, `valor_residual`…) que aquí se pierde.

**Atenuante real:** en los tres casos el formulario de parámetros ya no está en pantalla
(el flujo pasó a un segundo modal), así que "inline en el campo" no es literalmente posible
sin rediseñar el flujo. Por eso es baja, no alta.

**Corrección propuesta:** o bien mostrar el `error.field` traducido dentro del texto del
toast (`"Cuota inicial: …"` en vez de un mensaje genérico), o bien volver al primer modal
con el campo marcado. Como mínimo, dejar un comentario que reconozca la desviación de D30 y
por qué, para que no parezca un olvido.

---

### C9 — Comentario obsoleto y página huérfana tras cablear las rutas — **BAJA**

**Archivos:línea:**
- `src/components/NotificacionesDropdown.tsx:31` — *"…aunque hoy monte el placeholder
  `EnConstruccionPage` hasta que…"*. Ya no es cierto: `router/index.tsx` monta las tres
  páginas reales desde esta rama.
- `src/pages/EnConstruccion/EnConstruccionPage.tsx` — quedó sin ningún consumidor
  (`grep -rn "EnConstruccionPage" src` solo devuelve su propia definición y el comentario
  de arriba).

**Qué contradice:** nada normativo; es higiene. Un comentario que miente sobre el estado del
sistema es peor que ningún comentario.

**Corrección propuesta:** actualizar el comentario de `NotificacionesDropdown.tsx:31` a que
la ruta `/simulaciones/:id` ya existe (cerrando el TODO de D20), y decidir si
`EnConstruccionPage` se borra o se conserva a propósito como andamio para futuras fases —
si se conserva, decirlo en el archivo.

---

### C10 — Sin `eliminacion_prevista_el`, la huérfana no avisa nada — **BAJA**

**Archivos:línea:** `src/pages/Simulaciones/TarjetaSimulacion.tsx:81` y
`src/pages/Simulaciones/SimulacionDetallePage.tsx:220`

Los dos avisos están condicionados a `esHuerfana && simulacion.eliminacion_prevista_el`. Si
el backend devolviera la simulación huérfana con ese campo en `null`, ninguna de las dos
superficies mostraría **nada**: ni el aviso, ni el hecho de que está sin vincular.

**Qué contradice:** `plan-04` D29 — la huérfana avisa en tres lugares — y `reglas_simulaciones.md`
§8.3 tal como lo cita el encargo: *"la garantía real es `eliminacion_prevista_el`, **que está
siempre visible**"*. El código asume que el backend siempre lo manda; si esa garantía es
firme, la condición sobra y confunde; si no lo es, el fallback debería ser avisar sin fecha.

**Corrección propuesta:** separar las dos condiciones — mostrar siempre el aviso de "sin
vincular" cuando `esHuerfana`, y añadir la fecha solo cuando exista:
*"Sin vincular — se eliminará el {fecha}"* / *"Sin vincular — se eliminará
automáticamente"*. Añadir el caso al test.

---

### C11 — El diff del historial muestra el nombre crudo de la columna — **BAJA**

**Archivo:línea:** `src/pages/Simulaciones/HistorialModal.tsx:133`

```tsx
<Text strong>{cambio.campo}</Text>: {cambio.valor_anterior ?? '—'} → {cambio.valor_nuevo ?? '—'}
```

El usuario ve `precio_venta`, `comision_estructuracion`, `dias_trabajados` — identificadores
del backend, no rótulos. El resto de la rama sí traduce (`Precio de venta`, `Comisión de
estructuración` en `FormularioParametros`).

**Qué contradice:** `DESIGN.md` (normativo, la estética se sigue con precisión) y la
coherencia de la propia rama. T6.1 paso 3 pide "su `diff` como lista de
`{campo, valor_anterior, valor_nuevo}`", que se cumple estructuralmente pero no en
presentación.

**Corrección propuesta:** un `Record<string, string>` de rótulos junto a
`ETIQUETAS_TIPO_EVENTO` (`:17-21`), con fallback al `campo` crudo para claves nuevas que el
backend agregue — nunca ocultar un cambio por no tener rótulo.

---

### C12 — La ventana de 30 días de la huérfana está escrita a mano en la copy — **BAJA**

**Archivo:línea:** `src/pages/Simulaciones/SimulacionesPage.tsx:280-283`

> *"Una simulación sin ítem se elimina automáticamente **30 días** después de creada si no
> se enlaza antes."*

El número coincide con `reglas_simulaciones.md:215` (*"30 días después"*), así que hoy es
correcto. Pero es una constante de negocio propiedad del backend, replicada en un literal de
un componente: si el backend la cambia, esta frase miente y nada lo detecta.

**Qué contradice:** `CLAUDE.md` §"Coordinación con el backend" (los documentos son propiedad
del backend) y regla 11 en espíritu. Es baja porque es copy, no lógica.

**Corrección propuesta:** o bien redactar sin el número — la fecha exacta ya se muestra en
la tarjeta y el detalle vía `eliminacion_prevista_el`, que es la garantía real según §8.3 —
o bien extraer `DIAS_RETENCION_HUERFANA = 30` a `utils/simulaciones.ts` con la cita de
`reglas_simulaciones.md` §… al lado.

---

## 4. Veredicto de los 13 puntos pedidos

### 1. D23 — dos arrays de columnas, mismo origen para tabla y Excel · ✅ **CORRECTO**

`src/utils/columnasCronograma.ts` es el único punto de verdad: exporta `COLUMNAS_LEASING`
(7 columnas, **sin** IGV) y `COLUMNAS_CREDITO` (8, con IGV), más
`columnasCronogramaPorModo(modo)` y `valorCrudoCronograma(fila, clave)`.

- `CronogramaTabla.tsx:52` → `columnasCronogramaPorModo(modo)`
- `exportarCronograma.ts:57` → `columnasCronogramaPorModo(modo)`

Ninguno define un tercer array. Verificado por lectura completa de los dos archivos: no hay
literales de columnas fuera del módulo compartido. **No hay `hidden`/`oculta` condicional** —
son dos arrays distintos, tal como exige D23, y hasta la última columna se rotula distinto
en cada modo (`Cuota con IGV` vs `Cuota con IGV de Intereses`, `columnasCronograma.ts:75,86`).
El `switch` de `valorCrudoCronograma` tiene guarda de exhaustividad (`const _exhaustivo: never`).

Cubierto por tests en los dos consumidores: `CronogramaTabla.test.tsx:87,103` y
`exportarCronograma.test.ts:63,76`.

### 2. K32 — sin paginación en el cronograma · ✅ **CORRECTO**

`CronogramaTabla` renderiza un `<table>` **nativo**, no `<Table>` de Ant Design; no hay
ningún componente de paginación en `src/components/simulaciones/`, `src/pages/Simulaciones/`
ni `src/pages/Calculadora/`. Scroll interno acotado en `CronogramaTabla.tsx:64-67`
(`max-h-[480px] overflow-y-auto overflow-x-auto`), con `thead sticky` y el comentario que
cita K32. Clavado por el test `CronogramaTabla.test.tsx:181` — *"deja el cronograma con
scroll interno, sin paginación (K32)"*, que afirma `container.querySelector('.ant-pagination') === null`.

### 3. D24 — selector de ítem, condición literal en los tres lugares · ✅ **CORRECTO**

| Superficie | Archivo:línea | Condición | Comentario |
|---|---|---|---|
| Simulador de la oportunidad | `SimuladorCard.tsx:45,47` | `items.length > 1` / `items.length === 1` | `:42-44` cita *"Encargo §5.2 / reglas §1.1 (D24)"* |
| Calculadora → Enlazar a Oportunidad | `CalculadoraPage.tsx:251,257` | ídem | `:253` cita D24; `:305-308` cita *"Encargo §5.2 / reglas §1.1 (D24, no negociable)"* |
| Módulo → Modal nueva simulación | `SimulacionesPage.tsx:199,204` | ídem | `:200` y `:315` citan D24 |

Los tres usan `items.length === 1` literal. Tests en dos de las tres (ver **C7** por la
tercera). Nota menor: los comentarios de `SimulacionesPage.tsx` citan solo "D24" y no
"§5.2/reglas §1.1" como los otros dos — cosmético, no hallazgo.

### 4. D26/K29 — `cantidad: null` en la propuesta · ✅ **CORRECTO**

- `propuesta.ts:112` — `propuestaDesdeCalculadora` devuelve **literalmente** `cantidad: null`,
  incondicional, con el comentario `:101-102`: *"`cantidad` es SIEMPRE `null`"*.
- `propuesta.ts:70-75` — `propuestaDesdeSimulacion(s, c, cantidad, empresa = null)` recibe
  `cantidad: number | null` por parámetro y la propaga (`:80`) sin ningún `?? 1`.
- `PropuestaFinanciera.tsx:122` — `cantidad === null ? <PorUnidad/> : <TotalPorUnidades/>`;
  `PorUnidad` (`:138-148`) muestra *"Cotización por unidad"* y **no** renderiza total.
- `SimulacionDetallePage.tsx:101` — `esHuerfana ? null : (itemParaPropuesta?.cantidad ?? null)`:
  tampoco inventa nada si el ítem no se encuentra.

Tests: `propuesta.test.ts:97,106,162` y `PropuestaFinanciera.test.tsx:135,145`.
Grep de confirmación: no existe ningún `cantidad: 1`, `?? 1` ni `|| 1` en la ruta de la
propuesta.

### 5. D27 — PDF sin dependencias · ✅ **CORRECTO**

`grep -n "jspdf\|html2canvas\|pdfmake\|react-pdf" package.json package-lock.json` → **cero
coincidencias**, ni siquiera transitivas. El único añadido a `package.json` en toda la rama
es `"exceljs": "^4.4.0"` (diff verificado). El PDF sale de
`PropuestaFinanciera.tsx:58` → `onClick={() => window.print()}` + `src/styles/impresion.css`,
importada desde el componente (`PropuestaFinanciera.tsx:6`) para viajar con su chunk.
`impresion.css:1-21` documenta la comparativa de D27 con las tres opciones y su coste.

⚠ La **decisión** de D27 se respetó al pie de la letra; su **implementación** tiene el
defecto de C4 (el cromo de la app entra en la hoja).

### 6. D28 — Excel con `exceljs`, carga dinámica · ✅ **CORRECTO**

- `exportarCronograma.ts:52` — `const ExcelJS = await import('exceljs')`, **dinámico**,
  dentro de `construirLibro`, con el comentario `:47-51` citando D28 y
  `docs/AUDITORIA-SEGURIDAD-2026-08-13.md`.
- `grep -rn "exceljs" src/` → **ningún import estático** en ningún archivo; las otras 4
  coincidencias son comentarios de tests.
- Confirmado en el build real: `dist/assets/exceljs.min-CTcz8-3q.js` (940,20 kB) es un chunk
  **propio**, separado del principal (`index-9Cil9TkG.js`, 730,20 kB). Cumple la
  verificación de T7.2: *"`exceljs` **no** debe aparecer en el bundle principal"*.
- `xlsx` no está en `package.json`.

### 7. D29 — la huérfana avisa en tres lugares, sin prometer aviso · ✅ **CORRECTO** (con C10 como matiz)

| # | Lugar | Archivo:línea |
|---|---|---|
| 1 | Modal de guardado sin ítem, con las **dos** salidas de §7.4 | `SimulacionesPage.tsx:267-342` — "Buscar oportunidad" (`:287`) y "Guardar sin vincular" (`:288-294`) |
| 2 | Badge en la tarjeta del listado | `TarjetaSimulacion.tsx:81-85` |
| 3 | Aviso permanente en el detalle | `SimulacionDetallePage.tsx:220-227` |

**Ninguno promete un aviso futuro.** Verificado texto por texto: los tres hablan de la fecha
de eliminación prevista, nunca de una notificación. Los tres llevan el comentario que cita
§8.3. Cubierto por dos tests negativos: `TarjetaSimulacion.test.tsx:86` y
`SimulacionesPage.test.tsx:115` — ambos afirman
`queryByText(/te avisaremos|siempre.*avis/i)` es `null`.

Matiz: ver **C10** (los avisos 2 y 3 dependen de que llegue `eliminacion_prevista_el`) y
**C7** (el aviso 1 no tiene test).

### 8. D30 — tabla de errores · ✅ **CORRECTO**

| Código | Dónde | Tratamiento verificado |
|---|---|---|
| `409 MODO_INMUTABLE` | `SimuladorCard.tsx:78-81` + modal `:179-192`; `SimulacionDetallePage.tsx:114-117` + modal `:276-289` | Ofrece **"Guardar como Nueva Simulación"** → `useBifurcarSimulacion`. Es la vía autorizada (K34). Test: `SimuladorCard.test.tsx:209` |
| `400 VALIDACION` | `FormularioParametros.tsx:144-152` | `extraerApiError(e)` → si trae `field`, `form.setFields([{name: field, errors:[…]}])` — **inline en el campo**; si no, `<Alert>` a nivel de formulario. Test: `FormularioParametros.test.tsx:130`. Los dos consumidores re-lanzan el error para que llegue acá (`SimuladorCard.tsx:84`, `SimulacionDetallePage.tsx:118`) |
| `404` genérico | `SimulacionDetallePage.tsx:46-56` | *"Esta simulación no existe / Puede haber sido eliminada o el enlace es incorrecto."* — **no** insinúa permisos. Comentario `:43-45` cita D30/K18/IDOR |
| `404` de `restaurar` | `HistorialModal.tsx:47-50` | Mensaje **único y genérico**: `'Esa versión ya no se puede restaurar'`, sin especular cuál de los cuatro motivos. Comentario `:43-46` enumera los cuatro y por qué el backend no los distingue. Test: `HistorialModal.test.tsx:58` |

Desviación menor documentada como **C8** (los `POST` desde los modales de enlace muestran el
error como toast, porque el formulario ya no está en pantalla).

### 9. K33 — no se ofrece "marcar principal" en huérfanas, en las dos superficies · ✅ **CORRECTO**

- **Tarjeta del listado:** `TarjetaSimulacion.tsx:96` — `{!esHuerfana && onMarcarPrincipal && (…)}`,
  con el comentario `:91-95` citando §7.5/K33 y `CLAUDE.md` regla 8. Refuerzo estructural:
  `SimulacionesPage.tsx:142` monta las tarjetas de la sección "Sin vincular" **sin pasar**
  `onMarcarPrincipal`, así que el botón no puede aparecer ni por error.
- **Detalle:** `SimulacionDetallePage.tsx:194-198` — `{!esHuerfana && (<Button…>)}`, comentario
  `:189-193` con la misma cita.

`esHuerfana` se deriva igual en los dos (`id_oportunidad_item === null`, `TarjetaSimulacion.tsx:34`
y `SimulacionDetallePage.tsx:83`).

Tests: `TarjetaSimulacion.test.tsx:101` (no en huérfana), `:112` (sí en enlazada),
`SimulacionesPage.test.tsx:97` (integrado en el listado). El **no-op exitoso** también está
cubierto: `TarjetaSimulacion.test.tsx:119` y `SimulacionesPage.test.tsx:141`, y el código lo
trata como éxito (`SimulacionDetallePage.tsx:136-138` con su comentario).

### 10. K35/D31 — el vendedor no ve el módulo pero sí la Calculadora · ✅ **CORRECTO, sin regresión**

`src/components/navItems.ts` **no aparece en el diff de esta rama** (confirmado contra
`git diff main...HEAD --stat`): sigue tal como lo dejó el PR de T2.2. Conserva
`:8` (import de `puedeVerModuloSimulaciones` y `puedeUsarCalculadora` desde
`utils/simulacionPermisos`), `:48` (`if (puedeVerModuloSimulaciones(empleado))`) y
`:51` (`if (puedeUsarCalculadora(empleado))`) — dos condiciones **distintas**, que es
justo el reparto de `matriz_permisos.md` §2.15.

Lo único que esta rama cambió en `router/index.tsx` es sustituir `EnConstruccionPage` por
las tres páginas reales; los tres `<RequireRol roles={ROLES_MODULO_SIMULACIONES}>` /
`{ROLES_CALCULADORA}` quedaron **intactos** (verificado línea a línea en el diff). El grep
de control nº 4 confirma que no se filtró lógica de rol de simulaciones fuera de
`utils/simulacionPermisos.ts` (D11).

### 11. `CLAUDE.md` regla 10 — `monto_total` read-only y el paso a facturado · ✅ **CORRECTO, sin regresión**

`grep "monto_total\|facturado"` sobre `git diff main...HEAD` devuelve **3 coincidencias, las
tres en fixtures de test** (`monto_total: '150000.00' | '285000.00' | '2200000.00'`), como
datos de una oportunidad simulada. Cero apariciones en código de producción.

El único archivo compartido con Oportunidades que la rama tocó es
`OportunidadDetallePage.tsx`, y su diff completo son **5 líneas**: el import de
`SimuladorCard` y su montaje con un comentario. No toca `PropiedadesCard` (donde vive el
`monto_total` y la transición de etapa) ni ningún gate de rol. Sin regresión.

### 12. `empresa: string | null` en `DatosPropuesta` · ✅ **CORRECTO**

- **Firma:** `propuesta.ts:70-75` — `empresa: string | null = null` como **4º parámetro con
  default**. Al ser opcional y último, ningún llamador de 3 argumentos rompe; `type-check`
  pasa en verde y lo confirma.
- **Llamadores:** el único de producción es `SimulacionDetallePage.tsx:314-319`, que sí pasa
  los cuatro. `propuestaDesdeCalculadora` no cambió de firma.
- **Comportamiento:** `PropuestaFinanciera.tsx:38` — `{datos.empresa !== null && <BloqueCliente/>}`,
  omite el bloque entero en vez de mostrar *"Cliente: —"* (comentario `:36-37`).
- **Tests de `propuesta.test.ts`, los dos casos pedidos:**
  - `:135` — *"deja la empresa en null por default: sin 4º argumento no se inventa"* → `expect(datos.empresa).toBeNull()`
  - `:144` — *"propaga la empresa cuando quien llama la pasa"* → `expect(datos.empresa).toBe('Transportes del Sur S.A.C.')`
  - Y en el otro adaptador: `:171` (la toma del **resultado**, no del input) y `:186` (acepta ausente).
- **Cobertura de integración:** `PropuestaFinanciera.test.tsx:162` (omite el bloque sin
  empresa) y `SimulacionDetallePage.test.tsx:159` / `:185` (con oportunidad cargada y en
  huérfana, esta última verificando además que **no** se pide ninguna oportunidad).

### 13. El selector de scroll de la hoja de impresión · ✅ **CORRECTO** (el selector sí coincide)

`impresion.css:58-63`:
```css
.propuesta-impresa .cronograma-scroll,
.propuesta-impresa [data-testid='cronograma-scroll'] { max-height: none !important; overflow: visible !important; … }
```
`CronogramaTabla.tsx:64-67` aplica `data-testid="cronograma-scroll"` en el div con
`max-h-[480px] overflow-y-auto overflow-x-auto`. **El segundo selector coincide con el DOM
real**, y `.propuesta-impresa` está en el `<article>` raíz de `PropuestaFinanciera.tsx:33`,
que es antecesor de la tabla (`:44`). Verificado además que Vite/`@vitejs/plugin-react` no
elimina `data-testid` en producción (`vite.config.ts` no lleva ningún plugin de strip), así
que la regla también aplica en el build.

Dos observaciones que **no** son hallazgos, pero conviene registrar:
- El primer selector, `.cronograma-scroll`, **no corresponde a ninguna clase del DOM** — es
  un hedge muerto. Inofensivo, pero engañoso para quien lo lea buscando la clase.
- Depender de un `data-testid` como gancho de estilo es frágil por convención (un
  `data-testid` se considera removible). Si se quiere endurecer: añadir también una clase
  real `cronograma-scroll` al div de `CronogramaTabla.tsx:65` — el CSS ya la contempla, así
  que es un cambio de una palabra.

Independientemente de esto, el cronograma impreso **sí** saldría cortado hoy, pero por otro
motivo: **C4**.

---

## 5. Estado del checklist de cierre del Plan 04/05

| Ítem | Estado |
|---|---|
| Las 5 vistas tuvieron propuesta de diseño aprobada antes de su código (§1.6) | No verificable desde el diff (los comentarios del código citan "mockup H0 aprobado" en `columnasCronograma.ts:36`, `CalculadoraPage.tsx:21` y `SimulacionesPage.tsx:21`) |
| `type-check` en verde | ✅ |
| `lint` en verde | ❌ **C1** |
| `test` en verde | ⚠ **C2** — verde solo en la 2ª corrida |
| `build` en verde | ✅ |
| Los 6 greps de control limpios | ✅ |
| Con un solo ítem, el usuario nunca ve un selector (test que lo fija) | ✅ en 2 de 3 superficies — **C7** |
| Cronograma: columnas por modo, mes 0 en blanco, `plazo_meses + 1` filas, balloon destacado | ✅ (tests `CronogramaTabla.test.tsx:87,103,121,144,155,171`) |
| La Calculadora no muestra `cuota_total` | ✅ (`CalculadoraPage.test.tsx > "NO muestra la cuota total"`; el tipo `CalculadoraResultado` ni lo tiene) |
| El `vendedor` no ve la entrada al módulo; sí ve la Calculadora | ✅ sin regresión |
| La propuesta es un solo componente para los dos orígenes | ✅ (`PropuestaFinanciera.test.tsx:112`) |
| PDF y Excel descargan on demand; nada se almacena | ✅ funcionalmente — **C4** en la calidad de la hoja impresa |
| `exceljs` fuera del bundle principal | ✅ (chunk propio en el build real) |
| Informe de auditoría escrito y revisado | ✅ este documento |
| Parada y resumen final (§10) | pendiente del arquitecto |

---

## 6. Recomendación

Los tres bloqueantes reales antes de considerar cerrado el Plan 04/05 son **C1** (dos `void`),
**C2** (el `testTimeout`) y **C4** (la hoja de impresión, que hoy hace que el entregable
principal de §5.6 salga mal). **C3** no es un bug pero sí una decisión de arquitectura tomada
dentro de un componente sin escalarla, y el plan pedía explícitamente escalarla — merece la
mirada del arquitecto antes que un parche. **C5** requiere confirmar contra el mockup H0
aprobado si la ausencia del cronograma en el simulador fue deliberada.

El resto (C6-C12) es deuda menor que puede ir en un pase de limpieza posterior.
