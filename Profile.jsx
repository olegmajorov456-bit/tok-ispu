import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./Profile.css";

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

function Profile({
  user,
  onAdmin,
  onProfileUpdated,
}) {
  const [profile, setProfile] = useState(null);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [faculty, setFaculty] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      setMessage("Не удалось загрузить профиль");
      setLoading(false);
      return;
    }

    setProfile(data);

    setName(data.name || "");
    setBirthDate(data.birth_date || "");
    setGender(data.gender || "");
    setLookingFor(data.looking_for || "");
    setFaculty(data.faculty || "");
    setCourse(data.course || "");
    setDescription(data.description || "");
    setAvatarPreview(data.avatar_url || "");

    setLoading(false);
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage(
        "Можно загружать только изображения."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "Размер фотографии не должен превышать 5 МБ."
      );
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    let avatarUrl = profile?.avatar_url || null;

    try {
      if (avatarFile) {
        const fileExtension =
          avatarFile.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const filePath =
          `${user.id}/${crypto.randomUUID()}.${fileExtension}`;

        const { error: uploadError } =
          await supabase
            .storage
            .from("avatars")
            .upload(
              filePath,
              avatarFile,
              {
                contentType: avatarFile.type,
              }
            );

        if (uploadError) {
          console.error(uploadError);

          setMessage(
            "Не удалось загрузить фотографию."
          );

          setSaving(false);
          return;
        }

        const { data: publicUrlData } =
          supabase
            .storage
            .from("avatars")
            .getPublicUrl(filePath);

        avatarUrl =
          publicUrlData.publicUrl;
      }

      const { data, error } =
        await supabase
          .from("profiles")
          .update({
            name: name.trim(),
            birth_date:
              birthDate || null,
            gender:
              gender || null,
            looking_for:
              lookingFor || null,
            faculty:
              faculty.trim(),
            course:
              course
                ? Number(course)
                : null,
            description:
              description.trim(),
            avatar_url:
              avatarUrl,
          })
          .eq("id", user.id)
          .select()
          .single();

      if (error) {
        console.error(error);

        setMessage(
          "Не удалось сохранить профиль."
        );

        setSaving(false);
        return;
      }

      setProfile(data);
      setAvatarFile(null);
      setAvatarPreview(
        data.avatar_url || ""
      );

      setIsEditing(false);

      setMessage(
        "Профиль сохранён ✓"
      );

      if (onProfileUpdated) {
        onProfileUpdated(data);
      }
    } catch (error) {
      console.error(error);

      setMessage(
        "Произошла ошибка."
      );
    }

    setSaving(false);
  }

  function handleCancel() {
    if (!profile) return;

    setName(profile.name || "");
    setBirthDate(
      profile.birth_date || ""
    );
    setGender(
      profile.gender || ""
    );
    setLookingFor(
      profile.looking_for || ""
    );
    setFaculty(
      profile.faculty || ""
    );
    setCourse(
      profile.course || ""
    );
    setDescription(
      profile.description || ""
    );

    setAvatarFile(null);

    setAvatarPreview(
      profile.avatar_url || ""
    );

    setMessage("");
    setIsEditing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>

        <p>
          Загружаем профиль...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-error">
        <div className="profile-error-card">

          <div className="profile-error-icon">
            😔
          </div>

          <h2>
            Профиль не найден
          </h2>

          <p>
            {message ||
              "Попробуйте ещё раз."}
          </p>

          <button
            className="profile-primary-button"
            onClick={loadProfile}
          >
            Повторить
          </button>

        </div>
      </div>
    );
  }

  const age =
    calculateAge(
      profile.birth_date
    );

  return (
    <div className="profile-page">

      <main className="profile-container">

        <section className="profile-card">

          {/* ФОТО */}

          <div className="profile-photo-wrapper">

            {avatarPreview ? (
              <img
                className="profile-photo"
                src={avatarPreview}
                alt={profile.name}
              />
            ) : (
              <div className="profile-no-photo">

                <span>
                  👤
                </span>

                <p>
                  Нет фотографии
                </p>

              </div>
            )}

            {isEditing && (
              <label className="change-photo-button">

                📷
                <span>
                  Изменить фото
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleAvatarChange
                  }
                />

              </label>
            )}

          </div>

          {!isEditing ? (
            <>

              {/* ИНФОРМАЦИЯ */}

              <div className="profile-main-info">

                <h1>
                  {profile.name ||
                    "Без имени"}

                  {age && (
                    <span>
                      , {age}
                    </span>
                  )}
                </h1>

                {profile.faculty && (
                  <p className="profile-university">

                    🎓 {profile.faculty}

                    {profile.course &&
                      ` • ${profile.course} курс`}

                  </p>
                )}

              </div>

              {/* ТЕГИ */}

              <div className="profile-tags">

                {profile.gender && (
                  <div className="profile-tag">

                    {profile.gender ===
                    "male"
                      ? "👨"
                      : "👩"}

                    {profile.gender ===
                    "male"
                      ? " Мужчина"
                      : " Женщина"}

                  </div>
                )}

                {profile.looking_for && (
                  <div className="profile-tag">

                    ❤️ Ищет{" "}

                    {profile.looking_for ===
                    "male"
                      ? "мужчину"
                      : "женщину"}

                  </div>
                )}

              </div>

              {/* О СЕБЕ */}

              {profile.description ? (
                <div className="profile-section">

                  <h3>
                    О себе
                  </h3>

                  <p className="profile-description">
                    {profile.description}
                  </p>

                </div>
              ) : (
                <div className="profile-empty-description">

                  <span>
                    ✍️
                  </span>

                  <div>

                    <strong>
                      Расскажи о себе
                    </strong>

                    <p>
                      Добавь немного
                      информации, чтобы
                      другим было проще
                      начать разговор.
                    </p>

                  </div>

                </div>
              )}

              {/* РЕДАКТИРОВАТЬ */}

              <button
                className="profile-primary-button"
                onClick={() => {
                  setMessage("");
                  setIsEditing(true);
                }}
              >
                ✏️ Редактировать профиль
              </button>

              {/* АДМИНКА */}

              {profile.is_admin === true && (
                <button
                  className="profile-admin-button"
                  onClick={onAdmin}
                >
                  🛡️ Панель администратора
                </button>
              )}

              {/* ВЫХОД */}

              <button
                className="profile-logout-button"
                onClick={handleLogout}
              >
                🚪 Выйти из аккаунта
              </button>

            </>
          ) : (

            /* РЕДАКТИРОВАНИЕ */

            <form
              className="profile-edit-form"
              onSubmit={handleSave}
            >

              <div className="profile-form-title">

                <h2>
                  Редактирование
                </h2>

                <p>
                  Расскажи о себе немного больше
                </p>

              </div>

              {/* ИМЯ */}

              <label>

                Имя

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Твоё имя"
                  maxLength="50"
                  required
                />

              </label>

              {/* ДАТА РОЖДЕНИЯ */}

              <label>

                Дата рождения

                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) =>
                    setBirthDate(
                      event.target.value
                    )
                  }
                  required
                />

              </label>

              {/* ПОЛ */}

              <label>

                Пол

                <select
                  value={gender}
                  onChange={(event) =>
                    setGender(
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Выберите пол
                  </option>

                  <option value="male">
                    Мужчина
                  </option>

                  <option value="female">
                    Женщина
                  </option>

                </select>

              </label>

              {/* ИЩУ */}

              <label>

                Кого ищешь?

                <select
                  value={lookingFor}
                  onChange={(event) =>
                    setLookingFor(
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Выберите
                  </option>

                  <option value="male">
                    Мужчину
                  </option>

                  <option value="female">
                    Женщину
                  </option>

                </select>

              </label>

              {/* ФАКУЛЬТЕТ */}

              <label>

                Факультет

                <input
                  type="text"
                  value={faculty}
                  onChange={(event) =>
                    setFaculty(
                      event.target.value
                    )
                  }
                  placeholder="Например, ФИТ"
                  maxLength="100"
                />

              </label>

              {/* КУРС */}

              <label>

                Курс

                <select
                  value={course}
                  onChange={(event) =>
                    setCourse(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Не указан
                  </option>

                  <option value="1">
                    1 курс
                  </option>

                  <option value="2">
                    2 курс
                  </option>

                  <option value="3">
                    3 курс
                  </option>

                  <option value="4">
                    4 курс
                  </option>

                  <option value="5">
                    5 курс
                  </option>

                  <option value="6">
                    6 курс
                  </option>

                </select>

              </label>

              {/* О СЕБЕ */}

              <label>

                О себе

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Расскажи о себе, своих интересах..."
                  maxLength="500"
                  rows="5"
                />

                <span className="textarea-counter">
                  {description.length}/500
                </span>

              </label>

              {/* СООБЩЕНИЕ */}

              {message && (
                <div
                  className={
                    message.includes("✓")
                      ? "profile-success"
                      : "profile-form-message"
                  }
                >
                  {message}
                </div>
              )}

              {/* КНОПКИ */}

              <div className="profile-edit-buttons">

                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Сохраняем..."
                    : "Сохранить"}
                </button>

              </div>

            </form>
          )}

        </section>

      </main>

    </div>
  );
}

export default Profile;