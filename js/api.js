const API_URL = 'https://script.google.com/macros/s/AKfycby_IX4ApDd9dfRkbt6LSodLRnq_1WtMGoGdXwBzIi4hHhAC5i54M0_N8HPV7UY4C4MZTA/exec';

async function fetchAPI(action, method = 'GET', data = null) {
  if (API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
    alert("Harap masukkan URL Web App Google Apps Script Anda di js/api.js");
    return null;
  }

  let url = `${API_URL}?action=${action}`;
  let options = {
    method: method,
  };

  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
    // Kita tidak menset Content-Type ke application/json agar tidak memicu preflight OPTIONS
    // Fetch secara default menggunakan text/plain jika body adalah string, yang aman dari CORS preflight.
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error fetching ${action}:`, error);
    alert(`Terjadi kesalahan jaringan atau CORS saat mengakses ${action}. Periksa console.`);
    return null;
  }
}

export const api = {
  login: (username, password) => fetchAPI('login', 'POST', { username, password }),
  getStudents: () => fetchAPI('getStudents'),
  getGrades: () => fetchAPI('getGrades'),
  saveStudent: (data) => fetchAPI('saveStudent', 'POST', data),
  saveGrade: (data) => fetchAPI('saveGrade', 'POST', data),
  saveGradesBatch: (data) => fetchAPI('saveGradesBatch', 'POST', data)
};
