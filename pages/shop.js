window.pages = window.pages || {};

window.pages.shop = {
    upgrades: [
        { id: 1, name: 'Усиленный клик', desc: 'x2 к клику', price: 1.000, type: 'click', mult: 2 },
        { id: 2, name: 'Мощный клик', desc: 'x5 к клику', price: 5.000, type: 'click', mult: 5 },
        { id: 3, name: 'Мега клик', desc: 'x10 к клику', price: 25.000, type: 'click', mult: 10 },
        { id: 4, name: 'Пассивный доход +', desc: 'x2 к доходу', price: 2.000, type: 'passive', mult: 2 },
        { id: 5, name: 'Инвестиция', desc: 'x5 к доходу', price: 15.000, type: 'passive', mult: 5 }
    ],

    render: (data) => `
        <div class="shop-page">
            <h2>🏪 Магазин</h2>
            <div class="upgrades">
                ${window.pages.shop.upgrades.map(u => `
                    <div class="upgrade-card">
                        <div class="upgrade-info">
                            <div class="upgrade-name">${u.name}</div>
                            <div class="upgrade-desc">${u.desc}</div>
                            <div class="upgrade-price">💰 ${u.price.toFixed(3)} NC</div>
                        </div>
                        <button class="upgrade-button" data-id="${u.id}" 
                            ${data.balance < u.price ? 'disabled' : ''}>
                            Купить
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `,

    init: () => {
        document.querySelectorAll('.upgrade-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const u = window.pages.shop.upgrades.find(u => u.id == btn.dataset.id);
                if (window.app.userData.balance >= u.price) {
                    window.app.userData.balance -= u.price;
                    if (u.type === 'click') {
                        window.app.userData.clickPower *= u.mult;
                    } else {
                        window.app.userData.passiveIncome *= u.mult;
                    }
                    window.app.showNotification(`✅ ${u.name} куплено!`);
                    const activePage = document.querySelector('.nav-item.active').dataset.page;
                    window.loadPage(activePage);
                }
            });
        });
    }
};
