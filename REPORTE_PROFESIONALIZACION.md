# Auditoría técnica — Demo Calculadora Aurora

**Fecha:** 2026-08-01  
**Alcance acordado:** demo local con datos ficticios. Este informe evalúa únicamente la estructura, el código base y la fiabilidad del motor de estimación. Quedan fuera, de forma deliberada, autenticación, permisos, persistencia real de asignaciones, endurecimiento de producción y operaciones.

## Conclusión

La demo parte de una base adecuada: es pequeña, se entiende rápido y el motor está separado del DOM. No necesita framework, backend adicional, TypeScript, Vite, migraciones ni una arquitectura por capas. Añadirlos ahora sería sobreingeniería.

El cambio prioritario es muy concreto: **blindar y probar `AuroraEstimator` antes de refactorizar la interfaz**. El motor resuelve los casos normales revisados, pero hoy acepta datos inválidos silenciosamente y puede no terminar ante un horario inválido. Eso sí afecta al propósito central de la demo.

## Estructura actual

```text
/
├── index.html                 # Marcado, estilos propios y carga de scripts
├── js/
│   ├── estimator.js           # Motor de cálculo: 97 líneas
│   ├── workers.js             # Datos ficticios y simulación de carga
│   ├── app.js                 # Estado, eventos y renderizado: 599 líneas
│   ├── supabase-client.js     # Adaptador temporal opcional
│   └── config.example.js
├── docs/knowledge/            # Reglas y decisiones de dominio
├── supabase/setup_workers.sql # Fixture temporal
└── scripts/generate-config.sh # Configuración de despliegue temporal
```

### Lo que ya está bien

- El motor está aislado en [js/estimator.js](js/estimator.js:1) y no accede al DOM. Es la decisión estructural más importante y se debe conservar.
- Los datos de ejemplo están fuera de la interfaz, en [js/workers.js](js/workers.js:1).
- La fuente remota es opcional: la demo funciona con datos locales si Supabase no está configurado.
- El repositorio es pequeño; hoy se puede mejorar con refactors cortos y pruebas, sin reescritura.
- La interfaz escapa los datos al construir el directorio, una práctica correcta que se debe mantener.

### Lo que conviene mejorar, sin ampliar el producto

| Prioridad | Cambio mínimo | Motivo |
|---|---|---|
| P0 | Validar entradas y horario dentro del motor. | Evita resultados falsos y bucles infinitos. |
| P0 | Añadir pruebas automatizadas del motor. | Permite refactorizar con confianza y demostrar que no hay regresiones. |
| P1 | Definir en documentación qué horarios soporta la demo. | Un comportamiento no soportado debe rechazarse, no interpretarse. |
| P1 | Reducir responsabilidades de `app.js`. | Con 599 líneas mezcla estado, directorio, cálculo y calendario. |
| P2 | Mover el CSS propio de `index.html` a un archivo. | Mejora lectura del HTML sin cambiar tecnología. |

## Revisión del motor de estimación

### Comportamiento correcto comprobado

Se ejecutaron comprobaciones locales sobre [js/estimator.js](js/estimator.js:50) con un trabajador de lunes a viernes, turno 09:00–17:00:

- Una tarea que cruza una jornada termina en el siguiente turno en la hora esperada.
- Un inicio en fin de semana se difiere al siguiente día laborable.
- Un inicio en un festivo configurado se difiere correctamente.
- Un inicio posterior al fin de turno se mueve al próximo turno.

La lógica principal —normalizar el inicio y consumir minutos dentro de los turnos— es simple y correcta para el alcance actual: **un único turno diurno por día, días laborables configurados y festivos explícitos**.

### Fallos reales a corregir

1. **Duraciones inválidas se aceptan como válidas.** `calculate()` solo comprueba que exista `worker.schedule`. Una duración negativa o `NaN` no entra en el bucle y devuelve la fecha inicial como si el cálculo fuese correcto. La ejecución local con `-60` minutos confirmó este resultado. Ver [js/estimator.js](js/estimator.js:50).

2. **Un horario inválido puede bloquear la interfaz.** Si `startHour:startMinute` es igual o posterior a `endHour:endMinute`, `timeUntilEnd` nunca es positivo. El bucle principal salta de día pero no reduce `minutesRemaining`, por lo que puede no terminar. Ver [js/estimator.js](js/estimator.js:77).

