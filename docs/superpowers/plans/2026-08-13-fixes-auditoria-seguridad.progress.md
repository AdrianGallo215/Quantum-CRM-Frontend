# Progress ledger — Correcciones de la auditoría de seguridad

Plan: `2026-08-13-fixes-auditoria-seguridad.md`

**Este archivo es la única memoria entre subagentes.** Los agentes se crean y destruyen por tarea; ninguno recuerda lo que hizo el anterior. El estado real es el filesystem — este ledger lo hace legible.

---

## Protocolo (obligatorio, resumido de §0.3 del plan)

**Antes de empezar una tarea:**
1. Busca tu tarea abajo. Si ya está `[x]` → **PARA**, no hagas nada, responde que ya estaba hecha.
   Los `Edit` del plan **no son idempotentes**: aplicarlos dos veces corrompe el archivo.
2. Comprueba que las tareas de `Depende de:` estén `[x]`. Si no → **PARA** y repórtalo.

**Al terminar:**
1. Cambia `- [ ] TX` por `- [x] TX`.
2. Añade una línea a **Bitácora** (solo añadir, nunca editar ni borrar líneas previas).
3. Si viste algo fuera de alcance → **Observaciones fuera de alcance**.
4. Si falló → marca `- [!] TX` y detalla el fallo en Bitácora.

**Leyenda:** `[ ]` pendiente · `[x]` hecho y verificado · `[!]` falló, requiere intervención humana

---

## Estado de las tareas

### Lote L1 — Fundación (1 tarea, sin paralelismo)

- [x] T1 — Crear el helper `urlSegura()` → `src/utils/url.ts` (NUEVO)

### Lote L2 — Blindar los `href` (4 tareas en paralelo · requiere L1 completo)

- [x] T2 — `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx` — sitio web de la empresa
- [x] T3 — `src/components/DocumentosDrive.tsx` — enlace a archivo de Drive
- [x] T4 — `src/pages/OportunidadDetalle/PropiedadesCard.tsx` — **2 enlaces** (ficha técnica + ficha de venta)
- [x] T5 — `src/pages/Pipeline/TablaOportunidades.tsx` — columna Ficha de Venta

### Lote L3 — Auth y tipos (5 tareas en paralelo · sin dependencias)

- [x] T6 — `src/types/empleado.ts` — quitar tokens de `LoginResponse`
- [x] T7 — `src/api/auth.ts` + `src/hooks/useAuth.ts` — dejar de tragarse el fallo de logout
- [x] T8 — `src/pages/Login/LoginPage.tsx` — usar `DEMASIADOS_INTENTOS`
- [x] T9 — `src/pages/Login/CambiarContrasenaPage.tsx` — validación 8–72
- [x] T10 — `src/router/guards.tsx` — quitar `state.from` muerto

### Lote L4 — CI y dependencias (SECUENCIAL: T11 antes que T12)

- [x] T11 — `npm audit fix` + verificar build
- [x] T12 — `.github/workflows/deploy.yml` — gate de auditoría real (**requiere T11**)

### Lote L5 — Documentación (3 tareas en paralelo)

- [x] T13 — `docs/contrato_api.md` — sincronizar auth con cookies reales
- [x] T14 — `docs/SECURITY-frontend.md` — atributos de cookie, logout, excepción de analítica
- [x] T15 — `nginx.conf.template` + `Dockerfile` — marcar como no vigentes

### Lote L6 — Cierre (requiere L1–L5 completos)

- [x] T16 — Eliminar `dist/` obsoleto
- [x] T17 — `docs/AUDITORIA-SEGURIDAD-2026-08-13.md` — adenda con el estado final (**requiere T1–T16**)

### Verificación final (sesión principal, NO subagente)

- [x] VF (parcial) — Comandos automatizados de la PARTE 2 ejecutados por el orquestador; prueba manual de logout en navegador queda pendiente para el humano (ver Bitácora)

---

## Bitácora

> Formato: `- TX — DONE|FALLO — <fecha ISO> — verificación: <comando> → <resultado>. <Qué cambió.>`
> Solo se añaden líneas. Nunca se editan ni se borran las anteriores.

