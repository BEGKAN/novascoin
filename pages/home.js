window.pages = window.pages || {};

window.pages.home = {
    render: (userData) => {
        return `
            <div class="home-page">
                <div class="header">
                    <h1>💰 <span id="balance">${userData.balance.toFixed(3)}</span></h1>
                    <div class="stats">
                        <div>⚡️ <span id="passiveIncome">${userData.passiveIncome.toFixed(3)}</span>/сек</div>
                        <div>👆 x<span id="clickPower">${userData.clickPower}</span></div>
                    </div>
                </div>

                <div class="coin-container">
                    <img src="coin.png" alt="Nova Coin" id="coin" class="coin">
                </div>

                <a href="https://t.me/offNovaCoinChat" target="_blank" class="chat-link">
                    <span class="chat-icon">💬</span>
                    <span class="chat-text">Заходите в наш чат</span>
                    <span class="chat-arrow">→</span>
                </a>
            </div>
        `;
    },

    init: () => {
        console.log('Home page initialized');
        
        const coin = document.getElementById('coin');
        if (coin) {
            coin.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Анимация
                coin.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    coin.style.transform = 'scale(1)';
                }, 100);
                setTimeout(() => {
                    coin.style.transform = '';
                }, 200);

                if (!window.app.userId) {
                    window.app.userData.balance += 0.001;
                    document.getElementById('balance').textContent = window.app.userData.balance.toFixed(3);
                    showFloatingReward('+0.001', coin);
                    return;
                }

                try {
                    const response = await fetch(`${window.app.API_URL}/api/click`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ userId: window.app.userId })
                    });
                    
                    if (!response.ok) throw new Error('Ошибка клика');
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        window.app.userData.balance = data.newBalance;
                        document.getElementById('balance').textContent = data.newBalance.toFixed(3);
                        showFloatingReward(`+${data.reward.toFixed(3)}`, coin);
                    }
                } catch (error) {
                    console.error('Error clicking:', error);
                    window.app.showNotification('❌ Ошибка подключения к серверу', true);
                }
            });
        }

        // Пассивный доход
        if (window.pages.home.passiveInterval) {
            clearInterval(window.pages.home.passiveInterval);
        }

        window.pages.home.passiveInterval = setInterval(async () => {
            if (window.app.userId) {
                await window.app.loadUserData(true);
                
                const balanceEl = document.getElementById('balance');
                const passiveEl = document.getElementById('passiveIncome');
                const clickPowerEl = document.getElementById('clickPower');
                
                if (balanceEl) balanceEl.textContent = window.app.userData.balance.toFixed(3);
                if (passiveEl) passiveEl.textContent = window.app.userData.passiveIncome.toFixed(3);
                if (clickPowerEl) clickPowerEl.textContent = window.app.userData.clickPower;
            }
        }, 5000);
    }
};

function showFloatingReward(text, element) {
    const rect = element.getBoundingClientRect();
    const floating = document.createElement('div');
    
    floating.textContent = text;
    floating.style.position = 'fixed';
    floating.style.left = rect.left + rect.width / 2 + 'px';
    floating.style.top = rect.top + 'px';
    floating.style.transform = 'translate(-50%, -50%)';
    floating.style.color = '#d5b8ff';
    floating.style.fontSize = '24px';
    floating.style.fontWeight = 'bold';
    floating.style.textShadow = '0 0 10px #9b59b6';
    floating.style.pointerEvents = 'none';
    floating.style.zIndex = '1000';
    floating.style.animation = 'floatReward 1s ease-out forwards';
    
    document.body.appendChild(floating);
    
    setTimeout(() => {
        floating.remove();
    }, 1000);
}
