const STORAGE_KEYS = {
    expenses: 'studentExpenseTrackerExpenses',
    budget: 'studentExpenseTrackerBudget',
    savingsGoal: 'studentExpenseTrackerSavingsGoal',
    theme: 'studentExpenseTrackerTheme',
};

const defaultExpenses = [
    { id: 1, name: 'Mess Food', amount: 150, category: 'Food', date: '2025-09-01' },
    { id: 2, name: 'Bus Ticket', amount: 50, category: 'Travel', date: '2025-09-02' },
    { id: 3, name: 'Notebook', amount: 300, category: 'Education', date: '2025-09-03' },
    { id: 4, name: 'Pencil & Stationery', amount: 200, category: 'Education', date: '2025-09-04' },
    { id: 5, name: 'Shopping', amount: 1200, category: 'Shopping', date: '2025-09-05' },
    { id: 6, name: 'Movie', amount: 600, category: 'Entertainment', date: '2025-09-06' },
    { id: 7, name: 'Snacks', amount: 250, category: 'Food', date: '2025-09-07' },
];

const state = {
    expenses: [],
    filteredExpenses: [],
    budget: 20000,
    savingsGoal: 50000,
    theme: 'light',
    chart: null,
    monthlyChart: null,
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
});

const categoryColors = {
    Food: '#4f7cff',
    Travel: '#7e67ec',
    Education: '#2ec6a3',
    Shopping: '#f6b84c',
    Entertainment: '#ff6a7d',
    Bills: '#7ec8ff',
    Others: '#a4a7b7',
};

document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    loadFromLocalStorage();
    bindEvents();
    applyTheme();
    updateBudget();
    updateSavings();
    updateDashboard();
    renderExpenses();
}

function bindEvents() {
    document.getElementById('expenseForm').addEventListener('submit', addExpense);

    document.getElementById('applyFilterBtn').addEventListener('click', filterExpenses);
    document.getElementById('clearFilterBtn').addEventListener('click', clearFilters);
    document.getElementById('searchInput').addEventListener('input', filterExpenses);
    document.getElementById('filterCategory').addEventListener('change', filterExpenses);
    document.getElementById('filterFromDate').addEventListener('change', filterExpenses);
    document.getElementById('filterToDate').addEventListener('change', filterExpenses);

    document.getElementById('saveBudgetBtn').addEventListener('click', updateBudget);
    document.getElementById('budgetInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') updateBudget();
    });

    document.getElementById('saveSavingsGoalBtn').addEventListener('click', updateSavings);
    document.getElementById('savingsGoalInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') updateSavings();
    });

    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllExpenses);

    document.getElementById('themeToggle').addEventListener('click', toggleDarkMode);

    document.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', () => {
            const target = document.getElementById(link.dataset.target);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function loadFromLocalStorage() {
    const savedExpenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses) || 'null');
    const savedBudget = Number(localStorage.getItem(STORAGE_KEYS.budget));
    const savedSavingsGoal = Number(localStorage.getItem(STORAGE_KEYS.savingsGoal));
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);

    if (Array.isArray(savedExpenses) && savedExpenses.length > 0) {
        state.expenses = savedExpenses.map((item) => ({
            ...item,
            amount: Number(item.amount),
        }));
    } else {
        state.expenses = structuredClone(defaultExpenses);
    }

    state.budget = Number.isFinite(savedBudget) && savedBudget > 0 ? savedBudget : 20000;
    state.savingsGoal = Number.isFinite(savedSavingsGoal) && savedSavingsGoal > 0 ? savedSavingsGoal : 50000;
    state.theme = savedTheme === 'dark' ? 'dark' : 'light';
    state.filteredExpenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(state.expenses));
    localStorage.setItem(STORAGE_KEYS.budget, String(state.budget));
    localStorage.setItem(STORAGE_KEYS.savingsGoal, String(state.savingsGoal));
    localStorage.setItem(STORAGE_KEYS.theme, state.theme);
}

