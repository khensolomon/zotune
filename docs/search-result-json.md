# Search result JSON

```bash
knowledge is power
knowledge%20is%20power~knowledge
knowledge%20is%20power~is
knowledge%20is%20power~20power

love%20you~love
love%20you~you

data.clue.meaning.<pos>.sense.mean
data.clue.meaning.<pos>.sense.exam
data.clue.meaning.<pos>.exam.value

one [type:chemistry] (ဆာလ်ဖျူရစ် အက်စစ်၊ နိုက်ထရစ်အက်စစ် စသည့် အလားတူအက်စစ်တို့နှင့် ဓာတ်ပြုရာမှရသော ဆားတို့၏ အမည် တွင် အဆုံးသတ်စာလုံးပေါင်း)
king [see:Martin Luther King]
king [as in:chess] ကျားကစားရာတွင်ကင်း
bracket (ပုဒ်ဖြတ်၊ ပုဒ်ရပ်သင်္ကေတ) ကွင်း; () ဝိုက်ကွင်း [:<bracket/parenthesis/round bracket>];[] ထောင့်ကွင်း [:<square bracket>]; <> ထောင့်ချွန်းကွင်း [:<angle bracket/less than/greater than>]; {} တွန့်ကွင်း [:<curly bracket>]

[key:value]
[~:love]  -> ~ <love>
[or:eat/love/hate] -> <eat>, <love> or <hate>
[and:eat/love/hate] -> <eat>, <love> and <hate>
[etc:love/hate]  -> <love>, <hate>
[:<bracket/parenthesis/round bracket>]
<love/hate>


[type:mathematics] ကွင်းစကွင်းပိတ်၊ သစ်သား (သို့) သံအထိန်းအကွပ်
"sense": [
  {
    "mean": [],
    "exam": [
      "mathematics"
    ]
  },
  {
    "mean": [
      "ကွင်းစကွင်းပိတ်၊ သစ်သား (သို့) သံအထိန်းအကွပ်"
    ],
    "exam": []
  }
],

"sense": [
  {
    "mean": [
      "<mathematics> ကွင်းစကွင်းပိတ်၊ သစ်သား (သို့) သံအထိန်းအကွပ်"
    ],
    "exam": []
  }
],
```

