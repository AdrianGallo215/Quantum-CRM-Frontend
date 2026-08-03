# Quantum CRM Frontend — CI/CD y DevOps

> Pipeline de integración y despliegue del frontend desde el inicio. Repo: `quantum-crm-frontend`. La automatización de calidad es parte del setup de la Fase 0.

---

## 1. Filosofía

- **Todo cambio pasa por el pipeline.** Ningún código llega a `main` sin pasar los gates.
- **El pipeline es el guardián de la calidad.** Si tests, lint, type-check, cobertura o auditoría fallan, el merge se bloquea.
- **Fail fast.** Los checks rápidos (lint, type-check) corren primero.
- **Reproducibilidad.** `npm ci` usa el lockfile exacto; el build es idéntico en local y CI.

---

## 2. Estrategia de ramas

```
main          → producción. Siempre deployable. Protegida.
develop       → integración.
feature/xxx   → features (desde develop).
fix/xxx       → bugfixes.
```

**Protección de ramas (GitHub):**
- `main` y `develop` no aceptan push directo. Solo merge vía PR.
- Un PR no se mergea si el CI falla.
- `main` requiere que el PR venga de `develop` o un `hotfix/`.

**Commits — Conventional Commits:**
```
feat(pipeline): agregar agrupación por etapa
fix(oportunidad): corregir cálculo de monto en vivo
chore(deps): actualizar Ant Design a 5.x
test(prospeccion): cubrir las dos zonas de la vista
```

---

## 3. Pipeline de CI (GitHub Actions)

Corre en cada push a un PR y en cada merge a `develop`/`main`.

```yaml
# .github/workflows/ci.yml (esquema)
name: Frontend CI
on:
  pull_request:
  push:
    branches: [develop, main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup Node 20
      - cache de npm

      - name: Install
        run: npm ci          # ci, no install — usa package-lock exacto

      # Fail fast: lo más rápido primero
      - name: Lint (ESLint)
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Tests
        run: npm run test

      - name: Coverage check
        run: npm run test:coverage

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Build
        run: npm run build
```

---

## 4. Gates de calidad

Un PR solo se mergea si **todos** pasan:

| Gate | Herramienta | Falla si... |
|---|---|---|
| Lint | ESLint | Hay errores de lint |
| Tipos | tsc (`--noEmit`) | Hay errores de TypeScript |
| Tests | Vitest | Cualquier test falla |
| Cobertura | Vitest coverage | Cobertura < umbral (85% hooks/utils, 70% global) |
| Vulnerabilidades | npm audit | Vulnerabilidad alta/crítica |
| Build | Vite | El build de producción falla |

---

## 5. Containerización

### 5.1 Desarrollo local

El frontend corre en local con `npm run dev` (Vite dev server en el puerto 5173), apuntando al backend local vía `VITE_API_BASE_URL`. No requiere Docker en local — Vite es suficiente.

### 5.2 Dockerfile (multi-stage, servido con nginx)

```dockerfile
# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Servir el build estático con nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 5.3 Configuración de nginx

`nginx.conf` debe:
- Servir el `index.html` para todas las rutas (SPA con client-side routing de React Router).
- Incluir las cabeceras de seguridad (ver `SECURITY-frontend.md` §9): CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- Habilitar compresión gzip para los assets.

```nginx
location / {
    try_files $uri $uri/ /index.html;   # SPA fallback
}
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://<backend-url>; ...";
```

---

## 6. Despliegue (Fase 1 — MVP)

### 6.1 Plataforma

**Render** o **Railway** (mismo proveedor que el backend para simplicidad operativa). Opciones:
- Servir el build estático como sitio estático (Render Static Site), o
- Desplegar el contenedor nginx con el Dockerfile.

Para un SPA, el sitio estático es más simple y barato. El contenedor nginx da más control sobre las cabeceras de seguridad.

### 6.2 Flujo de deploy

```
merge a main
     │
     ▼
