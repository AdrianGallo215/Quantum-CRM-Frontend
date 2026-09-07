# Plan 04 — Mapa: vistas del módulo de Simulaciones

**Fecha:** 2026-09-07
**Autor del plan:** Opus 5 (§1.1 del encargo)
**Depende de:** Plan 02/03 (cimientos) **completo y verificado**
**Cubre del encargo:** §5.1 · §5.2 (parte del simulador) · §5.3 · §5.4 · §5.5 · §5.6

> ⚠ **Todas las vistas de este plan pasan por el hito de diseño (§1.6).** Ninguna tarea
> de UI arranca sin propuesta aprobada. Ver §3, D22.

---

## 1. Fase de investigación (§1.3)

### 1.1 Contraste contra los prototipos reales — lo que el encargo pidió verificar

El encargo §1.6 dice: *"En §5 marco cuáles creo que son nuevas y cuáles modificaciones,
pero **contrastalo contra los prototipos reales**, que yo no los tengo a la vista desde el
backend."*

Contenido real de `docs/stitch-prototypes/`:

```
detalle_de_contacto_sin_sidebar
detalle_de_oportunidad_simplificado
empresa_gesti_n_de_actividades_refinada
gesti_n_de_actividades
pipeline_kanban_etapas_personalizadas
prospecci_n_vista_tabla
```

**Veredicto del contraste — la lectura del encargo era correcta:**

| Encargo | Su clasificación | Verificado | Veredicto |
|---|---|---|---|
| §5.1 Módulo Simulaciones | vista nueva | sin prototipo | ✅ **nueva** → diseño |
| §5.2 Simulador en la oportunidad | modificación | existe `detalle_de_oportunidad_simplificado` | ⚠ **mixto** — ver K27 |
| §5.3 Calculadora | vista nueva | sin prototipo | ✅ **nueva** → diseño |
| §5.4 Cronograma | componente nuevo | sin prototipo | ✅ **nuevo** → diseño |
| §5.5 Historial y diff | vista nueva | sin prototipo | ✅ **nueva** → diseño |
| §5.6 PropuestaFinanciera | vista nueva | sin prototipo | ✅ **nueva** → diseño |
| §5.7 Tipo de cambio | modificación | `AppLayout` existe | ✅ modificación (ya hecha, Plan 03) |

### 1.2 Citas textuales que gobiernan este plan

**Encargo §5.2 — la regla que no se negocia:**

> **Selector de ítem: solo si la oportunidad tiene más de un ítem.** Con un solo ítem se
> enlaza directo y **el usuario nunca ve un selector** (`reglas_simulaciones.md` §1.1).
> Esto es explícito y no se negocia.

**Encargo §5.4 — las columnas dependen del modo:**

> **Las columnas dependen del modo.** No es la misma tabla con celdas vacías:
> - **Leasing:** `# | Saldo Inicial | Amortización | Interés | Saldo Final | Cuota | Cuota
>   con IGV` — **sin columna de IGV**.
> - **Crédito Directo:** `# | Saldo Inicial | Amortización | Interés | IGV | Saldo Final |
>   Cuota | Cuota con IGV de Intereses`.

Y:

> **No agregues una fila extra para el balloon.** El `LEASING.xlsx` original tenía una
> "cuota 49"; era un artificio de la hoja. Si el cronograma tiene 48 meses, se muestran 48
> filas más el mes 0.

**Encargo §5.6 — lo que el backend no hace:**

> **Esto es 100% frontend. El backend no lo hace ni lo va a hacer**
> (`reglas_simulaciones.md` §11). [...] **PDF:** se genera y descarga **on demand** desde
> esa misma propuesta. **No se almacena** en ningún lado ni se registra como archivo en
> Drive. [...] Es la **misma** `<PropuestaFinanciera/>` para el módulo Simulaciones y para
> la Calculadora. Un solo componente.

**Encargo §7.4 — la huérfana:**

