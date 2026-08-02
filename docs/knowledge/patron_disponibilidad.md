---
type: logica
status: activo
relacionado_con:
  - entidad_worker.md
  - logica_estimacion.md
---
# Lógica: Patrón de Disponibilidad e Hidratación

La disponibilidad de un trabajador para asumir nuevas tareas no depende únicamente de su horario (`schedule`), sino también de su nivel de concurrencia actual. Este cálculo se basa principalmente en la propiedad `busyUntil`.

> **Nota de demo:** la simulación aleatoria de carga en `js/workers.js` es **solo presentación**. No representa una cola real ni persistencia de asignaciones; es un mecanismo para demostrar visualmente el semáforo de disponibilidad. La fuente de verdad de un entorno real sería una cola de tareas persistente, que está fuera del alcance de la demo.

## Hidratación de Estado Semántico

Al cargar los datos de los trabajadores desde la base de datos, el sistema de UI aplica una heurística sobre el campo de texto descriptivo `status` si la propiedad `busyUntil` no está definida o ya pertenece al pasado (implementado en `js/app.js`).

Se añaden minutos de ocupación de forma predeterminada según la palabra clave que contenga el estado:

- **"Saturado"**: + 48 horas (2880 min).
- **"Cola media"**: + 24 horas (1440 min).
- **"Ocupado"**: + 4 horas (240 min).
- **"Reunión" o "Reunion"**: + 1 hora (60 min).
- **Otros (ej. "Guardia")**: + 0 minutos (Considerado Libre / Disponible).

## Concurrencia al Asignar Tareas

Cuando el usuario procede a calcular la fecha final de una tarea (en `window.updateCalculation`), el sistema define el verdadero instante de inicio (línea base) comparando el momento actual contra el momento de desocupación del trabajador:

- **`realStart = Max(Now, Worker.busyUntil)`**

Esto garantiza que las nuevas tareas se encolen después del trabajo previamente asignado sin solaparse.
