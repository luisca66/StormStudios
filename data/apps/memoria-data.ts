export const AUDIO_BASE_URL = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

export const AUDIO_ASSETS = {
  effects: {
    correct: "acierto.mp3",
    error: "error.mp3",
    flip: "sfx.mp3",
    next: "sfx.mp3",
  },
  musicPath: "music/memoria",
  tracks: [
    "memoria-01", "memoria-02", "memoria-03", "memoria-04", "memoria-05",
    "memoria-06", "memoria-07", "memoria-08", "memoria-09", "memoria-10",
    "memoria-11", "memoria-12", "memoria-13", "memoria-14", "memoria-15",
    "memoria-16", "memoria-17", "memoria-18", "memoria-19", "memoria-20",
    "memoria-21", "memoria-22", "memoria-23", "memoria-24", "memoria-25",
  ],
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCstpJcQhCQqhp_jidbRyCcmIcScQ5UDhs",
  authDomain: "app-memoria-storm.firebaseapp.com",
  projectId: "app-memoria-storm",
  storageBucket: "app-memoria-storm.firebasestorage.app",
  messagingSenderId: "171586710079",
  appId: "1:171586710079:web:e7ece3564ca31ab570a68a",
};

export const COLLECTION_BY_LANG: Record<string, string> = {
  en: "mnemonic_words_en",
  es: "mnemonic_words",
};

export type MnemonicSet = Record<string, string>;
export type GameData = Record<string, MnemonicSet>;

export const GAME_DATA_ES: GameData = {
  "Código": { "0": "S, Z, Cs", "1": "T, D", "2": "N", "3": "M", "4": "R, RR", "5": "L", "6": "J, CH, Gf", "7": "Cf, K, Q", "8": "V, F", "9": "P, B" },
  "00-09": { "00": "Sosa", "01": "Ceda", "02": "Sien", "03": "Cima", "04": "Sarro", "05": "Sal", "06": "Ceja", "07": "Sake", "08": "Sofá", "09": "Sapo" },
  "0-9": { "0": "Oso", "1": "auTo", "2": "aNillo", "3": "huMo", "4": "Río", "5": "oLa", "6": "hiJo", "7": "Casa", "8": "aVe", "9": "Pie" },
  "10-19": { "10": "TaZa", "11": "TiTo", "12": "TiNa", "13": "ToMo", "14": "ToRo", "15": "TeLa", "16": "TeCHo", "17": "ToCayo", "18": "TiFo", "19": "TuBo" },
  "20-29": { "20": "NueZ", "21": "NoTa", "22": "NeNa", "23": "gNoMo", "24": "NuRia", "25": "NiLo", "26": "NiCHo", "27": "NuCa", "28": "NieVe", "29": "NuBe" },
  "30-39": { "30": "MeSa", "31": "MoTa", "32": "MaNo", "33": "MaMá", "34": "MaR", "35": "MieL", "36": "MaCHo", "37": "MueCa", "38": "MaFia", "39": "MaPa" },
  "40-49": { "40": "RoSa", "41": "RaTa", "42": "RaNa", "43": "RaMa", "44": "heRReRo", "45": "RieL", "46": "ReJa", "47": "RoCa", "48": "RiFa", "49": "RoPa" },
  "50-59": { "50": "LoZa", "51": "LaTa", "52": "LaNa", "53": "LiMa", "54": "LoRo", "55": "LiLa", "56": "LeCHe", "57": "LaCa", "58": "LaVa", "59": "LoBo" },
  "60-69": { "60": "ChoZa", "61": "JaDe", "62": "JuaN", "63": "GeMa", "64": "JaRRo", "65": "CheLa", "66": "ChoCho", "67": "JaCa", "68": "CheF", "69": "CHaPa" },
  "70-79": { "70": "CaSa", "71": "GaTo", "72": "CuNa", "73": "CaMa", "74": "CaRa", "75": "KiLo", "76": "CaJa", "77": "CaCa", "78": "CaFé", "79": "CaPa" },
  "80-89": { "80": "FoSa", "81": "FoTo", "82": "ViNo", "83": "FaMa", "84": "FaRo", "85": "VeLa", "86": "FaJa", "87": "FoCo", "88": "FoFo", "89": "FoBia" },
  "90-99": { "90": "PeZ", "91": "PaTo", "92": "PiNo", "93": "PuMa", "94": "PeRRo", "95": "PaLo", "96": "PaJa", "97": "PiCo", "98": "PuF", "99": "PiPa" },
};

