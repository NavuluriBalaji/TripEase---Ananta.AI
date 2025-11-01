// lib/auth-utils.ts
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  UserCredential,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider, githubProvider } from './firebase';
import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    travelInterests?: string[];
  };
}

/**
 * Convert Firebase User to AuthUser
 */
export function convertFirebaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: userCredential.user.uid,
        email,
        displayName,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          theme: 'light',
          notifications: true,
          travelInterests: [],
        },
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);
    }

    return userCredential;
  } catch (error) {
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  try {
    // Set persistence before signing in
    await setPersistence(auth, browserLocalPersistence);
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw error;
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);

    // Check if user profile exists in Firestore
    const userDocRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create user profile for first-time Google sign-in
      const userProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || 'Google User',
        photoURL: result.user.photoURL || undefined,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          theme: 'light',
          notifications: true,
          travelInterests: [],
        },
      };
      await setDoc(userDocRef, userProfile);
    }

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Sign in with Facebook
 */
export async function signInWithFacebook(): Promise<UserCredential> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, facebookProvider);

    // Check if user profile exists in Firestore
    const userDocRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const userProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || 'Facebook User',
        photoURL: result.user.photoURL || undefined,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          theme: 'light',
          notifications: true,
          travelInterests: [],
        },
      };
      await setDoc(userDocRef, userProfile);
    }

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Sign in with GitHub
 */
export async function signInWithGithub(): Promise<UserCredential> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, githubProvider);

    // Check if user profile exists in Firestore
    const userDocRef = doc(db, 'users', result.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const userProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || 'GitHub User',
        photoURL: result.user.photoURL || undefined,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          theme: 'light',
          notifications: true,
          travelInterests: [],
        },
      };
      await setDoc(userDocRef, userProfile);
    }

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    throw error;
  }
}
