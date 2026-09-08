# Plan 03 — Auditoría final de los cimientos de Simulaciones (T6.1)

**Fecha:** 2026-09-07
**Rama auditada:** `feature/cimientos-simulaciones` (5 commits, `43f7642` … `bd166cc`)
**Diff:** `git diff main...HEAD` — 27 archivos, +1779 / −38
**Auditor:** Opus 5 · **Exigida por:** §1.3 del encargo, T6.1 del plan de tareas
**Método:** releer el diff completo contra cada documento de
`plan-02-mapa-cimientos-simulaciones.md` §1.2, buscando contradicciones con reglas que
**ya estaban escritas correctamente** antes de empezar.

---

## 0. Veredicto

**4 hallazgos** (`C1`–`C4`), **ninguno bloqueante**: ninguno produce un dato falso en
pantalla hoy. Tres son de robustez/consistencia y uno es un error del propio documento de
mapa, no del código.

Las cuatro trampas que el encargo marcaba como las peligrosas —la inversión de roles
(K16/K17), la sincronización 360 (D18), la colisión de `cuota_total` (D13) y el `null` que
no es cero (D12)— están **correctamente resueltas y testeadas**. La tabla de 18 celdas es
el punto único de decisión y no hay ni una condicional de rol de Simulaciones fuera de él.

`type-check`, `test` (157/157) y `build` en verde. `lint` en su estado preexistente
conocido, verificado línea a línea (§4).

---

## 1. Hallazgos

### C1 — El indicador de tipo de cambio no es "permanente": desaparece por debajo de `lg`

- **Archivo:** `src/components/IndicadorTipoCambio.tsx:24`
  (`className="hidden lg:flex …"`)
