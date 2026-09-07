# Plan 01 — Tareas: migración a oportunidades multi-modelo (V42)

**Mapa asociado:** `plan-00-mapa-multimodelo.md` (hallazgos `K*`, decisiones `D*`)
**Fecha:** 2026-09-07
**Reparto acordado (§1.5):** Sonnet ejecuta · Opus en motor/permisos/auditoría · el
arquitecto verifica cada tarea de forma independiente.

---

## Cómo usar este documento

Cada tarea es **atómica y autocontenida**. El agente ejecutor:

1. Lee SOLO su tarea asignada.
2. Ejecuta los pasos **literalmente**, en orden.
3. Corre el comando de verificación. Si pasa, termina y reporta.
4. Si algo no coincide con lo descrito (línea distinta, contenido inesperado, error no
   previsto) → **DETENERSE y escalar**. No improvisar, no "arreglar por el camino", no
   ampliar el alcance.

### Formato de escalación

```
ESCALACION
Tarea: <ID>
Paso: <nº de paso>
Esperado: <lo que el plan decía que encontraría>
Encontrado: <lo que realmente hay>
Pregunta: <la decisión concreta que necesita>
```

§1.4 del encargo: *"Si un subagente encuentra que el plan estaba equivocado, **debe
reportarlo, no decidir en silencio**."*

### Reglas globales para TODOS los agentes

- **Idioma:** todo comentario, mensaje de commit, string de UI y nombre de test en
  **español**. El codebase es íntegramente español. Sigue la densidad de comentarios del
  archivo que tocas.
- **NUNCA `any`.** Usa `unknown` + narrowing (`CLAUDE.md` regla 2).
- **TDD obligatorio** (`CLAUDE.md` regla 1): el test que falla ANTES del código.
- **Toda llamada HTTP pasa por `/src/api/`** (regla 5). Nunca `fetch`/`axios` en componentes.
- **MSW para todo lo que toque la red** (`TESTING-frontend.md` §9.4). Nunca mockear el
  cliente de API.
- **NO hacer commit** salvo que la tarea lo diga explícitamente.
- **NO tocar archivos fuera de la lista "Archivos que toca"**. Ni siquiera para arreglar
  algo que veas mal — repórtalo en tu salida final.
- **NO ejecutar** `git checkout`, `git reset`, `git restore`, `git clean` ni `rm -rf`.
- Ejecuta siempre desde la raíz del repo:
  `C:\Users\Ventas\Desktop\Quantum Projects\CRM FrontEnd - copia`
- Al terminar, reporta: archivos modificados, salida del comando de verificación, y
  cualquier anomalía observada.

---

## Grafo de dependencias y olas

```
OLA 0 (arquitecto, NO subagente — decide si esto es hotfix o deuda técnica)
  └─ T0.0  Verificar si el backend V42 ya está desplegado

OLA 1 (1 agente, secuencial — bloquea todo)
  ├─ T1.1  Sincronizar los 3 documentos de contrato desde el backend  (D1)
  └─ T1.2  Tipos: OportunidadItem + items[]  (D2)   [rompe el build A PROPÓSITO]

OLA 2 (2 agentes en PARALELO — archivos disjuntos)
  ├─ T2.1  utils/monto.ts → cálculo por ítem  (D4)
  └─ T2.2  api/oportunidades.ts: endpoints de ítems  (K7, D5)

OLA 3 (1 agente — alto riesgo, K14, nada en paralelo)
  └─ T3.1  PropiedadesCard: edición de términos por ítem  (D5, D6, K5)

OLA 4 (3 agentes en PARALELO — archivos disjuntos)
  ├─ T4.1  Pipeline: TablaOportunidades + PipelinePage  (D3, K10)
  ├─ T4.2  EmpresaDetallePage + ContactoDetallePage  (D3)
  └─ T4.3  OportunidadDetallePage + CrearTareaModal + NuevaOportunidadModal  (K6)

OLA 5 (1 agente — cruza tipos, hook y 2 vistas)
  └─ T5.1  Solicitudes de descuento por ítem  (D7, D9, K8, K9)

OLA 6 (1 agente)
  └─ T6.1  Redactar el pedido al backend  (D9, + §8.1 del encargo)

OLA 7 (Opus — auditoría, exigida por §1.3)
  └─ T7.1  Releer el diff completo contra los documentos citados
```

**Regla de paralelismo:** dos tareas solo van en paralelo si sus listas "Archivos que
toca" son **completamente disjuntas**. Verificado tarea por tarea abajo.

---
---

# OLA 0

## T0.0 — Verificar si el backend V42 ya está desplegado

- **Ejecutor:** el arquitecto (sesión principal), **no** un subagente
- **Effort:** bajo
- **Depende de:** nada

**Por qué existe:** si el backend con V42 ya está en producción, este frontend **está
roto ahora mismo** — lee `o.modelo.codigo` de un campo que el DTO ya no trae, y la
edición de términos descarta los cambios en silencio (K5). Eso cambia la prioridad de
"deuda técnica" a "hotfix" y probablemente el orden de las olas.

### Pasos

1. Consultar al equipo de backend, o comprobar contra el entorno desplegado:
   `GET /api/v1/oportunidades` — ¿la respuesta trae `items[]` o los campos planos?
2. Registrar la respuesta al principio de este documento como nota fechada.

### Resultado y su consecuencia

| Resultado | Consecuencia |
|---|---|
| V42 **desplegado** | Este plan es un **hotfix**. Se ejecuta completo antes que nada y se despliega solo |
| V42 **no desplegado** | Deuda técnica planificada. Coordinar el merge del frontend con el deploy del backend |

**No continuar a la OLA 1 sin esta respuesta.**

---
---

# OLA 1

