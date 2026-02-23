window.pages = window.pages || {};

window.pages.games = {
    render: () => {
        return `
            <div class="games-page">
                <h2>🎮 Игры</h2>
                <div class="development-message">
                    <span class="emoji">🎮</span>
                    <span class="emoji">⚙️</span>
                    <span class="emoji">✨</span>
                    <p>Игры в разработке! 🚧</p>
                    <p style="font-size: 0.9em; margin-top: 10px;">Скоро здесь появятся увлекательные игры</p>
                </div>
            </div>
        `;
    },

    init: () => {
        // Ничего не делаем, просто показываем сообщение
        console.log('Games page - в разработке');
    }
};