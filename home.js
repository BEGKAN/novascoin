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
                    <img src="coin.png" alt="Фиолетовая монетка" id="coin" class="coin">
                </div>

                <div class="daily-bonus">
                    <div class="bonus-timer">
                        ⏰ Ежедневный бонус через: <span id="bonusTimer">24:00:00</span>
                    </div>
                </div>
            </div>
        `;
    },

    init: () => {
        console.log('Home page initialized');
        
        const coin = document.getElementById('coin');
        if (coin) {
            // Убираем старые обработчики
            coin.replaceWith(coin.cloneNode(true));
            const newCoin = document.getElementById('coin');
            
            newCoin.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Coin clicked!');
                
                // Анимация
                newCoin.style.transform = 'scale(0.8)';
                newCoin.style.transition = 'transform 0.1s';
                
                setTimeout(() => {
                    newCoin.style.transform = 'scale(1)';
                }, 100);

                setTimeout(() => {
                    newCoin.style.transform = '';
                    newCoin.style.transition = '';
                }, 200);

                // Расчет награды
                const reward = 0.001 * window.app.userData.clickPower;
                
                if (window.app.userId) {
                    // Реальный режим
                    try {
                        const response = await fetch(`${window.app.API_URL}/api/click`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ 
                                userId: window.app.userId 
                            })
                        });
                        
                        if (!response.ok) throw new Error('Ошибка клика');
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            window.app.userData.balance = data.newBalance;
                            
                            // Обновляем отображение
                            document.getElementById('balance').textContent = 
                                window.app.userData.balance.toFixed(3);
                            
                            // Показываем всплывающую награду
                            window.pages.home.showFloatingReward(`+${data.reward.toFixed(3)}`, newCoin);
                            
                            // Считаем статистику
                            window.app.userData.stats.clicks++;
                            window.app.userData.stats.today += data.reward;
                            window.app.userData.stats.total += data.reward;
                        }
                    } catch (error) {
                        console.error('Error clicking:', error);
                        window.pages.home.showFloatingReward(`+${reward.toFixed(3)} (офлайн)`, newCoin);
                        
                        // Демо-режим при ошибке
                        window.app.userData.balance += reward;
                        document.getElementById('balance').textContent = 
                            window.app.userData.balance.toFixed(3);
                    }
                } else {
                    // Демо-режим
                    window.app.userData.balance += reward;
                    document.getElementById('balance').textContent = 
                        window.app.userData.balance.toFixed(3);
                    
                    window.pages.home.showFloatingReward(`+${reward.toFixed(3)}`, newCoin);
                    
                    // Считаем статистику для демо
                    window.app.userData.stats.clicks++;
                    window.app.userData.stats.today += reward;
                    window.app.userData.stats.total += reward;
                }
            });

            console.log('Coin click handler attached');
        } else {
            console.error('Coin element not found!');
        }

        // Запускаем пассивный доход
        window.pages.home.startPassiveIncome();
        
        // Запускаем таймер бонуса
        window.pages.home.startBonusTimer();
    },

    showFloatingReward: (text, element) => {
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
        
        // Добавляем анимацию
        const style = document.createElement('style');
        style.textContent = `
            @keyframes floatReward {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -150%);
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(floating);
        
        setTimeout(() => {
            floating.remove();
            style.remove();
        }, 1000);
    },

    startPassiveIncome: () => {
        // Обновляем пассивный доход каждую секунду
        setInterval(async () => {
            if (window.app.userId) {
                // В реальном режиме просто обновляем данные с сервера
                await window.app.loadUserData();
                
                // Обновляем отображение
                const balanceEl = document.getElementById('balance');
                const passiveEl = document.getElementById('passiveIncome');
                
                if (balanceEl) {
                    balanceEl.textContent = window.app.userData.balance.toFixed(3);
                }
                if (passiveEl) {
                    passiveEl.textContent = window.app.userData.passiveIncome.toFixed(3);
                }
            } else {
                // Демо-режим
                window.app.userData.balance += window.app.userData.passiveIncome;
                window.app.userData.stats.today += window.app.userData.passiveIncome;
                window.app.userData.stats.total += window.app.userData.passiveIncome;
                
                const balanceEl = document.getElementById('balance');
                if (balanceEl) {
                    balanceEl.textContent = window.app.userData.balance.toFixed(3);
                }
            }
        }, 1000);
    },

    startBonusTimer: () => {
        // Таймер до следующего бонуса (24 часа)
        let timeLeft = 24 * 60 * 60; // 24 часа в секундах
        
        setInterval(() => {
            if (timeLeft <= 0) {
                // Время бонуса!
                const bonusBtn = document.querySelector('.bonus-timer');
                if (bonusBtn) {
                    bonusBtn.innerHTML = '🎁 Ежедневный бонус доступен! <button class="bonus-button">Забрать</button>';
                    
                    const button = document.querySelector('.bonus-button');
                    if (button) {
                        button.addEventListener('click', async () => {
                            const bonus = 10; // 10 монет бонуса
                            
                            if (window.app.userId) {
                                // Здесь будет API для бонуса
                                window.app.userData.balance += bonus;
                                window.app.showNotification(`🎁 Бонус ${bonus} монет получен!`);
                            } else {
                                window.app.userData.balance += bonus;
                                window.app.showNotification(`🎁 Бонус ${bonus} монет получен! (демо)`);
                            }
                            
                            // Обновляем баланс
                            const balanceEl = document.getElementById('balance');
                            if (balanceEl) {
                                balanceEl.textContent = window.app.userData.balance.toFixed(3);
                            }
                            
                            // Сбрасываем таймер
                            timeLeft = 24 * 60 * 60;
                            window.pages.home.updateTimerDisplay(timeLeft);
                        });
                    }
                }
            } else {
                timeLeft--;
                window.pages.home.updateTimerDisplay(timeLeft);
            }
        }, 1000);
    },

    updateTimerDisplay: (seconds) => {
        const timerEl = document.getElementById('bonusTimer');
        if (timerEl) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            timerEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
};
