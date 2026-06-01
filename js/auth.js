import { api } from './api.js';

export function isLoggedIn() {
    return localStorage.getItem('auth_token') !== null;
}

export async function login(username, password) {
    const result = await api.login(username, password);
    if (result && result.success) {
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('username', username);
        return true;
    }
    return false;
}

export function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    // Remove auth-related caches if necessary
    // Tapi kita pertahankan cache data nilai agar offline mode tetap ada
}
