export function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    
    if (loginView && appView) {
        if (!token) {
            // Not logged in -> Show Login, Hide App
            loginView.classList.add('active');
            appView.classList.remove('active');
        } else {
            // Logged in -> Hide Login, Show App
            loginView.classList.remove('active');
            appView.classList.add('active');
            
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
