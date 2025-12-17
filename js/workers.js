window.WorkerDatabase = {
    "A101": {
        "id": "A101",
        "name": "Ana Martínez",
        "role": "Desarrolladora Senior",
        "status": "Activo",
        "avatar": "https://ui-avatars.com/api/?name=Ana+Martinez&background=0D8ABC&color=fff",
        "schedule": {
            "workDays": [1, 2, 3, 4, 5], 
            "startHour": 9, "startMinute": 0, "endHour": 17, "endMinute": 0,
            "holidays": ["2024-12-25", "2024-01-01", "2024-05-01"] 
        }
    },
    "B202": {
        "id": "B202",
        "name": "Carlos Ruiz",
        "role": "Soporte Técnico",
        "status": "Activo",
        "avatar": "https://ui-avatars.com/api/?name=Carlos+Ruiz&background=EB4D4B&color=fff",
        "schedule": {
            "workDays": [2, 3, 4, 5, 6], 
            "startHour": 14, "startMinute": 0, "endHour": 22, "endMinute": 0,
            "holidays": ["2024-12-25"]
        }
    },
    "C303": {
        "id": "C303",
        "name": "Elena Code",
        "role": "DevOps (Fin de Semana)",
        "status": "Guardia",
        "avatar": "https://ui-avatars.com/api/?name=Elena+Code&background=8E44AD&color=fff",
        "schedule": {
            "workDays": [6, 0], 
            "startHour": 8, "startMinute": 0, "endHour": 20, "endMinute": 0,
            "holidays": []
        }
    },
    "D404": {
        "id": "D404",
        "name": "David Night",
        "role": "Seguridad / Monitoreo",
        "status": "Nocturno",
        "avatar": "https://ui-avatars.com/api/?name=David+Night&background=2C3E50&color=fff",
        "schedule": {
            "workDays": [1, 2, 3, 4, 5], 
            "startHour": 16, "startMinute": 0, "endHour": 23, "endMinute": 59,
            "holidays": []
        }
    },
    "E505": {
        "id": "E505",
        "name": "Sarah Morning",
        "role": "Junior Dev",
        "status": "Mañana",
        "avatar": "https://ui-avatars.com/api/?name=Sarah+Morning&background=F1C40F&color=fff",
        "schedule": {
            "workDays": [1, 2, 3, 4, 5], 
            "startHour": 8, "startMinute": 0, "endHour": 12, "endMinute": 0,
            "holidays": []
        }
    },
    "F606": {
        "id": "F606",
        "name": "Fernando Design",
        "role": "UI/UX Designer",
        "status": "Creativo",
        "avatar": "https://ui-avatars.com/api/?name=Fernando+Design&background=E91E63&color=fff",
        "schedule": {
            "workDays": [1, 2, 3, 4, 5], 
            "startHour": 10, "startMinute": 0, "endHour": 18, "endMinute": 0,
            "holidays": []
        }
    },
    "G707": {
        "id": "G707",
        "name": "Gina Manager",
        "role": "Product Owner",
        "status": "Reuniones",
        "avatar": "https://ui-avatars.com/api/?name=Gina+Manager&background=9C27B0&color=fff",
        "schedule": {
            "workDays": [1, 2, 3, 4], 
            "startHour": 9, "startMinute": 0, "endHour": 15, "endMinute": 30,
            "holidays": []
        }
    },
    "H808": {
        "id": "H808",
        "name": "Falla la conexion Supabase",
        "role": "Becario QA",
        "status": "Aprendiendo",
        "avatar": "https://ui-avatars.com/api/?name=Hector+Intern&background=795548&color=fff",
        "schedule": {
            "workDays": [1, 3, 5], 
            "startHour": 10, "startMinute": 0, "endHour": 14, "endMinute": 0,
            "holidays": []
        }
    }
};

// ==========================================
// SIMULATION LOGIC: Random Availability
// ==========================================
(function simulateWorkloads() {
    const now = new Date();
    Object.values(window.WorkerDatabase).forEach(worker => {
        // Random check: 30% Free, 40% Busy small, 30% Busy large
        const r = Math.random();
        let busyMinutes = 0;

        if (r > 0.3 && r <= 0.7) {
            // Busy for 1-4 hours
            busyMinutes = Math.floor(Math.random() * 240) + 60;
        } else if (r > 0.7) {
            // Busy for 1-3 days
            busyMinutes = Math.floor(Math.random() * 4320) + 1440;
        }

        if (busyMinutes > 0) {
            worker.busyUntil = new Date(now.getTime() + busyMinutes * 60000).toISOString();
        } else {
            worker.busyUntil = null; // Totally free
        }
    });
})();
