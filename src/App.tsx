import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import Landing from './pages/Landing'
import { Login, Register, ForgotPassword, ResetPassword } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import CourseDetail from './pages/CourseDetail'
import LessonView from './pages/LessonView'
const Progress = lazy(() => import('./pages/Progress'))
import ProfilePage from './pages/Profile'
const AdminHome = lazy(() => import('./pages/admin/AdminHome'))
const AdminCourse = lazy(() => import('./pages/admin/AdminCourse'))
const AdminLesson = lazy(() => import('./pages/admin/AdminLesson'))
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'))
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="entrar" element={<Login />} />
        <Route path="registro" element={<Register />} />
        <Route path="recuperar" element={<ForgotPassword />} />
        <Route path="nueva-contrasena" element={<ResetPassword />} />
        <Route path="cursos" element={<Catalog />} />
        <Route path="cursos/:courseId" element={<RequireAuth><CourseDetail /></RequireAuth>} />
        <Route path="lecciones/:lessonId" element={<RequireAuth><LessonView /></RequireAuth>} />
        <Route path="panel" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="progreso" element={<RequireAuth><Progress /></RequireAuth>} />
        <Route path="perfil" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth staff><AdminHome /></RequireAuth>} />
        <Route path="admin/alumnos" element={<RequireAuth staff><AdminStudents /></RequireAuth>} />
        <Route path="admin/cursos/:courseId" element={<RequireAuth staff><AdminCourse /></RequireAuth>} />
        <Route path="admin/lecciones/:lessonId" element={<RequireAuth staff><AdminLesson /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
