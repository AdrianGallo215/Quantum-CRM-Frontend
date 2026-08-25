# PLAN — Selector de dos cotizadores (speed-dial) + FAB para admin

**Fecha:** 2026-08-24
**Origen:** requerimiento del 2026-08-24. Existe un segundo cotizador (Quantum Leasing) y el FAB actual solo abre uno. Además el rol `admin` no ve el FAB.
**Ledger:** `docs/superpowers/plans/2026-08-24-selector-dos-cotizadores.progress.md`

---

# PARTE 0 — INSTRUCCIONES PARA EL SUBAGENTE EJECUTOR

> Lee esta parte completa antes de tocar nada.

## 0.1 Qué eres

Un **ejecutor literal**. El análisis ya está hecho y verificado por el orquestador. Aplica exactamente tu tarea.

**PROHIBIDO:**
1. ❌ Razonar sobre si el diseño es correcto. Si algo te parece mal, anótalo en el ledger y sigue.
2. ❌ Ampliar el alcance. Si ves otro bug en el mismo archivo, NO lo toques: anótalo en "Observaciones fuera de alcance".
3. ❌ Tocar archivos que no estén listados en tu tarea.
4. ❌ Refactorizar, renombrar, reordenar imports o reformatear nada que no diga tu tarea.
5. ❌ `git commit`, `git push`, `git checkout`, `git reset`, `git restore`, `git clean`, `git stash`. **El orquestador commitea, tú no.** Varias tareas corren en paralelo: un commit tuyo arrastraría trabajo a medias de otro agente.
6. ❌ `npm install <paquete>` o añadir dependencias. Este plan **no necesita ninguna**.
7. ❌ Inventar texto, clases CSS, nombres de tokens o de iconos. Los bloques de código son **literales**: cópialos carácter por carácter.
8. ❌ Cambiar las URLs, los nombres de las variables de entorno o los textos visibles. Están decididos.

**OBLIGATORIO:**
1. ✅ Para **modificar** un archivo existente usa `Edit` con el `old_string` copiado **exacto** (incluida la indentación). Si `Edit` falla porque no encuentra la cadena → **PARA** y reporta el fallo en el ledger. No improvises una coincidencia parecida.
2. ✅ Para **crear** un archivo nuevo usa `Write` con el contenido íntegro del plan.
3. ✅ Ejecuta el comando de verificación de cada paso y compara con lo esperado.
4. ✅ Actualiza el ledger al terminar (§0.4).
5. ✅ Si algo no queda claro, **pregunta al orquestador**. No decidas tú.

## 0.2 Contexto — qué se está construyendo y por qué

Hoy `src/components/CotizadorFab.tsx` es un botón flotante único que abre **un** cotizador externo. Cambian tres cosas:

1. **Hay dos cotizadores.** Quantum Investment (el actual) y Quantum Leasing (nuevo). El FAB pasa a ser un **speed-dial**: al pulsarlo despliega una píldora por cotizador.
2. **`admin` pasa a ver el FAB.** Hoy solo lo ven `vendedor`, `jdv` y `gerencia`.
3. **La lógica sale del componente.** CLAUDE.md §11 prohíbe lógica de negocio en componentes, y `src/utils/` ya es el sitio donde vive lo puro y testeado (`contactos.ts`, `monto.ts`, `solicitudes.ts`, cada uno con su `.test.ts`).

**Decisión de diseño que NO debes cuestionar ni "mejorar":** las píldoras del panel **se montan y desmontan** (`{abierto && ...}`), no se ocultan con CSS. Mantenerlas en el DOM permitiría animar la salida, pero las dejaría **enfocables con Tab y anunciables por lector de pantalla estando invisibles**. La entrada se anima con `@keyframes`; la salida es instantánea, a propósito.

**Segunda decisión que NO debes cuestionar:** la lista de roles `ROLES_COTIZADOR` se muda a `src/store/authStore.ts`, junto a `ROLES_FACTURA`, `ROLES_APOYO`, `ROLES_REPORTES`, `ROLES_SUPERVISION`, `ROLES_BANDEJA_GERENCIA`, `ROLES_SOLICITANTES` y `ROLES_ADMIN`. Es donde el repo guarda **todas** las listas de roles.

## 0.3 Restricciones globales

Aplican a **todas** las tareas. No hace falta repetirlas en cada paso.

| Restricción | Valor exacto |
|---|---|
| TypeScript | `strict` + `noUncheckedIndexedAccess` + `noUnusedLocals` + `noUnusedParameters`. **`any` está prohibido y ESLint lo marca como error.** |
| Indexar un array | Con `noUncheckedIndexedAccess`, `array[0]` es `T \| undefined`. Nunca escribas `cotizadores[0].url`. Usa el helper `buscarCotizador` que define el plan. |
| Tests | Vitest + Testing Library. **Se escriben ANTES de la implementación** (CLAUDE.md §1). `renderConProviders` de `@/test/utilidades`, **nunca** el `render` crudo. |
| HTTP | Ninguna llamada HTTP en este plan. Si MSW se queja de una petición sin handler, es un fallo real: repórtalo. |
| Iconos | Solo Material Symbols Outlined, vía `<span className="material-symbols-outlined">`. Los nombres usados son `request_quote`, `close`, `corporate_fare`, `directions_bus`. |
| Colores | Solo tokens de `tailwind.config.js` ya existentes. Los usados son `bg-brand-primary`, `text-on-surface`, `border-outline-variant`, `bg-surface-container`, `rounded-pill`, y `bg-white`. **No inventes tokens.** |
| Enlaces externos | Siempre `window.open(url, '_blank', 'noopener,noreferrer')`. |
| URL Investment (default) | `http://quantum.okserver43.com/app/modulos/cotizacion/` |
| URL Leasing (default) | `https://quantumleasing.okserver51.com/app/modulos/cotizacion/` |
| Var de entorno nueva | `VITE_COTIZADOR_LEASING_URL` (opcional) |
| Comandos | `npm run test`, `npm run type-check`, `npm run lint`. Sin `npm install`. |

## 0.4 Protocolo del ledger (los agentes se destruyen entre tareas)

**Al EMPEZAR:**
1. Lee `docs/superpowers/plans/2026-08-24-selector-dos-cotizadores.progress.md`.
2. Si tu tarea ya está `[x]` → **PARA**. Responde: `TX ya estaba DONE. No hice nada.` Los `Edit` **no son idempotentes**: aplicarlos dos veces corrompe el archivo.
3. Verifica que las tareas de `Depende de:` estén `[x]`. Si no → **PARA** y repórtalo.

**Al TERMINAR:**
1. Cambia `- [ ] TX` por `- [x] TX`.
2. Añade una línea a "Bitácora" (solo añadir, nunca editar ni borrar líneas previas; usa `Edit` con contexto único, no reescribas el archivo entero):
   ```
   - TX — DONE — 2026-08-24 — verificación: <comando> → <resultado>. <Qué cambió.>
   ```
