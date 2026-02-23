const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');
const supabase = require('./utils/supabaseClient');

dotenv.config();

// Инициализация бота
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Инициализация Express сервера для Mini App
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Функция для получения или создания пользователя
async function getOrCreateUser(telegramUser) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', telegramUser.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // Пользователь не найден, создаем нового
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          balance: 0,
          passive_income: 0.001
        }
      ])
      .select()
      .single();

    if (createError) throw createError;
    return newUser;
  }

  return user;
}

// Функция для обновления пассивного дохода
async function updatePassiveIncome(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) return;

  const now = new Date();
  const lastUpdate = new Date(user.last_passive_update);
  const secondsPassed = Math.floor((now - lastUpdate) / 1000);
  
  if (secondsPassed > 0) {
    const passiveEarned = user.passive_income * secondsPassed;
    
    await supabase
      .from('users')
      .update({ 
        balance: user.balance + passiveEarned,
        last_passive_update: now
      })
      .eq('id', userId);

    // Записываем транзакцию
    await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          amount: passiveEarned,
          type: 'passive',
          description: `Пассивный доход за ${secondsPassed} сек`
        }
      ]);
  }
}

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getOrCreateUser(msg.from);
  
  const welcomeMessage = `
🎮 Добро пожаловать в Фиолетовый Кликер!

💰 Твой баланс: ${user.balance.toFixed(3)} монет
⚡️ Пассивный доход: ${user.passive_income}/сек

🎯 Доступные команды:
/play - Играть в Mini App
/balance - Мой баланс
/shop - Магазин улучшений
/lottery - Информация о лотерее

💰 Игровые команды в чате:
бал - показать баланс
лотерея - начать новую лотерею
ставка [сумма] - сделать ставку (1000, 10к, 1кк и т.д.)
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

// Команда /balance
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  await updatePassiveIncome(msg.from.id);
  
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', msg.from.id)
    .single();

  await bot.sendMessage(chatId, `
💰 Твой баланс: ${user.balance.toFixed(3)} монет
⚡️ Пассивный доход: ${user.passive_income}/сек
👆 Сила клика: x${user.click_power}
  `);
});

// Команда "бал" в чате
bot.onText(/бал/, async (msg) => {
  const chatId = msg.chat.id;
  await updatePassiveIncome(msg.from.id);
  
  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('id', msg.from.id)
    .single();

  await bot.sendMessage(chatId, `💰 Твой баланс: ${user.balance.toFixed(3)} монет`);
});

// Команда "лотерея"
bot.onText(/лотерея/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Проверяем, есть ли активная лотерея
  const { data: activeLottery } = await supabase
    .from('lotteries')
    .select('*')
    .eq('status', 'active')
    .single();

  if (activeLottery) {
    return bot.sendMessage(chatId, '🎲 Лотерея уже активна! Сделайте ставку командой "ставка [сумма]"');
  }

  // Создаем новую лотерею
  const { data: lottery, error } = await supabase
    .from('lotteries')
    .insert([{ status: 'active' }])
    .select()
    .single();

  if (error) {
    return bot.sendMessage(chatId, '❌ Ошибка при создании лотереи');
  }

  bot.sendMessage(chatId, `
🎲 Новая лотерея создана!
💰 Призовой фонд формируется из ставок
📝 Делайте ставки командой "ставка [сумма]"
Примеры: ставка 1к, ставка 10к, ставка 1кк
  `);
});

// Функция для парсинга суммы из текста (1к, 10к, 1кк и т.д.)
function parseAmount(text) {
  const match = text.match(/(\d+)(к*)/i);
  if (!match) return null;
  
  let amount = parseInt(match[1]);
  const kCount = match[2].length;
  
  amount = amount * Math.pow(1000, kCount);
  return amount;
}

// Команда "ставка"
bot.onText(/ставка (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amountText = match[1];
  
  const amount = parseAmount(amountText);
  if (!amount || amount < 1000) {
    return bot.sendMessage(chatId, '❌ Минимальная ставка: 1000 (1к)');
  }

  // Проверяем активную лотерею
  const { data: activeLottery } = await supabase
    .from('lotteries')
    .select('*')
    .eq('status', 'active')
    .single();

  if (!activeLottery) {
    return bot.sendMessage(chatId, '❌ Нет активной лотереи. Создайте командой "лотерея"');
  }

  // Обновляем пассивный доход и проверяем баланс
  await updatePassiveIncome(msg.from.id);
  
  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('id', msg.from.id)
    .single();

  if (user.balance < amount) {
    return bot.sendMessage(chatId, `❌ Недостаточно средств! Твой баланс: ${user.balance.toFixed(3)}`);
  }

  // Списываем средства
  await supabase
    .from('users')
    .update({ balance: user.balance - amount })
    .eq('id', msg.from.id);

  // Записываем транзакцию
  await supabase
    .from('transactions')
    .insert([
      {
        user_id: msg.from.id,
        amount: -amount,
        type: 'lottery_bet',
        description: 'Ставка в лотерее'
      }
    ]);

  // Добавляем ставку
  await supabase
    .from('lottery_bets')
    .insert([
      {
        lottery_id: activeLottery.id,
        user_id: msg.from.id,
        amount: amount
      }
    ]);

  // Обновляем призовой фонд
  await supabase
    .from('lotteries')
    .update({ prize: (activeLottery.prize || 0) + amount })
    .eq('id', activeLottery.id);

  bot.sendMessage(chatId, `✅ Ставка ${amountText} принята!`);
});

// Команда "кончить" (завершить лотерею)
bot.onText(/кончить/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Получаем активную лотерею
  const { data: activeLottery } = await supabase
    .from('lotteries')
    .select('*')
    .eq('status', 'active')
    .single();

  if (!activeLottery) {
    return bot.sendMessage(chatId, '❌ Нет активной лотереи');
  }

  // Получаем все ставки
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

  // Выбираем случайного победителя
  const winner = bets[Math.floor(Math.random() * bets.length)];
  const prize = activeLottery.prize || 0;

  // Начисляем приз победителю
  const { data: winnerUser } = await supabase
    .from('users')
    .select('balance')
    .eq('id', winner.user_id)
    .single();

  await supabase
    .from('users')
    .update({ balance: winnerUser.balance + prize })
    .eq('id', winner.user_id);

  // Записываем транзакцию
  await supabase
    .from('transactions')
    .insert([
      {
        user_id: winner.user_id,
        amount: prize,
        type: 'lottery_win',
        description: 'Выигрыш в лотерее'
      }
    ]);

  // Завершаем лотерею
  await supabase
    .from('lotteries')
    .update({ 
      status: 'finished',
      winner_id: winner.user_id,
      finished_at: new Date()
    })
    .eq('id', activeLottery.id);

  // Получаем информацию о победителе
  const winnerInfo = await bot.getChatMember(chatId, winner.user_id);

  bot.sendMessage(chatId, `
