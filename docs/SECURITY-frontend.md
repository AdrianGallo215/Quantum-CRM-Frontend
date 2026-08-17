# Quantum CRM Frontend — Especificación de Seguridad

> El frontend es parte de una aplicación empresarial en producción. **El frontend nunca es la frontera de seguridad real** — esa es el backend. Pero el cliente tiene responsabilidades de seguridad propias que, si se descuidan, exponen a los usuarios.

---

## 1. Principios

1. **El frontend no es de confianza, y lo sabe.** Toda validación de UX se duplica (autoritativamente) en el backend. Ocultar un botón no es seguridad.
2. **No almacenar nada sensible accesible por JavaScript.** El token vive en una cookie httpOnly que el JS no puede leer.
3. **No confiar en datos del servidor para renderizado peligroso.** Aunque vengan del backend, se tratan como potencialmente inseguros al renderizar HTML.
4. **Fallar de forma segura.** Ante un 401/403, redirigir o bloquear, nunca exponer la vista protegida.

---

## 2. Manejo del token

### 2.1 Cookie httpOnly — el token nunca toca JavaScript

- El backend setea el JWT en dos cookies `httpOnly`. **El frontend nunca lee, guarda ni manipula el token.** No hay código que acceda a `document.cookie` para el token.

Atributos reales, confirmados por el equipo de backend y verificados en producción el 2026-08-13:

```
Set-Cookie: access_token=<jwt>;  HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Por qué `SameSite=Strict` no rompe la aplicación** (y por qué nadie debe "arreglarlo" a `Lax`): el frontend vive en `crm.quantuminvest.com.pe` y la API en `api.quantuminvest.com.pe`. Comparten dominio registrable, así que las peticiones XHR de la SPA son *same-site* y el navegador adjunta la cookie con normalidad. El problema clásico de `Strict` —llegar desde un enlace externo sin cookie— no aplica: lo primero que se carga es el HTML estático, que no necesita sesión; las llamadas a la API que vienen después ya salen de una página del propio sitio.

`SameSite=Strict` **es** la mitigación de CSRF. No hay token CSRF y no hace falta implementarlo en el cliente.
- **Prohibido `localStorage` y `sessionStorage` para el token o cualquier dato de sesión sensible.** Son accesibles por JavaScript y vulnerables a XSS. Esta es una regla dura.
- El cliente Axios se configura con `withCredentials: true` para que el navegador envíe la cookie automáticamente en cada request. El frontend no agrega el token manualmente a los headers.

```typescript
// /src/api/client.ts
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,   // envía la cookie httpOnly automáticamente
})
```

### 2.2 Manejo de expiración

- Interceptor de respuesta: ante un `401`, intentar una vez `POST /auth/refresh`. Si tiene éxito, reintentar el request original. Si falla, limpiar el estado del cliente y redirigir a `/login`.
- Nunca entrar en bucle de refresh. Un solo intento por request.

```typescript
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        await client.post('/auth/refresh')
        return client(error.config)
      } catch {
        // refresh falló → sesión terminada
        redirectToLogin()
      }
    }
    return Promise.reject(error)
  },
)
```

---

## 3. Autorización en el cliente — UX, no seguridad

- Los guards de router y el ocultamiento de botones según rol son **mejoras de experiencia**, no controles de seguridad. Evitan que un usuario vea opciones que no le corresponden, pero **no protegen datos** — eso lo hace el backend.
- El frontend nunca asume que ocultar una acción impide ejecutarla. Si un usuario manipula el cliente, el backend rechaza la operación con 403/404.
- Las decisiones de qué mostrar se basan en el rol que viene del backend (`GET /empleados/me`), nunca en algo que el cliente pueda falsificar localmente.

```typescript
// Guard de router: UX, no seguridad
function RutaAdmin({ children }: { children: ReactNode }) {
  const { rol } = useUsuarioActual()
  if (rol !== 'admin') return <Navigate to="/sin-acceso" replace />
  return <>{children}</>
}
```

---

## 4. XSS (Cross-Site Scripting)

- React escapa por defecto el contenido renderizado, mitigando XSS reflejado y almacenado.
- **Prohibido `dangerouslySetInnerHTML`** con datos del usuario o del servidor. Si en algún caso excepcional se necesita renderizar HTML, sanitizar con una librería como DOMPurify y documentar el porqué.
- No construir HTML manualmente con datos dinámicos. No usar `eval`, `Function()`, ni inyectar scripts dinámicamente.
- Los datos que vienen del backend se tratan como potencialmente inseguros al renderizarse en contextos peligrosos (HTML, URLs, atributos).

---

## 5. Validación de inputs

- Validación con Zod en todos los formularios. **Es validación de UX** — da feedback inmediato al usuario. La validación autoritativa es del backend.
- El frontend nunca asume que su validación es suficiente. Siempre maneja el caso de que el backend rechace un input que el cliente consideró válido (mostrar el error de la API).
- Validar y mostrar los errores que devuelve el backend (`error.code`, `error.message`) de forma legible.

---

## 6. Comunicación segura

- **HTTPS obligatorio en producción.** El frontend solo se comunica con el backend sobre HTTPS. `VITE_API_BASE_URL` apunta a un endpoint HTTPS en producción.
- No hacer requests a orígenes no confiables. Todo el tráfico va al backend de Quantum, **con una excepción registrada**: Vercel Analytics (`<Analytics />` en `App.tsx`) envía la ruta visitada a Vercel. Se carga desde `/_vercel/insights/script.js` (mismo origen), por lo que la CSP lo permite.

  Implicación a tener presente: las rutas del CRM incluyen identificadores de negocio (`/empresas/123`, `/oportunidades/45`), así que qué empresas y oportunidades se consultan sale hacia un procesador externo. Es una decisión de tratamiento de datos, no un fallo técnico. Si deja de aceptarse, se retira el componente de `App.tsx`.
- No incluir datos sensibles en URLs (query params), que quedan en logs e historial del navegador. Los datos sensibles van en el body de POST/PATCH.

---

## 7. Gestión de secretos en el cliente

- **El frontend no tiene secretos.** Todo lo que se compila en el bundle es público — cualquiera puede inspeccionarlo. Nunca poner claves de API privadas, secretos JWT ni credenciales en el código del frontend.
- Las variables `VITE_*` se embeben en el build y son públicas. Solo usar para configuración no sensible (la URL del backend).
- Nunca commitear `.env` (solo `.env.example`).

---

## 8. Dependencias

- Escanear con **npm audit** en el CI (`npm audit --audit-level=high`).
- El build falla ante vulnerabilidades altas/críticas.
- Mantener dependencias actualizadas. Evaluar reputación y mantenimiento antes de agregar una dependencia.
- Minimizar dependencias: cada paquete es superficie de ataque potencial.

---

## 9. Cabeceras de seguridad (servidas con el frontend)

El frontend se sirve con nginx (ver `DEVOPS-frontend.md`). Configurar nginx para incluir:

```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://<backend>; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

