window.AuroraEstimator = (function() {

    function getDayOfWeek(date) { return date.getDay(); }
    
    function formatDateISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
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
    
    function jumpToNextShift(currentDate, schedule) {
        let nextDate = new Date(currentDate);
        let attempts = 0;
        while (attempts < 365) {
            nextDate.setDate(nextDate.getDate() + 1);
            nextDate.setHours(0, 0, 0, 0);
            if (isWorkDay(nextDate, schedule)) {
                const config = getShiftConfig(nextDate, schedule);
                return config.start;
            }
            attempts++;
        }
        return nextDate;
    }

    /**
     * Calculates the finish date for a task.
     * @param {Date} startDate - The starting date/time.
     * @param {number} durationMinutes - Duration in minutes.
     * @param {object} worker - The worker object (must contain .schedule).
     * @returns {object|null} - Result object with { finishDate, events } or null if invalid.
     */
    function calculate(startDate, durationMinutes, worker) {
        if (!worker || !worker.schedule) return null;

        let cursor = new Date(startDate);
        let minutesRemaining = durationMinutes;
        let events = [];
        let effectiveStartDate = new Date(cursor); 

        // 1. Initial Check & Effective Start Date Logic
        if (!isWorkDay(cursor, worker.schedule)) {
            cursor = jumpToNextShift(cursor, worker.schedule);
            events.push({ type: 'jump', msg: `Inicio diferido: fuera de turno` });
            effectiveStartDate = new Date(cursor); // Update effective start
        } else {
            const todayConfig = getShiftConfig(cursor, worker.schedule);
            if (cursor < todayConfig.start) {
                cursor = new Date(todayConfig.start);
                effectiveStartDate = new Date(cursor); // Start at shift start
            } else if (cursor >= todayConfig.end) {
                cursor = jumpToNextShift(cursor, worker.schedule);
                events.push({ type: 'jump', msg: `Inicio diferido: turno acabado` });
                effectiveStartDate = new Date(cursor); // Update effective start
            }
        }
        // If no jumps happened, effectiveStartDate remains original startDate (or adjusted to now)

        // 2. Consume Time
        while (minutesRemaining > 0) {
            const currentConfig = getShiftConfig(cursor, worker.schedule);
            const timeUntilEnd = (currentConfig.end - cursor) / (1000 * 60);
            
            if (timeUntilEnd <= 0) {
                // If by any chance we are at or past end, jump
                cursor = jumpToNextShift(cursor, worker.schedule);
                continue;
            }

            if (minutesRemaining <= timeUntilEnd) {
                // Fits in current shift
                cursor = new Date(cursor.getTime() + minutesRemaining * 60000);
                minutesRemaining = 0;
            } else {
                // Exceeds current shift
                minutesRemaining -= timeUntilEnd;
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
