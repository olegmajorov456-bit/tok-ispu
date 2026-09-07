import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import "./Admin.css";

const DEFAULT_TITLE = "Общайся. Знакомься. Находи своих.";
const DEFAULT_DESCRIPTION = "ТОК создан специально для студентов ИГЭУ. Здесь всё начинается с обычной симпатии.";

function Admin({ user, onBack }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState("support");

  const [supportConversations, setSupportConversations] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportText, setSupportText] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

  const [homeTitle, setHomeTitle] = useState(DEFAULT_TITLE);
  const [homeDescription, setHomeDescription] = useState(DEFAULT_DESCRIPTION);
  const [savingHome, setSavingHome] = useState(false);
  const [homeMessage, setHomeMessage] = useState("");

  const channelsRef = useRef([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkAdmin();

    return () => {
      mountedRef.current = false;
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [user.id]);

  useEffect(() => {
    if (!isAdmin) return;

    loadSupportConversations();
    loadReports();
    loadHomeSettings();
    subscribeToAdminEvents();

    return () => {
      channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [isAdmin]);

  async function checkAdmin() {
    setCheckingAdmin(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Ошибка проверки администратора:", error);
      setIsAdmin(false);
    } else {
      setIsAdmin(data?.is_admin === true);
    }

    if (mountedRef.current) setCheckingAdmin(false);
  }

  function subscribeToAdminEvents() {
    channelsRef.current.forEach((channel) => supabase.removeChannel(channel));
    channelsRef.current = [];

    const channel = supabase
      .channel(`admin-panel-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_conversations" }, () => {
        loadSupportConversations();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => {
        loadSupportConversations();
        if (selectedConversation?.id === payload.new.conversation_id) {
          setSupportMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]);
          setTimeout(scrollSupportToBottom, 30);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
        loadReports();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reports" }, () => {
        loadReports();
      })
      .subscribe();

    channelsRef.current.push(channel);
  }

  async function loadSupportConversations() {
    setLoadingSupport(true);
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки обращений:", error);
      setLoadingSupport(false);
      return;
    }

    const conversations = data || [];
    if (!conversations.length) {
      setSupportConversations([]);
      setLoadingSupport(false);
      return;
    }

    const userIds = conversations.map((item) => item.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,name,avatar_url,faculty,course")
      .in("id", userIds);

    if (profilesError) console.error("Ошибка загрузки профилей обращений:", profilesError);

    const result = conversations.map((conversation) => ({
      ...conversation,
      profile: profiles?.find((profile) => profile.id === conversation.user_id),
    }));

    setSupportConversations(result);
    setLoadingSupport(false);
  }

  async function openSupportConversation(conversation) {
    setSelectedConversation(conversation);
    setSupportMessages([]);

    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Ошибка загрузки сообщений поддержки:", error);
      return;
    }

    setSupportMessages(data || []);
    setTimeout(scrollSupportToBottom, 30);
  }

  function scrollSupportToBottom() {
    const element = document.querySelector(".admin-support-messages");
    if (element) element.scrollTop = element.scrollHeight;
  }

  async function sendSupportMessage(event) {
    event.preventDefault();
    const body = supportText.trim();
    if (!body || !selectedConversation || sendingSupport) return;

    setSendingSupport(true);
    const { data, error } = await supabase
      .from("support_messages")
      .insert({ conversation_id: selectedConversation.id, sender_id: user.id, body })
      .select()
      .single();

    if (error) {
      console.error("Ошибка отправки сообщения поддержки:", error);
      alert("Не удалось отправить сообщение. Проверьте права таблицы support_messages.");
      setSendingSupport(false);
      return;
    }

    setSupportMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data]);
    setSupportText("");
    setSendingSupport(false);
    setTimeout(scrollSupportToBottom, 30);
  }

  async function loadReports() {
    setLoadingReports(true);
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки жалоб:", error);
      setLoadingReports(false);
      return;
    }

    const reportList = data || [];
    if (!reportList.length) {
      setReports([]);
      setLoadingReports(false);
      return;
    }

    const userIds = [...new Set(reportList.flatMap((report) => [report.reporter_id, report.reported_user_id]))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,name,avatar_url,faculty,course")
      .in("id", userIds);

    if (profilesError) console.error("Ошибка загрузки профилей жалоб:", profilesError);

    setReports(reportList.map((report) => ({
      ...report,
      reporter: profiles?.find((profile) => profile.id === report.reporter_id),
      reported: profiles?.find((profile) => profile.id === report.reported_user_id),
    })));
    setLoadingReports(false);
  }

  async function updateReportStatus(reportId, status) {
    const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
    if (error) {
      console.error("Ошибка изменения статуса жалобы:", error);
      alert("Не удалось изменить статус жалобы.");
      return;
    }
    setReports((current) => current.map((report) => report.id === reportId ? { ...report, status } : report));
  }

  async function loadHomeSettings() {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["home_title", "home_description"]);

    if (error) {
      console.error("Ошибка загрузки настроек главной:", error);
      return;
    }

    for (const item of data || []) {
      if (item.key === "home_title") setHomeTitle(item.value);
      if (item.key === "home_description") setHomeDescription(item.value);
    }
  }

  async function saveHomeSettings(event) {
    event.preventDefault();
    setSavingHome(true);
    setHomeMessage("");

    const updates = [
      { key: "home_title", value: homeTitle.trim() },
      { key: "home_description", value: homeDescription.trim() },
    ];

    const { error } = await supabase.from("app_settings").upsert(updates, { onConflict: "key" });

    if (error) {
      console.error("Ошибка сохранения настроек главной:", error);
      setHomeMessage("Не удалось сохранить изменения.");
      setSavingHome(false);
      return;
    }

    setHomeMessage("Изменения сохранены.");
    setSavingHome(false);
  }

  function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (checkingAdmin) {
    return <div className="admin-page"><div className="admin-loading"><div className="admin-spinner" /><p>Проверяем доступ...</p></div></div>;
  }

  if (!isAdmin) {
    return <div className="admin-page"><div className="admin-access-denied"><div className="admin-denied-icon">🔒</div><h1>Доступ запрещён</h1><p>Эта страница доступна только администраторам ТОК.</p><button className="admin-back-button" onClick={onBack}>Вернуться назад</button></div></div>;
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <button className="admin-back" onClick={onBack}>←</button>
        <img src="/tok-logo.png" alt="ТОК" className="admin-logo" />
      </header>

      <main className="admin-container">
        <div className="admin-tabs">
          <button className={activeTab === "support" ? "active" : ""} onClick={() => { setActiveTab("support"); setSelectedConversation(null); }}>💬 Поддержка <span>{supportConversations.length}</span></button>
          <button className={activeTab === "reports" ? "active" : ""} onClick={() => { setActiveTab("reports"); setSelectedConversation(null); }}>🚩 Жалобы <span>{reports.length}</span></button>
          <button className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>🏠 Главная</button>
        </div>

        {activeTab === "support" && (
          <section className="admin-section">
            {!selectedConversation ? (
              <>
                <div className="admin-section-heading"><div><span className="admin-section-kicker">ОБРАЩЕНИЯ ПОЛЬЗОВАТЕЛЕЙ</span><h2>Техническая поддержка</h2></div><button className="admin-refresh" onClick={loadSupportConversations}>↻ Обновить</button></div>
                {loadingSupport ? <div className="admin-empty"><div className="admin-spinner" /><p>Загружаем обращения...</p></div> : supportConversations.length === 0 ? <div className="admin-empty"><div className="admin-empty-icon">💬</div><h3>Обращений пока нет</h3><p>Когда пользователь напишет в поддержку, обращение появится здесь.</p></div> : <div className="admin-support-list">{supportConversations.map((conversation) => { const profile = conversation.profile; return <button key={conversation.id} className="admin-support-card" onClick={() => openSupportConversation(conversation)}><div className="admin-user-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name || "Пользователь"} /> : <span>👤</span>}</div><div className="admin-support-info"><strong>{profile?.name || "Пользователь"}</strong><span>{profile?.faculty ? `🎓 ${profile.faculty}` : "Обращение в поддержку"}</span><small>{formatDate(conversation.created_at)}</small></div><span className="admin-card-arrow">→</span></button>; })}</div>}
              </>
            ) : (
              <div className="admin-chat">
                <div className="admin-chat-header"><button className="admin-chat-back" onClick={() => setSelectedConversation(null)}>←</button><div className="admin-user-avatar small">{selectedConversation.profile?.avatar_url ? <img src={selectedConversation.profile.avatar_url} alt="" /> : <span>👤</span>}</div><div><strong>{selectedConversation.profile?.name || "Пользователь"}</strong><span>Диалог с поддержкой</span></div></div>
                <div className="admin-support-messages">{supportMessages.length === 0 ? <div className="admin-chat-empty">Сообщений пока нет.</div> : supportMessages.map((message) => <div key={message.id} className={`admin-support-message ${message.sender_id === user.id ? "mine" : "user"}`}><div>{message.body}</div><small>{new Date(message.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</small></div>)}</div>
                <form className="admin-support-input" onSubmit={sendSupportMessage}><input value={supportText} onChange={(e) => setSupportText(e.target.value)} placeholder="Ответ пользователю..." maxLength={2000} disabled={sendingSupport} /><button type="submit" disabled={sendingSupport || !supportText.trim()}>➤</button></form>
              </div>
            )}
          </section>
        )}

        {activeTab === "reports" && (
          <section className="admin-section">
            <div className="admin-section-heading"><div><span className="admin-section-kicker">МОДЕРАЦИЯ</span><h2>Жалобы пользователей</h2></div><button className="admin-refresh" onClick={loadReports}>↻ Обновить</button></div>
            {loadingReports ? <div className="admin-empty"><div className="admin-spinner" /><p>Загружаем жалобы...</p></div> : reports.length === 0 ? <div className="admin-empty"><div className="admin-empty-icon">🚩</div><h3>Жалоб пока нет</h3><p>Здесь будут появляться жалобы на пользователей.</p></div> : <div className="admin-reports-list">{reports.map((report) => <article key={report.id} className="admin-report-card"><div className="admin-report-top"><div><span className="admin-report-label">Жалоба №{report.id}</span><h3>{report.reason}</h3></div><select value={report.status} onChange={(e) => updateReportStatus(report.id, e.target.value)}><option value="new">Новая</option><option value="in_review">На рассмотрении</option><option value="resolved">Решена</option><option value="rejected">Отклонена</option></select></div><div className="admin-report-users"><div className="admin-report-user"><span>Кто пожаловался</span><strong>{report.reporter?.name || "Пользователь"}</strong></div><div className="admin-report-arrow">→</div><div className="admin-report-user"><span>На кого жалоба</span><strong>{report.reported?.name || "Пользователь"}</strong></div></div>{report.details ? <div className="admin-report-details"><span>Подробности</span><p>{report.details}</p></div> : null}<div className="admin-report-date">Создано: {formatDate(report.created_at)}</div></article>)}</div>}
          </section>
        )}

        {activeTab === "home" && (
          <section className="admin-section">
            <div className="admin-section-heading"><div><span className="admin-section-kicker">КОНТЕНТ</span><h2>Главная страница</h2></div></div>
            <form className="admin-home-form" onSubmit={saveHomeSettings}>
              <label><span>Заголовок</span><input value={homeTitle} onChange={(e) => setHomeTitle(e.target.value)} maxLength={120} /></label>
              <label><span>Описание</span><textarea value={homeDescription} onChange={(e) => setHomeDescription(e.target.value)} maxLength={500} rows={6} /></label>
              {homeMessage && <p className="admin-home-message">{homeMessage}</p>}
              <button className="admin-save-button" type="submit" disabled={savingHome}>{savingHome ? "Сохраняем..." : "Сохранить изменения"}</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default Admin;
