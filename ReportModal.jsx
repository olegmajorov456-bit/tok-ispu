import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./ReportModal.css";

function ReportModal({ user, profile, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submitReport() {
    if (!reason || !profile?.id || loading) return;
    setLoading(true);

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: profile.id,
      reason,
      details: details.trim() || null,
      status: "new",
    });

    if (error) {
      console.error("Ошибка отправки жалобы:", error);
      alert("Не удалось отправить жалобу. Попробуйте ещё раз.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="report-overlay">
        <div className="report-modal report-success">
          <div className="report-success-icon">✓</div>
          <h2>Жалоба отправлена</h2>
          <p>Спасибо. Мы проверим профиль и примем необходимые меры.</p>
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(event) => event.stopPropagation()}>
        <button className="report-close" onClick={onClose} aria-label="Закрыть">×</button>
        <h2>Пожаловаться</h2>
        <p className="report-subtitle">Жалоба на {profile?.name || "пользователя"}</p>

        <div className="report-reasons">
          {[
            ["Оскорбления", "🚫 Оскорбления"],
            ["Фейковый профиль", "🎭 Фейковый профиль"],
            ["Неприемлемый контент", "⚠️ Неприемлемый контент"],
            ["Спам", "📢 Спам"],
            ["Другое", "••• Другое"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={reason === value ? "selected" : ""} onClick={() => setReason(value)}>{label}</button>
          ))}
        </div>

        <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Дополнительно опишите проблему..." maxLength={1000} />
        <button className="report-submit" onClick={submitReport} disabled={!reason || loading}>{loading ? "Отправляем..." : "Отправить жалобу"}</button>
      </div>
    </div>
  );
}

export default ReportModal;
