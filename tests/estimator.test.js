'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AuroraEstimator = require('../js/estimator.js');

// Fixture determinista: no usa Date.now() ni Math.random().
// Semana de referencia: 2026-08-03 (lunes) a 2026-08-09 (domingo).
// 2026-08-05 es miércoles, 2026-08-08 es sábado.
function makeWorker(scheduleOverrides = {}, workerOverrides = {}) {
    return {
        id: 'TEST',
        name: 'Tester',
        role: 'QA',
        schedule: {
            workDays: [1, 2, 3, 4, 5],
            startHour: 9,
            startMinute: 0,
            endHour: 17,
            endMinute: 0,
            holidays: [],
            ...scheduleOverrides
        },
        ...workerOverrides
    };
}

test('T01: tarea contenida en un turno', () => {
    const res = AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), 120, makeWorker());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 5, 12, 0).getTime());
    assert.equal(res.effectiveStartDate.getTime(), new Date(2026, 7, 5, 10, 0).getTime());
});

test('T02: inicio antes del turno', () => {
    const res = AuroraEstimator.calculate(new Date(2026, 7, 5, 7, 0), 120, makeWorker());
    assert.equal(res.effectiveStartDate.getTime(), new Date(2026, 7, 5, 9, 0).getTime());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 5, 11, 0).getTime());
});

test('T03: inicio justo a la hora de salida', () => {
    const res = AuroraEstimator.calculate(new Date(2026, 7, 5, 17, 0), 60, makeWorker());
    assert.equal(res.effectiveStartDate.getTime(), new Date(2026, 7, 6, 9, 0).getTime());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 6, 10, 0).getTime());
});

test('T04: inicio después de la salida', () => {
    const res = AuroraEstimator.calculate(new Date(2026, 7, 5, 17, 30), 60, makeWorker());
    assert.equal(res.effectiveStartDate.getTime(), new Date(2026, 7, 6, 9, 0).getTime());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 6, 10, 0).getTime());
});

test('T05: duración que cruza una jornada', () => {
    const res = AuroraEstimator.calculate(new Date(2026, 7, 5, 16, 0), 120, makeWorker());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 6, 10, 0).getTime());
});

test('T06: duración que cruza varias jornadas', () => {
    // 1440 min = 3 jornadas completas de 480 min (9:00-17:00)
    const res = AuroraEstimator.calculate(new Date(2026, 7, 5, 9, 0), 1440, makeWorker());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 7, 17, 0).getTime());
});

test('T07: inicio en fin de semana', () => {
    const res = AuroraEstimator.calculate(new Date(2026, 7, 8, 9, 0), 60, makeWorker());
    assert.equal(res.effectiveStartDate.getTime(), new Date(2026, 7, 10, 9, 0).getTime());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 10, 10, 0).getTime());
});

test('T08: inicio en festivo', () => {
    const res = AuroraEstimator.calculate(
        new Date(2026, 7, 5, 9, 0),
        60,
        makeWorker({ holidays: ['2026-08-05'] })
    );
    assert.equal(res.effectiveStartDate.getTime(), new Date(2026, 7, 6, 9, 0).getTime());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 6, 10, 0).getTime());
});

test('T09: festivos consecutivos', () => {
    const res = AuroraEstimator.calculate(
        new Date(2026, 7, 5, 9, 0),
        60,
        makeWorker({ holidays: ['2026-08-05', '2026-08-06'] })
    );
    assert.equal(res.effectiveStartDate.getTime(), new Date(2026, 7, 7, 9, 0).getTime());
    assert.equal(res.finishDate.getTime(), new Date(2026, 7, 7, 10, 0).getTime());
});

test('T10: duración cero lanza error', () => {
    assert.throws(
        () => AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), 0, makeWorker()),
        TypeError
    );
});

test('T11: duración negativa, NaN o infinita lanza error', () => {
    const invalidDurations = [-60, NaN, Infinity];
    invalidDurations.forEach((d) => {
        assert.throws(
            () => AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), d, makeWorker()),
            TypeError
        );
    });
});

test('T12: fecha de inicio inválida lanza error', () => {
    assert.throws(
        () => AuroraEstimator.calculate(new Date('no es una fecha'), 60, makeWorker()),
        TypeError
    );
});

test('T13: workDays vacío o fuera de rango lanza error', () => {
    const invalidSchedules = [{ workDays: [] }, { workDays: [7] }];
    invalidSchedules.forEach((s) => {
        assert.throws(
            () => AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), 60, makeWorker(s)),
            TypeError
        );
    });
});

test('T14: holidays ausente o malformado lanza error', () => {
    const noHolidays = { schedule: { workDays: [1, 2, 3, 4, 5], startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 } };
    assert.throws(
        () => AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), 60, makeWorker({}, noHolidays)),
        TypeError
    );
    assert.throws(
        () => AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), 60, makeWorker({ holidays: '2026-08-05' })),
        TypeError
    );
});

test('T15: hora/minuto fuera de rango lanza error', () => {
    const invalidSchedules = [
        { startHour: 25 },
        { startMinute: 60 },
        { endHour: -1 },
        { endMinute: 99 }
    ];
    invalidSchedules.forEach((s) => {
        assert.throws(
            () => AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), 60, makeWorker(s)),
            TypeError
        );
    });
});

test('T16: inicio de turno igual o posterior al fin lanza error', () => {
    const invalidSchedules = [
        { startHour: 17, endHour: 9 },
        { startHour: 9, endHour: 9 }
    ];
    invalidSchedules.forEach((s) => {
        assert.throws(
            () => AuroraEstimator.calculate(new Date(2026, 7, 5, 10, 0), 60, makeWorker(s)),
            RangeError
        );
    });
});

test('T17: calendario sin ningún turno disponible lanza error', () => {
    // Bloques festivos que cubren todo el horizonte de búsqueda del motor.
    const blocked = [];
    const base = new Date(2026, 7, 5);
    for (let i = 0; i < 367; i++) {
        const d = new Date(base.getTime() + i * 86400000);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        blocked.push(iso);
    }
    assert.throws(
        () => AuroraEstimator.calculate(new Date(2026, 7, 5, 9, 0), 60, makeWorker({ holidays: blocked })),
        RangeError
    );
});
