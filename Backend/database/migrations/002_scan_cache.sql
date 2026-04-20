-- Scan cache: maps OCR fragments that previously led to a confirmed card add
-- back to that card's oracle_id, so future scans skip the full waterfall.
--
-- fragment  — the parsed OCR name string that was searched (e.g. "Surto Vital")
-- oracle_id — the Scryfall oracle_id of the confirmed card
-- hits      — number of times this fragment→oracle pair has been confirmed;
--             only looked up when hits >= 2 (avoids poisoning with one-off
--             false positives the user didn't notice)
-- last_seen — for future cache eviction / analytics

CREATE TABLE IF NOT EXISTS scan_cache (
  fragment   VARCHAR(255) NOT NULL,
  oracle_id  VARCHAR(36)  NOT NULL,
  hits       INT          NOT NULL DEFAULT 1,
  last_seen  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (fragment(191), oracle_id)
);

CREATE INDEX scan_cache_fragment_idx ON scan_cache (fragment(191)
