import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Mail, AlertCircle } from 'lucide-react';

interface ChatThread {
    id: string;
    cliente_id: string;
    protocolo: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface EmailMessage {
    id: string;
    cliente_id: string;
    direction: 'cliente' | 'equipe';
    subject: string;
    status: string;
    created_at: string;
}

export default function SupportPage() {
    const [viewMode, setViewMode] = useState<'chat' | 'email'>('chat');
    const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        // Realtime subscription
        const subscription = supabase
            .channel('tickets_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'brain',
                    table: 'chat_threads',
                },
                (payload) => {
                    if (viewMode !== 'chat') return; // Only update if in chat mode or manage state generally

                    if (payload.eventType === 'INSERT') {
                        setChatThreads((prev) => [payload.new as ChatThread, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setChatThreads((prev) =>
                            prev.map((thread) =>
                                thread.id === payload.new.id ? { ...thread, ...payload.new } as ChatThread : thread
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setChatThreads((prev) =>
                            prev.filter((thread) => thread.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [viewMode]);

    async function fetchData() {
        try {
            setLoading(true);

            if (viewMode === 'chat') {
                const { data, error } = await supabase
                    .schema('brain')
                    .from('chat_threads')
                    .select('*')
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                setChatThreads(data || []);
            } else {
                const { data, error } = await supabase
                    .schema('brain')
                    .from('emails_mensagens')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (error) throw error;
                setEmails(data || []);
            }

        } catch (err) {
            console.error('Error fetching support data:', err);
        } finally {
            setLoading(false);
        }
    }

    function getStatusBadgeColor(status: string) {
        const colors: Record<string, string> = {
            aberto: 'bg-emerald-100 text-emerald-800',
            em_atendimento: 'bg-blue-100 text-blue-800',
            aguardando_cliente: 'bg-amber-100 text-amber-800',
            resolvido: 'bg-slate-100 text-slate-800',
            fechado: 'bg-slate-100 text-slate-500',
        };
        return colors[status] || 'bg-slate-100 text-slate-800';
    }

    function getDirectionBadgeColor(direction: string) {
        return direction === 'cliente'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-blue-100 text-blue-800';
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-3">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Session 04</span>
                <h1 className="text-3xl font-display text-slate-900 section-title">Suporte</h1>
                <p className="text-sm text-slate-500 max-w-2xl">
                    Central de tickets e atendimento multicanal.
                </p>
            </header>

            <section className="flex gap-4 p-1 bg-slate-100/50 rounded-2xl w-fit">
                <button
                    onClick={() => setViewMode('chat')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'chat'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <MessageSquare size={18} />
                    Chat / WhatsApp
                </button>
                <button
                    onClick={() => setViewMode('email')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === 'email'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Mail size={18} />
                    Email
                </button>
            </section>

            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
                </div>
            )}

            {!loading && viewMode === 'chat' && (
                <>
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="soft-card p-5">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Total</div>
                            <div className="text-3xl font-display mt-2 text-slate-900">{chatThreads.length}</div>
                        </div>
                        <div className="soft-card p-5">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Abertos</div>
                            <div className="text-3xl font-display mt-2 text-emerald-600">
                                {chatThreads.filter(t => t.status === 'aberto').length}
                            </div>
                        </div>
                        <div className="soft-card p-5">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Em Andamento</div>
                            <div className="text-3xl font-display mt-2 text-blue-600">
                                {chatThreads.filter(t => t.status === 'em_atendimento').length}
                            </div>
                        </div>
                    </section>

                    <section className="soft-card overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">Threads de Chat</h2>
                            <span className="text-xs text-slate-400">Atualizadas recentemente</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Protocolo</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Atualizado</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {chatThreads.map((thread) => (
                                        <tr key={thread.id} className="hover:bg-slate-50/60">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900 font-mono">
                                                    {thread.protocolo || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-500 font-mono">
                                                    {thread.cliente_id.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(thread.status)}`}>
                                                    {thread.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(thread.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(thread.updated_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    className="text-slate-600 hover:text-slate-900"
                                                    onClick={() => alert('View thread details coming soon')}
                                                >
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {chatThreads.length === 0 && (
                                <div className="text-center py-12 text-slate-400">
                                    Nenhuma thread encontrada
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}

            {!loading && viewMode === 'email' && (
                <>
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="soft-card p-5">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Total</div>
                            <div className="text-3xl font-display mt-2 text-slate-900">{emails.length}</div>
                        </div>
                        <div className="soft-card p-5">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Enviado</div>
                            <div className="text-3xl font-display mt-2 text-emerald-600">
                                {emails.filter(e => e.status === 'enviado').length}
                            </div>
                        </div>
                        <div className="soft-card p-5">
                            <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Pendente</div>
                            <div className="text-3xl font-display mt-2 text-amber-600">
                                {emails.filter(e => e.status === 'pendente').length}
                            </div>
                        </div>
                    </section>

                    <section className="soft-card overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">Mensagens de Email</h2>
                            <span className="text-xs text-slate-400">Últimas 100</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Direção</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assunto</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {emails.map((email) => (
                                        <tr key={email.id} className="hover:bg-slate-50/60">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDirectionBadgeColor(email.direction)}`}>
                                                    {email.direction}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-500 font-mono">
                                                    {email.cliente_id.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-900 max-w-md truncate">
                                                    {email.subject}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(email.status)}`}>
                                                    {email.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(email.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    className="text-slate-600 hover:text-slate-900"
                                                    onClick={() => alert('View email details coming soon')}
                                                >
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {emails.length === 0 && (
                                <div className="text-center py-12 text-slate-400">
                                    Nenhum email encontrado
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
