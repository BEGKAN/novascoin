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
                            const balanceEl = document.getElementById('balance');
                            if (balanceEl) {
                                balanceEl.textContent = window.app.userData.balance.toFixed(3);
                            }
                            
                            window.pages.home.showFloatingReward(`+${data.reward.toFixed(3)}`, newCoin);
                            
                            window.app.userData.stats.clicks++;
                            window.app.userData.stats.today += data.reward;
                            window.app.userData.stats.total += data.reward;
                        }
                    } catch (error) {
                        console.error('Error clicking:', error);
                        window.pages.home.showFloatingReward(`+${reward.toFixed(3)} (офлайн)`, newCoin);
                        
                        window.app.userData.balance += reward;
                        const balanceEl = document.getElementById('balance');
                        if (balanceEl) {
                            balanceEl.textContent = window.app.userData.balance.toFixed(3);
                        }
                    }
                } else {
                    window.app.userData.balance += reward;
                    const balanceEl = document.getElementById('balance');
                    if (balanceEl) {
                        balanceEl.textContent = window.app.userData.balance.toFixed(3);
                    }
                    
                    window.pages.home.showFloatingReward(`+${reward.toFixed(3)}`, newCoin);
                    
                    window.app.userData.stats.clicks++;
                    window.app.userData.stats.today += reward;
                    window.app.userData.stats.total += reward;
                }
            });

            console.log('Coin click handler attached');
        }

        window.pages.home.startPassiveIncome();
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
        
        document.body.appendChild(floating);
        
        setTimeout(() => {
            floating.remove();
        }, 1000);
    },

    startPassiveIncome: () => {
        if (window.pages.home.passiveInterval) {
            clearInterval(window.pages.home.passiveInterval);
        }

        window.pages.home.passiveInterval = setInterval(async () => {
            if (window.app.userId) {
                await window.app.loadUserData(true); // true = тихое обновление
                
                const balanceEl = document.getElementById('balance');
                const passiveEl = document.getElementById('passiveIncome');
                const clickPowerEl = document.getElementById('clickPower');
                
                if (balanceEl) {
                    balanceEl.textContent = window.app.userData.balance.toFixed(3);
                }
                if (passiveEl) {
                    passiveEl.textContent = window.app.userData.passiveIncome.toFixed(3);
                }
                if (clickPowerEl) {
                    clickPowerEl.textContent = window.app.userData.clickPower;
                }
            } else {
                window.app.userData.balance += window.app.userData.passiveIncome;
                window.app.userData.stats.today += window.app.userData.passiveIncome;
                window.app.userData.stats.total += window.app.userData.passiveIncome;
                
                const balanceEl = document.getElementById('balance');
                if (balanceEl) {
                    balanceEl.textContent = window.app.userData.balance.toFixed(3);
                }
            }
        }, 1000);
    }
};
