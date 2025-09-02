import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "../firebase.config"
import "../styles/forgotpassword.scss"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const mapError = (code, msg) => {
    if (!code) return msg || "Что-то пошло не так"
    switch (code) {
      case "auth/invalid-email": return "Неверный формат e-mail"
      case "auth/user-not-found": return "Пользователь с таким email не найден"
      case "auth/missing-email": return "Пожалуйста, укажите email"
      case "auth/too-many-requests": return "Слишком много попыток. Попробуйте позже"
      default: return msg || code
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")
    setError("")
    if (!email || !email.includes("@")) {
      setError("Введите корректный email")
      return
    }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/login` })
      setMessage("Письмо для сброса пароля отправлено на " + email)
      setEmail("")
    } catch (err) {
      console.error("sendPasswordResetEmail error", err)
      setError(mapError(err?.code, err?.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-wrapper">
      <form className="forgot-form" onSubmit={handleSubmit}>
        <h1 className="forgot-title">Забыли пароль?</h1>
        <input id="fp-email" type="email" placeholder="Введите ваш email" value={email} onChange={(e) => setEmail(e.target.value)} required className="forgot-input" />
        <button type="submit" className="forgot-btn" disabled={loading || !email}>{loading ? "Отправка..." : "Отправить"}</button>
        {message && <p className="forgot-success" role="status">{message}</p>}
        {error && <p className="forgot-error" role="alert">{error}</p>}
      </form>
    </div>
  )
}