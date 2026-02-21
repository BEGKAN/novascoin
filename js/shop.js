// Магазин
window.shop = {
    currentCategory: 'click',
    
    // Загрузка магазина
    load() {
        this.showCategory(this.currentCategory);
    },
    
    // Показать категорию
    showCategory(category) {
        this.currentCategory = category;
        
        // Обновляем активную кнопку
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event?.target.classList.add('active');
        
        // Загружаем товары
        const shopList = document.getElementById('shopList');
        
        if (category === 'click') {
            shopList.innerHTML = this.getClickUpgrades();
        } else if (category === 'online') {
            shopList.innerHTML = this.getOnlineUpgrades();
        } else if (category === 'offline') {
            shopList.innerHTML = this.getOfflineUpgrades();
        }
    },
    
    // Улучшения для клика
    getClickUpgrades() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const power = 0.0005 * i;
            const price = 0.001 * Math.pow(2, i);
            html += `
                <div class="shop-item">
                    <div class="shop-item-title">Клик Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(4)} NovaCoin за клик</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)}</span>
                        <button class="shop-item-buy" onclick="window.shop.buyUpgrade('click', ${i}, ${price}, 0.0005)">Купить</button>
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    // Улучшения для онлайн дохода
    getOnlineUpgrades() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const power = 0.001 * i;
            const price = 0.002 * Math.pow(2, i);
            html += `
                <div class="shop-item">
                    <div class="shop-item-title">Онлайн Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(3)} NovaCoin/сек</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)}</span>
                        <button class="shop-item-buy" onclick="window.shop.buyUpgrade('sec', ${i}, ${price}, 0.001)">Купить</button>
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    // Улучшения для оффлайн дохода
    getOfflineUpgrades() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            const power = 0.002 * i;
            const price = 0.005 * Math.pow(2, i);
            html += `
                <div class="shop-item">
                    <div class="shop-item-title">Оффлайн Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(3)} NovaCoin/сек (до 12ч)</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)}</span>
                        <button class="shop-item-buy" onclick="window.shop.buyUpgrade('offline', ${i}, ${price}, 0.002)">Купить</button>
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    // Покупка улучшения
    async buyUpgrade(type, level, price, powerIncrement) {
        const user = window.app.user;
        
        if (!user) {
            window.app.showNotification('Ошибка загрузки пользователя');
            return;
        }
        
        if (user.balance < price) {
            window.app.showNotification('Недостаточно средств');
            return;
        }
        
        // Списываем баланс
        user.balance -= price;
        
        // Увеличиваем соответствующую силу
        if (type === 'click') {
            user.click_power += powerIncrement;
        } else if (type === 'sec') {
            user.sec_power += powerIncrement;
        } else if (type === 'offline') {
            user.offline_power += powerIncrement;
        }
        
        // Сохраняем в базу данных
        const updated = await window.db.users.update(user.tg_id, {
            balance: user.balance,
            click_power: user.click_power,
            sec_power: user.sec_power,
            offline_power: user.offline_power
        });
        
        if (updated) {
            window.app.updateUI();
            window.app.showNotification('✅ Улучшение куплено!');
        } else {
            window.app.showNotification('❌ Ошибка покупки');
        }
    }
};
