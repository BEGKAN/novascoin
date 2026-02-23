let tg = window.Telegram.WebApp;
tg.expand();

let userId = tg.initDataUnsafe?.user?.id;
let username = tg.initDataUnsafe?.user?.username || null;
let firstName = tg.initDataUnsafe?.user?.first_name || 'User';

console.log('Telegram User:', { userId, username, firstName });

// Глобальные переменные
let userData = {
    id: userId,
    balance: 0,
    passiveIncome: 0.001,
    clickPower: 1,
    nickname: firstName,
    nicknameColor: '#9b59b6',
    stats: {
        today: 0,
        total: 0,
        clicks: 0
    }
};

// API URL - определяем в зависимости от окружения
const API_URL = (() => {
    // Если сайт открыт через localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Если на GitHub Pages - используем относительный путь или ваш сервер
    return 'https://ваш-сервер.com'; // ЗАМЕНИТЕ НА ВАШ СЕРВЕР!
})();

// Навигация
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
    });
});

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');

    loadPage(page);
}

function loadPage(page) {
    const content = document.getElementById('content');
    
    switch(page) {
        case 'home':
            content.innerHTML = window.pages.home.render(userData);
            window.pages.home.init();
            break;
        case 'shop':
            content.innerHTML = window.pages.shop.render(userData);
            window.pages.shop.init();
            break;
        case 'games':
            content.innerHTML = window.pages.games.render();
            window.pages.games.init();
            break;
        case 'rating':
            content.innerHTML = window.pages.rating.render();
            window.pages.rating.init();
            break;
        case 'profile':
            content.innerHTML = window.pages.profile.render(userData);
            window.pages.profile.init();
            break;
    }
}

// Загрузка данных пользователя
async function loadUserData(silent = false) {
    if (!userId) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/user/${userId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Обновляем данные
        userData.balance = data.balance || 0;
        userData.passiveIncome = data.passive_income || 0.001;
        userData.clickPower = data.click_power || 1;
        userData.nickname = data.nickname || firstName;
        userData.nicknameColor = data.nickname_color || '#9b59b6';
        userData.stats.today = data.stats_today || 0;
        userData.stats.total = data.stats_total || 0;
        userData.stats.clicks = data.stats_clicks || 0;
        
        // Если не тихое обновление - перезагружаем страницу
        if (!silent) {
            const activePage = document.querySelector('.nav-item.active').dataset.page;
            loadPage(activePage);
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Обновление баланса
async function updateBalance(amount) {
    if (!userId) {
        userData.balance += amount;
        userData.stats.today += amount;
        userData.stats.total += amount;
        return true;
    }

    try {
        const response = await fetch(`${API_URL}/api/update-balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, amount })
        });
        
        if (!response.ok) throw new Error('Ошибка обновления');
        
        const data = await response.json();
        userData.balance = data.newBalance;
        return true;
        
    } catch (error) {
        console.error('Error updating balance:', error);
        return false;
    }
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

// Инициализация
if (userId) {
    console.log('Initializing app for user:', userId);
    // Первая загрузка данных
    loadUserData().then(() => {
        navigateTo('home');
    });
    
    // Обновляем данные каждые 10 секунд (реже, чтобы не было мигания)
    setInterval(() => loadUserData(true), 10000);
} else {
    console.log('Demo mode - no Telegram user');
    navigateTo('home');
}

// Экспортируем глобальные функции
window.app = {
    userId,
    username,
    firstName,
    userData,
    API_URL,
    loadUserData,
    updateBalance,
    showNotification
};
