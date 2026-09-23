import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, Firestore } from "firebase/firestore";
import { FIREBASE_CONFIG, COLLECTION_BY_LANG, GameData, GAME_DATA_ES, GAME_DATA_EN, PRACTICE_DATA_ES, PRACTICE_DATA_EN } from "@/data/apps/memoria-data";

type AppState = {
  db: Firestore | null;
  auth: Auth | null;
  userId: string | null;
  words: GameData | null;
  practiceWords: GameData | null;
  loading: boolean;
};

export function useFirebaseMnemonic(locale: string) {
  const [state, setState] = useState<AppState>({
    db: null,
    auth: null,
    userId: null,
    words: null,
    practiceWords: null,
    loading: true,
  });

  const isEN = locale === "en";

  useEffect(() => {
    let isMounted = true;

    async function initFirebase() {
      try {
        const apps = getApps();
        const app = apps.length ? apps.find(a => a.name === "memoria-app") || apps[0] : initializeApp(FIREBASE_CONFIG, "memoria-app");
        const auth = getAuth(app);
        const db = getFirestore(app);

        // Solo se reutiliza una sesión anónima existente: la cuenta y el
        // documento se crean la primera vez que el usuario guarda palabras.
        const user = await new Promise<User | null>((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
          }, reject);
        });

        if (!isMounted) return;

        const defaultsGame = isEN ? GAME_DATA_EN : GAME_DATA_ES;
        const defaultsPractice = isEN ? PRACTICE_DATA_EN : PRACTICE_DATA_ES;

        // Clone the defaults safely
        const userWords: GameData = JSON.parse(JSON.stringify(defaultsGame));
        const userPracticeWords: GameData = JSON.parse(JSON.stringify(defaultsPractice));

        const collection = COLLECTION_BY_LANG[isEN ? "en" : "es"];
        const snapshot = user ? await getDoc(doc(db, collection, user.uid)) : null;

        if (snapshot?.exists()) {
          const savedData = snapshot.data();
          Object.keys(userWords).forEach((range) => {
            if (savedData[range]) {
              userWords[range] = { ...userWords[range], ...savedData[range] };
            }
          });
          Object.keys(userPracticeWords).forEach((range) => {
            if (savedData[range]) {
              userPracticeWords[range] = { ...userPracticeWords[range], ...savedData[range] };
            }
          });
        }

        if (isMounted) {
          setState({
            db,
            auth,
            userId: user?.uid ?? null,
            words: userWords,
            practiceWords: userPracticeWords,
            loading: false,
          });
        }
      } catch (error) {
        console.warn("Memory app Firebase error:", error);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            words: isEN ? GAME_DATA_EN : GAME_DATA_ES,
            practiceWords: isEN ? PRACTICE_DATA_EN : PRACTICE_DATA_ES,
            loading: false,
          }));
        }
      }
    }

    initFirebase();

    return () => {
      isMounted = false;
    };
  }, [locale, isEN]);

  const saveRangeWords = async (range: string, newSet: Record<string, string>) => {
    const { db, auth } = state;
    if (!db || !auth) return;

    try {
      const userId = state.userId ?? (await signInAnonymously(auth)).user.uid;
      const collection = COLLECTION_BY_LANG[isEN ? "en" : "es"];
      await setDoc(doc(db, collection, userId), { [range]: newSet }, { merge: true });

      // Update local state
      setState((prev) => {
        const newWords = prev.words ? { ...prev.words, [range]: { ...newSet } } : null;
        const newPracticeWords = prev.practiceWords && prev.practiceWords[range] 
          ? { ...prev.practiceWords, [range]: { ...newSet } } 
          : prev.practiceWords;

        return {
          ...prev,
          userId,
          words: newWords,
          practiceWords: newPracticeWords,
        };
      });

    } catch (error) {
      console.error("Error saving words:", error);
      throw error;
    }
  };

  return { ...state, saveRangeWords };
}
