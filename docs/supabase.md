# Supabase

Proyecto: calculadora-estimacion (proyecto nuevo)

> Las credenciales NO se versionan. Van como variables de entorno
> (Netlify: `SUPABASE_URL` + `SUPABASE_KEY`; local: `js/config.js`, gitignored).

## Variables

| Variable | Dónde copiarla en el dashboard |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_KEY` | Project Settings → API → **publishable** key (NUNCA la secret key) |

## Notas

- En producción (Netlify) se usa el proyecto `rxlpviuvvtudnkgxacxf` (tiene la tabla `workers` con datos; 19 filas).
- `zguplfhaxmyskzxvanwj` (proyecto "nuevo", pausado) y `wfnrnoppegpwkpeyeutk` (vacío, sin tabla) quedan sin usar.
- `test_supabase.html` es un probe de conexión local (no forma parte del sitio).
