const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true,
    // Pastikan corePath ini sesuai dengan versi @ffmpeg/ffmpeg yang di-load di index.html
    corePath: 'https://unpkg.com/@ffmpeg/core@0.12.7/dist/ffmpeg-core.js'
});

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let startTime;
let recordingTimerInterval;

const recordButton = document.getElementById('recordButton');
const statusMessage = document.getElementById('statusMessage');

// Fungsi bantuan untuk memastikan tombol selalu diaktifkan/dinonaktifkan dengan benar
function setRecordButtonState(enabled, text) {
    recordButton.disabled = !enabled;
    recordButton.textContent = text;
    if (enabled) {
        recordButton.classList.remove('recording');
    }
}

function getSupportedMimeType() {
    const mimeTypes = [
        'video/webm; codecs=vp9',
        'video/webm; codecs=vp8',
        'video/webm',
    ];
    for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return null;
}

function showStatus(message, duration = null) {
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    if (duration) {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, duration);
    }
}

function updateRecordingDuration() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    showStatus(`Merekam... ${elapsed}s`);
}

async function loadFFmpeg() {
    if (!ffmpeg.isLoaded()) {
        showStatus("Memuat pengonversi video, harap tunggu...", null);
        try {
            await ffmpeg.load();
            showStatus("Pengonversi siap!", 2000);
            setRecordButtonState(true, 'Tahan untuk Rekam'); // Aktifkan tombol setelah FFmpeg siap
        } catch (e) {
            console.error("Gagal memuat FFmpeg:", e);
            alert("ALERT: Gagal memuat pengonversi video. Cek koneksi internet dan coba lagi."); // ALERT untuk error kritis
            showStatus("Gagal memuat pengonversi video.", 5000);
            setRecordButtonState(false, 'Error Memuat Konverter'); // Nonaktifkan tombol
            return false;
        }
    } else {
        setRecordButtonState(true, 'Tahan untuk Rekam'); // Aktifkan tombol jika sudah dimuat
    }
    return true;
}

async function startRecording() {
    // === DEBUG ALERT: Pastikan fungsi ini dipanggil ===
    alert("DEBUG: startRecording() dipanggil."); 
    // =================================================

    if (isRecording) {
        alert("DEBUG: Sudah merekam, mengabaikan perintah start.");
        return;
    }

    const ffmpegLoaded = await loadFFmpeg();
    if (!ffmpegLoaded) {
        alert("ALERT: Perekaman tidak bisa dimulai: Konverter belum siap.");
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
        alert("ALERT: Perekaman tidak bisa dimulai: Browser Anda tidak mendukung WebM.");
        showStatus("Browser Anda tidak mendukung perekaman video.", 3000);
        console.error("No supported video MIME type found for MediaRecorder.");
        return;
    }
    
    // === DEBUG ALERT: MediaRecorder siap diinisialisasi ===
    alert("DEBUG: MediaRecorder siap diinisialisasi.");
    // ======================================================

    recordedChunks = []; // Reset chunks sebelum memulai
    try {
        // Penting: Pastikan stream dari canvas dapat diakses dan tidak kosong
        const stream = canvas.captureStream(30); 
        if (!stream || stream.getTracks().length === 0) {
            throw new Error("Canvas stream kosong atau tidak valid.");
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (recordedChunks.length === 0) {
                alert("ALERT: Perekaman terlalu singkat atau kosong. Tidak ada data untuk dikonversi.");
                showStatus("Tidak ada data video yang terekam.", 3000);
                resetRecordingState();
                return;
            }

            showStatus("Mengonversi video ke MP4, harap tunggu...", null);
            const webmBlob = new Blob(recordedChunks, { type: supportedMimeType.split(';')[0] });

            try {
                const inputFileName = 'input.webm';
                await ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob));

                const outputFileName = 'output.mp4';
                await ffmpeg.exec([
                    '-i', inputFileName,
                    '-c:v', 'libx264',
                    '-preset', 'medium',
                    '-crf', '23',
                    '-pix_fmt', 'yuv420p',
                    outputFileName
                ]);

                const data = await ffmpeg.readFile(outputFileName);
                const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

                if (mp4Blob.size === 0) {
                    throw new Error("FFmpeg menghasilkan file MP4 kosong atau gagal.");
                }

                const url = URL.createObjectURL(mp4Blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = url;
                a.download = `aframe_recording_${Date.now()}.mp4`;
                a.click();
                window.URL.revokeObjectURL(url);

                await ffmpeg.deleteFile(inputFileName);
                await ffmpeg.deleteFile(outputFileName);

                showStatus("Rekaman MP4 berhasil diunduh!", 3000);
                resetRecordingState();
            } catch (ffmpegErr) {
                console.error("Gagal mengonversi video dengan FFmpeg:", ffmpegErr);
                alert(`ALERT: Gagal mengonversi video ke MP4. Pesan: ${ffmpegErr.message}`);
                showStatus(`Gagal mengonversi video: ${ffmpegErr.message.substring(0, 50)}...`, 5000);
                resetRecordingState();
            }
        };

        mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
            alert(`ALERT: Kesalahan perekaman. Pesan: ${event.error.name}`);
            showStatus(`Kesalahan perekaman: ${event.error.name}`, 3000);
            resetRecordingState();
        };

        mediaRecorder.start();
        isRecording = true;
        startTime = Date.now();
        recordingTimerInterval = setInterval(updateRecordingDuration, 1000);
        recordButton.classList.add('recording');
        recordButton.textContent = 'Melepaskan untuk Berhenti';
        showStatus("Merekam...", null);

    } catch (e) {
        console.error("Error starting recording:", e);
        alert(`ALERT: Tidak bisa memulai perekaman. Pesan: ${e.message}`);
        showStatus(`Tidak bisa memulai perekaman: ${e.message}`, 3000);
        resetRecordingState();
    }
}

function stopRecording() {
    if (!isRecording) return;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        showStatus("Menghentikan rekaman...", null);
        clearInterval(recordingTimerInterval);
    }
}

function resetRecordingState() {
    isRecording = false;
    recordedChunks = [];
    recordButton.classList.remove('recording');
    recordButton.textContent = 'Tahan untuk Rekam';
    clearInterval(recordingTimerInterval);
    // Pastikan tombol aktif kembali
    setRecordButtonState(true, 'Tahan untuk Rekam'); 
}


document.addEventListener('DOMContentLoaded', () => {
    // Tombol nonaktif di awal sampai FFmpeg siap
    setRecordButtonState(false, 'Memuat...');

    if (recordButton) {
        recordButton.addEventListener('mousedown', startRecording);
        recordButton.addEventListener('mouseup', stopRecording);

        recordButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startRecording();
        }, { passive: false });

        recordButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopRecording();
        }, { passive: false });
    }

    if (statusMessage) {
        showStatus("Memuat aplikasi...", null);
    }

    // Panggil loadFFmpeg di sini untuk inisialisasi awal
    loadFFmpeg();
});