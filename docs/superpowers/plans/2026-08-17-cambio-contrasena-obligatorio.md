# PLAN — UX del cambio de contraseña obligatorio (bloqueo real de servidor)

**Fecha:** 2026-08-17
**Origen:** respuesta del equipo de backend del 2026-08-17 (ver §"Contexto" abajo).
**Ledger:** `docs/superpowers/plans/2026-08-17-cambio-contrasena-obligatorio.progress.md`

---

# PARTE 0 — INSTRUCCIONES PARA EL SUBAGENTE EJECUTOR

> Lee esta parte completa antes de tocar nada.

## 0.1 Qué eres

Un **ejecutor literal**. El análisis ya está hecho y verificado. Aplica exactamente tu tarea.

**PROHIBIDO:**
1. ❌ Razonar sobre si la corrección es correcta. Si algo te parece mal, anótalo en el ledger y sigue.
2. ❌ Ampliar el alcance. Si ves otro bug en el mismo archivo, NO lo toques: anótalo en "Observaciones fuera de alcance".
3. ❌ Tocar archivos que no estén listados en tu tarea.
4. ❌ Refactorizar, renombrar, reordenar imports o reformatear.
5. ❌ `git commit`, `git push`, `git checkout`, `git reset`, `git restore`, `git clean`.
6. ❌ `npm install <paquete>` o añadir dependencias.
7. ❌ Inventar texto. Los bloques de código son literales: cópialos carácter por carácter.

**OBLIGATORIO:**
1. ✅ Usa `Edit` con el `old_string` copiado **exacto** (incluida la indentación). Si `Edit` falla porque no encuentra la cadena, **PARA** y reporta el fallo en el ledger. No improvises una coincidencia parecida.
2. ✅ Ejecuta el comando de verificación y compara con lo esperado.
3. ✅ Actualiza el ledger al terminar (§0.3).

## 0.2 Contexto — qué cambió en el backend y por qué importa

El backend acaba de desplegar **dos** cambios sobre `requiere_cambio_contrasena`:

1. **`GET /empleados/me` ahora incluye el campo.** Antes no lo devolvía, así que el dato se perdía en cada recarga de página. Ya no.
2. **🔴 Es bloqueo real de servidor, no solo UX.** Mientras el flag esté en `true`, **cualquier** endpoint devuelve `403` con `error.code = "CAMBIO_CONTRASENA_REQUERIDO"`. Solo funcionan `/auth/cambiar-contrasena`, `/auth/logout` y `/empleados/me`. (`/auth/login` y `/auth/refresh` no se ven afectados: son públicos.)

**Qué se rompe si no hacemos nada:**

- El guard `RequireAuth` solo evalúa el flag **al montar**. Si un admin resetea la contraseña **a mitad de sesión**, el usuario ya está navegando: cada query empieza a devolver 403 y ve *"El rol no tiene acceso a esta operación"* o pantallas de error por toda la app, sin ninguna pista de qué hacer. El polling de notificaciones (45 s) lo dispara solo.
- Peor: la pantalla de cambio de contraseña **no tiene ninguna salida**. No está dentro de `AppLayout`, así que no hay menú de usuario ni botón de cerrar sesión. Quien no recuerde su contraseña actual queda **encerrado**: no puede navegar (403 en todo), no puede cambiar de cuenta, no puede salir. La única escapatoria sería borrar cookies a mano.

Este plan cubre exactamente esos dos huecos, más la sincronización de la documentación.

## 0.3 Protocolo del ledger (los agentes se destruyen entre tareas)

**Al EMPEZAR:**
1. Lee `docs/superpowers/plans/2026-08-17-cambio-contrasena-obligatorio.progress.md`.
2. Si tu tarea ya está `[x]` → **PARA**. Responde: `TX ya estaba DONE. No hice nada.` Los `Edit` **no son idempotentes**: aplicarlos dos veces corrompe el archivo.
3. Verifica que las tareas de `Depende de:` estén `[x]`. Si no → **PARA** y repórtalo.

**Al TERMINAR:**
1. Cambia `- [ ] TX` por `- [x] TX`.
2. Añade una línea a "Bitácora" (solo añadir, nunca editar ni borrar líneas previas; usa `Edit` con contexto único, no reescribas el archivo entero):
   ```
   - TX — DONE — <fecha ISO> — verificación: <comando> → <resultado>. <Qué cambió.>
   ```
