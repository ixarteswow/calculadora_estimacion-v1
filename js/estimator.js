const AuroraEstimator = (function() {

    const MAX_SEARCH_DAYS = 366;

    function getDayOfWeek(date) { return date.getDay(); }

    function formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- Validación de contrato (T-04 a T-06) ---

    function validateDate(startDate) {
        if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
            throw new TypeError('startDate debe ser una fecha válida');
        }
        return startDate;
    }

    function validateDuration(durationMinutes) {
        if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
            throw new TypeError('durationMinutes debe ser un entero positivo');
        }
        return durationMinutes;
    }

    function validateSchedule(schedule) {
        if (!schedule || typeof schedule !== 'object') {
            throw new TypeError('schedule es obligatorio');
        }
        const { workDays, holidays, startHour, startMinute, endHour, endMinute } = schedule;

        if (!Array.isArray(workDays) || workDays.length === 0 ||
            !workDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
            throw new TypeError('workDays debe ser un array no vacío de días entre 0 y 6');
        }
        if (!Array.isArray(holidays) ||
            !holidays.every((h) => typeof h === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h))) {
            throw new TypeError('holidays debe ser un array de fechas en formato YYYY-MM-DD');
        }
        const inRange = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
        if (!inRange(startHour, 0, 23) || !inRange(startMinute, 0, 59) ||
            !inRange(endHour, 0, 23) || !inRange(endMinute, 0, 59)) {
            throw new TypeError('horas (0-23) y minutos (0-59) fuera de rango');
        }
        if (startHour * 60 + startMinute >= endHour * 60 + endMinute) {
            throw new RangeError('el turno debe tener inicio anterior al fin');
        }
        return schedule;
    }

    // --- Lógica de calendario ---

    function isWorkDay(date, schedule) {
        const dayOfWeek = getDayOfWeek(date);
        const dateStr = formatDateISO(date);
        if (!schedule.workDays.includes(dayOfWeek)) return false;
        if (schedule.holidays.includes(dateStr)) return false;
        return true;
    }

    function getShiftConfig(date, schedule) {
        const start = new Date(date);
        start.setHours(schedule.startHour, schedule.startMinute, 0, 0);
        const end = new Date(date);
        end.setHours(schedule.endHour, schedule.endMinute, 0, 0);
        return { start, end };
    }

    /** Avanza al inicio del siguiente turno válido o lanza si no existe en el límite. */
    function jumpToNextShift(currentDate, schedule) {
        let nextDate = new Date(currentDate);
        for (let attempts = 0; attempts < MAX_SEARCH_DAYS; attempts++) {
            nextDate.setDate(nextDate.getDate() + 1);
            nextDate.setHours(0, 0, 0, 0);
            if (isWorkDay(nextDate, schedule)) {
                return getShiftConfig(nextDate, schedule).start;
            }
        }
        throw new RangeError('No se encontró un turno disponible dentro del límite de búsqueda');
    }

    /**
     * Calculates the finish date for a task.
     * @param {Date} startDate - The starting date/time.
     * @param {number} durationMinutes - Duration in minutes (positive integer).
     * @param {object} worker - The worker object (must contain .schedule).
     * @returns {object} Result object with { finishDate, effectiveStartDate, events }.
     * @throws {TypeError|RangeError} If any input is invalid.
     */
    function calculate(startDate, durationMinutes, worker) {
        validateDate(startDate);
        validateDuration(durationMinutes);
        if (!worker || typeof worker !== 'object') {
            throw new TypeError('worker es obligatorio');
        }
        validateSchedule(worker.schedule);

        let cursor = new Date(startDate);
        let minutesRemaining = durationMinutes;
        let events = [];
        let effectiveStartDate = new Date(cursor);

        // 1. Initial Check & Effective Start Date Logic
        if (!isWorkDay(cursor, worker.schedule)) {
            cursor = jumpToNextShift(cursor, worker.schedule);
            events.push({ type: 'jump', msg: 'Inicio diferido: fuera de turno' });
            effectiveStartDate = new Date(cursor);
        } else {
            const todayConfig = getShiftConfig(cursor, worker.schedule);
            if (cursor < todayConfig.start) {
                cursor = new Date(todayConfig.start);
                effectiveStartDate = new Date(cursor);
            } else if (cursor >= todayConfig.end) {
                cursor = jumpToNextShift(cursor, worker.schedule);
                events.push({ type: 'jump', msg: 'Inicio diferido: turno acabado' });
                effectiveStartDate = new Date(cursor);
            }
        }

        // 2. Consume Time
        // Invariante: cada turno tiene duración positiva (validado) y jumpToNextShift
        // siempre devuelve el inicio de un turno válido o lanza. No hay bucle sin progreso.
        while (minutesRemaining > 0) {
            const currentConfig = getShiftConfig(cursor, worker.schedule);
            const timeUntilEnd = (currentConfig.end - cursor) / (1000 * 60);

            if (timeUntilEnd <= 0) {
                cursor = jumpToNextShift(cursor, worker.schedule);
                continue;
            }

            if (minutesRemaining <= timeUntilEnd) {
                cursor = new Date(cursor.getTime() + minutesRemaining * 60000);
                minutesRemaining = 0;
            } else {
                minutesRemaining -= timeUntilEnd;
                events.push({ type: 'jump', msg: 'Fin de jornada: continúa en el próximo turno' });
                cursor = jumpToNextShift(cursor, worker.schedule);
            }
        }
        return { finishDate: cursor, effectiveStartDate: effectiveStartDate, events: events };
    }

    // Public API
    return {
        calculate: calculate
    };

})();

// Compatibilidad dual: navegador (window) y Node (module.exports) para los tests.
if (typeof window !== 'undefined') {
    window.AuroraEstimator = AuroraEstimator;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuroraEstimator;
}
