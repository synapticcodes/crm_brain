import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import MobileNav from './MobileNav'
import GridPattern from './GridPattern'
import { useCallback, useEffect, useRef, useState } from 'react'
import { driver, type DriverStep } from 'driver.js'
import { useAuth } from '../hooks/useAuth'

export default function AppShell() {
  const { isAdmin } = useAuth()
  const [toast, setToast] = useState<null | {
    title: string
    message: string
  }>(null)
  const tourRef = useRef<ReturnType<typeof driver> | null>(null)

  const buildTourSteps = useCallback(() => {
    const steps: Array<DriverStep & { adminOnly?: boolean }> = [
      {
        element: '[data-tour="sidebar"]',
        popover: {
          title: 'Navegacao',
          description: 'Acesse os modulos principais do CRM por aqui.',
        },
      },
      {
        element: '[data-tour="nav-customers"]',
        popover: {
          title: 'Clientes',
          description: 'Kanban com clientes, documentos e visao financeira.',
        },
      },
      {
        element: '[data-tour="nav-app-access"]',
        popover: {
          title: 'Aplicativo',
          description: 'Status de acesso mobile e bloqueios.',
        },
      },
      {
        element: '[data-tour="nav-legal"]',
        popover: {
          title: 'Juridico',
          description: 'Tickets, prazos e comunicacoes legais.',
        },
      },
      {
        element: '[data-tour="nav-support"]',
        popover: {
          title: 'Atendimentos',
          description: 'Chat com clientes e fluxo de emails.',
        },
      },
      {
        element: '[data-tour="nav-logs"]',
        popover: {
          title: 'Logs',
          description: 'Auditoria de acoes e historico do time.',
        },
      },
      {
        element: '[data-tour="nav-team"]',
        adminOnly: true,
        popover: {
          title: 'Equipe',
          description: 'Convites, perfis e permissoes.',
        },
      },
      {
        element: '[data-tour="nav-prompts"]',
        adminOnly: true,
        popover: {
          title: 'Prompts',
          description: 'Assistentes e configuracoes de IA.',
        },
      },
      {
        element: '[data-tour="topbar"]',
        popover: {
          title: 'Topo',
          description: 'Resumo do dia, notificacoes e acesso rapido ao perfil.',
        },
      },
      {
        element: '[data-tour="tour-trigger"]',
        popover: {
          title: 'Ajuda',
          description: 'Reinicie o tour quando quiser.',
        },
      },
      {
        element: '[data-tour="notifications"]',
        popover: {
          title: 'Notificacoes',
          description: 'Novas mensagens de chat, juridico e emails.',
        },
      },
      {
        element: '[data-tour="page-header"]',
        popover: {
          title: 'Resumo da tela',
          description: 'Entenda o objetivo da pagina e use os atalhos disponiveis.',
        },
      },
      {
        element: '[data-tour="customers-stats"]',
        popover: {
          title: 'Indicadores',
          description: 'Volume de clientes por status e pendencias.',
        },
      },
      {
        element: '[data-tour="customers-filters"]',
        popover: {
          title: 'Filtros',
          description: 'Busque por nome, CPF e refine por etapa.',
        },
      },
      {
        element: '[data-tour="customers-kanban"]',
        popover: {
          title: 'Kanban',
          description: 'Arraste clientes entre etapas para atualizar o status.',
        },
      },
      {
        element: '[data-tour="main-content"]',
        popover: {
          title: 'Area principal',
          description: 'Aqui ficam os dados operacionais e cards do dia a dia.',
        },
      },
    ]
    return steps.filter((step) => {
      if (step.adminOnly && !isAdmin) return false
      if (!step.element) return true
      return Boolean(document.querySelector(step.element))
    })
  }, [isAdmin])

  const startTour = useCallback(() => {
    const steps = buildTourSteps()
    if (!steps.length) return
    tourRef.current = driver({
      showProgress: true,
      animate: true,
      steps,
      nextBtnText: 'Proximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Concluir',
      allowClose: true,
      disableActiveInteraction: true,
    })
    tourRef.current.drive()
    window.localStorage.setItem('brain_tour_seen', '1')
  }, [buildTourSteps])

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

  useEffect(() => {
    const handler = () => startTour()
    window.addEventListener('brain:startTour', handler)
    return () => window.removeEventListener('brain:startTour', handler)
  }, [startTour])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem('brain_tour_seen')) return
    const timeout = window.setTimeout(() => startTour(), 350)
    return () => window.clearTimeout(timeout)
  }, [startTour])

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex min-h-screen w-full flex-1 flex-col">
          <TopBar />
          <MobileNav />
          <main className="relative flex-1 bg-slate-100/70 px-4 pb-12 xl:px-8" data-tour="main-content">
            <GridPattern className="app-grid text-slate-300/70" width={48} height={48} />
            <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-10 animate-fade-in">
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
