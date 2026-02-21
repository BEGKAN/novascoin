// Профиль пользователя
window.profile = {
    // Обновление цвета ника
    updateNameColor() {
        const color = document.getElementById('colorSlider').value;
        document.getElementById('profileName').style.color = `hsl(${color}, 80%, 70%)`;
    },
    
    // Смена ника
    async changeNickname() {
        const user = window.app.user;
        const newNick = prompt('Введите новый ник:', user.nickname || user.name);
        
        if (newNick && newNick.trim()) {
            const updated = await window.db.users.update(user.tg_id, {
                nickname: newNick.trim()
            });
            
            if (updated) {
                user.nickname = newNick.trim();
                document.getElementById('profileName').textContent = newNick.trim();
                document.getElementById('usernameDisplay').textContent = newNick.trim();
                window.app.showNotification('✅ Ник изменён');
            } else {
                window.app.showNotification('❌ Ошибка');
            }
        }
    },
    
    // Показать/скрыть промокоды
    togglePromo() {
        const promo = document.getElementById('promoSection');
        promo.style.display = promo.style.display === 'none' ? 'block' : 'none';
    },
    
    // Показать вкладку промокодов
    showPromo(type) {
        document.getElementById('promoActivate').style.display = type === 'activate' ? 'block' : 'none';
        document.getElementById('promoCreate').style.display = type === 'create' ? 'block' : 'none';
        
        document.querySelectorAll('.promo-tab').forEach((tab, i) => {
            tab.classList.toggle('active', (i === 0 && type === 'activate') || (i === 1 && type === 'create'));
        });
    },
    
    // Активировать промокод
    async activatePromo() {
        const code = document.getElementById('promoCode').value;
        
        if (!code) {
            window.app.showNotification('Введите код');
            return;
        }
        
        const promo = await window.db.promocodes.get(code);
        
        if (!promo) {
            window.app.showNotification('❌ Промокод не найден');
            return;
        }
        
        if (promo.uses_left <= 0) {
            window.app.showNotification('❌ Промокод уже использован');
            return;
        }
        
        // Начисляем бонус
        const user = window.app.user;
        user.balance += promo.amount;
        
        await window.db.users.update(user.tg_id, { balance: user.balance });
        await window.db.promocodes.use(promo.id);
        
        window.app.updateUI();
        window.app.showNotification(`✅ +${promo.amount} NovaCoin`);
        
        document.getElementById('promoCode').value = '';
    },
    
    // Создать промокод
    async createPromo() {
        const name = document.getElementById('newPromoName').value;
        const sum = parseFloat(document.getElementById('promoSum').value);
        const uses = parseInt(document.getElementById('promoUses').value);
        
        if (!name || isNaN(sum) || sum <= 0 || isNaN(uses) || uses <= 0) {
            window.app.showNotification('Заполните все поля');
            return;
        }
        
        const promo = await window.db.promocodes.create({
            code: name,
            amount: sum,
            uses_left: uses,
            creator_id: window.app.user.tg_id
        });
        
        if (promo) {
            window.app.showNotification('✅ Промокод создан');
            document.getElementById('newPromoName').value = '';
            document.getElementById('promoSum').value = '';
            document.getElementById('promoUses').value = '';
        } else {
            window.app.showNotification('❌ Ошибка создания');
        }
    }
};
