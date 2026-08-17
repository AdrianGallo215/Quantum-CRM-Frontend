# PLAN MAESTRO — Correcciones de la auditoría de seguridad del frontend

**Fecha:** 2026-08-13
**Origen:** `docs/AUDITORIA-SEGURIDAD-2026-08-13.md`
**Ledger de progreso:** `docs/superpowers/plans/2026-08-13-fixes-auditoria-seguridad.progress.md`

---

# PARTE 0 — INSTRUCCIONES PARA EL SUBAGENTE EJECUTOR

> **Lee esta parte completa antes de tocar nada. No es contexto opcional.**

## 0.1 Qué eres y qué NO eres en este plan

Eres un **ejecutor literal**. Tu tarea ya fue analizada, decidida y verificada por el auditor. Tu trabajo es aplicar exactamente lo que dice tu tarea asignada, ni más ni menos.

**PROHIBIDO de forma absoluta:**

1. ❌ **No razones sobre si la corrección es correcta.** Ya se verificó contra producción. Si algo te parece mal, lo anotas en el ledger y sigues.
2. ❌ **No amplíes el alcance.** Si ves otro bug, otra mala práctica, un `any`, un componente feo o un archivo desordenado **en el mismo archivo que estás editando**: NO lo toques. Anótalo en el ledger, sección "Observaciones".
3. ❌ **No toques ningún archivo que no esté listado explícitamente en tu tarea.**
4. ❌ **No refactorices, no renombres, no reordenes imports, no reformatees.**
5. ❌ **No ejecutes `git commit`, `git push`, `git checkout`, `git reset`, `git restore` ni `git clean`.** El humano commitea.
6. ❌ **No ejecutes `npm install <paquete>`** ni añadas dependencias nuevas.
7. ❌ **No inventes texto.** Todos los bloques de código de este plan son literales: cópialos carácter por carácter.

**OBLIGATORIO:**

1. ✅ Usa la herramienta `Edit` con `old_string` copiado **exactamente** de este plan (incluida la indentación). Si `Edit` falla porque no encuentra la cadena, **PARA** y reporta el fallo en el ledger. No improvises una coincidencia parecida.
2. ✅ Ejecuta el comando de verificación de tu tarea y compara con la salida esperada.
3. ✅ Actualiza el ledger al terminar, siguiendo §0.3.

## 0.2 Contexto mínimo del proyecto (no necesitas leer más)

- SPA React 18 + TypeScript strict + Vite. Ant Design v5. TanStack Query. Zustand.
- Alias de imports: `@/` → `src/`. Ejemplo: `import { x } from '@/utils/formato'`.
- **El proyecto no tiene tests ni ESLint configurados** (son stubs `exit 0`). La única verificación real es `npm run type-check`.
- Directorio de trabajo: la raíz del repo (donde está `package.json`).
- El token de sesión vive en cookies httpOnly. El JS nunca lo lee. Esto ya es correcto: no lo toques.

## 0.3 Protocolo del ledger (CRÍTICO — los agentes se destruyen entre tareas)

Los subagentes se crean y destruyen constantemente. **El ledger es la única memoria entre ellos.** El estado real es el filesystem; el ledger lo hace legible.

**Al EMPEZAR tu tarea:**
1. Lee `docs/superpowers/plans/2026-08-13-fixes-auditoria-seguridad.progress.md`.
2. Localiza tu tarea (ej. `T4`). Si su casilla ya está `[x]`, **PARA INMEDIATAMENTE** y responde: `T4 ya estaba marcada como DONE en el ledger. No hice nada.` No re-ejecutes trabajo hecho: los `Edit` de este plan **no son idempotentes** y una segunda aplicación corrompe el archivo.
3. Verifica que todas las tareas listadas en `Depende de:` estén `[x]`. Si alguna no lo está, **PARA** y responde: `T4 bloqueada: TX no está DONE.`

**Al TERMINAR tu tarea:**
1. Cambia `- [ ] TX — ...` por `- [x] TX — ...` en la sección "Estado de las tareas".
2. Añade una línea en "Bitácora" con este formato exacto:
   ```
   - TX — DONE — <fecha ISO> — verificación: <comando> → <resultado>. <Una frase sobre lo que cambiaste.>
   ```
3. Si encontraste algo fuera de alcance, añádelo a "Observaciones fuera de alcance" con el formato:
   ```
   - [TX] <archivo:línea> — <qué viste>. No tocado (fuera de alcance).
   ```
4. Si tu tarea **falló**, marca `- [!] TX — ...` y en Bitácora:
   ```
   - TX — FALLO — <fecha ISO> — <qué comando falló y su salida exacta>. Archivos en el estado: <sin cambios | parcialmente editado, detalle>.
   ```

**Nunca borres ni reescribas líneas de Bitácora existentes. Solo añades.**

## 0.4 Verificación estándar

Salvo que tu tarea diga otra cosa, el comando de verificación es:

```bash
npm run type-check
```

**Salida esperada:** sin ninguna línea de error. El comando termina sin imprimir nada relevante y con código de salida 0. Cualquier línea con `error TS` significa **FALLO**.

## 0.5 Orden de ejecución (lotes)

Las tareas de un mismo lote **tocan archivos distintos** y pueden correr en paralelo. Los lotes son **estrictamente secuenciales**: no empieces un lote hasta que todas las tareas del anterior estén `[x]`.

| Lote | Tareas | Paralelizable | Depende de |
|---|---|---|---|
| **L1** | T1 | — (1 sola) | — |
| **L2** | T2, T3, T4, T5 | Sí (4 archivos distintos) | L1 |
| **L3** | T6, T7, T8, T9, T10 | Sí (5 archivos distintos) | — |
| **L4** | T11 → T12 | **No** (secuencial entre sí) | — |
| **L5** | T13, T14, T15 | Sí | — |
| **L6** | T16, T17 | Sí | L1–L5 completos |

L3, L4 y L5 no dependen de L1/L2 y podrían adelantarse, pero **ejecuta en orden L1→L6** para que el ledger sea legible.

---

# PARTE 1 — TAREAS

---

## T1 — Crear el helper `urlSegura()`

- **Lote:** L1
- **Depende de:** —
- **Archivos:** `src/utils/url.ts` (**NUEVO**)

### Contexto (no actuar sobre esto, solo entender)

Cinco pantallas renderizan `<a href={...}>` con URLs que vienen del backend pero que originalmente escribió un usuario (`sitio_web` de una empresa, `ficha_venta`, `ficha_tecnica`, `url` de un archivo). React 18 **no bloquea** `href="javascript:..."` — solo emite un warning. Un usuario que guarde `javascript:...` como sitio web logra ejecución de script para quien haga clic. Este helper es el control central que lo impide.

### Paso único

Crea el archivo `src/utils/url.ts` con **exactamente** este contenido:

```typescript
/**
 * Esquemas de URL que se permiten renderizar en un `href`.
 *
 * Todo lo demás se descarta, en particular `javascript:`, `data:` y `vbscript:`,
 * que ejecutan código en el origen de la aplicación. React 18 NO bloquea esos
 * esquemas — solo imprime un warning en consola y renderiza el enlace igual.
 */
const ESQUEMAS_PERMITIDOS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Devuelve la URL normalizada si es segura para usar en un `href`, o `undefined`
 * si no lo es.
 *
 * Las URLs que llegan del backend las escribió un usuario del CRM (el sitio web
 * de una empresa, el enlace a una ficha). Un vendedor puede guardar
 * `javascript:fetch('/api/v1/...')` como sitio web y conseguir ejecución de
 * script en el origen del CRM para cualquiera que haga clic — incluido un admin.
 * La CSP en producción hoy bloquea esa ejecución, pero depender de un único
 * control no basta: si alguna vez se relaja, el agujero se reabre en silencio.
 *
 * Un dominio suelto sin esquema ("quantum.pe") se asume `https://`, porque es
 * como la gente escribe un sitio web en un formulario.
 *
 * @example
 * urlSegura('quantum.pe')            // 'https://quantum.pe/'
 * urlSegura('https://quantum.pe')    // 'https://quantum.pe/'
 * urlSegura('javascript:alert(1)')   // undefined
 * urlSegura('data:text/html,<b>')    // undefined
 * urlSegura(null)                    // undefined
 */
export function urlSegura(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  const limpia = url.trim()
  if (limpia === '') return undefined

  let parsed: URL
  try {
    parsed = new URL(limpia)
  } catch {
    // Sin esquema explícito. Se reintenta como https:// antes de descartarla.
    // Ojo: esto NO abre la puerta a `javascript:` — esa cadena SÍ parsea en el
    // primer intento (con protocol 'javascript:') y la corta la lista blanca.
    try {
      parsed = new URL(`https://${limpia}`)
    } catch {
      return undefined
    }
  }

  if (!ESQUEMAS_PERMITIDOS.includes(parsed.protocol)) return undefined

  return parsed.href
}
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

### PROHIBIDO en esta tarea

- ❌ No modifiques ningún otro archivo. Las cinco pantallas se arreglan en T2–T5.
- ❌ No crees tests (el proyecto no tiene infraestructura de tests).
- ❌ No añadas el helper a ningún `index.ts` de barril (no existe ese patrón en `src/utils/`).

### Ledger

Marca `T1` y añade la línea de Bitácora.

---

## T2 — Blindar el `href` del sitio web de la empresa

- **Lote:** L2
- **Depende de:** T1
- **Archivos:** `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx`

### Paso 1 — Añadir el import

Busca esta línea (es un import existente, cerca del inicio del archivo):

```typescript
import { codigoDeError, extraerApiError, mensajeDeError } from '@/api/client'
```

Reemplázala por:

```typescript
import { codigoDeError, extraerApiError, mensajeDeError } from '@/api/client'
import { urlSegura } from '@/utils/url'
```

### Paso 2 — Blindar el enlace

`old_string` (cópialo exacto, respeta los 18 espacios de indentación de la primera línea):

```
                  {empresa.sitio_web ? (
                    <a
                      className="text-body-lg font-semibold text-brand-cyan underline"
                      href={empresa.sitio_web}
                      target="_blank"
                      rel="noreferrer"
                    >
```

`new_string`:

