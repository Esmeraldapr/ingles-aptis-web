export type Role = 'student' | 'teacher' | 'admin'
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type ExerciseType = 'multiple_choice' | 'fill_blank' | 'listening' | 'writing'
export type EnrollmentStatus = 'active' | 'completed' | 'dropped'
export type Skill = 'grammar' | 'reading' | 'listening' | 'writing' | 'speaking' | 'teoria'

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const EXERCISE_TYPES: ExerciseType[] = ['multiple_choice', 'fill_blank', 'listening', 'writing']

export interface Profile {
  id: string
  user_id: string
  nombre: string | null
  email: string | null
  rol: Role
  nivel_actual: Level | null
  fecha_registro: string
  avatar_url: string | null
}

export interface Course {
  id: string
  title: string
  description: string | null
  level: Level
  image_url: string | null
  created_by: string | null
  created_at: string
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  content: string | null
  order_index: number
  video_url: string | null
  created_at: string
}

export interface WritingOptions {
  respuesta_modelo?: string
}

export interface Exercise {
  id: string
  lesson_id: string
  type: ExerciseType
  question: string
  options: string[] | WritingOptions | null
  correct_answer: string | null
  points: number
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  status: EnrollmentStatus
}

export interface StudentProgress {
  id: string
  student_id: string
  lesson_id: string
  completed: boolean
  score: number | null
  completed_at: string | null
}

export interface Submission {
  id: string
  student_id: string
  exercise_id: string
  answer: string | null
  is_correct: boolean | null
  submitted_at: string
}

export interface SubmitResult {
  is_correct: boolean | null
  correct_answer: string | null
  lesson_score: number | null
}

export interface StudentStats {
  total_submissions: number
  correct: number
  accuracy: number | null
  lessons_completed: number
  avg_score: number | null
  streak_days: number
}
