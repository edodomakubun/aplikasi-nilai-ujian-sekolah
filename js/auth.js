export function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    
    if (loginView && appView) {
        if (!token) {
            // Not logged in -> Show Login, Hide App
            loginView.classList.remove('hidden');
            loginView.classList.add('block');
            appView.classList.add('hidden');
            appView.classList.remove('flex');
        } else {
            // Logged in -> Hide Login, Show App
            loginView.classList.add('hidden');
            loginView.classList.remove('block');
            appView.classList.remove('hidden');
            appView.classList.add('flex');
            
            // Trigger routing to initial view (dashboard)
            window.dispatchEvent(new Event('hashchange'));
        }
    }
}

export function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    checkAuth();
}

// Check initially when DOM is ready
document.addEventListener('DOMContentLoaded', checkAuth);
