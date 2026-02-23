let tg = window.Telegram.WebApp;
tg.expand();

let userId = tg.initDataUnsafe?.user?.id;
let balance = 0;
let passiveIncome = 0.001;
let clickPower = 1;

const balanceElement = document.getElementById('balance');
const passiveIncomeElement = document.getElementById('passiveIncome');
const clickPowerElement = document.getElementById('clickPower');
const coinElement = document.getElementById('coin');

// Базовый URL вашего бекенда (где запущен бот)
const API_URL = 'http://localhost:3000'; // Если бот локально
// Или если бот на сервере: const API_URL = 'https://ваш-сервер.com';

// Загрузка данных пользователя
async function loadUserData() {
    if (!userId) {
        console.log('Нет Telegram userId');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/user/${userId}`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const user = await response.json();
        
        balance = user.balance || 0;
        passiveIncome = user.passive_income || 0.001;
        clickPower = user.click_power || 1;
        
        updateUI();
    } catch (error) {
        console.error('Error loading user data:', error);
        // Если ошибка, показываем демо-данные
        balance = 0;
        passiveIncome = 0.001;
        clickPower = 1;
        updateUI();
    }
}

// Обновление UI
function updateUI() {
    balanceElement.textContent = balance.toFixed(3);
    passiveIncomeElement.textContent = passiveIncome.toFixed(3);
    clickPowerElement.textContent = clickPower;
}

// Показ уведомления
function showNotification(text, isError = false) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    notification.style.background = isError ? '#e74c3c' : '#9b59b6';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Обработка клика
async function handleClick() {
    if (!userId) {
        showNotification('❌ Ошибка авторизации', true);
        return;
    }

    // Анимация сразу для отзывчивости
    coinElement.style.transform = 'scale(0.9)';
    setTimeout(() => {
        coinElement.style.transform = '';
    }, 100);

    try {
        const response = await fetch(`${API_URL}/api/click`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) throw new Error('Ошибка клика');
        
        const data = await response.json();
        
        if (data.success) {
            balance = data.newBalance;
            updateUI();
            showNotification(`+${data.reward.toFixed(3)}`);
        }
    } catch (error) {
        console.error('Error clicking:', error);
        // Если сервер не доступен, работаем в демо-режиме
        balance += 0.001 * clickPower;
        updateUI();
        showNotification('⚠️ Демо-режим', true);
    }
}

// Пассивный доход (если сервер не доступен)
setInterval(async () => {
    if (!userId) return;
    
    try {
        await loadUserData(); // Обновляем данные с сервера
    } catch (error) {
        // Если сервер не доступен, эмулируем
        balance += passiveIncome;
        updateUI();
    }
}, 5000); // Обновляем каждые 5 секунд

// Инициализация
if (userId) {
    loadUserData();
    console.log('Пользователь Telegram:', userId);
} else {
    console.log('Демо-режим: нет пользователя Telegram');
    // Демо-режим
    balance = 0;
    passiveIncome = 0.001;
    clickPower = 1;
    updateUI();
    
    // В демо-режиме клик работает локально
    coinElement.addEventListener('click', () => {
        balance += 0.001 * clickPower;
        updateUI();
        
        coinElement.style.transform = 'scale(0.9)';
        setTimeout(() => {
            coinElement.style.transform = '';
        }, 100);
        
        showNotification(`+${(0.001 * clickPower).toFixed(3)}`);
    });
}

// Если есть userId, добавляем обработчик клика
if (userId) {
    coinElement.addEventListener('click', handleClick);
}

// Добавляем стили для уведомлений
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #9b59b6;
        color: white;
        padding: 10px 20px;
        border-radius: 10px;
        animation: slideDown 0.3s ease;
        z-index: 1000;
        font-weight: bold;
    }
    
    @keyframes slideDown {
        from {
            top: -50px;
            opacity: 0;
        }
        to {
            top: 20px;
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
