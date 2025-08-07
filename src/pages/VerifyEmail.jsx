import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase.config";
import { useNavigate } from "react-router-dom";
import "../styles/verify.scss";

export default function VerifyEmail() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(true);
  const navigate = useNavigate();

  const user = auth.currentUser;

  const resend = async () => {
    if (!canResend || !user) return;

    setCanResend(false);
    setMessage("");
    setError("");

    try {
      await sendEmailVerification(user);
      setMessage("Письмо отправлено на " + user.email);
      setTimeout(() => setCanResend(true), 60000);
    } catch (err) {
      setError("Ошибка при повторной отправке: " + err.message);
      setCanResend(true); 
    }
  };

  const checkVerification = async () => {
    if (user) {
      await user.reload();
      if (user.emailVerified) {
        navigate("/", { replace: true });
      } else {
        setError("Email ещё не подтверждён. Попробуйте позже.");
      }
    }
  };

  return (
    <div className="verify-email">
      <h2>Подтверждение почты</h2>
      {message && <p className="message">{message}</p>}
      {error && <p className="error">{error}</p>}

      <button onClick={resend} disabled={!canResend}>
        {canResend ? "Отправить повторно" : "Подождите..."}
      </button>
      <button onClick={checkVerification}>Я подтвердил</button>
    </div>
  );
}
