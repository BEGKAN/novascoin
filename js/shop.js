window.shop = {
    currentCategory: 'click',
    
    load() {
        this.showCategory(this.currentCategory);
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
            const price = 0.001 * Math.pow(2, i - 1);
            html += `
                <div class="shop-item">
                    <div class="shop-item-title">Клик Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(4)} NC за клик</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)} NC</span>
                        <button class="shop-item-buy" onclick="window.shop.buy('click', ${price}, 0.0005)">Купить</button>
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
            html += `
                <div class="shop-item">
                    <div class="shop-item-title">Онлайн Уровень ${i}</div>
                    <div class="shop-item-desc">+${power.toFixed(3)} NC/сек</div>
                    <div class="shop-item-footer">
                        <span class="shop-item-price">${price.toFixed(6)} NC</span>
                        <button class="shop-item-buy" onclick="window.shop.buy('sec', ${price}, 0.001)">Купить</button>
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
                        <button class="shop-item-buy" onclick="window.shop.buy('offline', ${price}, 0.002)">Купить</button>
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    async buy(type, price, power) {
        const user = window.app.user;
        
        if (user.balance < price) {
            window.app.showNotification('Недостаточно средств');
            return;
        }
        
        user.balance -= price;
        
        if (type === 'click') user.click_power += power;
        if (type === 'sec') user.sec_power += power;
        if (type === 'offline') user.offline_power += power;
        
        const updated = await DB.users.update(user.tg_id, {
            balance: user.balance,
            click_power: user.click_power,
            sec_power: user.sec_power,
            offline_power: user.offline_power
        });
        
        if (updated) {
            window.app.updateUI();
            window.app.showNotification('✅ Улучшение куплено!');
            this.load();
        }
    }
};
