---
type: arquitectura
status: activo
relacionado_con:
  - entidad_worker.md
---
# Arquitectura: Fuente de Datos Mixta

El proyecto adopta un enfoque de **Mejora Progresiva (Progressive Enhancement)** en la capa de datos para garantizar resiliencia y funcionamiento offline o en entornos no configurados.

## Flujo de Inicialización

1. **Base de Datos Local (Fallback Activo)**:
   En `js/workers.js` se define estáticamente un objeto `window.WorkerDatabase` que contiene datos de muestra. También incluye un mecanismo de simulación (`simulateWorkloads()`) que asigna aleatoriamente periodos de ocupación a estos trabajadores para fines de demostración cuando se trabaja localmente.

2. **Sincronización con Supabase (Online)**:
   Si el cliente de Supabase (`window.SupabaseClient` en `js/supabase-client.js`) logra inicializarse utilizando las credenciales globales, la aplicación web (`js/app.js`) realiza una llamada a `fetchWorkers()`. 
   
   Si la consulta es exitosa:
   - Se reemplaza la base de datos en memoria `WorkerDatabase` con la información obtenida.
   - La interfaz se actualiza (indicador "ONLINE").

3. **Manejo de Errores y Degradación Elegante**:
   Si falla la conexión a Supabase, hay problemas de red, o si no se detectan credenciales, el cliente maneja silenciosamente el error y se notifica al usuario con un indicador "OFFLINE (Local)". El sistema sigue plenamente funcional utilizando los datos locales, lo que evita disrupciones en la experiencia del usuario.

## Autoridad del motor de cálculo

Supabase es una **fuente de datos opcional**, no una autoridad de cálculo: el motor (`js/estimator.js`) no conoce Supabase ni consultas remotas. La validación del horario y el cálculo de fechas se aplican por igual a datos locales o remotos — cualquier registro de Supabase que no cumpla el contrato de `schedule` (ver `entidad_worker.md`) será rechazado con un error explícito por el motor.
