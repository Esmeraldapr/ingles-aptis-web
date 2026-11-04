import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl font-extrabold">Esta página no existe</h1>
      <p className="mt-3 text-slate">Puede que el enlace esté mal escrito o que la lección se haya borrado.</p>
      <Link to="/" className="btn btn-primary mt-6">Volver al inicio</Link>
    </div>
  )
}
