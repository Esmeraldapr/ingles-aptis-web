import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  Course, Enrollment, Exercise, Lesson, Profile, StudentProgress, StudentStats, Submission, SubmitResult,
} from '../types'

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data as T
}

// ---------- Cursos ----------
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => unwrap<Course[]>(supabase.from('courses').select('*').order('level').order('title')),
  })
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['course', id],
    enabled: !!id,
    queryFn: () => unwrap<Course>(supabase.from('courses').select('*').eq('id', id!).single()),
  })
}

export function useLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ['lessons', courseId],
    enabled: !!courseId,
    queryFn: () =>
      unwrap<Lesson[]>(supabase.from('lessons').select('*').eq('course_id', courseId!).order('order_index')),
  })
}

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: ['lesson', id],
    enabled: !!id,
    queryFn: () => unwrap<Lesson>(supabase.from('lessons').select('*').eq('id', id!).single()),
  })
}

export function useExercises(lessonId: string | undefined) {
  return useQuery({
    queryKey: ['exercises', lessonId],
    enabled: !!lessonId,
    queryFn: () =>
      unwrap<Exercise[]>(supabase.from('exercises').select('*').eq('lesson_id', lessonId!)),
  })
}

/** Número de ejercicios por lección de un curso (para mostrar tamaños). */
export function useExerciseCounts(courseId: string | undefined) {
  return useQuery({
    queryKey: ['exercise-counts', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      // PostgREST devuelve como máximo 1000 filas por petición: se pide por páginas
      const rows: { lesson_id: string }[] = []
      for (let from = 0; ; from += 1000) {
        const page = await unwrap<{ lesson_id: string }[]>(
          supabase
            .from('exercises')
            .select('lesson_id, lessons!inner(course_id)')
            .eq('lessons.course_id', courseId!)
            .order('id')
            .range(from, from + 999),
        )
        rows.push(...page)
        if (page.length < 1000) break
      }
      const counts: Record<string, number> = {}
      for (const r of rows) counts[r.lesson_id] = (counts[r.lesson_id] ?? 0) + 1
      return counts
    },
  })
}

// ---------- Matrículas y progreso ----------
export function useMyEnrollments(profileId: string | undefined) {
  return useQuery({
    queryKey: ['enrollments', profileId],
    enabled: !!profileId,
    queryFn: () =>
      unwrap<(Enrollment & { courses: Course })[]>(
        supabase.from('enrollments').select('*, courses(*)').eq('student_id', profileId!).order('enrolled_at'),
      ),
  })
}

export function useEnroll(profileId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (courseId: string) =>
      unwrap(supabase.from('enrollments').insert({ student_id: profileId, course_id: courseId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollments'] }),
  })
}

export function useMyProgress(profileId: string | undefined) {
  return useQuery({
    queryKey: ['progress', profileId],
    enabled: !!profileId,
    queryFn: () =>
      unwrap<(StudentProgress & { lessons: Pick<Lesson, 'title' | 'course_id' | 'order_index'> })[]>(
        supabase.from('student_progress').select('*, lessons(title, course_id, order_index)').eq('student_id', profileId!),
      ),
  })
}

export function useMyLessonSubmissions(profileId: string | undefined, lessonId: string | undefined) {
  return useQuery({
    queryKey: ['lesson-submissions', profileId, lessonId],
    enabled: !!profileId && !!lessonId,
    queryFn: () =>
      unwrap<Submission[]>(
        supabase
          .from('submissions')
          .select('*, exercises!inner(lesson_id)')
          .eq('student_id', profileId!)
          .eq('exercises.lesson_id', lessonId!)
          .order('submitted_at', { ascending: false }),
      ),
  })
}

export function useMyHistory(profileId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['history', profileId, limit],
    enabled: !!profileId,
    queryFn: () =>
      unwrap<(Submission & { exercises: Pick<Exercise, 'question' | 'type' | 'lesson_id'> })[]>(
        supabase
          .from('submissions')
          .select('*, exercises(question, type, lesson_id)')
          .eq('student_id', profileId!)
          .order('submitted_at', { ascending: false })
          .limit(limit),
      ),
  })
}

export function useSubmissionDays(profileId: string | undefined) {
  return useQuery({
    queryKey: ['submission-days', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const since = new Date(Date.now() - 29 * 86400000).toISOString()
      const rows = await unwrap<Pick<Submission, 'submitted_at' | 'is_correct'>[]>(
        supabase
          .from('submissions')
          .select('submitted_at, is_correct')
          .eq('student_id', profileId!)
          .gte('submitted_at', since),
      )
      return rows
    },
  })
}

export function useSubmitAnswer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { exerciseId: string; answer: string }) => {
      const rows = await unwrap<SubmitResult[]>(
        supabase.rpc('submit_answer', { p_exercise_id: args.exerciseId, p_answer: args.answer }),
      )
      return rows[0]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    },
  })
}

export function useStudentStats(profileId: string | undefined) {
  return useQuery({
    queryKey: ['stats', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const rows = await unwrap<StudentStats[]>(supabase.rpc('get_student_stats', { p_student_id: profileId }))
      return rows[0]
    },
  })
}

// ---------- Perfil ----------
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Profile> }) =>
      unwrap(supabase.from('profiles').update(args.patch).eq('id', args.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

// ---------- Administración ----------
export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: () =>
      unwrap<Profile[]>(supabase.from('profiles').select('*').order('fecha_registro', { ascending: false })),
  })
}

type Table = 'courses' | 'lessons' | 'exercises'

export function useSave<T extends { id?: string }>(table: Table, invalidate: unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (row: T) => {
      const { id, ...rest } = row as { id?: string } & Record<string, unknown>
      if (id) return unwrap(supabase.from(table).update(rest as never).eq('id', id))
      return unwrap(supabase.from(table).insert(rest as never))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidate }),
  })
}

export function useDelete(table: Table, invalidate: unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(supabase.from(table).delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidate }),
  })
}