> Al guardar una simulación **sin** ítem, el frontend debe **advertir** y ofrecer dos
> salidas: buscar una oportunidad para enlazar, o confirmar el guardado sin enlace.

**Encargo §8.3 — lo que la UI no debe prometer:**

> La UI no debe prometer al usuario que "siempre te vamos a avisar" — la garantía real es
> `eliminacion_prevista_el`, que está siempre visible.

**`CLAUDE.md` — el tratamiento de los prototipos:**

> El prototipo dice *qué va y dónde*; `DESIGN.md` + Ant Design dicen *cómo se ve y con qué*.

**`CLAUDE.md` regla 9:**

> **Nunca `dangerouslySetInnerHTML`** con datos del usuario o servidor.

---

## 2. Hallazgos (K)

### K27 — El §5.2 es mixto, y su parte nueva depende del cronograma

El encargo clasifica el simulador dentro de la oportunidad como "modificación", y la
pantalla contenedora efectivamente existe (`detalle_de_oportunidad_simplificado`).

Pero su contenido —*"formulario de parámetros + cronograma + guardar"*— incluye el
**cronograma**, que el propio encargo §5.4 manda a diseño como componente nuevo.

Resolución (ya aplicada en el Plan 02, D21): la parte de §5.2 que es puramente
"mostrar los 5 campos de cuota" se entregó en el Plan 03 sin diseño previo. El
**simulador** propiamente dicho vive acá y hereda el hito de diseño del cronograma.

### K28 — La `<PropuestaFinanciera/>` tiene dos fuentes de datos distintas

El encargo §5.6 exige **un solo componente** para el módulo y para la Calculadora. Pero:

| Origen | Qué tiene | Qué le falta |
|---|---|---|
| Simulación persistida | `Simulacion` + `Cronograma` (2 requests) | `cantidad` (§8.2) |
| Calculadora | `CalculadoraResultado` (empresa + modelo + cronograma, 1 request) | `id`, `nombre`, `es_principal`, `cantidad` |

