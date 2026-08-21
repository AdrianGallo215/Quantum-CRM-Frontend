# Plan de implementación — Fixes de auditoría de código post-MVP

**Fecha:** 2026-08-18
**Origen:** Auditoría completa de código (119 archivos / 14.387 líneas) tras cierre del MVP.
**Contexto crítico:** El MVP terminó. Las excepciones "se omite en el MVP" ya NO aplican.
Todas las reglas de `CLAUDE.md` están activas desde hoy, incluida la regla 1 (TDD obligatorio).

---

## Cómo usar este documento

Cada tarea es **atómica y autocontenida**. El agente ejecutor:

1. Lee SOLO su tarea asignada.
2. Ejecuta los pasos **literalmente**, en orden.
3. Corre el comando de verificación. Si pasa, termina y reporta.
4. Si algo no coincide con lo descrito (línea distinta, contenido inesperado, error no previsto)
   → **DETENERSE y escalar**. No improvisar, no "arreglar por el camino", no ampliar el alcance.

### Formato de escalación

Si un agente debe escalar, responde con exactamente este bloque y nada más:

```
ESCALACION
Tarea: <ID>
Paso: <nº de paso>
Esperado: <lo que el plan decía que encontraría>
Encontrado: <lo que realmente hay>
Pregunta: <la decisión concreta que necesita>
```

### Reglas globales para TODOS los agentes

- **Idioma:** todo comentario, mensaje de commit, string de UI y nombre de test en **español**.
  El codebase es íntegramente español. Sigue la densidad de comentarios del archivo que tocas.
- **NUNCA `any`.** Usa `unknown` + narrowing.
- **NO hacer commit** salvo que la tarea lo diga explícitamente.
- **NO tocar archivos fuera de la lista "Archivos que toca"** de tu tarea. Ni siquiera para
  arreglar algo que veas mal — repórtalo en tu salida final.
- **NO ejecutar `git checkout`, `git reset`, `git restore`, `git clean` ni `rm -rf`.**
- Ejecuta siempre desde la raíz del repo:
  `c:\Users\Ventas\Desktop\Quantum Projects\CRM FrontEnd - copia`
- Al terminar, reporta: archivos modificados, salida del comando de verificación, y cualquier
  anomalía observada.

---

## Grafo de dependencias y olas de despliegue

```
OLA 1 (1 agente, secuencial — bloquea todo)
  └─ T0.1  Infraestructura de testing (Vitest + Testing Library + MSW)

OLA 2 (2 agentes en PARALELO — conjuntos de archivos disjuntos)
  ├─ T0.2  ESLint 9 + typescript-eslint
  └─ T0.3  Endurecer tsconfig + 3 errores resultantes

OLA 3 (2 agentes en PARALELO — conjuntos de archivos disjuntos)
  ├─ T1.A  Enums: tipo_accion (email→correo) + Rol (+otro)
  └─ T1.B  Enums: entidad_notificacion (meta→meta_venta)

OLA 4 (1 agente — toca enums.ts, depende de T1.A)
  └─ T1.C  Enums: aplicacion_enum (quitar 'otro', tipar)

OLA 5 (1 agente — alta complejidad, effort alto)
  └─ T2.1  Interceptor de Axios: 401 en cambio de contraseña, bandera latch, dedup

OLA 6 (1 agente — refactor transversal de query keys)
  └─ T3.1  Query keys jerárquicas + invalidaciones de contactos

OLA 7 (3 agentes en PARALELO — conjuntos disjuntos)
  ├─ T4.1  Guardado parcial silencioso en PropiedadesCard
  ├─ T5.1  Constantes de rol en el router
  └─ T5.2  useEmpleadosSeleccionables: exponer loading/error

OLA 8 (2 agentes en PARALELO)
  ├─ T5.3  Math duplicada en PropiedadesCard  (depende de T4.1: mismo archivo)
  └─ T5.4  Constante compartida de ruta /cambiar-contrasena

OLA 9 (1 agente)
  └─ T6.1  Límite de tamaño de archivo: alinear con contrato configurable

OLA 10 (1 agente — añadida 2026-08-20, tras confirmación de backend PR #9)
  └─ T7.1  authStore.ts: ROLES_APOYO + corregir ROLES_FACTURA (depende de T1.A)

OLA 11 (6 agentes en PARALELO — restricción de escritura para roles de apoyo)
  ├─ T7.2  Ocultar "Nueva empresa"/"Nueva oportunidad" en listados
  ├─ T7.3  EmpresaDetallePage.tsx: editar, estado-cartera, nueva gestión
  ├─ T7.4  PropiedadesCard.tsx: 3 triggers de modal + 4 controles inline
  ├─ T7.5  OportunidadDetallePage.tsx: stepper completo + cerrar oportunidad
  ├─ T7.6  ContactosCard.tsx (oportunidad): vincular y desvincular
  └─ T7.7  DocumentosDrive.tsx: crear carpeta y subir archivo (ambos contextos)
```

**Regla de paralelismo:** dos tareas solo van en paralelo si sus listas
"Archivos que toca" son **completamente disjuntas**. Verificado tarea por tarea abajo.

---
---

# OLA 1

## T0.1 — Infraestructura de testing (Vitest + Testing Library + MSW)

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** nada
- **Paralelizable con:** nada (modifica `package.json`, que casi todas las demás leen)
- **Por qué existe:** `CLAUDE.md` regla 1 exige TDD y `npm run test` como gate pre-commit.
  Hoy `"test"` es `echo … && exit 0` y no hay ni un archivo de test. Sin esto, ninguna
  tarea posterior puede cumplir la regla 1.

### Archivos que toca
- `package.json` (modifica)
- `vitest.config.ts` (crea)
- `src/test/setup.ts` (crea)
- `src/test/servidor-mock.ts` (crea)
- `src/test/utilidades.tsx` (crea)
- `src/utils/monto.test.ts` (crea — test de humo)
- `tsconfig.json` (modifica: SOLO añadir `types`)
- `.gitignore` (modifica: añadir `coverage/`)

### Pasos

**Paso 1.** Instalar dependencias de desarrollo con versiones exactas:

```bash
npm install -D vitest@4.1.10 @vitest/coverage-v8@4.1.10 jsdom@30.0.1 \
  @testing-library/react@16.3.2 @testing-library/jest-dom@7.0.1 \
  @testing-library/user-event@14.6.5 msw@2.15.0
```

Si la instalación falla por conflicto de peer dependencies → **ESCALAR**. No usar `--force`
ni `--legacy-peer-deps`.

**Paso 2.** Crear `vitest.config.ts` en la raíz con exactamente este contenido:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Se excluye lo que no contiene lógica verificable: tipos (solo
      // declaraciones), el arranque de la app y el propio andamiaje de test.
      exclude: ['src/types/**', 'src/main.tsx', 'src/test/**', '**/*.config.*'],
    },
  },
})
```

**Paso 3.** Crear `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { servidorMock } from './servidor-mock'

// Ant Design usa matchMedia para sus breakpoints responsive; jsdom no lo implementa.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

// Varias tablas de Ant Design miden el contenedor con ResizeObserver.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// `error` corta el test ante cualquier request que no tenga handler declarado:
// una petición no prevista es un fallo de la prueba, no un silencio aceptable.
beforeAll(() => servidorMock.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  servidorMock.resetHandlers()
  cleanup()
})
afterAll(() => servidorMock.close())
```

**Paso 4.** Crear `src/test/servidor-mock.ts`:

```ts
import { setupServer } from 'msw/node'

/**
 * Servidor MSW compartido por toda la suite. Arranca sin handlers: cada test
 * declara los suyos con `servidorMock.use(...)`, y `resetHandlers()` los retira
 * al terminar para que ninguna prueba herede el mock de otra.
 */
export const servidorMock = setupServer()

/** Base que deben usar los handlers, igual que `VITE_API_BASE_URL` en runtime. */
export const BASE_API = 'http://localhost/api/v1'
```

**Paso 5.** Crear `src/test/utilidades.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import esES from 'antd/locale/es_ES'
import { MemoryRouter } from 'react-router-dom'

/**
 * QueryClient nuevo por test, con reintentos apagados: en pruebas un reintento
 * solo añade latencia y esconde el error que se está verificando.
 */
export function crearQueryClientDePrueba(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface OpcionesRender extends Omit<RenderOptions, 'wrapper'> {
  rutaInicial?: string
  queryClient?: QueryClient
}

/**
 * `render` con todos los providers que la app monta en App.tsx. Usar SIEMPRE
 * este en vez del `render` crudo de Testing Library: sin ConfigProvider/AntApp
 * los componentes que llaman a `App.useApp()` caen al fallback estático de antd.
 */
export function renderConProviders(ui: ReactElement, opciones: OpcionesRender = {}) {
  const { rutaInicial = '/', queryClient = crearQueryClientDePrueba(), ...resto } = opciones

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={{ token: {} }} locale={esES}>
          <AntApp>
            <MemoryRouter initialEntries={[rutaInicial]}>{children}</MemoryRouter>
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    )
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...resto }) }
}

export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
```

**Paso 6.** En `package.json`, reemplazar la línea del script `test`. Buscar exactamente:

```json
    "test": "echo \"tests: omitidos en MVP por decision de producto\" && exit 0"
```

Reemplazar por:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
```

(`test:coverage` está documentado en `CLAUDE.md` línea 24 y hoy no existe.)

**Paso 7.** En `tsconfig.json`, dentro de `compilerOptions`, añadir la clave `types`
inmediatamente después de la línea `"noFallthroughCasesInSwitch": true,`:

```json
    "types": ["vitest/globals", "@testing-library/jest-dom"],
```

**Paso 8.** Añadir `coverage/` a `.gitignore` (una línea al final, si no está ya).

**Paso 9.** Crear el test de humo `src/utils/monto.test.ts`. Este test verifica que la
infraestructura funciona y cubre una función pura ya existente:

```ts
import { describe, expect, it } from 'vitest'
import { calcularMontoTotal } from './monto'

describe('calcularMontoTotal', () => {
  it('multiplica cantidad por precio cuando no hay descuento', () => {
    expect(calcularMontoTotal(3, '1000.00', '0')).toBe(3000)
  })

  it('aplica el descuento como porcentaje del bruto', () => {
    expect(calcularMontoTotal(2, '1000.00', '10')).toBe(1800)
  })

  it('redondea a dos decimales', () => {
    expect(calcularMontoTotal(3, '10.005', '0')).toBe(30.02)
  })

  it('devuelve 0 si algún valor no es numérico', () => {
    expect(calcularMontoTotal(2, 'abc', '10')).toBe(0)
  })

  it('trata null y undefined como cero', () => {
    expect(calcularMontoTotal(null, undefined, null)).toBe(0)
  })
})
```

### Verificación

```bash
npm run test && npm run type-check
```

Debe imprimir 5 tests pasando y el type-check limpio.

Si `calcularMontoTotal(3, '10.005', '0')` NO da `30.02` → **NO cambies `monto.ts`**.
Reporta el valor real obtenido en tu salida final y ajusta esa única aserción al valor real.
El resto de aserciones deben pasar tal cual; si alguna otra falla → **ESCALAR**.

### Criterio de terminado
- `npm run test` ejecuta Vitest de verdad y pasa.
- `npm run test:coverage` existe y corre.
- `npm run type-check` sigue limpio.

---
---

# OLA 2 — Dos agentes en PARALELO

> **Disjunción verificada:** T0.2 toca `package.json` + `eslint.config.js`.
> T0.3 toca `tsconfig.json` + 2 archivos de `src/`. Sin solape.

## T0.2 — ESLint 9 + typescript-eslint

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T0.1
- **Paralelizable con:** T0.3
- **Por qué existe:** `CLAUDE.md` línea 25 documenta `npm run lint` como ESLint; hoy es un
  `echo`. Sin linter, las reglas 2 (`any`) y 9 (`dangerouslySetInnerHTML`) no tienen
  enforcement automático y dependen de que un humano lea el diff.

### Archivos que toca
- `package.json` (modifica)
- `eslint.config.js` (crea)

### Pasos

**Paso 1.** Instalar:

```bash
npm install -D eslint@9.39.5 typescript-eslint@8.67.0 \
  eslint-plugin-react-hooks@7.1.1 eslint-plugin-react-refresh@0.5.4 \
  globals@16.5.0 @eslint/js@9.39.5
```

Si falla por peer dependencies → **ESCALAR**. No usar `--force`.

**Paso 2.** Crear `eslint.config.js` en la raíz:

```js
// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', 'docs/stitch-prototypes'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // CLAUDE.md regla 2: NUNCA `any`. Esto le da enforcement automático.
      '@typescript-eslint/no-explicit-any': 'error',

      // El codebase usa `void promesa` deliberadamente en handlers de antd
      // (onClick, onOk) para marcar promesas no esperadas. Sin esta opción,
      // no-floating-promises marcaría ~40 sitios correctos.
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
    },
  },
  {
    // Los tests usan globals de Vitest y aserciones que disparan reglas
    // pensadas para código de producción.
    files: ['src/test/**', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },
)
```

**Paso 3.** En `package.json`, buscar exactamente:

```json
    "lint": "echo \"lint: pendiente de configurar (MVP)\" && exit 0",
```

Reemplazar por:

```json
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
```

**Paso 4.** Ejecutar `npm run lint 2>&1 | tail -40` y **contar** los problemas.

**Paso 5.** Ejecutar `npm run lint:fix` (solo arregla lo auto-fixable: formato, imports).

