import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import MobileNav from './MobileNav'
import { useEffect, useState } from 'react'

export default function AppShell() {
  const [toast, setToast] = useState<null | {
    title: string
    message: string
  }>(null)

  useEffect(() => {
    let timeoutId: number | undefined

    function playNotificationSound() {
      try {
        const context = new AudioContext()
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = 660
        gain.gain.value = 0.08
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start()
        oscillator.stop(context.currentTime + 0.15)
        oscillator.onended = () => context.close()
      } catch {
        // Ignore audio errors on unsupported browsers
      }
    }

    function handleJuridicoReply(event: Event) {
      const detail = (event as CustomEvent).detail as {
        clienteNome: string
        message: string
      }
      if (!detail) return
      setToast({
        title: 'Resposta do juridico',
        message: `${detail.clienteNome}: ${detail.message}`,
      })
      playNotificationSound()
      timeoutId = window.setTimeout(() => setToast(null), 3500)
    }

    function handleChatIncoming(event: Event) {
      const detail = (event as CustomEvent).detail as {
        clienteNome: string
        message: string
      }
      if (!detail) return
      setToast({
        title: 'Mensagem recebida',
        message: `${detail.clienteNome}: ${detail.message}`,
      })
      playNotificationSound()
      timeoutId = window.setTimeout(() => setToast(null), 3500)
    }

    window.addEventListener('brain:juridicoReply', handleJuridicoReply)
    window.addEventListener('brain:chatIncoming', handleChatIncoming)
    return () => {
      window.removeEventListener('brain:juridicoReply', handleJuridicoReply)
      window.removeEventListener('brain:chatIncoming', handleChatIncoming)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex min-h-screen w-full flex-1 flex-col">
          <TopBar />
          <MobileNav />
          <main className="flex-1 px-6 pb-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 w-[320px] rounded-2xl border border-stroke bg-white/90 p-4 text-sm shadow-card">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">{toast.title}</p>
          <p className="mt-2 font-semibold text-ink">{toast.message}</p>
        </div>
      ) : null}
    </div>
  )
}
