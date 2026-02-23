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

// Middleware - ВАЖНО для работы с телефона
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============= ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ =============

async function getOrCreateUser(telegramUser) {
    try {
        console.log('Getting or creating user:', telegramUser.id);
        
        const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('id', telegramUser.id)
            .maybeSingle();

        if (existingUser) {
            console.log('User found:', existingUser.id);
            return existingUser;
        }

        console.log('Creating new user for ID:', telegramUser.id);
        
        const newUser = {
            id: telegramUser.id,
            username: telegramUser.username || null,
            first_name: telegramUser.first_name || 'User',
            last_name: telegramUser.last_name || null,
            balance: 0,
            passive_income: 0.001,
            click_power: 1,
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

        if (insertError) {
            console.error('Error creating user:', insertError);
            throw insertError;
        }
        
        console.log('User created successfully:', createdUser.id);
        return createdUser;
        
    } catch (error) {
        console.error('Error in getOrCreateUser:', error);
        return null;
    }
}

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
            const passiveEarned = Number((user.passive_income * secondsPassed).toFixed(3));
            const newBalance = Number((user.balance + passiveEarned).toFixed(3));
            
            await supabase
                .from('users')
                .update({ 
                    balance: newBalance,
                    last_passive_update: now.toISOString()
                })
                .eq('id', userId);

            return newBalance;
        }
        return user.balance;
    } catch (error) {
        console.error('Error in updatePassiveIncome:', error);
        return null;
    }
}

// ============= КОМАНДЫ ТЕЛЕГРАМ БОТА =============

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);
    
    if (!user) {
        return bot.sendMessage(chatId, '❌ Ошибка при создании пользователя');
    }

    const welcomeMessage = `
🎮 Добро пожаловать в Nova Coin!

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

bot.onText(/бал/, async (msg) => {
    const chatId = msg.chat.id;
    await updatePassiveIncome(msg.from.id);
    
    const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', msg.from.id)
        .single();

    await bot.sendMessage(chatId, `💰 Твой баланс: ${(user?.balance || 0).toFixed(3)} NC`);
});

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

function parseAmount(text) {
    const match = text.match(/(\d+)(к*)/i);
    if (!match) return null;
    
    let amount = parseInt(match[1]);
    const kCount = match[2].length;
    
    amount = amount * Math.pow(1000, kCount);
    return amount;
}

bot.onText(/лотерея/, async (msg) => {
    const chatId = msg.chat.id;
    
    const { data: activeLottery } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

    if (activeLottery) {
        return bot.sendMessage(chatId, '🎲 Лотерея уже активна! Сделайте ставку командой "ставка [сумма]"');
    }

    await supabase
        .from('lotteries')
        .insert([{ 
            status: 'active',
            prize: 0,
            created_at: new Date().toISOString()
        }]);

    bot.sendMessage(chatId, `
🎲 Новая лотерея создана!
💰 Призовой фонд формируется из ставок
📝 Делайте ставки командой "ставка [сумма]"
Примеры: ставка 1к, ставка 10к, ставка 1кк
    `);
});

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
        .maybeSingle();

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

    await supabase
        .from('users')
        .update({ balance: user.balance - amount })
        .eq('id', msg.from.id);

    await supabase
        .from('lottery_bets')
        .insert([{
            lottery_id: activeLottery.id,
            user_id: msg.from.id,
            amount: amount
        }]);

    await supabase
        .from('lotteries')
        .update({ prize: (activeLottery.prize || 0) + amount })
        .eq('id', activeLottery.id);

    bot.sendMessage(chatId, `✅ Ставка ${amountText} принята!`);
});

bot.onText(/кончить/, async (msg) => {
    const chatId = msg.chat.id;
    
    const { data: activeLottery } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

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

    const winner = bets[Math.floor(Math.random() * bets.length)];
    const prize = activeLottery.prize || 0;

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
    `);
});

// ============= API ENDPOINTS ДЛЯ MINI APP =============

app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        console.log('API: Getting user', userId);
        
        await updatePassiveIncome(userId);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('API: User not found', error);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('API: User found', user.id);
        res.json(user);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/click', async (req, res) => {
    try {
        const { userId } = req.body;
        console.log('API: Click from user', userId);
        
        const { data: user, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (selectError) {
            console.error('API: User not found for click', selectError);
            return res.status(404).json({ error: 'User not found' });
        }

        const clickReward = Number((0.001 * user.click_power).toFixed(3));
        const newBalance = Number((user.balance + clickReward).toFixed(3));
        const today = new Date().toISOString().split('T')[0];

        await supabase
            .from('users')
            .update({ 
                balance: newBalance,
                stats_today: Number((user.stats_today + clickReward).toFixed(3)),
                stats_total: Number((user.stats_total + clickReward).toFixed(3)),
                stats_clicks: user.stats_clicks + 1
            })
            .eq('id', userId);

        console.log('API: Click successful, new balance:', newBalance);

        res.json({ 
            success: true, 
            newBalance, 
            reward: clickReward 
        });
        
    } catch (error) {
        console.error('API Click Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/rating', async (req, res) => {
    try {
        console.log('API: Getting rating');
        
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, first_name, balance, stats_total, nickname, nickname_color')
            .order('balance', { ascending: false })
            .limit(50);

        if (error) throw error;

        const formattedUsers = users.map(user => ({
            id: user.id,
            name: user.nickname || user.first_name,
            username: user.username,
            balance: user.balance,
            totalEarned: user.stats_total,
            avatar: (user.nickname || user.first_name) ? (user.nickname || user.first_name)[0].toUpperCase() : '👤',
            color: user.nickname_color || '#9b59b6'
        }));

        console.log('API: Rating found', formattedUsers.length, 'users');
        res.json(formattedUsers);
    } catch (error) {
        console.error('API Rating Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= ПАССИВНЫЙ ДОХОД =============

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Local: http://localhost:${PORT}`);
    console.log(`📱 Network: http://${getLocalIP()}:${PORT}`);
    console.log(`📱 Mini App URL: https://${process.env.APP_URL}`);
    console.log(`🤖 Bot is running...`);
});

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}