**Paso 6.** Ejecutar `npm run lint 2>&1 | tail -60` de nuevo y capturar el resumen.

**Paso 7.** **NO arregles a mano ninguna violación restante.** Ese es trabajo de una tarea
posterior que se planificará con el conteo real. Tu entregable es la configuración funcionando
y el inventario de violaciones.

### Verificación

```bash
npx eslint --version && npm run type-check
```

`eslint --version` debe imprimir `v9.39.5`. El type-check debe seguir limpio.

### Criterio de terminado
- `eslint.config.js` existe y `npx eslint .` se ejecuta sin crashear (puede reportar errores
  de lint — eso es esperado y es el inventario).
- En tu reporte final incluye, textualmente, la línea resumen de ESLint
  (`✖ N problems (X errors, Y warnings)`) y el desglose por regla que produce este comando:

```bash
npx eslint . -f json 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d),m={};r.forEach(f=>f.messages.forEach(x=>{m[x.ruleId]=(m[x.ruleId]||0)+1}));console.log(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,15))})"
```

---

## T0.3 — Endurecer `tsconfig` + corregir los 3 errores resultantes

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T0.1
- **Paralelizable con:** T0.2
- **Por qué existe:** `noUncheckedIndexedAccess` es la opción que convierte en errores de
  compilación toda la clase de bugs "índice de Record con clave de enum desincronizada"
  que la auditoría encontró en producción. `noImplicitReturns` protege el `switch` exhaustivo
  de `limiteDctoDirecto` cuando T1.A añada `otro` a `Rol`.
  **Medido: activarlas produce exactamente 3 errores.** Ni uno más.

### Archivos que toca
- `tsconfig.json` (modifica)
- `src/utils/contactos.ts` (modifica)
- `src/components/CrearTareaModal.tsx` (modifica)
- `src/utils/contactos.test.ts` (crea)

### Pasos

**Paso 1 — TDD, test primero.** Crear `src/utils/contactos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resumenEmpresas } from './contactos'

describe('resumenEmpresas', () => {
  it('devuelve un guion largo si no hay empresas', () => {
    expect(resumenEmpresas([])).toBe('—')
    expect(resumenEmpresas(undefined)).toBe('—')
  })

  it('devuelve la razon social sola si hay exactamente una', () => {
    expect(resumenEmpresas([{ id: 1, razon_social: 'Transportes Lima' }])).toBe(
      'Transportes Lima',
    )
  })

  it('añade el contador de restantes si hay dos o más', () => {
    expect(
      resumenEmpresas([
        { id: 1, razon_social: 'Transportes Lima' },
        { id: 2, razon_social: 'Buses Norte' },
        { id: 3, razon_social: 'Turismo Sur' },
      ]),
    ).toBe('Transportes Lima +2')
  })
})
```

Ejecutar `npm run test -- contactos`. **Debe pasar** (la función ya es correcta en runtime;
el test fija su contrato antes del refactor de tipos). Si falla → **ESCALAR**.

> Nota: si el tipo `ContactoEmpresaRef` exige más campos que `id` y `razon_social`, el test
> dará error de tipos. En ese caso añade los campos que falten con valores plausibles
> (strings vacíos, `null`), sin cambiar las aserciones.

**Paso 2.** En `tsconfig.json`, localizar la línea:

```json
    "noFallthroughCasesInSwitch": true,
```

Añadir **inmediatamente después** estas dos líneas:

```json
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
```

**Paso 3.** Ejecutar `npx tsc --noEmit`. Debe reportar **exactamente 3 errores**:

```
src/components/CrearTareaModal.tsx(87,48): error TS2532: Object is possibly 'undefined'.
src/utils/contactos.ts(6,37): error TS2532: Object is possibly 'undefined'.
src/utils/contactos.ts(7,13): error TS2532: Object is possibly 'undefined'.
```

Si el número o la ubicación difiere → **ESCALAR** (significa que otra tarea modificó archivos
en paralelo, lo cual no debería ocurrir).

**Paso 4.** Corregir `src/utils/contactos.ts`. Contenido actual completo de la función:

```ts
export function resumenEmpresas(empresas: ContactoEmpresaRef[] | undefined): string {
  if (!empresas || empresas.length === 0) return '—'
  if (empresas.length === 1) return empresas[0].razon_social
  return `${empresas[0].razon_social} +${empresas.length - 1}`
}
```

Reemplazar el **cuerpo completo** por:

```ts
export function resumenEmpresas(empresas: ContactoEmpresaRef[] | undefined): string {
  const primera = empresas?.[0]
  if (!primera) return '—'
  if (empresas.length === 1) return primera.razon_social
  return `${primera.razon_social} +${empresas.length - 1}`
}
```

Nota: `empresas.length` en las dos últimas líneas es seguro porque `primera` truthy implica
que `empresas` existe y no está vacío.

**Paso 5.** Corregir `src/components/CrearTareaModal.tsx` línea 87. Contenido actual:

```ts
  const idUnicaActiva = activas.length === 1 ? activas[0].id : null
```

Reemplazar por:

```ts
  const idUnicaActiva = activas.length === 1 ? (activas[0]?.id ?? null) : null
```

**NO toques el comentario de las dos líneas anteriores** — sigue siendo correcto.

### Verificación

```bash
npm run type-check && npm run test
```

Ambos deben pasar limpios.

### Criterio de terminado
- `tsconfig.json` tiene las dos opciones nuevas.
- `npx tsc --noEmit` sale con 0 errores.
- Todos los tests pasan.

---
---

# OLA 3 — Dos agentes en PARALELO

> **Disjunción verificada:** T1.A toca `enums.ts`, `etiquetas.ts`, `AdminEmpleados.tsx`,
> `solicitudes.ts`. T1.B toca `notificacion.ts`, `NotificacionesDropdown.tsx`. Sin solape.

## T1.A — Enums: `tipo_accion` (email→correo) y `Rol` (+otro)

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T0.3 (necesita `noUncheckedIndexedAccess` activo para que el compilador
  guíe el cambio de `ETIQUETA_ROL`)
- **Paralelizable con:** T1.B
- **Por qué existe:** BUG EN PRODUCCIÓN. La tabla §23 de `docs/contrato_api.md`
  (verificada contra el schema real de Supabase) dice:
  - `tipo_accion_enum` = `llamada`, **`correo`**, `reunion`, `whatsapp`, `otro`
  - `rol_empleado` = `admin`, `gerencia`, `jdv`, `vendedor`, `analista`, **`otro`**

  El frontend tiene `email` (valor que el backend rechaza con 400) y le falta `otro`.
  Efecto real: crear una tarea de tipo "Email" **falla con 400 VALIDACION**; un empleado
  con rol `otro` muestra la celda de rol en blanco.

### Archivos que toca
- `src/types/enums.ts` (modifica)
- `src/utils/etiquetas.ts` (modifica)
- `src/pages/Admin/AdminEmpleados.tsx` (modifica)
- `src/utils/solicitudes.ts` (modifica)
- `src/utils/etiquetas.test.ts` (crea)
- `src/utils/solicitudes.test.ts` (crea)

### Pasos

**Paso 1 — TDD, tests primero.** Crear `src/utils/etiquetas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ETIQUETA_ROL, ETIQUETA_TIPO_ACCION } from './etiquetas'

/**
 * Estos tests fijan los enums contra la tabla §23 de docs/contrato_api.md,
 * verificada contra el schema real de producción. Si el backend cambia un
 * enum, estos tests deben fallar ANTES de que un usuario vea un 400.
 */
describe('ETIQUETA_TIPO_ACCION', () => {
  it('cubre exactamente los valores de tipo_accion_enum del contrato', () => {
    expect(Object.keys(ETIQUETA_TIPO_ACCION).sort()).toEqual(
      ['correo', 'llamada', 'otro', 'reunion', 'whatsapp'].sort(),
    )
  })

  it('no contiene "email", que no es un valor del backend', () => {
    expect(ETIQUETA_TIPO_ACCION).not.toHaveProperty('email')
  })

  it('da etiqueta legible a correo', () => {
    expect(ETIQUETA_TIPO_ACCION.correo).toBe('Correo')
  })
})

describe('ETIQUETA_ROL', () => {
  it('cubre exactamente los valores de rol_empleado del contrato', () => {
    expect(Object.keys(ETIQUETA_ROL).sort()).toEqual(
      ['admin', 'analista', 'gerencia', 'jdv', 'otro', 'vendedor'].sort(),
    )
  })

  it('da etiqueta legible a otro', () => {
    expect(ETIQUETA_ROL.otro).toBe('Otro')
  })
})
```

Ejecutar `npm run test -- etiquetas`. **DEBE FALLAR** (fase RED). Si pasa → **ESCALAR**.

**Paso 2.** Crear `src/utils/solicitudes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { aprobadorParaDcto, limiteDctoDirecto } from './solicitudes'

describe('limiteDctoDirecto', () => {
  it('da 3 a vendedor', () => {
    expect(limiteDctoDirecto('vendedor')).toBe(3)
  })

  it('da 7 a jdv', () => {
    expect(limiteDctoDirecto('jdv')).toBe(7)
  })

  it('da null (sin límite) a gerencia y admin', () => {
    expect(limiteDctoDirecto('gerencia')).toBeNull()
    expect(limiteDctoDirecto('admin')).toBeNull()
  })

  // Actualizado 2026-08-20: `analista` y `otro` son "roles de apoyo" desde el
  // PR #9 de backend (contrato §25) — no aplican descuento por ninguna vía, ni
  // directo ni por solicitud. `analista` tenía 3 antes de ese cambio; ya no.
  it('no da margen de descuento directo a los roles de apoyo (analista, otro)', () => {
    expect(limiteDctoDirecto('analista')).toBe(0)
    expect(limiteDctoDirecto('otro')).toBe(0)
  })
})

describe('aprobadorParaDcto', () => {
  it('no pide aprobación dentro del límite', () => {
    expect(aprobadorParaDcto('vendedor', 3)).toBeNull()
    expect(aprobadorParaDcto('jdv', 7)).toBeNull()
  })

  it('no pide aprobación nunca a gerencia ni admin', () => {
    expect(aprobadorParaDcto('gerencia', 99)).toBeNull()
    expect(aprobadorParaDcto('admin', 99)).toBeNull()
  })

  it('escala a jdv un dcto de vendedor entre su límite y 7', () => {
    expect(aprobadorParaDcto('vendedor', 5)).toBe('jdv')
    expect(aprobadorParaDcto('analista', 7)).toBe('jdv')
  })

  it('escala a gerencia por encima de 7', () => {
    expect(aprobadorParaDcto('vendedor', 8)).toBe('gerencia')
    expect(aprobadorParaDcto('jdv', 8)).toBe('gerencia')
  })

  it('escala cualquier dcto positivo del rol otro', () => {
    expect(aprobadorParaDcto('otro', 1)).toBe('jdv')
  })
})
```

Ejecutar `npm run test -- solicitudes`. **DEBE FALLAR** (fase RED).

**Paso 3.** En `src/types/enums.ts`, línea 1. Buscar exactamente:

```ts
export type Rol = 'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista'
```

Reemplazar por:

```ts
/**
 * `rol_empleado` del contrato §23 (verificado contra el schema de producción).
 * `otro` existe en el enum del backend aunque la UI no lo asigne: un empleado
 * puede llegar con ese rol y toda la app debe saber representarlo.
 */
export type Rol = 'admin' | 'gerencia' | 'jdv' | 'vendedor' | 'analista' | 'otro'
```

**Paso 4.** En `src/types/enums.ts`, línea 21. Buscar exactamente:

```ts
export type TipoAccion = 'llamada' | 'reunion' | 'email' | 'whatsapp' | 'otro'
```

Reemplazar por:

```ts
/** `tipo_accion_enum` del contrato §23. Es `correo`, NO `email`. */
export type TipoAccion = 'llamada' | 'reunion' | 'correo' | 'whatsapp' | 'otro'
```

**Paso 5.** En `src/utils/etiquetas.ts`, en el objeto `ETIQUETA_TIPO_ACCION`, buscar:

```ts
  email: 'Email',
```

Reemplazar por:

```ts
  correo: 'Correo',
```

**Paso 6.** En `src/utils/etiquetas.ts` línea 45, buscar exactamente:

```ts
export const ETIQUETA_ROL: Record<string, string> = {
```

Reemplazar por (nótese el cambio de `string` a `Rol` en la clave — es lo que da la red
de exhaustividad que hoy falta, igual que ya hace `ETIQUETA_SEGMENTO`):

```ts
/**
 * `Record<Rol, string>` a propósito, igual que ETIQUETA_SEGMENTO: si mañana se
 * añade un valor al enum `Rol`, TypeScript falla aquí hasta que se le dé etiqueta.
 */
export const ETIQUETA_ROL: Record<Rol, string> = {
```

Añadir dentro de ese objeto, después de la entrada `analista`, la línea:

```ts
  otro: 'Otro',
```

Verifica que `Rol` esté importado en `etiquetas.ts`. Si no lo está, añádelo al import de
tipos existente desde `@/types`.

**Paso 7.** En `src/pages/Admin/AdminEmpleados.tsx` línea 17, buscar exactamente:

```ts
const ROLES: Rol[] = ['admin', 'gerencia', 'jdv', 'vendedor', 'analista']
```

Reemplazar por:

