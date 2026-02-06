// Frontend Logic for FinanceFlow
// Determine API URL based on environment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:3000/api' : '/api';

// --- Global Variables ---
let expenseChart = null;
let userCategories = [];
let isRedirectingToLogin = false; 
let editingId = null;

// --- Auth Check ---
const token = localStorage.getItem('sb_token');
if (!token) {
    window.location.href = 'login.html';
}

// --- Auth Fetch Helper ---
async function authFetch(url, options = {}) {
    if (isRedirectingToLogin) return null;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    try {
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            if (!isRedirectingToLogin) {
                isRedirectingToLogin = true;
                alert('Session expired. Please login again.');
                localStorage.removeItem('sb_token');
                window.location.href = 'login.html';
            }
            return null;
        }
        return res;
    } catch (error) { throw error; }
}

// --- Helpers ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
};

const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-navy' : 'bg-secondary';
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-y-10 opacity-0 ${bgClass}`;
    toast.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 text-white"></i><span class="font-medium text-sm">${message}</span>`;
    document.body.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: toast });
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Date Filter Logic ---
function getFilterDates() {
    const input = document.getElementById('monthFilter');
    let date;
    
    if (input && input.value) {
        date = new Date(input.value + '-01'); // YYYY-MM-01
    } else {
        date = new Date();
    }

    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Offset handling for local ISO string
    const offset = date.getTimezoneOffset() * 60000;
    const startStr = (new Date(startOfMonth - offset)).toISOString().slice(0, 10);
    const endStr = (new Date(endOfMonth - offset)).toISOString().slice(0, 10);

    return { startStr, endStr };
}

// --- Data Fetching ---

async function fetchCategories() {
    try {
        const res = await authFetch(`${API_URL}/categories`);
        if (!res) return;
        const responseData = await res.json();
        userCategories = responseData.data || [];
        renderCategoryOptions('expense');
    } catch (error) { console.warn('Categories API Error:', error); }
}

async function fetchStats() {
    try {
        const { startStr } = getFilterDates();
        // Mode Dashboard requires Start Date for Month calculations
        const res = await authFetch(`${API_URL}/stats?startDate=${startStr}&mode=dashboard`);
        if (!res) return;
        if (!res.ok) throw new Error('Failed to fetch stats');
        
        const data = await res.json();
        const stats = data.data || data; 
        renderStats(stats);
    } catch (error) {
        console.warn('Stats API Error:', error);
        renderStats({ balance: 0, income: 0, expense: 0 });
    }
}

async function fetchTransactions() {
    const tbody = document.getElementById('transaction-list-body');
    try {
        const { startStr, endStr } = getFilterDates();
        
        const res = await authFetch(`${API_URL}/transactions?start=${startStr}&end=${endStr}`);
        if (!res) return;
        const responseData = await res.json();
        const transactions = responseData.data || (Array.isArray(responseData) ? responseData : []);

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-slate-400 text-xs">No transactions found.</td></tr>`;
            updateChartFromData([]); 
            return;
        }
        renderTransactions(transactions);
        updateChartFromData(transactions); 
    } catch (error) { 
        console.warn('Transactions Error', error);
        tbody.innerHTML = `<tr><td colspan="2" class="text-center py-6 text-red-400 text-xs">Error loading data.</td></tr>`; 
    }
}

// --- Render Logic ---

function renderStats(stats) {
    document.getElementById('stat-balance').textContent = formatCurrency(stats.balance || 0);
    document.getElementById('stat-income').textContent = formatCurrency(stats.income || 0);
    document.getElementById('stat-expense').textContent = formatCurrency(stats.expense || 0);
}

