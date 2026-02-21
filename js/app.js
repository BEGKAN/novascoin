// Главный объект приложения
window.app = {
    // Данные пользователя
    user: null,
    tg: null,
    
    // Инициализация приложения
    async init() {
        try {
            // Инициализируем Telegram WebApp
            this.tg = window.Telegram?.WebApp;
            if (this.tg) {
                this.tg.ready();
                this.tg.expand();
                this.tg.enableClosingConfirmation();
            }
            
            // Получаем данные пользователя из Telegram
            const tgUser = this.tg?.initDataUnsafe?.user;
            const userId = tgUser?.id || 1;
            const userName = tgUser?.first_name || 'Игрок';
            const userUsername = tgUser?.username || userName;
            
            // Загружаем пользователя из базы данных
            await this.loadUser(userId, userName, userUsername);
            
            // Запускаем пассивный доход
            this.startPassiveIncome();
            
            // Запускаем оффлайн доход
            await this.calculateOfflineEarnings();
            
            // Обновляем UI
            this.updateUI();
            
            console.log('✅ Приложение инициализировано');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showNotification('Ошибка загрузки данных');
        }
    },
    
    // Загрузка пользователя
    async loadUser(tgId, name, username) {
        let userData = await window.db.users.get(tgId);
        
        if (!userData) {
            // Создаем нового пользователя
            userData = await window.db.users.create({
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
        
        this.user = userData;
        
        // Обновляем отображение имени
        document.getElementById('usernameDisplay').textContent = this.user.nickname || this.user.name;
        document.getElementById('profileName').textContent = this.user.nickname || this.user.name;
        document.getElementById('profileName').style.color = `hsl(${this.user.color}, 80%, 70%)`;
        document.getElementById('colorSlider').value = this.user.color;
        
        // Обновляем статистику
        document.getElementById('dayEarn').textContent = (this.user.daily_earned || 0).toFixed(3);
        document.getElementById('totalEarn').textContent = (this.user.total_earned || 0).toFixed(3);
    },
    
    // Расчет оффлайн дохода
    async calculateOfflineEarnings() {
        if (!this.user) return;
        
        const lastOnline = new Date(this.user.last_online || Date.now());
        const now = new Date();
        const secondsPassed = Math.floor((now - lastOnline) / 1000);
        
        // Максимум 12 часов (43200 секунд)
        const offlineSeconds = Math.min(secondsPassed, 43200);
        
        if (offlineSeconds > 0 && this.user.offline_power > 0) {
            const offlineEarn = offlineSeconds * this.user.offline_power;
            this.user.balance += offlineEarn;
            this.user.total_earned += offlineEarn;
            
            await window.db.users.update(this.user.tg_id, {
                balance: this.user.balance,
                total_earned: this.user.total_earned,
                last_online: now
            });
            
            if (offlineEarn > 0.001) {
                this.showNotification(`✨ Оффлайн доход: +${offlineEarn.toFixed(3)} NovaCoin`);
            }
        }
        
        // Обновляем время последнего визита
        await window.db.users.update(this.user.tg_id, {
            last_online: now
        });
    },
    
    // Клик по монете
    async clickCoin() {
        if (!this.user) return;
        
        // Добавляем баланс
        this.user.balance += this.user.click_power;
        this.user.total_earned += this.user.click_power;
        this.user.daily_earned += this.user.click_power;
        
        // Сохраняем в базу данных
        await window.db.users.update(this.user.tg_id, {
            balance: this.user.balance,
            total_earned: this.user.total_earned,
            daily_earned: this.user.daily_earned
        });
        
        // Обновляем UI
        this.updateUI();
    },
    
    // Пассивный доход (каждую секунду)
    startPassiveIncome() {
        setInterval(async () => {
            if (this.user && this.user.sec_power > 0) {
                this.user.balance += this.user.sec_power;
                this.user.total_earned += this.user.sec_power;
                this.user.daily_earned += this.user.sec_power;
                
                await window.db.users.update(this.user.tg_id, {
                    balance: this.user.balance,
                    total_earned: this.user.total_earned,
                    daily_earned: this.user.daily_earned
                });
                
                this.updateUI();
            }
        }, 1000);
    },
    
    // Обновление интерфейса
    updateUI() {
        if (!this.user) return;
        
        document.getElementById('balanceDisplay').textContent = this.user.balance.toFixed(3);
        document.getElementById('secRate').textContent = `+${this.user.sec_power.toFixed(3)} / сек.`;
        document.getElementById('clickRate').textContent = `+${this.user.click_power.toFixed(3)} / клик`;
        document.getElementById('dayEarn').textContent = (this.user.daily_earned || 0).toFixed(3);
        document.getElementById('totalEarn').textContent = (this.user.total_earned || 0).toFixed(3);
    },
    
    // Переключение панелей
    switchPanel(panelId) {
        // Скрываем все панели
        document.querySelectorAll('.panel').forEach(p => {
            p.style.display = 'none';
            p.classList.remove('active-panel');
        });
        
        // Показываем выбранную панель
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = 'block';
            panel.classList.add('active-panel');
        }
        
        // Обновляем активную кнопку в навигации
        document.querySelectorAll('.nav-item').forEach((item, index) => {
            const panels = ['mainPanel', 'shopPanel', 'gamesPanel', 'ratingPanel', 'profilePanel'];
            item.classList.toggle('active', panels[index] === panelId);
        });
        
        // Загружаем данные для соответствующих панелей
        if (panelId === 'shopPanel' && window.shop) {
            window.shop.load();
        } else if (panelId === 'ratingPanel') {
            this.loadRating();
        } else if (panelId === 'gamesPanel' && window.games) {
            window.games.init();
        }
    },
    
    // Загрузка рейтинга
    async loadRating() {
        const ratingList = document.getElementById('ratingList');
        const users = await window.db.users.getRating(20);
        
        if (users.length === 0) {
            ratingList.innerHTML = '<div class="empty-state">Пока нет игроков</div>';
            return;
        }
        
        let html = '';
        users.forEach((user, index) => {
            html += `
                <div class="rating-item">
                    <span class="rating-pos">${index + 1}</span>
                    <span class="rating-name">${user.nickname || 'Игрок'}</span>
                    <span class="rating-balance">${user.balance.toFixed(3)}</span>
                </div>
            `;
        });
        
        ratingList.innerHTML = html;
    },
    
    // Показать уведомление
    showNotification(message, duration = 2000) {
        const notif = document.getElementById('notification');
        notif.textContent = message;
        notif.style.display = 'block';
        
        setTimeout(() => {
            notif.style.display = 'none';
        }, duration);
    }
};

// Обработчик клика по монете
document.getElementById('clickCoin').addEventListener('click', function(e) {
    // Анимация
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
        this.style.transform = 'scale(1)';
    }, 100);
    
    // Вызываем клик
    window.app.clickCoin();
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
