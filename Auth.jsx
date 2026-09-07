import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./Auth.css";

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Регистрация прошла успешно! Проверьте почту, если подтверждение включено.");
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-logo" src="/tok-logo.png" alt="ТОК" />
        <div className="auth-brand">ТОК</div>
        <h2>{isLogin ? "Вход" : "Регистрация"}</h2>
        <p className="auth-subtitle">Знакомства внутри ИГЭУ</p>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} minLength="6" required />
          <button type="submit" disabled={loading}>
            {loading ? "Подождите..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <button className="switch-button" onClick={() => { setIsLogin(!isLogin); setMessage(""); }}>
          {isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}

export default Auth;
