# Plan 03 — Tareas: cimientos de Simulaciones y Calculadora

**Mapa asociado:** `plan-02-mapa-cimientos-simulaciones.md` (hallazgos `K16+`, decisiones `D11+`)
**Fecha:** 2026-09-07
**Requisito de entrada:** Plan 00/01 cerrado, con su checklist completo.

---

## Cómo usar este documento

Idéntico al Plan 01: tareas atómicas, el agente lee solo la suya, ejecuta literalmente,
verifica, y **escala en vez de improvisar**.

### Formato de escalación

```
ESCALACION
Tarea: <ID>
Paso: <nº de paso>
Esperado: <lo que el plan decía que encontraría>
Encontrado: <lo que realmente hay>
Pregunta: <la decisión concreta que necesita>
```

### Reglas globales para TODOS los agentes

Las mismas del Plan 01 (español, nunca `any`, TDD, HTTP solo en `/src/api/`, MSW, no
commitear, no salir de la lista de archivos, no `git checkout`/`reset`/`clean`), más
estas tres, específicas de este módulo:

- **Ninguna condicional de rol de simulaciones fuera de `utils/simulacionPermisos.ts`**
  (D11). Si necesitás preguntar por un rol en un componente, importá una función de ahí.
- **`null` no es `0` ni `—`** (D12). Un campo de cuota nulo se muestra como texto que
  diga que no se puede calcular. Nunca un toast de error (encargo §4.1).
- **No inventes comportamiento de negocio** (§1.7 del encargo). Si el contrato no dice
  qué pasa en un caso, **escalá**. Esto es producción con usuarios reales.

---

## Grafo de dependencias y olas

```
OLA 1 (2 agentes en PARALELO — archivos disjuntos)
  ├─ T1.1  Tipos del módulo: simulacion.ts, calculadora.ts, tipoCambio.ts  (K19, D13)
  └─ T1.2  utils/simulacionPermisos.ts  (K16, K17, D11)

OLA 2 (2 agentes en PARALELO)
  ├─ T2.1  Capa API: simulaciones.ts + calculadora.ts + tipoCambio.ts  (11 endpoints)
  └─ T2.2  utils/simulaciones.ts: defaults y formateadores  (K20, D14, D15, D19)

OLA 3 (1 agente — toca queryKeys, que todo lo demás lee)
  └─ T3.1  Query keys + hooks de TanStack Query  (K25, K26, D17, D18)

OLA 4 (2 agentes en PARALELO)
  ├─ T4.1  Indicador de tipo de cambio en AppLayout  (§5.7, K21, K22, D16)
  └─ T4.2  Enums de notificación + degradación  (K24, D20)

OLA 5 (1 agente — la modificación visible del encargo §4.1)
  └─ T5.1  Los 5 campos de cuota en la vista de oportunidad  (§4.1, D12, D13)

OLA 6 (Opus — auditoría §1.3)
  └─ T6.1  Releer el diff contra los documentos citados
```

---
---

# OLA 1

## T1.1 — Tipos del módulo

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** Plan 01 completo
- **Paralelizable con:** T1.2

**Por qué existe:** `CLAUDE.md` manda mantener `/src/types` como espejo de los DTOs. Los
11 endpoints nuevos no tienen ni un tipo.

### Archivos que toca
- `src/types/simulacion.ts` (crea)
- `src/types/calculadora.ts` (crea)
- `src/types/tipoCambio.ts` (crea)
- `src/types/enums.ts` (modifica)
- `src/types/index.ts` (modifica — re-exports)

### Fuente
`docs/contrato_api.md` §22, §23, §24 y §26. **Leerlas antes de escribir.** Los ejemplos
de response de §23 son la referencia literal del shape.

### Pasos

**Paso 1.** En `src/types/enums.ts`, añadir el enum de modo:

```ts
/** Modos de simulación. Inmutable tras la creación (contrato §23, reglas §2). */
export type ModoSimulacion = 'leasing' | 'credito_directo'
```

**Paso 2.** Añadir el tipo de evento del historial:

```ts
/**
 * Solo los eventos CON snapshot aparecen en `GET /simulaciones/:id/historial`.
 * `marcada_principal`, `enlazada_a_item` y `eliminada` existen en la bitácora del
 * backend pero no se devuelven acá (contrato §23).
 */
export type TipoEventoSimulacion = 'creada' | 'editada' | 'restaurada'
```

**Paso 3.** Crear `src/types/simulacion.ts`. Copiar el shape **exacto** del response de
`POST /simulaciones` (contrato §23). Atención a los tipos: los montos son `string`,
`plazo_meses` y `dias_trabajados` son `number` (K19):

