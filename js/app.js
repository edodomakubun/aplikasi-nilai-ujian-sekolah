import { api } from './api.js';
import { logout, checkAuth } from './auth.js';

let rawData = JSON.parse(localStorage.getItem('edu_rawData')) || [];
let rawStudents = JSON.parse(localStorage.getItem('edu_rawStudents')) || [];
let dashboardData = JSON.parse(localStorage.getItem('edu_dashboardData')) || [];

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
        
        // Refresh active view with cache
        refreshActiveView();
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
    document.getElementById('refreshBtn')?.addEventListener('click', syncData);

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
                syncData(); // Background sync data initially
            } else {
                msg.classList.remove('hidden');
                msg.innerText = result ? result.error : "Gagal terhubung ke server.";
                btn.disabled = false;
                btn.innerHTML = 'Masuk ke Dashboard';
            }
        });
    }

    // Modal Siswa
    const modal = document.getElementById('siswaModal');
    const openBtn = document.getElementById('openAddSiswaModal');
    const closeBtn = document.getElementById('closeSiswaModal');
    
    if(openBtn) {
        openBtn.addEventListener('click', () => {
            document.getElementById('siswaForm').reset();
            document.getElementById('siswaMode').value = 'add';
            document.getElementById('NIS').readOnly = false;
            document.getElementById('siswaModalTitle').innerText = 'Tambah Data Siswa';
            document.getElementById('statusSiswa').classList.add('hidden');
            modal.classList.remove('hidden');
        });
    }
    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // Input Siswa Form (CRUD)
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
                syncData(); // Trigger background sync after insert/update
                setTimeout(() => modal.classList.add('hidden'), 1000);
            } else {
                msg.classList.add('bg-red-100', 'text-red-700');
                msg.innerText = "Gagal: " + (result ? result.error : "Terjadi kesalahan");
            }
        });
    }
    
    // Live Search Siswa
    document.getElementById('searchSiswaInput')?.addEventListener('input', (e) => {
        renderSiswaTable(e.target.value);
    });
    
    // Make deleteStudent global so it can be called from onclick
    window.deleteSiswa = async function(nis) {
        if(!confirm('Apakah Anda yakin ingin menghapus data siswa dengan NIS: ' + nis + '?')) return;
        
        const syncIndicator = document.getElementById('syncIndicator');
        if(syncIndicator) syncIndicator.classList.remove('translate-y-20', 'opacity-0');
        
        const result = await api.deleteStudent({ NIS: nis });
        
        if(result && result.success) {
            syncData();
        } else {
            alert('Gagal menghapus siswa: ' + (result? result.error : 'Kesalahan jaringan'));
            if(syncIndicator) syncIndicator.classList.add('translate-y-20', 'opacity-0');
        }
    };
    
    window.editSiswa = function(nis) {
        const student = rawStudents.find(s => String(s.NIS) === String(nis));
        if(!student) return;
        
        document.getElementById('siswaForm').reset();
        document.getElementById('siswaMode').value = 'edit';
        document.getElementById('siswaModalTitle').innerText = 'Edit Data Siswa';
        document.getElementById('statusSiswa').classList.add('hidden');
        
        const fields = ['NO URUT', 'NIS', 'NISN', 'NO PESERTA UJIAN', 'NO ABSEN', 'NAMA PESERTA', 'JENIS KELAMIN', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'NAMA ORANG TUA'];
        fields.forEach(field => {
            const el = document.getElementById(field);
            if(el) {
                if(field === 'TANGGAL LAHIR' && student[field]) {
                    try {
                        const dateObj = new Date(student[field]);
                        el.value = dateObj.toISOString().split('T')[0];
                    } catch(e) {
                        el.value = student[field];
                    }
                } else {
                    el.value = student[field];
                }
            }
        });
        
        document.getElementById('NIS').readOnly = true; // Lock NIS when editing
        modal.classList.remove('hidden');
    };

    // Subject Tabs Event Listener dihapus (All-in-One)

    // Batch Save Button
    const batchSaveBtn = document.getElementById('batchSaveBtn');
    if (batchSaveBtn) {
        batchSaveBtn.addEventListener('click', async () => {
            const btn = batchSaveBtn;
            const msg = document.getElementById('batchSaveStatus');
            
            btn.disabled = true;
            btn.innerHTML = 'Menyimpan...';
            msg.innerHTML = '<span class="text-blue-500">Sedang menyimpan data... (Jangan tutup halaman)</span>';

            const tables = document.querySelectorAll('.subject-table-wrapper');
            let successCount = 0;
            let errorMessages = [];

            for (let i = 0; i < tables.length; i++) {
                const tableWrapper = tables[i];
                const subject = tableWrapper.getAttribute('data-subject');
                const batchData = [];
                const rows = tableWrapper.querySelectorAll('tbody tr');
                
                rows.forEach(tr => {
                    const inputs = tr.querySelectorAll('input');
                    if (inputs.length === 0) return;
                    
                    const getVal = (className) => {
                        const el = tr.querySelector('.' + className);
                        if (!el || el.value === '') return '';
                        let v = el.value.replace(',', '.');
                        const num = parseFloat(v);
                        return isNaN(num) ? v : num;
                    };

                    const data = {
                        'MATA PELAJARAN': subject,
                        'NO': tr.querySelector('.cell-no').innerText,
                        'NAMA SISWA': tr.querySelector('.cell-nama').innerText,
                        '7': getVal('inp-7'),
                        '8': getVal('inp-8'),
                        '9': getVal('inp-9'),
                        '10': getVal('inp-10'),
                        '11': getVal('inp-11'),
                        'JML': getVal('out-jml'),
                        'RATA-RATA NR': getVal('out-rata-nr'),
                        'BOBOT 40%': getVal('out-bobot40'),
                        'Tulis': getVal('inp-tulis'),
                        'Praktik': getVal('inp-praktik'),
                        'Rata-Rata': getVal('out-rata-us'),
                        'BOBOT 60%': getVal('out-bobot60'),
                        'NILAI SEKOLAH': getVal('out-akhir')
                    };
                    
                    if (data['7'] || data['8'] || data['9'] || data['10'] || data['11'] || data['Tulis'] || data['Praktik']) {
                        batchData.push(data);
                    }
                });

                if (batchData.length > 0) {
                    msg.innerHTML = `<span class="text-blue-500">Menyimpan ${subject}... (${i+1}/${tables.length})</span>`;
                    const result = await api.saveGradesBatch(batchData);
                    if (result && result.success) {
                        successCount++;
                    } else {
                        errorMessages.push(`${subject}: ${result ? result.error : 'Kesalahan server'}`);
                    }
                }
            }

            btn.disabled = false;
            btn.innerHTML = 'SIMPAN SELURUH NILAI';

            if (errorMessages.length > 0) {
                msg.innerHTML = '<span class="text-red-500">Terdapat Gagal Simpan: ' + errorMessages.join(', ') + '</span>';
            } else if (successCount > 0) {
                msg.innerHTML = '<span class="text-green-600">Berhasil: Semua data nilai berhasil disimpan!</span>';
            } else {
                msg.innerHTML = '<span class="text-gray-500">Tidak ada data untuk disimpan.</span>';
            }
            
            syncData(); // background sync update
            setTimeout(() => { msg.innerHTML = ''; }, 5000);
        });
    }

});