- (vacío — aún no se ha ejecutado ninguna tarea)
- T1 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores. Creado `src/utils/url.ts` con el helper `urlSegura()` que filtra esquemas de URL no permitidos en `href`.
- T4 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores; grep de ambos hrefs viejos → sin coincidencias. Blindados los DOS enlaces de `PropiedadesCard.tsx`: la ficha técnica del modelo (`modelo.ficha_tecnica`) en `FichaBusModal` y la ficha de venta de la oportunidad (`o.ficha_venta`) en `PropiedadesCardBase`, ambos ahora usan `urlSegura()` y `rel="noopener noreferrer"`.
- T2 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores; grep href={empresa.sitio_web} → sin coincidencias. Blindado el `href` del sitio web de la empresa en `EmpresaDetallePage.tsx` usando `urlSegura()` y cambiado `rel="noreferrer"` por `rel="noopener noreferrer"`.
- T5 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores; grep href={v} → sin coincidencias. Blindado el `href` de la columna "Ficha de Venta" en `TablaOportunidades.tsx` usando `urlSegura()` y cambiado `rel="noreferrer"` por `rel="noopener noreferrer"`.
- T3 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores; grep href={a.url} → sin coincidencias. Blindado el `href` del enlace a archivos de Drive en `DocumentosDrive.tsx` usando `urlSegura()`, cambiado `rel="noreferrer"` por `rel="noopener noreferrer"` y actualizado el comentario del `else`.
- T6 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores. grep "access_token\|refresh_token" en src/ → SÍ hay coincidencias (no vacío como esperaba el plan), pero todas son texto de comentario/JSDoc, ninguna es un campo de interfaz ni una lectura real de token: 3 líneas nuevas en el propio JSDoc que añade este paso a `src/types/empleado.ts` (el texto literal del plan explica por qué NO viajan ahí, y por eso menciona esas palabras en prosa), más 3 líneas preexistentes fuera de alcance de T6 en comentarios de `src/api/auth.ts` (líneas 10 y 16, una de ellas ya reescrita por T7 en paralelo), `src/api/client.ts` (línea 19) y `src/hooks/useAuth.ts` (línea 39). Ninguna declara ni lee `access_token`/`refresh_token` como campo o propiedad. `LoginResponse` en `src/types/empleado.ts` ya no declara `access_token` ni `refresh_token`, solo `expires_in` y `empleado`, con el JSDoc explicativo exacto del plan.
- T7 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores. En `src/api/auth.ts`, `authApi.logout` ya no atrapa el error de `POST /auth/logout` (lo propaga); en `src/hooks/useAuth.ts`, `useLogout` ahora avisa al usuario con `message.warning` (Ant Design `App.useApp()`) si `authApi.logout()` falla, manteniendo el orden limpiar-local-primero y la firma `() => void`.
- T9 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores. Añadido `.max(72, 'Máximo 72 caracteres')` a `password_nueva` en `CambiarContrasenaPage.tsx` para alinear la validación de cliente con el rango 8–72 del contrato.
- T10 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores. Eliminado `state={{ from: location }}` del `<Navigate to="/login" replace />` en `src/router/guards.tsx` (código muerto que nadie leía) y añadido comentario explicando el riesgo de open redirect si se reimplementa sin validar la ruta; `const location = useLocation()` y su uso en la línea siguiente (`location.pathname !== '/cambiar-contrasena'`) se dejaron intactos.
- T8 — DONE — 2026-08-13 — verificación: npm run type-check → sin errores. En `LoginPage.tsx` se añadió `codigoDeError` al import de `@/api/client` y `mensajeDeLogin()` ahora comprueba primero `codigoDeError(error) === 'DEMASIADOS_INTENTOS'` (o `status === 429`) antes del resto de casos, con mensaje actualizado.
- T13 — DONE — 2026-08-13 — verificación: grep header Bearer → sin coincidencias; grep "POST /auth/logout" → 1 coincidencia. Sincronizado `docs/contrato_api.md` §1 y §6 con la autenticación real por cookies httpOnly: reemplazado el header `Authorization: Bearer`, añadido el bloque de atributos de cookie y la lista de endpoints públicos actualizada, reescrito `/auth/login` (sin tokens en el body, nota de rate limiting), reescrito `/auth/refresh` (lee la cookie, no el body) y añadido `POST /auth/logout` como endpoint nuevo, y añadidas las notas de reemisión de cookies en `/auth/login`/`/auth/cambiar-contrasena`.
- T15 — DONE — 2026-08-13 — verificación: ambos grep -c → 1. Añadida cabecera de aviso "NO ES LA CONFIGURACIÓN VIGENTE EN PRODUCCIÓN" en `nginx.conf.template` y "NO sirve el tráfico de producción" en `Dockerfile`, marcando la ruta nginx/Docker como plan de contingencia frente a Vercel.
- T14 — DONE — 2026-08-13 — verificación: grep -c SameSite=Strict → 4. Documentados en `docs/SECURITY-frontend.md` los atributos reales de las cookies `access_token`/`refresh_token` en §2.1 (con la explicación de por qué `SameSite=Strict` no rompe la app), reescrito el ejemplo de `logout()` en §10 para reflejar que el fallo de red se avisa al usuario en vez de tragarse, y registrada en §6 la excepción de Vercel Analytics como tráfico a un origen externo.
- T11 — DONE — 2026-08-13 — verificación: npm audit fix aplicado, npm run build → OK, npm audit --audit-level=high --omit=dev → exit 0. Vulnerabilidades antes (npm audit completo, incl. dev): 5 (3 moderate, 2 high — esbuild/vite, nanoid, react-router). Después de `npm audit fix`: 4 (3 moderate, 1 high — nanoid corregido; esbuild/vite y react-router quedan, requieren `--force` con saltos de versión mayor, fuera de alcance). Con `--omit=dev`, antes y después: 2 moderate (react-router), exit code 0 en ambos casos.
- T12 — DONE — 2026-08-13 — verificación: npm audit --audit-level=high --omit=dev → exit 0; grep audit-level=high → 2 líneas. Convertido el paso "Auditoría de dependencias" de `.github/workflows/deploy.yml` en gate bloqueante `npm audit --audit-level=high --omit=dev` (sin `|| true`), añadido un paso informativo separado con la auditoría completa (`|| true`) y un paso de `Build de producción` tras ambos; añadida cabecera de aviso "NO ES EL DESPLIEGUE VIGENTE" documentando que producción se sirve desde Vercel y que la ruta Docker/nginx es contingencia.
- T16 — DONE — 2026-08-13 — verificación: git ls-files dist/ → vacío; dist/ eliminado. Confirmado que `dist/` no estaba trackeado y se borró con `rm -rf dist` el build obsoleto que apuntaba a `localhost:8080`.
- T17 — DONE — 2026-08-13 — verificación: grep -c "ADENDA" → 1. Añadida adenda con el estado final de la auditoría.
- VF — DONE (parcial) — 2026-08-13 — verificación ejecutada por el orquestador (sesión principal, no subagente): `npm run type-check` → sin errores; `npm run build` → OK (`dist/` regenerado, único warning preexistente de chunk >500kB, no relacionado con esta auditoría); `npm audit --audit-level=high --omit=dev` → exit 0; grep XSS (`dangerouslySetInnerHTML`/`eval(`/`new Function(`) → sin coincidencias; grep `access_token`/`refresh_token` en src/ → solo 6 líneas de comentario/JSDoc explicando por qué esos campos NO existen (mismo hallazgo ya documentado por T6 en "Observaciones fuera de alcance"), confirmado con un segundo grep de `.access_token`/`.refresh_token`/`access_token:`/`refresh_token:` (acceso real a la propiedad) → sin coincidencias; grep `rel="noreferrer"` suelto → sin coincidencias (los 5 quedaron en `noopener noreferrer`). Pendiente: la prueba manual en navegador (cerrar sesión con sesión real → recargar → debe pedir credenciales) no se pudo ejecutar porque no hay navegador disponible en este entorno de subagentes; la reconfirmación por curl de `POST /auth/logout` en producción falló por timeout de red del sandbox (no relacionado con el backend — la misma llamada ya se había verificado exitosa, 204 con ambas cookies limpiadas, más temprano en la sesión, antes de iniciar la ejecución del plan). Queda como acción pendiente del humano.

