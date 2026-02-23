window.pages = window.pages || {};

window.pages.rating = {
    render: () => `
        <div class="rating-page">
            <h2>🏆 Рейтинг</h2>
            <div class="rating-list" id="ratingList">
                <div class="loading-spinner">Загрузка...</div>
            </div>
            <button class="refresh-rating" id="refreshRating">🔄 Обновить</button>
        </div>
    `,

    init: () => {
        window.pages.rating.load();
        document.getElementById('refreshRating')?.addEventListener('click', () => window.pages.rating.load());
    },

    load: async () => {
        try {
            const res = await fetch(`${window.app.API_URL}/api/rating`);
            const players = await res.json();
            
            const list = document.getElementById('ratingList');
            if (!list) return;

            if (players.length === 0) {
                list.innerHTML = `<div class="empty-rating"><span class="emoji">📊</span><p>Рейтинг пуст</p></div>`;
                return;
            }

            list.innerHTML = players.map((p, i) => `
                <div class="rating-item" style="border-left:4px solid ${p.color}">
                    <div class="rating-position">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
                    <div class="rating-avatar" style="background:${p.color}">${p.avatar}</div>
                    <div class="rating-info">
                        <div class="rating-name" style="color:${p.color}">${p.name}</div>
                        <div class="rating-balance">💰 ${p.balance.toFixed(3)} NC</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            document.getElementById('ratingList').innerHTML = `
                <div class="error-rating"><span class="emoji">❌</span><p>Ошибка загрузки</p></div>
            `;
        }
    }
};
