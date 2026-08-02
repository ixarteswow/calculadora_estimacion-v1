# Plan de mejora técnica — Demo Calculadora Aurora

**Objetivo:** convertir la demo actual en una pieza técnicamente fiable, legible y fácil de mantener, sin ampliar su alcance funcional ni incorporar infraestructura prematura.

**Principio rector:** cada cambio debe proteger el cálculo actual, reducir complejidad existente o mejorar directamente la claridad de la demo. Si no cumple al menos una de esas condiciones, se pospone.

## 1. Alcance y límites

### Resultado esperado

Al finalizar, Aurora seguirá siendo una web estática que funciona al abrir `index.html`, usa trabajadores ficticios y puede conectarse opcionalmente a Supabase temporal. La diferencia será que su motor rechaza entradas inválidas de forma predecible, está cubierto por pruebas repetibles y el código de interfaz estará mejor delimitado.

### Incluido

- Validación robusta del motor de fechas.
- Pruebas automatizadas sin dependencias externas.
- Contrato explícito de horarios soportados por la demo.
- Refactor pequeño de `app.js`, protegido por las pruebas del motor.
- Separación del CSS propio de `index.html`.
- Limpieza localizada de nombres, comentarios, datos ficticios y manejadores globales.

### Excluido deliberadamente

- Cambios de modelo de datos, persistencia de tareas, concurrencia real o rediseño de Supabase.
- Autenticación, permisos, seguridad de producción, API, backend o Edge Functions.
- Frameworks de UI, TypeScript, Vite, bundlers, Tailwind compilado, CI/CD y pruebas E2E.
- Soporte de múltiples zonas horarias, turnos nocturnos, pausas o múltiples intervalos diarios.
- Rediseño visual, nuevas pantallas o funcionalidades.

### Reglas de decisión (YAGNI)

1. Mantener JavaScript clásico y carga por scripts: preserva el funcionamiento con `file://` y evita migraciones sin valor actual.
2. Añadir un único archivo solo cuando reduzca una responsabilidad ya existente y claramente identificable.
3. No crear interfaces, clases, servicios o configuraciones para variantes que la demo no usa.
4. No refactorizar una zona sin pruebas que cubran su comportamiento importante.
5. Preferir funciones pequeñas y explícitas a abstracciones reutilizables hipotéticas.

## 2. Arquitectura objetivo mínima

```text
/
├── index.html
├── css/
│   └── aurora.css              # CSS propio; Tailwind CDN permanece igual
├── js/
│   ├── estimator.js            # Motor puro + validación
│   ├── workers.js              # Datos y carga simulada de demo
│   ├── supabase-client.js      # Adaptador opcional, sin lógica de cálculo
│   ├── ui.js                   # Renderizado y utilidades de presentación
│   ├── app.js                  # Estado, eventos, coordinación y cálculo
│   └── config.example.js
├── tests/
│   └── estimator.test.js       # Pruebas del motor con node:test
├── docs/knowledge/
│   ├── arquitectura_datos.md
│   ├── entidad_worker.md
│   ├── logica_estimacion.md
│   └── patron_disponibilidad.md
├── package.json                # Solo scripts de verificación, sin dependencias
└── PLAN_MEJORAS_DEMO.md
```

`ui.js` es el único archivo nuevo de aplicación previsto. Si la extracción no reduce de forma evidente el tamaño y la carga cognitiva de `app.js`, se detiene y se mantiene un único archivo de interfaz bien ordenado.

## 3. Orden de ejecución y dependencias

| Fase | Prioridad | Dependencia | Resultado verificable |
|---|---|---|---|
| 0. Contrato | P0 | Ninguna | Comportamiento soportado e inválido definido antes de modificar algoritmo. |
| 1. Harness de pruebas | P0 | Fase 0 | `npm test` o `node --test` ejecuta casos deterministas del motor. |
| 2. Validación del motor | P0 | Fase 1 | Entradas inválidas fallan explícitamente; no hay bucles infinitos. |
| 3. Trazabilidad y documentación | P1 | Fase 2 | Eventos y documentos describen exactamente lo que el motor hace. |
| 4. Refactor de interfaz | P1 | Fases 1–2 en verde | `app.js` conserva la coordinación; renderizado aislado si aporta claridad. |
| 5. CSS y limpieza | P2 | Fase 4 | HTML más legible, mismo aspecto y flujo manual validado. |
| 6. Cierre | P0–P2 | Todas | Pruebas, revisión y checklist de demo aprobados. |

