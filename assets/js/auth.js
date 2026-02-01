// Initialize Supabase Logic
// Dependency: assets/js/config.js must be loaded first

if (!window.APP_CONFIG || window.APP_CONFIG.supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
    console.error('Supabase not configured in assets/js/config.js');
    alert('Please configure Supabase credentials in assets/js/config.js');
}

const { createClient } = supabase;
const sb = createClient(window.APP_CONFIG.supabaseUrl, window.APP_CONFIG.supabaseKey);

// --- Helpers ---
function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `p-3 rounded-lg text-xs font-medium mb-4 ${type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`;
    alertBox.classList.remove('hidden');
}

// --- Login Logic ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.email.value;
        const password = loginForm.password.value;
        const btn = loginForm.querySelector('button');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = 'Signing In...';
            btn.disabled = true;

            const { data, error } = await sb.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Success
            localStorage.setItem('sb_token', data.session.access_token);
            localStorage.setItem('sb_user', JSON.stringify(data.user));
            
            window.location.href = 'index.html';

        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- Register Logic ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = registerForm.fullName.value;
        const email = registerForm.email.value;
        const password = registerForm.password.value;
        const btn = registerForm.querySelector('button');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = 'Creating Account...';
            btn.disabled = true;

            // 1. Sign Up
            const { data, error } = await sb.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            // 2. Handle Profile Creation
            // Ideally, a Database Trigger handles this. 
            // Or we check if user is automatically logged in.
            
            showAlert('Registration successful! Please check your email to verify (if enabled) or sign in.', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- Logout Logic (Global) ---
function logout() {
    sb.auth.signOut().then(() => {
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_user');
        window.location.href = 'login.html';
    });
}
