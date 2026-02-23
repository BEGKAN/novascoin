window.pages = window.pages || {};

window.pages.profile = {
    showColorPicker: false,
    selectedColor: '#9b59b6',

    render: (userData) => {
        const todayEarned = userData.stats?.today || 0;
        const totalEarned = userData.stats?.total || 0;

        return `
            <div class="profile-page">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${userData.nickname ? userData.nickname[0].toUpperCase() : '👤'}
                    </div>
                    <div class="profile-name" style="color: ${userData.nicknameColor}">
                        ${userData.nickname}
                    </div>
                    <div class="profile-tag">
                        @${window.app.username || 'username'}
                    </div>
                </div>

                <div class="profile-stats">
                    <div class="stat-card">
                        <div class="stat-value">+${todayEarned.toFixed(3)}</div>
                        <div class="stat-label">За сегодня</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${totalEarned.toFixed(3)}</div>
                        <div class="stat-label">За все время</div>
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="action-button" id="changeNickname">
                        <span>✏️</span>
                        Сменить ник<br>1000 NC
                    </button>
                    <button class="action-button" id="changeColor">
                        <span>🎨</span>
                        Сменить цвет<br>1000 NC
                    </button>
                </div>

                ${window.pages.profile.showColorPicker ? window.pages.profile.renderColorPicker() : ''}
            </div>
        `;
    },

    renderColorPicker: () => {
        return `
            <div class="color-picker-modal" id="colorPickerModal">
                <div class="color-picker-content">
                    <h3 style="text-align: center; margin-bottom: 15px;">Выберите цвет</h3>
                    
                    <div class="color-preview" id="colorPreview" 
                         style="background: ${window.pages.profile.selectedColor}"></div>
                    
                    <input type="range" min="0" max="360" value="280" 
                           class="color-slider" id="colorSlider">
                    
                    <div class="color-buttons">
                        <button class="save" id="saveColor">Сохранить</button>
                        <button class="cancel" id="cancelColor">Отмена</button>
                    </div>
                </div>
            </div>
        `;
    },

    init: () => {
        // Кнопка смены ника
        const changeNicknameBtn = document.getElementById('changeNickname');
        if (changeNicknameBtn) {
            changeNicknameBtn.addEventListener('click', async () => {
                if (window.app.userData.balance < 1000) {
                    window.app.showNotification('❌ Недостаточно средств!', true);
                    return;
                }

                const newNickname = prompt('Введите новый ник (до 20 символов):', 
                                          window.app.userData.nickname);
                
                if (newNickname && newNickname.length <= 20) {
                    // Списываем средства
                    window.app.userData.balance -= 1000;
                    window.app.userData.nickname = newNickname;
                    
                    // Обновляем страницу
                    const activePage = document.querySelector('.nav-item.active').dataset.page;
                    window.loadPage(activePage);
                    
                    window.app.showNotification(`✅ Ник изменен на ${newNickname}`);
                } else if (newNickname) {
                    window.app.showNotification('❌ Ник слишком длинный!', true);
                }
            });
        }

        // Кнопка смены цвета
        const changeColorBtn = document.getElementById('changeColor');
        if (changeColorBtn) {
            changeColorBtn.addEventListener('click', () => {
                if (window.app.userData.balance < 1000) {
                    window.app.showNotification('❌ Недостаточно средств!', true);
                    return;
                }

                window.pages.profile.showColorPicker = true;
                window.pages.profile.selectedColor = window.app.userData.nicknameColor;
                
                // Перерисовываем страницу с пикером цвета
                const activePage = document.querySelector('.nav-item.active').dataset.page;
                window.loadPage(activePage);
                
                // Инициализируем пикер цвета
                window.pages.profile.initColorPicker();
            });
        }
    },

    initColorPicker: () => {
        const slider = document.getElementById('colorSlider');
        const preview = document.getElementById('colorPreview');
        const saveBtn = document.getElementById('saveColor');
        const cancelBtn = document.getElementById('cancelColor');

        if (slider) {
            slider.addEventListener('input', (e) => {
                const hue = e.target.value;
                const color = `hsl(${hue}, 100%, 50%)`;
                preview.style.background = color;
                window.pages.profile.selectedColor = color;
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Списываем средства
                window.app.userData.balance -= 1000;
                window.app.userData.nicknameColor = window.pages.profile.selectedColor;
                
                window.pages.profile.showColorPicker = false;
                
                // Обновляем страницу
                const activePage = document.querySelector('.nav-item.active').dataset.page;
                window.loadPage(activePage);
                
                window.app.showNotification('✅ Цвет изменен!');
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.pages.profile.showColorPicker = false;
                
                // Обновляем страницу
                const activePage = document.querySelector('.nav-item.active').dataset.page;
                window.loadPage(activePage);
            });
        }
    }
};