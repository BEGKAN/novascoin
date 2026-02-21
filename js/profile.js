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
        document.getElementById('promoActivate').style.display
