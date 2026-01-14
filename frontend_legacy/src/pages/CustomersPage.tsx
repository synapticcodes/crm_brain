import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Filter, AlertCircle, X, ChevronDown } from 'lucide-react';

interface KanbanCustomer {
    cliente_id: string;
    nome_completo: string;
    email: string | null;
    status_pagamento: string;
    kanban_lane: string;
    cpf: string;
    telefone_principal: string | null;
    ultimo_contrato_valor: number | null;
}

const KANBAN_LANES = {
    documentacao_pendente: { title: 'Documentação Pendente', color: 'bg-amber-400', count_bg: 'bg-amber-500/10 text-amber-400' },
    documentacao_enviada: { title: 'Documentação Enviada', color: 'bg-blue-400', count_bg: 'bg-blue-500/10 text-blue-400' },
    em_dia: { title: 'Em Dia', color: 'bg-emerald-400', count_bg: 'bg-emerald-500/10 text-emerald-400' },
    provas: { title: 'Provas', color: 'bg-purple-400', count_bg: 'bg-purple-500/10 text-purple-400' },
    inadimplentes: { title: 'Inadimplentes', color: 'bg-rose-400', count_bg: 'bg-rose-500/10 text-rose-400' },
};

const VISIBLE_LANES = ['documentacao_pendente', 'documentacao_enviada', 'em_dia', 'provas', 'inadimplentes'];

export default function CustomersPage() {
    const [customers, setCustomers] = useState<KanbanCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<KanbanCustomer | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .schema('brain')
                .from('view_clientes_kanban')
                .select('*');

            if (error) throw error;
            setCustomers(data || []);
        } catch (err: unknown) {
            console.error('Error fetching customers:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    }

    // Group customers by status
    const groupedCustomers = customers.reduce((acc, customer) => {
        const lane = customer.kanban_lane || 'documentacao_pendente';
        if (!acc[lane]) acc[lane] = [];
        acc[lane].push(customer);
        return acc;
    }, {} as Record<string, KanbanCustomer[]>);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-display font-medium text-white">Clientes</h1>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40 group-focus-within:text-white/80 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="h-10 w-[280px] bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                        />
                    </div>
                    <button className="h-10 px-4 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
                        <Plus size={16} />
                        Novo Cliente
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-2 scrollbar-none">
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-lg">
                    <button className="px-3 py-1.5 text-xs font-semibold text-white/90 bg-white/10 rounded-md shadow-sm">Todos</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-colors">Meus clientes</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-colors">Sem contato</button>
                </div>
                <div className="w-px h-6 bg-white/10 mx-2"></div>
                <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/60 border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-colors">
                    <Filter size={12} />
                    Filtros Avançados
                </button>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 min-h-0 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <div className="flex h-full gap-4 min-w-[1000px]"> {/* Ensure min-w to force scroll on small screens */}

                    {VISIBLE_LANES.map(lane => {
                        const config = KANBAN_LANES[lane as keyof typeof KANBAN_LANES];
                        const laneCustomers = groupedCustomers[lane] || [];

                        return (
                            <KanbanColumn
                                key={lane}
                                title={config.title}
                                count={laneCustomers.length}
                                dotColor={config.color}
                            >
                                {laneCustomers.map(customer => (
                                    <KanbanCard
                                        key={customer.cliente_id}
                                        customer={customer}
                                        onClick={() => setSelectedCustomer(customer)}
                                    />
                                ))}
                            </KanbanColumn>
                        );
                    })}

                </div>
            </div>

            {selectedCustomer && (
                <CustomerModal
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}
        </div>
    );
}

function KanbanColumn({ title, count, children, dotColor }: { title: string; count: number; children: React.ReactNode; dotColor: string }) {
    return (
        <div className="flex flex-col h-full w-[340px] shrink-0 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${dotColor} shadow-[0_0_8px_currentColor]`} />
                    <span className="text-sm font-semibold text-white/90 tracking-tight">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-bold text-white/50">{count}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                {children}
            </div>
        </div>
    );
}

function KanbanCard({ customer, onClick }: { customer: KanbanCustomer; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="group relative flex flex-col p-4 bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:translate-y-[-2px] hover:shadow-lg hover:shadow-black/20"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-semibold text-white/90 group-hover:text-white line-clamp-1">{customer.nome_completo}</h4>
            </div>

            <div className="space-y-1 mb-3">
                {customer.email && (
                    <p className="text-xs text-white/40 truncate">{customer.email}</p>
                )}
                {customer.telefone_principal && (
                    <p className="text-xs text-white/40">{customer.telefone_principal}</p>
                )}
            </div>

                <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="px-2 py-1 rounded bg-white/5 text-[10px] font-medium text-white/50 uppercase tracking-wide">
                    {customer.status_pagamento}
                    </div>
                {customer.ultimo_contrato_valor && (
                    <span className="text-xs font-bold text-emerald-400">
                        R$ {customer.ultimo_contrato_valor.toLocaleString('pt-BR')}
                    </span>
                )}
            </div>
        </div>
    );
}

function CustomerModal({ customer, onClose }: { customer: KanbanCustomer, onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-lg text-white">{customer.nome_completo}</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">CPF</label>
                            <p className="text-sm font-medium text-white/90">{customer.cpf || '-'}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">Telefone</label>
                            <p className="text-sm font-medium text-white/90">{customer.telefone_principal || '-'}</p>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">Email</label>
                            <p className="text-sm font-medium text-white/90">{customer.email || '-'}</p>
                        </div>
                    </div>

                    <div className="bg-emerald-500/10 p-4 rounded-xl flex items-center justify-between border border-emerald-500/20">
                        <span className="text-xs font-semibold text-emerald-400">Status do Contrato</span>
                        <span className="text-sm font-bold text-emerald-300">
                            {customer.ultimo_contrato_valor ? `R$ ${customer.ultimo_contrato_valor.toLocaleString('pt-BR')}` : 'Sem contrato'}
                        </span>
                    </div>
                </div>

                <div className="px-6 py-4 bg-white/5 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
