const supabaseUrl = 'https://dswcrpiyqrusepzvmziv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzd2NycGl5cXJ1c2VwenZteml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTY3NjUsImV4cCI6MjA5NTgzMjc2NX0.Kbl0IXpX6KBVYqPvRDl41092iMH7dbG85AnPf6tU5KQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Helper function to map Supabase student data to legacy Google Sheets format
const mapStudentToLegacy = (row) => ({
    'NO URUT': row.no_urut || '',
    'NIS': row.nis || '',
    'NISN': row.nisn || '',
    'NO PESERTA UJIAN': row.no_peserta_ujian || '',
    'NO ABSEN': row.no_absen || '',
    'NAMA PESERTA': row.nama_peserta || '',
    'JENIS KELAMIN': row.jenis_kelamin || '',
    'TEMPAT LAHIR': row.tempat_lahir || '',
    'TANGGAL LAHIR': row.tanggal_lahir || '',
    'NAMA ORANG TUA': row.nama_orang_tua || ''
});

// Helper function to map legacy student format to Supabase data
const mapLegacyToStudent = (data) => ({
    no_urut: data['NO URUT'] ? parseInt(data['NO URUT']) : null,
    nis: String(data['NIS']),
    nisn: String(data['NISN'] || ''),
    no_peserta_ujian: String(data['NO PESERTA UJIAN'] || ''),
    no_absen: String(data['NO ABSEN'] || ''),
    nama_peserta: String(data['NAMA PESERTA']),
    jenis_kelamin: String(data['JENIS KELAMIN'] || ''),
    tempat_lahir: String(data['TEMPAT LAHIR'] || ''),
    tanggal_lahir: data['TANGGAL LAHIR'] ? new Date(data['TANGGAL LAHIR']).toISOString().split('T')[0] : null,
    nama_orang_tua: String(data['NAMA ORANG TUA'] || '')
});

// Helper function to map Supabase grade data to legacy format
const mapGradeToLegacy = (row) => ({
    'NAMA SISWA': row.nama_siswa || '',
    'MATA PELAJARAN': row.mata_pelajaran || '',
    '7': row.sem_7 !== null ? row.sem_7 : '',
    '8': row.sem_8 !== null ? row.sem_8 : '',
    '9': row.sem_9 !== null ? row.sem_9 : '',
    '10': row.sem_10 !== null ? row.sem_10 : '',
    '11': row.sem_11 !== null ? row.sem_11 : '',
    'Tulis': row.tulis !== null ? row.tulis : '',
    'Praktik': row.praktik !== null ? row.praktik : '',
    'Sikap': row.sikap || '',
    'RATA-RATA NR': row.rata_rata_nr !== null ? row.rata_rata_nr : '',
    'Rata-Rata': row.rata_rata_us !== null ? row.rata_rata_us : '',
    'NILAI SEKOLAH': row.nilai_sekolah !== null ? row.nilai_sekolah : ''
});

// Helper function to map legacy grade data to Supabase format
const mapLegacyToGrade = (data, nis) => ({
    nis: String(nis),
    nama_siswa: String(data['NAMA SISWA']),
    mata_pelajaran: String(data['MATA PELAJARAN']),
    sem_7: data['7'] !== '' ? parseFloat(String(data['7']).replace(',','.')) : null,
    sem_8: data['8'] !== '' ? parseFloat(String(data['8']).replace(',','.')) : null,
    sem_9: data['9'] !== '' ? parseFloat(String(data['9']).replace(',','.')) : null,
    sem_10: data['10'] !== '' ? parseFloat(String(data['10']).replace(',','.')) : null,
    sem_11: data['11'] !== '' ? parseFloat(String(data['11']).replace(',','.')) : null,
    tulis: data['Tulis'] !== '' ? parseFloat(String(data['Tulis']).replace(',','.')) : null,
    praktik: data['Praktik'] !== '' ? parseFloat(String(data['Praktik']).replace(',','.')) : null,
    sikap: String(data['Sikap'] || ''),
    rata_rata_nr: data['RATA-RATA NR'] !== '' ? parseFloat(String(data['RATA-RATA NR']).replace(',','.')) : null,
    rata_rata_us: data['Rata-Rata'] !== '' ? parseFloat(String(data['Rata-Rata']).replace(',','.')) : null,
    nilai_sekolah: data['NILAI SEKOLAH'] !== '' ? parseFloat(String(data['NILAI SEKOLAH']).replace(',','.')) : null
});

