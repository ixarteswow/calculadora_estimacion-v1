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

## Bloque A — Motor blindado (P0)

### Hito M1 — Red de seguridad

| ID | Descripción | Criterio de aceptación | Estado | Notas |
|---|---|---|---|---|
| T-01 | `package.json` con script `test` + exportar `AuroraEstimator` para Node | `npm test` corre sin deps; `file://` intacto | ⬜ | |
| T-02 | Batería T01–T17 + `makeWorker()` determinista | T01–T09 verdes; T10–T17 rojos (bugs demostrados) | ⬜ | |
| T-03 | Registrar D-01 en el log | Decisión documentada | ⬜ | |

### Hito M2 — Validación y corrección del motor

| ID | Descripción | Criterio de aceptación | Estado | Notas |
|---|---|---|---|---|
| T-04 | Validar fecha de inicio (`Invalid Date` → error) | T12 verde | ⬜ | |
| T-05 | Validar duración (finito, >0, entero) | T10, T11 verdes | ⬜ | |
| T-06 | Validar `schedule` (workDays, holidays, horas, start<end) | T13–T16 verdes | ⬜ | |
| T-07 | Endurecer `jumpToNextShift` (límite 366 + `RangeError`) | T17 verde; sin bucles | ⬜ | |
| T-08 | `app.js`: `try/catch` + mensaje de error en UI | Error visible; UI no se congela | ⬜ | |

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
**Objetivo:** Bloque A (hitos M1 y M2).

- [ ] T-01: harness de tests
- [ ] T-02: batería roja inicial
- [ ] T-04 a T-07: validación del motor
- [ ] T-08: integración del error en UI
- [ ] Resultado: `npm test` verde

**Hallazgos:** _(se rellenan durante la sesión)_
