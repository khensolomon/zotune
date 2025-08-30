# Schema

## list

```sql
CREATE TABLE `list_sense` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `word` VARCHAR(250) NULL DEFAULT NULL,
 `wrte` INT NOT NULL DEFAULT '0' COMMENT 'type_word.id',
 `sense` TEXT NULL DEFAULT NULL COMMENT 'Definition',
 `exam` TEXT NULL DEFAULT NULL COMMENT 'Example',
 `wseq` INT NOT NULL DEFAULT '0' COMMENT 'Sequence',
 `wrkd` INT NOT NULL DEFAULT '0' COMMENT 'type_sense.id',
 `wrid` INT NOT NULL DEFAULT '0' COMMENT 'list_word.id',
 `dated` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP),
 PRIMARY KEY (`id`) USING BTREE,
 INDEX `Pos` (`wrte`) USING BTREE,
 INDEX `Source` (`wrkd`) USING BTREE,
 INDEX `Key` (`id`) USING BTREE,
 INDEX `Text` (`word`) USING BTREE,
 FULLTEXT INDEX `Fulltext` (`sense`),
 CONSTRAINT `Pos` FOREIGN KEY (`wrte`) REFERENCES `type_word` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT `Source` FOREIGN KEY (`wrkd`) REFERENCES `type_sense` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=104336;

# wrte: the ID of "type_word.id". Can not be null but 0 (work type id)
# wseq: definition order within the same words. Can not be null but 0
# wrkd: the ID of "type_sense.id". Can not be null but 0
# wrid: the ID of word from "list_word.id". Can not be null but 0

CREATE TABLE `list_word` (
 `id` INT NOT NULL AUTO_INCREMENT COMMENT 'Word ID',
 `word` VARCHAR(250) NULL DEFAULT NULL COMMENT 'Word English',
 `derived` INT NULL DEFAULT '0' COMMENT 'type_word.id',
 PRIMARY KEY (`id`) USING BTREE,
 INDEX `Key` (`id`) USING BTREE,
 INDEX `Text` (`word`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=COMPACT
AUTO_INCREMENT=305064;
```

## map

```sql
CREATE TABLE `map_thesaurus` (
 `wrid` INT NULL DEFAULT NULL,
 `wlid` INT NULL DEFAULT NULL,
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB;

# wrid and wlid: are the ID of word from "list_word.id"


CREATE TABLE `map_similar` (
 `wrid` INT NOT NULL DEFAULT '0',
 `wlid` INT NOT NULL DEFAULT '0',
 INDEX `Key` (`wrid`, `wlid`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB;

# wrid and wlid: are the ID of word from "list_word.id"

CREATE TABLE `map_antonym` (
 `wrid` INT NOT NULL DEFAULT '0',
 `wlid` INT NOT NULL DEFAULT '0',
 INDEX `Wrid` (`wrid`) USING BTREE,
 INDEX `Wlid` (`wlid`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=COMPACT;

# wrid and wlid: are the ID of word from "list_word.id"

CREATE TABLE `map_derived` (
 `id` INT NULL DEFAULT NULL,
 `dete` INT NULL DEFAULT NULL COMMENT 'type_derive.derived_type',
 `word` VARCHAR(250) NULL DEFAULT NULL,
 `wrig` INT NULL DEFAULT NULL COMMENT 'irregular',  
 `wrte` INT NULL DEFAULT NULL COMMENT 'type_word.id',
 `wrid` INT NULL DEFAULT '0',
 INDEX `Key` (`id`) USING BTREE,
 INDEX `Text` (`word`) USING BTREE
)
COMMENT='id: root_id\r\ndete: derived_type\r\nwrid: word_id \r\nwrig: irreg\r\nwrte: word_type'
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB;

CREATE TABLE `map_derive_see` (
 `id` INT NOT NULL,
 `word_id` INT NOT NULL,
 `types` INT NULL DEFAULT NULL
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=COMPACT;
```

## Type

```sql
CREATE TABLE `type_derive` (
 `derived_type` INT NOT NULL AUTO_INCREMENT,
 `word_type` INT NOT NULL,
 `derivation` VARCHAR(20) NULL DEFAULT NULL,
 PRIMARY KEY (`derived_type`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=COMPACT
AUTO_INCREMENT=11;


CREATE TABLE `type_sense` (
 `id` INT NOT NULL,
 `name` VARCHAR(250) NULL DEFAULT NULL,
 PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=DYNAMIC;

CREATE TABLE `type_source` (
 `id` INT NOT NULL DEFAULT '0',
 `name` VARCHAR(250) NULL DEFAULT NULL COLLATE 'utf8mb3_general_ci'
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB;

CREATE TABLE `type_terms` (
 `id` INT NOT NULL,
 `name` VARCHAR(250) NULL DEFAULT NULL,
 PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB;

CREATE TABLE `type_word` (
 `id` INT NOT NULL,
 `name` VARCHAR(50) NULL DEFAULT NULL,
 `shortname` VARCHAR(5) NULL DEFAULT NULL,
 PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=COMPACT;




```

## user

```sql
CREATE TABLE `user_member` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `name` VARCHAR(255) NOT NULL DEFAULT '',
 `email` VARCHAR(255) NOT NULL,
 `dob` DATE NULL DEFAULT NULL,
 `level` INT NOT NULL DEFAULT '0',
 PRIMARY KEY (`id`) USING BTREE,
 INDEX `email` (`email`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=51;

CREATE TABLE `user_sponsor` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `userid` INT NOT NULL DEFAULT '0',
 `amount` DECIMAL(20,2) NOT NULL DEFAULT '0.00',
 `via` CHAR(50) NULL DEFAULT NULL,
 `dated` DATETIME NOT NULL,
 PRIMARY KEY (`id`) USING BTREE,
 INDEX `userid` (`userid`) USING BTREE,
 CONSTRAINT `userid` FOREIGN KEY (`userid`) REFERENCES `user_member` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=11;


```

