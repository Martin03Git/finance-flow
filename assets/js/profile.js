// Profile Page Logic
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:3000/api' : '/api';

// Auth Variables
let isRedirectingToLogin = false;
let sb = null; // Supabase client instance

// Check Auth
const token = localStorage.getItem('sb_token');
if (!token) window.location.href = 'login.html';

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

// Helper: Format Currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount);
};

// --- Fetch Stats ---
async function fetchProfileStats() {
    try {
        const res = await authFetch(`${API_URL}/stats?mode=profile`);
        if (!res || !res.ok) return;
        
        const data = await res.json();
        const stats = data.data || data;
        
        if (document.getElementById('total-txns')) {
            document.getElementById('total-txns').textContent = stats.transaction_count ?? 0;
            document.getElementById('total-income').textContent = formatCurrency(stats.income || 0);
            document.getElementById('total-expense').textContent = formatCurrency(stats.expense || 0);
        }

    } catch (e) { console.error('Stats error', e); }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Profile JS Loaded');

    // 1. Initialize Supabase (Safe Access)
    if (typeof window.supabase !== 'undefined' && window.APP_CONFIG) {
        sb = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
    } else {
        console.error('Supabase SDK or Config not loaded');
    }

    // 2. Load User Info from LocalStorage
    const userStr = localStorage.getItem('sb_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            console.log('User Data:', user);

            // Populate UI
            const name = user.user_metadata?.full_name || 'User';
            const email = user.email;
            
            const elName = document.getElementById('profile-name');
            const elEmail = document.getElementById('profile-email');
            const elAvatar = document.getElementById('profile-avatar');
            const elJoin = document.getElementById('join-date');

            if (elName) elName.textContent = name;
            if (elEmail) elEmail.textContent = email;
            
            if (elAvatar) {
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                elAvatar.textContent = initials;
            }

            if (elJoin) {
                // Detailed Date: '23 January 2026'
                const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                elJoin.textContent = `Member since ${joinDate}`;
            }

        } catch (e) {
            console.error('Error parsing user data', e);
        }
    } else {
        console.warn('No user data in localStorage');
    }

    // 3. Fetch Live Stats
    fetchProfileStats();

    // 4. Setup Change Password Form
    const pwForm = document.getElementById('changePasswordForm');
    if (pwForm) {
        pwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!sb) { alert('Supabase not initialized'); return; }

            const newPassword = pwForm.newPassword.value;
            const confirmPassword = pwForm.confirmPassword.value;
            const btn = pwForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            if (newPassword !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                btn.innerHTML = 'Updating...';
                btn.disabled = true;

                const { error } = await sb.auth.updateUser({ password: newPassword });
                if (error) throw error;

                alert('Password has been changed successfully.');
                setTimeout(() => { if (window.closePasswordModal) window.closePasswordModal(); }, 1000);

            } catch (error) {
                alert(error.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});
