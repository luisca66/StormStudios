export const ChordCategory = {
    TRIADS: { id: "TRIADS", displayName: "Tríadas" },
    SEVENTHS: { id: "SEVENTHS", displayName: "Séptimas" },
    SIXTHS: { id: "SIXTHS", displayName: "Sextas" },
    SUSPENDED_AND_ADDED: { id: "SUSPENDED_AND_ADDED", displayName: "Suspendidos y añadidos" },
    EXTENSIONS: { id: "EXTENSIONS", displayName: "Extensiones" },
};

export const ChordType = {
    MAJOR: { id: "MAJOR", displayName: "Mayor", displayNameEn: "Major", category: ChordCategory.TRIADS, intervals: [0, 4, 7] },
    MINOR: { id: "MINOR", displayName: "Menor", displayNameEn: "Minor", category: ChordCategory.TRIADS, intervals: [0, 3, 7] },
    AUGMENTED: { id: "AUGMENTED", displayName: "Aumentado", displayNameEn: "Augmented", category: ChordCategory.TRIADS, intervals: [0, 4, 8] },
    DIMINISHED: { id: "DIMINISHED", displayName: "Disminuido", displayNameEn: "Diminished", category: ChordCategory.TRIADS, intervals: [0, 3, 6] },

    DOMINANT_7: { id: "DOMINANT_7", displayName: "7ª dominante", displayNameEn: "Dominant 7", category: ChordCategory.SEVENTHS, intervals: [0, 4, 7, 10] },
    MINOR_7: { id: "MINOR_7", displayName: "7ª menor", displayNameEn: "Minor 7", category: ChordCategory.SEVENTHS, intervals: [0, 3, 7, 10] },
    MAJOR_7: { id: "MAJOR_7", displayName: "7ª mayor", displayNameEn: "Major 7", category: ChordCategory.SEVENTHS, intervals: [0, 4, 7, 11] },
    MINOR_MAJOR_7: { id: "MINOR_MAJOR_7", displayName: "Menor Maj7", displayNameEn: "Minor major 7", category: ChordCategory.SEVENTHS, intervals: [0, 3, 7, 11] },
    DIMINISHED_7: { id: "DIMINISHED_7", displayName: "Disminuido 7", displayNameEn: "Diminished 7", category: ChordCategory.SEVENTHS, intervals: [0, 3, 6, 9] },
    HALF_DIMINISHED_7: { id: "HALF_DIMINISHED_7", displayName: "Semidisminuido", displayNameEn: "Half-diminished", category: ChordCategory.SEVENTHS, intervals: [0, 3, 6, 10] },
    DOMINANT_7_FLAT_5: { id: "DOMINANT_7_FLAT_5", displayName: "7ª dom ♭5", displayNameEn: "Dominant 7 ♭5", category: ChordCategory.SEVENTHS, intervals: [0, 4, 6, 10] },
    DOMINANT_7_SHARP_5: { id: "DOMINANT_7_SHARP_5", displayName: "7ª dom ♯5", displayNameEn: "Dominant 7 ♯5", category: ChordCategory.SEVENTHS, intervals: [0, 4, 8, 10] },

    MAJOR_6: { id: "MAJOR_6", displayName: "Mayor 6", displayNameEn: "Major 6", category: ChordCategory.SIXTHS, intervals: [0, 4, 7, 9] },
    MINOR_6: { id: "MINOR_6", displayName: "Menor 6", displayNameEn: "Minor 6", category: ChordCategory.SIXTHS, intervals: [0, 3, 7, 9] },

    SUS_4: { id: "SUS_4", displayName: "Sus4", displayNameEn: "Sus4", category: ChordCategory.SUSPENDED_AND_ADDED, intervals: [0, 5, 7] },
    MINOR_SUS_4: { id: "MINOR_SUS_4", displayName: "Menor sus4", displayNameEn: "Minor sus4", category: ChordCategory.SUSPENDED_AND_ADDED, intervals: [0, 3, 5, 7] },
    MAJOR_ADD_9: { id: "MAJOR_ADD_9", displayName: "Mayor add9", displayNameEn: "Major add9", category: ChordCategory.SUSPENDED_AND_ADDED, intervals: [0, 4, 7, 14] },
    MINOR_ADD_9: { id: "MINOR_ADD_9", displayName: "Menor add9", displayNameEn: "Minor add9", category: ChordCategory.SUSPENDED_AND_ADDED, intervals: [0, 3, 7, 14] },

    MAJOR_9: { id: "MAJOR_9", displayName: "Maj 9", displayNameEn: "Maj 9", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 11, 14] },
    MINOR_9: { id: "MINOR_9", displayName: "Min 9", displayNameEn: "Min 9", category: ChordCategory.EXTENSIONS, intervals: [0, 3, 7, 10, 14] },
    DOMINANT_9: { id: "DOMINANT_9", displayName: "Dom 9", displayNameEn: "Dom 9", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 10, 14] },
    MAJOR_6_9: { id: "MAJOR_6_9", displayName: "Maj 6/9", displayNameEn: "Maj 6/9", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 9, 14] },
    MINOR_6_9: { id: "MINOR_6_9", displayName: "Min 6/9", displayNameEn: "Min 6/9", category: ChordCategory.EXTENSIONS, intervals: [0, 3, 7, 9, 14] },
    DOMINANT_FLAT_9: { id: "DOMINANT_FLAT_9", displayName: "Dom ♭9", displayNameEn: "Dom ♭9", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 10, 13] },
    DOMINANT_SHARP_9: { id: "DOMINANT_SHARP_9", displayName: "Dom ♯9", displayNameEn: "Dom ♯9", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 10, 15] },
    MAJOR_11: { id: "MAJOR_11", displayName: "Maj 11", displayNameEn: "Maj 11", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 11, 17] },
    MINOR_11: { id: "MINOR_11", displayName: "Min 11", displayNameEn: "Min 11", category: ChordCategory.EXTENSIONS, intervals: [0, 3, 7, 10, 17] },
    DOMINANT_11: { id: "DOMINANT_11", displayName: "Dom 11", displayNameEn: "Dom 11", category: ChordCategory.EXTENSIONS, intervals: [0, 7, 10, 14, 17] },
    DOMINANT_SHARP_11: { id: "DOMINANT_SHARP_11", displayName: "Dom ♯11", displayNameEn: "Dom ♯11", category: ChordCategory.EXTENSIONS, intervals: [0, 7, 10, 14, 18] },
    MAJOR_SHARP_11: { id: "MAJOR_SHARP_11", displayName: "Maj ♯11", displayNameEn: "Maj ♯11", category: ChordCategory.EXTENSIONS, intervals: [0, 7, 11, 14, 18] },
    MAJOR_13: { id: "MAJOR_13", displayName: "Maj 13", displayNameEn: "Maj 13", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 11, 21] },
    MINOR_13: { id: "MINOR_13", displayName: "Min 13", displayNameEn: "Min 13", category: ChordCategory.EXTENSIONS, intervals: [0, 3, 7, 10, 21] },
    DOMINANT_13: { id: "DOMINANT_13", displayName: "Dom 13", displayNameEn: "Dom 13", category: ChordCategory.EXTENSIONS, intervals: [0, 4, 7, 10, 21] },
};

export const ObjectValues = (obj) => Object.keys(obj).map(key => obj[key]);
export const ChordTypeArray = ObjectValues(ChordType);