```json
{
  "query": {
    "input": "love you",
    "word": "love",
    "sentence": ["love", "you"]
  },
  "meta": {
    "message": ""
  },
  "hint": {
    "name": "",
    "list": []
  },
  "status": 1,
  "data": [
    {
      "word": "love",
      "clue": {
        "meaning": {
          "noun": [
            {
              "id": 49983,
              "term": "love",
              "sense": [
                {
                  "mean": ["အချစ်"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": ["a love <song> or <story> etc."]
              }
            },
            {
              "id": 49989,
              "term": "love",
              "sense": [
                {
                  "mean": ["ခုံမင်နှစ်သက်ခြင်း"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": [
                  "(sing) a love of <learning>, <adventure> or <nature> etc."
                ]
              }
            },
            {
              "id": 49991,
              "term": "love",
              "sense": [
                {
                  "mean": ["စွဲလမ်းခြင်း"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": [
                  "She's fond of all sports, but tennis is her <first>, <greatest> love."
                ]
              }
            },
            {
              "id": 49994,
              "term": "love",
              "sense": [
                {
                  "mean": ["(တင်းနစ်ပွဲတွင်) သုည"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": ["She won the first set six-love/six games to love."]
              }
            },
            {
              "term": "love",
              "type": "meaning",
              "tag": ["part-of-speech"],
              "sense": "(-~-) <loves> (plural)",
              "exam": {
                "type": "examSentence",
                "value": []
              }
            }
          ],
          "verb": [
            {
              "id": 49980,
              "term": "love",
              "sense": [
                {
                  "mean": ["ချစ်ခင်မြတ်နိုးမှုကို ဖော်ပြတတ်သော"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": ["She loves her husband deeply."]
              }
            },
            {
              "id": 49984,
              "term": "love",
              "sense": [
                {
                  "mean": ["ဝါသနာပါသည်"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": ["Children love to <play>, <love> playing."]
              }
            },
            {
              "id": 49986,
              "term": "love",
              "sense": [
                {
                  "mean": ["နှစ်သက်"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": []
              }
            },
            {
              "id": 49987,
              "term": "love",
              "sense": [
                {
                  "mean": ["ဝမ်းသာ"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": []
              }
            },
            {
              "id": 49988,
              "term": "love",
              "sense": [
                {
                  "mean": ["[<suggestion>] ချစ်မြတ်နိုးသည်"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": []
              }
            },
            {
              "term": "love",
              "type": "meaning",
              "tag": ["part-of-speech"],
              "sense": "(-~-) <loves> (3rd person); (-~-) <loved> (past tense); (-~-) <loving> (present participle)",
              "exam": {
                "type": "examSentence",
                "value": []
              }
            }
          ],
          "adjective": [
            {
              "id": 49982,
              "term": "love",
              "sense": [
                {
                  "mean": ["ချစ်ခင်သော", "ကြင်နာသော"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": ["such a loving and affectionate family."]
              }
            }
          ],
          "antonym": [
            {
              "term": "love",
              "type": "meaning",
              "tag": ["odd", "anth"],
              "sense": "(-~-) 2 words opposite to <love>.",
              "exam": {
                "type": "examWord",
                "value": ["hate", "detest"]
              }
            }
          ],
          "thesaurus": [
            {
              "term": "love",
              "type": "meaning",
              "tag": ["odd", "anth", "noun"],
              "sense": "(-~-) 21 words related to <love> as <noun>.",
              "exam": {
                "type": "examWord",
                "value": [
                  "emotion",
                  "passion",
                  "object",
                  "beloved",
                  "dear",
                  "sex"
                ]
              }
            },
            {
              "term": "love",
              "type": "meaning",
              "tag": ["odd", "anth", "Verb"],
              "sense": "(-~-) 29 words related to <love> as <Verb>.",
              "exam": {
                "type": "examWord",
                "value": ["enjoy", "mate", "pair", "couple"]
              }
            }
          ]
        },
        "help": {
          "improve": [
            {
              "term": "love",
              "type": "help",
              "tag": ["odd"],
              "sense": "what is this",
              "exam": {
                "type": "examWord",
                "value": ["a", "b"]
              }
            }
          ]
        }
      }
    }
  ]
}
```

query: 100

```json
{
  "query": {
    "input": "100",
    "word": "100",
    "sentence": ["100"]
  },
  "meta": {
    "message": ""
  },
  "hint": {
    "name": "",
    "list": []
  },
  "status": 1,
  "data": [
    {
      "word": "100",
      "clue": {
        "meaning": {
          "noun": [
            {
              "id": 102538,
              "term": "100",
              "sense": [
                {
                  "mean": ["ဆယ်ပေါင်း", "ဆယ်ကြိမ်ဆယ်", "တစ်ဆယ် ဆယ်လီ တစ်ရာ"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": ["Ten 10s"]
              }
            },
            {
              "term": "100",
              "type": "meaning",
              "tag": ["part-of-speech"],
              "sense": "(-~-) <100s> (plural)",
              "exam": {
                "type": "examSentence",
                "value": []
              }
            }
          ],
          "adjective": [
            {
              "id": 102537,
              "term": "100",
              "sense": [
                {
                  "mean": ["ကိန်းဆယ်ခု ကျော်နေသော ကိုးဆယ်ဂဏန်း"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["result-from-sql"],
              "exam": {
                "type": "examSentence",
                "value": ["Being ten more than ninety"]
              }
            }
          ],
          "number": [
            {
              "term": "100",
              "type": "meaning",
              "tag": ["notation"],
              "sense": "၁၀၀",
              "exam": {
                "type": "examSentence",
                "value": ["တစ်ရာ", "one hundred"]
              }
            }
          ],
          "thesaurus": [
            {
              "term": "100",
              "type": "meaning",
              "tag": ["odd", "anth", "Adjective"],
              "sense": "(-~-) 5 words related to <100> as <Adjective>.",
              "exam": {
                "type": "examWord",
                "value": ["hundred", "c", "cardinal"]
              }
            },
            {
              "term": "100",
              "type": "meaning",
              "tag": ["odd", "anth", "noun"],
              "sense": "(-~-) 6 words related to <100> as <noun>.",
              "exam": {
                "type": "examWord",
                "value": ["hundred", "C", "century", "centred"]
              }
            }
          ]
        },
        "help": {
          "improve": [
            {
              "term": "100",
              "type": "help",
              "tag": ["odd"],
              "sense": "what is this",
              "exam": {
                "type": "examWord",
                "value": ["a", "b"]
              }
            }
          ]
        }
      }
    }
  ]
}
```

