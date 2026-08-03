# CLAUDE.md — Quantum CRM Frontend

Contexto de arranque para Claude Code. Léelo al inicio de cada sesión. Para detalle profundo, ve a los documentos en `docs/`.

---

## Qué es esto

SPA en React + TypeScript para el CRM de Quantum Investment, representante exclusivo de buses **KinWin** en Perú. Consume la API REST del backend (repo separado `quantum-crm-backend`). **El frontend no tiene lógica de negocio** — presenta datos, captura inputs, valida por UX y mantiene su cache sincronizado con el servidor.

---

## Stack

React 18 + Vite · TypeScript (strict) · Ant Design v5 · TanStack Query v5 · Zustand · React Hook Form + Zod · React Router v6 · Axios · Node 20.

---

## Comandos

```bash
npm run dev            # dev server (puerto 5173)
npm run test           # Vitest
npm run test:coverage  # cobertura
npm run lint           # ESLint
npm run type-check     # tsc --noEmit
npm run build          # build de producción
```

Antes de cada commit: `npm run test` debe pasar.

---

## Estructura

```
src/
├── api/         # clientes por dominio (client.ts + empresas.ts, oportunidades.ts...)
├── components/  # reutilizables
├── pages/       # una carpeta por pantalla (Login, Inicio, Pipeline, Prospeccion, Cartera, OportunidadDetalle, EmpresaDetalle, Reportes, Admin)
├── store/       # Zustand (solo client state)
├── hooks/       # custom hooks (incluye los de TanStack Query)
├── types/       # tipos TS (espejo de los DTOs del backend)
├── utils/       # helpers puros
└── router/      # rutas y guards por rol
docs/            # referencia (ver abajo)
```

---

## Documentos de referencia (en docs/)

| Archivo | Cuándo leerlo |
|---|---|
| `PRD-frontend.md` | Visión, pantallas, criterios de aceptación, fases |
| `contrato_api.md` | Endpoints que consumes. **Copia de referencia — dueño es el backend** |
| `DESIGN.md` | Sistema de diseño normativo. La estética se sigue con precisión |
| `stitch-prototypes/` | Prototipos HTML. Referencia de layout, NO definitivos (ver abajo) |
| `TESTING-frontend.md` | **Cómo escribir tests. TDD obligatorio** |
| `SECURITY-frontend.md` | Seguridad del cliente |
| `DEVOPS-frontend.md` | CI/CD, deploy, nginx |

---

## Reglas que NUNCA debes romper

1. **TDD siempre.** Escribe el test que falla ANTES del componente/hook. Ver `TESTING-frontend.md`.
2. **TypeScript strict. NUNCA `any`.** Usa `unknown` + narrowing si el tipo es incierto.
3. **Separación de estado:** server state → SIEMPRE TanStack Query. Client state (modales, tabs, filtros) → Zustand/useState. **Nunca copiar datos del servidor a Zustand.**
4. **Sincronización 360:** tras cada mutación, invalidar TODAS las queries afectadas. Tras editar un dato, ninguna otra vista puede mostrar el valor viejo.
5. **Toda llamada HTTP pasa por `/src/api/`.** Nunca `fetch`/`axios` directo en componentes.
6. **El token vive en cookie httpOnly.** NUNCA `localStorage`/`sessionStorage` para el token. El JS nunca lo lee. Axios con `withCredentials: true`.
7. **Validación con Zod = UX, no seguridad.** La validación real es del backend. Siempre maneja el rechazo del backend.
8. **Guards de router = UX, no seguridad.** Ocultar un botón no protege nada — eso lo hace el backend.
9. **Nunca `dangerouslySetInnerHTML`** con datos del usuario o servidor.
10. **`monto_total` es read-only**, se muestra calculado. El paso a `facturado` solo habilitado para admin/gerente/analista (según rol del usuario).
11. **Sin lógica de negocio en componentes.** Extraer a hooks o utils.
12. **Nunca secretos en el código.** El bundle es público. Solo config no sensible en `VITE_*`.

---

## DESIGN.md y prototipos de Stitch — cómo tratarlos

- **`DESIGN.md`** es normativo. La estética (paleta, tipografía, espaciado) se sigue con precisión, implementada con el tema de Ant Design v5.
- **`stitch-prototypes/`** NO son definitivos:
  - ❌ No copiarlos literalmente (no usan Ant Design ni respetan todos los tokens).
  - ❌ No ignorarlos ni recrear desde cero (tienen decisiones de layout/UX pensadas).
  - ✅ Usarlos como referencia de estructura e intención, reconstruyendo con Ant Design + `DESIGN.md`.
- En resumen: el prototipo dice *qué va y dónde*; `DESIGN.md` + Ant Design dicen *cómo se ve y con qué*.

---

## Pantallas (resumen)

Login · Inicio (panel del día) · Pipeline (agrupado por etapa) · Prospección (dos zonas: requieren acción / en proceso) · Cartera (tabs por estado_cartera) · Detalle de Oportunidad · Detalle de Empresa · Reportes (admin/gerente/jdv) · Admin (solo admin).

Detalle y criterios de aceptación de cada una en `PRD-frontend.md §9`.

---

## Plan de fases (resumen)

0. Base: proyecto, Axios + interceptores, router + guards, Login, layout
1. Admin y catálogos
2. Empresas y contactos (Cartera, Detalle de Empresa)
3. **Pipeline y oportunidades** (cálculo de monto en vivo, modal de sugerencia, aviso de retroceso)
4. Eventos y tareas
5. Prospección e Inicio
6. Reportes

Alineado con la disponibilidad de endpoints del backend. Detalle en `PRD-frontend.md §12`.

---

## Fuera del MVP — no implementar

Vistas de comisiones/financiero · gestión de buses entregados · import de Excel · visualización de pronta facturación (el backend no la expone) · "olvidé mi contraseña" · dark mode · notificaciones push.

**Si parece necesario algo no listado en el PRD, pausa y pregunta. No inventes.**

---

## Coordinación con el backend (repo separado)

- `contrato_api.md` es propiedad del backend. Si necesitas un cambio en la API, **solicítalo al equipo de backend** — no asumas un comportamiento distinto ni modifiques el contrato unilateralmente.
- Mantén los tipos TS (`/src/types`) sincronizados con los DTOs del contrato.
- La API está versionada en `/api/v1`. `VITE_API_BASE_URL` apunta a ella.
