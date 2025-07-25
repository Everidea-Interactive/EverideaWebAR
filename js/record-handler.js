// === DEBUG ALERT PALING AWAL: Pastikan file JS terload ===
alert("DEBUG: record-handler.js dimuat.");
// ========================================================

// Biarkan variabel global tetap ada, tapi tanpa inisialisasi kompleks
let recordButton; 
let statusMessage; 

// Fungsi dummy untuk mencegah error jika dipanggil
function setRecordButtonState(enabled, text) {
    if (recordButton) {
        recordButton.disabled = !enabled;
        recordButton.textContent = text;
    }
}
function showStatus(message, duration = null) {
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
    }
}

// Handler DOMContentLoaded utama
document.addEventListener('DOMContentLoaded', () => {
    alert("DEBUG: DOMContentLoaded terpicu."); // Debugging DOMContentLoaded

    // Ambil elemen tombol di sini
    recordButton = document.getElementById('recordButton');
    statusMessage = document.getElementById('statusMessage');

    // === DEBUG ALERT: Pastikan elemen tombol ditemukan setelah DOMContentLoaded ===
    if (recordButton) {
        alert("DEBUG: Tombol recordButton ditemukan di DOM (setelah DOMContentLoaded).");
        setRecordButtonState(true, 'Tombol Siap!'); // Ubah teks tombol jika ditemukan
    } else {
        alert("ERROR: recordButton TIDAK ditemukan di DOM (setelah DOMContentLoaded)! Periksa ID HTML.");
    }
    // =========================================================================

    if (statusMessage) {
        showStatus("Aplikasi siap (debug mode).", null);
    }
});

// Anda bisa menghapus semua kode lain di luar DOMContentLoaded untuk sementara
// seperti loadFFmpeg, startRecording, stopRecording, dll.
// Jika ingin lebih bersih, hapus semua kecuali bagian di atas.