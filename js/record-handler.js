// === DEBUG ALERT 1: Pastikan file JS terload ===
alert("DEBUG 1: record-handler.js dimuat.");

// === DEBUG ALERT 2: Pastikan baris ini tereksekusi ===
alert("DEBUG 2: Masuk ke scope global.");

// Hanya mendeklarasikan variabel tanpa inisialisasi kompleks
let ffmpeg;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let startTime;
let recordingTimerInterval;
let recordButton; 
let statusMessage; 

// === DEBUG ALERT 3: Sebelum DOMContentLoaded ===
alert("DEBUG 3: Sebelum addEventListener DOMContentLoaded.");

document.addEventListener('DOMContentLoaded', () => {
    alert("DEBUG 4: DOMContentLoaded terpicu."); // Ini yang kita cari!

    recordButton = document.getElementById('recordButton');
    statusMessage = document.getElementById('statusMessage');

    if (recordButton) {
        alert("DEBUG 5: Tombol recordButton ditemukan.");
    } else {
        alert("ERROR: recordButton TIDAK ditemukan.");
    }

    // Ini akan dinonaktifkan sementara
    // setRecordButtonState(false, 'Memuat...'); 
    // loadFFmpeg(); 
});

// Anda bisa menghapus semua fungsi (setRecordButtonState, showStatus, dll.) untuk sementara.
// Jika ingin lebih rapi, sisakan saja bagian di atas.