## T1.1 — Sincronizar los 3 documentos de contrato desde el backend

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T0.0
- **Paralelizable con:** nada (T1.2 lee lo que esta tarea escribe)

**Por qué existe:** K1 y D1. `docs/contrato_api.md` de este repo no tiene Simulaciones,
Calculadora ni tipo de cambio, y le faltan 4 entradas de changelog. Toda tarea posterior
que se apoye en él escribirá tipos equivocados.

### Archivos que toca
- `docs/contrato_api.md` (**reemplaza íntegro**)
- `docs/reglas_simulaciones.md` (crea)
- `docs/matriz_permisos.md` (crea)

### Pasos

**Paso 1.** Copiar los tres archivos desde el repo del backend, **sin editarlos**:

```bash
BACKEND="C:/Users/Ventas/Desktop/Quantum Projects/CRM BackEnd - copia/docs"
cp "$BACKEND/contrato_api.md"       docs/contrato_api.md
cp "$BACKEND/reglas_simulaciones.md" docs/reglas_simulaciones.md
cp "$BACKEND/matriz_permisos.md"     docs/matriz_permisos.md
```

**Paso 2.** Verificar que el contrato nuevo tiene las secciones esperadas:

```bash
grep -n "^## 22\.\|^## 23\.\|^## 24\." docs/contrato_api.md
```

Debe imprimir exactamente:
```
## 22. Tipo de cambio
## 23. Simulaciones
## 24. Calculadora Financiera
```

Si imprime otra cosa → **ESCALAR**.

**Paso 3.** Verificar que están las 4 entradas de changelog:

```bash
grep -c "^| 2026-09-0[1347]" docs/contrato_api.md
```

Debe imprimir `4`. Si no → **ESCALAR**.

**Paso 4.** Actualizar la tabla de documentos de `CLAUDE.md` para incluir las dos
fuentes nuevas. Añadir estas dos filas a la tabla "Documentos de referencia (en docs/)",
después de la fila de `contrato_api.md`:

```markdown
| `reglas_simulaciones.md` | Reglas del módulo de Simulaciones. **Copia de referencia — dueño es el backend** |
| `matriz_permisos.md` | Permisos por rol y operación. **Copia de referencia — dueño es el backend** |
```

### Verificación
```bash
npm run type-check && npm run lint && npm run test
```
Los tres deben pasar — esta tarea no toca código.

### Restricción
**No editar el contenido de los tres archivos copiados.** El frontend no es dueño del
contrato (§2 del encargo). Si algo en ellos parece equivocado → reportarlo, no corregirlo.

---

## T1.2 — Tipos: `OportunidadItem` + `items[]`

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T1.1
- **Paralelizable con:** nada

**Por qué existe:** K2 y D2. El tipo raíz declara campos que el backend retiró.

> ⚠ **Esta tarea rompe `npm run type-check` a propósito.** Los errores resultantes son
> la lista de trabajo de las olas 2 a 5. Es el comportamiento esperado: **no los
> arregles**, no toques archivos fuera de la lista, y repórtalos en tu salida.

### Archivos que toca
- `src/types/oportunidad.ts` (modifica)

### Pasos

**Paso 1.** En `src/types/oportunidad.ts`, añadir la interfaz del ítem **antes** de
`interface Oportunidad`:

```ts
/**
 * Un modelo vendido dentro de una oportunidad (V42 — `oportunidad_items`).
 * Antes estos campos vivían en la raíz de la oportunidad; el backend los movió acá
 * el 2026-09-03 porque una oportunidad puede vender varios modelos a la vez.
 * Contrato §10.
 */
export interface OportunidadItem {
  id: number
  id_modelo: number
  modelo: Modelo
  cantidad: number
  precio_venta: string
  descuento: string
  /**
   * Lo que el cliente paga a terceros (Calidda, cajas) por unidad y por mes.
   * Editable por el vendedor, default 937.50. El CRM detalla la operación de
   * Quantum, no la de terceros (`reglas_simulaciones.md` §1.2).
   */
  cuota_financiadora: string
  /**
   * Cuota mensual del financiamiento de Quantum para UNA unidad de este modelo.
   * `null` es degradación esperada (ítem incompleto o precio incompatible con los
   * parámetros por defecto), NUNCA un error — no dispares un toast por esto.
   * Siempre `null` en las respuestas de POST/PUT de ítem: esos endpoints no la
   * resuelven. Si la necesitas, repide la oportunidad (contrato §10).
   */
  cuota_quantum: string | null
  /**
   * `cuota_quantum + cuota_financiadora`, para UNA unidad de este modelo.
   * OJO: no confundir con `Oportunidad.cuota_total`, que es el total mensual de
   * toda la operación ya multiplicado por cantidades.
   */
  cuota_total: string | null
  monto_item: string
  advertencias: string[]
}
```

**Paso 2.** En `interface Oportunidad`, **eliminar** estas cinco líneas:

```ts
  id_modelo: number
  modelo: Modelo
  cantidad: number
  precio_unitario: string
  dcto: string
```

**Paso 3.** En el mismo bloque, **añadir** `items` y los tres campos de cuota de nivel
oportunidad. `monto_total` se queda donde está (K11):

```ts
  items: OportunidadItem[]
  monto_total: string
  /**
   * Σ (cuota_quantum × cantidad) de todos los ítems.
   * Los TRES campos de cuota de este nivel son `null` CONJUNTAMENTE si cualquier
   * ítem no tiene cuota calculable. Se muestra como "todavía no se puede calcular",
   * jamás como cero ni como un guion que parezca un monto (contrato §10).
   */
  cuota_quantum_total: string | null
  /** Σ (cuota_total_item × cantidad). Total mensual de TODA la operación. */
  cuota_total: string | null
  /** `cuota_total / 22`. */
  cuota_diaria_total: string | null
```

