# Wordweb query

## query

```sql
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
