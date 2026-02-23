window.pages = window.pages || {};

window.pages.rating = {
    players: [
        { id: 1, name: 'CryptoKing', balance: 15000, avatar: '👑' },
        { id: 2, name: 'MoonHunter', balance: 12000, avatar: '🌙' },
        { id: 3, name: 'StarLord', balance: 10000, avatar: '⭐' },
        { id: 4, name: 'CoinMaster', balance: 8500, avatar: '💰' },
        { id: 5, name: 'ClickPro', balance: 7200, avatar: '👆' },
        { id: 6, name: 'LuckyOne', balance: 6100, avatar: '🍀' },
        { id: 7, name: 'RichMan', balance: 5400, avatar: '💎' },
        { id: 8, name: 'TokenGuru', balance: 4800, avatar: '🔮' }
    ],

    render: () => {
        const topThree = window.pages.rating.players.slice(0, 3);
        const otherPlayers = window.pages.rating.players.slice(3);

        return `
            <div class="rating-page">
                <h2>🏆 Рейтинг игроков</h2>
                
                <div class="top-players">
                    <div class="top-three">
                        ${topThree.map((player, index) => `
                            <div class="top-player">
                                <div class="avatar" style="border-color: ${index === 0 ? 'gold' : index === 1 ? 'silver' : '#cd7f32'}">
                                    ${player.avatar}
                                </div>
                                <div class="name">${player.name}</div>
                                <div class="balance">💰 ${player.balance}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="rating-list">
                    ${otherPlayers.map((player, index) => `
                        <div class="rating-item">
                            <div class="rating-position">${index + 4}</div>
                            <div class="rating-avatar">${player.avatar}</div>
                            <div class="rating-info">
                                <div class="rating-name">${player.name}</div>
                                <div class="rating-balance">💰 ${player.balance}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    init: () => {
        // Здесь можно добавить загрузку реального рейтинга с сервера
        console.log('Rating page loaded');
    }
};