# SKILL: audit-code-frontend

## Propósito
Auditoría de código limpio, buenas prácticas y arquitectura para el frontend React + TypeScript de Quantum CRM. Ejecutar al cierre de cada hito indicado en el plan maestro.

## Cómo ejecutar
Recorrer cada ítem del checklist sobre el código del hito auditado. Por cada ítem que falla, reportar: archivo, línea (si aplica), descripción del problema, y corrección requerida. Al terminar, emitir el reporte y la lista de correcciones pendientes.

## Cómo reportar
```
## AUDIT REPORT — Código Frontend — [nombre del hito]

### PASA ✓
- [lista de categorías que pasan completamente]

### FALLA ✗
- [Archivo:Línea] Descripción del problema → Corrección requerida

### CORRECCIONES PENDIENTES ANTES DE CONTINUAR
1. ...

### PARA REVISIÓN MANUAL DEL DESARROLLADOR
- [qué revisar en código, qué flujos probar en el navegador, qué verificar en la UI]
```

---

## Checklist

### 1. TypeScript estricto
- [ ] No existe ningún uso de `any` — todo tiene tipo explícito o usa `unknown` con narrowing
- [ ] No hay `// @ts-ignore` ni `// @ts-expect-error` sin un comentario que justifique el porqué
- [ ] Los tipos de los objetos que vienen de la API reflejan exactamente los DTOs de `contrato_api.md`
- [ ] Los enums del backend se representan como union types de strings (`type EstadoOp = 'evaluacion_calidda' | 'documentos_legales' | ...`)
- [ ] No hay `as TipoCualquiera` (type casting forzado) sin justificación
- [ ] `npm run type-check` pasa sin errores

### 2. Separación de estado: servidor vs. cliente
- [ ] Todo dato que viene de la API vive en TanStack Query — nunca copiado a Zustand ni a `useState`
- [ ] Zustand y `useState` contienen solo client state: modales abiertos, tabs seleccionados, pasos de wizard, filtros locales
- [ ] No hay `useEffect` que copie datos de una query a un estado local
- [ ] No hay `useState` inicializado con datos de una query (patrón: `const [data, setData] = useState(queryData)`)

### 3. Sincronización 360 — invalidación de cache
- [ ] Tras cada `useMutation` exitoso, se invalidan **todas** las queries afectadas por ese cambio
- [ ] La invalidación incluye queries de vistas relacionadas (ej: editar empresa invalida `['empresa', id]`, `['empresas']`, `['inicio']`, `['prospeccion']`)
- [ ] No hay mutación que invalide solo su propia query cuando el cambio afecta a otras vistas
- [ ] Las `queryKey` son arrays jerárquicos consistentes: `['empresa', id]`, nunca strings planos

### 4. Cliente HTTP centralizado
- [ ] No hay `fetch`, `axios.get()`, `axios.post()` directamente en componentes ni hooks — toda llamada pasa por `/src/api/`
- [ ] El cliente Axios (`/src/api/client.ts`) es el único punto donde se configura `baseURL`, `withCredentials` e interceptores
- [ ] Los archivos de `/src/api/` no contienen lógica de negocio ni de UI — solo llamadas HTTP y tipado de respuesta

### 5. Componentes
- [ ] Solo componentes funcionales con hooks — no hay componentes de clase
- [ ] No hay lógica de negocio en componentes de UI — extraída a hooks custom o utils
- [ ] Los componentes no hacen llamadas HTTP directas — usan hooks de `/src/hooks/`
- [ ] Las props tienen tipos explícitos — no hay `props: any` ni `{}: any`
- [ ] No hay componentes que superen ~150 líneas sin ser candidatos a extracción

### 6. Formularios
- [ ] Todos los formularios usan React Hook Form + Zod
- [ ] El schema Zod es la única fuente de validación del lado del cliente — no hay validación manual en los handlers
- [ ] Los errores de validación del backend (campo `error` del envelope de la API) se muestran al usuario de forma legible
- [ ] No hay formulario que permita enviar si `isSubmitting` es true (previene doble submit)

### 7. Manejo de estados de carga y error
- [ ] Toda query tiene manejo de `isLoading`/`isPending` (skeleton o spinner visible)
- [ ] Toda query tiene manejo de `error` (mensaje visible al usuario, no pantalla en blanco)
- [ ] Las mutaciones muestran feedback de éxito y de error al usuario
- [ ] Los mensajes de error de la API se muestran por nombre de campo cuando la API los provee

### 8. Router y navegación
- [ ] Cada ruta protegida tiene su guard de rol correspondiente
- [ ] No hay rutas accesibles sin autenticación salvo `/login` y `/cambiar-contrasena`
- [ ] La navegación usa `<Link>` y `useNavigate` — nunca `window.location.href` salvo casos justificados
- [ ] El guard ante 401 redirige a login, no a una pantalla de error

### 9. Calidad general
- [ ] No hay código comentado — si se necesita conservar algo, git
- [ ] No hay `console.log` en código de producción
- [ ] No hay imports sin usar
- [ ] Las funciones y componentes tienen nombres descriptivos en camelCase/PascalCase
- [ ] No hay `var` — solo `const` y `let` donde se reasigna
- [ ] `npm run lint` pasa sin errores

### 10. Tests (TDD compliance)
- [ ] Todo comportamiento nuevo del hito tiene tests escritos
- [ ] Los tests usan MSW para mockear la red — nunca se mockea el cliente Axios directamente
- [ ] Se testea lo que el usuario ve e interactúa — no el estado interno de componentes
- [ ] Los nombres de test describen el comportamiento: `'no permite enviar sin modelo seleccionado'`
- [ ] La estructura de cada test es Arrange-Act-Assert (renderizar, interactuar, verificar)
- [ ] `npm run test` pasa al 100%
- [ ] `npm run test:coverage` pasa los umbrales (≥ 85% hooks/utils, ≥ 70% global)

### 11. Diseño y DESIGN.md
- [ ] Los colores, tipografía y espaciado corresponden a los tokens de `DESIGN.md` — no hay valores hardcodeados que difieran del sistema de diseño
- [ ] No hay estilos inline que sobrescriban el tema de Ant Design sin justificación
- [ ] Los prototipos de Stitch se usaron como referencia de estructura, no se copiaron literalmente