3. Si viste algo fuera de alcance → "Observaciones fuera de alcance".
4. Si falló → marca `- [!] TX` y detalla el fallo exacto en Bitácora.

## 0.4 Verificación estándar

```bash
npm run type-check
```
**Esperado:** ninguna línea con `error TS`. Cualquiera → **FALLO**.

## 0.5 Orden de ejecución

Las 5 tareas tocan **archivos distintos** y pueden correr **todas en paralelo**. No hay dependencias entre ellas.

| Tarea | Archivo(s) | Prioridad |
|---|---|---|
| **T1** | `src/api/client.ts` | 🔴 Crítica — sin esto el usuario ve 403 sueltos |
| **T2** | `src/pages/Login/CambiarContrasenaPage.tsx` | 🔴 Crítica — sin esto el usuario queda encerrado |
| **T3** | `docs/contrato_api.md` | Documentación |
| **T4** | `src/types/empleado.ts` + `src/pages/Login/LoginPage.tsx` | Comentarios obsoletos |
| **T5** | `docs/SECURITY-frontend.md` | Documentación |

---

# PARTE 1 — TAREAS

---

## T1 — Redirigir al formulario ante `CAMBIO_CONTRASENA_REQUERIDO`

- **Archivo:** `src/api/client.ts`
- **Depende de:** —

### Contexto

Es la corrección que el propio backend pidió explícitamente: *"Vale la pena que manejen ese código explícitamente en su interceptor de errores (redirigir al cambio de contraseña, no mostrar 'error de permisos')."*

### Paso único

`old_string`:

```
    if (status === 401 && config && !config._retry && !esAuth) {
      config._retry = true
      try {
        await refreshSession()
        return apiClient.request(config)
      } catch {
        // Refresh falló → sesión terminada. Redirigir a login.
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }
    }
    return Promise.reject(error)
```

`new_string`:

```
    if (status === 401 && config && !config._retry && !esAuth) {
      config._retry = true
      try {
        await refreshSession()
        return apiClient.request(config)
      } catch {
        // Refresh falló → sesión terminada. Redirigir a login.
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }
    }

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
     */
    if (
      status === 403 &&
      extraerApiError(error)?.code === 'CAMBIO_CONTRASENA_REQUERIDO' &&
      !redirigiendoACambioContrasena &&
      window.location.pathname !== RUTA_CAMBIO_CONTRASENA
    ) {
      // El flag evita que varias respuestas 403 en paralelo (el dashboard lanza
      // muchas queries a la vez) disparen varias navegaciones encadenadas.
      redirigiendoACambioContrasena = true
      window.location.assign(RUTA_CAMBIO_CONTRASENA)
    }

    return Promise.reject(error)
```

### Paso 2 — Declarar las dos constantes

`old_string`:

```
let refreshPromise: Promise<void> | null = null
```

`new_string`:

```
let refreshPromise: Promise<void> | null = null

/** Formulario de cambio obligatorio. El backend bloquea el resto de la app. */
const RUTA_CAMBIO_CONTRASENA = '/cambiar-contrasena'
let redirigiendoACambioContrasena = false
```

### Verificación

```bash
npm run type-check
```
Esperado: sin errores.

```bash
grep -c "CAMBIO_CONTRASENA_REQUERIDO" src/api/client.ts
```
Esperado: `1`.

### PROHIBIDO

- ❌ No toques el bloque del `401` ni `refreshSession()`.
- ❌ No cambies el `return Promise.reject(error)` final: el error debe seguir propagándose para que TanStack Query no se quede colgado esperando.
- ❌ No uses `useNavigate` aquí — este archivo no es un componente de React. `window.location.assign` es deliberado: fuerza recarga limpia, igual que el camino del 401.

### Ledger
Marca `T1` + línea de Bitácora.

---

## T2 — Dar salida al usuario y limpiar el cache al terminar

- **Archivo:** `src/pages/Login/CambiarContrasenaPage.tsx`
- **Depende de:** —

### Contexto

Tres arreglos de UX en la misma pantalla:
1. **Salida de emergencia.** Hoy no hay ninguna. Con el bloqueo del servidor, quien no recuerde su contraseña actual queda encerrado sin poder ni cerrar sesión.
2. **Limpiar el cache al cambiar.** El cache puede tener respuestas 403 de antes del cambio; sin limpiarlo, esas pantallas siguen mostrando el error ya resuelto. Además el backend revoca las demás sesiones y reemite cookies.
3. **Texto más claro.** El usuario debe saber que el resto de la app está bloqueado, no que es una sugerencia.

