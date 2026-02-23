let tg = window.Telegram.WebApp;
tg.expand();

let userId = tg.initDataUnsafe?.user?.id;
let balance = 0;
let passiveIncome = 0.001;
let clickPower = 1;
let upgrades = [];

const balanceElement = document.getElementById('balance');
const passiveIncomeElement = document.getElementById('passiveIncome');
const clickPowerElement = document.getElementById('clickPower');
const coinElement = document.getElementById('coin');
const upgradesElement = document.getElementById('upgrades');

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const response = await fetch(`/api/user/${userId}`);
        const user = await response.json();
        
        balance = user.balance;
        passiveIncome = user.passive_income;
        clickPower = user.click_power;
        
        updateUI();
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Загрузка улучшений
async function loadUpgrades() {
    try {
        const response = await fetch('/api/upgrades');
        upgrades = await response.json();
        renderUpgrades();
    } catch (error) {
        console.error('Error loading upgrades:', error);
    }
}

// Обновление UI
function updateUI() {
    balanceElement.textContent = balance.toFixed(3);
    passiveIncomeElement.textContent = passiveIncome.toFixed(3);
    clickPowerElement.textContent = clickPower;
}

// Показ уведомления
function showNotification(text) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Обработка клика
async function handleClick() {
    try {
        const response = await fetch('/api/click', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            balance = data.newBalance;
            updateUI();
            
            // Анимация
            coinElement.style.transform = 'scale(0.9)';
            setTimeout(() => {
                coinElement.style.transform = '';
            }, 100);
            
            showNotification(`+${data.reward.toFixed(3)}`);
        }
    } catch (error) {
        console.error('Error clicking:', error);
    }
}

// Покупка улучшения
async function buyUpgrade(upgradeId, price) {
    if (balance < price) {
        showNotification('❌ Недостаточно средств');
        return;
    }
    
    try {
        const response = await fetch('/api/buy-upgrade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, upgradeId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Улучшение куплено!');
            await loadUserData();
            await loadUpgrades();
        }
    } catch (error) {
        console.error('Error buying upgrade:', error);
        showNotification('❌ Ошибка при покупке');
    }
}

// Рендер улучшений
function renderUpgrades() {
    upgradesElement.innerHTML = '';
    
    upgrades.forEach(upgrade => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        
        card.innerHTML = `
            <div class="upgrade-info">
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-desc">${upgrade.description}</div>
                <div class="upgrade-price">💰 ${upgrade.price.toFixed(3)}</div>
            </div>
            <button class="upgrade-button" onclick="buyUpgrade(${upgrade.id}, ${upgrade.price})" ${balance < upgrade.price ? 'disabled' : ''}>
                Купить
            </button>
        `;
        
        upgradesElement.appendChild(card);
    });
}

// Обновление баланса каждые 10 секунд
setInterval(loadUserData, 10000);

// Инициализация
if (userId) {
    loadUserData();
    loadUpgrades();
    
    coinElement.addEventListener('click', handleClick);
} else {
    balanceElement.textContent = 'Ошибка авторизации';
}