// ==========================================
// GLOBAL SYNC & STATE
// ==========================================
let isSyncing = false;
let firstLoad = true;

async function syncData() {
    if (isSyncing) return;
    isSyncing = true;
    
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        syncIndicator.classList.remove('translate-y-20', 'opacity-0');
    }

    try {
        const studentsResult = await api.getStudents();
        const gradesResult = await api.getGrades();
        
        if (studentsResult && !studentsResult.error) {
            rawStudents = studentsResult.data || [];
            localStorage.setItem('edu_rawStudents', JSON.stringify(rawStudents));
        }
        
        if (gradesResult && !gradesResult.error) {
            rawData = gradesResult.data || [];
            localStorage.setItem('edu_rawData', JSON.stringify(rawData));
            
            // Agregasi nilai rata-rata tiap siswa dari semua mata pelajaran
            const studentGrades = {};
            rawData.forEach(row => {
                const name = row['NAMA SISWA'];
                if (!studentGrades[name]) {
                    studentGrades[name] = { count: 0, sumNR: 0, sumUS: 0, sumAkhir: 0, 'NAMA SISWA': name };
                }
                const nr = parseFloat(row['RATA-RATA NR']);
                const us = parseFloat(row['Rata-Rata']); 
                const akhir = parseFloat(row['NILAI SEKOLAH']);
                
                if (!isNaN(akhir) && akhir > 0) {
                    studentGrades[name].sumNR += nr;
                    studentGrades[name].sumUS += us;
                    studentGrades[name].sumAkhir += akhir;
                    studentGrades[name].count++;
                }
            });
            
            dashboardData = [];
            let index = 1;
            for (let name in studentGrades) {
                const st = studentGrades[name];
                if (st.count > 0) {
                    dashboardData.push({
                        'NO': index++,
                        'NAMA SISWA': name,
                        'RATA-RATA NR': (st.sumNR / st.count).toFixed(2),
                        'Rata-Rata': (st.sumUS / st.count).toFixed(2),
                        'NILAI SEKOLAH': (st.sumAkhir / st.count).toFixed(2)
                    });
                }
            }
            localStorage.setItem('edu_dashboardData', JSON.stringify(dashboardData));
        }
    } catch (e) {
        console.error('Sync failed', e);
    }
    
    if (syncIndicator) {
        syncIndicator.classList.add('translate-y-20', 'opacity-0');
    }
    isSyncing = false;
    firstLoad = false;
    
    // Auto-refresh active view
    refreshActiveView();
}

function refreshActiveView() {
    // Sembunyikan loader jika baru pertama kali load
    const loader = document.getElementById('loader');
    const content = document.getElementById('dashboardStats');
    if(loader && !firstLoad) {
        loader.classList.add('hidden');
        content.classList.remove('hidden');
    }

    const hash = window.location.hash || '#dashboard';
    if (hash === '#dashboard') {
        processStats(dashboardData);
        renderRanking(dashboardData);
        renderTable(document.getElementById('searchInput')?.value || '');
    } else if (hash === '#siswa') {
        renderSiswaTable(document.getElementById('searchSiswaInput')?.value || '');
    } else if (hash === '#nilai') {
        renderStudentsForNilai();
    } else if (hash === '#kalkulator') {
        renderKalkulatorRangking();
    }
}