No se inicia una fase si el criterio de salida de la anterior no se cumple.

---

## 4. Fase 0 — Contrato del motor (P0)

### Propósito

Eliminar ambigüedades antes de cambiar código. La demo debe ser estricta con lo que acepta en lugar de intentar interpretar formatos que no soporta.

### Decisiones a fijar

1. **Zona de cálculo:** hora local del navegador. No se añade una librería de fechas ni configuración de zona horaria.
2. **Turno:** un único intervalo diurno por trabajador y día; la hora de inicio es estrictamente anterior a la de fin.
3. **Días laborables:** array no vacío de enteros `0..6` (`0` domingo).
4. **Festivos:** array de fechas locales en formato `YYYY-MM-DD`; se acepta un array vacío.
5. **Duración:** número finito de minutos, mayor que cero. La UI continuará introduciendo horas enteras, aunque el motor admite minutos enteros.
6. **Calendario imposible:** se considera error si no se encuentra un turno válido dentro del límite de búsqueda documentado.
7. **Turnos no soportados:** nocturnos, con pausa, varios intervalos al día o zonas distintas. Deben rechazarse con un error claro, no producir una estimación aproximada.

### Entregables

- Actualización de [entidad_worker.md](docs/knowledge/entidad_worker.md:36) con el contrato de `schedule` de la demo.
- Actualización de [logica_estimacion.md](docs/knowledge/logica_estimacion.md:63) con entradas válidas, errores y ejemplos concretos.
- Tabla de escenarios esperados que será la fuente de las pruebas de la Fase 1.

### Criterio de salida

No queda ninguna regla del motor que dependa de interpretación implícita. Los horarios no soportados están descritos como errores, no como trabajo pendiente.

---

## 5. Fase 1 — Harness y pruebas del motor (P0)

### Propósito

Crear una red de seguridad mínima antes de modificar el algoritmo. No se añade un framework de testing.

### Cambios de estructura

1. Crear `package.json` con un único script:

   ```json
   {
     "private": true,
     "scripts": {
       "test": "node --test tests/estimator.test.js"
     }
   }
   ```

2. Crear `tests/estimator.test.js` usando `node:test` y `node:assert/strict`.
3. Exponer el mismo objeto `AuroraEstimator` para navegador y Node, sin migrar a módulos ES:
   - Navegador: `window.AuroraEstimator = AuroraEstimator`.
   - Node: `module.exports = AuroraEstimator` protegido por `typeof module !== 'undefined'`.

No se añaden dependencias a `package.json`.

### Diseño de fixtures

- Crear una función local `makeWorker(overrides)` dentro del fichero de pruebas.
- Usar siempre fechas constructoras locales (`new Date(año, mes, día, hora, minuto)`) para no introducir ambigüedad de ISO/UTC en los tests.
- No reutilizar `workers.js`: contiene carga aleatoria, que es apropiada para la demo visual pero no para pruebas deterministas.

### Matriz obligatoria de pruebas

| ID | Escenario | Resultado esperado |
|---|---|---|
| T01 | Tarea dentro del turno | Finaliza el mismo día tras la duración exacta. |
| T02 | Inicio antes del turno | Empieza a la hora de entrada y termina correctamente. |
| T03 | Inicio justo a la hora de salida | Salta al siguiente turno válido. |
| T04 | Inicio después de la salida | Salta al siguiente turno válido. |
| T05 | Duración que cruza una jornada | Consume el tiempo restante y continúa al día siguiente. |
| T06 | Duración que cruza varias jornadas | Descuenta cada turno completo sin perder ni duplicar minutos. |
| T07 | Inicio en fin de semana | Salta al próximo día configurado como laborable. |
| T08 | Inicio en festivo | Salta al siguiente día laborable no festivo. |
| T09 | Festivos consecutivos | Omite todos los días bloqueados. |
| T10 | `durationMinutes` igual a `0` | Lanza error de validación. |
| T11 | Duración negativa, `NaN` o infinita | Lanza error de validación. |
| T12 | Fecha de inicio inválida | Lanza error de validación. |
| T13 | `workDays` vacío o fuera de rango | Lanza error de validación. |
| T14 | `holidays` ausente o malformado | Lanza error de validación. |
| T15 | Hora/minuto fuera de rango | Lanza error de validación. |
| T16 | Inicio de turno igual o posterior al fin | Lanza error de validación sin bloquear la ejecución. |
| T17 | Calendario que no ofrece ningún turno | Lanza error explícito al alcanzar el límite de búsqueda. |
| T18 | Eventos, si se conservan | Coinciden exactamente con el contrato elegido en Fase 3. |

