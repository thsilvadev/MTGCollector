# Scryfall API — Cards Reference (AI-Optimized)

> **Purpose:** This document is a complete, structured reference for the Scryfall Cards API, designed to be used as context by an AI agent building applications against this API.  
> **Base URL:** `https://api.scryfall.com`  
> **Protocol:** HTTPS only (TLS 1.2+). UTF-8 encoding. No authentication required.

---

## 1. Global Rules

| Rule | Detail |
|---|---|
| **User-Agent** | Required header. Must be your app name, e.g. `MyMTGApp/1.0`. Never use the library default. |
| **Accept** | Required header. Use `application/json` for JSON responses. |
| **Rate limit (cards)** | **2 requests/second** (500ms between calls). Exceeding this may result in a ban. |
| **Rate limit (images)** | Separate from the API rate limit; images are served from a CDN. |
| **Formats** | Most card endpoints support `?format=json` (default), `?format=text`, or `?format=image`. |
| **Errors** | All errors return an `Error` object (see §7). Check `status` and `details`. |
| **No plaintext HTTP** | All requests must be HTTPS. |

---

## 2. Card Endpoints

### 2.1 Search Cards
```
GET /cards/search
```
Returns a paginated **List** of cards matching a fulltext search query.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | ✅ | Fulltext search string (Scryfall syntax) |
| `unique` | string | ❌ | Deduplication strategy: `cards` (default), `art`, `prints` |
| `order` | string | ❌ | Sort order: `name`, `set`, `released`, `rarity`, `color`, `usd`, `tix`, `eur`, `cmc`, `power`, `toughness`, `edhrec`, `penny`, `artist`, `review` |
| `dir` | string | ❌ | Sort direction: `auto` (default), `asc`, `desc` |
| `include_extras` | boolean | ❌ | Include tokens, funny cards, etc. Default: `false` |
| `include_multilingual` | boolean | ❌ | Include non-English prints. Default: `false` |
| `include_variations` | boolean | ❌ | Include card variants. Default: `false` |
| `page` | integer | ❌ | Page number (1-indexed). Default: `1` |
| `format` | string | ❌ | `json` (default) or `csv` |
| `pretty` | boolean | ❌ | Pretty-print JSON |

**Returns:** `List<Card>` — 175 cards per page.  
**Rate limit:** 2/s  
**Note:** This endpoint does NOT auto-retry with `include:extras` or `lang:any` like the website does.

**Example:**
```
GET https://api.scryfall.com/cards/search?q=c%3Ared+pow%3D3&order=name
```

---

### 2.2 Get Card by Name
```
GET /cards/named
```
Returns a single **Card** based on name. Designed for chatbots and forum bots.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `exact` | string | ❌* | Exact card name. Returns 404 if not found. |
| `fuzzy` | string | ❌* | Fuzzy card name. Allows misspellings (e.g. `jac bele` → Jace Beleren). |
| `set` | string | ❌ | 3–5 letter set code to narrow search scope |
| `format` | string | ❌ | `json`, `text`, or `image` |
| `face` | string | ❌ | For double-faced cards: `front` or `back` (use with `format=image`) |
| `version` | string | ❌ | Image version: `small`, `normal`, `large`, `png`, `art_crop`, `border_crop` |

*One of `exact` or `fuzzy` is required.

**Behavior:**
- `exact`: exact match only, else 404.
- `fuzzy`: fuzzy match; returns card if unambiguous. If multiple matches, returns 404 with suggestions.

**Rate limit:** 2/s  
**Examples:**
```
GET https://api.scryfall.com/cards/named?exact=Black+Lotus
GET https://api.scryfall.com/cards/named?fuzzy=jac+bele
GET https://api.scryfall.com/cards/named?fuzzy=lightning+bolt&set=lea
```

---

