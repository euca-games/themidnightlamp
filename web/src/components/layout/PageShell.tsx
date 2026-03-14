import Navbar from './Navbar'

interface Props {
  children: React.ReactNode
  title?: string
}

export default function PageShell({ children, title }: Props) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        {title && <h1 className="text-2xl font-semibold mb-8 text-white">{title}</h1>}
        {children}
      </main>
    </div>
  )
}
