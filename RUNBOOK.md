# RUNBOOK — Calculadora Aurora (calculadora_estimaciones)

## Registro de sesión

### Sesión 2026-08-02 — Bloques A y B del PLAN_PROFESIONAL
- **Hecho:**
  - **Bloque A (P0)** — Motor blindado: validación de fecha/duración/horario (`validateDate`, `validateDuration`, `validateSchedule`), `jumpToNextShift` con límite 366 días y `RangeError` explícito. Harness `node:test` sin dependencias; batería T01–T18 determinista. PR #1 mergeado.
  - **Bloque B (P1)** — Contrato de eventos completo (mensajes enteros, un evento por jornada agotada; T18). `docs/` fuera de `.gitignore` y versionada con contrato, errores y ejemplos alineados a los tests. Refactor UI: render extraído a `js/ui.js` (`window.AuroraUi`); `app.js` de 678 → 230 líneas; cero `onclick`; `reset()` sin `location.reload()`; logs de trazado eliminados; worker "Falla la conexion Supabase" → "Hugo Intern". PRs #2 y #3 mergeados.
- **Hallazgo clave:** el bug de horario inválido colgaba la suite en fase roja (bucle infinito real, no teórico). El motor viejo además consumía minutos sobre días no laborables al agotar la búsqueda de turnos.
- **Estado:** `npm test` 18/18 verde. Pendiente: checklist manual en navegador y Bloque C (P2).

## Próxima sesión (objetivos)

1. **Checklist manual en navegador** (Bloque A+B): carga `file://`, selección por ID, directorio completo, duraciones, cálculo, reset, eventos completos, calendario, degradación Supabase.
2. **Bloque C (P2)**: `css/aurora.css` (T-15), festivos vigentes 2025–2026 (T-16, D-05), verificación final + DoD + retro (T-17).
3. **Netlify**: redeploy y verificar pill ONLINE tras los cambios.
4. **Git**: resolver el SSL de push con certificado configurado (no `http.sslVerify=false`).

---

## Referencias rápidas

- **Fecha:** 2026-05-22
- **Hecho:**
  - Exploración del proyecto (Aurora: estimación de tareas con turnos, festivos, colas `busyUntil`).
  - **Fase 0 — GitHub:** cuenta activa `ixarteswow`, repo [calculadora_estimacion-v1](https://github.com/ixarteswow/calculadora_estimacion-v1). `.gitignore` reforzado; eliminados del repo `test_supabase.html` y `new_workers.json` (datos/claves sensibles). Commits de UI y setup Supabase/Netlify.
  - **Fase 1 — Visual (UI):** paleta unificada `mojo` (azul + neutros + navy en CTA). Picker de duración custom (sin `<select>` nativo). Empty state guiado. Resultado con gradiente `mojo-primary` → `mojo-dark`. Modal **Directorio** en tabla/celdas estilo empresarial; columna **Cód.** con iniciales de rol (`D. S.`, etc.); semáforo verde/amarillo/naranja/rojo solo en disponibilidad del modal; tarjeta hover con avatar, rol **completo**, turno y estado.
  - **Supabase (proyecto nuevo):** `supabase/setup_workers.sql` (tabla `workers`, RLS lectura `anon`, datos ejemplo). Conexión local vía `js/config.js` (gitignored) — funcionó a la primera.
  - **Netlify:** `netlify.toml` + `scripts/generate-config.sh` generan `js/config.js` en build desde variables `SUPABASE_URL` y `SUPABASE_KEY`. Plantilla `js/config.example.js`.
- **Decisiones:**
  - No subir a GitHub: `config.js`, imágenes `.png`, SQL local, `test_supabase.html`.
  - Semáforo de colores solo en modal Directorio; resto de la app mantiene paleta mojo.
  - Códigos de rol abreviados solo en tabla; rol completo en tarjeta hover.
  - Credenciales Supabase en Netlify como env vars, no como archivo en el repo.
- **Errores → Soluciones:**
  - `git push` falla con SSL (`unable to get local issuer certificate`) → push con `git -c http.sslVerify=false` (pendiente arreglo definitivo en Windows).
  - Cuenta `gh` vs remote: operar con `ixarteswow` activo (`gh auth switch`) alineado con `origin`.
  - Netlify sin `config.js` en repo → build script que escribe el archivo desde env vars.
- **Pendiente inmediato (usuario):** confirmar deploy Netlify en **ONLINE** tras definir variables de entorno y redeploy.

---

## Próxima sesión (objetivos) — actualizado 2026-05-22

1. **Fase 2 — Tests por bloques** (prioridad): Vitest + casos para `js/estimator.js` (turnos, festivos, fin de semana, `busyUntil`, inicio efectivo). Luego helpers de `app.js` (`formatRoleCode`, `getWorkerStatus`) si aplica.
2. Verificar producción Netlify: pill **ONLINE**, directorio con datos Supabase, cálculo end-to-end.
3. Opcional: import SQL con todos los trabajadores de `workers.js` al proyecto Supabase nuevo.
4. Opcional técnico: arreglar SSL de Git en local; rotar claves del proyecto Supabase antiguo si siguen activas.

---

## Referencias rápidas

| Recurso | Ubicación |
|---------|-----------|
| Repo GitHub | https://github.com/ixarteswow/calculadora_estimacion-v1 |
| Config local | `js/config.js` (no commitear) |
| Setup BD | `supabase/setup_workers.sql` |
| Deploy Netlify | vars `SUPABASE_URL`, `SUPABASE_KEY` |
