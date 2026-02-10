
import React, { useState, useCallback, useMemo } from 'react';
import Navigation from './Navigation';
import { View } from '../types';
import { Session } from '@supabase/supabase-js';
import { Menu, ShieldCheck } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import { useAppTranslation } from '../presentation/hooks/useAppTranslation';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

// Admin Components
import AdminDashboard from './AdminDashboard';
import InstitutionManager from './InstitutionManager';
import ProfessorManager from './ProfessorManager';
import StudentManager from './StudentManager';
import ClassManager from './ClassManager';
import GradeManager from './GradeManager';
import QuestionManager from './QuestionManager';
import TestManager from './TestManager';
import TestReleaseManager from './TestReleaseManager';
import TestCorrection from './TestCorrection';
import TestResults from './TestResults';
import AIAgentManager from './AIAgentManager';
import UserRuleManager from './UserRuleManager';
import SettingsManager from './SettingsManager';
import BNCCManager from './BNCCManager';
import DisciplineManager from './DisciplineManager';
import InstitutionTypeManager from './InstitutionTypeManager';

interface LayoutProps {
    session: Session | null;
    isConnected: boolean;
}

const AdminLayout: React.FC<LayoutProps> = ({ session, isConnected }) => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { t } = useAppTranslation();

    // Translate view names
    const getViewTitle = (view: View): string => {
        const viewMap: Record<string, string> = {
            dashboard: t('nav.dashboard'),
            institutions: t('nav.institutions'),
            institution_types: t('institution.type'),
            rules: t('roles.administrator'),
            settings: t('nav.settings'),
            professors: t('nav.professors'),
            students: t('nav.students'),
            classes: t('nav.classes'),
            grades: t('nav.grades'),
            disciplines: t('nav.disciplines'),
            bncc: 'BNCC',
            questions: t('nav.questions'),
            tests: t('nav.tests'),
            releases: t('nav.releases'),
            grading: t('nav.grading'),
            results: t('nav.results'),
            agents: t('nav.agents'),
            library: t('nav.library'),
        };
        return viewMap[view] || view.replace('_', ' ');
    };

    // Simple navigation - breadcrumb is always: Painel > Current View
    const handleNavigate = useCallback((view: View) => {
        setCurrentView(view);
    }, []);

    // Build breadcrumb based on current view only (no history accumulation)
    const breadcrumbItems: BreadcrumbItem[] = currentView === 'dashboard' 
        ? [{ label: 'Painel', view: 'dashboard' }]
        : [
            { label: 'Painel', view: 'dashboard' },
            { label: getViewTitle(currentView), view: currentView }
          ];

    // Handle breadcrumb click
    const handleBreadcrumbNavigate = useCallback((view: string) => {
        setCurrentView(view as View);
    }, []);

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard': return <AdminDashboard onNavigate={handleNavigate} />;
            
            // Management
            case 'institutions': return <InstitutionManager hasSupabase={isConnected} />;
            case 'institution_types': return <InstitutionTypeManager hasSupabase={isConnected} />;
            case 'rules': return <UserRuleManager hasSupabase={isConnected} />;
            case 'settings': return <SettingsManager hasSupabase={isConnected} />;
            
            // Academic
            case 'professors': return <ProfessorManager hasSupabase={isConnected} />;
            case 'students': return <StudentManager hasSupabase={isConnected} />;
            case 'classes': return <ClassManager hasSupabase={isConnected} />;
            case 'grades': return <GradeManager hasSupabase={isConnected} />;
            case 'disciplines': return <DisciplineManager hasSupabase={isConnected} />;
            
            // Educational / Content
            case 'bncc': return <BNCCManager hasSupabase={isConnected} />;
            case 'questions': return <QuestionManager hasSupabase={isConnected} />;
            case 'tests': return <TestManager hasSupabase={isConnected} />;
            case 'releases': return <TestReleaseManager hasSupabase={isConnected} />;
            case 'grading': return <TestCorrection hasSupabase={isConnected} />;
            case 'results': return <TestResults hasSupabase={isConnected} />;
            case 'agents': return <AIAgentManager hasSupabase={isConnected} />;
            
            default: return <div>Select a module</div>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Navigation 
                    currentView={currentView} 
                    onNavigate={handleNavigate} 
                    userEmail={session?.user?.email}
                    userRole="Administrator"
                    onClose={() => setIsSidebarOpen(false)}
                />
            </div>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4 md:px-8 flex justify-between items-center sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg md:hidden"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                            {getViewTitle(currentView)}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeSwitcher variant="compact" />
                        <LanguageSwitcher variant="compact" />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 hidden md:inline bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{t('roles.administrator')}</span>
                        <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <ShieldCheck size={14} />
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