```ts
/**
 * Roles asignables desde el panel de administración. NO incluye `otro`: existe
 * en el enum del backend y la app sabe mostrarlo, pero no es un rol que un
 * admin deba poder conceder desde la UI.
 */
const ROLES: Rol[] = ['admin', 'gerencia', 'jdv', 'vendedor', 'analista']
```

(El array no cambia; se documenta la omisión deliberada para que nadie la "arregle" luego.)

**Paso 8.** En `src/utils/solicitudes.ts`, en `limiteDctoDirecto`, mover `analista` al caso
más restrictivo (ya no tiene margen de descuento propio, ver debajo) y añadir `otro` en el
mismo caso. Buscar exactamente:

```ts
export function limiteDctoDirecto(rol: Rol): number | null {
  switch (rol) {
    case 'vendedor':
    case 'analista':
      return 3
    case 'jdv':
      return 7
    case 'gerencia':
    case 'admin':
      return null // sin límite
  }
}
```

Reemplazar por:

```ts
export function limiteDctoDirecto(rol: Rol): number | null {
  switch (rol) {
    case 'vendedor':
      return 3
    case 'jdv':
      return 7
    case 'gerencia':
    case 'admin':
      return null // sin límite
    case 'analista':
    case 'otro':
      // Roles de apoyo (contrato §25, PR backend #9, 2026-08-20): no aplican
      // descuento por ninguna vía, ni directo ni por solicitud. `analista`
      // tenía 3 antes de ese cambio; perdió el margen al pasar a rol de apoyo.
      return 0
  }
}
```

**Paso 9.** Ejecutar `npx tsc --noEmit`. Corregir los errores que aparezcan **solo** en los
archivos de tu lista. Si aparece un error en un archivo que NO está en tu lista → **ESCALAR**.

### Verificación

```bash
npm run type-check && npm run test && grep -rn "email" src/types/enums.ts src/utils/etiquetas.ts
```

- type-check limpio.
- Todos los tests pasan (fase GREEN).
- El `grep` no debe devolver ninguna línea.

### Criterio de terminado
- El grep de `email` sobre `enums.ts` y `etiquetas.ts` no devuelve nada.
- Los tests de `etiquetas` y `solicitudes` pasan.

---

## T1.B — Enum: `entidad_notificacion` (meta → meta_venta)

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T0.1
- **Paralelizable con:** T1.A
- **Por qué existe:** BUG EN PRODUCCIÓN. El contrato §23 dice
  `entidad_notificacion_enum` = `oportunidad`, `empresa`, `solicitud`, **`meta_venta`**.
  El frontend tiene `meta`. Efecto real: las 4 notificaciones de metas
  (`meta_propuesta`, `meta_aprobada`, `meta_rechazada`, `meta_modificada`) nunca entran en
  la rama correcta, caen al `RUTA_ENTIDAD[...]` que no las tiene, y navegan a
  `/undefined/42`, que el catch-all del router rebota a Inicio. El usuario marca la
  notificación como leída y aterriza en la home sin explicación.

### Archivos que toca
- `src/types/notificacion.ts` (modifica)
- `src/components/NotificacionesDropdown.tsx` (modifica)
- `src/components/NotificacionesDropdown.test.tsx` (crea)

### Pasos

**Paso 1 — TDD, test primero.** Crear `src/components/NotificacionesDropdown.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderConProviders, screen, userEvent, waitFor } from '@/test/utilidades'
import { servidorMock, BASE_API } from '@/test/servidor-mock'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { useAuthStore } from '@/store/authStore'
import type { Notificacion } from '@/types'

const navegar = vi.fn()
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...real, useNavigate: () => navegar }
})

const EMPLEADO = {
  id: 1,
  nombres: 'Ana',
  apellidos: 'Ruiz',
  email: 'ana@quantum.pe',
  rol: 'vendedor' as const,
  activo: true,
}

function notificacionDeMeta(): Notificacion {
  return {
    id: 42,
    tipo: 'meta_aprobada',
    mensaje: 'Tu meta de ventas fue aprobada',
    entidad_tipo: 'meta_venta',
    entidad_id: 7,
    leida: false,
    created_at: '2026-08-18T10:00:00Z',
  }
}

describe('NotificacionesDropdown', () => {
  beforeEach(() => {
    navegar.mockClear()
    useAuthStore.setState({ empleado: EMPLEADO, cargando: false })
  })

  it('lleva una notificación de meta_venta a /solicitudes, no a una ruta inexistente', async () => {
    servidorMock.use(
      http.get(`${BASE_API}/notificaciones/no-leidas/count`, () =>
        HttpResponse.json({ data: 1 }),
      ),
      http.get(`${BASE_API}/notificaciones`, () =>
        HttpResponse.json({ data: [notificacionDeMeta()] }),
      ),
      http.patch(`${BASE_API}/notificaciones/42`, () => HttpResponse.json({ data: null })),
    )

    renderConProviders(<NotificacionesDropdown />)

    await userEvent.click(await screen.findByRole('button'))
    await userEvent.click(await screen.findByText('Tu meta de ventas fue aprobada'))

    await waitFor(() => expect(navegar).toHaveBeenCalledWith('/solicitudes'))
    expect(navegar).not.toHaveBeenCalledWith(expect.stringContaining('undefined'))
  })
})
```

Ejecutar `npm run test -- NotificacionesDropdown`. **DEBE FALLAR** (fase RED).

> Si el test falla por razones de infraestructura (selector no encontrado, endpoint con
> otra forma) y no por la aserción de `navegar`, ajusta **solo los selectores y las rutas
> de los handlers MSW** para que reflejen la realidad del componente y de
> `src/api/notificaciones.ts`. Las dos aserciones finales NO se tocan. Si tras dos intentos
> sigue sin llegar a la aserción → **ESCALAR**.

**Paso 2.** En `src/types/notificacion.ts` línea 20, buscar exactamente:

```ts
export type EntidadNotificacion = 'oportunidad' | 'empresa' | 'solicitud' | 'meta'
```

Reemplazar por:

```ts
/** `entidad_notificacion_enum` del contrato §23. Es `meta_venta`, NO `meta`. */
export type EntidadNotificacion = 'oportunidad' | 'empresa' | 'solicitud' | 'meta_venta'
```

**Paso 3.** Ejecutar `npx tsc --noEmit`. Aparecerá un error en `NotificacionesDropdown.tsx`
en la definición de `RUTA_ENTIDAD` (el `Exclude` ya no elimina `meta_venta`). Es esperado
y es la red de seguridad funcionando.

**Paso 4.** En `src/components/NotificacionesDropdown.tsx` línea 21, buscar exactamente:

```ts
const RUTA_ENTIDAD: Record<Exclude<EntidadNotificacion, 'solicitud' | 'meta'>, string> = {
```

Reemplazar por:

```ts
const RUTA_ENTIDAD: Record<Exclude<EntidadNotificacion, 'solicitud' | 'meta_venta'>, string> = {
```

**Paso 5.** En el mismo archivo, dentro de `irANotificacion`, buscar exactamente:

```ts
    if (n.entidad_tipo === 'solicitud' || n.entidad_tipo === 'meta') {
```

Reemplazar por:

```ts
    if (n.entidad_tipo === 'solicitud' || n.entidad_tipo === 'meta_venta') {
```

**Paso 6.** Ejecutar `npx tsc --noEmit` de nuevo. Debe quedar limpio.

### Verificación

```bash
npm run type-check && npm run test && grep -rn "meta" src/types/notificacion.ts
```

- type-check limpio, tests en verde.
- El grep no debe mostrar `'meta'` suelto como valor de `EntidadNotificacion` (sí aparecerán
  los `meta_*` de `TipoNotificacion`, que son correctos).

### Criterio de terminado
- El test de `NotificacionesDropdown` pasa (fase GREEN).
- No queda ninguna referencia a `'meta'` como `entidad_tipo`.

---
---

# OLA 4

## T1.C — Enum: `aplicacion_enum` (quitar `otro`, tipar)

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T1.A (modifica `src/types/enums.ts`, mismo archivo)
- **Paralelizable con:** nada
- **Por qué existe:** BUG EN PRODUCCIÓN. El contrato §23 dice
  `aplicacion_enum` = `urbano`, `interprovincial`, `turismo`, `personal` — **cuatro valores,
  sin `otro`**. `AdminModelos.tsx:12` define `const APLICACIONES = [... , 'otro']`, un
  `string[]` suelto que parece copiado de `SEGMENTOS` (donde `otro` **sí** es legal: los dos
  enums difieren exactamente en ese miembro). El formulario ofrece "otro" como opción
  seleccionable y guardar el modelo falla con 400 VALIDACION, sin pista de que la culpa
  es de la opción que el propio formulario ofreció.

### Archivos que toca
- `src/types/enums.ts` (modifica)
- `src/types/catalogos.ts` (modifica)
- `src/pages/Admin/AdminModelos.tsx` (modifica)
- `src/types/enums.test.ts` (crea)

### Pasos

**Paso 1 — TDD, test primero.** Crear `src/types/enums.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { APLICACIONES, SEGMENTOS } from './enums'

/**
 * `aplicacion_enum` y `segmento_enum` se parecen pero NO son el mismo enum:
 * segmento admite `otro` y aplicacion no. Confundirlos hacía que el formulario
 * de modelos ofreciera una opción que el backend rechaza con 400.
 */
describe('APLICACIONES', () => {
  it('coincide exactamente con aplicacion_enum del contrato §23', () => {
    expect([...APLICACIONES].sort()).toEqual(
      ['interprovincial', 'personal', 'turismo', 'urbano'].sort(),
    )
  })

  it('no incluye otro, a diferencia de SEGMENTOS', () => {
    expect(APLICACIONES).not.toContain('otro')
    expect(SEGMENTOS).toContain('otro')
  })
})
```

Ejecutar `npm run test -- enums`. **DEBE FALLAR** (fase RED: `APLICACIONES` aún no existe
en `enums.ts`).

**Paso 2.** En `src/types/enums.ts`, localizar la línea que declara `Segmento`:

```ts
export type Segmento = 'urbano' | 'interprovincial' | 'turismo' | 'personal' | 'otro'
```

Añadir **inmediatamente después** de esa línea:

```ts
/**
 * `aplicacion_enum` del contrato §23 — las aplicaciones de un `Modelo`.
 * OJO: se parece a `Segmento` pero NO admite `otro`. Son enums distintos.
 */
export type Aplicacion = 'urbano' | 'interprovincial' | 'turismo' | 'personal'
```

**Paso 3.** En `src/types/enums.ts`, al final del archivo, añadir la constante (en paralelo a
como ya existe `SEGMENTOS`):

```ts
/**
 * Aplicaciones de un modelo, en el orden en que se muestran. Fuente única para
 * el select de AdminModelos, que antes tenía una copia `string[]` con un valor
 * de más (`otro`) que el backend rechazaba con 400.
 */
export const APLICACIONES: Aplicacion[] = [
  'urbano',
  'interprovincial',
  'turismo',
  'personal',
]
```

**Paso 4.** Ejecutar `npm run test -- enums`. Debe pasar (fase GREEN).

**Paso 5.** En `src/types/catalogos.ts`, líneas 32 y 42, buscar las **dos** apariciones de:

```ts
  aplicaciones: string[]
```

Reemplazar **ambas** por:

```ts
  aplicaciones: Aplicacion[]
```

Añadir `Aplicacion` al import de tipos desde `./enums` en la cabecera del archivo. Si no
existe un import desde `./enums`, créalo:

```ts
import type { Aplicacion } from './enums'
```

**Paso 6.** En `src/pages/Admin/AdminModelos.tsx` línea 12, buscar exactamente:

```ts
const APLICACIONES = ['urbano', 'interprovincial', 'turismo', 'personal', 'otro']
```

**Borrar esa línea completa** y añadir `APLICACIONES` al import de `@/types` del archivo.
Si el archivo no importa de `@/types`, añade:

```ts
import { APLICACIONES } from '@/types'
```

> Verifica que `src/types/index.ts` reexporte `./enums`. Si no lo hace, importa desde
> `@/types/enums` en su lugar.

**Paso 7.** Ejecutar `npx tsc --noEmit`. Si aparece un error en `AdminModelos.tsx` porque el
`Select` espera `string[]` y ahora recibe `Aplicacion[]`, **no lo silencies con un cast**:
el `Select` de antd acepta `options` con `value` de tipo string, y `Aplicacion` es un
subtipo de string, así que debería compilar. Si aun así falla → **ESCALAR**.

### Verificación

```bash
npm run type-check && npm run test && grep -n "otro" src/pages/Admin/AdminModelos.tsx
```

- type-check limpio, tests verdes.
- El grep no devuelve nada.

### Criterio de terminado
- `APLICACIONES` vive solo en `src/types/enums.ts`, tipado como `Aplicacion[]`.
- El select de aplicaciones ya no ofrece "otro".

---
---

# OLA 5

## T2.1 — Interceptor de Axios: 401 en cambio de contraseña, bandera latch y dedup

- **Modelo:** **Opus 5** · **Effort:** **alto**
- **Depende de:** T0.3
- **Paralelizable con:** nada
- **Por qué requiere más capacidad:** es el único punto del codebase por el que pasa el 100%
  del tráfico HTTP. Un fallo aquí no rompe una pantalla: deja a todos los usuarios fuera de
  la aplicación. Las tres correcciones interactúan entre sí y con el guard del router.

### Contexto — los tres defectos

