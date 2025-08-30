# derive migration

```sql
-- Create the New Table
CREATE TABLE map_derived (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `base_word_id` INT NOT NULL COMMENT 'eg. love',
    `derived_word_id` INT NOT NULL COMMENT 'eg. loved',
    -- `relation_type` ENUM('inflection', 'conjugation', 'plural', 'other') DEFAULT 'inflection',

    `dete` INT NULL DEFAULT NULL COMMENT 'type_derive.derived_type',
    `wrig` INT NULL DEFAULT NULL COMMENT 'irregular eg. 0-3',  
    `wrte` INT NULL DEFAULT NULL COMMENT 'type_word.id',

    -- UNIQUE KEY uq_relation (base_word_id, derived_word_id),
    INDEX (base_word_id),
    INDEX (derived_word_id),
    FOREIGN KEY (base_word_id) REFERENCES list_word(id),
    FOREIGN KEY (derived_word_id) REFERENCES list_word(id)
);


-- Populate from Old Table
INSERT INTO map_derived (base_word_id, derived_word_id, dete, wrig, wrte)
SELECT 
    md.root_id AS base_word_id,
    lw.id AS derived_word_id,
    -- 'inflection' AS relation_type
    md.derived_type AS dete,
    md.irreg AS wrig,
    md.word_type AS wrte
FROM org_derived md
-- JOIN list_word lw ON lw.word = md.word;
-- JOIN list_word lw ON BINARY lw.word = md.word;
JOIN list_word lw ON BINARY lw.word = md.word AND lw.derived = md.wrte;

INSERT INTO map_derived (base_word_id, derived_word_id, dete, wrig, wrte)
SELECT 
    md.root_id AS base_word_id,
    lw.id AS derived_word_id,
    -- 'inflection' AS relation_type
    md.derived_type AS dete,
    md.irreg AS wrig,
    md.word_type AS wrte
FROM org_derived md
JOIN list_word lw 
  -- ON lw.word COLLATE utf8mb3_bin = md.word COLLATE utf8mb3_bin
  ON CAST(lw.word AS BINARY) = CAST(md.word AS BINARY)
  AND (lw.derived = md.word_type OR md.word_type = 0);


-- Check for Missing Words
SELECT DISTINCT md.word
FROM org_derived md
LEFT JOIN list_word lw ON lw.word = md.word
WHERE lw.id IS NULL;

-- Verify Migration
-- Count old vs new: 151755 -> 154115 -> 151756
SELECT COUNT(*) FROM org_derived;
SELECT COUNT(*) FROM map_derived;

-- Then spot check:
SELECT b.word AS base, d.word AS derived
FROM map_derived mn
JOIN list_word b ON mn.base_word_id = b.id
JOIN list_word d ON mn.derived_word_id = d.id
LIMIT 20;

-- Simple Check
SELECT *
FROM map_derived
WHERE base_word_id = derived_word_id;
-- Count Only
SELECT COUNT(*) AS self_relations
FROM map_derived
WHERE base_word_id = derived_word_id;
-- With Word Names (nicer view)
SELECT 
    b.word AS base_word,
    d.word AS derived_word,
    mn.*
FROM map_derived mn
JOIN list_word b ON mn.base_word_id = b.id
JOIN list_word d ON mn.derived_word_id = d.id
WHERE mn.base_word_id = mn.derived_word_id;



-- Compare Counts per Mapping
SELECT 
    m.id AS base_word_id,
    m.word AS derived_word,
    COUNT(DISTINCT lw.id) AS match_count
FROM org_derived m
JOIN list_word lw 
  ON BINARY lw.word = m.word
GROUP BY m.id, m.word
HAVING match_count > 1;

-- Inspect That Word -> being
SELECT lw.id, lw.word
FROM list_word lw
WHERE BINARY lw.word = '<the_derived_word_from_above>';


-- search
-- Get all derived forms of love:
SELECT d.word AS derived
FROM map_derived m
JOIN list_word b ON m.base_word_id = b.id
JOIN list_word d ON m.derived_word_id = d.id
WHERE b.word = 'love';

-- Find the base of a given derived form:
SELECT b.word AS base
FROM map_derived m
JOIN list_word b ON m.base_word_id = b.id
JOIN list_word d ON m.derived_word_id = d.id
WHERE d.word = 'loved';
