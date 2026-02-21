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
    
    // Показать меню выбора игр
    showGameMenu() {
        document.getElementById('gameMenu').style.display = 'block';
        document.getElementById('circleGame').style.display = 'none';
        document.getElementById('eagleGame').style.display = 'none';
        document.querySelectorAll('.game-type-btn').forEach(btn => btn.classList.remove('active'));
    },
    
    // Выбрать игру
    selectGame(gameType) {
        this.currentGame = gameType;
        document.getElementById('gameMenu').style.display = 'none';
        
        if (gameType === 'circle') {
            document.getElementById('circleGame').style.display = 'block';
            document.getElementById('eagleGame').style.display = 'none';
            this.startCircle();
        } else {
            document.getElementById('circleGame').style.display = 'none';
            document.getElementById('eagleGame').style.display = 'block';
            this.startEagle();
        }
    },
    
    // Вернуться в меню игр
    backToMenu() {
        this.currentGame = null;
        this.showGameMenu();
    },
    
    startCircle() {
        if (this.circle.interval) clearInterval(this.circle.interval);
        this.loadCircleBets();
        
        this.circle.interval = setInterval(() => {
            if (this.circle.timer > 0) {
                this.circle.timer--;
                document.getElementById('circleTimer').textContent = this.circle.timer;
                this.updateCircleProgress();
                
                if (this.circle.timer === 0) this.finishCircle();
            }
        }, 1000);
    },
    
    async loadCircleBets() {
        const bets = await DB.lottery.getBets('circle');
        if (bets.length > 0) {
            this.circle.bets = bets;
            this.circle.pool = bets.reduce((s, b) => s + b.amount, 0);
            this.circle.players = bets.length;
            if (this.circle.timer === 0) this.circle.timer = 120;
            this.updateCircleUI();
        }
    },
    
    updateCircleProgress() {
        const circle = document.getElementById('lotteryCircle');
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
        
        if (!user || isNaN(amount) || amount <= 0 || amount > user.balance) {
            window.app.showNotification('Некорректная сумма');
            return;
        }
        
        user.balance -= amount;
        await DB.users.update(user.tg_id, { balance: user.balance });
        
        const placed = await DB.lottery.placeBet({
            user_id: user.tg_id,
            lottery_type: 'circle',
            amount: amount
        });
        
        if (placed) {
            this.circle.bets.push({ userId: user.tg_id, amount });
            this.circle.pool += amount;
            this.circle.players++;
            if (this.circle.timer === 0) this.circle.timer = 120;
            
            this.updateCircleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка принята!');
        }
    },
    
    async finishCircle() {
        if (this.circle.bets.length === 0) return;
        
        const winner = this.circle.bets[Math.floor(Math.random() * this.circle.bets.length)];
        const winnerData = await DB.users.get(winner.userId);
        
        if (winnerData) {
            await DB.users.update(winner.userId, {
                balance: winnerData.balance + this.circle.pool
            });
            
            if (winner.userId === window.app.user?.tg_id) {
                window.app.showNotification(`🎉 Вы выиграли ${this.circle.pool.toFixed(3)}!`);
            }
        }
        
        await DB.lottery.clearBets('circle');
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
    
    startEagle() {
        if (this.eagle.interval) clearInterval(this.eagle.interval);
        this.loadEagleBets();
        
        this.eagle.interval = setInterval(() => {
            if (this.eagle.timer > 0) {
                this.eagle.timer--;
                document.getElementById('eagleTimer').textContent = this.eagle.timer;
                if (this.eagle.timer === 0) this.finishEagle();
            }
        }, 1000);
    },
    
    async loadEagleBets() {
        const bets = await DB.lottery.getBets('eagle');
        if (bets.length > 0) {
            this.eagle.bets = bets;
            this.eagle.eaglePool = bets.filter(b => b.team === 'eagle').reduce((s, b) => s + b.amount, 0);
            this.eagle.revardPool = bets.filter(b => b.team === 'revard').reduce((s, b) => s + b.amount, 0);
            this.eagle.players = bets.length;
            if (this.eagle.timer === 0) this.eagle.timer = 120;
            this.updateEagleUI();
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
        
        if (!user || isNaN(amount) || amount <= 0 || amount > user.balance) {
            window.app.showNotification('Некорректная сумма');
            return;
        }
        
        user.balance -= amount;
        await DB.users.update(user.tg_id, { balance: user.balance });
        
        const placed = await DB.lottery.placeBet({
            user_id: user.tg_id,
            lottery_type: 'eagle',
            team: this.selectedTeam,
            amount: amount
        });
        
        if (placed) {
            this.eagle.bets.push({ userId: user.tg_id, team: this.selectedTeam, amount });
            
            if (this.selectedTeam === 'eagle') {
                this.eagle.eaglePool += amount;
            } else {
                this.eagle.revardPool += amount;
            }
            
            this.eagle.players++;
            if (this.eagle.timer === 0) this.eagle.timer = 120;
            
            this.updateEagleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка сделана!');
        }
    },
    
    async finishEagle() {
        if (this.eagle.bets.length === 0) return;
        
        const winningTeam = Math.random() < 0.5 ? 'eagle' : 'revard';
        const winningPool = winningTeam === 'eagle' ? this.eagle.eaglePool : this.eagle.revardPool;
        const totalPool = this.eagle.eaglePool + this.eagle.revardPool;
        
        const winningBets = this.eagle.bets.filter(b => b.team === winningTeam);
        
        for (const bet of winningBets) {
            const userData = await DB.users.get(bet.userId);
            if (userData) {
                const winAmount = (bet.amount / winningPool) * totalPool;
                await DB.users.update(bet.userId, {
                    balance: userData.balance + winAmount
                });
                
                if (bet.userId === window.app.user?.tg_id) {
                    window.app.showNotification(`🎉 Вы выиграли +${winAmount.toFixed(3)}!`);
                }
            }
        }
        
        await DB.lottery.clearBets('eagle');
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
        document.getElementById('eaglePool').textContent = this.eagle.eaglePool.toFixed(3);
        document.getElementById('revardPool').textContent = this.eagle.revardPool.toFixed(3);
        document.getElementById('eaglePlayers').textContent = this.eagle.players;
        document.getElementById('eagleTimer').textContent = this.eagle.timer;
    }
};