**(a) Reenvío silencioso del cambio de contraseña.** `esAuth` (línea 45) excluye solo
`/auth/login` y `/auth/refresh`. Pero `POST /auth/cambiar-contrasena` devuelve **401
CREDENCIALES_INVALIDAS** ante una `password_actual` errónea (contrato §6). Un typo entra en
la rama de refresh y **reenvía la misma contraseña equivocada**, duplicando los intentos
fallidos contra cualquier contador del servidor. Peor: un cambio exitoso revoca los refresh
tokens de las demás sesiones, así que en una segunda pestaña el refresh falla, el `catch`
dispara `window.location.assign('/login')` y el documento muere antes de que React pinte el
error — el usuario sale expulsado y sin mensaje, por un typo.

**(b) Bandera que nunca se resetea.** `redirigiendoACambioContrasena` (línea 20) se pone en
`true` y no vuelve nunca. Su corrección depende de que `assign()` siempre destruya el
documento. Con **bfcache** (el usuario pulsa Atrás), Firefox y Safari restauran el heap de JS
con la bandera activa: el handler 403 queda muerto para el resto de la vida de ese documento
y el usuario ve "no tienes permiso" en toda la app — exactamente el diagnóstico equivocado que
el bloque existe para evitar. `RequireAuth` tampoco rescata, porque el store restaurado tiene
`requiere_cambio_contrasena: false`.

**(c) Recarga completa evitable.** `window.location.assign()` tira el documento entero.
El caso objetivo del bloque (un admin resetea la contraseña a mitad de sesión, detectado por
el poll de notificaciones cada 45 s) destruye cualquier formulario abierto sin aviso.
`RequireAuth` (`src/router/guards.tsx:24`) **ya hace ese redirect declarativamente** leyendo
`empleado.requiere_cambio_contrasena` del store.

### La corrección

Sustituir la bandera de módulo + `assign()` por una actualización del store, dejando que
`RequireAuth` haga la navegación SPA. Esto elimina de un golpe (b) y (c), y hace el bloque
testeable. Y añadir `/auth/cambiar-contrasena` a `esAuth` para (a).

### Archivos que toca
- `src/api/client.ts` (modifica)
- `src/api/client.test.ts` (crea)

### Pasos

**Paso 1 — TDD, tests primero.** Crear `src/api/client.test.ts` cubriendo los cuatro
comportamientos. Usa MSW para simular las respuestas y `useAuthStore.getState()` para
verificar el efecto. Los casos obligatorios:

1. Un **401 en `/auth/cambiar-contrasena`** se propaga al llamante **sin** disparar
   `/auth/refresh` y **sin** reenviar la petición original. Verificable contando las
   peticiones que recibe MSW.
2. Un **403 con `code: 'CAMBIO_CONTRASENA_REQUERIDO'`** deja
   `useAuthStore.getState().empleado?.requiere_cambio_contrasena === true`.
3. Un **403 con `code: 'PERMISO_INSUFICIENTE'`** **NO** toca el store (debe seguir llevando
   a la pantalla "Sin acceso").
4. Un **401 normal** en un endpoint cualquiera dispara **exactamente un** `/auth/refresh`
   aunque fallen 3 peticiones en paralelo, y reintenta las 3.

Ejecuta y confirma que **fallan** (fase RED) antes de tocar `client.ts`.

**Paso 2.** En `src/api/client.ts`, importar el store. Añadir tras los imports existentes:

```ts
import { useAuthStore } from '@/store/authStore'
```

> Comprueba que esto no crea un ciclo de imports: `src/store/authStore.ts` importa solo de
> `zustand` y de `@/types`, así que no lo hay. Si `tsc` reporta un ciclo → **ESCALAR**.

**Paso 3.** Borrar las líneas 18-20 completas:

```ts
/** Formulario de cambio obligatorio. El backend bloquea el resto de la app. */
const RUTA_CAMBIO_CONTRASENA = '/cambiar-contrasena'
let redirigiendoACambioContrasena = false
```

**Paso 4.** Modificar `esAuth` (línea 45). Buscar exactamente:

```ts
    const esAuth = url.includes('/auth/login') || url.includes('/auth/refresh')
```

Reemplazar por:

```ts
    // Endpoints de credenciales: un 401 aquí significa "las credenciales que
    // acabas de escribir son incorrectas", no "tu sesión caducó". Refrescar y
    // reintentar reenviaría la contraseña equivocada y duplicaría el intento
    // fallido contra el contador del servidor (contrato §6).
    const esAuth =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/cambiar-contrasena')
```

**Paso 5.** Reemplazar el bloque 403 completo (desde el comentario que empieza por
`/**` con `Cambio de contraseña obligatorio:` hasta el cierre `}` del `if`) por:

```ts
    /**
     * Cambio de contraseña obligatorio: mientras el flag esté activo el backend
     * responde 403 a TODO salvo /auth/cambiar-contrasena, /auth/logout y
     * /empleados/me. Sin este bloque el usuario vería "no tienes permiso" por
     * toda la app, que es exactamente el diagnóstico equivocado.
     *
     * Hace falta aunque el guard del router ya mire el flag: el guard solo lo
     * evalúa al montar, y el caso que importa es que un admin resetee la
     * contraseña a mitad de sesión, con el usuario ya navegando. El polling de
     * notificaciones (45 s) dispara el 403 él solo.
     *
     * Se distingue por `code`, no por el 403 a secas: un 403 normal
     * (PERMISO_INSUFICIENTE) debe seguir mostrando la pantalla "Sin acceso".
     *
     * Solo se marca el flag en el store — la navegación la hace RequireAuth, que
     * ya redirige de forma declarativa leyendo ese mismo campo. Antes esto era
     * `window.location.assign()` con una bandera de módulo que nunca se reseteaba:
     * la recarga completa tiraba cualquier formulario abierto, y si el documento
     * sobrevivía (bfcache al pulsar Atrás) la bandera quedaba trabada en `true` y
     * desactivaba este bloque para siempre.
     */
    if (status === 403 && extraerApiError(error)?.code === 'CAMBIO_CONTRASENA_REQUERIDO') {
      const { empleado, setEmpleado } = useAuthStore.getState()
      if (empleado && !empleado.requiere_cambio_contrasena) {
        setEmpleado({ ...empleado, requiere_cambio_contrasena: true })
      }
    }
```

**Paso 6.** Añadir dedup a la rama 401. Buscar exactamente:

```ts
      } catch {
        // Refresh falló → sesión terminada. Redirigir a login.
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }
```

Reemplazar por:

```ts
      } catch {
        // Refresh falló → sesión terminada. Se limpia el store para que
        // RequireAuth mande a /login por navegación SPA. `assign()` no servía
        // aquí: es asíncrono, así que N peticiones fallando a la vez pasaban
        // todas el chequeo de pathname y encadenaban N navegaciones.
        useAuthStore.getState().limpiar()
      }
```

**Paso 7.** Ejecutar `npx tsc --noEmit` y `npm run test`. Los tests del Paso 1 deben pasar
(fase GREEN).

**Paso 8 — verificación de regresión manual (obligatoria).** Ejecuta `npm run dev` y anota
en tu reporte final si has podido comprobar, o no, estos dos puntos. **No inventes
resultados**: si no puedes probarlo, dilo explícitamente.
- Login normal sigue funcionando.
- Un 403 `PERMISO_INSUFICIENTE` (entrar a `/admin` con rol vendedor) sigue mostrando
  "Sin acceso" y **no** redirige a `/cambiar-contrasena`.

### Verificación

```bash
npm run type-check && npm run test && grep -n "location.assign" src/api/client.ts
```

El grep **no debe devolver ninguna línea**.

### Criterio de terminado
- `src/api/client.ts` no contiene `window.location.assign` ni bandera de módulo mutable
  para el redirect.
- Los 4 tests del Paso 1 pasan.

---
---

# OLA 6

## T3.1 — Query keys jerárquicas + invalidaciones de contactos

- **Modelo:** **Opus 5** · **Effort:** **alto**
- **Depende de:** T2.1
- **Paralelizable con:** nada
- **Por qué requiere más capacidad:** es un refactor transversal que toca la base de la
  sincronización 360. Un error aquí no rompe la compilación — deja datos viejos en pantalla,
  que es el fallo más difícil de detectar y el que `CLAUDE.md` regla 4 prohíbe expresamente.

### Contexto — el defecto de raíz

`src/hooks/queryKeys.ts` declara en su comentario de cabecera que "la invalidación por prefijo
cubre todas las variantes" y que es "la base de la sincronización 360". **No lo es**, porque
las listas y los detalles usan prefijos distintos:

```
qk.empresas       = ['empresas']          qk.empresa(id)      = ['empresa', id]
qk.oportunidades  = ['oportunidades']     qk.oportunidad(id)  = ['oportunidad', id]
qk.contactos      = ['contactos']         qk.contacto(id)     = ['contacto', id]
qk.solicitudes    = ['solicitudes']       qk.solicitud(id)    = ['solicitud', id]
```

Invalidar `['empresas']` **no** invalida `['empresa', 5]`. Como consecuencia hay tres rutas
de invalidación rotas hoy en producción (`ContactoDetalle` expone `empresas[]` y
`oportunidades[]`; `Empresa` expone `contactos[]`):

1. `useVincularContactoOportunidad` / `useDesvincularContactoOportunidad`
   (`useOportunidades.ts:88-101`) invalidan **solo** `qk.oportunidad(id)`. El detalle del
   contacto sigue mostrando la lista vieja de oportunidades.
2. `useActualizarContactoDetalle` (`useContactos.ts:26`) invalida `qk.empresas` pero **no**
   `qk.empresa(idEmpresa)`. Editas un contacto desde `/contactos/:id` y la ficha de empresa
   sigue con el nombre viejo.
3. `useVincularContacto` / `useDesvincularContacto` (`useEmpresas.ts`) invalidan
   `qk.contactos` pero nunca `qk.contacto(id)`.

### La corrección

Anidar los detalles bajo el prefijo de su lista, de modo que la invalidación por prefijo
haga lo que el comentario ya promete.

### Archivos que toca
- `src/hooks/queryKeys.ts` (modifica)
- `src/hooks/useEmpresas.ts` (modifica)
- `src/hooks/useOportunidades.ts` (modifica)
- `src/hooks/useContactos.ts` (modifica)
- `src/hooks/queryKeys.test.ts` (crea)

### Pasos

**Paso 1 — TDD, test primero.** Crear `src/hooks/queryKeys.test.ts` que verifique la
propiedad estructural, no la implementación:

```ts
import { describe, expect, it } from 'vitest'
import { qk } from './queryKeys'

/**
 * La promesa del módulo es que invalidar la lista alcanza también a los detalles.
 * Eso solo es cierto si la key del detalle EMPIEZA por la key de la lista —
 * que es exactamente el criterio de prefijo que usa TanStack Query.
 */
function esPrefijoDe(prefijo: readonly unknown[], key: readonly unknown[]): boolean {
  return prefijo.every((parte, i) => key[i] === parte)
}

describe('qk — jerarquía de prefijos', () => {
  it('el detalle de empresa cuelga de la lista de empresas', () => {
    expect(esPrefijoDe(qk.empresas, qk.empresa(5))).toBe(true)
  })

  it('los eventos de empresa cuelgan del detalle de empresa', () => {
    expect(esPrefijoDe(qk.empresa(5), qk.empresaEventos(5))).toBe(true)
  })

  it('el detalle de oportunidad cuelga de la lista de oportunidades', () => {
    expect(esPrefijoDe(qk.oportunidades, qk.oportunidad(5))).toBe(true)
  })

  it('el log y los eventos cuelgan del detalle de oportunidad', () => {
    expect(esPrefijoDe(qk.oportunidad(5), qk.oportunidadLog(5))).toBe(true)
    expect(esPrefijoDe(qk.oportunidad(5), qk.oportunidadEventos(5))).toBe(true)
  })

  it('el detalle de contacto cuelga de la lista de contactos', () => {
    expect(esPrefijoDe(qk.contactos, qk.contacto(5))).toBe(true)
  })

  it('el detalle de solicitud cuelga de la lista de solicitudes', () => {
    expect(esPrefijoDe(qk.solicitudes, qk.solicitud(5))).toBe(true)
  })

  it('detalles de entidades distintas no colisionan', () => {
    expect(esPrefijoDe(qk.empresas, qk.oportunidad(5))).toBe(false)
    expect(esPrefijoDe(qk.empresa(5), qk.empresa(6))).toBe(false)
  })
})
```

Ejecutar `npm run test -- queryKeys`. **DEBE FALLAR** (fase RED).

**Paso 2.** En `src/hooks/queryKeys.ts`, reemplazar las **siete** definiciones de detalle.
Buscar y reemplazar una a una:

| Buscar | Reemplazar por |
|---|---|
| `empresa: (id: number) => ['empresa', id] as const,` | `empresa: (id: number) => ['empresas', 'detalle', id] as const,` |
| `empresaEventos: (id: number) => ['empresa', id, 'eventos'] as const,` | `empresaEventos: (id: number) => ['empresas', 'detalle', id, 'eventos'] as const,` |
| `oportunidad: (id: number) => ['oportunidad', id] as const,` | `oportunidad: (id: number) => ['oportunidades', 'detalle', id] as const,` |
| `oportunidadLog: (id: number) => ['oportunidad', id, 'log'] as const,` | `oportunidadLog: (id: number) => ['oportunidades', 'detalle', id, 'log'] as const,` |
| `oportunidadEventos: (id: number) => ['oportunidad', id, 'eventos'] as const,` | `oportunidadEventos: (id: number) => ['oportunidades', 'detalle', id, 'eventos'] as const,` |
| `contacto: (id: number) => ['contacto', id] as const,` | `contacto: (id: number) => ['contactos', 'detalle', id] as const,` |
| `solicitud: (id: number) => ['solicitud', id] as const,` | `solicitud: (id: number) => ['solicitudes', 'detalle', id] as const,` |

