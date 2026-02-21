// НОВЫЙ ФАЙЛ supabase.js - без конфликтов!

// Конфигурация Supabase - ВСТАВЬТЕ СВОИ КЛЮЧИ
const SUPABASE_URL = 'https://ehfuuoussodqrwqoiugp.supabase.co';
const SUPABASE_KEY = 'sb_secret__EK5Ll9V131mFlsPYDc1Sg_kpDwTCJr'; // ВАШ НАСТОЯЩИЙ КЛЮЧ!

// Создаем клиент с другим именем, чтобы не было конфликтов
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальный объект для базы данных
window.database = {
    users: {
        // Получить пользователя
        async get(tgId) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('tg_id', tgId)
                    .maybeSingle();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка получения пользователя:', error);
                return null;
            }
        },
        
        // Создать пользователя
        async create(userData) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .insert([userData])
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка создания пользователя:', error);
                return null;
            }
        },
        
        // Обновить пользователя
        async update(tgId, updates) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .update(updates)
                    .eq('tg_id', tgId)
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка обновления пользователя:', error);
                return null;
            }
        },
        
        // Получить рейтинг
        async getRating(limit = 20) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('nickname, balance')
                    .order('balance', { ascending: false })
                    .limit(limit);
                
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Ошибка получения рейтинга:', error);
                return [];
            }
        }
    },
    
    promocodes: {
        async get(code) {
            try {
                const { data, error } = await supabaseClient
                    .from('promocodes')
                    .select('*')
                    .eq('code', code)
                    .maybeSingle();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка получения промокода:', error);
                return null;
            }
        },
        
        async create(promoData) {
            try {
                const { data, error } = await supabaseClient
                    .from('promocodes')
                    .insert([promoData])
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка создания промокода:', error);
                return null;
            }
        }
    },
    
    lottery: {
        async placeBet(betData) {
            try {
                const { error } = await supabaseClient
                    .from('lottery_bets')
                    .insert([betData]);
                
                if (error) throw error;
                return true;
            } catch (error) {
                console.error('Ошибка ставки:', error);
                return false;
            }
        },
        
        async getBets(lotteryType) {
            try {
                const { data, error } = await supabaseClient
                    .from('lottery_bets')
                    .select('*')
                    .eq('lottery_type', lotteryType);
                
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Ошибка получения ставок:', error);
                return [];
            }
        },
        
        async clearBets(lotteryType) {
            try {
                const { error } = await supabaseClient
                    .from('lottery_bets')
                    .delete()
                    .eq('lottery_type', lotteryType);
                
                if (error) throw error;
                return true;
            } catch (error) {
                console.error('Ошибка очистки ставок:', error);
                return false;
            }
        }
    }
};

console.log('✅ База данных подключена');
