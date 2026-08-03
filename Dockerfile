# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Etapa 1 — build
#
# OJO con las variables VITE_*: Vite las INCRUSTA en el bundle durante el build,
# no las lee al arrancar el contenedor. Por eso llegan como --build-arg y no
# como variables de entorno del runtime: definirlas con `docker run -e` no tiene
# ningún efecto sobre una imagen ya construida.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Copiar solo los manifiestos antes que el código: mientras no cambien las
# dependencias, Docker reutiliza la capa de `npm ci` y el build es mucho más rápido.
COPY package.json package-lock.json ./

# `npm ci` (no `install`) para respetar el lockfile exacto y que el build sea reproducible.
RUN npm ci

COPY . .

# Configuración por entorno. VITE_API_BASE_URL es obligatoria en producción:
# el fallback '/api/v1' del cliente solo sirve si la API va detrás del mismo dominio.
ARG VITE_API_BASE_URL
ARG VITE_COTIZADOR_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_COTIZADOR_URL=$VITE_COTIZADOR_URL

# Falla temprano y con un mensaje claro en vez de publicar un bundle que apunta
# a ninguna parte y solo se descubre roto en el navegador.
RUN test -n "$VITE_API_BASE_URL" || \
    (echo "ERROR: falta --build-arg VITE_API_BASE_URL (ej. https://api.ejemplo.com/api/v1)" && exit 1)

# `npm run build` ya corre `tsc --noEmit` antes de vite build: un error de tipos
# detiene la imagen en lugar de llegar a producción.
RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Etapa 2 — runtime
#
# Solo nginx y los estáticos: ni node, ni node_modules, ni código fuente. La
# imagen final pesa unas decenas de MB y reduce la superficie de ataque.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Se arrastra el mismo valor del build para que la CSP y el cliente no puedan
# divergir: si el bundle llama a un host que connect-src no permite, el navegador
# bloquea todas las peticiones.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Recorta la URL a esquema+host (ver el propio script para el porqué). Se sourcea
# antes del paso de envsubst por el orden alfabético: 10-… corre antes que 20-….
COPY docker/10-derive-api-origin.envsh /docker-entrypoint.d/10-derive-api-origin.envsh
RUN chmod +x /docker-entrypoint.d/10-derive-api-origin.envsh

# Plantilla de nginx: la imagen oficial procesa con envsubst todo lo que haya en
# /etc/nginx/templates/*.template al arrancar, y escribe el resultado en conf.d.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

# El entrypoint solo sustituye las variables listadas aquí; sin este filtro,
# envsubst reventaría cada $uri, $host y $politica_cache de la configuración.
ENV NGINX_ENVSUBST_FILTER="API_ORIGIN"

# nginx:alpine ya trae un usuario `nginx` sin privilegios y su entrypoint hace
# el drop de root tras preparar la configuración.
EXPOSE 80

# Comprobación de salud contra /healthz, que no depende de que exista index.html.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