function addExpense(event) {
    event.preventDefault();

    const form = event.target;
    const name = document.getElementById('expenseName').value.trim();
    const amount = Number(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;

    clearFormErrors();

    let valid = true;

    if (!name) {
        document.getElementById('expenseNameError').textContent = 'Expense name cannot be empty.';
        valid = false;
    }

    if (!amount || amount <= 0) {
        document.getElementById('expenseAmountError').textContent = 'Amount must be greater than 0.';
        valid = false;
    }

    if (!category) {
        document.getElementById('expenseCategoryError').textContent = 'Please select a category.';
        valid = false;
    }

    if (!date) {
        document.getElementById('expenseDateError').textContent = 'Please select a date.';
        valid = false;
    }

    if (!valid) {
        showToast('Please fix the highlighted fields before adding the expense.', 'error');
        return;
    }

    const newExpense = {
        id: Date.now(),
        name,
        amount,
        category,
        date,
    };

    state.expenses.push(newExpense);
    state.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveToLocalStorage();
    filterExpenses();
    updateDashboard();
    renderExpenses();
    updateBudget();
    updateSavings();
    form.reset();
    showToast('Expense added successfully.', 'success');
}

function deleteExpense(id) {
    const confirmed = window.confirm('Are you sure you want to delete this expense?');
    if (!confirmed) return;

    state.expenses = state.expenses.filter((expense) => expense.id !== id);
    saveToLocalStorage();
    filterExpenses();
    updateDashboard();
    renderExpenses();
    updateBudget();
    updateSavings();
    showToast('Expense removed successfully.', 'success');
}

function clearFormErrors() {
    ['expenseNameError', 'expenseAmountError', 'expenseCategoryError', 'expenseDateError'].forEach((id) => {
        document.getElementById(id).textContent = '';
    });
}

function filterExpenses() {
    const searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
    const category = document.getElementById('filterCategory').value;
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterToDate').value;

    state.filteredExpenses = state.expenses.filter((expense) => {
        const searchMatch = !searchInput || expense.name.toLowerCase().includes(searchInput);
        const categoryMatch = category === 'all' || expense.category === category;
        const fromMatch = !fromDate || new Date(expense.date) >= new Date(fromDate);
        const toMatch = !toDate || new Date(expense.date) <= new Date(toDate);
        return searchMatch && categoryMatch && fromMatch && toMatch;
    });

    state.filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderExpenses();
    updateDashboard();
    updateChart();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCategory').value = 'all';
    document.getElementById('filterFromDate').value = '';
    document.getElementById('filterToDate').value = '';
    state.filteredExpenses = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    renderExpenses();
    updateDashboard();
    updateChart();
    showToast('Filters cleared.', 'success');
}

function renderExpenses() {
    const tbody = document.getElementById('expenseTableBody');
    const emptyState = document.getElementById('emptyState');

    if (!state.filteredExpenses.length) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = state.filteredExpenses
        .map((expense, index) => {
            const category = expense.category || 'Others';
            return `
        <tr>
          <td>${index + 1}</td>
          <td>${formatDate(expense.date)}</td>
          <td>${escapeHtml(expense.name)}</td>
          <td><span class="category-badge" style="background: ${hexToRgba(categoryColors[category] || '#a4a7b7', 0.12)}; color: ${categoryColors[category] || '#a4a7b7'};">${category}</span></td>
          <td class="amount-cell">${formatCurrency(expense.amount)}</td>
          <td>
            <button class="delete-btn" type="button" data-id="${expense.id}" aria-label="Delete ${escapeHtml(expense.name)}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
        })
        .join('');

    tbody.querySelectorAll('.delete-btn').forEach((button) => {
        button.addEventListener('click', () => deleteExpense(Number(button.dataset.id)));
    });
}

function updateDashboard() {
    const totals = calculateTotals(state.filteredExpenses);

    document.getElementById('totalExpensesValue').textContent = formatCurrency(totals.totalExpenses);
    document.getElementById('monthlyExpensesValue').textContent = formatCurrency(totals.currentMonthExpenses);
    document.getElementById('transactionCountValue').textContent = totals.transactionCount;
    document.getElementById('remainingBalanceValue').textContent = formatCurrency(state.budget - totals.totalExpenses);

    const monthlySpending = sumByMonth(state.filteredExpenses, new Date().getFullYear(), new Date().getMonth());
    document.getElementById('currentMonthSpending').textContent = formatCurrency(monthlySpending);

    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const averageDailySpending = monthlySpending / Math.min(currentDay, daysInMonth || 1);
    document.getElementById('averageDailySpending').textContent = formatCurrency(averageDailySpending);

    const highestCategory = getHighestCategory(state.filteredExpenses);
    document.getElementById('highestCategory').textContent = highestCategory || '--';
    document.getElementById('monthlyTransactions').textContent = totals.transactionCount;

    updateChart();
    updateMonthlyBarChart();
}

function calculateTotals(expenseList) {
    const totalExpenses = expenseList.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const now = new Date();
    const currentMonthExpenses = expenseList.reduce((sum, expense) => {
        const date = new Date(expense.date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() ? sum + Number(expense.amount) : sum;
    }, 0);

    return {
        totalExpenses,
        currentMonthExpenses,
        transactionCount: expenseList.length,
    };
}

function updateChart() {
    const ctx = document.getElementById('expenseChart');
    const categoryTotals = {};

    for (const category of ['Food', 'Travel', 'Education', 'Shopping', 'Entertainment', 'Bills', 'Others']) {
        categoryTotals[category] = 0;
    }

    state.filteredExpenses.forEach((expense) => {
        const category = expense.category || 'Others';
        categoryTotals[category] = (categoryTotals[category] || 0) + Number(expense.amount);
    });

    const labels = Object.keys(categoryTotals).filter((category) => categoryTotals[category] > 0);
    const data = labels.map((category) => categoryTotals[category]);
    const colors = labels.map((category) => categoryColors[category] || '#a4a7b7');

    if (!state.chart) {
        state.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['No data'],
                datasets: [{
                    data: data.length ? data : [1],
                    backgroundColor: colors.length ? colors : ['#dfe7f5'],
                    borderWidth: 0,
                    hoverOffset: 8,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8,
                            color: getComputedStyle(document.body).getPropertyValue('--text').trim(),
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${formatCurrency(context.parsed)}`,
                        },
                    },
                },
            },
        });
    } else {
        state.chart.data.labels = labels.length ? labels : ['No data'];
        state.chart.data.datasets[0].data = data.length ? data : [1];
        state.chart.data.datasets[0].backgroundColor = colors.length ? colors : ['#dfe7f5'];
        state.chart.update();
    }
}

