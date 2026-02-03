// Profile Page Logic
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocal ? 'http://localhost:3000/api' : '/api';

// Auth Variables
let isRedirectingToLogin = false;
let sb = null; 

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

// --- Fetch Stats ---
async function fetchProfileStats() {
    try {
        const res = await authFetch(`${API_URL}/stats?mode=profile`);
        if (!res || !res.ok) return;
        
        const data = await res.json();
        const stats = data.data || data;
        
        // Helper
        const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

        if (document.getElementById('total-txns')) {
            document.getElementById('total-txns').textContent = stats.transaction_count ?? 0;
            document.getElementById('total-income').textContent = formatCurrency(stats.income || 0);
            document.getElementById('total-expense').textContent = formatCurrency(stats.expense || 0);
        }

    } catch (e) { console.error('Stats error', e); }
}

// --- Telegram Logic ---

window.generateTelegramOTP = async function() {
    const btn = document.getElementById('btn-connect-tele');
    const otpCode = document.getElementById('tele-otp-code');
    
    // UI Feedback
    if (btn && !btn.classList.contains('hidden')) {
        btn.innerText = 'Generating...';
        btn.disabled = true;
    } else {
        // Regenerate mode
        otpCode.textContent = '...';
        otpCode.classList.add('animate-pulse');
    }

    try {
        const res = await authFetch(`${API_URL}/telegram/otp`, { method: 'POST' });
        if (!res || !res.ok) throw new Error('Failed to generate code');
        
        const data = await res.json();
        const otp = data.otp;
        const botUsername = data.botUsername || 'FinanceFlow_Bot'; 

        // Show UI
        document.getElementById('tele-otp-container').classList.remove('hidden');
        otpCode.classList.remove('animate-pulse');
        otpCode.textContent = otp;
        
        const link = document.getElementById('tele-link');
        link.href = `https://t.me/${botUsername}?start=${otp}`;
        link.textContent = `Open @${botUsername}`; 
        
        if (btn) btn.classList.add('hidden'); 

    } catch (e) {
        console.error(e);
        alert('Error generating code.');
        otpCode.textContent = 'Error';
    } finally {
        if (btn) {
            btn.innerText = 'Connect Now';
            btn.disabled = false;
        }
    }
};

window.copyOTP = function() {
    const otp = document.getElementById('tele-otp-code').innerText;
    // Format: "OTP: XXXXXX" for easier n8n parsing
    const message = `OTP: ${otp}`;
    navigator.clipboard.writeText(message).then(() => alert('Code copied to clipboard!'));
};

async function checkTelegramStatus() {
    try {
        const res = await authFetch(`${API_URL}/telegram/status`);
        if (!res || !res.ok) return;
        
        const data = await res.json();
        const statusEl = document.getElementById('tele-status');
        const btn = document.getElementById('btn-connect-tele');
        
        if (data.connected) {
            statusEl.textContent = 'Connected';
            statusEl.className = 'text-xs bg-green-50 px-2 py-1 rounded border border-green-200 text-green-700';
            btn.textContent = 'Re-Connect Device';
        }
    } catch (e) { console.warn('Tele Status Error', e); }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Profile JS Loaded');

    if (typeof window.supabase !== 'undefined' && window.APP_CONFIG) {
        sb = window.supabase.createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);
    } 

    const userStr = localStorage.getItem('sb_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            
            const elName = document.getElementById('profile-name');
            const elEmail = document.getElementById('profile-email');
            const elAvatar = document.getElementById('profile-avatar');
            const elJoin = document.getElementById('join-date');

            if (elName) elName.textContent = user.user_metadata?.full_name || 'User';
            if (elEmail) elEmail.textContent = user.email;
            
            if (elAvatar) {
                const name = user.user_metadata?.full_name || 'User';
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                elAvatar.textContent = initials;
            }

            if (elJoin) {
                const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                elJoin.textContent = `Member since ${joinDate}`;
            }

        } catch (e) { console.error('Error parsing user data', e); }
    }

    fetchProfileStats();
    checkTelegramStatus(); // Check connection

    const pwForm = document.getElementById('changePasswordForm');
    if (pwForm) {
        pwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!sb) { alert('Supabase not initialized'); return; }

            const newPassword = pwForm.newPassword.value;
            const confirmPassword = pwForm.confirmPassword.value;
            const btn = pwForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            if (newPassword !== confirmPassword) { alert('Passwords do not match'); return; }

            try {
                btn.innerHTML = 'Updating...';
                btn.disabled = true;
                const { error } = await sb.auth.updateUser({ password: newPassword });
                if (error) throw error;
                alert('Password has been changed successfully.');
                setTimeout(() => { if (window.closePasswordModal) window.closePasswordModal(); }, 1000);
            } catch (error) { alert(error.message); } 
            finally { btn.innerHTML = originalText; btn.disabled = false; }
        });
    }
});