3. Si viste algo fuera de alcance → "Observaciones fuera de alcance".
4. Si falló → marca `- [!] TX` y detalla el fallo exacto en Bitácora.

## 0.5 Mapa de archivos

| Archivo | Acción | Tarea | Responsabilidad |
|---|---|---|---|
| `src/utils/cotizadores.ts` | **Crear** | T1 | Catálogo de cotizadores + resolución de URLs + gating por ruta. Todo puro. |
| `src/utils/cotizadores.test.ts` | **Crear** | T1 | Tests del anterior. |
| `src/vite-env.d.ts` | Modificar | T1 | Declarar `VITE_COTIZADOR_LEASING_URL`. |
| `src/store/authStore.ts` | Modificar | T1 | Alojar `ROLES_COTIZADOR` con `admin` incluido. |
| `src/store/authStore.test.ts` | Modificar | T1 | Test de `ROLES_COTIZADOR`. |
| `src/index.css` | Modificar | T2 | `@keyframes` de entrada del speed-dial. |
| `src/components/CotizadorFab.tsx` | **Reescribir** | T2 | Solo presentación e interacción del speed-dial. |
| `src/components/CotizadorFab.test.tsx` | **Crear** | T2 | Tests del componente. |
| `.env.example` | Modificar | T3 | Documentar la variable nueva. |
| `Dockerfile` | Modificar | T3 | `ARG` + `ENV` de la variable nueva. |
| `docker-compose.yml` | Modificar | T3 | Pasar la variable como build arg. |
| `.github/workflows/deploy.yml` | Modificar | T3 | Build arg + corregir un comentario falso. |
| `docs/AUDITORIA-SEGURIDAD-2026-08-13.md` | Modificar | T4 | Actualizar el hallazgo M-2. |

**NO se toca `src/components/AppLayout.tsx`.** El punto de montaje (`<CotizadorFab />`, línea 190) no cambia.

## 0.6 Grafo de dependencias

```
T1 (utils + roles)  ──▶  T2 (componente + CSS)
T3 (devops)         ──   independiente
T4 (docs)           ──   independiente
```

**T1, T3 y T4 pueden correr en paralelo.** T2 espera a T1.

---

# PARTE 1 — TAREAS

---

## Task T1 — Catálogo de cotizadores, variable de entorno y rol admin

**Depende de:** nada.
**Modelo sugerido:** Sonnet 5, esfuerzo medio.

**Files:**
- Create: `src/utils/cotizadores.ts`
- Create: `src/utils/cotizadores.test.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/store/authStore.ts`
- Modify: `src/store/authStore.test.ts`

**Interfaces (lo que T2 consumirá — respeta los nombres al carácter):**
- `interface Cotizador { id: 'investment' | 'leasing'; nombre: string; url: string; icono: string }`
- `interface EnvCotizadores { readonly VITE_COTIZADOR_URL?: string; readonly VITE_COTIZADOR_LEASING_URL?: string }`
- `function construirCotizadores(env: EnvCotizadores): Cotizador[]`
- `function buscarCotizador(cotizadores: Cotizador[], id: Cotizador['id']): Cotizador`
- `function enRutaCotizable(pathname: string): boolean`
- `const COTIZADORES: Cotizador[]`
- Desde `@/store/authStore`: `const ROLES_COTIZADOR: Rol[]`

---

- [ ] **Paso 1: Declarar la variable de entorno nueva**

Archivo: `src/vite-env.d.ts`.

`Edit` — `old_string`:

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /**
   * URL del cotizador (sistema externo). OPCIONAL: si no se define, se usa el
   * servidor por defecto que hay en CotizadorFab.tsx. Solo hace falta para
   * apuntar a otro servidor sin recompilar.
   */
  readonly VITE_COTIZADOR_URL?: string
}
```

`new_string`:

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /**
   * URL del cotizador de Quantum Investment (sistema externo). OPCIONAL: si no
   * se define, se usa el servidor por defecto de `src/utils/cotizadores.ts`.
   * Solo hace falta para apuntar a otro servidor sin recompilar.
   */
  readonly VITE_COTIZADOR_URL?: string
  /**
   * URL del cotizador de Quantum Leasing (sistema externo). OPCIONAL, mismo
   * criterio que la anterior. Ambos son sistemas separados, con sesión propia
   * e independiente de la del CRM.
   */
  readonly VITE_COTIZADOR_LEASING_URL?: string
}
```

---

- [ ] **Paso 2: Escribir el test de `src/utils/cotizadores.ts` (aún no existe: debe fallar)**

`Write` el archivo `src/utils/cotizadores.test.ts` con este contenido íntegro:

```ts
import { describe, expect, it } from 'vitest'
import { buscarCotizador, construirCotizadores, enRutaCotizable } from './cotizadores'

const URL_INVESTMENT = 'http://quantum.okserver43.com/app/modulos/cotizacion/'
const URL_LEASING = 'https://quantumleasing.okserver51.com/app/modulos/cotizacion/'

/** Entorno donde ninguna de las dos variables está definida. */
const SIN_ENV = {}

describe('construirCotizadores', () => {
  it('devuelve los dos cotizadores en orden Investment → Leasing', () => {
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(cotizadores.map((c) => c.id)).toEqual(['investment', 'leasing'])
    expect(cotizadores.map((c) => c.nombre)).toEqual(['Quantum Investment', 'Quantum Leasing'])
  })

  it('cae a las URLs por defecto cuando el entorno no define ninguna', () => {
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(URL_INVESTMENT)
    expect(buscarCotizador(cotizadores, 'leasing').url).toBe(URL_LEASING)
  })

  it('el cotizador de Leasing apunta a un origen HTTPS por defecto', () => {
    // Investment sigue sin TLS (hallazgo M-2 de la auditoría de seguridad).
    // Leasing nace con certificado y no debe perderlo en un futuro cambio.
    const leasing = buscarCotizador(construirCotizadores(SIN_ENV), 'leasing')

    expect(new URL(leasing.url).protocol).toBe('https:')
  })

  it('permite sobrescribir cada URL de forma independiente', () => {
    const cotizadores = construirCotizadores({
      VITE_COTIZADOR_URL: 'https://otro-investment.example/cotizar/',
      VITE_COTIZADOR_LEASING_URL: 'https://otro-leasing.example/cotizar/',
    })

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(
      'https://otro-investment.example/cotizar/',
    )
    expect(buscarCotizador(cotizadores, 'leasing').url).toBe('https://otro-leasing.example/cotizar/')
  })

  it('ignora una variable en blanco y cae al valor por defecto', () => {
    // Docker y GitHub Actions pasan siempre la variable: cuando no está
    // configurada llega como cadena vacía o con espacios, nunca como undefined.
    const cotizadores = construirCotizadores({
      VITE_COTIZADOR_URL: '   ',
      VITE_COTIZADOR_LEASING_URL: '',
    })

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(URL_INVESTMENT)
    expect(buscarCotizador(cotizadores, 'leasing').url).toBe(URL_LEASING)
  })

  it('recorta los espacios alrededor de una URL configurada', () => {
    const cotizadores = construirCotizadores({
      VITE_COTIZADOR_URL: '  https://con-espacios.example/cotizar/  ',
    })

    expect(buscarCotizador(cotizadores, 'investment').url).toBe(
      'https://con-espacios.example/cotizar/',
    )
  })

  it('asigna un ícono a cada cotizador', () => {
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(buscarCotizador(cotizadores, 'investment').icono).toBe('corporate_fare')
    expect(buscarCotizador(cotizadores, 'leasing').icono).toBe('directions_bus')
  })
})

describe('buscarCotizador', () => {
  it('lanza si el id no existe, en vez de devolver undefined', () => {
    // `noUncheckedIndexedAccess` obliga a tratar el caso; fallar ruidosamente
    // es mejor que propagar un `undefined` hasta un `window.open`.
    const cotizadores = construirCotizadores(SIN_ENV)

    expect(() => buscarCotizador(cotizadores, 'investment')).not.toThrow()
    expect(() => buscarCotizador([], 'leasing')).toThrow('leasing')
  })
})

describe('enRutaCotizable', () => {
  it('acepta el pipeline y el detalle de una oportunidad', () => {
    expect(enRutaCotizable('/pipeline')).toBe(true)
    expect(enRutaCotizable('/oportunidades/42')).toBe(true)
  })

  it('rechaza el resto de pantallas', () => {
    expect(enRutaCotizable('/')).toBe(false)
    expect(enRutaCotizable('/cartera')).toBe(false)
    expect(enRutaCotizable('/admin')).toBe(false)
    expect(enRutaCotizable('/reportes')).toBe(false)
  })

  it('no confunde rutas que solo comparten el prefijo', () => {
    // `/oportunidades` es el listado sin id: ahí no hay nada que cotizar.
    expect(enRutaCotizable('/oportunidades')).toBe(false)
    expect(enRutaCotizable('/pipeline-resumen')).toBe(false)
  })
})
```

---

- [ ] **Paso 3: Ejecutar el test y comprobar que FALLA**

```bash
npm run test -- src/utils/cotizadores.test.ts
```

**Esperado:** FALLA. El mensaje menciona que no se puede resolver `./cotizadores` (el archivo aún no existe).

Si **pasa**, algo va mal → **PARA** y reporta.

---

- [ ] **Paso 4: Crear la implementación**

`Write` el archivo `src/utils/cotizadores.ts` con este contenido íntegro:

```ts
/**
 * Los dos cotizadores externos que el CRM enlaza. Viven fuera de este repo y
 * cada uno tiene **sesión propia**: abrirlos no arrastra la sesión del CRM.
 *
 * Las URLs por defecto son los servidores actuales, así que los enlaces
 * funcionan sin configurar nada. Las `VITE_COTIZADOR_*` solo sirven para
 * apuntar a otro servidor sin recompilar.
 *
 * ⚠️ El default de Investment va por `http://` (ese servidor no expone TLS
 * hoy). Cuando el CRM se sirve por HTTPS, el navegador marca esa navegación
 * como insegura. Leasing sí va por `https://`. Ver el hallazgo M-2 de
 * `docs/AUDITORIA-SEGURIDAD-2026-08-13.md`: en cuanto Investment tenga
 * certificado, basta con cambiar la constante de abajo o definir la variable
 * de entorno con https://.
 */

/** Un cotizador externo enlazable desde el FAB. */
export interface Cotizador {
  /** Identificador estable: `key` de React y punto de anclaje de los tests. */
  id: 'investment' | 'leasing'
  /** Etiqueta visible en la píldora del speed-dial. */
  nombre: string
  url: string
  /** Nombre del ícono Material Symbols Outlined. */
  icono: string
}

/** Subconjunto de `import.meta.env` que necesita `construirCotizadores`. */
export interface EnvCotizadores {
  readonly VITE_COTIZADOR_URL?: string
  readonly VITE_COTIZADOR_LEASING_URL?: string
}

const URL_INVESTMENT_POR_DEFECTO = 'http://quantum.okserver43.com/app/modulos/cotizacion/'
const URL_LEASING_POR_DEFECTO = 'https://quantumleasing.okserver51.com/app/modulos/cotizacion/'

/**
 * Resuelve una URL configurada. Docker y GitHub Actions pasan la variable
 * siempre: cuando no está configurada llega como cadena vacía, no como
 * `undefined`. Por eso el `trim()` antes del `||`.
 */
function resolverUrl(configurada: string | undefined, porDefecto: string): string {
  return configurada?.trim() || porDefecto
}

/**
 * Pura a propósito: recibe el entorno en vez de leer `import.meta.env`
 * directamente, para poder probar la resolución de URLs sin manipular el
 * entorno global del proceso de test.
 */
export function construirCotizadores(env: EnvCotizadores): Cotizador[] {
  return [
    {
      id: 'investment',
      nombre: 'Quantum Investment',
      url: resolverUrl(env.VITE_COTIZADOR_URL, URL_INVESTMENT_POR_DEFECTO),
      icono: 'corporate_fare',
    },
    {
      id: 'leasing',
      nombre: 'Quantum Leasing',
      url: resolverUrl(env.VITE_COTIZADOR_LEASING_URL, URL_LEASING_POR_DEFECTO),
      icono: 'directions_bus',
    },
  ]
}

/**
 * Acceso por id sin `undefined`. Con `noUncheckedIndexedAccess`, indexar el
 * array devuelve `Cotizador | undefined` y ese `undefined` acabaría en un
 * `window.open(undefined)`. Aquí falla ruidosamente y en el sitio correcto.
 */
export function buscarCotizador(cotizadores: Cotizador[], id: Cotizador['id']): Cotizador {
  const encontrado = cotizadores.find((cotizador) => cotizador.id === id)
  if (!encontrado) throw new Error(`No existe ningún cotizador con id "${id}"`)
  return encontrado
}

/** Catálogo real de la app, resuelto contra el entorno de build. */
export const COTIZADORES: Cotizador[] = construirCotizadores(import.meta.env)

/**
 * Dónde tiene sentido cotizar: el tablero de oportunidades y el detalle de
 * una oportunidad concreta. El listado `/oportunidades` queda fuera a
 * propósito — sin una oportunidad delante no hay nada que cotizar.
 */