## ord

ar, da, de, el, es, fi, fr, hi, iw, ja, ko, ms, nl, no, pl, pt, ro, ru, sv, th, tl, vi, zh

```sql
CREATE TABLE `ord_no` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `word` VARCHAR(250) NULL DEFAULT NULL,
 `sense` TEXT NULL DEFAULT NULL,
 `usage` TEXT NULL DEFAULT NULL,
 `status` INT NULL DEFAULT NULL,
 PRIMARY KEY (`id`) USING BTREE,
 INDEX `index` (`word`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=COMPACT
AUTO_INCREMENT=166243;

```

## med

```sql
CREATE TABLE `med_reference` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `wrid` INT NOT NULL DEFAULT '0',
 `etymology` TINYTEXT NULL DEFAULT NULL,
 `reference` TEXT NULL DEFAULT NULL,
 `variant` TEXT NULL DEFAULT NULL,
 PRIMARY KEY (`id`) USING BTREE,
 INDEX `Word Id` (`wrid`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=3864;

CREATE TABLE `med_sense` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `wrid` INT NOT NULL COMMENT 'word id',
 `wrte` INT NOT NULL DEFAULT '0' COMMENT 'word type of POS',
 `rfid` INT NOT NULL DEFAULT '0' COMMENT 'word reference id',
 `cate` INT NULL DEFAULT '0' COMMENT 'category',
 `trid` INT NULL DEFAULT '0' COMMENT '0:unknown, 1:word, 2:phrase, 3:sentence',
 `sense` TEXT NULL DEFAULT NULL COMMENT 'Definition',
 `exam` TEXT NULL DEFAULT NULL COMMENT 'Example',
 `wrkd` INT NULL DEFAULT '40' COMMENT 'Source id',
 `usg` TEXT NULL DEFAULT NULL,
 `ref` TEXT NULL DEFAULT NULL,
 `note` TEXT NULL DEFAULT NULL,
 `dated` TIMESTAMP NOT NULL,
 PRIMARY KEY (`id`) USING BTREE,
 INDEX `foks_med_sense_type_terms` (`trid`) USING BTREE,
 INDEX `foks_med_sense_type_word` (`wrte`) USING BTREE,
 INDEX `foks_med_sense_med_word` (`wrid`) USING BTREE,
 FULLTEXT INDEX `Sense` (`sense`),
 CONSTRAINT `foks_med_sense_med_word` FOREIGN KEY (`wrid`) REFERENCES `med_word` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT `foks_med_sense_type_terms` FOREIGN KEY (`trid`) REFERENCES `type_terms` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CONSTRAINT `foks_med_sense_type_word` FOREIGN KEY (`wrte`) REFERENCES `type_word` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=49339;

CREATE TABLE `med_thesaurus` (
 `wrid` INT NOT NULL,
 `wlid` INT NOT NULL,
 `cate` INT NULL DEFAULT '0' COMMENT 'category',
 INDEX `word id` (`wrid`) USING BTREE,
 INDEX `reference id` (`wlid`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB;

CREATE TABLE `med_word` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `word` VARCHAR(255) NOT NULL DEFAULT '',
 `ipa` VARCHAR(255) NULL DEFAULT NULL,
 `mlc` VARCHAR(255) NULL DEFAULT NULL,
 `cate_count` INT NULL DEFAULT '0',
 PRIMARY KEY (`id`) USING BTREE,
 UNIQUE INDEX `Unique` (`word`) USING BTREE,
 INDEX `Word` (`word`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=27692;


```

## other

blog, countries, fonts

```sql
CREATE TABLE `blog` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `catalog` INT NOT NULL DEFAULT '0',
 `user` INT NOT NULL DEFAULT '0',
 `name` VARCHAR(150) NULL DEFAULT NULL,
 `email` VARCHAR(100) NULL DEFAULT NULL,
 `code` VARCHAR(150) NULL DEFAULT NULL,
 `title` VARCHAR(250) NULL DEFAULT NULL,
 `content` TEXT NULL DEFAULT NULL,
 `reply` TEXT NULL DEFAULT NULL,
 `dated` TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
 `ip` VARCHAR(50) NULL DEFAULT NULL,
 `status` INT NOT NULL DEFAULT '0',
 PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=DYNAMIC
AUTO_INCREMENT=46;

CREATE TABLE `countries` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `country_code` VARCHAR(2) NOT NULL DEFAULT '',
 `country_name` VARCHAR(100) NOT NULL DEFAULT '',
 PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
ROW_FORMAT=DYNAMIC
AUTO_INCREMENT=240;

CREATE TABLE `fonts` (
 `id` INT NOT NULL AUTO_INCREMENT,
 `file` CHAR(50) NOT NULL DEFAULT '',
 `types` INT NOT NULL DEFAULT '0',
 `view` BIGINT NOT NULL DEFAULT '0',
 `download` BIGINT NOT NULL DEFAULT '0',
 `restricted` INT NOT NULL DEFAULT '0',
 `dated` TIMESTAMP NOT NULL,
 UNIQUE INDEX `Unique` (`file`) USING BTREE,
 INDEX `Id` (`id`) USING BTREE,
 INDEX `Key` (`file`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
AUTO_INCREMENT=633;


```
