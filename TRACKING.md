# TRACKING — Ejecución del Plan Profesional

> Lista viva de la ejecución de `PLAN_PROFESIONAL.md`. Se actualiza con cada tarea terminada.
> Estados: `⬜ pendiente` · `🔄 en curso` · `✅ hecho` · `⏭️ diferido` · `❌ bloqueado`

**Última actualización:** 2026-08-02

---

## Log de decisiones

| # | Decisión | Estado |
|---|---|---|
| D-01 | Runner de tests: `node:test` (sin dependencias), no Vitest | ✅ Confirmada |
| D-02 | Eventos: conservar, con mensajes completos (no truncados) | ⬜ Se confirma en M3 |
| D-03 | Sacar `docs/knowledge/` de `.gitignore` | ⬜ Se aplica en M3 |
| D-04 | Renombrar worker "Falla la conexion Supabase" → neutro | ⬜ Se aplica en M4 |
| D-05 | Festivos de fixtures: actualizar a 2025–2026 | ⬜ Se aplica en M5 |

---

## Bloque A — Motor blindado (P0) ✅ COMPLETADO

### Hito M1 — Red de seguridad ✅

| ID | Descripción | Criterio de aceptación | Estado | Notas |
|---|---|---|---|---|
| T-01 | `package.json` con script `test` + exportar `AuroraEstimator` para Node | `npm test` corre sin deps; `file://` intacto | ✅ | Rama `feat/hardening-motor` |
| T-02 | Batería T01–T17 + `makeWorker()` determinista | T01–T09 verdes; T10–T17 rojos (bugs demostrados) | ✅ | Ver hallazgos: T16 y T14 |
| T-03 | Registrar D-01 en el log | Decisión documentada | ✅ | `node:test`, cero dependencias |

### Hito M2 — Validación y corrección del motor ✅

| ID | Descripción | Criterio de aceptación | Estado | Notas |
|---|---|---|---|---|
| T-04 | Validar fecha de inicio (`Invalid Date` → error) | T12 verde | ✅ | `validateDate` en estimator.js |
| T-05 | Validar duración (finito, >0, entero) | T10, T11 verdes | ✅ | `validateDuration` |
| T-06 | Validar `schedule` (workDays, holidays, horas, start<end) | T13–T16 verdes | ✅ | `validateSchedule` |
| T-07 | Endurecer `jumpToNextShift` (límite 366 + `RangeError`) | T17 verde; sin bucles | ✅ | `MAX_SEARCH_DAYS` |
| T-08 | `app.js`: `try/catch` + mensaje de error en UI | Error visible; UI no se congela | ✅ | Mensaje del error en empty state |

---

## Bloque B — Claridad y trazabilidad (P1)

| ID | Descripción | Estado | Notas |
|---|---|---|---|
| T-09 | Contrato de eventos: mensajes completos + T18 | ⬜ | |
| T-10 | Alinear `docs/knowledge/*` con código y tests | ⬜ | |
| T-11 | D-03: versionar `docs/knowledge/` | ⬜ | |
| T-12 | Extraer render a `js/ui.js` | ⬜ | |
| T-13 | Listeners en vez de `onclick`; `reset()` sin reload | ⬜ | |
| T-14 | Limpieza: comentarios duplicados, logs, D-04 | ⬜ | |

---

## Bloque C — Cierre (P2)

| ID | Descripción | Estado | Notas |
|---|---|---|---|
| T-15 | CSS propio → `css/aurora.css` | ⬜ | |
| T-16 | Festivos vigentes 2025–2026 (D-05) | ⬜ | |
| T-17 | Verificación final + DoD + retro | ⬜ | |

---

## Registro de sesión

### Sesión 1 — 2026-08-02
**Objetivo:** Bloque A (hitos M1 y M2). **Resultado: COMPLETADO — `npm test` 17/17 verde.**

- [x] T-01: harness de tests (`package.json` + export dual)
- [x] T-02: batería roja inicial (T01–T09 verdes, T10–T15 y T17 rojos)
- [x] T-04 a T-07: validación del motor (`validateDate`, `validateDuration`, `validateSchedule`, `jumpToNextShift` endurecido)
- [x] T-08: `try/catch` en `app.js` con mensaje de error en la UI
- [x] Resultado: `npm test` 17/17 verde

**Hallazgos de la sesión:**

1. **El bug de T16 no era teórico**: al correr la batería inicial, el motor **colgó la suite completa** (bucle infinito con `startHour >= endHour`, tal como predecía la auditoría). En fase roja T16 se marcó `skip` con la razón documentada — el bug es el cuelgue mismo; se activó al validar el horario (T-06) y pasó verde.
2. **Falso verde en fase roja (T14 caso 1)**: con el código viejo, `holidays` ausente reventaba en `schedule.holidays.includes()` con un `TypeError` accidental, que `assert.throws` interpretaba como "pasa". Tras la validación es un verde genuino (el error proviene de `validateSchedule`). Ejemplo real de por qué una fase roja debe revisarse con cabeza y no darse por buena.
3. **Invitado sorpresa**: el motor viejo, al agotar `jumpToNextShift`, podía **consumir minutos sobre días no laborables** (devuelve un día no laborable y el bucle consume igualmente). El `RangeError` de T-07 elimina esa ruta de "fechas inventadas".
