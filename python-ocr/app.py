import asyncio
import concurrent.futures
import cv2
import numpy as np
import easyocr
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ocr")

app = FastAPI()

# Initialised once — models stay in memory
ocr_reader = easyocr.Reader(['en'], gpu=False)

# Thread pool for CPU-bound OCR — keeps uvicorn's event loop free for other requests
_ocr_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)

# MTG card aspect ratio (width/height): ~0.716 portrait, ~1.397 landscape.
CARD_RATIO_MIN = 0.45
CARD_RATIO_MAX = 2.20

# If the detected region covers more than this fraction of the frame it's
# almost certainly the screen border / background, not a real card.
MAX_CARD_AREA_RATIO = 0.80


# ── Geometry helpers ───────────────────────────────────────────────────────────

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
    """
    img_h, img_w = image_bgr.shape[:2]
    img_area = img_h * img_w

    gray  = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)

    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    edges   = cv2.Canny(blurred, 20, 80)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges  = cv2.dilate(edges, kernel, iterations=2)
    edges  = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        log.info("No contours found at all")
        return None

    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    top_areas = [int(cv2.contourArea(c)) for c in contours[:3]]
    log.info(f"Top-3 contour areas: {top_areas} (frame {img_w}x{img_h})")

    MIN_AREA_RATIO = 0.08  # card must cover at least 8% of frame
    MAX_AREA_RATIO = 0.75  # anything over 75% is likely background/whole-screen

    def valid_quad(pts, contour_area):
        """Return True only for convex quads with card-like aspect ratio and bounded area."""
        # Convexity check — rejects bowtie shapes where lines cross
        if not cv2.isContourConvex(pts.reshape(-1, 1, 2).astype(np.int32)):
            return False
        # Aspect ratio check
        r = _quad_aspect_ratio(pts)
        if not (CARD_RATIO_MIN <= r <= CARD_RATIO_MAX):
            return False
        # Area check using the *contour* area (not the simplified polygon area which can be inaccurate)
        if not (img_area * MIN_AREA_RATIO <= contour_area <= img_area * MAX_AREA_RATIO):
            return False
        return True

    for contour in contours[:6]:
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
                    log.info(f"Detected via approxPolyDP eps={eps}: {pct:.1f}% of frame")
                    return pts.tolist()

        # Strategy 2: approxPolyDP on convex hull (always convex — hull fixes crossing lines)
        hull      = cv2.convexHull(contour)
        hull_peri = cv2.arcLength(hull, True)
        for eps in [0.02, 0.04, 0.06, 0.08, 0.10]:
            approx = cv2.approxPolyDP(hull, eps * hull_peri, True)
            if len(approx) == 4:
                pts = approx.reshape(4, 2).astype("float32")
                if valid_quad(pts, area):
                    log.info(f"Detected via hull eps={eps}: {pct:.1f}% of frame")
                    return pts.tolist()

        # Strategy 3: minAreaRect fallback (always convex, always 4 points)
        rect = cv2.minAreaRect(contour)
        box  = cv2.boxPoints(rect).astype("float32")
        if valid_quad(box, area):
            log.info(f"Detected via minAreaRect: {pct:.1f}% of frame")
            return box.tolist()

    log.info("No card detected in frame")
    return None


# ── OCR helpers ────────────────────────────────────────────────────────────────

def _ocr_once(img):
    """Run EasyOCR and return (text, confidence) for the highest-confidence detection."""
    result = ocr_reader.readtext(img, width_ths=0.9, paragraph=False)
    if not result:
        return "", 0.0
    best = max(result, key=lambda r: r[2])
    return best[1].strip(), float(best[2])


def _strip_variants(strip_bgr):
    """
    Yield (preprocessed_img, label) variants of the name strip.
    Trying multiple variants improves hit rate across different card frames
    (old/new border, foil, light vs. dark background).
    """
    yield strip_bgr, "direct"

    gray = cv2.cvtColor(strip_bgr, cv2.COLOR_BGR2GRAY)
    yield cv2.cvtColor(cv2.bitwise_not(gray), cv2.COLOR_GRAY2BGR), "inverted"

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    yield cv2.cvtColor(clahe.apply(gray), cv2.COLOR_GRAY2BGR), "clahe"

    sharpen_k = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    yield cv2.filter2D(strip_bgr, -1, sharpen_k), "sharpened"

    bilateral = cv2.bilateralFilter(strip_bgr, 9, 75, 75)
    bil_gray  = cv2.cvtColor(bilateral, cv2.COLOR_BGR2GRAY)
    yield cv2.cvtColor(clahe.apply(bil_gray), cv2.COLOR_GRAY2BGR), "bilateral+clahe"

    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 4)
    yield cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR), "adaptive_thresh"
    yield cv2.cvtColor(cv2.bitwise_not(thresh), cv2.COLOR_GRAY2BGR), "adaptive_thresh_inv"


def run_ocr(strip_bgr):
    """
    Try multiple preprocessing variants and return the best (text, confidence).
    Short-circuits as soon as confidence >= 0.65.
    """
    best_text, best_conf = "", 0.0

    for variant, label in _strip_variants(strip_bgr):
        text, conf = _ocr_once(variant)
        log.info(f"OCR {label}: '{text}' conf={conf:.2f}")
        if conf > best_conf:
            best_conf = conf
            best_text = text
        if best_conf >= 0.50:
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
    strip   = warped_bgr[0:strip_h, :]
    return cv2.resize(strip, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)


# ── Routes ─────────────────────────────────────────────────────────────────────

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

    log.info(f"Result: '{name}' conf={confidence:.2f} polygon={polygon}")
    return JSONResponse({
        "found":      True,
        "name":       name,
        "confidence": round(confidence, 3),
        "polygon":    polygon,
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

    return JSONResponse({"detected": True, "polygon": polygon})


@app.get("/health")
def health():
    return {"status": "ok"}
