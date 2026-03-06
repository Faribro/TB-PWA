import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TB Command Center',
  other: {
    'http-equiv': 'refresh',
    content: '0; url=/login'
  }
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-600">Redirecting to login...</div>
      <script dangerouslySetInnerHTML={{
        __html: 'window.location.href = "/login"'
      }} />
    </div>
  )
}
