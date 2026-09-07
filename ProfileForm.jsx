import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./ProfileForm.css";

function getMaxBirthDate() {
  const date = new Date();

  date.setFullYear(date.getFullYear() - 16);

  return date.toISOString().split("T")[0];
}

function getMinBirthDate() {
  const date = new Date();

  date.setFullYear(date.getFullYear() - 100);

  return date.toISOString().split("T")[0];
}

function ProfileForm({ user, onProfileCreated }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [faculty, setFaculty] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function handleAvatarChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Можно загружать только изображения.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Фотография должна быть меньше 5 МБ.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  }
  async function handleSubmit(event) {
    event.preventDefault();
    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const monthDifference = today.getMonth() - birth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birth.getDate())
    ) {
      age--;
    }

    if (age < 16) {
      setError("Регистрация доступна только с 16 лет.");
      return;
    }

    if (age > 100) {
      setError("Проверьте дату рождения.");
      return;
    }

    setLoading(true);
    setError("");
    let avatarUrl = null;

    if (avatarFile) {
      const fileExtension = avatarFile.name.split(".").pop();

      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExtension}`;

      const { error: uploadError } = await supabase
        .storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          contentType: avatarFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from("avatars")
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData.publicUrl;
    }
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name: name,
        birth_date: birthDate,
        gender: gender,
        looking_for: lookingFor,
        faculty: faculty,
        course: course ? Number(course) : null,
        description: description,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setError(error.message);
      setLoading(false);
      return;
    }

    onProfileCreated(data);
    setLoading(false);
  }

  return (
    <div className="profile-page">
      <div className="profile-card">

        <h1>Создай свою анкету ❤️</h1>

        <p className="profile-subtitle">
          Расскажи немного о себе
        </p>

        <form onSubmit={handleSubmit}>

          <input
            type="text"
            placeholder="Имя"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label>
            Дата рождения
          </label>

          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            min={getMinBirthDate()}
            max={getMaxBirthDate()}
            required
          />

          <select
            value={gender}
            onChange={(event) => setGender(event.target.value)}
            required
          >
            <option value="">Твой пол</option>
            <option value="male">Парень</option>
            <option value="female">Девушка</option>
            <option value="other">Другое</option>
          </select>

          <select
            value={lookingFor}
            onChange={(event) => setLookingFor(event.target.value)}
            required
          >
            <option value="">Кого ищешь?</option>
            <option value="male">Парня</option>
            <option value="female">Девушку</option>
            <option value="any">Неважно</option>
          </select>

          <input
            type="text"
            placeholder="Факультет"
            value={faculty}
            onChange={(event) => setFaculty(event.target.value)}
          />

          <input
            type="number"
            placeholder="Курс"
            value={course}
            onChange={(event) => setCourse(event.target.value)}
            min="1"
            max="10"
          />

          <div className="avatar-upload">

            <label className="avatar-label">
              Фотография
            </label>

            {avatarPreview && (
              <img
                src={avatarPreview}
                alt="Предпросмотр"
                className="avatar-preview"
              />
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />

            <small>
              JPG, PNG или другое изображение до 5 МБ
            </small>

          </div>

          <textarea
            placeholder="Расскажи о себе"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows="4"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Сохраняем..." : "Создать анкету"}
          </button>

        </form>

        {error && (
          <p className="profile-error">
            {error}
          </p>
        )}

      </div>
    </div>
  );
}

export default ProfileForm;