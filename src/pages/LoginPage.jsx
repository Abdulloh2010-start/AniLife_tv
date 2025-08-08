import { useState } from "react";
import { auth, googleProvider, githubProvider } from "../firebase.config";
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useUser } from "../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import "../styles/login.scss";

function getShortErrorMessage(code) {
  switch(code){
    case "auth/user-not-found": return "Пользователь не найден";
    case "auth/wrong-password": return "Неверный пароль";
    case "auth/email-already-in-use": return "Email уже занят";
    case "auth/account-exists-with-different-credential": return "Аккаунт с таким email уже есть";
    case "auth/invalid-email": return "Неверный email";
    case "auth/weak-password": return "Пароль слишком простой";
    default: return "Ошибка входа";
  }
}

export default function LoginPage(){
  const { setUser } = useUser();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);

  const [emailSignIn, setEmailSignIn] = useState("");
  const [passwordSignIn, setPasswordSignIn] = useState("");
  const [errorEmailSignIn, setErrorEmailSignIn] = useState("");
  const [errorPasswordSignIn, setErrorPasswordSignIn] = useState("");
  const [generalErrorSignIn, setGeneralErrorSignIn] = useState("");

  const [emailSignUp, setEmailSignUp] = useState("");
  const [passwordSignUp, setPasswordSignUp] = useState("");
  const [errorEmailSignUp, setErrorEmailSignUp] = useState("");
  const [errorPasswordSignUp, setErrorPasswordSignUp] = useState("");
  const [generalErrorSignUp, setGeneralErrorSignUp] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setErrorEmailSignIn(""); setErrorPasswordSignIn(""); setGeneralErrorSignIn("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailSignIn, passwordSignIn);
      if (!userCredential.user.emailVerified) {
        setGeneralErrorSignIn("Подтвердите email");
        return;
      }
      setUser(userCredential.user);
      navigate("/", { replace: true });
    } catch (err) {
      const msg = getShortErrorMessage(err.code);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        setErrorEmailSignIn(msg); setEmailSignIn("");
      } else if (err.code === "auth/wrong-password") {
        setErrorPasswordSignIn(msg); setPasswordSignIn("");
      } else {
        setGeneralErrorSignIn(msg);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setGeneralErrorSignIn("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      navigate("/", { replace: true });
    } catch (err) {
      setGeneralErrorSignIn(getShortErrorMessage(err.code));
    }
  };

  const handleGithubSignIn = async () => {
    setGeneralErrorSignIn("");
    try {
      const result = await signInWithPopup(auth, githubProvider);
      setUser(result.user);
      navigate("/", { replace: true });
    } catch (err) {
      setGeneralErrorSignIn(getShortErrorMessage(err.code));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorEmailSignUp(""); setErrorPasswordSignUp(""); setGeneralErrorSignUp(""); setMessage("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailSignUp, passwordSignUp);
      await sendEmailVerification(userCredential.user);
      setMessage("Проверьте почту");
      setIsRegistering(false);
      setEmailSignUp(""); setPasswordSignUp("");
    } catch (err) {
      const msg = getShortErrorMessage(err.code);
      if (err.code === "auth/email-already-in-use" || err.code === "auth/invalid-email") {
        setErrorEmailSignUp(msg); setEmailSignUp("");
      } else if (err.code === "auth/weak-password") {
        setErrorPasswordSignUp(msg); setPasswordSignUp("");
      } else {
        setGeneralErrorSignUp(msg);
      }
    }
  };

  return (
    <div className={`container${isRegistering ? " active" : ""}`} id="container">
      <div className="form-container sign-up">
        <form onSubmit={handleRegister}>
          <h1 className="black">Создать аккаунт</h1>
          {message && <p className="message">{message}</p>}
          <div className="social-icons">
            <a className="icon google" onClick={handleGoogleSignIn} role="button" tabIndex={0}><i className="fa-brands fa-google"></i></a>
            <a className="icon facebook" onClick={e => e.preventDefault()}><i className="fa-brands fa-facebook-f"></i></a>
            <a className="icon github" onClick={handleGithubSignIn} role="button" tabIndex={0}><i className="fa-brands fa-github"></i></a>
            <a className="icon linkedin" onClick={e => e.preventDefault()}><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
          <span className="black none">или email</span>
          <div className="input-group">
            <input type="email" id="email-signup" placeholder={errorEmailSignUp} value={emailSignUp} onChange={e => { setEmailSignUp(e.target.value); if(errorEmailSignUp) setErrorEmailSignUp(""); if(generalErrorSignUp) setGeneralErrorSignUp(""); }} className={errorEmailSignUp ? "input-error" : ""} required/>
            <label htmlFor="email-signup">Email</label>
          </div>
          <div className="input-group">
            <input type="password" id="password-signup" placeholder={errorPasswordSignUp} value={passwordSignUp} onChange={e => { setPasswordSignUp(e.target.value); if(errorPasswordSignUp) setErrorPasswordSignUp(""); if(generalErrorSignUp) setGeneralErrorSignUp(""); }} className={errorPasswordSignUp ? "input-error" : ""} required/>
            <label htmlFor="password-signup">Пароль</label>
          </div>
          <button type="submit">Зарегистрироваться</button>
        </form>
      </div>
      <div className="form-container sign-in">
        <form onSubmit={handleEmailSignIn}>
          <h1 className="black">Вход</h1>
          <div className="social-icons">
            <a className="icon google" onClick={handleGoogleSignIn} role="button" tabIndex={0}><i className="fa-brands fa-google"></i></a>
            <a className="icon facebook" onClick={e => e.preventDefault()}><i className="fa-brands fa-facebook-f"></i></a>
            <a className="icon github" onClick={handleGithubSignIn} role="button" tabIndex={0}><i className="fa-brands fa-github"></i></a>
            <a className="icon linkedin" onClick={e => e.preventDefault()}><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
          <span className="black none">или email и пароль</span>
          <div className="input-group">
            <input type="email" id="email-signin" placeholder={errorEmailSignIn} value={emailSignIn} onChange={e => { setEmailSignIn(e.target.value); if(errorEmailSignIn) setErrorEmailSignIn(""); if(generalErrorSignIn) setGeneralErrorSignIn(""); }} className={errorEmailSignIn ? "input-error" : ""} required/>
            <label htmlFor="email-signin">Email</label>
          </div>
          <div className="input-group">
            <input type="password" id="password-signin" placeholder={errorPasswordSignIn} value={passwordSignIn} onChange={e => { setPasswordSignIn(e.target.value); if(errorPasswordSignIn) setErrorPasswordSignIn(""); if(generalErrorSignIn) setGeneralErrorSignIn("");}} className={errorPasswordSignIn ? "input-error" : ""} required/>
            <label htmlFor="password-signin">Пароль</label>
          </div>
          <a style={{ marginBottom: 10 }}>Забыли пароль?</a>
          <button type="submit">Войти</button>
        </form>
      </div>
      <div className="toggle-container">
        <div className="toggle">
          <div className="toggle-panel toggle-left">
            <h1>С возвращением!</h1>
            <p>Введите данные для входа</p>
            <button className="hidden" id="login" onClick={() => { setErrorEmailSignIn(""); setErrorPasswordSignIn(""); setGeneralErrorSignIn(""); setMessage(""); setIsRegistering(false); }}>Вход</button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>Привет, друг!</h1>
            <p>Зарегистрируйтесь для доступа</p>
            <button className="hidden" id="register" onClick={() => { setErrorEmailSignUp(""); setErrorPasswordSignUp(""); setGeneralErrorSignUp(""); setMessage(""); setIsRegistering(true); }}>Регистрация</button>
          </div>
        </div>
      </div>
    </div>
  );
};