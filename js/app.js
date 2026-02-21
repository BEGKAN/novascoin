window.app = {
    user: null,
    tg: null,
    
    async init() {
        try {
            console.log('Инициализация приложения...');
            
            this.tg = window.Telegram?.WebApp;
            if (this.tg) {
                this.tg.ready();
                this.tg.expand();
            }
            
            const tgUser = this.tg?.initDataUnsafe?.user;
            const userId = tgUser?.id || Math.floor(Math.random() * 1000000);
            const userName = tgUser?.first_name || 'Игрок';
            const userUsername = tgUser?.username || userName;
            
            await this.loadUser(userId, userName, userUsername);
            this.startPassiveIncome();
            await this.calculateOfflineEarnings();
            
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
                    offline_power: 0,
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
            
            this.updateUI();
            
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            this.showNotification('Ошибка загрузки пользователя');
            
            // Создаем временного пользователя для теста
            this.user = {
                tg_id: tgId,
                nickname: name,
                balance: 1000,
                click_power: 0.001,
                sec_power: 0,
                offline_power: 0,
                color: 260,
                total_earned: 0,
                daily_earned: 0
            };
            
            document.getElementById('usernameDisplay').textContent = this.user.nickname;
            document.getElementById('profileName').textContent = this.user.nickname;
            this.updateUI();
        }
    },
    
    async calculateOfflineEarnings() {
        if (!this.user) return;
        
        try {
            const lastOnline = new Date(this.user.last_online || Date.now());
            const now = new Date();
            const secondsPassed = Math.floor((now - lastOnline) / 1000);
            const offlineSeconds = Math.min(secondsPassed, 43200); // Максимум 12 часов
            
            if (offlineSeconds > 0 && this.user.offline_power > 0) {
                const offlineEarn = offlineSeconds * this.user.offline_power;
                this.user.balance += offlineEarn;
                this.user.total_earned += offlineEarn;
                
                await DB.users.update(this.user.tg_id, {
                    balance: this.user.balance,
                    total_earned: this.user.total_earned,
                    last_online: now
                });
                
                if (offlineEarn > 0.001) {
                    this.showNotification(`✨ Оффлайн доход: +${offlineEarn.toFixed(3)} NC`);
                }
            }
            
            await DB.users.update(this.user.tg_id, { last_online: now });
        } catch (error) {
            console.error('Ошибка оффлайн дохода:', error);
        }
    },
    
    async clickCoin() {
        if (!this.user) return;
        
        this.user.balance += this.user.click_power;
        this.user.total_earned += this.user.click_power;
        this.user.daily_earned += this.user.click_power;
        
        try {
            await DB.users.update(this.user.tg_id, {
                balance: this.user.balance,
                total_earned: this.user.total_earned,
                daily_earned: this.user.daily_earned
            });
        } catch (error) {
            console.error('Ошибка сохранения клика:', error);
        }
        
        this.updateUI();
    },
    
    startPassiveIncome() {
        setInterval(async () => {
            if (this.user && this.user.sec_power > 0) {
                this.user.balance += this.user.sec_power;
                this.user.total_earned += this.user.sec_power;
                this.user.daily_earned += this.user.sec_power;
                
                try {
                    await DB.users.update(this.user.tg_id, {
                        balance: this.user.balance,
                        total_earned: this.user.total_earned,
                        daily_earned: this.user.daily_earned
                    });
                } catch (error) {
                    console.error('Ошибка пассивного дохода:', error);
                }
                
                this.updateUI();
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
                    <span class="rating-name">${u.nickname || 'Игрок'}</span>
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