3. **El contrato del horario no se valida.** Faltan comprobaciones para `workDays` vacío, `holidays` ausente, horas/minutos fuera de rango y una fecha de inicio inválida. Por ejemplo, la llamada a `schedule.holidays.includes(...)` falla si `holidays` no existe. Ver [js/estimator.js](js/estimator.js:12).

4. **El límite de 365 días oculta un error.** Si no se encuentra un turno válido, `jumpToNextShift()` devuelve una fecha sin indicar que no se pudo calcular. Debe fallar explícitamente. Ver [js/estimator.js](js/estimator.js:28).

5. **La trazabilidad no coincide con la documentación.** [logica_estimacion.md](docs/knowledge/logica_estimacion.md:63) indica que se registran saltos durante el proceso; el código solo registra ciertos aplazamientos iniciales. Después la interfaz reduce cada evento a su primera palabra ([js/app.js](js/app.js:603)).

### Contrato mínimo recomendado

No hace falta soportar todavía zonas horarias múltiples, turnos nocturnos, varios intervalos al día ni pausas. Lo profesional para una demo es **definir que no se soportan** y rechazarlos de forma clara.

`calculate(startDate, durationMinutes, worker)` debe exigir:

- `startDate` es una fecha válida.
- `durationMinutes` es un número finito mayor que cero.
- `workDays` es un array no vacío de enteros entre 0 y 6.
- `holidays` es un array, aunque esté vacío.
- Horas entre 0 y 23, minutos entre 0 y 59.
- La hora de inicio es estrictamente anterior a la de fin; por ahora no hay turnos que crucen medianoche.

Para mantener el código simple, `calculate()` puede lanzar un `TypeError` o `RangeError` con un mensaje claro. `app.js` lo captura, muestra un error de cálculo y no presenta una fecha. No es necesario crear jerarquías de errores, resultados genéricos ni una biblioteca de fechas.

### Eventos: elegir una opción y documentarla

Hay dos opciones válidas; solo se debe implementar una:

1. **La más simple:** eliminar la promesa de una línea temporal detallada y mostrar únicamente inicio efectivo y fecha final.
2. **Si la línea temporal es una parte importante de la demo:** registrar cada salto como `{ reason, from, to }` y mostrar el motivo completo.

El estado actual —eventos incompletos y texto truncado— no aporta valor. No se recomienda añadir más tipos de eventos sin una necesidad visual concreta.

## Pruebas: la inversión mínima imprescindible

No se necesita Vitest, Playwright ni CI para empezar. Basta con el runner nativo de Node:

```text
package.json                    # script: "test": "node --test"
tests/estimator.test.js         # pruebas del motor
```

Para evitar una migración de módulos ahora, `estimator.js` puede conservar `window.AuroraEstimator` en el navegador y exponer además el mismo objeto mediante `module.exports` cuando exista `module`. Así el motor se prueba sin bundler y sin dependencia nueva.

Casos obligatorios:

1. Tarea contenida en un turno.
2. Inicio antes del turno.
3. Inicio después del turno.
4. Tarea que cruza una y varias jornadas.
5. Fin de semana y festivo.
6. Fecha exacta de cierre de turno.
7. `busyUntil` aplicado por `app.js` antes de llamar al motor.
8. Duración cero, negativa, `NaN` e infinita: deben fallar.
9. Horario inválido, `workDays` vacío y `holidays` ausente: deben fallar sin bloquearse.
10. Sin día disponible dentro del límite: debe fallar explícitamente.

Una vez que estos casos estén verdes, cualquier mejora de estructura será segura. La prueba del motor es más valiosa ahora que una prueba E2E de la interfaz.

## Código limpio con el mínimo de cambios

### `js/estimator.js`

- Mantenerlo como única fuente de la lógica de calendario.
- Extraer solo dos helpers claros: `validateSchedule(schedule)` y `jumpToNextShift(...)`.
- Usar constantes cuando no haya reasignación y nombres que expresen la intención.
- No añadir clases, patrones Strategy, inyección de dependencias ni abstracciones de calendarios: hay un único algoritmo y un único formato de horario.

### `js/app.js`

`app.js` es el único archivo que ya justifica una división, pero debe ser pequeña. Tras cubrir el motor con pruebas, separar en dos archivos es suficiente:

```text
js/app.js    # estado, inicio y listeners
js/ui.js     # render de perfil, resultado, directorio y calendario
```

No convertir la UI en componentes ni introducir un framework. Mantener un único objeto `state` y funciones de renderizado explícitas es adecuado para esta demo.

Limpiezas puntuales recomendadas:

- Sustituir los `onclick` globales de [index.html](index.html:431) por listeners registrados desde `app.js`.
- Reemplazar `location.reload()` por una función `reset()` que reinicie el estado y la interfaz.
- Eliminar mensajes `console.log` de trazado, comentarios duplicados y el dato de ejemplo con nombre de error técnico.
- Conservar el `escapeHtml()` existente para los datos que se insertan con `innerHTML`.

### HTML y estilos

`index.html` concentra estructura, CSS propio, configuración de Tailwind y carga de scripts. Para una demo no es grave, pero mover únicamente el bloque `<style>` propio a `css/aurora.css` hará el archivo más fácil de mantener. No hace falta introducir una cadena de compilación de Tailwind: el CDN es suficiente mientras el proyecto sea una demo.

La estructura objetivo mínima es:

```text
/
├── index.html
├── css/
│   └── aurora.css
├── js/
│   ├── estimator.js
│   ├── workers.js
│   ├── supabase-client.js       # opcional; no es parte del motor
│   ├── app.js
│   └── ui.js
├── tests/
│   └── estimator.test.js
└── docs/knowledge/
```

No crear `src/`, `domain/`, `services/`, `components/`, APIs ni capas adicionales hasta que haya una necesidad concreta.

## Ajustes mínimos de documentación

Los cuatro documentos de `docs/knowledge` ya contienen la base necesaria. No hace falta un sistema documental nuevo. Bastan estos cambios:

- En [entidad_worker.md](docs/knowledge/entidad_worker.md:36), declarar el formato válido y las limitaciones del horario de la demo.
- En [logica_estimacion.md](docs/knowledge/logica_estimacion.md:63), incluir una tabla de ejemplos que coincida con las pruebas automáticas.
- En [patron_disponibilidad.md](docs/knowledge/patron_disponibilidad.md:82), marcar la carga simulada como comportamiento de demo, no como una cola real.
- Si estos archivos definen el comportamiento oficial, sacarlos de `.gitignore`; si son solo notas privadas, el contrato mínimo del motor debe vivir junto a las pruebas.

También conviene actualizar los festivos ficticios: los de [js/workers.js](js/workers.js:1) son de 2024 y ya no demuestran el comportamiento de festivos en la demo actual.

## Plan de trabajo mínimo

### Paso 1 — Fiabilidad del motor

1. Crear las pruebas del motor con `node --test`.
2. Añadir validación de entrada y de `schedule`.
3. Hacer que los calendarios imposibles fallen de forma explícita.
4. Corregir o simplificar la funcionalidad de eventos.

### Paso 2 — Refactor protegido

1. Con las pruebas en verde, limpiar `estimator.js` sin cambiar resultados.
2. Extraer el renderizado de `app.js` a `ui.js` solo si sigue dificultando la lectura.
3. Sustituir handlers inline y el reset por eventos normales.
4. Mover CSS propio a `css/aurora.css`.

### Paso 3 — Cierre de la demo

1. Actualizar fixtures de trabajadores y festivos.
2. Alinear los cuatro documentos de conocimiento con los tests.
3. Verificar manualmente el flujo: seleccionar trabajador, duración, cálculo, festivo, fin de semana y datos locales.

## Pospuesto conscientemente

Estos elementos pueden ser correctos más adelante, pero no mejoran ahora el motor ni la limpieza de la demo:

- Autenticación, RLS, permisos, auditoría y persistencia de asignaciones.
- Rediseño de Supabase o esquema de datos definitivo.
- Backend, RPC, APIs, colas y concurrencia multiusuario.
- Framework de interfaz, TypeScript, Vite, Tailwind compilado o monorepo.
- Soporte de zonas horarias múltiples, turnos nocturnos, pausas y múltiples turnos diarios.
- CI/CD, observabilidad, analítica, pruebas E2E y pruebas de carga.

La regla es sencilla: si no protege el cálculo actual, no reduce la complejidad actual o no mejora de forma directa la demo visible, se difiere.

## Criterio de finalización

La demo estará técnicamente sólida cuando:

- El motor rechace cualquier entrada u horario inválido sin colgarse ni inventar fechas.
- Los diez casos de prueba del motor pasen de forma repetible.
- El comportamiento documentado sea exactamente el que prueban los tests.
- `app.js` sea un orquestador legible y el HTML no contenga lógica de aplicación.
- La estructura siga siendo pequeña y no incorpore dependencias o capas sin uso actual.