### Paso 1 — Imports

`old_string`:

```
import { post, mensajeDeError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Cargando } from '@/components/Estados'
```

`new_string`:

```
import { useQueryClient } from '@tanstack/react-query'
import { post, mensajeDeError } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { Cargando } from '@/components/Estados'
```

### Paso 2 — Hooks

`old_string`:

```
  const navigate = useNavigate()
  const empleado = useAuthStore((s) => s.empleado)
  const cargandoSesion = useAuthStore((s) => s.cargando)
  const setEmpleado = useAuthStore((s) => s.setEmpleado)
```

`new_string`:

```
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useLogout()
  const empleado = useAuthStore((s) => s.empleado)
  const cargandoSesion = useAuthStore((s) => s.cargando)
  const setEmpleado = useAuthStore((s) => s.setEmpleado)
```

### Paso 3 — Limpiar el cache tras el cambio

`old_string`:

```
      setEmpleado({ ...empleado, requiere_cambio_contrasena: false })
      navigate('/', { replace: true })
```

`new_string`:

```
      // El cache puede tener respuestas 403 CAMBIO_CONTRASENA_REQUERIDO de antes
      // del cambio: sin limpiarlo, esas pantallas seguirían mostrando un error ya
      // resuelto. El backend además reemite cookies y revoca las otras sesiones.
      queryClient.clear()
      setEmpleado({ ...empleado, requiere_cambio_contrasena: false })
      navigate('/', { replace: true })
```

### Paso 4 — Texto explicativo

`old_string`:

```
        <Typography.Paragraph style={{ color: '#444750' }}>
          Por seguridad debes definir una contraseña nueva antes de continuar.
        </Typography.Paragraph>
```

`new_string`:

```
        <Typography.Paragraph style={{ color: '#444750' }}>
          Por seguridad debes definir una contraseña nueva antes de continuar. El
          resto de la aplicación permanece bloqueado hasta que la cambies.
        </Typography.Paragraph>
```

### Paso 5 — Salida de emergencia

`old_string`:

```
          <Button type="primary" htmlType="submit" block loading={enviando} style={{ marginTop: 24 }}>
            Guardar y continuar
          </Button>
        </form>
```

`new_string`:

```
          <Button type="primary" htmlType="submit" block loading={enviando} style={{ marginTop: 24 }}>
            Guardar y continuar
          </Button>
        </form>

        {/* Única salida de esta pantalla: no está dentro de AppLayout, así que no
            hay menú de usuario. Mientras el flag siga activo el backend responde
            403 a todo lo demás, de modo que sin este botón alguien que no recuerde
            su contraseña actual queda encerrado, sin poder navegar ni cambiar de
            cuenta. */}
        <Button type="link" block onClick={logout} style={{ marginTop: 12 }}>
          Cerrar sesión
        </Button>
```

### Verificación

```bash
npm run type-check
```
Esperado: sin errores.

```bash
grep -c "Cerrar sesión" src/pages/Login/CambiarContrasenaPage.tsx
```
Esperado: `1`.

### PROHIBIDO

- ❌ No toques el schema Zod (la validación 8–72 ya está alineada con el contrato).
- ❌ No toques los chequeos `cargandoSesion` / `!empleado` de arriba: resuelven el parpadeo al recargar.
- ❌ No añadas confirmación ("¿seguro que quieres salir?") al botón de cerrar sesión: es una vía de escape, tiene que ser inmediata.

### Ledger
Marca `T2` + línea de Bitácora.

---

## T3 — Sincronizar el contrato de API

- **Archivo:** `docs/contrato_api.md`
- **Depende de:** —

### Contexto

El contrato local aún dice que `GET /empleados/me` **no** devuelve el campo (era cierto ayer, ya no) y no documenta el nuevo código de error.

### Paso 1 — Añadir el código a la tabla de §3

`old_string`:

```
| `PERMISO_INSUFICIENTE` | 403 | El rol no tiene acceso a esta operación |
```

`new_string`:

```
| `PERMISO_INSUFICIENTE` | 403 | El rol no tiene acceso a esta operación |
| `CAMBIO_CONTRASENA_REQUERIDO` | 403 | El empleado tiene `requiere_cambio_contrasena = true`. **Bloquea toda la API** salvo `/auth/cambiar-contrasena`, `/auth/logout` y `/empleados/me`. El frontend lo intercepta y redirige al formulario (ver `src/api/client.ts`) |
```