export const GAME_DATA_EN: GameData = {
  "Code": { "0": "s, z", "1": "t, d, th", "2": "n", "3": "m", "4": "r", "5": "l", "6": "j, sh, ch, g", "7": "k, c, g, q", "8": "f, v, ph", "9": "p, b" },
  "00-09": { "00": "Sauce", "01": "Seed", "02": "Sun", "03": "Sum", "04": "Sore", "05": "Soul", "06": "Sash", "07": "Sock", "08": "Safe", "09": "Soap" },
  "0-9": { "0": "Saw", "1": "Tea", "2": "Noah", "3": "Me", "4": "Ray", "5": "Law", "6": "Jaw", "7": "Key", "8": "Fee", "9": "Bee" },
  "10-19": { "10": "Toes", "11": "Dad", "12": "Tin", "13": "Team", "14": "Tire", "15": "Towel", "16": "Dish", "17": "Duck", "18": "TV", "19": "Tape" },
  "20-29": { "20": "Nose", "21": "Net", "22": "Nun", "23": "Name", "24": "Nero", "25": "Nail", "26": "Hinge", "27": "Neck", "28": "Knife", "29": "Knob" },
  "30-39": { "30": "Mouse", "31": "Mat", "32": "Moon", "33": "Mom", "34": "Mower", "35": "Mail", "36": "Match", "37": "Mike", "38": "Movie", "39": "Map" },
  "40-49": { "40": "Rose", "41": "Rat", "42": "Rain", "43": "Ram", "44": "Warrior", "45": "Rail", "46": "Roach", "47": "Rock", "48": "Roof", "49": "Robe" },
  "50-59": { "50": "Lace", "51": "Light", "52": "Lion", "53": "Lime", "54": "Lawyer", "55": "Lily", "56": "Leash", "57": "Lock", "58": "Leaf", "59": "Lip" },
  "60-69": { "60": "Cheese", "61": "Sheet", "62": "Chain", "63": "Jam", "64": "Chair", "65": "Jail", "66": "Judge", "67": "Shake", "68": "Chef", "69": "Ship" },
  "70-79": { "70": "Case", "71": "Cat", "72": "Can", "73": "Comb", "74": "Car", "75": "Coal", "76": "Cash", "77": "Cake", "78": "Coffee", "79": "Cap" },
  "80-89": { "80": "Face", "81": "Fat", "82": "Fan", "83": "Foam", "84": "Fire", "85": "File", "86": "Fish", "87": "Fake", "88": "Fife", "89": "Fob" },
  "90-99": { "90": "Bus", "91": "Bat", "92": "Pen", "93": "Bomb", "94": "Bear", "95": "Ball", "96": "Beach", "97": "Book", "98": "Beef", "99": "Pope" },
};

