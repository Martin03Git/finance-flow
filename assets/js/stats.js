// Statistics Page Logic
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:3000/api' : '/api';

// --- Global Variables ---
let currentExpenses = [];
let filteredExpenses = [];
let userCategories = []; 
let isRedirectingToLogin = false;
let editingId = null;

// Pagination
let currentPage = 1;
const itemsPerPage = 10;

// --- Auth Check ---
const token = localStorage.getItem('sb_token');
if (!token) window.location.href = 'login.html';

// --- Auth Fetch Helper ---
async function authFetch(url, options = {}) {
    if (isRedirectingToLogin) return null;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers };
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

// Helpers
const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-navy' : 'bg-secondary';
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-y-10 opacity-0 ${bgClass}`;
    toast.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 text-white"></i><span class="font-medium text-sm">${message}</span>`;
    document.body.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: toast });
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => { toast.classList.add('translate-y-10', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- Date Filter Logic ---
function getFilterDates() {
    const input = document.getElementById('monthFilter');
    let date;
    if (input && input.value) date = new Date(input.value + '-01'); else date = new Date();

    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const offset = date.getTimezoneOffset() * 60000;
    const startStr = (new Date(startOfMonth - offset)).toISOString().slice(0, 10);
    const endStr = (new Date(endOfMonth - offset)).toISOString().slice(0, 10);
    return { startStr, endStr };
}

// --- Fetch Data ---

async function fetchCategories() {
    try {
        const res = await authFetch(`${API_URL}/categories`);
        if (!res) return;
        const responseData = await res.json();
        userCategories = responseData.data || [];
        renderCategoryOptions('expense');
    } catch (error) { console.warn('Categories API Error:', error); }
}

async function fetchCategoryStats() {
    try {
        const { startStr, endStr } = getFilterDates();
        
        // Pass both Start and End date to Backend
        const res = await authFetch(`${API_URL}/stats/categories?startDate=${startStr}&endDate=${endStr}`);
        if (!res || !res.ok) throw new Error('Failed');
        
        const responseData = await res.json();
        const statsData = responseData.data || [];
        
        if (statsData.length === 0) {
            document.getElementById('category-list').innerHTML = '<div class="text-center text-slate-400 py-10">No expenses this month.</div>';
            // Clear chart
            if (categoryChart) { categoryChart.data.datasets[0].data = []; categoryChart.update(); }
            return;
        }
        renderPage(statsData);
    } catch (error) {
        console.error('Stats Error:', error);
        document.getElementById('category-list').innerHTML = '<div class="text-center text-red-400 py-10">Error loading data.</div>';
    }
}

async function fetchMonthlyExpenses() {
    const tbody = document.getElementById('expense-list-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-xs">Loading...</td></tr>';

    try {
        const { startStr, endStr } = getFilterDates();

        const res = await authFetch(`${API_URL}/transactions?start=${startStr}&end=${endStr}`);
        if (!res) return;
        const responseData = await res.json();
        const allTransactions = responseData.data || (Array.isArray(responseData) ? responseData : []);

        currentExpenses = allTransactions.filter(t => parseFloat(t.amount) < 0);
        currentExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        filteredExpenses = [...currentExpenses];
        currentPage = 1;
        renderExpenseTable();

    } catch (error) {
        console.error('Expenses Error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-400 text-xs">Failed to load data</td></tr>';
    }
}

// --- Render Logic ---

function renderExpenseTable() {
    const tbody = document.getElementById('expense-list-body');
    tbody.innerHTML = '';

    if (filteredExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400 text-xs">No expenses found.</td></tr>';
        renderPagination(0);
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredExpenses.slice(start, end);

    pageData.forEach(txn => {
        const amount = Math.abs(parseFloat(txn.amount));
        const categoryName = txn.category || txn.category_name || 'Uncategorized';
        const note = txn.note || categoryName; 
        const txnData = JSON.stringify(txn).replace(/'/g, "&apos;");

        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group';
        
        tr.innerHTML = `
            <td class="py-3 pl-2 text-xs text-slate-500">${formatDate(txn.date)}</td>
            <td class="py-3 font-medium text-slate-700">${note}</td>
            <td class="py-3 text-slate-500"><span class="bg-slate-100 px-2 py-1 rounded text-xs">${categoryName}</span></td>
            <td class="py-3 pr-2 text-right font-semibold text-secondary whitespace-nowrap">- ${formatCurrency(amount)}</td>
            <td class="py-3 pr-2 text-right">
                <div class="flex gap-3 justify-center">
                    <button onclick='openEditModal(${txnData})' class="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-soft transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteTransaction('${txn.id}')" class="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
    renderPagination(filteredExpenses.length);
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const info = document.getElementById('page-info');

    if (totalItems === 0) {
        info.textContent = 'Page 0 of 0';
        prevBtn.disabled = true; nextBtn.disabled = true;
        return;
    }
    info.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

document.getElementById('prevBtn').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderExpenseTable(); } });
document.getElementById('nextBtn').addEventListener('click', () => { if (currentPage < Math.ceil(filteredExpenses.length / itemsPerPage)) { currentPage++; renderExpenseTable(); } });

// Chart Render
let categoryChart = null;
function renderPage(data) {
    const total = data.reduce((sum, item) => sum + Number(item.amount), 0);
    const listContainer = document.getElementById('category-list');
    listContainer.innerHTML = '';
    const colorPalette = ['#2EC4B6', '#FF9F1C', '#FFBF69', '#CBF3F0', '#0f172a', '#EF4444', '#3B82F6'];

    data.forEach((item, index) => {
        const amount = Number(item.amount);
        const percent = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
        const color = colorPalette[index % colorPalette.length];
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors';
        row.innerHTML = `
            <div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div><span class="font-medium text-slate-700">${item.category}</span></div>
            <div class="text-right"><p class="font-bold text-slate-800">${formatCurrency(amount)}</p><p class="text-xs text-slate-400">${percent}%</p></div>
        `;
        listContainer.appendChild(row);
        item._chartColor = color;
    });

    const ctx = document.getElementById('categoryChart');
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: data.map(d => d.category), datasets: [{ data: data.map(d => d.amount), backgroundColor: data.map(d => d._chartColor), borderWidth: 0, hoverOffset: 10 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', bodyColor: '#fff', callbacks: { label: (ctx) => ' ' + formatCurrency(ctx.raw) } } }, cutout: '70%' }
    });
}

// --- CRUD & Form (Reuse) ---
window.deleteTransaction = async function(id) {
    if (!confirm('Delete this expense?')) return;
    try {
        const res = await authFetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error('Failed');
        showToast('Expense deleted!', 'success');
        fetchCategoryStats(); fetchMonthlyExpenses();
    } catch (e) { showToast('Error deleting', 'error'); }
};
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
const addTransactionForm = document.getElementById('addTransactionForm');
function renderCategoryOptions(type) {
    const select = addTransactionForm.querySelector('select[name="category"]');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Select...</option>';
    const typeId = type === 'income' ? 1 : 2;
    const filtered = userCategories.filter(cat => cat.transaction_type_id === typeId);
    filtered.forEach(cat => { const option = document.createElement('option'); option.value = cat.name; option.textContent = cat.name; select.appendChild(option); });
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
        btn.textContent = 'Updating...'; btn.disabled = true;
        try {
            const url = editingId ? `${API_URL}/transactions/${editingId}` : `${API_URL}/transactions`;
            const method = editingId ? 'PUT' : 'POST';
            const res = await authFetch(url, { method, body: JSON.stringify(payload) });
            if (!res || !res.ok) throw new Error('Failed');
            showToast(editingId ? 'Transaction updated!' : 'Transaction saved!', 'success');
            window.closeTransactionModal();
            fetchCategoryStats(); fetchMonthlyExpenses();
        } catch (e) { showToast('Error processing', 'error'); } 
        finally { btn.textContent = originalText; btn.disabled = false; }
    });
}
document.getElementById('expenseSearch').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    filteredExpenses = currentExpenses.filter(txn => {
        const note = (txn.note || '').toLowerCase();
        const category = (txn.category || txn.category_name || '').toLowerCase();
        return note.includes(term) || category.includes(term);
    });
    currentPage = 1; renderExpenseTable();
});

// --- Export PDF Logic ---
window.exportToPDF = function() {
    if (filteredExpenses.length === 0) {
        showToast('No data to export', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // 1. Setup Fonts & Colors
    const primaryColor = [46, 196, 182]; // Teal from our theme
    
    // 2. Title Section
    const filterInput = document.getElementById('monthFilter');
    const periodText = filterInput ? filterInput.value : 'Monthly Report';
    
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Expense Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${periodText}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

    // 3. Prepare Data for Table
    const tableRows = filteredExpenses.map((txn, index) => {
        const amount = Math.abs(parseFloat(txn.amount));
        const categoryName = txn.category || txn.category_name || 'Uncategorized';
        const note = txn.note || categoryName;
        
        return [
            index + 1,
            formatDate(txn.date),
            note,
            categoryName,
            formatCurrency(amount)
        ];
    });

    const totalAmount = filteredExpenses.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

    // 4. Generate Table
    doc.autoTable({
        startY: 45,
        head: [['No', 'Date', 'Description', 'Category', 'Amount']],
        body: tableRows,
        foot: [['', '', '', 'TOTAL', formatCurrency(totalAmount)]],
        headStyles: { fillColor: primaryColor, halign: 'left' },
        footStyles: { fillColor: [248, 250, 252], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'right' },
        columnStyles: {
            4: { halign: 'right' } // Amount column right aligned
        },
        theme: 'striped',
        margin: { top: 45 }
    });

    // 5. Save PDF
    doc.save(`FinanceFlow_Report_${periodText}.pdf`);
    showToast('PDF downloaded successfully!', 'success');
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Date Filter
    const filterInput = document.getElementById('monthFilter');
    if (filterInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        filterInput.value = `${year}-${month}`;
        
        filterInput.addEventListener('change', () => {
            fetchCategoryStats();
            fetchMonthlyExpenses();
        });
    }

    if (localStorage.getItem('sb_token')) {
        fetchCategories();
        fetchCategoryStats();
        fetchMonthlyExpenses();
    }
    window.logout = function() { localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); window.location.href = 'login.html'; };
});
