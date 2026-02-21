// Supabase конфигурация - ВСТАВЬТЕ ПРАВИЛЬНЫЕ КЛЮЧИ!
const SUPABASE_URL = 'https://ehfuuoussodqrwqoiugp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZnV1b3Vzc29kcXJ3cW9pdWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDEyNzksImV4cCI6MjA4NzI3NzI3OX0.Ffam9kaK6c1XKuMEzleTpRSEt4GeysCyu7MSaOUXKzs'; // Вставьте правильный anon key!

console.log('Подключение к Supabase:', SUPABASE_URL);

// Создаем клиент
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

// Глобальный объект для работы с БД
window.DB = {
    users: {
        async get(tgId) {
            try {
                console.log('Запрос пользователя...');
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('tg_id', tgId)
                    .maybeSingle();
                
                if (error) {
                    console.error('Ошибка запроса:', error);
                    return null;
                }
                return data;
            } catch (error) {
                console.error('Ошибка:', error);
                return null;
            }
        },
        
        async create(userData) {
            try {
                console.log('Создание пользователя...');
                const { data, error } = await supabaseClient
                    .from('users')
                    .insert([userData])
                    .select()
                    .single();
                
                if (error) {
                    console.error('Ошибка создания:', error);
                    return null;
                }
                return data;
            } catch (error) {
                console.error('Ошибка:', error);
                return null;
            }
        },
        
        async update(tgId, updates) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .update(updates)
                    .eq('tg_id', tgId)
                    .select()
                    .single();
                
                if (error) {
                    console.error('Ошибка обновления:', error);
                    return null;
                }
                return data;
            } catch (error) {
                console.error('Ошибка:', error);
                return null;
            }
        },
        
        async getRating(limit = 20) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('nickname, balance')
                    .order('balance', { ascending: false })
                    .limit(limit);
                
                if (error) {
                    console.error('Ошибка рейтинга:', error);
                    return [];
                }
                return data || [];
            } catch (error) {
                console.error('Ошибка:', error);
                return [];
            }
        }
    }
};

console.log('✅ База данных готова');
