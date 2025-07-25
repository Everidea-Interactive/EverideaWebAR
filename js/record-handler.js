let mediaRecorder;
    let recordedChunks = [];
    let isRecording = false;
    let startTime; // Untuk menghitung durasi rekaman
    let recordingTimerInterval; // Untuk update durasi di UI

    const recordButton = document.getElementById('recordButton');
    const statusMessage = document.getElementById('statusMessage');

    // Fungsi untuk mendapatkan MIME type video yang didukung
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

    // --- Mulai Perekaman ---
    function startRecording() {
        if (isRecording) return; // Mencegah multiple starts

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
            const stream = canvas.captureStream(30); // Coba 30fps

            mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: supportedMimeType.split(';')[0] });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style.display = 'none';
                a.href = url;
                a.download = `aframe_recording_${Date.now()}.webm`;
                a.click();
                window.URL.revokeObjectURL(url);
                recordedChunks = [];
                isRecording = false;
                recordButton.classList.remove('recording');
                recordButton.textContent = 'Tahan untuk Rekam';
                showStatus("Rekaman berhasil diunduh!", 3000);
                clearInterval(recordingTimerInterval); // Hentikan timer UI
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event.error);
                showStatus(`Kesalahan perekaman: ${event.error.name}`, 3000);
                isRecording = false;
                recordButton.classList.remove('recording');
                recordButton.textContent = 'Tahan untuk Rekam';
                clearInterval(recordingTimerInterval); // Hentikan timer UI
            };

            mediaRecorder.start();
            isRecording = true;
            startTime = Date.now(); // Catat waktu mulai
            recordingTimerInterval = setInterval(updateRecordingDuration, 1000); // Update durasi setiap detik
            recordButton.classList.add('recording');
            recordButton.textContent = 'Melepaskan untuk Berhenti';
            showStatus("Merekam...", null); // Tampilkan status merekam tanpa durasi otomatis

        } catch (e) {
            console.error("Error starting recording:", e);
            showStatus(`Tidak bisa memulai perekaman: ${e.message}`, 3000);
            isRecording = false;
            recordButton.classList.remove('recording');
            recordButton.textContent = 'Tahan untuk Rekam';
            clearInterval(recordingTimerInterval); // Hentikan timer UI
        }
    }

    // --- Berhenti Perekaman ---
    function stopRecording() {
        if (!isRecording) return; // Mencegah multiple stops atau stop saat tidak merekam

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            console.log("Stopping recording...");
            showStatus("Menghentikan rekaman...", null); // Tampilkan pesan berhenti
        }
    }

    // --- Event Listeners untuk Hold/Release ---
    recordButton.addEventListener('mousedown', startRecording);
    recordButton.addEventListener('mouseup', stopRecording);

    // Untuk perangkat mobile (sentuhan)
    recordButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Mencegah event mouse dari touch
        startRecording();
    }, { passive: false }); // Gunakan { passive: false } untuk preventDefault

    recordButton.addEventListener('touchend', (e) => {
        e.preventDefault(); // Mencegah event mouse dari touch
        stopRecording();
    }, { passive: false }); // Gunakan { passive: false } untuk preventDefault

    // Pastikan status awal diatur
    document.addEventListener('DOMContentLoaded', () => {
        showStatus("Tekan & tahan tombol untuk merekam.", 3000);
    });