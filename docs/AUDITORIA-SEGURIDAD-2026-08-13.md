# SECURITY AUDIT REPORT — Frontend — Auditoría integral post-MVP

**Fecha:** 2026-08-13
**Alcance:** todo el codebase (`src/`), configuración de build y despliegue, cabeceras en producción, dependencias.
**Método:** checklist de `.claude/skills/audit-security-frontend.md` (10 categorías) + verificación empírica contra producción (`https://crm.quantuminvest.com.pe` / `https://api.quantuminvest.com.pe`).
**Estado del sistema:** en producción con usuarios reales.

---

## SIN HALLAZGOS ✓

Estas categorías se auditaron y están correctamente implementadas. No requieren acción.

| # | Categoría | Evidencia |
|---|---|---|
| 1 | **Manejo del token JWT** | Cero referencias a `localStorage`/`sessionStorage`/`document.cookie` para token o sesión. `withCredentials: true` en `api/client.ts:8`. Ningún header `Authorization` construido a mano. **Verificado en producción:** el CORS del backend expone `access-control-allow-headers: content-type` — ni siquiera permite `Authorization`, lo que confirma que la autenticación por cookie está viva. |
| 2 | **Interceptor de autenticación** | `api/client.ts:35-57`. Guarda `_retry` contra bucles; `refreshPromise` compartido evita refresh en estampida; excluye `/auth/login` y `/auth/refresh` del reintento; redirige a `/login` si el refresh falla. Solo existe **una** instancia de Axios en el proyecto — el interceptor la cubre por completo. |
| 3 | **XSS** | Cero ocurrencias de `dangerouslySetInnerHTML`, `eval()`, `new Function()`, `innerHTML` o `setTimeout` con string. React escapa por defecto en todo el árbol. |
| 4 | **Secretos en el bundle** | Ningún secreto, API key ni credencial en `src/`. `.env` está en `.gitignore` y **no** trackeado (verificado con `git ls-files`). `.env.example` solo contiene placeholders. `sourcemap: false` en `vite.config.ts` — no se publica el código fuente. |
| 5 | **Almacenamiento en el cliente** | Solo dos usos de storage, ambos preferencias de UI no sensibles: colapso del sidebar (`AppLayout.tsx:26`) y columnas visibles (`TablaOportunidades.tsx:307`). `queryClient.clear()` se ejecuta en el logout (`useAuth.ts:41`). |
| 6 | **Guards y autorización** | El rol proviene siempre de `GET /empleados/me` vía `authStore` — nunca de un valor falsificable localmente. Las acciones sin permiso están **ausentes del DOM** (render condicional en `navItems.ts`, no ocultamiento por CSS: cero coincidencias de `display:none`/`visibility` por rol). Pantalla `SinAcceso` ante rol insuficiente. |
| 7 | **Cabeceras de seguridad** | **Verificado en vivo** sobre `https://crm.quantuminvest.com.pe`: `Content-Security-Policy` completa, `Strict-Transport-Security: max-age=63072000`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. El `connect-src` de la CSP coincide exactamente con la API real. |
| 8 | **CORS y fail-secure del backend** | Un origen ajeno recibe `403 Invalid CORS request`. Solo `https://crm.quantuminvest.com.pe` está permitido, con `allow-credentials: true`. Es **same-site** con `api.quantuminvest.com.pe` (mismo dominio registrable), así que la protección `SameSite` de la cookie sí aplica. `GET /empleados/me` sin sesión → `401` con cuerpo vacío, sin filtración. |
| 9 | **Open redirect** | Todas las llamadas a `navigate()` usan prefijos fijos con IDs numéricos. Los parámetros de URL en Cartera se validan contra enums y enteros positivos (`CarteraPage.tsx:55-72`), incluso **en lectura**, no solo al escribir. |
| 10 | **Validación de formularios** | Zod en todos los formularios, con manejo explícito del rechazo del backend en cada mutación. El login distingue 401/429/5xx sin revelar si falló el email o la contraseña. |

---

## HALLAZGOS

### 🔴 CRÍTICO

#### C-1 — El cierre de sesión no cierra la sesión: `POST /auth/logout` no existe

**Archivos:** `src/api/auth.ts:29-35`, `src/hooks/useAuth.ts:36-45`

`useLogout()` limpia el estado del cliente, vacía el cache de TanStack Query y navega a `/login`. Después llama a `authApi.logout()`, que **traga cualquier error en silencio** (`catch {}`).

**Verificado empíricamente contra producción:**

```
POST https://api.quantuminvest.com.pe/api/v1/auth/logout   → 404
POST https://api.quantuminvest.com.pe/api/v1/auth/no-existe-xyz → 404   (control)
```

