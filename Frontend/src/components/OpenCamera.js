import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuthHeader } from 'react-auth-kit';

// ── Text / content presence detection ───────────────────────────────────────
// For a name strip (not a full card), we check contrast variance.
// A blank/uniform frame has low stddev; a name strip with text has higher.
function hasText(canvas) {
  const ctx  = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.length / 4;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const mean = sum / pixels;
  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    variance += (lum - mean) ** 2;
  }
  const stddev = Math.sqrt(variance / pixels);
  console.log(`[Scanner] Strip stddev: ${stddev.toFixed(1)} (need >20 to pass)`);
  return stddev > 20;
}

// ── Frame stability config ───────────────────────────────────────────────────
const STABILITY_THRESHOLD = 15;  // max average pixel difference to be considered "stable"
const STABILITY_FRAMES    = 3;   // consecutive stable frames required before scanning
const SAMPLE_INTERVAL_MS  = 300; // ms between frame diff samples
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
    transform: 'translate(-50%, -50%)',
    // Name strip: wide and short
    width: '92vw',
    height: '18vh',
    borderRadius: 8, pointerEvents: 'none',
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
    paddingBottom: 28, paddingTop: 20,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16, pointerEvents: 'auto',
  },
  carousel: {
    display: 'flex',
    overflowX: 'scroll',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
    width: '100%',
    // Padding lets the first and last items scroll to center position.
    // Item width = 28vw, so center offset = (100vw - 28vw) / 2 = 36vw.
    // We subtract half the gap (1.5vw) because gap only applies between items.
    paddingLeft: 'calc(50% - 14vw - 1.5vw)',
    paddingRight: 'calc(50% - 14vw - 1.5vw)',
    boxSizing: 'border-box',
    gap: '3vw',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  carouselItem: {
    flex: '0 0 28vw',
    scrollSnapAlign: 'center',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 8,
  },
  cardImg:  { width: '100%', maxWidth: 200, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
  cardName: { margin: '0 0 2px', fontSize: 16, color: '#fff', textAlign: 'center' },
  cardMeta: { margin: 0, color: '#aaa', fontSize: 13, textAlign: 'center' },
  cardPrice:{ margin: '2px 0 0', color: '#f0c040', fontSize: 13 },
  counter:  { color: '#aaa', fontSize: 12, margin: 0 },
  btnRow:   { display: 'flex', gap: 32, marginTop: 8 },
  btnReject: {
    width: 56, height: 56, borderRadius: '50%',
    background: '#c0392b', border: 'none', fontSize: 24,
    cursor: 'pointer', color: '#fff', pointerEvents: 'auto',
  },
  btnConfirm: {
    width: 56, height: 56, borderRadius: '50%',
    background: '#27ae60', border: 'none', fontSize: 24,
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

  const [status, setStatus]           = useState('initializing');
  // 'initializing' | 'scanning' | 'processing' | 'result' | 'error'
  const [candidates, setCandidates]   = useState([]);
  const [nextPage, setNextPage]       = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [centeredIdx, setCenteredIdx] = useState(0);
  const [ocrFragment, setOcrFragment] = useState(null);
  const [scanOracleId, setScanOracleId] = useState(null);
  const [devices, setDevices]         = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const carouselRef = useRef(null);

  const authHeader = useAuthHeader();

  // ── Camera start (called on mount and on camera switch) ────────────────────
  const startCamera = useCallback(async (deviceId = null) => {
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    try {
      // If no specific deviceId, prefer the rear camera via facingMode: ideal.
      // Using 'ideal' (not 'exact') is a soft preference — desktop webcams still work.
      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };

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

      // ── Crop to the name-strip reticle before sending ───────────────────────
      // Reticle CSS: width:92vw, height:13vh, centered (top:50%, translate(-50%,-50%))
      const displayW = window.innerWidth;
      const displayH = window.innerHeight;
      const scale    = Math.max(displayW / videoW, displayH / videoH); // cover scale
      const offsetX  = (displayW - videoW * scale) / 2;
      const offsetY  = (displayH - videoH * scale) / 2;

      const nameDisplayW    = 0.92 * displayW;
      const nameDisplayH    = 0.18 * displayH;
      const nameDisplayLeft = (displayW - nameDisplayW) / 2;
      const nameDisplayTop  = (displayH - nameDisplayH) / 2;

      // Convert to video native coordinates
      const srcLeft = (nameDisplayLeft - offsetX) / scale;
      const srcTop  = (nameDisplayTop  - offsetY) / scale;
      const srcW    = nameDisplayW / scale;
      const srcH    = nameDisplayH / scale;

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

      // Content check — skip if the strip looks blank/uniform
      if (!hasText(canvas)) {
        console.log('[Scanner] Strip looks blank — skipping (center name bar in the reticle)');
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
      console.log(`[Scanner] candidates: ${data.candidates?.length ?? 0}`,
        data.warnings?.length ? `| warnings: ${data.warnings.join('; ')}` : '');

      if (!data.candidates?.length) {
        console.log('[Scanner] No candidates — back to scanning');
        setStatus('scanning');
        return;
      }

      console.log(`[Scanner] Showing: "${data.candidates[0].name}" — ${data.candidates.length} printing(s)${data.nextPage ? ' + more' : ''}`);
      setCandidates(data.candidates);
      setNextPage(data.nextPage || null);
      setCenteredIdx(0);
      setOcrFragment(data.ocrFragment || null);
      setScanOracleId(data.oracleId || null);
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
  const handleConfirm = useCallback(async () => {
    const card = candidates[centeredIdx];
    if (!card) return;
    try {
      await fetch(`${window.name}/collection`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', authorization: authHeader() },
        body:    JSON.stringify({
          card_id:      card.id,
          ...(ocrFragment && scanOracleId
            ? { ocr_fragment: ocrFragment, oracle_id: scanOracleId }
            : {}),
        }),
      });
    } catch (err) {
      console.error('Failed to add card:', err);
    }
    setCandidates([]);
    setNextPage(null);
    setOcrFragment(null);
    setScanOracleId(null);
    setStatus('scanning');
  }, [authHeader, candidates, centeredIdx, ocrFragment, scanOracleId]);

  const handleDismiss = useCallback(() => {
    setCandidates([]);
    setNextPage(null);
    setOcrFragment(null);
    setScanOracleId(null);
    setStatus('scanning');
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `${window.name}/scan/more?url=${encodeURIComponent(nextPage)}`,
        { headers: { authorization: authHeader() } },
      );
      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => [...prev, ...(data.candidates || [])]);
        setNextPage(data.nextPage || null);
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPage, loadingMore, authHeader]);

  // Detect which carousel item is centered
  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    // Each item is 28vw wide + 3vw gap = 31vw per slot
    const itemW = window.innerWidth * 0.31;
    const idx   = Math.round(el.scrollLeft / itemW);
    setCenteredIdx(Math.max(0, Math.min(idx, candidates.length - 1)));
  }, [candidates.length]);

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
  const STATUS_MSG = {
    initializing: 'Starting camera...',
    scanning:     'Center the card name in the strip and hold steady',
    processing:   '🔍 Identifying...',
    error:        'Camera unavailable — check browser permissions',
  };

  const reticleStyle = {
    ...S.reticleBase,
    border: `2px solid ${status === 'processing' ? '#f0c040' : 'rgba(255,255,255,0.6)'}`,
  };

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

        {/* Card result panel — swipeable carousel */}
        {status === 'result' && candidates.length > 0 && (
          <div style={S.resultPanel}>
            {candidates.length > 1 && (
              <p style={S.counter}>Swipe to choose a printing · {centeredIdx + 1} / {candidates.length}{nextPage ? '+' : ''}</p>
            )}

            {/* Carousel */}
            <div
              ref={carouselRef}
              style={S.carousel}
              onScroll={handleCarouselScroll}
            >
              {candidates.map((c, i) => {
                const img = c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null;
                return (
                  <div key={c.id ?? i} style={S.carouselItem}>
                    {img && <img src={img} alt={c.name} style={S.cardImg} />}
                    <h2 style={S.cardName}>{c.name}</h2>
                    <p style={S.cardMeta}>{c.set_name} · #{c.collector_number} · {c.rarity}</p>
                    {c.prices?.usd && <p style={S.cardPrice}>${c.prices.usd}</p>}
                  </div>
                );
              })}
              {/* Load-more ghost card */}
              {nextPage && (
                <div style={S.carouselItem}>
                  <div
                    style={{
                      width: '100%', maxWidth: 200, aspectRatio: '63.5 / 88.9',
                      borderRadius: 8, background: 'rgba(255,255,255,0.08)',
                      border: '2px dashed rgba(255,255,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexDirection: 'column', gap: 8,
                    }}
                    onClick={handleLoadMore}
                  >
                    {loadingMore
                      ? <span style={{ color: '#aaa', fontSize: 13 }}>Loading...</span>
                      : <>
                          <span style={{ fontSize: 28 }}>＋</span>
                          <span style={{ color: '#aaa', fontSize: 12 }}>Load more</span>
                        </>
                    }
                  </div>
                  <h2 style={S.cardName}> </h2>
                  <p style={S.cardMeta}> </p>
                </div>
              )}
            </div>

            <div style={S.btnRow}>
              <button style={S.btnReject}  onClick={handleDismiss}>❌</button>
              <button style={S.btnConfirm} onClick={handleConfirm}>✅</button>
            </div>
          </div>
        )}

      </div>{/* end uiLayer */}
    </div>
  );
}

export default OpenCamera;
