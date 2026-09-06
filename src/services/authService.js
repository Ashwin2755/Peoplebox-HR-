import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

const getAuthErrorMessage = (error) => {
  if (
    error.code === "auth/configuration-not-found" ||
    error.code === "auth/operation-not-allowed"
  ) {
    return "Email/Password sign-in is not enabled in Firebase Authentication. Enable it in Firebase Console > Authentication > Sign-in method.";
  }

  if (
    error.code === "auth/invalid-credential" ||
    error.code === "auth/wrong-password" ||
    error.code === "auth/user-not-found"
  ) {
    return "Incorrect email or password. Use the same credentials shown in Firebase Authentication > Users.";
  }

  return error.message || "Authentication failed.";
};


// ==========================================
// REGISTER EMPLOYEE
// ==========================================

export const registerUser = async (
  employeeId,
  email,
  password
) => {
  try {
    // 1. Create Firebase Authentication account
    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    // 2. Create users document
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        employeeId: employeeId,
        email: email,
        role: "employee",
        createdAt: serverTimestamp(),
      }
    );

    // 3. Create employee document
    await setDoc(
      doc(db, "employees", employeeId),
      {
        uid: user.uid,
        employeeId: employeeId,
        email: email,

        // Employee details
        name: "",
        department: "",
        designation: "",
        joiningDate: "",

        // Contact details
        phone: "",
        address: "",

        // Salary details
        basicSalary: 0,
        allowances: 0,
        deductions: 0,

        // Profile
        profileImage: "",

        createdAt: serverTimestamp(),
      }
    );

    return {
      success: true,
      user: user,
    };

  } catch (error) {
    console.error("Registration Error:", error);

    return {
      success: false,
      error: getAuthErrorMessage(error),
    };
  }
};


// ==========================================
// LOGIN
// ==========================================

export const loginUser = async (
  email,
  password
) => {
  try {
    // 1. Firebase Authentication
    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    // 2. Get application user data
    const userDoc = await getDoc(
      doc(db, "users", user.uid)
    );

    if (!userDoc.exists()) {
      await signOut(auth);

      return {
        success: false,
        error: "User profile not found.",
      };
    }

    const userData = userDoc.data();

    // 3. Return authentication + role data
    return {
      success: true,
      user: user,
      role: userData.role,
      employeeId: userData.employeeId,
    };

  } catch (error) {
    console.error("Login Error:", error);

    return {
      success: false,
      error: getAuthErrorMessage(error),
    };
  }
};


// ==========================================
// LOGOUT
// ==========================================

export const logoutUser = async () => {
  try {
    await signOut(auth);

    return {
      success: true,
    };

  } catch (error) {
    console.error("Logout Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};