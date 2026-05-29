import { api } from './api.js';
import { logout, checkAuth } from './auth.js';

let rawData = [];
let rawStudents = [];
let dashboardData = [];
let currentSubject = 'PENDIDIKAN AGAMA KRISTEN';

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

    // Subject Tabs Event Listener
    document.querySelectorAll('.mapel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mapel-btn').forEach(b => {
                b.classList.remove('active-mapel', 'border-blue-200', 'bg-blue-50', 'text-blue-700');
                b.classList.add('border-gray-200', 'bg-white', 'text-gray-600');
            });
            e.target.classList.remove('border-gray-200', 'bg-white', 'text-gray-600');
            e.target.classList.add('active-mapel', 'border-blue-200', 'bg-blue-50', 'text-blue-700');
            currentSubject = e.target.getAttribute('data-mapel');
            renderStudentsForNilai();
        });
    });

    // Batch Save Button
    const batchSaveBtn = document.getElementById('batchSaveBtn');
    if (batchSaveBtn) {
        batchSaveBtn.addEventListener('click', async () => {
            const btn = batchSaveBtn;
            const msg = document.getElementById('batchSaveStatus');
            
            // Kumpulkan semua data dari tabel
            const batchData = [];
            const rows = document.querySelectorAll('#spreadsheetBody tr');
            rows.forEach(tr => {
                const inputs = tr.querySelectorAll('input');
                if (inputs.length === 0) return; // ignore loading row or empty
                
                const getVal = (className) => {
                    const el = tr.querySelector('.' + className);
                    return el ? el.value : '';
                };

                const data = {
                    'MATA PELAJARAN': currentSubject,
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
                
                // Pastikan ada isinya (jika semua kosong tidak usah di-save)
                if (data['7'] || data['8'] || data['9'] || data['10'] || data['11'] || data['Tulis'] || data['Praktik']) {
                    batchData.push(data);
                }
            });

            if (batchData.length === 0) {
                msg.innerHTML = '<span class="text-red-500">Tidak ada data untuk disimpan.</span>';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = 'Menyimpan...';
            msg.innerHTML = '<span class="text-blue-500">Sedang menyimpan data...</span>';

            const result = await api.saveGradesBatch(batchData);

            btn.disabled = false;
            btn.innerHTML = 'SIMPAN SELURUH NILAI';

            if (result && result.success) {
                msg.innerHTML = '<span class="text-green-600">Berhasil: ' + result.message + '</span>';
                syncData(); // background sync
            } else {
                msg.innerHTML = '<span class="text-red-500">Gagal: ' + (result ? result.error : "Kesalahan server") + '</span>';
            }
            
            setTimeout(() => { msg.innerHTML = ''; }, 3000);
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
        const [studentsResult, gradesResult] = await Promise.all([
            api.getStudents(),
            api.getGrades()
        ]);
        
        if (studentsResult && !studentsResult.error) {
            rawStudents = studentsResult.data || [];
        }
        
        if (gradesResult && !gradesResult.error) {
            rawData = gradesResult.data || [];
            
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
    }
}

function renderSiswaTable(searchQuery = '') {
    const tbody = document.getElementById('siswaTableBody');
    if (!tbody) return;
    
    if (rawStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Belum ada data siswa.</td></tr>`;
        return;
    }

    const filtered = rawStudents.filter(row => {
        const name = (row['NAMA PESERTA'] || '').toLowerCase();
        const nis = (row['NIS'] || '').toString().toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || nis.includes(q);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Siswa tidak ditemukan.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach((row, idx) => {
        html += `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${row['NO URUT']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${row['NIS']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row['NAMA PESERTA']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${row['JENIS KELAMIN']}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button onclick="editSiswa('${row['NIS']}')" class="text-blue-600 hover:text-blue-900 mx-2" title="Edit">
                        <svg class="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="deleteSiswa('${row['NIS']}')" class="text-red-600 hover:text-red-900 mx-2" title="Hapus">
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
    const tbody = document.getElementById('spreadsheetBody');
    if (!tbody) return;
    
    if (rawStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="text-center p-6 text-gray-500">Belum ada data siswa. Input siswa terlebih dahulu.</td></tr>';
        return;
    }

    let html = '';
    rawStudents.forEach((row, idx) => {
        const nama = row['NAMA PESERTA'];
        const no = row['NO URUT'] || (idx + 1);
        
        // Find existing grade for this subject
        const existingGrade = rawData.find(g => g['NAMA SISWA'] === nama && g['MATA PELAJARAN'] === currentSubject) || {};

        const v7 = existingGrade['7'] || '';
        const v8 = existingGrade['8'] || '';
        const v9 = existingGrade['9'] || '';
        const v10 = existingGrade['10'] || '';
        const v11 = existingGrade['11'] || '';
        const vTulis = existingGrade['Tulis'] || '';
        const vPrak = existingGrade['Praktik'] || '';
        
        html += `
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
    tbody.innerHTML = html;
    
    // Attach event listeners for calculations
    attachSpreadsheetCalculations();
}

function attachSpreadsheetCalculations() {
    const rows = document.querySelectorAll('#spreadsheetBody tr');
    
    rows.forEach(tr => {
        const inputs = tr.querySelectorAll('.row-calc');
        inputs.forEach(inp => {
            inp.addEventListener('input', () => {
                calculateRow(tr);
                calculateFooter();
            });
        });
        
        // Initial Calculation
        calculateRow(tr);
    });
    
    calculateFooter();
}

function calculateRow(tr) {
    const getVal = (className) => parseFloat(tr.querySelector('.' + className).value) || 0;
    
    const n7 = getVal('inp-7');
    const n8 = getVal('inp-8');
    const n9 = getVal('inp-9');
    const n10 = getVal('inp-10');
    const n11 = getVal('inp-11');
    
    const hasRapor = [7, 8, 9, 10, 11].some(sem => tr.querySelector('.inp-' + sem).value !== '');
    const jml = n7 + n8 + n9 + n10 + n11;
    
    // Assume denominator is always 5 for Rapor based on screenshot
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

function calculateFooter() {
    const tfoot = document.getElementById('spreadsheetFooter');
    if (!tfoot) return;
    
    const columns = [
        'inp-7', 'inp-8', 'inp-9', 'inp-10', 'inp-11', 'out-jml', 'out-rata-nr', 'out-bobot40',
        'inp-tulis', 'inp-praktik', 'out-rata-us', 'out-bobot60', 'out-akhir'
    ];
    
    const stats = {};
    columns.forEach(c => stats[c] = { sum: 0, min: 99999, max: -99999, count: 0 });
    
    const rows = document.querySelectorAll('#spreadsheetBody tr');
    rows.forEach(tr => {
        columns.forEach(c => {
            const input = tr.querySelector('.' + c);
            if (input && input.value !== '') {
                const val = parseFloat(input.value);
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
