import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { teamMock } from '../lib/mockData'
import { supabase } from '../lib/supabaseClient'
import { bffFetch } from '../lib/apiBff'
import { normalizeAssistantText } from '../lib/assistantText'
import { useAuth } from '../hooks/useAuth'

type PromptEntry = {
  id: string
  assistantKey: string
  action: string
  label: string
  systemPrompt: string
  userTemplate: string
  outputSchema: string
}

const DEFAULT_PROMPTS: PromptEntry[] = [
  {
    id: 'chat-summary-short',
    assistantKey: 'chat',
    action: 'summary_short',
    label: 'Chat · Resumo rápido',
    systemPrompt: 'Voce e um assistente que resume conversas de suporte. Seja objetivo.',
    userTemplate:
      'Resuma em 3 bullets o que o cliente precisa agora. Use o historico abaixo:\n{{messages}}',
    outputSchema: '3 bullets curtos com status do cliente, pendencias e proximo passo.',
  },
  {
    id: 'chat-summary-long',
    assistantKey: 'chat',
    action: 'summary_long',
    label: 'Chat · Resumo detalhado',
    systemPrompt:
      'Voce e um assistente que cria resumos detalhados de conversas. Seja claro e organizado.',
    userTemplate:
      'Crie um resumo detalhado com contexto, pendencias, acordos e proximos passos:\n{{messages}}',
    outputSchema: 'Resumo em paragrafo + lista de pendencias.',
  },
  {
    id: 'chat-suggest',
    assistantKey: 'chat',
    action: 'suggest_reply',
    label: 'Chat · Sugerir resposta',
    systemPrompt:
      'Voce e um atendente de CRM. Responda em portugues seguindo o tom solicitado e atendendo obrigatoriamente o pedido do atendente.',
    userTemplate:
      'Com base no historico e no pedido abaixo, sugira uma resposta curta que siga o pedido.\nTom: {{tone}}\nHistorico:\n{{messages}}\nPedido do atendente (prioridade maxima): {{query}}',
    outputSchema: 'Uma resposta curta pronta para envio.',
  },
  {
    id: 'team-measure',
    assistantKey: 'team',
    action: 'measure',
    label: 'Equipe · Medir resultados',
    systemPrompt:
      'Voce e um analista de performance. Compare um colaborador com o time.',
    userTemplate:
      'Analise o desempenho do colaborador vs time. Dados:\n{{metrics}}\nEquipe:\n{{team}}',
    outputSchema: 'Resumo em bullets com pontos fortes e oportunidades.',
  },
  {
    id: 'team-compare',
    assistantKey: 'team',
    action: 'compare',
    label: 'Equipe · Comparar resultados',
    systemPrompt:
      'Voce e um analista de performance. Compare mes atual com meses anteriores.',
    userTemplate: 'Compare os resultados atuais com o historico. Dados:\n{{metrics}}',
    outputSchema: 'Bullet list com tendencias e variacoes.',
  },
  {
    id: 'team-custom',
    assistantKey: 'team',
    action: 'custom',
    label: 'Equipe · Personalizado',
    systemPrompt:
      'Voce e um assistente de CRM. Responda com insights curtos e acionaveis.',
    userTemplate: 'Pedido: {{query}}\nDados:\n{{metrics}}\nEquipe:\n{{team}}',
    outputSchema: 'Resposta curta, objetiva e acionavel.',
  },
  {
    id: 'email-improve',
    assistantKey: 'email',
    action: 'improve',
    label: 'Email · Melhorar texto',
    systemPrompt:
      'Voce e um redator de CRM. Melhore a copy mantendo o objetivo e o tom desejado. Se houver contexto do email recebido, use para compor a resposta. Use o nome do cliente selecionado quando fornecido. Use apenas [Seu nome] e [Meu Nome Ok] no fechamento.',
    userTemplate:
      'Melhore o assunto e corpo mantendo o objetivo e tom.\nAssunto: {{subject}}\nCorpo: {{body}}\nObjetivo: {{goal}}\nTom: {{tone}}\nCliente selecionado: {{client_name}}\nContexto do email recebido:\nRemetente: {{received_from}}\nAssunto: {{received_subject}}\nCorpo: {{received_body}}\nAssinatura obrigatoria:\n[Seu nome]: {{sender_name}}\n[Nome da empresa]: {{company_name}}\nNao inclua cargo, telefone ou email.\nRetorne JSON: {"subject":"...","body":"..."}',
    outputSchema: 'JSON com subject e body.',
  },
  {
    id: 'email-create',
    assistantKey: 'email',
    action: 'create',
    label: 'Email · Criar do zero',
    systemPrompt:
      'Voce e um redator de CRM. Crie um email claro e objetivo. Se houver contexto do email recebido, use para compor a resposta. Use o nome do cliente selecionado quando fornecido. Use apenas [Seu nome] e [Meu Nome Ok] no fechamento.',
    userTemplate:
      'Crie um email do zero com base no objetivo e tom.\nObjetivo: {{goal}}\nTom: {{tone}}\nCliente selecionado: {{client_name}}\nContexto do email recebido:\nRemetente: {{received_from}}\nAssunto: {{received_subject}}\nCorpo: {{received_body}}\nAssinatura obrigatoria:\n[Seu nome]: {{sender_name}}\n[Nome da empresa]: {{company_name}}\nNao inclua cargo, telefone ou email.\nRetorne JSON: {"subject":"...","body":"..."}',
    outputSchema: 'JSON com subject e body.',
  },
]

