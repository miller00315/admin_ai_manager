
import React from 'react';
import { Building2, Users, FileText, ScrollText, ShieldCheck, Bot, Briefcase } from 'lucide-react';
import { View } from '../types';

interface AdminDashboardProps {
    onNavigate: (view: View) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const shortcuts = [
        { 
            label: 'Instituições', 
            icon: Building2, 
            desc: 'Gerenciar escolas', 
            view: 'institutions' as View,
            color: 'bg-blue-500'
        },
        { 
            label: 'Professores', 
            icon: Briefcase, 
            desc: 'Gerenciar docentes', 
            view: 'professors' as View,
            color: 'bg-indigo-500'
        },
        { 
            label: 'Base BNCC', 
            icon: ScrollText, 
            desc: 'Padrões curriculares', 
            view: 'bncc' as View,
            color: 'bg-emerald-600'
        },
        { 
            label: 'Banco de Provas', 
            icon: FileText, 
            desc: 'Questões e Avaliações', 
            view: 'tests' as View,
            color: 'bg-violet-500'
        },
        { 
            label: 'Regras de Usuário', 
            icon: ShieldCheck, 
            desc: 'Permissões do sistema', 
            view: 'rules' as View,
            color: 'bg-slate-600'
        },
        { 
            label: 'Agentes IA', 
            icon: Bot, 
            desc: 'Configurar tutores IA', 
            view: 'agents' as View,
            color: 'bg-pink-500'
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Seção Principal */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Console do Administrador</h1>
                    <p className="text-slate-300 max-w-lg">
                        Bem-vindo ao centro de comando. Gerencie instituições, padrões acadêmicos (BNCC) e configurações do sistema a partir daqui.
                    </p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                    <ShieldCheck size={200} className="transform translate-x-10 translate-y-10"/>
                </div>
            </div>

            {/* Acesso Rápido */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Acesso Rápido</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shortcuts.map((s, idx) => (
                        <button 
                            key={idx}
                            onClick={() => onNavigate(s.view)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left group hover:border-indigo-200 dark:hover:border-indigo-600"
                        >
                            <div className={`w-12 h-12 rounded-lg ${s.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                                <s.icon size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{s.label}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Status do Sistema */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        Saúde do Sistema
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                            <span className="text-slate-600 dark:text-slate-300">Conexão com Banco</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ativo</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2">
                            <span className="text-slate-600 dark:text-slate-300">Serviço IA (Gemini)</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Operacional</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 dark:text-slate-300">Buckets de Armazenamento</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Montado</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center text-center">
                    <ScrollText size={48} className="text-slate-300 dark:text-slate-600 mb-3"/>
                    <h4 className="font-bold text-slate-700 dark:text-slate-200">Base de Dados BNCC</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Garanta que sua base de competências esteja atualizada.</p>
                    <button 
                        onClick={() => onNavigate('bncc')}
                        className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline"
                    >
                        Gerenciar Competências →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