```ts
import type { ModoSimulacion, TipoEventoSimulacion } from './enums'
import type { Modelo } from './catalogos'

export interface Simulacion {
  id: number
  /** Real o autogenerado al leer. El autogenerado nunca se persiste (reglas §8.1). */
  nombre: string
  /**
   * `false` cuando `nombre` salió autogenerado. Un nombre manual es PEGAJOSO: no se
   * regenera nunca, ni al editar parámetros ni al enlazar a un ítem (reglas §8.1).
   * Úsalo para decidir si mostrar el nombre como placeholder editable o como valor.
   */
  nombre_es_manual: boolean
  /** INMUTABLE tras la creación. Un PATCH que lo cambie responde 409 MODO_INMUTABLE. */
  modo: ModoSimulacion
  id_oportunidad_item: number | null
  /** Derivado del ítem por el backend, para agrupar sin resolverlo en el cliente. */
  id_oportunidad: number | null
  id_modelo: number | null
  modelo: Pick<Modelo, 'id' | 'codigo'> | null
  id_simulacion_origen: number | null
  precio_venta: string
  descuento: string
  cuota_inicial: string
  plazo_meses: number
  /** Escala 1-100 (14.00 = 14%). NO es la escala fraccionaria de `financiadoras` (§7.6). */
  tea: string
  valor_residual: string
  dias_trabajados: number
  comision_estructuracion: string
  /**
   * SOLO LECTURA. El backend la recalcula server-side al crear, actualizar, restaurar
   * y bifurcar. NUNCA enviarla en un body — se ignora (reglas §4).
   */
  cuota_final: string
  /** Sin ítem es siempre `false` (CHECK del backend). */
  es_principal: boolean
  created_at: string
  updated_at: string
  /**
   * Fecha de purga prevista: `created_at + 30 días` mientras no esté enlazada.
   * `null` en cuanto se enlaza — enlazarla la salva de forma DEFINITIVA (reglas §5).
   * Debe ser visible en la UI, no solo lógica de servidor.
   */
  eliminacion_prevista_el: string | null
}
```

**Paso 4.** En el mismo archivo, el cronograma. Ojo con los `null` del mes 0:

```ts
/**
 * Una fila del cronograma. El MES 0 es la fila de la cuota inicial: `interes`,
 * `igv`, `cuota` y `cuota_con_igv` vienen `null` y se renderizan EN BLANCO, no
 * como "0.00" (encargo §5.4).
 * `igv` es `null` en TODAS las filas cuando `modo = 'leasing'`: ese modo no
 * desglosa IGV y su tabla no lleva esa columna (reglas §3.3).
 */
export interface FilaCronograma {
  mes: number
  saldo_inicial: string
  amortizacion: string
  interes: string | null
  igv: string | null
  saldo_final: string
  cuota: string | null
  cuota_con_igv: string | null
}

export interface Cronograma {
  cuota_final: string
  cuota_financiera: string
  valor_venta: string
  igv: string
  principal: string
  /** NUNCA redondeada, a propósito. No la trates como un monto de 2 decimales (§3.1). */
  tasa_nominal_mensual: string
  filas: FilaCronograma[]
}
```

**Paso 5.** El historial:

```ts
export interface CambioDiff {
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
}

export interface EventoHistorial {
  id_evento_log: number
  tipo_evento: TipoEventoSimulacion
  created_at: string
  /** `null` cuando lo generó un job automático. Mostrar "Sistema", no "undefined". */
  created_by: number | null
  /**
   * VACÍO ES LEGÍTIMO Y FRECUENTE: primer evento de la simulación, o una escritura
   * que no tocó parámetros de cálculo. Mostrar "sin cambios de parámetros", nunca
   * como error ni como fila rota (encargo §5.5).
   */
  diff: CambioDiff[]
}
```

**Paso 6.** Los inputs. Solo cinco campos son obligatorios (§7.7):

```ts
/** `POST /simulaciones`. Solo modo, precio_venta, cuota_inicial, plazo_meses y tea
 *  son obligatorios; el resto lo rellena el backend con los defaults de reglas §6.1. */
export interface CrearSimulacionInput {
  modo: ModoSimulacion
  precio_venta: string
  cuota_inicial: string
  plazo_meses: number
  tea: string
  nombre?: string | null
  id_oportunidad_item?: number | null
  id_modelo?: number | null
  descuento?: string
  valor_residual?: string
  dias_trabajados?: number
  comision_estructuracion?: string
}

/**
 * `PATCH /simulaciones/:id`. Todos opcionales.
 * OJO: con todos los campos nullable, "ausente" y "null explícito" son
 * indistinguibles — este PATCH permite ENLAZAR a un ítem pero NO DESENLAZAR (§23).
 * `modo` NO se incluye: es inmutable. Para cambiarlo, `bifurcar`.
 */
export type ActualizarSimulacionInput = Partial<Omit<CrearSimulacionInput, 'modo'>>

/** `POST /simulaciones/:id/bifurcar`. Igual que el PATCH pero SÍ acepta `modo`.
 *  `nombre` nunca se hereda del origen: si no viene, la nueva autogenera el suyo. */
export type BifurcarSimulacionInput = Partial<CrearSimulacionInput>

export interface SimulacionesFiltros {
  id_oportunidad_item?: number
  id_modelo?: number
  modo?: ModoSimulacion
  page?: number
  per_page?: number
  sort?: 'created_at' | 'id' | 'cuota_final' | 'updated_at'
  dir?: 'asc' | 'desc'
}
```

**Paso 7.** Crear `src/types/calculadora.ts`. **No tiene `id`, `created_at`,
`es_principal` ni `nombre`**: no existe fila que los tenga (§24):

```ts
/** `POST /calculadora`. Cero persistencia (reglas §9). `id_empresa`/`id_modelo` son
 *  opcionales y PURAMENTE de presentación: no participan del cálculo. */
export interface CalculadoraInput {
  modo: ModoSimulacion
  precio_venta: string
  cuota_inicial: string
  plazo_meses: number
  tea: string
  id_empresa?: number | null
  id_modelo?: number | null
  descuento?: string
  valor_residual?: string
  dias_trabajados?: number
  comision_estructuracion?: string
}

/**
 * No devuelve `cuota_total`: esa suma solo existe dentro de una oportunidad, donde
 * hay un ítem del cual leer `cuota_financiadora`. Antes de enlazar no hay ítem (§24).
 */
export interface CalculadoraResultado {
  empresa: { id: number; razon_social: string } | null
  modelo: Pick<Modelo, 'id' | 'codigo'> | null
  cronograma: Cronograma
}
```

