window.games = {
    currentGame: null,
    selectedTeam: null,
    
    circle: {
        timer: 0,
        pool: 0,
        players: 0,
        bets: [],
        playerTotals: {}, // Общая сумма каждого игрока
        interval: null,
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']
    },
    
    eagle: {
        timer: 0,
        eaglePool: 0,
        revardPool: 0,
        players: 0,
        bets: [],
        playerTotals: {},
        interval: null
    },
    
    init() {
        this.showGameMenu();
        this.loadAllBets();
    },
    
    async loadAllBets() {
        await this.loadCircleBets();
        await this.loadEagleBets();
        this.updateOnlineStats();
    },
    
    showGameMenu() {
        this.currentGame = null;
        document.getElementById('gameMenu').style.display = 'block';
        document.getElementById('circleGame').style.display = 'none';
        document.getElementById('eagleGame').style.display = 'none';
    },
    
    selectGame(gameType) {
        this.currentGame = gameType;
        document.getElementById('gameMenu').style.display = 'none';
        
        if (gameType === 'circle') {
            document.getElementById('circleGame').style.display = 'block';
            document.getElementById('eagleGame').style.display = 'none';
            this.startCircleTimer();
        } else {
            document.getElementById('circleGame').style.display = 'none';
            document.getElementById('eagleGame').style.display = 'block';
            this.startEagleTimer();
        }
    },
    
    backToMenu() {
        this.currentGame = null;
        this.showGameMenu();
    },
    
    // КРУГОВАЯ ЛОТЕРЕЯ
    startCircleTimer() {
        if (this.circle.interval) clearInterval(this.circle.interval);
        
        this.circle.interval = setInterval(() => {
            if (this.circle.timer > 0) {
                this.circle.timer--;
                document.getElementById('circleTimer').textContent = this.circle.timer;
                this.updateCircleProgress();
                
                if (this.circle.timer === 0) {
                    this.finishCircle();
                }
            }
        }, 1000);
    },
    
    async loadCircleBets() {
        try {
            const bets = await DB.lottery.getBets('circle');
            if (bets && bets.length > 0) {
                this.circle.bets = bets;
                
                // Считаем общую сумму каждого игрока
                this.circle.playerTotals = {};
                bets.forEach(bet => {
                    const userId = bet.user_id;
                    this.circle.playerTotals[userId] = (this.circle.playerTotals[userId] || 0) + bet.amount;
                });
                
                this.circle.pool = bets.reduce((s, b) => s + (b.amount || 0), 0);
                this.circle.players = Object.keys(this.circle.playerTotals).length;
                
                if (this.circle.timer === 0 && this.circle.players > 0) {
                    this.circle.timer = 120;
                }
                
                this.updateCircleUI();
            }
        } catch (error) {
            console.error('Ошибка загрузки ставок:', error);
        }
    },
    
    updateCircleProgress() {
        const circle = document.getElementById('lotteryCircle');
        if (!circle) return;
        
        if (this.circle.players === 0) {
            circle.style.background = '#1b1029';
            return;
        }
        
        if (this.circle.players === 1) {
            circle.style.background = this.circle.colors[0];
            return;
        }
        
        let gradient = 'conic-gradient(';
        let start = 0;
        let index = 0;
        
        // Проходим по уникальным игрокам
        for (let userId in this.circle.playerTotals) {
            const amount = this.circle.playerTotals[userId];
            const percent = (amount / this.circle.pool) * 100;
            const color = this.circle.colors[index % this.circle.colors.length];
            const end = start + (percent * 3.6);
            gradient += `${color} ${start}deg ${end}deg, `;
            start = end;
            index++;
        }
        
        circle.style.background = gradient.slice(0, -2) + ')';
    },
    
    async placeCircleBet() {
        const user = window.app.user;
        const amount = parseFloat(document.getElementById('circleBetAmount').value);
        
        if (!user) {
            window.app.showNotification('Ошибка пользователя');
            return;
        }
        
        if (isNaN(amount) || amount < 0.001) {
            window.app.showNotification('Минимальная ставка 0.001');
            return;
        }
        
        if (amount > user.balance) {
            window.app.showNotification('Недостаточно средств');
            return;
        }
        
        // Списываем баланс
        user.balance -= amount;
        await DB.users.update(user.tg_id, { balance: user.balance });
        
        // Сохраняем ставку
        const placed = await DB.lottery.placeBet({
            user_id: user.tg_id,
            lottery_type: 'circle',
            amount: amount
        });
        
        if (placed) {
            // Добавляем ставку
            this.circle.bets.push({ user_id: user.tg_id, amount });
            
            // Обновляем общую сумму игрока
            this.circle.playerTotals[user.tg_id] = (this.circle.playerTotals[user.tg_id] || 0) + amount;
            
            this.circle.pool += amount;
            this.circle.players = Object.keys(this.circle.playerTotals).length;
            
            if (this.circle.timer === 0) {
                this.circle.timer = 120;
            }
            
            this.updateCircleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка принята!');
            document.getElementById('circleBetAmount').value = '1';
            
            this.updateOnlineStats();
        }
    },
    
    async finishCircle() {
        if (this.circle.bets.length === 0) return;
        
        // Выбираем случайного игрока из уникальных
        const players = Object.keys(this.circle.playerTotals);
        const winnerId = parseInt(players[Math.floor(Math.random() * players.length)]);
        const winAmount = this.circle.pool;
        
        try {
            // Получаем данные победителя
            const winnerData = await DB.users.get(winnerId);
            if (winnerData) {
                await DB.users.update(winnerId, {
                    balance: (winnerData.balance || 0) + winAmount
                });
                
                if (winnerId === window.app.user?.tg_id) {
                    window.app.showNotification(`🎉 Вы выиграли ${winAmount.toFixed(3)} NC!`);
                }
            }
            
            await DB.lottery.clearBets('circle');
        } catch (error) {
            console.error('Ошибка завершения лотереи:', error);
        }
        
        this.circle.bets = [];
        this.circle.playerTotals = {};
        this.circle.pool = 0;
        this.circle.players = 0;
        this.circle.timer = 0;
        this.updateCircleUI();
    },
    
    updateCircleUI() {
        document.getElementById('circlePool').textContent = this.circle.pool.toFixed(3);
        document.getElementById('circlePlayers').textContent = this.circle.players;
        document.getElementById('circleTimer').textContent = this.circle.timer;
        this.updateCircleProgress();
    },
    
    // ОРЁЛ/РЕШКА
    startEagleTimer() {
        if (this.eagle.interval) clearInterval(this.eagle.interval);
        
        this.eagle.interval = setInterval(() => {
            if (this.eagle.timer > 0) {
                this.eagle.timer--;
                document.getElementById('eagleTimer').textContent = this.eagle.timer;
                
                if (this.eagle.timer === 0) {
                    this.finishEagle();
                }
            }
        }, 1000);
    },
    
    async loadEagleBets() {
        try {
            const bets = await DB.lottery.getBets('eagle');
            if (bets && bets.length > 0) {
                this.eagle.bets = bets;
                
                // Сбрасываем пулы
                this.eagle.eaglePool = 0;
                this.eagle.revardPool = 0;
                this.eagle.playerTotals = {};
                
                bets.forEach(bet => {
                    const userId = bet.user_id;
                    const key = `${bet.team}_${userId}`;
                    this.eagle.playerTotals[key] = (this.eagle.playerTotals[key] || 0) + bet.amount;
                    
                    if (bet.team === 'eagle') {
                        this.eagle.eaglePool += bet.amount;
                    } else {
                        this.eagle.revardPool += bet.amount;
                    }
                });
                
                // Уникальные игроки
                const uniquePlayers = new Set(bets.map(b => b.user_id));
                this.eagle.players = uniquePlayers.size;
                
                if (this.eagle.timer === 0 && this.eagle.players > 0) {
                    this.eagle.timer = 120;
                }
                
                this.updateEagleUI();
            }
        } catch (error) {
            console.error('Ошибка загрузки ставок:', error);
        }
    },
    
    selectTeam(team) {
        this.selectedTeam = team;
        document.getElementById('selectedTeam').textContent = team === 'eagle' ? 'Орёл' : 'Решка';
        document.getElementById('teamEagle').classList.toggle('selected', team === 'eagle');
        document.getElementById('teamRevard').classList.toggle('selected', team === 'revard');
    },
    
    async placeEagleBet() {
        if (!this.selectedTeam) {
            window.app.showNotification('Выберите команду');
            return;
        }
        
        const user = window.app.user;
        const amount = parseFloat(document.getElementById('eagleBetAmount').value);
        
        if (!user) {
            window.app.showNotification('Ошибка пользователя');
            return;
        }
        
        if (isNaN(amount) || amount < 0.001) {
            window.app.showNotification('Минимальная ставка 0.001');
            return;
        }
        
        if (amount > user.balance) {
            window.app.showNotification('Недостаточно средств');
            return;
        }
        
        // Списываем баланс
        user.balance -= amount;
        await DB.users.update(user.tg_id, { balance: user.balance });
        
        const placed = await DB.lottery.placeBet({
            user_id: user.tg_id,
            lottery_type: 'eagle',
            team: this.selectedTeam,
            amount: amount
        });
        
        if (placed) {
            this.eagle.bets.push({ 
                user_id: user.tg_id, 
                team: this.selectedTeam, 
                amount: amount 
            });
            
            // Обновляем статистику команд
            if (this.selectedTeam === 'eagle') {
                this.eagle.eaglePool += amount;
            } else {
                this.eagle.revardPool += amount;
            }
            
            // Обновляем уникальных игроков
            const uniquePlayers = new Set(this.eagle.bets.map(b => b.user_id));
            this.eagle.players = uniquePlayers.size;
            
            if (this.eagle.timer === 0) {
                this.eagle.timer = 120;
            }
            
            this.updateEagleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка сделана!');
            document.getElementById('eagleBetAmount').value = '10';
            
            this.updateOnlineStats();
        }
    },
    
    async finishEagle() {
        if (this.eagle.bets.length === 0) return;
        
        const winningTeam = Math.random() < 0.5 ? 'eagle' : 'revard';
        const winningPool = winningTeam === 'eagle' ? this.eagle.eaglePool : this.eagle.revardPool;
        const totalPool = this.eagle.eaglePool + this.eagle.revardPool;
        
        const winningBets = this.eagle.bets.filter(b => b.team === winningTeam);
        
        try {
            for (const bet of winningBets) {
                const userData = await DB.users.get(bet.user_id);
                if (userData) {
                    const winAmount = (bet.amount / winningPool) * totalPool;
                    await DB.users.update(bet.user_id, {
                        balance: (userData.balance || 0) + winAmount
                    });
                    
                    if (bet.user_id === window.app.user?.tg_id) {
                        window.app.showNotification(`🎉 Вы выиграли +${winAmount.toFixed(3)} NC!`);
                    }
                }
            }
            
            await DB.lottery.clearBets('eagle');
        } catch (error) {
            console.error('Ошибка завершения лотереи:', error);
        }
        
        this.eagle.bets = [];
        this.eagle.playerTotals = {};
        this.eagle.eaglePool = 0;
        this.eagle.revardPool = 0;
        this.eagle.players = 0;
        this.eagle.timer = 0;
        this.selectedTeam = null;
        
        this.updateEagleUI();
        document.getElementById('selectedTeam').textContent = 'Выберите команду';
        document.getElementById('teamEagle').classList.remove('selected');
        document.getElementById('teamRevard').classList.remove('selected');
    },
    
    updateEagleUI() {
        document.getElementById('eaglePool').textContent = (this.eagle.eaglePool || 0).toFixed(3);
        document.getElementById('revardPool').textContent = (this.eagle.revardPool || 0).toFixed(3);
        document.getElementById('eaglePlayers').textContent = this.eagle.players || 0;
        document.getElementById('eagleTimer').textContent = this.eagle.timer || 0;
    },
    
    // Обновление онлайн статистики
    updateOnlineStats() {
        const totalPlayers = this.circle.players + this.eagle.players;
        window.app.updateOnlineStats(totalPlayers);
    }
};
