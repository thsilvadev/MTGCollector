/**
 * Bootstrap script — builds the set icon index for Tier 3 identification.
 *
 * Run once (and again when new MTG sets are released):
 *   npm run build-icons
 *
 * Downloads SVGs from Scryfall, converts to 64x64 grayscale PNG,
 * computes an aHash for each, and writes to Backend/data/setIconIndex.json.
 *
 * The script is resumable — already-indexed sets are skipped.
 *
 * Requirements:
 *   - sharp must be installed (npm install sharp)
 *   - On some systems, SVG support requires librsvg:
 *       Ubuntu/Debian: sudo apt-get install librsvg2-dev
 *       Alpine (Docker): apk add librsvg
 */

require('dotenv').config();

const axios = require('axios');
const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const { computeAHash } = require('../services/iconService');

const ICONS_DIR  = path.join(__dirname, '../../data/icons');
const INDEX_PATH = path.join(__dirname, '../../data/setIconIndex.json');
const HEADERS    = { 'User-Agent': 'mtgchest/1.0', 'Accept': 'application/json' };

async function buildIndex() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  // Fetch all sets from Scryfall
  const { data: setsData } = await axios.get('https://api.scryfall.com/sets', { headers: HEADERS });
  const sets = setsData.data;
  console.log(`Fetched ${sets.length} sets from Scryfall.`);

  // Load existing index so the script can be resumed if interrupted
  let index = {};
  if (fs.existsSync(INDEX_PATH)) {
    index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    console.log(`Resuming — ${Object.keys(index).length} sets already indexed.\n`);
  }

  let success = 0;
  let skipped = 0;
  let failed  = 0;

  for (const set of sets) {
    if (index[set.code]) {
      process.stdout.write('.');
      skipped++;
      continue;
    }
    if (!set.icon_svg_uri) {
      skipped++;
      continue;
    }

    try {
      // Download SVG
      const svgResp = await axios.get(set.icon_svg_uri, {
        responseType: 'arraybuffer',
        headers: HEADERS,
      });

      const iconPath = path.join(ICONS_DIR, `${set.code}.png`);

      // Convert SVG → 64x64 grayscale+threshold PNG
      await sharp(Buffer.from(svgResp.data))
        .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .grayscale()
        .threshold(128) // binarize — eliminates rarity color difference
        .png()
        .toFile(iconPath);

      // Compute aHash
      const pngBuffer = fs.readFileSync(iconPath);
      const ahash = await computeAHash(pngBuffer);

      index[set.code] = {
        name:        set.name,
        released_at: set.released_at,
        set_type:    set.set_type,
        ahash,
      };

      console.log(`✓ ${set.code.padEnd(6)} ${set.name}`);
      success++;

      // Save incrementally every 10 sets (in case of interruption)
      if (success % 10 === 0) {
        fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
      }
    } catch (err) {
      console.warn(`✗ ${set.code}: ${err.message}`);
      failed++;
    }

    // Respect Scryfall rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  // Final save
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log(`\nDone. ${success} indexed, ${skipped} skipped, ${failed} failed.`);
  console.log(`Index → ${INDEX_PATH}`);
}

buildIndex().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