export default function PromptsPage() {
  const { session } = useAuth()
  const [prompts, setPrompts] = useState<PromptEntry[]>(DEFAULT_PROMPTS)
  const [selectedId, setSelectedId] = useState(prompts[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [playgroundFreeText, setPlaygroundFreeText] = useState('')
  const [playgroundResult, setPlaygroundResult] = useState('')
  const [playgroundLoading, setPlaygroundLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const fallbackAdmin = teamMock.find((member) => member.role === 'admin')?.email ?? null
      setCurrentUserEmail(data.user?.email ?? fallbackAdmin)
    })
  }, [])

  const isAdmin = useMemo(() => {
    if (!currentUserEmail) return false
    const matched = teamMock.find((member) => member.email === currentUserEmail)
    if (!matched) return true
    return matched.role === 'admin'
  }, [currentUserEmail])

  useEffect(() => {
    let mounted = true
    async function loadPrompts() {
      const { data, error } = await supabase
        .schema('brain')
        .from('assistant_prompts')
        .select('id, assistant_key, action, label, system_prompt, user_template, output_schema')
        .order('label', { ascending: true })

      if (!mounted) return
      if (error) {
        setToast('Nao foi possivel carregar prompts. Usando padrao.')
        setLoading(false)
        return
      }
      if (!data || data.length === 0) {
        setLoading(false)
        return
      }

      const mapped = data.map((item) => ({
        id: item.id,
        assistantKey: item.assistant_key,
        action: item.action,
        label: item.label,
        systemPrompt: item.system_prompt,
        userTemplate: item.user_template,
        outputSchema: item.output_schema,
      })) as PromptEntry[]

      setPrompts(mapped)
      setSelectedId(mapped[0]?.id ?? '')
      setLoading(false)
    }

    loadPrompts()
    return () => {
      mounted = false
    }
  }, [])

  const filteredPrompts = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return prompts
    return prompts.filter((prompt) =>
      `${prompt.label} ${prompt.assistantKey} ${prompt.action}`.toLowerCase().includes(normalized)
    )
  }, [prompts, search])

  const selectedPrompt = prompts.find((prompt) => prompt.id === selectedId) ?? prompts[0]

  function updatePrompt<K extends keyof PromptEntry>(key: K, value: PromptEntry[K]) {
    if (!selectedPrompt) return
    setPrompts((prev) =>
      prev.map((prompt) => (prompt.id === selectedPrompt.id ? { ...prompt, [key]: value } : prompt))
    )
  }

  function resetPrompt() {
    if (!selectedPrompt) return
    const fallback = DEFAULT_PROMPTS.find((prompt) => prompt.id === selectedPrompt.id)
    if (!fallback) return
    setPrompts((prev) =>
      prev.map((prompt) => (prompt.id === selectedPrompt.id ? fallback : prompt))
    )
  }

  useEffect(() => {
    if (!selectedPrompt) return
    const defaultVars =
      selectedPrompt.assistantKey === 'chat'
        ? {
            messages: 'cliente: preciso de ajuda\natendente: claro, posso ajudar.',
            query: 'Sugira uma resposta curta e cordial.'
          }
        : {
            member: { nome: 'Aline Costa', role: 'admin' },
            metrics: { chatClosed: 12, emailsReplied: 8, sla: 94 },
            team: [{ nome: 'Time', chatClosed: 40 }],
            query: 'Compare o desempenho com o time.'
          }
    setPlaygroundFreeText(JSON.stringify(defaultVars, null, 2))
    setPlaygroundResult('')
  }, [selectedPrompt?.id])

  async function runPlayground() {
    if (!selectedPrompt) return
    if (!session?.access_token) {
      setToast('Sessao expirada. Faça login novamente.')
      return
    }
    let parsed: Record<string, string> | null = null
    if (!playgroundFreeText.trim()) {
      setToast('Digite um texto para testar.')
      return
    }
    parsed = { query: playgroundFreeText }
    setPlaygroundLoading(true)
    try {
      const payload = await bffFetch<{ response?: string }>('/prompts/preview', {
        method: 'POST',
        token: session.access_token,
        body: JSON.stringify({
          system_prompt: selectedPrompt.systemPrompt,
          user_template: selectedPrompt.userTemplate,
          variables: parsed
        })
      })
      setPlaygroundResult(normalizeAssistantText(payload.response ?? 'Sem resposta.'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao testar prompt.'
      setToast(message)
    } finally {
      setPlaygroundLoading(false)
    }
  }

  async function handleSave() {
    if (!isAdmin) return
    setSaving(true)
    const payload = prompts.map((prompt) => ({
      id: prompt.id.startsWith('chat-') || prompt.id.startsWith('team-') ? undefined : prompt.id,
      assistant_key: prompt.assistantKey,
      action: prompt.action,
      label: prompt.label,
      system_prompt: prompt.systemPrompt,
      user_template: prompt.userTemplate,
      output_schema: prompt.outputSchema,
      version: 1,
    }))

    const { error } = await supabase
      .schema('brain')
      .from('assistant_prompts')
      .upsert(payload, { onConflict: 'tenancy_id,assistant_key,action' })

    setSaving(false)
    if (error) {
      setToast('Falha ao salvar prompts.')
      return
    }
    setToast('Prompts salvos com sucesso.')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prompts"
        subtitle="Edite os prompts usados pelos assistentes."
        actions={
          <div className="flex items-center gap-2">
            {!isAdmin ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-700">
                Somente admin
              </span>
            ) : (
              <button
                onClick={handleSave}
                className="btn-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        }
      />

      {toast ? (
        <div className="rounded-full border border-stroke bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/70">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_2.1fr]">
        <div className="surface-panel p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display text-ink">Assistentes</h3>
            <span className="accent-pill">{prompts.length} prompts</span>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar prompt..."
            className="input-base mt-4 text-xs"
          />
          <div className="mt-4 space-y-3">
            {filteredPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedId(prompt.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selectedId === prompt.id
                    ? 'border-accent bg-accent text-white'
                    : 'border-stroke bg-white/80 text-ink'
                }`}
              >
                <p className="font-semibold">{prompt.label}</p>
                <p className="text-xs opacity-70">
                  {prompt.assistantKey} · {prompt.action}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="surface-panel p-6">
          {loading ? (
            <p className="text-ink/60">Carregando prompts...</p>
          ) : selectedPrompt ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Prompt ativo</p>
                  <p className="text-lg font-semibold text-ink">{selectedPrompt.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetPrompt}
                    className="rounded-full border border-stroke bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink/70"
                    disabled={!isAdmin}
                  >
                    Restaurar padrão
                  </button>
                </div>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                System prompt
                <textarea
                  value={selectedPrompt.systemPrompt}
                  onChange={(event) => updatePrompt('systemPrompt', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
                  disabled={!isAdmin}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                User template
                <textarea
                  value={selectedPrompt.userTemplate}
                  onChange={(event) => updatePrompt('userTemplate', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
                  disabled={!isAdmin}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                Output schema
                <textarea
                  value={selectedPrompt.outputSchema}
                  onChange={(event) => updatePrompt('outputSchema', event.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-2xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
                  disabled={!isAdmin}
                />
              </label>
              {!isAdmin ? (
                <p className="text-xs text-ink/50">
                  Somente admins podem editar os prompts.
                </p>
              ) : null}
              <div className="rounded-2xl border border-stroke bg-white/90 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Playground
                  </p>
                  <button
                    onClick={runPlayground}
                    className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                    disabled={playgroundLoading}
                  >
                    {playgroundLoading ? 'Testando...' : 'Testar prompt'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink/60">
                  Digite um texto livre para testar o prompt.
                </p>
                <textarea
                  value={playgroundFreeText}
                  onChange={(event) => setPlaygroundFreeText(event.target.value)}
                  rows={6}
                  className="mt-3 w-full rounded-2xl border border-stroke bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none focus:border-accent"
                />
                <div className="mt-3 rounded-2xl border border-stroke bg-white/80 p-3 text-xs text-ink/70">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">
                    Resultado
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">
                    {playgroundResult || 'Execute um teste para ver a resposta.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-ink/60">Selecione um prompt para editar.</p>
          )}
        </div>
      </div>
    </div>
  )
}