function renderTransactions(transactions) {
    const tbody = document.getElementById('transaction-list-body');
    tbody.innerHTML = ''; 
    const recentTransactions = transactions.slice(0, 10);

    recentTransactions.forEach(txn => {
        const type = txn.type || (txn.amount < 0 ? 'expense' : 'income');
        const amount = Number(txn.amount);
        const displayAmount = Math.abs(amount);
        const dateStr = txn.date || new Date().toISOString();
        
        let categoryName = txn.category || txn.category_name;
        if (!categoryName && txn.category_id && userCategories.length > 0) {
            const foundCat = userCategories.find(c => c.id === txn.category_id);
            if (foundCat) categoryName = foundCat.name;
        }
        categoryName = categoryName || 'Uncategorized';
        const transactionTitle = txn.note && txn.note.trim() !== '' ? txn.note : categoryName;
        
        let categoryIcon = txn.icon || txn.category_icon || 'circle';
        
        let iconClass = txn.category_color || 'bg-slate-100 text-slate-500';
        if (iconClass === 'bg-slate-100 text-slate-500') {
             // Fallback logic
             const catLower = categoryName.toLowerCase();
             if (catLower.includes('food')) { categoryIcon = 'shopping-cart'; iconClass = 'bg-orange-100 text-orange-600'; }
            
        }

        const isExpense = type === 'expense' || amount < 0;
        const amountClass = isExpense ? 'text-secondary' : 'text-primary';
        const sign = isExpense ? '-' : '+';
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group';
        const txnData = JSON.stringify(txn).replace(/'/g, "&apos;");

        tr.innerHTML = `
            <td class="py-3 pl-2">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center transition-all ${iconClass}">
                        <i data-lucide="${categoryIcon}" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <p class="font-medium text-slate-800 text-sm truncate max-w-[120px]">${transactionTitle}</p>
                        <p class="text-xs text-slate-400">${formatDate(dateStr)}</p>
                    </div>
                </div>
            </td>
            <td class="py-3 pr-2 text-right">
                <div class="flex flex-col items-end">
                    <span class="font-semibold text-sm ${amountClass}">${sign}${formatCurrency(displayAmount)}</span>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-all pt-1">
                        <button onclick='openEditModal(${txnData})' class="text-slate-300 hover:text-primary">
                            <i data-lucide="edit-3" class="w-3 h-3"></i>
                        </button>
                        <button onclick="deleteTransaction('${txn.id}')" class="text-slate-300 hover:text-red-500">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- Chart Logic ---
function initChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    const gradientIncome = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradientIncome.addColorStop(0, 'rgba(46, 196, 182, 0.2)');
    gradientIncome.addColorStop(1, 'rgba(46, 196, 182, 0)');
    const gradientExpense = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradientExpense.addColorStop(0, 'rgba(255, 159, 28, 0.2)');
    gradientExpense.addColorStop(1, 'rgba(255, 159, 28, 0)');

    expenseChart = new Chart(ctx, {
        type: 'line', 
        data: { labels: [], datasets: [
            { label: 'Income', data: [], borderColor: '#2EC4B6', backgroundColor: gradientIncome, borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 },
            { label: 'Expense', data: [], borderColor: '#FF9F1C', backgroundColor: gradientExpense, borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: '#0f172a' } },
            scales: {
                y: { beginAtZero: true, suggestedMax: 100000, grid: { color: '#f1f5f9', borderDash: [5, 5] }, 
                     ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0, 
                     callback: (v) => v >= 1000000 ? 'Rp '+(v/1000000).toFixed(1)+'jt' : v >= 1000 ? 'Rp '+(v/1000)+'rb' : 'Rp '+v }},
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

function updateChartFromData(transactions) {
    if (!expenseChart) return;
    const sortedTxns = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const dateMap = {};
    sortedTxns.forEach(txn => {
        const d = new Date(txn.date);
        const dateKey = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`; 
        if (!dateMap[dateKey]) dateMap[dateKey] = { income: 0, expense: 0 };
        const amt = parseFloat(txn.amount);
        const type = txn.type || (amt < 0 ? 'expense' : 'income');
        if (type === 'income' || (type !== 'expense' && amt > 0)) dateMap[dateKey].income += Math.abs(amt);
        else dateMap[dateKey].expense += Math.abs(amt);
    });
    const labels = Object.keys(dateMap);
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = labels.map(l => dateMap[l].income);
    expenseChart.data.datasets[1].data = labels.map(l => dateMap[l].expense);
    expenseChart.update();
}

// --- Form Handling ---
const addTransactionForm = document.getElementById('addTransactionForm');
function renderCategoryOptions(type) {
    const select = addTransactionForm.querySelector('select[name="category"]');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Select...</option>';
    const typeId = type === 'income' ? 1 : 2;
    const filtered = userCategories.filter(cat => cat.transaction_type_id === typeId);
    filtered.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name; option.textContent = cat.name;
        select.appendChild(option);
    });
}