### Paso 2 — Corregir la nota de `/auth/login` en §6

`old_string`:

```
- `requiere_cambio_contrasena` vive en la **raíz** de `data`, nunca dentro de `empleado` — `EmpleadoDto` no tiene ese campo (confirmado con backend). `GET /empleados/me` (§7) tampoco lo devuelve: no hay forma de recuperar este dato tras un refresh de página. Si el flujo de cambio obligatorio debe sobrevivir a un reload, hace falta que el backend lo exponga en `GET /empleados/me` o lo aplique también del lado del servidor (bloqueando otros endpoints mientras siga en `true`).
```

`new_string`:

```
- `requiere_cambio_contrasena` vive en la **raíz** de `data`, nunca dentro de `empleado` — `EmpleadoDto` no tiene ese campo (confirmado con backend). `GET /empleados/me` (§7) **sí** lo devuelve por separado, así que el flujo sobrevive a una recarga de página.
- Mientras el flag esté en `true`, el backend responde `403 CAMBIO_CONTRASENA_REQUERIDO` a **todos** los demás endpoints (§3). No es solo UX del cliente: es bloqueo de servidor.
```

### Paso 3 — Corregir `GET /empleados/me` en §7

`old_string`:

```
⚠️ **No incluye `requiere_cambio_contrasena`** (confirmado con backend: `EmpleadoDto` no tiene ese campo). Ese dato solo existe en la raíz de la respuesta de `POST /auth/login` (§6) y se pierde en cualquier restauración de sesión posterior (`useRestaurarSesion` en el frontend llama a este endpoint al montar la app). Un usuario que recarga la página a mitad del flujo de cambio de contraseña obligatorio se lo salta en silencio — pendiente de decisión con backend.
```

`new_string`:

```
**Incluye `requiere_cambio_contrasena`** (añadido por backend el 2026-08-17). Es uno de los tres endpoints que siguen respondiendo mientras ese flag esté activo, junto con `/auth/cambiar-contrasena` y `/auth/logout` — todos los demás devuelven `403 CAMBIO_CONTRASENA_REQUERIDO` (§3).

El frontend lo lee en cada restauración de sesión (`useRestaurarSesion`), de modo que el guard vuelve a forzar la redirección tras una recarga de página.
```

### Verificación

```bash
grep -c "CAMBIO_CONTRASENA_REQUERIDO" docs/contrato_api.md
```
Esperado: `4` o más.

```bash
grep -c "No incluye .requiere_cambio_contrasena" docs/contrato_api.md
```
Esperado: `0` (el aviso viejo ya no debe existir).

### PROHIBIDO

- ❌ No uses `git apply`, `git checkout` ni `git stash`: el archivo tiene cambios sin commitear.
- ❌ No toques ninguna otra sección ni reformatees el markdown.
- ❌ No corrijas el rol `gerente` de §7 (inconsistencia conocida, ya reportada, fuera de alcance).

### Ledger
Marca `T3` + línea de Bitácora.

---

## T4 — Actualizar los comentarios que quedaron obsoletos

- **Archivos:** `src/types/empleado.ts` **y** `src/pages/Login/LoginPage.tsx`
- **Depende de:** —

### Contexto

Ambos comentarios se escribieron ayer, cuando `GET /empleados/me` todavía no devolvía el campo. Hoy dicen lo contrario de la verdad, y un comentario que miente es peor que ninguno.

### Paso 1 — `src/types/empleado.ts`

`old_string`:

```
 * forma que `GET /empleados`): tras un refresh de página, este dato se pierde
 * — ver la nota en `LoginPage.tsx`.
```

`new_string`:

```
 * forma que `GET /empleados`). Desde el 2026-08-17 `GET /empleados/me` SÍ lo
 * devuelve, así que el flujo sobrevive a una recarga de página.
 *
 * Sigue siendo opcional en `Empleado` porque el listado `GET /empleados` no lo
 * incluye y ambos comparten este tipo.
```

### Paso 2 — `src/pages/Login/LoginPage.tsx`

`old_string`:

```
      // no solo aquí. Ver el aviso sobre GET /empleados/me en LoginResponse.
```

`new_string`:

```
      // no solo aquí, y porque GET /empleados/me lo devuelve con esa misma forma
      // al restaurar la sesión: así ambos caminos dejan el store idéntico.
```

### Verificación

```bash
npm run type-check
```
Esperado: sin errores.

