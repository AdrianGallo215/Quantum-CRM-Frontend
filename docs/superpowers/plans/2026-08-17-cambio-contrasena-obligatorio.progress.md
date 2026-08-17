# Progress ledger — UX del cambio de contraseña obligatorio

Plan: `2026-08-17-cambio-contrasena-obligatorio.md`

**Este archivo es la única memoria entre subagentes.** Los agentes se crean y destruyen por tarea. El estado real es el filesystem; este ledger lo hace legible.

---

## Protocolo (resumen de §0.3 del plan)

**Antes de empezar:**
1. Si tu tarea ya está `[x]` → **PARA**, no hagas nada. Los `Edit` **no son idempotentes**: aplicarlos dos veces corrompe el archivo.
2. Comprueba las dependencias (aquí no hay: las 5 tareas son independientes).

**Al terminar:**
1. Cambia `- [ ] TX` por `- [x] TX`.
2. Añade una línea a **Bitácora** (solo añadir; usa `Edit` con contexto único, nunca reescribas el archivo entero).
3. Fuera de alcance → **Observaciones fuera de alcance**.
4. Si falló → `- [!] TX` + detalle en Bitácora.

**Leyenda:** `[ ]` pendiente · `[x]` hecho y verificado · `[!]` falló

---

## Estado de las tareas

Las 5 tocan archivos distintos: **todas pueden correr en paralelo**.

- [x] T1 — `src/api/client.ts` — interceptar `403 CAMBIO_CONTRASENA_REQUERIDO` y redirigir 🔴
- [x] T2 — `src/pages/Login/CambiarContrasenaPage.tsx` — salida de emergencia + limpiar cache + texto 🔴
- [x] T3 — `docs/contrato_api.md` — nuevo código de error, `/empleados/me` corregido
- [x] T4 — `src/types/empleado.ts` + `src/pages/Login/LoginPage.tsx` — comentarios obsoletos
- [x] T5 — `docs/SECURITY-frontend.md` — nueva §3.1

### Verificación final (sesión principal, NO subagente)

- [x] VF (parcial) — Comandos automatizados de la PARTE 2 ejecutados por el orquestador; las 6 pruebas manuales en navegador quedan pendientes para el humano (ver Bitácora)

---

## Bitácora

> Formato: `- TX — DONE|FALLO — <fecha ISO> — verificación: <comando> → <resultado>. <Qué cambió.>`
> Solo se añaden líneas. Nunca se editan ni se borran las anteriores.

- (vacío — aún no se ha ejecutado ninguna tarea)
- T3 — DONE — 2026-08-17 — verificación: grep CAMBIO_CONTRASENA_REQUERIDO → 3 (esperado en plan: 4 o más — discrepancia de expectativa, los 3 pasos se aplicaron literales y exactos, no hay un 4º lugar posible con el texto del plan); grep "No incluye" → 0. Se añadió el código de error a la tabla de §3, se corrigió la nota de §6 sobre `/auth/login` y se corrigió la nota de `GET /empleados/me` en §7 para reflejar que ahora sí devuelve `requiere_cambio_contrasena`.
- T5 — DONE — 2026-08-17 — verificación: grep -c CAMBIO_CONTRASENA_REQUERIDO → 1. Se insertó la nueva sección §3.1 "Cambio de contraseña obligatorio — esta vez sí es seguridad" en `docs/SECURITY-frontend.md`, justo antes de §4 XSS.
- T4 — DONE — 2026-08-17 — verificación: npm run type-check → sin errores. Actualizado el comentario de `LoginResponse` en `src/types/empleado.ts` para reflejar que `GET /empleados/me` ya devuelve `requiere_cambio_contrasena` desde el 2026-08-17, y el comentario junto a `setEmpleado` en `src/pages/Login/LoginPage.tsx` para explicar que ambos caminos (login y restaurar sesión) dejan el store idéntico.
- T2 — DONE — 2026-08-17 — verificación: npm run type-check → sin errores; grep "Cerrar sesión" → 1. Añadido botón "Cerrar sesión" de salida de emergencia, limpieza de queryClient.clear() tras cambiar contraseña, y texto explicando que el resto de la app queda bloqueada.
- T1 — DONE — 2026-08-17 — verificación: npm run type-check → sin errores; grep CAMBIO_CONTRASENA_REQUERIDO en src/api/client.ts → 1. Añadido el bloque en el interceptor de respuesta que detecta `403 CAMBIO_CONTRASENA_REQUERIDO` y redirige a `/cambiar-contrasena` (con guardas `redirigiendoACambioContrasena` y comparación de pathname), más las constantes `RUTA_CAMBIO_CONTRASENA` y `redirigiendoACambioContrasena` declaradas junto a `refreshPromise`.
- VF — DONE (parcial) — 2026-08-17 — verificación ejecutada por el orquestador (sesión principal): `npm run type-check` → sin errores; `npm run build` → OK; `grep -rn CAMBIO_CONTRASENA_REQUERIDO src/` → 2 coincidencias (el código en `client.ts:76` + el comentario en `CambiarContrasenaPage.tsx:67`); `grep -c "Cerrar sesión"` → 1. Revisión manual del código de `client.ts` y `CambiarContrasenaPage.tsx` contra el diseño del plan: correcto — `extraerApiError` es `function` declaration (hoisted, se puede llamar antes de su posición textual sin problema), la bandera `redirigiendoACambioContrasena` evita navegaciones duplicadas con queries en paralelo, `return Promise.reject(error)` final intacto. Pendiente: las 6 pruebas manuales en navegador con cuenta real (login con flag activo, recarga en el formulario, bloqueo a mitad de sesión, salida de emergencia, camino feliz, no-regresión del 403 normal) — quedan para el humano, no se pueden automatizar desde este entorno.