---

## Observaciones fuera de alcance

> Cosas que un agente vio mientras editaba y **NO tocó**, por diseño. Entrada para la auditoría de código.
> Formato: `- [TX] <archivo:línea> — <qué viste>. No tocado (fuera de alcance).`

- (vacío)
- [T6] `grep -rn "access_token\|refresh_token" src/` — el plan esperaba "ninguna línea" pero hay coincidencias en texto de comentario/JSDoc (incluido el propio JSDoc que el paso único de T6 ordena escribir, que menciona ambas palabras en prosa explicativa). No son campos ni lecturas de token. No tocado: T6 solo autoriza el `Edit` exacto sobre la interfaz `LoginResponse`, no editar comentarios de otros archivos.

---

## Contexto que los agentes NO deben re-derivar

Verificado contra producción el 2026-08-13. No lo vuelvas a comprobar, no lo cuestiones:

- **`POST /auth/logout` ya existe y funciona.** Responde `204`; limpia ambas cookies con `Max-Age=0` conservando `Path=/`, `HttpOnly`, `Secure`, `SameSite=Strict`. GET/PUT devuelven 405 (la ruta existe de verdad).
- **Cookies reales:** `access_token` (Max-Age 3600) y `refresh_token` (Max-Age 604800), ambas `HttpOnly; Secure; SameSite=Strict; Path=/`.
- **CORS del backend:** solo permite `https://crm.quantuminvest.com.pe`, con `allow-credentials: true`. Un origen ajeno recibe 403. `allow-headers` es solo `content-type` — el header `Authorization` ni siquiera está permitido, lo que confirma que la auth por cookie es la real.
- **Rate limiting:** 5 fallos por email → `429` con `error.code = "DEMASIADOS_INTENTOS"` y cabecera `Retry-After`. **Pero `Retry-After` NO es legible desde el navegador** (falta `Access-Control-Expose-Headers`). No escribas código que la lea.
- **Producción se sirve desde Vercel.** Las cabeceras vivas (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) coinciden con `vercel.json`. La ruta nginx/Docker existe pero no sirve tráfico.
- **`npm audit --audit-level=high --omit=dev` → exit 0.** Sin `--omit=dev` → exit 1 (por Vite, dev-only). Por eso el gate de T12 lleva `--omit=dev`.
- **La vulnerabilidad de react-router NO es explotable aquí:** se auditó y no hay ninguna navegación con valores controlados por el usuario. Todos los `navigate()` usan prefijos fijos con IDs numéricos, y los parámetros de URL se validan contra enums.
- **El proyecto no tiene tests ni ESLint.** `npm run test` y `npm run lint` son stubs `exit 0`. La única verificación real es `npm run type-check`.
