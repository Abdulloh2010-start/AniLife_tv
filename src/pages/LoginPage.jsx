import { useState } from "react";
import { auth, googleProvider } from "../firebase.config";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useUser } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import "../styles/login.scss";
import { assets } from "../images/assets";
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        setError("Пожалуйста, подтвердите email перед входом.");
        return;
      }
      setUser(userCredential.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Log in</h2>
        <h2>В данный момент работает вход только через google!</h2>
        {error && <p className="error">{error}</p>}

        <form className="login-form" onSubmit={handleEmailSignIn}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit">Войти</button>
        </form>
        <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>

        <div className="divider">или</div>

        <button className="google-login-btn"  onClick={handleGoogleSignIn}>
          <img src={assets.google} alt="Google" className="google-icon" />
          <span>Войти через Google</span>
        </button>
      </div>
    </div>
  );
}