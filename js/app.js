import { api } from './api.js';
import { logout, checkAuth } from './auth.js';

let rawData = [];

// ==========================================
// ROUTER & NAVIGATION
// ==========================================
function navigateTo(hash) {
    if (!hash || hash === '#' || hash === '') hash = '#dashboard';
    
    // Hide all spa-contents
    document.querySelectorAll('.spa-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });

    // Reset all nav link active states
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('bg-blue-50', 'text-blue-700');
        link.classList.add('text-gray-600');
    });
    document.querySelectorAll('.nav-link-mobile').forEach(link => {
        link.classList.remove('text-blue-600');
        link.classList.add('text-gray-500');
    });
    
    const targetId = hash.replace('#', '') + '-content';
    const targetEl = document.getElementById(targetId);
    
    if (targetEl) {
        targetEl.classList.remove('hidden');
        targetEl.classList.add('block');
        
        // Active Nav Desktop
        const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
        if (activeLink) {
            activeLink.classList.remove('text-gray-600');
            activeLink.classList.add('bg-blue-50', 'text-blue-700');
        }

        // Active Nav Mobile
        const activeLinkMobile = document.querySelector(`.nav-link-mobile[href="${hash}"]`);
        if (activeLinkMobile) {
            activeLinkMobile.classList.remove('text-gray-500');
            activeLinkMobile.classList.add('text-blue-600');
        }
        
        // Refresh dashboard data if visiting dashboard
        if (hash === '#dashboard' && rawData.length === 0) {
            fetchData();
        }
    }
}

// Listen to hash changes for SPA routing
window.addEventListener('hashchange', () => {
    navigateTo(window.location.hash);
});

// ==========================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Initial Route
    if(localStorage.getItem('auth_token')) {
        navigateTo(window.location.hash);
    }
    
    // Auth Buttons
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', logout);

    // Refresh Dashboard Button
    document.getElementById('refreshBtn')?.addEventListener('click', fetchData);

    // Live Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const msg = document.getElementById('loginMessage');
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            btn.disabled = true;
            btn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> Memproses...';
            msg.classList.add('hidden');

            const result = await api.login(username, password);

            if (result && result.success) {
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('username', username);
                checkAuth(); // Switch to app view
                fetchData(); // Load data initially
            } else {
                msg.classList.remove('hidden');
                msg.innerText = result ? result.error : "Gagal terhubung ke server.";
                btn.disabled = false;
                btn.innerHTML = 'Masuk ke Dashboard';
            }
        });
    }

    // Input Siswa Form
    const siswaForm = document.getElementById('siswaForm');
    if (siswaForm) {
        siswaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitSiswaBtn');
            const msg = document.getElementById('statusSiswa');
            
            const fields = ['NO URUT', 'NIS', 'NISN', 'NO PESERTA UJIAN', 'NO ABSEN', 'NAMA PESERTA', 'JENIS KELAMIN', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'NAMA ORANG TUA'];
            const data = {};
            fields.forEach(field => { data[field] = document.getElementById(field).value; });

            btn.disabled = true;
            btn.innerHTML = 'Menyimpan...';
            msg.className = 'hidden rounded-lg p-4 mt-4 text-sm font-medium';

            const result = await api.saveStudent(data);

            btn.disabled = false;
            btn.innerHTML = 'Simpan Data Siswa';

            msg.classList.remove('hidden');
            if (result && result.success) {
                msg.classList.add('bg-green-100', 'text-green-700');
                msg.innerText = "Berhasil: " + result.message;
                siswaForm.reset();
            } else {
                msg.classList.add('bg-red-100', 'text-red-700');
                msg.innerText = "Gagal: " + (result ? result.error : "Terjadi kesalahan");
            }
        });
    }

    // Input Nilai Kalkulasi
    document.querySelectorAll('.calc-trigger').forEach(input => {
        input.addEventListener('input', () => {
            const n7 = parseFloat(document.getElementById('N_7').value) || 0;
            const n8 = parseFloat(document.getElementById('N_8').value) || 0;
            const n9 = parseFloat(document.getElementById('N_9').value) || 0;
            const n10 = parseFloat(document.getElementById('N_10').value) || 0;
            const n11 = parseFloat(document.getElementById('N_11').value) || 0;

            const jml = n7 + n8 + n9 + n10 + n11;
            const rataNr = jml / 5;
            const bobot40 = rataNr * 0.4;

            document.getElementById('JML').value = jml > 0 ? jml.toFixed(2) : '';
            document.getElementById('RATA_NR').value = rataNr > 0 ? rataNr.toFixed(2) : '';
            document.getElementById('BOBOT_40').value = bobot40 > 0 ? bobot40.toFixed(2) : '';

            const tulis = parseFloat(document.getElementById('TULIS').value) || 0;
            const praktik = parseFloat(document.getElementById('PRAKTIK').value) || 0;
            
            const rataUs = (tulis + praktik) / 2;
            const bobot60 = rataUs * 0.6;

            document.getElementById('RATA_US').value = rataUs > 0 ? rataUs.toFixed(2) : '';
            document.getElementById('BOBOT_60').value = bobot60 > 0 ? bobot60.toFixed(2) : '';

            if(bobot40 > 0 && bobot60 > 0) {
                document.getElementById('NILAI_SEKOLAH').value = (bobot40 + bobot60).toFixed(2);
            } else {
                document.getElementById('NILAI_SEKOLAH').value = '';
            }
        });
    });

    // Input Nilai Submit
    const nilaiForm = document.getElementById('nilaiForm');
    if (nilaiForm) {
        nilaiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitNilaiBtn');
            const msg = document.getElementById('statusNilai');
            
            const data = {
                'NO': document.getElementById('NO').value,
                'NAMA SISWA': document.getElementById('NAMA_SISWA').value,
                '7': document.getElementById('N_7').value,
                '8': document.getElementById('N_8').value,
                '9': document.getElementById('N_9').value,
                '10': document.getElementById('N_10').value,
                '11': document.getElementById('N_11').value,
                'JML': document.getElementById('JML').value,
                'RATA-RATA NR': document.getElementById('RATA_NR').value,
                'BOBOT 40%': document.getElementById('BOBOT_40').value,
                'Tulis': document.getElementById('TULIS').value,
                'Praktik': document.getElementById('PRAKTIK').value,
                'Rata-Rata': document.getElementById('RATA_US').value,
                'BOBOT 60%': document.getElementById('BOBOT_60').value,
                'NILAI SEKOLAH': document.getElementById('NILAI_SEKOLAH').value
            };

            btn.disabled = true;
            btn.innerHTML = 'Menyimpan...';
            msg.className = 'hidden rounded-lg p-4 mt-4 text-sm font-medium';

            const result = await api.saveGrade(data);

            btn.disabled = false;
            btn.innerHTML = 'Simpan Data Nilai';

            msg.classList.remove('hidden');
            if (result && result.success) {
                msg.classList.add('bg-green-100', 'text-green-700');
                msg.innerText = "Berhasil: " + result.message;
                nilaiForm.reset();
            } else {
                msg.classList.add('bg-red-100', 'text-red-700');
                msg.innerText = "Gagal: " + (result ? result.error : "Terjadi kesalahan");
            }
        });
    }

});

