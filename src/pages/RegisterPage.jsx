import { useState } from "react";
import { auth } from "../firebase.config";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import "../styles/register.scss";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gameCompleted, setGameCompleted] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!gameCompleted) {
      setError("Пожалуйста, пройдите проверку, что вы не бот.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    navigate("/verify");
      setMessage("Регистрация прошла успешно! Проверьте email для подтверждения.");
    } catch (err) {
      setError(err.message);
    }
  };

  // Мини-игра: "Найди лягушку"
  const handleFrogClick = () => {
    setGameCompleted(true);
    setError("");
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Регистрация</h2>
        {error && <p className="error">{error}</p>}
        {message && <p className="message">{message}</p>}

        <form onSubmit={handleRegister}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>


          <div className="mini-game">
            <p>Найди лягушку 🐸</p>
            <div className="grid">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="cell" onClick={index === 3 ? handleFrogClick : null}>
                  {index === 3 ? "🐸" : "❌"}
                </div>
              ))}
            </div>
          </div>

          <button type="submit">Зарегистрироваться</button>
        </form>
      </div>
    </div>
  );
}