**Paso 8.** Crear `src/types/tipoCambio.ts`:

```ts
/** `GET /tipo-cambio` (§22). El endpoint devuelve `data: null` con status 200
 *  cuando el job diario aún no pobló ninguna fila — eso NO es un error ni un 404. */
export interface TipoCambio {
  fecha: string
  compra: number
  venta: number
}
```

> Nota: `compra` y `venta` son **`number`** en §22, no `string`. Es la excepción a la
> convención de montos. Verificar contra el contrato antes de tipar; si el contrato dice
> otra cosa → **ESCALAR**.

**Paso 9.** Re-exportar los tres archivos desde `src/types/index.ts`, siguiendo el
patrón de los existentes.

### Verificación
```bash
npm run type-check && npm run lint
```

### Restricción
**No inventar campos.** Si algo del encargo no aparece en el contrato, **escalar**. El
encargo es un resumen; el contrato es la fuente (§2).

---

## T1.2 — `utils/simulacionPermisos.ts`

- **Modelo:** **Opus 5** · **Effort:** medio
- **Depende de:** Plan 01 completo
- **Paralelizable con:** T1.1

**Por qué Opus:** K16 es una trampa de diseño que el backend ya pisó y documentó. Un
error acá no rompe nada visible: le da acceso a `otro` o se lo quita a `analista`, y
nadie lo nota hasta que un usuario real se queja.

### Archivos que toca
- `src/utils/simulacionPermisos.ts` (crea)
- `src/utils/simulacionPermisos.test.ts` (crea)

### Contexto obligatorio

Leer **antes de escribir**: `docs/matriz_permisos.md` §2.15 completo, y §6 del encargo.

La tabla, literal:

| Rol | Módulo Simulaciones | Simulador en su oportunidad | Calculadora |
|---|---|---|---|
| `admin` | Total | Sí | Sí |
| `analista` | **Total** | Sí | Sí |
| `gerencia` | Total | Sí | Sí |
| `vendedor` | **Sin acceso** | Solo donde es el vendedor asignado | Sí |
| `jdv`, `otro` | Sin acceso | No | No |

### Pasos

**Paso 1 — TEST PRIMERO.** Un caso por celda de la tabla. Son 18 (6 roles × 3
capacidades). Escribirlos todos: es una tabla de verdad, y las tablas de verdad se
testean enteras.

```ts
describe('simulacionPermisos', () => {
  describe('puedeVerModuloSimulaciones', () => {
    it.each(['admin', 'gerencia', 'analista'] as const)('permite a %s', (rol) => {
      expect(puedeVerModuloSimulaciones(empleadoCon(rol))).toBe(true)
    })
    it.each(['vendedor', 'jdv', 'otro'] as const)('niega a %s', (rol) => {
      expect(puedeVerModuloSimulaciones(empleadoCon(rol))).toBe(false)
    })
    it('niega sin sesión', () => {
      expect(puedeVerModuloSimulaciones(null)).toBe(false)
    })
  })

  describe('puedeUsarCalculadora', () => {
    // vendedor SÍ entra acá aunque no entre al módulo — es la diferencia clave
    it.each(['admin', 'gerencia', 'analista', 'vendedor'] as const)('permite a %s', /* … */)
    it.each(['jdv', 'otro'] as const)('niega a %s', /* … */)
  })

  describe('puedeSimularEnOportunidad', () => {
    it('permite al vendedor asignado de esa oportunidad', /* … */)
    it('NIEGA al vendedor que no es el asignado', /* … */)
    it('permite a analista en cualquier oportunidad', /* … */)
    it('niega a jdv aunque supervise el equipo', /* … */)
  })

  it('no reutiliza ROLES_APOYO: analista entra y otro no', () => {
    // Regresión de K16. ROLES_APOYO agrupa analista con otro, que aquí están en
    // extremos opuestos. El backend cometió este error y tuvo que centralizar.
    expect(puedeVerModuloSimulaciones(empleadoCon('analista'))).toBe(true)
    expect(puedeVerModuloSimulaciones(empleadoCon('otro'))).toBe(false)
  })

  it('no reutiliza ROLES_SUPERVISION: jdv no entra', () => {
    expect(puedeVerModuloSimulaciones(empleadoCon('jdv'))).toBe(false)
  })
})
```

**Paso 2.** Escribir el módulo. La cabecera **debe** explicar la inversión, o alguien la
"corregirá" en seis meses:

```ts
/**
 * Punto ÚNICO de decisión de acceso al módulo de Simulaciones.
 *
 * ⚠ Este es el único módulo del CRM donde el reparto de `analista` y `jdv` se
 * INVIERTE respecto al resto (`matriz_permisos.md` §2.15):
 *
 *   - `analista` es de solo lectura en oportunidades pero tiene escritura COMPLETA
 *     acá: es el rol dueño del módulo.
 *   - `jdv` es supervisor en oportunidades pero NO tiene ningún acceso acá.
 *
 * Por eso NO se reutilizan `ROLES_APOYO` ni `ROLES_SUPERVISION` de `authStore`:
 * la primera agrupa `analista` con `otro`, que acá están en extremos opuestos; la
 * segunda incluye a `jdv`, que acá no entra. El backend cometió exactamente este
 * error y tuvo que centralizar la decisión en un punto propio (`SimulacionPermisos`).
 *
 * Las constantes viven acá dentro a propósito: junto a las de `authStore` invitarían
 * a que alguien tomara la lista equivocada por parecido.
 *
 * Guards de UX, no de seguridad (`CLAUDE.md` regla 8): ocultar un botón no protege
 * nada — eso lo hace el backend, que responde 404 a los recursos ajenos (§23).
 */
const ROLES_MODULO_SIMULACIONES: Rol[] = ['admin', 'gerencia', 'analista']
const ROLES_CALCULADORA: Rol[] = ['admin', 'gerencia', 'analista', 'vendedor']
```

