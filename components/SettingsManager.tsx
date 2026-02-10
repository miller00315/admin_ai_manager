
import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, Settings } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseService';

interface SettingsManagerProps {
  hasSupabase: boolean;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ hasSupabase }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const checkAdmin = async () => {
          if (!hasSupabase) {
              setLoading(false);
              return;
          }
          const supabase = getSupabaseClient();
          if (!supabase) {
              setLoading(false);
              return;
          }
          try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                  const { data } = await supabase.from('app_users').select('user_rules(rule_name)').eq('auth_id', user.id).single();
                  if (data?.user_rules?.rule_name === 'Administrator') {
                      setIsAdmin(true);
                  }
              }
          } catch (error) {
              console.error('Error checking admin status:', error);
          } finally {
              setLoading(false);
          }
      };
      checkAdmin();
  }, [hasSupabase]);

  if (!hasSupabase) return <div className="p-8 text-center text-slate-500">Configure o banco de dados primeiro.</div>;

  // Show loading while checking admin status
  if (loading) {
      return (
          <div className="p-8 text-center">
              <Loader2 size={48} className="mx-auto text-indigo-600 mb-4 animate-spin"/>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Carregando...</h3>
              <p className="text-slate-500 text-sm">Verificando permissões de acesso.</p>
          </div>
      );
  }

  // Only admins can access this component
  if (!isAdmin) {
      return (
          <div className="p-8 text-center">
              <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4"/>
              <h3 className="text-lg font-bold text-amber-800 mb-2">Acesso Restrito</h3>
              <p className="text-amber-600 text-sm">Apenas administradores podem acessar esta configuração.</p>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-slate-900">Configurações do Sistema</h2>
                <p className="text-slate-500 mt-1">Configurações e ferramentas de administração</p>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 min-h-[400px] flex flex-col items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings size={32} className="text-indigo-600"/>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Configurações do Sistema</h3>
                <p className="text-slate-500 max-w-md">
                    As configurações do sistema estão disponíveis através dos módulos específicos de gerenciamento.
                </p>
            </div>
        </div>
    </div>
  );
};

export default SettingsManager;
