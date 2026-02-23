window.pages = window.pages || {};

window.pages.rating = {
    players: [],
    loading: false,

    render: () => {
        return `
            <div class="rating-page">
                <h2>🏆 Рейтинг игроков</h2>
                
                <div class="rating-list" id="ratingList">
                    <div class="loading-spinner">Загрузка...</div>
                </div>
                
                <div class="rating-update">
                    <button class="refresh-rating" id="refreshRating">
                        🔄 Обновить рейтинг
                    </button>
                </div>
            </div>
        `;
    },

    init: () => {
        window.pages.rating.loadRating();
        
        const refreshBtn = document.getElementById('refreshRating');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                window.pages.rating.loadRating();
            });
        }
    },

    loadRating: async () => {
        if (window.pages.rating.loading) return;
        
        window.pages.rating.loading = true;
        
        try {
            const response = await fetch(`${window.app.API_URL}/api/rating`);
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const players = await response.json();
            window.pages.rating.players = players;
            
            const ratingList = document.getElementById('ratingList');
            if (!ratingList) return;
            
            if (players.length === 0) {
                ratingList.innerHTML = `
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

            ratingList.innerHTML = html;
        } catch (error) {
            console.error('Error loading rating:', error);
            const ratingList = document.getElementById('ratingList');
            if (ratingList) {
                ratingList.innerHTML = `
                    <div class="error-rating">
                        <span class="emoji">❌</span>
                        <p>Ошибка загрузки рейтинга</p>
                    </div>
                `;
            }
        } finally {
            window.pages.rating.loading = false;
        }
    }
};
