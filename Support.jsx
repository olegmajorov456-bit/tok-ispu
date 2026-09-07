import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import "./Support.css";

function Support({ user, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    const runId = ++runIdRef.current;
    let alive = true;

    async function init() {
      setLoading(true);

      const { data: existingConversation, error: existingError } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive || runId !== runIdRef.current) return;

      if (existingError) {
        console.error("Ошибка загрузки обращения:", existingError);
        setLoading(false);
        return;
      }

      let currentConversation = existingConversation;

      if (!currentConversation) {
        const { data: createdConversation, error: createError } = await supabase
          .from("support_conversations")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (!alive || runId !== runIdRef.current) return;

        if (createError) {
          if (createError.code === "23505") {
            const { data: retryConversation, error: retryError } = await supabase
              .from("support_conversations")
              .select("*")
              .eq("user_id", user.id)
              .single();

            if (!alive || runId !== runIdRef.current) return;
            if (retryError) {
              console.error("Ошибка поиска обращения:", retryError);
              setLoading(false);
              return;
            }
            currentConversation = retryConversation;
          } else {
            console.error("Ошибка создания обращения:", createError);
            setLoading(false);
            return;
          }
        } else {
          currentConversation = createdConversation;
        }
      }

      if (!currentConversation) {
        setLoading(false);
        return;
      }

      setConversation(currentConversation);

      const { data: loadedMessages, error: messagesError } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", currentConversation.id)
        .order("created_at", { ascending: true });

      if (!alive || runId !== runIdRef.current) return;

      if (messagesError) {
        console.error("Ошибка загрузки сообщений поддержки:", messagesError);
        setLoading(false);
        return;
      }

      setMessages(loadedMessages || []);

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (!alive || runId !== runIdRef.current) return;

      const channel = supabase
        .channel(`support-user-${user.id}-${currentConversation.id}-${runId}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${currentConversation.id}`,
        }, (payload) => {
          if (!alive || runId !== runIdRef.current) return;
          setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]);
        });

      channelRef.current = channel;
      await channel.subscribe();

      if (alive && runId === runIdRef.current) setLoading(false);
    }

    init();

    return () => {
      alive = false;
      runIdRef.current += 1;
      if (channelRef.current) {
        const channelToRemove = channelRef.current;
        channelRef.current = null;
        supabase.removeChannel(channelToRemove);
      }
    };
  }, [user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();
    const body = text.trim();
    if (!body || !conversation || sending) return;

    setSending(true);
    const { data, error } = await supabase
      .from("support_messages")
      .insert({ conversation_id: conversation.id, sender_id: user.id, body })
      .select()
      .single();

    if (error) {
      console.error("Ошибка отправки сообщения поддержки:", error);
      alert("Не удалось отправить сообщение. Попробуйте ещё раз.");
      setSending(false);
      return;
    }

    setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data]);
    setText("");
    setSending(false);
  }

  if (loading) return <div className="support-page"><div className="support-loading"><p>Открываем поддержку...</p></div></div>;

  return (
    <div className="support-page">
      <header className="support-header">
        <button className="support-back" onClick={onBack}>←</button>
        <div><strong>Поддержка ТОК</strong><span>Мы рядом, если что-то не работает</span></div>
      </header>

      <main className="support-messages">
        {messages.length === 0 ? (
          <div className="support-welcome"><div className="support-welcome-icon">💬</div><h2>Чем можем помочь?</h2><p>Напиши нам о проблеме или задай вопрос. Сообщение увидит команда поддержки ТОК.</p></div>
        ) : messages.map((message) => {
          const isMine = message.sender_id === user.id;
          return <div key={message.id} className={`support-message ${isMine ? "mine" : "admin"}`}><div>{message.body}</div><small>{new Date(message.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</small></div>;
        })}
        <div ref={messagesEndRef} />
      </main>

      <form className="support-input" onSubmit={sendMessage}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Написать сообщение..." maxLength={1000} disabled={sending} />
        <button type="submit" disabled={sending || !text.trim()}>➤</button>
      </form>
    </div>
  );
}

export default Support;
