// Supabase конфигурация - ВСТАВЬТЕ СВОИ КЛЮЧИ!
const SUPABASE_URL = 'https://ehfuuoussodqrwqoiugp.supabase.co';
const SUPABASE_KEY = 'sb_secret__EK5Ll9V131mFlsPYDc1Sg_kpDwTCJr'; // Ваш ключ

// Проверка наличия Supabase
if (!window.supabase) {
    console.error('❌ Supabase не загружен!');
    throw new Error('Supabase not loaded');
}

// Создаем клиент
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальный объект для работы с БД
window.DB = {
    users: {
        async get(tgId) {
            try {
                console.log('Запрос пользователя:', tgId);
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('tg_id', tgId)
                    .maybeSingle();
                
                if (error) {
                    console.error('Ошибка запроса:', error);
                    throw error;
                }
                console.log('Получен пользователь:', data);
                return data;
            } catch (error) {
                console.error('Ошибка получения пользователя:', error);
                return null;
            }
        },
        
        async create(userData) {
            try {
                console.log('Создание пользователя:', userData);
                const { data, error } = await supabaseClient
                    .from('users')
                    .insert([userData])
                    .select()
                    .single();
                
                if (error) {
                    console.error('Ошибка создания:', error);
                    throw error;
                }
                console.log('Создан пользователь:', data);
                return data;
            } catch (error) {
                console.error('Ошибка создания пользователя:', error);
                return null;
            }
        },
        
        async update(tgId, updates) {
            try {
                console.log('Обновление пользователя:', tgId, updates);
                const { data, error } = await supabaseClient
                    .from('users')
                    .update(updates)
                    .eq('tg_id', tgId)
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка обновления:', error);
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
                
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Ошибка рейтинга:', error);
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
                console.error('Ошибка промокода:', error);
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

console.log('✅ База данных подключена', SUPABASE_URL);