### PROHIBIDO

- ❌ No cambies `requiere_cambio_contrasena?: boolean` a obligatorio en `Empleado`: `GET /empleados` (listado) no lo incluye y comparte el tipo.
- ❌ No toques `LoginResponse.requiere_cambio_contrasena` (ahí sí es obligatorio y es correcto).
- ❌ No cambies ninguna línea de código, solo los comentarios indicados.

### Ledger
Marca `T4` + línea de Bitácora.

---

## T5 — Documentar el bloqueo en la especificación de seguridad

- **Archivo:** `docs/SECURITY-frontend.md`
- **Depende de:** —

### Paso único

`old_string`:

```
## 4. XSS (Cross-Site Scripting)
```

`new_string`:

```
## 3.1 Cambio de contraseña obligatorio — esta vez sí es seguridad

La regla general de §3 (los guards del cliente son UX, no seguridad) tiene aquí su contraejemplo útil: `requiere_cambio_contrasena` **sí** lo impone el backend. Mientras el flag esté activo, la API responde `403 CAMBIO_CONTRASENA_REQUERIDO` a todo salvo `/auth/cambiar-contrasena`, `/auth/logout` y `/empleados/me`.

El trabajo del frontend no es *impedir el acceso* —eso ya está garantizado— sino **traducir el bloqueo a algo entendible**:

- El interceptor de `api/client.ts` detecta ese `code` y redirige al formulario. Sin eso el usuario ve "no tienes permiso" por toda la app, que es un diagnóstico falso.
- Se distingue por `error.code`, nunca por el `403` a secas: un `PERMISO_INSUFICIENTE` normal debe seguir mostrando "Sin acceso".
- La pantalla de cambio lleva un botón de **cerrar sesión**. Es la única salida: no está dentro de `AppLayout` y el resto de la API está bloqueada, así que sin él un usuario que no recuerde su contraseña actual queda encerrado.

## 4. XSS (Cross-Site Scripting)
```

### Verificación

```bash
grep -c "CAMBIO_CONTRASENA_REQUERIDO" docs/SECURITY-frontend.md
```
Esperado: `1`.

### PROHIBIDO

- ❌ No borres ni edites ninguna sección existente: solo se inserta la nueva §3.1 justo antes de §4.
- ❌ No renumeres las secciones siguientes.

### Ledger
Marca `T5` + línea de Bitácora.

---

# PARTE 2 — VERIFICACIÓN FINAL (sesión principal)

```bash
npm run type-check
npm run build
grep -rn "CAMBIO_CONTRASENA_REQUERIDO" src/
grep -c "Cerrar sesión" src/pages/Login/CambiarContrasenaPage.tsx
```

| Comando | Esperado |
|---|---|
| `type-check` | sin errores |
| `build` | completa |
| grep del código en `src/` | 1 línea (el interceptor) |
| grep del botón | `1` |

## Pruebas manuales en navegador (requieren cuenta real — las hace el humano)

Estas son las que de verdad cierran el trabajo:

1. **Login con flag activo** → debe llevar directo al formulario, sin pasar por el dashboard.
2. **Recargar (F5) estando en el formulario** → debe seguir en el formulario, no colarse a `/`. *(Esto es lo que arregló el backend al añadir el campo a `/empleados/me`.)*
3. **Bloqueo a mitad de sesión:** con el usuario navegando, que un admin le active el flag. A los ≤45 s (polling de notificaciones) debe saltar solo al formulario, **sin** mostrar "no tienes permiso".
4. **Salida de emergencia:** en el formulario, pulsar "Cerrar sesión" → debe volver al login y dejar la sesión cerrada de verdad.
5. **Camino feliz:** cambiar la contraseña → debe entrar a `/` con la app funcionando y sin errores residuales en pantallas ya visitadas.
6. **No hay regresión en el 403 normal:** un usuario sin rol para `/reportes` debe seguir viendo "Sin acceso", **no** el formulario de contraseña.

---

# PARTE 3 — FUERA DE ALCANCE

- Mensaje diferenciado según si el bloqueo se descubrió al entrar o a mitad de sesión (mejora menor; el texto actual cubre ambos).
- Medidor de fortaleza de contraseña / reglas de complejidad: el backend solo exige 8–72.
- "Olvidé mi contraseña": explícitamente fuera del MVP (`CLAUDE.md`).
- ESLint, Vitest, migración a React Router 7 / Vite 8: son de la auditoría de código.
