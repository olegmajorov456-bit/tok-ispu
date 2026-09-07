import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./Matches.css";

function Matches({ user, onHome, onOpenChat }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .select("*")
      .or(
        `user1_id.eq.${user.id},user2_id.eq.${user.id}`
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Ошибка загрузки мэтчей:",
        error
      );

      setLoading(false);
      return;
    }

    const matchList = data || [];

    if (matchList.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const otherUserIds =
      matchList.map((match) =>
        match.user1_id === user.id
          ? match.user2_id
          : match.user1_id
      );

    const {
      data: profiles,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select("*")
      .in("id", otherUserIds);

    if (profilesError) {
      console.error(
        "Ошибка загрузки профилей мэтчей:",
        profilesError
      );

      setLoading(false);
      return;
    }

    const result = matchList.map(
      (match) => {
        const otherUserId =
          match.user1_id === user.id
            ? match.user2_id
            : match.user1_id;

        const profile =
          profiles?.find(
            (item) =>
              item.id === otherUserId
          );

        return {
          ...match,
          profile,
        };
      }
    );

    setMatches(result);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="matches-page">
        <div className="matches-loading">
          <div className="matches-spinner" />
          <p>Загружаем мэтчи...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="matches-page">

      <main className="matches-container">

        <div className="matches-heading">
          <div>
            <span className="matches-kicker">
              ОБЩАЯ СИМПАТИЯ
            </span>

            <h1>Мои мэтчи 💕</h1>

            <p>
              Здесь люди, с которыми
              у вас взаимная симпатия.
            </p>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="matches-empty">

            <div className="matches-empty-icon">
              💕
            </div>

            <h2>
              Пока нет мэтчей
            </h2>

            <p>
              Лайкай понравившихся людей
              в разделе знакомств.
              Если симпатия взаимна —
              человек появится здесь.
            </p>

            <button
              onClick={onHome}
              className="matches-home-button"
            >
              Перейти домой
            </button>

          </div>
        ) : (
          <div className="matches-list">

            {matches.map((match) => {

              const profile =
                match.profile;

              if (!profile) {
                return null;
              }

              return (
                <button
                  key={match.id}
                  className="match-card"
                  onClick={() =>
                    onOpenChat({
                      match,
                      profile,
                    })
                  }
                >

                  <div className="match-avatar">

                    {profile.avatar_url ? (
                      <img
                        src={
                          profile.avatar_url
                        }
                        alt={
                          profile.name
                        }
                      />
                    ) : (
                      <span>👤</span>
                    )}

                  </div>

                  <div className="match-info">

                    <strong>
                      {profile.name}
                    </strong>

                    <span>
                      Начать общение
                    </span>

                  </div>

                  <div className="match-arrow">
                    →
                  </div>

                </button>
              );
            })}

          </div>
        )}

      </main>

    </div>
  );
}

export default Matches;