### 2.3 Autocomplete Card Names
```
GET /cards/autocomplete
```
Returns a **Catalog** of up to 20 card names matching a partial string. Good for search input UIs.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | ✅ | Partial card name string |
| `include_extras` | boolean | ❌ | Include tokens, funny cards, etc. Default: `false` |

**Returns:** `Catalog` object with `.data` array of strings.  
**Note:** Spaces, punctuation, and capitalization are ignored. Results sorted by relevance (prefix matches first).

**Example:**
```
GET https://api.scryfall.com/cards/autocomplete?q=ajani
```

---

### 2.4 Get Random Card
```
GET /cards/random
```
Returns a single random **Card** object.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | ❌ | Filter pool with a fulltext search query |
| `format` | string | ❌ | `json`, `text`, or `image` |
| `face` | string | ❌ | `front` or `back` (for DFCs with `format=image`) |
| `version` | string | ❌ | Image version (see §2.2) |

**Rate limit:** 2/s  
**Examples:**
```
GET https://api.scryfall.com/cards/random
GET https://api.scryfall.com/cards/random?q=is%3Acommander
```

---

### 2.5 Get Collection (Batch Lookup)
```
POST /cards/collection
```
Accepts up to **75 card identifiers** and returns a **List** of matching cards.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "identifiers": [
    { "id": "5f8287b1-5bb6-5f4c-ad17-316a40d5bb0c" },
    { "name": "Lightning Bolt" },
    { "set": "mma", "collector_number": "141" },
    { "multiverse_id": 409574 },
    { "mtgo_id": 54957 },
    { "oracle_id": "9e6e07fc-b26b-4c88-9a24-7b19d6a8ba14" },
    { "illustration_id": "2b0a9e4f-..." },
    { "name": "Tarmogoyf", "set": "fut" }
  ]
}
```

**Valid identifier schemas:**

| Schema | Required keys |
|---|---|
| Scryfall ID | `id` |
| MTGO ID | `mtgo_id` |
| Multiverse ID | `multiverse_id` |
| Oracle ID | `oracle_id` |
| Illustration ID | `illustration_id` |
| Card name | `name` |
| Name + set | `name`, `set` |
| Set + collector number | `set`, `collector_number` |

**Returns:** `List<Card>`. Cards not found appear in `not_found` array.  
**Warning:** Do not rely on positional index mapping when some cards are not found.

---

### 2.6 Get Card by Set + Collector Number
```
GET /cards/:code/:number
GET /cards/:code/:number/:lang
```
Returns a single **Card** by its set code and collector number. Optionally specify a language.

**Path Parameters:**

| Param | Description |
|---|---|
| `code` | Set code (e.g. `xln`, `lea`, `mh2`) |
| `number` | Collector number (e.g. `96`, `300a`) |
| `lang` | (Optional) Language code: `en`, `es`, `fr`, `de`, `it`, `pt`, `ja`, `ko`, `ru`, `zhs`, `zht`, `he`, `la`, `grc`, `ar`, `sa`, `ph` |

**Examples:**
```
GET https://api.scryfall.com/cards/xln/96
GET https://api.scryfall.com/cards/dom/202/ja
```

---

### 2.7 Get Card by Multiverse ID
```
GET /cards/multiverse/:id
```
**Example:** `GET https://api.scryfall.com/cards/multiverse/409574`

---

### 2.8 Get Card by MTGO ID
```
GET /cards/mtgo/:id
```
**Example:** `GET https://api.scryfall.com/cards/mtgo/54957`

---

### 2.9 Get Card by Arena ID
```
GET /cards/arena/:id
```
**Example:** `GET https://api.scryfall.com/cards/arena/67330`

---

### 2.10 Get Card by TCGplayer ID
```
GET /cards/tcgplayer/:id
```
Returns card by `tcgplayer_id` or `tcgplayer_etched_id`.  
**Example:** `GET https://api.scryfall.com/cards/tcgplayer/162145`

---

### 2.11 Get Card by Cardmarket ID
```
GET /cards/cardmarket/:id
```
**Example:** `GET https://api.scryfall.com/cards/cardmarket/379041`