CI pasa todos los gates
     │
     ▼
Render/Railway detecta el push a main
     │
     ▼
npm ci && npm run build
     │
     ▼
Publica el contenido de dist/ (o el contenedor nginx)
     │
     ▼
Disponible en el dominio del frontend (HTTPS automático)
```

### 6.3 Variables de entorno

Las variables `VITE_*` se embeben en el build, así que se configuran en el entorno de build de Render/Railway:

```
VITE_API_BASE_URL=https://<backend-url>/api/v1
```

**Importante:** como las `VITE_*` son públicas (van en el bundle), solo contienen configuración no sensible. Ningún secreto. Ver `SECURITY-frontend.md` §7.

---

## 7. Entornos

| Entorno | Propósito | API Base URL | Deploy |
|---|---|---|---|
| **local** | Desarrollo | `http://localhost:8080/api/v1` | Manual (`npm run dev`) |
| **production** | Usuarios reales | `https://<backend>/api/v1` | Automático al merge a `main` |

Dos entornos bastan para el MVP. Un `staging` puede agregarse después.

---

## 8. Observabilidad

### 8.1 Errores en el cliente
- Para el MVP, los errores se manejan con feedback al usuario (mensajes de error de la API) y `console.error` capturado por las herramientas del navegador.
- En una fase posterior, integrar **Sentry** (u otro tracker de errores de frontend) para capturar errores en producción con stack traces y contexto. Esto es especialmente valioso en un SPA donde los errores del cliente no llegan a ningún log del servidor.

### 8.2 Build size
- Monitorear el tamaño del bundle. Vite reporta el tamaño en cada build. Si crece desproporcionadamente, investigar (dependencias pesadas, imports innecesarios).

---

## 9. Estrategia de rollback

- **Deploy fallido (build no compila):** el CI lo detiene antes de publicar. No llega a producción.
- **Bug en producción tras deploy exitoso:** revertir el commit en `main`, lo que dispara un nuevo build con el código anterior.
- El frontend es stateless (no tiene base de datos ni migraciones), así que el rollback es simplemente volver a buildear una versión anterior. Más simple que el rollback del backend.

---

## 10. Coordinación con el backend

Como son repos separados, hay puntos de coordinación:

- **El contrato de API** (`docs/contrato_api.md`) es propiedad del backend. Cuando el backend lo actualiza, el equipo de frontend sincroniza su copia de referencia y ajusta los tipos TypeScript.
- **CORS:** el backend debe tener el dominio del frontend en `CORS_ALLOWED_ORIGINS`. Coordinar el dominio de producción del frontend con el equipo de backend antes del primer deploy.
- **Versionado de API:** la API está versionada (`/api/v1`). Un cambio incompatible en el backend debería ir a `/api/v2`, dando tiempo al frontend de migrar. Para el MVP, ambos avanzan juntos sobre `v1`.

---

## 11. Setup de la Fase 0 (checklist DevOps frontend)

- [ ] Repositorio en GitHub con protección de ramas en `main` y `develop`
- [ ] `.env.example` con `VITE_API_BASE_URL` documentado
- [ ] `.gitignore` que excluye `.env`, `dist/`, `node_modules/`
- [ ] Workflow de GitHub Actions con todos los gates
- [ ] ESLint y Prettier configurados
- [ ] Vitest configurado con umbrales de cobertura
- [ ] Dockerfile multi-stage con nginx (si se usa contenedor)
- [ ] `nginx.conf` con cabeceras de seguridad y SPA fallback
- [ ] Proyecto conectado a Render/Railway con deploy automático desde `main`
- [ ] `VITE_API_BASE_URL` de producción configurada en el entorno de build
- [ ] Dominio del frontend coordinado con el backend para CORS
- [ ] Primer deploy de prueba exitoso, verificando que el SPA carga y se conecta al backend

Completado esto, el frontend tiene un pipeline que protege la calidad desde el primer commit.
