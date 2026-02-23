window.pages = window.pages || {};

window.pages.shop = {
    upgrades: [
        {
            id: 1,
            name: 'Усиленный клик',
            description: 'x2 к клику',
            price: 1.000,
            maxLevel: 10,
            type: 'click',
            multiplier: 2
        },
        {
            id: 2,
            name: 'Мощный клик',
            description: 'x5 к клику',
            price: 5.000,
            maxLevel: 5,
            type: 'click',
            multiplier: 5
        },
        {
            id: 3,
            name: 'Пассивный доход +',
            description: 'x2 к пассивному доходу',
            price: 2.000,
            maxLevel: 10,
            type: 'passive',
            multiplier: 2
        },
        {
            id: 4,
            name: 'Инвестиция',
            description: 'x5 к пассивному доходу',
            price: 15.000,
            maxLevel: 5,
            type: 'passive',
            multiplier: 5
        }
    ],

    render: (userData) => {
        let upgradesHtml = '';
        
        window.pages.shop.upgrades.forEach(upgrade => {
            upgradesHtml += `
                <div class="upgrade-card">
                    <div class="upgrade-info">
                        <div class="upgrade-name">${upgrade.name}</div>
                        <div class="upgrade-desc">${upgrade.description}</div>
                        <div class="upgrade-price">💰 ${upgrade.price.toFixed(3)}</div>
                    </div>
                    <button class="upgrade-button" 
                        data-id="${upgrade.id}"
                        ${userData.balance < upgrade.price ? 'disabled' : ''}>
                        Купить
                    </button>
                </div>
            `;
        });

        return `
            <div class="shop-page">
                <h2>🏪 Магазин улучшений</h2>
                <div class="upgrades">
                    ${upgradesHtml}
                </div>
            </div>
        `;
    },

    init: () => {
        document.querySelectorAll('.upgrade-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const upgradeId = e.target.dataset.id;
                const upgrade = window.pages.shop.upgrades.find(u => u.id == upgradeId);
                
                if (window.app.userData.balance >= upgrade.price) {
                    // Здесь будет логика покупки через API
                    window.app.showNotification(`✅ ${upgrade.name} куплено!`);
                    
                    // Обновляем баланс (временная логика)
                    window.app.userData.balance -= upgrade.price;
                    
                    // Обновляем характеристики
                    if (upgrade.type === 'click') {
                        window.app.userData.clickPower *= upgrade.multiplier;
                    } else {
                        window.app.userData.passiveIncome *= upgrade.multiplier;
                    }
                    
                    // Перезагружаем страницу
                    const activePage = document.querySelector('.nav-item.active').dataset.page;
                    window.loadPage(activePage);
                } else {
                    window.app.showNotification('❌ Недостаточно средств', true);
                }
            });
        });
    }
};