function renderSiswaTable(searchQuery = '') {
    const tbody = document.getElementById('siswaTableBody');
    if (!tbody) return;
    
    if (rawStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="px-6 py-8 text-center text-gray-500">Belum ada data siswa.</td></tr>`;
        return;
    }

    const filtered = rawStudents.filter(row => {
        const name = (row['NAMA PESERTA'] || '').toLowerCase();
        const nis = (row['NIS'] || '').toString().toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || nis.includes(q);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="px-6 py-8 text-center text-gray-500">Siswa tidak ditemukan.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach((row, idx) => {
        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-500">${row['NO URUT'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">${row['NIS'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${row['NISN'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${row['NO PESERTA UJIAN'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${row['NO ABSEN'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${row['NAMA PESERTA'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${row['JENIS KELAMIN'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${row['TEMPAT LAHIR'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${row['TANGGAL LAHIR'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${row['NAMA ORANG TUA'] || ''}</td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-center sticky right-0 bg-gray-50">
                    <button onclick="editSiswa('${row['NIS']}')" class="text-blue-600 hover:text-blue-900 mx-1" title="Edit">
                        <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="deleteSiswa('${row['NIS']}')" class="text-red-600 hover:text-red-900 mx-1" title="Hapus">
                        <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function processStats(data) {
    document.getElementById('statTotalSiswa').innerText = rawStudents.length || data.length;

    let totalUs = 0;
    let highest = 0;
    let countUs = 0;

    data.forEach(row => {
        const us = parseFloat(row['Rata-Rata']);
        const akhir = parseFloat(row['NILAI SEKOLAH']);
        
        if (!isNaN(us) && us > 0) {
            totalUs += us;
            countUs++;
        }
        if (!isNaN(akhir) && akhir > highest) {
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
    if (dashboardData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Belum ada data nilai.</td></tr>`;
        return;
    }

    const filtered = dashboardData.filter(row => {
        const name = (row['NAMA SISWA'] || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Data tidak ditemukan.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach((row, idx) => {
        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${idx + 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row['NAMA SISWA']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">${row['RATA-RATA NR'] || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">${row['Rata-Rata'] || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900 bg-gray-50/50">${row['NILAI SEKOLAH'] || '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ==========================================
// INPUT NILAI: STUDENT LIST FETCHING
// ==========================================
function renderStudentsForNilai() {
    const container = document.getElementById('allSubjectsContainer');
    if (!container) return;
    
    if (rawStudents.length === 0) {
        container.innerHTML = '<div class="text-center p-6 text-gray-500 bg-white rounded-xl border border-gray-200">Belum ada data siswa. Input siswa terlebih dahulu.</div>';
        return;
    }

    const subjects = ['PENDIDIKAN AGAMA KRISTEN', 'PKN', 'BAHASA INDONESIA', 'MATEMATIKA', 'IPA', 'IPS', 'SBK', 'PJOK', 'MULOK'];

    // Smart update check
    const existingTables = container.querySelectorAll('.subject-table-wrapper');
    const isSmartUpdate = existingTables.length === subjects.length;

    if (isSmartUpdate) {
        subjects.forEach((subject, subIdx) => {
            const tableWrapper = existingTables[subIdx];
            const tbody = tableWrapper.querySelector('tbody');
            const currentRows = tbody.querySelectorAll('tr');
            
            rawStudents.forEach((row, idx) => {
                const nama = row['NAMA PESERTA'];
                const existingGrade = rawData.find(g => g['NAMA SISWA'] === nama && g['MATA PELAJARAN'] === subject) || {};
                
                const formatVal = (v) => {
                    if (v === '' || v === undefined || v === null) return '';
                    const num = parseFloat(String(v).replace(',', '.'));
                    return isNaN(num) ? '' : num.toFixed(2);
                };

                const tr = currentRows[idx];
                if(!tr) return;
                
                const updateInput = (selector, val) => {
                    const input = tr.querySelector(selector);
                    if (input && input !== document.activeElement) {
                        if (input.value !== val) {
                            input.value = val;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                };
                
                updateInput('.inp-7', formatVal(existingGrade['7']));
                updateInput('.inp-8', formatVal(existingGrade['8']));
                updateInput('.inp-9', formatVal(existingGrade['9']));
                updateInput('.inp-10', formatVal(existingGrade['10']));
                updateInput('.inp-11', formatVal(existingGrade['11']));
                updateInput('.inp-tulis', formatVal(existingGrade['Tulis']));
                updateInput('.inp-praktik', formatVal(existingGrade['Praktik']));
            });
        });
        return;
    }

    let allHtml = '';
    
    subjects.forEach((subject) => {
        let rowsHtml = '';
        rawStudents.forEach((row, idx) => {
            const nama = row['NAMA PESERTA'];
            const no = row['NO URUT'] || (idx + 1);
            const existingGrade = rawData.find(g => g['NAMA SISWA'] === nama && g['MATA PELAJARAN'] === subject) || {};

            const formatVal = (v) => {
                if (v === '' || v === undefined || v === null) return '';
                const num = parseFloat(String(v).replace(',', '.'));
                return isNaN(num) ? '' : num.toFixed(2);
            };

            const v7 = formatVal(existingGrade['7']);
            const v8 = formatVal(existingGrade['8']);
            const v9 = formatVal(existingGrade['9']);
            const v10 = formatVal(existingGrade['10']);
            const v11 = formatVal(existingGrade['11']);
            const vTulis = formatVal(existingGrade['Tulis']);
            const vPrak = formatVal(existingGrade['Praktik']);
            
            rowsHtml += `
                <tr class="hover:bg-blue-50/30 transition-colors">
                    <td class="border border-gray-300 px-2 py-1 text-center text-gray-700 font-medium cell-no">${no}</td>
                    <td class="border border-gray-300 px-3 py-1 font-medium text-gray-900 cell-nama">${nama}</td>
                    
                    <td class="border border-gray-300 p-0"><input type="number" step="0.01" value="${v7}" class="row-calc inp-7 w-full h-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 text-center bg-transparent"></td>
                    <td class="border border-gray-300 p-0"><input type="number" step="0.01" value="${v8}" class="row-calc inp-8 w-full h-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 text-center bg-transparent"></td>
                    <td class="border border-gray-300 p-0"><input type="number" step="0.01" value="${v9}" class="row-calc inp-9 w-full h-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 text-center bg-transparent"></td>
                    <td class="border border-gray-300 p-0"><input type="number" step="0.01" value="${v10}" class="row-calc inp-10 w-full h-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 text-center bg-transparent"></td>
                    <td class="border border-gray-300 p-0"><input type="number" step="0.01" value="${v11}" class="row-calc inp-11 w-full h-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 text-center bg-transparent"></td>
                    
                    <td class="border border-gray-300 p-0 bg-yellow-50"><input type="text" readonly class="out-jml w-full h-full px-1 py-1 border-0 text-center font-medium bg-transparent text-gray-700"></td>
                    <td class="border border-gray-300 p-0 bg-yellow-50"><input type="text" readonly class="out-rata-nr w-full h-full px-1 py-1 border-0 text-center font-medium bg-transparent text-gray-700"></td>
                    <td class="border border-gray-300 p-0 bg-yellow-100"><input type="text" readonly class="out-bobot40 w-full h-full px-1 py-1 border-0 text-center font-bold bg-transparent text-blue-700"></td>
                    
                    <td class="border border-gray-300 p-0"><input type="number" step="0.01" value="${vTulis}" class="row-calc inp-tulis w-full h-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 text-center bg-transparent"></td>
                    <td class="border border-gray-300 p-0"><input type="number" step="0.01" value="${vPrak}" class="row-calc inp-praktik w-full h-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 text-center bg-transparent"></td>
                    
                    <td class="border border-gray-300 p-0 bg-yellow-50"><input type="text" readonly class="out-rata-us w-full h-full px-1 py-1 border-0 text-center font-medium bg-transparent text-gray-700"></td>
                    <td class="border border-gray-300 p-0 bg-yellow-100"><input type="text" readonly class="out-bobot60 w-full h-full px-1 py-1 border-0 text-center font-bold bg-transparent text-purple-700"></td>
                    
                    <td class="border border-gray-300 p-0 bg-yellow-200"><input type="text" readonly class="out-akhir w-full h-full px-1 py-1 border-0 text-center font-bold bg-transparent text-gray-900 text-sm"></td>
                </tr>
            `;
        });
        
        allHtml += `
            <div class="subject-table-wrapper border border-gray-200 rounded-xl overflow-hidden shadow-sm" data-subject="${subject}">
                <div class="bg-blue-50 px-4 py-3 border-b border-gray-200">
                    <h2 class="text-lg font-bold text-blue-800 uppercase flex items-center">
                        <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        ${subject}
                    </h2>
                </div>
                <div class="overflow-x-auto w-full">
                    <table class="w-full text-sm border-collapse border-b border-gray-300 min-w-max">
                        <thead>
                            <tr class="bg-gray-100/80">
                                <th rowspan="2" class="border-b border-r border-gray-300 px-2 py-2 text-center w-10">NO</th>
                                <th rowspan="2" class="border-b border-r border-gray-300 px-4 py-2 min-w-[200px]">NAMA SISWA</th>
                                <th colspan="5" class="border-b border-r border-gray-300 px-4 py-2 text-center">NILAI RAPOR (NR) SEMESTER</th>
                                <th rowspan="2" class="border-b border-r border-gray-300 px-2 py-2 text-center text-xs">JML</th>
                                <th rowspan="2" class="border-b border-r border-gray-300 px-2 py-2 text-center text-xs">RATA-RATA NR</th>
                                <th rowspan="2" class="border-b border-r border-gray-300 px-2 py-2 text-center text-xs">BOBOT 40%</th>
                                <th colspan="2" class="border-b border-r border-gray-300 px-4 py-2 text-center">NILAI UJIAN SEKOLAH</th>
                                <th rowspan="2" class="border-b border-r border-gray-300 px-2 py-2 text-center text-xs">RATA-RATA</th>
                                <th rowspan="2" class="border-b border-r border-gray-300 px-2 py-2 text-center text-xs">BOBOT 60%</th>
                                <th rowspan="2" class="border-b border-gray-300 px-2 py-2 text-center font-bold">NILAI SEKOLAH</th>
                            </tr>
                            <tr class="bg-gray-100/80">
                                <th class="border-b border-r border-gray-300 px-1 py-1 text-center w-14">7</th>
                                <th class="border-b border-r border-gray-300 px-1 py-1 text-center w-14">8</th>
                                <th class="border-b border-r border-gray-300 px-1 py-1 text-center w-14">9</th>
                                <th class="border-b border-r border-gray-300 px-1 py-1 text-center w-14">10</th>
                                <th class="border-b border-r border-gray-300 px-1 py-1 text-center w-14">11</th>
                                <th class="border-b border-r border-gray-300 px-1 py-1 text-center w-16">Tulis</th>
                                <th class="border-b border-r border-gray-300 px-1 py-1 text-center w-16">PRAKTIK</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white">
                            ${rowsHtml}
                        </tbody>
                        <tfoot class="bg-yellow-50 font-semibold border-t-2 border-gray-400">
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = allHtml;
    attachSpreadsheetCalculations();
}

function attachSpreadsheetCalculations() {
    const wrappers = document.querySelectorAll('.subject-table-wrapper');
    
    wrappers.forEach(wrapper => {
        const rows = wrapper.querySelectorAll('tbody tr');
        rows.forEach(tr => {
            const inputs = tr.querySelectorAll('.row-calc');
            inputs.forEach(inp => {
                inp.addEventListener('input', () => {
                    calculateRow(tr);
                    calculateFooter(wrapper);
                });
                inp.addEventListener('change', (e) => {
                    let v = e.target.value;
                    if(v !== '') {
                        if(typeof v === 'string') v = v.replace(',', '.');
                        const num = parseFloat(v);
                        if(!isNaN(num)) e.target.value = num.toFixed(2);
                    }
                });
            });
            // Initial Calculation
            calculateRow(tr);
        });
        calculateFooter(wrapper);
    });
}

function calculateRow(tr) {
    const getVal = (className) => {
        let v = tr.querySelector('.' + className).value;
        if(typeof v === 'string') v = v.replace(',', '.');
        return parseFloat(v) || 0;
    };
    
    const n7 = getVal('inp-7');
    const n8 = getVal('inp-8');
    const n9 = getVal('inp-9');
    const n10 = getVal('inp-10');
    const n11 = getVal('inp-11');
    
    const hasRapor = [7, 8, 9, 10, 11].some(sem => tr.querySelector('.inp-' + sem).value !== '');
    const jml = n7 + n8 + n9 + n10 + n11;
    
    // Assume denominator is always 5 for Rapor
    const rataNr = hasRapor ? (jml / 5) : 0;
    const bobot40 = rataNr * 0.4;
    
    tr.querySelector('.out-jml').value = (n7||n8||n9||n10||n11) ? jml.toFixed(2) : '';
    tr.querySelector('.out-rata-nr').value = rataNr > 0 ? rataNr.toFixed(2) : '';
    tr.querySelector('.out-bobot40').value = bobot40 > 0 ? bobot40.toFixed(2) : '';
    
    const tulis = getVal('inp-tulis');
    const prak = getVal('inp-praktik');
    const hasUs = tr.querySelector('.inp-tulis').value !== '' || tr.querySelector('.inp-praktik').value !== '';
    const rataUs = hasUs ? (tulis + prak) / 2 : 0;
    const bobot60 = rataUs * 0.6;
    
    tr.querySelector('.out-rata-us').value = rataUs > 0 ? rataUs.toFixed(2) : '';
    tr.querySelector('.out-bobot60').value = bobot60 > 0 ? bobot60.toFixed(2) : '';
    
    if (bobot40 > 0 && bobot60 > 0) {
        tr.querySelector('.out-akhir').value = (bobot40 + bobot60).toFixed(2);
    } else {
        tr.querySelector('.out-akhir').value = '';
    }
}

function calculateFooter(wrapper) {
    const tfoot = wrapper.querySelector('tfoot');
    if (!tfoot) return;
    
    const columns = [
        'inp-7', 'inp-8', 'inp-9', 'inp-10', 'inp-11', 'out-jml', 'out-rata-nr', 'out-bobot40',
        'inp-tulis', 'inp-praktik', 'out-rata-us', 'out-bobot60', 'out-akhir'
    ];
    
    const stats = {};
    columns.forEach(c => stats[c] = { sum: 0, min: 99999, max: -99999, count: 0 });
    
    const rows = wrapper.querySelectorAll('tbody tr');
    rows.forEach(tr => {
        columns.forEach(c => {
            const input = tr.querySelector('.' + c);
            if (input && input.value !== '') {
                let v = input.value;
                if(typeof v === 'string') v = v.replace(',', '.');
                const val = parseFloat(v);
                if (!isNaN(val)) {
                    stats[c].sum += val;
                    stats[c].count++;
                    if (val < stats[c].min) stats[c].min = val;
                    if (val > stats[c].max) stats[c].max = val;
                }
            }
        });
    });
    
    const getStat = (col, type) => {
        if (stats[col].count === 0) return '';
        if (type === 'min') return stats[col].min.toFixed(2);
        if (type === 'max') return stats[col].max.toFixed(2);
        if (type === 'avg') return (stats[col].sum / stats[col].count).toFixed(2);
    };
    
    tfoot.innerHTML = `
        <tr>
            <td colspan="2" class="border border-gray-300 px-4 py-2 text-right bg-white">NILAI TERENDAH</td>
            ${columns.map(c => `<td class="border border-gray-300 px-2 py-2 text-center text-red-600 bg-yellow-100/50">${getStat(c, 'min')}</td>`).join('')}
        </tr>
        <tr>
            <td colspan="2" class="border border-gray-300 px-4 py-2 text-right bg-white">NILAI RATA-RATA</td>
            ${columns.map(c => `<td class="border border-gray-300 px-2 py-2 text-center text-blue-600 bg-yellow-100/50">${getStat(c, 'avg')}</td>`).join('')}
        </tr>
        <tr>
            <td colspan="2" class="border border-gray-300 px-4 py-2 text-right bg-white">NILAI TERTINGGI</td>
            ${columns.map(c => `<td class="border border-gray-300 px-2 py-2 text-center text-green-600 bg-yellow-100/50">${getStat(c, 'max')}</td>`).join('')}
        </tr>
    `;
}

// ==========================================
// EXPORT TO EXCEL & PDF
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', async () => {
            const container = document.getElementById('allSubjectsContainer');
            // Cek apakah tabel benar-benar sudah dirender (bukan cuma komentar/kosong)
            if (!container || container.children.length === 0 || container.innerHTML.includes('Belum ada data')) {
                alert("Tidak ada data tabel untuk diekspor ke PDF! Pastikan data nilai sudah tampil.");
                return;
            }
            
            btnExportPDF.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent mr-2"></div> Memproses...';
            btnExportPDF.disabled = true;
            
            try {
                // Initialize jsPDF
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });
                
                const tables = document.querySelectorAll('.subject-table-wrapper');
                
                tables.forEach((wrapper, index) => {
                    if (index > 0) doc.addPage();
                    
                    const subject = wrapper.getAttribute('data-subject');
                    doc.setFontSize(16);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(30, 58, 138); // text-blue-900
                    doc.text(`DATA NILAI MATA PELAJARAN: ${subject}`, 14, 15);
                    
                    // Prepare Head
                    const head = [
                        [
                            { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                            { content: 'NAMA SISWA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                            { content: 'NILAI RAPOR (NR) SEMESTER', colSpan: 5, styles: { halign: 'center' } },
                            { content: 'JML', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                            { content: 'RATA-RATA NR', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                            { content: 'BOBOT 40%', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                            { content: 'NILAI UJIAN SEKOLAH', colSpan: 2, styles: { halign: 'center' } },
                            { content: 'RATA-RATA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                            { content: 'BOBOT 60%', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
                            { content: 'NILAI SEKOLAH', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
                        ],
                        [
                            { content: '7', styles: { halign: 'center' } },
                            { content: '8', styles: { halign: 'center' } },
                            { content: '9', styles: { halign: 'center' } },
                            { content: '10', styles: { halign: 'center' } },
                            { content: '11', styles: { halign: 'center' } },
                            { content: 'Tulis', styles: { halign: 'center' } },
                            { content: 'PRAKTIK', styles: { halign: 'center' } }
                        ]
                    ];
                    
                    // Prepare Body
                    const body = [];
                    const rows = wrapper.querySelectorAll('tbody tr');
                    rows.forEach(tr => {
                        const getVal = (className) => {
                            const el = tr.querySelector('.' + className);
                            if (!el) return '';
                            return (el.tagName === 'INPUT') ? el.value : el.innerText;
                        };
                        
                        body.push([
                            getVal('cell-no'),
                            getVal('cell-nama'),
                            getVal('inp-7'),
                            getVal('inp-8'),
                            getVal('inp-9'),
                            getVal('inp-10'),
                            getVal('inp-11'),
                            getVal('out-jml'),
                            getVal('out-rata-nr'),
                            getVal('out-bobot40'),
                            getVal('inp-tulis'),
                            getVal('inp-praktik'),
                            getVal('out-rata-us'),
                            getVal('out-bobot60'),
                            getVal('out-akhir')
                        ]);
                    });
                    
                    // Prepare Footer
                    const foot = [];
                    const tfootRows = wrapper.querySelectorAll('tfoot tr');
                    tfootRows.forEach(tr => {
                        const rowData = [];
                        const cells = tr.querySelectorAll('td');
                        cells.forEach(td => {
                            let colSpan = parseInt(td.getAttribute('colspan') || '1');
                            let content = td.innerText;
                            let style = {};
                            if (colSpan > 1) {
                                style.halign = 'right';
                            } else {
                                style.halign = 'center';
                                if (td.className.includes('text-red-600')) style.textColor = '#dc2626';
                                else if (td.className.includes('text-blue-600')) style.textColor = '#2563eb';
                                else if (td.className.includes('text-green-600')) style.textColor = '#16a34a';
                            }
                            if(colSpan > 1) {
                                rowData.push({ content: content, colSpan: colSpan, styles: style });
                            } else {
                                rowData.push({ content: content, styles: style });
                            }
                        });
                        foot.push(rowData);
                    });
                    
                    doc.autoTable({
                        startY: 22,
                        head: head,
                        body: body,
                        foot: foot,
                        theme: 'grid',
                        headStyles: { fillColor: '#f3f4f6', textColor: '#374151', lineColor: '#e5e7eb', lineWidth: 0.1 },
                        styles: { font: 'helvetica', fontSize: 10, cellPadding: 2, lineColor: '#e5e7eb', lineWidth: 0.1 },
                        didParseCell: function(data) {
                            if (data.section === 'body' || data.section === 'foot') {
                                const cIndex = data.column.index;
                                if (cIndex === 7 || cIndex === 8 || cIndex === 12) {
                                    data.cell.styles.fillColor = '#fffbeb'; // bg-yellow-50
                                } else if (cIndex === 9) {
                                    data.cell.styles.fillColor = '#fef3c7'; // bg-yellow-100
                                    data.cell.styles.textColor = '#2563eb'; // text-blue-600
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (cIndex === 13) {
                                    data.cell.styles.fillColor = '#fef3c7'; // bg-yellow-100
                                    data.cell.styles.textColor = '#9333ea'; // text-purple-600
                                    data.cell.styles.fontStyle = 'bold';
                                } else if (cIndex === 14) {
                                    data.cell.styles.fillColor = '#fde68a'; // bg-yellow-200
                                    data.cell.styles.fontStyle = 'bold';
                                    data.cell.styles.textColor = '#111827';
                                }
                            }
                        }
                    });
                });
                
                doc.save('Data_Nilai_Sekolah.pdf');
                
            } catch(e) {
                console.error("Gagal export PDF:", e);
                alert("Terjadi kesalahan saat memproses data PDF.");
            }
            
            btnExportPDF.innerHTML = `
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Ekspor PDF
            `;
            btnExportPDF.disabled = false;
        });
    }

    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!dashboardData || dashboardData.length === 0) {
                alert("Belum ada data nilai untuk diekspor!");
                return;
            }

            exportBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div> Mengekspor...';
            exportBtn.disabled = true;

            setTimeout(async () => {
                try {
                    const workbook = new ExcelJS.Workbook();
                    workbook.creator = 'EduGrade';
                    workbook.lastModifiedBy = 'EduGrade';
                    workbook.created = new Date();
                    workbook.modified = new Date();

                    // Fungsi helper untuk style header
                    const styleHeader = (worksheet, endColIndex) => {
                        const row = worksheet.getRow(1);
                        for(let i=1; i<=endColIndex; i++) {
                            const cell = row.getCell(i);
                            cell.font = { bold: true, color: { argb: 'FF000000' } };
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFE5E7EB' } // Gray-200
                            };
                            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                            cell.border = {
                                top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                            };
                        }
                        row.height = 30;
                    };

                    const applyBorders = (worksheet, rowCount, colCount) => {
                        for(let i=2; i<=rowCount; i++) {
                            const row = worksheet.getRow(i);
                            for(let j=1; j<=colCount; j++) {
                                row.getCell(j).border = {
                                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                                };
                            }
                        }
                    };

                    // 1. Sheet 10 Besar Rangking
                    const sortedTop10 = [...dashboardData]
                        .filter(a => parseFloat(a['NILAI SEKOLAH']) > 0)
                        .sort((a, b) => parseFloat(b['NILAI SEKOLAH']) - parseFloat(a['NILAI SEKOLAH']))
                        .slice(0, 10);
                    
                    const wsTop10 = workbook.addWorksheet("10 Besar Rangking");
                    wsTop10.columns = [
                        { header: 'Peringkat', key: 'Peringkat', width: 10 },
                        { header: 'Nama Siswa', key: 'NamaSiswa', width: 30 },
                        { header: 'Rata-rata NR', key: 'RataNR', width: 15 },
                        { header: 'Rata-rata US', key: 'RataUS', width: 15 },
                        { header: 'Nilai Akhir Sekolah', key: 'NilaiAkhir', width: 20 }
                    ];
                    sortedTop10.forEach((item, idx) => {
                        wsTop10.addRow({
                            Peringkat: idx + 1,
                            NamaSiswa: item['NAMA SISWA'],
                            RataNR: item['RATA-RATA NR'],
                            RataUS: item['Rata-Rata'],
                            NilaiAkhir: item['NILAI SEKOLAH']
                        });
                    });
                    styleHeader(wsTop10, 5);
                    applyBorders(wsTop10, sortedTop10.length + 1, 5);

                    // 2. Sheet Rekap Nilai Akhir
                    const sortedRekap = dashboardData
                        .sort((a, b) => a['NAMA SISWA'].localeCompare(b['NAMA SISWA']));
                    const wsRekap = workbook.addWorksheet("Rekap Nilai Akhir");
                    wsRekap.columns = [
                        { header: 'No', key: 'No', width: 10 },
                        { header: 'Nama Siswa', key: 'NamaSiswa', width: 30 },
                        { header: 'Rata-rata NR', key: 'RataNR', width: 15 },
                        { header: 'Rata-rata US', key: 'RataUS', width: 15 },
                        { header: 'Nilai Akhir Sekolah', key: 'NilaiAkhir', width: 20 }
                    ];
                    sortedRekap.forEach((item, idx) => {
                        wsRekap.addRow({
                            No: idx + 1,
                            NamaSiswa: item['NAMA SISWA'],
                            RataNR: item['RATA-RATA NR'],
                            RataUS: item['Rata-Rata'],
                            NilaiAkhir: item['NILAI SEKOLAH']
                        });
                    });
                    styleHeader(wsRekap, 5);
                    applyBorders(wsRekap, sortedRekap.length + 1, 5);

                    // 3. Sheet Per Mata Pelajaran
                    const subjects = ['PENDIDIKAN AGAMA KRISTEN', 'PKN', 'BAHASA INDONESIA', 'MATEMATIKA', 'IPA', 'IPS', 'SBK', 'PJOK', 'MULOK'];
                    
                    subjects.forEach(subject => {
                        // Limit sheet name to 31 chars for Excel compatibility
                        let sheetName = subject;
                        if (sheetName.length > 31) {
                            sheetName = sheetName.substring(0, 31);
                        }
                        const wsSubject = workbook.addWorksheet(sheetName);
                        
                        wsSubject.columns = [
                            { header: 'NO', key: 'NO', width: 5 },
                            { header: 'NAMA SISWA', key: 'NAMA', width: 30 },
                            { header: '7', key: 'S7', width: 8 },
                            { header: '8', key: 'S8', width: 8 },
                            { header: '9', key: 'S9', width: 8 },
                            { header: '10', key: 'S10', width: 8 },
                            { header: '11', key: 'S11', width: 8 },
                            { header: 'JML', key: 'JML', width: 8 },
                            { header: 'RATA-RATA NR', key: 'RATANR', width: 15 },
                            { header: 'BOBOT 40%', key: 'BOBOT40', width: 12 },
                            { header: 'Tulis', key: 'Tulis', width: 8 },
                            { header: 'Praktik', key: 'Praktik', width: 10 },
                            { header: 'Rata-Rata US', key: 'RATAUS', width: 15 },
                            { header: 'BOBOT 60%', key: 'BOBOT60', width: 12 },
                            { header: 'NILAI SEKOLAH', key: 'NILAI', width: 15 }
                        ];

                        rawStudents.forEach((student, idx) => {
                            const nama = student['NAMA PESERTA'];
                            const no = student['NO URUT'] || (idx + 1);
                            const grade = rawData.find(g => g['NAMA SISWA'] === nama && g['MATA PELAJARAN'] === subject) || {};
                            
                            const row = wsSubject.addRow({
                                NO: no,
                                NAMA: nama,
                                S7: grade['7'] || '',
                                S8: grade['8'] || '',
                                S9: grade['9'] || '',
                                S10: grade['10'] || '',
                                S11: grade['11'] || '',
                                JML: grade['JML'] || '',
                                RATANR: grade['RATA-RATA NR'] || '',
                                BOBOT40: grade['BOBOT 40%'] || '',
                                Tulis: grade['Tulis'] || '',
                                Praktik: grade['Praktik'] || '',
                                RATAUS: grade['Rata-Rata'] || '',
                                BOBOT60: grade['BOBOT 60%'] || '',
                                NILAI: grade['NILAI SEKOLAH'] || ''
                            });

                            // Alignment untuk Angka
                            for(let c=3; c<=15; c++) {
                                row.getCell(c).alignment = { horizontal: 'center' };
                            }
                            row.getCell(1).alignment = { horizontal: 'center' };
                            
                            // Style Cells (Warna Kuning) persis seperti antarmuka
                            // JML & Rata-rata NR (Yellow 50)
                            const yellow50 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; // Tailwind yellow-50
                            row.getCell('JML').fill = yellow50;
                            row.getCell('RATANR').fill = yellow50;
                            row.getCell('RATAUS').fill = yellow50;

                            // Bobot 40 & 60 (Yellow 100)
                            const yellow100 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Tailwind yellow-100
                            const bobot40Cell = row.getCell('BOBOT40');
                            bobot40Cell.fill = yellow100;
                            bobot40Cell.font = { bold: true, color: { argb: 'FF1D4ED8' } }; // Blue 700

                            const bobot60Cell = row.getCell('BOBOT60');
                            bobot60Cell.fill = yellow100;
                            bobot60Cell.font = { bold: true, color: { argb: 'FF7E22CE' } }; // Purple 700

                            // Nilai Sekolah (Yellow 200)
                            const yellow200 = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }; // Tailwind yellow-200
                            const nilaiCell = row.getCell('NILAI');
                            nilaiCell.fill = yellow200;
                            nilaiCell.font = { bold: true };

                        });

                        styleHeader(wsSubject, 15);
                        applyBorders(wsSubject, rawStudents.length + 1, 15);
                    });

                    // Generate file and trigger download
                    const buffer = await workbook.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    saveAs(blob, "Data_Nilai_Sekolah.xlsx");
                    
                } catch (e) {
                    console.error("Gagal mengekspor ke Excel", e);
                    alert("Terjadi kesalahan saat mengekspor data ke Excel.");
                }

                exportBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Ekspor ke Excel
                `;
                exportBtn.disabled = false;
            }, 100);
        });
    }
});

// ==========================================
// FITUR IMPORT EXCEL & KALKULATOR RANGKING
// ==========================================

async function downloadTemplate() {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'EduGrade';
        const ws = workbook.addWorksheet('Template Impor Nilai');

        ws.columns = [
            { header: 'No', key: 'No', width: 5 },
            { header: 'NIS', key: 'NIS', width: 15 },
            { header: 'Nama Siswa', key: 'NamaSiswa', width: 35 },
            { header: 'Smt 7', key: 'S7', width: 10 },
            { header: 'Smt 8', key: 'S8', width: 10 },
            { header: 'Smt 9', key: 'S9', width: 10 },
            { header: 'Smt 10', key: 'S10', width: 10 },
            { header: 'Smt 11', key: 'S11', width: 10 },
            { header: 'Tulis', key: 'Tulis', width: 10 },
            { header: 'Praktik', key: 'Praktik', width: 10 }
        ];

        // Style header
        const rowHeader = ws.getRow(1);
        rowHeader.eachCell((cell, colNumber) => {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
            cell.alignment = { horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });

        // Add students
        rawStudents.forEach((student, idx) => {
            const no = student['NO URUT'] || (idx + 1);
            const row = ws.addRow({
                No: no,
                NIS: student['NIS'],
                NamaSiswa: student['NAMA PESERTA']
            });

            // Lock columns A, B, C visually
            const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
            row.getCell('No').fill = grayFill;
            row.getCell('NIS').fill = grayFill;
            row.getCell('NamaSiswa').fill = grayFill;

            for(let c=1; c<=10; c++) {
                row.getCell(c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                if (c > 3) row.getCell(c).alignment = { horizontal: 'center' };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, "Format_Import_Kalkulator.xlsx");

    } catch (e) {
        console.error(e);
        alert('Gagal membuat template excel.');
    }
}

async function downloadTemplateNilai() {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'EduGrade';
        
        const subjects = ['PENDIDIKAN AGAMA KRISTEN', 'PKN', 'BAHASA INDONESIA', 'MATEMATIKA', 'IPA', 'IPS', 'SBK', 'PJOK', 'MULOK'];
        
        subjects.forEach(subject => {
            const sheetName = subject.substring(0, 31); // Excel worksheet names can't exceed 31 chars
            const ws = workbook.addWorksheet(sheetName);

            ws.columns = [
                { header: 'No', key: 'No', width: 5 },
                { header: 'NIS', key: 'NIS', width: 15 },
                { header: 'Nama Siswa', key: 'NamaSiswa', width: 35 },
                { header: 'Smt 7', key: 'S7', width: 10 },
                { header: 'Smt 8', key: 'S8', width: 10 },
                { header: 'Smt 9', key: 'S9', width: 10 },
                { header: 'Smt 10', key: 'S10', width: 10 },
                { header: 'Smt 11', key: 'S11', width: 10 },
                { header: 'Tulis', key: 'Tulis', width: 10 },
                { header: 'Praktik', key: 'Praktik', width: 10 }
            ];

            // Style header
            const rowHeader = ws.getRow(1);
            rowHeader.eachCell((cell, colNumber) => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
                cell.alignment = { horizontal: 'center' };
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });

            // Add students
            rawStudents.forEach((student, idx) => {
                const no = student['NO URUT'] || (idx + 1);
                const row = ws.addRow({
                    No: no,
                    NIS: student['NIS'],
                    NamaSiswa: student['NAMA PESERTA']
                });

                // Lock columns A, B, C visually
                const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
                row.getCell('No').fill = grayFill;
                row.getCell('NIS').fill = grayFill;
                row.getCell('NamaSiswa').fill = grayFill;

                for(let c=1; c<=10; c++) {
                    row.getCell(c).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    if (c > 3) {
                        row.getCell(c).alignment = { horizontal: 'center' };
                        row.getCell(c).numFmt = '0.00'; // Format number in Excel so users can type comma or dot easily
                    }
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, "Template_Import_Nilai_Semua_Mapel.xlsx");

    } catch (e) {
        console.error(e);
        alert('Gagal membuat template excel nilai.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Tombol Template
    const btnTpl1 = document.getElementById('btnDownloadTemplate1');
    const btnTpl2 = document.getElementById('btnDownloadTemplate2');
    if(btnTpl1) btnTpl1.addEventListener('click', downloadTemplateNilai);
    if(btnTpl2) btnTpl2.addEventListener('click', downloadTemplate);

    // Hapus event listener Kalkulator Lama (sudah dirombak menjadi otomatis)
    const refreshCalcBtn = document.getElementById('refreshKalkulatorBtn');
    if (refreshCalcBtn) {
        refreshCalcBtn.addEventListener('click', () => {
            renderKalkulatorRangking();
        });
    }

    // Import Excel ke Input Nilai (Tersimpan)
    const inputImport = document.getElementById('inputImportFile');
    if(inputImport) {
        inputImport.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if(isSyncing) {
                alert("Mohon tunggu, sedang ada proses sinkronisasi di latar belakang!");
                inputImport.value = '';
                return;
            }

            try {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(arrayBuffer);
                let updateCount = 0;

                const validSubjects = ['PENDIDIKAN AGAMA KRISTEN', 'PKN', 'BAHASA INDONESIA', 'MATEMATIKA', 'IPA', 'IPS', 'SBK', 'PJOK', 'MULOK'];

                workbook.worksheets.forEach(ws => {
                    const sheetName = ws.name.toUpperCase();
                    let subject = validSubjects.find(s => sheetName === s || sheetName.substring(0,31) === s.substring(0,31));
                    
                    if (!subject) return; // Ignore irrelevant sheets

                    let colNama = 3, colNis = 2;
                    let colS7 = 4, colS8 = 5, colS9 = 6, colS10 = 7, colS11 = 8;
                    let colTulis = 9, colPrak = 10;
                    
                    const headerRow = ws.getRow(1);
                    if (headerRow) {
                        headerRow.eachCell((cell, colNumber) => {
                            const val = String(cell.value).toUpperCase();
                            if(val.includes('NAMA')) colNama = colNumber;
                            else if(val === 'NIS') colNis = colNumber;
                            else if(val === '7' || val.includes('SMT 7')) colS7 = colNumber;
                            else if(val === '8' || val.includes('SMT 8')) colS8 = colNumber;
                            else if(val === '9' || val.includes('SMT 9')) colS9 = colNumber;
                            else if(val === '10' || val.includes('SMT 10')) colS10 = colNumber;
                            else if(val === '11' || val.includes('SMT 11')) colS11 = colNumber;
                            else if(val.includes('TULIS')) colTulis = colNumber;
                            else if(val.includes('PRAKTIK')) colPrak = colNumber;
                        });
                    }

                    ws.eachRow((row, rowNumber) => {
                        if(rowNumber === 1) return;
                        
                        const nama = row.getCell(colNama).value;
                        const nis = row.getCell(colNis).value;

                        if(!nama && !nis) return;

                        const getVal = (col) => {
                            let val = row.getCell(col).value;
                            if(typeof val === 'object' && val !== null) val = val.result || val.text || '';
                            if(typeof val === 'string') val = val.replace(',', '.');
                            const parsed = parseFloat(val);
                            return isNaN(parsed) ? '' : parsed;
                        };

                        let grade = rawData.find(g => (g['NAMA SISWA'] === nama || (nis && g['NIS'] === nis)) && g['MATA PELAJARAN'] === subject);
                        
                        if(!grade) {
                            grade = {
                                'NAMA SISWA': nama || '',
                                'NIS': nis || '',
                                'MATA PELAJARAN': subject
                            };
                            rawData.push(grade);
                        }

                        grade['7'] = getVal(colS7);
                        grade['8'] = getVal(colS8);
                        grade['9'] = getVal(colS9);
                        grade['10'] = getVal(colS10);
                        grade['11'] = getVal(colS11);
                        grade['Tulis'] = getVal(colTulis);
                        grade['Praktik'] = getVal(colPrak);
                        
                        // Kalkulasi otomatis
                        const parseSafe = (v) => {
                            if(typeof v === 'string') v = v.replace(',', '.');
                            const parsed = parseFloat(v);
                            return isNaN(parsed) ? 0 : parsed;
                        };
                        const s7 = parseSafe(grade['7']);
                        const s8 = parseSafe(grade['8']);
                        const s9 = parseSafe(grade['9']);
                        const s10 = parseSafe(grade['10']);
                        const s11 = parseSafe(grade['11']);
                        const tulis = parseSafe(grade['Tulis']);
                        const praktik = parseSafe(grade['Praktik']);

                        const jml = s7+s8+s9+s10+s11;
                        const ratanr = jml/5;
                        const bobot40 = ratanr * 0.4;
                        const rataus = (tulis+praktik)/2;
                        const bobot60 = rataus * 0.6;
                        const na = bobot40 + bobot60;

                        grade['JML'] = jml;
                        grade['RATA-RATA NR'] = ratanr;
                        grade['BOBOT 40%'] = bobot40;
                        grade['Rata-Rata'] = rataus;
                        grade['BOBOT 60%'] = bobot60;
                        grade['NILAI SEKOLAH'] = na;

                        updateCount++;
                    });
                });

                if(updateCount > 0) {
                    renderStudentsForNilai();
                    alert(`${updateCount} data nilai dari seluruh sheet berhasil diimpor! Data sedang disimpan ke cloud...`);
                    const batchSaveBtn = document.getElementById('batchSaveBtn');
                    if (batchSaveBtn) {
                        batchSaveBtn.click();
                    }
                }

            } catch (err) {
                console.error("Kesalahan Import Excel: ", err);
                alert("Gagal membaca file excel untuk diimpor!");
            }
            
            inputImport.value = '';
        });
    }
});

// ==========================================
// LOGIKA KALKULATOR RANGKING OTOMATIS
// ==========================================
function renderKalkulatorRangking() {
    const tbody = document.getElementById('kalkulatorTableBody');
    const container = document.getElementById('kalkulatorResult');
    if (!tbody || !container) return;

    if (!dashboardData || dashboardData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">Belum ada data nilai. Silakan Sinkronisasi Data terlebih dahulu.</td></tr>`;
        container.classList.remove('hidden');
        return;
    }

    // Sort by Nilai Akhir descending
    const sortedData = [...dashboardData]
        .filter(a => parseFloat(a['NILAI SEKOLAH']) > 0)
        .sort((a, b) => parseFloat(b['NILAI SEKOLAH']) - parseFloat(a['NILAI SEKOLAH']))
        .slice(0, 10);

    if (sortedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">Data nilai masih kosong atau bernilai 0.</td></tr>`;
        container.classList.remove('hidden');
        return;
    }

    const generateDescription = (student, rank) => {
        const nama = student['NAMA SISWA'];
        const na = parseFloat(student['NILAI SEKOLAH']).toFixed(2);
        const us = parseFloat(student['Rata-Rata']).toFixed(2);
        const nr = parseFloat(student['RATA-RATA NR']).toFixed(2);
        const diff = Math.abs(us - nr).toFixed(2);
        
        let desc = "";
        
        if (rank === 1) {
            desc = `Luar biasa! <b>${nama}</b> berhasil menduduki peringkat <b>PERTAMA</b> dengan Nilai Akhir <b>${na}</b>. `;
            if (us > nr) {
                desc += `Pencapaian ini sangat dipengaruhi oleh lonjakan pada Ujian Sekolah (Rata-rata <b>${us}</b>) yang mengungguli nilai rapor hariannya (<b>${nr}</b>), membuktikan kesiapan puncaknya dalam menghadapi evaluasi akhir.`;
            } else {
                desc += `Konsistensi belajarnya terbukti dari tingginya Nilai Rapor (<b>${nr}</b>) yang menjadi fondasi kuat, dilengkapi dengan hasil Ujian Sekolah yang sangat memuaskan (<b>${us}</b>).`;
            }
        } else if (rank === 2 || rank === 3) {
            desc = `<b>${nama}</b> mengamankan posisi ke-${rank} dengan Nilai Akhir <b>${na}</b>. `;
            desc += `Selisih performa antara rata-rata ujian sekolah (<b>${us}</b>) dan rapor (<b>${nr}</b>) hanya sebesar ${diff} poin. Ini adalah hasil yang sangat luar biasa dan kompetitif di jajaran papan atas.`;
        } else {
            desc = `Masuk dalam jajaran elit 10 Besar, <b>${nama}</b> meraih peringkat ke-${rank} berkat perolehan Nilai Akhir <b>${na}</b>. `;
            if (us >= 85) {
                desc += `Kekuatan utamanya ada pada performa Rata-rata Ujian Sekolah yang tinggi (<b>${us}</b>), menutupi sedikit kekurangan pada bobot rapornya (<b>${nr}</b>).`;
            } else if (nr >= 85) {
                desc += `Pondasi Rata-rata Rapor (NR) yang sangat baik secara akumulatif (<b>${nr}</b>) berhasil menopang nilai akhir kuatnya meskipun nilai Ujian Sekolahnya berada di angka <b>${us}</b>.`;
            } else {
                desc += `Performa yang sangat seimbang antara rapor harian (<b>${nr}</b>) dan ujian sekolah (<b>${us}</b>) membuatnya sukses mempertahankan posisi tangguh di 10 besar sekolah.`;
            }
        }
        
        return desc;
    };

    tbody.innerHTML = sortedData.map((item, idx) => `
        <tr class="hover:bg-blue-50/20 transition-colors">
            <td class="px-4 py-4 text-center">
                <span class="inline-flex items-center justify-center w-10 h-10 rounded-full ${idx === 0 ? 'bg-yellow-400 text-white shadow-md ring-4 ring-yellow-100' : idx === 1 ? 'bg-gray-300 text-gray-800 shadow-sm ring-4 ring-gray-100' : idx === 2 ? 'bg-amber-600 text-white shadow-sm ring-4 ring-amber-100' : 'bg-gray-100 text-gray-700 font-semibold'} text-lg">
                    ${idx + 1}
                </span>
            </td>
            <td class="px-4 py-4 font-bold text-gray-900 text-base">${item['NAMA SISWA']}</td>
            <td class="px-4 py-4 bg-yellow-50/50 text-center text-xl font-black text-gray-900 border-x border-yellow-100">${parseFloat(item['NILAI SEKOLAH']).toFixed(2)}</td>
            <td class="px-4 py-4 text-gray-700 leading-relaxed text-justify text-sm">${generateDescription(item, idx + 1)}</td>
        </tr>
    `).join('');

    container.classList.remove('hidden');
}
