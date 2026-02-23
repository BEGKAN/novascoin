window.pages = window.pages || {};

window.pages.profile = {
    showColorPicker: false,
    selectedColor: '#9b59b6',

    render: (data) => `
        <div class="profile-page">
            <div class="profile-header">
                <div class="profile-avatar">${data.nickname[0]?.toUpperCase() || '👤'}</div>
                <div class="profile-name" style="color: ${data.nicknameColor}">${data.nickname}</div>
                <div class="profile-tag">@${window.app.username || 'user'}</div>
            </div>
            <div class="profile-stats">
                <div class="stat-card"><div class="stat-value">+${data.stats.today.toFixed(3)}</div><div>За сегодня</div></div>
                <div class="stat-card"><div class="stat-value">${data.stats.total.toFixed(3)}</div><div>За всё время</div></div>
            </div>
            <div class="profile-actions">
                <button class="action-button" id="changeNickname"><span>✏️</span>Сменить ник<br>1000 NC</button>
                <button class="action-button" id="changeColor"><span>🎨</span>Сменить цвет<br>1000 NC</button>
            </div>
            ${window.pages.profile.showColorPicker ? window.pages.profile.renderColorPicker() : ''}
        </div>
    `,

    renderColorPicker: () => `
        <div class="color-picker-modal">
            <div class="color-picker-content">
                <h3 style="text-align:center;">Выберите цвет</h3>
                <div class="color-preview" id="colorPreview" style="background:${window.pages.profile.selectedColor}"></div>
                <input type="range" min="0" max="360" value="280" class="color-slider" id="colorSlider">
                <div class="color-buttons">
                    <button class="save" id="saveColor">Сохранить</button>
                    <button class="cancel" id="cancelColor">Отмена</button>
                </div>
            </div>
        </div>
    `,

    init: () => {
        document.getElementById('changeNickname')?.addEventListener('click', async () => {
            if (window.app.userData.balance < 1000) {
                return window.app.showNotification('❌ Недостаточно средств', true);
            }
            const newName = prompt('Новый ник:', window.app.userData.nickname);
            if (newName && newName.length <= 20) {
                window.app.userData.balance -= 1000;
                window.app.userData.nickname = newName;
                window.app.showNotification('✅ Ник изменен');
                window.loadPage('profile');
            }
        });

        document.getElementById('changeColor')?.addEventListener('click', () => {
            if (window.app.userData.balance < 1000) {
                return window.app.showNotification('❌ Недостаточно средств', true);
            }
            window.pages.profile.showColorPicker = true;
            window.pages.profile.selectedColor = window.app.userData.nicknameColor;
            window.loadPage('profile');
            window.pages.profile.initColorPicker();
        });
    },

    initColorPicker: () => {
        const slider = document.getElementById('colorSlider');
        const preview = document.getElementById('colorPreview');
        
        slider?.addEventListener('input', (e) => {
            const color = `hsl(${e.target.value}, 100%, 50%)`;
            preview.style.background = color;
            window.pages.profile.selectedColor = color;
        });

        document.getElementById('saveColor')?.addEventListener('click', () => {
            window.app.userData.balance -= 1000;
            window.app.userData.nicknameColor = window.pages.profile.selectedColor;
            window.pages.profile.showColorPicker = false;
            window.app.showNotification('✅ Цвет изменен');
            window.loadPage('profile');
        });

        document.getElementById('cancelColor')?.addEventListener('click', () => {
            window.pages.profile.showColorPicker = false;
            window.loadPage('profile');
        });
    }
};
