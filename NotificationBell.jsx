import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import "./NotificationBell.css";

function formatNotificationDate(date) {
  if (!date) return "";
  const value = new Date(date);
  const diff = Math.max(0, Date.now() - value.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return value.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef(null);
  const channelRef = useRef(null);

  async function loadNotifications() {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(30);

    if (error) {
      console.warn("Уведомления пока недоступны:", error.message);
      setLoading(false);
      return;
    }

    const actorIds = [...new Set((data || []).map((item) => item.actor_id).filter(Boolean))];
    let profiles = [];
    if (actorIds.length) {
      const { data: profileData } = await supabase.from("profiles")
        .select("id,name,avatar_url").in("id", actorIds);
      profiles = profileData || [];
    }

    setNotifications((data || []).map((item) => ({
      ...item, actor: profiles.find((profile) => profile.id === item.actor_id),
    })));
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();

    const channel = supabase.channel(`notifications-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        let actor = null;
        if (payload.new.actor_id) {
          const { data } = await supabase.from("profiles")
            .select("id,name,avatar_url").eq("id", payload.new.actor_id).maybeSingle();
          actor = data;
        }
        setNotifications((current) => [
          { ...payload.new, actor },
          ...current.filter((item) => item.id !== payload.new.id),
        ].slice(0, 30));
      }).subscribe();

    channelRef.current = channel;

    function handleOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user.id]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  async function markAllRead() {
    if (!unreadCount) return;
    const { error } = await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
    if (error) return console.error("Ошибка отметки уведомлений:", error);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  async function markRead(id) {
    const item = notifications.find((notification) => notification.id === id);
    if (!item || item.is_read) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }

  return (
    <div className="notification-root" ref={rootRef}>
      <button className="header-notification-button" onClick={() => setOpen((value) => !value)}
        title="Уведомления" aria-label="Уведомления" aria-expanded={open}>
        <span className="header-notification-icon">🔔</span>
        {unreadCount > 0 && <span className="header-notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && <div className="notification-panel">
        <div className="notification-panel-header">
          <div><strong>Уведомления</strong><span>{unreadCount ? `${unreadCount} новых` : "Всё просмотрено"}</span></div>
          {unreadCount > 0 && <button onClick={markAllRead}>Прочитать всё</button>}
        </div>
        <div className="notification-list">
          {loading ? <div className="notification-empty">Загружаем уведомления...</div> :
           notifications.length === 0 ? <div className="notification-empty"><span>🔔</span><strong>Пока тихо</strong><p>Здесь появятся лайки и новые сообщения.</p></div> :
           notifications.map((notification) => <button key={notification.id}
             className={`notification-item ${notification.is_read ? "read" : "unread"}`} onClick={() => markRead(notification.id)}>
             <div className="notification-avatar">
               {notification.actor?.avatar_url ? <img src={notification.actor.avatar_url} alt="" /> :
                 <span>{notification.type === "like" ? "♥" : "💬"}</span>}
             </div>
             <div className="notification-copy">
               <strong>{notification.actor?.name || "Кто-то"}</strong>
               <p>{notification.body}</p><small>{formatNotificationDate(notification.created_at)}</small>
             </div>
             {!notification.is_read && <span className="notification-dot" />}
           </button>)}
        </div>
      </div>}
    </div>
  );
}

export default NotificationBell;
