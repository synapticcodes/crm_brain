import { useAuth } from '../hooks/useAuth';
import { LogOut } from 'lucide-react';

export default function Header() {
    const { session } = useAuth();
    const email = session?.user?.email || 'usuario@exemplo.com';

    return (
        <div className="h-full flex items-center justify-between px-8">
            <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50 font-semibold">BRAIN CRM</p>
                <h2 className="text-xl font-display font-medium text-white mt-1">
                    Painel Principal
                </h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-3 py-2 rounded-full border border-white/10 bg-white/5 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs font-bold uppercase">
                        {email.substring(0, 2)}
                    </div>
                    <div className="flex flex-col hidden sm:flex">
                        <span className="text-xs font-semibold text-white/90 leading-none">{email}</span>
                        <span className="text-[10px] text-white/50 uppercase">Ativo</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
