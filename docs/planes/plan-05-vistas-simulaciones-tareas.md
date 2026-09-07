# Plan 05 — Tareas: vistas del módulo de Simulaciones

**Mapa asociado:** `plan-04-mapa-vistas-simulaciones.md` (hallazgos `K27+`, decisiones `D22+`)
**Fecha:** 2026-09-07
**Requisito de entrada:** Plan 02/03 cerrado, con su checklist completo.

> ⚠ **Ninguna tarea marcada `[DISEÑO]` arranca sin propuesta aprobada** (§1.6, D22).
> El hito es por vista, no global: se puede empezar por el cronograma sin tener las
> cinco aprobadas.

---

## Reglas globales

Las mismas de los Planes 01 y 03, más estas cinco, específicas de las vistas:

- **Cero lógica de rol fuera de `utils/simulacionPermisos.ts`** (Plan 03, D11).
- **El motor de cálculo es del backend.** El frontend nunca calcula una cuota ni una fila
  de cronograma: las pide. Si te parece que hace falta calcular algo → **ESCALAR**.
- **`null` nunca se muestra como cero** ni como guion suelto (encargo §4.1).
- **Nunca `dangerouslySetInnerHTML`** (`CLAUDE.md` regla 9) — relevante en la propuesta,
  que renderiza datos del servidor.
- **Los prototipos dicen qué va y dónde; `DESIGN.md` + Ant Design dicen cómo se ve**
  (`CLAUDE.md`). Las propuestas de diseño de este plan se reconstruyen con Ant Design, no
  se copian literalmente.

### Formato de escalación

```
ESCALACION
Tarea: <ID>
Paso: <nº de paso>
Esperado: <lo que el plan decía que encontraría>
Encontrado: <lo que realmente hay>
Pregunta: <la decisión concreta que necesita>
```

---

## Grafo de dependencias y olas

```
OLA 0 (arquitecto + humano — NO subagente)
  └─ H0  Hito de diseño: propuestas de las 5 vistas nuevas y su aprobación   [BLOQUEA UI]

OLA 1 (1 agente — núcleo visual, lo reutilizan 4 vistas)
  └─ T1.1  <CronogramaTabla/>  (§5.4, D23)                                   [DISEÑO]

OLA 2 (2 agentes en PARALELO)
  ├─ T2.1  <FormularioParametros/> compartido  (D25)                         [DISEÑO]
  └─ T2.2  Rutas, navegación y guards  (§6, K35, D31)

OLA 3 (1 agente)
  └─ T3.1  Calculadora Financiera  (§5.3)                                    [DISEÑO]

OLA 4 (1 agente)
  └─ T4.1  Simulador dentro de la oportunidad  (§5.2, D24)                   [DISEÑO]

OLA 5 (1 agente)
  └─ T5.1  Módulo Simulaciones: listado, tarjeta, principal, huérfanas  (§5.1) [DISEÑO]

OLA 6 (1 agente)
  └─ T6.1  Historial de versiones y diff  (§5.5)                             [DISEÑO]

OLA 7 (2 agentes en SECUENCIA — el export necesita la propuesta)
  ├─ T7.1  <PropuestaFinanciera/> + PDF  (§5.6, D26, D27)                    [DISEÑO]
  └─ T7.2  Exportación del cronograma a Excel  (§5.6, D28)

OLA 8 (Opus — auditoría §1.3)
  └─ T8.1  Releer el diff completo contra los documentos citados
```

---
---

# OLA 0

## H0 — Hito de diseño de las 5 vistas nuevas

- **Ejecutor:** arquitecto + el humano que aprueba. **No es una tarea de subagente.**
- **Effort:** medio
- **Bloquea:** T1.1, T2.1, T3.1, T4.1, T5.1, T6.1, T7.1

**Por qué existe:** §1.6 del encargo:

> **Toda tarea que requiera implementar una vista que NO estaba en los prototipos
> iniciales debe pasar primero por una propuesta de diseño hecha con el MCP de Google
> Stitch, y esa propuesta me la presentás a mí para aprobación antes de escribir código
> de UI.**

El contraste contra los prototipos reales ya está hecho (mapa §1.1): las 5 son nuevas.

### Vistas a proponer

1. **Cronograma** (§5.4) — la tabla, en sus **dos** variantes de columnas
2. **Calculadora Financiera** (§5.3)
3. **Simulador dentro de la oportunidad** (§5.2) — la parte nueva, no la pantalla entera
4. **Módulo Simulaciones** (§5.1) — listado con tarjetas
5. **Historial y diff** (§5.5) — modal o panel
6. **PropuestaFinanciera** (§5.6) — incluida su hoja de impresión

### Insumos que cada propuesta debe respetar

- `docs/DESIGN.md` — normativo, se sigue con precisión
- Los prototipos existentes como referencia de lenguaje visual del CRM
- Los campos exactos de la tarjeta (§5.1): título `nombre` · destacado `cuota_final` ·
  secundarios `tea` · `valor_residual` · `cuota_inicial` · pie `updated_at`
