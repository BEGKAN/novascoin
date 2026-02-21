// Игры (лотереи)
window.games = {
    currentGame: 'circle',
    selectedTeam: null,
    
    // Состояние лотерей
    circleLottery: {
        timer: 0,
        pool: 0,
        players: 0,
        bets: [], // [{ userId, amount, color }]
        interval: null,
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']
    },
    
    eagleLottery: {
        timer: 0,
        eaglePool: 0,
        revardPool: 0,
        players: 0,
        bets: [], // [{ userId, amount, team }]
        interval: null
    },
    
    // Инициализация игр
    init() {
        if (this.currentGame === 'circle') {
            this.startCircleLottery();
        } else {
            this.startEagleLottery();
        }
    },
    
    // Показать игру
    showGame(gameType) {
        this.currentGame = gameType;
        
        document.getElementById('circleGame').style.display = gameType === 'circle' ? 'block' : 'none';
        document.getElementById('eagleGame').style.display = gameType === 'eagle' ? 'block' : 'none';
        
        document.querySelectorAll('.game-type-btn').forEach((btn, i) => {
            btn.classList.toggle('active', (i === 0 && gameType === 'circle') || (i === 1 && gameType === 'eagle'));
        });
        
        if (gameType === 'circle') {
            this.startCircleLottery();
        } else {
            this.startEagleLottery();
        }
    },
    
    // КРУГОВАЯ ЛОТЕРЕЯ (один победитель забирает всё)
    startCircleLottery() {
        // Очищаем предыдущий интервал
        if (this.circleLottery.interval) {
            clearInterval(this.circleLottery.interval);
        }
        
        // Загружаем ставки из базы данных
        this.loadCircleBets();
        
        // Запускаем таймер
        this.circleLottery.interval = setInterval(() => {
            if (this.circleLottery.timer > 0) {
                this.circleLottery.timer--;
                document.getElementById('circleTimer').textContent = this.circleLottery.timer;
                
                // Обновляем круг (процент заполнения)
                this.updateCircleProgress();
                
                // Если таймер дошел до 0 - определяем победителя
                if (this.circleLottery.timer === 0) {
                    this.finishCircleLottery();
                }
            }
        }, 1000);
    },
    
    // Загрузка ставок для круговой лотереи
    async loadCircleBets() {
        const bets = await window.db.lottery.getBets('circle');
        
        if (bets.length > 0) {
            this.circleLottery.bets = bets;
            this.circleLottery.pool = bets.reduce((sum, bet) => sum + bet.amount, 0);
            this.circleLottery.players = bets.length;
            
            // Если есть ставки, запускаем таймер на 120 секунд
            if (this.circleLottery.timer === 0) {
                this.circleLottery.timer = 120;
            }
            
            this.updateCircleUI();
        }
    },
    
    // Обновление круга (цвета в зависимости от ставок)
    updateCircleProgress() {
        const circle = document.getElementById('lotteryCircle');
        if (!circle) return;
        
        if (this.circleLottery.bets.length === 0) {
            circle.style.background = '#1b1029';
            return;
        }
        
        // Если только один игрок - круг одного цвета
        if (this.circleLottery.bets.length === 1) {
            circle.style.background = this.circleLottery.colors[0];
            return;
        }
        
        // Если несколько игроков - создаем конический градиент
        // Каждый игрок занимает процент круга пропорционально его ставке
        let gradient = 'conic-gradient(';
        let startAngle = 0;
        
        this.circleLottery.bets.forEach((bet, index) => {
            const percentage = (bet.amount / this.circleLottery.pool) * 100;
            const color = this.circleLottery.colors[index % this.circleLottery.colors.length];
            const endAngle = startAngle + (percentage * 3.6); // 3.6 градусов = 1%
            
            gradient += `${color} ${startAngle}deg ${endAngle}deg, `;
            startAngle = endAngle;
        });
        
        // Убираем последнюю запятую и закрываем
        gradient = gradient.slice(0, -2) + ')';
        circle.style.background = gradient;
    },
    
    // Сделать ставку в круговую лотерею
    async placeCircleBet() {
        const user = window.app.user;
        const amount = parseFloat(document.getElementById('circleBetAmount').value);
        
        if (!user) {
            window.app.showNotification('Ошибка загрузки пользователя');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            window.app.showNotification('Введите корректную сумму');
            return;
        }
        
        if (amount > user.balance) {
            window.app.showNotification('Недостаточно средств');
            return;
        }
        
        // Списываем баланс
        user.balance -= amount;
        await window.db.users.update(user.tg_id, { balance: user.balance });
        
        // Сохраняем ставку
        const betData = {
            user_id: user.tg_id,
            lottery_type: 'circle',
            amount: amount,
            created_at: new Date()
        };
        
        const placed = await window.db.lottery.placeBet(betData);
        
        if (placed) {
            // Добавляем в локальное состояние
            const colorIndex = this.circleLottery.bets.length % this.circleLottery.colors.length;
            this.circleLottery.bets.push({
                userId: user.tg_id,
                amount: amount,
                color: this.circleLottery.colors[colorIndex]
            });
            
            this.circleLottery.pool += amount;
            this.circleLottery.players++;
            
            // Если это первая ставка, запускаем таймер
            if (this.circleLottery.timer === 0) {
                this.circleLottery.timer = 120;
            }
            
            this.updateCircleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка принята!');
            
            document.getElementById('circleBetAmount').value = '1';
        } else {
            window.app.showNotification('❌ Ошибка при ставке');
        }
    },
    
    // Завершение круговой лотереи
    async finishCircleLottery() {
        if (this.circleLottery.bets.length === 0) return;
        
        // Выбираем случайного победителя
        const winnerIndex = Math.floor(Math.random() * this.circleLottery.bets.length);
        const winner = this.circleLottery.bets[winnerIndex];
        
        // Начисляем выигрыш
        const winnerData = await window.db.users.get(winner.userId);
        if (winnerData) {
            const newBalance = winnerData.balance + this.circleLottery.pool;
            await window.db.users.update(winner.userId, { balance: newBalance });
            
            // Если победитель - текущий пользователь, показываем уведомление
            if (winner.userId === window.app.user?.tg_id) {
                window.app.showNotification(`🎉 ВЫ ВЫИГРАЛИ ${this.circleLottery.pool.toFixed(3)} NovaCoin!`);
            }
        }
        
        // Очищаем ставки в базе данных
        await window.db.lottery.clearBets('circle');
        
        // Сбрасываем локальное состояние
        this.circleLottery.bets = [];
        this.circleLottery.pool = 0;
        this.circleLottery.players = 0;
        this.circleLottery.timer = 0;
        
        this.updateCircleUI();
    },
    
    // Обновление UI круговой лотереи
    updateCircleUI() {
        document.getElementById('circlePool').textContent = this.circleLottery.pool.toFixed(3);
        document.getElementById('circlePlayers').textContent = this.circleLottery.players;
        document.getElementById('circleTimer').textContent = this.circleLottery.timer;
        this.updateCircleProgress();
    },
    
    // ОРЁЛ/РЕШКА (командная лотерея)
    startEagleLottery() {
        if (this.eagleLottery.interval) {
            clearInterval(this.eagleLottery.interval);
        }
        
        this.loadEagleBets();
        
        this.eagleLottery.interval = setInterval(() => {
            if (this.eagleLottery.timer > 0) {
                this.eagleLottery.timer--;
                document.getElementById('eagleTimer').textContent = this.eagleLottery.timer;
                
                if (this.eagleLottery.timer === 0) {
                    this.finishEagleLottery();
                }
            }
        }, 1000);
    },
    
    // Загрузка ставок для орла/решки
    async loadEagleBets() {
        const bets = await window.db.lottery.getBets('eagle');
        
        if (bets.length > 0) {
            this.eagleLottery.bets = bets;
            this.eagleLottery.eaglePool = bets.filter(b => b.team === 'eagle').reduce((sum, b) => sum + b.amount, 0);
            this.eagleLottery.revardPool = bets.filter(b => b.team === 'revard').reduce((sum, b) => sum + b.amount, 0);
            this.eagleLottery.players = bets.length;
            
            if (this.eagleLottery.timer === 0) {
                this.eagleLottery.timer = 120;
            }
            
            this.updateEagleUI();
        }
    },
    
    // Выбор команды
    selectTeam(team) {
        this.selectedTeam = team;
        document.getElementById('selectedTeam').textContent = team === 'eagle' ? 'Орёл' : 'Решка';
        
        document.getElementById('teamEagle').classList.toggle('selected', team === 'eagle');
        document.getElementById('teamRevard').classList.toggle('selected', team === 'revard');
    },
    
    // Сделать ставку в орла/решку
    async placeEagleBet() {
        if (!this.selectedTeam) {
            window.app.showNotification('Выберите команду');
            return;
        }
        
        const user = window.app.user;
        const amount = parseFloat(document.getElementById('eagleBetAmount').value);
        
        if (!user) {
            window.app.showNotification('Ошибка загрузки пользователя');
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            window.app.showNotification('Введите корректную сумму');
            return;
        }
        
        if (amount > user.balance) {
            window.app.showNotification('Недостаточно средств');
            return;
        }
        
        // Списываем баланс
        user.balance -= amount;
        await window.db.users.update(user.tg_id, { balance: user.balance });
        
        // Сохраняем ставку
        const betData = {
            user_id: user.tg_id,
            lottery_type: 'eagle',
            team: this.selectedTeam,
            amount: amount,
            created_at: new Date()
        };
        
        const placed = await window.db.lottery.placeBet(betData);
        
        if (placed) {
            // Добавляем в локальное состояние
            this.eagleLottery.bets.push({
                userId: user.tg_id,
                team: this.selectedTeam,
                amount: amount
            });
            
            if (this.selectedTeam === 'eagle') {
                this.eagleLottery.eaglePool += amount;
            } else {
                this.eagleLottery.revardPool += amount;
            }
            this.eagleLottery.players++;
            
            if (this.eagleLottery.timer === 0) {
                this.eagleLottery.timer = 120;
            }
            
            this.updateEagleUI();
            window.app.updateUI();
            window.app.showNotification('✅ Ставка сделана!');
            
            document.getElementById('eagleBetAmount').value = '10';
        } else {
            window.app.showNotification('❌ Ошибка при ставке');
        }
    },
    
    // Завершение лотереи орёл/решка
    async finishEagleLottery() {
        if (this.eagleLottery.bets.length === 0) return;
        
        // Случайно выбираем победившую команду (50/50)
        const winningTeam = Math.random() < 0.5 ? 'eagle' : 'revard';
        const winningPool = winningTeam === 'eagle' ? this.eagleLottery.eaglePool : this.eagleLottery.revardPool;
        
        // Получаем все ставки победившей команды
        const winningBets = this.eagleLottery.bets.filter(b => b.team === winningTeam);
        
        // Распределяем выигрыш пропорционально ставкам
        for (const bet of winningBets) {
            const winnerData = await window.db.users.get(bet.userId);
            if (winnerData) {
                // Процент от общего пула, который получит игрок
                const winAmount = (bet.amount / winningPool) * (this.eagleLottery.eaglePool + this.eagleLottery.revardPool);
                await window.db.users.update(bet.userId, {
                    balance: winnerData.balance + winAmount
                });
                
                // Если победитель - текущий пользователь
                if (bet.userId === window.app.user?.tg_id) {
                    window.app.showNotification(`🎉 Ваша команда выиграла! +${winAmount.toFixed(3)} NovaCoin`);
                }
            }
        }
        
        // Очищаем ставки
        await window.db.lottery.clearBets('eagle');
        
        // Сбрасываем состояние
        this.eagleLottery.bets = [];
        this.eagleLottery.eaglePool = 0;
        this.eagleLottery.revardPool = 0;
        this.eagleLottery.players = 0;
        this.eagleLottery.timer = 0;
        this.selectedTeam = null;
        
        this.updateEagleUI();
        document.getElementById('selectedTeam').textContent = 'Выберите команду';
        document.getElementById('teamEagle').classList.remove('selected');
        document.getElementById('teamRevard').classList.remove('selected');
    },
    
    // Обновление UI орла/решки
    updateEagleUI() {
        document.getElementById('eaglePool').textContent = this.eagleLottery.eaglePool.toFixed(3);
        document.getElementById('revardPool').textContent = this.eagleLottery.revardPool.toFixed(3);
        document.getElementById('eaglePlayers').textContent = this.eagleLottery.players;
        document.getElementById('eagleTimer').textContent = this.eagleLottery.timer;
    }
};