**Paso 4.** En `ActualizarOportunidadInput`, **eliminar** los campos que
`PUT /oportunidades/:id` ya no acepta (K5). Deben quedar exactamente estos cinco:

```ts
export interface ActualizarOportunidadInput {
  garantia?: boolean
  finc_paralelo?: boolean
  ficha_venta?: string | null
  notas?: string | null
  fecha_cierre_estimado?: string | null
}
```

**Paso 5.** Añadir el input de edición de ítem, al final del archivo:

```ts
/** Body de `PUT /oportunidades/:id/items/:item_id`. Todos opcionales (contrato §10). */
export interface ActualizarItemInput {
  id_modelo?: number
  cantidad?: number
  precio_venta?: string
  descuento?: string
  cuota_financiadora?: string
}
```

**Paso 6.** `CrearOportunidadInput` **NO se toca** (K6): `POST /oportunidades` sigue
aceptando `id_modelo`, `cantidad` y `descuento` planos.

Sí verificar que el campo se llame `descuento` y no `dcto`. Si en el archivo dice
`dcto?: number`, renombrarlo a `descuento?: number` y dejar constancia en la salida.

**Paso 7.** Verificar que `Modelo` sigue importado en la cabecera del archivo (lo usa
ahora `OportunidadItem` en vez de `Oportunidad`).

### Verificación
```bash
npm run type-check
```

**Se espera que FALLE.** Guardar la salida completa: es el inventario de trabajo de las
olas siguientes.

```bash
npm run type-check 2>&1 | tee /tmp/errores-v42.txt; grep -c "error TS" /tmp/errores-v42.txt
```

### Salida esperada del agente
1. La lista completa de errores de `tsc`, agrupada por archivo.
2. Confirmación de que **no** se tocó ningún archivo fuera de `src/types/oportunidad.ts`.
3. Si algún error aparece en un archivo **que no está** en la lista de K3 (los 17) →
   reportarlo destacado: el mapa subestimó el alcance.

---
---

# OLA 2

> Las dos tareas de esta ola tocan archivos disjuntos y pueden ir en paralelo.

## T2.1 — `utils/monto.ts`: cálculo por ítem

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T1.2
- **Paralelizable con:** T2.2

**Por qué existe:** K12 y D4. Las dos funciones asumen un solo modelo.

### Archivos que toca
- `src/utils/monto.ts` (modifica)
- `src/utils/monto.test.ts` (modifica o crea)

### Pasos

**Paso 1 — TEST PRIMERO.** En `src/utils/monto.test.ts`, añadir los casos de
`calcularMontoOportunidad` **antes** de escribir la función. Deben fallar:

```ts
describe('calcularMontoOportunidad', () => {
  it('suma el monto de cada ítem con descuento aplicado', () => {
    const items = [
      { cantidad: 8, precio_venta: '92000.00', descuento: '3.00' },
      { cantidad: 2, precio_venta: '50000.00', descuento: '0.00' },
    ]
    // 8 × 92000 × 0.97 = 713 920.00   +   2 × 50000 = 100 000.00
    expect(calcularMontoOportunidad(items)).toBe(813920)
  })

  it('redondea por ítem antes de sumar, igual que el backend', () => {
    // Si se redondeara solo al final, el total diferiría en céntimos de
    // `monto_total`, que el backend calcula sumando `monto_item` ya redondeados.
    const items = [
      { cantidad: 3, precio_venta: '333.33', descuento: '7.77' },
      { cantidad: 3, precio_venta: '333.33', descuento: '7.77' },
    ]
    const porItem = Math.round(3 * 333.33 * (1 - 7.77 / 100) * 100) / 100
    expect(calcularMontoOportunidad(items)).toBe(Math.round(porItem * 2 * 100) / 100)
  })

  it('devuelve 0 con la lista vacía', () => {
    expect(calcularMontoOportunidad([])).toBe(0)
  })
})
```

Correr `npm run test` y **confirmar que fallan**. Si pasan → **ESCALAR** (la función ya
existe y el mapa está desactualizado).

**Paso 2.** Renombrar `calcularMontoTotal` a `calcularMontoItem`. El cuerpo **no
cambia**: es la misma fórmula, ahora aplicada a un ítem. Actualizar el JSDoc:

```ts
/**
 * Monto de UN ítem (un modelo) para mostrar en la UI.
 * SOLO presentación: el valor autoritativo lo calcula y persiste el backend.
 * `monto_total` NUNCA se envía en ningún body (CLAUDE.md regla 10).
 */
export function calcularMontoItem(
```

**Paso 3.** Añadir la función de agregación. Nótese que redondea **por ítem** y luego
suma (D4):

```ts
/**
 * Monto de toda la oportunidad: suma de los montos de sus ítems.
 * Redondea POR ÍTEM antes de sumar, igual que el backend, que suma `monto_item`
 * ya redondeados. Redondear solo al final daría céntimos de diferencia contra
 * `monto_total` — y el usuario vería dos totales distintos en la misma pantalla.
 */
export function calcularMontoOportunidad(
  items: readonly {
    cantidad: number | null | undefined
    precio_venta: string | number | null | undefined
    descuento: string | number | null | undefined
  }[],
): number {
  const total = items.reduce(
    (acc, it) => acc + calcularMontoItem(it.cantidad, it.precio_venta, it.descuento),
    0,
  )
  return Math.round(total * 100) / 100
}
```

**Paso 4.** `calcularDescuento` conserva firma y cuerpo; solo actualizar el JSDoc para
que diga "de un ítem" en vez de "del bruto".

