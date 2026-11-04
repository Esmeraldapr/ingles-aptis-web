# Hoja de respuestas: plataforma de práctica de inglés (Aptis)

Aplicación web para practicar inglés por cursos y niveles (A1–C2). Los alumnos responden tests con corrección automática y siguen su progreso. Los profesores y administradores gestionan el contenido y consultan estadísticas.

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, React Router y TanStack Query.
- **Backend:** Supabase (Auth, PostgreSQL con RLS, funciones RPC y Edge Functions).
- **Despliegue:** Vercel o Netlify para el frontend y Supabase Cloud para el backend.

## Estructura

```
src/
  components/   Layout, AnswerBubbles (opciones tipo hoja de respuestas), Markdown, ui
  pages/        Landing, Auth, Dashboard, Catalog, CourseDetail, LessonView, Progress, Profile
  pages/admin/  AdminHome (cursos), AdminCourse (lecciones), AdminLesson (ejercicios), AdminStudents
  hooks/        useAuth (sesión y perfil), queries (todas las llamadas a Supabase con React Query)
  lib/          supabase.ts (cliente), lessons.ts (utilidades de títulos, destrezas y textos)
  types/        tipos del modelo de datos
supabase/
  migrations/   esquema, RLS, RPC y ajustes (en orden)
  functions/    welcome-email, generate-certificate
  seed/         contenido del curso (NO se sube al repositorio: es material con derechos)
```

## Modelo de datos

| Tabla | Para qué |
|---|---|
| `profiles` | Un perfil por usuario de `auth.users`, con `rol` (student, teacher o admin) y `nivel_actual`. Se crea solo al registrarse (trigger `handle_new_user`). |
| `courses` → `lessons` → `exercises` | Contenido. `exercises.type` es multiple_choice, fill_blank, listening o writing. `options` es JSON. |
| `enrollments` | Matrículas de cada alumno en cursos. |
| `submissions` | Cada respuesta enviada, con `is_correct`. |
| `student_progress` | Nota y estado por alumno y lección. |
| `certificates` | Cursos terminados (los crea la Edge Function). |

**Funciones RPC**

- **`submit_answer(exercise_id, answer)`:** corrige la respuesta, la guarda y recalcula la nota de la lección. Los alumnos no pueden escribir directamente en `submissions` ni en `student_progress`.
- **`get_student_stats(student_id)`:** devuelve el total de respuestas, los aciertos, las lecciones completadas, la nota media y la racha de días. La puede usar el propio alumno o el staff.

**Seguridad (RLS)**

- Todas las tablas tienen RLS activado.
- Un alumno solo ve y modifica sus propios datos.
- El contenido lo puede leer cualquier usuario con sesión, y solo `teacher` o `admin` pueden crearlo, editarlo o borrarlo.
- El catálogo de cursos es público para la portada.
- Un trigger impide que un usuario se cambie el rol a sí mismo.

## Instalación local

```bash
npm install
cp .env.example .env      # pon tu URL y tu clave publishable/anon de Supabase
npm run dev
```

## Configurar Supabase

1. Crea un proyecto en https://supabase.com.
2. En **SQL Editor**, ejecuta en orden los archivos de `supabase/migrations/`.
3. (Opcional) Carga el contenido del curso con `supabase/seed/aptis.sql`.
4. **Authentication → URL Configuration:**
   - En *Site URL*, pon la URL de producción (por ejemplo `https://tu-app.vercel.app`).
   - En *Redirect URLs*, añade `http://localhost:5173/**` y `https://tu-app.vercel.app/**`.
5. Regístrate en la web y hazte administradora desde el SQL Editor:
   ```sql
   update profiles set rol = 'admin' where email = 'tu@email.com';
   ```
6. (Opcional) Para entrar con Google, activa el proveedor en **Authentication → Providers → Google**.

### Edge Functions (opcional)

```bash
npx supabase login
npx supabase link --project-ref TU_REF
npx supabase functions deploy generate-certificate
npx supabase functions deploy welcome-email
npx supabase secrets set RESEND_API_KEY=re_xxx   # solo si quieres emails de bienvenida
```

## Despliegue en Vercel

1. Importa el repositorio en https://vercel.com/new. Detecta Vite solo.
2. En *Environment Variables*, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Pulsa Deploy. `vercel.json` ya redirige todas las rutas a `index.html`. Para Netlify, el equivalente es `public/_redirects`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build localmente |