- **Contradice:** `reglas_simulaciones.md` §12 (*"Se muestra de forma **permanente** y
  discreta en una esquina del layout del CRM"*), encargo §5.7, y el **Paso 4 de T4.1**
  (*"En mobile (`TopBarMobile.tsx`), evaluar si cabe. Si no, no forzarlo […] Si se decide
  omitirlo en mobile, **dejarlo comentado y reportarlo**"*).
- **Qué pasa:** el indicador vive dentro del `<header className="hidden md:flex …">` de
  `AppLayout.tsx:124`, que ya se muestra desde el breakpoint `md`. El `hidden lg:flex`
  propio del componente lo apaga además en toda la franja **`md`–`lg`**, es decir en
  tablets y ventanas de escritorio estrechas donde la topbar sí está visible y hay sitio.
  La decisión de omitirlo no está comentada en el archivo (el JSDoc no la menciona), no
  está testeada (`IndicadorTipoCambio.test.tsx` corre en jsdom, donde las clases de
  Tailwind no ocultan nada, así que los tres casos pasan igual) y no se reportó como
  pedía el Paso 4. Además la query se dispara igual en móvil: se paga la petición y no se
  muestra el dato.
- **Severidad:** baja (cosmética + proceso). No muestra ningún dato falso.
- **Corrección propuesta:** o bien bajar el umbral a `hidden md:flex` para que acompañe a
  la topbar que lo contiene, o bien dejar `hidden lg:flex` **con un comentario explícito**
  en el componente que diga por qué se omite entre `md` y `lg` y que quede constancia de
  la decisión, tal como exige el Paso 4 de T4.1.

---

### C2 — `invalidarTrasEscritura` invalida la oportunidad dos veces, y un test documenta una garantía que no existe

- **Archivos:**
  - `src/hooks/useSimulaciones.ts:78-88` (`invalidarTrasEscritura`)
  - `src/hooks/useSimulaciones.test.ts:235-264` (test *"no invalida ningún detalle de
    oportunidad cuando la simulación no está enlazada"*)
- **Contradice:** el invariante documentado en el propio `src/hooks/queryKeys.ts:7-12`
  (*"la key de un detalle SIEMPRE empieza por la key de su lista […] Solo así
  `invalidar(qc, qk.empresas)` alcanza también a las fichas abiertas"*), citado como
  gobernante en `plan-02` §1.2.
- **Qué pasa:** `qk.oportunidades = ['oportunidades']` es **prefijo** de
  `qk.oportunidad(id) = ['oportunidades','detalle',id]`, y `invalidar()` usa
  `invalidateQueries({ queryKey })`, que es *match por prefijo*. Por tanto:
  1. La línea `if (idOportunidad !== null) invalidar(qc, qk.oportunidad(idOportunidad))`
     **no añade nada**: la invalidación de la línea anterior ya alcanzó ese detalle y
     todos los demás.
  2. El test de la línea 235 afirma
     `expect(invalidadas.some(k => k[0]==='oportunidades' && k[1]==='detalle')).toBe(false)`
     y lo describe como *"no invalida ningún detalle de oportunidad"*. Eso es cierto sobre
     la **lista de llamadas espiadas**, pero **falso sobre el efecto real**: al invalidar
     `['oportunidades']` se invalidan todos los detalles abiertos. Un lector futuro puede
     apoyarse en esa garantía inexistente (por ejemplo, para no invalidar la lista y
     ahorrar tráfico) y romper la sincronización 360 sin que el test se ponga rojo.
- **Nota importante:** el efecto neto de D18 es **correcto y hasta más generoso** de lo
  que promete. Esto no deja ningún monto viejo en pantalla; es sobre-invalidación segura.
  El problema es de exactitud del código y de la documentación viva (el test).
- **Severidad:** baja. Sin impacto de usuario.
- **Corrección propuesta:** dejar la línea redundante (es defensiva y barata) pero
  **reescribir su comentario** para decir que es explícita a propósito aunque el prefijo ya
  la cubra, y **reformular el test** de la línea 235 para que afirme lo que de verdad
  garantiza: que no se construye una key con `null` (`['oportunidades','detalle',null]`),
  no que "no se invalida ningún detalle".

---

### C3 — `IndicadorTipoCambio` asume el tipo de `compra`/`venta` en un componente del layout global

- **Archivo:** `src/components/IndicadorTipoCambio.tsx:31,35`
  (`data.compra.toFixed(3)` / `data.venta.toFixed(3)`)
- **Contradice (indirectamente):** `contrato_api.md` §1 (*"Montos: NUMERIC como **string**
  en JSON para evitar pérdida de precisión"*) frente a §22, donde `compra`/`venta` son
  **`number`** — la única excepción del contrato a esa convención, y así lo dice el propio
  `src/types/tipoCambio.ts`. El tipado está bien. El problema es la consecuencia si la
  excepción se normaliza algún día.
- **Qué pasa:** si el backend alineara §22 con la convención general y empezara a mandar
  `"3.750"`, `.toFixed()` lanza `TypeError`. Este componente se monta en `AppLayout`, en
  **todas** las páginas y para **todos** los roles autenticados (K21), y el único
  `ErrorBoundary` de la app está en la raíz (`src/App.tsx:39`): la excepción dejaría el
  CRM entero en la pantalla de error, incluidos `jdv` y `otro`, que no tienen nada que ver
  con Simulaciones. D16 cubre el caso `null` con cuidado, pero no la deriva de tipo.
- **Severidad:** baja (hipotética), radio de daño alto.
- **Corrección propuesta:** formatear defensivamente —`const n = Number(data.compra); if
  (!Number.isFinite(n)) return null`— o envolver el indicador en su propio boundary. Es la
  misma lógica de "no romper el layout por un dato accesorio" que ya aplica D16 al `null`.

---

### C4 — D12 del mapa ubica `formatoCuota` en un archivo distinto al que T2.2 mandó (y al que se usó)

- **Archivos:** `docs/planes/plan-02-mapa-cimientos-simulaciones.md`, D12 (*"`utils/formato.ts`
  gana `formatoCuota(valor: string | null): string`"*) frente a
  `src/utils/simulaciones.ts:28` y a T2.2 del plan de tareas, que lo pide explícitamente
  en `src/utils/simulaciones.ts`.
- **Qué pasa:** el código está en `utils/simulaciones.ts`, no en `utils/formato.ts`. Es
  una **contradicción interna del plan**, no un error del ejecutor: T2.2 es la tarea
  operativa y es la que se siguió, y la ubicación elegida es además la correcta por
  coherencia con D14/D15, que insisten en no unificar estos formateadores con los
  genéricos "por DRY".
- **Severidad:** nula funcionalmente; documental.
- **Corrección propuesta:** corregir el texto de D12 en el mapa para que diga
  `utils/simulaciones.ts`. **No mover el código.**

---

## 2. Observaciones (no son hallazgos: nada que contradiga un documento hoy)

- **O1 — Dos "calculadoras" con listas de rol opuestas, para el Plan 04.**
  `ROLES_COTIZADOR = ['admin','vendedor','jdv','gerencia']` (`authStore.ts:66`) gobierna
  el FAB de cotizadores **externos**, y ahora convivirá con
  `ROLES_CALCULADORA = ['admin','gerencia','analista','vendedor']`
  (`simulacionPermisos.ts:31`), que gobernará la Calculadora Financiera interna (§24).
  `jdv` entra en la primera y está prohibido en la segunda; `analista`, al revés. Ambas
  son correctas según sus fuentes (el cotizador externo no aparece en
  `matriz_permisos.md` ni en `reglas_simulaciones.md`), pero cuando el Plan 04 monte la
  Calculadora habrá dos accesos parecidos con reparto contrario. Conviene que las
  etiquetas de UI los distingan sin ambigüedad.
- **O2 — La notificación de `simulacion` sigue siendo un `<button>` clicable.**
  `NotificacionesDropdown.tsx:100-113` renderiza toda fila como botón; para
  `entidad_tipo: 'simulacion'` el click marca leída, cierra el dropdown y **no navega**
  (`rutaDeNotificacion` devuelve `null`). Cumple D20 ("sin enlace") y es preexistente a
  este plan (viene de `c27bdac`, main), pero al usuario le parecerá que el click no hizo
  nada. Es exactamente lo que el Plan 04 debe cerrar al crear `/simulaciones/:id`.
- **O3 — Código todavía sin consumidor.** `simulacionPermisos.*`, `DEFAULTS_SIMULACION`,
  `formatoTea`, `formatoTasa`, `validarCuotaInicial`, `validarValorResidual`,
  `useCalculadora`, `useSimulacionesListado` y toda `src/api/simulaciones.ts` solo se usan
  desde sus tests. Es lo previsto por el criterio §0 del mapa (el Plan 04 solo escribe UI),
  no un defecto.
- **O4 — `formatoTea`/`formatoTasa` devuelven `'—'` ante un valor no numérico.** No
  incumple D12: esa prohibición es sobre los **campos de cuota**, y una TEA o una TNM no se
  leen como un monto. Además el guion es la convención ya vigente en `PropiedadesCard`
  para "sin valor". Se deja constancia porque el grep de control nº 3 apunta justo ahí.
- **O5 — El indicador solo muestra la fecha en un `title`.** §22 y `reglas_simulaciones.md`
  §12 avisan de que, si SUNAT no responde, el endpoint **sigue devolviendo el último valor
  guardado**: el número en pantalla puede ser de días atrás. Hoy la fecha solo se ve al
  pasar el ratón. No lo exige ningún documento, pero mostrarla sería más honesto.
- **O6 — Los tests de D18 espían `invalidateQueries`.** `TESTING-frontend.md` §9.3 pide
  testear comportamiento, no implementación. Es una desviación **deliberada y prescrita**
  por T3.1 Paso 3, y replica el patrón ya aceptado en `PropiedadesCard.test.tsx` de la
  auditoría anterior. No se cuenta como hallazgo.

---

## 3. Inventario de lo verificado (evidencia de que "sin más hallazgos" es una conclusión, no una omisión)

### 3.1 Documentos releídos completos

`plan-03-cimientos-simulaciones-tareas.md` (T1.1 → T6.1) ·
`plan-02-mapa-cimientos-simulaciones.md` (K16–K26, D11–D21, incluida la nota de
Verificación de T3.1) · `contrato_api.md` §1, §10 (campos de cuota y notas de §6.2),
§16, §17, §18, §22, §23, §24, §26, §28 · `reglas_simulaciones.md` §3.1, §6.1, §6.2, §6.3,
§7, §10, §12, §13 · `matriz_permisos.md` §2.15 completo · `CLAUDE.md` (12 reglas) ·
`TESTING-frontend.md` §4.4 y §9 · `plan-01-multimodelo-auditoria.md` (patrones K8, B1, B3).

### 3.2 Punto único de permisos — la tabla de 18 celdas (T1.2)

- `ROLES_MODULO_SIMULACIONES = ['admin','gerencia','analista']` y
  `ROLES_CALCULADORA = [… ,'vendedor']` viven **dentro** de
  `src/utils/simulacionPermisos.ts`, no en `authStore.ts` (D11 ✓).
- `authStore.ts` **no fue tocado** por la rama (verificado en el diff) ✓.
- Las 18 celdas (6 roles × 3 capacidades) están cubiertas en
  `simulacionPermisos.test.ts`: módulo 3+3, calculadora 4+2, simulador 3+vendedor
  asignado+vendedor ajeno+jdv+otro, más los tres casos de `null` y las dos regresiones de
  K16/K17. Coinciden **literalmente** con `matriz_permisos.md` §2.15 y con
  `reglas_simulaciones.md` §10 ✓.
- `puedeSimularEnOportunidad` es por recurso para `vendedor`
  (`oportunidad.id_vendedor === empleado.id`) ✓.
- **Cero condicionales de rol de Simulaciones fuera de ese archivo** (grep 1 vacío) ✓.
  `IndicadorTipoCambio` no importa nada de permisos, como manda K21 ✓.

### 3.3 Sincronización 360 (D18) — las seis mutaciones, una por una

| Mutación | `id` usado | `id_oportunidad` de dónde sale | ¿Correcto? |
|---|---|---|---|
| `useCrearSimulacion` | `data.id` (respuesta 201) | `data.id_oportunidad` | ✓ |
| `useActualizarSimulacion` | `id` del hook | `data.id_oportunidad` — **de la respuesta**, porque el PATCH puede enlazar a un ítem que el llamante no conocía (§23) | ✓ |
| `useEliminarSimulacion` | `variables.id` | lo aporta el llamante: el 204 no trae body | ✓ |
| `useRestaurarSimulacion` | `id` del hook | `data.id_oportunidad` | ✓ |
| `useBifurcarSimulacion` | `data.id` (la fila **nueva**) | `data.id_oportunidad` | ✓ — el origen queda cubierto por prefijo `qk.simulaciones`, necesario porque la bifurcada hereda el ítem y le **quita** `es_principal` al origen (§23) |
| `useMarcarPrincipal` | `data.id` | `data.id_oportunidad` | ✓ — las **demás** simulaciones del ítem, que pierden `es_principal` sin aparecer en la respuesta, quedan cubiertas por el prefijo |

- Las cuatro keys del módulo + `qk.oportunidades` se invalidan en las seis (test tabla-driven
  `useSimulaciones.test.ts:216-233`) ✓.
- La nota de Verificación de D18 (Inicio/Prospección/Reportes) **se comprobó de nuevo**:
  `grep -n "cuota" docs/contrato_api.md` no devuelve ni una línea entre §16 (1816) y §18
  (2105). Los cinco campos de cuota son exclusivos de `GET /oportunidades` y
  `GET /oportunidades/:id`. **La nota es correcta y no es un B1 repetido** ✓.
- `GET /empresas/:id` (§8) tampoco expone cuotas: no invalidar `qk.empresas` es correcto ✓.
- No hay ni un `setQueryData` en todo `src/`: ninguna respuesta de ítem (que siempre trae
  `cuota_quantum`/`cuota_total` en `null`, §10) se escribe en cache ✓.
- Invariante de prefijos de las 4 keys nuevas, verificado en `queryKeys.test.ts` ✓ (y ver
  C2 sobre su consecuencia).
- `useCalculadora` es `useMutation` y **no invalida nada**, con test que lo afirma
  (`invalidadas` vacío) — D17 ✓.
- `useTipoCambio`: `staleTime` 1 h, `refetchOnWindowFocus: false`, sin reintento agresivo
  (el `retry` global de `App.tsx:21-25` ya corta los 4xx y limita a 1 los 5xx) — D16 ✓.

### 3.4 Colisión de `cuota_total` (D13) — ningún componente la confunde

- `src/types/oportunidad.ts:44-76`: los dos campos llevan JSDoc que se advierten
  mutuamente ✓.
- **Raíz** (`CuotaOportunidad.tsx`): "Cuota mensual total", "Cuota Quantum total",
  "Cuota diaria" ✓. **Ítem** (`PropiedadesCard.tsx:494-516`): "CUOTA QUANTUM POR UNIDAD",
  "CUOTA MENSUAL POR UNIDAD" ✓.
- El test de `PropiedadesCard` los ve **juntos en la misma pantalla** y afirma
  `2,172.06` en el ítem, `17,376.48` en la raíz, y que **ninguno contiene el número del
  otro** ✓. Es el único sitio donde ambos coexisten, y está cubierto.
- `CalculadoraResultado` **no** declara `cuota_total`, como manda §24 ✓.

### 3.5 `null` no es cero ni guion (D12)

- `formatoCuota(null) → 'Sin calcular'`; tests que prohíben `'0'`, `'—'` y `'-'` ✓.
- `CuotaOportunidad` comprueba los tres campos **juntos** (§10: son `null`
  conjuntamente) y muestra "Todavía no se puede calcular" con tooltip explicativo ✓.
- Sin toast, sin `role="alert"`, sin `.ant-message`/`.ant-notification`, sin clase de
  error: verificado por test en `CuotaOportunidad.test.tsx` **y** en
  `PropiedadesCard.test.tsx` ✓. `grep "message.error\|notification.error"` no aparece en
  ninguno de los dos archivos ✓.
- Cronograma: `FilaCronograma` tipa `interes`/`igv`/`cuota`/`cuota_con_igv` como
  `string | null` con el JSDoc del mes 0 y del leasing sin IGV ✓ (el render es del Plan 04).

### 3.6 T4.2 — verificado que NO se ejecutó y que la nota que lo justifica es cierta

No di por buena la nota del plan; la comprobé:

- `git diff main...HEAD --stat -- src/types/notificacion.ts src/components/NotificacionesDropdown.tsx`
  → **vacío**: esta rama no tocó ninguno de los dos archivos ✓.
- `git log --oneline main -1 -- <esos archivos>` → `c27bdac fix(T7.1): corregir B1, B2,
  B3, B4 de la auditoría final antes del deploy` — ya en `main` ✓.
- `src/types/notificacion.ts:24` tiene `'simulacion_por_expirar'` y la línea 27
  `'simulacion'`, con los nombres **exactos** de `contrato_api.md` §26 ✓.
- `rutaDeNotificacion()` (`NotificacionesDropdown.tsx:32-44`) es un `switch` exhaustivo
  **sin `default`** que devuelve `null` para `'simulacion'` — el diseño que D20 pedía ✓.
  No existe ningún otro mapa indexado por `tipo` (iconos, etiquetas) que pudiera repetir el
  patrón K8 ✓.
- Hay test vivo: *"marca leída una notificación de simulación sin navegar a una ruta
  inexistente"* ✓.

**Conclusión: la nota del plan de tareas es correcta. T4.2 estaba efectivamente resuelta.**

### 3.7 Fidelidad de los tipos al contrato (T1.1)

Campo por campo contra los ejemplos de §22/§23/§24: `Simulacion` (21 campos), `Cronograma`
(6 + `filas`), `FilaCronograma` (8), `EventoHistorial` (5), `CambioDiff` (3),
`CalculadoraInput`/`CalculadoraResultado`, `TipoCambio`. Sin campos inventados y sin
campos omitidos. Los montos son `string` (convención §1), `plazo_meses`/`dias_trabajados`
son `number`, y `TipoCambio.compra`/`venta` son `number` — la excepción documentada de §22
(K19) ✓. `ActualizarSimulacionInput` omite `modo` (inmutable, 409) y
`BifurcarSimulacionInput` sí lo acepta (§23) ✓. `SimulacionesFiltros.sort` lista los
cuatro valores del contrato ✓. `TipoEventoSimulacion` incluye solo los **tres con
snapshot**, no los seis del enum de BD — correcto, porque es el tipo del **historial**,
no el de la bitácora ✓.

### 3.8 Capa API (T2.1)

Los 11 endpoints, con verbo y ruta correctos; `marcarPrincipal` con body vacío;
`eliminar` sin body de vuelta; `restaurar` con `{ id_evento_log }`; `listar` devolviendo
el envelope completo con `meta` y el resto `res.data` pelado — mismo patrón exacto que
`oportunidadesApi` (incluido el `filtros as Record<string, unknown>`, que es la forma ya
vigente en `src/api/oportunidades.ts:18`, no una invención) ✓. **Cero lógica de negocio**
en la capa ✓. Ninguna llamada HTTP fuera de `src/api/` (CLAUDE.md regla 5) ✓.

### 3.9 Reglas de `CLAUDE.md`

| Regla | Estado |
|---|---|
| 2 — nunca `any` | ✓ grep 4 vacío; `unknown` en los tests |
| 3 — server state solo en TanStack Query | ✓ cero Zustand nuevo; cronograma e historial son queries propias (K26) |
| 4 — sincronización 360 | ✓ §3.3 de este informe |
| 5 — HTTP solo en `/src/api/` | ✓ grep 5 sin ningún hit real |
| 6 — token en cookie httpOnly | ✓ nada tocado; se reusa `apiClient` |
| 7 — Zod/validación = UX | ✓ `validar*` con JSDoc que lo dice y remite al 400 del backend |
| 8 — guards = UX | ✓ declarado en la cabecera de `simulacionPermisos.ts` |
| 9 — `dangerouslySetInnerHTML` | ✓ ninguno |
| 11 — sin lógica de negocio en componentes | ✓ formateo y permisos en `utils/`, el motor es del backend |
| 12 — sin secretos | ✓ ninguna `VITE_*` nueva |

### 3.10 El motor de cálculo NO está en el cliente

Grep 6 vacío. `CuotaOportunidad` no calcula: recibe `cuota_diaria_total` ya resuelto (no
divide entre 22 él mismo). `validarValorResidual` **recibe** el principal ya calculado en
vez de derivarlo, tal como exige T2.2 ✓. `reglas_simulaciones.md` §3 sigue siendo del
backend ✓.

---

## 4. Salidas de verificación

### 4.1 Los 6 greps de control (T6.1 Paso 3)

```
### G1 — D11: cero lógica de rol de simulaciones fuera del módulo de permisos
grep -rn "analista\|jdv" src --include=*.tsx | grep -iv "simulacionPermisos" | grep -i "simulac"
(vacío)

### G2 — D11: no se reutilizaron las constantes equivocadas
grep -rn "ROLES_APOYO\|ROLES_SUPERVISION" src | grep -i "simulac"
src/utils/simulacionPermisos.test.ts:87:  it('no reutiliza ROLES_APOYO: analista entra y otro no', () => {
src/utils/simulacionPermisos.test.ts:88:    // Regresión de K16. ROLES_APOYO agrupa analista con otro, que aquí están en
src/utils/simulacionPermisos.test.ts:94:  it('no reutiliza ROLES_SUPERVISION: jdv no entra', () => {
src/utils/simulacionPermisos.ts:13: * Por eso NO se reutilizan `ROLES_APOYO` ni `ROLES_SUPERVISION` de `authStore`:
```
> **Excepción esperada y benigna.** Los 4 hits son *falsos positivos por la ruta*: el
> `grep -i "simulac"` final casa con el nombre del propio archivo
> `simulacionPermisos.*`. Los cuatro son **texto de comentarios y nombres de test que
> dicen exactamente lo contrario** de lo que el grep busca ("NO se reutilizan"). No hay ni
> un `import` ni un uso de esas constantes. Con el filtro corregido
> (`grep -v simulacionPermisos` sobre la ruta) el resultado es vacío.

```
### G3 — D12: ningún campo de cuota renderizado como guion suelto
grep -rn "cuota.*'—'\|cuota.*\"—\"" src --include=*.tsx
(vacío)

### G4 — CLAUDE.md regla 2
grep -rn ": any\|as any" src --include=*.ts --include=*.tsx
(vacío)

### G5 — CLAUDE.md regla 5: HTTP solo en /src/api/
grep -rn "axios\.\|fetch(" src --include=*.tsx
src/components/DocumentosDrive.tsx:161  … onReintentar={() => void archivos.refetch()}
src/pages/Actividades/ActividadesPage.tsx:69
src/pages/Admin/AdminCatalogoEventos.tsx:122
src/pages/Admin/AdminEmpleados.tsx:130
src/pages/Admin/AdminFinanciadoras.tsx:119
src/pages/Admin/AdminModelos.tsx:110
src/pages/Cartera/CarteraPage.tsx:366
src/pages/Contactos/ContactoDetallePage.tsx:30
src/pages/Contactos/ContactosPage.tsx:84
src/pages/EmpresaDetalle/EmpresaDetallePage.tsx:65
src/pages/Inicio/InicioPage.tsx:22
src/pages/OportunidadDetalle/OportunidadDetallePage.tsx:35
src/pages/Pipeline/PipelinePage.tsx:116
src/pages/Prospeccion/ProspeccionPage.tsx:88,100
src/pages/Reportes/ReportesPage.tsx:107,171,224,258,287,350
```
> **Excepción esperada y benigna.** El patrón `fetch(` casa con **`refetch(`** de
> TanStack Query. Los 21 hits son `q.refetch()` de botones "Reintentar"; **ninguno** está
> en un archivo tocado por este plan y **ninguno** es una llamada HTTP directa. Cero
> `axios.` fuera de `src/api/client.ts`.

```
### G6 — El motor de cálculo NO se implementa en el cliente
grep -rniE "Math\.pow.*1/12|\*\* \(1 ?/ ?12\)|calcularCuotaFinal|calcularPMT" src
(vacío)
```

**Resultado:** los 6 limpios, con las 2 excepciones documentadas arriba, ambas artefactos
del propio patrón de grep (no del código).

### 4.2 Verificación completa (T6.1 Paso 4)

```
$ npm run type-check
> tsc --noEmit
(sin salida — verde)

$ npm run test
 Test Files  19 passed (19)
      Tests  157 passed (157)
   Duration  17.15s
   (incluye: simulacionPermisos 18 celdas, useSimulaciones 6×2 casos de D18,
    queryKeys 5 casos nuevos de invariante, CuotaOportunidad 5,
    IndicadorTipoCambio 3, PropiedadesCard 5, simulaciones utils 12)

$ npm run build
✓ built in 6.67s
(warning preexistente de chunk > 500 kB en el bundle principal)

$ npm run lint
✖ 58 problems (50 errors, 8 warnings)
```

**Verificación de que los 58 son preexistentes**, hecha archivo por archivo en vez de
darla por supuesta:

1. **Ningún archivo creado por este plan aparece en la salida de lint.** Los 20 archivos
   señalados son: `BandejaMetasVenta`, `BandejaSolicitudes`, `EliminarEmpresaModal`,
   `EventoDetalleModal`, `NuevaEmpresaModal`, `TareaDetalleModal`, `FiltrosCarteraDrawer`,
   `EmpresaDetallePage`, `CambiarContrasenaPage`, `LoginPage`, `ContactosCard`,
   `EventosCard`, `OportunidadDetallePage`, `PropiedadesCard`, `TareasCard`,
   `PipelinePage`, `TablaOportunidades`, `ProspeccionPage`, `SolicitudesPage`,
   `test/utilidades`. Cero hits en `src/api/simulaciones.ts`, `calculadora.ts`,
   `tipoCambio.ts`, `src/hooks/useSimulaciones.ts`, `useCalculadora.ts`,
   `useTipoCambio.ts`, `src/components/CuotaOportunidad.tsx`,
   `IndicadorTipoCambio.tsx`, `src/utils/simulaciones.ts`, `simulacionPermisos.ts` ni en
   sus tests.
2. **El único archivo señalado que este plan modifica es `PropiedadesCard.tsx`.** Sus
   hunks son `@@ -446,44 +448,71 @@` (líneas actuales 448–518) y `@@ -573,6 +602,18 @@`
   (líneas 602–619). Las líneas señaladas por eslint son **408, 542, 543** (errores) y
   **79, 295, 369, 438, 522** (warnings): todas caen **fuera** de esos rangos. Con el
   desplazamiento de +27 del primer hunk, 542/543/522 corresponden a las líneas 515/516/495
   originales de `main`. Ninguna es código nuevo.
3. `AppLayout.tsx`, `queryKeys.ts`, `enums.ts` e `index.ts` —los otros archivos
   modificados— **no aparecen en la salida de lint**.

**Conclusión: los 58 problemas son exactamente los heredados del plan anterior (deriva de
reglas de dependencias), ninguno introducido por esta rama.**

---

## 5. Checklist de cierre del Plan 02/03

- [x] `type-check`, `test` (157/157) y `build` en verde; `lint` en su estado preexistente
      verificado línea a línea
- [x] Los 6 greps de control limpios (2 excepciones documentadas, ambas artefactos del
      patrón de grep)
- [x] Los 18 casos de la tabla de permisos pasan (T1.2)
- [x] El test de sincronización 360 pasa, y cubre las **seis** mutaciones (T3.1)
- [x] Los 5 campos de cuota se ven, y los `null` dicen "Todavía no se puede calcular"
- [x] El indicador de tipo de cambio aparece y desaparece limpio con `data: null`
      (**pero ver C1**: no aparece entre `md` y `lg`)
- [x] Informe de auditoría escrito
- [ ] **Parada obligatoria:** resumir antes del Plan 04 (§10 del encargo)

Los hallazgos **no se corrigieron** por el ejecutor de T6.1 (Paso 7 del plan: solo
reportar). El arquitecto los corrigió todos a continuación:

## 6. Resolución (2026-09-07)

| # | Resolución |
|---|---|
| C1 | **Corregido.** `hidden lg:flex` → `hidden md:flex`, para acompañar al `<header>` que lo contiene. Comentario explícito en el componente citando el hallazgo |
| C2 | **Corregido.** Se mantiene la línea redundante (defensiva, barata) pero el comentario ahora explica que `qk.oportunidades` ya la cubre por prefijo. El test se renombró y su aserción pasó de `key.includes(null) === false` disfrazada de "no invalida detalles" a lo que de verdad garantiza: ninguna key contiene `null` |
| C3 | **Corregido**, con test de regresión. `Number(data.compra/venta)` + `Number.isFinite` antes de `.toFixed`; si no son finitos, no se renderiza (mismo criterio que D16 para `null`). El primer test escrito para esto resultó ser un falso verde (pasaba incluso sin el fix, porque `waitFor` se conformaba con el estado de carga); reescrito para esperar `queryClient.getQueryState(...).status === 'success'` antes de afirmar que no explotó. Confirmado en rojo (`TypeError`, exit 1) sin el fix y en verde con él |
| C4 | **Corregido.** Texto de `plan-02-mapa-cimientos-simulaciones.md` D12 actualizado a `utils/simulaciones.ts`. No se movió código — la ubicación de T2.2 era la correcta |

Verificado tras las cuatro correcciones: `type-check` limpio, 19/19 archivos y 158/158
tests (+1 sobre el conteo original: el nuevo test de C3), `build` en 6.4s, lint limpio en
los 4 archivos tocados.
