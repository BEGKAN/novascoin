// Supabase конфигурация - ВСТАВЬТЕ СВОИ КЛЮЧИ!
const SUPABASE_URL = 'https://ehfuuoussodqrwqoiugp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZnV1b3Vzc29kcXJ3cW9pdWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDEyNzksImV4cCI6MjA4NzI3NzI3OX0.Ffam9kaK6c1XKuMEzleTpRSEt4GeysCyu7MSaOUXKzs'; // ВАШ КЛЮЧ!

// Создаем клиент
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Защита от взлома через консоль
Object.freeze(window.DB);

// Глобальный объект для работы с БД
window.DB = {
    users: {
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
        
        async create(userData) {
            try {
                // Валидация данных
                if (!userData.tg_id || !userData.name) {
                    throw new Error('Недостаточно данных');
                }
                
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
        
        async update(tgId, updates) {
            try {
                // Запрещаем прямое изменение баланса через консоль
                // Все изменения баланса должны проходить через серверные функции
                const allowedUpdates = ['nickname', 'color', 'last_online'];
                
                // Проверяем, что обновляются только разрешенные поля
                for (let key in updates) {
                    if (!allowedUpdates.includes(key) && key !== 'balance') {
                        throw new Error('Нельзя обновлять это поле');
                    }
                }
                
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
        
        // Специальный метод для обновления баланса (только через игровые действия)
        async updateBalance(tgId, amount, operation) {
            try {
                // Получаем текущего пользователя
                const user = await this.get(tgId);
                if (!user) throw new Error('Пользователь не найден');
                
                let newBalance;
                if (operation === 'add') {
                    newBalance = (user.balance || 0) + amount;
                } else if (operation === 'subtract') {
                    newBalance = (user.balance || 0) - amount;
                } else {
                    throw new Error('Неверная операция');
                }
                
                // Защита от отрицательного баланса
                if (newBalance < 0) {
                    throw new Error('Недостаточно средств');
                }
                
                const { data, error } = await supabaseClient
                    .from('users')
                    .update({ balance: newBalance })
                    .eq('tg_id', tgId)
                    .eq('balance', user.balance) // Проверяем, что баланс не изменился с момента чтения
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка обновления баланса:', error);
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
        },
        
        async use(id) {
            try {
                const { data, error } = await supabaseClient
                    .from('promocodes')
                    .update({ uses_left: supabaseClient.rpc('decrement') })
                    .eq('id', id)
                    .select()
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Ошибка использования промокода:', error);
                return null;
            }
        }
    },
    
    lottery: {
        async placeBet(betData) {
            try {
                // Проверяем, что ставка положительная
                if (betData.amount <= 0) {
                    throw new Error('Ставка должна быть положительной');
                }
                
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

// Замораживаем объект, чтобы нельзя было изменить методы
Object.freeze(window.DB);

console.log('✅ База данных подключена');
