// Конфигурация Supabase - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
const SUPABASE_URL = 'https://ehfuuoussodqrwqoiugp.supabase.co';
const SUPABASE_KEY = 'sb_secret__EK5Ll9V131mFlsPYDc1Sg_kpDwTCJr';

// Создаем подключение к Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальный объект для базы данных
window.db = {
    // Пользователи
    users: {
        // Получить пользователя по Telegram ID
        async get(tgId) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('tg_id', tgId)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 - запись не найдена
                console.error('Error getting user:', error);
                return null;
            }
            return data;
        },
        
        // Создать нового пользователя
        async create(userData) {
            const { data, error } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();
            
            if (error) {
                console.error('Error creating user:', error);
                return null;
            }
            return data;
        },
        
        // Обновить пользователя
        async update(tgId, updates) {
            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('tg_id', tgId)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating user:', error);
                return null;
            }
            return data;
        },
        
        // Получить рейтинг
        async getRating(limit = 20) {
            const { data, error } = await supabase
                .from('users')
                .select('nickname, balance')
                .order('balance', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('Error getting rating:', error);
                return [];
            }
            return data;
        }
    },
    
    // Промокоды
    promocodes: {
        // Получить промокод
        async get(code) {
            const { data, error } = await supabase
                .from('promocodes')
                .select('*')
                .eq('code', code)
                .single();
            
            if (error) return null;
            return data;
        },
        
        // Создать промокод
        async create(promoData) {
            const { data, error } = await supabase
                .from('promocodes')
                .insert([promoData])
                .select()
                .single();
            
            if (error) return null;
            return data;
        },
        
        // Использовать промокод (уменьшить количество использований)
        async use(id) {
            const { data, error } = await supabase
                .from('promocodes')
                .update({ uses_left: supabase.raw('uses_left - 1') })
                .eq('id', id)
                .select()
                .single();
            
            if (error) return null;
            return data;
        }
    },
    
    // Ставки в лотереях
    lottery: {
        // Сделать ставку
        async placeBet(betData) {
            const { data, error } = await supabase
                .from('lottery_bets')
                .insert([betData])
                .select();
            
            if (error) {
                console.error('Error placing bet:', error);
                return false;
            }
            return true;
        },
        
        // Получить все ставки для лотереи
        async getBets(lotteryType) {
            const { data, error } = await supabase
                .from('lottery_bets')
                .select('*')
                .eq('lottery_type', lotteryType);
            
            if (error) return [];
            return data;
        },
        
        // Удалить все ставки для лотереи
        async clearBets(lotteryType) {
            const { error } = await supabase
                .from('lottery_bets')
                .delete()
                .eq('lottery_type', lotteryType);
            
            if (error) return false;
            return true;
        }
    }
};
