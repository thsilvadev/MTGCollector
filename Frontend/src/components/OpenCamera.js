import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuthHeader } from 'react-auth-kit';

// ── Card presence detection ────────────────────────────────────────────────
// MTG cards have a uniform border (black OR white) on all 4 sides.
// We sample thin edge strips and check if pixels are consistently dark (<65)
// OR consistently bright (>190). Either qualifies as a card border.
function hasCardBorder(canvas) {
  const ctx = canvas.getContext('2d');
  const w   = canvas.width;
  const h   = canvas.height;
  const s   = Math.max(4, Math.round(w * 0.05)); // edge strip thickness (~5%)

  // Returns ratio of pixels that are clearly dark OR clearly light (uniform border color)
  const borderRatio = (imgData) => {
    const d = imgData.data;
    let dark = 0, bright = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (lum < 65)  dark++;
      if (lum > 190) bright++;
    }
    const total = d.length / 4;
    return Math.max(dark / total, bright / total);
  };

  const l = borderRatio(ctx.getImageData(0,     0, s, h));
  const r = borderRatio(ctx.getImageData(w - s, 0, s, h));
  const t = borderRatio(ctx.getImageData(0,     0, w, s));
  const b = borderRatio(ctx.getImageData(0, h - s, w, s));
  const avg = (l + r + t + b) / 4;
  console.log(`[Scanner] Border ratio: avg=${(avg * 100).toFixed(1)}% L=${(l*100).toFixed(0)}% R=${(r*100).toFixed(0)}% T=${(t*100).toFixed(0)}% B=${(b*100).toFixed(0)}%`);
  return avg > 0.20;
}

// ── Frame stability config ───────────────────────────────────────────────────
const STABILITY_THRESHOLD = 15;  // max average pixel difference to be considered "stable"
const STABILITY_FRAMES    = 4;   // consecutive stable frames required before scanning
const SAMPLE_INTERVAL_MS  = 200; // ms between frame diff samples
const SCAN_COOLDOWN_MS    = 3000; // minimum ms between scans

// ── Inline styles ─────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: '#000', zIndex: 999, overflow: 'hidden',
  },
  video: {
    width: '100%', height: '100%', objectFit: 'cover',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(20,20,20,0.85)', border: '2px solid rgba(255,255,255,0.5)',
    color: '#fff', fontSize: 26, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.6)', pointerEvents: 'auto',
  },
  reticleBase: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -55%)',
    // Portrait card ratio: 63.5 mm × 88.9 mm ≈ 0.714
    height: '86vh',
    aspectRatio: '63.5 / 88.9',
    maxWidth: '88vw',
    borderRadius: 10, pointerEvents: 'none',
    transition: 'border-color 0.3s',
  },
  statusBar: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    textAlign: 'center', color: '#fff', fontSize: 14,
    textShadow: '0 1px 4px rgba(0,0,0,0.8)', pointerEvents: 'none',
  },
  resultPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'rgba(0,0,0,0.92)', borderRadius: '20px 20px 0 0',
    padding: '20px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16, pointerEvents: 'auto',
  },
  cardImg:  { width: 180, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
  cardName: { margin: '0 0 4px', fontSize: 18, color: '#fff' },
  cardMeta: { margin: 0, color: '#aaa', fontSize: 14 },
  cardPrice:{ margin: '4px 0 0', color: '#f0c040', fontSize: 13 },
  counter:  { color: '#aaa', fontSize: 12, margin: 0 },
  btnRow:   { display: 'flex', gap: 32 },
  btnReject: {
    width: 64, height: 64, borderRadius: '50%',
    background: '#c0392b', border: 'none', fontSize: 28,
    cursor: 'pointer', color: '#fff', pointerEvents: 'auto',
  },
  btnConfirm: {
    width: 64, height: 64, borderRadius: '50%',
    background: '#27ae60', border: 'none', fontSize: 28,
    cursor: 'pointer', color: '#fff', pointerEvents: 'auto',
  },
  // ── UI layer ──────────────────────────────────────────────────────────────
  // position:fixed escapes the <video> hardware compositor layer.
  // Chrome on Linux renders video in a GPU overlay that ignores CSS z-index;
  // a sibling fixed div sits in the viewport stacking context, always on top.
  uiLayer: {
    position: 'fixed', inset: 0,
    zIndex: 1000,
    pointerEvents: 'none', // transparent to mouse/touch — restored on children
  },
  switchBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(20,20,20,0.85)', border: '2px solid rgba(255,255,255,0.5)',
    color: '#fff', fontSize: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.6)', pointerEvents: 'auto',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Full-screen camera scanner.
 * - Continuously samples frames for motion stability
 * - When stable, sends frame to POST /scan for 3-tier card identification
 * - Shows identified card; user confirms (adds to collection) or rejects
 *
 * Props:
 *   close     {Function}  — called when user closes the scanner
 *   fetchName {Function}  — legacy prop, intentionally unused
 */
