import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTRZnldnBm_rHCsV7oaHqjkBL9hXzdxUQ",
  authDomain: "bloc-notas26.firebaseapp.com",
  projectId: "bloc-notas26",
  storageBucket: "bloc-notas26.firebasestorage.app",
  messagingSenderId: "352637253808",
  appId: "1:352637253808:web:781000a1f9fb53e635e375"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// 🔥 EXPORTS IMPORTANTES
export const auth = getAuth(app);
export const db = getFirestore(app);
