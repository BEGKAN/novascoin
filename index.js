const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cron = require('node-cron');

dotenv.config();

// ============= ИНИЦИАЛИЗАЦИЯ =============
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 3000;

// ============= MIDDLEWARE =============
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(bodyParser.json());

// ============= ТЕСТОВЫЙ ENDPOINT =============
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// ============= ФУНКЦИИ БАЗЫ ДАННЫХ =============
async function getUser(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    return data;
}

async function createUser(telegramUser) {
    const newUser = {
        id: telegramUser.id,
        username: telegramUser.username || '',
        first_name: telegramUser.first_name || 'User',
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

    const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

    return data;
}

async function getOrCreateUser(telegramUser) {
    let user = await getUser(telegramUser.id);
    if (!user) {
        user = await createUser(telegramUser);
    }
    return user;
}

async function updatePassiveIncome(userId) {
    const user = await getUser(userId);
    if (!user) return;

    const now = new Date();
    const lastUpdate = new Date(user.last_passive_update);
    const secondsPassed = Math.floor((now - lastUpdate) / 1000);
    
    if (secondsPassed > 0) {
        const earned = Number((user.passive_income * secondsPassed).toFixed(3));
        const newBalance = Number((user.balance + earned).toFixed(3));
        
        await supabase
            .from('users')
            .update({ 
                balance: newBalance,
                last_passive_update: now.toISOString()
            })
            .eq('id', userId);
    }
}

// ============= КОМАНДЫ БОТА =============
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await getOrCreateUser(msg.from);
    
    const welcomeMessage = `🎮 Добро пожаловать в Nova Coin!\n\n💰 Баланс: ${user.balance.toFixed(3)} NC\n⚡️ Пассивный доход: ${user.passive_income.toFixed(3)}/сек\n👆 Сила клика: x${user.click_power}\n\nКоманды:\n/balance - Баланс\n/top - Топ игроков\nлотерея - Создать лотерею\nставка 1к - Сделать ставку\nкончить - Завершить лотерею`;

    await bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            inline_keyboard: [[
                { text: '🎮 Открыть игру', web_app: { url: `https://${process.env.APP_URL}` } }
            ]]
        }
    });
});

bot.onText(/бал/, async (msg) => {
    const user = await getUser(msg.from.id);
    await bot.sendMessage(msg.chat.id, `💰 Баланс: ${user.balance.toFixed(3)} NC`);
});

bot.onText(/\/balance/, async (msg) => {
    await updatePassiveIncome(msg.from.id);
    const user = await getUser(msg.from.id);
    await bot.sendMessage(msg.chat.id, `💰 Баланс: ${user.balance.toFixed(3)} NC\n⚡️ Пассивный: ${user.passive_income.toFixed(3)}/сек\n👆 Сила клика: x${user.click_power}\n📊 Сегодня: +${user.stats_today} NC\n📈 Всего: ${user.stats_total} NC`);
});

bot.onText(/\/top/, async (msg) => {
    const { data: users } = await supabase
        .from('users')
        .select('nickname, balance')
        .order('balance', { ascending: false })
        .limit(10);

    let text = '🏆 ТОП ИГРОКОВ:\n\n';
    users.forEach((u, i) => text += `${i+1}. ${u.nickname} — ${u.balance.toFixed(3)} NC\n`);
    
    await bot.sendMessage(msg.chat.id, text);
});

// ============= ЛОТЕРЕЯ =============
function parseAmount(text) {
    const match = text.match(/(\d+)(к*)/i);
    if (!match) return null;
    let amount = parseInt(match[1]);
    amount *= Math.pow(1000, match[2].length);
    return amount;
}

bot.onText(/лотерея/, async (msg) => {
    const { data: existing } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .single();

    if (existing) {
        return bot.sendMessage(msg.chat.id, '🎲 Лотерея уже активна!');
    }

    await supabase.from('lotteries').insert([{ status: 'active', prize: 0 }]);
    bot.sendMessage(msg.chat.id, '🎲 Новая лотерея создана! Ставки командой "ставка 1к"');
});