function updateMonthlyBarChart() {
    const ctx = document.getElementById('monthlyChart');
    const now = new Date();
    const labels = [];
    const totals = [];

    for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('en-US', { month: 'short' });
        labels.push(monthName);
        totals.push(sumByMonth(state.filteredExpenses, date.getFullYear(), date.getMonth()));
    }

    if (!state.monthlyChart) {
        state.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Monthly Spending',
                    data: totals,
                    backgroundColor: ['#4f7cff', '#7e67ec', '#2ec6a3', '#ffb84d', '#ff6a7d', '#7ec8ff'],
                    borderRadius: 8,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `₹${value}`,
                        },
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
        });
    } else {
        state.monthlyChart.data.labels = labels;
        state.monthlyChart.data.datasets[0].data = totals;
        state.monthlyChart.update();
    }
}

function updateBudget() {
    const input = document.getElementById('budgetInput');
    const value = Number(input.value);

    if (Number.isFinite(value) && value >= 0) {
        state.budget = value;
    }

    const totalSpent = state.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = state.budget - totalSpent;
    const percentUsed = state.budget > 0 ? (totalSpent / state.budget) * 100 : 0;
    const progressValue = Math.min(percentUsed, 100);

    document.getElementById('plannerTotalSpent').textContent = formatCurrency(totalSpent);
    document.getElementById('plannerRemaining').textContent = formatCurrency(remaining);
    document.getElementById('plannerPercentage').textContent = `${Math.round(percentUsed)}%`;
    document.getElementById('progressHint').textContent = `${Math.round(percentUsed)}%`;
    document.getElementById('budgetProgressBar').style.width = `${progressValue}%`;

    const warningBox = document.getElementById('budgetWarning');
    warningBox.classList.add('hidden');

    if (percentUsed > 100) {
        warningBox.textContent = `Overspending warning: You have exceeded your budget by ${formatCurrency(Math.abs(remaining))}.`;
        warningBox.classList.remove('hidden');
    } else if (percentUsed > 80) {
        warningBox.textContent = 'Warning: You have used more than 80% of your monthly budget.';
        warningBox.classList.remove('hidden');
    }

    input.value = state.budget;
    saveToLocalStorage();
    updateDashboard();
}

