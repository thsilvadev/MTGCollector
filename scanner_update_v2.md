# Card Scanner — Atualização: Python OCR + Overlay Reativo

> **Contexto:** Atualização cirúrgica do scanner existente.  
> **O que NÃO muda:** Toda a lógica de `OpenCamera.jsx` (frame stability, carousel, ✅❌, load more, autenticação). Apenas remove o reticle fixo e adiciona overlay de polígono reativo.  
> **O que muda:** 1) Novo microservice Python (OpenCV + PaddleOCR). 2) Rota `/scan` do Node passa a chamar o Python. 3) Frontend: remove reticle fixo, adiciona canvas de overlay.

---

## 1. Microservice Python

### Estrutura

```
python-ocr/
  Dockerfile
  requirements.txt
  app.py
```

### `python-ocr/requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
opencv-python-headless==4.9.0.80
paddlepaddle==2.6.1
paddleocr==2.7.3
numpy==1.26.4
Pillow==10.3.0
```

### `python-ocr/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxrender1 libxext6 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download PaddleOCR models at build time (evita download em runtime)
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en', show_log=False)"

COPY app.py .

EXPOSE 8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
```

### `python-ocr/app.py`

```python
import cv2
import numpy as np
from paddleocr import PaddleOCR
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image
import io, logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ocr")

app = FastAPI()

# Inicializa uma vez — modelos ficam em memória (~500MB RAM)
ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

# ── Utilitários ────────────────────────────────────────────────────────────────

def order_points(pts):
    """Ordena 4 pontos: [top-left, top-right, bottom-right, bottom-left]."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left
    rect[2] = pts[np.argmax(s)]   # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)] # top-right
    rect[3] = pts[np.argmax(diff)] # bottom-left
    return rect

def four_point_warp(image, pts):
    """Perspective warp para o quadrilátero detectado."""
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
    Detecta o maior quadrilátero convexo (a carta) na imagem.
    Retorna os 4 pontos [[x,y], ...] em coordenadas nativas do frame,
    ou None se não encontrado.
    """
    gray    = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    edges   = cv2.Canny(blurred, 30, 100)

    # Dilata as bordas para fechar lacunas
    kernel  = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edges   = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Pega o maior contorno por área
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for contour in contours[:5]:  # verifica os 5 maiores
        area = cv2.contourArea(contour)
        img_area = image_bgr.shape[0] * image_bgr.shape[1]

        # Carta deve ocupar pelo menos 15% do frame
        if area < img_area * 0.15:
            break

        peri    = cv2.arcLength(contour, True)
        approx  = cv2.approxPolyDP(contour, 0.02 * peri, True)

        if len(approx) == 4:
            pts = approx.reshape(4, 2).astype("float32")
            log.info(f"Card detected: area={area:.0f} ({100*area/img_area:.1f}% of frame)")
            return pts.tolist()

    return None

