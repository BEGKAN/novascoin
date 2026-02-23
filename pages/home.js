window.pages = window.pages || {};

window.pages.home = {
    render: (data) => `
        <div class="home-page">
            <div class="header">
                <h1>💰 <span id="balance">${data.balance.toFixed(3)}</span></h1>
                <div class="stats">
                    <div>⚡️ <span id="passiveIncome">${data.passiveIncome.toFixed(3)}</span>/сек</div>
                    <div>👆 x<span id="clickPower">${data.clickPower}</span></div>
                </div>
            </div>
            <div class="coin-container">
                <img src="coin.png" id="coin" class="coin">
            </div>
            <a href="https://t.me/offNovaCoinChat" target="_blank" class="chat-link">
                <span class="chat-icon">💬</span>
                <span class="chat-text">Заходите в наш чат</span>
                <span class="chat-arrow">→</span>
            </a>
        </div>
    `,

    init: () => {
        const coin = document.getElementById('coin');
        if (!coin) return;

        coin.addEventListener('click', async () => {
            coin.style.transform = 'scale(0.8)';
            setTimeout(() => coin.style.transform = '', 200);

            if (!window.app.userId) {
                window.app.userData.balance += 0.001;
                document.getElementById('balance').textContent = window.app.userData.balance.toFixed(3);
                showFloatingReward('+0.001', coin);
                return;
            }

            try {
                const res = await fetch(`${window.app.API_URL}/api/click`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: window.app.userId })
                });
                
                const data = await res.json();
                if (data.success) {
                    window.app.userData.balance = data.newBalance;
                    document.getElementById('balance').textContent = data.newBalance.toFixed(3);
                    showFloatingReward(`+${data.reward.toFixed(3)}`, coin);
                }
            } catch (error) {
                window.app.showNotification('❌ Ошибка', true);
            }
        });

        // Пассивный доход
        setInterval(async () => {
            if (window.app.userId) {
                await window.app.loadUserData(true);
                const b = document.getElementById('balance');
                const p = document.getElementById('passiveIncome');
                const c = document.getElementById('clickPower');
                if (b) b.textContent = window.app.userData.balance.toFixed(3);
                if (p) p.textContent = window.app.userData.passiveIncome.toFixed(3);
                if (c) c.textContent = window.app.userData.clickPower;
            }
        }, 5000);
    }
};

function showFloatingReward(text, element) {
    const rect = element.getBoundingClientRect();
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = `
        position: fixed; left: ${rect.left + rect.width/2}px; top: ${rect.top}px;
        transform: translate(-50%, -50%); color: #d5b8ff; font-size: 24px;
        font-weight: bold; text-shadow: 0 0 10px #9b59b6; pointer-events: none;
        z-index: 1000; animation: floatReward 1s ease-out forwards;
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
}