export function enRutaCotizable(pathname: string): boolean {
  return pathname === '/pipeline' || pathname.startsWith('/oportunidades/')
}
```

---

- [ ] **Paso 5: Ejecutar el test y comprobar que PASA**

```bash
npm run test -- src/utils/cotizadores.test.ts
```

**Esperado:** PASA. 11 tests en 3 bloques `describe`.

---

- [ ] **Paso 6: Escribir el test de `ROLES_COTIZADOR` (aún no existe: debe fallar)**

Archivo: `src/store/authStore.test.ts`.

`Edit` — `old_string`:

```ts
import { describe, expect, it } from 'vitest'
import { ROLES_APOYO, ROLES_FACTURA } from './authStore'
```

`new_string`:

```ts
import { describe, expect, it } from 'vitest'
import { ROLES_APOYO, ROLES_COTIZADOR, ROLES_FACTURA } from './authStore'
```

Después, `Edit` — `old_string`:

```ts
describe('ROLES_FACTURA', () => {
  it('ya no incluye analista — perdió el privilegio al pasar a rol de apoyo (contrato §3.7)', () => {
    expect(ROLES_FACTURA).not.toContain('analista')
    expect([...ROLES_FACTURA].sort()).toEqual(['admin', 'gerencia'])
  })
})
```

`new_string`:

```ts
describe('ROLES_FACTURA', () => {
  it('ya no incluye analista — perdió el privilegio al pasar a rol de apoyo (contrato §3.7)', () => {
    expect(ROLES_FACTURA).not.toContain('analista')
    expect([...ROLES_FACTURA].sort()).toEqual(['admin', 'gerencia'])
  })
})

describe('ROLES_COTIZADOR', () => {
  it('incluye admin — opera el sistema y también cotiza (2026-08-24)', () => {
    expect(ROLES_COTIZADOR).toContain('admin')
  })

  it('excluye a los roles de apoyo, que no llevan cartera propia', () => {
    for (const rol of ROLES_APOYO) {
      expect(ROLES_COTIZADOR).not.toContain(rol)
    }
  })

  it('son exactamente estos cuatro', () => {
    expect([...ROLES_COTIZADOR].sort()).toEqual(['admin', 'gerencia', 'jdv', 'vendedor'])
  })
})
```

---

- [ ] **Paso 7: Ejecutar el test y comprobar que FALLA**

```bash
npm run test -- src/store/authStore.test.ts
```

**Esperado:** FALLA. El mensaje indica que `ROLES_COTIZADOR` no se exporta desde `./authStore`.

---

- [ ] **Paso 8: Añadir `ROLES_COTIZADOR` a `authStore.ts`**

Archivo: `src/store/authStore.ts`.

`Edit` — `old_string`:

```ts
/** Único rol que puede eliminar empresas/oportunidades. Ocultar el botón es UX — el backend rechaza con 403 a cualquier no-admin */
export const ROLES_ADMIN: Rol[] = ['admin']
```

`new_string`:

```ts
/** Único rol que puede eliminar empresas/oportunidades. Ocultar el botón es UX — el backend rechaza con 403 a cualquier no-admin */
export const ROLES_ADMIN: Rol[] = ['admin']
/**
 * Roles que ven el FAB de los cotizadores externos. `admin` se añadió el
 * 2026-08-24: opera el sistema y necesita cotizar igual que el resto. Los
 * roles de apoyo (`ROLES_APOYO`) siguen fuera: no llevan cartera propia.
 *
 * Es puramente UX: los cotizadores son sistemas externos con su propia
 * autenticación. Esta lista no protege nada, solo evita ofrecer un enlace
 * inútil a quien no cotiza.
 */
export const ROLES_COTIZADOR: Rol[] = ['admin', 'vendedor', 'jdv', 'gerencia']
```

---

- [ ] **Paso 9: Ejecutar el test y comprobar que PASA**

```bash
npm run test -- src/store/authStore.test.ts
```

**Esperado:** PASA. 5 tests.

---

- [ ] **Paso 10: Verificación final de T1**

```bash
npm run type-check
```
**Esperado:** sin errores.

> ℹ️ `npm run lint` puede reportar avisos preexistentes en otros archivos. Solo te incumben los de `src/utils/cotizadores.ts`, `src/utils/cotizadores.test.ts`, `src/store/authStore.ts`, `src/store/authStore.test.ts` y `src/vite-env.d.ts`. Si aparece uno en esos archivos → **PARA** y repórtalo.

```bash
npm run lint
```

```bash
npm run test
```
**Esperado:** todos los tests del repo pasan. `src/components/CotizadorFab.tsx` **todavía** define su propio `ROLES_COTIZADOR` local y su propio `enRutaCotizable`; eso es correcto en este punto — T2 lo limpia. No lo toques.

---

- [ ] **Paso 11: Actualizar el ledger** según §0.4. **No commitees.**

---

## Task T2 — Speed-dial en `CotizadorFab`

**Depende de:** T1 (debe estar `[x]`).
**Modelo sugerido:** Sonnet 5, esfuerzo medio.

**Files:**
- Modify: `src/index.css`
- Modify (reescritura completa): `src/components/CotizadorFab.tsx`
- Create: `src/components/CotizadorFab.test.tsx`

**Interfaces (consume de T1):**
- `import { COTIZADORES, enRutaCotizable } from '@/utils/cotizadores'`
- `import type { Cotizador } from '@/utils/cotizadores'`
- `import { ROLES_COTIZADOR, tieneRol, useAuthStore } from '@/store/authStore'`

---

- [ ] **Paso 1: Añadir la animación de entrada al CSS**

Archivo: `src/index.css`.

`Edit` — `old_string`:

```css
.sidebar-brand-bg {
  background-color: #3e5c9a;
}
```

`new_string`:

```css
.sidebar-brand-bg {
  background-color: #3e5c9a;
}

/* Speed-dial del cotizador (`CotizadorFab`). Las píldoras se MONTAN al abrir
   en vez de ocultarse con CSS, así que la entrada se anima con keyframes y no
   con una transición sobre un elemento ya presente. El desmontaje es
   instantáneo a propósito: dejarlas en el DOM para animar la salida las haría
   enfocables con Tab y anunciables por lector de pantalla estando ocultas. */