Respuesta idéntica a la de un endpoint inexistente. Además, `docs/contrato_api.md` **no menciona logout en ninguna parte**, ni siquiera en la copia actualizada sin commitear.

**Impacto:** las cookies httpOnly sobreviven al "cerrar sesión". Basta con recargar la página para que `GET /empleados/me` responda con la cookie intacta y la sesión quede restaurada. Según el contrato (§6), el `access_token` dura 1 hora y el `refresh_token` 7 días — y el interceptor de refresh renovará automáticamente. En la práctica, **la sesión sigue viva hasta 7 días después de que el usuario creyó haberla cerrado.**

En un CRM empresarial usado en PCs compartidas del área comercial, esto es acceso no autorizado directo a la cartera, montos y datos de contacto de otro usuario.

El propio código ya anticipó este riesgo — el comentario en `auth.ts:19-27` lo describe con precisión y dice que se solicitó al backend. **Nunca se entregó, y el fallo está hoy en producción.**

**Corrección requerida:**
1. **Backend (bloqueante):** implementar `POST /auth/logout` — invalidar el refresh token y emitir `Set-Cookie` con `Max-Age=0` para ambas cookies. Documentarlo en `contrato_api.md §6`.
2. **Frontend (mitigación inmediata, desplegable ya):** dejar de tragar el error en silencio. Si el logout del servidor falla, el usuario debe enterarse de que su sesión sigue abierta — hoy se le dice lo contrario. Como mínimo, registrar el fallo con prefijo crítico y mostrar un aviso.

---

### 🟠 ALTO

#### A-1 — El contrato de API contradice el mecanismo de autenticación real

**Archivos:** `docs/contrato_api.md:40` y `:158-203`, `src/types/empleado.ts:18-23`

El contrato —propiedad del backend, y por tanto la fuente de verdad— documenta:

- §1: `Auth header: Authorization: Bearer {jwt_token}`
- §6: `POST /auth/login` devuelve `access_token` y `refresh_token` **en el cuerpo JSON**
- §6: `POST /auth/refresh` espera `{ "refresh_token": "eyJ..." }` en el body

El frontend implementa exactamente lo contrario: cookies httpOnly, sin header `Authorization`, body vacío en el refresh. La app funciona en producción, y el CORS del backend confirma la autenticación por cookie. **El contrato está desactualizado**, incluso en la revisión pendiente de commit (241 líneas añadidas) que no toca §1 ni §6.

**Impacto:** todo el modelo de seguridad de `SECURITY-frontend.md §2` descansa sobre atributos de cookie (`HttpOnly`, `Secure`, `SameSite`) que **no están documentados en ningún sitio ni han sido verificados**. Nadie puede afirmar hoy que la cookie sea realmente `HttpOnly`. Además, `LoginResponse` sigue declarando `access_token`/`refresh_token`: si el backend aún los devuelve en el cuerpo, el token es legible por JavaScript y se anula el beneficio de la cookie httpOnly.

**Corrección requerida:**
1. Solicitar al equipo de backend la actualización de `contrato_api.md §1` y `§6` con la especificación de cookies: nombres, `HttpOnly`, `Secure`, `SameSite`, `Max-Age`, `Path`, `Domain`.
2. Verificar en DevTools que las cookies llevan `HttpOnly` y `Secure` (ver revisión manual).
3. Si el backend ya no devuelve tokens en el cuerpo, eliminar `access_token`, `refresh_token` y `expires_in` de `LoginResponse` — un tipo que miente invita a que alguien los use.

#### A-2 — No hay ningún gate de calidad ni de seguridad en CI

**Archivos:** `.github/workflows/deploy.yml`, `package.json:8-9`

```yaml
run: npm audit --audit-level=high || true    # nunca falla
```
```json
"lint": "echo \"lint: pendiente de configurar (MVP)\" && exit 0",
"test": "echo \"tests: omitidos en MVP por decision de producto\" && exit 0"
```

`SECURITY-frontend.md §8` exige que el build falle ante vulnerabilidades altas o críticas, y `DEVOPS-frontend.md §4` define seis gates obligatorios. Hoy solo corre `type-check`: no hay lint, ni tests, ni cobertura, ni auditoría bloqueante, ni build en el job de verificación.

Estado actual de `npm audit`: **4 vulnerabilidades (1 alta, 3 moderadas)**.

