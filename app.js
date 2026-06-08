// Refactored Data Structure supporting Dynamic Debts, Savings, and Grocery list
const DEFAULT_DATA = {
    costs: {
        rent: 550,
        motoRental: 280,
        gasPerDay: 30,
        foodPerDay: 30,
        insurance: 80,
        datesWithWife: 200,
        gym: 90,
        workDaysPerWeek: 6
    },
    debts: [
        { id: 'debt-mp', title: 'Empréstimo Mercado Pago', target: 800, paid: 0 },
        { id: 'debt-cc', title: 'Fatura Cartão de Crédito', target: 1200, paid: 0 },
        { id: 'debt-client', title: 'Reposição Cliente Digital', target: 3500, paid: 0 }
    ],
    savingsGoals: [
        { id: 'goal-cnh', title: 'Habilitação B (Carro)', target: 2500, saved: 0 },
        { id: 'goal-reserve', title: 'Reserva de Emergência Apê', target: 6000, saved: 0 },
        { id: 'goal-apartment', title: 'Depósito Aluguel Apê', target: 4000, saved: 0 }
    ],
    checklist: [
        { id: 1, text: 'Panela de arroz elétrica (para os meninos)', category: 'kids', price: 140, completed: false, txId: null },
        { id: 2, text: 'Ferro de passar roupas', category: 'room', price: 110, completed: false, txId: null },
        { id: 3, text: 'Lixeira para o quarto', category: 'room', price: 25, completed: false, txId: null },
        { id: 4, text: 'Cabides para roupas (10 unidades)', category: 'room', price: 30, completed: false, txId: null },
        { id: 5, text: 'Kit básico de produtos de limpeza', category: 'cleaning', price: 50, completed: false, txId: null },
        { id: 6, text: 'Escova de dentes e itens pessoais', category: 'personal', price: 35, completed: false, txId: null }
    ],
    groceryList: [
        { id: 1, text: 'Pão de forma', completed: false },
        { id: 2, text: 'Arroz e Feijão', completed: false },
        { id: 3, text: 'Frango / Carne para os meninos', completed: false }
    ],
    transactions: [
        { id: 1, date: '2026-06-08', type: 'income', amount: 160, source: 'moto', category: 'faturamento', notes: 'Primeiro dia de rodagem' }
    ],
    kidsWeek: false,
    activeTab: 'tab-dashboard',
    estimatedMonthlyDigital: 1500
};

let appState = {};

