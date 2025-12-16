# 🔮 Calculadora de Estimación "Aurora"

¡Bienvenido/a! Estás ante la **Calculadora Aurora**, una pequeña pero potente herramienta web diseñada para calcular cuándo estará lista una tarea basándose en los horarios reales de tu equipo.

Este proyecto ha sido diseñado con mucho mimo (y una filosofía *Mobile-First* muy estricta) para que funcione genial tanto en tu móvil como en tu ordenador.

---

## 🚀 ¿Qué hace esto?

Imagina que tienes una tarea que dura **8 horas**.
Y se la asignas a **Ana**, que trabaja de 9:00 a 17:00, pero hoy ya son las 15:00.
¿Cuándo terminará Ana?

La calculadora no solo suma 8 horas al reloj. Tiene en cuenta:
1.  **Horarios de turno**: Si Ana sale a las 17:00, la tarea se pausa y continúa mañana a las 9:00.
2.  **Fines de semana**: Si mañana es sábado y Ana no trabaja, salta al lunes.
3.  **Festivos**: ¡Sí, también sabe cuándo es Navidad!

### ✨ Nuevas Funcionalidades "Real World" (v2.1)
El sistema ahora es más inteligente y tiene en cuenta la carga de trabajo real:

*   **Colas de Trabajo (Simulado)**: Al cargar la página, se simula que algunos trabajadores están ocupados (hasta unas horas o incluso días).
*   **Semáforo de Disponibilidad**: Verás de un vistazo quién está libre (🟢), ocupado (🟡/🟠) o saturado (🔴).
*   **Fecha de Inicio Efectiva**: Si pides algo pero el trabajador está ocupado, la calculadora te dirá exactamente *cuándo* empezará realmente (Ej: "Comienza: Mañana a las 09:00").

---

## 👶 Para Principiantes: ¿Cómo lo uso?

¡Es súper fácil! No necesitas instalar nada complicado.

1.  **Descarga** este código.
2.  Busca el archivo `index.html`.
3.  Haz **doble clic** en él.
4.  ¡Ya está! Se abrirá en tu navegador (Chrome, Firefox, Edge...).

### ¿Quieres cambiar cosas?
*   **Colores y Diseño**: Todo el estilo visual está en `index.html`. Usamos **Tailwind CSS** (vía CDN), así que verás muchas clases tipo `text-blue-500` o `p-4`. ¡Prueba a cambiarlas!
*   **Textos**: Busca cualquier texto en el `index.html` y cámbialo por lo que quieras.

---

## 🤓 Para Nivel Medio: ¿Cómo funciona por dentro?

Todo el código Javascript está organizado en la carpeta `js/`.

### 1. La Base de Datos (`js/workers.js`)
Define un objeto global `WorkerDatabase` con los datos de los trabajadores.
```javascript
"A101": {
    name: "Ana Martínez",
    schedule: { ... } // Sus turnos
}
```

### 2. El Motor de Tiempo (`js/estimator.js`)
Aquí vive la lógica pura, encapsulada en `AuroraEstimator`.
*   Es independiente del DOM.
*   **Calcula Fecha Efectiva**: Detecta cuándo empieza realmente el trabajo tras saltar colas o tiempos no laborables.
*   Contiene la función `calculate(startDate, duration, worker)`.
*   Gestiona los turnos, festivos y saltos de día.

### 3. La Interfaz (`js/app.js`)
Es el controlador que conecta todo.
*   Lee los inputs del usuario.
*   Muestra/Oculta elementos (efecto Bento).
*   Llama a `AuroraEstimator.calculate` para obtener resultados.

---

## 🎨 Estructura de Archivos

*   `index.html`: La estructura y diseño (HTML + Tailwind CSS).
*   `js/`: Carpeta con todo el código Javascript.
    *   `estimator.js`: Lógica de negocio pura (Cálculos de tiempo).
    *   `workers.js`: Datos de los empleados.
    *   `app.js`: Lógica de la interfaz de usuario.
*   `README.md`: Este manual.

---

¡Disfruta trasteando con el código! 
Si rompes algo, no te preocupes, para eso está `Ctrl + Z`. 😉
