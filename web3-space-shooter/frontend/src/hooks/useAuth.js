// src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import {
  auth,
  registerUser,
  loginUser,
  logoutUser,
  signInWithGoogleAuth,
  updateUserProfile,
  onAuthStateChanged
} from '../config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    setLoading(true);
    setError(null);
    try {
      const result = await registerUser(email, password);
      if (displayName) {
        await updateUserProfile(result.user, displayName);
      }
      return { success: true, user: result.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginUser(email, password);
      return { success: true, user: result.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogleAuth();
      return { success: true, user: result.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await logoutUser();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInGoogle,
    logout,
    clearError,
    isAuthenticated: !!user
  };
};
