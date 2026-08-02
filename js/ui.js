// ==========================================
// AuroraUi — Capa de presentación (render)
// Aislada de la lógica de negocio y del estado.
// Recibe datos y referencias desde app.js.
// ==========================================
window.AuroraUi = (function () {
    'use strict';

    // Referencias DOM (scripts cargados al final de <body>: el DOM ya existe)
    const $ = (id) => document.getElementById(id);
    const el = {
        workerIdInput: $('workerIdInput'),
        workerValidationIcon: $('workerValidationIcon'),
        profileCard: $('profileCard'),
        workerAvatar: $('workerAvatar'),
        workerName: $('workerName'),
        workerRole: $('workerRole'),
        workerStatus: $('workerStatus'),
        durationTile: $('durationTile'),
        durationPickerBtn: $('durationPickerBtn'),
        durationPickerMenu: $('durationPickerMenu'),
        durationPickerList: $('durationPickerList'),
        durationDisplay: $('durationDisplay'),
        customInputContainer: $('customInputContainer'),
        customDurationInput: $('customDurationInput'),
        emptyStateTitle: $('emptyStateTitle'),
        emptyStateHint: $('emptyStateHint'),
        emptyState: $('emptyState'),
        resultSection: $('resultSection'),
        finalDateDisplay: $('finalDate'),
        timelineContainer: $('timelineContainer'),
        calendarPanel: $('calendarPanel'),
        calendarMonthTitle: $('calendarMonthTitle'),
        calendarGrid: $('calendarGrid'),
        workerListModal: $('workerListModal'),
        workerListContent: $('workerListContent'),
        workerListContainer: $('workerListContainer'),
        directoryWorkerPopover: $('directoryWorkerPopover'),
        connectionStatusPill: $('connectionStatusPill'),
        connectionStatusText: $('connectionStatusText'),
        connectionStatusDot: $('connectionStatusDot')
    };

    // Configuración estática de la UI
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

    const ROLE_STOPWORDS = new Set(['de', 'del', 'la', 'el', 'y', 'en', 'a', 'al', 'las', 'los']);

    // --- Utilidades de presentación ---

    function formatDatePretty(date) {
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleString('es-ES', options);
    }

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

    /** Semáforo de disponibilidad basado en busyUntil */
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

    // --- Conexión ---

    function setConnectionPill(mode) {
        if (!el.connectionStatusPill) return;
        el.connectionStatusPill.style.display = 'flex';
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
        if (el.connectionStatusText) el.connectionStatusText.textContent = cfg.text;
        if (el.connectionStatusDot) el.connectionStatusDot.innerHTML = cfg.dot;
    }

    // --- Estados de la vista ---

    function updateEmptyStateMessage(state) {
        if (!el.emptyStateHint) return;
        const hasWorker = !!state.workerId;
        const hasDuration = state.durationMinutes > 0;
        if (!hasWorker && !hasDuration) {
            if (el.emptyStateTitle) el.emptyStateTitle.textContent = 'Completa los pasos';
            el.emptyStateHint.textContent = '1. Trabajador · 2. Duración · 3. Calcular';
        } else if (!hasWorker) {
            if (el.emptyStateTitle) el.emptyStateTitle.textContent = 'Falta el trabajador';
            el.emptyStateHint.textContent = 'Introduce un ID o elige uno del directorio';
        } else if (!hasDuration) {
            if (el.emptyStateTitle) el.emptyStateTitle.textContent = 'Falta la duración';
            el.emptyStateHint.textContent = 'Selecciona un tamaño de tarea en 02. Time';
        } else {
            if (el.emptyStateTitle) el.emptyStateTitle.textContent = 'Listo para calcular';
            el.emptyStateHint.textContent = 'Pulsa Calculadora Aurora';
        }
    }

    function flashInvalidTile(target) {
        if (!target) return;
        target.classList.remove('border-white/40');
        target.classList.add('animate-shake', 'tile-invalid');
        setTimeout(() => {
            target.classList.remove('animate-shake', 'tile-invalid');
            target.classList.add('border-white/40');
        }, 400);
    }

    function resetView(state) {
        el.resultSection.classList.add('hidden', 'translate-y-full', 'opacity-0');
        el.emptyState.classList.remove('hidden', 'scale-95', 'opacity-0');
        el.calendarPanel.classList.add('hidden', 'opacity-0', 'translate-x-10');
        updateEmptyStateMessage(state);
    }

    function showResult() {
        el.emptyState.classList.add('hidden', 'scale-95', 'opacity-0');
        el.resultSection.classList.remove('hidden', 'translate-y-full', 'opacity-0');
    }

    function hideResult() {
        el.resultSection.classList.add('hidden', 'translate-y-full', 'opacity-0');
        el.emptyState.classList.remove('hidden', 'scale-95', 'opacity-0');
    }

    // --- Perfil del trabajador ---

    function showWorkerProfile(worker) {
        el.profileCard.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        el.profileCard.classList.add('scale-100', 'opacity-100');
        el.workerAvatar.src = worker.avatar;
        el.workerName.textContent = worker.name;
        el.workerRole.textContent = worker.role;

        const status = getWorkerStatus(worker);
        el.workerStatus.className = `text-[9px] px-2 py-0.5 rounded-full font-bold ${status.class}`;
        el.workerStatus.textContent = status.text;

        el.workerValidationIcon.classList.remove('hidden');
    }

    function hideWorkerProfile() {
        el.profileCard.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        el.profileCard.classList.remove('scale-100', 'opacity-100');
        el.workerValidationIcon.classList.add('hidden');
    }

    // --- Selector de duración ---

    function setDurationDisplay(label, hasValue) {
        el.durationDisplay.textContent = label;
        el.durationDisplay.classList.toggle('text-gray-300', !hasValue);
        el.durationDisplay.classList.toggle('text-gray-800', hasValue);
    }

    function closeDurationPicker() {
        if (el.durationPickerMenu) el.durationPickerMenu.classList.add('hidden');
    }

    function toggleDurationPicker(open) {
        el.durationPickerMenu.classList.toggle('hidden', !open);
    }

    function showCustomInput(show) {
        el.customInputContainer.classList.toggle('hidden', !show);
        el.customInputContainer.classList.toggle('opacity-0', !show);
    }

    function buildDurationPicker(onSelect) {
        if (!el.durationPickerList) return;
        el.durationPickerList.innerHTML = '';
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
            btn.addEventListener('click', () => onSelect(opt.val, opt.label));
            li.appendChild(btn);
            el.durationPickerList.appendChild(li);
        });
    }

    // --- Resultado ---

    function renderResult(result) {
        el.finalDateDisplay.textContent = formatDatePretty(result.finishDate);

        let startDisplay = document.getElementById('effectiveStartDisplay');
        if (!startDisplay) {
            startDisplay = document.createElement('p');
            startDisplay.id = 'effectiveStartDisplay';
            startDisplay.className = "text-[10px] text-white/70 mt-1 uppercase tracking-widest";
            el.finalDateDisplay.parentNode.insertBefore(startDisplay, el.finalDateDisplay.nextSibling);
        }
        startDisplay.textContent = `Comienza: ${formatDatePretty(result.effectiveStartDate)}`;

        el.timelineContainer.innerHTML = '';
        if (result.events.length > 0) {
            result.events.slice(0, 3).forEach((evt) => {
                const span = document.createElement('span');
                span.className = "text-[10px] bg-white/20 px-2 py-1 rounded text-white font-medium";
                span.textContent = evt.msg;
                el.timelineContainer.appendChild(span);
            });
        } else {
            el.timelineContainer.innerHTML = '<span class="text-xs text-mojo-light">Sin demoras</span>';
        }
    }

    // --- Calendario ---

    function renderCalendar(targetDate) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        el.calendarMonthTitle.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        el.calendarGrid.innerHTML = '';
        for (let i = 0; i < startingDay; i++) {
            el.calendarGrid.appendChild(document.createElement('div'));
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
            el.calendarGrid.appendChild(btn);
        }
        el.calendarPanel.classList.remove('hidden', 'opacity-0', 'translate-x-10');
    }

    // --- Directorio (modal) ---

    let directoryPopoverHideTimer = null;

    function positionDirectoryPopover(anchorEl) {
        if (!el.directoryWorkerPopover || !anchorEl) return;
        el.directoryWorkerPopover.classList.remove('hidden');
        el.directoryWorkerPopover.setAttribute('aria-hidden', 'false');

        const rect = anchorEl.getBoundingClientRect();
        const popRect = el.directoryWorkerPopover.getBoundingClientRect();
        const margin = 8;
        let top = rect.top - popRect.height - margin;
        let left = rect.left + rect.width / 2 - popRect.width / 2;

        if (top < margin) top = rect.bottom + margin;
        if (left < margin) left = margin;
        if (left + popRect.width > window.innerWidth - margin) {
            left = window.innerWidth - popRect.width - margin;
        }

        el.directoryWorkerPopover.style.top = `${top}px`;
        el.directoryWorkerPopover.style.left = `${left}px`;
    }

    function showDirectoryPopover(worker, rowEl) {
        if (!el.directoryWorkerPopover) return;
        clearTimeout(directoryPopoverHideTimer);

        const status = worker.computedStatus || getWorkerStatus(worker);
        const statusClass = getModalStatusClass(status);
        const avatarUrl =
            worker.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=0288d1&color=fff`;
        const scheduleLine = formatScheduleSummary(worker.schedule);
        const statusLabel = worker.status ? escapeHtml(worker.status) : '—';

        el.directoryWorkerPopover.innerHTML = `
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

        el.directoryWorkerPopover.classList.remove('hidden');
        requestAnimationFrame(() => positionDirectoryPopover(rowEl));
    }

    function hideDirectoryPopover() {
        if (!el.directoryWorkerPopover) return;
        directoryPopoverHideTimer = setTimeout(() => {
            el.directoryWorkerPopover.classList.add('hidden');
            el.directoryWorkerPopover.setAttribute('aria-hidden', 'true');
        }, 80);
    }

    /**
     * Renderiza la tabla del directorio.
     * @param {object[]} workers - Lista plana de trabajadores.
     * @param {string} filter - Filtro de estado ('ALL' | 'GREEN' | 'YELLOW' | 'RED').
     * @param {string} search - Texto de búsqueda.
     * @param {Function} onSelect - Callback al seleccionar un trabajador.
     */
    function renderDirectory(workers, filter, search, onSelect) {
        el.workerListContainer.innerHTML = '';

        const withStatus = workers.map((w) => ({ ...w, computedStatus: getWorkerStatus(w) }));

        let filtered = withStatus;
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter((w) =>
                w.name.toLowerCase().includes(q) ||
                w.id.toLowerCase().includes(q) ||
                w.role.toLowerCase().includes(q) ||
                formatRoleCode(w.role).toLowerCase().includes(q)
            );
        }

        if (filter !== 'ALL') {
            filtered = filtered.filter((w) => w.computedStatus.type === filter);
        }

        filtered.sort((a, b) => {
            if (a.computedStatus.weight !== b.computedStatus.weight) {
                return a.computedStatus.weight - b.computedStatus.weight;
            }
            return a.name.localeCompare(b.name);
        });

        if (filtered.length === 0) {
            el.workerListContainer.innerHTML = `
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

        filtered.forEach((w) => {
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
                if (onSelect) onSelect(w);
            });
            body.appendChild(row);
        });

        el.workerListContainer.appendChild(table);
    }

    function showDirectoryModal() {
        closeDurationPicker();
        hideDirectoryPopover();
        el.workerListModal.classList.remove('hidden');
        el.workerListModal.classList.add('flex');

        setTimeout(() => {
            el.workerListContent.classList.remove('scale-95', 'opacity-0', 'translate-y-full');
        }, 10);
    }

    function hideDirectoryModal() {
        hideDirectoryPopover();
        el.workerListContent.classList.add('scale-95', 'opacity-0', 'translate-y-full');
        setTimeout(() => {
            el.workerListModal.classList.add('hidden');
            el.workerListModal.classList.remove('flex');
        }, 300);
    }

    // Public API
    return {
        formatDatePretty: formatDatePretty,
        setConnectionPill: setConnectionPill,
        updateEmptyStateMessage: updateEmptyStateMessage,
        flashInvalidTile: flashInvalidTile,
        resetView: resetView,
        showResult: showResult,
        hideResult: hideResult,
        showWorkerProfile: showWorkerProfile,
        hideWorkerProfile: hideWorkerProfile,
        setDurationDisplay: setDurationDisplay,
        closeDurationPicker: closeDurationPicker,
        toggleDurationPicker: toggleDurationPicker,
        showCustomInput: showCustomInput,
        buildDurationPicker: buildDurationPicker,
        renderResult: renderResult,
        renderCalendar: renderCalendar,
        renderDirectory: renderDirectory,
        showDirectoryModal: showDirectoryModal,
        hideDirectoryModal: hideDirectoryModal,
        getWorkerStatus: getWorkerStatus
    };
})();
