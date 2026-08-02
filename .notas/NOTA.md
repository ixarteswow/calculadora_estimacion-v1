# Notas de sesión

- **Fecha:** 2026-05-22
- **Notas:**
  - Proyecto: calculadora web estática (HTML + JS) “Aurora System” para estimar fecha fin de tarea según horario del trabajador.
  - UI: bento + glassmorphism; modal directorio tipo tabla empresarial con códigos de rol y tooltip con rol extendido.
  - Backend opcional: Supabase tabla `workers`; fallback local `workers.js`.
  - Netlify genera `js/config.js` en cada build — copiar mismos valores que en `config.js` local a Environment variables.
- **Errores y solución:**
  - Push Git SSL → `git -c http.sslVerify=false push` temporalmente.
  - Sin config en Netlify → `scripts/generate-config.sh` + variables de entorno.