Un solo componente que reciba "una simulación" no sirve: el resultado de la Calculadora
**no es** una `Simulacion` y no puede fingirlo (§24: *"No hay `id`, `created_at`,
`es_principal` ni `nombre` en la respuesta: no existe fila que los tenga"*).

### K29 — `cantidad` no está en el DTO de simulación, y la huérfana no tiene ninguna

Encargo §8.2, declarado como punto abierto:

> La simulación es de una unidad y su DTO **no trae `cantidad`** — hay que sacarla del
> ítem vía la oportunidad (`GET /oportunidades/:id` → `items[]`). [...] Para una
> simulación **huérfana** (sin ítem) no hay cantidad que mostrar. **Definí en el diseño
> qué hace la propuesta en ese caso.**

Es una decisión que el encargo delega explícitamente al diseño. Ver D26.

### K30 — Agrupar por empresa depende del pedido al backend

Encargo §8.1. El pedido quedó redactado en el Plan 01 (T6.1). Si el backend lo atiende
antes de esta fase, se agrupa por empresa; si no, solo por oportunidad. **No se parsea el
nombre** — el encargo lo prohíbe y además se rompe con nombre manual.

### K31 — Ninguna librería de PDF ni de Excel está instalada

`package.json` no tiene ninguna. §5.6 necesita las dos. Es una decisión de dependencia
nueva, con implicaciones de tamaño de bundle y de seguridad. Ver D27 y D28.

Contexto relevante: el repo tiene `docs/AUDITORIA-SEGURIDAD-2026-08-13.md` y una
migración reciente de Vite por vulnerabilidades — este equipo sí mira las dependencias.

### K32 — El cronograma puede tener 49 filas y no debe paginar

48 meses + mes 0. Es una tabla larga pero acotada. Paginarla rompería la lectura de un
cronograma de amortización, que se lee de corrido. `DESIGN.md` y el comportamiento
responsive mandan: scroll interno, no paginación.

### K33 — `es_principal` no se puede ofrecer en una huérfana

Encargo §7.5: *"**Sin ítem, `es_principal` es siempre `false`** — no ofrezcas el botón en
una huérfana; responde `400 VALIDACION`."*

Y: *"Marcar como principal una que ya lo es es un **no-op exitoso**, no un error."*

### K34 — El `409 MODO_INMUTABLE` no debería ocurrir, pero hay que tratarlo

Encargo §7.1 y §9. El campo va deshabilitado en edición, así que el 409 es la red de
seguridad. Si ocurre, la UI ofrece **"Guardar como Nueva Simulación"** — que es
exactamente la vía autorizada.

### K35 — El vendedor no ve la entrada al módulo en la navegación

Encargo §6: *"El `vendedor` **no ve la entrada al módulo Simulaciones** en la navegación.
Llega a sus simulaciones por el simulador de su propia oportunidad y por la Calculadora."*

`src/components/navItems.ts` es la fuente única de navegación (sidebar, drawer y
BottomNavBar). Ahí se filtra, con `puedeVerModuloSimulaciones` del Plan 03.

---

## 3. Decisiones (D)

### D22 — Hito de diseño explícito, y qué se puede hacer mientras tanto

Las 5 vistas nuevas requieren propuesta aprobada antes de escribir UI (§1.6). El MCP
`stitch` quedó configurado en scope local (la API key **no** entra a git).

**Lo que avanza sin esperar el diseño:** nada de este plan. Toda la capa de datos ya se
entregó en el Plan 03 — que es precisamente por qué se separaron.

**El hito no es negociable pero sí granular:** cada vista se desbloquea con su propia
aprobación. No hace falta aprobar las cinco para empezar por el cronograma.

### D23 — El cronograma es un componente tonto y se construye primero

Recibe `Cronograma` + `modo` y no pide datos por su cuenta. Así lo consumen las cuatro
vistas que lo necesitan sin acoplarse entre sí.

Se construye **primero** (Fase 2 del encargo §10): *"Es el núcleo visual que reutilizan
las otras tres vistas. Hacerlo primero evita rehacerlo tres veces."*

Dos conjuntos de columnas según `modo` (§5.4), **no** una tabla con celdas vacías. La
implementación define dos arrays de columnas y elige por `modo` — no un array con
`hidden` condicional, que dejaría la columna en el DOM y en el export a Excel.

El mes 0 renderiza **celdas en blanco**, no `"0.00"` (§5.4). La última celda de saldo
final va **destacada**: es el balloon.

### D24 — El selector de ítem se decide por `items.length`, y hay un test que lo fija

Por §5.2, que el encargo marca como no negociable. La condición es literal:

```ts
// Encargo §5.2 / reglas §1.1: con un solo ítem el usuario NUNCA ve un selector.
if (oportunidad.items.length === 1) { /* enlazar directo, sin preguntar */ }
```

Se escribe un test que falla si aparece un selector con un solo ítem. Es el tipo de regla
que se pierde en una refactorización si no está clavada por un test.

### D25 — La Calculadora y el simulador comparten el formulario de parámetros

Los dos capturan los mismos 8 parámetros con los mismos defaults (`DEFAULTS_SIMULACION`,
Plan 03) y las mismas validaciones proactivas. Un componente
`<FormularioParametros />` con props para las diferencias:

| | Calculadora | Simulador |
|---|---|---|
| `modo` editable | sí | **solo al crear** (inmutable después, §7.1) |
| Contexto opcional | `id_empresa` / `id_modelo` | viene del ítem |
| Acción | "Calcular" | "Guardar" |
| Muestra `cuota_total` | **no** (§6.2 — sin ítem no hay `cuota_financiadora`) | sí |

Validación con Zod = UX, no seguridad (`CLAUDE.md` regla 7): siempre manejar el
`400 VALIDACION` del backend, con `error.field` inline cuando venga (§9).

### D26 — La propuesta recibe un modelo de vista, no una simulación

Por K28. Se define un tipo propio, `DatosPropuesta`, y **dos adaptadores**:

```ts
export function propuestaDesdeSimulacion(s: Simulacion, c: Cronograma, cantidad: number | null): DatosPropuesta
export function propuestaDesdeCalculadora(r: CalculadoraResultado, input: CalculadoraInput): DatosPropuesta
```

Así el componente es genuinamente **uno solo** (§5.6) sin que el resultado de la
Calculadora tenga que fingir que es una fila persistida.

**Resolución de K29 — qué hace la propuesta sin `cantidad`** (la decisión que el encargo
§8.2 delega al diseño): `cantidad: number | null`. Cuando es `null` (huérfana o
Calculadora), la propuesta **omite la línea de cantidad y el total por N unidades**, y
muestra solo las cifras por unidad, con la leyenda **"Cotización por unidad"**.

Justificación: inventar `cantidad = 1` mostraría un total que nadie pidió y que sería
falso en cuanto se enlace a un ítem de 8 unidades. Omitir es honesto; asumir, no.

**No se pide `cantidad` al backend** por ahora: en el flujo real del módulo la
oportunidad ya está cargada, así que sale de `items[]` sin request extra. Se reevalúa si
el diseño de la propuesta huérfana lo necesita.

### D27 — PDF por `window.print()` con hoja de estilo de impresión

Por K31. La propuesta es un documento de una o dos páginas, con texto y una tabla — no un
lienzo. Las tres opciones:

| Opción | Peso | Fidelidad | Veredicto |
|---|---|---|---|
| `window.print()` + `@media print` | **0 KB** | nativa, texto seleccionable, vectorial | ✅ **elegida** |
| `jspdf` + `html2canvas` | ~600 KB | rasteriza: texto no seleccionable, borroso al zoom | descartada |
| `react-pdf` / `pdfmake` | ~400 KB | alta, pero duplica el layout en un DSL propio | descartada |

`window.print()` cumple el requisito literal —*"se genera y descarga on demand [...] no
se almacena"* (§5.6)— sin agregar una dependencia ni un kilobyte al bundle, y el usuario
elige "Guardar como PDF" en el diálogo nativo del navegador.

Coste aceptado: el nombre del archivo lo propone el navegador, no la app. Es un precio
menor frente a 600 KB y a una propuesta rasterizada que se ve mal impresa.

Si en la práctica el resultado no satisface, se reevalúa **con la propuesta ya
construida** — que es cuando se puede juzgar de verdad.

### D28 — Excel con `exceljs`, no con `xlsx`

Por K31. El cronograma a Excel *"con el formato de las hojas actuales"* (§5.6) necesita
formato de celda real (moneda, decimales, encabezados), no un CSV renombrado.

`exceljs` sobre `xlsx` (SheetJS): la distribución en npm de `xlsx` arrastra un historial
de vulnerabilidades y su versión mantenida no se publica en el registro público. Dado el
`AUDITORIA-SEGURIDAD-2026-08-13.md` de este repo (K31), la elección conservadora es la
correcta.

Se carga con `import()` dinámico: solo lo descarga quien exporta.

### D29 — La huérfana avisa en tres lugares

Por §7.4 y §8.3, y porque el encargo insiste en que *"la regla debe ser visible en la UI,
no solo lógica de servidor"*:

1. **Al guardar sin ítem** — modal de advertencia con las dos salidas que pide §7.4:
   buscar una oportunidad para enlazar, o confirmar sin enlace.
2. **En la tarjeta del listado** — badge con `eliminacion_prevista_el` formateada.
3. **En el detalle** — aviso permanente con la fecha.

La UI **nunca** promete que va a avisar (§8.3): el texto habla de la fecha de eliminación
prevista, no de una notificación futura.

### D30 — Los errores se tratan según la tabla §9 del encargo, sin inferir

| Código | Tratamiento |
|---|---|
| `409 MODO_INMUTABLE` | No debería ocurrir (campo deshabilitado). Si ocurre, ofrecer "Guardar como Nueva Simulación" (K34) |
| `400 VALIDACION` | Mensaje **inline en el campo** cuando viene `error.field`; si no, a nivel de formulario |
| `404 NO_ENCONTRADO` | **"No existe"**. Nunca "existe pero no tenés permiso" — el 404 para recursos ajenos es deliberado contra IDOR (K18) |
| `403 PERMISO_INSUFICIENTE` | Red de seguridad. No debería ocurrir si la navegación respeta §6 |

Y el caso especial de `restaurar`: el 404 cubre cuatro motivos que el backend **no
distingue a propósito**. Mensaje genérico y único: **"Esa versión ya no se puede
restaurar"**. No especular sobre cuál de los cuatro fue.

### D31 — El módulo se monta en `/simulaciones`, filtrado en `navItems`

Por K35. La entrada de navegación se añade a `src/components/navItems.ts` condicionada a
`puedeVerModuloSimulaciones` (Plan 03, D11). La ruta se protege con `RequireRol`.

La Calculadora va en `/calculadora`, con su propia condición
(`puedeUsarCalculadora`) — el `vendedor` la ve aunque no vea el módulo.

Guards de UX, no de seguridad (`CLAUDE.md` regla 8).

Al existir `/simulaciones/:id`, se cierra el TODO de D20 (Plan 03): la notificación de
`simulacion` pasa a ser clicable.

---

## 4. Orden de construcción

Sigue las fases 2 a 7 del encargo §10, con la justificación que el propio encargo da:

| # | Qué | Por qué acá |
|---|---|---|
| 1 | Cronograma (§5.4) | Núcleo visual que reutilizan las otras tres. Primero, para no rehacerlo tres veces |
| 2 | Calculadora (§5.3) | La vista más autocontenida: un `POST` sin persistencia. Banco de pruebas del cronograma |
| 3 | Simulador en la oportunidad (§5.2) | El flujo principal del vendedor, ya con cronograma probado |
| 4 | Módulo Simulaciones (§5.1) | Depende de tener el detalle resuelto |
| 5 | Historial y diff (§5.5) | Independiente y acotado |
| 6 | Propuesta + PDF + Excel (§5.6) | Lo último: necesita todo lo anterior estable y es lo único sin soporte de backend |

---

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| El selector de ítem aparece con un solo ítem (§5.2, "no se negocia") | D24: test que falla si aparece |
| Renderizar el cronograma con celdas vacías en vez de dos juegos de columnas | D23: dos arrays de columnas, no `hidden` condicional. Test por modo |
| Fila extra para el balloon (el artificio del Excel original) | Test que cuenta filas: `plazo_meses + 1`, ni una más |
| La propuesta inventa `cantidad = 1` en una huérfana | D26: `null` explícito y leyenda "por unidad" |
| El PDF sale rasterizado y feo | D27: impresión nativa, texto vectorial. Reevaluable con la propuesta hecha |
| Añadir dependencias pesadas sin necesidad | D27 (0 KB) y D28 (carga dinámica) |
| Mostrar "no tenés permiso" ante un 404 | D30 + K18: filtra la existencia del recurso, que es lo que el 404 protege |

---

## 6. Criterio de "terminado"

1. `type-check`, `lint`, `test`, `build` en verde.
2. Cada una de las 5 vistas tuvo su propuesta de diseño aprobada antes de su código (§1.6).
3. Con un solo ítem, el usuario nunca ve un selector (test).
4. El cronograma muestra las columnas del modo correcto y `plazo_meses + 1` filas exactas.
5. El `vendedor` no ve la entrada al módulo; sí ve la Calculadora.
6. La propuesta es **un solo componente** para los dos orígenes.
7. PDF y Excel descargan on demand y no se almacenan en ningún lado.
8. **Auditoría final** (§1.3) contra los documentos citados en §1.2.