### Validación de fase

```powershell
npm test
```

Todos los casos se ejecutan de forma determinista y la ejecución termina incluso cuando el fixture es inválido.

### Criterio de salida

La rama de trabajo tiene una batería roja inicial que demuestra los fallos detectados (`T10`, `T11`, `T16`) y una forma repetible de volverla a ejecutar tras cada cambio.

---

## 6. Fase 2 — Validación y corrección del motor (P0)

### Propósito

Corregir los fallos sin modificar los resultados válidos que ya ofrece la demo.

### Secuencia de implementación

1. **Crear `validateDate(startDate)`.**
   - Convierte o comprueba la fecha de entrada según el contrato elegido.
   - Rechaza `Invalid Date` mediante `Number.isNaN(date.getTime())`.

2. **Crear `validateDuration(durationMinutes)`.**
   - Requiere `Number.isFinite(durationMinutes)` y `durationMinutes > 0`.
   - Decide explícitamente si se permiten fracciones; para la demo se recomienda requerir enteros con `Number.isInteger`.

3. **Crear `validateSchedule(schedule)`.**
   - Comprueba tipo objeto, `workDays`, `holidays`, horas y minutos.
   - Verifica que los días están entre `0` y `6` y que existe al menos uno.
   - Verifica `start < end` usando minutos desde medianoche.
   - Devuelve el mismo `schedule` validado; no crea una capa de modelos.

4. **Ejecutar validación al principio de `calculate()`.**
   - Todo cálculo válido conserva la forma actual de retorno: `finishDate`, `effectiveStartDate`, `events`.
   - Todo cálculo inválido lanza `TypeError` o `RangeError` con mensaje breve y estable.

5. **Endurecer `jumpToNextShift()`.**
   - Mantener un límite explícito, por ejemplo 366 días.
   - Si no aparece un turno válido, lanzar `RangeError('No se encontró un turno disponible')`.
   - Nunca devolver una fecha sin saber si es laborable.

6. **Evitar bucles sin progreso.**
   - Tras validar que cada turno tiene duración positiva, cada iteración del bucle principal debe reducir `minutesRemaining` o finalizar.
   - Mantener una protección defensiva adicional de iteraciones solo si no complica la lógica; la validación de horario es la protección principal.

7. **Adaptar `app.js` al contrato de errores.**
   - Rodear exclusivamente la llamada a `AuroraEstimator.calculate(...)` con `try/catch`.
   - Mostrar un mensaje de error de cálculo junto al resultado vacío.
   - No cambiar el estado del trabajador, la duración ni los datos ficticios cuando falle el cálculo.

### Reglas de no regresión

- No mover la lógica de calendario a `app.js`.
- No añadir lógica de Supabase al motor.
- No alterar la forma de los objetos `worker` válidos.
- No usar fechas aleatorias ni el reloj actual dentro de las pruebas del motor.

### Validación de fase

1. Ejecutar `npm test` hasta que `T01`–`T17` estén verdes.
2. Ejecutar manualmente la demo con una duración válida y un trabajador válido.
3. Comprobar en la interfaz que un horario inválido configurado para una fixture muestra error y no congela el navegador.

### Criterio de salida

No se puede obtener una fecha de finalización para entradas inválidas, ni existe una ruta conocida que pueda mantener el `while` del motor sin progreso.

---

## 7. Fase 3 — Trazabilidad y documentación alineadas (P1)

### Decisión obligatoria sobre eventos

Antes de tocar la UI, elegir una sola alternativa:

| Alternativa | Cuándo elegirla | Implementación mínima |
|---|---|---|
| Eliminar eventos | La demo solo necesita fecha de inicio efectivo y fecha final. | Eliminar la línea temporal de interfaz y la promesa documental. |
| Conservar eventos | La explicación de los saltos es una parte visible de la demo. | Registrar mensajes completos al diferir inicio y al agotar cada turno; mostrar el mensaje completo. |

