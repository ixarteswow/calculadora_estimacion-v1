---
type: entidad
status: activo
relacionado_con:
  - patron_disponibilidad.md
  - logica_estimacion.md
---
# Entidad: Worker

Representa a un trabajador o recurso dentro de la calculadora de estimaciones.

## Estructura de Datos (Supabase / Local)

- **`id`** (text): Identificador único del trabajador.
- **`name`** (text): Nombre completo.
- **`role`** (text): Puesto o rol (ej. "Desarrolladora Senior").
- **`status`** (text): Estado descriptivo o de disponibilidad (ej. "Activo", "Ocupado", "Saturado").
- **`avatar`** (text): URL de la imagen de perfil.
- **`schedule`** (jsonb/object): Configuración del turno de trabajo.
  - `workDays`: Array de enteros indicando los días laborables (0=Dom a 6=Sab).
  - `startHour`, `startMinute`: Hora y minuto de inicio del turno.
  - `endHour`, `endMinute`: Hora y minuto de fin del turno.
  - `holidays`: Array de cadenas con fechas (YYYY-MM-DD) correspondientes a los días festivos o de vacaciones.
- **`busyUntil`** / **`busy_until`** (timestamptz/Date): Fecha y hora hasta la cual el trabajador está ocupado. Sirve como línea base para iniciar nuevas tareas.

## Notas de Implementación
En la base de datos Supabase la columna se denomina `busy_until`, pero la capa de abstracción del cliente (en `supabase-client.js`) la mapea a la propiedad camelCase `busyUntil` para su uso en la lógica JavaScript.

## Contrato de `schedule` (validado por el motor)

El motor (`js/estimator.js`) **rechaza con error** cualquier horario que no cumpla estas reglas. No se interpretan formatos no soportados; se falla de forma explícita (cubierto por los tests `T13`–`T16`):

| Regla | Detalle |
|---|---|
| `workDays` | Array no vacío de enteros entre `0` (domingo) y `6` (sábado) |
| `holidays` | Array de cadenas `YYYY-MM-DD` (puede estar vacío) |
| `startHour` / `endHour` | Enteros entre `0` y `23` |
| `startMinute` / `endMinute` | Enteros entre `0` y `59` |
| Turno | Inicio estrictamente anterior al fin (`start < end`) |

### Limitaciones soportadas (por ahora)

- Un único turno diurno por día. **No** se soportan: turnos nocturnos (que cruzan medianoche), pausas, varios intervalos al día ni zonas horarias distintas.
- El cálculo ocurre en la hora local del navegador.
- Si no se encuentra un turno válido en 366 días de búsqueda, el motor lanza `RangeError` (`T17`).
