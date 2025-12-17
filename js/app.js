
// Database (Fallback to local from workers.js if available)
let WorkerDatabase = window.WorkerDatabase || {};

let state = {
    workerId: null,
    durationMinutes: 0,
    isCustom: false
};

// Core logic (could be imported, but simple enough here) ... actually dependent on estimator.js
function formatDatePretty(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleString('es-ES', options);
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 0. Elements & Init ---
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

    const workerListModal = document.getElementById('workerListModal');
    const workerListContainer = document.getElementById('workerListContainer');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    const helpBtn = document.getElementById('helpBtn');
    const openDirectoryBtn = document.getElementById('openDirectoryBtn');
    const workerSearchInput = document.getElementById('workerSearchInput');
    const statusFilterSelect = document.getElementById('statusFilterSelect');

    const connectionStatusPill = document.getElementById('connectionStatusPill');
    if(connectionStatusPill) connectionStatusPill.style.display = 'none'; // Hide status pill in local mode

    // Default Filter State
    let currentFilter = 'ALL'; 
    let currentSearch = '';

    // --- 1. Worker Logic & Helpers ---
    function getWorkerStatus(worker) {
        const now = new Date();
        const busyUntil = worker.busyUntil ? new Date(worker.busyUntil) : now;
        const diffHours = (busyUntil - now) / (1000 * 60 * 60);

        if (diffHours <= 0) {
            return { type: 'GREEN', text: "DISPONIBLE", class: "bg-green-100 text-green-700", weight: 1 };
        } else if (diffHours < 2) {
            return { type: 'GREEN', text: "OCUPADO (<2h)", class: "bg-green-50 text-green-600", weight: 2 };
        } else if (diffHours < 24) {
             return { type: 'YELLOW', text: "OCUPADO (Hoy)", class: "bg-yellow-100 text-yellow-800", weight: 3 };
        } else if (diffHours < 48) {
             return { type: 'RED', text: "COLA MEDIA", class: "bg-orange-100 text-orange-800", weight: 4 };
        } else {
             return { type: 'RED', text: "SATURADO", class: "bg-red-100 text-red-800", weight: 5 };
        }
    }

    function showWorkerProfile(worker) {
        profileCard.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        profileCard.classList.add('scale-100', 'opacity-100');
        workerAvatar.src = worker.avatar;
        workerName.textContent = worker.name;
        workerRole.textContent = worker.role;
        
        const status = getWorkerStatus(worker);

        workerStatus.className = `text-[9px] px-2 py-0.5 rounded-full font-bold ${status.class}`;
        workerStatus.textContent = status.text;
        
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

    /* -------------------------------------------------------------
       WORKER DIRECTORY: FILTER, SEARCH, SORT
    ------------------------------------------------------------- */
    function renderDirectory() {
        workerListContainer.innerHTML = '';
        console.log("Rendering Directory from Local DB:", WorkerDatabase);

        let workers = Object.values(WorkerDatabase).map(w => ({
            ...w,
            computedStatus: getWorkerStatus(w)
        }));

        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            workers = workers.filter(w => 
                w.name.toLowerCase().includes(q) || 
                w.id.toLowerCase().includes(q) ||
                w.role.toLowerCase().includes(q)
            );
        }

        if (currentFilter !== 'ALL') {
            workers = workers.filter(w => w.computedStatus.type === currentFilter);
        }

        workers.sort((a, b) => {
            if (a.computedStatus.weight !== b.computedStatus.weight) {
                return a.computedStatus.weight - b.computedStatus.weight;
            }
            return a.name.localeCompare(b.name);
        });

        if (workers.length === 0) {
            workerListContainer.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <p class="text-xs">No se encontraron resultados</p>
                </div>`;
            return;
        }

        workers.forEach(w => {
            const item = document.createElement('div');
            item.className = "flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100 group";
            
            item.innerHTML = `
                <div class="font-mono text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">${w.id}</div>
                <div class="flex-1">
                    <div class="flex justify-between items-center">
                        <p class="text-sm font-bold text-gray-700">${w.name}</p>
                         <div class="text-[9px] px-2 py-0.5 rounded-full font-bold ${w.computedStatus.class}">
                            ${w.computedStatus.text}
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 flex items-center gap-1">
                        ${w.role}
                    </p>
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

    function toggleHelpModal(show) {
        if(show) {
            workerListModal.classList.remove('hidden');
            workerListModal.classList.add('flex');
            
            // Reload list (in case of new filters/data)
            renderDirectory();

            setTimeout(() => {
                document.getElementById('workerListContent').classList.remove('scale-95', 'opacity-0', 'translate-y-full');
            }, 10);
        } else {
             document.getElementById('workerListContent').classList.add('scale-95', 'opacity-0', 'translate-y-full');
             setTimeout(() => {
                workerListModal.classList.add('hidden');
                workerListModal.classList.remove('flex');
             }, 300);
        }
    }

    // --- 2. Initial Execution ---
    renderDirectory();

    // --- 3. Event Listeners ---
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

        const worker = WorkerDatabase[state.workerId];
        const now = new Date(); 
        // Concurrency Logic: Max(Now, BusyUntil)
        const realStart = new Date(Math.max(now.getTime(), worker.busyUntil ? new Date(worker.busyUntil).getTime() : 0));
        
        const result = AuroraEstimator.calculate(realStart, state.durationMinutes, worker);
        
        if (result) {
            emptyState.classList.add('hidden', 'scale-95', 'opacity-0');
            resultSection.classList.remove('hidden', 'translate-y-full', 'opacity-0');
            
            finalDateDisplay.textContent = formatDatePretty(result.finishDate);
            
            // Inject Effective Start Date Display
            let startDisplay = document.getElementById('effectiveStartDisplay');
            if(!startDisplay) {
                startDisplay = document.createElement('p');
                startDisplay.id = 'effectiveStartDisplay';
                startDisplay.className = "text-[10px] text-white/70 mt-1 uppercase tracking-widest";
                // Insert after Final Date
                finalDateDisplay.parentNode.insertBefore(startDisplay, finalDateDisplay.nextSibling);
            }
            startDisplay.textContent = `Comienza: ${formatDatePretty(result.effectiveStartDate)}`;

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
    };

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


    
    // Event Listeners
    if(helpBtn) helpBtn.addEventListener('click', () => toggleHelpModal(true));
    if(openDirectoryBtn) openDirectoryBtn.addEventListener('click', () => toggleHelpModal(true));
    if(closeHelpBtn) closeHelpBtn.addEventListener('click', () => toggleHelpModal(false));

    // Search Listener
    if(workerSearchInput) {
        workerSearchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderDirectory();
        });
    }

    // Filter Dropdown Listener
    if (statusFilterSelect) {
        statusFilterSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderDirectory();
        });
    }

});