**Recomendación:** conservarlos, porque ya son parte visible del resultado, pero limitar el contrato a mensajes simples y ordenados. No crear tipos de evento, analítica ni historial persistente.

### Implementación si se conservan

1. Registrar un evento cuando se salta por día no laborable/festivo.
2. Registrar un evento cuando se difiere por final de turno.
3. Registrar un evento cada vez que se agota una jornada al consumir una tarea larga.
4. Actualizar `effectiveStartDate` únicamente durante la normalización inicial; los eventos posteriores no deben modificarlo.
5. Sustituir `evt.msg.split(' ')[0]` en [js/app.js](js/app.js:603) por el texto completo con `textContent`.
6. Cubrir con `T18` los eventos elegidos y su orden.

### Documentación a modificar

- [entidad_worker.md](docs/knowledge/entidad_worker.md:36): formato válido de `schedule` y limitaciones explícitas.
- [logica_estimacion.md](docs/knowledge/logica_estimacion.md:63): algoritmo, errores y ejemplos que corresponden con `T01`–`T18`.
- [patron_disponibilidad.md](docs/knowledge/patron_disponibilidad.md:82): marcar la simulación de `busyUntil` como presentación de demo.
- [arquitectura_datos.md](docs/knowledge/arquitectura_datos.md:7): confirmar que Supabase no forma parte de la autoridad del motor.

### Criterio de salida

Todo texto de los documentos de conocimiento se puede relacionar con un comportamiento de código y, cuando es relevante para cálculo, con una prueba concreta.

---

## 8. Fase 4 — Refactor mínimo de `app.js` (P1)

### Propósito

Reducir la mezcla de responsabilidades sin cambiar el flujo ni introducir un framework.

### Responsabilidad final de cada archivo

| Archivo | Debe contener | No debe contener |
|---|---|---|
| `estimator.js` | Validación y calendario. | DOM, `Date.now()`, datos ficticios, Supabase. |
| `workers.js` | Fixtures y simulación visual de carga. | Renderizado o reglas de calendario. |
| `supabase-client.js` | Lectura opcional y adaptación mínima de datos. | Heurísticas de interfaz o cálculo. |
| `app.js` | Estado, inicialización, listeners y coordinación de cálculo. | Plantillas largas, creación de tabla o calendario. |
| `ui.js` | Render de perfil, resultado, directorio, calendario y estado visual. | Reglas del estimador, consultas remotas o estado de negocio. |

### Secuencia segura

1. No iniciar hasta que la Fase 2 esté verde.
2. Identificar en `app.js` funciones de presentación: perfil, directorio, popover, resultado, calendario y píldora de conexión.
3. Extraer esas funciones a una única IIFE `window.AuroraUi` en `js/ui.js`; esta mantiene el estilo global actual y el soporte `file://`.
4. Pasar datos y referencias DOM explícitamente a las funciones de UI; evitar que `ui.js` lea `WorkerDatabase` de forma implícita.
5. Mantener `state`, la carga local/remota y todos los listeners en `app.js`.
6. Añadir `js/ui.js` antes de `js/app.js` en `index.html`.
7. Revisar manualmente cada interacción al terminar cada extracción, no al final de toda la refactorización.

### Limpiezas incluidas

- Sustituir los atributos `onclick` de [index.html](index.html:431) por listeners en `app.js`.
- Reemplazar `location.reload()` por una función `reset()` que restaure el estado inicial y vuelva a renderizar.
- Eliminar comentarios repetidos y trazas de depuración que ya no aporten diagnóstico.
- Renombrar progresivamente `WorkerDatabase` a `workerDatabase` solo si se puede hacer en un cambio mecánico, acotado y cubierto por verificación manual; si no, aplazar el renombre.
- Reemplazar el nombre ficticio técnico “Falla la conexión Supabase” por un trabajador de demostración neutro.

### Límites de la fase

- No usar módulos ES: alterarían el comportamiento actual al abrir el archivo directamente.
- No crear componentes, store, router, hooks ni capa de servicios.
- No dividir `ui.js` en más archivos salvo que supere claramente una responsabilidad única; el objetivo es reducir archivos complejos, no multiplicarlos.

### Checklist manual de regresión

