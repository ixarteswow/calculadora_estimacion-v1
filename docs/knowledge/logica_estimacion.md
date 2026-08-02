---
type: logica
status: activo
relacionado_con:
  - entidad_worker.md
  - patron_disponibilidad.md
---
# Lógica: Cálculo de Estimaciones (AuroraEstimator)

El motor principal de cálculo de tiempos está encapsulado en el módulo `AuroraEstimator` (`js/estimator.js`). Este módulo se encarga de proyectar una duración de trabajo sobre el calendario real del trabajador.

## Reglas Funcionales

1. **Fecha de Inicio Efectiva**: El cálculo inicia determinando cuándo el trabajador puede empezar realmente la tarea. Si la fecha de inicio propuesta cae fuera del turno del trabajador, el inicio se difiere al próximo bloque hábil de trabajo.
2. **Turnos y Días Laborables**: El motor consulta la propiedad `schedule` del trabajador (`workDays`, `startHour`, `endHour`) y verifica que el día no esté en el arreglo `holidays`.
3. **Consumo de Tiempo por Bloques**:
   - La duración de la tarea (en minutos) se descuenta utilizando el tiempo disponible en el turno del día en curso.
   - Si la tarea excede el tiempo restante del turno actual, se consume todo el tiempo disponible hasta la hora de salida (`endHour`) y el cursor de tiempo salta (avanza) al inicio del siguiente turno hábil.
   - El proceso se repite hasta que el tiempo restante sea cero.
4. **Registro de Eventos (Trazabilidad)**: A medida que ocurren saltos de tiempo (por días festivos, fines de semana o fin de jornada), el algoritmo registra "eventos" que se muestran completos en la interfaz.

## API Principal
- `calculate(startDate, durationMinutes, worker)`: Devuelve un objeto con la fecha final proyectada (`finishDate`), la fecha de inicio ajustada (`effectiveStartDate`) y los eventos ocurridos (`events`).

## Contrato de errores (validación)

`calculate` **lanza** en lugar de devolver fechas falsas (cubierto por `T10`–`T17`):

| Error | Caso |
|---|---|
| `TypeError` | `startDate` no es una fecha válida |
| `TypeError` | `durationMinutes` no es entero positivo |
| `TypeError` | `worker.schedule` inválido (días, festivos, horas o minutos) |
| `RangeError` | Turno con inicio igual o posterior al fin |
| `RangeError` | No se encontró turno válido en 366 días de búsqueda |

`app.js` captura estos errores y los muestra en la interfaz sin congelar la página.

## Eventos producidos

| Mensaje | Cuándo | Test |
|---|---|---|
| `Inicio diferido: fuera de turno` | El inicio cae en día no laborable o festivo | `T18` |
| `Inicio diferido: turno acabado` | El inicio cae en o después de la hora de salida | `T18` |
| `Fin de jornada: continúa en el próximo turno` | La tarea agota un turno completo y continúa el siguiente día hábil | `T18` |

`effectiveStartDate` solo se actualiza durante la normalización inicial del inicio; los eventos posteriores no lo modifican.

## Ejemplos (coinciden con `tests/estimator.test.js`)

| Caso | Entrada | Resultado |
|---|---|---|
| Tarea dentro del turno | Mié 10:00, 120 min | Fin Mié 12:00 |
| Inicio antes del turno | Mié 07:00, 120 min | Inicio efectivo Mié 09:00, fin 11:00 |
| Inicio en fin de semana | Sáb 09:00, 60 min | Inicio efectivo Lun 09:00, fin 10:00 |
| Cruza una jornada | Mié 16:00, 120 min | Fin Jue 10:00 (1 evento de fin de jornada) |
| Tres jornadas completas | Mié 09:00, 1440 min | Fin Vie 17:00 (2 eventos de fin de jornada) |

Horario de referencia: L–V 09:00–17:00, semana del 2026-08-03.
