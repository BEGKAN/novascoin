window.app = {
    user: null,
    tg: null,
    
    async init() {
        try {
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
        let userData = await DB.users.get(tgId);
        
        if (!userData) {
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
        
        this.user = userData;
        
        document.getElementById('usernameDisplay').textContent = this.user.nickname;
        document.getElementById('profileName').textContent = this.user.nickname;
        document.getElementById('profileName').style.color = `hsl(${this.user.color}, 80%, 70%)`;
        document.getElementById('colorSlider').value = this.user.color;
        
        this.updateUI();
    },
    
    async calculateOfflineEarnings() {
        if (!this.user) return;
        
        const lastOnline = new Date(this.user.last_online || Date.now());
        const now = new Date();
        const secondsPassed = Math.floor((now - lastOnline) / 1000);
        const offlineSeconds = Math.min(secondsPassed, 43200);
        
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
                this.showNotification(`Оффлайн доход: +${offlineEarn.toFixed(3)}`);
            }
        }
        
        await DB.users.update(this.user.tg_id, { last_online: now });
    },
    
    async clickCoin() {
        if (!this.user) return;
        
        this.user.balance += this.user.click_power;
        this.user.total_earned += this.user.click_power;
        this.user.daily_earned += this.user.click_power;
        
        await DB.users.update(this.user.tg_id, {
            balance: this.user.balance,
            total_earned: this.user.total_earned,
            daily_earned: this.user.daily_earned
        });
        
        this.updateUI();
    },
    
    startPassiveIncome() {
        setInterval(async () => {
            if (this.user && this.user.sec_power > 0) {
                this.user.balance += this.user.sec_power;
                this.user.total_earned += this.user.sec_power;
                this.user.daily_earned += this.user.sec_power;
                
                await DB.users.update(this.user.tg_id, {
                    balance: this.user.balance,
                    total_earned: this.user.total_earned,
                    daily_earned: this.user.daily_earned
                });
                
                this.updateUI();
            }
        }, 1000);
    },
    
    updateUI() {
        if (!this.user) return;
        
        document.getElementById('balanceDisplay').textContent = this.user.balance.toFixed(3);
        document.getElementById('secRate').textContent = `+${this.user.sec_power.toFixed(3)} / сек.`;
        document.getElementById('clickRate').textContent = `+${this.user.click_power.toFixed(3)} / клик`;
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
        
        if (panelId === 'shopPanel' && window.shop) window.shop.load();
        if (panelId === 'ratingPanel') this.loadRating();
        if (panelId === 'gamesPanel' && window.games) window.games.init();
    },
    
    async loadRating() {
        const users = await DB.users.getRating(20);
        const list = document.getElementById('ratingList');
        
        if (users.length === 0) {
            list.innerHTML = '<div class="empty-state">Пока нет игроков</div>';
            return;
        }
        
        list.innerHTML = users.map((u, i) => `
            <div class="rating-item">
                <span class="rating-pos">${i+1}</span>
                <span>${u.nickname || 'Игрок'}</span>
                <span style="margin-left:auto;">${u.balance.toFixed(3)}</span>
            </div>
        `).join('');
    },
    
    showNotification(msg, duration = 2000) {
        const notif = document.getElementById('notification');
        notif.textContent = msg;
        notif.style.display = 'block';
        setTimeout(() => notif.style.display = 'none', duration);
    }
};

document.getElementById('clickCoin').addEventListener('click', function() {
    this.style.transform = 'scale(0.95)';
    setTimeout(() => this.style.transform = 'scale(1)', 100);
    window.app.clickCoin();
});

document.addEventListener('DOMContentLoaded', () => window.app.init());