// Load State from LocalStorage
function loadState() {
    const saved = localStorage.getItem('recomeco_dashboard_state');
    if (saved) {
        try {
            appState = JSON.parse(saved);
            // Dynamic merge to prevent data loss on schema upgrades
            appState = {
                ...DEFAULT_DATA,
                ...appState,
                costs: { ...DEFAULT_DATA.costs, ...appState.costs },
                debts: appState.debts || DEFAULT_DATA.debts,
                savingsGoals: appState.savingsGoals || DEFAULT_DATA.savingsGoals,
                checklist: appState.checklist || DEFAULT_DATA.checklist,
                groceryList: appState.groceryList || DEFAULT_DATA.groceryList,
                transactions: appState.transactions || DEFAULT_DATA.transactions,
                estimatedMonthlyDigital: appState.estimatedMonthlyDigital !== undefined ? appState.estimatedMonthlyDigital : DEFAULT_DATA.estimatedMonthlyDigital
            };
        } catch (e) {
            console.error("Erro ao carregar dados, reiniciando.", e);
            appState = JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
    } else {
        appState = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    
    // Auto-calculate if this week is kids week on load
    autoCalculateKidsWeek();
}

// Auto-calculate kids week starting from base Friday 2026-06-12
function autoCalculateKidsWeek() {
    const baseFriday = new Date('2026-06-12T19:00:00');
    const today = new Date();
    
    // Find the Friday of the current week (Mon-Sun)
    const day = today.getDay();
    const diffToFriday = 5 - day;
    const currentFriday = new Date(today);
    currentFriday.setDate(today.getDate() + diffToFriday);
    currentFriday.setHours(19, 0, 0, 0);
    
    const timeDiff = currentFriday.getTime() - baseFriday.getTime();
    const diffDays = Math.round(timeDiff / (1000 * 3600 * 24));
    
    // Alternate every 14 days
    if (diffDays % 14 === 0) {
        appState.kidsWeek = true;
    } else {
        appState.kidsWeek = false;
    }
}

// Save State to LocalStorage
function saveState() {
    localStorage.setItem('recomeco_dashboard_state', JSON.stringify(appState));
}

// Format Currency to BRL
function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Calculate Financial Metrics
function calculateMetrics() {
    const { rent, motoRental, gasPerDay, foodPerDay, insurance, datesWithWife, gym, workDaysPerWeek } = appState.costs;
    
    // Monthly projections
    const weeksPerMonth = 4.33;
    const monthlyMotoRental = motoRental * weeksPerMonth;
    const monthlyGas = gasPerDay * (workDaysPerWeek * weeksPerMonth);
    const monthlyFood = foodPerDay * 30;
    
    const totalSurvivalMonthly = rent + monthlyMotoRental + monthlyGas + monthlyFood + insurance + datesWithWife + gym;
    const totalSurvivalWeekly = totalSurvivalMonthly / weeksPerMonth;
    const totalActiveDaysPerMonth = workDaysPerWeek * weeksPerMonth;
    const dailyTargetMoto = totalSurvivalMonthly / totalActiveDaysPerMonth;
    
    // Calculate ledger-based balances (Moto vs Digital)
    let balanceMoto = 0;
    let balanceDigital = 0;
    
    appState.transactions.forEach(tx => {
        const val = parseFloat(tx.amount);
        if (tx.source === 'moto') {
            if (tx.type === 'income') balanceMoto += val;
            else if (tx.type === 'expense') balanceMoto -= val;
        } else if (tx.source === 'digital') {
            if (tx.type === 'income') balanceDigital += val;
            else if (tx.type === 'expense') balanceDigital -= val;
        }
    });

    // Deduct savings goal assignments from Digital balance
    const totalSavedCNH = appState.savingsGoals.find(g => g.id === 'goal-cnh')?.saved || 0;
    const totalSavedReserve = appState.savingsGoals.find(g => g.id === 'goal-reserve')?.saved || 0;
    const totalSavedApartment = appState.savingsGoals.find(g => g.id === 'goal-apartment')?.saved || 0;
    
    // Any custom goals added dynamically
    const dynamicGoalsSaved = appState.savingsGoals
        .filter(g => !['goal-cnh', 'goal-reserve', 'goal-apartment'].includes(g.id))
        .reduce((sum, g) => sum + g.saved, 0);
        
    const totalInSavings = totalSavedCNH + totalSavedReserve + totalSavedApartment + dynamicGoalsSaved;
    
    // Available digital balance is digital ledger minus protected savings
    const availableDigitalBalance = balanceDigital - totalInSavings;
    
    // Debts status
    const totalDebtsTarget = appState.debts.reduce((sum, item) => sum + item.target, 0);
    const totalDebtsPaid = appState.debts.reduce((sum, item) => sum + item.paid, 0);
    const remainingDebts = totalDebtsTarget - totalDebtsPaid;
    
    // Checklist progress
    const totalChecklist = appState.checklist.reduce((sum, item) => sum + item.price, 0);
    const spentChecklist = appState.checklist.filter(item => item.completed).reduce((sum, item) => sum + item.price, 0);
    const remainingChecklist = totalChecklist - spentChecklist;
    
    // Monthly faturamento summary (Moto vs Digital)
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const monthlyMotoIncome = appState.transactions
        .filter(tx => tx.date.startsWith(currentMonthStr) && tx.source === 'moto' && tx.type === 'income')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
    const monthlyDigitalIncome = appState.transactions
        .filter(tx => tx.date.startsWith(currentMonthStr) && tx.source === 'digital' && tx.type === 'income')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
    return {
        totalSurvivalMonthly,
        totalSurvivalWeekly,
        dailyTargetMoto,
        balanceMoto,
        balanceDigital,
        availableDigitalBalance,
        totalInSavings,
        totalDebtsTarget,
        totalDebtsPaid,
        remainingDebts,
        totalChecklist,
        spentChecklist,
        remainingChecklist,
        monthlyMotoIncome,
        monthlyDigitalIncome,
        activeDays: totalActiveDaysPerMonth
    };
}

// Calculate Rebirth Score, Time Projection & Category Expenses (Financial X-Ray)
function calculateGamification(metrics) {
    const totalTarget = metrics.totalDebtsTarget + appState.savingsGoals.reduce((sum, g) => sum + g.target, 0) + metrics.totalChecklist;
    const totalAccumulated = metrics.totalDebtsPaid + appState.savingsGoals.reduce((sum, g) => sum + g.saved, 0) + metrics.spentChecklist;
    
    const overallProgressPercent = totalTarget > 0 ? (totalAccumulated / totalTarget) * 100 : 100;
    
    let rank = "Guerreiro do Asfalto 🏍️";
    let motto = "Inicie a limpeza de passivos. Foque em pagar o Mercado Pago e acelerar na moto!";
    let rankClass = "rank-survivor";
    
    if (overallProgressPercent >= 20 && overallProgressPercent < 50) {
        rank = "Piloto Em Transição 🚗";
        motto = "Habilitação na mira! O digital está limpando seu passado e te tirando das duas rodas.";
        rankClass = "rank-transition";
    } else if (overallProgressPercent >= 50 && overallProgressPercent < 80) {
        rank = "Base Sólida 🏢";
        motto = "Contas limpas, CNH conquistada e Reserva de Emergência crescendo!";
        rankClass = "rank-solid";
    } else if (overallProgressPercent >= 80 && overallProgressPercent < 100) {
        rank = "Próximo ao Reencontro 🏠";
        motto = "Habilitação ok, reservas prontas. Falta muito pouco para o apê!";
        rankClass = "rank-home";
    } else if (overallProgressPercent === 100) {
        rank = "Líder do Lar 👑";
        motto = "Objetivo alcançado! Família reunida, patrimônio e paz garantidos.";
        rankClass = "rank-king";
    }
    
    const remainingToGoal = totalTarget - totalAccumulated;
    const monthlyDigital = appState.estimatedMonthlyDigital || 1500;
    const estimatedMotoSurplusMonthly = 200; 
    const totalMonthlyEarningPotential = monthlyDigital + estimatedMotoSurplusMonthly;
    const monthsRemaining = totalMonthlyEarningPotential > 0 ? (remainingToGoal / totalMonthlyEarningPotential) : 99;
    
    // Financial X-Ray logic (Expense breakdown for current month)
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const monthlyExpenses = appState.transactions
        .filter(tx => tx.date.startsWith(currentMonthStr) && tx.type === 'expense');
        
    const totalMonthlyOutflow = monthlyExpenses.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    
    // Group expenses by category
    const categoryTotals = {};
    monthlyExpenses.forEach(tx => {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + parseFloat(tx.amount);
    });
    
    // General TDAH-friendly tips based on highest costs
    let xrayTip = "Dica: Mantenha um lanche rápido na mochila para economizar até R$ 120/mês de alimentação na rua.";
    let highestCat = "";
    let maxCost = 0;
    
    Object.keys(categoryTotals).forEach(cat => {
        if (categoryTotals[cat] > maxCost) {
            maxCost = categoryTotals[cat];
            highestCat = cat;
        }
    });
    
    if (highestCat === 'gasolina') {
        xrayTip = "Dica: Planeje rotas de pico mais curtas. Menos rodagem à toa = mais gasolina economizada.";
    } else if (highestCat === 'alimentacao') {
        xrayTip = "Dica: Economize no almoço fazendo marmita no quarto. Alimentação na rua consome seu Saldo Moto rápido!";
    } else if (highestCat === 'lazer_esposa') {
        xrayTip = "Dica: Prefira encontros caseiros no quarto ou passeios gratuitos. Mantenha a verba de encontros sob controle.";
    } else if (highestCat === 'outros') {
        xrayTip = "Dica: Cuidado com pequenas compras diárias. No final do mês elas viram uma grande despesa.";
    }
    
    return {
        overallProgressPercent,
        rank,
        motto,
        rankClass,
        remainingToGoal,
        monthsRemaining,
        categoryTotals,
        totalMonthlyOutflow,
        xrayTip
    };
}

// Determine current active phase
function determinePhase(metrics) {
    const mpDebt = appState.debts.find(d => d.id === 'debt-mp');
    const mpDebtCleared = mpDebt ? mpDebt.paid >= mpDebt.target : true;
    
    const cnhGoal = appState.savingsGoals.find(g => g.id === 'goal-cnh');
    const cnhSaved = cnhGoal ? cnhGoal.saved >= cnhGoal.target : false;
    
    const ccDebt = appState.debts.find(d => d.id === 'debt-cc');
    const ccDebtCleared = ccDebt ? ccDebt.paid >= ccDebt.target : true;

    const reserveGoal = appState.savingsGoals.find(g => g.id === 'goal-reserve');
    const reserveSaved = reserveGoal ? reserveGoal.saved >= reserveGoal.target : false;
    
    const apartmentGoal = appState.savingsGoals.find(g => g.id === 'goal-apartment');
    const apartmentSaved = apartmentGoal ? apartmentGoal.saved >= apartmentGoal.target : false;
    
    if (!mpDebtCleared) {
        return { 
            phaseNum: 1, 
            title: 'Fase 1: Estabilização e Mercado Pago', 
            description: 'Foco em pagar a moto/quarto na rua e quitar a parcela do Mercado Pago. A cliente de R$ 3.5k é aportada aos poucos.',
            progressLabel: 'Quitação Mercado Pago',
            progressPercent: mpDebt ? (mpDebt.paid / mpDebt.target) * 100 : 100
        };
    } else if (mpDebtCleared && !cnhSaved) {
        return { 
            phaseNum: 2, 
            title: 'Fase 2: Mobilidade e CNH B', 
            description: 'Mercado Pago quitado! O excedente do Digital vai 100% para os R$ 2.500,00 da Habilitação B (carro - prioridade máxima).',
            progressLabel: 'Poupança CNH B',
            progressPercent: cnhGoal ? (cnhGoal.saved / cnhGoal.target) * 100 : 100
        };
    } else if (cnhSaved && !ccDebtCleared) {
        return {
            phaseNum: 2.5,
            title: 'Fase 2.5: Ajuste de Cartão de Crédito',
            description: 'CNH B garantida! Agora limpando a fatura do cartão de crédito para reaver crédito financeiro.',
            progressLabel: 'Quitação Cartão de Crédito',
            progressPercent: ccDebt ? (ccDebt.paid / ccDebt.target) * 100 : 100
        };
    } else if (ccDebtCleared && !reserveSaved) {
        return { 
            phaseNum: 3, 
            title: 'Fase 3: Reserva de Emergência do Apê', 
            description: 'Criando a reserva de segurança de R$ 6.000,00 para sustentar o apartamento por meses sem passar aperto.',
            progressLabel: 'Reserva de Emergência',
            progressPercent: reserveGoal ? (reserveGoal.saved / reserveGoal.target) * 100 : 100
        };
    } else {
        return { 
            phaseNum: 4, 
            title: 'Fase 4: Aluguel do Apê e Reencontro', 
            description: 'Sua reserva está pronta. Agora guardando o depósito de R$ 4.000,00 e garantindo a renda recorrente digital para alugar o apartamento.',
            progressLabel: 'Poupança Depósito Apê',
            progressPercent: apartmentGoal ? (apartmentGoal.saved / apartmentGoal.target) * 100 : 100
        };
    }
}

// DOM Setup & Navigation
function initApp() {
    loadState();
    
    // Bind navigation buttons
    document.querySelectorAll('.nav-item button').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Set up form submission handlers
    setupEventListeners();
    
    // Switch to active tab
    switchTab(appState.activeTab || 'tab-dashboard');
}

function switchTab(tabId) {
    appState.activeTab = tabId;
    saveState();
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const btn = item.querySelector('button');
        if (btn.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.tab-panel').forEach(panel => {
        if (panel.id === tabId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
    
    renderActiveTab(tabId);
}

function renderActiveTab(tabId) {
    const metrics = calculateMetrics();
    const phase = determinePhase(metrics);
    const gami = calculateGamification(metrics);
    
    updateHeaderWidgets(metrics);
    
    switch (tabId) {
        case 'tab-dashboard':
            renderDashboard(metrics, phase, gami);
            break;
        case 'tab-finances':
            renderFinances(metrics);
            break;
        case 'tab-schedule':
            renderSchedule();
            break;
        case 'tab-checklist':
            renderChecklist(metrics);
            break;
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function updateHeaderWidgets(metrics) {
    document.getElementById('header-moto-target').textContent = formatBRL(metrics.dailyTargetMoto);
    
    const kidsBadge = document.getElementById('header-kids-badge');
    if (appState.kidsWeek) {
        kidsBadge.style.display = 'flex';
        kidsBadge.innerHTML = `<i data-lucide="users"></i> Com os Filhos`;
    } else {
        kidsBadge.style.display = 'none';
    }
}

// --- RENDER VISÃO GERAL (DASHBOARD) ---
function renderDashboard(metrics, phase, gami) {
    // 1. Set balances widgets
    const balMotoEl = document.getElementById('dash-balance-moto');
    const balDigitalEl = document.getElementById('dash-balance-digital');
    
    balMotoEl.textContent = formatBRL(metrics.balanceMoto);
    balDigitalEl.textContent = formatBRL(metrics.availableDigitalBalance);
    
    if (metrics.balanceMoto < 0) {
        balMotoEl.style.color = 'var(--accent-danger)';
    } else if (metrics.balanceMoto > 100) {
        balMotoEl.style.color = 'var(--accent-success)';
    } else {
        balMotoEl.style.color = 'var(--text-primary)';
    }
    
    // 2. Phase Card Progress
    document.getElementById('dash-current-phase-title').textContent = phase.title;
    document.getElementById('dash-current-phase-desc').textContent = phase.description;
    document.getElementById('dash-phase-bar-label').textContent = `${phase.progressLabel} (${phase.progressPercent.toFixed(0)}%)`;
    document.getElementById('dash-phase-progress-bar').style.width = `${Math.min(100, phase.progressPercent)}%`;
    
    // 3. Time projection outputs
    document.getElementById('dash-proj-months').textContent = gami.monthsRemaining > 0 ? `${gami.monthsRemaining.toFixed(1)} meses` : 'Pronto!';
    document.getElementById('dash-proj-remaining').textContent = formatBRL(gami.remainingToGoal);
    document.getElementById('input-proj-digital').value = appState.estimatedMonthlyDigital;
    
    // 4. Overall Rebirth gamification score
    document.getElementById('dash-rebirth-rank').textContent = gami.rank;
    document.getElementById('dash-rebirth-motto').textContent = gami.motto;
    document.getElementById('dash-rebirth-bar-label').textContent = `${gami.overallProgressPercent.toFixed(0)}% Concluído`;
    document.getElementById('dash-rebirth-progress-bar').style.width = `${Math.min(100, gami.overallProgressPercent)}%`;
    
    const rankWidget = document.getElementById('dash-rebirth-card');
    rankWidget.className = `glass-card ${gami.rankClass}`;
    
    // 5. Timeline active phases
    const p1 = document.getElementById('phase-1-item');
    const p2 = document.getElementById('phase-2-item');
    const p3 = document.getElementById('phase-3-item');
    
    p1.className = 'phase-item';
    p2.className = 'phase-item';
    p3.className = 'phase-item';
    
    if (phase.phaseNum < 2) {
        p1.classList.add('active');
        document.getElementById('phase-1-status').textContent = 'Ativo';
        document.getElementById('phase-2-status').textContent = 'Bloqueado';
        document.getElementById('phase-3-status').textContent = 'Bloqueado';
    } else if (phase.phaseNum >= 2 && phase.phaseNum < 3) {
        p1.classList.add('completed');
        p2.classList.add('active');
        document.getElementById('phase-1-status').textContent = 'Concluído';
        document.getElementById('phase-2-status').textContent = 'Ativo';
        document.getElementById('phase-3-status').textContent = 'Bloqueado';
    } else {
        p1.classList.add('completed');
        p2.classList.add('completed');
        p3.classList.add('active');
        document.getElementById('phase-1-status').textContent = 'Concluído';
        document.getElementById('phase-2-status').textContent = 'Concluído';
        document.getElementById('phase-3-status').textContent = 'Ativo';
    }
    
    // 6. Quick stats bars
    const monthlyMotoGoal = metrics.totalSurvivalMonthly;
    const progressMotoPercent = Math.min(100, (metrics.monthlyMotoIncome / monthlyMotoGoal) * 100);
    document.getElementById('dash-moto-progress-bar').style.width = `${progressMotoPercent}%`;
    document.getElementById('dash-moto-progress-label').textContent = `${progressMotoPercent.toFixed(0)}% (${formatBRL(metrics.monthlyMotoIncome)} de ${formatBRL(monthlyMotoGoal)})`;
    
    const progressDebtPercent = metrics.totalDebtsTarget > 0 ? (metrics.totalDebtsPaid / metrics.totalDebtsTarget) * 100 : 100;
    document.getElementById('dash-debt-progress-bar').style.width = `${progressDebtPercent}%`;
    document.getElementById('dash-debt-progress-label').textContent = `${progressDebtPercent.toFixed(0)}% (${formatBRL(metrics.totalDebtsPaid)} de ${formatBRL(metrics.totalDebtsTarget)})`;
    
    const totalSavingsGoal = appState.savingsGoals.reduce((sum, g) => sum + g.target, 0);
    const progressSavingsPercent = totalSavingsGoal > 0 ? (metrics.totalInSavings / totalSavingsGoal) * 100 : 100;
    document.getElementById('dash-savings-progress-bar').style.width = `${progressSavingsPercent}%`;
    document.getElementById('dash-savings-progress-label').textContent = `${progressSavingsPercent.toFixed(0)}% (${formatBRL(metrics.totalInSavings)} de ${formatBRL(totalSavingsGoal)})`;
    
    // 7. Render financial X-Ray (Raio-X de Gastos)
    renderXrayWidget(gami);
    
    // 8. Render Next Kids Week Info
    renderKidsScheduleWidget();
    
    // 9. Recent Transactions
    const tbody = document.getElementById('dash-recent-earnings-body');
    tbody.innerHTML = '';
    
    const recentTx = [...appState.transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
        .slice(0, 5);
        
    if (recentTx.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhum lançamento registrado.</td></tr>`;
    } else {
        recentTx.forEach(tx => {
            const tr = document.createElement('tr');
            const sign = tx.type === 'income' ? '+' : '-';
            const colorClass = tx.type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)';
            
            tr.innerHTML = `
                <td>${tx.date.split('-').reverse().join('/')}</td>
                <td><span class="badge-source ${tx.source}">${tx.source === 'moto' ? 'Moto 99' : 'Digital'}</span></td>
                <td style="font-weight: 600; color: ${colorClass}">${sign} ${formatBRL(tx.amount)}</td>
                <td style="color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${tx.notes || ''}">
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block;">${tx.category}</span>
                    ${tx.notes || '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Render dynamic X-Ray content
function renderXrayWidget(gami) {
    const listContainer = document.getElementById('dash-xray-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    const categoryLabels = {
        gasolina: 'Gasolina (Moto)',
        alimentacao: 'Alimentação na Rua',
        aluguel_moto: 'Aluguel da Moto',
        aluguel_quarto: 'Aluguel do Quarto',
        higiene_limpeza: 'Higiene & Limpeza',
        seguro: 'Seguro Acidentes',
        academia: 'Academia',
        lazer_esposa: 'Encontros Esposa',
        divida: 'Amortização de Dívidas',
        quarto_item: 'Compras do Quarto',
        outros: 'Outros Gastos'
    };
    
    const sortedCats = Object.keys(gami.categoryTotals)
        .sort((a, b) => gami.categoryTotals[b] - gami.categoryTotals[a]);
        
    if (sortedCats.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">Nenhum gasto lançado este mês. Lance saídas no Lançamento Rápido!</div>`;
    } else {
        sortedCats.forEach(cat => {
            const cost = gami.categoryTotals[cat];
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.borderBottom = '1px solid var(--border-glass)';
            div.style.paddingBottom = '0.35rem';
            div.style.fontSize = '0.85rem';
            div.innerHTML = `
                <span style="color: var(--text-secondary);">${categoryLabels[cat] || cat}</span>
                <strong style="color: var(--accent-danger);">${formatBRL(cost)}</strong>
            `;
            listContainer.appendChild(div);
        });
    }
    
    document.getElementById('dash-xray-outflow').textContent = formatBRL(gami.totalMonthlyOutflow);
    document.getElementById('dash-xray-tip').textContent = gami.xrayTip;
}

// Render Next Kids Weekend Info & Prep Alert
function renderKidsScheduleWidget() {
    const baseFriday = new Date('2026-06-12T19:00:00');
    const today = new Date();
    
    const listEl = document.getElementById('dash-kids-dates-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    // Find next 3 weekends
    let count = 0;
    let checkDate = new Date(baseFriday);
    
    // If today is past the current weekend, start checking from the next one
    while (count < 3) {
        // Create end date (Sunday at 18:00)
        let endSunday = new Date(checkDate);
        endSunday.setDate(checkDate.getDate() + 2);
        endSunday.setHours(18, 0, 0, 0);
        
        if (endSunday.getTime() >= today.getTime()) {
            const dateStrStart = checkDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const dateStrEnd = endSunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            const isCurrent = appState.kidsWeek && count === 0 && (today.getTime() >= checkDate.getTime() - 4 * 86400000); // Mon-Sun of kids week
            
            const li = document.createElement('div');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.fontSize = '0.85rem';
            li.style.padding = '0.4rem 0.5rem';
            li.style.borderRadius = 'var(--radius-sm)';
            
            if (isCurrent) {
                li.style.background = 'hsla(205, 90%, 55%, 0.15)';
                li.style.borderLeft = '3px solid var(--accent-primary)';
                li.innerHTML = `
                    <strong style="color: var(--accent-primary);">Fim de Semana (${dateStrStart} - ${dateStrEnd})</strong>
                    <span style="font-weight:700; color: var(--accent-primary); text-transform:uppercase; font-size:0.7rem;">Esta Semana!</span>
                `;
            } else {
                li.innerHTML = `
                    <span style="color: var(--text-secondary);">Fim de Semana (${dateStrStart} - ${dateStrEnd})</span>
                    <span style="color: var(--text-muted);">Confirmado</span>
                `;
            }
            
            listEl.appendChild(li);
            count++;
        }
        
        // Add 14 days
        checkDate.setDate(checkDate.getDate() + 14);
    }
}

// --- RENDER FINANCES TAB ---
function renderFinances(metrics) {
    // Fill Config Fields
    document.getElementById('input-rent').value = appState.costs.rent;
    document.getElementById('input-moto-rental').value = appState.costs.motoRental;
    document.getElementById('input-gas').value = appState.costs.gasPerDay;
    document.getElementById('input-food').value = appState.costs.foodPerDay;
    document.getElementById('input-insurance').value = appState.costs.insurance;
    document.getElementById('input-dates').value = appState.costs.datesWithWife;
    document.getElementById('input-gym').value = appState.costs.gym;
    document.getElementById('input-workdays').value = appState.costs.workDaysPerWeek;
    
    // Fill Calc breakdown
    const weeksPerMonth = 4.33;
    document.getElementById('calc-monthly-rent').textContent = formatBRL(appState.costs.rent);
    document.getElementById('calc-monthly-moto').textContent = formatBRL(appState.costs.motoRental * weeksPerMonth);
    document.getElementById('calc-monthly-gas').textContent = formatBRL(appState.costs.gasPerDay * appState.costs.workDaysPerWeek * weeksPerMonth);
    document.getElementById('calc-monthly-food').textContent = formatBRL(appState.costs.foodPerDay * 30);
    document.getElementById('calc-monthly-insurance').textContent = formatBRL(appState.costs.insurance);
    document.getElementById('calc-monthly-gym').textContent = formatBRL(appState.costs.gym);
    document.getElementById('calc-monthly-dates').textContent = formatBRL(appState.costs.datesWithWife);
    
    document.getElementById('calc-total-survival').textContent = formatBRL(metrics.totalSurvivalMonthly);
    document.getElementById('calc-daily-target').textContent = formatBRL(metrics.dailyTargetMoto);
    
    // Render Debt List
    const debtList = document.getElementById('finance-debts-list');
    debtList.innerHTML = '';
    
    appState.debts.forEach(debt => {
        const percent = Math.min(100, (debt.paid / debt.target) * 100);
        const debtDiv = document.createElement('div');
        debtDiv.className = 'debt-item';
        debtDiv.innerHTML = `
            <div class="debt-meta">
                <span class="debt-title">${debt.title}</span>
                <span class="debt-amount">${formatBRL(debt.target - debt.paid)} restando</span>
            </div>
            <div class="goal-bar-container">
                <div class="goal-bar-fill danger" style="width: ${percent}%"></div>
            </div>
            <div class="goal-bar-info" style="margin-bottom: 0.75rem;">
                <span>Pago: ${formatBRL(debt.paid)}</span>
                <span>Total: ${formatBRL(debt.target)} (${percent.toFixed(0)}%)</span>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <input type="number" placeholder="Valor p/ somar" class="input-pay-debt" id="pay-input-${debt.id}" style="width: 120px; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); background: var(--bg-main); color: white; outline: none; font-size: 0.85rem;">
                <button class="btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="addPaymentToDebt('${debt.id}')">Quitar</button>
                <button class="btn-icon" style="width: 28px; height: 28px; background:transparent; border-color:transparent;" onclick="deleteDebtItem('${debt.id}')">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--accent-danger)"></i>
                </button>
            </div>
        `;
        debtList.appendChild(debtDiv);
    });
    
    // Render Savings Goals
    const savingsContainer = document.getElementById('finance-savings-list');
    if (savingsContainer) {
        savingsContainer.innerHTML = '';
        appState.savingsGoals.forEach(goal => {
            const percent = Math.min(100, (goal.saved / goal.target) * 100);
            const goalDiv = document.createElement('div');
            goalDiv.className = 'debt-item';
            goalDiv.style.borderColor = 'hsla(205, 90%, 55%, 0.3)';
            goalDiv.innerHTML = `
                <div class="debt-meta">
                    <span class="debt-title" style="color: var(--accent-primary);"><i data-lucide="shield-check" style="width:16px; vertical-align:middle; margin-right:4px;"></i>${goal.title}</span>
                    <span class="debt-amount" style="color: var(--accent-primary);">${formatBRL(goal.target - goal.saved)} restando</span>
                </div>
                <div class="goal-bar-container">
                    <div class="goal-bar-fill primary" style="width: ${percent}%"></div>
                </div>
                <div class="goal-bar-info" style="margin-bottom: 0.75rem;">
                    <span>Protegido: ${formatBRL(goal.saved)}</span>
                    <span>Total: ${formatBRL(goal.target)} (${percent.toFixed(0)}%)</span>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items:center;">
                    <span style="font-size:0.75rem; color:var(--text-muted);">Deixar guardado:</span>
                    <input type="number" placeholder="Valor" id="save-input-${goal.id}" style="width: 90px; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); background: var(--bg-main); color: white; outline: none; font-size: 0.85rem;">
                    <button class="btn-success" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="depositToSavings('${goal.id}')">Guardar</button>
                    <button class="btn-icon" style="width: 28px; height: 28px; background:transparent; border-color:transparent;" onclick="deleteSavingsItem('${goal.id}')">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--accent-danger)"></i>
                    </button>
                </div>
            `;
            savingsContainer.appendChild(goalDiv);
        });
    }
    
    // Render full transactions list in Finances log
    const logTbody = document.getElementById('finances-earnings-log-body');
    logTbody.innerHTML = '';
    
    const sortedTx = [...appState.transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        
    if (sortedTx.length === 0) {
        logTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum lançamento registrado.</td></tr>`;
    } else {
        sortedTx.forEach(tx => {
            const tr = document.createElement('tr');
            const sign = tx.type === 'income' ? '+' : '-';
            const colorClass = tx.type === 'income' ? 'var(--accent-success)' : 'var(--accent-danger)';
            
            tr.innerHTML = `
                <td>${tx.date.split('-').reverse().join('/')}</td>
                <td><span class="badge-source ${tx.source}">${tx.source === 'moto' ? 'Moto 99' : 'Digital'}</span></td>
                <td style="font-weight: 600; color: ${colorClass}">${sign} ${formatBRL(tx.amount)}</td>
                <td>
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block;">${tx.category}</span>
                    ${tx.notes || '-'}
                </td>
                <td>
                    <button class="btn-icon" style="width: 28px; height: 28px;" onclick="deleteTransaction(${tx.id})">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--accent-danger)"></i>
                    </button>
                </td>
            `;
            logTbody.appendChild(tr);
        });
    }
}

// Dynamic Add / Delete Debts and Savings Targets
window.deleteDebtItem = function(id) {
    if (confirm('Tem certeza que deseja excluir esta dívida?')) {
        appState.debts = appState.debts.filter(d => d.id !== id);
        saveState();
        renderActiveTab('tab-finances');
    }
};

window.deleteSavingsItem = function(id) {
    if (confirm('Tem certeza que deseja excluir esta meta de poupança?')) {
        appState.savingsGoals = appState.savingsGoals.filter(g => g.id !== id);
        saveState();
        renderActiveTab('tab-finances');
    }
};

// --- RENDER ROUTINE/SCHEDULE TAB ---
function renderSchedule() {
    const kidsWeekToggle = document.getElementById('kids-week-toggle');
    kidsWeekToggle.checked = appState.kidsWeek;
    
    const scheduleGrid = document.getElementById('schedule-grid-container');
    scheduleGrid.innerHTML = '';
    
    const days = [
        { key: 'seg', name: 'Segunda', label: 'Rotina Semanal' },
        { key: 'ter', name: 'Terça', label: 'Rotina Semanal' },
        { key: 'qua', name: 'Quarta', label: 'Rotina Semanal' },
        { key: 'qui', name: 'Quinta', label: 'Rotina Semanal' },
        { key: 'sex', name: 'Sexta', label: 'Chegada dos Filhos' },
        { key: 'sab', name: 'Sábado', label: 'Dia Inteiro' },
        { key: 'dom', name: 'Domingo', label: 'Dia Inteiro' }
    ];
    
    days.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = `schedule-day`;
        
        const isWeekend = ['sex', 'sab', 'dom'].includes(day.key);
        const hasKidsThisDay = isWeekend && appState.kidsWeek;
        
        if (hasKidsThisDay) {
            dayDiv.classList.add('kids-active');
        }
        
        dayDiv.innerHTML = `
            <div class="day-header">
                <div class="day-name">${day.name}</div>
                <div class="day-label">${hasKidsThisDay ? 'Com os Filhos' : day.label}</div>
            </div>
            <div class="day-blocks" id="blocks-${day.key}"></div>
        `;
        
        scheduleGrid.appendChild(dayDiv);
        
        const blocksContainer = document.getElementById(`blocks-${day.key}`);
        const blocks = getBlocksForDay(day.key, hasKidsThisDay);
        
        blocks.forEach(block => {
            const blockDiv = document.createElement('div');
            blockDiv.className = `schedule-block ${block.type}`;
            blockDiv.innerHTML = `
                <span class="schedule-block-time">${block.time}</span>
                <span>${block.text}</span>
            `;
            blocksContainer.appendChild(blockDiv);
        });
    });
}

function getBlocksForDay(dayKey, hasKids) {
    if (['seg', 'ter', 'qua', 'qui'].includes(dayKey)) {
        return [
            { time: '06:30 - 09:30', type: 'moto', text: 'Moto 99 (Pico Manhã)' },
            { time: '10:00 - 12:00', type: 'digital', text: 'Foco Clientes Digital' },
            { time: '12:00 - 13:00', type: 'rest', text: 'Almoço & Descanso' },
            { time: '13:00 - 16:00', type: 'digital', text: 'Curso Online / Webinários' },
            { time: '16:30 - 19:30', type: 'moto', text: 'Moto 99 (Pico Noite)' },
            { time: '20:00+', type: 'rest', text: 'Jantar, Academia e Lazer' }
        ];
    }
    
    if (dayKey === 'sex') {
        if (hasKids) {
            return [
                { time: '06:30 - 09:30', type: 'moto', text: 'Moto 99 (Pico Manhã)' },
                { time: '10:00 - 15:30', type: 'digital', text: 'Foco Digital / Ajustes' },
                { time: '16:00 - 18:00', type: 'rest', text: 'Supermercado e Limpeza' },
                { time: '19:00+', type: 'kids', text: 'Buscar os Filhos (Foco Neles)' }
            ];
        } else {
            return [
                { time: '06:30 - 09:30', type: 'moto', text: 'Moto 99 (Pico Manhã)' },
                { time: '10:00 - 12:00', type: 'digital', text: 'Foco Clientes Digital' },
                { time: '12:00 - 13:00', type: 'rest', text: 'Almoço' },
                { time: '13:00 - 16:00', type: 'digital', text: 'Curso Online' },
                { time: '16:30 - 19:30', type: 'moto', text: 'Moto 99 (Pico Noite)' },
                { time: '20:00+', type: 'rest', text: 'Encontro com a Esposa na rua' }
            ];
        }
    }
    
    if (dayKey === 'sab') {
        if (hasKids) {
            return [
                { time: 'Manhã', type: 'kids', text: 'Café da manhã / Conectar' },
                { time: 'Tarde', type: 'kids', text: 'Almoço caseiro e lazer com eles' },
                { time: 'Noite', type: 'kids', text: 'Pizza / Filme e conversa' }
            ];
        } else {
            return [
                { time: '08:00 - 12:00', type: 'moto', text: 'Moto 99 (Extra Faturamento)' },
                { time: '13:00 - 17:00', type: 'digital', text: 'Estudos e Gravação de Webinários' },
                { time: '18:00+', type: 'rest', text: 'Tempo livre / Organização' }
            ];
        }
    }
    
    if (dayKey === 'dom') {
        if (hasKids) {
            return [
                { time: 'Manhã', type: 'kids', text: 'Almoço caprichado (Panela arroz)' },
                { time: 'Tarde', type: 'kids', text: 'Passeio básico com os meninos' },
                { time: '19:00', type: 'kids', text: 'Levar os filhos de volta' }
            ];
        } else {
            return [
                { time: 'Manhã', type: 'rest', text: 'Desconexão / Dormir um pouco mais' },
                { time: 'Tarde', type: 'rest', text: 'Encontro / Almoço com a Esposa' },
                { time: 'Noite', type: 'digital', text: 'Planejamento da Próxima Semana' }
            ];
        }
    }
    
    return [];
}

// --- RENDER SHOPPING & GROCERY CHECKLISTS ---
function renderChecklist(metrics) {
    // Column 1: Room setup
    document.getElementById('checklist-total-value').textContent = formatBRL(metrics.totalChecklist);
    document.getElementById('checklist-spent-value').textContent = formatBRL(metrics.spentChecklist);
    document.getElementById('checklist-remaining-value').textContent = formatBRL(metrics.remainingChecklist);
    
    const categories = {
        kids: { title: 'Com os Filhos (Conectar/Receber)', el: document.getElementById('checklist-kids-list') },
        room: { title: 'Básico do Quarto (Montagem)', el: document.getElementById('checklist-room-list') },
        cleaning: { title: 'Produtos de Limpeza & Lavanderia', el: document.getElementById('checklist-cleaning-list') },
        personal: { title: 'Uso Pessoal & Higiene', el: document.getElementById('checklist-personal-list') }
    };
    
    Object.keys(categories).forEach(cat => {
        categories[cat].el.innerHTML = '';
    });
    
    appState.checklist.forEach(item => {
        const catObj = categories[item.category];
        if (!catObj) return;
        
        const itemDiv = document.createElement('div');
        itemDiv.className = `checklist-item ${item.completed ? 'completed' : ''}`;
        itemDiv.innerHTML = `
            <div class="checklist-left">
                <label class="checklist-checkbox-wrapper">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleChecklistItem(${item.id})">
                    <span class="checkmark"></span>
                </label>
                <span class="checklist-text">${item.text}</span>
            </div>
            <div class="checklist-right">
                <span class="checklist-price-tag">${formatBRL(item.price)}</span>
                <button class="btn-icon" style="width: 28px; height: 28px;" onclick="deleteChecklistItem(${item.id})">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--accent-danger)"></i>
                </button>
            </div>
        `;
        
        catObj.el.appendChild(itemDiv);
    });
    
    Object.keys(categories).forEach(cat => {
        if (categories[cat].el.children.length === 0) {
            categories[cat].el.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">Nenhum item pendente.</div>`;
        }
    });
    
    // Column 2: Grocery quick list
    renderGroceryListWidget();
}

// Render dynamic grocery list
function renderGroceryListWidget() {
    const listEl = document.getElementById('grocery-items-container');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    appState.groceryList.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `checklist-item ${item.completed ? 'completed' : ''}`;
        itemDiv.innerHTML = `
            <div class="checklist-left">
                <label class="checklist-checkbox-wrapper">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleGroceryItem(${item.id})">
                    <span class="checkmark"></span>
                </label>
                <span class="checklist-text">${item.text}</span>
            </div>
            <div class="checklist-right">
                <button class="btn-icon" style="width: 28px; height: 28px;" onclick="deleteGroceryItem(${item.id})">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--accent-danger)"></i>
                </button>
            </div>
        `;
        listEl.appendChild(itemDiv);
    });
    
    if (appState.groceryList.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1.5rem;">Lista vazia. Adicione itens para a sua ida ao mercado!</div>`;
    }
}

// Global hooks for grocery checklist
window.toggleGroceryItem = function(id) {
    const item = appState.groceryList.find(i => i.id === id);
    if (item) {
        item.completed = !item.completed;
        saveState();
        renderGroceryListWidget();
    }
};

window.deleteGroceryItem = function(id) {
    appState.groceryList = appState.groceryList.filter(i => i.id !== id);
    saveState();
    renderGroceryListWidget();
};

window.clearCheckedGroceries = function() {
    appState.groceryList = appState.groceryList.filter(i => !i.completed);
    saveState();
    renderGroceryListWidget();
};

// Global hooks for room checklist
window.toggleChecklistItem = function(id) {
    const item = appState.checklist.find(i => i.id === id);
    if (item) {
        item.completed = !item.completed;
        
        if (item.completed) {
            const txId = Date.now();
            const newTx = {
                id: txId,
                date: new Date().toISOString().substring(0, 10),
                type: 'expense',
                amount: item.price,
                source: 'digital',
                category: 'quarto_item',
                notes: `Compra: ${item.text}`
            };
            item.txId = txId;
            appState.transactions.push(newTx);
        } else {
            if (item.txId) {
                appState.transactions = appState.transactions.filter(t => t.id !== item.txId);
                item.txId = null;
            }
        }
        
        saveState();
        renderActiveTab('tab-checklist');
    }
};

window.deleteChecklistItem = function(id) {
    const item = appState.checklist.find(i => i.id === id);
    if (item && item.txId) {
        appState.transactions = appState.transactions.filter(t => t.id !== item.txId);
    }
    appState.checklist = appState.checklist.filter(i => i.id !== id);
    saveState();
    renderActiveTab('tab-checklist');
};

// Backup and Restore utilities
window.exportBackup = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `foco_total_backup_${new Date().toISOString().substring(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};

window.triggerImport = function() {
    document.getElementById('backup-file-input').click();
};

window.importBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedState = JSON.parse(e.target.result);
            if (importedState.costs && importedState.transactions) {
                appState = importedState;
                saveState();
                alert('Backup restaurado com sucesso! O painel será atualizado.');
                location.reload();
            } else {
                alert('Arquivo de backup inválido.');
            }
        } catch (err) {
            alert('Erro ao processar o backup.');
        }
    };
    reader.readAsText(file);
};

// --- CONTROLLERS & FORM HANDLERS ---
function setupEventListeners() {
    // Config costs form submit
    const costsForm = document.getElementById('finance-costs-form');
    if (costsForm) {
        costsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            appState.costs.rent = parseFloat(document.getElementById('input-rent').value) || 0;
            appState.costs.motoRental = parseFloat(document.getElementById('input-moto-rental').value) || 0;
            appState.costs.gasPerDay = parseFloat(document.getElementById('input-gas').value) || 0;
            appState.costs.foodPerDay = parseFloat(document.getElementById('input-food').value) || 0;
            appState.costs.insurance = parseFloat(document.getElementById('input-insurance').value) || 0;
            appState.costs.datesWithWife = parseFloat(document.getElementById('input-dates').value) || 0;
            appState.costs.gym = parseFloat(document.getElementById('input-gym').value) || 0;
            appState.costs.workDaysPerWeek = parseInt(document.getElementById('input-workdays').value) || 6;
            
            saveState();
            renderActiveTab('tab-finances');
            alert('Custos atualizados com sucesso!');
        });
    }
    
    // Dynamic Goals Creators (CNH / Apartment / Custom Goals)
    const addGoalForm = document.getElementById('add-goal-form');
    if (addGoalForm) {
        addGoalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('goal-title').value;
            const target = parseFloat(document.getElementById('goal-target').value);
            
            if (!title.trim() || isNaN(target) || target <= 0) return;
            
            const newGoal = {
                id: 'goal-' + Date.now(),
                title,
                target,
                saved: 0
            };
            
            appState.savingsGoals.push(newGoal);
            saveState();
            
            document.getElementById('goal-title').value = '';
            document.getElementById('goal-target').value = '';
            
            renderActiveTab('tab-finances');
            alert('Nova meta de poupança adicionada!');
        });
    }
    
    // Dynamic Debts Creators (Mercado Pago / CC / Client / Custom Debts)
    const addDebtForm = document.getElementById('add-debt-form');
    if (addDebtForm) {
        addDebtForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('debt-title').value;
            const target = parseFloat(document.getElementById('debt-target').value);
            
            if (!title.trim() || isNaN(target) || target <= 0) return;
            
            const newDebt = {
                id: 'debt-' + Date.now(),
                title,
                target,
                paid: 0
            };
            
            appState.debts.push(newDebt);
            saveState();
            
            document.getElementById('debt-title').value = '';
            document.getElementById('debt-target').value = '';
            
            renderActiveTab('tab-finances');
            alert('Nova dívida/passivo registrado!');
        });
    }
    
    // Time projection slider/input change listener
    const digitalEstimatorInput = document.getElementById('input-proj-digital');
    if (digitalEstimatorInput) {
        digitalEstimatorInput.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0) {
                appState.estimatedMonthlyDigital = val;
                saveState();
                renderActiveTab('tab-dashboard');
            }
        });
    }
    
    // Kids week toggle
    const kidsWeekToggle = document.getElementById('kids-week-toggle');
    if (kidsWeekToggle) {
        kidsWeekToggle.addEventListener('change', (e) => {
            appState.kidsWeek = e.target.checked;
            saveState();
            renderActiveTab('tab-schedule');
        });
    }
    
    // ADHD QUICK LOG FORM
    const quickLogForm = document.getElementById('quick-log-form');
    if (quickLogForm) {
        quickLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const type = document.getElementById('quick-type').value;
            const amount = parseFloat(document.getElementById('quick-amount').value);
            const source = document.getElementById('quick-source').value;
            const category = document.getElementById('quick-category').value;
            const notes = document.getElementById('quick-notes').value;
            const date = new Date().toISOString().substring(0, 10);
            
            if (isNaN(amount) || amount <= 0) return;
            
            const newTx = {
                id: Date.now(),
                date,
                type,
                amount,
                source,
                category,
                notes
            };
            
            appState.transactions.push(newTx);
            saveState();
            
            document.getElementById('quick-amount').value = '';
            document.getElementById('quick-notes').value = '';
            
            renderActiveTab('tab-dashboard');
            alert('Lançamento registrado com sucesso!');
        });
        
        const quickTypeSelect = document.getElementById('quick-type');
        const quickCatSelect = document.getElementById('quick-category');
        
        const updateCategories = () => {
            const isIncome = quickTypeSelect.value === 'income';
            quickCatSelect.innerHTML = '';
            
            if (isIncome) {
                quickCatSelect.innerHTML = `
                    <option value="faturamento" selected>Faturamento (Entrada Geral)</option>
                    <option value="reembolso">Reembolso</option>
                    <option value="outros">Outras Entradas</option>
                `;
            } else {
                quickCatSelect.innerHTML = `
                    <option value="gasolina" selected>Gasolina (Moto)</option>
                    <option value="alimentacao">Alimentação (Rua/Dia)</option>
                    <option value="aluguel_moto">Aluguel da Moto (Semanal)</option>
                    <option value="aluguel_quarto">Aluguel do Quarto</option>
                    <option value="higiene_limpeza">Higiene & Limpeza</option>
                    <option value="seguro">Seguro Acidentes</option>
                    <option value="academia">Academia</option>
                    <option value="lazer_esposa">Lazer / Esposa</option>
                    <option value="divida">Dívida / Passivo</option>
                    <option value="quarto_item">Compras do Quarto</option>
                    <option value="mercado_filhos">Mercado dos Filhos</option>
                    <option value="transporte_filhos">Transporte dos Filhos</option>
                    <option value="presentes">Presentes Filhos</option>
                    <option value="outros">Outras Despesas</option>
                `;
            }
        };
        
        quickTypeSelect.addEventListener('change', updateCategories);
        updateCategories();
    }
    
    // Add checklist item form
    const checklistForm = document.getElementById('checklist-add-form');
    if (checklistForm) {
        checklistForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const text = document.getElementById('check-text').value;
            const price = parseFloat(document.getElementById('check-price').value) || 0;
            const category = document.getElementById('check-category').value;
            
            if (!text.trim()) return;
            
            const newItem = {
                id: Date.now(),
                text,
                price,
                category,
                completed: false,
                txId: null
            };
            
            appState.checklist.push(newItem);
            saveState();
            
            document.getElementById('check-text').value = '';
            document.getElementById('check-price').value = '';
            
            renderActiveTab('tab-checklist');
        });
    }
    
    // Add grocery item form
    const addGroceryForm = document.getElementById('add-grocery-form');
    if (addGroceryForm) {
        addGroceryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = document.getElementById('grocery-text').value;
            
            if (!text.trim()) return;
            
            const newItem = {
                id: Date.now(),
                text,
                completed: false
            };
            
            appState.groceryList.push(newItem);
            saveState();
            
            document.getElementById('grocery-text').value = '';
            renderGroceryListWidget();
        });
    }
}

// Register Service Worker for offline PWA installation
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado:', reg.scope))
            .catch(err => console.log('Erro ao registrar Service Worker:', err));
    });
}

// Run app on DOM load
window.addEventListener('DOMContentLoaded', initApp);
