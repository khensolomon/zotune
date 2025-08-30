# Wordweb task

## word

```sql
-- list_word -> copy and while modifying 
CREATE TABLE list_word AS
    SELECT 
        old.word_id AS id,
        old.word AS word,
        old.equiv_word AS equivalent,
        old.is_derived AS derived
    FROM org_unique_words AS old;

ALTER TABLE list_word 
    MODIFY id INT NOT NULL AUTO_INCREMENT,
ADD PRIMARY KEY (id);
```

## antonym

```sql
CREATE TABLE map_antonym AS
    SELECT 
        old.wrid AS wrid,
        old.wlid AS wlid
    FROM org_antonym AS old;

ALTER TABLE map_antonym
    INDEX (wrid),
    INDEX (wlid),
    FOREIGN KEY (wrid) REFERENCES list_word(id),
    FOREIGN KEY (wlid) REFERENCES list_word(id);


CREATE TABLE map_antonym (
    `wrid` INT NOT NULL COMMENT 'Word s ID',
    `wlid` INT NOT NULL COMMENT 'Word t ID',
    INDEX (wrid),
    INDEX (wlid),
    FOREIGN KEY (wrid) REFERENCES list_word(id),
    FOREIGN KEY (wlid) REFERENCES list_word(id)
);

INSERT INTO map_antonym (wrid, wlid)
    SELECT 
        wrid,
        wlid
    FROM org_antonym;

INSERT INTO map_antonym (wrid, wlid)
    SELECT o.wrid, o.wlid
        FROM org_antonym o
            JOIN list_word lw1 ON o.wrid = lw1.id
            JOIN list_word lw2 ON o.wlid = lw2.id;

SELECT o.*
    FROM org_antonym o
        LEFT JOIN list_word lw1 ON o.wrid = lw1.id
        LEFT JOIN list_word lw2 ON o.wlid = lw2.id
    WHERE lw1.id IS NULL OR lw2.id IS NULL;
```

## similar

```sql
CREATE TABLE map_similar (
    `wrid` INT NOT NULL COMMENT 'Word s ID',
    `wlid` INT NOT NULL COMMENT 'Word t ID',
    INDEX (wrid),
    INDEX (wlid),
    FOREIGN KEY (wrid) REFERENCES list_word(id),
    FOREIGN KEY (wlid) REFERENCES list_word(id)
);

INSERT INTO map_similar (wrid, wlid)
    SELECT 
        old.id1 AS wrid,
        old.id2 AS wlid
    FROM org_similar AS old;
