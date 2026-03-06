export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">TB Command Center</h1>
        <p className="text-slate-600 mb-6">Redirecting to login...</p>
        <a href="/login" className="text-blue-600 hover:text-blue-800 underline">
          Click here if not redirected automatically
        </a>
      </div>
      <script dangerouslySetInnerHTML={{
        __html: 'setTimeout(() => window.location.href = "/login", 1000)'
      }} />
    </div>
  )
}
