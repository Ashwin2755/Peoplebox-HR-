import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDG24sycdrVpCEIJ_-W6HmdduGDSM_RZJM",
  authDomain: "hr-management-3cd11.firebaseapp.com",
  projectId: "hr-management-3cd11",
  storageBucket: "hr-management-3cd11.firebasestorage.app",
  messagingSenderId: "557135148076",
  appId: "1:557135148076:web:59b50b2db9913ed53c0d89",
  measurementId: "G-FNEMMSLMHC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;