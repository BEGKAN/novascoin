window.profile = {
    showColorModal() {
        const modal = document.getElementById('colorModal');
        modal.style.display = 'flex';
        document.getElementById('colorPicker').value = window.app.user?.color || 260;
        this.previewColor();
    },

    closeColorModal() {
        document.getElementById('colorModal').style.display = 'none';
    },

    previewColor() {
        const color = document.getElementById('colorPicker').value;
        document.getElementById('colorPreview').style.color = `hsl(${color}, 80%, 70%)`;
    },

    async buyColor() {
        const user = window.app.user;
        const color = document.getElementById('colorPicker').value;
        
        if (user.balance < 100) {
            window.app.showNotification('❌ Недостаточно средств! Нужно 100 NC');
            return;
        }
        
        // Списываем баланс через защищенный метод
        const updated = await DB.users.updateBalance(user.tg_id, 100, 'subtract');
        
        if (!updated) {
            window.app.showNotification('Ошибка покупки');
            return;
        }
        
        user.balance = updated.balance;
        user.color = parseInt(color);
        
        await DB.users.update(user.tg_id, { color: user.color });
        
        document.getElementById('profileName').style.color = `hsl(${user.color}, 80%, 70%)`;
        window.app.updateUI();
        this.closeColorModal();
        window.app.showNotification('✅ Цвет изменён!');
    },
    
    async changeNickname() {
        const user = window.app.user;
        const newNick = prompt('Введите новый ник (100 NC):', user.nickname);
        
        if (!newNick || newNick.trim() === '') return;
        
        if (user.balance < 100) {
            window.app.showNotification('❌ Недостаточно средств! Нужно 100 NC');
            return;
        }
        
        // Списываем баланс через защищенный метод
        const updated = await DB.users.updateBalance(user.tg_id, 100, 'subtract');
        
        if (!updated) {
            window.app.showNotification('Ошибка покупки');
            return;
        }
        
        user.balance = updated.balance;
        user.nickname = newNick.trim();
        
        await DB.users.update(user.tg_id, { nickname: user.nickname });
        
        document.getElementById('profileName').textContent = user.nickname;
        document.getElementById('usernameDisplay').textContent = user.nickname;
        window.app.updateUI();
        window.app.showNotification('✅ Ник изменён!');
    },
    
    togglePromo() {
        const promo = document.getElementById('promoSection');
        promo.style.display = promo.style.display === 'none' ? 'block' : 'none';
    },
    
    showPromo(type) {
        document.getElementById('promoActivate').style.display = type === 'activate' ? 'block' : 'none';
        document.getElementById('promoCreate').style.display = type === 'create' ? 'block' : 'none';
        
        document.querySelectorAll('.promo-tab').forEach((tab, i) => {
            tab.classList.toggle('active', (i === 0 && type === 'activate') || (i === 1 && type === 'create'));
        });
    },
    
    async activatePromo() {
        const code = document.getElementById('promoCode').value;
        if (!code) {
            window.app.showNotification('Введите код');
            return;
        }
        
        const promo = await DB.promocodes.get(code);
        if (!promo || promo.uses_left <= 0) {
            window.app.showNotification('❌ Промокод не найден');
            return;
        }
        
        // Начисляем бонус через защищенный метод
        const updated = await DB.users.updateBalance(
            window.app.user.tg_id, 
            promo.amount, 
            'add'
        );
        
        if (updated) {
            window.app.user.balance = updated.balance;
            await DB.promocodes.use(promo.id);
            window.app.updateUI();
            window.app.showNotification(`✅ +${promo.amount} NC`);
            document.getElementById('promoCode').value = '';
        }
    },
    
    async createPromo() {
        const name = document.getElementById('newPromoName').value;
        const sum = parseFloat(document.getElementById('promoSum').value);
        const uses = parseInt(document.getElementById('promoUses').value);
        
        if (!name || isNaN(sum) || sum <= 0 || isNaN(uses) || uses <= 0) {
            window.app.showNotification('Заполните все поля');
            return;
        }
        
        const promoData = {
            code: name,
            amount: sum,
            uses_left: uses,
            creator_id: window.app.user.tg_id
        };
        
        const promo = await DB.promocodes.create(promoData);
        
        if (promo) {
            window.app.showNotification('✅ Промокод создан');
            document.getElementById('newPromoName').value = '';
            document.getElementById('promoSum').value = '';
            document.getElementById('promoUses').value = '';
        } else {
            window.app.showNotification('❌ Ошибка создания промокода');
        }
    }
};
