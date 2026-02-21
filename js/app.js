window.app = {
    user: null,
    tg: null,
    
    async init() {
        try {
            console.log('Инициализация приложения...');
            
            this.tg = window.Telegram?.WebApp;
            if (this.tg) {
                this.tg.ready();
                this.tg.expand(); // На весь экран
            }
            
            const tgUser = this.tg?.initDataUnsafe?.user;
            const userId = tgUser?.id || Math.floor(Math.random() * 1000000);
            const userName = tgUser?.first_name || 'Игрок';
            const userUsername = tgUser?.username || userName;
            
            await this.loadUser(userId, userName, userUsername);
            this.startPassiveIncome();
            
            console.log('✅ Приложение запущено');
        } catch (error) {
            console.error('Ошибка:', error);
            this.showNotification('Ошибка загрузки');
        }
    },
    
    async loadUser(tgId, name, username) {
        try {
            let userData = await DB.users.get(tgId);
            
            if (!userData) {
                console.log('Создаем нового пользователя...');
                userData = await DB.users.create({
                    tg_id: tgId,
                    name: name,
                    username: username,
                    nickname: name,
                    balance: 0,
                    click_power: 0.001,
                    sec_power: 0,
                    color: 260,
                    total_earned: 0,
                    daily_earned: 0,
                    last_online: new Date()
                });
            }
            
            if (!userData) {
                throw new Error('Не удалось создать пользователя');
            }
            
            this.user = userData;
            
            document.getElementById('usernameDisplay').textContent = this.user.nickname;
            document.getElementById('profileName').textContent = this.user.nickname;
            document.getElementById('profileName').style.color = `hsl(${this.user.color}, 80%, 70%)`;
            document.getElementById('userId').textContent = `ID: user_${this.user.tg_id.toString().slice(-4)}`;
            
            this.updateUI();
            
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            this.showNotification('Ошибка загрузки пользователя');
        }
    },
    
    async clickCoin() {
        if (!this.user) return;
        
        const updated = await DB.users.updateBalance(
            this.user.tg_id, 
            this.user.click_power, 
            'add'
        );
        
        if (updated) {
            this.user.balance = updated.balance;
            this.user.total_earned += this.user.click_power;
            this.user.daily_earned += this.user.click_power;
            this.updateUI();
        }
    },
    
    startPassiveIncome() {
        setInterval(async () => {
            if (this.user && this.user.sec_power > 0) {
                const updated = await DB.users.updateBalance(
                    this.user.tg_id, 
                    this.user.sec_power, 
                    'add'
                );
                
                if (updated) {
                    this.user.balance = updated.balance;
                    this.user.total_earned += this.user.sec_power;
                    this.user.daily_earned += this.user.sec_power;
                    this.updateUI();
                }
            }
        }, 1000);
    },
    
    updateUI() {
        if (!this.user) return;
        
        document.getElementById('balanceDisplay').textContent = (this.user.balance || 0).toFixed(3);
        document.getElementById('secRate').textContent = `+${(this.user.sec_power || 0).toFixed(3)} / сек.`;
        document.getElementById('clickRate').textContent = `+${(this.user.click_power || 0.001).toFixed(3)} / клик`;
        document.getElementById('dayEarn').textContent = (this.user.daily_earned || 0).toFixed(3);
        document.getElementById('totalEarn').textContent = (this.user.total_earned || 0).toFixed(3);
    },
    
    switchPanel(panelId) {
        document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
        document.getElementById(panelId).style.display = 'block';
        
        document.querySelectorAll('.nav-item').forEach((item, i) => {
            const panels = ['mainPanel', 'shopPanel', 'gamesPanel', 'ratingPanel', 'profilePanel'];
            item.classList.toggle('active', panels[i] === panelId);
        });
        
        if (panelId === 'shopPanel' && window.shop) {
            window.shop.load();
        }
        if (panelId === 'ratingPanel') {
            this.loadRating();
        }
        if (panelId === 'gamesPanel' && window.games) {
            window.games.init();
        }
        if (panelId === 'profilePanel') {
            document.getElementById('profileName').style.color = `hsl(${this.user?.color || 260}, 80%, 70%)`;
        }
    },
    
    async loadRating() {
        try {
            const users = await DB.users.getRating(20);
            const list = document.getElementById('ratingList');
            
            if (!users || users.length === 0) {
                list.innerHTML = '<div class="empty-state">Пока нет игроков</div>';
                return;
            }
            
            list.innerHTML = users.map((u, i) => `
                <div class="rating-item">
                    <span class="rating-pos">${i+1}</span>
                    <span class="rating-name" style="color: hsl(${u.color || 260}, 80%, 70%)">${u.nickname || 'Игрок'}</span>
                    <span class="rating-balance">${(u.balance || 0).toFixed(3)}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Ошибка загрузки рейтинга:', error);
            document.getElementById('ratingList').innerHTML = '<div class="empty-state">Ошибка загрузки</div>';
        }
    },
    
    showNotification(msg, duration = 2000) {
        const notif = document.getElementById('notification');
        notif.textContent = msg;
        notif.style.display = 'block';
        setTimeout(() => notif.style.display = 'none', duration);
    }
};

// Обработчик клика по монете с анимацией
document.getElementById('clickCoin').addEventListener('click', function() {
    this.style.transform = 'scale(0.95)';
    setTimeout(() => this.style.transform = 'scale(1)', 100);
    window.app.clickCoin();
});

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => window.app.init());
