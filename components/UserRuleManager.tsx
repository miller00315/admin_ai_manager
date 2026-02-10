
import React, { useState } from 'react';
import { useUserRuleManager } from '../presentation/hooks/useUserRuleManager';
import { UserRule } from '../types';
import { Shield, Plus, Trash2, Edit2, Loader2, Save, X, RotateCcw, AlertTriangle, CheckCircle, Circle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useAppTranslation } from '../presentation/hooks/useAppTranslation';

interface UserRuleManagerProps {
  hasSupabase: boolean;
}

const UserRuleManager: React.FC<UserRuleManagerProps> = ({ hasSupabase }) => {
  const { t } = useAppTranslation();
  const { rules, loading, error, isAdmin, saveRule, deleteRule, restoreRule, refresh, showDeleted, setShowDeleted } = useUserRuleManager(hasSupabase);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserRule>>({ rule_name: '', description: '', enabled: true });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      id: string | null;
      action: 'delete' | 'restore';
      name: string;
  }>({ isOpen: false, id: null, action: 'delete', name: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleCreate = () => {
      setEditingId(null);
      setFormData({ rule_name: '', description: '', enabled: true });
      setIsFormOpen(true);
  };

  const handleEdit = (rule: UserRule) => {
      setEditingId(rule.id);
      setFormData({ rule_name: rule.rule_name, description: rule.description, enabled: rule.enabled });
      setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          const success = await saveRule(editingId, formData);
          if (success) {
              setIsFormOpen(false);
          }
      } finally {
          setIsSaving(false);
      }
  };

  const openDeleteModal = (rule: UserRule) => {
      setModalConfig({ isOpen: true, id: rule.id, action: 'delete', name: rule.rule_name });
  };

  const openRestoreModal = (rule: UserRule) => {
      setModalConfig({ isOpen: true, id: rule.id, action: 'restore', name: rule.rule_name });
  };

  const executeAction = async () => {
      if (!modalConfig.id) return;
      setIsActionLoading(true);
      try {
          if (modalConfig.action === 'delete') {
              await deleteRule(modalConfig.id);
          } else {
              await restoreRule(modalConfig.id);
          }
          setModalConfig({ ...modalConfig, isOpen: false });
      } finally {
          setIsActionLoading(false);
      }
  };

  // Filter rules based on toggle
  // Note: If the backend returns all rules, we filter here. If backend filters, this just hides what's returned.
  // Assuming Backend integration aligns or we handle basic filtering here.
  const displayedRules = rules.filter(r => showDeleted ? true : !r.deleted);

  if (!hasSupabase) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">{t('errors.configureDatabase')}</div>;

  // Show loading while checking admin status
  if (loading && isAdmin === false) {
      return (
          <div className="p-8 text-center">
              <Loader2 size={48} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-4 animate-spin"/>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{t('common.loading')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{t('common.checkingPermissions')}</p>
          </div>
      );
  }

  // Only admins can access this component
  if (!loading && !isAdmin) {
      return (
          <div className="p-8 text-center">
              <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4"/>
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-600 mb-2">{t('common.accessRestricted')}</h3>
              <p className="text-amber-600 dark:text-amber-400 text-sm">{t('common.onlyAdminAccess')}</p>
          </div>
      );
  }

  return (
      <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t('userRule.title')}</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">{t('userRule.description')}</p>
              </div>
              <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <input 
                          type="checkbox" 
                          checked={showDeleted} 
                          onChange={e => setShowDeleted(e.target.checked)} 
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="font-bold">{t('userRule.showDeleted')}</span>
                  </label>
                  <button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                      <Plus size={20}/> {t('userRule.new')}
                  </button>
              </div>
          </div>

          <ConfirmationModal
              isOpen={modalConfig.isOpen}
              onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
              onConfirm={executeAction}
              title={modalConfig.action === 'delete' ? t('userRule.deleteTitle') : t('userRule.restoreTitle')}
              message={
                  modalConfig.action === 'delete'
                  ? <span dangerouslySetInnerHTML={{ __html: t('userRule.deleteMessage', { name: modalConfig.name }) }} />
                  : <span dangerouslySetInnerHTML={{ __html: t('userRule.restoreMessage', { name: modalConfig.name }) }} />
              }
              confirmLabel={modalConfig.action === 'delete' ? t('common.delete') : t('common.restore')}
              isDestructive={modalConfig.action === 'delete'}
              isLoading={isActionLoading}
          />

          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
                <AlertTriangle className="mx-auto text-red-500 dark:text-red-400 mb-4" size={48} />
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">{t('userRule.failedToLoad')}</h3>
                <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
                <button onClick={refresh} className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"><RotateCcw size={16}/> {t('userRule.retry')}</button>
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* List of Rules */}
                 <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                     <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         <Shield size={18} className="text-indigo-500 dark:text-indigo-400"/> {t('userRule.definedRoles')}
                     </div>
                     <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[500px]">
                         {loading ? (
                             <div className="p-8 text-center text-slate-400 dark:text-slate-500"><Loader2 className="animate-spin inline mr-2"/> {t('common.loading')}</div>
                         ) : displayedRules.length === 0 ? (
                             <div className="p-8 text-center text-slate-400 dark:text-slate-500">{t('userRule.noRolesDefined')}</div>
                         ) : displayedRules.map(rule => (
                             <div key={rule.id} className={`p-4 border rounded-lg transition-all group ${rule.deleted ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                                 <div className="flex justify-between items-start mb-2">
                                     <div className="flex items-center gap-2">
                                         <span className="font-bold text-slate-800 dark:text-slate-100">{rule.rule_name}</span>
                                         {rule.deleted ? <span className="bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">{t('common.deleted')}</span> : (rule.enabled ? <CheckCircle size={14} className="text-emerald-500 dark:text-emerald-400"/> : <Circle size={14} className="text-slate-300 dark:text-slate-500"/>)}
                                     </div>
                                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         {!rule.deleted && (
                                             <button onClick={() => handleEdit(rule)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"><Edit2 size={14}/></button>
                                         )}
                                         {rule.deleted ? (
                                             <button onClick={() => openRestoreModal(rule)} className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"><RotateCcw size={14}/></button>
                                         ) : (
                                             <button onClick={() => openDeleteModal(rule)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={14}/></button>
                                         )}
                                     </div>
                                 </div>
                                 <p className="text-xs text-slate-500 dark:text-slate-400">{rule.description || t('userRule.noDescription')}</p>
                             </div>
                         ))}
                     </div>
                 </div>

                 {/* Form Area */}
                 <div className="flex flex-col">
                     {isFormOpen ? (
                         <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 animate-in fade-in slide-in-from-right-4">
                             <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{editingId ? t('userRule.edit') : t('userRule.create')}</h3>
                                 <button onClick={() => setIsFormOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><X size={20}/></button>
                             </div>
                             <form onSubmit={handleSave} className="space-y-4">
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('userRule.roleName')}</label>
                                     <input 
                                         required
                                         value={formData.rule_name} 
                                         onChange={e => setFormData({...formData, rule_name: e.target.value})} 
                                         className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                         placeholder={t('userRule.roleNamePlaceholder')}
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('common.description')}</label>
                                     <textarea 
                                         value={formData.description} 
                                         onChange={e => setFormData({...formData, description: e.target.value})} 
                                         className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" 
                                         placeholder={t('userRule.descriptionPlaceholder')}
                                     />
                                 </div>
                                 <div className="flex items-center gap-3 pt-2">
                                     <input 
                                        type="checkbox" 
                                        id="enabled"
                                        checked={formData.enabled} 
                                        onChange={e => setFormData({...formData, enabled: e.target.checked})} 
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                                     />
                                     <label htmlFor="enabled" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">{t('userRule.activeEnabled')}</label>
                                 </div>
                                 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                     <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">{t('common.cancel')}</button>
                                     <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                                         {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} {t('common.save')}
                                     </button>
                                 </div>
                             </form>
                         </div>
                     ) : (
                         <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-slate-500 h-full min-h-[300px]">
                             <Shield size={48} className="mb-4 opacity-50"/>
                             <p className="font-medium">{t('userRule.selectRoleToEdit')}</p>
                         </div>
                     )}
                 </div>
             </div>
          )}
      </div>
  );
};

export default UserRuleManager;