@keyframes speed-dial-entrada {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.speed-dial-opcion {
  animation: speed-dial-entrada 180ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .speed-dial-opcion {
    animation: none;
  }
}
```

---

- [ ] **Paso 2: Escribir el test del componente (debe fallar)**

`Write` el archivo `src/components/CotizadorFab.test.tsx` con este contenido íntegro:

```tsx
import { describe, expect, it, afterEach, vi } from 'vitest'
import { renderConProviders, screen, userEvent } from '@/test/utilidades'
import { CotizadorFab } from './CotizadorFab'
import { useAuthStore } from '@/store/authStore'
import { COTIZADORES, buscarCotizador } from '@/utils/cotizadores'
import type { Empleado, Rol } from '@/types'

function empleadoCon(rol: Rol): Empleado {
  return {
    id: 1,
    nombres: 'Ana',
    apellidos: 'Ruiz',
    email: 'ana@quantum.pe',
    rol,
    area: 'Ventas',
    puesto: 'Vendedor',
    activo: true,
  }
}

/**
 * Monta el FAB junto a un botón ajeno, para poder probar el cierre al pulsar
 * fuera sin depender de hacer click sobre `document.body`.
 */
function montar(rol: Rol, rutaInicial: string) {
  useAuthStore.setState({ empleado: empleadoCon(rol), cargando: false })
  return renderConProviders(
    <>
      <button type="button">Botón ajeno</button>
      <CotizadorFab />
    </>,
    { rutaInicial },
  )
}

const NOMBRE_FAB_CERRADO = 'Abrir cotizador'
const NOMBRE_FAB_ABIERTO = 'Cerrar selector de cotizadores'

/**
 * jsdom no implementa `window.open`: sin este espía cada click imprime un
 * "Not implemented" y no hay forma de verificar con qué se llamó. Se instala
 * dentro de cada test que lo necesita, y no en un `beforeEach`, para que
 * TypeScript infiera su tipo sin anotaciones que dependan de la versión de
 * Vitest.
 */
function espiarWindowOpen() {
  return vi.spyOn(window, 'open').mockReturnValue(null)
}

describe('CotizadorFab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({ empleado: null, cargando: false })
  })

  describe('quién lo ve', () => {
    it('lo ve el administrador (requisito del 2026-08-24)', () => {
      montar('admin', '/pipeline')

      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
    })

    it('lo ven vendedor, jdv y gerencia', () => {
      for (const rol of ['vendedor', 'jdv', 'gerencia'] as const) {
        const { unmount } = montar(rol, '/pipeline')
        expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
        unmount()
      }
    })

    it('no lo ven los roles de apoyo', () => {
      for (const rol of ['analista', 'otro'] as const) {
        const { unmount } = montar(rol, '/pipeline')
        expect(screen.queryByRole('button', { name: NOMBRE_FAB_CERRADO })).not.toBeInTheDocument()
        unmount()
      }
    })

    it('no aparece si no hay sesión', () => {
      useAuthStore.setState({ empleado: null, cargando: false })
      renderConProviders(<CotizadorFab />, { rutaInicial: '/pipeline' })

      expect(screen.queryByRole('button', { name: NOMBRE_FAB_CERRADO })).not.toBeInTheDocument()
    })
  })

  describe('dónde aparece', () => {
    it('aparece en el detalle de una oportunidad', () => {
      montar('vendedor', '/oportunidades/42')

      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
    })

    it('no aparece fuera de las rutas cotizables, aunque el rol sea válido', () => {
      montar('admin', '/cartera')

      expect(screen.queryByRole('button', { name: NOMBRE_FAB_CERRADO })).not.toBeInTheDocument()
    })
  })

  describe('selección de cotizador', () => {
    it('arranca cerrado: ninguna opción está en el DOM ni anunciada', () => {
      montar('vendedor', '/pipeline')

      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Quantum Leasing' })).not.toBeInTheDocument()
    })

    it('al pulsar el FAB despliega los dos cotizadores', async () => {
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))

      expect(screen.getByRole('button', { name: 'Quantum Investment' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Quantum Leasing' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: NOMBRE_FAB_ABIERTO })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })

    it('abre Quantum Investment en otra pestaña, sin acceso a esta ventana', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Quantum Investment' }))

      expect(abrirVentana).toHaveBeenCalledWith(
        buscarCotizador(COTIZADORES, 'investment').url,
        '_blank',
        'noopener,noreferrer',
      )
    })

    it('abre Quantum Leasing en otra pestaña, sin acceso a esta ventana', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Quantum Leasing' }))

      expect(abrirVentana).toHaveBeenCalledWith(
        buscarCotizador(COTIZADORES, 'leasing').url,
        '_blank',
        'noopener,noreferrer',
      )
    })

    it('se cierra tras elegir un cotizador', async () => {
      // Sin asignar: este test no verifica la llamada, solo silencia el
      // "Not implemented" de jsdom. Asignarlo rompería `noUnusedLocals`.
      espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Quantum Leasing' }))

      expect(screen.queryByRole('button', { name: 'Quantum Leasing' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toBeInTheDocument()
    })

    it('el segundo click en el FAB vuelve a cerrarlo', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_ABIERTO }))

      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(abrirVentana).not.toHaveBeenCalled()
    })
  })

  describe('cierre por teclado y por click fuera', () => {
    it('las opciones son alcanzables con Tab mientras el panel está abierto', async () => {
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      // El FAB es el último del orden del DOM; shift+Tab retrocede a la
      // opción de abajo, la más cercana a él.
      await userEvent.tab({ shift: true })

      expect(screen.getByRole('button', { name: 'Quantum Leasing' })).toHaveFocus()
    })

    it('Escape cierra y devuelve el foco al FAB', async () => {
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      // Se mueve el foco fuera del FAB a propósito: si Escape se pulsara con
      // el foco todavía en él, la aserción final pasaría sin probar nada.
      await userEvent.tab({ shift: true })
      expect(screen.getByRole('button', { name: 'Quantum Leasing' })).toHaveFocus()

      await userEvent.keyboard('{Escape}')

      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO })).toHaveFocus()
    })

    it('pulsar fuera cierra el panel sin abrir ningún cotizador', async () => {
      const abrirVentana = espiarWindowOpen()
      montar('vendedor', '/pipeline')

      await userEvent.click(screen.getByRole('button', { name: NOMBRE_FAB_CERRADO }))
      await userEvent.click(screen.getByRole('button', { name: 'Botón ajeno' }))

      expect(screen.queryByRole('button', { name: 'Quantum Investment' })).not.toBeInTheDocument()
      expect(abrirVentana).not.toHaveBeenCalled()
    })
  })
})
```

---

- [ ] **Paso 3: Ejecutar el test y comprobar que FALLA**

```bash
npm run test -- src/components/CotizadorFab.test.tsx
```

**Esperado:** FALLA. Los fallos son del tipo "Unable to find an accessible element with the role button and name `Abrir cotizador`" o de `aria-expanded` ausente, porque el componente actual todavía es el FAB antiguo (su `aria-label` no existe; su nombre accesible viene del `title`).

---

- [ ] **Paso 4: Reescribir el componente**

`Write` el archivo `src/components/CotizadorFab.tsx` — **reemplaza el contenido entero**, no edites por partes:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ROLES_COTIZADOR, tieneRol, useAuthStore } from '@/store/authStore'
import { COTIZADORES, enRutaCotizable } from '@/utils/cotizadores'
import type { Cotizador } from '@/utils/cotizadores'

const ID_PANEL = 'cotizador-opciones'
const ETIQUETA_CERRADO = 'Abrir cotizador'
const ETIQUETA_ABIERTO = 'Cerrar selector de cotizadores'

/**
 * FAB expandible ("speed-dial") que ofrece los cotizadores externos.
 *
 * Cada cotizador es un sistema aparte, con sesión propia: se abre en otra
 * pestaña con `noopener,noreferrer` para que no herede ninguna referencia a
 * esta ventana. Quién lo ve y dónde aparece se decide en `ROLES_COTIZADOR` y
 * `enRutaCotizable`; ambas son decisiones de UX, no de seguridad.
 *
 * Las opciones se montan y desmontan en lugar de ocultarse con CSS: mantener
 * botones invisibles en el DOM los dejaría enfocables con Tab y anunciables
 * por lector de pantalla. La entrada se anima con la clase
 * `.speed-dial-opcion` de `src/index.css`.
 */
export function CotizadorFab() {
  const empleado = useAuthStore((s) => s.empleado)
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false)
    // Solo al cerrar con teclado: tras un click fuera, robar el foco de vuelta
    // sacaría al usuario del elemento que acaba de pulsar.
    if (devolverFoco) fabRef.current?.focus()
  }, [])

  // Los listeners se suscriben solo mientras el panel está abierto: dejarlos
  // permanentes en `document` los haría correr en cada interacción de la app.
  useEffect(() => {
    if (!abierto) return

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrar(true)
    }
    const alApuntarFuera = (evento: PointerEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) cerrar(false)
    }

    document.addEventListener('keydown', alPulsarTecla)
    document.addEventListener('pointerdown', alApuntarFuera)
    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.removeEventListener('pointerdown', alApuntarFuera)
    }
  }, [abierto, cerrar])

  // El early return va DESPUÉS de los hooks: adelantarlo cambiaría el número
  // de hooks entre renders y React lanzaría.
  if (!tieneRol(empleado, ROLES_COTIZADOR) || !enRutaCotizable(pathname)) return null

  const abrirCotizador = (cotizador: Cotizador) => {
    window.open(cotizador.url, '_blank', 'noopener,noreferrer')
    cerrar(false)
  }

  return (
    <div
      ref={contenedorRef}
      className="absolute bottom-[88px] md:bottom-6 right-6 z-40 flex flex-col items-end gap-3"
    >
      {abierto && (
        <div id={ID_PANEL} className="flex flex-col items-end gap-3">
          {COTIZADORES.map((cotizador, indice) => (
            <button
              key={cotizador.id}
              type="button"
              onClick={() => abrirCotizador(cotizador)}
              // La opción más cercana al FAB entra primero: el escalonado sigue
              // al dedo, que viene desde abajo.
              style={{ animationDelay: `${(COTIZADORES.length - 1 - indice) * 40}ms` }}
              className="speed-dial-opcion flex items-center gap-3 rounded-pill border border-outline-variant/30 bg-white py-3 pl-4 pr-5 text-sm font-bold text-on-surface shadow-lg transition-colors hover:bg-surface-container"
            >
              <span className="material-symbols-outlined shrink-0 text-xl text-brand-primary" aria-hidden>
                {cotizador.icono}
              </span>
              <span className="whitespace-nowrap">{cotizador.nombre}</span>
            </button>
          ))}
        </div>
      )}

      <button
        ref={fabRef}
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
        aria-controls={ID_PANEL}
        aria-label={abierto ? ETIQUETA_ABIERTO : ETIQUETA_CERRADO}
        title={abierto ? ETIQUETA_ABIERTO : ETIQUETA_CERRADO}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-xl transition-shadow hover:shadow-2xl"
      >
        <span
          className={`material-symbols-outlined text-2xl transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}
          aria-hidden
        >
          {abierto ? 'close' : 'request_quote'}
        </span>
      </button>
    </div>
  )
}
```

---

- [ ] **Paso 5: Ejecutar el test y comprobar que PASA**

```bash
npm run test -- src/components/CotizadorFab.test.tsx
```

**Esperado:** PASA. 15 tests.

Si falla `pulsar fuera cierra el panel`, comprueba que copiaste `pointerdown` (no `mousedown`) y que el `Write` del componente reemplazó el archivo entero. **No cambies el test para que pase.**

---

- [ ] **Paso 6: Verificación final de T2**

```bash
npm run type-check
```
**Esperado:** sin errores.

```bash
npm run lint
```
**Esperado:** ningún aviso nuevo en `src/components/CotizadorFab.tsx` ni en `src/components/CotizadorFab.test.tsx`.

```bash
npm run test
```
**Esperado:** todos los tests del repo pasan.

```bash
grep -c "ROLES_COTIZADOR\|enRutaCotizable\|COTIZADOR_URL" src/components/CotizadorFab.tsx
```
**Esperado:** `1` — solo queda la importación de `ROLES_COTIZADOR`. Si sale más de 1, el archivo conserva restos de la versión antigua: rehaz el `Write` del Paso 4.

---

- [ ] **Paso 7: Actualizar el ledger** según §0.4. **No commitees.**

---

## Task T3 — Cablear `VITE_COTIZADOR_LEASING_URL` en build y despliegue

**Depende de:** nada. Puede correr en paralelo con T1, T2 y T4.
**Modelo sugerido:** Sonnet 5, esfuerzo bajo.

**Files:**
- Modify: `.env.example`
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.github/workflows/deploy.yml`