query: bracket

```json
{
  "query": {
    "input": "bracket",
    "word": "bracket",
    "sentence": ["bracket"]
  },
  "meta": {
    "message": ""
  },
  "hint": {
    "name": "",
    "list": []
  },
  "status": 1,
  "data": [
    {
      "word": "bracket",
      "clue": {
        "meaning": {
          "noun": [
            {
              "id": 98760,
              "term": "bracket",
              "sense": [
                {
                  "mean": [
                    "[<mathematics>] ကွင်းစကွင်းပိတ်၊ သစ်သား (သို့) သံအထိန်းအကွပ်"
                  ],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["mysql"],
              "exam": {
                "type": "examSentence",
                "value": []
              }
            },
            {
              "id": 11269,
              "term": "bracket",
              "sense": [
                {
                  "mean": ["(နံရံကပ်စင်၊ မီးတိုင်စသည်ကို ထောက်သည့်) ဒေါက်"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["mysql"],
              "exam": {
                "type": "examSentence",
                "value": []
              }
            },
            {
              "id": 11271,
              "term": "bracket",
              "sense": [
                {
                  "mean": ["(ပုဒ်ဖြတ်၊ ပုဒ်ရပ်သင်္ကေတ) ကွင်း", "- ဝိုက်ကွင်း"],
                  "exam": ["<bracket>, <parenthesis>, <round bracket>"]
                },
                {
                  "mean": ["- ထောင့်ကွင်း"],
                  "exam": ["<square bracket>"]
                },
                {
                  "mean": ["- ထောင့်ချွန်းကွင်း"],
                  "exam": ["<angle bracket>, <less than>, <greater than>"]
                },
                {
                  "mean": ["- တွန့်ကွင်း"],
                  "exam": ["<curly bracket>"]
                }
              ],
              "type": "meaning",
              "tag": ["mysql"],
              "exam": {
                "type": "examSentence",
                "value": ["Put your name in brackets at the top of each page."]
              }
            },
            {
              "id": 11273,
              "term": "bracket",
              "sense": [
                {
                  "mean": ["(သတ်မှတ်ချက် ဘောင်တစ်ခုအတွင်းရှိ) အုပ်စု"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["mysql"],
              "exam": {
                "type": "examSentence",
                "value": ["be in the lower/higher income bracket."]
              }
            },
            {
              "term": "bracket",
              "type": "meaning",
              "tag": ["part-of-speech"],
              "sense": "(-~-) <brackets> (plural)",
              "exam": {
                "type": "examSentence",
                "value": []
              }
            }
          ],
          "verb": [
            {
              "id": 11270,
              "term": "bracket",
              "sense": [
                {
                  "mean": ["(စာလုံး၊ ဂဏန်းစသည်ကို) ကွင်းသွင်းသည်"],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["mysql"],
              "exam": {
                "type": "examSentence",
                "value": []
              }
            },
            {
              "id": 11272,
              "term": "bracket",
              "sense": [
                {
                  "mean": [
                    "(~ A and/to B) တစ်မျိုးတစ်စားတည်း၊ တစ်တန်း တစ်စား ထား ရှိ သည်"
                  ],
                  "exam": []
                }
              ],
              "type": "meaning",
              "tag": ["mysql"],
              "exam": {
                "type": "examSentence",
                "value": [
                  "It's wrong to bracket him with the extremists in his party—his views are very moderate."
                ]
              }
            },
            {
              "term": "bracket",
              "type": "meaning",
              "tag": ["part-of-speech"],
              "sense": "(-~-) <brackets> (3rd person); (-~-) <bracketed> (past tense); (-~-) <bracketing> (present participle)",
              "exam": {
                "type": "examSentence",
                "value": []
              }
            }
          ],
          "thesaurus": [
            {
              "term": "bracket",
              "type": "meaning",
              "tag": ["odd", "anth", "noun"],
              "sense": "(-~-) 6 words related to <bracket> as <noun>.",
              "exam": {
                "type": "examWord",
                "value": [
                  "set",
                  "square bracket",
                  "punctuation",
                  "punctuation mark",
                  "angle bracket",
                  "support"
                ]
              }
            },
            {
              "term": "bracket",
              "type": "meaning",
              "tag": ["odd", "anth", "Verb"],
              "sense": "(-~-) 8 words related to <bracket> as <Verb>.",
              "exam": {
                "type": "examWord",
                "value": [
                  "hold",
                  "support",
                  "sustain",
                  "hold up",
                  "bracket out",
                  "edit",
                  "redact",
                  "group"
                ]
              }
            }
          ]
        },
        "help": {
          "improve": [
            {
              "term": "bracket",
              "type": "help",
              "tag": ["odd"],
              "sense": "what is this",
              "exam": {
                "type": "examWord",
                "value": ["a", "b"]
              }
            }
          ]
        }
      }
    }
  ]
}
```

