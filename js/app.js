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
        
