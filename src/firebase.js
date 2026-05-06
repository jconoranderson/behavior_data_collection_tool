import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCKm2Bp7d7J2muim-aBThFUY_bEb1TCSGU",
  authDomain: "behavior-tracking-df86e.firebaseapp.com",
  projectId: "behavior-tracking-df86e",
  storageBucket: "behavior-tracking-df86e.firebasestorage.app",
  messagingSenderId: "910968301223",
  appId: "1:910968301223:web:3d7ad661b6bfb7c3cd5d82",
  measurementId: "G-S6VYJTL0TQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