---

### 2.12 Get Card by Scryfall ID
```
GET /cards/:id
```
**Example:** `GET https://api.scryfall.com/cards/5f8287b1-5bb6-5f4c-ad17-316a40d5bb0c`

---

## 3. Card Object Schema

Cards are the most complex object in the API. Many fields are optional (`null` if not applicable).

### 3.1 Core Fields

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Scryfall unique ID for this printing |
| `oracle_id` | UUID | Canonical ID shared across all printings of a card |
| `lang` | string | Language code (e.g. `en`, `ja`) |
| `layout` | string | Card layout (see §3.6) |
| `arena_id` | int? | MTG Arena ID |
| `mtgo_id` | int? | MTGO regular version ID |
| `mtgo_foil_id` | int? | MTGO foil version ID |
| `multiverse_ids` | int[]? | Gatherer multiverse IDs |
| `tcgplayer_id` | int? | TCGplayer product ID |
| `tcgplayer_etched_id` | int? | TCGplayer etched foil product ID |
| `cardmarket_id` | int? | Cardmarket product ID |
| `uri` | URI | API URI for this card |
| `scryfall_uri` | URI | Scryfall website URL for this card |
| `rulings_uri` | URI | API URI for this card's rulings |
| `prints_search_uri` | URI | API search URI for all prints of this oracle card |

### 3.2 Gameplay Fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Card name (full, including both faces with `//`) |
| `mana_cost` | string? | Mana cost string, e.g. `{3}{W}{W}` |
| `cmc` | decimal | Converted mana cost (mana value) |
| `type_line` | string | Full type line, e.g. `Legendary Creature — Human Wizard` |
| `oracle_text` | string? | Oracle rules text |
| `power` | string? | Power (may be `*`) |
| `toughness` | string? | Toughness (may be `*`) |
| `loyalty` | string? | Planeswalker loyalty |
| `defense` | string? | Battle defense value |
| `colors` | Color[]? | Card's colors: `W`, `U`, `B`, `R`, `G` |
| `color_identity` | Color[] | Commander color identity |
| `color_indicator` | Color[]? | Color indicator (e.g. Transguild Courier) |
| `keywords` | string[] | Keywords: `Flying`, `Trample`, etc. |
| `legalities` | object | Format legality map (see §3.4) |
| `reserved` | boolean | On the Reserved List |
| `foil` | boolean | Available in foil |
| `nonfoil` | boolean | Available in nonfoil |
| `finishes` | string[] | Available finishes: `nonfoil`, `foil`, `etched`, `glossy` |
| `oversized` | boolean | Oversized card |
| `promo` | boolean | Promotional card |
| `reprint` | boolean | Reprint of a previous set |
| `variation` | boolean | Variant of another card in same set |
| `set_id` | UUID | Scryfall set ID |
| `set` | string | Set code (e.g. `lea`) |
| `set_name` | string | Full set name |
| `set_type` | string | Set type (`core`, `expansion`, `masters`, etc.) |
| `set_uri` | URI | API URI for this set |
| `set_search_uri` | URI | API search URI for cards in this set |
| `scryfall_set_uri` | URI | Scryfall website for this set |
| `collector_number` | string | Collector number (may contain letters) |
| `digital` | boolean | Digital-only card (MTGO/Arena) |
| `rarity` | string | `common`, `uncommon`, `rare`, `mythic`, `special`, `bonus` |
| `card_back_id` | UUID? | ID of the card back design |
| `artist` | string? | Artist name(s) |
| `artist_ids` | UUID[]? | Artist Scryfall IDs |
| `illustration_id` | UUID? | Illustration ID |
| `border_color` | string | `black`, `white`, `borderless`, `silver`, `gold` |
| `frame` | string | Frame edition: `1993`, `1997`, `2003`, `2015`, `future` |
| `frame_effects` | string[]? | Special frame effects: `legendary`, `miracle`, `nyxborn`, `draft`, etc. |
| `security_stamp` | string? | `oval`, `triangle`, `acorn`, `circle`, `arena`, `heart` |
| `full_art` | boolean | Full-art card |
| `textless` | boolean | No text box |
| `booster` | boolean | In booster packs |
| `story_spotlight` | boolean | Story spotlight card |
| `games` | string[] | Available in: `paper`, `arena`, `mtgo` |
| `released_at` | date | First release date (YYYY-MM-DD) |
| `highres_image` | boolean | Has high-resolution scan |
| `image_status` | string | `missing`, `placeholder`, `lowres`, `highres_scan` |
| `image_uris` | object? | Image URLs (see §3.5) |
| `card_faces` | CardFace[]? | For multi-face cards (see §3.7) |
| `all_parts` | RelatedCard[]? | Other cards linked to this one (tokens, etc.) |
| `prices` | object | Price map (see §3.3) |
| `related_uris` | object | Links to Gatherer, EDHRec, etc. |
| `purchase_uris` | object | Links to TCGplayer, Cardmarket, Cardhoarder |