- Las dos tablas de columnas del cronograma (§5.4), literales

### Salida
Propuesta aprobada por vista. **Cada aprobación desbloquea su tarea**, individualmente.

### Nota operativa
El MCP `stitch` quedó configurado en scope local (`~/.claude.json`), con la API key
**fuera de git** — `.mcp.json` está versionado y no debe recibirla. Requiere reiniciar la
sesión para estar disponible.

---
---

# OLA 1

## T1.1 — `<CronogramaTabla/>` `[DISEÑO]`

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** H0 (cronograma aprobado)
- **Cubre:** encargo §5.4

**Por qué Opus:** cuatro reglas explícitas y contraintuitivas conviven en un solo
componente (dos juegos de columnas, mes 0 en blanco, sin fila de balloon, TNM sin
redondear). Cada una es un error que compila y se ve razonable.

### Archivos que toca
- `src/components/simulaciones/CronogramaTabla.tsx` (crea)
- `src/components/simulaciones/CronogramaTabla.test.tsx` (crea)

### Contexto obligatorio
Releer el encargo §5.4 completo y `reglas_simulaciones.md` §3.3 y §3.4.

### Pasos

**Paso 1 — TESTS PRIMERO.** Los cuatro casos, uno por regla:

```ts
describe('CronogramaTabla', () => {
  it('en leasing NO muestra la columna de IGV', () => {
    // §5.4: "Leasing: # | Saldo Inicial | Amortización | Interés | Saldo Final |
    // Cuota | Cuota con IGV — sin columna de IGV". No es la misma tabla con celdas
    // vacías: la columna no existe.
    render(<CronogramaTabla cronograma={c} modo="leasing" />)
    expect(screen.queryByRole('columnheader', { name: /^IGV$/ })).not.toBeInTheDocument()
  })

  it('en crédito directo SÍ muestra la columna de IGV', () => {
    render(<CronogramaTabla cronograma={c} modo="credito_directo" />)
    expect(screen.getByRole('columnheader', { name: /^IGV$/ })).toBeInTheDocument()
  })

  it('renderiza el mes 0 en blanco, no como 0.00', () => {
    // §5.4: "Se renderiza en blanco, no como 0.00"
    const filaMes0 = screen.getAllByRole('row')[1]
    expect(within(filaMes0).queryByText('0.00')).not.toBeInTheDocument()
  })

  it('no agrega una fila extra para el balloon', () => {
    // §5.4: "El LEASING.xlsx original tenía una 'cuota 49'; era un artificio de la
    // hoja. Si el cronograma tiene 48 meses, se muestran 48 filas más el mes 0."
    const cronograma = { ...c, filas: filasDe(48) } // mes 0 + meses 1..48 = 49
    render(<CronogramaTabla cronograma={cronograma} modo="leasing" />)
    expect(screen.getAllByRole('row')).toHaveLength(49 + 1) // +1 del encabezado
  })

  it('destaca la última celda de saldo final: es el balloon', () => {
    // §5.4: "La última celda de saldo final va destacada: es el balloon (valor_residual)"
  })

  it('no redondea la tasa nominal mensual a 2 decimales', () => {
    // §3.1 / §5.4: viene sin redondear a propósito
  })
})
```

**Paso 2.** El componente. **Dos arrays de columnas, no uno con `hidden`** (D23):

```tsx
/**
 * Cronograma de amortización. Componente tonto: recibe los datos ya pedidos y no
 * consulta nada. Lo reutilizan el simulador, la Calculadora, el detalle del módulo
 * y la propuesta.
 *
 * ⚠ Las columnas DEPENDEN DEL MODO (§5.4). No es la misma tabla con celdas vacías:
 * leasing no desglosa IGV y su tabla no lleva esa columna. Por eso son dos arrays
 * y no uno con `hidden` condicional — con `hidden` la columna seguiría en el DOM y
 * se colaría en la exportación a Excel.
 */
const COLUMNAS_LEASING = [/* # | Saldo Inicial | Amortización | Interés | Saldo Final | Cuota | Cuota con IGV */]
const COLUMNAS_CREDITO = [/* # | Saldo Inicial | Amortización | Interés | IGV | Saldo Final | Cuota | Cuota con IGV de Intereses */]
```

**Paso 3.** El renderizado de celdas nulas. **En blanco**, no `"0.00"` ni `"—"`:

```tsx
/**
 * El mes 0 es la fila de la cuota inicial: `interes`, `igv`, `cuota` y
 * `cuota_con_igv` vienen `null` y van EN BLANCO (§5.4). En leasing, además, `igv`
 * es null en TODAS las filas — pero ahí la columna directamente no existe.
 */
const celda = (v: string | null) => (v === null ? '' : formatoMonto(v))
```

