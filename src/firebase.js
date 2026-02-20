// src/firebase.js
// Configuración e inicialización de Firebase para El Camino del Buen Líder

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// ─────────────────────────────────────────
// TU CONFIGURACIÓN DE FIREBASE
// (la que copiaste en el Paso 3)
// ─────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyA2FJPQHJvb51D98HdFOwKSVpDBtFWkVy8",
    authDomain: "el-camino-del-buen-lider.firebaseapp.com",
    projectId: "el-camino-del-buen-lider",
    storageBucket: "el-camino-del-buen-lider.firebasestorage.app",
    messagingSenderId: "232142088014",
    appId: "1:232142088014:web:f363dac6e7eb7490f8601f"
  };

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─────────────────────────────────────────
// GUARDAR PUNTAJE AL FINALIZAR PARTIDA
// ─────────────────────────────────────────
export async function guardarPuntaje(datos) {
  try {
    const docRef = await addDoc(collection(db, 'leaderboard'), {
      nombre:    datos.nombre,
      apellido:  datos.apellido,
      celular:   datos.celular,
      puntaje:   datos.puntaje,
      desglose: {
        preguntas: datos.preguntas,
        enemigos:  datos.enemigos,
        monedas:   datos.monedas,
        tiempo:    datos.tiempo
      },
      fecha: serverTimestamp()
    });
    console.log('Puntaje guardado, ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('Error guardando puntaje:', error);
    return false;
  }
}

// ─────────────────────────────────────────
// OBTENER TOP 5 PARA EL LEADERBOARD
// ─────────────────────────────────────────
export async function obtenerTop5() {
  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('puntaje', 'desc'),
      limit(5)
    );
    const snapshot = await getDocs(q);
    const resultados = [];
    snapshot.forEach(doc => {
      resultados.push({ id: doc.id, ...doc.data() });
    });
    return resultados;
  } catch (error) {
    console.error('Error obteniendo leaderboard:', error);
    return [];
  }
}