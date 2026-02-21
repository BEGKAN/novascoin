window.shop = {
    currentCategory: 'click',
    
    // Счетчики купленных улучшений
    clickLevel: 0,
    onlineLevel: 0,
    offlineLevel: 0,
    
    load() {
        this.loadUserLevels();
        this.showCategory(this.currentCategory);
    },
    
    loadUserLevels() {
        const user = window.app.user;
        if (!user) return;
        
        // Вычисляем уровни по силе
        this.clickLevel = Math.floor((user.click_power - 0.001) / 0.0005);
        this.onlineLevel = Math.floor((user.sec_power) / 0.001);
        this.offlineLevel = 0; // Для оффлайн пока не считаем
    },
    
    showCategory(category) {
        this.currentCategory = category;
        
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        const list = document.getElementById('shopList');
        
        if (category === 'click') {
            list.innerHTML = this.getClickUpgrades();
        } else if (category === 'online') {
            list.innerHTML = this.getOnlineUpgrades();
        } else {
            list.innerHTML = this.getOfflineUpgrades();
        }
    },
    
    getClickUpgrades() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const power = 0.0005 * i;
            // Базовая цена 0.001, каждый уровень умножается на 2^(i-1)
            const price = 0.001 * Math.pow(2, i - 1);
            const isAvailable = i > this.clickLevel;
            
            html += `
                <div class="shop-item ${!isAvailable ? 'disabled' : ''}">
                    <div class="shop-item-title">Клик Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(4)} NC за клик</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)} NC</span>
                        ${isAvailable ? 
                            `<button class="shop-item-buy" onclick="window.shop.buy('click', ${i}, ${price}, 0.0005)">Купить</button>` : 
                            `<span class="shop-item-bought">Куплено</span>`
                        }
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    getOnlineUpgrades() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const power = 0.001 * i;
            const price = 0.002 * Math.pow(2, i - 1);
            const isAvailable = i > this.onlineLevel;
            
            html += `
                <div class="shop-item ${!isAvailable ? 'disabled' : ''}">
                    <div class="shop-item-title">Онлайн Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(3)} NC/сек</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)} NC</span>
                        ${isAvailable ? 
                            `<button class="shop-item-buy" onclick="window.shop.buy('sec', ${i}, ${price}, 0.001)">Купить</button>` : 
                            `<span class="shop-item-bought">Куплено</span>`
                        }
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    getOfflineUpgrades() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const power = 0.002 * i;
            const price = 0.005 * Math.pow(2, i - 1);
            
            html += `
                <div class="shop-item">
                    <div class="shop-item-title">Оффлайн Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(3)} NC/сек (до 12ч)</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)} NC</span>
                        <button class="shop-item-buy" onclick="window.shop.buy('offline', ${i}, ${price}, 0.002)">Купить</button>
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    async buy(type, level, price, power) {
        const user = window.app.user;
        
        if (user.balance < price) {
            window.app.showNotification('Недостаточно средств');
            return;
        }
        
        // Списываем баланс через защищенный метод
        const updated = await DB.users.updateBalance(user.tg_id, price, 'subtract');
        
        if (!updated) {
            window.app.showNotification('Ошибка покупки');
            return;
        }
        
        user.balance = updated.balance;
        
        // Увеличиваем соответствующую силу
        if (type === 'click') {
            user.click_power += power;
            this.clickLevel++;
        } else if (type === 'sec') {
            user.sec_power += power;
            this.onlineLevel++;
        } else if (type === 'offline') {
            user.offline_power += power;
            this.offlineLevel++;
        }
        
        // Обновляем пользователя
        await DB.users.update(user.tg_id, {
            click_power: user.click_power,
            sec_power: user.sec_power,
            offline_power: user.offline_power
        });
        
        window.app.updateUI();
        window.app.showNotification('✅ Улучшение куплено!');
        this.load(); // Перезагружаем магазин
    }
};
