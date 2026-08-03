# SKILL: audit-security-frontend

## Propósito
Auditoría de seguridad del cliente React + TypeScript de Quantum CRM. Ejecutar al cierre de cada hito indicado en el plan maestro. El frontend no es la frontera de seguridad real (esa es el backend), pero tiene responsabilidades propias que si se descuidan exponen a los usuarios.

## Cómo ejecutar
Recorrer cada ítem del checklist sobre el código del hito auditado. Por cada ítem que falla, reportar: archivo, línea (si aplica), descripción de la vulnerabilidad, nivel de severidad (CRÍTICO / ALTO / MEDIO) y corrección requerida. Los ítems CRÍTICO y ALTO bloquean continuar.

## Cómo reportar
```
## SECURITY AUDIT REPORT — Frontend — [nombre del hito]

### SIN HALLAZGOS ✓
- [categorías sin vulnerabilidades]

### HALLAZGOS
- [CRÍTICO/ALTO/MEDIO] [Archivo:Línea] Descripción → Corrección requerida

### BLOQUEANTES (CRÍTICO / ALTO) — corregir antes de continuar
1. ...

### PARA REVISIÓN MANUAL DEL DESARROLLADOR
- [qué revisar en el navegador, herramientas de dev, comportamiento a probar]
```

---

## Checklist

### 1. Manejo del token JWT
- [ ] No hay ninguna referencia a `localStorage.setItem` ni `sessionStorage.setItem` relacionada con el token, la sesión o datos de autenticación — `CRÍTICO` si existe
- [ ] No hay código que lea el JWT de ninguna fuente accesible por JavaScript (`document.cookie` directo, localStorage, sessionStorage) — el token vive en la cookie httpOnly que el navegador gestiona
- [ ] El cliente Axios está configurado con `withCredentials: true` — sin esto la cookie no se envía
- [ ] No hay header `Authorization: Bearer ...` construido manualmente en ningún request — el token lo envía el navegador automáticamente via cookie

### 2. Interceptor de autenticación
- [ ] El interceptor de respuesta captura el `401` y hace como máximo **un intento** de refresh antes de redirigir a login — sin bucles
- [ ] La propiedad `_retry` (o equivalente) previene que el interceptor reintente indefinidamente
- [ ] Ante un refresh fallido, se redirige a `/login` y se limpia el estado del cliente
- [ ] El interceptor cubre todos los clientes Axios que existan en el proyecto — no solo el principal

### 3. XSS (Cross-Site Scripting)
- [ ] No hay ningún uso de `dangerouslySetInnerHTML` con datos del usuario o del servidor — `CRÍTICO` si existe sin sanitización
- [ ] No hay construcción de HTML dinámico con template strings y datos no sanitizados
- [ ] No hay uso de `eval()`, `new Function()`, ni `setTimeout/setInterval` con string como primer argumento
- [ ] No se inyectan scripts dinámicamente desde datos del servidor

### 4. Gestión de secretos en el bundle
- [ ] No hay API keys privadas, secretos JWT, credenciales de DB ni tokens en ningún archivo del frontend — `CRÍTICO` si existe
- [ ] Las variables `VITE_*` contienen solo configuración pública (URL del backend) — nunca secretos
- [ ] El `.gitignore` excluye `.env` y archivos de configuración local con valores reales
- [ ] El `.env.example` contiene solo placeholders

### 5. Almacenamiento en el cliente
- [ ] No hay datos sensibles del negocio (RUC, montos, datos de contacto) en `localStorage` ni `sessionStorage`
- [ ] Al cerrar sesión (`logout`), se llama `queryClient.clear()` para eliminar datos en memoria del usuario anterior
- [ ] No hay datos de sesión en cookies que no sean las gestionadas por el backend (`httpOnly`)

### 6. Guards y autorización del cliente
- [ ] Los guards de router verifican el rol contra el perfil obtenido del backend (`GET /empleados/me`) — nunca contra un valor que el usuario pueda falsificar localmente (localStorage, URL param)
- [ ] Ante un `403` del backend, el frontend muestra una pantalla de "sin acceso" amigable — nunca expone la vista protegida
- [ ] Los botones/acciones deshabilitados por rol también están ausentes del DOM cuando el usuario no tiene permiso (no solo visually hidden con CSS)

### 7. Comunicación con el backend
- [ ] `VITE_API_BASE_URL` apunta a HTTPS en el entorno de producción — verificar que el `.env.example` no sugiera HTTP para producción
- [ ] No se hacen requests a dominios de terceros no autorizados desde el código del frontend
- [ ] No se incluyen datos sensibles en query params de URLs — los datos sensibles van en el body

### 8. Dependencias
- [ ] `npm audit --audit-level=high` no reporta vulnerabilidades ALTAS ni CRÍTICAS sin mitigar
- [ ] No hay dependencias con cero mantenimiento o con historial de vulnerabilidades graves sin parches

### 9. Configuración de nginx (si aplica en el hito)
- [ ] `nginx.conf` incluye: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Content-Security-Policy` está configurada con al menos `default-src 'self'` y el dominio del backend en `connect-src`
- [ ] El servidor nginx no expone su versión (`server_tokens off`)
- [ ] El fallback de SPA (`try_files $uri $uri/ /index.html`) está configurado correctamente

### 10. Validación de formularios
- [ ] Ningún formulario confía en que la validación del cliente es suficiente — siempre hay manejo del error del backend
- [ ] Los mensajes de error del backend llegan al usuario de forma legible (no se muestran mensajes técnicos internos al usuario final)
- [ ] Los campos de formulario no exponen información que no deberían (ej: un campo hidden con un ID sensible que el usuario no debería poder manipular)