### 3.3 Prices Object

```json
"prices": {
  "usd":        "0.10",   // Paper regular, USD
  "usd_foil":   "0.50",   // Paper foil, USD
  "usd_etched": "1.20",   // Paper etched foil, USD
  "eur":        "0.08",   // Paper regular, EUR
  "eur_foil":   "0.40",   // Paper foil, EUR
  "tix":        "0.02"    // MTGO tickets
}
```
All values are strings or `null`.

### 3.4 Legalities Object

```json
"legalities": {
  "standard":  "legal" | "not_legal" | "banned" | "restricted",
  "pioneer":   "legal",
  "modern":    "legal",
  "legacy":    "legal",
  "vintage":   "restricted",
  "commander": "legal",
  "oathbreaker": "legal",
  "brawl":     "not_legal",
  "historicbrawl": "legal",
  "alchemy":   "not_legal",
  "explorer":  "legal",
  "future":    "legal",
  "oldschool": "not_legal",
  "premodern": "not_legal",
  "predh":     "not_legal"
}
```

### 3.5 Image URIs Object

```json
"image_uris": {
  "small":       "https://cards.scryfall.io/small/...",       // 146×204 JPG
  "normal":      "https://cards.scryfall.io/normal/...",      // 488×680 JPG
  "large":       "https://cards.scryfall.io/large/...",       // 672×936 JPG
  "png":         "https://cards.scryfall.io/png/...",         // 745×1040 PNG (transparent)
  "art_crop":    "https://cards.scryfall.io/art_crop/...",    // Variable JPG (art only)
  "border_crop": "https://cards.scryfall.io/border_crop/..."  // 480×680 JPG (borderless crop)
}
```
**Note:** For double-faced cards, `image_uris` is `null` on the root object; use `card_faces[n].image_uris` instead.

### 3.6 Layouts