1. Carga local sin `config.js` válido.
2. Selección de trabajador por ID.
3. Apertura, búsqueda, filtro, teclado y selección del directorio.
4. Duraciones predeterminadas y personalizada.
5. Cálculo válido, reset y nuevo cálculo.
6. Resultado de inicio efectivo, eventos elegidos y calendario.
7. Actualización opcional de datos remotos, si se configura Supabase temporal.

### Criterio de salida

`app.js` permite ver de un vistazo el estado, los listeners y el orden del cálculo. Las funciones que generan HTML o actualizan la vista viven en `ui.js`, sin cambio observable de comportamiento.

---

## 9. Fase 5 — CSS y limpieza de archivos (P2)

### Objetivo

Mejorar la lectura de `index.html` sin transformar el sistema visual existente.

### Tareas

1. Crear `css/aurora.css`.
2. Mover únicamente el contenido del bloque `<style>` propio a ese archivo.
3. Añadir `<link rel="stylesheet" href="css/aurora.css">` en `index.html`.
4. Mantener temporalmente el bloque `tailwind.config` inline: es parte de la configuración del CDN y moverlo no mejora la demo sin introducir build.
5. Agrupar las reglas CSS por: variables, fondo, utilidades, controles de duración y directorio.
6. Eliminar reglas sin uso solo después de confirmarlo mediante búsqueda y comprobación visual.

### Validación de fase

- Abrir la demo en vista móvil y escritorio.
- Comparar cabecera, tarjetas, selector de duración, directorio, resultado y calendario con el estado previo.
- Comprobar que no existen errores de carga para `css/aurora.css`.

### Criterio de salida

`index.html` contiene estructura y referencias de recursos, no cientos de líneas de CSS propio; la apariencia no cambia de forma intencionada.

---

## 10. Fase 6 — Cierre y criterio de calidad

### Verificación final

1. Ejecutar `npm test` desde un directorio limpio del proyecto.
2. Abrir la demo sin configuración externa y repetir el checklist manual de Fase 4.
3. Revisar los cambios de archivos para asegurar que no se añadieron dependencias, capas o configuraciones no justificadas.
4. Comparar los escenarios de `docs/knowledge` con la batería de pruebas.
5. Revisar el código con estas preguntas:
   - ¿Cada función tiene una responsabilidad clara?
   - ¿El motor es el único lugar que decide una fecha?
   - ¿Un dato inválido produce error antes de calcular?
   - ¿Puede una iteración del motor continuar sin reducir trabajo pendiente?
   - ¿Se añadió algo que la demo no usa hoy?

### Definition of Done

- `npm test` pasa con todos los escenarios `T01`–`T18` aplicables.
- Las entradas inválidas no devuelven fechas de finalización y no bloquean la página.
- Los resultados válidos existentes se conservan.
- El contrato de horarios y eventos está documentado y coincide con las pruebas.
- `app.js` orquesta; el renderizado está aislado solo hasta el nivel que aporta claridad.
- El CSS propio está separado y el diseño se mantiene.
- No se han introducido dependencias externas ni trabajo de producción no solicitado.

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Un refactor altera cálculos correctos. | Primero crear pruebas de casos válidos y ejecutarlas tras cada cambio. |
| La validación rompe fixtures existentes. | Corregir el fixture o documentar su limitación; no relajar validaciones para conservar datos erróneos. |
| `ui.js` añade más complejidad que la que elimina. | Extraer una función o grupo visual cada vez; revertir la extracción si no reduce responsabilidad. |
| El comportamiento con `file://` deja de funcionar. | Mantener scripts clásicos y comprobar la apertura directa en el checklist. |
| Los festivos no se aprecian porque son fechas de 2024. | Actualizar fixtures a fechas de demostración vigentes y mantener fechas fijas en pruebas. |

## 12. Secuencia recomendada de sesiones

| Sesión | Trabajo | Resultado |
|---|---|---|
| 1 | Fases 0 y 1 | Contrato aprobado, runner nativo y tests iniciales. |
| 2 | Fase 2 | Motor validado, sin bucles conocidos y tests verdes. |
| 3 | Fase 3 | Eventos y documentación alineados. |
| 4 | Fase 4 | UI ordenada, sin handlers inline y flujo manual estable. |
| 5 | Fases 5 y 6 | CSS separado, revisión final y demo técnicamente cerrada. |

No se comienza una sesión posterior dejando pruebas fallidas en la anterior.