**Contexto:** Vite incrusta las `VITE_*` en tiempo de **build**, no las lee al arrancar el contenedor. Por eso cada variable tiene que estar en los cuatro sitios: si falta en el `Dockerfile`, la imagen de producción ignora lo que pase el workflow.

---

- [ ] **Paso 1: `.env.example`**

`Edit` — `old_string`:

```
# Cotizador (sistema externo). OPCIONAL: si se deja vacía se usa el servidor por
# defecto (http://quantum.okserver43.com/...), definido en CotizadorFab.tsx.
# Solo hace falta para apuntar a otro servidor sin recompilar.
VITE_COTIZADOR_URL=
```

`new_string`:

```
# Cotizadores (sistemas externos). AMBAS OPCIONALES: si se dejan vacías se usan
# los servidores por defecto definidos en src/utils/cotizadores.ts. Solo hacen
# falta para apuntar a otro servidor sin recompilar.
#
# Quantum Investment — por defecto http://quantum.okserver43.com/...
VITE_COTIZADOR_URL=
# Quantum Leasing — por defecto https://quantumleasing.okserver51.com/...
VITE_COTIZADOR_LEASING_URL=
```

---

- [ ] **Paso 2: `Dockerfile`**

`Edit` — `old_string`:

```dockerfile
ARG VITE_API_BASE_URL
ARG VITE_COTIZADOR_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_COTIZADOR_URL=$VITE_COTIZADOR_URL
```