function OpenCamera({ close }) {
  const videoRef         = useRef(null);
  const diffCanvasRef    = useRef(null); // tiny canvas for frame stability diff
  const captureCanvasRef = useRef(null); // full-res canvas for capture
  const streamRef        = useRef(null);
  const prevFrameRef     = useRef(null);
  const stableCountRef   = useRef(0);
  const lastScanRef      = useRef(0);
  const isScanningRef    = useRef(false);
  const intervalRef      = useRef(null);

  const [status, setStatus]                 = useState('initializing');
  // 'initializing' | 'scanning' | 'processing' | 'result' | 'error'
  const [candidates, setCandidates]         = useState([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [scanTier, setScanTier]             = useState(null);
  const [devices, setDevices]               = useState([]);
  const [deviceIndex, setDeviceIndex]       = useState(0);

  const authHeader = useAuthHeader();

  // ── Camera start (called on mount and on camera switch) ────────────────────
  const startCamera = useCallback(async (deviceId = null) => {
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    try {
      // If no specific deviceId, let the browser pick (triggers permission dialog).
      // We intentionally do NOT pass facingMode here — it causes the browser to
      // override the user's camera choice in the permission dialog on desktop.
      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true'); // required on iOS Safari
      await video.play();

      // Enumerate cameras *after* permission is granted (browsers hide labels before)
      const allDevices   = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      console.log('[Scanner] Available cameras:', videoDevices.map((d, i) => `[${i}] ${d.label || d.deviceId}`));

      // Track which index is currently active
      if (deviceId) {
        const idx = videoDevices.findIndex(d => d.deviceId === deviceId);
        if (idx !== -1) setDeviceIndex(idx);
      } else {
        // Mark whichever device the browser chose as active
        const activeId = stream.getVideoTracks()[0]?.getSettings()?.deviceId;
        const idx = videoDevices.findIndex(d => d.deviceId === activeId);
        if (idx !== -1) setDeviceIndex(idx);
        console.log('[Scanner] Browser chose camera:', videoDevices[idx]?.label || activeId);
      }

      setStatus('scanning');
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('error');
    }
  }, []);

  // ── Start camera on mount ───────────────────────────────────────────────────
  useEffect(() => {
    startCamera();
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [startCamera]);

  // ── Capture frame and POST to /scan ────────────────────────────────────────
  const captureAndScan = useCallback(async () => {
    const now = Date.now();
    if (isScanningRef.current || now - lastScanRef.current < SCAN_COOLDOWN_MS) return;

    const video  = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    isScanningRef.current = true;
    lastScanRef.current   = now;
    setStatus('processing');

    try {
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;

      // ── Crop to the reticle region before sending ─────────────────────────
      // The full video frame includes background. We map the reticle rect
      // (defined in CSS/display px) back to native video pixel coords,
      // accounting for objectFit:cover scaling.
      const displayW = window.innerWidth;
      const displayH = window.innerHeight;
      const scale    = Math.max(displayW / videoW, displayH / videoH); // cover scale
      const offsetX  = (displayW - videoW * scale) / 2; // display→video origin offset
      const offsetY  = (displayH - videoH * scale) / 2;

      // Reticle CSS: height:78vh, aspectRatio:63.5/88.9, maxWidth:88vw,
      //              top:50%, transform:translate(-50%,-55%)
      const rawCardH    = 0.86 * displayH;
      const rawCardW    = rawCardH * (63.5 / 88.9);
      const cardDisplayW = Math.min(rawCardW, 0.88 * displayW);
      const cardDisplayH = cardDisplayW * (88.9 / 63.5);
      const cardDisplayLeft = (displayW - cardDisplayW) / 2;
      const cardDisplayTop  = 0.5 * displayH - 0.55 * cardDisplayH;

      // Convert to video native coordinates
      const srcLeft = (cardDisplayLeft - offsetX) / scale;
      const srcTop  = (cardDisplayTop  - offsetY) / scale;
      const srcW    = cardDisplayW / scale;
      const srcH    = cardDisplayH / scale;

      const cl = Math.max(0, Math.round(srcLeft));
      const ct = Math.max(0, Math.round(srcTop));
      const cw = Math.min(videoW - cl, Math.round(srcW));
      const ch = Math.min(videoH - ct, Math.round(srcH));
      const validCrop = cw > 80 && ch > 80;

      if (validCrop) {
        canvas.width  = cw;
        canvas.height = ch;
        canvas.getContext('2d').drawImage(video, cl, ct, cw, ch, 0, 0, cw, ch);
        console.log(`[Scanner] Reticle crop: x=${cl}, y=${ct}, ${cw}×${ch} (from ${videoW}×${videoH} frame)`);
      } else {
        canvas.width  = videoW;
        canvas.height = videoH;
        canvas.getContext('2d').drawImage(video, 0, 0);
        console.warn(`[Scanner] Reticle crop failed — sending full ${videoW}×${videoH} frame`);
      }

      // Card presence check — skip backend call if no dark border detected
      if (!hasCardBorder(canvas)) {
        console.log('[Scanner] No card border detected — skipping (point camera at a card)');
        setStatus('scanning');
        isScanningRef.current = false;
        return;
      }

      // PNG for lossless quality — JPEG artifacts hurt OCR significantly
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      console.log(`[Scanner] Sending ${canvas.width}×${canvas.height} PNG to /scan...`);
      const form = new FormData();
      form.append('frame', blob, 'frame.png');

      const res = await fetch(`${window.name}/scan`, {
        method:  'POST',
        headers: { authorization: authHeader() },
        body:    form,
      });

      if (!res.ok) {
        console.warn(`[Scanner] /scan returned HTTP ${res.status}`);
        setStatus('scanning');
        return;
      }

      const data = await res.json();
      console.log(`[Scanner] Response — tier: ${data.tier}, candidates: ${data.candidates?.length ?? 0}`,
        data.warnings?.length ? `| warnings: ${data.warnings.join('; ')}` : '');

      // Discard Tier 3 set-guesses — no specific card to confirm
      if (!data.candidates?.length || data.candidates[0]?._setGuess) {
        console.log('[Scanner] No confirmed card candidate — back to scanning');
        setStatus('scanning');
        return;
      }

      console.log(`[Scanner] Showing: "${data.candidates[0].name}" (tier ${data.tier}) — ${data.candidates.length} candidate(s)`);
      setCandidates(data.candidates);
      setCandidateIndex(0);
      setScanTier(data.tier);
      setStatus('result');
    } catch (err) {
      console.error('[Scanner] Scan error:', err);
      setStatus('scanning');
    } finally {
      isScanningRef.current = false;
    }
  }, [authHeader]);

  // ── Frame stability loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'scanning') {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const video  = videoRef.current;
      const canvas = diffCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      canvas.width  = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);
      const { data } = ctx.getImageData(0, 0, 160, 120);

      if (prevFrameRef.current) {
        let diff = 0;
        for (let i = 0; i < data.length; i += 4) {
          diff += Math.abs(data[i] - prevFrameRef.current[i]);
        }
        const avgDiff = diff / (data.length / 4);

        if (avgDiff < STABILITY_THRESHOLD) {
          stableCountRef.current++;
          console.log(`[Scanner] Frame diff: ${avgDiff.toFixed(1)} (stable ${stableCountRef.current}/${STABILITY_FRAMES})`);
          if (stableCountRef.current >= STABILITY_FRAMES) {
            stableCountRef.current = 0;
            console.log('[Scanner] Stability reached — triggering scan');
            captureAndScan();
          }
        } else {
          if (stableCountRef.current > 0) console.log(`[Scanner] Movement detected (diff: ${avgDiff.toFixed(1)}) — reset stability`);
          stableCountRef.current = 0;
        }
      }

      prevFrameRef.current = new Uint8ClampedArray(data);
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [status, captureAndScan]);

  // ── User actions ───────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async (card) => {
    try {
      await fetch(`${window.name}/collection`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader() },
        body:    JSON.stringify({ card_id: card.id }),
      });
    } catch (err) {
      console.error('Failed to add card:', err);
    }
    setCandidates([]);
    setStatus('scanning');
  }, [authHeader]);

  const handleReject = useCallback(() => {
    const nextIndex = candidateIndex + 1;
    if (nextIndex < candidates.length) {
      setCandidateIndex(nextIndex);
    } else {
      setCandidates([]);
      setStatus('scanning');
    }
  }, [candidateIndex, candidates.length]);

  const handleClose = useCallback(() => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    close();
  }, [close]);

  const handleSwitchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const nextIndex = (deviceIndex + 1) % devices.length;
    console.log(`[Scanner] Switching to camera [${nextIndex}]: ${devices[nextIndex]?.label}`);
    setDeviceIndex(nextIndex);
    setStatus('initializing');
    startCamera(devices[nextIndex].deviceId);
  }, [devices, deviceIndex, startCamera]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const card     = candidates[candidateIndex];
  const imageUrl = card
    ? (card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null)
    : null;

  const STATUS_MSG = {
    initializing: 'Starting camera...',
    scanning:     'Point at a card and hold steady',
    processing:   '🔍 Identifying...',
    error:        'Camera unavailable — check browser permissions',
  };

  const reticleStyle = {
    ...S.reticleBase,
    border: `2px solid ${status === 'processing' ? '#f0c040' : 'rgba(255,255,255,0.6)'}`,
  };

  const tierLabel = scanTier === 1
    ? '✓ Identified by set code'
    : scanTier === 2
      ? '✓ Identified by name'
      : '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.overlay}>
      <video ref={videoRef} style={S.video} playsInline muted autoPlay />
      <canvas ref={diffCanvasRef}    style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {/* UI layer — position:fixed escapes the <video> hardware compositor */}
      <div style={S.uiLayer}>

        {/* Close button — top right */}
        <button style={S.closeBtn} onClick={handleClose}>×</button>

        {/* Switch camera — top left (only when multiple cameras available) */}
        {devices.length > 1 && (
          <button style={S.switchBtn} onClick={handleSwitchCamera} title={`Camera ${deviceIndex + 1}/${devices.length}`}>
            🔄
          </button>
        )}

        {/* Aiming reticle */}
        {(status === 'scanning' || status === 'processing') && (
          <div style={reticleStyle} />
        )}

        {/* Status message */}
        {status !== 'result' && (
          <div style={S.statusBar}>{STATUS_MSG[status] || ''}</div>
        )}

        {/* Card result panel — slides up from bottom */}
        {status === 'result' && card && (
          <div style={S.resultPanel}>
          {candidates.length > 1 && (
            <p style={S.counter}>
              Option {candidateIndex + 1} of {candidates.length}
              {scanTier === 2 && ' — press ❌ to see another printing'}
            </p>
          )}

          {imageUrl && <img src={imageUrl} alt={card.name} style={S.cardImg} />}

          <div style={{ textAlign: 'center' }}>
            <h2 style={S.cardName}>{card.name}</h2>
            <p style={S.cardMeta}>
              {card.set_name} · #{card.collector_number} · {card.rarity}
            </p>
            {card.prices?.usd && <p style={S.cardPrice}>${card.prices.usd}</p>}
            {tierLabel && <p style={{ ...S.counter, marginTop: 4 }}>{tierLabel}</p>}
          </div>

          <div style={S.btnRow}>
            <button style={S.btnReject}  onClick={handleReject}>❌</button>
            <button style={S.btnConfirm} onClick={() => handleConfirm(card)}>✅</button>
          </div>
        </div>
        )}

      </div>{/* end uiLayer */}
    </div>
  );
}

export default OpenCamera;
