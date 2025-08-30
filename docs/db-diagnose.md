# Diagnose

## task

```sql
-- Check if list_word has duplicates for words:
SELECT word, COUNT(*) AS cnt
FROM list_word
GROUP BY word
HAVING cnt > 1
ORDER BY cnt DESC
LIMIT 20;