query: bracket
derived form

````json
{
  "data": [
    {
      "word": "bracket",
      "clue": {
        "meaning": {
          "noun": [
            {
              "term": "bracket",
              "type": "meaning",
              "tag": [
                "part-of-speech"
              ],
              "sense": "(-~-) <brackets> (plural)",
              "exam": {
                "type": "examSentence",
                "value": []
              }
            }
          ],
          "verb":[
            {
              "term": "bracket",
              "type": "meaning",
              "tag": [
                "part-of-speech"
              ],
              "sense": "(-~-) <brackets> (3rd person); (-~-) <bracketed> (past tense); (-~-) <bracketing> (present participle)",
              "exam": {
                "type": "examSentence",
                "value": []
              }
            }
          ],
          "thesaurus": [
            {
              "term": "bracket",
              "type": "meaning",
              "tag": [
                "odd", "anth", "noun"
              ],
              "sense": "(-~-) 6 words related to <bracket> as <noun>.",
              "exam": {
                "type": "examWord",
                "value": [
                  "set",
                  "square bracket",
                  "punctuation",
                  "punctuation mark",
                  "angle bracket",
                  "support"
                ]
              }
            },
            {
              "term": "bracket",
              "type": "meaning",
              "tag": [
                "odd", "anth", "Verb"
              ],
              "sense": "(-~-) 8 words related to <bracket> as <Verb>.",
              "exam": {
                "type": "examWord",
                "value": [
                  "hold",
                  "support",
                  "sustain",
                  "hold up",
                  "bracket out",
                  "edit",
                  "redact",
                  "group"
                ]
              }
            }
          ]
        }
      }
    }
  ]
}

query: unkown

```json
{
  "query": {
    "input": "abefeasdf",
    "word": "abefeasdf",
    "sentence": ["abefeasdf"]
  },
  "meta": {
    "message": ""
  },
  "hint": {
    "name": "",
    "list": []
  },
  "status": 0,
  "data": []
}
````

```bash

"sense": [
    {
        "mean": [
            "<mathematics> ကွင်းစကွင်းပိတ်၊ သစ်သား (သို့) သံအထိန်းအကွပ်"
        ],
        "exam": [
            "<mathematics>"
        ]
    }
],
```