function updateSavings() {
    const input = document.getElementById('savingsGoalInput');
    const goalValue = Number(input.value);

    if (Number.isFinite(goalValue) && goalValue >= 0) {
        state.savingsGoal = goalValue;
    }

    const totalSpent = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const remainingBalance = state.budget - totalSpent;
    const suggestedSavings = Math.max(0, remainingBalance * 0.5);
    const savingsPercentage = state.budget > 0 ? (Math.max(0, remainingBalance) / state.budget) * 100 : 0;

    const currentSaved = Math.max(0, remainingBalance);
    const goalRemaining = Math.max(0, state.savingsGoal - currentSaved);
    const goalProgress = state.savingsGoal > 0 ? (currentSaved / state.savingsGoal) * 100 : 0;

    document.getElementById('savingsBudgetValue').textContent = formatCurrency(state.budget);
    document.getElementById('savingsExpenseValue').textContent = formatCurrency(totalSpent);
    document.getElementById('savingsRemainingValue').textContent = formatCurrency(remainingBalance);
    document.getElementById('suggestedSavingsValue').textContent = formatCurrency(suggestedSavings);
    document.getElementById('savingsPercentageValue').textContent = `${Math.round(savingsPercentage)}%`;
    document.getElementById('goalAmountValue').textContent = formatCurrency(state.savingsGoal);
    document.getElementById('currentSavedValue').textContent = formatCurrency(currentSaved);
    document.getElementById('remainingGoalValue').textContent = formatCurrency(goalRemaining);
    document.getElementById('goalProgressText').textContent = `${Math.min(Math.round(goalProgress), 100)}%`;
    document.getElementById('goalProgressBar').style.width = `${Math.min(goalProgress, 100)}%`;

    input.value = state.savingsGoal;
    saveToLocalStorage();
}

function formatCurrency(value) {
    const amount = Number(value) || 0;
    return currencyFormatter.format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sumByMonth(expenseList, year, month) {
    return expenseList.reduce((sum, expense) => {
        const date = new Date(expense.date);
        return date.getFullYear() === year && date.getMonth() === month ? sum + Number(expense.amount) : sum;
    }, 0);
}

function getHighestCategory(expenseList) {
    const totals = {};

    expenseList.forEach((expense) => {
        const name = expense.category || 'Others';
        totals[name] = (totals[name] || 0) + Number(expense.amount);
    });

    const bestCategory = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    return bestCategory ? bestCategory[0] : null;
}

function exportCSV() {
    if (!state.expenses.length) {
        showToast('There are no expenses to export.', 'error');
        return;
    }

    const rows = [
        ['Date', 'Expense Name', 'Category', 'Amount'],
        ...state.expenses.map((expense) => [expense.date, expense.name, expense.category, expense.amount]),
    ];

    const csvContent = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'student-expense-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Expense data exported as CSV.', 'success');
}

function clearAllExpenses() {
    const confirmed = window.confirm('This will permanently delete all expenses. Continue?');
    if (!confirmed) return;

    state.expenses = [];
    state.filteredExpenses = [];
    saveToLocalStorage();
    renderExpenses();
    updateDashboard();
    updateBudget();
    updateSavings();
    showToast('All expenses cleared.', 'success');
}

function toggleDarkMode() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveToLocalStorage();
}

function applyTheme() {
    document.body.classList.toggle('dark-mode', state.theme === 'dark');

    const icon = document.querySelector('#themeToggle i');
    if (!icon) return;

    icon.className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2600);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function hexToRgba(hex, alpha) {
    const normalized = hex.replace('#', '');
    const bigint = Number.parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