`new_string`:

```dockerfile
ARG VITE_API_BASE_URL
ARG VITE_COTIZADOR_URL=""
ARG VITE_COTIZADOR_LEASING_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_COTIZADOR_URL=$VITE_COTIZADOR_URL
ENV VITE_COTIZADOR_LEASING_URL=$VITE_COTIZADOR_LEASING_URL
```

> ⚠️ Las dos de cotizador llevan default `""` a propósito: son opcionales y el código cae a su URL por defecto. **No añadas** un `RUN test -n` para ellas.

---

- [ ] **Paso 3: `docker-compose.yml`**

`Edit` — `old_string`:

```yaml
        VITE_COTIZADOR_URL: ${VITE_COTIZADOR_URL:-}
```

`new_string`:

```yaml
        VITE_COTIZADOR_URL: ${VITE_COTIZADOR_URL:-}
        VITE_COTIZADOR_LEASING_URL: ${VITE_COTIZADOR_LEASING_URL:-}
```

---

- [ ] **Paso 4: `.github/workflows/deploy.yml` — build args**

`Edit` — `old_string`:

```yaml
            VITE_API_BASE_URL=${{ vars.VITE_API_BASE_URL }}
            VITE_COTIZADOR_URL=${{ vars.VITE_COTIZADOR_URL }}
```

`new_string`:

```yaml
            VITE_API_BASE_URL=${{ vars.VITE_API_BASE_URL }}
            VITE_COTIZADOR_URL=${{ vars.VITE_COTIZADOR_URL }}
            VITE_COTIZADOR_LEASING_URL=${{ vars.VITE_COTIZADOR_LEASING_URL }}
```

---

- [ ] **Paso 5: `.github/workflows/deploy.yml` — corregir el comentario falso**

El comentario actual afirma que dejar la variable vacía hace desaparecer el FAB. **Es falso**: vacía significa "usa la URL por defecto". Corrígelo.

`Edit` — `old_string`:

```
#   Variables:  VITE_API_BASE_URL   (p. ej. https://api.tu-dominio.com/api/v1)
#               VITE_COTIZADOR_URL  (opcional; vacío = el FAB no aparece)
```

`new_string`:

```
#   Variables:  VITE_API_BASE_URL           (p. ej. https://api.tu-dominio.com/api/v1)
#               VITE_COTIZADOR_URL          (opcional; vacío = URL por defecto)
#               VITE_COTIZADOR_LEASING_URL  (opcional; vacío = URL por defecto)
```

---

- [ ] **Paso 6: Verificación de T3**

```bash
grep -rn "VITE_COTIZADOR_LEASING_URL" .env.example Dockerfile docker-compose.yml .github/workflows/deploy.yml
```
**Esperado:** exactamente **6** líneas — 1 en `.env.example`, 2 en `Dockerfile` (`ARG` y `ENV`), 1 en `docker-compose.yml`, 2 en `deploy.yml` (comentario y build arg).

```bash
grep -n "el FAB no aparece" .github/workflows/deploy.yml
```
**Esperado:** sin resultados.

> ℹ️ No hace falta construir la imagen para validar esto. Si tienes Docker disponible y quieres confirmarlo, `docker compose config` imprime los build args resueltos; no es obligatorio.

---

- [ ] **Paso 7: Actualizar el ledger** según §0.4. **No commitees.**

---

## Task T4 — Actualizar el hallazgo M-2 de la auditoría de seguridad

**Depende de:** nada. Puede correr en paralelo con T1, T2 y T3.
**Modelo sugerido:** Sonnet 5, esfuerzo bajo.

**Files:**
- Modify: `docs/AUDITORIA-SEGURIDAD-2026-08-13.md`

**Contexto:** el hallazgo M-2 describe **un** cotizador por HTTP plano y cita `CotizadorFab.tsx:18`. A partir de este cambio hay **dos** cotizadores, la constante se mudó a `src/utils/cotizadores.ts`, y el nuevo (Leasing) sí tiene TLS. El hallazgo sigue **abierto** —Investment no ha cambiado— pero su alcance y su referencia de archivo ya no son ciertos. Un hallazgo con una ruta muerta es un hallazgo que nadie vuelve a verificar.

---

- [ ] **Paso 1: Reescribir la sección del hallazgo**

`Edit` — `old_string`:

````
#### M-2 — El cotizador externo se abre por HTTP plano

**Archivo:** `src/components/CotizadorFab.tsx:18`

```ts
'http://quantum.okserver43.com/app/modulos/cotizacion/'
```

Navegación en texto plano desde un origen HTTPS con HSTS. Al ser navegación de primer nivel no la bloquea la regla de contenido mixto, pero las credenciales que el usuario introduzca en ese sistema viajan sin cifrar y son interceptables en la red corporativa. También acostumbra al usuario a aceptar el aviso de "sitio no seguro".

El código ya documenta la deuda (líneas 12-15). `window.open(..., 'noopener,noreferrer')` está correctamente aplicado.

**Corrección requerida:** TLS en el cotizador y cambiar la constante a `https://`. Mientras tanto, es una decisión de riesgo que conviene registrar explícitamente, no un detalle de implementación.
````

`new_string`:

````
#### M-2 — El cotizador de Quantum Investment se abre por HTTP plano

**Archivo:** `src/utils/cotizadores.ts` — constante `URL_INVESTMENT_POR_DEFECTO`
*(actualizado el 2026-08-24: la constante estaba en `src/components/CotizadorFab.tsx:18` hasta que se añadió el segundo cotizador)*

```ts
const URL_INVESTMENT_POR_DEFECTO = 'http://quantum.okserver43.com/app/modulos/cotizacion/'
```

Navegación en texto plano desde un origen HTTPS con HSTS. Al ser navegación de primer nivel no la bloquea la regla de contenido mixto, pero las credenciales que el usuario introduzca en ese sistema viajan sin cifrar y son interceptables en la red corporativa. También acostumbra al usuario a aceptar el aviso de "sitio no seguro".

**Alcance tras el cambio del 2026-08-24.** Ahora hay dos cotizadores enlazados y solo uno está afectado:

| Cotizador | URL por defecto | Estado |
|---|---|---|
| Quantum Investment | `http://quantum.okserver43.com/...` | 🔴 Sin TLS — este hallazgo |
| Quantum Leasing | `https://quantumleasing.okserver51.com/...` | 🟢 Con TLS |

Un test de `src/utils/cotizadores.test.ts` fija que Leasing resuelve a un origen `https:`, para que no pierda el certificado en un cambio futuro sin que nadie se entere.

El código documenta la deuda en el encabezado de `src/utils/cotizadores.ts`. `window.open(..., 'noopener,noreferrer')` está correctamente aplicado en ambos.