**Paso 3.** Las tres funciones. `puedeSimularEnOportunidad` es la única por recurso:

```ts
/**
 * El simulador dentro de una oportunidad concreta. Para `vendedor` el permiso es
 * POR RECURSO: solo donde él es el vendedor asignado (§2.15). Para admin, gerencia
 * y analista, cualquiera.
 */
export function puedeSimularEnOportunidad(
  empleado: Empleado | null,
  oportunidad: Pick<Oportunidad, 'id_vendedor'>,
): boolean {
  if (!empleado) return false
  if (ROLES_MODULO_SIMULACIONES.includes(empleado.rol)) return true
  if (empleado.rol === 'vendedor') return oportunidad.id_vendedor === empleado.id
  return false
}
```

**Paso 4.** Verificar que los 18 casos pasan.

### Verificación
```bash
npm run test -- simulacionPermisos && npm run lint
```

### Restricción
**No tocar `src/store/authStore.ts`.** Si te parece que alguna constante de ahí debería
cambiar → reportarlo, no cambiarlo.

---
---

# OLA 2

## T2.1 — Capa API: los 11 endpoints

- **Modelo:** Sonnet 5 · **Effort:** alto
- **Depende de:** T1.1
- **Paralelizable con:** T2.2

### Archivos que toca
- `src/api/simulaciones.ts` (crea)
- `src/api/calculadora.ts` (crea)
- `src/api/tipoCambio.ts` (crea)

### Fuente
`docs/contrato_api.md` §22, §23, §24. Seguir el patrón de `src/api/oportunidades.ts`:
objeto exportado con métodos, usando los helpers `get`/`post`/`put`/`patch`/`del` de
`./client`.

### Pasos

