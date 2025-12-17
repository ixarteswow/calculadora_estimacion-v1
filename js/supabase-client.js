console.log("Trace: supabase-client.js loaded");

const SupabaseClient = {
    // Read from window.CONFIG (loaded from js/config.js)
    url: window.CONFIG ? window.CONFIG.SUPABASE_URL : '',
    key: window.CONFIG ? window.CONFIG.SUPABASE_KEY : '',
    client: null,

    init: function() {
        console.log("Trace: SupabaseClient.init() called");
        if (window.supabase) {
            try {
                this.client = window.supabase.createClient(this.url, this.key, {
                    auth: {
                        persistSession: false, // Fix for file:// protocol postMessage errors
                        detectSessionInUrl: false, // Fix for file:// protocol
                        autoRefreshToken: false
                    }
                });
                console.log("Supabase Client Initialized");
            } catch (e) {
                console.warn("Supabase Init Error:", e);
            }
        } else {
            console.warn("Supabase SDK not found on window.");
        }
    },

    fetchWorkers: async function() {
        if (!this.client) {
            console.warn("Cannot fetch: Supabase client not initialized.");
            return null;
        }

        try {
            console.log("Fetching workers from Supabase...");
            const { data, error } = await this.client
                .from('workers')
                .select('*');

            if (error) throw error;
            
            if (data) {
                console.log(`Supabase fetch success: ${data.length} workers found.`);
                // Convert array to object map (ID -> Worker)
                const workerMap = {};
                data.forEach(w => {
                    // Safe Mapping: If Supabase has 'busy_until', use it for the App's 'busyUntil' property
                    if(w.busy_until) {
                        w.busyUntil = w.busy_until;
                    }
                    workerMap[w.id] = w;
                });
                return workerMap;
            }
        } catch (err) {
            console.error("Supabase Fetch Error:", err);
        }
        return null;
    }
};

window.SupabaseClient = SupabaseClient;