**Paso 4.** Destacar la última celda de saldo final (el balloon), con la estética de
`DESIGN.md`.

**Paso 5.** Encabezado con los agregados: `cuota_final`, `cuota_financiera`,
`valor_venta`, `igv`, `principal` y `tasa_nominal_mensual` — esta última con
`formatoTasa` (Plan 03, T2.2), no `formatoMonto`.

**Paso 6.** Scroll interno, sin paginación (K32). `overflow-x: auto` en el contenedor
para que la tabla ancha no desborde la página en mobile.

### Verificación
```bash
npm run test -- CronogramaTabla && npm run lint
```

### Restricción
**No calcular ninguna fila.** El cronograma llega calculado del backend. Si algún dato
falta, se muestra vacío; no se deduce.

---
---

# OLA 2

## T2.1 — `<FormularioParametros/>` compartido `[DISEÑO]`

- **Modelo:** Sonnet 5 · **Effort:** alto
- **Depende de:** H0 (Calculadora aprobada), Plan 03 T2.2
- **Paralelizable con:** T2.2

**Por qué existe:** D25. La Calculadora y el simulador capturan los mismos 8 parámetros.

### Archivos que toca
- `src/components/simulaciones/FormularioParametros.tsx` (crea)
- `src/components/simulaciones/FormularioParametros.test.tsx` (crea)

### Pasos

**Paso 1 — TESTS PRIMERO:**

```ts
it('prellena con los defaults del módulo', () => {
  // reglas §6.1 / encargo §7.7 — DEFAULTS_SIMULACION del Plan 03
  expect(screen.getByLabelText(/plazo/i)).toHaveValue(48)
  expect(screen.getByLabelText(/tea/i)).toHaveValue('14')
})

it('deshabilita el campo modo en edición', () => {
  // §7.1: modo es INMUTABLE tras la creación
  render(<FormularioParametros modoEditable={false} />)
  expect(screen.getByLabelText(/modo/i)).toBeDisabled()
})

it('avisa cuando la cuota inicial no es menor que el precio con descuento', async () => {
  // §7.6 — UX proactiva. La validación autoritativa sigue siendo del backend.
})

it('muestra el error del backend inline en el campo que indica error.field', async () => {
  // §9 / CLAUDE.md regla 7: siempre manejar el rechazo del backend
  servidor.use(http.post('*/calculadora', () => HttpResponse.json(
    { data: null, meta: null, error: { code: 'VALIDACION', message: '…', field: 'cuota_inicial' } },
    { status: 400 })))
  // …verificar que el mensaje sale en el campo cuota_inicial, no en un toast suelto…
})
```

**Paso 2.** Campos: `modo`, `precio_venta`, `descuento`, `cuota_inicial`, `plazo_meses`,
`tea`, `valor_residual`, `dias_trabajados`, `comision_estructuracion`.

Obligatorios (§7.7): `modo`, `precio_venta`, `cuota_inicial`, `plazo_meses`, `tea`. El
resto se prellena con `DEFAULTS_SIMULACION`.

**Paso 3.** Props para las diferencias de D25:

```tsx
interface Props {
  /** `false` en edición: `modo` es inmutable tras la creación (§7.1). */
  modoEditable: boolean
  valoresIniciales?: Partial<CrearSimulacionInput>
  onSubmit: (valores: CrearSimulacionInput) => void
  etiquetaAccion: string  // "Calcular" | "Guardar"
  cargando?: boolean
}
```

**Paso 4.** Validaciones proactivas con `validarCuotaInicial` y `validarValorResidual`
(Plan 03, T2.2). Comentario obligatorio:

```tsx
// UX proactiva para evitar el round-trip. La validación AUTORITATIVA es la del
// backend y hay que manejar su 400 igual (CLAUDE.md regla 7, encargo §7.6).
```

**Paso 5.** `tea` con `formatoTea`: escala 1-100, **no** la fraccionaria de
`financiadoras` (§7.6, Plan 03 D14).

**Paso 6.** El manejo del `400 VALIDACION` con `error.field` inline (§9). Usar
`extraerApiError` de `src/api/client.ts`.

### Verificación
```bash
npm run test -- FormularioParametros && npm run lint
```

---

## T2.2 — Rutas, navegación y guards

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** Plan 03 T1.2
- **Paralelizable con:** T2.1
- **No requiere diseño:** es cableado, no UI nueva

### Archivos que toca
- `src/router/rutas.ts` (modifica)
- `src/router/index.tsx` (modifica)
- `src/components/navItems.ts` (modifica)
- `src/components/navItems.test.ts` (crea)

### Pasos

**Paso 1 — TESTS PRIMERO.** La consecuencia de UI de §6 (K35):

