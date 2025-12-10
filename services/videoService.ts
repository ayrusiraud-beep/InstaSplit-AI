
import { SplitAspectRatio } from "../types";

export const renderClip = (
  sourceUrl: string, 
  start: number, 
  end: number, 
  aspectRatio: SplitAspectRatio,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = sourceUrl;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = false; 

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let recorder: MediaRecorder;
    let stream: MediaStream;
    const chunks: Blob[] = [];
    const duration = end - start;
    let drawInterval: number;

    const cleanup = () => {
         if (drawInterval) clearInterval(drawInterval);
         if (video) {
             video.pause();
             video.src = "";
             video.remove();
         }
         if (stream) {
             stream.getTracks().forEach(track => track.stop());
         }
         if (canvas) {
             canvas.remove();
         }
    };

    video.onloadedmetadata = () => {
        // Calculate Dimensions based on Aspect Ratio
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        
        let targetW = vw;
        let targetH = vh;

        if (aspectRatio === '9:16') {
            // Vertical crop
            targetW = (vh * 9) / 16;
            targetH = vh;
            if (targetW > vw) {
                targetW = vw;
                targetH = (vw * 16) / 9;
            }
        } else if (aspectRatio === '16:9') {
            // Landscape crop
            targetW = vw;
            targetH = (vw * 9) / 16;
             if (targetH > vh) {
                targetH = vh;
                targetW = (vh * 16) / 9;
            }
        } else if (aspectRatio === '1:1') {
            // Square crop
            const min = Math.min(vw, vh);
            targetW = min;
            targetH = min;
        }

        canvas.width = targetW;
        canvas.height = targetH;
        
        video.currentTime = start;
    };

    video.onseeked = () => {
        if (chunks.length > 0) return; // Already started
        
        try {
            // 1. Get Video Stream from Canvas (for visual cropping)
            const canvasStream = canvas.captureStream(30); // 30 FPS
            
            // 2. Get Audio Stream from Video Element
            // @ts-ignore
            const videoStream = video.captureStream ? video.captureStream() : (video as any).mozCaptureStream();
            const audioTrack = videoStream.getAudioTracks()[0];

            // 3. Combine them
            const tracks = [...canvasStream.getVideoTracks()];
            if (audioTrack) tracks.push(audioTrack);
            
            stream = new MediaStream(tracks);

            // Prefer mp4, fallback to webm
            const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') 
                ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
                : MediaRecorder.isTypeSupported('video/mp4') 
                    ? 'video/mp4' 
                    : 'video/webm';

            recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 }); // 4Mbps for better quality

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                cleanup();
                resolve(blob);
            };

            // Start Drawing Loop (Center Crop)
            const drawFrame = () => {
                if (!ctx) return;
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                const cw = canvas.width;
                const ch = canvas.height;
                
                // Calculate Source Rectangle (Center Crop)
                // We want to scale the video to cover the canvas, preserving aspect ratio
                const scale = Math.max(cw / vw, ch / vh);
                const scaledW = vw * scale;
                const scaledH = vh * scale;
                
                const offsetX = (cw - scaledW) / 2;
                const offsetY = (ch - scaledH) / 2;

                ctx.drawImage(video, offsetX, offsetY, scaledW, scaledH);
            };

            drawInterval = window.setInterval(drawFrame, 1000 / 30); // 30fps drawing

            recorder.start();
            video.play().catch((e) => {
                cleanup();
                reject(e);
            });
        } catch (e) {
            cleanup();
            reject(e);
        }
    };

    video.ontimeupdate = () => {
        const currentProgress = (video.currentTime - start) / duration;
        onProgress(Math.min(99, Math.round(currentProgress * 100)));

        if (video.currentTime >= end) {
            video.pause();
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }
    };

    video.onerror = (e) => {
        cleanup();
        reject(new Error("Video playback error"));
    };
    
    // Trigger load
    video.currentTime = start;
  });
};

export const extractFrameFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
        }

        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            const url = URL.createObjectURL(file);
            video.src = url;
            video.muted = true;
            video.autoplay = false;
            video.playsInline = true;
            
            video.onloadeddata = () => {
                video.currentTime = 0.5; // Seek slightly into the video
            };
            
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                // Cleanup
                video.remove();
                URL.revokeObjectURL(url);
                
                resolve(dataUrl);
            };
            
            video.onerror = () => {
                 URL.revokeObjectURL(url);
                 reject(new Error("Failed to load video file"));
            };
            return;
        }
        
        reject(new Error("Unsupported file type"));
    });
};