```
                  {urlSegura(empresa.sitio_web) ? (
                    <a
                      className="text-body-lg font-semibold text-brand-cyan underline"
                      href={urlSegura(empresa.sitio_web)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

Además, confirma que ya no queda el patrón viejo:

```bash
grep -n "href={empresa.sitio_web}" src/pages/EmpresaDetalle/EmpresaDetallePage.tsx
```

Salida esperada: **ninguna línea** (grep devuelve vacío).

### PROHIBIDO en esta tarea

- ❌ No toques el `<p>` del `else` ni el texto del enlace (`{empresa.sitio_web}` dentro del `<a>` se queda como está: es texto, React lo escapa, no es un vector).
- ❌ No toques los `href={`tel:${...}`}` ni `href={`mailto:${...}`}` de este mismo archivo (líneas ~487 y ~492). Son esquemas fijos, no inyectables. Fuera de alcance.
- ❌ No toques ningún otro archivo.

### Ledger

Marca `T2` y añade la línea de Bitácora.

---

## T3 — Blindar el `href` de los archivos de Drive

- **Lote:** L2
- **Depende de:** T1
- **Archivos:** `src/components/DocumentosDrive.tsx`

### Paso 1 — Añadir el import

Busca:

```typescript
import { formatoTamanoArchivo } from '@/utils/formato'
```

Reemplaza por:

```typescript
import { formatoTamanoArchivo } from '@/utils/formato'
import { urlSegura } from '@/utils/url'
```

### Paso 2 — Blindar el enlace

`old_string` (20 espacios de indentación en la primera línea):

```
                    {a.url ? (
                      <a
                        className="block truncate text-body-md font-semibold text-primary hover:underline"
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                      >
```

`new_string`:

```
                    {urlSegura(a.url) ? (
                      <a
                        className="block truncate text-body-md font-semibold text-primary hover:underline"
                        href={urlSegura(a.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
```

### Paso 3 — Actualizar el comentario del `else`

`old_string`:

```
                      // url null → el nombre no debe ser clicable
```

`new_string`:

```
                      // url ausente o con esquema no confiable → no clicable
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

```bash
grep -n "href={a.url}" src/components/DocumentosDrive.tsx
```

Salida esperada: **ninguna línea**.

### PROHIBIDO en esta tarea

- ❌ No toques `URL_CARPETA_DRIVE` ni la llamada `window.open(...)` de la línea ~72. Esa URL es una constante del código con un ID concatenado, no una URL de usuario. Fuera de alcance.
- ❌ No toques la lógica de subida de archivos.

### Ledger

Marca `T3` y añade la línea de Bitácora.

---

## T4 — Blindar los dos `href` de fichas en Propiedades

- **Lote:** L2
- **Depende de:** T1
- **Archivos:** `src/pages/OportunidadDetalle/PropiedadesCard.tsx`

> ⚠️ Este archivo tiene **DOS** enlaces que arreglar. Haz los dos.

### Paso 1 — Añadir el import

Busca:

```typescript
import { calcularMontoTotal } from '@/utils/monto'
```

Reemplaza por:

```typescript
import { calcularMontoTotal } from '@/utils/monto'
import { urlSegura } from '@/utils/url'
```

### Paso 2 — Enlace 1: ficha técnica del modelo (10 espacios de indentación)

`old_string`:

```
          {modelo.ficha_tecnica && (
            <a
              className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline pt-4 border-t border-outline-variant"
              href={modelo.ficha_tecnica}
              target="_blank"
              rel="noreferrer"
            >
```

`new_string`:

```
          {urlSegura(modelo.ficha_tecnica) && (
            <a
              className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline pt-4 border-t border-outline-variant"
              href={urlSegura(modelo.ficha_tecnica)}
              target="_blank"
              rel="noopener noreferrer"
            >
```

### Paso 3 — Enlace 2: ficha de venta de la oportunidad (8 espacios de indentación)

`old_string`:

```
        {o.ficha_venta ? (
          <a
            className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline"
            href={o.ficha_venta}
            target="_blank"
            rel="noreferrer"
          >
```

`new_string`:

```
        {urlSegura(o.ficha_venta) ? (
          <a
            className="text-primary font-bold font-label-md text-label-md flex items-center gap-1 hover:underline"
            href={urlSegura(o.ficha_venta)}
            target="_blank"
            rel="noopener noreferrer"
          >
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

```bash
grep -n "href={modelo.ficha_tecnica}\|href={o.ficha_venta}" src/pages/OportunidadDetalle/PropiedadesCard.tsx
```

Salida esperada: **ninguna línea**.

### PROHIBIDO en esta tarea

- ❌ No toques el `<button>` del `else` del enlace 2.
- ❌ No toques nada relacionado con `SolicitudModal`, descuentos, `monto_total` ni el formulario de edición. Este archivo es grande: limítate a los dos bloques indicados.

### Ledger

Marca `T4` y añade la línea de Bitácora.

---

## T5 — Blindar el `href` de la columna "Ficha de Venta" del pipeline

- **Lote:** L2
- **Depende de:** T1
- **Archivos:** `src/pages/Pipeline/TablaOportunidades.tsx`

### Paso 1 — Añadir el import

Busca este bloque de import multilínea (existente):

```typescript
import {
  nombreCompleto,
  formatoMonto,
  formatoPorcentaje,
  formatoFecha,
  formatoFechaHora,
} from '@/utils/formato'
```

Reemplaza por:

```typescript
import {
  nombreCompleto,
  formatoMonto,
  formatoPorcentaje,
  formatoFecha,
  formatoFechaHora,
} from '@/utils/formato'
import { urlSegura } from '@/utils/url'
```

### Paso 2 — Blindar el enlace (8 espacios de indentación)

`old_string`:

```
        v ? (
          <a href={v} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            Abrir ficha
          </a>
        ) : (
```

`new_string`:

```
        urlSegura(v) ? (
          <a
            href={urlSegura(v)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir ficha
          </a>
        ) : (
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

```bash
grep -n "href={v}" src/pages/Pipeline/TablaOportunidades.tsx
```

Salida esperada: **ninguna línea**.

### PROHIBIDO en esta tarea

- ❌ No toques la persistencia de columnas en `sessionStorage` (líneas ~307 y ~327). Son preferencias de UI, no datos sensibles. Ya se auditó y es correcto.
- ❌ No toques ninguna otra columna de la tabla.

### Ledger

Marca `T5` y añade la línea de Bitácora.

---

## T6 — Eliminar los tokens del tipo `LoginResponse`

- **Lote:** L3
- **Depende de:** —
- **Archivos:** `src/types/empleado.ts`

### Contexto

El backend confirmó por escrito: `POST /auth/login` **nunca** devolvió `access_token` ni `refresh_token` en el body. Los tokens siempre viajaron en cookies httpOnly. Este tipo declara campos que no existen: un tipo que miente invita a que alguien intente leerlos.

### Paso único

`old_string`:

```typescript
export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  empleado: Empleado
}
```

`new_string`:

```typescript
/**
 * Respuesta de `POST /auth/login` (contrato §6).
 *
 * Los tokens NO viajan aquí: van en las cookies httpOnly `access_token` y
 * `refresh_token` que setea el backend (contrato §1). Este tipo declaró
 * `access_token`/`refresh_token` desde el MVP por un error del contrato
 * original; el backend confirmó que nunca los devolvió en el body. Si vuelven
 * a aparecer aquí, es un fallo de seguridad, no una mejora.
 */
export interface LoginResponse {
  expires_in: number
  empleado: Empleado
}
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores. (Nada en el código leía esos campos; si aparece un error, **PARA** y repórtalo.)

```bash
grep -rn "access_token\|refresh_token" src/
```

Salida esperada: **ninguna línea**.

### PROHIBIDO en esta tarea

- ❌ **No añadas** `requiere_cambio_contrasena` al nivel de `LoginResponse`. Hay una consulta abierta con el backend sobre dónde vive ese campo. Hoy el código lo lee de `res.empleado` y funciona. No lo cambies.
- ❌ No toques la interfaz `Empleado` ni `EmpleadoResumen`.

### Ledger

Marca `T6` y añade la línea de Bitácora.

---

## T7 — Dejar de ocultar los fallos del cierre de sesión

- **Lote:** L3
- **Depende de:** —
- **Archivos:** `src/api/auth.ts` **y** `src/hooks/useAuth.ts` (los dos)

### Contexto

Hasta el 2026-08-13, `POST /auth/logout` no existía (devolvía 404) y el código se lo tragaba en silencio: el usuario creía cerrar sesión pero las cookies seguían vivas. **El backend ya desplegó el endpoint** — verificado en producción: responde `204` y limpia ambas cookies con `Max-Age=0`. Es idempotente: responde 204 con o sin sesión, nunca 401. Por tanto **un fallo ahora solo puede ser de red, y sí importa**: si la llamada no llega, las cookies siguen vivas.

### Paso 1 — `src/api/auth.ts`: propagar el error

`old_string`:

```typescript
  /**
   * Cierra la sesión en el servidor para que invalide el refresh_token y borre
   * las cookies httpOnly.
   *
   * ⚠️ IMPORTANTE: sin esta llamada, "cerrar sesión" solo limpiaba el estado
   * del cliente y la cookie seguía viva — bastaba recargar para volver a entrar
   * (GET /empleados/me responde con la cookie intacta). En PCs compartidas eso
   * es una sesión que no se cierra nunca.
   *
   * El endpoint aún no figura en contrato_api.md §6: si el backend responde 404
   * tragamos el error para no bloquear el cierre local, pero la cookie seguirá
   * viva hasta expirar. Solicitado al equipo de backend — al publicarse, esta
   * función ya queda conectada sin más cambios.
   */
  logout: async (): Promise<void> => {
    try {
      await post('/auth/logout', {})
    } catch {
      // El cierre local se hace igual: nunca dejar al usuario "dentro".
    }
  },
```

`new_string`:

```typescript
  /**
   * Cierra la sesión en el servidor: revoca el refresh token e invalida ambas
   * cookies httpOnly (contrato §6, `POST /auth/logout`).
   *
   * El endpoint es idempotente y responde `204` con o sin sesión válida — nunca
   * 401. Eso hace que un fallo aquí solo pueda ser de red, y que importe: si la
   * petición no llega, las cookies siguen vivas en el navegador y el usuario
   * cree haber cerrado sesión sin haberlo hecho. En una PC compartida eso es
   * exactamente el problema que este endpoint vino a resolver.
   *
   * Por eso el error se propaga en vez de tragarse: el llamador decide qué
   * decirle al usuario.
   */
  logout: async (): Promise<void> => {
    await post('/auth/logout')
  },
```

### Paso 2 — `src/hooks/useAuth.ts`: avisar al usuario si falla

Reemplaza **todo el bloque** desde el import de React hasta el final del archivo.

`old_string`:

```typescript
export function useLogout(): () => void {
  const queryClient = useQueryClient()
  const limpiar = useAuthStore((s) => s.limpiar)
  const navigate = useNavigate()

  return useCallback(() => {
    // El orden importa: primero se cierra localmente (la UI responde al
    // instante y nada vuelve a pedir datos con la sesión vieja) y en paralelo
    // se avisa al servidor para que invalide el refresh_token y borre las
    // cookies httpOnly. Sin esa segunda parte, recargar restauraba la sesión.
    queryClient.clear()
    limpiar()
    navigate('/login', { replace: true })
    void authApi.logout()
  }, [queryClient, limpiar, navigate])
}
```

`new_string`:

```typescript
export function useLogout(): () => void {
  const queryClient = useQueryClient()
  const limpiar = useAuthStore((s) => s.limpiar)
  const navigate = useNavigate()
  const { message } = App.useApp()

  return useCallback(() => {
    // El orden importa: primero se cierra localmente (la UI responde al
    // instante y nada vuelve a pedir datos con la sesión vieja) y en paralelo
    // se avisa al servidor para que revoque el refresh_token y borre las
    // cookies httpOnly. Sin esa segunda parte, recargar restauraba la sesión.
    queryClient.clear()
    limpiar()
    navigate('/login', { replace: true })

    // El endpoint es idempotente y nunca responde 401, así que llegar aquí
    // significa que la petición no salió. Las cookies siguen vivas: el usuario
    // tiene que saberlo, sobre todo si está en un equipo compartido.
    authApi.logout().catch(() => {
      message.warning(
        'Cerramos la sesión en este equipo, pero no pudimos avisar al servidor. Si estás en una PC compartida, reintenta cuando vuelva la conexión.',
      )
    })
  }, [queryClient, limpiar, navigate, message])
}
```

### Paso 3 — `src/hooks/useAuth.ts`: añadir el import de `App`

`old_string`:

```typescript
import { useQueryClient } from '@tanstack/react-query'
```

`new_string`:

```typescript
import { App } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

### PROHIBIDO en esta tarea

- ❌ No cambies el orden de las operaciones en `useLogout` (limpiar local primero, avisar al servidor después). Es deliberado.
- ❌ No toques `useRestaurarSesion`.
- ❌ No conviertas `useLogout` en `async` ni cambies su firma `() => void`. Los llamadores dependen de ella.

### Ledger

Marca `T7` y añade la línea de Bitácora.

---

## T8 — Usar el código de negocio del rate limiting en el login

- **Lote:** L3
- **Depende de:** —
- **Archivos:** `src/pages/Login/LoginPage.tsx`

### Contexto

El backend confirmó el rate limiting: 5 intentos fallidos por email → `429` con `error.code = "DEMASIADOS_INTENTOS"`. Verificado en producción. Hoy el frontend solo mira el status HTTP; usar además el código de negocio lo hace robusto ante un 429 de un proxy intermedio.

### Paso 1 — Añadir `codigoDeError` al import

`old_string`:

```typescript
import { estadoHttpDeError, mensajeDeError } from '@/api/client'
```

`new_string`:

```typescript
import { codigoDeError, estadoHttpDeError, mensajeDeError } from '@/api/client'
```

### Paso 2 — Reordenar y mejorar la traducción del error

`old_string`:

```typescript
function mensajeDeLogin(error: unknown): string {
  const status = estadoHttpDeError(error)
  if (status === 401) return 'Email o contraseña incorrectos'
  if (status === 429) return 'Demasiados intentos. Espera unos minutos antes de volver a probar'
  if (status !== null && status >= 500) {
    return 'El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos'
  }
  return mensajeDeError(error, 'No se pudo iniciar sesión')
}
```

`new_string`:

```typescript
function mensajeDeLogin(error: unknown): string {
  const status = estadoHttpDeError(error)
  // El bloqueo por intentos va PRIMERO: el backend lo devuelve como 429, pero
  // comprobar también el código de negocio cubre el caso de que un proxy de
  // borde devuelva un 429 propio sin envelope.
  if (codigoDeError(error) === 'DEMASIADOS_INTENTOS' || status === 429) {
    return 'Demasiados intentos fallidos. Por seguridad tienes que esperar unos minutos antes de volver a probar'
  }
  if (status === 401) return 'Email o contraseña incorrectos'
  if (status !== null && status >= 500) {
    return 'El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos'
  }
  return mensajeDeError(error, 'No se pudo iniciar sesión')
}
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

### PROHIBIDO en esta tarea

- ❌ **No intentes leer la cabecera `Retry-After`** para mostrar una cuenta atrás. El backend la envía, pero **no la expone vía CORS** (`Access-Control-Expose-Headers` está ausente), así que en el navegador siempre saldrá `undefined`. Hay una petición abierta al backend. Si lo intentas, escribirás código muerto.
- ❌ No toques el schema Zod ni el formulario.
- ❌ No cambies el mensaje del 401: es deliberado que no revele si falló el email o la contraseña.

### Ledger

Marca `T8` y añade la línea de Bitácora.

---

## T9 — Alinear la validación de contraseña con el contrato

- **Lote:** L3
- **Depende de:** —
- **Archivos:** `src/pages/Login/CambiarContrasenaPage.tsx`

### Contexto

El contrato (§6, `POST /auth/cambiar-contrasena`) especifica `password_nueva`: **8–72 caracteres**. El frontend solo valida el mínimo; una contraseña de 80 caracteres llega al backend y vuelve rechazada con un error genérico. Validarlo en cliente es UX (la validación autoritativa sigue siendo del backend).

### Paso único

`old_string`:

```typescript
    password_nueva: z.string().min(8, 'Mínimo 8 caracteres'),
```

`new_string`:

```typescript
    password_nueva: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres'),
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores.

### PROHIBIDO en esta tarea

- ❌ No añadas reglas de complejidad (mayúsculas, símbolos, dígitos). El backend no las exige; inventarlas en el cliente crea un formulario que rechaza contraseñas que el servidor sí acepta.
- ❌ No toques `password_actual` ni `password_confirmacion` ni el `.refine()`.

### Ledger

Marca `T9` y añade la línea de Bitácora.

---

## T10 — Eliminar el `state.from` muerto del guard

- **Lote:** L3
- **Depende de:** —
- **Archivos:** `src/router/guards.tsx`

### Contexto

`RequireAuth` guarda la ruta de origen en `state={{ from: location }}`, pero **nadie la lee**: tras el login siempre se navega a `/`. Es código muerto que sugiere una funcionalidad inexistente y que, si alguien la "completa" sin cuidado, se convierte en un open redirect.

### Paso único

`old_string`:

```typescript
  if (!empleado) return <Navigate to="/login" state={{ from: location }} replace />
```

`new_string`:

```typescript
  // Sin `state={{ from }}`: nadie lo leía — tras el login siempre se va a "/".
  // Si algún día se implementa el retorno a la ruta original, hay que validar
  // que sea una ruta interna antes de navegar; si no, es un open redirect.
  if (!empleado) return <Navigate to="/login" replace />
```

### Verificación

```bash
npm run type-check
```

Salida esperada: sin errores. `location` **sigue usándose** en la línea siguiente (`location.pathname !== '/cambiar-contrasena'`), así que `useLocation` no sobra y no debe eliminarse.

### PROHIBIDO en esta tarea

- ❌ **No elimines** `const location = useLocation()` ni el import de `useLocation`. Se siguen usando.
- ❌ No toques `RequireRol` ni `SinAcceso`.

### Ledger

Marca `T10` y añade la línea de Bitácora.

---

## T11 — Aplicar las correcciones de dependencias disponibles

- **Lote:** L4 (**primero**, antes de T12)
- **Depende de:** —
- **Archivos:** `package-lock.json` (lo modifica npm, no tú a mano)

### Contexto

Estado auditado el 2026-08-13: 5 vulnerabilidades. `npm audit fix` **solo** puede arreglar `nanoid` (transitiva de `postcss`, build-time). Las de `react-router` y `vite` requieren saltos de versión mayor y **no** se tocan en este plan.

### Paso 1 — Aplicar

```bash
npm audit fix
```

### Paso 2 — Verificar que el build sigue funcionando

```bash
npm run build
```

Salida esperada: el build termina correctamente y escribe en `dist/`. Si falla, **PARA**, ejecuta `git checkout -- package-lock.json`, y reporta FALLO en el ledger.

### Paso 3 — Registrar el estado resultante

```bash
npm audit --audit-level=high --omit=dev
echo "exit: $?"
```

Salida esperada: `exit: 0`. Es el estado que T12 convertirá en gate bloqueante. Si el exit **no** es 0, **PARA** y reporta FALLO: T12 rompería el pipeline.

### PROHIBIDO en esta tarea

- ❌ **No ejecutes `npm audit fix --force`.** Instalaría Vite 8 y React Router 7 (saltos mayores) y rompería la aplicación.
- ❌ No actualices `react-router-dom` a 7.x. La vulnerabilidad reportada (open redirect) **se verificó como no explotable** en esta app: no hay ninguna navegación con valores controlados por el usuario. La migración a v7 es un proyecto aparte.
- ❌ No edites `package.json` a mano.
- ❌ No borres `node_modules` ni ejecutes `npm install` desde cero.

### Ledger

Marca `T11`. En la Bitácora, incluye el número de vulnerabilidades antes y después (`npm audit` lo imprime).

---

## T12 — Restaurar el gate de auditoría en CI

- **Lote:** L4 (**después** de T11)
- **Depende de:** T11
- **Archivos:** `.github/workflows/deploy.yml`

### Contexto

`SECURITY-frontend.md §8` y `DEVOPS-frontend.md §4` exigen que el build falle ante vulnerabilidades altas o críticas. Hoy el paso lleva `|| true`, así que nunca falla: no es un gate, es un log.

El gate bloqueante usa `--omit=dev` a propósito. Las vulnerabilidades de Vite/esbuild/PostCSS afectan a la máquina del desarrollador, **no al bundle que se sirve al usuario**. Un gate que falla por ellas obliga al equipo a saltárselo, y entonces deja de proteger nada. Verificado: con `--omit=dev` el exit code hoy es 0; sin él, es 1.

### Paso 1 — Sustituir el paso de auditoría

`old_string`:

```yaml
      - name: Auditoría de dependencias
        # No bloquea el despliegue: muchas alertas vienen de dependencias de
        # desarrollo que nunca llegan al bundle. Queda registrada en el log para
        # revisarla. Cambia a `--audit-level=high` sin `|| true` para convertirlo
        # en un gate real cuando el equipo pueda atender los hallazgos.
        run: npm audit --audit-level=high || true
```

`new_string`:

```yaml
      # GATE REAL sobre lo que llega al navegador del usuario.
      # `--omit=dev` es deliberado: las vulnerabilidades de Vite, esbuild o
      # PostCSS afectan a la máquina del desarrollador, no al bundle desplegado.
      # Un gate que falla por ellas acaba desactivado, y entonces no protege nada.
      - name: Auditoría de dependencias de producción (BLOQUEANTE)
        run: npm audit --audit-level=high --omit=dev

      # Informativo: incluye devDependencies. No bloquea, pero deja el estado en
      # el log para que las vulnerabilidades de tooling no pasen inadvertidas.
      - name: Auditoría completa incl. desarrollo (informativo)
        run: npm audit --audit-level=high || true

      # El build es el último gate de DEVOPS-frontend.md §4: detecta fallos de
      # empaquetado que `tsc --noEmit` no ve.
      - name: Build de producción
        run: npm run build
        env:
          VITE_API_BASE_URL: https://api.quantuminvest.com.pe/api/v1
```

### Paso 2 — Documentar que la imagen Docker no es el despliegue vigente

`old_string`:

```yaml
# Despliegue automático: en cada push a `main` se construye la imagen Docker y
# se publica en GitHub Container Registry (ghcr.io), etiquetada con el SHA del
# commit y con `latest`.
```

`new_string`:

```yaml
# ⚠️ ESTE NO ES EL DESPLIEGUE VIGENTE (auditoría 2026-08-13).
# Producción se sirve desde **Vercel**, y las cabeceras de seguridad reales
# (CSP, HSTS, X-Frame-Options…) las emite `vercel.json` — verificado en vivo
# contra https://crm.quantuminvest.com.pe. La imagen Docker + nginx de este
# workflow se mantiene como plan de contingencia, pero NO sirve tráfico.
# Si cambias la CSP, hazlo en `vercel.json` PRIMERO; `nginx.conf.template` es
# una copia que hay que mantener sincronizada a mano.
#
# Despliegue automático: en cada push a `main` se construye la imagen Docker y
# se publica en GitHub Container Registry (ghcr.io), etiquetada con el SHA del
# commit y con `latest`.
```

### Verificación

```bash
npm audit --audit-level=high --omit=dev
echo "exit: $?"
```

Salida esperada: `exit: 0` (el gate que acabas de escribir pasaría hoy).

Además, confirma que ya no queda el `|| true` en el paso bloqueante:

```bash
grep -n "audit-level=high" .github/workflows/deploy.yml
```

Salida esperada: **dos** líneas — una sin `|| true` (bloqueante) y otra con `|| true` (informativa).

### PROHIBIDO en esta tarea

- ❌ No añadas pasos de `lint` ni de `test` al workflow. Ambos scripts son stubs `exit 0` en `package.json`: añadirlos daría una falsa sensación de cobertura. Configurarlos de verdad es trabajo de la auditoría de código, no de esta.
- ❌ No toques el job `publicar` ni los `build-args`.
- ❌ No borres el workflow ni la ruta de Docker.

### Ledger

Marca `T12` y añade la línea de Bitácora.

---

## T13 — Sincronizar el contrato de API con la autenticación real

- **Lote:** L5
- **Depende de:** —
- **Archivos:** `docs/contrato_api.md`

### Contexto

El contrato documentaba `Authorization: Bearer` y tokens en el body. **Nunca fue así**: siempre fueron cookies httpOnly. El equipo de backend envió el diff oficial. Este archivo tiene cambios sin commitear, así que **no uses `git apply`** — aplica las ediciones una por una.

### Paso 1 — §1: sustituir la línea del header de auth

`old_string`:

```
Auth header:   Authorization: Bearer {jwt_token}
```

`new_string`:

```
Auth:          cookies httpOnly, ver abajo — NUNCA Authorization: Bearer
```

### Paso 2 — §1: sustituir la nota de endpoints públicos por el bloque de cookies

`old_string`:

```
Todo endpoint salvo `/auth/login` y `/auth/refresh` requiere token JWT válido.
```

`new_string`:

```
**Autenticación real (SECURITY-backend.md §2.1):** el JWT viaja en dos cookies `httpOnly`, nunca en el body ni en un header. El frontend no las lee ni las setea — el navegador las adjunta solo. `withCredentials: true` (o `credentials: 'include'`) es obligatorio en cada petición.

```
Set-Cookie: access_token=<jwt>;  HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

- `Secure` exige HTTPS (en local sobre HTTP se desactiva vía `COOKIE_SECURE=false`, nunca en un despliegue real).
- `SameSite=Strict` es la mitigación de CSRF; no hay token CSRF adicional.
- Ambas cookies se reemiten en cada `/auth/login`, `/auth/refresh` y `/auth/cambiar-contrasena` exitoso.

Todo endpoint salvo `/auth/login`, `/auth/refresh` y `/auth/logout` requiere sesión válida (cookie `access_token`).
```

### Paso 3 — §6: encabezado de la sección

`old_string`:

```
## 6. Auth

### POST /auth/login
> Autentica al usuario y devuelve un par de tokens.
```

`new_string`:

```
## 6. Auth

Los tokens **nunca** viajan en el body ni se leen de un header `Authorization`: van en las cookies `httpOnly` descritas en §1. Todas las respuestas de esta sección solo llevan lo que no está ya en la cookie.

### POST /auth/login
> Autentica al usuario y setea las cookies de sesión.
```

### Paso 4 — §6: quitar los tokens del ejemplo de respuesta

`old_string`:

```json
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600,
```

`new_string`:

```json
    "expires_in": 3600,
```

### Paso 5 — §6: notas de login

`old_string`:

```
**Notas:**
- `access_token` expira en 1 hora. `refresh_token` expira en 7 días.
- Responde `401` si las credenciales son inválidas, sin indicar si el error es en email o contraseña.
```

`new_string`:

```
**Notas:**
- Setea `access_token` (expira en 1 hora) y `refresh_token` (expira en 7 días) — ver §1.
- Responde `401` si las credenciales son inválidas, sin indicar si el error es en email o contraseña.
- Rate limiting por email: 5 intentos fallidos → `429` con cabecera `Retry-After` (segundos) y `error.code = "DEMASIADOS_INTENTOS"`.
  ⚠️ **Pendiente con backend:** `Retry-After` no está en `Access-Control-Expose-Headers`, así que el frontend no puede leerla desde otro origen.
```

### Paso 6 — §6: reescribir `/auth/refresh` y añadir `/auth/logout`

`old_string`:

```
### POST /auth/refresh
> Renueva el access token usando el refresh token.

**Body:**
```json
{ "refresh_token": "eyJ..." }
```

**Respuesta 200:** misma estructura que `/auth/login` pero sin `empleado`.

**Errores:**
- `401 CREDENCIALES_INVALIDAS` — el refresh token no es válido, expiró, el empleado está inactivo, **o el empleado ya no existe** (una credencial muerta no es un recurso ausente: nunca `404`).
```

`new_string`:

```
### POST /auth/refresh
> Renueva el access token. El refresh token se lee de su propia cookie — no del body.

**Body:** ninguno (POST sin contenido).

**Respuesta 200:**
```json
{ "data": { "expires_in": 3600 } }
```

Reemite ambas cookies.

**Errores:**
- `401 CREDENCIALES_INVALIDAS` — la cookie `refresh_token` falta, no es válida, expiró, es de tipo access, el empleado está inactivo, la sesión fue revocada (logout o cambio de contraseña), **o el empleado ya no existe** (una credencial muerta no es un recurso ausente: nunca `404`).

---

### POST /auth/logout
> Cierra sesión: revoca el refresh token en servidor y limpia ambas cookies.

**Body:** ninguno. No requiere sesión válida.

**Respuesta:** `204 No Content`, sin body.

**Notas:**
- Idempotente y a prueba de fallos: responde `204` con o sin cookie de sesión, con cookie expirada, o sin sesión — nunca `401`.
- Si la cookie `refresh_token` es válida, invalida esa sesión **en servidor** (no solo en el navegador): un refresh token copiado antes del logout deja de servir en el siguiente `/auth/refresh`.
- Limpia `access_token` y `refresh_token` con `Max-Age=0`, con los mismos `Path`/`HttpOnly`/`Secure`/`SameSite` con que se emitieron.
- Límite conocido: un `access_token` ya emitido sigue siendo válido hasta expirar (máx. 1 hora); no se revisa contra base de datos en cada request. En el navegador que hizo logout la cookie se borra, así que esto solo aplica a un token exfiltrado antes del cierre.
```

### Paso 7 — §6: nota de cambio de contraseña

`old_string`:

```
**Respuesta 200:** sin datos (`{ "data": null }`).
```

`new_string`:

```
**Respuesta 200:** sin datos (`{ "data": null }`). Reemite ambas cookies.
```

### Paso 8 — §6: nota final de cambio de contraseña

`old_string`:

```
- Al completarse con éxito, `requiere_cambio_contrasena` pasa a `false`. El siguiente `/auth/login` ya lo refleja en el `empleado` devuelto.
```

`new_string`:

```
- Al completarse con éxito, `requiere_cambio_contrasena` pasa a `false`. El siguiente `/auth/login` ya lo refleja en el `empleado` devuelto.
- Invalida el refresh token de cualquier otra sesión abierta con la cuenta (mismo mecanismo que `/auth/logout`); la sesión que hizo el cambio sigue viva porque el backend reemite sus cookies con la versión ya vigente.
```

### Verificación

```bash
grep -n "Authorization: Bearer {jwt_token}\|\"access_token\": \"eyJ\"" docs/contrato_api.md
```

Salida esperada: **ninguna línea**.

```bash
grep -c "POST /auth/logout" docs/contrato_api.md
```

Salida esperada: `1` o más.

### PROHIBIDO en esta tarea

- ❌ No ejecutes `git apply`, `git checkout` ni `git stash`. El archivo tiene cambios sin commitear que se perderían.
- ❌ No toques ninguna otra sección del contrato (§7 en adelante). En particular, **no corrijas** el rol `gerente` que aparece en §7: es una inconsistencia conocida del contrato, ya reportada, y fuera de alcance.
- ❌ No reformatees el markdown ni reordenes secciones.

### Ledger

Marca `T13` y añade la línea de Bitácora.

---

## T14 — Actualizar la especificación de seguridad del frontend

- **Lote:** L5
- **Depende de:** —
- **Archivos:** `docs/SECURITY-frontend.md`

### Contexto

`SECURITY-frontend.md §2.1` describe el modelo de cookies de forma genérica porque, hasta esta auditoría, los atributos reales no estaban documentados en ninguna parte. Ya se conocen y se verificaron en producción.

### Paso 1 — Concretar los atributos de cookie en §2.1

`old_string`:

```
- El backend setea el JWT en una cookie `httpOnly`. **El frontend nunca lee, guarda ni manipula el token.** No hay código que acceda a `document.cookie` para el token.
```

`new_string`:

```
- El backend setea el JWT en dos cookies `httpOnly`. **El frontend nunca lee, guarda ni manipula el token.** No hay código que acceda a `document.cookie` para el token.

Atributos reales, confirmados por el equipo de backend y verificados en producción el 2026-08-13:

```
Set-Cookie: access_token=<jwt>;  HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Por qué `SameSite=Strict` no rompe la aplicación** (y por qué nadie debe "arreglarlo" a `Lax`): el frontend vive en `crm.quantuminvest.com.pe` y la API en `api.quantuminvest.com.pe`. Comparten dominio registrable, así que las peticiones XHR de la SPA son *same-site* y el navegador adjunta la cookie con normalidad. El problema clásico de `Strict` —llegar desde un enlace externo sin cookie— no aplica: lo primero que se carga es el HTML estático, que no necesita sesión; las llamadas a la API que vienen después ya salen de una página del propio sitio.

`SameSite=Strict` **es** la mitigación de CSRF. No hay token CSRF y no hace falta implementarlo en el cliente.
```

### Paso 2 — Documentar el cierre de sesión en §10

`old_string`:

```
```typescript
function logout() {
  await authApi.logout()        // el backend invalida la sesión
  queryClient.clear()           // limpiar datos en memoria
  redirectToLogin()
}
```
```

`new_string`:

```
```typescript
function logout() {
  queryClient.clear()           // limpiar datos en memoria del usuario anterior
  limpiarEstadoLocal()
  redirectToLogin()             // la UI responde al instante
  authApi.logout().catch(avisar) // el backend revoca el refresh token y borra las cookies
}
```

`POST /auth/logout` responde `204` siempre (con sesión o sin ella) y limpia ambas cookies con `Max-Age=0`. Como no puede fallar por autorización, **un error solo puede ser de red — y hay que decírselo al usuario**: si la petición no llegó, las cookies siguen vivas y la sesión no está realmente cerrada. Tragarse ese error en silencio fue el hallazgo crítico de la auditoría del 2026-08-13.

Límite conocido y aceptado: un `access_token` ya emitido sigue siendo válido hasta expirar (máx. 1 hora). En el navegador que cerró sesión la cookie se borra, así que esto solo afecta a un token exfiltrado antes del cierre.
```

### Paso 3 — Registrar la excepción de la analítica en §6

`old_string`:

```
- No hacer requests a orígenes no confiables. Todo el tráfico va al backend de Quantum.
```

`new_string`:

```
- No hacer requests a orígenes no confiables. Todo el tráfico va al backend de Quantum, **con una excepción registrada**: Vercel Analytics (`<Analytics />` en `App.tsx`) envía la ruta visitada a Vercel. Se carga desde `/_vercel/insights/script.js` (mismo origen), por lo que la CSP lo permite.

  Implicación a tener presente: las rutas del CRM incluyen identificadores de negocio (`/empresas/123`, `/oportunidades/45`), así que qué empresas y oportunidades se consultan sale hacia un procesador externo. Es una decisión de tratamiento de datos, no un fallo técnico. Si deja de aceptarse, se retira el componente de `App.tsx`.
```

### Verificación

```bash
grep -c "SameSite=Strict" docs/SECURITY-frontend.md
```

Salida esperada: `2` o más.

### PROHIBIDO en esta tarea

- ❌ No toques `docs/contrato_api.md` (es de T13).
- ❌ No cambies la tabla del §11 ni la del §12.
- ❌ No borres ninguna sección existente.

### Ledger

Marca `T14` y añade la línea de Bitácora.

---

## T15 — Marcar la ruta nginx/Docker como no vigente

- **Lote:** L5
- **Depende de:** —
- **Archivos:** `nginx.conf.template` y `Dockerfile`

### Contexto

Producción se sirve desde Vercel (verificado en vivo: las cabeceras coinciden con `vercel.json`). La ruta nginx existe en paralelo con **una segunda definición de la CSP** que hay que mantener sincronizada a mano. Quien edite la CSP en el archivo equivocado creerá haber cambiado producción sin haberlo hecho.

### Paso 1 — Cabecera de `nginx.conf.template`

`old_string`:

```
# Configuración de nginx para el SPA de Quantum CRM.
```

`new_string`:

```
# ⚠️ NO ES LA CONFIGURACIÓN VIGENTE EN PRODUCCIÓN (auditoría 2026-08-13).
#
# Producción se sirve desde Vercel: las cabeceras reales las emite `vercel.json`
# (verificado en vivo contra https://crm.quantuminvest.com.pe). Este archivo se
# mantiene como plan de contingencia por si se vuelve al contenedor nginx.
#
# La CSP de abajo es una COPIA de la de `vercel.json`. Si cambias una, cambia la
# otra: no hay nada que las mantenga sincronizadas y la divergencia es silenciosa.
#
# Configuración de nginx para el SPA de Quantum CRM.
```

### Paso 2 — Cabecera del `Dockerfile`

`old_string`:

```
# syntax=docker/dockerfile:1
```

`new_string`:

```
# syntax=docker/dockerfile:1

# ⚠️ Esta imagen NO sirve el tráfico de producción (auditoría 2026-08-13).
# Producción está en Vercel. Se mantiene como plan de contingencia; ver la
# cabecera de `nginx.conf.template`.
```

### Verificación

```bash
grep -c "NO ES LA CONFIGURACIÓN VIGENTE" nginx.conf.template
```

Salida esperada: `1`.

```bash
grep -c "NO sirve el tráfico de producción" Dockerfile
```

Salida esperada: `1`.

### PROHIBIDO en esta tarea

- ❌ **No borres** `nginx.conf.template`, el `Dockerfile`, `docker-compose.yml` ni `docker/`. Se conservan como contingencia.
- ❌ No modifiques la CSP de ninguno de los dos archivos.
- ❌ No toques `vercel.json` — es la configuración viva de producción, y cualquier error allí afecta a usuarios reales.

### Ledger

Marca `T15` y añade la línea de Bitácora.

---

## T16 — Eliminar el build obsoleto

- **Lote:** L6
- **Depende de:** L1–L5 completos
- **Archivos:** `dist/` (directorio)

### Contexto

`dist/` contiene un build viejo apuntando a `localhost:8080`. Está en `.gitignore` y no está trackeado, así que no llegará al repo, pero es un artefacto regenerable que conviene no dejar por ahí.

### Paso 1 — Confirmar que no está trackeado

```bash
git ls-files dist/ | head
```

Salida esperada: **ninguna línea**. Si aparece algún archivo, **PARA** y reporta FALLO (significaría que sí está versionado y borrarlo tendría consecuencias).

### Paso 2 — Borrar

```bash
rm -rf dist
```

### Verificación

```bash
ls dist 2>/dev/null || echo "dist eliminado"
```

Salida esperada: `dist eliminado`.

### PROHIBIDO en esta tarea

- ❌ No borres `node_modules`, `.env`, `public/` ni ningún otro directorio.
- ❌ No ejecutes `git clean` (borraría archivos no trackeados que el humano puede necesitar).

### Ledger

Marca `T16` y añade la línea de Bitácora.

---

## T17 — Actualizar el informe de auditoría con el estado final

- **Lote:** L6
- **Depende de:** T1–T16 (**todas** en `[x]`)
- **Archivos:** `docs/AUDITORIA-SEGURIDAD-2026-08-13.md`

### Paso único

Añade al **final** del archivo (sin modificar nada de lo existente) este bloque, sustituyendo `<FECHA>` por la fecha ISO de hoy:

```markdown

---

# ADENDA — Estado tras la remediación (<FECHA>)

Plan ejecutado: `docs/superpowers/plans/2026-08-13-fixes-auditoria-seguridad.md`
Ledger: `docs/superpowers/plans/2026-08-13-fixes-auditoria-seguridad.progress.md`

## Resueltos

| ID | Estado | Cómo se cerró |
|---|---|---|
| **C-1** | ✅ Resuelto | El backend desplegó `POST /auth/logout`. Verificado en producción: `204`, y ambas cookies se limpian con `Max-Age=0` conservando `Path`/`HttpOnly`/`Secure`/`SameSite=Strict`. El frontend dejó de tragarse el error (T7). |
| **A-1** | ✅ Resuelto | Contrato sincronizado con las cookies reales (T13). `LoginResponse` ya no declara tokens (T6). |
| **A-2** | ✅ Resuelto | Gate bloqueante `npm audit --audit-level=high --omit=dev` en CI (T12) + `npm audit fix` aplicado (T11). |
| **M-1** | ✅ Resuelto | Helper `urlSegura()` (T1) aplicado en los 5 puntos de render (T2–T5). |
| **M-3** | ✅ Documentado | Excepción de Vercel Analytics registrada en `SECURITY-frontend.md §6` (T14). |
| **M-4** | ✅ Documentado | Ruta nginx/Docker marcada como no vigente (T12, T15). |
| **M-5** | ✅ Resuelto | `dist/` obsoleto eliminado (T16). |
| **B-2** | ✅ Resuelto | Validación 8–72 alineada con el contrato (T9). |
| **B-3** | ✅ Resuelto | `state.from` muerto eliminado del guard (T10). |

## Cerrados por respuesta del backend

- **B-1** — `error.message` nunca lleva detalle interno: un 500 devuelve mensaje genérico + `correlation_id`. Es seguro mostrarlo al usuario.
- **CSRF** — `SameSite=Strict` + CORS con origen específico. No requiere nada del cliente.

## Abiertos

| ID | Estado | Qué falta |
|---|---|---|
| **M-2** | Abierto | El cotizador (`quantum.okserver43.com`) sigue sin TLS. Depende de un sistema externo; no hay acción posible desde el frontend más allá de la constante ya documentada. |
| **Retry-After** | Pendiente de backend | Se envía en el 429 pero falta `Access-Control-Expose-Headers: Retry-After`; el navegador no puede leerla. Sin ella no se puede mostrar cuenta atrás. |
| **`requiere_cambio_contrasena`** | Pendiente de backend | Aclarar si vive en `data` o dentro de `empleado` en la respuesta de login. El código lo lee de `empleado` y funciona. |
| **react-router-dom** | Aceptado con riesgo | Vulnerabilidad de open redirect moderada; el parche está en 7.x (salto mayor). **Verificado no explotable**: no hay navegaciones con valores controlados por el usuario. Migración a v7 como proyecto aparte. |
| **Vite / esbuild** | Aceptado con riesgo | Vulnerabilidades solo del dev server (afectan a la máquina del desarrollador, no al bundle). El parche exige Vite 8. Excluidas del gate vía `--omit=dev`. |

## Verificación manual pendiente

Las 6 comprobaciones de la sección "PARA REVISIÓN MANUAL DEL DESARROLLADOR" siguen vigentes. La #3 (reproducir C-1) ahora debería **fallar en el buen sentido**: tras cerrar sesión y recargar, la app debe pedir credenciales.
```

### Verificación

```bash
grep -c "ADENDA — Estado tras la remediación" docs/AUDITORIA-SEGURIDAD-2026-08-13.md
```

Salida esperada: `1`.

### PROHIBIDO en esta tarea

- ❌ No modifiques ni borres nada del contenido original del informe. Solo añades al final.
- ❌ No marques como resuelto nada que no esté `[x]` en el ledger. Si alguna tarea quedó en `[!]` (fallo), refléjalo tal cual en la tabla.

### Ledger

Marca `T17` y añade la línea de Bitácora.

---

# PARTE 2 — VERIFICACIÓN FINAL (sesión principal, no subagente)

Tras cerrar T17, ejecuta en la sesión principal:

```bash
npm run type-check
npm run build
npm audit --audit-level=high --omit=dev; echo "exit: $?"
grep -rn "dangerouslySetInnerHTML\|eval(\|new Function(" src/
grep -rn "access_token\|refresh_token" src/
grep -rn 'rel="noreferrer"' src/
```

Resultados esperados:

| Comando | Esperado |
|---|---|
| `type-check` | sin errores |
| `build` | completa correctamente |
| `npm audit ... --omit=dev` | `exit: 0` |
| grep XSS | ninguna línea |
| grep tokens | ninguna línea |
| grep `rel="noreferrer"` | ninguna línea (los 5 pasaron a `noopener noreferrer`) |

Después, prueba en el navegador con sesión real: **cerrar sesión → recargar**. Debe pedir credenciales. Si entra directo, C-1 sigue abierto y hay que reabrirlo.

---

# PARTE 3 — FUERA DE ALCANCE (no lo hagas en este plan)

Registrado para la auditoría de código, que es un trabajo aparte:

- Configurar ESLint de verdad (hoy es `exit 0`).
- Configurar Vitest y escribir tests (hoy es `exit 0`).
- Migrar react-router-dom a v7 y Vite a v8.
- Auto-hospedar las fuentes de Google para poder quitar `fonts.googleapis.com` y `fonts.gstatic.com` de la CSP.
- Eliminar `style-src 'unsafe-inline'` (lo exige Ant Design v5 con CSS-in-JS).
- Corregir el rol `gerente` → `gerencia` en `contrato_api.md §7` (es del backend).
- Integrar un servicio de error reporting (Sentry) — hoy solo hay `console.error`.
