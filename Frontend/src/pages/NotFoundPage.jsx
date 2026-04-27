import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Large 404 */}
        <div className="relative mb-8">
          <p className="text-[120px] font-semibold text-gray-100 leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-semibold text-brand-400">?</span>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
          Double-check the URL or head back to safety.
        </p>

        <div className="flex gap-3 justify-center">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Go back
          </button>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            <Home size={15} /> Dashboard
          </button>
        </div>

        <div className="mt-12 text-xs text-gray-300">
          Dock<span className="text-brand-300">et</span>
        </div>
      </div>
    </div>
  )
}