**Paso 1.** `src/api/simulaciones.ts` con los 10 métodos. Mapeo literal:

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/simulaciones` | `crear(input)` |
| `GET` | `/simulaciones` | `listar(filtros)` → devuelve el envelope completo (paginado) |
| `GET` | `/simulaciones/:id` | `obtener(id)` |
| `GET` | `/simulaciones/:id/cronograma` | `cronograma(id)` |
| `PATCH` | `/simulaciones/:id` | `actualizar(id, input)` |
| `DELETE` | `/simulaciones/:id` | `eliminar(id)` → 204, sin body |
| `GET` | `/simulaciones/:id/historial` | `historial(id)` |
| `POST` | `/simulaciones/:id/restaurar` | `restaurar(id, idEventoLog)` |
| `POST` | `/simulaciones/:id/bifurcar` | `bifurcar(id, input)` |
| `PATCH` | `/simulaciones/:id/principal` | `marcarPrincipal(id)` → **body vacío** |

**Paso 2.** `listar` devuelve `ApiResponse<Simulacion[]>` (con `meta` de paginación),
igual que `oportunidadesApi.listar`. Los demás devuelven `res.data` pelado.

**Paso 3.** Comentarios en los métodos con trampa:

```ts
  /**
   * "Guardar como Nueva Simulación". ÚNICA vía autorizada para cambiar de `modo`:
   * acá sí se aplica y nunca responde 409 (§23). Crea una fila nueva; el origen
   * queda intacto y no recibe evento propio.
   * `nombre` NO se hereda del origen: dos simulaciones no pueden compartir título
   * autogenerado.
   */
  bifurcar: async (id: number, input: BifurcarSimulacionInput): Promise<Simulacion> => {

  /**
   * Marca como principal de su ítem. Body VACÍO.
   * Sin ítem responde `400 VALIDACION` (no puede ser principal sin ítem).
   * Ya principal es un NO-OP EXITOSO, no un error (§23) — no lo trates como fallo.
   */
  marcarPrincipal: async (id: number): Promise<Simulacion> => {
    const res = await patch<Simulacion>(`/simulaciones/${id}/principal`)
    return res.data
  },

  /**
   * El 404 acá cubre CUATRO motivos (no existe, no es de esta simulación, fuera de
   * la ventana de 7 días/15 versiones, o tipo no restaurable) y el backend NO
   * distingue cuál falló, a propósito. El mensaje al usuario debe ser genérico:
   * "esa versión ya no se puede restaurar" (encargo §9).
   */
  restaurar: async (id: number, idEventoLog: number): Promise<Simulacion> => {
    const res = await post<Simulacion>(`/simulaciones/${id}/restaurar`, {
      id_evento_log: idEventoLog,
    })
    return res.data
  },
```

**Paso 4.** `src/api/calculadora.ts` — un solo método, sin persistencia:

```ts
/**
 * Cálculo efímero. CERO persistencia: no escribe en `simulaciones` ni en la
 * bitácora, ni siquiera auditoría (reglas §9). Por eso es un POST que no invalida
 * ninguna query — no hay nada que sincronizar.
 *
 * "Enlazar a Oportunidad" NO es un endpoint de acá: es literalmente
 * `POST /simulaciones` con los mismos parámetros más el `id_oportunidad_item` (§24).
 */
export const calculadoraApi = {
  calcular: async (input: CalculadoraInput): Promise<CalculadoraResultado> => {
    const res = await post<CalculadoraResultado>('/calculadora', input)
    return res.data
  },
}
```

**Paso 5.** `src/api/tipoCambio.ts`. **`data` puede ser `null` con status 200** (§22):

```ts
export const tipoCambioApi = {
  /**
   * `data: null` con 200 es una respuesta VÁLIDA y esperada: el job diario todavía
   * no pobló ninguna fila. No es un 404 ni un error (§22). El tipo de retorno lo
   * refleja para que el consumidor esté obligado a tratarlo.
   */
  obtener: async (): Promise<TipoCambio | null> => {
    const res = await get<TipoCambio | null>('/tipo-cambio')
    return res.data
  },
}
```

### Verificación
```bash
npm run type-check && npm run lint
```

### Restricción
**Cero lógica de negocio acá.** Esta capa transporta. Formateo, defaults y decisiones van
en `utils/` (T2.2) o en los hooks (T3.1). `CLAUDE.md` regla 11.

---

## T2.2 — `utils/simulaciones.ts`: defaults y formateadores

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T1.1
- **Paralelizable con:** T2.1

### Archivos que toca
- `src/utils/simulaciones.ts` (crea)
- `src/utils/simulaciones.test.ts` (crea)

### Pasos

**Paso 1 — TEST PRIMERO.** Los casos que capturan K19, K20, D12 y D15:

```ts
describe('formatoCuota', () => {
  it('nunca muestra null como cero', () => {
    expect(formatoCuota(null)).not.toContain('0')
  })
  it('nunca muestra null como un guion suelto que parezca un monto', () => {
    // Encargo §4.1: "jamás como cero ni como guion suelto que parezca un monto"
    expect(formatoCuota(null)).not.toBe('—')
    expect(formatoCuota(null)).not.toBe('-')
  })
  it('formatea un monto normal', () => {
    expect(formatoCuota('1234.56')).toContain('1,234.56')
  })
})

describe('formatoTea', () => {
  it('trata la escala 1-100, no la fraccionaria de financiadoras', () => {
    // Encargo §7.6: acá 14.00 = 14%. En `financiadoras` la misma clave es fraccionaria.
    expect(formatoTea('14.00')).toBe('14.00%')
  })
})

describe('formatoTasa', () => {
  it('no redondea la TNM a 2 decimales', () => {
    // reglas §3.1: "La Tasa Nominal Mensual no se redondea nunca"
    expect(formatoTasa('1.0948912345')).toBe('1.094891%')
  })
})
```

**Paso 2.** Los defaults (D19, K23). El comentario importa tanto como el valor:

```ts
/**
 * Parámetros por defecto del simulador (`reglas_simulaciones.md` §6.1, encargo §7.7).
 * Constantes de código, no configurables en BD.
 *
 * Se usan para PRELLENAR el formulario, no para completar el request: el backend
 * rellena exactamente estos mismos valores si los campos se omiten. Enviarlos es
 * redundante pero inofensivo; lo que sería un bug es que estas dos tablas divergieran.
 * Si cambian en el backend, cambian acá en el mismo commit.
 *
 * `precio_venta` y `descuento` NO están acá: se toman del ítem.
 */
export const DEFAULTS_SIMULACION = {
  plazo_meses: 48,
  tea: '14',
  cuota_inicial: '45000',
  valor_residual: '25000',
  dias_trabajados: 22,
  comision_estructuracion: '1180',
} as const
```

**Paso 3.** Los formateadores. `formatoCuota` implementa D12:

```ts
/**
 * Cuota para mostrar. `null` NO es cero ni un guion: es "no se puede calcular
 * todavía". Un guion suelto se lee como un monto vacío y el encargo §4.1 lo prohíbe
 * explícitamente.
 */
export function formatoCuota(valor: string | null): string {
  if (valor === null) return 'Sin calcular'
  return formatoMonto(valor)
}
```

**Paso 4.** `formatoTea` (D14) y `formatoTasa` (D15), con los JSDoc que citan §7.6 y
§3.1 para que nadie los unifique con los formateadores existentes "por DRY".

**Paso 5.** Las validaciones proactivas del encargo §7.6. **UX, no seguridad**
(`CLAUDE.md` regla 7):

```ts
/**
 * Validaciones que el backend impone (§13 de reglas). Replicarlas acá evita el
 * round-trip, pero la validación AUTORITATIVA es siempre la del backend: hay que
 * manejar el `400 VALIDACION` igual (CLAUDE.md regla 7).
 */
export function validarCuotaInicial(
  cuotaInicial: number,
  precioVenta: number,
  descuento: number,
): string | null {
  const pvEfectivo = precioVenta * (1 - descuento / 100)
  return cuotaInicial < pvEfectivo
    ? null
    : 'La cuota inicial debe ser menor que el precio con descuento'
}

/** `valor_residual < Principal`. El Principal depende del modo, así que se recibe ya
 *  calculado por quien lo tenga — no se recalcula acá (el motor es del backend). */
export function validarValorResidual(valorResidual: number, principal: number): string | null {
  return valorResidual < principal
    ? null
    : 'El valor residual debe ser menor que el principal'
}
```

> **No implementar el motor de cálculo en el cliente.** `reglas_simulaciones.md` §3 es
> del backend. El frontend nunca calcula una cuota: la pide. Si te parece que hace falta
> calcular algo → **ESCALAR**.

### Verificación
```bash
npm run test -- simulaciones && npm run lint
```

---
---

# OLA 3

## T3.1 — Query keys y hooks

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T2.1, T2.2, T1.2
- **Paralelizable con:** nada (toca `queryKeys.ts`, que todo lo demás lee)

**Por qué Opus:** D18 (sincronización 360) es donde `TESTING-frontend.md` §4.4 pone "el
principio crítico". Una invalidación olvidada deja un monto viejo en pantalla sin que
falle ningún tipo ni ningún test que no la busque específicamente.

### Archivos que toca
- `src/hooks/queryKeys.ts` (modifica)
- `src/hooks/queryKeys.test.ts` (modifica)
- `src/hooks/useSimulaciones.ts` (crea)
- `src/hooks/useCalculadora.ts` (crea)
- `src/hooks/useTipoCambio.ts` (crea)
- `src/hooks/useSimulaciones.test.ts` (crea)

### Pasos

**Paso 1.** Añadir las keys a `qk`, respetando el invariante documentado en el propio
archivo (K25, D17):

```ts
  simulaciones: ['simulaciones'] as const,
  simulacion: (id: number) => ['simulaciones', 'detalle', id] as const,
  simulacionCronograma: (id: number) => ['simulaciones', 'detalle', id, 'cronograma'] as const,
  simulacionHistorial: (id: number) => ['simulaciones', 'detalle', id, 'historial'] as const,
  tipoCambio: ['tipo-cambio'] as const,
```

**Paso 2.** Extender `queryKeys.test.ts` con el caso del invariante para las nuevas:
la key del detalle empieza por la de la lista, y las de cronograma/historial empiezan por
la del detalle.

**Paso 3 — TEST PRIMERO.** El test de sincronización 360 (D18), que es el que más valor
tiene de todo el plan:

```ts
it('invalida la oportunidad al editar una simulación', async () => {
  // D18: editar parámetros cambia `cuota_quantum` del ítem y por tanto los tres
  // agregados de la oportunidad. Si no se invalida, el Pipeline y el detalle de
  // la oportunidad siguen mostrando la cuota vieja (CLAUDE.md regla 4).
  const invalidadas: unknown[][] = []
  // …espiar queryClient.invalidateQueries…
  // …ejecutar la mutación de actualizar…
  expect(invalidadas).toContainEqual(['oportunidades', 'detalle', 101])
  expect(invalidadas).toContainEqual(['oportunidades'])
})
```

**Paso 4.** `useSimulaciones.ts`. Queries:

```ts
export function useSimulacionesListado(filtros?: SimulacionesFiltros)
export function useSimulacion(id: number)
export function useCronograma(id: number)
export function useHistorialSimulacion(id: number)
```

Mutaciones — **todas** con la invalidación completa de D18:

```ts
/**
 * Invalidación compartida por TODAS las mutaciones de simulación (D18).
 * Cualquier escritura sobre una simulación cambia `cuota_quantum` del ítem, y con
 * ella `cuota_quantum_total`, `cuota_total` y `cuota_diaria_total` de la
 * oportunidad. Dejar cualquiera de estas fuera deja un monto viejo en pantalla
 * (CLAUDE.md regla 4, TESTING §4.4).
 */
function invalidarTrasEscritura(qc: QueryClient, id: number, idOportunidad: number | null) {
  invalidar(qc, qk.simulaciones, qk.simulacion(id), qk.simulacionCronograma(id),
            qk.simulacionHistorial(id), qk.oportunidades)
  if (idOportunidad !== null) invalidar(qc, qk.oportunidad(idOportunidad))
}
```

Mutaciones: `useCrearSimulacion`, `useActualizarSimulacion`, `useEliminarSimulacion`,
`useRestaurarSimulacion`, `useBifurcarSimulacion`, `useMarcarPrincipal`.

**Paso 5.** `useCalculadora.ts` — **`useMutation`, no `useQuery`** (D17):

```ts
/**
 * La Calculadora es un POST efímero sin persistencia (reglas §9). Se modela como
 * mutación, no como query: no hay recurso que cachear ni invalidar, y una query
 * daría a entender que hay algo guardado del otro lado. No invalida nada.
 */
export function useCalculadora() {
  return useMutation({ mutationFn: calculadoraApi.calcular })
}
```

**Paso 6.** `useTipoCambio.ts` (D16):

```ts
/**
 * Dato global, cambia una vez al día (job de las 09:30 Lima). `data: null` con 200
 * es válido: el job aún no pobló nada (§22). No se reintenta agresivamente ni se
 * refetchea al enfocar la ventana — sería tráfico por un dato diario.
 */
export function useTipoCambio() {
  return useQuery({
    queryKey: qk.tipoCambio,
    queryFn: tipoCambioApi.obtener,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
```

### Verificación
```bash
npm run test -- queryKeys && npm run test -- useSimulaciones && npm run lint && npm run type-check
```

---
---

# OLA 4

## T4.1 — Indicador de tipo de cambio en el layout

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T3.1
- **Paralelizable con:** T4.2
- **Cubre:** encargo §5.7 — **modificación**, no requiere Stitch

### Archivos que toca
- `src/components/IndicadorTipoCambio.tsx` (crea)
- `src/components/IndicadorTipoCambio.test.tsx` (crea)
- `src/components/AppLayout.tsx` (modifica — solo montar el componente)

### Contexto
Seguir el patrón de `src/components/CotizadorFab.tsx` (K22): componente propio con su
test, montado por `AppLayout`. Leerlo antes de escribir.

### Pasos

**Paso 1 — TEST PRIMERO.** El caso que importa es el `null` (D16):

```ts
it('no renderiza nada cuando el backend responde data: null con 200', async () => {
  // §22: es una respuesta VÁLIDA y esperada mientras el job diario no haya poblado
  // la primera fila. No es un 404 ni un error: simplemente no hay indicador.
  servidor.use(http.get('*/tipo-cambio', () =>
    HttpResponse.json({ data: null, meta: null, error: null })))
  const { container } = render(<IndicadorTipoCambio />)
  await waitFor(() => expect(container).toBeEmptyDOMElement())
})

it('no muestra un error cuando no hay dato', async () => {
  // …mismo mock…
  expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
})

it('muestra compra y venta cuando hay dato', async () => { /* … */ })
```

**Paso 2.** El componente. Discreto y permanente (§5.7):

```tsx
/**
 * Tipo de cambio PEN/USD de SUNAT, permanente y discreto en el layout global.
 * Es requisito del LAYOUT, no del módulo de Simulaciones: lo ven todos los roles
 * autenticados (§22 no tiene restricción de rol), incluidos `jdv` y `otro`, que no
 * tienen acceso a Simulaciones.
 *
 * Sin dato no se renderiza nada (D16): `data: null` con 200 es normal mientras el
 * job diario no haya corrido por primera vez.
 */
export function IndicadorTipoCambio() {
  const { data } = useTipoCambio()
  if (!data) return null
  return (/* … */)
}
```

**Paso 3.** Montarlo en `AppLayout.tsx`, en la topbar, junto a las notificaciones.
Seguir la estética de `DESIGN.md` con Ant Design. **Un solo cambio** en `AppLayout`:
montar el componente. No reorganizar la topbar.

**Paso 4.** En mobile (`TopBarMobile.tsx`), evaluar si cabe. Si no, **no forzarlo**: el
requisito dice "discreto en una esquina". Si se decide omitirlo en mobile, dejarlo
comentado y reportarlo.

### Restricción
**No filtrar por rol.** No hereda los permisos de Simulaciones (K21).

### Verificación
```bash
npm run test -- IndicadorTipoCambio && npm run lint && npm run build
```

---

## T4.2 — Enums de notificación y degradación

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T1.1
- **Paralelizable con:** T4.1

**Por qué existe:** K24 y D20. Una notificación de entidad `simulacion` navegaría hoy a
`/undefined/87`.

### Archivos que toca
- `src/types/enums.ts` (modifica)
- `src/components/NotificacionesDropdown.tsx` (modifica)
- `src/components/NotificacionesDropdown.test.tsx` (modifica)

### Pasos

**Paso 1.** Verificar los nombres exactos contra `docs/contrato_api.md` §26. Añadir
`'simulacion_por_expirar'` a `TipoNotificacion` y `'simulacion'` a `EntidadNotificacion`.

**Paso 2 — TEST PRIMERO:**

```ts
it('no navega a una ruta inválida con una notificación de simulación', () => {
  // K24: el mapa RUTA_ENTIDAD no tiene entrada para `simulacion`, así que hoy
  // construiría `/undefined/87`. Hasta que exista la ruta del módulo (Plan 04),
  // la fila se muestra sin enlace (D20).
})
```

**Paso 3.** En `NotificacionesDropdown.tsx:41-48`, añadir `simulacion` a la rama de
entidades **sin navegación**:

```ts
    // D20: la ruta del módulo de Simulaciones todavía no existe (llega en el Plan
    // 04). Hasta entonces, la notificación se muestra pero no navega — mejor eso
    // que mandar al usuario a `/undefined/87`.
    // TODO(Plan 04): conectar a `/simulaciones/:id` cuando la ruta exista.
    if (n.entidad_tipo === 'simulacion') return
```

**Paso 4.** Verificar que el `switch`/mapa no tenga un `default` que trague el caso. Si
lo tiene, tiparlo exhaustivamente para que `tsc` obligue a tratar valores nuevos.

### Verificación
```bash
npm run test -- NotificacionesDropdown && npm run type-check
```

---
---

# OLA 5

## T5.1 — Los 5 campos de cuota en la oportunidad

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T3.1, T2.2
- **Cubre:** encargo §4.1 y la Fase 1 de §10 — **modificación**, no requiere Stitch

**Por qué Opus:** es donde se cruzan las tres trampas del encargo: la regla de `null`
conjunto, la colisión de nombres de `cuota_total`, y la prohibición de mostrar `null`
como cero. Las tres son errores que compilan y se ven bien en pantalla.

### Archivos que toca
- `src/components/CuotaOportunidad.tsx` (crea)
- `src/components/CuotaOportunidad.test.tsx` (crea)
- `src/pages/OportunidadDetalle/PropiedadesCard.tsx` (modifica)
- `src/pages/OportunidadDetalle/PropiedadesCard.test.tsx` (modifica)

### Contexto obligatorio
Releer el encargo §4.1 completo, incluida la advertencia del nombre repetido y las dos
reglas de `null`.

### Pasos

**Paso 1 — TESTS PRIMERO.** Los cuatro casos que capturan las reglas del encargo:

```ts
describe('CuotaOportunidad', () => {
  it('muestra "todavía no se puede calcular" cuando los tres campos son null', () => {
    // Encargo §4.1: los tres son null CONJUNTAMENTE si cualquier ítem no tiene
    // cuota calculable. Jamás como cero.
    render(<CuotaOportunidad oportunidad={sinCuotas} />)
    expect(screen.getByText(/todavía no se puede calcular/i)).toBeInTheDocument()
    expect(screen.queryByText('0.00')).not.toBeInTheDocument()
  })

  it('no dispara un toast de error cuando un ítem tiene cuota_quantum null', () => {
    // Encargo §4.1: "degradación silenciosa esperada, NUNCA un error".
  })

  it('distingue la cuota por unidad del ítem de la cuota total de la operación', () => {
    // Encargo §4.1: `cuota_total` existe en DOS niveles con significados distintos.
    // El ítem vale 2172.06 (una unidad); la raíz 17376.48 (toda la operación).
    render(<CuotaOportunidad oportunidad={conCuotas} />)
    expect(screen.getByText(/cuota mensual total/i)).toHaveTextContent('17,376.48')
    expect(screen.queryByText(/cuota mensual total/i)).not.toHaveTextContent('2,172.06')
  })

  it('muestra la cuota diaria', () => { /* cuota_total / 22 */ })
})
```

**Paso 2.** El componente. Los tres campos de raíz se tratan como **un bloque** (D12):

```tsx
/**
 * Los tres campos de cuota de nivel oportunidad (encargo §4.1).
 *
 * Son `null` LOS TRES A LA VEZ si cualquier ítem no tiene cuota calculable — por eso
 * se comprueban juntos y no uno por uno. Se muestra "todavía no se puede calcular",
 * jamás cero ni un guion que parezca un monto.
 *
 * ⚠ `cuota_total` de la raíz NO es `cuota_total` del ítem: acá es el total mensual de
 * toda la operación, ya multiplicado por cantidades; en el ítem es la cuota de una
 * sola unidad de ese modelo. Por eso las etiquetas son distintas (D13).
 */
export function CuotaOportunidad({ oportunidad }: { oportunidad: Oportunidad }) {
  const sinCalcular = oportunidad.cuota_quantum_total === null
  if (sinCalcular) {
    return (
      <Tooltip title="Algún ítem no tiene una cuota calculable todavía. Revisa que todos tengan modelo, cantidad y precio.">
        <span className="text-text-secondary">Todavía no se puede calcular</span>
      </Tooltip>
    )
  }
  /* … "Cuota mensual total", "Cuota Quantum", "Cuota diaria" … */
}
```

**Paso 3.** En `PropiedadesCard`, montar `<CuotaOportunidad />` en el bloque de resumen,
junto a `monto_total`.

**Paso 4.** En la fila de cada ítem (creada en el Plan 01 T3.1), añadir
`cuota_quantum` y `cuota_total` del ítem con las etiquetas del ítem (D13):
**"Cuota Quantum por unidad"** y **"Cuota mensual por unidad"**. Usar `formatoCuota`
(T2.2), que ya trata el `null`.

**Paso 5.** Verificar que **ningún** camino muestra un toast por un `cuota_quantum` nulo.
Buscar `message.error` / `notification.error` en el archivo y confirmar que ninguno se
dispara por esto.

### Restricciones
- **No** construir todavía el simulador ni el formulario de parámetros: es del Plan 04
  (D21), porque depende del cronograma.
- **No** calcular ninguna cuota en el cliente. Si el backend manda `null`, se muestra
  como no calculable — no se estima.

### Verificación
```bash
npm run test -- CuotaOportunidad && npm run test -- PropiedadesCard && npm run lint && npm run build
```

---
---

# OLA 6

## T6.1 — Auditoría del diff contra los documentos citados

- **Modelo:** **Opus 5** · **Effort:** alto
- **Depende de:** T5.1
- **Exigida por:** §1.3 del encargo

### Archivos que toca
Ninguno. Produce `docs/planes/plan-03-cimientos-auditoria.md`.

### Pasos

**Paso 1.** `git diff main...HEAD`.

**Paso 2.** Releerlo contra **cada** documento citado en
`plan-02-mapa-cimientos-simulaciones.md` §1.2, buscando contradicciones con reglas que
**ya estaban escritas correctamente** antes de empezar.

**Paso 3.** Los greps de control de este plan:

```bash
# D11: cero lógica de rol de simulaciones fuera del módulo de permisos
grep -rn "analista\|jdv" src --include=*.tsx | grep -iv "simulacionPermisos" | grep -i "simulac"

# D11: no se reutilizaron las constantes equivocadas
grep -rn "ROLES_APOYO\|ROLES_SUPERVISION" src | grep -i "simulac"

# D12: ningún campo de cuota renderizado como guion suelto
grep -rn "cuota.*'—'\|cuota.*\"—\"" src --include=*.tsx

# CLAUDE.md regla 2
grep -rn ": any\|as any" src --include=*.ts --include=*.tsx

# CLAUDE.md regla 5: HTTP solo en /src/api/
grep -rn "axios\.\|fetch(" src --include=*.tsx

# El motor de cálculo NO se implementa en el cliente (reglas §3 es del backend)
grep -rniE "Math\.pow.*1/12|\*\* \(1 ?/ ?12\)|calcularCuotaFinal|calcularPMT" src
```

Los seis deben salir vacíos.

**Paso 4.** Verificación completa:
```bash
npm run type-check && npm run lint && npm run test && npm run build
```

**Paso 5.** Informe con hallazgos numerados (`B1`, `B2`…), cada uno con archivo:línea,
documento y sección contradicha, y corrección propuesta. **No corregirlos.**

---
---

## Checklist de cierre del Plan 02/03

- [ ] `type-check`, `lint`, `test`, `build` en verde
- [ ] Los 6 greps de control limpios
- [ ] Los 18 casos de la tabla de permisos pasan (T1.2)
- [ ] El test de sincronización 360 pasa (T3.1)
- [ ] Los 5 campos de cuota se ven, y los `null` dicen "todavía no se puede calcular"
- [ ] El indicador de tipo de cambio aparece, y desaparece limpio con `data: null`
- [ ] Informe de auditoría escrito
- [ ] **Parada obligatoria:** resumir antes del Plan 04 (§10 del encargo)
