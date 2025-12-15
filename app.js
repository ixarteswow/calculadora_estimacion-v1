// Database loaded from workers.js
let WorkerDatabase = window.WorkerDatabase || {};

let state = {
    workerId: null,
    durationMinutes: 0,
    isCustom: false
};

// ==========================================
// CORE LOGIC 
// ==========================================
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
function calculateEstimation(startDate, durationMinutes, workerId) {
    const worker = WorkerDatabase[workerId];
    if (!worker) return null;

    let cursor = new Date(startDate);
    let minutesRemaining = durationMinutes;
    let events = [];

    if (!isWorkDay(cursor, worker.schedule)) {
        cursor = jumpToNextShift(cursor, worker.schedule);
        events.push({ type: 'jump', msg: `Inicio diferido: fuera de turno` });
    } else {
        const todayConfig = getShiftConfig(cursor, worker.schedule);
        if (cursor < todayConfig.start) {
            cursor = new Date(todayConfig.start);
        } else if (cursor >= todayConfig.end) {
            cursor = jumpToNextShift(cursor, worker.schedule);
            events.push({ type: 'jump', msg: `Inicio diferido: turno acabado` });
        }
    }

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
            cursor = jumpToNextShift(cursor, worker.schedule);
        }
    }
    return { finishDate: cursor, events: events };
}
function formatDatePretty(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleString('es-ES', options);
}


