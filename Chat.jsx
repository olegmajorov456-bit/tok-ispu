import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import "./Chat.css";

function Chat({ user, match, profile, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const runId = ++runIdRef.current;

    async function initChat() {
      setLoading(true);

      const { data: existing, error: existingError } = await supabase
        .from("conversations")
        .select("*")
        .eq("match_id", match.id)
        .maybeSingle();

      if (!mountedRef.current || runId !== runIdRef.current) return;

      if (existingError) {
        console.error("Ошибка поиска чата:", existingError);
        setLoading(false);
        return;
      }

      let currentConversation = existing;

      if (!currentConversation) {
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({ match_id: match.id })
          .select()
          .single();

        if (!mountedRef.current || runId !== runIdRef.current) return;

        if (createError) {
          if (createError.code === "23505") {
            const { data: retryConversation, error: retryError } = await supabase
              .from("conversations")
              .select("*")
              .eq("match_id", match.id)
              .single();

            if (retryError) {
              console.error("Ошибка повторного поиска чата:", retryError);
              setLoading(false);
              return;
            }
            currentConversation = retryConversation;
          } else {
            console.error("Ошибка создания чата:", createError);
            setLoading(false);
            return;
          }
        } else {
          currentConversation = created;
        }
      }

      if (!currentConversation) {
        setLoading(false);
        return;
      }

      setConversation(currentConversation);

      const { data: loadedMessages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", currentConversation.id)
        .order("created_at", { ascending: true });

      if (!mountedRef.current || runId !== runIdRef.current) return;

      if (messagesError) {
        console.error("Ошибка загрузки сообщений:", messagesError);
        setLoading(false);
        return;
      }

      setMessages(loadedMessages || []);

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (!mountedRef.current || runId !== runIdRef.current) return;

      const channel = supabase
        .channel(`chat-${currentConversation.id}-${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${currentConversation.id}`,
        }, (payload) => {
          if (!mountedRef.current || runId !== runIdRef.current) return;
          setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]);
        });

      channelRef.current = channel;
      await channel.subscribe();

      if (mountedRef.current) setLoading(false);
    }

    initChat();

    return () => {
      runIdRef.current += 1;
      mountedRef.current = false;
      if (channelRef.current) {
        const channelToRemove = channelRef.current;
        channelRef.current = null;
        supabase.removeChannel(channelToRemove);
      }
    };
  }, [match.id, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !conversation || sending) return;

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, sender_id: user.id, body: text })
      .select()
      .single();

    if (error) {
      console.error("Ошибка отправки сообщения:", error);
      setSending(false);
      return;
    }

    setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data]);
    setMessageText("");
    setSending(false);
  }

  if (loading) {
    return <div className="chat-page"><div className="chat-loading"><div className="chat-spinner" /><p>Открываем чат...</p></div></div>;
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button className="chat-back" onClick={onBack}>←</button>
        <div className="chat-user">
          <div className="chat-avatar">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name || ""} /> : <span>👤</span>}
          </div>
          <div><strong>{profile?.name || "Пользователь"}</strong><span>Ваш мэтч ❤️</span></div>
        </div>
      </header>

      <main className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty"><div>💕</div><strong>Начните общение</strong><p>Вы понравились друг другу. Напишите первым!</p></div>
        ) : messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.sender_id === user.id ? "mine" : "theirs"}`}>{message.body}</div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Напишите сообщение..." maxLength={2000} disabled={sending} />
        <button type="submit" disabled={sending || !messageText.trim()}>➤</button>
      </form>
    </div>
  );
}

export default Chat;
