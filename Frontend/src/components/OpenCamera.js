import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuthHeader } from 'react-auth-kit';

// ── Detection config ─────────────────────────────────────────────────────────
// /detect fires continuously regardless of camera motion. Stability is measured
// by the polygon centroid position across frames, not pixel-diff of the whole frame.
// This works naturally with handheld tremor: the hand moves the card AND the
// camera together, so the centroid stays roughly fixed even while the frame shifts.
const DETECT_INTERVAL_MS          = 400;  // ms between /detect polls
const POLYGON_STABLE_FRAMES       = 3;    // consecutive detections within drift limit → trigger /scan
const POLYGON_STABLE_MAX_DRIFT_PX = 30;  // max centroid drift in 480px-wide space (~9% card width)
const SCAN_COOLDOWN_MS            = 3000; // minimum ms between /scan calls

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
  const streamRef           = useRef(null);
  const prevFrameRef        = useRef(null);
  const stableCountRef      = useRef(0);
  const lastScanRef         = useRef(0);
  const isScanningRef       = useRef(false);
  const intervalRef         = useRef(null);
  const isMountedRef        = useRef(true);
  const abortControllerRef  = useRef(null);
  const cardDetectedRef     = useRef(false); // mirrors cardDetected state for use inside interval
  const polygonHistoryRef   = useRef([]);    // recent polygon centroids [cx,cy] in 480px space

  const [status, setStatus]           = useState('initializing');
  // 'initializing' | 'scanning' | 'processing' | 'result' | 'error'
  const [cardDetected, setCardDetected] = useState(false); // polygon visible, no result yet
  const [candidates, setCandidates]   = useState([]);
  const [nextPage, setNextPage]       = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [centeredIdx, setCenteredIdx] = useState(0);
  const [ocrFragment, setOcrFragment] = useState(null);
  const [scanOracleId, setScanOracleId] = useState(null);
  const [polygon, setPolygon]         = useState(null);
  const [devices, setDevices]         = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const carouselRef      = useRef(null);
  const overlayCanvasRef = useRef(null);

  const authHeader = useAuthHeader();

  // Draws the detected card polygon over the video using CSS cover-scale math.
  // pts: [[x,y], ...] in native video coordinates. Pass null to clear.
  const drawPolygon = useCallback((pts) => {
    const canvas = overlayCanvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    const displayW = canvas.width  = window.innerWidth;
    const displayH = canvas.height = window.innerHeight;
    const videoW   = video.videoWidth;
    const videoH   = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, displayW, displayH);

    if (!pts || pts.length !== 4) return;

    const scale   = Math.max(displayW / videoW, displayH / videoH);
    const offsetX = (displayW - videoW * scale) / 2;
    const offsetY = (displayH - videoH * scale) / 2;

    const toDisplay = ([x, y]) => [x * scale + offsetX, y * scale + offsetY];
    const mapped = pts.map(toDisplay);

    ctx.beginPath();
    ctx.moveTo(...mapped[0]);
    mapped.slice(1).forEach(p => ctx.lineTo(...p));
    ctx.closePath();
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth   = 3;
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur  = 8;
    ctx.stroke();
  }, []);

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
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isScanningRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const ctx = overlayCanvasRef.current?.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    };
  }, [startCamera]);

  // ── Pause scanner when app goes to background (standby / app switch) ────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isScanningRef.current = false;
        streamRef.current?.getTracks().forEach(t => { t.enabled = false; });
      } else {
        streamRef.current?.getTracks().forEach(t => { t.enabled = true; });
        // Resume scanning only if we were in scanning state
        setStatus(s => s === 'processing' ? 'scanning' : s);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Re-draw polygon whenever it changes (survives React re-renders)
  useEffect(() => {
    drawPolygon(polygon);
  }, [polygon, drawPolygon]);

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

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;

      // Capture full frame — Python OCR handles card detection and perspective warp
      canvas.width  = videoW;
      canvas.height = videoH;
      canvas.getContext('2d').drawImage(video, 0, 0);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
      const form = new FormData();
      form.append('frame', blob, 'frame.jpg');

      const res = await fetch(`${window.name}/scan`, {
        method:  'POST',
        headers: { authorization: authHeader() },
        body:    form,
        signal:  controller.signal,
      });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        console.warn(`[Scanner] /scan returned HTTP ${res.status}`);
        setStatus('scanning');
        return;
      }

      const data = await res.json();
      console.log(`[Scanner] candidates: ${data.candidates?.length ?? 0}`,
        data.warnings?.length ? `| warnings: ${data.warnings.join('; ')}` : '');

      // Always draw polygon if the Python service detected card borders,
      // even when OCR hasn't produced a confident result yet.
      if (data.polygon) {
        setPolygon(data.polygon);
        drawPolygon(data.polygon);
        setCardDetected(true);
      } else {
        setPolygon(null);
        drawPolygon(null);
        setCardDetected(false);
      }

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
      setCardDetected(false);
      setPolygon(data.polygon || null);
      drawPolygon(data.polygon || null);
      setStatus('result');
    } catch (err) {
      if (err.name === 'AbortError') return; // fetch cancelled on unmount — silent exit
      console.error('[Scanner] Scan error:', err);
      if (isMountedRef.current) setStatus('scanning');
    } finally {
      isScanningRef.current = false;
    }
  }, [authHeader, drawPolygon]);

  // ── Card detection loop ───────────────────────────────────────────────────
  // Polls /detect at a fixed interval WITHOUT requiring frame pixel-stability.
  // Stability is inferred from the card polygon centroid: if the centroid stays
  // within POLYGON_STABLE_MAX_DRIFT_PX across POLYGON_STABLE_FRAMES consecutive
  // detections, the card is "held steadily enough" and /scan fires.
  useEffect(() => {
    if (status !== 'scanning') {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const video     = videoRef.current;
      const capCanvas = captureCanvasRef.current;
      if (!video || !capCanvas || video.readyState < 2 || isScanningRef.current) return;

      const DETECT_W = 480;
      const DETECT_H = Math.round(video.videoHeight * (DETECT_W / video.videoWidth));
      capCanvas.width  = DETECT_W;
      capCanvas.height = DETECT_H;
      capCanvas.getContext('2d').drawImage(video, 0, 0, DETECT_W, DETECT_H);

      capCanvas.toBlob(blob => {
        if (!blob || !isMountedRef.current || isScanningRef.current) return;
        const form = new FormData();
        form.append('frame', blob, 'frame.jpg');
        fetch(`${window.name}/detect`, {
          method:  'POST',
          headers: { authorization: authHeader() },
          body:    form,
          signal:  abortControllerRef.current?.signal,
        })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!isMountedRef.current) return;

            if (d?.detected && d.polygon) {
              // Scale polygon to native video coordinates and draw overlay
              const scaleX = video.videoWidth  / DETECT_W;
              const scaleY = video.videoHeight / DETECT_H;
              const scaled = d.polygon.map(([x, y]) => [x * scaleX, y * scaleY]);
              drawPolygon(scaled);
              setCardDetected(true);
              cardDetectedRef.current = true;

              // Track centroid in 480px space for drift comparison
              const cx = d.polygon.reduce((s, p) => s + p[0], 0) / d.polygon.length;
              const cy = d.polygon.reduce((s, p) => s + p[1], 0) / d.polygon.length;
              const hist = polygonHistoryRef.current;
              hist.push([cx, cy]);
              if (hist.length > POLYGON_STABLE_FRAMES) hist.shift();

              // Fire /scan when centroid has been stable enough for N consecutive frames
              if (!isScanningRef.current && hist.length >= POLYGON_STABLE_FRAMES) {
                const mx = hist.reduce((s, c) => s + c[0], 0) / hist.length;
                const my = hist.reduce((s, c) => s + c[1], 0) / hist.length;
                const isStable = hist.every(([x, y]) => Math.hypot(x - mx, y - my) <= POLYGON_STABLE_MAX_DRIFT_PX);
                if (isStable) {
                  console.log('[Scanner] Polygon centroid stable — triggering scan');
                  polygonHistoryRef.current = [];
                  captureAndScan();
                }
              }
            } else {
              // No card in frame — clear overlay and reset centroid history
              drawPolygon(null);
              setCardDetected(false);
              cardDetectedRef.current = false;
              polygonHistoryRef.current = [];
            }
          })
          .catch(() => {});
      }, 'image/jpeg', 0.75);
    }, DETECT_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [status, captureAndScan, authHeader, drawPolygon]);

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
    setCardDetected(false);
    setPolygon(null);
    drawPolygon(null);
    setStatus('scanning');
  }, [authHeader, candidates, centeredIdx, drawPolygon, ocrFragment, scanOracleId]);

  const handleDismiss = useCallback(() => {
    setCandidates([]);
    setNextPage(null);
    setOcrFragment(null);
    setScanOracleId(null);
    setCardDetected(false);
    setPolygon(null);
    drawPolygon(null);
    setStatus('scanning');
  }, [drawPolygon]);

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
    scanning:     cardDetected ? 'Card detected — hold steady...' : 'Point the camera at a Magic card',
    processing:   '🔍 Identifying...',
    error:        'Camera unavailable — check browser permissions',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.overlay}>
      <video ref={videoRef} style={S.video} playsInline muted autoPlay />
      <canvas ref={diffCanvasRef}    style={{ display: 'none' }} />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      {/* UI layer — position:fixed escapes the <video> hardware compositor */}
      <div style={S.uiLayer}>

        {/* Overlay canvas — position:fixed so it sits above the GPU video layer */}
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: 'fixed', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: 1001,
          }}
        />

        {/* Close button — top right */}
        <button style={S.closeBtn} onClick={handleClose}>×</button>

        {/* Switch camera — top left (only when multiple cameras available) */}
        {devices.length > 1 && (
          <button style={S.switchBtn} onClick={handleSwitchCamera} title={`Camera ${deviceIndex + 1}/${devices.length}`}>
            🔄
          </button>
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