🎉 Лотерея завершена!
🏆 Победитель: ${winnerInfo.user.first_name}
💰 Выигрыш: ${prize.toFixed(3)} монет

Поздравляем! 🎊
  `);
});

// API endpoints для Mini App
app.get('/api/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    await updatePassiveIncome(userId);
    
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/click', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const clickReward = 0.001 * user.click_power;
    const newBalance = user.balance + clickReward;

    await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    // Записываем транзакцию
    await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          amount: clickReward,
          type: 'click',
          description: 'Клик по монетке'
        }
      ]);

    res.json({ success: true, newBalance, reward: clickReward });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/upgrades', async (req, res) => {
  try {
    const { data: upgrades } = await supabase
      .from('upgrades')
      .select('*')
      .order('price');

    res.json(upgrades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/buy-upgrade', async (req, res) => {
  try {
    const { userId, upgradeId } = req.body;

    // Получаем улучшение
    const { data: upgrade } = await supabase
      .from('upgrades')
      .select('*')
      .eq('id', upgradeId)
      .single();

    // Получаем пользователя
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Проверяем, есть ли уже такое улучшение
    const { data: existingUpgrade } = await supabase
      .from('user_upgrades')
      .select('*')
      .eq('user_id', userId)
      .eq('upgrade_id', upgradeId)
      .single();

    const currentLevel = existingUpgrade?.level || 0;
    
    if (currentLevel >= upgrade.max_level) {
      return res.status(400).json({ error: 'Достигнут максимальный уровень' });
    }

    if (user.balance < upgrade.price) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }

    // Списываем средства
    await supabase
      .from('users')
      .update({ balance: user.balance - upgrade.price })
      .eq('id', userId);

    // Обновляем или создаем запись об улучшении
    if (existingUpgrade) {
      await supabase
        .from('user_upgrades')
        .update({ level: existingUpgrade.level + 1 })
        .eq('id', existingUpgrade.id);
    } else {
      await supabase
        .from('user_upgrades')
        .insert([
          {
            user_id: userId,
            upgrade_id: upgradeId,
            level: 1
          }
        ]);
    }

    // Обновляем характеристики пользователя
    const updates = {};
    if (upgrade.type === 'click') {
      updates.click_power = user.click_power * upgrade.multiplier;
    } else if (upgrade.type === 'passive') {
      updates.passive_income = user.passive_income * upgrade.multiplier;
    }

    await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    // Записываем транзакцию
    await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          amount: -upgrade.price,
          type: 'upgrade',
          description: `Куплено улучшение: ${upgrade.name}`
        }
      ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Запуск пассивного дохода каждую секунду
cron.schedule('* * * * * *', async () => {
  const { data: users } = await supabase
    .from('users')
    .select('*');

  for (const user of users) {
    await updatePassiveIncome(user.id);
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// API для получения данных пользователя
app.get('/api/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        // Ваша логика получения пользователя из Supabase
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для клика
app.post('/api/click', async (req, res) => {
    try {
        const { userId } = req.body;
        
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        const clickReward = 0.001 * user.click_power;
        const newBalance = user.balance + clickReward;

        await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', userId);

        res.json({ success: true, newBalance, reward: clickReward });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