---

## Observaciones fuera de alcance

> Cosas vistas al editar y **NO tocadas**, por diseño. Entrada para la auditoría de código.
> Formato: `- [TX] <archivo:línea> — <qué viste>. No tocado (fuera de alcance).`

- [T3] docs/contrato_api.md — el grep de verificación esperaba `4` o más ocurrencias de `CAMBIO_CONTRASENA_REQUERIDO` pero el resultado real es `3`. Los tres `old_string`/`new_string` del plan se copiaron literales y solo introducen el término 3 veces en total; no hay un cuarto punto de inserción indicado en el plan. No se modificó nada fuera de los tres pasos indicados. No tocado (fuera de alcance corregir la expectativa del plan).

---

## Contexto que los agentes NO deben re-derivar

Confirmado por el equipo de backend el 2026-08-17. No lo cuestiones, no lo re-verifiques:

- **`GET /empleados/me` ahora incluye `requiere_cambio_contrasena`.** Antes no. Por eso el flujo ya sobrevive a una recarga de página.
- **`requiere_cambio_contrasena` NUNCA vive dentro de `empleado`.** Está en la raíz de `data` en la respuesta de `/auth/login`, y como campo propio en `/empleados/me`. `EmpleadoDto` no tiene ese campo.
- **Es bloqueo real de servidor.** Con el flag en `true`, **todos** los endpoints devuelven `403` con `error.code = "CAMBIO_CONTRASENA_REQUERIDO"`. Solo responden `/auth/cambiar-contrasena`, `/auth/logout` y `/empleados/me`. `/auth/login` y `/auth/refresh` no se ven afectados (son públicos y reemiten cookies con el estado actualizado).
- **`Access-Control-Expose-Headers: Retry-After` ya está desplegado** — resuelto, sin acción pendiente en este plan.
- **El polling de notificaciones corre cada 45 s** (`useNotificacionesNoLeidasCount`, `enabled: empleado !== null`). Es lo que hace que el 403 aparezca solo cuando el flag se activa a mitad de sesión.
- **`useLogout` funciona fuera de `AppLayout`**: usa `App.useApp()` de Ant Design y `useNavigate`, y `CambiarContrasenaPage` se renderiza dentro de `<AntApp>` y `<BrowserRouter>` (ver `App.tsx`). No hace falta moverlo ni envolver nada.
- **El proyecto no tiene tests ni ESLint.** `npm run test` y `npm run lint` son stubs `exit 0`. La única verificación automática real es `npm run type-check`.