**Paso 3.** Actualizar el comentario de cabecera del módulo. Buscar:

```ts
/**
 * Query keys jerárquicas — la invalidación por prefijo cubre todas las variantes
 * con filtros. Base de la sincronización 360.
 */
```

Reemplazar por:

```ts
/**
 * Query keys jerárquicas — la invalidación por prefijo cubre todas las variantes
 * con filtros. Base de la sincronización 360.
 *
 * INVARIANTE: la key de un detalle SIEMPRE empieza por la key de su lista
 * (`['empresas','detalle',id]`, no `['empresa',id]`). Solo así `invalidar(qc,
 * qk.empresas)` alcanza también a las fichas abiertas. Romper esta forma
 * reintroduce datos viejos en pantalla sin que falle ningún tipo ni ningún build;
 * `queryKeys.test.ts` la verifica.
 */
```

**Paso 4.** En `src/hooks/useContactos.ts`, añadir sobre `useActualizarContactoDetalle` este
comentario (el cuerpo de la función **no cambia**: tras el Paso 2, `qk.empresas` ya alcanza
a `qk.empresa(x)`; solo se documenta por qué basta):

```ts
/**
 * Sincronización 360: el contacto aparece embebido en la ficha de cada empresa
 * a la que está vinculado (`Empresa.contactos`) y en las oportunidades. Como no
 * sabemos aquí a qué empresas pertenece, se invalida el prefijo `empresas`
 * completo, que tras la jerarquía de queryKeys alcanza también a los detalles.
 */
```

**Paso 5.** Corregir las dos mutaciones de contacto-oportunidad en
`src/hooks/useOportunidades.ts`. Buscar exactamente:

```ts
export function useVincularContactoOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id_contacto: number; rol_en_oportunidad: string }) =>
      oportunidadesApi.vincularContacto(id, input),
    onSuccess: () => invalidar(qc, qk.oportunidad(id)),
  })
}

export function useDesvincularContactoOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idContacto: number) => oportunidadesApi.desvincularContacto(id, idContacto),
    onSuccess: () => invalidar(qc, qk.oportunidad(id)),
  })
}
```

Reemplazar por:

```ts
/**
 * Vincular/desvincular toca las DOS puntas de la relación: la oportunidad
 * (`OportunidadDetalle.contactos`) y el contacto (`ContactoDetalle.oportunidades`).
 * Antes solo se invalidaba la oportunidad, así que la ficha del contacto seguía
 * listando una oportunidad de la que ya no formaba parte.
 */
export function useVincularContactoOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id_contacto: number; rol_en_oportunidad: string }) =>
      oportunidadesApi.vincularContacto(id, input),
    onSuccess: () => invalidar(qc, qk.oportunidad(id), qk.contactos),
  })
}

export function useDesvincularContactoOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idContacto: number) => oportunidadesApi.desvincularContacto(id, idContacto),
    onSuccess: () => invalidar(qc, qk.oportunidad(id), qk.contactos),
  })
}
```

**Paso 6.** En `src/hooks/useEmpresas.ts`, las mutaciones `useCrearContacto`,
`useActualizarContacto`, `useVincularContacto` y `useDesvincularContacto` ya invalidan
`qk.contactos`, que tras el Paso 2 alcanza a `qk.contacto(x)`. **No requieren cambio de
código.** Añade sobre `useVincularContacto` este comentario:

```ts
// `qk.contactos` alcanza también a los detalles de contacto (ver la invariante
// de prefijos en queryKeys.ts), que listan las empresas a las que pertenecen.
```

**Paso 7.** Ejecutar `npm run test -- queryKeys` (fase GREEN) y `npx tsc --noEmit`.

**Paso 8.** Buscar referencias residuales a las keys viejas en todo el codebase:

```bash
grep -rn "\['empresa'\|\['oportunidad'\|\['contacto'\|\['solicitud'" src/
```

**No debe devolver nada.** Si devuelve algo, es una key construida a mano fuera de `qk`
— repórtala y corrígela usando el helper de `qk` correspondiente.

### Verificación

```bash
npm run type-check && npm run test && grep -rn "\['empresa'\|\['oportunidad'\|\['contacto'\|\['solicitud'" src/
```

El grep no devuelve nada; type-check y tests limpios.

### Criterio de terminado
- `queryKeys.test.ts` pasa entero.
- Ninguna key de detalle usa el prefijo singular.

---
---

# OLA 7 — Tres agentes en PARALELO

> **Disjunción verificada:** T4.1 → `PropiedadesCard.tsx`. T5.1 → `router/index.tsx`.
> T5.2 → `useCatalogos.ts` + 5 consumidores. Sin solape entre las tres listas.

## T4.1 — Guardado parcial silencioso en `PropiedadesCard`

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T3.1
- **Paralelizable con:** T5.1, T5.2
- **Por qué existe:** En la rama `APROBACION_REQUERIDA` (`PropiedadesCard.tsx:94-96`), tras
  el rechazo del backend se reintenta guardar el resto de campos con el dcto vigente. Si ese
  segundo intento **también** falla, el error se traga con `catch {}`. El usuario ve el modal
  de solicitud de descuento y asume que cantidad, precio, modelo y notas se guardaron.
  No se guardaron, y nadie se lo dice.

### Archivos que toca
- `src/pages/OportunidadDetalle/PropiedadesCard.tsx` (modifica)

### Pasos

**Paso 1.** Localizar el bloque exacto (dentro de `onGuardar`, rama `APROBACION_REQUERIDA`):

```ts
        } catch {
          // Si también falla, el modal de solicitud sigue siendo lo importante
        }
```

**Paso 2.** Reemplazar por:

```ts
        } catch (e2) {
          // El modal de solicitud sigue siendo lo importante, pero el usuario
          // TIENE que saber que el resto de campos no se guardó: si no, cierra
          // el modal creyendo que cantidad, precio y notas quedaron persistidos.
          notification.warning({
            message: 'Los demás cambios no se guardaron',
            description: mensajeDeError(
              e2,
              'Solo se registró la solicitud de descuento. Vuelve a editar los términos para guardar el resto.',
            ),
            duration: 8,
          })
        }
```

`notification` y `mensajeDeError` ya están en el ámbito de la función (línea 37 y el import
de la línea 7). Verifícalo antes de guardar; si alguno no lo está → **ESCALAR**.

### Verificación

```bash
npm run type-check && npm run test
```

Adicionalmente, comprueba que el `catch` vacío ya no existe:

```bash
grep -n "catch {" src/pages/OportunidadDetalle/PropiedadesCard.tsx
```

No debe devolver la línea 94 (si devuelve otras, repórtalas sin tocarlas).

### Criterio de terminado
- El `catch` vacío ya no existe; el fallo se comunica al usuario.

---

## T5.1 — Constantes de rol compartidas en el router

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T1.A (necesita el enum `Rol` ya con `otro`)
- **Paralelizable con:** T4.1, T5.2
- **Por qué existe:** `src/router/index.tsx` escribe las listas de roles **inline**
  (`['admin','gerencia','jdv']`, `['vendedor','analista','jdv']`…), mientras `authStore.ts`
  exporta exactamente esas listas como `ROLES_REPORTES`, `ROLES_ADMIN`,
  `ROLES_BANDEJA_GERENCIA` y `ROLES_SOLICITANTES` — que sí usan `navItems.ts` y las páginas.
  Si alguien añade un rol a la constante, **el enlace de navegación aparece y la ruta
  responde "Sin acceso"**: dos fuentes de verdad para la misma decisión.

### Archivos que toca
- `src/router/index.tsx` (modifica)

### Pasos

**Paso 1.** Añadir el import. Tras la línea
`import { RequireAuth, RequireRol } from './guards'`, añadir:

```ts
import {
  ROLES_ADMIN,
  ROLES_BANDEJA_GERENCIA,
  ROLES_REPORTES,
  ROLES_SOLICITANTES,
} from '@/store/authStore'
```

**Paso 2.** Aplicar las cuatro sustituciones exactas:

| Buscar | Reemplazar por |
|---|---|
| `<RequireRol roles={['admin', 'gerencia', 'jdv']}>` | `<RequireRol roles={ROLES_REPORTES}>` |
| `<RequireRol roles={['admin']}>` | `<RequireRol roles={ROLES_ADMIN}>` |
| `<RequireRol roles={['gerencia', 'admin']}>` | `<RequireRol roles={ROLES_BANDEJA_GERENCIA}>` |
| `<RequireRol roles={['vendedor', 'analista', 'jdv']}>` | `<RequireRol roles={ROLES_SOLICITANTES}>` |

**Paso 3.** Verificar que no queda ninguna lista de roles inline:

```bash
grep -n "roles={\[" src/router/index.tsx
```

No debe devolver nada.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- El router consume las constantes; cero listas inline.

---

## T5.2 — `useEmpleadosSeleccionables`: exponer `cargando` y `error`

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T1.A
- **Paralelizable con:** T4.1, T5.1
- **Por qué existe:** `useCatalogos.ts:45` devuelve `EmpleadoResumen[]` a secas, descartando
  `isLoading` y `isError`. Si la petición falla, el select de "Responsable" aparece **vacío,
  sin spinner ni mensaje**, y el usuario no puede saber por qué no hay opciones. Lo consumen
  4 pantallas. Además devuelve un array nuevo en cada render, lo que rehace las opciones del
  Select en cada pulsación del formulario padre.

### Archivos que toca
- `src/hooks/useCatalogos.ts` (modifica)
- `src/components/EmpleadoSelect.tsx` (modifica)
- `src/components/CrearTareaModal.tsx` (modifica)
- `src/pages/Actividades/ActividadesPage.tsx` (modifica)
- `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` (modifica)
- `src/pages/OportunidadDetalle/TareasCard.tsx` (modifica)

### Pasos

**Paso 1.** En `src/hooks/useCatalogos.ts`, reemplazar la función completa. Buscar:

```ts
export function useEmpleadosSeleccionables(): EmpleadoResumen[] {
  const empleadoActual = useAuthStore((s) => s.empleado)
  const soloSelf = tieneRol(empleadoActual, ['vendedor', 'analista'])
  const empleados = useEmpleados({ activo: true }, !soloSelf)
  if (soloSelf) return empleadoActual ? [empleadoActual] : []
  return empleados.data ?? []
}
```

Reemplazar por:

```ts
export interface EmpleadosSeleccionables {
  datos: EmpleadoResumen[]
  cargando: boolean
  error: boolean
}

/**
 * Devuelve además `cargando` y `error`: antes solo devolvía el array, así que
 * un fallo de red dejaba el Select de "Responsable" vacío y sin explicación,
 * indistinguible de "no hay empleados". La identidad del array se memoiza para
 * no rehacer las opciones del Select en cada render del formulario padre.
 */
export function useEmpleadosSeleccionables(): EmpleadosSeleccionables {
  const empleadoActual = useAuthStore((s) => s.empleado)
  const soloSelf = tieneRol(empleadoActual, ['vendedor', 'analista'])
  const empleados = useEmpleados({ activo: true }, !soloSelf)

  return useMemo(() => {
    if (soloSelf) {
      return {
        datos: empleadoActual ? [empleadoActual] : [],
        cargando: false,
        error: false,
      }
    }
    return {
      datos: empleados.data ?? [],
      cargando: empleados.isLoading,
      error: empleados.isError,
    }
  }, [soloSelf, empleadoActual, empleados.data, empleados.isLoading, empleados.isError])
}
```

Añadir `useMemo` al import de `react` en la cabecera del archivo. Si el archivo no importa
de `react`, añade `import { useMemo } from 'react'` como primera línea de imports.

**Paso 2.** En `src/components/EmpleadoSelect.tsx`, añadir dos props opcionales a
`EmpleadoSelectProps` y a `EmpleadoMultiSelectProps`:

```ts
  cargando?: boolean
  error?: boolean
```

En **ambos** componentes, añadir `cargando` y `error` a la desestructuración de props y
pasar al `<Select>`:

```tsx
      loading={cargando}
      status={error ? 'error' : undefined}
      notFoundContent={
        error ? 'No se pudieron cargar los empleados' : cargando ? 'Cargando…' : undefined
      }
```

**Paso 3.** Actualizar los 4 consumidores. En cada uno, la llamada
`useEmpleadosSeleccionables()` ahora devuelve un objeto. Localiza dónde se pasa esa variable
a `EmpleadoSelect` / `EmpleadoMultiSelect` / `TareaDetalleModal` y sustitúyela por
`<variable>.datos`, añadiendo `cargando={<variable>.cargando}` y `error={<variable>.error}`
donde el componente destino los acepte.

Archivos y variables afectadas:
- `src/components/CrearTareaModal.tsx:61` → `const empleados = ...`
- `src/pages/Actividades/ActividadesPage.tsx:28` → `const empleados = ...`
- `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx:94` → `const empleadosTareas = ...`
- `src/pages/OportunidadDetalle/TareasCard.tsx:35` → `const empleados = ...`