**Paso 5.** Actualizar los tests existentes de `calcularMontoTotal` al nombre nuevo.

### Verificación
```bash
npm run test -- monto && npm run lint
```
Todos los tests de `monto` en verde.

### Restricción
No actualizar los call sites en componentes: son de las olas 3 y 4. `type-check` seguirá
fallando y está bien.

---

## T2.2 — `api/oportunidades.ts`: endpoints de ítems

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T1.2
- **Paralelizable con:** T2.1

**Por qué existe:** K7 y D5. El frontend no conoce los tres endpoints de ítems.
`CLAUDE.md` regla 5: toda llamada HTTP pasa por `/src/api/`.

### Archivos que toca
- `src/api/oportunidades.ts` (modifica)
- `src/hooks/useOportunidades.ts` (modifica)

### Pasos

**Paso 1.** En `src/api/oportunidades.ts`, añadir al objeto `oportunidadesApi`, después
de `actualizar`:

```ts
  /**
   * Edita un ítem (un modelo vendido). `PUT /oportunidades/:id` ya NO acepta estos
   * campos: los ignora en silencio y el usuario cree que guardó (contrato §10).
   *
   * OJO: la respuesta trae `cuota_quantum` y `cuota_total` SIEMPRE en `null` —
   * este endpoint no las resuelve. Por eso quien llame debe invalidar y repedir
   * la oportunidad en vez de escribir esta respuesta en la cache.
   */
  actualizarItem: async (
    id: number,
    idItem: number,
    input: ActualizarItemInput,
  ): Promise<OportunidadItem> => {
    const res = await put<OportunidadItem>(`/oportunidades/${id}/items/${idItem}`, input)
    return res.data
  },
```

**Paso 2.** Añadir el import de `ActualizarItemInput` y `OportunidadItem` al bloque de
tipos de la cabecera.

**Paso 3.** En `actualizar`, verificar que el comentario siga siendo cierto y ajustarlo:

```ts
  /**
   * Solo garantía, financiamiento paralelo, ficha, notas y fecha estimada.
   * Los términos comerciales (modelo, cantidad, precio, descuento) se editan por
   * `actualizarItem` desde V42 — este endpoint los descarta en silencio.
   */
```

**Paso 4.** En `src/hooks/useOportunidades.ts`, añadir el hook de mutación. Aplicar D6
—invalidar y repedir, nunca escribir la respuesta en la cache:

```ts
/**
 * Edita un ítem de la oportunidad. No escribe la respuesta en la cache: el
 * endpoint de ítems devuelve `cuota_quantum`/`cuota_total` en `null` siempre, y
 * meter esos nulos en pantalla sería mentir. Se invalida y se repide (D6).
 */
export function useActualizarItem(idOportunidad: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idItem, input }: { idItem: number; input: ActualizarItemInput }) =>
      oportunidadesApi.actualizarItem(idOportunidad, idItem, input),
    onSuccess: () => {
      // Sincronización 360 (CLAUDE.md regla 4): el monto y las cuotas cambian, y
      // se muestran también en el Pipeline y en la ficha de la empresa.
      invalidar(qc, qk.oportunidad(idOportunidad), qk.oportunidades, qk.empresas)
    },
  })
}
```

**Paso 5.** Verificar que `invalidar`, `qk`, `useMutation` y `useQueryClient` ya estén
importados en ese archivo; si falta alguno, añadirlo.

### Restricción
**NO implementar `POST` ni `DELETE` de ítems** (D8): agregar y eliminar modelos es
funcionalidad de producto nueva, fuera de alcance. Si te parece que hace falta →
reportarlo, no implementarlo.

### Verificación
```bash
npm run lint && npm run test
```
`type-check` seguirá fallando por los componentes (olas 3-5): es lo esperado.

---
---

# OLA 3

## T3.1 — `PropiedadesCard`: edición de términos por ítem

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T2.1, T2.2
- **Paralelizable con:** nada

**Por qué Opus:** es el archivo de mayor riesgo del plan (K14, 22.978 bytes, tres flujos
acoplados) y corrige un bug de **pérdida silenciosa de datos** ya activo en producción
(K5). Un error acá no rompe el build: guarda mal y nadie se entera.

### Archivos que toca
- `src/pages/OportunidadDetalle/PropiedadesCard.tsx` (modifica)
- `src/pages/OportunidadDetalle/PropiedadesCard.test.tsx` (crea)

### Contexto que el agente necesita

El componente tiene hoy cuatro piezas acopladas a los campos planos:

| Línea aprox. | Pieza |
|---|---|
| 18-22 | El tipo del formulario (`id_modelo`, `cantidad`, `precio_unitario`, `dcto`) |
| 48-51 | `Form.useWatch` de los tres campos + `calcularMontoTotal` en vivo |
| 54, 111 | `aprobadorParaDcto` y el disparo de la solicitud de descuento |
| 60-98 | El submit, que hoy manda los términos por `PUT /oportunidades/:id` |
| 138-142 | `initialValues` leídos de la raíz de la oportunidad |
| 363-366 | Resumen: `modeloCompleto`, `bruto`, `descuentoMonto` |
| 416 | Render de `o.modelo.codigo` |

### Pasos

**Paso 1 — TEST DE REGRESIÓN PRIMERO (K5).** Crear
`src/pages/OportunidadDetalle/PropiedadesCard.test.tsx` con este caso, que **hoy falla**:

