// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE FIREBASE
// ---------------------------------------------------------------
// 1. Ir a https://console.firebase.google.com
// 2. Crear proyecto → "familialinks" (o el nombre que quieras)
// 3. Agregar app web (icono </>)
// 4. Copiar el objeto firebaseConfig y reemplazar abajo
// 5. En Firebase Console: activar Firestore Database (modo producción)
//    y Authentication → Proveedor anónimo (habilitar)
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ▼▼▼ REEMPLAZÁ ESTOS VALORES CON LOS DE TU PROYECTO FIREBASE ▼▼▼
const firebaseConfig = {
  apiKey: "AIzaSyCeeUIpiRZAtGmVNrZavJz3L90E1NUAZTA",
  authDomain: "familialinks2026.firebaseapp.com",
  projectId: "familialinks2026",
  storageBucket: "familialinks2026.firebasestorage.app",
  messagingSenderId: "780656630011",
  appId: "1:780656630011:web:7b7f8c82bb568a646ff85e"
};
// ▲▲▲ ─────────────────────────────────────────────────────── ▲▲▲

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, signInAnonymously, onAuthStateChanged };