`X-Frame-Options: DENY` previene que la app se embeba en un iframe (clickjacking). El CSP restringe de dónde se cargan recursos y a qué orígenes se puede conectar.

---

## 10. Datos en el cliente

- No persistir datos sensibles del negocio (RUC, datos de contacto, montos) en `localStorage` ni en ningún storage del navegador. Los datos viven en memoria (cache de TanStack Query) y se pierden al cerrar la pestaña, que es lo correcto.
- Al cerrar sesión, limpiar el cache de TanStack Query (`queryClient.clear()`) para que no queden datos del usuario anterior en memoria.

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

---

## 11. Checklist de seguridad del frontend

| Área | Control |
|---|---|
| Token | En cookie httpOnly, nunca en localStorage/sessionStorage, nunca leído por JS |
| Requests | `withCredentials: true`, HTTPS en producción |
| Expiración | Interceptor con un solo intento de refresh, luego logout |
| Autorización | Guards de router como UX; la seguridad real es del backend |
| XSS | Sin `dangerouslySetInnerHTML` con datos no confiables; React escapa por defecto |
| Validación | Zod para UX; siempre manejar el rechazo del backend |
| Secretos | Ninguno en el bundle; solo config pública en `VITE_*` |
| Dependencias | npm audit en CI, falla ante alto/crítico |
| Cabeceras | CSP, X-Frame-Options, etc. servidas por nginx |
| Datos en cliente | Nada sensible en storage; limpiar cache al cerrar sesión |

---

## 12. Requisitos por fase

| Fase | Seguridad a implementar |
|---|---|
| Fase 0 | Cliente Axios con `withCredentials`, interceptor de 401/refresh, guards de router, sin storage de token, limpieza de cache al logout |
| Todas | Sin `dangerouslySetInnerHTML` inseguro, validación Zod + manejo de errores del backend, sin secretos en código |
| CI desde Fase 0 | npm audit |
| Deploy | Cabeceras de seguridad en nginx, HTTPS |

El frontend hace su parte, pero recuerda siempre: **la seguridad real vive en el backend.** El cliente protege al usuario de XSS y robo de token, y mejora la UX con guards, pero nunca es la última línea de defensa de los datos.
