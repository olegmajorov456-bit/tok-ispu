import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./Discovery.css";
import ReportModal from "./ReportModal";

function calculateAge(birthDate) {
  if (!birthDate) return "";

  const today = new Date();
  const birth = new Date(birthDate);

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference =
    today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function Discovery({ user, onHome }) {
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    setCurrentIndex(0);

    const {
      data: myProfile,
      error: myProfileError,
    } = await supabase
      .from("profiles")
      .select("gender, looking_for")
      .eq("id", user.id)
      .single();

    if (myProfileError) {
      console.error(
        "Ошибка загрузки своего профиля:",
        myProfileError
      );

      setLoading(false);
      return;
    }

    const {
      data: viewed,
      error: viewedError,
    } = await supabase
      .from("profile_views")
      .select("viewed_profile_id")
      .eq("viewer_id", user.id);

    if (viewedError) {
      console.error(
        "Ошибка загрузки просмотренных анкет:",
        viewedError
      );

      setLoading(false);
      return;
    }

    const viewedIds = (viewed || []).map(
      (item) => item.viewed_profile_id
    );

    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id);

    if (myProfile.looking_for === "male" || myProfile.looking_for === "female") {
      query = query.eq("gender", myProfile.looking_for);
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "Ошибка загрузки анкет:",
        error
      );

      setLoading(false);
      return;
    }

    const availableProfiles = (data || []).filter(
      (profile) =>
        !viewedIds.includes(profile.id)
    );

    setProfiles(availableProfiles);
    setLoading(false);
  }

  async function markProfileAsViewed(profileId) {
    const { error } = await supabase
      .from("profile_views")
      .insert({
        viewer_id: user.id,
        viewed_profile_id: profileId,
      });

    if (
      error &&
      error.code !== "23505"
    ) {
      console.error(
        "Ошибка сохранения просмотра:",
        error
      );
    }
  }

  async function nextProfile() {
    const profile = profiles[currentIndex];

    if (!profile) return;

    await markProfileAsViewed(profile.id);

    setCurrentIndex(
      (index) => index + 1
    );
  }

  async function handleSkip() {
    if (actionLoading) return;

    setActionLoading(true);

    await nextProfile();

    setActionLoading(false);
  }

  async function handleLike() {
    const profile = profiles[currentIndex];

    if (!profile || actionLoading) {
      return;
    }

    setActionLoading(true);

    await markProfileAsViewed(profile.id);

    // Сохраняем лайк
    const {
      error: likeError,
    } = await supabase
      .from("likes")
      .insert({
        user_id: user.id,
        liked_user_id: profile.id,
      });

    // Если лайк уже существует,
    // это не страшно
    if (
      likeError &&
      likeError.code !== "23505"
    ) {
      console.error(
        "Ошибка лайка:",
        likeError
      );

      setActionLoading(false);
      return;
    }

    // Просим Supabase проверить
    // взаимный лайк и создать мэтч
    const {
      data: matchId,
      error: matchError,
    } = await supabase.rpc(
      "create_match_if_mutual",
      {
        target_user_id: profile.id,
      }
    );

    if (matchError) {
      console.error(
        "Ошибка создания мэтча:",
        matchError
      );
    }

    if (matchId) {
      alert(
        `💕 У вас взаимная симпатия с ${profile.name}!`
      );
    }

    setCurrentIndex(
      (index) => index + 1
    );

    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="discovery-page">
        <main className="discovery-container">
          <div className="discovery-loading">
            <div className="loading-spinner" />
            <p>Загрузка анкет...</p>
          </div>
        </main>
      </div>
    );
  }

  const profile =
    profiles[currentIndex];

  if (!profile) {
    return (
      <div className="discovery-page">
        <main className="discovery-container">
          <div className="discovery-empty">
            <div className="empty-icon">
              💕
            </div>

            <h2>
              Анкеты закончились
            </h2>

            <p>
              Мы показали тебе всех
              подходящих пользователей.
              Загляни позже — возможно,
              появятся новые анкеты.
            </p>

            <button
              className="empty-home-button"
              onClick={onHome}
            >
              <span>⌂</span>
              Вернуться домой
            </button>

            <button
              className="empty-refresh-button"
              onClick={loadProfiles}
            >
              Обновить анкеты
            </button>
          </div>
        </main>
      </div>
    );
  }

  const age = calculateAge(
    profile.birth_date
  );

  return (
    <div className="discovery-page">
      <main className="discovery-container">

        <div className="discovery-card">

          <div className="discovery-photo">

            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
              />
            ) : (
              <div className="no-photo">
                <span>👤</span>
              </div>
            )}

            <div className="discovery-gradient" />

            <div className="discovery-info">

              <h1>
                {profile.name}
                {age
                  ? `, ${age}`
                  : ""}
              </h1>

              {(profile.faculty ||
                profile.course) && (
                <p>
                  {profile.faculty &&
                    `🎓 ${profile.faculty}`}

                  {profile.faculty &&
                    profile.course &&
                    " • "}

                  {profile.course &&
                    `📚 ${profile.course} курс`}
                </p>
              )}

            </div>
          </div>

          <div className="discovery-content">

            <p className="discovery-description">
              {profile.description ||
                "Пользователь пока ничего не написал о себе."}
            </p>

          </div>

          <div className="discovery-actions">

            <button
              className="discovery-button skip"
              onClick={handleSkip}
              disabled={actionLoading}
              aria-label="Пропустить"
            >
              ✕
            </button>
            <button
              className="discovery-report-button"
              onClick={() => setReportOpen(true)}
            >
              🚩 Пожаловаться
            </button>
            <button
              className="discovery-button like"
              onClick={handleLike}
              disabled={actionLoading}
              aria-label="Нравится"
            >
              ♥
            </button>

          </div>

        </div>

      </main>
      {reportOpen && (
        <ReportModal
          user={user}
          profile={profile}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

export default Discovery;