```ts
it('persiste el precio editado por el endpoint de ítems, no por el de la oportunidad', async () => {
  // Regresión de K5: `PUT /oportunidades/:id` acepta los términos y los DESCARTA
  // en silencio. El usuario veía "Guardado" y no se guardaba nada.
  const llamadas: string[] = []
  servidor.use(
    http.put('*/oportunidades/:id/items/:itemId', async ({ request }) => {
      llamadas.push('item')
      return HttpResponse.json({ data: { /* ítem actualizado */ }, meta: null, error: null })
    }),
    http.put('*/oportunidades/:id', async () => {
      llamadas.push('oportunidad')
      return HttpResponse.json({ data: {}, meta: null, error: null })
    }),
  )

  // …renderizar, abrir el modal de términos, cambiar el precio, guardar…

  expect(llamadas).toContain('item')
  expect(llamadas).not.toContain('oportunidad')
})
```

Correr `npm run test` y **confirmar que falla**. Si pasa → **ESCALAR**.

**Paso 2.** El modal de edición de términos pasa a operar sobre **un ítem**. Añadir a
sus props `item: OportunidadItem`, y cambiar el tipo del formulario:

```ts
interface ValoresTerminos {
  id_modelo: number
  cantidad: number
  precio_venta: number
  descuento: number
  cuota_financiadora: number
}
```

Nótese el renombrado: `precio_unitario` → `precio_venta`, `dcto` → `descuento`. Y el
campo nuevo `cuota_financiadora` (K4).

**Paso 3.** `initialValues` se leen del **ítem**, no de la oportunidad:

```ts
initialValues={{
  id_modelo: item.id_modelo,
  cantidad: item.cantidad,
  precio_venta: Number(item.precio_venta),
  descuento: Number(item.descuento),
  cuota_financiadora: Number(item.cuota_financiadora),
}}
```

**Paso 4.** El monto en vivo usa `calcularMontoItem` (nombre nuevo de T2.1) con los
campos renombrados:

```ts
const cantidad = Form.useWatch('cantidad', form)
const precioVenta = Form.useWatch('precio_venta', form)
const descuento = Form.useWatch('descuento', form)
const montoEnVivo = calcularMontoItem(cantidad, precioVenta, descuento)
```

**Paso 5.** Añadir el `Form.Item` de `cuota_financiadora` después del de `descuento`:

```tsx
<Form.Item
  name="cuota_financiadora"
  label="Cuota financiadora"
  tooltip="Lo que el cliente paga a terceros (Calidda, cajas) por unidad y por mes. No es parte del financiamiento de Quantum."
>
  <InputNumber min={0} step={0.01} className="w-full" />
</Form.Item>
```

**Paso 6.** El submit usa `useActualizarItem` (T2.2) para los términos. Si además
cambiaron campos de la oportunidad (notas, garantía…), esos siguen yendo por
`actualizar`. **No mandar nunca los términos en el `PUT` de la oportunidad.**

**Paso 7.** El disparo de la solicitud de descuento pasa el **id del ítem**, no el de la
oportunidad (D7). El prop del `SolicitudModal` es `idOportunidadItem={item.id}`. El
componente `SolicitudModal` lo cambia T5.1; acá solo se pasa el valor correcto. Si el
tipo todavía no existe, dejar el `type-check` fallando ahí y reportarlo — lo cierra T5.1.

**Paso 8.** El bloque de resumen (líneas ~357-420) itera los ítems. Con **un** ítem se
ve igual que hoy (D3). Con varios, una fila por ítem y el total abajo:

```tsx
{o.items.map((it) => (
  <FilaItem key={it.id} item={it} onEditar={() => abrirModalTerminos(it)} />
))}
```

`modeloCompleto` se resuelve por ítem: `modelos.data?.find((m) => m.id === it.id_modelo)`.

**Paso 9.** `o.modelo.codigo` (línea ~416) pasa a `it.modelo.codigo` dentro de la fila.

**Paso 10.** Verificar que el test del Paso 1 ahora **pasa**.

### Restricciones
- **No** mostrar todavía `cuota_quantum` ni `cuota_total`: son del Plan 02. Este plan
  solo los tipa.
- **No** añadir botones de agregar/eliminar ítem (D8).

### Verificación
```bash
npm run test -- PropiedadesCard && npm run lint
```

---
---

# OLA 4

> Tres tareas con listas de archivos disjuntas. Verificado: ninguna toca
> `PropiedadesCard.tsx` (ola 3) ni los archivos de solicitudes (ola 5).

## T4.1 — Pipeline: `TablaOportunidades` + `PipelinePage`

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T2.1
- **Paralelizable con:** T4.2, T4.3

**Por qué existe:** D3 (mostrar el multi-ítem con honestidad) y K10 (`sort=precio_unitario`
ya no es válido).

### Archivos que toca
- `src/pages/Pipeline/TablaOportunidades.tsx` (modifica)
- `src/pages/Pipeline/PipelinePage.tsx` (modifica)
- `src/pages/Pipeline/TablaOportunidades.test.tsx` (crea)

### Pasos

**Paso 1 — TEST PRIMERO.** Los dos casos de D3:

```ts
it('muestra el código del modelo cuando la oportunidad tiene un solo ítem', () => { /* … */ })

it('muestra "K12 +2" cuando la oportunidad tiene tres ítems', () => {
  // Nunca items[0] a secas: mostraría un modelo como si fuera toda la operación.
})
```

**Paso 2.** Crear el helper de presentación. Va en `src/utils/` porque es lógica, no
markup (`CLAUDE.md` regla 11):

```ts
/**
 * Etiqueta del modelo para listados. Con un ítem, el código a secas — el caso de
 * hoy en producción. Con varios, "K12 +2": mostrar solo el primero sería
 * presentar un modelo como si fuera toda la operación (D3).
 */
export function etiquetaModelos(items: readonly OportunidadItem[]): string {
  if (items.length === 0) return '—'
  const primero = items[0].modelo.codigo
  return items.length === 1 ? primero : `${primero} +${items.length - 1}`
}
```

