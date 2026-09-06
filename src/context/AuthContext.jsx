import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { logoutUser } from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          setCurrentUser(user);

          try {
            const userDoc = await getDoc(
              doc(db, "users", user.uid)
            );

            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserRole(userData.role);
            } else {
              setUserRole(null);
            }
          } catch (error) {
            console.error(
              "Error fetching user role:",
              error
            );

            setUserRole(null);
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await logoutUser();
  };

  const value = {
    currentUser,
    userRole,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};