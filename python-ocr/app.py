import asyncio
import concurrent.futures
import cv2
import json
import logging
import os
import time
import unicodedata
import numpy as np
from paddleocr import PaddleOCR
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from rapidfuzz import process as rf_process, fuzz
from build_card_db import build as _build_card_db

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ocr")

app = FastAPI()

# ── Card name database ─────────────────────────────────────────────────────────
_CARDDB_DIR = os.environ.get("CARDDB_DIR", os.path.join(os.path.dirname(__file__), "carddb"))
_DB_PATH         = os.path.join(_CARDDB_DIR, "cards_db.json")
_INDEX_PATH      = os.path.join(_CARDDB_DIR, "cards_index.json")
_DB_MAX_AGE_DAYS = 7
_card_names:      list = []   # original-cased names
_card_names_norm: list = []   # lowercase + unaccented, parallel to _card_names
_cards_index:     dict = {}   # normalised name → slim card object (local DB)


def _normalize(text: str) -> str:
    """Strip diacritics and lowercase for locale-agnostic fuzzy matching."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _load_card_names(names: list) -> None:
    global _card_names, _card_names_norm
    _card_names      = names
    _card_names_norm = [_normalize(n) for n in names]
    log.info("[CardDB] Loaded %d card names", len(_card_names))


def _load_cards_index(index: dict) -> None:
    global _cards_index
    _cards_index = index
    log.info("[CardDB] Loaded %d card index entries", len(_cards_index))


def correct_name(raw: str):
    """
    Fuzzy-match raw OCR text against the local card DB.
    Returns (corrected_name, score) or (raw, 0) if no confident match.

    Uses fuzz.ratio (pure edit distance, no partial/substring matching) to
    avoid short card names like "Expel" scoring high against OCR garbage.
    Also guards against word-count mismatches (e.g. a 1-word OCR fragment
    should not match a 4-word card name).
    """
    if not _card_names or len(raw) < 5:
        return raw, 0

    result = rf_process.extractOne(
        _normalize(raw), _card_names_norm,
        scorer=fuzz.ratio, score_cutoff=75,
    )
    if result is None:
        return raw, 0

    _, score, idx = result
    corrected = _card_names[idx]

    # Reject if word counts differ by more than 1 — a 2-word OCR read should
    # not correct to a 5-word card name (and vice-versa).
    raw_words   = len(raw.split())
    match_words = len(corrected.split())
    if abs(raw_words - match_words) > 1:
        log.info("[CardDB] Fuzzy rejected (word mismatch %dw vs %dw): '%s' → '%s'",
                 raw_words, match_words, raw, corrected)
        return raw, 0

    log.info("[CardDB] Fuzzy: '%s' \u2192 '%s' (score=%d)", raw, corrected, score)
    return corrected, score


@app.on_event("startup")
async def _on_startup():
    if os.path.exists(_DB_PATH):
        with open(_DB_PATH, encoding="utf-8") as f:
            _load_card_names(json.load(f))
    else:
        log.warning("[CardDB] cards_db.json not found — fuzzy matching disabled")
    if os.path.exists(_INDEX_PATH):
        with open(_INDEX_PATH, encoding="utf-8") as f:
            _load_cards_index(json.load(f))
    else:
        log.warning("[CardDB] cards_index.json not found — local card lookup disabled")
    asyncio.create_task(_weekly_refresh_loop())


async def _reload_index_from_disk():
    """Hot-reload cards_index.json from disk after a rebuild."""
    if os.path.exists(_INDEX_PATH):
        with open(_INDEX_PATH, encoding="utf-8") as f:
            _load_cards_index(json.load(f))


async def _run_rebuild():
    """Execute the full DB rebuild and hot-reload both data structures."""
    log.info("[CardDB] Starting rebuild...")
    try:
        new_names = await asyncio.to_thread(_build_card_db)
        _load_card_names(new_names)
        await _reload_index_from_disk()
        log.info("[CardDB] Rebuild complete")
    except Exception as exc:
        log.error("[CardDB] Rebuild failed: %s", exc)


async def _weekly_refresh_loop():
    """Check once per day; rebuild the DB if it is older than 7 days."""
    while True:
        await asyncio.sleep(24 * 3600)
        if not os.path.exists(_DB_PATH):
            continue
        age_days = (time.time() - os.path.getmtime(_DB_PATH)) / 86400
        if age_days >= _DB_MAX_AGE_DAYS:
            log.info("[CardDB] DB is %.1f days old \u2014 refreshing...", age_days)
            await _run_rebuild()


# Initialised once — models stay in memory.
# show_log=False silences PaddleOCR's verbose per-inference output.
ocr_reader = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)

# Thread pool for CPU-bound OCR — keeps uvicorn's event loop free for other requests
_ocr_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)

# Separate pool for parallel OCR variant batches (runs inside _ocr_executor workers).
# max_workers=4 lets 3 variants run truly simultaneously per /process request.
_variant_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

# MTG card aspect ratio: 63.5 mm × 88.9 mm → 0.714 portrait / 1.397 landscape.
# Generous bounds for camera angle perspective distortion.
CARD_RATIO_MIN = 0.50
CARD_RATIO_MAX = 1.60

# Max deviation from 90° allowed at each quad corner (degrees).
# MTG cards are rectangles; large deviations indicate trapezoid / background noise.
CORNER_ANGLE_TOLERANCE_DEG = 35.0  # allows up to 55°–125° at each corner

# If the detected region covers more than this fraction of the frame it's
# almost certainly the screen border / background, not a real card.
MAX_CARD_AREA_RATIO = 0.80


# ── Geometry helpers ─────────────────────────────────────────────────────────

def _corner_angles_ok(pts):
    """
    Return True if all 4 corners have angles close to 90°.
    Rejects trapezoids and highly skewed shapes that can't be an MTG card.
    """
    n = len(pts)
    lo = 90.0 - CORNER_ANGLE_TOLERANCE_DEG
    hi = 90.0 + CORNER_ANGLE_TOLERANCE_DEG
    for i in range(n):
        p_prev = pts[(i - 1) % n]
        p_curr = pts[i]
        p_next = pts[(i + 1) % n]
        v1 = p_prev - p_curr
        v2 = p_next - p_curr
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 < 1e-6 or norm2 < 1e-6:
            return False
        cos_a = np.clip(np.dot(v1, v2) / (norm1 * norm2), -1.0, 1.0)
        angle = np.degrees(np.arccos(cos_a))
        if not (lo <= angle <= hi):
            log.info(f"Corner angle {angle:.1f}° out of [{lo:.0f}°,{hi:.0f}°] — rejecting")
            return False
    return True


# ── Geometry helpers (continued) ───────────────────────────────────────────────

def order_points(pts):
    """
    Order 4 points as [top-left, top-right, bottom-right, bottom-left].
    Sort by y first so portrait cards in landscape frames are handled correctly.
    The classic sum/diff trick breaks when the card is taller than it is wide.
    """
    sorted_by_y = pts[np.argsort(pts[:, 1])]
    top    = sorted_by_y[:2][np.argsort(sorted_by_y[:2, 0])]   # top-2 sorted by x
    bottom = sorted_by_y[2:][np.argsort(sorted_by_y[2:, 0])]   # bottom-2 sorted by x
    # [TL, TR, BR, BL]
    return np.array([top[0], top[1], bottom[1], bottom[0]], dtype="float32")


def _quad_aspect_ratio(pts):
    """Return width/height ratio for a 4-point quad (after ordering)."""
    rect = order_points(np.array(pts, dtype="float32"))
    tl, tr, br, bl = rect
    w = (np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2
    h = (np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2
    return (w / h) if h > 0 else 0


def four_point_warp(image, pts):
    """Perspective warp to the detected quadrilateral."""
    rect = order_points(pts)
    tl, tr, br, bl = rect

    width_top    = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    max_width    = int(max(width_top, width_bottom))

    height_left  = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_height   = int(max(height_left, height_right))

    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1],
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (max_width, max_height))


def detect_card(image_bgr):
    """
    Detect the largest convex quadrilateral (the card) in the frame.
    Returns 4 points [[x,y], ...] in native frame coordinates, or None.
    Filters candidates by:
      - aspect ratio (must look like a card)
      - convexity  (rejects bowtie / self-intersecting quads)
      - area bounds (must be 8%–75% of frame — not background noise, not full frame)

    Two-pass strategy:
      Pass 1 (low Canny thresholds) — works well on solid/dark backgrounds.
      Pass 2 (bilateral filter + high Canny thresholds) — suppresses background
              textures/patterns so the card's strong edges survive; only runs when
              pass 1 finds nothing.
    """
    img_h, img_w = image_bgr.shape[:2]
    img_area = img_h * img_w

    MIN_AREA_RATIO = 0.08  # card must cover at least 8% of frame
    MAX_AREA_RATIO = 0.90  # reject only if nearly the entire frame (background border)

    def valid_quad(pts, contour_area):
        """Return True only for convex, near-rectangular quads with card-like proportions."""
        if np.any(pts[:, 0] < 0) or np.any(pts[:, 0] > img_w) or \
           np.any(pts[:, 1] < 0) or np.any(pts[:, 1] > img_h):
            return False
        if not cv2.isContourConvex(pts.reshape(-1, 1, 2).astype(np.int32)):
            return False
        if not _corner_angles_ok(pts):
            return False
        r = _quad_aspect_ratio(pts)
        if not (CARD_RATIO_MIN <= r <= CARD_RATIO_MAX):
            return False
        if not (img_area * MIN_AREA_RATIO <= contour_area <= img_area * MAX_AREA_RATIO):
            return False
        return True

    def _find_card_in_contours(contours, pass_label):
        """Try to extract a valid card quad from a sorted contour list."""
        top_areas = [int(cv2.contourArea(c)) for c in contours[:3]]
        log.info(f"Top-3 contour areas: {top_areas} (frame {img_w}x{img_h})")

        for contour in contours[:10]:
            area = cv2.contourArea(contour)
            if area < img_area * MIN_AREA_RATIO:
                break
            if area > img_area * MAX_AREA_RATIO:
                log.info(f"Contour too large ({100*area/img_area:.1f}%) — skipping")
                continue

            pct  = 100 * area / img_area
            peri = cv2.arcLength(contour, True)

            # Strategy 1: approxPolyDP on raw contour
            for eps in [0.01, 0.02, 0.03, 0.04, 0.05, 0.06]:
                approx = cv2.approxPolyDP(contour, eps * peri, True)
                if len(approx) == 4:
                    pts = approx.reshape(4, 2).astype("float32")
                    if valid_quad(pts, area):
                        log.info(f"Detected via approxPolyDP eps={eps} ({pass_label}): {pct:.1f}% of frame")
                        return pts.tolist()

            # Strategy 2: approxPolyDP on convex hull
            hull      = cv2.convexHull(contour)
            hull_peri = cv2.arcLength(hull, True)
            for eps in [0.02, 0.04, 0.06, 0.08, 0.10]:
                approx = cv2.approxPolyDP(hull, eps * hull_peri, True)
                if len(approx) == 4:
                    pts = approx.reshape(4, 2).astype("float32")
                    if valid_quad(pts, area):
                        log.info(f"Detected via hull eps={eps} ({pass_label}): {pct:.1f}% of frame")
                        return pts.tolist()

            # Strategy 3: minAreaRect on convex hull
            rect = cv2.minAreaRect(cv2.convexHull(contour))
            box  = cv2.boxPoints(rect).astype("float32")
            if valid_quad(box, area):
                log.info(f"Detected via minAreaRect(hull) ({pass_label}): {pct:.1f}% of frame")
                return box.tolist()

        return None

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray  = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray  = clahe.apply(gray)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))

    # ── Pass 1: low thresholds, good on solid backgrounds ──────────────────
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    edges   = cv2.Canny(blurred, 20, 80)
    edges   = cv2.dilate(edges, kernel, iterations=2)
    edges   = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        result = _find_card_in_contours(contours, "pass1")
        if result is not None:
            return result

    # ── Pass 2: bilateral filter + high thresholds, suppresses busy backgrounds
    # Bilateral preserves strong edges (card border) while blurring weak texture edges.
    bilateral = cv2.bilateralFilter(gray, 9, 75, 75)
    bilateral = clahe.apply(bilateral)
    blurred2  = cv2.GaussianBlur(bilateral, (5, 5), 0)
    edges2    = cv2.Canny(blurred2, 50, 150)
    edges2    = cv2.dilate(edges2, kernel, iterations=2)
    edges2    = cv2.morphologyEx(edges2, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours2, _ = cv2.findContours(edges2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours2:
        contours2 = sorted(contours2, key=cv2.contourArea, reverse=True)
        result = _find_card_in_contours(contours2, "pass2-bilateral")
        if result is not None:
            return result

    log.info("No card detected in frame")
    return None


# ── OCR helpers ────────────────────────────────────────────────────────────────

def _ocr_once(img):
    """Run PaddleOCR and return (text, confidence) for the highest-confidence detection.

    PaddleOCR returns a list-of-pages: result[0] is the line list for our image.
    Each line: [bbox, [text, confidence]]
    """
    result = ocr_reader.ocr(img, cls=True)
    # result[0] can be None when the image has no detectable text
    if not result or result[0] is None:
        return "", 0.0
    lines = result[0]
    if not lines:
        return "", 0.0
    best = max(lines, key=lambda r: r[1][1])
    return best[1][0].strip(), float(best[1][1])


def _strip_variants(strip_bgr):
    """
    Return a list of (preprocessed_img, label) variants of the name strip.
    Ordered from most to least likely to succeed:
      - clahe / sharpened / adaptive_thresh cover the vast majority of modern cards
      - direct / inverted / bilateral+clahe / adaptive_thresh_inv are fallbacks
    Returning a list (not a generator) allows parallel batching in run_ocr.
    """
    gray  = cv2.cvtColor(strip_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))

    sharpen_k = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 4)

    bilateral = cv2.bilateralFilter(strip_bgr, 9, 75, 75)
    bil_gray  = cv2.cvtColor(bilateral, cv2.COLOR_BGR2GRAY)

    return [
        (cv2.cvtColor(clahe.apply(gray), cv2.COLOR_GRAY2BGR), "clahe"),
        (cv2.filter2D(strip_bgr, -1, sharpen_k),               "sharpened"),
        (cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR),              "adaptive_thresh"),
        (strip_bgr,                                             "direct"),
        (cv2.cvtColor(cv2.bitwise_not(gray), cv2.COLOR_GRAY2BGR), "inverted"),
        (cv2.cvtColor(clahe.apply(bil_gray), cv2.COLOR_GRAY2BGR), "bilateral+clahe"),
        (cv2.cvtColor(cv2.bitwise_not(thresh), cv2.COLOR_GRAY2BGR), "adaptive_thresh_inv"),
    ]


def run_ocr(strip_bgr):
    """
    Run OCR variants in parallel batches of 3 using _variant_executor.

    Strategy:
      - Build all variant images up-front (pure-Python/NumPy, fast).
      - Submit the first batch of 3 simultaneously; wait for all to complete.
      - If any result reaches >= 0.50 confidence, return immediately.
      - If the whole first batch returns empty text, the image is likely too
        blurry — abort early rather than burning time on remaining variants.
      - Otherwise continue with the next batch.

    Worst-case wall time = ceil(N_variants / 3) × single_ocr_time
    instead of N_variants × single_ocr_time (sequential).
    """
    variants   = _strip_variants(strip_bgr)
    best_text  = ""
    best_conf  = 0.0
    best_score = 0.0  # weighted score: confidence × word-count bonus
    BATCH_SIZE = 3

    for batch_start in range(0, len(variants), BATCH_SIZE):
        batch = variants[batch_start : batch_start + BATCH_SIZE]

        # Submit all variants in this batch concurrently
        futures = [
            (label, _variant_executor.submit(_ocr_once, img))
            for img, label in batch
        ]

        batch_has_text = False
        for label, fut in futures:
            text, conf = fut.result()
            log.info(f"OCR {label}: '{text}' conf={conf:.2f}")
            # Skip garbage: single chars, pure numbers (mana costs like "4", "2W"),
            # or very short strings — card names are never just a digit or symbol.
            _stripped = text.strip()
            _is_garbage = (
                len(_stripped) <= 2
                or _stripped.replace("/", "").replace("{", "").replace("}", "").isdigit()
            )
            if not _is_garbage:
                # Give a 15% bonus per additional word so "Caminho de Lotus" (3 words,
                # conf=0.80 → score=1.04) beats "Lotus" (1 word, conf=1.00 → score=1.00).
                # Low-confidence garbled multi-word reads are unaffected because the base
                # conf is already tiny (e.g. conf=0.03 → score=0.04 regardless of words).
                _n_words = len(_stripped.split())
                _score   = conf * (1.0 + 0.15 * max(0, _n_words - 1))
                if _score > best_score:
                    best_score = _score
                    best_conf  = conf
                    best_text  = text
            if text:
                batch_has_text = True

        if best_conf >= 0.50:
            break

        # First batch entirely empty → image too blurry/dark, stop here
        if batch_start == 0 and not batch_has_text:
            break

    return best_text, best_conf


def extract_name_strip(warped_bgr):
    """
    Crop the top ~12% of the warped card image (where the name lives).
    If the warp came out landscape, try both CW and CCW rotations and pick the
    one with more horizontal edge energy in the top strip (proxy for text lines).
    Upscale 3x to improve EasyOCR accuracy on small text.
    """
    h, w = warped_bgr.shape[:2]

    if w > h:
        def top_horizontal_edges(img):
            g  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            sh = max(40, int(img.shape[0] * 0.12))
            sy = cv2.Sobel(g[:sh, :], cv2.CV_64F, 0, 1, ksize=3)
            return np.sum(np.abs(sy))

        cw  = cv2.rotate(warped_bgr, cv2.ROTATE_90_CLOCKWISE)
        ccw = cv2.rotate(warped_bgr, cv2.ROTATE_90_COUNTERCLOCKWISE)
        warped_bgr = cw if top_horizontal_edges(cw) >= top_horizontal_edges(ccw) else ccw
        h, w = warped_bgr.shape[:2]

    strip_h = max(50, int(h * 0.12))
    strip_w = int(w * 0.72)  # exclude right ~28%: that's the mana-cost area
    strip   = warped_bgr[0:strip_h, :strip_w]
    return cv2.resize(strip, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.post("/admin/rebuild-db")
async def admin_rebuild_db():
    """
    Manually trigger a full card DB rebuild (EN + PT paginated fetch).
    Returns immediately; rebuild runs as a background task (~5-10 min).
    Useful after a new MTG set releases without waiting for the weekly cycle.
    """
    asyncio.create_task(_run_rebuild())
    return JSONResponse({"status": "rebuild started"})


@app.post("/process")
async def process_frame(frame: UploadFile = File(...)):
    """
    Receive a JPEG/PNG frame, detect the card, warp it, run OCR on the name strip.

    Response shape:
      { "found": false }
      { "found": true, "name": str, "confidence": float, "polygon": [[x,y], ...] }
    """
    raw       = await frame.read()
    img_array = np.frombuffer(raw, np.uint8)
    image_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if image_bgr is None:
        return JSONResponse({"found": False, "error": "Could not decode image"}, status_code=400)

    img_area = image_bgr.shape[0] * image_bgr.shape[1]

    # 1. Detect card quadrilateral
    polygon = detect_card(image_bgr)
    if polygon is None:
        log.info("No card detected in frame")
        return JSONResponse({"found": False})

    # Reject detections that cover most of the frame — it's the background, not a card
    pts = np.array(polygon, dtype="float32")
    poly_area = float(cv2.contourArea(pts))
    if poly_area / img_area > MAX_CARD_AREA_RATIO:
        log.info(f"Detected region too large ({100*poly_area/img_area:.1f}% of frame) — skipping")
        return JSONResponse({"found": False})

    # 2. Perspective warp
    warped = four_point_warp(image_bgr, pts)

    # 3. OCR on name strip — run in thread pool so other requests aren't blocked
    strip = extract_name_strip(warped)
    loop  = asyncio.get_event_loop()
    name, confidence = await loop.run_in_executor(_ocr_executor, run_ocr, strip)

    if not name or confidence < 0.30:
        log.info(f"OCR below threshold: '{name}' conf={confidence:.2f}")
        # Still return the polygon so the frontend can show border feedback.
        return JSONResponse({"found": False, "polygon": polygon})

    # Fuzzy-correct OCR text against the local card name DB.
    # Run for anything below 0.97 — catches single-char OCR errors (e.g. "Dolvo" → "Polvo")
    # even at high confidence (0.90–0.96). The word-count guard + score cutoff (75) in
    # correct_name() protect against false corrections.
    if confidence < 0.97:
        corrected, score = correct_name(name)
        if score > 0:
            log.info(f"Corrected '{name}' → '{corrected}' (score={score:.0f})")
            name = corrected

    # Local card index lookup — returns the slim card object if present.
    # Allows scanController.js to skip all Scryfall HTTP calls for known cards.
    card_entry = _cards_index.get(_normalize(name))
    if card_entry:
        log.info(f"[CardDB] Index hit: '{name}' id={card_entry.get('id')}")

    log.info(f"Result: '{name}' conf={confidence:.2f} polygon={polygon}")
    return JSONResponse({
        "found":      True,
        "name":       name,
        "confidence": round(confidence, 3),
        "polygon":    polygon,
        "card":       card_entry,
    })


@app.post("/detect")
async def detect_frame(frame: UploadFile = File(...)):
    """
    Lightweight card detection only — no OCR, no warp.
    Returns the polygon in ~10ms so the frontend can show border feedback
    in real time while the full /process scan is pending.
    """
    raw       = await frame.read()
    img_array = np.frombuffer(raw, np.uint8)
    image_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if image_bgr is None:
        return JSONResponse({"detected": False})

    img_area = image_bgr.shape[0] * image_bgr.shape[1]
    polygon = detect_card(image_bgr)
    if polygon is None:
        return JSONResponse({"detected": False})

    # Reject cards that are too close — polygon covers most of the frame.
    # Returning detected=false here prevents the frontend from accumulating
    # stable frames and firing /process, which would only waste the OCR cycle
    # and burn the full SCAN_COOLDOWN.
    pts = np.array(polygon, dtype="float32")
    poly_area = float(cv2.contourArea(pts))
    if poly_area / img_area > MAX_CARD_AREA_RATIO:
        return JSONResponse({"detected": False})

    return JSONResponse({"detected": True, "polygon": polygon})


@app.get("/health")
def health():
    return {"status": "ok"}
