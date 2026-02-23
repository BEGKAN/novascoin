const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cron = require('node-cron');

dotenv.config();

// Инициализация бота
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Инициализация Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============= ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ =============

// Получение или создание пользователя
async function getOrCreateUser(telegramUser) {
    try {
        // Проверяем, есть ли пользователь
        const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('id', telegramUser.id)
            .single();

        if (selectError && selectError.code === 'PGRST116') {
            // Пользователь не найден, создаем нового
            const newUser = {
                id: telegramUser.id,
                username: telegramUser.username || null,
                first_name: telegramUser.first_name || 'User',
                last_name: telegramUser.last_name || null,
                balance: 0,
                passive_income: 0.001,
                click_power: 1,
                passive_multiplier: 1,
                nickname: telegramUser.first_name || 'User',
                nickname_color: '#9b59b6',
                stats_today: 0,
                stats_total: 0,
                stats_clicks: 0,
                last_passive_update: new Date().toISOString()
            };

            const { data: createdUser, error: insertError } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();

            if (insertError) throw insertError;
            
            // Создаем запись в статистике за сегодня
            await supabase
                .from('daily_stats')
                .insert([{
                    user_id: telegramUser.id,
                    date: new Date().toISOString().split('T')[0],
                    earnings: 0
                }]);

            return createdUser;
        }

        return existingUser;
    } catch (error) {
        console.error('Error in getOrCreateUser:', error);
        return null;
    }
}

// Обновление пассивного дохода
async function updatePassiveIncome(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) return null;

        const now = new Date();
        const lastUpdate = new Date(user.last_passive_update);
        const secondsPassed = Math.floor((now - lastUpdate) / 1000);
        
        if (secondsPassed > 0) {
            const passiveEarned = user.passive_income * secondsPassed;
            const newBalance = user.balance + passiveEarned;
            
            await supabase
                .from('users')
                .update({ 
                    balance: newBalance,
                    last_passive_update: now.toISOString()
                })
                .eq('id', userId);

            // Обновляем статистику за сегодня
            const today = now.toISOString().split('T')[0];
            await supabase
                .from('daily_stats')
                .upsert({
                    user_id: userId,
                    date: today,
                    earnings: passiveEarned
                }, { onConflict: 'user_id,date' });

            return newBalance;
        }
        return user.balance;
    } catch (error) {
        console.error('Error in updatePassiveIncome:', error);
        return null;
    }
}

// ============= КОМАНДЫ ТЕЛЕГРАМ БОТА =============

// Команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);
    
    if (!user) {
        return bot.sendMessage(chatId, '❌ Ошибка при создании пользователя');
    }

    const welcomeMessage = `
🎮 Добро пожаловать в Фиолетовый Кликер!

💰 Твой баланс: ${user.balance.toFixed(3)} NC
⚡️ Пассивный доход: ${user.passive_income.toFixed(3)}/сек
👆 Сила клика: x${user.click_power}

🎯 Доступные команды:
/balance - Мой баланс
/top - Топ игроков

💰 Игровые команды:
бал - показать баланс
лотерея - начать новую лотерею
ставка [сумма] - сделать ставку (1к, 10к, 1кк)
кончить - завершить лотерею
  `;

    await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🎮 Открыть игру', web_app: { url: `https://${process.env.APP_URL}` } }]
            ]
        }
    });
});

// Команда "бал"
bot.onText(/бал/, async (msg) => {
    const chatId = msg.chat.id;
    const newBalance = await updatePassiveIncome(msg.from.id);
    
    const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', msg.from.id)
        .single();

    await bot.sendMessage(chatId, `💰 Твой баланс: ${(user?.balance || 0).toFixed(3)} NC`);
});

// Команда /balance
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    await updatePassiveIncome(msg.from.id);
    
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', msg.from.id)
        .single();

    if (!user) return;

    await bot.sendMessage(chatId, `
💰 Баланс: ${user.balance.toFixed(3)} NC
⚡️ Пассивный доход: ${user.passive_income.toFixed(3)}/сек
👆 Сила клика: x${user.click_power}
📊 Сегодня: +${user.stats_today.toFixed(3)} NC
📈 Всего: ${user.stats_total.toFixed(3)} NC
    `);
});

// Команда /top
bot.onText(/\/top/, async (msg) => {
    const chatId = msg.chat.id;
    
    const { data: topUsers } = await supabase
        .from('users')
        .select('id, username, first_name, balance, stats_total')
        .order('balance', { ascending: false })
        .limit(10);

    if (!topUsers || topUsers.length === 0) {
        return bot.sendMessage(chatId, '📊 Топ игроков пока пуст');
    }

    let message = '🏆 ТОП-10 ИГРОКОВ:\n\n';
    topUsers.forEach((user, index) => {
        const name = user.username ? `@${user.username}` : user.first_name;
        message += `${index + 1}. ${name} — ${user.balance.toFixed(3)} NC\n`;
    });

    await bot.sendMessage(chatId, message);
});