Ubicación: `src/utils/oportunidades.ts` (crear si no existe).

**Paso 3.** En `TablaOportunidades.tsx`, la columna "Modelo" usa `etiquetaModelos(o.items)`
y envuelve en `<Tooltip>` con la lista completa cuando `o.items.length > 1`.

**Paso 4.** La columna "Cantidad", si existe, muestra la **suma**:
`o.items.reduce((a, it) => a + it.cantidad, 0)`.

**Paso 5.** Buscar cualquier selector de orden que ofrezca `precio_unitario` (K10):

```bash
grep -rn "precio_unitario" src/pages/Pipeline/
```

Si aparece como valor de `sort`, **eliminar esa opción**. El backend responde
`400 VALIDACION`. `cantidad` y `monto_total` se mantienen.

**Paso 6.** Corregir el resto de errores de `tsc` de estos dos archivos.

### Verificación
```bash
npm run test -- TablaOportunidades && npm run lint
npm run type-check 2>&1 | grep "src/pages/Pipeline" || echo "Pipeline limpio"
```

---

## T4.2 — `EmpresaDetallePage` + `ContactoDetallePage`

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T2.1, T4.1 (usa `etiquetaModelos`)
- **Paralelizable con:** T4.3

> **Nota de secuencia:** necesita el helper del Paso 2 de T4.1. Si se lanzan en paralelo,
> el agente de T4.2 debe crear `src/utils/oportunidades.ts` solo si no existe, y **no**
> modificarlo si ya está. Si ambos lo crean con contenido distinto → **ESCALAR**.

### Archivos que toca
- `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` (modifica)
- `src/pages/Contactos/ContactoDetallePage.tsx` (modifica)
- `src/types/contacto.ts` (modifica)

### Pasos

**Paso 1.** Correr `npm run type-check 2>&1 | grep -E "EmpresaDetalle|ContactoDetalle|types/contacto"`
para tener el inventario exacto.

**Paso 2.** En `src/types/contacto.ts`, revisar el tipo de oportunidad embebida. Si
declara `modelo`/`cantidad`/`precio_unitario` en la raíz, alinearlo con el contrato §9.
**Verificar contra `docs/contrato_api.md` §9 antes de cambiar nada** — puede ser un
resumen legítimamente distinto del DTO completo. Si el contrato lo define distinto de lo
que asume esta tarea → **ESCALAR**.

**Paso 3.** En ambas páginas, las listas de oportunidades usan `etiquetaModelos(o.items)`
y suman cantidades como en T4.1.

**Paso 4.** `monto_total` se sigue leyendo de la raíz (K11): **no cambiarlo**.

### Verificación
```bash
npm run lint && npm run test
npm run type-check 2>&1 | grep -E "EmpresaDetalle|ContactoDetalle" || echo "limpio"
```

---

## T4.3 — `OportunidadDetallePage` + `CrearTareaModal` + `NuevaOportunidadModal`

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T2.1
- **Paralelizable con:** T4.1, T4.2

### Archivos que toca
- `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx` (modifica)
- `src/components/CrearTareaModal.tsx` (modifica)
- `src/components/NuevaOportunidadModal.tsx` (modifica)

### Pasos

**Paso 1.** Inventario:
```bash
npm run type-check 2>&1 | grep -E "OportunidadDetallePage|CrearTareaModal|NuevaOportunidadModal"
```

**Paso 2.** `OportunidadDetallePage`: cabecera y stepper. Donde muestre el modelo, usar
`etiquetaModelos(o.items)`. `monto_total` de la raíz, sin cambios.

**Paso 3.** `CrearTareaModal`: probablemente solo muestre el modelo como contexto.
Aplicar `etiquetaModelos`.

**Paso 4.** `NuevaOportunidadModal` — **atención a K6**. El **request no cambia**:
`POST /oportunidades` sigue aceptando `id_modelo`, `cantidad` y `descuento` planos.

Lo único que puede romper es la **lectura de la respuesta**, que ahora trae `items[]`. Si
el modal lee `resultado.modelo` o `resultado.cantidad` tras crear, corregirlo a
`resultado.items[0]`.

> Este es el **único** lugar del plan donde `items[0]` es correcto: acabás de crear la
> oportunidad con un solo modelo, así que el ítem existe y es uno. Dejar el comentario:
> ```ts
> // items[0] es seguro acá y solo acá: POST /oportunidades crea exactamente un
> // ítem (K6). En cualquier otra vista, usar etiquetaModelos (D3).
> ```

Si el campo del formulario se llama `dcto`, renombrarlo a `descuento` (T1.2 Paso 6).

### Verificación
```bash
npm run lint && npm run test
npm run type-check 2>&1 | grep -E "OportunidadDetallePage|CrearTareaModal|NuevaOportunidadModal" || echo "limpio"
```

---
---

# OLA 5

## T5.1 — Solicitudes de descuento por ítem

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T3.1 (que ya pasa `item.id`), T4.1
- **Paralelizable con:** nada

**Por qué Opus:** K8 es un bug de **navegación corrupta** (lleva a la empresa
equivocada), K9 es una limitación del contrato que exige degradar con criterio, y hay
que decidir sin inventar comportamiento. Los tres piden juicio, no transcripción.

### Archivos que toca
- `src/types/solicitud.ts` (modifica)
- `src/components/SolicitudModal.tsx` (modifica)
- `src/hooks/useSolicitudes.ts` (modifica)
- `src/utils/solicitudes.ts` (modifica)
- `src/components/BandejaSolicitudes.tsx` (modifica)
- `src/pages/Solicitudes/SolicitudesPage.tsx` (modifica)
- `src/utils/solicitudes.test.ts` (crea o modifica)