| Layout | Description |
|---|---|
| `normal` | Standard single-face card |
| `split` | Split card (two halves, e.g. Fire // Ice) |
| `flip` | Flip card (e.g. Nezumi Shortfang) |
| `transform` | Double-faced, transforms (e.g. Huntmaster of the Fells) |
| `modal_dfc` | Modal double-faced card (e.g. Emeria's Call) |
| `meld` | Meld card (e.g. Bruna, the Fading Light) |
| `leveler` | Level-up card |
| `class` | Class enchantment card |
| `case` | Case card |
| `saga` | Saga enchantment |
| `adventure` | Adventure card (creature + instant/sorcery) |
| `mutate` | Mutate card |
| `prototype` | Prototype card |
| `battle` | Battle card |
| `planar` | Planechase plane card |
| `scheme` | Archenemy scheme |
| `vanguard` | Vanguard card |
| `token` | Token |
| `double_faced_token` | Double-faced token |
| `emblem` | Emblem |
| `augment` | Augment card |
| `host` | Host card |
| `art_series` | Art Series card |
| `reversible_card` | Two unrelated cards on one cardstock |

### 3.7 Card Face Object (for multi-face cards)

| Field | Type | Description |
|---|---|---|
| `name` | string | Face name |
| `mana_cost` | string | Face mana cost |
| `type_line` | string | Face type line |
| `oracle_text` | string? | Face rules text |
| `colors` | Color[]? | Face colors |
| `color_indicator` | Color[]? | Face color indicator |
| `power` | string? | Face power |
| `toughness` | string? | Face toughness |
| `loyalty` | string? | Face loyalty |
| `defense` | string? | Face defense |
| `artist` | string? | Face artist |
| `artist_id` | UUID? | Face artist ID |
| `illustration_id` | UUID? | Face illustration ID |
| `image_uris` | object? | Face image URLs (same structure as §3.5) |
| `flavor_text` | string? | Face flavor text |
| `printed_name` | string? | Localized name |
| `printed_type_line` | string? | Localized type line |
| `printed_text` | string? | Localized oracle text |
| `watermark` | string? | Watermark name |
| `layout` | string? | Face layout (for reversible cards) |

---

## 4. List Object (Pagination)

Endpoints returning multiple cards use a **List** object:

```json
{
  "object":      "list",
  "total_cards": 742,
  "has_more":    true,
  "next_page":   "https://api.scryfall.com/cards/search?page=2&...",
  "data":        [ /* array of Card objects */ ]
}
```

**Pagination pattern:**
```js
let url = "https://api.scryfall.com/cards/search?q=t%3Adragon";
while (url) {
  const res = await fetch(url, { headers: { "User-Agent": "MyApp/1.0", "Accept": "application/json" } });
  const list = await res.json();
  process(list.data);  // 175 cards per page
  url = list.has_more ? list.next_page : null;
  await sleep(100);    // respect rate limits
}
```

---

## 5. Catalog Object

Returned by autocomplete and catalog endpoints:

```json
{
  "object":       "catalog",
  "uri":          "https://api.scryfall.com/catalog/card-names",
  "total_values": 27283,
  "data":         ["Abandon Hope", "Abandon Reason", ...]
}
```

---

## 6. Scryfall Search Syntax (q parameter)

Key syntax operators for building search queries:

| Syntax | Description | Example |
|---|---|---|
| `name:` or bare text | Card name | `lightning bolt` or `name:bolt` |
| `o:` | Oracle text contains | `o:flying` |
| `t:` | Type line contains | `t:dragon t:legendary` |
| `c:` | Color | `c:wur` (white+blue+red) |
| `ci:` | Color identity | `ci:boros` |
| `cmc:` | Converted mana cost | `cmc=3`, `cmc>=5` |
| `pow:` | Power | `pow=*`, `pow>=4` |
| `tou:` | Toughness | `tou<=2` |
| `r:` | Rarity | `r:mythic`, `r:common` |
| `set:` | Set code | `set:mh2` |
| `e:` | Same as `set:` | `e:lea` |
| `format:` | Legal in format | `format:standard` |
| `banned:` | Banned in format | `banned:modern` |
| `is:` | Special properties | `is:commander`, `is:foil`, `is:promo`, `is:fullart` |
| `not:` | Negation of `is:` | `not:reprint` |
| `has:` | Has a property | `has:watermark`, `has:flavor` |
| `lang:` | Card language | `lang:ja` |
| `a:` | Artist | `a:"Terese Nielsen"` |
| `year:` | Release year | `year=2022` |
| `usd:` | USD price | `usd<=1.00` |
| `tix:` | MTGO price in tix | `tix<0.5` |
| `-` prefix | NOT operator | `-t:creature o:flying` |
| `or` | OR operator | `c:w or c:u` |
| `( )` | Grouping | `(t:elf or t:goblin) c:g` |

---

## 7. Error Object

All errors return HTTP 4xx/5xx with a JSON body:

```json
{
  "object":   "error",
  "code":     "not_found",
  "status":   404,
  "details":  "No card found with the given ID.",
  "type":     null,
  "warnings": []
}
```

**Common error codes:**

| Status | Code | Meaning |
|---|---|---|
| 400 | `bad_request` | Bad parameter or invalid query |
| 404 | `not_found` | Card/resource not found |
| 404 | `ambiguous` | Fuzzy match returned multiple results |
| 422 | `unprocessable_entity` | Invalid search query syntax |
| 429 | `too_many_requests` | Rate limit exceeded |
| 500 | `server_error` | Scryfall internal error |

---

## 8. Image Retrieval

### Via endpoint with `format=image`:
```
GET /cards/named?exact=Black+Lotus&format=image&version=large
```
Returns HTTP 302 redirect to the actual image file.

### Via `image_uris` in card object:
```js
const card = await fetch("https://api.scryfall.com/cards/named?exact=Lightning+Bolt", {
  headers: { "User-Agent": "MyApp/1.0", "Accept": "application/json" }
}).then(r => r.json());

const imageUrl = card.image_uris?.normal;  // For single-face cards
// For DFCs:
const frontImageUrl = card.card_faces?.[0]?.image_uris?.normal;
const backImageUrl  = card.card_faces?.[1]?.image_uris?.normal;
```

**Image versions:** `small` (146×204), `normal` (488×680), `large` (672×936), `png` (745×1040, transparent), `art_crop`, `border_crop`

---

## 9. Code Patterns

### Fetch a card by name (JavaScript):
```js
async function getCard(name) {
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
    { headers: { "User-Agent": "MyApp/1.0", "Accept": "application/json" } }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`${err.status}: ${err.details}`);
  }
  return res.json();
}
```

### Search with pagination:
```js
async function searchAll(query) {
  const cards = [];
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
  while (url) {
    const res = await fetch(url, {
      headers: { "User-Agent": "MyApp/1.0", "Accept": "application/json" }
    });
    const page = await res.json();
    if (page.object === "error") throw new Error(page.details);
    cards.push(...page.data);
    url = page.has_more ? page.next_page : null;
    if (url) await new Promise(r => setTimeout(r, 100)); // 100ms delay
  }
  return cards;
}
```

### Batch collection lookup:
```js
async function getCollection(identifiers) {
  // identifiers: array of objects, max 75
  const res = await fetch("https://api.scryfall.com/cards/collection", {
    method: "POST",
    headers: {
      "User-Agent": "MyApp/1.0",
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ identifiers })
  });
  const result = await res.json();
  return { found: result.data, notFound: result.not_found };
}
```

---

## 10. Key Gotchas for AI Agents

1. **DFC images:** Never access `card.image_uris` on a double-faced card (layout `transform`, `modal_dfc`, etc.) — it will be `null`. Always check `card.card_faces[n].image_uris`.
2. **Rate limiting:** Hard limit of 2 req/s on card endpoints. Always add at least 100ms delay in loops.
3. **Mana cost symbols:** Mana symbols use `{W}`, `{U}`, `{B}`, `{R}`, `{G}`, `{C}`, `{X}`, `{1}`, `{2}`, etc.
4. **collector_number is a string:** It can contain letters (e.g. `"300a"`). Never cast it to an integer.
5. **prices are strings or null:** Always check for null before using.
6. **The `foil` boolean field is deprecated.** Use `finishes` array instead.
7. **`multiverse_id` (singular) is deprecated.** Use `multiverse_ids` (array).
8. **Fuzzy search ambiguity:** `fuzzy` returns 404 with `"code": "ambiguous"` if multiple cards match — handle this gracefully.
9. **Search does not retry:** Unlike the website, `/cards/search` will not retry with `include:extras` automatically.
10. **User-Agent is mandatory.** Omitting it may result in your IP being blocked.
