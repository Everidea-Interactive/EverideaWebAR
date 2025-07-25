// === DEBUG ALERT 1: Pastikan file JS terload ===
alert("DEBUG 1: record-handler.js dimuat.");

// Variabel untuk MediaRecorder dan state rekaman
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let startTime; // Untuk menghitung durasi rekaman
let recordingTimerInterval; // Untuk update durasi di UI

// Variabel ini akan diambil setelah DOM siap
let recordButton; 
let statusMessage; 

// Fungsi untuk mendapatkan MIME type video yang didukung
function getSupportedMimeType() {
    const mimeTypes = [
        'video/webm; codecs=vp9',
        'video/webm; codecs=vp8',
        'video/webm',
        // Tambahkan fallback jika browser tidak support webm (jarang di Chrome modern)
        'video/mp4' 
    ];
    for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return null;
}

// Fungsi untuk menampilkan pesan status
function showStatus(message, duration = null) {
    // Pastikan statusMessage sudah ada sebelum digunakan
    if (statusMessage) { 
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
        if (duration) {
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, duration);
        }
    }
}

// Fungsi untuk memperbarui durasi rekaman di UI
function updateRecordingDuration() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    showStatus(`Merekam... ${elapsed}s`);
}

// --- Mulai Perekaman ---
function startRecording() {
    // === DEBUG ALERT PENTING: Periksa apakah ini muncul ===
    alert("DEBUG: startRecording() dipanggil."); 

    if (isRecording) { // Mencegah multiple starts
        alert("DEBUG: Sudah merekam, mengabaikan perintah start.");
        return;
    }

    const aScene = document.querySelector('a-scene');
    if (!aScene) {
        showStatus("Scene A-Frame belum siap.", 3000);
        alert("ALERT: Scene A-Frame tidak ditemukan.");
        return;
    }

    const canvas = aScene.canvas;
    if (!canvas) {
        showStatus("Canvas untuk perekaman tidak ditemukan.", 3000);
        alert("ALERT: Canvas A-Frame tidak ditemukan.");
        return;
    }

    const supportedMimeType = getSupportedMimeType();
    if (!supportedMimeType) {
        showStatus("Browser Anda tidak mendukung perekaman video.", 3000);
        alert("ALERT: Browser Anda tidak mendukung perekaman video.");
        console.error("No supported video MIME type found for MediaRecorder.");
        return;
    }
    
    alert("DEBUG: MediaRecorder siap diinisialisasi.");

    recordedChunks = [];
    try {
        const stream = canvas.captureStream(30); // Coba 30fps
        if (!stream || stream.getTracks().length === 0) {
            throw new Error("Canvas stream kosong atau tidak valid.");
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            if (recordedChunks.length === 0) {
                alert("ALERT: Perekaman terlalu singkat atau kosong. Tidak ada data untuk diunduh.");
                showStatus("Tidak ada data video yang terekam.", 3000);
                resetRecordingState();
                return;
            }

            showStatus("Mengunduh rekaman...", null);
            const blob = new Blob(recordedChunks, { type: supportedMimeType.split(';')[0] });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            a.download = `aframe_recording_${Date.now()}.${supportedMimeType.includes('webm') ? 'webm' : 'mp4'}`;
            a.click();
            window.URL.revokeObjectURL(url); // Membersihkan URL objek

            showStatus("Rekaman berhasil diunduh!", 3000);
            resetRecordingState();
        };

        mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
            alert(`ALERT: Kesalahan perekaman. Pesan: ${event.error.name}`);
            showStatus(`Kesalahan perekaman: ${event.error.name}`, 3000);
            resetRecordingState();
        };

        mediaRecorder.start();
        isRecording = true;
        startTime = Date.now(); // Catat waktu mulai
        recordingTimerInterval = setInterval(updateRecordingDuration, 1000); // Update durasi setiap detik
        
        // Memperbarui UI tombol
        if (recordButton) { // Pastikan recordButton sudah ditemukan
            recordButton.classList.add('recording');
            recordButton.textContent = 'Melepaskan untuk Berhenti';
        }
        showStatus("Merekam...", null); // Tampilkan status merekam tanpa durasi otomatis

    } catch (e) {
        console.error("Error starting recording:", e);
        alert(`ALERT: Tidak bisa memulai perekaman. Pesan: ${e.message}`);
        showStatus(`Tidak bisa memulai perekaman: ${e.message}`, 3000);
        resetRecordingState();
    }
}

// --- Berhenti Perekaman ---
function stopRecording() {
    if (!isRecording) return; // Mencegah multiple stops atau stop saat tidak merekam

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        showStatus("Menghentikan rekaman...", null); // Tampilkan pesan berhenti
        clearInterval(recordingTimerInterval); // Hentikan timer UI
    }
}

// Fungsi untuk mereset state perekaman
function resetRecordingState() {
    isRecording = false;
    recordedChunks = [];
    if (recordButton) {
        recordButton.classList.remove('recording');
        recordButton.textContent = 'Tahan untuk Rekam';
    }
    clearInterval(recordingTimerInterval);
    // setRecordButtonState(true, 'Tahan untuk Rekam'); // Bisa dipanggil di sini juga
}

// === DEBUG ALERT 4: Sebelum DOMContentLoaded ===
alert("DEBUG 4: Sebelum addEventListener DOMContentLoaded.");

// --- Event Listeners untuk Hold/Release ---
document.addEventListener('DOMContentLoaded', () => {
    alert("DEBUG 5: DOMContentLoaded terpicu."); 

    recordButton = document.getElementById('recordButton');
    statusMessage = document.getElementById('statusMessage');

    // === DEBUG ALERT 6: Pastikan elemen tombol ditemukan setelah DOMContentLoaded ===
    if (recordButton) {
        alert("DEBUG 6: Tombol recordButton ditemukan di DOM.");
        showStatus("Tekan & tahan tombol untuk merekam.", 3000); // Status awal
    } else {
        alert("ERROR: recordButton TIDAK ditemukan di DOM. Periksa ID HTML.");
    }
    // =========================================================================

    // === PERUBAHAN UTAMA: Menggunakan event listener di document.body untuk delegasi ===
    if (recordButton) {
        document.body.addEventListener('mousedown', (e) => {
            // Cek apakah event terjadi pada recordButton atau anaknya
            if (e.target === recordButton || recordButton.contains(e.target)) {
                e.stopPropagation(); // Mencegah event menyebar ke A-Frame
                startRecording();
            }
        });
        document.body.addEventListener('mouseup', (e) => {
            if (e.target === recordButton || recordButton.contains(e.target)) {
                e.stopPropagation(); // Mencegah event menyebar
                stopRecording();
            }
        });

        document.body.addEventListener('touchstart', (e) => {
            if (e.target === recordButton || recordButton.contains(e.target)) {
                e.preventDefault(); // Mencegah default browser (misal: scroll, zoom)
                e.stopPropagation(); // Mencegah event menyebar
                startRecording();
            }
        }, { passive: false }); // Penting untuk allow preventDefault pada touch events

        document.body.addEventListener('touchend', (e) => {
            if (e.target === recordButton || recordButton.contains(e.target)) {
                e.preventDefault(); // Mencegah default browser
                e.stopPropagation(); // Mencegah event menyebar
                stopRecording();
            }
        }, { passive: false }); // Penting untuk allow preventDefault pada touch events
    } else {
        alert("ERROR: recordButton tidak ditemukan. Event listeners tidak terpasang.");
    }
});