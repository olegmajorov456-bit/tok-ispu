import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import Auth from "./Auth";
import ProfileForm from "./ProfileForm";
import Home from "./Home";
import Profile from "./Profile";
import Discovery from "./Discovery";
import Matches from "./Matches";
import Chat from "./Chat";
import Support from "./Support";
import Admin from "./Admin";

import Header from "./Header";
import BottomNav from "./BottomNav";

import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  // Пока проверяем авторизацию и профиль —
  // не показываем ни анкету, ни основное приложение.
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState("home");
  const [selectedChat, setSelectedChat] =
    useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadUserProfile(userId) {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) {
        return null;
      }

      if (error) {
        console.error(
          "Ошибка загрузки профиля:",
          error
        );

        return null;
      }

      setProfile(data);

      return data;
    }

    async function initialize() {
      try {
        const {
          data: {
            session: currentSession,
          },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        setSession(currentSession);

        // Если пользователь авторизован,
        // сначала полностью загружаем его профиль.
        if (currentSession?.user) {
          await loadUserProfile(
            currentSession.user.id
          );
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "Ошибка инициализации:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) {
          return;
        }

        setSession(newSession);

        // Выход из аккаунта
        if (!newSession) {
          setProfile(null);
          setSelectedChat(null);
          setPage("home");
          setLoading(false);
          return;
        }

        // Если авторизация произошла уже после
        // первоначальной загрузки — загружаем профиль.
        async function loadAfterAuth() {
          setLoading(true);

          await loadUserProfile(
            newSession.user.id
          );

          if (mounted) {
            setLoading(false);
          }
        }

        loadAfterAuth();
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleProfileCreated(newProfile) {
    setProfile(newProfile);
    setPage("home");
  }

  function openChat(chatData) {
    setSelectedChat(chatData);
    setPage("chat");
  }

  function openSupport() {
    setPage("support");
  }

  function openAdmin() {
    setPage("admin");
  }

  function goHome() {
    setPage("home");
    setSelectedChat(null);
  }

  /*
   * =====================================================
   * ПЕРВОНАЧАЛЬНАЯ ЗАГРУЗКА
   * =====================================================
   *
   * Здесь специально НЕ проверяем profile отдельно.
   *
   * Сначала:
   * 1. Проверяем авторизацию.
   * 2. Если пользователь авторизован —
   *    загружаем профиль.
   * 3. Только после этого убираем загрузочный экран.
   *
   * Поэтому окно "Создай свою анкету" больше
   * не будет мелькать на секунду.
   */

  if (loading) {
    return (
      <div className="site-loading">
        <div className="site-loading-content">

          <div className="site-loading-logo">
            <img
              src="/tok-logo.png"
              alt="ТОК — Знакомства в ИГЭУ"
            />
          </div>

          <div className="site-loading-loader">
            <div className="site-loading-spinner" />
          </div>

          <p className="site-loading-title">
            Загружаем ТОК
          </p>

          <p className="site-loading-subtitle">
            Знакомства в ИГЭУ
          </p>

          <div className="site-loading-dots">
            <span />
            <span />
            <span />
          </div>

        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * НЕ АВТОРИЗОВАН
   * =====================================================
   */

  if (!session) {
    return <Auth />;
  }

  /*
   * =====================================================
   * АВТОРИЗОВАН, НО АНКЕТЫ ЕЩЁ НЕТ
   * =====================================================
   */

  if (!profile) {
    return (
      <ProfileForm
        user={session.user}
        onProfileCreated={
          handleProfileCreated
        }
      />
    );
  }

  /*
   * =====================================================
   * ЧАТ
   * =====================================================
   */

  if (
    page === "chat" &&
    selectedChat
  ) {
    return (
      <Chat
        user={session.user}
        match={selectedChat.match}
        profile={selectedChat.profile}
        onBack={() =>
          setPage("matches")
        }
      />
    );
  }

  /*
   * =====================================================
   * ПОДДЕРЖКА
   * =====================================================
   */

  if (page === "support") {
    return (
      <Support
        user={session.user}
        onBack={() =>
          setPage("home")
        }
      />
    );
  }

  /*
   * =====================================================
   * АДМИНКА
   * =====================================================
   */

  if (page === "admin") {
    return (
      <Admin
        user={session.user}
        onBack={() =>
          setPage("profile")
        }
      />
    );
  }

  /*
   * =====================================================
   * ОСНОВНОЕ ПРИЛОЖЕНИЕ
   * =====================================================
   */

  return (
    <div className="app-shell">
      <Header
        onHome={goHome}
        onSupport={openSupport}
      />

      <main className="app-content">

        {page === "home" && (
          <Home
            user={session.user}
            profile={profile}
            onDiscovery={() =>
              setPage("discovery")
            }
            onMatches={() =>
              setPage("matches")
            }
            onProfile={() =>
              setPage("profile")
            }
          />
        )}

        {page === "discovery" && (
          <Discovery
            user={session.user}
            onHome={goHome}
          />
        )}

        {page === "matches" && (
          <Matches
            user={session.user}
            onHome={goHome}
            onOpenChat={openChat}
          />
        )}

        {page === "profile" && (
          <Profile
            user={session.user}
            profile={profile}
            onHome={goHome}
            onAdmin={openAdmin}
            onProfileUpdated={(
              updatedProfile
            ) =>
              setProfile(
                updatedProfile
              )
            }
          />
        )}

      </main>

      <BottomNav
        activePage={page}
        onHome={() =>
          setPage("home")
        }
        onDiscovery={() =>
          setPage("discovery")
        }
        onMatches={() =>
          setPage("matches")
        }
        onProfile={() =>
          setPage("profile")
        }
      />
    </div>
  );
}

export default App;