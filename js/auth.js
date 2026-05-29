export function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token && !window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
    } else if (token && window.location.pathname.endsWith('login.html')) {
        window.location.href = 'index.html';
    }
}

export function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = 'login.html';
}

// Auto check auth when included
checkAuth();