| Paquete | Sev. | Advisory | ¿Afecta a producción? |
|---|---|---|---|
| `vite` | **alta** | `server.fs.deny` bypass en rutas alternas de Windows | No — solo dev server. **Pero el equipo desarrolla en Windows**, así que sí expone las máquinas de desarrollo. |
| `esbuild` | moderada | cualquier web puede leer respuestas del dev server | No — solo dev server. Mismo comentario. |
| `react-router-dom` | moderada | Open redirect → XSS (GHSA-jjmj-jmhj-qwj2) | Sí está en el bundle, pero **no explotable aquí**: se verificó que no hay ningún sink de navegación con valores controlados por el usuario. |

Ninguna es explotable contra la app en producción hoy. El hallazgo ALTO **no es la vulnerabilidad, es la ausencia del control**: sin gate, la próxima sí llegará a producción sin que nadie se entere.

**Corrección requerida:**
1. `npm audit fix` — resuelve `react-router-dom` sin romper nada.
2. Planificar la subida mayor de Vite (v5 → v8) fuera de la ruta crítica.
3. Quitar el `|| true` y restaurar `--audit-level=high` como gate real.
4. Configurar ESLint de verdad; los stubs `exit 0` dan una falsa sensación de cobertura y conviene eliminarlos o marcarlos explícitamente como pendientes.

---

### 🟡 MEDIO

#### M-1 — URLs de origen no confiable renderizadas en `href` sin validar el esquema

**Archivos:**
- `src/pages/EmpresaDetalle/EmpresaDetallePage.tsx:245` — `empresa.sitio_web`
- `src/components/DocumentosDrive.tsx:171` — `archivo.url`
- `src/pages/OportunidadDetalle/PropiedadesCard.tsx:271` — `modelo.ficha_tecnica`
- `src/pages/OportunidadDetalle/PropiedadesCard.tsx:370` — `o.ficha_venta`
- `src/pages/Pipeline/TablaOportunidades.tsx:235` — `ficha_venta`

Los cinco renderizan una URL que se origina en input de usuario, sin validar el esquema. React 18 **solo emite un warning** ante un `href="javascript:..."` — no lo bloquea. Un vendedor que guarde `javascript:fetch('/api/v1/...')` como sitio web de una empresa consigue ejecución de script en el origen del CRM para cualquiera que haga clic, incluido un admin o gerencia — es decir, escalada de privilegios vía XSS almacenado.

**Mitigado hoy** por la CSP: `script-src 'self'` bloquea la ejecución de URIs `javascript:`. El riesgo real es depender de un único control: cualquier relajación futura de la CSP reabre el agujero en silencio, en cinco sitios a la vez.

`rel="noreferrer"` sí está correctamente aplicado en los cinco.

**Corrección requerida:** un helper `urlSegura(url: string | null): string | undefined` en `src/utils/` que permita solo `http:`, `https:`, `mailto:` y `tel:`, y devuelva `undefined` en cualquier otro caso. Aplicarlo en los cinco puntos.

#### M-2 — El cotizador externo se abre por HTTP plano

**Archivo:** `src/components/CotizadorFab.tsx:18`

```ts
'http://quantum.okserver43.com/app/modulos/cotizacion/'
```

Navegación en texto plano desde un origen HTTPS con HSTS. Al ser navegación de primer nivel no la bloquea la regla de contenido mixto, pero las credenciales que el usuario introduzca en ese sistema viajan sin cifrar y son interceptables en la red corporativa. También acostumbra al usuario a aceptar el aviso de "sitio no seguro".

El código ya documenta la deuda (líneas 12-15). `window.open(..., 'noopener,noreferrer')` está correctamente aplicado.

**Corrección requerida:** TLS en el cotizador y cambiar la constante a `https://`. Mientras tanto, es una decisión de riesgo que conviene registrar explícitamente, no un detalle de implementación.

#### M-3 — Analítica de terceros recibe rutas con identificadores de negocio

**Archivo:** `src/App.tsx:46`

`<Analytics />` de Vercel envía `window.location.pathname` en cada navegación: `/empresas/123`, `/oportunidades/45`, `/contactos/7`. Se carga desde `/_vercel/insights/script.js` (mismo origen), por lo que la CSP lo permite y **funciona correctamente** — no hay fallo técnico.

El problema es de política: `SECURITY-frontend.md §6` establece que *"todo el tráfico va al backend de Quantum"*. Aquí, metadatos de negocio (qué empresas y oportunidades se consultan, con qué frecuencia y desde dónde) salen a un procesador externo. En un CRM empresarial eso es una decisión de tratamiento de datos que debe tomarse conscientemente.

**Corrección requerida:** decisión de producto — aceptarlo y documentarlo en `SECURITY-frontend.md`, o retirarlo. No es un bug; es una excepción a la política vigente que hoy no está registrada.

#### M-4 — Dos rutas de despliegue divergentes, una de ellas muerta