```ts
it('no muestra la entrada de Simulaciones al vendedor', () => {
  // Encargo §6: "El vendedor NO ve la entrada al módulo Simulaciones en la
  // navegación. Llega por el simulador de su oportunidad y por la Calculadora."
  const items = renderHook(() => useNavItems(), { wrapper: conRol('vendedor') })
  expect(items.result.current.map((i) => i.to)).not.toContain('/simulaciones')
})

it('sí muestra la Calculadora al vendedor', () => {
  expect(items.result.current.map((i) => i.to)).toContain('/calculadora')
})

it('no muestra ninguna de las dos a jdv ni a otro', () => { /* … */ })

it('muestra ambas a analista', () => {
  // El caso invertido: analista es el rol DUEÑO del módulo (§2.15)
})
```

**Paso 2.** Añadir las rutas en `rutas.ts` siguiendo el patrón existente:
`/simulaciones`, `/simulaciones/:id`, `/calculadora`.

**Paso 3.** En `router/index.tsx`, con carga diferida (patrón documentado en el propio
archivo) y `RequireRol`.

**Paso 4.** En `navItems.ts`, las dos entradas con **condiciones distintas** (D31):

```ts
  // El vendedor NO entra al módulo pero SÍ a la Calculadora: es el único módulo
  // del CRM con este reparto (matriz_permisos §2.15). La decisión vive en
  // `simulacionPermisos`, no acá — ver Plan 02 D11.
  if (puedeVerModuloSimulaciones(empleado)) {
    items.push({ to: '/simulaciones', icono: 'calculate', label: 'Simulaciones' })
  }
  if (puedeUsarCalculadora(empleado)) {
    items.push({ to: '/calculadora', icono: 'percent', label: 'Calculadora' })
  }
```

**Paso 5.** Cerrar el TODO de D20 (Plan 03): en `NotificacionesDropdown.tsx`, la entidad
`simulacion` pasa a navegar a `/simulaciones/:id`. Verificar que solo se ofrece a quien
puede entrar.

### Verificación
```bash
npm run test -- navItems && npm run test -- NotificacionesDropdown && npm run type-check
```

---
---

# OLA 3

## T3.1 — Calculadora Financiera `[DISEÑO]`

- **Modelo:** Sonnet 5 · **Effort:** alto
- **Depende de:** T1.1, T2.1, T2.2
- **Cubre:** encargo §5.3

### Archivos que toca
- `src/pages/Calculadora/CalculadoraPage.tsx` (crea)
- `src/pages/Calculadora/CalculadoraPage.test.tsx` (crea)

### Pasos

**Paso 1 — TESTS PRIMERO.** El caso que más fácil se rompe:

```ts
it('NO muestra la cuota total', () => {
  // §5.3 / §6.2: "Sin ítem no hay cuota_financiadora que sumar. Solo cuota Quantum."
  // La respuesta de POST /calculadora directamente no la trae.
  expect(screen.queryByText(/cuota mensual total/i)).not.toBeInTheDocument()
})

it('calcula sin persistir nada', async () => {
  // reglas §9: cero persistencia. No debe llamarse POST /simulaciones al calcular.
})

it('ofrece "Enlazar a Oportunidad" con el resultado en pantalla', async () => { /* … */ })
```

**Paso 2.** La página: `<FormularioParametros etiquetaAccion="Calcular" modoEditable />`
→ `useCalculadora()` (mutación, Plan 03) → `<CronogramaTabla />`.

**Paso 3.** Selectores **opcionales** de empresa y modelo. Comentario obligatorio:

```tsx
// §5.3: son puramente de presentación. NO participan del cálculo — el backend los
// devuelve resueltos solo para mostrarlos en la propuesta.
```

**Paso 4.** **No renderizar `cuota_total`.** El tipo `CalculadoraResultado` (Plan 03) ni
siquiera lo tiene, así que `tsc` ayuda. Dejar el comentario igual, para que nadie lo
"arregle" añadiéndolo.

**Paso 5.** El botón **"Enlazar a Oportunidad"**. Es `POST /simulaciones` con los mismos
parámetros más el `id_oportunidad_item` (§24, no es un endpoint propio):

```tsx
// §24: "Enlazar a Oportunidad" NO es un endpoint de la Calculadora. Es literalmente
// POST /simulaciones con los mismos parámetros más el id_oportunidad_item elegido.
// Recién ahí nace la fila y su evento `creada`.
```

El selector de oportunidad → ítem aplica **D24**: si la oportunidad elegida tiene un solo
ítem, se enlaza directo **sin mostrar selector de ítem**.

**Paso 6.** Botón a la propuesta, deshabilitado hasta que T7.1 exista. Dejarlo cableado
con un TODO que cite T7.1.

### Verificación
```bash
npm run test -- CalculadoraPage && npm run lint && npm run build
```

---
---

# OLA 4

## T4.1 — Simulador dentro de la oportunidad `[DISEÑO]`

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T1.1, T2.1
- **Cubre:** encargo §5.2 (la parte que el Plan 03 no entregó — ver K27, D21)