// ==========================================
// DASHBOARD DATA FETCHING
// ==========================================
async function fetchData() {
    const loader = document.getElementById('loader');
    const content = document.getElementById('dashboardStats');
    
    loader.classList.remove('hidden');
    content.classList.add('hidden');

    const result = await api.getGrades();
    
    loader.classList.add('hidden');
    content.classList.remove('hidden');

    if (result && result.success) {
        rawData = result.data;
        processStats(rawData);
        renderRanking(rawData);
        renderTable('');
    } else {
        document.getElementById('gradesTableBody').innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Gagal memuat data. Periksa koneksi atau URL API.</td></tr>`;
    }
}

function processStats(data) {
    if (data.length === 0) return;

    document.getElementById('statTotalSiswa').innerText = data.length;

    let totalUs = 0;
    let highest = 0;
    let countUs = 0;

    data.forEach(row => {
        const us = parseFloat(row['Rata-Rata']) || 0;
        const akhir = parseFloat(row['NILAI SEKOLAH']) || 0;
        
        if (us > 0) {
            totalUs += us;
            countUs++;
        }
        if (akhir > highest) {
            highest = akhir;
        }
    });

    const avgUs = countUs > 0 ? (totalUs / countUs).toFixed(2) : 0;
    document.getElementById('statRataRata').innerText = avgUs;
    document.getElementById('statTertinggi').innerText = highest.toFixed(2);
}

function renderRanking(data) {
    const sorted = [...data]
        .filter(a => parseFloat(a['NILAI SEKOLAH']) > 0)
        .sort((a, b) => parseFloat(b['NILAI SEKOLAH']) - parseFloat(a['NILAI SEKOLAH']))
        .slice(0, 10);

    const list = document.getElementById('rankingList');
    
    if (sorted.length === 0) {
        list.innerHTML = '<li class="p-6 text-center text-gray-500 text-sm">Belum ada data nilai.</li>';
        return;
    }

    let html = '';
    sorted.forEach((item, index) => {
        let badgeClass = "bg-gray-100 text-gray-700";
        if (index === 0) badgeClass = "bg-yellow-100 text-yellow-700 font-bold border border-yellow-200";
        else if (index === 1) badgeClass = "bg-gray-200 text-gray-700 font-bold";
        else if (index === 2) badgeClass = "bg-amber-100 text-amber-700 font-bold";

        html += `
            <li class="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                <div class="flex items-center">
                    <span class="flex items-center justify-center w-8 h-8 rounded-full text-xs ${badgeClass}">${index + 1}</span>
                    <span class="ml-4 font-medium text-gray-800 text-sm">${item['NAMA SISWA']}</span>
                </div>
                <span class="font-bold text-blue-600 text-sm">${parseFloat(item['NILAI SEKOLAH']).toFixed(2)}</span>
            </li>
        `;
    });
    list.innerHTML = html;
}

function renderTable(searchQuery) {
    const tbody = document.getElementById('gradesTableBody');
    if (rawData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Belum ada data.</td></tr>';
        return;
    }

    const filtered = rawData.filter(row => {
        const name = (row['NAMA SISWA'] || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Siswa tidak ditemukan.</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach((row, idx) => {
        html += `
            <tr class="hover:bg-white/50 transition-colors">
                <td class="px-6 py-4 text-gray-500">${row['NO'] || (idx+1)}</td>
                <td class="px-6 py-4 font-medium text-gray-900">${row['NAMA SISWA']}</td>
                <td class="px-6 py-4 text-center text-gray-600">${parseFloat(row['RATA-RATA NR']||0).toFixed(2)}</td>
                <td class="px-6 py-4 text-center text-gray-600">${parseFloat(row['Rata-Rata']||0).toFixed(2)}</td>
                <td class="px-6 py-4 text-center font-bold text-blue-600 bg-blue-50/30">${parseFloat(row['NILAI SEKOLAH']||0).toFixed(2)}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}
