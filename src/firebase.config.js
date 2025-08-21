import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider, OAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCygkh1HEbOnZ_iUMN4nf7_QN9Yo-Pz6B4",
  authDomain: "anilifetvorg.firebaseapp.com",
  projectId: "anilifetvorg",
  storageBucket: "anilifetvorg.appspot.com",
  messagingSenderId: "72554929775",
  appId: "1:72554929775:web:63513f5f914e4e951fb79a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");
export const yahooProvider = new OAuthProvider('yahoo.com');