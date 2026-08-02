# Plan de Ejecución Profesional — Calculadora Aurora

**Proyecto:** Calculadora de Estimación "Aurora"  
**Fecha:** 2026-08-02  
**Autor:** Equipo (1 persona)  
**Documentos base:** `REPORTE_PROFESIONALIZACION.md` (auditoría), `PLAN_MEJORAS_DEMO.md` (diseño técnico por fases)  
**Estado:** ✅ **EJECUTADO** — Bloques A, B y C completados el 2026-08-02 (PRs #1–#4, `npm test` 18/18). Estado vivo y seguimiento en `TRACKING.md`; retro en `RUNBOOK.md`.

---

## 1. Qué es este documento (y por qué existe)

Un plan de ejecución profesional no es solo "la lista de cosas por hacer": es el **contrato operativo** entre el trabajo y su calidad. Define:

1. **Qué** se va a hacer (backlog priorizado con criterios de aceptación).
2. **En qué orden y por qué** (hitos con dependencias).
3. **Cómo** se va a hacer (estrategia de trabajo: TDD, ramas, PRs, commits).
4. **Cuándo se considera terminado** (Definition of Ready / Definition of Done).
5. **Qué hacer si algo sale mal** (riesgos, reversión, emergencias).

Los hábitos que este plan te enseña son los que se repiten en cualquier equipo serio, independientemente de la tecnología:

| Hábito | Por qué importa |
|---|---|
| Tareas pequeñas con criterios de aceptación | Una tarea sin "hecho" definido nunca se termina; se arrastra. |
| TDD (prueba primero) | Las pruebas son la red de seguridad que permite refactorizar sin miedo. |
| Ramas cortas + PR | Cada cambio queda aislado, revisable y reversible. |
| Commits atómicos | El historial cuenta la historia del porqué; `git bisect` y los reverts funcionan. |
| DoR / DoD | Evita empezar cosas sin contexto y terminarlas a medias. |
| Retroalimentación al cerrar | El aprendizaje se captura; no se repiten los mismos errores. |

---

## 2. Objetivo

Endurecer la demo Aurora siguiendo las rectificaciones P0/P1/P2 de la auditoría, **sin ampliar el alcance funcional** y **sin que una sola fecha de las que hoy se calculan bien cambie de valor**.

### Incluido
- Validación robusta del motor de fechas y fallo explícito ante datos inválidos.
- Pruebas automatizadas del motor con el runner nativo de Node (`node:test`), sin dependencias.
- Contrato de horarios soportados, documentado y versionado.
- Trazabilidad (eventos) coherente con la documentación.
- Refactor mínimo de la interfaz, protegido por las pruebas.
- Limpieza de restos de depuración y datos ficticios desactualizados.

### Excluido (a propósito)
- Concurrencia real, persistencia de tareas, autenticación, APIs, backend.
- Frameworks, TypeScript, bundlers, Tailwind compilado, CI/CD, E2E.
- Zonas horarias múltiples, turnos nocturnos, pausas, varios turnos al día.
- Rediseño visual o nuevas funcionalidades.

---

## 3. Estrategia de trabajo

### 3.1 TDD: rojo → verde → refactor

Para todo cambio en `estimator.js`:

1. Escribir (o ampliar) la prueba que falla → **ROJO**.
2. Implementar lo mínimo para que pase → **VERDE**.
3. Limpiar el código manteniendo verde → **REFACTOR**.

Regla innegociable: **no se modifica una línea del motor sin que `npm test` esté corriendo y sea la referencia del comportamiento esperado.**

### 3.2 Ramas y Pull Requests

Estrategia recomendada para repositorio pequeño y un solo desarrollador: **trunk-based con ramas efímeras**.

```text
main (protegida, siempre verde)
 └── feat/contrato-motor       → PR #1  (contrato + decisión de runner)
 └── feat/hardening-motor      → PR #2  (tests + validación)   ← bloque A (P0)
 └── feat/trazabilidad-docs    → PR #3  (eventos + documentación)
 └── feat/refactor-ui          → PR #4  (ui.js, listeners, limpieza)
 └── feat/css-cierre           → PR #5  (css + fixtures + DoD)
```

- Una rama por hito; **nunca** mezclar hitos en la misma rama.
- Cada PR se auto-revisa con el checklist de la sección 8 antes de mergear.
- El merge se hace con `--no-ff` (o squash si prefieres historial plano) para que cada hito quede como una unidad identificable y reversible.
- `main` debe permanecer siempre en estado "demo funcional". Si al final del día `main` está rota, es un fallo de proceso, no un accidente.

### 3.3 Commits atómicos (Conventional Commits)

Un commit = una unidad lógica reversible.

```text
test(motor): añade casos T10-T17 de entradas inválidas (rojo)
feat(motor): valida duración, fecha y horario antes de calcular
fix(motor): salta explícitamente ante calendario imposible
refactor(app): sustituye onclick por listeners registrados
chore(docs): versiona docs/knowledge y actualiza contrato
```

- Verbo + alcance + motivo, en una línea.
- **Correr `npm test` antes de cada commit** y confirmar el estado que se declara (rojo/verde) en el mensaje si aplica.

### 3.4 Registro de decisiones (log de decisiones)

Las decisiones relevantes se registran conforme se toman. Formato ligero tipo ADR. Las ya previstas en este plan (se confirman en el hito correspondiente):

| # | Decisión | Motivo | Se confirma en |
|---|---|---|---|
| D-01 | Usar `node:test` (sin dependencias) en vez de Vitest | Zero deps, suficiente para el motor; el RUNBOOK mencionaba Vitest pero no aporta valor aquí | Hito M1 |
| D-02 | Conservar los eventos, con mensajes completos | Ya son parte visible del resultado; se limita el contrato, no se expande | Hito M3 |
| D-03 | Sacar `docs/knowledge/` de `.gitignore` | Si los documentos definen comportamiento oficial, deben versionarse | Hito M3 |
| D-04 | Renombrar el worker de demo "Falla la conexion Supabase" a un nombre neutro | Un dato ficticio no debe contener información técnica | Hito M4 |
| D-05 | Actualizar festivos de 2024 a fechas vigentes 2025–2026 | El fixture debe poder demostrar el comportamiento de festivos hoy | Hito M5 |

---

## 4. Backlog priorizado (bloque A = P0, bloque B = P1/P2)

Formato de tarea: **ID · Descripción · Criterios de aceptación · Dependencia · Estimación**.

### Bloque A — Motor blindado (P0)

**Hito M1 — Red de seguridad**

| ID | Descripción | Criterios de aceptación | Dep. | Est. |
|---|---|---|---|---|
| T-01 | Crear `package.json` con script `test` y exportar `AuroraEstimator` para Node (`module.exports` protegido) | `npm test` se ejecuta sin dependencias; `index.html` sigue funcionando con `file://` | — | 0.5 h |
| T-02 | Escribir batería de pruebas T01–T17 + `makeWorker()` (fechas locales, sin reloj ni aleatoriedad) | T01–T09 verdes; T10–T17 **rojos** (demuestran los bugs); la ejecución siempre termina | T-01 | 2 h |
| T-03 | Registrar la decisión D-01 (runner) en el log | Decisión documentada y aprobada antes de cerrar el hito | T-02 | 0.25 h |

**Criterio de salida del hito:** existe una batería repetible que prueba los bugs reales antes de tocar el motor.

**Hito M2 — Validación y corrección del motor**

| ID | Descripción | Criterios de aceptación | Dep. | Est. |
|---|---|---|---|---|
| T-04 | Validar fecha de inicio: rechaza `Invalid Date` | Prueba T12 verde | T-02 | 0.5 h |
| T-05 | Validar duración: finito, > 0, entero | T10, T11 verdes | T-02 | 0.5 h |
| T-06 | Validar `schedule`: `workDays` no vacío 0–6, `holidays` array, horas/minutos en rango, `start < end` | T13–T16 verdes | T-02 | 1 h |
| T-07 | Endurecer `jumpToNextShift`: límite explícito (366 días) y `RangeError` si no hay turno | T17 verde; sin bucles infinitos posibles | T-06 | 0.5 h |
| T-08 | Adaptar `app.js`: `try/catch` alrededor de `calculate()`, mensaje de error visible, estado intacto | Entrada inválida → error claro en UI; demo no se congela | T-04 a T-07 | 1 h |

**Criterio de salida del hito (Definition of Done del bloque A):**
- `npm test` 100 % verde (T01–T17).
- No existe ruta que produzca una fecha de finalización para entradas inválidas.
- No existe ruta conocida donde el `while` del motor no reduzca trabajo.
- Demo manual: cálculo válido idéntico al comportamiento anterior.
- Commit del hito mergeado en `main` y PR cerrado.

### Bloque B — Claridad y trazabilidad (P1)

**Hito M3 — Trazabilidad y documentación**

| ID | Descripción | Criterios de aceptación | Dep. | Est. |
|---|---|---|---|---|
| T-09 | Definir contrato de eventos: mensajes completos, registrados en cada salto; actualizar `effectiveStartDate` solo en la normalización inicial | T18 verde; `evt.msg.split(' ')[0]` eliminado de `app.js` | M2 | 1 h |
| T-10 | Alinear `docs/knowledge/*` con el comportamiento real (contrato en `entidad_worker.md`, ejemplos en `logica_estimacion.md`, demo marcada en `patron_disponibilidad.md`) | Cada afirmación documental es verificable en código o en un test | M2 | 1.5 h |
| T-11 | Aplicar D-03: sacar `docs/` de `.gitignore` y commitear la documentación | `git ls-files` muestra `docs/knowledge/*`; histórico del repo conserva la documentación | T-10 | 0.25 h |

**Hito M4 — Refactor mínimo de interfaz**

| ID | Descripción | Criterios de aceptación | Dep. | Est. |
|---|---|---|---|---|
| T-12 | Extraer render (perfil, directorio, popover, resultado, calendario, pill) a `js/ui.js` como `window.AuroraUi` | `app.js` pierde las plantillas largas; checklist manual de regresión completo pasa | M2 | 2 h |
| T-13 | Sustituir `onclick` inline por listeners en `app.js`; `reset()` en vez de `location.reload()` | Cero atributos `onclick` en `index.html`; reset restaura estado y UI | T-12 | 1 h |
| T-14 | Limpieza: comentarios duplicados, `console.log` de trazado, worker "Falla la conexion Supabase" (D-04) | Revisión de código sin restos de depuración; fixtures con nombres neutrales | T-12 | 0.5 h |

**Criterio de salida del bloque B:** `app.js` es un orquestador legible, `ui.js` hace todo el renderizado, y la documentación describe exactamente lo que el código hace.

### Bloque C — Cierre (P2)

**Hito M5 — CSS, fixtures y cierre**

| ID | Descripción | Criterios de aceptación | Dep. | Est. |
|---|---|---|---|---|
| T-15 | Mover CSS propio a `css/aurora.css`; `<style>` limpio en `index.html` | Aspecto idéntico en móvil y escritorio; sin errores de carga | M4 | 1 h |
| T-16 | Actualizar festivos de fixtures a fechas vigentes (D-05) y añadir un caso de festivo real al checklist manual | Demostración de festivo funciona hoy, no solo en 2024 | M4 | 0.25 h |
| T-17 | Verificación final: `npm test` limpio, checklist manual completo, revisión contra preguntas de la sección 9 | Definition of Done del proyecto cumplida (sección 7) | T-15, T-16 | 1 h |

**Total estimado: 14–15 horas de trabajo efectivo**, repartidas en ~5 sesiones de 2–3 h.

---

## 5. Cadencia y ritmo de trabajo

| Momento | Acción |
|---|---|
| Inicio de sesión | Leer el objetivo del hito en curso y el estado del log de decisiones; ejecutar `npm test` como referencia. |
| Durante | Trabajar una sola tarea a la vez; commit atómico al terminar cada una con tests en el estado declarado. |
| Fin de hito | PR, auto-review con checklist (sección 8), merge, demo breve de 5 minutos del comportamiento, actualizar `RUNBOOK.md`. |
| Fin de proyecto | Retro corta (sección 10) y criterio de finalización del plan. |

**Regla de oro:** no se cierra una sesión con pruebas rojas en `main`. Si no dio tiempo, la rama queda abierta y `main` verde.

---

## 6. Definition of Ready (cuándo una tarea puede empezar)

Una tarea solo se toma si:

1. Tiene ID, criterios de aceptación y estimación (o se estima al tomarla).
2. Su dependencia está mergeada en `main`.
3. El comportamiento esperado está claro sin interpretación (si afecta al motor, existe el test o se escribe primero).
4. No mezcla responsabilidades de otro hito.

## 7. Definition of Done (del proyecto)

1. `npm test` pasa con T01–T18 aplicables, desde un checkout limpio.
2. Ninguna entrada inválida produce fecha de finalización ni congela la página.
3. Todos los resultados válidos que hoy se calculan bien se conservan (regresión cero).
4. El contrato de horarios y eventos está documentado, versionado y coincide con los tests.
5. `app.js` orquesta; el renderizado vive en `ui.js`; no hay `onclick` inline ni `location.reload()`.
6. El CSS propio está separado y el diseño no cambió.
7. No se introdujeron dependencias, capas ni configuraciones no justificadas.
8. `RUNBOOK.md` y el log de decisiones están actualizados.

---

## 8. Checklist de code review (auto-revisión antes de cada merge)

**Correctitud**
- [ ] `npm test` pasa (y los tests son deterministas: sin `Date.now()` ni `Math.random()`).
- [ ] El cambio no altera ningún resultado válido previo (si lo hace, hay un test que lo justifica).

**Diseño**
- [ ] ¿Cada función tiene una responsabilidad clara?
- [ ] ¿El motor es el único lugar que decide una fecha?
- [ ] ¿Algo nuevo que la demo no usa hoy? (YAGNI: revertir si aplica)

**Robustez**
- [ ] ¿Un dato inválido produce error **antes** de calcular?
- [ ] ¿Puede alguna iteración continuar sin reducir el trabajo pendiente? (bucles)

**Higiene**
- [ ] ¿Sin `console.log` de trazado, comentarios duplicados ni datos ficticios técnicos?
- [ ] ¿Sin credenciales ni URLs de proyectos en el diff? (`config.js` sigue en `.gitignore`)

**Comunicación**
- [ ] El título del PR describe el cambio; el mensaje del commit lo resume en una línea.

---

## 9. Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El refactor altera cálculos correctos | Media | Alto | Pruebas T01–T09 antes de tocar el motor; correr `npm test` tras cada cambio |
| La validación rompe fixtures existentes | Alta | Bajo | Corregir el fixture o documentar su limitación; **nunca** relajar la validación para conservar datos erróneos |
| Mezclar bloques en la misma rama | Media | Medio | Una rama por hito; si se detecta en review, se separa antes del merge |
| `file://` deja de funcionar | Baja | Medio | Mantener scripts clásicos; probar apertura directa en el checklist |
| Git/SSL roto en Windows (conocido) | Media | Medio | Si vuelve a fallar, resolver con certificado configurado; no usar `http.sslVerify=false` como práctica permanente |
| Scope creep (alguien añade Supabase "ya que estamos") | Media | Medio | Revisar el alcance en cada PR contra la sección 2 |

## 10. Emergencias y reversión

- **Bug introducido en `main`:** `git revert <commit-del-hito>` — cada hito es una unidad reversible por diseño. Se corrige después en una rama nueva.
- **Pruebas rojas sin explicación:** detener la tarea, volver al último commit verde (`git log --oneline`), y recrear el cambio en pasos más pequeños. Nunca "arreglar el test para que pase".
- **Duda de diseño:** escribir la decisión en el log de decisiones con su motivo antes de implementar; las decisiones abiertas bloquean el inicio de la tarea que dependa de ellas.

## 11. Retro (al cierre del proyecto)

Responder por escrito (en `RUNBOOK.md`) a estas tres preguntas:

1. ¿Qué práctica del plan aportó más valor? (candidata a repetirse en el próximo proyecto)
2. ¿Qué costó más de lo estimado y por qué?
3. ¿Qué se haría distinto la próxima vez?

La retro es la única parte del plan que se hace *después* de terminar; el resto se hace *antes* o *durante*.

---

## 12. Resumen ejecutivo

```text
Bloque A (P0, ~7 h):  contrato + tests rojos → motor validado → main verde
Bloque B (P1, ~6 h):  eventos + docs versionadas → ui.js + limpieza
Bloque C (P2, ~2 h):  css + fixtures vigentes → DoD + retro
```

Cada bloque termina con un PR mergeado, `main` funcionando y una demo de 5 minutos. Si al final del Bloque A el motor está blindado y testeado, todo lo demás es cosmética segura — y eso es exactamente lo que un plan profesional ordena hacer primero.