### Pasos

**Paso 1 — TEST PRIMERO.** El caso que reproduce K8:

```ts
describe('rutaDeSolicitud', () => {
  it('no navega a /empresas cuando la entidad es un ítem de oportunidad', () => {
    // Regresión de K8: el ternario viejo mandaba `oportunidad_item` al `else` y
    // navegaba a /empresas/<id del ítem> — la empresa equivocada, no un 404.
    const s = { entidad_tipo: 'oportunidad_item', entidad_id: 502 } as Solicitud
    expect(rutaDeSolicitud(s)).toBeNull()
  })

  it('mantiene la ruta de empresa y de oportunidad', () => {
    expect(rutaDeSolicitud({ entidad_tipo: 'empresa', entidad_id: 12 } as Solicitud))
      .toBe('/empresas/12')
    expect(rutaDeSolicitud({ entidad_tipo: 'oportunidad', entidad_id: 101 } as Solicitud))
      .toBe('/oportunidades/101')
  })
})
```

**Paso 2.** En `src/types/solicitud.ts`:
- Verificar que el enum `EntidadSolicitud` incluya `'oportunidad_item'`. Si no, añadirlo
  (contrato §26: `oportunidad`, `empresa`, `oportunidad_item`).
- En `SolicitudDescuentoInput` (líneas ~30-31), cambiar
  `entidad_tipo: 'oportunidad'` → `entidad_tipo: 'oportunidad_item'`.

**Paso 3.** En `src/utils/solicitudes.ts`, añadir el helper compartido (D9):

```ts
/**
 * Ruta a la que navega una fila de la bandeja, o `null` si no hay una honesta.
 *
 * `oportunidad_item` devuelve null a propósito: desde V42 el descuento vive en el
 * ítem, y el DTO de Solicitud no expone `id_oportunidad` (K9) — no hay forma de
 * saber a qué oportunidad ir. Antes esto caía en el `else` y navegaba a
 * /empresas/<id del ítem>: la empresa equivocada. Preferimos no navegar.
 *
 * Pedido abierto al backend para exponer `id_oportunidad`; ver
 * `docs/solicitud-backend-simulaciones.md`.
 */
export function rutaDeSolicitud(s: Solicitud): string | null {
  switch (s.entidad_tipo) {
    case 'oportunidad':
      return `/oportunidades/${s.entidad_id}`
    case 'empresa':
      return `/empresas/${s.entidad_id}`
    case 'oportunidad_item':
      return null
  }
}
```

Nótese el `switch` exhaustivo sin `default`: si el backend añade un valor al enum, `tsc`
lo señala. El ternario viejo lo tragaba en silencio — que es exactamente cómo nació K8.

**Paso 4.** `BandejaSolicitudes.tsx:20` y `SolicitudesPage.tsx:22`: eliminar el ternario
duplicado y usar `rutaDeSolicitud`. Cuando devuelva `null`, renderizar
`s.entidad_descripcion` como **texto plano, no enlace**.

**Paso 5.** `useSolicitudes.ts:37-41`: la invalidación tras aprobar/denegar. Hoy manda
`oportunidad_item` a la rama de empresa, rompiendo la sincronización 360:

```ts
if (s.entidad_tipo === 'oportunidad') {
  invalidar(qc, qk.oportunidad(s.entidad_id), qk.oportunidadLog(s.entidad_id))
} else if (s.entidad_tipo === 'empresa') {
  invalidar(qc, qk.empresa(s.entidad_id))
} else {
  // oportunidad_item: `entidad_id` es el ítem y no sabemos su oportunidad (K9).
  // Se invalida la colección entera: menos preciso, pero correcto. Aprobar un
  // descuento cambia monto y cuotas, y no puede quedar valor viejo en pantalla
  // (CLAUDE.md regla 4).
  invalidar(qc, qk.oportunidades, qk.empresas)
}
```

**Paso 6.** `SolicitudModal.tsx:50-51`: la prop pasa de `idOportunidad` a
`idOportunidadItem` y el body a `entidad_tipo: 'oportunidad_item'`. La rama de `empresa`
(líneas 57-58) **no se toca**.

**Paso 7.** Verificar que `PropiedadesCard` (T3.1) ya pasa `idOportunidadItem`. Si no,
es el único ajuste permitido fuera de la lista de archivos; reportarlo.

### Verificación
```bash
npm run test && npm run lint && npm run type-check
```
**Los tres deben pasar.** Esta es la última tarea de código: si `type-check` sigue
fallando, quedó trabajo de las olas 3-4 sin cerrar → reportar qué archivos.

---
---

# OLA 6

## T6.1 — Redactar el pedido al backend

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T5.1
- **Paralelizable con:** T7.1

**Por qué existe:** D9 (K9) y §8.1 del encargo. El encargo §2 es explícito: *"Si el
frontend necesita un cambio de contrato, se pide — no se parchea en el cliente."*

### Archivos que toca
- `docs/solicitud-backend-simulaciones.md` (crea)

### Pasos

**Paso 1.** Crear el documento siguiendo el formato de
`docs/solicitud-backend-eventos-empresa.md`, que ya existe en este repo. Leerlo primero
para copiar su estructura.

**Paso 2.** Incluir los **dos** pedidos:

**Pedido 1 — `id_oportunidad` en el DTO de `Solicitud`** (K9)
- Motivo: con `entidad_tipo: "oportunidad_item"`, `entidad_id` es el id del ítem. La
  bandeja de solicitudes no puede construir el enlace a la oportunidad sin pedir cada
  oportunidad y buscar el ítem — inviable en una lista paginada.
