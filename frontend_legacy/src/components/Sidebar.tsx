import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, FileText, Shield, HelpCircle, FileClock, LogOut } from 'lucide-react';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    async function handleLogout() {
        await supabase.auth.signOut();
        navigate('/login');
    }

    const navLinks = [
        { path: '/customers', label: 'Clientes', icon: Users },
        { path: '/app-access', label: 'Acessos', icon: Shield },
        { path: '/legal', label: 'Jurídico', icon: FileText },
        { path: '/support', label: 'Suporte', icon: HelpCircle },
        { path: '/logs', label: 'Logs', icon: FileClock },
        { path: '/team', label: 'Equipe', icon: Users },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="flex flex-col h-full w-full font-sans text-white/90">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3 font-bold text-lg">
                    <div className="w-9 h-9 rounded-[14px] bg-white text-slate-900 flex items-center justify-center shadow-md font-display">
                        B
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="font-display tracking-tight text-white">BRAIN CRM</span>
                        <span className="text-[11px] text-white/50 font-medium tracking-wide uppercase">v1.0.0</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <div>
                    <div className="px-3 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Principal
                    </div>
                    <nav className="space-y-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active
                                        ? 'bg-white/10 text-white shadow-sm border border-white/5'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-white/10 shrink-0">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-red-300/80 hover:bg-red-500/10 hover:text-red-200 rounded-xl transition-colors"
                >
                    <LogOut size={18} />
                    Sair
                </button>
            </div>
        </div>
    );
}
