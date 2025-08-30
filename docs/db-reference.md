# ?

```bash
type_derive.derived_type
type_derive.word_type
type_derive.derivation


type_word.id
type_word.name
type_word.shortname


type_sense..id
type_sense.name

list_word.id
list_word.word
list_word.derived


map_derived
id: root_id - list_word.id
dete: derived_type - type_derive.derived_type
wrid: word_id - 
wrig: irreg - 
wrte: word_type - type_word.id


list_sense.id
list_sense.word
list_sense.wrte -> type_word.id
list_sense.sense
list_sense.exam
list_sense.wseq
list_sense.wrkd -> type_sense.id
list_sense.wrid -> list_word.id
list_sense.dated


table: {
  senses: "list_sense",
  other: "ord_0",
  synset: "list_word",
  synmap: "map_derived",
  thesaurus: "map_thesaurus",
  fonts: "fonts",
  /**
    * log_keyword
    */
  keyword: "log_keyword",
  spelling: "list_spelling"
},

http://127.0.0.1:8000/api/words/?search=pro&format=json
