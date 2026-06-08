// Default Data Structure with Unified Transactions
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
        { id: 'debt-client', title: 'Reposição Cliente Digital', target: 3500, paid: 0 },
        { id: 'debt-mp', title: 'Empréstimo Mercado Pago', target: 800, paid: 0 },
        { id: 'debt-cc', title: 'Fatura Cartão de Crédito', target: 1200, paid: 0 }
    ],
    savingsGoals: [
        { id: 'goal-cnh', title: 'Habilitação B (Carro)', target: 2500, saved: 0 },
        { id: 'goal-apartment', title: 'Reserva p/ Depósito do Apê', target: 4000, saved: 0 }
    ],
    checklist: [
        { id: 1, text: 'Panela de arroz elétrica (para os meninos)', category: 'kids', price: 140, completed: false, txId: null },
        { id: 2, text: 'Ferro de passar roupas', category: 'room', price: 110, completed: false, txId: null },
        { id: 3, text: 'Lixeira para o quarto', category: 'room', price: 25, completed: false, txId: null },
        { id: 4, text: 'Cabides para roupas (10 unidades)', category: 'room', price: 30, completed: false, txId: null },
        { id: 5, text: 'Kit básico de produtos de limpeza', category: 'cleaning', price: 50, completed: false, txId: null },
        { id: 6, text: 'Escova de dentes e itens pessoais', category: 'personal', price: 35, completed: false, txId: null }
    ],
    transactions: [
        { id: 1, date: '2026-06-08', type: 'income', amount: 160, source: 'moto', category: 'faturamento', notes: 'Primeiro dia de rodagem' }
    ],
    kidsWeek: false,
    activeTab: 'tab-dashboard'
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
                transactions: appState.transactions || DEFAULT_DATA.transactions
            };
        } catch (e) {
            console.error("Erro ao carregar dados, reiniciando.", e);
            appState = JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
    } else {
        appState = JSON.parse(JSON.stringify(DEFAULT_DATA));
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

    // Also deduct savings goal assignments from Digital balance
    const totalSavedCNH = appState.savingsGoals.find(g => g.id === 'goal-cnh')?.saved || 0;
    const totalSavedApartment = appState.savingsGoals.find(g => g.id === 'goal-apartment')?.saved || 0;
    const totalInSavings = totalSavedCNH + totalSavedApartment;
    
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
    
    // Monthly current faturamento summary (Moto vs Digital)
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
        totalSavedCNH,
        totalSavedApartment,
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

// Determine current phase
function determinePhase(metrics) {
    const clientDebt = appState.debts.find(d => d.id === 'debt-client');
    const clientDebtCleared = clientDebt ? clientDebt.paid >= clientDebt.target : true;
    const debtsCleared = metrics.remainingDebts === 0;
    
    const cnhGoal = appState.savingsGoals.find(g => g.id === 'goal-cnh');
    const cnhSaved = cnhGoal ? cnhGoal.saved >= cnhGoal.target : false;
    
    const apartmentGoal = appState.savingsGoals.find(g => g.id === 'goal-apartment');
    const apartmentSaved = apartmentGoal ? apartmentGoal.saved >= apartmentGoal.target : false;
    
    if (!clientDebtCleared) {
        return { 
            phaseNum: 1, 
            title: 'Fase 1: Sobrevivência e Quitação', 
            description: 'Moto 99 cobre seu dia a dia (quarto, alimentação, moto). Faturamento Digital quita a dívida urgente de R$ 3.500,00 da cliente.',
            progressLabel: 'Reposição Cliente Digital',
            progressPercent: clientDebt ? (clientDebt.paid / clientDebt.target) * 100 : 100
        };
    } else if (clientDebtCleared && !debtsCleared) {
        return { 
            phaseNum: 1.5, 
            title: 'Fase 1.5: Ajuste de Passivos', 
            description: 'Dívida principal quitada! Agora, limpando as faturas de cartão de crédito e empréstimo Mercado Pago.',
            progressLabel: 'Quitação das Outras Dívidas',
            progressPercent: ((metrics.totalDebtsPaid - (clientDebt ? clientDebt.target : 0)) / (metrics.totalDebtsTarget - (clientDebt ? clientDebt.target : 0))) * 100
        };
    } else if (debtsCleared && !cnhSaved) {
        return { 
            phaseNum: 2, 
            title: 'Fase 2: Conforto e Habilitação de Carro', 
            description: 'Dívidas zeradas! O excedente do Digital agora é poupado para tirar a CNH B (carro) e comprar itens de conforto para os filhos.',
            progressLabel: 'Meta Poupança CNH B',
            progressPercent: cnhGoal ? (cnhGoal.saved / cnhGoal.target) * 100 : 100
        };
    } else {
        return { 
            phaseNum: 3, 
            title: 'Fase 3: Escala e Conquista do Apê', 
            description: 'Habilitação na mão. Foco no aluguel do carro e reserva de R$ 4.000,00 para depósito do apartamento definitivo. Escalando o Curso Online.',
            progressLabel: 'Meta Reserva Depósito Apê',
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
    
    // Update global widgets
    updateHeaderWidgets(metrics);
    
    switch (tabId) {
        case 'tab-dashboard':
            renderDashboard(metrics, phase);
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
function renderDashboard(metrics, phase) {
    // 1. Set balances widgets
    const balMotoEl = document.getElementById('dash-balance-moto');
    const balDigitalEl = document.getElementById('dash-balance-digital');
    
    balMotoEl.textContent = formatBRL(metrics.balanceMoto);
    balDigitalEl.textContent = formatBRL(metrics.availableDigitalBalance);
    
    // Color coding for balances
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
    
    // Timeline locks
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
    } else if (phase.phaseNum === 2) {
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
    
    // 3. Quick stats bars
    // Moto monthly goal progress
    const monthlyMotoGoal = metrics.totalSurvivalMonthly;
    const progressMotoPercent = Math.min(100, (metrics.monthlyMotoIncome / monthlyMotoGoal) * 100);
    document.getElementById('dash-moto-progress-bar').style.width = `${progressMotoPercent}%`;
    document.getElementById('dash-moto-progress-label').textContent = `${progressMotoPercent.toFixed(0)}% (${formatBRL(metrics.monthlyMotoIncome)} de ${formatBRL(monthlyMotoGoal)})`;
    
    // Debts progress bar
    const progressDebtPercent = metrics.totalDebtsTarget > 0 ? (metrics.totalDebtsPaid / metrics.totalDebtsTarget) * 100 : 100;
    document.getElementById('dash-debt-progress-bar').style.width = `${progressDebtPercent}%`;
    document.getElementById('dash-debt-progress-label').textContent = `${progressDebtPercent.toFixed(0)}% (${formatBRL(metrics.totalDebtsPaid)} de ${formatBRL(metrics.totalDebtsTarget)})`;
    
    // Savings progress bar (CNH + Apartment savings)
    const totalSavingsGoal = 2500 + 4000;
    const progressSavingsPercent = (metrics.totalInSavings / totalSavingsGoal) * 100;
    document.getElementById('dash-savings-progress-bar').style.width = `${progressSavingsPercent}%`;
    document.getElementById('dash-savings-progress-label').textContent = `${progressSavingsPercent.toFixed(0)}% (${formatBRL(metrics.totalInSavings)} de ${formatBRL(totalSavingsGoal)})`;
    
    // 4. Recent Transactions
    const tbody = document.getElementById('dash-recent-earnings-body');
    tbody.innerHTML = '';
    
    // Sort transactions reverse-chronologically, slice top 5
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
            goalDiv.className = 'debt-item'; // reuse box styling
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
                    <span style="font-size:0.75rem; color:var(--text-muted);">Sacar da Reserva Digital:</span>
                    <input type="number" placeholder="Valor p/ guardar" id="save-input-${goal.id}" style="width: 120px; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); background: var(--bg-main); color: white; outline: none; font-size: 0.85rem;">
                    <button class="btn-success" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="depositToSavings('${goal.id}')">Guardar</button>
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

// Global hook to pay off debts (deducts from digital balance or logs)
window.addPaymentToDebt = function(debtId) {
    const inputEl = document.getElementById(`pay-input-${debtId}`);
    const payVal = parseFloat(inputEl.value);
    
    if (isNaN(payVal) || payVal <= 0) return;
    
    const debt = appState.debts.find(d => d.id === debtId);
    if (debt) {
        // Log this debt payoff as an expense from Digital balance!
        const newTx = {
            id: Date.now(),
            date: new Date().toISOString().substring(0, 10),
            type: 'expense',
            amount: payVal,
            source: 'digital',
            category: 'divida',
            notes: `Amortização: ${debt.title}`
        };
        
        debt.paid = Math.min(debt.target, debt.paid + payVal);
        appState.transactions.push(newTx);
        
        saveState();
        renderActiveTab('tab-finances');
        inputEl.value = '';
        alert('Pagamento registrado na reserva digital e abatido da dívida!');
    }
};

// Global hook to assign money to savings goals (cnh / apartment)
window.depositToSavings = function(goalId) {
    const inputEl = document.getElementById(`save-input-${goalId}`);
    const saveVal = parseFloat(inputEl.value);
    
    if (isNaN(saveVal) || saveVal <= 0) return;
    
    // Check if we have enough digital balance available to lock away
    const metrics = calculateMetrics();
    if (metrics.availableDigitalBalance < saveVal) {
        alert(`Saldo Digital disponível insuficiente (${formatBRL(metrics.availableDigitalBalance)}). Deposite faturamento digital primeiro!`);
        return;
    }
    
    const goal = appState.savingsGoals.find(g => g.id === goalId);
    if (goal) {
        goal.saved = Math.min(goal.target, goal.saved + saveVal);
        
        // Save state
        saveState();
        renderActiveTab('tab-finances');
        inputEl.value = '';
        alert(`R$ ${saveVal.toFixed(2)} guardados com sucesso na meta: ${goal.title}!`);
    }
};

// Global hook to delete transaction
window.deleteTransaction = function(txId) {
    // Check if this transaction is linked to a checklist item purchase
    const linkedItem = appState.checklist.find(item => item.txId === txId);
    if (linkedItem) {
        linkedItem.completed = false;
        linkedItem.txId = null;
    }
    
    appState.transactions = appState.transactions.filter(tx => tx.id !== txId);
    saveState();
    renderActiveTab('tab-finances');
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

// --- RENDER SHOPPING CHECKLIST TAB ---
function renderChecklist(metrics) {
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
            categories[cat].el.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">Nenhum item pendente nesta categoria.</div>`;
        }
    });
}

// Global hooks for checklist interactions
window.toggleChecklistItem = function(id) {
    const item = appState.checklist.find(i => i.id === id);
    if (item) {
        item.completed = !item.completed;
        
        if (item.completed) {
            // Automatically log an expense from Digital balance!
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
            // Unchecked, remove transaction
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
    
    // Kids week toggle
    const kidsWeekToggle = document.getElementById('kids-week-toggle');
    if (kidsWeekToggle) {
        kidsWeekToggle.addEventListener('change', (e) => {
            appState.kidsWeek = e.target.checked;
            saveState();
            renderActiveTab('tab-schedule');
        });
    }
    
    // 💡 ADHD QUICK LOG FORM (Dashboard tab form submission)
    const quickLogForm = document.getElementById('quick-log-form');
    if (quickLogForm) {
        quickLogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const type = document.getElementById('quick-type').value; // 'income' or 'expense'
            const amount = parseFloat(document.getElementById('quick-amount').value);
            const source = document.getElementById('quick-source').value; // 'moto' or 'digital'
            const category = document.getElementById('quick-category').value;
            const notes = document.getElementById('quick-notes').value;
            const date = new Date().toISOString().substring(0, 10); // current local date
            
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
            
            // Clean inputs
            document.getElementById('quick-amount').value = '';
            document.getElementById('quick-notes').value = '';
            
            renderActiveTab('tab-dashboard');
            alert('Lançamento registrado com sucesso!');
        });
        
        // Dynamically adjust category dropdown based on type selection (income vs expense)
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
                    <option value="outros">Outras Despesas</option>
                `;
            }
        };
        
        quickTypeSelect.addEventListener('change', updateCategories);
        // Trigger initial update
        updateCategories();
    }
    
    // Add checklist item form submit
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
}

// Run app on DOM load
window.addEventListener('DOMContentLoaded', initApp);