// ============= ЛОТЕРЕЙНАЯ СИСТЕМА =============

// Парсинг суммы (1к, 10к, 1кк)
function parseAmount(text) {
    const match = text.match(/(\d+)(к*)/i);
    if (!match) return null;
    
    let amount = parseInt(match[1]);
    const kCount = match[2].length;
    
    amount = amount * Math.pow(1000, kCount);
    return amount;
}

// Создание лотереи
bot.onText(/лотерея/, async (msg) => {
    const chatId = msg.chat.id;
    
    const { data: activeLottery } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .single();

    if (activeLottery) {
        return bot.sendMessage(chatId, '🎲 Лотерея уже активна! Сделайте ставку командой "ставка [сумма]"');
    }

    const { data: lottery } = await supabase
        .from('lotteries')
        .insert([{ 
            status: 'active',
            prize: 0,
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    bot.sendMessage(chatId, `
🎲 Новая лотерея создана!
💰 Призовой фонд формируется из ставок
📝 Делайте ставки командой "ставка [сумма]"
Примеры: ставка 1к, ставка 10к, ставка 1кк
    `);
});

// Ставка
bot.onText(/ставка (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const amountText = match[1];
    
    const amount = parseAmount(amountText);
    if (!amount || amount < 1000) {
        return bot.sendMessage(chatId, '❌ Минимальная ставка: 1000 (1к)');
    }

    const { data: activeLottery } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .single();

    if (!activeLottery) {
        return bot.sendMessage(chatId, '❌ Нет активной лотереи. Создайте командой "лотерея"');
    }

    await updatePassiveIncome(msg.from.id);
    
    const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', msg.from.id)
        .single();

    if (!user || user.balance < amount) {
        return bot.sendMessage(chatId, `❌ Недостаточно средств! Твой баланс: ${user?.balance.toFixed(3) || 0} NC`);
    }

    // Списываем средства
    await supabase
        .from('users')
        .update({ balance: user.balance - amount })
        .eq('id', msg.from.id);

    // Записываем транзакцию
    await supabase
        .from('transactions')
        .insert([{
            user_id: msg.from.id,
            amount: -amount,
            type: 'lottery_bet',
            description: 'Ставка в лотерее'
        }]);

    // Добавляем ставку
    await supabase
        .from('lottery_bets')
        .insert([{
            lottery_id: activeLottery.id,
            user_id: msg.from.id,
            amount: amount
        }]);

    // Обновляем призовой фонд
    await supabase
        .from('lotteries')
        .update({ prize: (activeLottery.prize || 0) + amount })
        .eq('id', activeLottery.id);

    bot.sendMessage(chatId, `✅ Ставка ${amountText} принята!`);
});

// Завершение лотереи
bot.onText(/кончить/, async (msg) => {
    const chatId = msg.chat.id;
    
    const { data: activeLottery } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .single();

    if (!activeLottery) {
        return bot.sendMessage(chatId, '❌ Нет активной лотереи');
    }

    const { data: bets } = await supabase
        .from('lottery_bets')
        .select('*')
        .eq('lottery_id', activeLottery.id);

    if (!bets || bets.length === 0) {
        await supabase
            .from('lotteries')
            .update({ status: 'finished' })
            .eq('id', activeLottery.id);
        
        return bot.sendMessage(chatId, '❌ В лотерее не было ставок');
    }

    // Выбираем победителя
    const winner = bets[Math.floor(Math.random() * bets.length)];
    const prize = activeLottery.prize || 0;

    // Начисляем приз
    const { data: winnerUser } = await supabase
        .from('users')
        .select('balance, stats_total')
        .eq('id', winner.user_id)
        .single();

    await supabase
        .from('users')
        .update({ 
            balance: winnerUser.balance + prize,
            stats_total: winnerUser.stats_total + prize
        })
        .eq('id', winner.user_id);

    // Записываем транзакцию
    await supabase
        .from('transactions')
        .insert([{
            user_id: winner.user_id,
            amount: prize,
            type: 'lottery_win',
            description: 'Выигрыш в лотерее'
        }]);

    // Завершаем лотерею
    await supabase
        .from('lotteries')
        .update({ 
            status: 'finished',
            winner_id: winner.user_id,
            finished_at: new Date().toISOString()
        })
        .eq('id', activeLottery.id);

    const winnerInfo = await bot.getChatMember(chatId, winner.user_id);

    bot.sendMessage(chatId, `
🎉 Лотерея завершена!
🏆 Победитель: ${winnerInfo.user.first_name}
💰 Выигрыш: ${prize.toFixed(3)} NC

Поздравляем! 🎊
    `);
});

// ============= API ENDPOINTS ДЛЯ MINI APP =============

// Получение данных пользователя
app.get('/api/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        // Обновляем пассивный доход
        await updatePassiveIncome(userId);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error in /api/user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обработка клика
app.post('/api/click', async (req, res) => {
    try {
        const { userId } = req.body;
        
        const { data: user, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (selectError) {
            return res.status(404).json({ error: 'User not found' });
        }

        const clickReward = 0.001 * user.click_power;
        const newBalance = user.balance + clickReward;
        const today = new Date().toISOString().split('T')[0];

        // Обновляем пользователя
        await supabase
            .from('users')
            .update({ 
                balance: newBalance,
                stats_today: user.stats_today + clickReward,
                stats_total: user.stats_total + clickReward,
                stats_clicks: user.stats_clicks + 1
            })
            .eq('id', userId);

        // Обновляем дневную статистику
        await supabase
            .from('daily_stats')
            .upsert({
                user_id: userId,
                date: today,
                earnings: clickReward
            }, { onConflict: 'user_id,date' });

        // Записываем транзакцию
        await supabase
            .from('transactions')
            .insert([{
                user_id: userId,
                amount: clickReward,
                type: 'click',
                description: 'Клик по монетке'
            }]);

        res.json({ 
            success: true, 
            newBalance, 
            reward: clickReward 
        });
    } catch (error) {
        console.error('Error in /api/click:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление баланса (для лотерей и т.д.)
app.post('/api/update-balance', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        
        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

        const newBalance = user.balance + amount;

        await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId);

        res.json({ success: true, newBalance });
    } catch (error) {
        console.error('Error in /api/update-balance:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение рейтинга
app.get('/api/rating', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, first_name, balance, stats_total, nickname, nickname_color')
            .order('balance', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Форматируем для отправки
        const formattedUsers = users.map(user => ({
            id: user.id,
            name: user.nickname || user.first_name,
            username: user.username,
            balance: user.balance,
            totalEarned: user.stats_total,
            avatar: user.first_name ? user.first_name[0].toUpperCase() : '👤',
            color: user.nickname_color || '#9b59b6'
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Error in /api/rating:', error);
        res.status(500).json({ error: error.message });
    }
});

// Покупка улучшения
app.post('/api/buy-upgrade', async (req, res) => {
    try {
        const { userId, upgradeId, price, type, multiplier } = req.body;
        
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (user.balance < price) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        // Обновляем характеристики
        const updates = {};
        if (type === 'click') {
            updates.click_power = user.click_power * multiplier;
        } else {
            updates.passive_income = user.passive_income * multiplier;
        }
        updates.balance = user.balance - price;

        await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        // Записываем транзакцию
        await supabase
            .from('transactions')
            .insert([{
                user_id: userId,
                amount: -price,
                type: 'upgrade',
                description: `Покупка улучшения ID: ${upgradeId}`
            }]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error in /api/buy-upgrade:', error);
        res.status(500).json({ error: error.message });
    }
});

// Смена ника
app.post('/api/change-nickname', async (req, res) => {
    try {
        const { userId, newNickname } = req.body;
        
        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

        if (user.balance < 1000) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        await supabase
            .from('users')
            .update({ 
                nickname: newNickname,
                balance: user.balance - 1000
            })
            .eq('id', userId);

        // Записываем транзакцию
        await supabase
            .from('transactions')
            .insert([{
                user_id: userId,
                amount: -1000,
                type: 'nickname_change',
                description: `Смена ника на ${newNickname}`
            }]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error in /api/change-nickname:', error);
        res.status(500).json({ error: error.message });
    }
});

// Смена цвета ника
app.post('/api/change-color', async (req, res) => {
    try {
        const { userId, newColor } = req.body;
        
        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

        if (user.balance < 1000) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        await supabase
            .from('users')
            .update({ 
                nickname_color: newColor,
                balance: user.balance - 1000
            })
            .eq('id', userId);

        // Записываем транзакцию
        await supabase
            .from('transactions')
            .insert([{
                user_id: userId,
                amount: -1000,
                type: 'color_change',
                description: `Смена цвета ника`
            }]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error in /api/change-color:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= ПАССИВНЫЙ ДОХОД =============

// Каждую секунду обновляем пассивный доход для всех пользователей
cron.schedule('* * * * * *', async () => {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('id');

        if (users) {
            for (const user of users) {
                await updatePassiveIncome(user.id);
            }
        }
    } catch (error) {
        console.error('Error in passive income cron:', error);
    }
});

// ============= ЗАПУСК СЕРВЕРА =============

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Mini App URL: https://${process.env.APP_URL}`);
    console.log(`🤖 Bot is running...`);
});