- Impacto actual: las filas de descuento **no son clicables** desde V42.
- Pedido: exponer `id_oportunidad` (nullable, solo con `entidad_tipo: "oportunidad_item"`)
  en el DTO de `GET /solicitudes` y `GET /solicitudes/:id`.

**Pedido 2 — `id_empresa` / `empresa` en el DTO de simulación** (encargo §8.1)
- Cita del encargo: *"el DTO de simulación **no trae `id_empresa` ni el objeto empresa**.
  La razón social aparece embebida dentro del `nombre` autogenerado, pero eso es un
  string de presentación, no un dato para agrupar."*
- Motivo: `reglas_simulaciones.md` §8.2 pide agrupar por oportunidad **o por empresa**.
  Agrupar por empresa hoy solo es posible parseando el nombre — que el encargo prohíbe y
  que además se rompe con nombre manual.
- Pedido: exponer `id_empresa` y `empresa: { id, razon_social }` en el DTO de simulación.
- El propio encargo lo anticipa: *"pedime que el backend exponga `id_empresa`/`empresa`
  en el DTO. Es un cambio chico."*

**Paso 3.** Dejar constancia de lo **no** pedido y por qué: `cantidad` en el DTO de
simulación (§8.2 del encargo) se resuelve vía `GET /oportunidades/:id` → `items[]`, sin
request extra en el flujo real. Se reevalúa en el Plan 04 al construir
`<PropuestaFinanciera/>`.

### Verificación
El documento existe, cita las secciones del contrato, y no propone que el frontend
resuelva nada de esto por su cuenta.

---
---

# OLA 7

## T7.1 — Auditoría del diff contra los documentos citados

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T5.1
- **Paralelizable con:** T6.1

**Por qué existe:** §1.3 del encargo lo exige como tarea propia:

> Al final del plan, como tarea propia: una tarea dedicada a **releer el diff completo de
> la rama** contra esos mismos documentos citados al principio — no solo contra lo que el
> plan pedía implementar. Se busca específicamente contradicciones con algo que **ya
> estaba escrito correctamente** antes de empezar. [...] Esta tarea de auditoría encontró
> 7 hallazgos reales en el último plan del backend. No es ceremonia.

### Archivos que toca
Ninguno. Produce un informe.

### Pasos

**Paso 1.** Obtener el diff completo:
```bash
git diff main...HEAD
```

**Paso 2.** Releerlo contra **cada** documento citado en `plan-00-mapa-multimodelo.md`
§1.2, buscando específicamente:

| Qué buscar | Ejemplo del tipo de hallazgo |
|---|---|
| Reglas de `CLAUDE.md` pisadas | ¿algún `any`? ¿lógica de negocio en un componente (regla 11)? ¿`monto_total` enviado en un body (regla 10)? ¿HTTP fuera de `/src/api/` (regla 5)? |
| Sincronización 360 incompleta (regla 4) | ¿alguna mutación que no invalide todas las vistas afectadas? |
| Contradicciones con el contrato | ¿algún campo tipado distinto de §10? ¿algún `sort` inválido? |
| TDD saltado (regla 1) | ¿algún componente o hook nuevo sin test previo? |
| `TESTING-frontend.md` §9.4 | ¿algún test que mockee el cliente de API en vez de usar MSW? |
| Decisiones del mapa incumplidas | ¿aparece `items[0]` fuera de `NuevaOportunidadModal` (D2, D3)? ¿se implementó `POST`/`DELETE` de ítems (D8)? |

**Paso 3.** Ejecutar los greps de control:

```bash
# D2/D3: items[0] solo debe aparecer en NuevaOportunidadModal
grep -rn "items\[0\]" src --include=*.ts --include=*.tsx

# Criterio 2 del mapa: cero lecturas de campos planos en la raíz
grep -rn "\.precio_unitario\|\.dcto\b" src --include=*.ts --include=*.tsx

# D8: no debe existir creación ni borrado de ítems
grep -rn "crearItem\|eliminarItem\|ULTIMO_ITEM" src --include=*.ts --include=*.tsx

# CLAUDE.md regla 2
grep -rn ": any\|as any" src --include=*.ts --include=*.tsx
```

Los cuatro deben salir vacíos, salvo la única ocurrencia autorizada de `items[0]` en
`NuevaOportunidadModal.tsx` (T4.3 Paso 4).

**Paso 4.** Correr la verificación completa:
```bash
npm run type-check && npm run lint && npm run test && npm run build
```

**Paso 5.** Escribir el informe en
`docs/planes/plan-01-multimodelo-auditoria.md`, con hallazgos numerados (`A1`, `A2`…),
cada uno con: archivo y línea, documento y sección que contradice, y corrección
propuesta.

**Paso 6.** **No corregir los hallazgos.** Reportarlos. La decisión de qué corregir y en
qué orden es del arquitecto.

### Verificación
El informe existe y cada hallazgo cita documento + sección. Si el informe está vacío,
decirlo explícitamente y listar qué se revisó — un "sin hallazgos" sin inventario de
revisión no es aceptable.

---
---

## Checklist de cierre del Plan 00/01

- [ ] T0.0 respondida y registrada (¿hotfix o deuda?)
- [ ] `npm run type-check`, `npm run lint`, `npm run test`, `npm run build` en verde
- [ ] Los 4 greps de control de T7.1 limpios
- [ ] El test de regresión de K5 existe y pasa
- [ ] Ninguna solicitud navega a `/empresas/<id de ítem>`
- [ ] `docs/solicitud-backend-simulaciones.md` entregado al equipo de backend
- [ ] Informe de auditoría escrito y revisado por el arquitecto
- [ ] **Parada obligatoria:** resumir qué se hizo antes de arrancar el Plan 02
      (§10 del encargo: *"Al terminar cada fase, pará y resumí qué hiciste antes de seguir"*)