**Archivos:** `vercel.json`, `nginx.conf.template`, `Dockerfile`, `.github/workflows/deploy.yml`

Producción es **Vercel** (verificado: `x-vercel-cache: HIT`, y las cabeceras servidas coinciden exactamente con `vercel.json`). En paralelo, el repo mantiene una ruta completa de Docker + nginx, y el workflow construye y publica una imagen en `ghcr.io` **en cada push a main**.

Existen **dos definiciones independientes de la CSP** que hay que mantener sincronizadas a mano. La de nginx quedó con `${API_ORIGIN}` derivado por script y no se ha verificado nunca en producción. La deriva entre ambas es cuestión de tiempo, y afecta a la cabecera de la que hoy depende la mitigación de M-1.

**Corrección requerida:** decidir una sola ruta. Si nginx queda como plan de contingencia, marcarlo explícitamente como no vigente y dejar constancia de que `vercel.json` es la fuente de verdad de las cabeceras.

#### M-5 — Build obsoleto (`dist/`) en el árbol de trabajo

Contiene un bundle apuntando a `localhost:8080` y al script de analítica en modo debug. Está en `.gitignore` y **no** trackeado, así que no llegará al repo. Es un artefacto regenerable que conviene borrar para que nadie lo sirva por error.

---

### 🔵 BAJO / INFORMATIVO

- **B-1 — Mensajes de error del backend mostrados sin filtrar.** `api/client.ts:71-78`: `mensajeDeError` devuelve `apiError.message` tal cual. Hoy los códigos son de negocio y el resultado es legible, pero un 500 con detalle interno se mostraría al usuario final. Checklist §10.2.
- **B-2 — Política de contraseña mínima laxa.** `CambiarContrasenaPage.tsx:14`: solo `min(8)`. Es validación de UX y la autoritativa es del backend — conviene confirmar que el backend exige al menos lo mismo.
- **B-3 — Código muerto en el guard.** `router/guards.tsx:20` guarda `state={{ from: location }}`, pero nadie lo lee: tras el login siempre se va a `/`. Es la razón por la que no hay open redirect. Si se decide implementar el retorno a la ruta original, debe validarse que sea una ruta interna.

---

## BLOQUEANTES (CRÍTICO / ALTO) — corregir antes de continuar

1. **C-1** — Implementar `POST /auth/logout` en el backend. Mientras tanto, dejar de ocultar el fallo al usuario en el frontend. *Es el único hallazgo explotable hoy en producción.*
2. **A-1** — Sincronizar `contrato_api.md` con el mecanismo real de cookies y verificar los atributos `HttpOnly`/`Secure`/`SameSite`.
3. **A-2** — `npm audit fix` y restaurar el gate de auditoría en CI.

Los tres dependen en parte del equipo de backend (C-1 y A-1). El frontend puede avanzar hoy con: la mitigación de C-1, A-2 completo, M-1, M-5 y las de nivel BAJO.

---

## PARA REVISIÓN MANUAL DEL DESARROLLADOR

Con sesión iniciada en `https://crm.quantuminvest.com.pe`, en DevTools:

1. **Application → Cookies** — confirmar que las cookies de sesión tienen `HttpOnly ✓`, `Secure ✓` y `SameSite` en `Lax` o `Strict`. Anotar los nombres exactos y pasarlos al equipo de backend para documentarlos (A-1). **Si alguna no es `HttpOnly`, escala a CRÍTICO.**
2. **Network → login** — inspeccionar la respuesta de `POST /auth/login`: ¿el cuerpo sigue trayendo `access_token` y `refresh_token`? Si sí, pedir al backend que deje de emitirlos (A-1).
3. **Reproducir C-1** — cerrar sesión, y a continuación recargar la página. Si entra sin pedir credenciales, el hallazgo queda confirmado en el navegador. Probarlo también tras cerrar y reabrir la pestaña.
4. **Expiración** — dejar la pestaña inactiva más de 1 hora y luego actuar. Verificar en Network que hay **un solo** `POST /auth/refresh`, y que si falla se sale limpiamente a `/login` sin bucle.
5. **Consola** — navegar por Pipeline, Cartera y Detalle de Oportunidad revisando que no aparezcan violaciones de CSP (indicarían una divergencia entre la CSP y lo que la app necesita).
6. **Verificar M-1** — guardar `javascript:alert(1)` como sitio web de una empresa de prueba y hacer clic en el enlace. Lo esperado hoy es que la CSP lo bloquee y registre una violación en consola; eso confirma que la mitigación está activa y mide qué pasaría si se relajara.

---

# ADENDA — Estado tras la remediación (2026-08-13)

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
