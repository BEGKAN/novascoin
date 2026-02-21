// Конфигурация Supabase - ЗАМЕНИТЕ НА СВОИ КЛЮЧИ
const SUPABASE_URL = 'https://ehfuuoussodqrwqoiugp.supabase.co';
const SUPABASE_KEY = 'sb_secret__EK5Ll9V131mFlsPYDc1Sg_kpDwTCJr'; // ВАШ КЛЮЧ

// Создаем подключение к Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальный объект для базы данных
window.db = {
    users: {
        async get(tgId) {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('tg_id', tgId)
                .maybeSingle();
            
            if (error) {
                console.error('Error getting user:', error);
                return null;
            }
            return data;
        },
        
        async create(userData) {
            const { data, error } = await supabaseClient
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
        
        async update(tgId, updates) {
            const { data, error } = await supabaseClient
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
        
        async getRating(limit = 20) {
            const { data, error } = await supabaseClient
                .from('users')
                .select('nickname, balance')
                .order('balance', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('Error getting rating:', error);
                return [];
            }
            return data || [];
        }
    },
    
    promocodes: {
        async get(code) {
            const { data, error } = await supabaseClient
                .from('promocodes')
                .select('*')
                .eq('code', code)
                .maybeSingle();
            
            if (error) return null;
            return data;
        },
        
        async create(promoData) {
            const { data, error } = await supabaseClient
                .from('promocodes')
                .insert([promoData])
                .select()
                .single();
            
            if (error) return null;
            return data;
        },
        
        async use(id) {
            const { data, error } = await supabaseClient
                .from('promocodes')
                .update({ uses_left: supabaseClient.rpc('decrement', { x: 1 }) })
                .eq('id', id)
                .select()
                .single();
            
            if (error) return null;
            return data;
        }
    },
    
    lottery: {
        async placeBet(betData) {
            const { data, error } = await supabaseClient
                .from('lottery_bets')
                .insert([betData])
                .select();
            
            if (error) {
                console.error('Error placing bet:', error);
                return false;
            }
            return true;
        },
        
        async getBets(lotteryType) {
            const { data, error } = await supabaseClient
                .from('lottery_bets')
                .select('*')
                .eq('lottery_type', lotteryType);
            
            if (error) return [];
            return data || [];
        },
        
        async clearBets(lotteryType) {
            const { error } = await supabaseClient
                .from('lottery_bets')
                .delete()
                .eq('lottery_type', lotteryType);
            
            if (error) return false;
            return true;
        }
    }
};

console.log('✅ Supabase подключен');
