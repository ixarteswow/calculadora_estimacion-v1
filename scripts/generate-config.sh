#!/usr/bin/env bash
# Genera js/config.js en el deploy (Netlify) desde variables de entorno.
set -euo pipefail

mkdir -p js

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_KEY:-}" ]]; then
  echo "AVISO: SUPABASE_URL o SUPABASE_KEY no definidas. La app usará datos locales."
  cat > js/config.js <<'EOF'
// Generado en build — sin credenciales (modo LOCAL)
window.CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_KEY: ''
};
EOF
  exit 0
fi

# Escapar comillas dobles en la clave por si acaso
url="${SUPABASE_URL//\"/\\\"}"
key="${SUPABASE_KEY//\"/\\\"}"

cat > js/config.js <<EOF
// Generado en build — no editar en producción
window.CONFIG = {
  SUPABASE_URL: "${url}",
  SUPABASE_KEY: "${key}"
};
EOF

echo "js/config.js generado correctamente."