**Por qué Opus:** contiene la regla que el encargo marca como *"explícita y no se
negocia"* (§5.2) y el permiso por recurso del `vendedor`.

### Archivos que toca
- `src/pages/OportunidadDetalle/SimuladorCard.tsx` (crea)
- `src/pages/OportunidadDetalle/SimuladorCard.test.tsx` (crea)
- `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx` (modifica — solo montar)

### Pasos

**Paso 1 — TESTS PRIMERO.** El primero es el que fija la regla no negociable (D24):

```ts
it('NO muestra selector de ítem cuando la oportunidad tiene un solo ítem', () => {
  // Encargo §5.2 / reglas §1.1: "Con un solo ítem se enlaza directo y el usuario
  // NUNCA ve un selector. Esto es explícito y no se negocia."
  render(<SimuladorCard oportunidad={conUnItem} />)
  expect(screen.queryByLabelText(/ítem|modelo a simular/i)).not.toBeInTheDocument()
})

it('muestra selector cuando hay más de un ítem', () => {
  render(<SimuladorCard oportunidad={conTresItems} />)
  expect(screen.getByLabelText(/ítem|modelo a simular/i)).toBeInTheDocument()
})

it('no se muestra al vendedor que no es el asignado', () => {
  // §2.15: para vendedor el permiso es POR RECURSO
})

it('deshabilita el campo modo al editar una simulación existente', () => {
  // §7.1: inmutable
})

it('ofrece "Guardar como Nueva Simulación" ante un 409 MODO_INMUTABLE', async () => {
  // §9 / K34: no debería ocurrir con el campo deshabilitado, pero es la red de
  // seguridad, y la salida ofrecida debe ser la vía autorizada (bifurcar).
})
```

**Paso 2.** El gate de permiso, con la función del Plan 03 (D11):

```tsx
if (!puedeSimularEnOportunidad(empleado, oportunidad)) return null
```

**Paso 3.** La selección de ítem, con la condición literal de D24:

```tsx
// Encargo §5.2 / reglas §1.1: con un solo ítem se enlaza directo y el usuario nunca
// ve un selector. No es una optimización de UI: es una regla explícita del encargo.
const itemSeleccionado = oportunidad.items.length === 1
  ? oportunidad.items[0]
  : itemElegidoPorElUsuario
```

**Paso 4.** `precio_venta` y `descuento` se prellenan **del ítem**; el resto de
`DEFAULTS_SIMULACION` (§6.1).

**Paso 5.** Guardar → `useCrearSimulacion` / `useActualizarSimulacion` (Plan 03), que ya
invalidan la oportunidad (D18). Verificar en el test que tras guardar, la cuota mostrada
en `PropiedadesCard` se actualiza — es el caso de `TESTING-frontend.md` §4.4.

**Paso 6.** El `409 MODO_INMUTABLE` (K34, D30): modal que ofrece **"Guardar como Nueva
Simulación"** → `useBifurcarSimulacion`.

**Paso 7.** Montar en `OportunidadDetallePage`. **Un solo cambio** ahí: montar la card.

### Restricción
`cuota_final` **nunca** se envía en un body (§7.2) ni se calcula en el cliente. La cuota
buena es la que devuelve la respuesta.

### Verificación
```bash
npm run test -- SimuladorCard && npm run lint && npm run build
```

---
---

# OLA 5

## T5.1 — Módulo Simulaciones: listado, tarjeta, principal, huérfanas `[DISEÑO]`

- **Modelo:** Sonnet 5 · **Effort:** alto
- **Depende de:** T1.1, T2.2
- **Cubre:** encargo §5.1 y §7.4, §7.5

### Archivos que toca
- `src/pages/Simulaciones/SimulacionesPage.tsx` (crea)
- `src/pages/Simulaciones/SimulacionDetallePage.tsx` (crea)
- `src/pages/Simulaciones/TarjetaSimulacion.tsx` (crea)
- `src/pages/Simulaciones/TarjetaSimulacion.test.tsx` (crea)
- `src/pages/Simulaciones/SimulacionesPage.test.tsx` (crea)

### Pasos

**Paso 1 — TESTS PRIMERO:**

```ts
it('muestra la fecha de eliminación prevista en una simulación huérfana', () => {
  // §7.4: "La regla debe ser visible en la UI, no solo lógica de servidor."
  expect(screen.getByText(/se eliminará el/i)).toBeInTheDocument()
})

it('no promete que se va a avisar antes de eliminar', () => {
  // §8.3: el aviso es best-effort (job diario). "La UI no debe prometer al usuario
  // que 'siempre te vamos a avisar' — la garantía real es eliminacion_prevista_el."
  expect(screen.queryByText(/te avisaremos|siempre.*avis/i)).not.toBeInTheDocument()
})

it('no ofrece marcar como principal en una huérfana', () => {
  // §7.5: "Sin ítem, es_principal es siempre false — no ofrezcas el botón en una
  // huérfana; responde 400 VALIDACION."
  expect(screen.queryByRole('button', { name: /principal/i })).not.toBeInTheDocument()
})

it('muestra el nombre autogenerado como tal cuando nombre_es_manual es false', () => {
  // §7.3: el campo nombre_es_manual decide si mostrarlo como placeholder editable
  // o como valor.
})
```

