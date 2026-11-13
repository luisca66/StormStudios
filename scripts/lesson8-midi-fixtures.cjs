/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS MIDI generator. */
// Lesson 8 SATB fixtures: one track, 128 ticks/beat, key signature and SP spelling.
// Every chord is [soprano, alto, tenor, bass]; each pair is independent.
const fs = require('node:fs');
const path = require('node:path');
const PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const SIGNATURES = { C:0, G:1, D:2, F:-1, Bb:-2, A:3, Eb:-3, E:4 };
const PPQ = 128;
const vlq = n => { const a=[n&127]; while ((n>>=7)) a.unshift((n&127)|128); return a; };
const ascii = s => [...Buffer.from(s, 'ascii')];
function buildMidi(chords, key, initialOnly = false) {
  const keys = Array.isArray(key) ? key : [key];
  const events = [];
  for (const [index, chord] of chords.entries()) {
    if (index === 0 || (Array.isArray(key) && index % 2 === 0 && !initialOnly)) {
      events.push(0,255,89,2,SIGNATURES[keys[Math.floor(index / 2)] ?? keys[0]]&255,0);
    }
    const pitches = chord.map(name => {
      const [,letter,acc,octave] = name.match(/^([A-G])(##|bb|#|b)?(\d)$/);
      const alter = {'':0,'#':1,'##':2,b:-1,bb:-2}[acc??''];
      const midi=12*(Number(octave)+1)+PC[letter]+alter;
      return {midi,sp:ascii('SP:'+letter.toLowerCase()+(acc??''))};
    });
    pitches.forEach(({midi,sp},channel)=>events.push(0,255,1,sp.length,...sp,0,144|channel,midi,90));
    pitches.forEach(({midi},channel)=>events.push(...vlq(channel===0?2*PPQ:0),128|channel,midi,0));
  }
  events.push(0,255,47,0);
  const length=Buffer.alloc(4); length.writeUInt32BE(events.length);
  return Buffer.concat([Buffer.from([...ascii('MThd'),0,0,0,6,0,1,0,1,0,PPQ,...ascii('MTrk')]),length,Buffer.from(events)]);
}
const C_PAIRS = [
  [
    [
      "C5",
      "G3",
      "E3",
      "C3"
    ],
    [
      "C5",
      "A3",
      "F3",
      "F3"
    ]
  ],
  [
    [
      "C5",
      "F4",
      "A3",
      "F3"
    ],
    [
      "B4",
      "D4",
      "G3",
      "G3"
    ]
  ],
  [
    [
      "B4",
      "G3",
      "D3",
      "G2"
    ],
    [
      "C5",
      "G3",
      "E3",
      "C3"
    ]
  ],
  [
    [
      "D5",
      "A3",
      "F3",
      "D3"
    ],
    [
      "D5",
      "B3",
      "G3",
      "G3"
    ]
  ],
  [
    [
      "B4",
      "D4",
      "G3",
      "G2"
    ],
    [
      "C5",
      "C4",
      "E3",
      "A2"
    ]
  ],
  [
    [
      "C5",
      "A3",
      "E3",
      "A2"
    ],
    [
      "D5",
      "A3",
      "F3",
      "D3"
    ]
  ],
  [
    [
      "C5",
      "E4",
      "E3",
      "C3"
    ],
    [
      "B4",
      "D4",
      "F3",
      "D3"
    ]
  ],
  [
    [
      "C5",
      "F4",
      "C4",
      "A2"
    ],
    [
      "B4",
      "G4",
      "D4",
      "G2"
    ]
  ]
];
// Exact video notes from Luis's v2 assignment, never adjusted by the generator.
const VARIED_PAIRS = [
  [['B4','G4','D4','G3'], ['C5','G4','E4','C3']],
  [['D5','B4','G4','G2'], ['C#5','A4','E4','A2']],
  [['E5','G4','C4','C3'], ['F5','A4','C4','F2']],
  [['C5','G4','Eb4','C3'], ['C5','A4','F4','F2']],
  [['G#4','E4','B3','E3'], ['A4','C#4','A3','F#3']],
  [['G4','Eb4','C4','C3'], ['Ab4','F4','C4','F2']],
  [['C5','G4','E4','C3'], ['B4','F4','D4','D3']],
  [['A4','E4','A3','C#3'], ['B4','D#4','F#3','B2']],
];
const VARIED_KEYS = ['G','D','F','Bb','A','Eb','C','E'];
// Each wrong pair isolates one error type; IV6/3–V is absent.
const D_ERRORS = [
  [
    "F#4",
    "A3",
    "A3",
    "D3"
  ],
  [
    "G4",
    "D4",
    "B3",
    "G3"
  ],
  [
    "D4",
    "B3",
    "B2",
    "G2"
  ],
  [
    "C#4",
    "A3",
    "A3",
    "A2"
  ],
  [
    "C#4",
    "A3",
    "A3",
    "A2"
  ],
  [
    "F#4",
    "A3",
    "A3",
    "D3"
  ],
  [
    "E4",
    "B3",
    "E3",
    "G2"
  ],
  [
    "E4",
    "C#4",
    "E3",
    "A2"
  ],
  [
    "C#4",
    "A3",
    "E3",
    "A2"
  ],
  [
    "D4",
    "D4",
    "B3",
    "B2"
  ],
  [
    "D5",
    "B3",
    "F#3",
    "B2"
  ],
  [
    "E5",
    "B3",
    "G3",
    "E3"
  ],
  [
    "D5",
    "F#4",
    "F#3",
    "D3"
  ],
  [
    "C#5",
    "E4",
    "G3",
    "E3"
  ]
];

const FIXTURES = {
  'Leccion_8_Do_mayor_correcta.mid': [C_PAIRS.flat(), 'C'],
  'Leccion_8_tonalidades_variadas_correcta.mid': [VARIED_PAIRS.flat(), VARIED_KEYS],
  'Leccion_8_sin_armaduras_ambiguo.mid': [VARIED_PAIRS.flat(), VARIED_KEYS, true],
  'Leccion_8_Re_mayor_errores.mid': [D_ERRORS, 'D'],
};
if (require.main === module) {
  const dir=path.resolve(__dirname,'../test-midis');
  fs.mkdirSync(dir,{recursive:true});
  for(const [name,args] of Object.entries(FIXTURES)) fs.writeFileSync(path.join(dir,name),buildMidi(...args));
}
module.exports={buildMidi,FIXTURES,VARIED_PAIRS,VARIED_KEYS};
