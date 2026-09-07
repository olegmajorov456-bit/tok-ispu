# Публикация ТОК

## 1. Локально

1. Создайте `.env.local` в корне проекта:

```env
VITE_SUPABASE_URL=ваш_url_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=ваш_publishable_key
```

2. Установите зависимости:

```bash
npm install
```

3. Запустите:

```bash
npm run dev
```

4. Перед публикацией проверьте:
- регистрация и вход;
- создание профиля;
- загрузка фото;
- знакомства;
- лайк и мэтч;
- чат;
- поддержка с двух аккаунтов;
- жалоба;
- просмотр жалобы в админке;
- изменение статуса жалобы;
- изменение текста главной из админки.

## 2. Supabase

Выполните `supabase_migration.sql` в SQL Editor проекта Supabase.

После этого назначьте свой аккаунт администратором:

```sql
update public.profiles
set is_admin = true
where id = 'ВАШ-USER-UID';
```

## 3. GitHub

Создайте новый репозиторий и загрузите проект. Файл `.env.local` в GitHub не загружайте.

## 4. Cloudflare Pages

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Добавьте переменные окружения:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Для SPA нужен fallback всех неизвестных маршрутов на `/index.html`.