if (addTransactionForm) {
    const typeRadios = addTransactionForm.querySelectorAll('input[name="type"]');
    typeRadios.forEach(radio => radio.addEventListener('change', (e) => renderCategoryOptions(e.target.value)));

    addTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addTransactionForm);
        const type = formData.get('type');
        let amount = parseFloat(formData.get('amount'));
        if (type === 'expense') amount = -Math.abs(amount); else amount = Math.abs(amount);

        const payload = { amount, date: formData.get('date'), category_name: formData.get('category'), note: formData.get('note'), type };
        const btn = addTransactionForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Processing...'; btn.disabled = true;

        try {
            const url = editingId ? `${API_URL}/transactions/${editingId}` : `${API_URL}/transactions`;
            const method = editingId ? 'PUT' : 'POST';
            const res = await authFetch(url, { method, body: JSON.stringify(payload) });
            if (!res || !res.ok) throw new Error('Failed');
            
            showToast(editingId ? 'Updated!' : 'Saved!', 'success');
            window.closeTransactionModal();
            fetchTransactions(); fetchStats();
        } catch (e) { showToast('Error processing', 'error'); } 
        finally { btn.textContent = originalText; btn.disabled = false; }
    });
}

// --- CRUD Global ---
window.openEditModal = function(txn) {
    editingId = txn.id;
    const form = document.getElementById('addTransactionForm');
    if (userCategories.length === 0) fetchCategories();
    document.querySelector('#transactionModal h3').textContent = 'Edit Transaction';
    form.querySelector('button[type="submit"]').textContent = 'Update Transaction';
    const type = txn.type || (txn.amount < 0 ? 'expense' : 'income');
    form.querySelector(`input[name="type"][value="${type}"]`).checked = true;
    renderCategoryOptions(type);
    form.amount.value = Math.abs(txn.amount);
    form.date.value = txn.date;
    form.category.value = txn.category || txn.category_name;
    form.note.value = txn.note || '';
    document.getElementById('transactionModal').classList.remove('hidden');
};
window.openTransactionModal = function() {
    editingId = null;
    const form = document.getElementById('addTransactionForm');
    if (userCategories.length === 0) fetchCategories();
    document.querySelector('#transactionModal h3').textContent = 'Add New Transaction';
    form.querySelector('button[type="submit"]').textContent = 'Save Transaction';
    form.reset();
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    form.date.value = (new Date(now - offset)).toISOString().slice(0, 10);
    renderCategoryOptions('expense');
    document.getElementById('transactionModal').classList.remove('hidden');
};
window.closeTransactionModal = function() {
    editingId = null;
    document.getElementById('addTransactionForm').reset();
    document.getElementById('transactionModal').classList.add('hidden');
}
window.deleteTransaction = async function(id) {
    if (!confirm('Delete this?')) return;
    try {
        const res = await authFetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error('Failed');
        showToast('Deleted!', 'success');
        fetchTransactions(); fetchStats();
    } catch (e) { showToast('Error deleting', 'error'); }
};
window.logout = function() {
    localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user');
    window.location.href = 'login.html';
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Setup Filter Default
    const filterInput = document.getElementById('monthFilter');
    if (filterInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        filterInput.value = `${year}-${month}`;
        filterInput.addEventListener('change', () => {
            fetchStats();
            fetchTransactions();
        });
    }

    if (localStorage.getItem('sb_token')) {
        initChart(); fetchStats(); fetchTransactions(); fetchCategories(); 
        const userStr = localStorage.getItem('sb_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                const nameDisplay = document.querySelector('.truncate'); 
                if (nameDisplay) nameDisplay.textContent = user.user_metadata?.full_name || user.email.split('@')[0];
            } catch (e) {}
        }
    }
});