**Paso 2.** La tarjeta, con los campos **exactos** de §5.1 / `reglas §8.2`:

| Posición | Campo |
|---|---|
| Título | `nombre` (real o autogenerado) |
| Destacado | `cuota_final` |
| Secundarios | `tea` · `valor_residual` · `cuota_inicial` |
| Pie | `updated_at` |

Más el badge de `es_principal` y el aviso de huérfana.

**Paso 3.** Agrupación **por oportunidad**, usando `id_oportunidad` (que el backend ya
deriva). Por empresa **solo si** el backend atendió el pedido de §8.1 (K30):

```tsx
// §8.1: agrupar por empresa requiere `id_empresa` en el DTO, que hoy no viene. NO
// se parsea el nombre autogenerado — el encargo lo prohíbe expresamente y además
// se rompe con nombre manual. Pedido abierto en docs/solicitud-backend-simulaciones.md.
```

Si al llegar acá el campo existe, implementar el agrupado por empresa y borrar el
comentario. Si no existe, dejar solo el agrupado por oportunidad. **Verificar contra el
contrato antes de decidir.**

**Paso 4.** Filtros del listado: `id_oportunidad_item`, `id_modelo`, `modo` (§23).
Client state → `useState`, nunca Zustand con datos del servidor (`CLAUDE.md` regla 3).

**Paso 5.** El detalle: parámetros + `<CronogramaTabla />` + acciones (editar, bifurcar,
marcar principal, eliminar, historial).

**Paso 6.** Marcar principal (§7.5): **no ofrecer** el botón en huérfanas (K33). Y
tratarlo como **no-op exitoso** si ya lo es — no mostrar error.

**Paso 7.** El aviso de guardado sin ítem (§7.4, D29): modal con las **dos** salidas que
el encargo exige — buscar una oportunidad para enlazar, o confirmar sin enlace.

**Paso 8.** El `404` se muestra como **"no existe"**, nunca como "no tenés permiso"
(D30, K18).

### Verificación
```bash
npm run test -- Simulaciones && npm run lint && npm run build
```

---
---

# OLA 6

## T6.1 — Historial de versiones y diff `[DISEÑO]`

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T5.1
- **Cubre:** encargo §5.5

### Archivos que toca
- `src/pages/Simulaciones/HistorialModal.tsx` (crea)
- `src/pages/Simulaciones/HistorialModal.test.tsx` (crea)

### Pasos

**Paso 1 — TESTS PRIMERO.** Los tres casos son degradaciones que parecen bugs:

```ts
it('muestra "sin cambios de parámetros" cuando el diff está vacío', () => {
  // §5.5: "Un diff vacío es legítimo y frecuente, no un bug: pasa en el primer
  // evento, y en cualquier escritura que no tocó parámetros de cálculo. Mostralo
  // como 'sin cambios de parámetros', no como error ni como fila rota."
  expect(screen.getByText(/sin cambios de parámetros/i)).toBeInTheDocument()
})

it('muestra "Sistema" cuando created_by es null', () => {
  // §5.5: "created_by puede venir null cuando el evento lo generó un job
  // automático. Mostrar 'Sistema', no 'undefined'."
  expect(screen.getByText('Sistema')).toBeInTheDocument()
  expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
})

it('da un mensaje genérico cuando restaurar responde 404', async () => {
  // §9: el 404 cubre CUATRO motivos y el backend no distingue cuál a propósito.
  // "El mensaje al usuario debe ser genérico: 'esa versión ya no se puede restaurar'."
  expect(await screen.findByText(/esa versión ya no se puede restaurar/i)).toBeInTheDocument()
})
```

**Paso 2.** Lista de eventos, **más recientes primero** (el backend ya los ordena).
Máximo 15, últimos 7 días — **no** paginar ni prometer más: es una ventana, no la
bitácora completa (§23).

**Paso 3.** Cada evento con su `tipo_evento`, `created_at`, autor y su `diff` como lista
de `{campo, valor_anterior, valor_nuevo}`.

**Paso 4.** Restaurar → `useRestaurarSimulacion(id, id_evento_log)` (Plan 03). Tras
restaurar, la invalidación de D18 refresca cronograma y oportunidad.

**Paso 5.** Nota informativa de la ventana: que el usuario entienda por qué no ve
versiones más viejas. Sin prometer que existen en otro lado.

### Verificación
```bash
npm run test -- HistorialModal && npm run lint
```

---
---

# OLA 7

