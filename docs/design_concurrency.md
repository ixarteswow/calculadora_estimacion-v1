# Diseño Técnico: Gestión de Concurrencia y Disponibilidad

Este documento detalla la lógica teórica e implementación para añadir gestión de colas de trabajo y detección de inicio efectivo a la Calculadora Aurora.

## 1. Detección del "Effective Start Date" (Fecha de Inicio Real)

**El Problema:**
Actualmente, la función `calculate` recibe una fecha de inicio (`now`), y si cae en fin de semana o fuera de horario, la función `jumpToNextShift` mueve el cursor hacia adelante internamente para empezar a restar minutos. Sin embargo, el sistema "pierde" esa información y no le dice al usuario: *"Oye, pediste esto el viernes a las 20:00, pero Ana no empezará realmente hasta el Lunes a las 9:00"*.

**La Solución Lógica:**
Debemos capturar el momento exacto en que el "cursor" entra por primera vez en un turno válido antes de empezar a consumir tiempo de la tarea.

**Algoritmo Propuesto:**
1.  Recibir `requestedDate` (Ahora o fin de cola).
2.  Validar si `requestedDate` es laborable (`isWorkDay`).
3.  Si NO es laborable, o es tarde, aplicar `jumpToNextShift`.
4.  Si es temprano (antes del turno), mover `requestedDate` al inicio del turno (`startHour`).
5.  **Guardar este nuevo valor como `effectiveStartDate`**.
6.  Realizar el cálculo de duración habitual.
7.  Retornar: `{ finishDate: ..., effectiveStartDate: ..., events: ... }`.

## 2. Gestión de Concurrencia (Colas de Trabajo)

**El Problema:**
Actualmente asumimos que el trabajador está libre AHORA (`new Date()`). En la realidad, el trabajador puede tener tareas acumuladas hasta el martes.

**La Solución Lógica:**
Cada trabajador necesita un atributo de estado que nos diga cuándo termina su "Pila de tareas actual". Llamaremos a este atributo `busyUntil` (Ocupado Hasta).

**Lógica de Cálculo:**
`Fecha de Inicio de Cálculo = MAX(Ahora, Worker.busyUntil)`

*   Caso A: Worker libre. `busyUntil` es pasado o nulo. -> Empezamos "Ahora".
*   Caso B: Worker ocupado. `busyUntil` es futuro (ej. Mañana 15:00). -> La nueva tarea se "encola" y empieza Mañana 15:00.

**Simulación (Mock Data):**
Para simular esto en `workers.js` sin un backend real, generaremos un `busyUntil` aleatorio al cargar la página o definiremos la propiedad en el JSON estático.

Ejemplo JSON extendido (`js/workers.js`):
```javascript
"A101": {
    ...,
    "busyUntil": "2023-10-27T14:00:00.000Z" // Fecha ISO simulada
}
```

## 3. Visualización de Disponibilidad (Semáforo)

Para mostrar de forma intuitiva cuán ocupado está un trabajador, comparamos `busyUntil` con `Ahora`.

**Reglas del Semáforo:**

*   **🟢 Verde (Libre/Casi Libre):**
    *   Condición: `busyUntil <= Ahora` O `busyUntil < Ahora + 2 horas`.
    *   Significado: Puede empezar la tarea hoy mismo, casi de inmediato.
*   **🟡 Amarillo (Ocupado hoy):**
    *   Condición: `busyUntil < Ahora + 24 horas`.
    *   Significado: Termina lo que tiene hoy o mañana temprano.
*   **🟠 Naranja (Cola moderada):**
    *   Condición: `busyUntil < Ahora + 48 horas`.
    *   Significado: Tiene trabajo para un par de días.
*   **🔴 Rojo (Saturado):**
    *   Condición: `busyUntil >= Ahora + 48 horas`.
    *   Significado: Su cola de trabajo es larga, la tarea tardará en empezar.

## 4. Resumen de Implementación

1.  **Modificar `js/workers.js`**: Añadir función para generar `busyUntil` aleatorio al iniciar.
2.  **Actualizar `js/estimator.js`**:
    *   Modificar `calculate` para aceptar `startDate` (que ya no será siempre `now`).
    *   Implementar lógica de retorno de `effectiveStartDate`.
3.  **Actualizar `js/app.js`**:
    *   Calcular el "Semáforo" al cargar/seleccionar el trabajador.
    *   Determinar el `startDate` real (`Math.max(now, worker.busyUntil)`).
    *   Pasar este `startDate` al estimador.
    *   Mostrar en la UI: "Comienza: [EffectiveStartDate] -> Termina: [FinishDate]".
