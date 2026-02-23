window.pages = window.pages || {};

window.pages.rating = {
    players: [],

    render: () => {
        return `
            <div class="rating-page">
                <h2>🏆 Рейтинг игроков</h2>
                
                <div class="rating-list" id="ratingList">
                    <div class="loading-spinner">Загрузка...</div>
                </div>
            </div>
        `;
    },

    init: async () => {
        await window.pages.rating.loadRating();
    },

    loadRating: async () => {
        try {
            const response = await fetch(`${window.app.API_URL}/api/rating`);
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const players = await response.json();
            
            if (players.length === 0) {
                document.getElementById('ratingList').innerHTML = `
                    <div class="empty-rating">
                        <span class="emoji">📊</span>
                        <p>Рейтинг пока пуст</p>
                        <p class="hint">Начните играть, чтобы попасть в топ!</p>
                    </div>
                `;
                return;
            }

            let html = '';
            players.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                
                html += `
                    <div class="rating-item" style="border-left: 4px solid ${player.color}">
                        <div class="rating-position">${medal}</div>
                        <div class="rating-avatar" style="background: ${player.color}">
                            ${player.avatar}
                        </div>
                        <div class="rating-info">
                            <div class="rating-name" style="color: ${player.color}">
                                ${player.name}
                                ${player.username ? `<span class="rating-username">@${player.username}</span>` : ''}
                            </div>
                            <div class="rating-balance">💰 ${player.balance.toFixed(3)} NC</div>
                            <div class="rating-total">📈 Всего: ${player.totalEarned.toFixed(3)} NC</div>
                        </div>
                    </div>
                `;
            });

            document.getElementById('ratingList').innerHTML = html;
        } catch (error) {
            console.error('Error loading rating:', error);
            document.getElementById('ratingList').innerHTML = `
                <div class="error-rating">
                    <span class="emoji">❌</span>
                    <p>Ошибка загрузки рейтинга</p>
                </div>
            `;
        }
    }
};