## T7.1 — `<PropuestaFinanciera/>` + PDF `[DISEÑO]`

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T1.1, T3.1, T5.1
- **Cubre:** encargo §5.6

**Por qué Opus:** es lo único sin ningún soporte de backend, une dos fuentes de datos
incompatibles (K28) y resuelve la pregunta que el encargo delega al diseño (K29).

### Archivos que toca
- `src/components/simulaciones/PropuestaFinanciera.tsx` (crea)
- `src/components/simulaciones/PropuestaFinanciera.test.tsx` (crea)
- `src/utils/propuesta.ts` (crea — los dos adaptadores de D26)
- `src/utils/propuesta.test.ts` (crea)
- `src/styles/impresion.css` (crea)

### Pasos

**Paso 1 — TESTS PRIMERO:**

```ts
it('es el mismo componente para una simulación y para la Calculadora', () => {
  // §5.6: "Es la MISMA <PropuestaFinanciera/> para el módulo Simulaciones y para
  // la Calculadora. Un solo componente."
  render(<PropuestaFinanciera datos={propuestaDesdeSimulacion(s, c, 8)} />)
  render(<PropuestaFinanciera datos={propuestaDesdeCalculadora(r, input)} />)
})

it('omite la cantidad y el total cuando no hay ítem', () => {
  // D26 (resolución de §8.2): sin cantidad no se inventa 1 — se muestran solo las
  // cifras por unidad, con la leyenda "Cotización por unidad".
  render(<PropuestaFinanciera datos={{ ...datos, cantidad: null }} />)
  expect(screen.getByText(/cotización por unidad/i)).toBeInTheDocument()
  expect(screen.queryByText(/total.*unidades/i)).not.toBeInTheDocument()
})

it('muestra la cantidad de unidades y el modelo cuando los hay', () => {
  // §5.6 / reglas §11: la propuesta muestra la cantidad de unidades del ítem y el
  // modelo, que no participan del cálculo.
})
```

**Paso 2.** `src/utils/propuesta.ts` con `DatosPropuesta` y los dos adaptadores (D26):

```ts
/**
 * Modelo de vista de la propuesta. NO es una `Simulacion`: la Calculadora produce
 * un resultado efímero que no tiene `id`, `nombre` ni `es_principal` — no existe
 * fila que los tenga (§24). Un solo componente con dos adaptadores es la única
 * forma honesta de cumplir "la misma PropuestaFinanciera para ambos" (§5.6) sin
 * que el resultado efímero finja ser una fila persistida.
 */
export interface DatosPropuesta {
  titulo: string
  empresa: string | null
  modelo: string | null
  /**
   * `null` en una huérfana y en la Calculadora: no hay ítem del cual sacarla (§8.2).
   * En ese caso la propuesta omite el total por N unidades y dice "por unidad".
   * Inventar `1` mostraría un total falso en cuanto se enlace a un ítem de 8.
   */
  cantidad: number | null
  parametros: { /* … */ }
  cronograma: Cronograma
  modo: ModoSimulacion
}
```

**Paso 3.** El componente. Recibe `DatosPropuesta` y **no pide nada** por su cuenta.

**Paso 4.** **Nunca `dangerouslySetInnerHTML`** (`CLAUDE.md` regla 9): la propuesta
renderiza razón social y nombres que vienen del servidor.

**Paso 5.** La hoja de impresión (D27), en `src/styles/impresion.css`:

```css
/**
 * PDF por impresión nativa (D27): 0 KB de dependencias, texto vectorial y
 * seleccionable. El requisito es "se genera y descarga on demand, no se almacena"
 * (§5.6) — el diálogo del navegador lo cumple con "Guardar como PDF".
 */
@media print {
  /* ocultar sidebar, topbar, botones; márgenes; evitar cortar filas del cronograma */
  .no-imprimir { display: none !important; }
  tr { break-inside: avoid; }
}
```

**Paso 6.** El botón "Descargar PDF" llama a `window.print()` sobre la propuesta.

**Paso 7.** Verificar que la propuesta se ve bien impresa **de verdad**: el cronograma de
49 filas cruza páginas. Probar con Playwright si hace falta.

### Restricción
**No almacenar el PDF** ni registrarlo en Drive (§5.6). No hay endpoint y no debe haberlo.

### Verificación
```bash
npm run test -- Propuesta && npm run lint && npm run build
```

---

## T7.2 — Exportación del cronograma a Excel

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T7.1
- **Cubre:** encargo §5.6

### Archivos que toca
- `package.json` (modifica — añade `exceljs`)
- `src/utils/exportarCronograma.ts` (crea)
- `src/utils/exportarCronograma.test.ts` (crea)

### Pasos

**Paso 1.** Instalar `exceljs` (D28). **No `xlsx`** — el motivo está en el mapa D28.

```bash
npm install exceljs
```

Si falla por peer dependencies → **ESCALAR**. No usar `--force` ni `--legacy-peer-deps`.