> `TareaDetalleModal` recibe `empleados: EmpleadoResumen[]` como prop. **No cambies su
> firma** — pásale `<variable>.datos`.

**Paso 4.** Ejecutar `npx tsc --noEmit`. El compilador señalará **todos** los sitios que
faltan por adaptar: recórrelos hasta que quede limpio. No añadas casts para silenciarlo.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- `useEmpleadosSeleccionables` devuelve `{ datos, cargando, error }`.
- Los selects muestran estado de carga y de error.
- type-check limpio.

---
---

# OLA 8 — Dos agentes en PARALELO

> **Disjunción verificada:** T5.3 → `monto.ts`, `monto.test.ts`, `PropiedadesCard.tsx`.
> T5.4 → `router/rutas.ts`, `router/index.tsx`, `guards.tsx`, `LoginPage.tsx`. Sin solape.

## T5.3 — Eliminar la aritmética de dinero duplicada en `PropiedadesCard`

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** **T4.1** (mismo archivo — NO paralelizar con ella)
- **Paralelizable con:** T5.4
- **Por qué existe:** `CLAUDE.md` regla 11 ("sin lógica de negocio en componentes").
  `PropiedadesCard.tsx:348-349` recalcula bruto y descuento a mano **en el mismo archivo que
  ya importa `calcularMontoTotal`** de `utils/monto.ts`. La copia además omite el redondeo a
  dos decimales que sí hace la función canónica, así que las dos pueden diferir en el céntimo.

### Archivos que toca
- `src/utils/monto.ts` (modifica)
- `src/utils/monto.test.ts` (modifica — añade casos)
- `src/pages/OportunidadDetalle/PropiedadesCard.tsx` (modifica)

### Pasos

**Paso 1 — TDD, test primero.** Añadir al final de `src/utils/monto.test.ts`:

```ts
describe('calcularDescuento', () => {
  it('devuelve el importe descontado, no el porcentaje', () => {
    expect(calcularDescuento(2, '1000.00', '10')).toBe(200)
  })

  it('devuelve 0 si no hay descuento', () => {
    expect(calcularDescuento(2, '1000.00', '0')).toBe(0)
  })

  it('el bruto menos el descuento es el monto total', () => {
    const bruto = 2 * 1000
    expect(bruto - calcularDescuento(2, '1000.00', '10')).toBe(
      calcularMontoTotal(2, '1000.00', '10'),
    )
  })
})
```

Añadir `calcularDescuento` al import del archivo. Ejecutar `npm run test -- monto`:
**DEBE FALLAR** (fase RED).

**Paso 2.** En `src/utils/monto.ts`, añadir tras `calcularMontoTotal`:

```ts
/**
 * Importe (no porcentaje) que se descuenta del bruto. Vive aquí y no en el
 * componente para que use exactamente el mismo redondeo que `calcularMontoTotal`:
 * si divergen, el desglose no cuadra con el total que muestra al lado.
 */
export function calcularDescuento(
  cantidad: number | null | undefined,
  precioUnitario: string | number | null | undefined,
  dcto: string | number | null | undefined,
): number {
  const qty = Number(cantidad ?? 0)
  const precio = Number(precioUnitario ?? 0)
  const descuento = Number(dcto ?? 0)
  if (Number.isNaN(qty) || Number.isNaN(precio) || Number.isNaN(descuento)) return 0
  return Math.round(qty * precio * (descuento / 100) * 100) / 100
}
```

**Paso 3.** Ejecutar `npm run test -- monto` (fase GREEN).

**Paso 4.** En `src/pages/OportunidadDetalle/PropiedadesCard.tsx`, buscar exactamente:

```ts
  const bruto = o.cantidad * Number(o.precio_unitario)
  const descuentoMonto = (bruto * Number(o.dcto)) / 100
```

Reemplazar por:

```ts
  const bruto = o.cantidad * Number(o.precio_unitario)
  const descuentoMonto = calcularDescuento(o.cantidad, o.precio_unitario, o.dcto)
```

**Paso 5.** Añadir `calcularDescuento` al import existente de `@/utils/monto` (línea 14).

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- El componente no calcula el descuento a mano.

---

## T5.4 — Constante compartida de la ruta `/cambiar-contrasena`

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T2.1
- **Paralelizable con:** T5.3
- **Por qué existe:** El literal `'/cambiar-contrasena'` vive hoy en 4 sitios tras T2.1
  (`guards.tsx` ×2, `LoginPage.tsx` ×2, `router/index.tsx`). Renombrar la ruta en el router
  deja los demás comparando contra un path que ya no existe, y el fallo es silencioso.

### Archivos que toca
- `src/router/rutas.ts` (crea)
- `src/router/index.tsx` (modifica)
- `src/router/guards.tsx` (modifica)
- `src/pages/Login/LoginPage.tsx` (modifica)

### Pasos

**Paso 1.** Crear `src/router/rutas.ts`:

```ts
/**
 * Rutas que se referencian desde más de un módulo. Tenerlas como literal suelto
 * hacía que renombrar una en el router dejara a los guards comparando contra un
 * path inexistente, sin que fallara ni el build ni ningún tipo.
 */
export const RUTA_LOGIN = '/login'
export const RUTA_CAMBIO_CONTRASENA = '/cambiar-contrasena'
export const RUTA_INICIO = '/'
```

**Paso 2.** En `src/router/index.tsx`, `src/router/guards.tsx` y
`src/pages/Login/LoginPage.tsx`, importar lo necesario (en los dos de `src/router/` usa
`'./rutas'`; en `LoginPage.tsx` usa `'@/router/rutas'`) y sustituir **todos** los literales
`'/cambiar-contrasena'` y `'/login'`.

**Importante sobre `'/'`:** sustitúyelo por `RUTA_INICIO` **solo** donde represente un
destino de navegación (`<Navigate to="/" …>`, `navigate('/')`). **NO** lo sustituyas en la
definición de la ruta `<Route path="/" element={…}>` ni en `path="*"`.

**Paso 3.** Verificar que no quedan literales:

```bash
grep -rn "cambiar-contrasena" src/ | grep -v "src/router/rutas.ts"
```

Solo deben aparecer líneas donde se use la constante `RUTA_CAMBIO_CONTRASENA`, ninguna con
el string literal entre comillas.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- Un único literal de la ruta, en `src/router/rutas.ts`.

---
---

# OLA 9

## T6.1 — Límite de tamaño de archivo: alinear con el contrato configurable

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** nada (puede ir en cualquier ola posterior a T0.1)
- **Por qué existe:** `src/utils/archivos.ts:7-15` documenta el límite de subida como un
  hecho fijo ("Confirmado con el equipo de backend: el límite del servidor es 104_857_600
  bytes"), pero `docs/contrato_api.md §24` ahora dice que es
  `app.drive.max-file-size-bytes`, **configurable, con 104_857_600 solo como valor por
  defecto**. Si ops lo baja, el usuario espera a que suba un archivo de 90 MB para recibir
  un 413 y un mensaje que le asegura que el límite son 100 MB.

### Archivos que toca
- `src/utils/archivos.ts` (modifica — SOLO el bloque de comentario)

### Pasos

**Paso 1.** Localizar el comentario sobre `MAX_TAMANO_ARCHIVO_MB` (líneas 7-15
aproximadamente) y reemplazar la afirmación de que el límite es fijo por una que refleje
el contrato actual. El comentario debe decir, en sustancia:

- que `100` es el valor **por defecto** del backend (`app.drive.max-file-size-bytes`),
  no una garantía;
- que la validación de cliente es solo UX: ahorra una subida larga condenada al 413,
  pero **la autoridad es el backend**;
- que si ops cambia esa propiedad, este número queda desalineado y hay que actualizarlo
  a mano, porque el backend **no expone el límite** por API.

**Paso 2.** **NO cambies el valor `100`.** No cambies ninguna lógica. Solo el comentario.

### Verificación

```bash
npm run type-check && npm run test && git diff --stat src/utils/archivos.ts
```

El diff debe mostrar cambios **solo** en líneas de comentario.

### Criterio de terminado
- El comentario ya no afirma que el límite sea fijo y garantizado.

---
---

---
---

# OLA 10

## T7.1 — `authStore.ts`: `ROLES_APOYO` y corregir `ROLES_FACTURA`

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T1.A (necesita `otro` ya en el tipo `Rol`)
- **Paralelizable con:** nada (todas las tareas de la Ola 11 importan de aquí)
- **Por qué existe:** Backend confirmó (PR #9, mergeado; `docs/contrato_api.md` §25 y
  las notas por endpoint en §2, §3) que `analista` y `otro` pasan a "roles de apoyo":
  pierden cartera propia, su visibilidad sobre empresas/oportunidades se reduce a donde
  colaboran vía tarea, y toda escritura sobre esos dos recursos responde
  `403 PERMISO_INSUFICIENTE`. Además, **`ROLES_FACTURA` hoy incluye `analista`**
  (`src/store/authStore.ts:30`), y el contrato dice explícitamente (línea 1140):
  *"`analista`, que dejó de tener este privilegio al pasar a rol de apoyo"*. Es un bug
  de permisos activo hasta que se corrija esta constante.

### Archivos que toca
- `src/store/authStore.ts` (modifica)
- `src/store/authStore.test.ts` (crea)

### Pasos

**Paso 1 — TDD, test primero.** Crear `src/store/authStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ROLES_APOYO, ROLES_FACTURA } from './authStore'

describe('ROLES_APOYO', () => {
  it('son exactamente analista y otro — sin cartera propia desde 2026-08-18 (contrato §25)', () => {
    expect([...ROLES_APOYO].sort()).toEqual(['analista', 'otro'])
  })
})

describe('ROLES_FACTURA', () => {
  it('ya no incluye analista — perdió el privilegio al pasar a rol de apoyo (contrato §3.7)', () => {
    expect(ROLES_FACTURA).not.toContain('analista')
    expect([...ROLES_FACTURA].sort()).toEqual(['admin', 'gerencia'])
  })
})
```

Ejecutar `npm run test -- authStore`. **DEBE FALLAR** (fase RED).

**Paso 2.** En `src/store/authStore.ts`, buscar exactamente:

```ts
/** Roles que pueden confirmar el paso a facturado */
export const ROLES_FACTURA: Rol[] = ['admin', 'gerencia', 'analista']
```

Reemplazar por:

```ts
/**
 * Roles que pueden confirmar el paso a facturado. `analista` perdió este
 * privilegio el 2026-08-18 al pasar a rol de apoyo (contrato §3.7, §25).
 */
export const ROLES_FACTURA: Rol[] = ['admin', 'gerencia']

/**
 * Roles de apoyo (2026-08-18, contrato §25): sin cartera propia. Su
 * visibilidad sobre empresas/oportunidades se reduce a donde colaboran vía
 * tarea (`ids_colaboradores`), y NINGUNA escritura sobre esos dos recursos
 * les está permitida — el backend responde `403 PERMISO_INSUFICIENTE` a
 * crear, editar, cambiar estado, subir archivos a Drive, vincular contacto a
 * una oportunidad, aplicar descuento (por ninguna vía) o crear una solicitud.
 * Eventos y la vinculación de contactos a una EMPRESA (no a una oportunidad)
 * quedan exentos — no tienen guard de escritura propio en el backend
 * (asimetría documentada, no un descuido; ver `matriz_permisos.md §2.3/§2.5`).
 */
export const ROLES_APOYO: Rol[] = ['analista', 'otro']
```

**Paso 3.** Ejecutar `npm run test -- authStore` (fase GREEN) y `npx tsc --noEmit`.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- `ROLES_APOYO` existe y exporta `['analista', 'otro']`.
- `ROLES_FACTURA` ya no contiene `analista`.

---
---

# OLA 11 — Seis agentes en PARALELO

> **Disjunción verificada:** cada tarea toca un conjunto de archivos que no se repite en
> ninguna otra tarea de esta ola. Todas dependen únicamente de T7.1 (Ola 10).

## T7.2 — Ocultar "Nueva empresa" / "Nueva oportunidad" en los listados

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T7.1
- **Paralelizable con:** T7.3, T7.4, T7.5, T7.6, T7.7
- **Por qué existe:** `POST /empresas` y `POST /oportunidades` responden
  `403 PERMISO_INSUFICIENTE` para roles de apoyo (contrato líneas 511, 984). Los tres
  botones que abren esos formularios no tienen ningún guard de rol hoy.

### Archivos que toca
- `src/pages/Cartera/CarteraPage.tsx` (modifica)
- `src/pages/Pipeline/PipelinePage.tsx` (modifica)
- `src/pages/Prospeccion/ProspeccionPage.tsx` (modifica)

### Pasos

**Paso 1.** En `src/pages/Cartera/CarteraPage.tsx`, el archivo ya importa
`useAuthStore, ROLES_ADMIN, ROLES_BANDEJA_GERENCIA, ROLES_SUPERVISION, tieneRol` y ya
declara `empleado` (línea ~85-90, junto a `esAdmin`/`esSupervision`/`veCarteraMaestra`).
Añade `ROLES_APOYO` a ese import, y junto a las demás variables de rol declara:

```ts
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

Buscar exactamente:

```tsx
          <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => setModalNueva(true)}>
            Nueva empresa
          </Button>
```

Reemplazar por:

```tsx
          {!esRolDeApoyo && (
            <Button type="primary" icon={<Icono nombre="add" tamano={18} />} onClick={() => setModalNueva(true)}>
              Nueva empresa
            </Button>
          )}