export const api = {
    login: async (username, password) => {
        // We will mock login for now, or use Supabase Auth later.
        // For simplicity, let's keep the hardcoded admin login or query a hypothetical users table.
        // In the interest of keeping it working immediately, we will use hardcoded or simple auth.
        if (username === 'admin' && password === 'admin') {
            return { success: true, token: 'dummy_token_' + new Date().getTime() };
        }
        
        // Coba autentikasi menggunakan Supabase Auth jika ada
        const { data, error } = await supabase.auth.signInWithPassword({
            email: username,
            password: password,
        });

        if (error) {
            return { error: 'Username atau password salah.' };
        }
        return { success: true, token: data.session.access_token };
    },

    getStudents: async () => {
        try {
            const { data, error } = await supabase.from('students').select('*').order('no_urut', { ascending: true });
            if (error) throw error;
            return { data: data.map(mapStudentToLegacy) };
        } catch (err) {
            console.error('getStudents error:', err);
            return { error: err.message };
        }
    },

    getGrades: async () => {
        try {
            const { data, error } = await supabase.from('grades').select('*');
            if (error) throw error;
            return { data: data.map(mapGradeToLegacy) };
        } catch (err) {
            console.error('getGrades error:', err);
            return { error: err.message };
        }
    },

    saveStudent: async (data) => {
        try {
            const sbData = mapLegacyToStudent(data);
            const { error } = await supabase.from('students').upsert(sbData, { onConflict: 'nis' });
            if (error) throw error;
            return { success: true, message: 'Data berhasil disimpan' };
        } catch (err) {
            console.error('saveStudent error:', err);
            return { error: err.message };
        }
    },

    saveStudentsBatch: async (dataArray) => {
        try {
            const sbDataArray = dataArray.map(mapLegacyToStudent);
            if (sbDataArray.length === 0) return { success: true };
            const { error } = await supabase.from('students').upsert(sbDataArray, { onConflict: 'nis' });
            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('saveStudentsBatch error:', err);
            return { error: err.message };
        }
    },

    deleteStudent: async (data) => {
        try {
            const { error } = await supabase.from('students').delete().eq('nis', String(data.NIS));
            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('deleteStudent error:', err);
            return { error: err.message };
        }
    },

    saveGrade: async (data) => {
        try {
            // Find NIS first
            const { data: stdData, error: stdError } = await supabase.from('students').select('nis').eq('nama_peserta', data['NAMA SISWA']).single();
            if (stdError) throw stdError;
            
            const sbData = mapLegacyToGrade(data, stdData.nis);
            const { error } = await supabase.from('grades').upsert(sbData, { onConflict: 'nis, mata_pelajaran' });
            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('saveGrade error:', err);
            return { error: err.message };
        }
    },

    saveGradesBatch: async (dataArray) => {
        try {
            // We need to fetch all students to map nama_siswa to nis
            const { data: stdList, error: stdError } = await supabase.from('students').select('nis, nama_peserta');
            if (stdError) throw stdError;
            
            const stdMap = {};
            stdList.forEach(s => stdMap[s.nama_peserta] = s.nis);

            const sbDataArray = dataArray.map(data => {
                const nis = stdMap[data['NAMA SISWA']];
                if(!nis) return null;
                return mapLegacyToGrade(data, nis);
            }).filter(Boolean);

            if (sbDataArray.length === 0) return { success: true };

            const { error } = await supabase.from('grades').upsert(sbDataArray, { onConflict: 'nis, mata_pelajaran' });
            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('saveGradesBatch error:', err);
            return { error: err.message };
        }
    },

    subscribeRealtime: (callback) => {
        supabase.channel('edugrade-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => callback())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, () => callback())
            .subscribe();
    }
};
