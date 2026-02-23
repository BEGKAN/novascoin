let tg = window.Telegram.WebApp;
tg.expand();

const userId = tg.initDataUnsafe?.user?.id;
const username = tg.initDataUnsafe?.user?.username || 'user';
const firstName = tg.initDataUnsafe?.user?.first_name || 'User';

// ============= АДРЕС СЕРВЕРА (ОДИН ДЛЯ ВСЕХ) =============
// ЗАМЕНИТЕ НА ВАШ URL ПОСЛЕ ДЕПЛОЯ НА RENDER
const API_URL = 'https://novacoin-backend.onrender.com'; // ← ВАШ URL

console.log('API URL:', API_URL);
console.log('User ID:', userId);

// ============= ДАННЫЕ ПОЛЬЗОВАТЕЛЯ =============
let userData = {
    id: userId,
    balance: 0,
    passiveIncome: 0.001,
    clickPower: 1,
    nickname: firstName,
    nicknameColor: '#9b59b6',
    stats: { today: 0, total: 0, clicks: 0 }
};

// ============= НАВИГАЦИЯ =============
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
    });
});

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
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

// ============= ЗАГРУЗКА ДАННЫХ =============
async function loadUserData(silent = false) {
    if (!userId) return;

    try {
        const res = await fetch(`${API_URL}/api/user/${userId}`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        
        const data = await res.json();
        
        userData.balance = data.balance || 0;
        userData.passiveIncome = data.passive_income || 0.001;
        userData.clickPower = data.click_power || 1;
        userData.nickname = data.nickname || firstName;
        userData.nicknameColor = data.nickname_color || '#9b59b6';
        userData.stats.today = data.stats_today || 0;
        userData.stats.total = data.stats_total || 0;
        
        if (!silent) {
            const activePage = document.querySelector('.nav-item.active').dataset.page;
            loadPage(activePage);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Ошибка подключения к серверу', true);
    }
}

function showNotification(text, isError = false) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = text;
    n.style.background = isError ? '#e74c3c' : '#9b59b6';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

// ============= ИНИЦИАЛИЗАЦИЯ =============
if (userId) {
    loadUserData().then(() => navigateTo('home'));
    setInterval(() => loadUserData(true), 5000);
} else {
    navigateTo('home');
}

window.app = { userId, username, firstName, userData, API_URL, loadUserData, showNotification };