```

**Paso 2.** En `src/pages/Pipeline/PipelinePage.tsx`, el archivo ya importa
`useAuthStore, ROLES_ADMIN, tieneRol` — pero `esAdmin` (línea ~186-187) está declarado en
una función/componente **distinto** del que renderiza el botón "Nueva Oportunidad"
(línea ~89-94). Lee el archivo completo primero para identificar en qué función vive el
botón. En **esa** función (la que contiene `setModalNueva`), añade:

```ts
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

(si `empleado` ya está declarado en ese scope por otra razón, no lo dupliques — solo añade
la línea de `esRolDeApoyo` reusando ese `empleado`). Añade `ROLES_APOYO` al import existente
de `@/store/authStore`. Buscar exactamente:

```tsx
          <button
            className="flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-pill hover:bg-brand-primary/90 transition-all font-bold text-body-sm shadow-lg shadow-brand-primary/20"
            onClick={() => setModalNueva(true)}
          >
            <span className="material-symbols-outlined">add</span>
            Nueva Oportunidad
```

Envolver ese `<button>` (hasta su cierre `</button>`) en `{!esRolDeApoyo && ( ... )}`.

**Paso 3.** En `src/pages/Prospeccion/ProspeccionPage.tsx`, el archivo **no** importa nada
de `@/store/authStore` — añádelo:

```ts
import { useAuthStore, ROLES_APOYO, tieneRol } from '@/store/authStore'
```

y en el componente principal de la página, declara:

```ts
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

Hay **dos** triggers a envolver:

Trigger A — buscar exactamente:

```tsx
                <button
                  className="flex items-center gap-2 px-8 py-3 bg-[#0799b6] text-white font-button rounded-full hover:opacity-90 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={listaParaConvertir === null}
                  onClick={() => setConvertir(listaParaConvertir)}
                >
                  <span className="material-symbols-outlined">rocket_launch</span>
                  Crear Oportunidad
                </button>
```

Reemplazar `disabled={listaParaConvertir === null}` por
`disabled={listaParaConvertir === null || esRolDeApoyo}`. No lo ocultes: es el único CTA de
la página y ocultarlo entero dejaría un hueco extraño en el layout; deshabilitarlo con el
mismo mecanismo que ya usa para "no hay candidata" es consistente.

Trigger B — el botón por fila vive en un componente/función hijo (recibe `onConvertir` como
prop desde la fila padre). Si ese componente hijo no tiene acceso a `empleado`, pásale
`esRolDeApoyo` como prop nueva desde donde se invoca (busca dónde se le pasa `onConvertir`)
y úsala para envolver:

```tsx
          {item.lista_para_convertir && (
            <button
              className="bg-primary-container text-on-primary-container p-2 rounded-full hover:shadow-md transition-all"
              title="Convertir a oportunidad"
              onClick={onConvertir}
            >
              <span className="material-symbols-outlined">add_circle</span>
            </button>
          )}
