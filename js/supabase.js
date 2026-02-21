// Supabase конфигурация - ВСТАВЬТЕ СВОИ КЛЮЧИ!
const SUPABASE_URL = 'https://ehfuuoussodqrwqoiugp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZnV1b3Vzc29kcXJ3cW9pdWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDEyNzksImV4cCI6MjA4NzI3NzI3OX0.Ffam9kaK6c1XKuMEzleTpRSEt4GeysCyu7MSaOUXKzs'; // ВАШ КЛЮЧ!

// Создаем клиент
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Защита от взлома - удаляем все глобальные методы, которые могут быть использованы для взлома
delete window.supabase;
delete window.supabaseClient;

// Создаем защищенный контекст
(function() {
    // Приватные переменные
    let _userCache = new Map();
    
    // Глобальный объект только для чтения
    window.DB = {};
    
    // Функция для валидации суммы
    function validateAmount(amount) {
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            throw new Error('Неверная сумма');
        }
        return Math.round(amount * 1000) / 1000; // Округляем до 3 знаков
    }
    
    // Функция для валидации ID
    function validateTgId(tgId) {
        if (!tgId || typeof tgId !== 'number') {
            throw new Error('Неверный ID пользователя');
        }
        return tgId;
    }
    
    // Users API
    window.DB.users = {
        async get(tgId) {
            try {
                tgId = validateTgId(tgId);
                
                // Проверяем кэш
                if (_userCache.has(tgId)) {
                    return _userCache.get(tgId);
                }
                
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('tg_id', tgId)
                    .maybeSingle();
                
                if (error) throw error;
                
                if (data) {
                    _userCache.set(tgId, data);
                }
                
                return data;
            } catch (error) {
                console.error('Ошибка получения пользователя:', error);
                return null;
            }
        },
        
        async create(userData) {
            try {
                if (!userData.tg_id || !userData.name) {
                    throw new Error('Недостаточно данных');
                }
                
                const { data, error } = await supabaseClient
                    .from('users')
                    .insert([userData])
                    .select()
                    .single();
                
                if (error) throw error;
                
                if (data) {
                    _userCache.set(data.tg_id, data);
                }
                
                return data;
            } catch (error) {
                console.error('Ошибка создания пользователя:', error);
                return null;
            }
        },
        
        async update(tgId, updates) {
            try {
                tgId = validateTgId(tgId);
                
                // Разрешаем только определенные поля
                const allowedUpdates = ['nickname', 'color'];
                const filteredUpdates = {};
                
                for (let key of allowedUpdates) {
                    if (updates[key] !== undefined) {
                        filteredUpdates[key] = updates[key];
                    }
                }
                
                if (Object.keys(filteredUpdates).length === 0) {
                    return null;
                }
                
                const { data, error } = await supabaseClient
                    .from('users')
                    .update(filteredUpdates)
                    .eq('tg_id', tgId)
                    .select()
                    .single();
                
                if (error) throw error;
                
                if (data) {
                    _userCache.set(tgId, data);
                }
                
                return data;
            } catch (error) {
                console.error('Ошибка обновления пользователя:', error);
                return null;
            }
        },
        
        async addBalance(tgId, amount) {
            try {
                tgId = validateTgId(tgId);
                amount = validateAmount(amount);
                
                // Используем RPC для атомарного обновления
                const { data, error } = await supabaseClient
                    .rpc('add_balance', {
                        user_tg_id: tgId,
                        add_amount: amount
                    });
                
                if (error) throw error;
                
                // Обновляем кэш
                const user = await this.get(tgId);
                return user;
            } catch (error) {
                console.error('Ошибка добавления баланса:', error);
                return null;
            }
        },
        
        async subtractBalance(tgId, amount) {
            try {
                tgId = validateTgId(tgId);
                amount = validateAmount(amount);
                
                // Используем RPC для атомарного обновления
                const { data, error } = await supabaseClient
                    .rpc('subtract_balance', {
                        user_tg_id: tgId,
                        subtract_amount: amount
                    });
                
                if (error) throw error;
                
                // Обновляем кэш
                const user = await this.get(tgId);
                return user;
            } catch (error) {
                console.error('Ошибка списания баланса:', error);
                return null;
            }
        },
        
        async getRating(limit = 20) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('nickname, color, balance')
                    .order('balance', { ascending: false })
                    .limit(limit);
                
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('Ошибка получения рейтинга:', error);
                return [];
            }
        }
    };
    
    // Promocodes API
    window.DB.promocodes = {
        async get(code) {
            try {
                if (!code || typeof code !== 'string') {
                    throw new Error('Неверный код');
                }
                
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
                if (!promoData.code || !promoData.amount || !promoData.uses_left) {
                    throw new Error('Недостаточно данных');
                }
                
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
        },
        
        async use(id) {
            try {
                if (!id || typeof id !== 'number') {
                    throw new Error('Неверный ID');
                }
                
                const { data, error } = await supabaseClient
                    .rpc('use_promocode', {
                        promo_id: id
                    });
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка использования промокода:', error);
                return null;
            }
        }
    };
    
    // Lottery API
    window.DB.lottery = {
        async placeBet(betData) {
            try {
                if (!betData.user_id || !betData.lottery_type || !betData.amount) {
                    throw new Error('Недостаточно данных');
                }
                
                betData.amount = validateAmount(betData.amount);
                
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
                if (!lotteryType || typeof lotteryType !== 'string') {
                    throw new Error('Неверный тип лотереи');
                }
                
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
                if (!lotteryType || typeof lotteryType !== 'string') {
                    throw new Error('Неверный тип лотереи');
                }
                
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
    };
    
    // Замораживаем объект
    Object.freeze(window.DB);
    Object.freeze(window.DB.users);
    Object.freeze(window.DB.promocodes);
    Object.freeze(window.DB.lottery);
})();

console.log('✅ База данных подключена');