**Corrección requerida:** TLS en el servidor de Investment y cambiar `URL_INVESTMENT_POR_DEFECTO` a `https://` (o definir `VITE_COTIZADOR_URL` con https:// sin tocar código). Mientras tanto, es una decisión de riesgo que conviene registrar explícitamente, no un detalle de implementación.
````

---

- [ ] **Paso 2: Actualizar la fila del resumen de "Abiertos"**

`Edit` — `old_string`:

```
| **M-2** | Abierto | El cotizador (`quantum.okserver43.com`) sigue sin TLS. Depende de un sistema externo; no hay acción posible desde el frontend más allá de la constante ya documentada. |
```

`new_string`:

```
| **M-2** | Abierto (alcance reducido) | El cotizador de **Investment** (`quantum.okserver43.com`) sigue sin TLS. El de **Leasing** (`quantumleasing.okserver51.com`, añadido el 2026-08-24) sí lo tiene y hay un test que lo fija. Depende de un sistema externo; no hay acción posible desde el frontend más allá de la constante ya documentada. |
```

---

- [ ] **Paso 3: Verificación de T4**

```bash
grep -c "quantumleasing.okserver51.com" docs/AUDITORIA-SEGURIDAD-2026-08-13.md
```
**Esperado:** `3`.

```bash
grep -n "CotizadorFab.tsx:18" docs/AUDITORIA-SEGURIDAD-2026-08-13.md
```
**Esperado:** **1** resultado, y debe ser la nota histórica *"la constante estaba en `src/components/CotizadorFab.tsx:18` hasta que…"*. Si aparece como referencia principal del hallazgo, el Paso 1 no se aplicó.

---

- [ ] **Paso 4: Actualizar el ledger** según §0.4. **No commitees.**

---

# PARTE 2 — VERIFICACIÓN FINAL

> La ejecuta el **orquestador** en la sesión principal, cuando T1–T4 estén `[x]`. No la hace ningún subagente.

## 2.1 Automática

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

Todos deben terminar sin errores. `npm run test` debe incluir los archivos nuevos `src/utils/cotizadores.test.ts` y `src/components/CotizadorFab.test.tsx`.

Comprobaciones puntuales:

```bash
# El componente ya no define su propia lista de roles ni su propio gating
grep -c "ROLES_COTIZADOR" src/components/CotizadorFab.tsx        # → 1 (solo el import)
grep -c "const ROLES_COTIZADOR" src/components/CotizadorFab.tsx  # → 0

# La URL de Leasing existe en un solo sitio del código
grep -rn "quantumleasing.okserver51.com" src/                    # → 2 (cotizadores.ts y su test)

# AppLayout no se tocó
git diff --name-only | grep AppLayout                            # → sin resultados
```

## 2.2 Manual en navegador (`npm run dev`)

Estas no se pueden automatizar. Las hace un humano.

1. **Admin ve la burbuja.** Entrar como `admin`, ir a `/pipeline` → el FAB aparece abajo a la derecha.
2. **Despliegue.** Click en el FAB → aparecen "Quantum Investment" y "Quantum Leasing" con animación de entrada; el ícono del FAB pasa a la X.
3. **Investment.** Click en "Quantum Investment" → se abre `quantum.okserver43.com` en otra pestaña y el panel se cierra.
4. **Leasing.** Click en "Quantum Leasing" → se abre `quantumleasing.okserver51.com` en otra pestaña y el panel se cierra.
5. **Teclado.** Con el panel abierto, `Escape` lo cierra y el foco vuelve al FAB. Con `Tab` desde el FAB se llega a las dos opciones **solo** cuando está abierto.
6. **Click fuera.** Con el panel abierto, pulsar en cualquier otro sitio lo cierra sin abrir nada.
7. **Móvil (DevTools, 375px).** El FAB no queda tapado por el `BottomNavBar`; las píldoras no se salen de la pantalla por la derecha.
8. **Roles de apoyo.** Entrar como `analista` en `/pipeline` → **no** hay FAB.
9. **Fuera de ruta.** Como `admin`, ir a `/cartera` → **no** hay FAB.

## 2.3 Commit (solo el orquestador, tras 2.1)

```bash
git add src/utils/cotizadores.ts src/utils/cotizadores.test.ts \
        src/components/CotizadorFab.tsx src/components/CotizadorFab.test.tsx \
        src/store/authStore.ts src/store/authStore.test.ts \
        src/vite-env.d.ts src/index.css \
        .env.example Dockerfile docker-compose.yml .github/workflows/deploy.yml \
        docs/AUDITORIA-SEGURIDAD-2026-08-13.md \
        docs/superpowers/plans/2026-08-24-selector-dos-cotizadores.md \
        docs/superpowers/plans/2026-08-24-selector-dos-cotizadores.progress.md

git commit -m "$(cat <<'EOF'
feat: selector de dos cotizadores en el FAB y acceso para admin

El FAB del cotizador pasa a ser un speed-dial con una opción por
cotizador: Quantum Investment (el existente) y Quantum Leasing (nuevo,
por HTTPS). El rol admin pasa a verlo.

La lógica sale del componente a src/utils/cotizadores.ts (catálogo,
resolución de URLs y gating por ruta, todo puro y con test propio) y
ROLES_COTIZADOR se muda a authStore.ts, junto al resto de listas de
roles. El componente queda solo con presentación e interacción.

Las opciones se montan y desmontan en vez de ocultarse con CSS: dejarlas
en el DOM invisibles las haría enfocables con Tab y anunciables por
lector de pantalla. Escape cierra y devuelve el foco; el click fuera
cierra sin robarlo.

Se actualiza el hallazgo M-2 de la auditoría: sigue abierto por
Investment, pero su alcance se reduce y la ruta que citaba ya no existe.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

# PARTE 3 — FUERA DE ALCANCE

Cosas detectadas durante el análisis que este plan **NO** resuelve, por diseño:

1. **Investment sigue sin TLS.** Depende de un servidor externo. M-2 queda abierto.
2. **El FAB no avisa de que Leasing tiene sesión propia.** Quien no tenga sesión en `quantumleasing.okserver51.com` verá un login ajeno sin contexto. Se decidió no añadir aviso; si la operación lo reporta como fricción, es un requerimiento aparte.
3. **No hay preselección ni memoria del último cotizador usado.** Ambas opciones se muestran siempre, en orden fijo.
4. **El FAB pierde la expansión al hover.** Era decorativa y nunca funcionó en móvil; las píldoras etiquetadas la sustituyen.
5. **No se toca el `ledger` de planes anteriores** aunque `2026-08-17-...progress.md` afirme que el proyecto no tiene tests ni ESLint. Es cierto histórico de esa fecha, no un error que arreglar aquí.