```

Cambiar la condición a `{item.lista_para_convertir && !esRolDeApoyo && (`.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- Los tres triggers de creación están ocultos/deshabilitados para `analista`/`otro`.
- `npx tsc --noEmit` limpio (confirma que ninguna variable quedó fuera de scope).

---

## T7.3 — `EmpresaDetallePage.tsx`: editar, estado de cartera, nueva gestión

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T7.1
- **Paralelizable con:** T7.2, T7.4, T7.5, T7.6, T7.7
- **Por qué existe:** `PUT /empresas/:id` (línea 558) y
  `PATCH /empresas/:id/estado-cartera` (línea 621) responden 403 para roles de apoyo.
  `POST /oportunidades` disparado desde "Nueva Gestión" también (ya cubierto conceptualmente
  en T7.2, pero este trigger vive en este archivo, no en los de esa tarea).

### Archivos que toca
- `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` (modifica)

### Pasos

**Paso 1.** El archivo ya importa `useAuthStore, ROLES_ADMIN, ROLES_BANDEJA_GERENCIA,
ROLES_SUPERVISION, tieneRol` y ya declara `empleado` (línea ~85-90). Añade `ROLES_APOYO` al
import y, junto a las demás variables de rol de ese mismo scope, declara:

```ts
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

**Paso 2.** Botón "Editar Datos" y "Nueva Gestión" — buscar exactamente:

```tsx
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-circular px-6 py-2 border border-brand-cyan text-brand-cyan font-bold hover:bg-brand-cyan/5 transition-colors"
              onClick={abrirEditar}
            >
              Editar Datos
            </button>
            <button
              className="btn-circular px-6 py-2 bg-brand-cyan text-white font-bold hover:opacity-90 transition-opacity"
              onClick={() => setModalOportunidad(true)}
            >
              Nueva Gestión
            </button>
```

Reemplazar por:

```tsx
          <div className="flex flex-wrap gap-3">
            {!esRolDeApoyo && (
              <button
                className="btn-circular px-6 py-2 border border-brand-cyan text-brand-cyan font-bold hover:bg-brand-cyan/5 transition-colors"
                onClick={abrirEditar}
              >
                Editar Datos
              </button>
            )}
            {!esRolDeApoyo && (
              <button
                className="btn-circular px-6 py-2 bg-brand-cyan text-white font-bold hover:opacity-90 transition-opacity"
                onClick={() => setModalOportunidad(true)}
              >
                Nueva Gestión
              </button>
            )}
```

**Paso 3.** Control de estado de cartera — buscar exactamente:

```tsx
                  {esDerivado ? (
                    <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded text-label-md font-bold uppercase">
                      {ETIQUETA_CARTERA[empresa.estado_cartera]} (derivado)
                    </span>
                  ) : (
                    <select
```

Reemplazar por:

```tsx
                  {esDerivado || esRolDeApoyo ? (
                    <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded text-label-md font-bold uppercase">
                      {ETIQUETA_CARTERA[empresa.estado_cartera]}
                      {esDerivado ? ' (derivado)' : ''}
                    </span>
                  ) : (
                    <select
```

(Se reutiliza el mismo patrón visual "es un valor, no un control" que ya existe para
`esDerivado` — no se inventa uno nuevo. El sufijo "(derivado)" solo debe aparecer cuando la
razón real es que el estado es derivado, no cuando es porque el rol es de apoyo.)

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- "Editar Datos" y "Nueva Gestión" ocultos para roles de apoyo.
- El estado de cartera se muestra como etiqueta de solo lectura para roles de apoyo.

---

## T7.4 — `PropiedadesCard.tsx`: triggers del modal + 4 controles inline

- **Modelo:** Sonnet 5 · **Effort:** alto (el archivo tiene 527 líneas y varias funciones
  con scopes de variables distintos — lee el archivo completo antes de editar)
- **Depende de:** T7.1
- **Paralelizable con:** T7.2, T7.3, T7.5, T7.6, T7.7
- **Por qué existe:** `PUT /oportunidades/:id` (línea 1107 del contrato) responde 403 para
  roles de apoyo. Hay **siete** puntos de escritura distintos en este archivo, no uno solo:
  tres triggers que abren `EditarTerminosModal`, y cuatro controles inline
  (Financiadora/Garantía/Financiamiento Paralelo/Notas) que llaman al mismo endpoint sin
  pasar por el modal — si solo se tapa el modal, esos cuatro siguen abiertos y el backend
  los rechazará con 403 igual, pero el usuario ya habrá escrito el cambio antes de enterarse.

### Archivos que toca
- `src/pages/OportunidadDetalle/PropiedadesCard.tsx` (modifica)

### Pasos

**Paso 1.** Lee el archivo completo antes de tocar nada. Identifica las funciones/componentes
que contienen cada uno de los siete puntos de abajo — no asumas que todos comparten el mismo
scope de variables.

**Paso 2.** Añade `ROLES_APOYO` al import existente de la línea 8:
`import { useAuthStore, ROLES_ADMIN, tieneRol } from '@/store/authStore'`.

**Paso 3 — dentro de `EditarTerminosModal`.** Ya declara
`const empleado = useAuthStore((s) => s.empleado)` (línea ~44). Justo después, añade:

```ts
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

**Paso 4 — los cuatro controles inline.** Estos viven en el componente que renderiza la
tarjeta completa (no dentro de `EditarTerminosModal` ni de `BotonEditar` — confirma el scope
exacto al leer el archivo; si ese componente no tiene `empleado` en scope, declara ahí mismo
`const empleado = useAuthStore((s) => s.empleado)` y
`const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)`).

Añadir `disabled={esRolDeApoyo}` a cada uno de estos cuatro controles (busca cada bloque por
su `onChange`/`onBlur` característico, ya que son elementos `<select>`/`<textarea>` nativos,
no de Ant Design):

- El `<select>` de "Financiadora" (`onChange` que llama
  `guardarCampo({ id_financiadora: ... })`).
- El `<select>` de "Aplica Garantía" (`onChange` línea con
  `guardarCampo({ garantia: e.target.value === 'si' }, 'Garantía actualizada')`).
- El `<select>` de "Financiamiento Paralelo" (`onChange` con
  `guardarCampo({ finc_paralelo: e.target.value === 'si' }, ...)`).
- El `<textarea>` de "Notas de Seguimiento" (`onBlur` con
  `guardarCampo({ notas: nuevo || null }, 'Notas guardadas')`).

En los tres `<select>`, añade el atributo `disabled={esRolDeApoyo}` junto a los demás
atributos del elemento. En el `<textarea>`, igual.

**Paso 5 — trigger 1, botón "edit" del encabezado (`BotonEditar`).** Ya declara
`const empleado = useAuthStore((s) => s.empleado)` y
`const esAdmin = tieneRol(empleado, ROLES_ADMIN)` (línea ~290-291). Justo después, añade:

```ts
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

Buscar exactamente:

```tsx
      <button
        className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors border border-outline-variant"
        title="Editar términos"
        onClick={() => setAbierto(true)}
      >
        <span className="material-symbols-outlined">edit</span>
      </button>
```

Envolver en `{!esRolDeApoyo && ( ... )}`.

**Paso 6 — trigger 2, enlace "Editar términos".** Vive en el componente principal de la
tarjeta (el mismo del Paso 4 — reusa el `esRolDeApoyo` ya declarado ahí). Buscar
exactamente:

```tsx
          <button
            className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline"
            onClick={() => setModalEditar(true)}
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar términos
          </button>
```

Envolver en `{!esRolDeApoyo && ( ... )}`.

**Paso 7 — trigger 3, div clickeable de "Fecha Cierre Estimado".** Mismo scope que el
Paso 6. Buscar exactamente:

```tsx
          <div
            className="flex items-center gap-3 border border-outline-variant rounded p-3 bg-surface-bright cursor-pointer hover:bg-surface-container-low transition-colors"
            onClick={() => setModalEditar(true)}
          >
            <span className="material-symbols-outlined text-primary">calendar_today</span>
            <span className="font-body-md">{formatoFecha(o.fecha_cierre_estimado)}</span>
          </div>
```

Reemplazar por:

```tsx
          <div
            className={
              esRolDeApoyo
                ? 'flex items-center gap-3 border border-outline-variant rounded p-3 bg-surface-bright'
                : 'flex items-center gap-3 border border-outline-variant rounded p-3 bg-surface-bright cursor-pointer hover:bg-surface-container-low transition-colors'
            }
            onClick={esRolDeApoyo ? undefined : () => setModalEditar(true)}
          >
            <span className="material-symbols-outlined text-primary">calendar_today</span>
            <span className="font-body-md">{formatoFecha(o.fecha_cierre_estimado)}</span>
          </div>
```

(No se oculta: sigue siendo el único lugar donde se ve la fecha de cierre estimado. Solo se
retira el cursor de "clickeable" y el `onClick`.)

**Paso 8.** No toques `SolicitudModal` ni su lógica de apertura: al quedar bloqueados los
tres triggers y los cuatro controles inline de este archivo, el `POST /solicitudes` que
`SolicitudModal` dispara queda inalcanzable transitivamente para estos roles — no hay ningún
otro punto de entrada a él en este archivo.

**Paso 9.** Ejecutar `npx tsc --noEmit`. Si algún `esRolDeApoyo`/`empleado` quedó fuera de
scope, el compilador lo señalará con "Cannot find name" — corrígelo declarándolo en el scope
correcto, no import-eando algo que no aplica.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- Los tres triggers del modal están ocultos para roles de apoyo.
- Los cuatro controles inline están `disabled` para roles de apoyo.
- `npx tsc --noEmit` limpio.

---

## T7.5 — `OportunidadDetallePage.tsx`: stepper completo + "Cerrar oportunidad"

- **Modelo:** Sonnet 5 · **Effort:** medio
- **Depende de:** T7.1
- **Paralelizable con:** T7.2, T7.3, T7.4, T7.6, T7.7
- **Por qué existe:** El contrato lista `PATCH /oportunidades/:id/estado` completo (no solo
  la transición a `facturado`) como bloqueado para roles de apoyo (changelog, línea 2265).
  Hoy el stepper solo deshabilita la etapa `facturado` (`deshabilitadoFactura`) — las otras
  tres etapas (`evaluacion_calidda`, `documentos_legales`, `cerrado`) y el botón "Cerrar
  oportunidad" no tienen ningún guard de rol y disparan el mismo endpoint ahora vetado.

### Archivos que toca
- `src/pages/OportunidadDetalle/OportunidadDetallePage.tsx` (modifica)

### Pasos

**Paso 1.** El archivo ya importa `useAuthStore, ROLES_FACTURA, tieneRol` (línea 7) y ya
declara (línea ~40-41):

```ts
  const empleado = useAuthStore((s) => s.empleado)
  const puedeFacturar = tieneRol(empleado, ROLES_FACTURA)
```

Añade `ROLES_APOYO` a ese import, y justo después de esas dos líneas:

```ts
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

**Paso 2.** Buscar exactamente:

```tsx
            {ETAPAS_PIPELINE.map((etapa, idx) => {
              const done = !estaCerrada && idx < indiceActual
              const activo = !estaCerrada && idx === indiceActual
              const deshabilitadoFactura = etapa === 'facturado' && !puedeFacturar
              return (
                <button
                  key={etapa}
                  type="button"
                  className="relative z-10 flex flex-col items-center gap-3 bg-white px-6 cursor-pointer disabled:cursor-not-allowed"
                  onClick={() => solicitarCambio(etapa)}
                  disabled={deshabilitadoFactura}
                  title={
                    deshabilitadoFactura
                      ? 'Solo admin, gerencia o analista pueden confirmar Facturado'
                      : `Mover a ${ETIQUETA_ETAPA[etapa]}`
                  }
                >
```

Reemplazar por:

```tsx
            {ETAPAS_PIPELINE.map((etapa, idx) => {
              const done = !estaCerrada && idx < indiceActual
              const activo = !estaCerrada && idx === indiceActual
              const deshabilitadoFactura = etapa === 'facturado' && !puedeFacturar
              const deshabilitado = deshabilitadoFactura || esRolDeApoyo
              return (
                <button
                  key={etapa}
                  type="button"
                  className="relative z-10 flex flex-col items-center gap-3 bg-white px-6 cursor-pointer disabled:cursor-not-allowed"
                  onClick={() => solicitarCambio(etapa)}
                  disabled={deshabilitado}
                  title={
                    esRolDeApoyo
                      ? 'Tu rol es de apoyo: solo puedes ver esta oportunidad, no editarla'
                      : deshabilitadoFactura
                        ? 'Solo admin o gerencia pueden confirmar Facturado'
                        : `Mover a ${ETIQUETA_ETAPA[etapa]}`
                  }
                >
```

(Nota el mensaje de `deshabilitadoFactura` corregido: ya no dice "o analista" — dejó de ser
cierto en T7.1.)

**Paso 3.** Buscar exactamente:

```tsx
          {!estaCerrada && (
            <div className="flex justify-end mt-4">
              <button
                className="btn-circular px-5 py-1.5 border border-error text-error text-label-md font-bold hover:bg-error-container/40 transition-colors"
                onClick={() => solicitarCambio('cerrado')}
              >
                Cerrar oportunidad
              </button>
            </div>
          )}
```

Reemplazar `{!estaCerrada && (` por `{!estaCerrada && !esRolDeApoyo && (`.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- Las cuatro etapas del stepper están deshabilitadas para roles de apoyo, no solo
  `facturado`.
- "Cerrar oportunidad" oculto para roles de apoyo.

---

## T7.6 — `ContactosCard.tsx` (oportunidad): vincular y desvincular

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T7.1
- **Paralelizable con:** T7.2, T7.3, T7.4, T7.5, T7.7
- **Por qué existe:** `POST /oportunidades/:id/contactos` (vincular) está explícitamente
  bloqueado en el contrato (línea 1201). `DELETE /oportunidades/:id/contactos/:contacto_id`
  (desvincular) **no tiene línea `Roles:` documentada** — vacío real del contrato. Por
  decisión explícita (2026-08-20): se asume el caso más restrictivo (bloqueado, igual que su
  endpoint hermano `POST`) hasta que backend lo confirme por escrito.

### Archivos que toca
- `src/pages/OportunidadDetalle/ContactosCard.tsx` (modifica)

### Pasos

**Paso 1.** El archivo **no** importa nada de `@/store/authStore` — añádelo:

```ts
import { useAuthStore, ROLES_APOYO, tieneRol } from '@/store/authStore'
```

En el componente principal del archivo, declara:

```ts
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

**Paso 2.** Botón "vincular contacto" — buscar exactamente:

```tsx
        <button
          className="p-2 hover:bg-primary/10 rounded-full text-primary transition-colors"
          onClick={() => setModalVincular(true)}
        >
          <span className="material-symbols-outlined">person_add</span>
        </button>
```

Envolver en `{!esRolDeApoyo && ( ... )}`.

**Paso 3.** Botón "desvincular contacto" — buscar exactamente:

```tsx
                <Popconfirm
                  title="¿Desvincular contacto de la oportunidad?"
                  okText="Desvincular"
                  cancelText="Cancelar"
                  onConfirm={() =>
                    desvincular.mutate(c.id, {
                      onSuccess: () => message.success('Contacto desvinculado'),
                      onError: (e) => message.error(mensajeDeError(e)),
                    })
                  }
                >
                  <button
                    className="flex-1 py-2 bg-surface-container rounded-full text-error hover:bg-error hover:text-white transition-all flex justify-center items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-[20px]">link_off</span>
                  </button>
                </Popconfirm>
```

Envolver el `<Popconfirm>` completo (incluida su etiqueta de cierre) en
`{!esRolDeApoyo && ( ... )}`, y justo antes de esa línea añade el comentario:

```tsx
                {/* DELETE /oportunidades/:id/contactos/:contacto_id no tiene rol
                    documentado en el contrato (vacío real, no una omisión de este
                    archivo). Se asume bloqueado para roles de apoyo por ser el mismo
                    recurso que POST (sí documentado, línea 1201) — pendiente de que
                    backend lo confirme por escrito. Ver plan 2026-08-18, T7.6. */}
```

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- Ambos botones ocultos para roles de apoyo, con el supuesto de DELETE documentado en el
  propio código.

---

## T7.7 — `DocumentosDrive.tsx`: crear carpeta y subir archivo (ambos contextos)

- **Modelo:** Sonnet 5 · **Effort:** bajo
- **Depende de:** T7.1
- **Paralelizable con:** T7.2, T7.3, T7.4, T7.5, T7.6
- **Por qué existe:** `POST /{empresas|oportunidades}/:id/carpeta-drive` y
  `POST /{empresas|oportunidades}/:id/archivos` están bloqueados para roles de apoyo en
  ambos contextos (líneas 673, 717, 1023, 1068 del contrato). Como este componente ya
  parametriza el endpoint por la prop `tipo` y el gate de rol es idéntico en los dos casos,
  se resuelve con un único cambio interno — sin tocar los dos callers
  (`EmpresaDetallePage.tsx`, `OportunidadDetallePage.tsx`) ni añadir una prop nueva.

### Archivos que toca
- `src/components/DocumentosDrive.tsx` (modifica)

### Pasos

**Paso 1.** El archivo no importa nada de `@/store/authStore` — añádelo tras los imports
existentes:

```ts
import { useAuthStore, ROLES_APOYO, tieneRol } from '@/store/authStore'
```

Dentro de la función `DocumentosDrive`, cerca de donde se declaran los hooks de mutación
(`useSubirArchivo`, `useCrearCarpetaDrive`), añade:

```ts
  const empleado = useAuthStore((s) => s.empleado)
  const esRolDeApoyo = tieneRol(empleado, ROLES_APOYO)
```

**Paso 2.** Botón "Crear carpeta" — buscar exactamente:

```tsx
        <Tooltip title="Aún no existe la carpeta en Drive. Créala para empezar a guardar documentos.">
          <span className="block">
            <Button
              type="primary"
              block
              loading={crearCarpeta.isPending}
              disabled={crearCarpeta.isPending}
              onClick={() => void onCrearCarpeta()}
              icon={<Icono nombre="create_new_folder" tamano={18} />}
            >
              {crearCarpeta.isPending ? 'Creando…' : `Crear ${nombreFile}`}
            </Button>
          </span>
        </Tooltip>
```

Reemplazar por:

```tsx
        <Tooltip
          title={
            esRolDeApoyo
              ? 'Tu rol es de solo lectura: no puedes crear la carpeta de Drive'
              : 'Aún no existe la carpeta en Drive. Créala para empezar a guardar documentos.'
          }
        >
          <span className="block">
            <Button
              type="primary"
              block
              loading={crearCarpeta.isPending}
              disabled={crearCarpeta.isPending || esRolDeApoyo}
              onClick={() => void onCrearCarpeta()}
              icon={<Icono nombre="create_new_folder" tamano={18} />}
            >
              {crearCarpeta.isPending ? 'Creando…' : `Crear ${nombreFile}`}
            </Button>
          </span>
        </Tooltip>
```

**Paso 3.** Control de subida (Dragger) — buscar exactamente:

```tsx
        <Upload.Dragger
          maxCount={1}
          showUploadList={false}
          disabled={subir.isPending}
```

Reemplazar `disabled={subir.isPending}` por `disabled={subir.isPending || esRolDeApoyo}`.

No lo ocultes por completo: a diferencia de otros triggers de esta ola, aquí el
`disabled` deja visible el texto explicativo de abajo ("Arrastra un documento..."), que se
puede además condicionar en un paso opcional si el agente lo considera de bajo riesgo — pero
no es obligatorio para el criterio de terminado.

### Verificación

```bash
npm run type-check && npm run test
```

### Criterio de terminado
- "Crear carpeta" deshabilitado con tooltip explicativo para roles de apoyo.
- El Dragger de subida deshabilitado para roles de apoyo.
- Un único cambio cubre ambos contextos (empresa y oportunidad) sin duplicar el componente.

# Fuera de alcance de este plan — requieren decisión humana

Estas cuestiones surgieron en la auditoría pero **no** se asignan a ningún agente, porque la
decisión no es técnica:

1. **`AdminImportCsvTemp` vivo en producción.** Está ruteado en `AdminPage.tsx:64` pese a que
   `CLAUDE.md` lista "import de Excel" como fuera del MVP. Decidir: ¿se promueve a
   funcionalidad oficial (y se documenta en el PRD) o se retira?

2. **`docs/contrato_api.md` editado unilateralmente.** `CLAUDE.md` dice que el documento es
   propiedad del backend. La tabla §23 de enums —lo más valioso que produjo esta auditoría—
   se perderá en el próximo sync desde backend. Hay que **pedir al equipo de backend que la
   incorpore a su documento oficial**.

3. **Workflow de Docker + nginx que no sirve tráfico.** Su propia cabecera dice que
   producción está en Vercel. Construye y publica una imagen que nadie despliega, en cada
   push a `main`. Decidir si se conserva como contingencia o se retira.

4. **Violaciones de ESLint restantes tras T0.2.** El inventario saldrá de esa tarea. Con el
   conteo real se planificará una ola de limpieza dedicada.

5. **React Hook Form + Zod se usan en 2 de ~25 formularios.** El resto usa `Form` de Ant
   Design con `rules`. Dos sistemas de formularios y dos de validación conviviendo. Decidir
   si se converge a uno.

6. **Cobertura de tests tras esta ronda.** Este plan deja tests solo donde toca código.
   `TESTING-frontend.md` describe un régimen mucho más amplio. Definir el umbral de cobertura
   exigible y planificar la ola que lo alcance.

7. **Restricción de `analista` y `otro` a solo-lectura en oportunidades/empresas — RESUELTO,
   implementado como Ola 10-11 (T7.1 a T7.7).** Historial: pedido de producto (2026-08-18) →
   se identificó que contradecía permisos vigentes del backend (`ROLES_FACTURA` incluía
   `analista`, `limiteDctoDirecto('analista')` daba `3`) → se pausó y se redactó una solicitud
   formal a backend → backend implementó el cambio en PR #9 (mergeado 2026-08-20) y actualizó
   `docs/contrato_api.md` (§25 Changelog, más notas por endpoint en §2/§3/§9/§10/§19/§20).

   **Dato que simplificó la implementación:** la visibilidad ("solo ve donde colabora vía
   tarea") la filtra el backend directamente en `GET /oportunidades`/`GET /empresas` — el
   frontend no necesitó ningún filtro ni parámetro nuevo, solo recibe menos filas, igual que
   ya ocurre hoy con `vendedor`. Todo el trabajo de T7.2-T7.7 es ocultar/deshabilitar los
   triggers de escritura que el backend ahora rechaza con 403.

   **Dos supuestos sin confirmación escrita de backend, asumidos por decisión explícita
   (2026-08-20, "asumir el caso más restrictivo y avanzar"), documentados en el código
   por T7.6:**
   - `DELETE /oportunidades/:id/contactos/:contacto_id` (desvincular contacto de una
     oportunidad) no tiene línea `Roles:` en el contrato — se asumió bloqueado para roles de
     apoyo, igual que su `POST` hermano (sí documentado). Verificar con backend y actualizar
     el comentario en `ContactosCard.tsx` cuando se confirme.
   - `PUT /oportunidades/:id/contactos/:contacto_id` (editar rol de un contacto en la
     oportunidad) tampoco tiene `Roles:` documentado, pero no tiene ninguna UI que lo dispare
     en el frontend hoy — no requirió ningún cambio, solo queda como nota para cuando se
     construya esa UI en el futuro.
   - `PATCH /oportunidades/:id/vendedor` (traspaso de oportunidad) no tiene sección
     documentada en el contrato en absoluto, pero el hook `useTraspasarOportunidad` no está
     conectado a ningún botón — no hay superficie de UI que gatear, no bloqueante.
