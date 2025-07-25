// Deklarasikan instance FFmpeg
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true, // Untuk melihat log FFmpeg di konsol
    corePath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js' // URL ke ffmpeg-core.js
});

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let startTime;
let recordingTimerInterval;

const recordButton = document.getElementById('recordButton');
const statusMessage = document.getElementById('statusMessage');

// Fungsi untuk mendapatkan MIME type video yang didukung (tetap webm untuk perekaman awal)
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

// Fungsi untuk menampilkan pesan status
function showStatus(message, duration = null) {
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    if (duration) {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, duration);
    }
}

// Fungsi untuk memperbarui durasi rekaman di UI
function updateRecordingDuration() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    showStatus(`Merekam... ${elapsed}s`);
}

// --- Fungsi Inisialisasi FFmpeg ---
async function loadFFmpeg() {
    if (!ffmpeg.is
        ('loaded')) {
        showStatus("Memuat pengonversi video...", null);
        try {
            await ffmpeg.load();
            showStatus("Pengonversi siap!", 2000);
        } catch (e) {
            console.error("Gagal memuat FFmpeg:", e);
            showStatus("Gagal memuat pengonversi video.", 5000);
            recordButton.disabled = true; // Nonaktifkan tombol jika FFmpeg gagal dimuat
            return false;
        }
    }
    return true;
}

// --- Mulai Perekaman ---
async function startRecording() {
    if (isRecording) return;

    // Pastikan FFmpeg sudah dimuat sebelum merekam
    const ffmpegLoaded = await loadFFmpeg();
    if (!ffmpegLoaded) {
        return;
    }

    const aScene = document.querySelector('a-scene');
    if (!aScene) {
        showStatus("Scene A-Frame belum siap.", 3000);
        return;
    }

    const canvas = aScene.canvas;
    if (!canvas) {
        showStatus("Canvas untuk perekaman tidak ditemukan.", 3000);
        return;
    }

    const supportedMimeType = getSupportedMimeType();
    if (!supportedMimeType) {
        showStatus("Browser Anda tidak mendukung perekaman video.", 3000);
        console.error("No supported video MIME type found for MediaRecorder.");
        return;
    }

    try {
        const stream = canvas.captureStream(30);

        mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            showStatus("Mengonversi video ke MP4...", null); // Pesan saat konversi
            const webmBlob = new Blob(recordedChunks, { type: supportedMimeType.split(';')[0] });

            try {
                // Tulis file webm ke memori FFmpeg
                await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

                // Jalankan perintah konversi FFmpeg
                // -i input.webm : input file
                // -c:v libx264 : gunakan codec video H.264
                // -preset medium : preset kualitas/kecepatan (ultrafast, superfast, fast, medium, slow, slower, veryslow)
                // -crf 23 : Constant Rate Factor (kualitas, 0=lossless, 51=terburuk. 23 default umum)
                // -pix_fmt yuv420p : format piksel, penting untuk kompatibilitas MP4
                // output.mp4 : output file
                await ffmpeg.exec([
                    '-i', 'input.webm',
                    '-c:v', 'libx264',
                    '-preset', 'medium', // Bisa diubah ke 'fast' atau 'superfast' untuk konversi lebih cepat
                    '-crf', '23',
                    '-pix_fmt', 'yuv420p',
                    'output.mp4'
                ]);

                // Baca file mp4 yang sudah dikonversi
                const data = await ffmpeg.readFile('output.mp4');
                const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

                const url = URL.createObjectURL(mp4Blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = url;
                a.download = `aframe_recording_${Date.now()}.mp4`; // Ubah ekstensi
                a.click();
                window.URL.revokeObjectURL(url);

                // Bersihkan file dari memori FFmpeg
                await ffmpeg.deleteFile('input.webm');
                await ffmpeg.deleteFile('output.mp4');

                recordedChunks = [];
                isRecording = false;
                recordButton.classList.remove('recording');
                recordButton.textContent = 'Tahan untuk Rekam';
                showStatus("Rekaman MP4 berhasil diunduh!", 3000);
                clearInterval(recordingTimerInterval);
            } catch (ffmpegErr) {
                console.error("Gagal mengonversi video dengan FFmpeg:", ffmpegErr);
                showStatus("Gagal mengonversi video ke MP4.", 5000);
                isRecording = false;
                recordButton.classList.remove('recording');
                recordButton.textContent = 'Tahan untuk Rekam';
                clearInterval(recordingTimerInterval);
            }
        };

        mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
            showStatus(`Kesalahan perekaman: ${event.error.name}`, 3000);
            isRecording = false;
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Tahan untuk Rekam';
            clearInterval(recordingTimerInterval);
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
        showStatus(`Tidak bisa memulai perekaman: ${e.message}`, 3000);
        isRecording = false;
        recordButton.classList.remove('recording');
        recordButton.textContent = 'Tahan untuk Rekam';
        clearInterval(recordingTimerInterval);
    }
}

// --- Berhenti Perekaman ---
function stopRecording() {
    if (!isRecording) return;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        console.log("Stopping recording...");
        showStatus("Menghentikan rekaman...", null);
    }
}

// --- Event Listeners untuk Hold/Release ---
document.addEventListener('DOMContentLoaded', () => {
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
        showStatus("Tekan & tahan tombol untuk merekam.", 3000);
    }

    // Inisialisasi FFmpeg saat DOMContentLoaded
    loadFFmpeg();
});