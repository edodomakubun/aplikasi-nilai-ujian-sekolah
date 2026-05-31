import { logout } from './auth.js';

export function renderLayout(activePageId) {
    const appHTML = `
        <!-- Sidebar -->
        <aside class="w-64 glass border-r border-white/50 flex flex-col hidden md:flex z-20">
            <div class="h-16 flex items-center px-6 border-b border-white/50">
                <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span class="ml-3 font-bold text-xl gradient-text tracking-tight">EduGrade</span>
            </div>
            <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto" id="sidebarNav">
                <a href="dashboard.html" class="${activePageId === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'} flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors">
                    <svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    Dashboard
                </a>
                <a href="siswa.html" class="${activePageId === 'siswa' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'} flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors">
                    <svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Data Siswa
                </a>
                <a href="nilai.html" class="${activePageId === 'nilai' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'} flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors">
                    <svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    Input Nilai
                </a>
                <a href="kalkulator.html" class="${activePageId === 'kalkulator' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'} flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors">
                    <svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    Kalkulator Rangking
                </a>
            </nav>
            <div class="p-4 border-t border-white/50">
                <button id="logoutBtn" class="w-full flex items-center justify-center px-4 py-2 border border-red-200 text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                    <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                </button>
            </div>
        </aside>

        <!-- Main Content Wrapper -->
        <div class="flex-1 flex flex-col bg-gray-50/50 relative overflow-hidden">
            <!-- Global Sync Indicator -->
            <div id="syncIndicator" class="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-3 z-50 transform transition-transform translate-y-20 opacity-0">
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span class="text-sm font-medium">Menyinkronkan data...</span>
            </div>
            
            <!-- Mobile Header -->
            <header class="md:hidden glass h-16 flex items-center justify-between px-4 z-10 border-b border-white/50">
                <span class="font-bold text-lg gradient-text">EduGrade</span>
                <div class="flex gap-3" id="mobileNav">
                    <a href="dashboard.html" class="${activePageId === 'dashboard' ? 'text-blue-600' : 'text-gray-500'}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></a>
                    <a href="siswa.html" class="${activePageId === 'siswa' ? 'text-blue-600' : 'text-gray-500'}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></a>
                    <a href="nilai.html" class="${activePageId === 'nilai' ? 'text-blue-600' : 'text-gray-500'}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></a>
                    <button id="logoutBtnMobile" class="text-red-500"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
                </div>
            </header>

            <main class="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative" id="main-content-area">
                <!-- CONTENT GOES HERE -->
            </main>
        </div>
    `;

    document.getElementById('app-view').innerHTML = appHTML;

    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            logout();
            window.location.href = 'index.html';
        });
    }

    const btnLogoutMobile = document.getElementById('logoutBtnMobile');
    if (btnLogoutMobile) {
        btnLogoutMobile.addEventListener('click', () => {
            logout();
            window.location.href = 'index.html';
        });
    }
}
