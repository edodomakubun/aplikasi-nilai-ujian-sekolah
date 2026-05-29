import { api } from './api.js';

let gradesData = [];

document.addEventListener('DOMContentLoaded', async () => {
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
        // Load data on start
        loadDashboardData();
    }

    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = gradesData.filter(student => 
                (student['NAMA SISWA'] || '').toLowerCase().includes(query)
            );
            renderTable(filtered);
        });
    }
});

async function loadDashboardData() {
    const loader = document.getElementById('loader');
    const dashboardContent = document.getElementById('dashboardContent');
    
    loader.classList.remove('hidden');
    dashboardContent.classList.add('opacity-50', 'pointer-events-none');

    const result = await api.getGrades();
    
    loader.classList.add('hidden');
    dashboardContent.classList.remove('opacity-50', 'pointer-events-none');

    if (result && result.data) {
        gradesData = result.data;
        updateStats();
        renderRanking();
        renderTable(gradesData);
    } else {
        document.getElementById('gradesTableBody').innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Gagal memuat data. Periksa konfigurasi API.</td></tr>`;
    }
}

function updateStats() {
    if(gradesData.length === 0) return;

    let totalSiswa = gradesData.length;
    
    let sumUS = 0;
    let maxNilaiSekolah = 0;
    let validUSCount = 0;

    gradesData.forEach(student => {
        let us = parseFloat(student['Rata-Rata']) || 0; // Rata-Rata US
        if(us > 0) {
            sumUS += us;
            validUSCount++;
        }

        let nilaiSekolah = parseFloat(student['NILAI SEKOLAH']) || 0;
        if(nilaiSekolah > maxNilaiSekolah) {
            maxNilaiSekolah = nilaiSekolah;
        }
    });

    let rataRataUS = validUSCount > 0 ? (sumUS / validUSCount) : 0;

    document.getElementById('statTotalSiswa').innerText = totalSiswa;
    document.getElementById('statRataRata').innerText = rataRataUS > 0 ? rataRataUS.toFixed(2) : '-';
    document.getElementById('statTertinggi').innerText = maxNilaiSekolah > 0 ? maxNilaiSekolah.toFixed(2) : '-';
}

function renderRanking() {
    const rankingList = document.getElementById('rankingList');
    
    // Sort descending by NILAI SEKOLAH
    const sorted = [...gradesData].sort((a, b) => {
        let valA = parseFloat(a['NILAI SEKOLAH']) || 0;
        let valB = parseFloat(b['NILAI SEKOLAH']) || 0;
        return valB - valA;
    });

    // Top 10
    const top10 = sorted.slice(0, 10);
    
    rankingList.innerHTML = '';
    
    if (top10.length === 0) {
        rankingList.innerHTML = '<li class="p-6 text-center text-gray-500 text-sm">Belum ada data.</li>';
        return;
    }

    top10.forEach((student, index) => {
        let nilai = parseFloat(student['NILAI SEKOLAH']) || 0;
        
        let rankBadge = '';
        if(index === 0) rankBadge = '<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 font-bold text-sm shadow-sm">1</span>';
        else if(index === 1) rankBadge = '<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-600 font-bold text-sm shadow-sm">2</span>';
        else if(index === 2) rankBadge = '<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm shadow-sm">3</span>';
        else rankBadge = `<span class="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold text-sm">${index + 1}</span>`;

        let li = document.createElement('li');
        li.className = 'px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors';
        li.innerHTML = `
            <div class="flex items-center">
                ${rankBadge}
                <div class="ml-4">
                    <p class="text-sm font-semibold text-gray-900">${student['NAMA SISWA'] || 'Tanpa Nama'}</p>
                </div>
            </div>
            <div class="text-right">
                <span class="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">${nilai > 0 ? nilai.toFixed(2) : '-'}</span>
            </div>
        `;
        rankingList.appendChild(li);
    });
}

function renderTable(data) {
    const tableBody = document.getElementById('gradesTableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Tidak ada data ditemukan.</td></tr>`;
        return;
    }

    data.forEach(student => {
        let rataNR = parseFloat(student['RATA-RATA NR']) || 0;
        let rataUS = parseFloat(student['Rata-Rata']) || 0;
        let nilaiSekolah = parseFloat(student['NILAI SEKOLAH']) || 0;

        let tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50/30 transition-colors';
        tr.innerHTML = `
            <td class="px-6 py-4 text-gray-500">${student['NO'] || '-'}</td>
            <td class="px-6 py-4 font-medium text-gray-900">${student['NAMA SISWA'] || '-'}</td>
            <td class="px-6 py-4 text-center text-gray-600">${rataNR > 0 ? rataNR.toFixed(2) : '-'}</td>
            <td class="px-6 py-4 text-center text-gray-600">${rataUS > 0 ? rataUS.toFixed(2) : '-'}</td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    ${nilaiSekolah > 0 ? nilaiSekolah.toFixed(2) : '-'}
                </span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
