// Deklarasikan instance FFmpeg
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true, // PENTING: Untuk melihat log FFmpeg di konsol
    corePath: 'https://unpkg.com/@ffmpeg/core@0.12.7/dist/ffmpeg-core.js' // Pastikan URL ini benar dan bisa diakses
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
    if (!ffmpeg.isLoaded()) { // Perbaikan: gunakan ffmpeg.isLoaded()
        showStatus("Memuat pengonversi video...", null);
        try {
            await ffmpeg.load();
            showStatus("Pengonversi siap!", 2000);
        } catch (e) {
            console.error("Gagal memuat FFmpeg:", e);
            showStatus("Gagal memuat pengonversi video. Coba refresh halaman.", 5000);
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
            showStatus("Mengonversi video ke MP4...", null);
            const webmBlob = new Blob(recordedChunks, { type: supportedMimeType.split(';')[0] });

            try {
                // Tulis file webm ke memori FFmpeg
                // Nama file input di FS virtual FFmpeg
                const inputFileName = 'input.webm';
                await ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob));

                // Jalankan perintah konversi FFmpeg
                // Pastikan nama file output ini sama dengan yang akan dibaca
                const outputFileName = 'output.mp4';
                await ffmpeg.exec([
                    '-i', inputFileName,
                    '-c:v', 'libx64', // Pastikan libx264 digunakan untuk H.264
                    '-preset', 'medium',
                    '-crf', '23',
                    '-pix_fmt', 'yuv420p',
                    outputFileName
                ]);

                // Baca file mp4 yang sudah dikonversi
                const data = await ffmpeg.readFile(outputFileName);
                const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' }); // PENTING: Tipe MIME di sini harus 'video/mp4'

                // PENTING: Debugging - Periksa ukuran blob MP4
                console.log('MP4 Blob created:', mp4Blob.size, 'bytes');
                if (mp4Blob.size === 0) {
                    throw new Error("FFmpeg menghasilkan file MP4 kosong.");
                }

                const url = URL.createObjectURL(mp4Blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = url;
                a.download = `aframe_recording_${Date.now()}.mp4`; // PENTING: Pastikan ekstensi .mp4 di sini
                a.click();
                window.URL.revokeObjectURL(url);

                // Bersihkan file dari memori FFmpeg
                await ffmpeg.deleteFile(inputFileName);
                await ffmpeg.deleteFile(outputFileName);

                recordedChunks = [];
                isRecording = false;
                recordButton.classList.remove('recording');
                recordButton.textContent = 'Tahan untuk Rekam';
                showStatus("Rekaman MP4 berhasil diunduh!", 3000);
                clearInterval(recordingTimerInterval);
            } catch (ffmpegErr) {
                console.error("Gagal mengonversi video dengan FFmpeg:", ffmpegErr);
                showStatus(`Gagal mengonversi video ke MP4. Error: ${ffmpegErr.message}`, 5000);
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