
// Database (Fallback to local from workers.js if available)
let WorkerDatabase = window.WorkerDatabase || {};

const DURATION_OPTIONS = [
    { val: '60', label: 'Mínimo', sub: '1 h' },
    { val: '180', label: 'Pequeño', sub: '3 h' },
    { val: '480', label: 'Medio', sub: '8 h' },
    { val: '1440', label: 'Grande', sub: '24 h' },
    { val: 'custom', label: 'Personalizado', sub: 'Horas exactas', accent: true }
];

const STATUS_MOJO = {
    free: 'bg-mojo-light text-mojo-primary',
    busy: 'bg-mojo-cloud text-mojo-primary border border-mojo-primary/25',
    queue: 'bg-mojo-primary text-white'
};

let state = {
    workerId: null,
    durationMinutes: 0,
    isCustom: false,
    durationLabel: ''
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

    const durationTile = document.getElementById('durationTile');
    const durationPickerBtn = document.getElementById('durationPickerBtn');
    const durationPickerMenu = document.getElementById('durationPickerMenu');
    const durationPickerList = document.getElementById('durationPickerList');
    const durationDisplay = document.getElementById('durationDisplay');
    const customInputContainer = document.getElementById('customInputContainer');
    const customDurationInput = document.getElementById('customDurationInput');
    const customDurationBackBtn = document.getElementById('customDurationBackBtn');
    const emptyStateTitle = document.getElementById('emptyStateTitle');
    const emptyStateHint = document.getElementById('emptyStateHint');

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
    const connectionStatusText = document.getElementById('connectionStatusText');
    const connectionStatusDot = document.getElementById('connectionStatusDot');

    // Default Filter State
    let currentFilter = 'ALL';
    let currentSearch = '';
    let durationPickerOpen = false;

    function setConnectionPill(mode) {
        if (!connectionStatusPill) return;
        connectionStatusPill.style.display = 'flex';
        const modes = {
            local: {
                text: 'LOCAL',
                dot: '<span class="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>'
            },
            connecting: {
                text: 'CONECTANDO...',
                dot: '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-mojo-primary/40 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-mojo-primary/60"></span>'
            },
            online: {
                text: 'ONLINE',
                dot: '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-mojo-primary/50 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-mojo-primary"></span>'
            },
            offline: {
                text: 'OFFLINE (Local)',
                dot: '<span class="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>'
            }
        };
        const cfg = modes[mode] || modes.local;
        if (connectionStatusText) connectionStatusText.textContent = cfg.text;
        if (connectionStatusDot) connectionStatusDot.innerHTML = cfg.dot;
    }

    setConnectionPill('local');

    function updateEmptyStateMessage() {
        if (!emptyStateHint) return;
        const hasWorker = !!state.workerId;
        const hasDuration = state.durationMinutes > 0;
        if (!hasWorker && !hasDuration) {
            if (emptyStateTitle) emptyStateTitle.textContent = 'Completa los pasos';
            emptyStateHint.textContent = '1. Trabajador · 2. Duración · 3. Calcular';
        } else if (!hasWorker) {
            if (emptyStateTitle) emptyStateTitle.textContent = 'Falta el trabajador';
            emptyStateHint.textContent = 'Introduce un ID o elige uno del directorio';
        } else if (!hasDuration) {
            if (emptyStateTitle) emptyStateTitle.textContent = 'Falta la duración';
            emptyStateHint.textContent = 'Selecciona un tamaño de tarea en 02. Time';
        } else {
            if (emptyStateTitle) emptyStateTitle.textContent = 'Listo para calcular';
            emptyStateHint.textContent = 'Pulsa Calculadora Aurora';
        }
    }

    function flashInvalidTile(el) {
        if (!el) return;
        el.classList.remove('border-white/40');
        el.classList.add('animate-shake', 'tile-invalid');
        setTimeout(() => {
            el.classList.remove('animate-shake', 'tile-invalid');
            el.classList.add('border-white/40');
        }, 400);
    }

    // --- 1. Worker Logic & Helpers ---
    function getWorkerStatus(worker) {
        const now = new Date();
        const busyUntil = worker.busyUntil ? new Date(worker.busyUntil) : now;
        const diffHours = (busyUntil - now) / (1000 * 60 * 60);

        if (diffHours <= 0) {
            return { type: 'GREEN', text: 'DISPONIBLE', class: STATUS_MOJO.free, weight: 1 };
        }
        if (diffHours < 2) {
            return { type: 'GREEN', text: 'OCUPADO (<2h)', class: STATUS_MOJO.busy, weight: 2 };
        }
        if (diffHours < 24) {
            return { type: 'YELLOW', text: 'OCUPADO (Hoy)', class: STATUS_MOJO.busy, weight: 3 };
        }
        if (diffHours < 48) {
            return { type: 'RED', text: 'COLA MEDIA', class: STATUS_MOJO.queue, weight: 4 };
        }
        return { type: 'RED', text: 'SATURADO', class: STATUS_MOJO.queue, weight: 5 };
    }

    /** Semáforo solo para etiquetas del modal Directorio */
    function getModalStatusClass(status) {
        switch (status.weight) {
            case 1: return 'bg-green-100 text-green-700';
            case 2: return 'bg-green-50 text-green-600';
            case 3: return 'bg-yellow-100 text-yellow-800';
            case 4: return 'bg-orange-100 text-orange-800';
            default: return 'bg-red-100 text-red-800';
        }
    }

    const ROLE_STOPWORDS = new Set(['de', 'del', 'la', 'el', 'y', 'en', 'a', 'al', 'las', 'los']);

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Código de rol: "Desarrolladora Senior" → "D. S." */
    function formatRoleCode(role) {
        if (!role) return '—';
        const cleaned = role.replace(/[()]/g, ' ').replace(/\//g, ' ');
        const words = cleaned.split(/\s+/).filter(Boolean);
        const significant = words.filter((w) => !ROLE_STOPWORDS.has(w.toLowerCase()));
        const use = significant.length ? significant : words;
        const code = use
            .map((w) => {
                const m = w.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/);
                return m ? `${m[0].toUpperCase()}.` : '';
            })
            .filter(Boolean)
            .join(' ');
        return code || role.slice(0, 4).toUpperCase();
    }

    function formatScheduleSummary(schedule) {
        if (!schedule || !schedule.workDays) return '—';
        const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        const days = schedule.workDays.map((d) => labels[d] ?? '?').join(' ');
        const pad = (n) => String(n).padStart(2, '0');
        return `${days} · ${pad(schedule.startHour)}:${pad(schedule.startMinute)}–${pad(schedule.endHour)}:${pad(schedule.endMinute)}`;
    }

    const directoryWorkerPopover = document.getElementById('directoryWorkerPopover');
    let directoryPopoverHideTimer = null;

    function positionDirectoryPopover(anchorEl) {
        if (!directoryWorkerPopover || !anchorEl) return;
        directoryWorkerPopover.classList.remove('hidden');
        directoryWorkerPopover.setAttribute('aria-hidden', 'false');

        const rect = anchorEl.getBoundingClientRect();
        const popRect = directoryWorkerPopover.getBoundingClientRect();
        const margin = 8;
        let top = rect.top - popRect.height - margin;
        let left = rect.left + rect.width / 2 - popRect.width / 2;

        if (top < margin) top = rect.bottom + margin;
        if (left < margin) left = margin;
        if (left + popRect.width > window.innerWidth - margin) {
            left = window.innerWidth - popRect.width - margin;
        }

        directoryWorkerPopover.style.top = `${top}px`;
        directoryWorkerPopover.style.left = `${left}px`;
    }

    function showDirectoryPopover(worker, rowEl) {
        if (!directoryWorkerPopover) return;
        clearTimeout(directoryPopoverHideTimer);

        const status = worker.computedStatus || getWorkerStatus(worker);
        const statusClass = getModalStatusClass(status);
        const avatarUrl =
            worker.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=0288d1&color=fff`;
        const scheduleLine = formatScheduleSummary(worker.schedule);
        const statusLabel = worker.status ? escapeHtml(worker.status) : '—';

        directoryWorkerPopover.innerHTML = `
            <div class="directory-popover__header">
                <img class="directory-popover__avatar" src="${escapeHtml(avatarUrl)}" alt="">
                <div>
                    <div class="directory-popover__name">${escapeHtml(worker.name)}</div>
                    <div class="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">Rol</div>
                    <div class="directory-popover__role">${escapeHtml(worker.role)}</div>
                    <div class="directory-popover__id">${escapeHtml(worker.id)}</div>
                </div>
            </div>
            <div class="directory-popover__row">
                <span class="directory-popover__label">Estado</span>
                <span class="directory-popover__value">${statusLabel}</span>
            </div>
            <div class="directory-popover__row">
                <span class="directory-popover__label">Turno</span>
                <span class="directory-popover__value">${escapeHtml(scheduleLine)}</span>
            </div>
            <span class="directory-popover__badge ${statusClass}">${escapeHtml(status.text)}</span>
        `;

        directoryWorkerPopover.classList.remove('hidden');
        requestAnimationFrame(() => positionDirectoryPopover(rowEl));
    }

    function hideDirectoryPopover() {
        if (!directoryWorkerPopover) return;
        directoryPopoverHideTimer = setTimeout(() => {
            directoryWorkerPopover.classList.add('hidden');
            directoryWorkerPopover.setAttribute('aria-hidden', 'true');
        }, 80);
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
        updateEmptyStateMessage();
    }

    function setDurationDisplay(label, hasValue) {
        durationDisplay.textContent = label;
        durationDisplay.classList.toggle('text-gray-300', !hasValue);
        durationDisplay.classList.toggle('text-gray-800', hasValue);
    }

    function closeDurationPicker() {
        durationPickerOpen = false;
        if (durationPickerMenu) durationPickerMenu.classList.add('hidden');
    }

    function applyDuration(val, label) {
        state.durationLabel = label;
        setDurationDisplay(label, true);
        closeDurationPicker();

        if (val === 'custom') {
            state.isCustom = true;
            customInputContainer.classList.remove('hidden', 'opacity-0');
            customDurationInput.focus();
            state.durationMinutes = parseInt(customDurationInput.value, 10) * 60 || 0;
        } else {
            state.isCustom = false;
            customInputContainer.classList.add('hidden', 'opacity-0');
            state.durationMinutes = parseInt(val, 10) || 0;
        }
        resetView();
    }

    function buildDurationPicker() {
        if (!durationPickerList) return;
        durationPickerList.innerHTML = '';
        DURATION_OPTIONS.forEach((opt) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = [
                'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                opt.accent
                    ? 'hover:bg-mojo-accent/15 border-t border-mojo-light'
                    : 'hover:bg-mojo-cloud'
            ].join(' ');
            btn.innerHTML = `
                <span class="font-bold ${opt.accent ? 'text-mojo-dark' : 'text-gray-800'}">${opt.label}</span>
                <span class="text-xs font-bold ${opt.accent ? 'text-mojo-accent' : 'text-mojo-primary'}">${opt.sub}</span>
            `;
            btn.addEventListener('click', () => applyDuration(opt.val, opt.label));
            li.appendChild(btn);
            durationPickerList.appendChild(li);
        });
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
                w.role.toLowerCase().includes(q) ||
                formatRoleCode(w.role).toLowerCase().includes(q)
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

        const table = document.createElement('div');
        table.className = 'directory-table';
        table.innerHTML = `
            <div class="directory-header">
                <div class="directory-cell">ID</div>
                <div class="directory-cell">Nombre</div>
                <div class="directory-cell">Cód.</div>
                <div class="directory-cell">Disponibilidad</div>
            </div>
            <div class="directory-body"></div>
        `;
        const body = table.querySelector('.directory-body');

        workers.forEach(w => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'directory-row';
            const statusClass = getModalStatusClass(w.computedStatus);
            const roleCode = formatRoleCode(w.role);
            row.innerHTML = `
                <span class="directory-cell directory-cell--id">${escapeHtml(w.id)}</span>
                <span class="directory-cell directory-cell--name">${escapeHtml(w.name)}</span>
                <span class="directory-cell directory-cell--role-code" title="${escapeHtml(w.role)}">${escapeHtml(roleCode)}</span>
                <span class="directory-cell directory-cell--status ${statusClass}">${escapeHtml(w.computedStatus.text)}</span>
            `;
            row.addEventListener('mouseenter', () => showDirectoryPopover(w, row));
            row.addEventListener('mouseleave', hideDirectoryPopover);
            row.addEventListener('focus', () => showDirectoryPopover(w, row));
            row.addEventListener('blur', hideDirectoryPopover);
            row.addEventListener('click', () => {
                hideDirectoryPopover();
                workerIdInput.value = w.id;
                workerIdInput.dispatchEvent(new Event('input'));
                toggleHelpModal(false);
            });
            body.appendChild(row);
        });

        workerListContainer.appendChild(table);
    }

    function toggleHelpModal(show) {
        if (show) {
            closeDurationPicker();
            hideDirectoryPopover();
            workerListModal.classList.remove('hidden');
            workerListModal.classList.add('flex');
            
            // Reload list (in case of new filters/data)
            renderDirectory();

            setTimeout(() => {
                document.getElementById('workerListContent').classList.remove('scale-95', 'opacity-0', 'translate-y-full');
            }, 10);
        } else {
            hideDirectoryPopover();
            document.getElementById('workerListContent').classList.add('scale-95', 'opacity-0', 'translate-y-full');
            setTimeout(() => {
                workerListModal.classList.add('hidden');
                workerListModal.classList.remove('flex');
            }, 300);
        }
    }

    // --- 2. Initial Execution ---
    buildDurationPicker();
    setDurationDisplay('Seleccionar...', false);
    updateEmptyStateMessage();
    renderDirectory();

    // B. Try to upgrade with Supabase Data (Progressive Enhancement)
    if (window.SupabaseClient) {
        window.SupabaseClient.init();
        setConnectionPill('connecting');

        window.SupabaseClient.fetchWorkers().then(remoteWorkers => {
            if (remoteWorkers) {
                // Success: Update DB and Re-render
                
                // Success: Update DB and Re-render
                
                // HYDRATION STEP: Map text status to busyUntil date for the estimator
                const now = new Date();
                Object.values(remoteWorkers).forEach(w => {
                    const s = (w.status || "").toLowerCase();
                    let addedMinutes = 0;

                    // Manual overrides based on DB text status
                    if(s.includes('saturad')) addedMinutes = 2880; // 2 days
                    else if(s.includes('cola media')) addedMinutes = 1440; // 24h
                    else if(s.includes('ocupado')) addedMinutes = 240; // 4h
                    else if(s.includes('reunión') || s.includes('reunion')) addedMinutes = 60; // 1h
                    else if(s.includes('guardia')) addedMinutes = 0; // Available but special
                    
                    // Only apply if busyUntil is missing or expired
                    if(!w.busyUntil || new Date(w.busyUntil) < now) {
                        if(addedMinutes > 0) {
                            w.busyUntil = new Date(now.getTime() + addedMinutes * 60000).toISOString();
                        } else {
                            w.busyUntil = null; // Free
                        }
                    }
                });

                WorkerDatabase = remoteWorkers;
                renderDirectory();
                setConnectionPill('online');
                console.log('✅ App updated with Supabase data.');
            } else {
                setConnectionPill('offline');
                console.log('⚠️ Supabase update failed or empty. Staying on local data.');
            }
        });
    }

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

    if (durationPickerBtn) {
        durationPickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.isCustom) return;
            durationPickerOpen = !durationPickerOpen;
            durationPickerMenu.classList.toggle('hidden', !durationPickerOpen);
        });
    }

    if (durationPickerMenu) {
        durationPickerMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    document.addEventListener('click', () => closeDurationPicker());

    if (customDurationBackBtn) {
        customDurationBackBtn.addEventListener('click', () => {
            state.isCustom = false;
            state.durationMinutes = 0;
            state.durationLabel = '';
            customInputContainer.classList.add('hidden', 'opacity-0');
            customDurationInput.value = '';
            setDurationDisplay('Seleccionar...', false);
            resetView();
        });
    }

    customDurationInput.addEventListener('input', (e) => {
        if (state.isCustom) {
            const hours = parseInt(e.target.value, 10) || 0;
            state.durationMinutes = hours * 60;
            if (hours > 0) setDurationDisplay(`${hours} h`, true);
            resetView();
        }
    });

    window.updateCalculation = function() { // Global for button click
        let isValid = true;
        
        if (!state.workerId) {
            flashInvalidTile(workerIdInput.closest('.glass-panel'));
            isValid = false;
        }

        if (state.durationMinutes <= 0) {
            flashInvalidTile(durationTile);
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
                timelineContainer.innerHTML = '<span class="text-xs text-mojo-light">Sin demoras</span>';
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
                btn.classList.add('bg-mojo-primary', 'text-white', 'shadow-md', 'scale-110', 'font-bold');
            } else if (isWeekend) {
                btn.classList.add('bg-mojo-cloud', 'text-gray-300');
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