// ==========================================
// UI CONTROLLER (AURORA BENTO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Data loaded via workers.js script tag

    // Elements
    const workerIdInput = document.getElementById('workerIdInput');
    const workerValidationIcon = document.getElementById('workerValidationIcon');
    const profileCard = document.getElementById('profileCard');
    const workerAvatar = document.getElementById('workerAvatar');
    const workerName = document.getElementById('workerName');
    const workerRole = document.getElementById('workerRole');
    const workerStatus = document.getElementById('workerStatus');

    const sizeSelect = document.getElementById('sizeSelect');
    const durationDisplay = document.getElementById('durationDisplay'); 
    const customInputContainer = document.getElementById('customInputContainer');
    const customDurationInput = document.getElementById('customDurationInput');

    const emptyState = document.getElementById('emptyState');
    const resultSection = document.getElementById('resultSection');
    const finalDateDisplay = document.getElementById('finalDate');
    const timelineContainer = document.getElementById('timelineContainer');

    const calendarPanel = document.getElementById('calendarPanel');
    const calendarMonthTitle = document.getElementById('calendarMonthTitle');
    const calendarGrid = document.getElementById('calendarGrid');

    // --- 1. Worker Logic ---
    function showWorkerProfile(worker) {
        profileCard.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        profileCard.classList.add('scale-100', 'opacity-100');
        workerAvatar.src = worker.avatar;
        workerName.textContent = worker.name;
        workerRole.textContent = worker.role;
        workerStatus.textContent = "ACTIVO";
        workerValidationIcon.classList.remove('hidden');
    }

    function hideWorkerProfile() {
        profileCard.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        profileCard.classList.remove('scale-100', 'opacity-100');
        workerValidationIcon.classList.add('hidden');
    }

    function resetView() {
        resultSection.classList.add('hidden', 'translate-y-full', 'opacity-0');
        emptyState.classList.remove('hidden', 'scale-95', 'opacity-0');
        calendarPanel.classList.add('hidden', 'opacity-0', 'translate-x-10');
    }

    workerIdInput.addEventListener('input', (e) => {
        const id = e.target.value.toUpperCase();
        state.workerId = null; 
        
        resetView();

        if (WorkerDatabase[id]) {
            state.workerId = id;
            showWorkerProfile(WorkerDatabase[id]);
        } else {
             hideWorkerProfile();
        }
    });

    // --- 2. Duration Logic ---
    // Populate Select
    if(sizeSelect.options.length === 0) {
        const opts = [
            {val: "", text: "Seleccionar..."},
            {val: "60", text: "Mínimo (1h)"},
            {val: "180", text: "Pequeño (3h)"},
            {val: "480", text: "Medio (8h)"},
            {val: "1440", text: "Grande (24h)"},
            {val: "custom", text: "Personalizado"}
        ];
        opts.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.val;
            opt.textContent = o.text;
            if(o.val === "") opt.disabled = true;
            sizeSelect.appendChild(opt);
        });
        sizeSelect.value = "";
    }

    sizeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const text = e.target.options[e.target.selectedIndex].text;
        
        durationDisplay.textContent = text.split(' ')[0]; // Visual Update

        if (val === 'custom') {
            state.isCustom = true;
            customInputContainer.classList.remove('hidden', 'opacity-0');
            customDurationInput.focus();
            state.durationMinutes = parseInt(customDurationInput.value) * 60 || 0;
        } else {
            state.isCustom = false;
            customInputContainer.classList.add('hidden', 'opacity-0');
            state.durationMinutes = parseInt(val);
        }
        resetView();
    });

    customDurationInput.addEventListener('input', (e) => {
        if(state.isCustom) {
            state.durationMinutes = parseInt(e.target.value) * 60 || 0;
            resetView();
        }
    });

    // --- 3. Main Calculation Logic ---
    window.updateCalculation = function() { // Global for button click
        let isValid = true;
        
        // Validate Worker
        if (!state.workerId) {
            const el = workerIdInput.closest('.glass-panel');
            el.classList.remove('border-white/40'); // Remove default border
            el.classList.add('animate-shake', 'border-red-500', 'bg-red-50/50');
            setTimeout(() => {
                el.classList.remove('animate-shake', 'border-red-500', 'bg-red-50/50');
                el.classList.add('border-white/40'); // Restore default
            }, 400);
            isValid = false;
        }

        // Validate Duration
        if (state.durationMinutes <= 0) {
            const el = sizeSelect.closest('.glass-panel');
            el.classList.remove('border-white/40');
            el.classList.add('animate-shake', 'border-red-500', 'bg-red-50/50');
           setTimeout(() => {
                el.classList.remove('animate-shake', 'border-red-500', 'bg-red-50/50');
                el.classList.add('border-white/40');
            }, 400);
            isValid = false;
        }

        if(!isValid) {
             resultSection.classList.add('hidden', 'translate-y-full', 'opacity-0');
             emptyState.classList.remove('hidden', 'scale-95', 'opacity-0');
             return false;
        }

        const now = new Date(); 
        const result = calculateEstimation(now, state.durationMinutes, state.workerId);
        
        if (result) {
            emptyState.classList.add('hidden', 'scale-95', 'opacity-0');
            resultSection.classList.remove('hidden', 'translate-y-full', 'opacity-0');
            
            finalDateDisplay.textContent = formatDatePretty(result.finishDate);
            
            timelineContainer.innerHTML = '';
            if (result.events.length > 0) {
                 result.events.slice(0, 3).forEach(evt => {
                    const span = document.createElement('span');
                    span.className = "text-[10px] bg-white/20 px-2 py-1 rounded text-white font-medium";
                    span.textContent = evt.msg.split(' ')[0]; // Short msg
                    timelineContainer.appendChild(span);
                 });
            } else {
                timelineContainer.innerHTML = '<span class="text-xs text-blue-100">Sin demoras</span>';
            }

            renderCalendar(result.finishDate);
            calendarPanel.classList.remove('hidden', 'opacity-0', 'translate-x-10');
        }
        return true;
    }

    // --- 4. Calendar & Help Logic ---
    function renderCalendar(targetDate) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        calendarMonthTitle.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; 
        
        calendarGrid.innerHTML = '';
        for (let i = 0; i < startingDay; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const btn = document.createElement('button');
            const currentDate = new Date(year, month, i);
            btn.textContent = i;
            btn.className = "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium text-gray-600 transition-all";
            
            const isTarget = i === targetDate.getDate();
            const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

            if (isTarget) {
                btn.classList.add('bg-green-500', 'text-white', 'shadow-md', 'scale-110', 'font-bold');
            } else if (isWeekend) {
                btn.classList.add('bg-gray-100', 'text-gray-300');
            }
            calendarGrid.appendChild(btn);
        }
    }

    const workerListModal = document.getElementById('workerListModal');
    const workerListContainer = document.getElementById('workerListContainer');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    const helpBtn = document.getElementById('helpBtn');

    function toggleHelpModal(show) {
        const content = document.getElementById('workerListContent');
        if(show) {
            workerListModal.classList.remove('hidden');
            workerListModal.classList.add('flex');
            // Populate
             if (workerListContainer.children.length === 0) {
                Object.values(WorkerDatabase).forEach(w => {
                    const item = document.createElement('div');
                    item.className = "flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100 group";
                    item.innerHTML = `
                        <div class="font-mono text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">${w.id}</div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-gray-700">${w.name}</p>
                            <p class="text-xs text-gray-500">${w.role}</p>
                        </div>
                    `;
                    item.addEventListener('click', () => {
                        workerIdInput.value = w.id;
                        workerIdInput.dispatchEvent(new Event('input')); 
                        toggleHelpModal(false);
                    });
                    workerListContainer.appendChild(item);
                });
            }
            // Trigger animation
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0', 'translate-y-full');
            }, 10);
        } else {
             content.classList.add('scale-95', 'opacity-0', 'translate-y-full');
             setTimeout(() => {
                workerListModal.classList.add('hidden');
                workerListModal.classList.remove('flex');
             }, 300);
        }
    }

    const openDirectoryBtn = document.getElementById('openDirectoryBtn');

    if(helpBtn) helpBtn.addEventListener('click', () => toggleHelpModal(true));
    if(openDirectoryBtn) openDirectoryBtn.addEventListener('click', () => toggleHelpModal(true));
    if(closeHelpBtn) closeHelpBtn.addEventListener('click', () => toggleHelpModal(false));

});
