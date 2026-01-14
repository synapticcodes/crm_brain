import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="h-screen w-screen bg-[#0b1221] overflow-hidden text-slate-900 selection:bg-emerald-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[1200px] h-[1200px] rounded-full bg-indigo-500/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] rounded-full bg-emerald-500/5 blur-[100px]" />
            </div>

            <div className="flex h-full relative z-10 font-sans">
                {/* Fixed Sidebar */}
                <aside className="w-72 shrink-0 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl">
                    <Sidebar />
                </aside>

                {/* Main Column */}
                <div className="flex min-w-0 flex-1 flex-col">
                    {/* Fixed Header */}
                    <header className="h-20 shrink-0 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
                        <Header />
                    </header>

                    {/* Scrollable Content Area */}
                    <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                        <div className="mx-auto max-w-[1600px] px-6 py-6 h-full flex flex-col">
                            {/* Passed h-full to allow children to use full height for Kanban */}
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
