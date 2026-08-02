// ==========================================
// app.js — Orquestador: estado, eventos, datos y cálculo.
// Todo el render vive en js/ui.js (window.AuroraUi).
// ==========================================

// Database (Fallback to local from workers.js if available)
let WorkerDatabase = window.WorkerDatabase || {};

let state = {
    workerId: null,
    durationMinutes: 0,
    isCustom: false,
    durationLabel: ''
};

document.addEventListener('DOMContentLoaded', async () => {

    // --- Referencias (solo las que usan listeners o estado) ---
    const workerIdInput = document.getElementById('workerIdInput');
    const durationTile = document.getElementById('durationTile');
    const durationPickerBtn = document.getElementById('durationPickerBtn');
    const customDurationInput = document.getElementById('customDurationInput');
    const customDurationBackBtn = document.getElementById('customDurationBackBtn');
    const workerSearchInput = document.getElementById('workerSearchInput');
    const statusFilterSelect = document.getElementById('statusFilterSelect');
    const helpBtn = document.getElementById('helpBtn');
    const openDirectoryBtn = document.getElementById('openDirectoryBtn');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    const resetBtn = document.getElementById('resetBtn');
    const calculateBtn = document.getElementById('calculateBtn');

    // Default Filter State
    let currentFilter = 'ALL';
    let currentSearch = '';
    let durationPickerOpen = false;

    // --- Render del directorio con el estado actual ---
    function renderDirectory() {
        AuroraUi.renderDirectory(Object.values(WorkerDatabase), currentFilter, currentSearch, (worker) => {
            workerIdInput.value = worker.id;
            workerIdInput.dispatchEvent(new Event('input'));
            AuroraUi.hideDirectoryModal();
        });
    }

    // --- Aplicar duración seleccionada en el picker ---
    function applyDuration(val, label) {
        state.durationLabel = label;
        AuroraUi.setDurationDisplay(label, true);
        AuroraUi.closeDurationPicker();

        if (val === 'custom') {
            state.isCustom = true;
            AuroraUi.showCustomInput(true);
            customDurationInput.focus();
            state.durationMinutes = parseInt(customDurationInput.value, 10) * 60 || 0;
        } else {
            state.isCustom = false;
            AuroraUi.showCustomInput(false);
            state.durationMinutes = parseInt(val, 10) || 0;
        }
        AuroraUi.resetView(state);
    }

    // --- Reset completo (sin recargar la página) ---
    function reset() {
        state.workerId = null;
        state.durationMinutes = 0;
        state.isCustom = false;
        state.durationLabel = '';
        currentFilter = 'ALL';
        currentSearch = '';

        workerIdInput.value = '';
        customDurationInput.value = '';
        if (workerSearchInput) workerSearchInput.value = '';
        if (statusFilterSelect) statusFilterSelect.value = 'ALL';

        AuroraUi.hideWorkerProfile();
        AuroraUi.showCustomInput(false);
        AuroraUi.setDurationDisplay('Seleccionar...', false);
        AuroraUi.resetView(state);
        AuroraUi.hideDirectoryModal();
        renderDirectory();
    }

    // --- Cálculo principal ---
    function updateCalculation() {
        let isValid = true;

        if (!state.workerId) {
            AuroraUi.flashInvalidTile(workerIdInput.closest('.glass-panel'));
            isValid = false;
        }

        if (state.durationMinutes <= 0) {
            AuroraUi.flashInvalidTile(durationTile);
            isValid = false;
        }

        if (!isValid) {
            AuroraUi.hideResult();
            return;
        }

        const worker = WorkerDatabase[state.workerId];
        const now = new Date();
        // Concurrency Logic: Max(Now, BusyUntil)
        const realStart = new Date(Math.max(now.getTime(), worker.busyUntil ? new Date(worker.busyUntil).getTime() : 0));

        let result;
        try {
            result = AuroraEstimator.calculate(realStart, state.durationMinutes, worker);
        } catch (err) {
            AuroraUi.hideResult();
            document.getElementById('emptyStateTitle').textContent = 'Error de cálculo';
            document.getElementById('emptyStateHint').textContent = (err && err.message) ? err.message : 'No se pudo calcular la estimación';
            return;
        }

        AuroraUi.showResult();
        AuroraUi.renderResult(result);
        AuroraUi.renderCalendar(result.finishDate);
    }

    // --- 1. Inicialización ---
    AuroraUi.buildDurationPicker(applyDuration);
    AuroraUi.setDurationDisplay('Seleccionar...', false);
    AuroraUi.updateEmptyStateMessage(state);
    AuroraUi.setConnectionPill('local');
    renderDirectory();

    // B. Try to upgrade with Supabase Data (Progressive Enhancement)
    if (window.SupabaseClient) {
        window.SupabaseClient.init();
        AuroraUi.setConnectionPill('connecting');

        window.SupabaseClient.fetchWorkers().then(remoteWorkers => {
            if (remoteWorkers) {
                // HYDRATION STEP: Map text status to busyUntil date for the estimator
                const now = new Date();
                Object.values(remoteWorkers).forEach(w => {
                    const s = (w.status || "").toLowerCase();
                    let addedMinutes = 0;

                    // Manual overrides based on DB text status
                    if (s.includes('saturad')) addedMinutes = 2880; // 2 days
                    else if (s.includes('cola media')) addedMinutes = 1440; // 24h
                    else if (s.includes('ocupado')) addedMinutes = 240; // 4h
                    else if (s.includes('reunión') || s.includes('reunion')) addedMinutes = 60; // 1h
                    else if (s.includes('guardia')) addedMinutes = 0; // Available but special

                    // Only apply if busyUntil is missing or expired
                    if (!w.busyUntil || new Date(w.busyUntil) < now) {
                        if (addedMinutes > 0) {
                            w.busyUntil = new Date(now.getTime() + addedMinutes * 60000).toISOString();
                        } else {
                            w.busyUntil = null; // Free
                        }
                    }
                });

                WorkerDatabase = remoteWorkers;
                renderDirectory();
                AuroraUi.setConnectionPill('online');
            } else {
                AuroraUi.setConnectionPill('offline');
            }
        });
    }

    // --- 2. Event Listeners ---
    workerIdInput.addEventListener('input', (e) => {
        const id = e.target.value.toUpperCase();
        state.workerId = null;

        AuroraUi.resetView(state);

        if (WorkerDatabase[id]) {
            state.workerId = id;
            AuroraUi.showWorkerProfile(WorkerDatabase[id]);
        } else {
            AuroraUi.hideWorkerProfile();
        }
    });

    if (durationPickerBtn) {
        durationPickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.isCustom) return;
            durationPickerOpen = !durationPickerOpen;
            AuroraUi.toggleDurationPicker(durationPickerOpen);
        });
    }

    document.addEventListener('click', () => AuroraUi.closeDurationPicker());

    if (customDurationBackBtn) {
        customDurationBackBtn.addEventListener('click', () => {
            state.isCustom = false;
            state.durationMinutes = 0;
            state.durationLabel = '';
            AuroraUi.showCustomInput(false);
            customDurationInput.value = '';
            AuroraUi.setDurationDisplay('Seleccionar...', false);
            AuroraUi.resetView(state);
        });
    }

    customDurationInput.addEventListener('input', (e) => {
        if (state.isCustom) {
            const hours = parseInt(e.target.value, 10) || 0;
            state.durationMinutes = hours * 60;
            if (hours > 0) AuroraUi.setDurationDisplay(`${hours} h`, true);
            AuroraUi.resetView(state);
        }
    });

    if (helpBtn) helpBtn.addEventListener('click', openDirectory);
    if (openDirectoryBtn) openDirectoryBtn.addEventListener('click', openDirectory);
    if (closeHelpBtn) closeHelpBtn.addEventListener('click', () => AuroraUi.hideDirectoryModal());
    if (resetBtn) resetBtn.addEventListener('click', reset);
    if (calculateBtn) calculateBtn.addEventListener('click', updateCalculation);

    function openDirectory() {
        AuroraUi.showDirectoryModal();
        renderDirectory();
    }

    // Search Listener
    if (workerSearchInput) {
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