export const PRACTICE_DATA_ES: GameData = {
  "00-09": { "00": "Sosa", "01": "Ceda", "02": "Sien", "03": "Cima", "04": "Sarro", "05": "Sal", "06": "Ceja", "07": "Sake", "08": "Sofá", "09": "Sapo" },
  "0-9": { "0": "Oso", "1": "auTo", "2": "aNillo", "3": "huMo", "4": "Río", "5": "oLa", "6": "hiJo", "7": "Calle", "8": "aVe", "9": "Pie" },
  "10-19": { "10": "TaZa", "11": "TiTo", "12": "TiNa", "13": "ToMo", "14": "ToRo", "15": "TeLa", "16": "TeCHo", "17": "ToCayo", "18": "TiFo", "19": "TuBo" },
  "20-29": { "20": "NueZ", "21": "NoTa", "22": "NeNa", "23": "NoMo", "24": "NuRia", "25": "NiLo", "26": "NiCHo", "27": "NuCa", "28": "NieVe", "29": "NuBe" },
  "30-39": { "30": "MeSa", "31": "MoTa", "32": "MaNo", "33": "MaMá", "34": "MaR", "35": "MieL", "36": "MaCHo", "37": "MueCa", "38": "MaFia", "39": "MaPa" },
  "40-49": { "40": "RoSa", "41": "RaTa", "42": "RaNa", "43": "RaMa", "44": "heRReRo", "45": "RieL", "46": "ReJa", "47": "RoCa", "48": "RiFa", "49": "RoPa" },
  "50-59": { "50": "LoZa", "51": "LaTa", "52": "LaNa", "53": "LiMa", "54": "LoRo", "55": "LiLa", "56": "LeCHe", "57": "LaCa", "58": "LaVa", "59": "LoBo" },
  "60-69": { "60": "ChoZa", "61": "JaDe", "62": "JuaN", "63": "JaMaica", "64": "JaRRa", "65": "Chela", "66": "CHoCHo", "67": "Jaca", "68": "CHiVo", "69": "CHaPa" },
  "70-79": { "70": "CaSa", "71": "GaTo", "72": "CuNa", "73": "CaMa", "74": "CaRRo", "75": "Kilo", "76": "CoCHe", "77": "CoCo", "78": "CaFé", "79": "CoPa" },
  "80-89": { "80": "VaSo", "81": "FoTo", "82": "ViNo", "83": "FaMa", "84": "FaRo", "85": "VeLa", "86": "FeCHa", "87": "FoCa", "88": "FoFo", "89": "FaBi" },
  "90-99": { "90": "PoZo", "91": "PaTo", "92": "PiNo", "93": "PuMa", "94": "PeRRo", "95": "PaLa", "96": "PaJa", "97": "PiCo", "98": "PaVo", "99": "PaPá" },
};

export const PRACTICE_DATA_EN: GameData = {
  "00-09": { "00": "Sauce", "01": "Seed", "02": "Sun", "03": "Sum", "04": "Sore", "05": "Soul", "06": "Sash", "07": "Sock", "08": "Safe", "09": "Soap" },
  "0-9": { "0": "Saw", "1": "Tea", "2": "Noah", "3": "Me", "4": "Ray", "5": "Law", "6": "Jaw", "7": "Key", "8": "Fee", "9": "Bee" },
  "10-19": { "10": "Toes", "11": "Dad", "12": "Tin", "13": "Team", "14": "Tire", "15": "Towel", "16": "Dish", "17": "Duck", "18": "TV", "19": "Tape" },
  "20-29": { "20": "Nose", "21": "Net", "22": "Nun", "23": "Name", "24": "Nero", "25": "Nail", "26": "Hinge", "27": "Neck", "28": "Knife", "29": "Knob" },
  "30-39": { "30": "Mouse", "31": "Mat", "32": "Moon", "33": "Mom", "34": "Mower", "35": "Mail", "36": "Match", "37": "Mike", "38": "Movie", "39": "Map" },
  "40-49": { "40": "Rose", "41": "Rat", "42": "Rain", "43": "Ram", "44": "Warrior", "45": "Rail", "46": "Roach", "47": "Rock", "48": "Roof", "49": "Robe" },
  "50-59": { "50": "Lace", "51": "Light", "52": "Lion", "53": "Lime", "54": "Lawyer", "55": "Lily", "56": "Leash", "57": "Lock", "58": "Leaf", "59": "Lip" },
  "60-69": { "60": "Cheese", "61": "Sheet", "62": "Chain", "63": "Jam", "64": "Chair", "65": "Jail", "66": "Judge", "67": "Shake", "68": "Chef", "69": "Ship" },
  "70-79": { "70": "Case", "71": "Cat", "72": "Can", "73": "Comb", "74": "Car", "75": "Coal", "76": "Cash", "77": "Cake", "78": "Coffee", "79": "Cap" },
  "80-89": { "80": "Face", "81": "Fat", "82": "Fan", "83": "Foam", "84": "Fire", "85": "File", "86": "Fish", "87": "Fake", "88": "Fife", "89": "Fob" },
  "90-99": { "90": "Bus", "91": "Bat", "92": "Pen", "93": "Bomb", "94": "Bear", "95": "Ball", "96": "Beach", "97": "Book", "98": "Beef", "99": "Pope" },
};