def extract_name_strip(warped_bgr):
    """
    Recorta os primeiros ~10% do topo da carta warped (onde fica o nome).
    Aplica pré-processamento para melhorar OCR.
    """
    h = warped_bgr.shape[0]
    strip_h = max(40, int(h * 0.10))
    strip   = warped_bgr[0:strip_h, :]

    # Upscale 2x melhora significativamente a acurácia do PaddleOCR
    strip   = cv2.resize(strip, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # Tentativa 1: direto (texto escuro em fundo claro — cartas modernas)
    return strip

def run_ocr(strip_bgr):
    """
    Roda PaddleOCR no strip. Tenta direto e, se confiança baixa, tenta invertido.
    Retorna (texto, confiança).
    """
    def _ocr(img):
        result = ocr_engine.ocr(img, cls=True)
        if not result or not result[0]:
            return "", 0.0
        # Pega a linha de maior confiança
        best = max(result[0], key=lambda r: r[1][1])
        return best[1][0].strip(), float(best[1][1])

    text, conf = _ocr(strip_bgr)
    log.info(f"OCR direct: '{text}' conf={conf:.2f}")

    # Se confiança baixa, tenta com imagem invertida (texto branco → fundo preto)
    if conf < 0.6:
        inverted = cv2.bitwise_not(strip_bgr)
        text2, conf2 = _ocr(inverted)
        log.info(f"OCR inverted: '{text2}' conf={conf2:.2f}")
        if conf2 > conf:
            return text2, conf2

    return text, conf

# ── Rota principal ─────────────────────────────────────────────────────────────

@app.post("/process")
async def process_frame(frame: UploadFile = File(...)):
    """
    Recebe um frame JPEG/PNG, detecta a carta, warp, OCR.
    
    Resposta:
      { found: false }
      { found: true, name: str, confidence: float, polygon: [[x,y], ...] }
    """
    raw = await frame.read()
    img_array = np.frombuffer(raw, np.uint8)
    image_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if image_bgr is None:
        return JSONResponse({"found": False, "error": "Could not decode image"}, status_code=400)

    # 1. Detecta carta
    polygon = detect_card(image_bgr)
    if polygon is None:
        log.info("No card detected in frame")
        return JSONResponse({"found": False})

    # 2. Warp perspectivo
    pts     = np.array(polygon, dtype="float32")
    warped  = four_point_warp(image_bgr, pts)

    # 3. OCR no strip do nome
    strip   = extract_name_strip(warped)
    name, confidence = run_ocr(strip)

    if not name or confidence < 0.4:
        log.info(f"OCR below threshold: '{name}' conf={confidence:.2f}")
        return JSONResponse({"found": False})

    log.info(f"Result: '{name}' conf={confidence:.2f} polygon={polygon}")
    return JSONResponse({
        "found":      True,
        "name":       name,
        "confidence": round(confidence, 3),
        "polygon":    polygon,   # [[x,y], ...] em coordenadas nativas do frame
    })


@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## 2. Docker Compose — Adicionar o microservice

No `docker-compose.yml` existente, adicionar o serviço:

```yaml
  python-ocr:
    build: ./python-ocr
    restart: unless-stopped
    ports:
      - "8001:8001"       # remova se não quiser expor externamente
    environment:
      - OMP_NUM_THREADS=4  # limita threads do PaddleOCR em CPU
    mem_limit: 3g          # seguro com 16GB disponíveis
```

E no serviço do Node, adicionar a variável:

```yaml
    environment:
      - PYTHON_OCR_URL=http://python-ocr:8001
```

---

## 3. Node — Rota `/scan` atualizada

Substitui completamente a lógica de OCR anterior. O Tier único agora é: Python → Scryfall fuzzy.

```js
// server/routes/scan.js  (substitui o arquivo existente)
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');

const upload      = multer({ storage: multer.memoryStorage() });
const PYTHON_URL  = process.env.PYTHON_OCR_URL || 'http://localhost:8001';
const SCRYFALL    = 'https://api.scryfall.com';
const SF_HEADERS  = { 'User-Agent': 'MyCollectionApp/1.0', 'Accept': 'application/json' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── POST /api/scan ─────────────────────────────────────────────────────────────
router.post('/', upload.single('frame'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No frame received.' });

  try {
    // 1. Manda frame pro Python
    const form = new FormData();
    form.append('frame', req.file.buffer, {
      filename:    'frame.png',
      contentType: req.file.mimetype,
    });

    const pyRes = await axios.post(`${PYTHON_URL}/process`, form, {
      headers:        form.getHeaders(),
      timeout:        8000,
      maxContentLength: Infinity,
    });

    const py = pyRes.data;

    if (!py.found) {
      return res.status(404).json({ found: false });
    }

    // 2. Busca no Scryfall pelo nome extraído
    const sfRes = await axios.get(`${SCRYFALL}/cards/search`, {
      headers: SF_HEADERS,
      params: {
        q:                    `"${py.name}"`,
        include_multilingual: true,
        unique:               'prints',
        order:                'released',
        dir:                  'desc',
      },
      timeout: 5000,
    });

    const cards = sfRes.data?.data || [];
    if (!cards.length) {
      return res.status(404).json({ found: false });
    }

    return res.json({
      found:       true,
      candidates:  cards.slice(0, 20),
      nextPage:    sfRes.data?.has_more ? sfRes.data.next_page : null,
      ocrFragment: py.name,
      confidence:  py.confidence,
      polygon:     py.polygon,   // repassado pro frontend
    });

  } catch (err) {
    // Scryfall 404 = nome não encontrado — tenta fuzzy como fallback
    if (err.response?.status === 404 && err.config?.url?.includes('scryfall')) {
      try {
        const fuzzy = await axios.get(`${SCRYFALL}/cards/named`, {
          headers: SF_HEADERS,
          params:  { fuzzy: err.config.params?.q?.replace(/"/g, '') },
          timeout: 5000,
        });
        return res.json({
          found:       true,
          candidates:  [fuzzy.data],
          nextPage:    null,
          ocrFragment: fuzzy.data.name,
          confidence:  null,
          polygon:     null,
        });
      } catch {
        return res.status(404).json({ found: false });
      }
    }

    console.error('[scan] Error:', err.message);
    return res.status(500).json({ error: 'Internal error.' });
  }
});

// ── GET /api/scan/more ─────────────────────────────────────────────────────────
// Paginação — busca próxima página de printings no Scryfall
router.get('/more', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param.' });

  try {
    const sfRes = await axios.get(url, { headers: SF_HEADERS, timeout: 5000 });
    return res.json({
      candidates: sfRes.data?.data || [],
      nextPage:   sfRes.data?.has_more ? sfRes.data.next_page : null,
    });
  } catch (err) {
    console.error('[scan/more] Error:', err.message);
    return res.status(500).json({ error: 'Internal error.' });
  }
});

module.exports = router;
```

---

## 4. Frontend — `OpenCamera.jsx` (alterações cirúrgicas)

**Resumo das mudanças:**
- Remove `S.reticleBase` e `reticleStyle`
- Remove o `<div style={reticleStyle} />` do JSX
- Adiciona `<canvas>` de overlay sobre o vídeo
- Adiciona função `drawPolygon()` que desenha o quadrilátero retornado pelo Python
- O estado `polygon` é limpo quando o resultado é descartado

**Só as partes que mudam — aplicar como diff:**

### 4a. Adicionar estado e ref de polygon (após `const [scanOracleId, ...]`)

```jsx
  const [polygon, setPolygon] = useState(null);
  const overlayCanvasRef = useRef(null);
```

### 4b. Função drawPolygon — adicionar após os refs, antes de `startCamera`

```jsx
  // Desenha o polígono da carta detectada sobre o vídeo.
  // polygon: [[x,y], ...] em coordenadas nativas do frame de vídeo.
  // Precisa converter para coordenadas de display (CSS cover scale).
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

    // objectFit: cover → calcula offset e escala
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
```

### 4c. Atualizar `captureAndScan` — onde hoje faz `setStatus('result')`

Substituir o bloco final do `try` (onde setCandidates é chamado) por:

```jsx
      setCandidates(data.candidates);
      setNextPage(data.nextPage || null);
      setCenteredIdx(0);
      setOcrFragment(data.ocrFragment || null);
      setScanOracleId(data.oracleId || null);
      setPolygon(data.polygon || null);          // ← novo
      drawPolygon(data.polygon || null);         // ← novo
      setStatus('result');
```

### 4d. Limpar polygon no `handleDismiss`

```jsx
  const handleDismiss = useCallback(() => {
    setCandidates([]);
    setNextPage(null);
    setOcrFragment(null);
    setScanOracleId(null);
    setPolygon(null);                           // ← novo
    drawPolygon(null);                          // ← novo (limpa o canvas)
    setStatus('scanning');
  }, [drawPolygon]);
```

### 4e. Limpar polygon no `handleConfirm` (após o fetch)

```jsx
    setPolygon(null);                           // ← novo
    drawPolygon(null);                          // ← novo
```

### 4f. No JSX — remover o reticle, adicionar overlay canvas, adicionar overlayCanvasRef no cleanup

**Remover** estas linhas do JSX:
```jsx
        {/* Aiming reticle */}
        {(status === 'scanning' || status === 'processing') && (
          <div style={reticleStyle} />
        )}
```

**Remover** de `S`:
```js
  reticleBase: { ... },   // remover bloco inteiro
```

**Remover** a variável local `reticleStyle` (a const que usa `S.reticleBase` e `status`).

**Adicionar** o canvas de overlay logo após o `<video>`, ainda dentro de `S.overlay`:
```jsx
      {/* Overlay canvas — desenha polígono da carta detectada */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
```

**No cleanup do useEffect de startCamera**, garantir limpeza:
```jsx
    return () => {
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      // Limpa overlay
      const ctx = overlayCanvasRef.current?.getContext('2d');
      ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    };
```

---

## 5. Mensagem de status — atualizar

Na constante `STATUS_MSG` dentro do componente, atualizar a mensagem de scanning:

```jsx
  const STATUS_MSG = {
    initializing: 'Starting camera...',
    scanning:     'Point the camera at a Magic card',   // ← era "Center the card name in the strip..."
    processing:   '🔍 Identifying...',
    error:        'Camera unavailable — check browser permissions',
  };
```

---

## 6. Checklist de implementação

- [ ] Criar pasta `python-ocr/` com `Dockerfile`, `requirements.txt`, `app.py`
- [ ] Adicionar serviço `python-ocr` no `docker-compose.yml`
- [ ] Adicionar `PYTHON_OCR_URL` nas env vars do serviço Node
- [ ] Substituir `server/routes/scan.js` pela versão acima
- [ ] Aplicar os diffs no `OpenCamera.jsx` (seção 4a–4f)
- [ ] Atualizar mensagem de status (seção 5)
- [ ] `docker compose build python-ocr` (demora na primeira vez — baixa modelos PaddleOCR)
- [ ] Testar rota `GET http://localhost:8001/health` retorna `{"status":"ok"}`
- [ ] Testar rota `POST http://localhost:8001/process` com uma foto de carta

---

## 7. Notas operacionais

**RAM em produção:** PaddleOCR ocupa ~500MB após carregamento. Com 16GB disponíveis, sem problema.  
**Tempo de cold start:** ~10–15s no primeiro request (carrega modelo). Subsequentes: 0.5–1.5s.  
**Idiomas:** O modelo `lang='en'` do PaddleOCR reconhece bem Latin + alfabeto latino estendido (português, espanhol, alemão, francês, italiano). Para japonês/coreano/chinês, instanciar um segundo engine com `lang='japan'` e detectar idioma pelo set — mas isso é otimização futura.  
**Fundo sólido:** A detecção OpenCV funciona melhor com fundo de cor uniforme (mesa, folha de papel). Comunicar isso ao usuário na tela de instruções.