bot.onText(/ставка (.+)/, async (msg, match) => {
    const amount = parseAmount(match[1]);
    if (!amount || amount < 1000) {
        return bot.sendMessage(msg.chat.id, '❌ Минимальная ставка: 1к');
    }

    const { data: lottery } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .single();

    if (!lottery) {
        return bot.sendMessage(msg.chat.id, '❌ Нет активной лотереи');
    }

    const user = await getUser(msg.from.id);
    if (user.balance < amount) {
        return bot.sendMessage(msg.chat.id, `❌ Недостаточно средств! Баланс: ${user.balance.toFixed(3)} NC`);
    }

    await supabase.from('users')
        .update({ balance: user.balance - amount })
        .eq('id', msg.from.id);

    await supabase.from('lottery_bets').insert([{
        lottery_id: lottery.id,
        user_id: msg.from.id,
        amount: amount
    }]);

    await supabase.from('lotteries')
        .update({ prize: lottery.prize + amount })
        .eq('id', lottery.id);

    bot.sendMessage(msg.chat.id, `✅ Ставка принята!`);
});

bot.onText(/кончить/, async (msg) => {
    const { data: lottery } = await supabase
        .from('lotteries')
        .select('*')
        .eq('status', 'active')
        .single();

    if (!lottery) return bot.sendMessage(msg.chat.id, '❌ Нет активной лотереи');

    const { data: bets } = await supabase
        .from('lottery_bets')
        .select('*')
        .eq('lottery_id', lottery.id);

    if (!bets || bets.length === 0) {
        await supabase.from('lotteries').update({ status: 'finished' }).eq('id', lottery.id);
        return bot.sendMessage(msg.chat.id, '❌ В лотерее не было ставок');
    }

    const winner = bets[Math.floor(Math.random() * bets.length)];
    
    const winnerUser = await getUser(winner.user_id);
    await supabase.from('users')
        .update({ balance: winnerUser.balance + lottery.prize })
        .eq('id', winner.user_id);

    await supabase.from('lotteries')
        .update({ status: 'finished', winner_id: winner.user_id })
        .eq('id', lottery.id);

    bot.sendMessage(msg.chat.id, `🎉 Победитель получает ${lottery.prize} NC!`);
});

// ============= API ENDPOINTS =============
app.get('/api/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        await updatePassiveIncome(userId);
        const user = await getUser(userId);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/click', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await getUser(userId);
        
        const reward = Number((0.001 * user.click_power).toFixed(3));
        const newBalance = Number((user.balance + reward).toFixed(3));

        await supabase
            .from('users')
            .update({ 
                balance: newBalance,
                stats_today: user.stats_today + reward,
                stats_total: user.stats_total + reward,
                stats_clicks: user.stats_clicks + 1
            })
            .eq('id', userId);

        res.json({ success: true, newBalance, reward });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/rating', async (req, res) => {
    try {
        const { data: users } = await supabase
            .from('users')
            .select('id, nickname, username, balance, stats_total, nickname_color')
            .order('balance', { ascending: false })
            .limit(50);

        const formatted = users.map(u => ({
            id: u.id,
            name: u.nickname,
            username: u.username,
            balance: u.balance,
            totalEarned: u.stats_total,
            avatar: u.nickname ? u.nickname[0].toUpperCase() : '👤',
            color: u.nickname_color
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/change-nickname', async (req, res) => {
    try {
        const { userId, newNickname } = req.body;
        const user = await getUser(userId);

        if (user.balance < 1000) {
            return res.status(400).json({ error: 'Недостаточно средств' });
        }

        await supabase
            .from('users')
            .update({ 
                nickname: newNickname,
                balance: user.balance - 1000
            })
            .eq('id', userId);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/change-color', async (req, res) => {
    try {
        const { userId, newColor } = req.body;
        const user = await getUser(userId);

        if (user.balance < 1000) {
            return res.status(400).json({ error: 'Недостаточно средств' });
        }

        await supabase
            .from('users')
            .update({ 
                nickname_color: newColor,
                balance: user.balance - 1000
            })
            .eq('id', userId);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ПАССИВНЫЙ ДОХОД =============
cron.schedule('* * * * * *', async () => {
    const { data: users } = await supabase.from('users').select('id');
    if (users) {
        for (const user of users) {
            await updatePassiveIncome(user.id);
        }
    }
});

// ============= ЗАПУСК =============
app.listen(PORT, () => {
    console.log(`\n=== СЕРВЕР ЗАПУЩЕН ===`);
    console.log(`📱 Порт: ${PORT}`);
    console.log(`📱 URL: https://novacoin-backend.onrender.com`);
    console.log('=======================\n');
});
