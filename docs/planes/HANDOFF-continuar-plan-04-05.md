# Handoff — continuar el Plan 04/05 (vistas de Simulaciones) en una sesión nueva

**Para quién es esto:** una sesión de Claude Code que arranca en frío, sin el historial de
esta conversación. Leé este archivo COMPLETO antes de hacer nada. Después seguí a la
sección **"Primer paso"**.

**Por qué existe:** la sesión anterior configuró el MCP de Google Stitch a mitad de
conversación, y esta herramienta no carga sus tools en una sesión ya en marcha — hace
falta reiniciar. Este documento es la continuidad de contexto para que el reinicio no
pierda nada.

---

## 0. Dónde estamos parados (2026-09-08)

El encargo completo es `simulaciones_contrato_frontend.md` (te lo va a pasar el usuario si
hace falta releerlo — no está en el repo como archivo suelto, fue un adjunto de la
conversación original). De ahí salieron **6 documentos de plan**, en `docs/planes/`:

| Plan | Mapa | Tareas | Estado |
|---|---|---|---|
| 00/01 — Multi-modelo V42 | `plan-00-mapa-multimodelo.md` | `plan-01-multimodelo-tareas.md` | ✅ **Completo y mergeado** (PR #6) |
| 02/03 — Cimientos de Simulaciones | `plan-02-mapa-cimientos-simulaciones.md` | `plan-03-cimientos-simulaciones-tareas.md` | ✅ **Completo y mergeado** (PR #7) |
| 04/05 — Vistas de Simulaciones | `plan-04-mapa-vistas-simulaciones.md` | `plan-05-vistas-simulaciones-tareas.md` | 🟡 **Parcial** — solo T2.2 hecha (PR #8, mergeado). El resto bloqueado por el hito de diseño (ver abajo) |

Auditorías finales de cada plan completado (§1.3 del encargo, obligatorias, ya ejecutadas):
`plan-01-multimodelo-auditoria.md` (13 hallazgos, todos corregidos) y
`plan-03-cimientos-auditoria.md` (4 hallazgos, todos corregidos).

**`main` tiene todo esto ya mergeado.** Empezá desde ahí:
```bash
git checkout main && git pull origin main
```

Commit más reciente esperado: `d8b4c83` (merge del PR #8) o posterior.

### Qué existe ya en el código (no lo reconstruyas)

- **Multi-modelo:** `Oportunidad.items: OportunidadItem[]`, `oportunidadesApi.actualizarItem`,
  `useActualizarItem`, `etiquetaModelos`/`unidadesTotales` en `utils/oportunidades.ts`,
  `<EtiquetaModelos/>`.
- **Cimientos de Simulaciones:** `types/simulacion.ts`, `calculadora.ts`, `tipoCambio.ts` ·
  `api/simulaciones.ts`, `calculadora.ts`, `tipoCambio.ts` ·
  `utils/simulacionPermisos.ts` (punto único de permisos — **nunca reutilices
  `ROLES_APOYO`/`ROLES_SUPERVISION` de `authStore` para Simulaciones**, es el error que
  ese archivo existe para evitar) · `utils/simulaciones.ts` (`DEFAULTS_SIMULACION`,
  `formatoCuota`, `formatoTea`, `formatoTasa`, `validarCuotaInicial`,
  `validarValorResidual`) · `hooks/useSimulaciones.ts`, `useCalculadora.ts`,
  `useTipoCambio.ts` · `<CuotaOportunidad/>` (los 5 campos de cuota, ya integrado en
  `PropiedadesCard`) · `<IndicadorTipoCambio/>` (en el layout global).
- **Cableado de rutas (T2.2 del Plan 04/05, YA HECHA):** `RUTA_SIMULACIONES` /
  `RUTA_CALCULADORA` en `router/rutas.ts` · las 3 rutas registradas en `router/index.tsx`
  con `RequireRol`, apuntando por ahora a `src/pages/EnConstruccion/EnConstruccionPage.tsx`
  (placeholder `<Result status="info">`, mismo patrón que `SinAcceso`) · `navItems.ts` ya
  filtra la entrada de Simulaciones/Calculadora por rol · la notificación de `simulacion`
  en `NotificacionesDropdown` ya navega a `/simulaciones/:id`.

**Importante:** cuando construyas las páginas reales (T3.1, T4.1, T5.1 de abajo), la
`lazy(() => import(...))` de esas 3 rutas en `router/index.tsx` es lo único que cambia —
no toques `RequireRol`, no dupliques rutas, no re-hagas `navItems`.

---

## 1. El bloqueo: hito de diseño con Stitch (H0)

`docs/planes/plan-05-vistas-simulaciones-tareas.md`, Ola 0, tarea **H0**: toda vista NUEVA
(no una modificación de algo que ya existe) necesita una propuesta de diseño hecha con el
MCP de Google Stitch, presentada al usuario para aprobación, **antes** de escribir código
de UI. Es la regla §1.6 del encargo original, y no es negociable ni se puede saltar "por
apuro".

Las 5 vistas nuevas pendientes, en el orden que el plan recomienda construirlas:

1. **Cronograma** (`<CronogramaTabla/>`, T1.1) — el núcleo visual que reutilizan las otras 4
2. **Calculadora Financiera** (T3.1)
3. **Simulador dentro de la oportunidad** (T4.1)
4. **Módulo Simulaciones** — listado + detalle (T5.1)
5. **Historial de versiones y diff** (T6.1)
6. **`<PropuestaFinanciera/>`** + PDF + Excel (T7.1 + T7.2)

Además hay una tarea de formulario compartido (`<FormularioParametros/>`, T2.1) que
también lleva `[DISEÑO]` porque lo usan la Calculadora y el simulador.

### 1.1 Cómo verificar que Stitch ya está disponible en esta sesión

```bash
claude mcp get stitch
```

Debería decir `Status: ✓ Connected`. Eso confirma que el servidor sigue registrado (scope
local, en `~/.claude.json`, la API key **no** está en el repo). Lo que hace falta
comprobar es que ESTA sesión tenga sus *herramientas* cargadas — buscá si aparecen
herramientas con nombre `mcp__stitch__*` en tu listado de tools disponibles, o probá
`ToolSearch` con query `"stitch"`. Si no aparece nada, avisale al usuario: la config existe
pero esta sesión tampoco la cargó, y hay que investigar por qué (podría ser un problema
distinto al de la sesión anterior).

**Si en algún momento el usuario te pide reconfigurar el MCP de Stitch:** el comando que
funcionó fue

```bash
claude mcp add stitch https://stitch.googleapis.com/mcp --scope local --transport http --header "X-Goog-Api-Key: <LA_KEY>"
```

**Nunca** hagas esto con `--scope project`: `.mcp.json` está versionado en git y la key no
debe llegar a un commit. El usuario tiene la key; no la inventes ni la reuses de otro lado.

### 1.2 Qué hacer con H0

1. Leé `docs/planes/plan-04-mapa-vistas-simulaciones.md` completo (investigación, hallazgos
   K27–K35, decisiones D22–D31) — es el mapa que gobierna las 6 vistas.
2. Leé `docs/planes/plan-05-vistas-simulaciones-tareas.md` completo, especialmente la
   sección **H0** y las tablas de columnas exactas del cronograma (§5.4 del encargo,
   citadas en el mapa).
3. Para cada una de las 6 vistas: generá la propuesta con el MCP de Stitch, presentásela
   al usuario, y esperá su aprobación **antes** de tocar código de esa vista puntual. El
   hito es **por vista**, no global — podés arrancar por el cronograma sin tener las 6
   aprobadas.
4. `DESIGN.md` es normativo para la estética final (paleta, tipografía, Ant Design); los
   prototipos de Stitch dicen *qué va y dónde*, no *cómo se ve* — la reconstrucción final
   es con Ant Design + `DESIGN.md`, no una copia literal del HTML que genere Stitch.

**No arranques ninguna tarea de UI marcada `[DISEÑO]` sin esa aprobación explícita del
usuario**, aunque te parezca obvio cómo debería verse.

---

## 2. Cómo se trabajó hasta acá — replicá el mismo proceso

Esto no es opcional ni es "el estilo de la sesión anterior nada más": son las reglas del
propio encargo (`simulaciones_contrato_frontend.md` §1), y los tres PRs mergeados las
siguieron al pie de la letra. Rompé el patrón solo si el usuario te lo pide explícitamente.

### 2.1 Un subagente por tarea, con instrucciones autocontenidas

Cada tarea atómica del documento de plan se lanza como un subagente aparte (herramienta
`Agent`, `subagent_type: general-purpose`), con un prompt que:
- Le dice que lea el/los archivo(s) de plan relevantes ANTES de tocar nada — el subagente
  arranca en frío, no tiene tu contexto de conversación.
- Le da el contexto operativo mínimo: en qué rama está, qué tareas previas ya están
  completas y qué archivos/exports puede asumir que existen, qué archivos puede tocar (una
  lista cerrada), y que NO haga commit.
- Le pide, al terminar, un reporte verificable: diffs, salida de tests/lint/type-check, y
  confirmación explícita de que no se salió de su lista de archivos.
- Reproduce el bloque de ESCALACIÓN del propio plan, para que el subagente lo use si algo
  no coincide, en vez de improvisar.

Modelo por tarea: **Sonnet** para ejecución estándar, **Opus** para las de mayor riesgo
(permisos, sincronización 360, auditorías finales, componentes con reglas de negocio
enredadas como el cronograma o el simulador). El plan ya trae esta asignación en cada
tarea — respetala.

### 2.2 El arquitecto (vos, en la sesión principal) VERIFICA cada tarea, no confía en la autoevaluación

Después de que un subagente reporta éxito, antes de commitear:
- Corré `npm run type-check`, `npm run test -- <lo relevante>`, y a veces `npx eslint
  <archivos tocados>` **vos mismo**, no solo confiando en lo que el subagente pegó en su
  reporte.
- Si el subagente afirma algo sospechoso ("el lint que falla es preexistente"), verificalo
  con `git stash` / `git diff --unified=0` contra los hunks modificados, como se hizo
  reiteradas veces en esta rama. Más de una vez el chequeo encontró que un fix propio
  necesitaba un ajuste (ver `src/utils/oportunidades.ts`, un error de `tsc` que ningún
  reporte de subagente detectó y el arquitecto corrigió directo).
- Cuando el propio subagente escala (bloque `ESCALACION`), no lo resuelvas por tu cuenta si
  implica una decisión de producto o de alcance — usá `AskUserQuestion` con tu
  recomendación como primera opción. Pasó dos veces en esta rama (la financiadora
  no-editable K36; las páginas de destino inexistentes de T2.2) y las dos veces el usuario
  decidió en segundos con una opción clara puesta adelante.

### 2.3 TDD real, no decorativo

Cuando el plan dice "TDD obligatorio", el patrón verificado en esta rama es: escribir el
test, confirmar que FALLA (a veces revirtiendo un fix ya escrito con `git stash` para
comprobarlo), implementar, confirmar que PASA. Pasó más de una vez que un primer intento de
test resultó ser un falso verde (ver el hallazgo C3 de `plan-03-cimientos-auditoria.md`: un
`waitFor` se conformaba con el estado de carga y nunca ejercía la ruta del bug) — el
chequeo en rojo/verde de verdad es lo que lo agarra.

### 2.4 Cada plan cierra con una auditoría (Opus, obligatoria, §1.3 del encargo)

Al terminar todas las tareas de un plan, se lanza una tarea final de auditoría: releer el
diff completo de la rama contra TODOS los documentos citados en el mapa correspondiente,
no solo contra lo que el plan pedía implementar. Buscá específicamente contradicciones con
reglas que ya estaban bien escritas antes de empezar. Esa tarea nunca corrige — solo
reporta, en un archivo `plan-NN-<tema>-auditoria.md`, con hallazgos numerados. El
arquitecto decide después qué corregir (en esta rama: todo, porque los hallazgos eran
baratos y de bajo riesgo — puede no ser siempre así).

### 2.5 Git: una rama por plan, commit por ola, push + PR al final

- Rama nueva desde `main` actualizado, por plan (no por tarea individual).
- Un commit por ola de tareas (a veces dos tareas paralelas en un solo commit si van
  juntas), con mensaje que cite qué tarea del plan es, qué hallazgos/decisiones aplica, y
  el resultado de la verificación.
- Al terminar TODO el plan (incluida la auditoría y sus correcciones): `git push -u origin
  <rama>` y `gh pr create` con un body que resuma el plan, lo corregido en la auditoría, y
  el estado de verificación. Los PRs #6, #7 y #8 son la referencia de formato.
- El repo tiene `Co-Authored-By` en los mensajes de commit y en los PRs — segui el patrón
  de atribución que tengas configurado en tu propia sesión (puede variar según el modelo
  que te esté corriendo).

### 2.6 Reglas globales que TODO subagente debe llevar en su prompt

Están repetidas al principio de cada documento de tareas (`plan-01/03/05-...-tareas.md`),
pero resumidas: español en todo (comentarios, tests, commits), nunca `any`, TDD real, toda
llamada HTTP solo en `/src/api/`, MSW para tests que tocan red (nunca mockear el cliente de
API), no commitear salvo que se pida, no salir de la lista de archivos autorizados, no usar
comandos git destructivos.

---

## 3. Primer paso al arrancar esta sesión

1. `git checkout main && git pull origin main` — confirmá que ves el commit `d8b4c83` (o
   posterior) en el log.
2. `claude mcp get stitch` y verificá que las herramientas de Stitch aparecen disponibles
   en esta sesión (no solo que el servidor esté "Connected" a nivel CLI — eso ya lo estaba
   antes y no alcanzaba).
3. Si Stitch está disponible: arrancá H0 — leé los dos documentos del Plan 04/05 completos
   (mapa y tareas), generá la primera propuesta de diseño (recomendado empezar por el
   Cronograma, es el núcleo que reutilizan las demás vistas) y presentásela al usuario para
   aprobación antes de escribir ningún componente.
4. Si Stitch **todavía** no está disponible en esta sesión nueva: decíselo al usuario
   claramente, no lo asumas resuelto ni inventes una alternativa — es la misma situación
   que motivó este handoff, y puede necesitar más que un simple reinicio (revisar el
   cliente MCP, permisos, etc.).
5. Creá la rama del Plan 04/05 desde `main`:
   `git checkout -b feature/vistas-simulaciones-<lo que corresponda>` — el nombre de rama
   anterior de este plan (`feature/vistas-simulaciones-cableado`) ya se usó y mergeó, no lo
   reutilices para el trabajo de UI.

No hace falta que le preguntes al usuario "¿seguimos donde quedamos?" — este documento
**es** la continuidad. Empezá directo por el paso 1.