**Paso 2 — TEST PRIMERO:**

```ts
it('exporta las columnas del modo leasing, sin la de IGV', async () => {
  // Misma regla que la tabla (§5.4): no es la misma hoja con una columna vacía.
  const wb = await construirLibro(cronograma, 'leasing')
  const encabezados = wb.getWorksheet(1).getRow(1).values
  expect(encabezados).not.toContain('IGV')
})

it('exporta la columna de IGV en crédito directo', async () => { /* … */ })

it('no agrega una fila extra para el balloon', async () => {
  // Mismo artificio del Excel original que en la tabla
})
```

**Paso 3.** Carga dinámica (D28), para no meter la librería en el bundle principal:

```ts
/**
 * `exceljs` se carga bajo demanda: solo lo descarga quien exporta. Elegida sobre
 * `xlsx` por su historial de vulnerabilidades en el registro público — ver Plan 04 D28
 * y docs/AUDITORIA-SEGURIDAD-2026-08-13.md.
 */
const ExcelJS = await import('exceljs')
```

**Paso 4.** Las columnas se derivan del **mismo** origen que la tabla (T1.1). Extraer los
dos arrays a un módulo compartido para que no puedan divergir: si alguien añade una
columna a la tabla y no a la exportación, el Excel deja de reflejar lo que el usuario vio.

**Paso 5.** Formato de celda: moneda con 2 decimales; encabezados en negrita; ancho de
columna razonable. *"Con el formato de las hojas actuales"* (§5.6).

**Paso 6.** El mes 0 exporta celdas **vacías**, no ceros — igual que la tabla.

**Paso 7.** Descarga por `Blob` + enlace temporal. **No se almacena** en ningún lado.

### Verificación
```bash
npm run test -- exportarCronograma && npm run build
```

Verificar además el tamaño del bundle principal: `exceljs` **no** debe aparecer en él.

---
---

# OLA 8

## T8.1 — Auditoría del diff contra los documentos citados

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T7.2
- **Exigida por:** §1.3 del encargo

### Archivos que toca
Ninguno. Produce `docs/planes/plan-05-vistas-auditoria.md`.

### Pasos

**Paso 1.** `git diff main...HEAD` completo.

**Paso 2.** Releerlo contra cada documento citado en `plan-04-mapa-vistas-simulaciones.md`
§1.2, y contra los de los mapas 00 y 02 — la auditoría final cubre **toda** la rama.

**Paso 3.** Los greps de control:

```bash
# CLAUDE.md regla 9 — la propuesta renderiza datos del servidor
grep -rn "dangerouslySetInnerHTML" src

# El motor de cálculo NO se implementa en el cliente
grep -rniE "Math\.pow.*1/12|\*\* ?\(1 ?/ ?12\)|calcularPMT|cuotaFinanciera ?=" src

# cuota_final nunca se envía en un body (§7.2)
grep -rn "cuota_final" src --include=*.tsx | grep -iE "body|input|payload|post|patch"

# D11 — cero lógica de rol de simulaciones fuera del módulo de permisos
grep -rn "ROLES_APOYO\|ROLES_SUPERVISION" src | grep -i simulac

# CLAUDE.md regla 5
grep -rn "axios\.\|fetch(" src --include=*.tsx

# CLAUDE.md regla 2
grep -rn ": any\|as any" src --include=*.ts --include=*.tsx
```

Los seis deben salir vacíos.

**Paso 4.** Verificación de las reglas "no negociables" del encargo:

```bash
# §5.2 — el selector con un solo ítem
grep -rn "items.length === 1" src/pages/OportunidadDetalle/
# debe existir, con su comentario citando §5.2
```

**Paso 5.** Verificación completa, incluido el bundle:
```bash
npm run type-check && npm run lint && npm run test && npm run build
```

**Paso 6.** Informe con hallazgos numerados (`C1`, `C2`…): archivo:línea, documento y
sección contradicha, corrección propuesta. **No corregirlos** — la decisión es del
arquitecto.

---
---

## Checklist de cierre del Plan 04/05

- [ ] Las 5 vistas tuvieron propuesta de diseño aprobada antes de su código (§1.6)
- [ ] `type-check`, `lint`, `test`, `build` en verde
- [ ] Los 6 greps de control limpios
- [ ] Con un solo ítem, el usuario nunca ve un selector (test que lo fija)
- [ ] El cronograma: columnas por modo, mes 0 en blanco, `plazo_meses + 1` filas, balloon destacado
- [ ] La Calculadora no muestra `cuota_total`
- [ ] El `vendedor` no ve la entrada al módulo; sí ve la Calculadora
- [ ] La propuesta es un solo componente para los dos orígenes
- [ ] PDF y Excel descargan on demand; nada se almacena
- [ ] `exceljs` fuera del bundle principal
- [ ] Informe de auditoría escrito y revisado
- [ ] **Parada y resumen final** (§10 del encargo)
