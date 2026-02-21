window.games = {
    currentGame: null,
    selectedTeam: null,
    
    circle: {
        timer: 0,
        pool: 0,
        players: 0,
        bets: [],
        interval: null,
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']
    },
    
    eagle: {
        timer: 0,
        eaglePool: 0,
        revardPool: 0,
        players: 0,
        bets: [],
        interval: null
    },
    
    init() {
        this.showGameMenu();
        this.loadAllBets();
    },
    
    async loadAllBets() {
        await this.loadCircleBets();
        await this.loadEagleBets();
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
                this.circle.bets = bets.map(bet => ({
                    userId: bet.user_id,
                    amount: bet.amount
                }));
                this.circle.pool = bets.reduce((s, b) => s + (b.amount || 0), 0);
                this.circle.players = bets.length;
                
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
        
        if (this.circle.bets.length === 0) {
            circle.style.background = '#1b1029';
            return;
        }
        
        if (this.circle.bets.length === 1) {
            circle.style.background = this.circle.colors[0];
            return;
        }
        
        let gradient = 'conic-gradient(';
        let start = 0;
        
        this.circle.bets.forEach((bet, i) => {
            const percent = (bet.amount / this.circle.pool) * 100;
            const color = this.circle.colors[i % this.circle.colors.length];
            const end = start + (percent * 3.6);
            gradient += `${color} ${start}deg ${end}deg, `;
            start = end;
        });
        
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
        
        // Списываем баланс через защищенный метод
        const updated = await DB.users.updateBalance(user.tg_id, amount, 'subtract');
        
        if (!updated) {
            window.app.showNotification('Ошибка списания средств');
            return;
        }
        
        user.balance = updated.balance;
        
        const placed = await DB.lottery.placeBet({
            user_id: user.tg_id,
            lottery_type: 'circle',
            amount: amount
        });
        
        if (placed) {
            this.circle.bets.push({ userId: user.tg_id, amount });
            this.circle.pool += amount;
            this.circle.players++;
            
            if (this.circle.timer === 0) {
                this.circle.timer = 120;
            }
            
            this.updateCircleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка принята!');
            document.getElementById('circleBetAmount').value = '1';
            
            // Перезагружаем ставки
            await this.loadCircleBets();
        }
    },
    
    async finishCircle() {
        if (this.circle.bets.length === 0) return;
        
        const winner = this.circle.bets[Math.floor(Math.random() * this.circle.bets.length)];
        const winAmount = this.circle.pool;
        
        try {
            // Начисляем выигрыш победителю
            await DB.users.updateBalance(winner.userId, winAmount, 'add');
            
            if (winner.userId === window.app.user?.tg_id) {
                window.app.showNotification(`🎉 Вы выиграли ${winAmount.toFixed(3)} NC!`);
            }
            
            await DB.lottery.clearBets('circle');
        } catch (error) {
            console.error('Ошибка завершения лотереи:', error);
        }
        
        this.circle.bets = [];
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
                this.eagle.bets = bets.map(bet => ({
                    userId: bet.user_id,
                    team: bet.team,
                    amount: bet.amount
                }));
                
                this.eagle.eaglePool = bets
                    .filter(b => b.team === 'eagle')
                    .reduce((s, b) => s + (b.amount || 0), 0);
                    
                this.eagle.revardPool = bets
                    .filter(b => b.team === 'revard')
                    .reduce((s, b) => s + (b.amount || 0), 0);
                    
                this.eagle.players = bets.length;
                
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
        
        // Списываем баланс через защищенный метод
        const updated = await DB.users.updateBalance(user.tg_id, amount, 'subtract');
        
        if (!updated) {
            window.app.showNotification('Ошибка списания средств');
            return;
        }
        
        user.balance = updated.balance;
        
        const placed = await DB.lottery.placeBet({
            user_id: user.tg_id,
            lottery_type: 'eagle',
            team: this.selectedTeam,
            amount: amount
        });
        
        if (placed) {
            this.eagle.bets.push({ 
                userId: user.tg_id, 
                team: this.selectedTeam, 
                amount: amount 
            });
            
            if (this.selectedTeam === 'eagle') {
                this.eagle.eaglePool += amount;
            } else {
                this.eagle.revardPool += amount;
            }
            
            this.eagle.players++;
            
            if (this.eagle.timer === 0) {
                this.eagle.timer = 120;
            }
            
            this.updateEagleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка сделана!');
            document.getElementById('eagleBetAmount').value = '10';
            
            // Перезагружаем ставки
            await this.loadEagleBets();
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
                const winAmount = (bet.amount / winningPool) * totalPool;
                await DB.users.updateBalance(bet.userId, winAmount, 'add');
                
                if (bet.userId === window.app.user?.tg_id) {
                    window.app.showNotification(`🎉 Вы выиграли +${winAmount.toFixed(3)} NC!`);
                }
            }
            
            await DB.lottery.clearBets('eagle');
        } catch (error) {
            console.error('Ошибка завершения лотереи:', error);
        }
        
        this.eagle.bets = [];
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
    }
};
