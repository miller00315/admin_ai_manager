
import React, { useState, useMemo, useEffect } from 'react';
import { useSettingsManager } from '../presentation/hooks/useSettingsManager';
import { Layers, Plus, Trash2, Loader2, AlertTriangle, RotateCcw, Edit2, CheckCircle, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { InstitutionType } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { getFriendlyErrorMessage } from '../utils/errorHandling';
import { useAppTranslation } from '../presentation/hooks/useAppTranslation';

interface InstitutionTypeManagerProps {
  hasSupabase: boolean;
}

const InstitutionTypeManager: React.FC<InstitutionTypeManagerProps> = ({ hasSupabase }) => {
  const { t } = useAppTranslation();
  const { 
      types, loading, error, isAdmin, showDeleted, setShowDeleted,
      addType, updateType, deleteType, restoreType, refresh
  } = useSettingsManager(hasSupabase);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter and Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<{name: string}>({
      name: ''
  });

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      id: string | null;
      name: string;
      action: 'delete' | 'restore';
  }>({ isOpen: false, id: null, name: '', action: 'delete' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filter types by search term and deleted status
  const filteredTypes = useMemo(() => {
      let filtered = types || [];
      
      // Filter by search term
      if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          filtered = filtered.filter(t => t.name.toLowerCase().includes(term));
      }
      
      // Filter by deleted status based on showDeleted flag
      if (!showDeleted) {
          filtered = filtered.filter(t => !t.deleted);
      }
      
      return filtered;
  }, [types, searchTerm, showDeleted]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTypes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTypes = useMemo(() => {
      return filteredTypes.slice(startIndex, endIndex);
  }, [filteredTypes, startIndex, endIndex]);

  // Reset page when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, showDeleted]);

  // Reload when showDeleted changes
  useEffect(() => {
      if (hasSupabase && isAdmin) {
          try {
              refresh();
          } catch (err) {
              console.error('Error refreshing data:', err);
          }
      }
  }, [showDeleted, hasSupabase, isAdmin, refresh]);

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) {
          alert(t('institutionType.nameRequired'));
          return;
      }
      
      setIsSubmitting(true);
      try {
          if (editingId) {
              await updateType(editingId, { name: formData.name.trim() });
          } else {
              await addType({ name: formData.name.trim() });
          }
          setShowForm(false);
          setFormData({ name: '' });
          setEditingId(null);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleEdit = (type: InstitutionType) => {
      setEditingId(type.id);
      setFormData({ name: type.name });
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '' });
  };

  // Modal Triggers
  const openDeleteModal = (type: InstitutionType) => {
      setModalConfig({ isOpen: true, id: type.id, name: type.name, action: 'delete' });
  };

  const openRestoreModal = (type: InstitutionType) => {
      setModalConfig({ isOpen: true, id: type.id, name: type.name, action: 'restore' });
  };

  const executeAction = async () => {
      if (!modalConfig.id) return;
      setIsActionLoading(true);
      try {
          if (modalConfig.action === 'delete') {
              await deleteType(modalConfig.id);
          } else {
              await restoreType(modalConfig.id);
          }
          setModalConfig({ isOpen: false, id: null, name: '', action: 'delete' });
      } catch (err: any) {
          alert(getFriendlyErrorMessage(err));
      } finally {
          setIsActionLoading(false);
      }
  };

  // Only admins can access this screen
  if (!hasSupabase) {
      return <div className="p-8 text-center text-slate-500">Configure o banco de dados primeiro.</div>;
  }

  // Show loading while checking admin status
  if (loading || isAdmin === undefined) {
      return (
          <div className="p-8 text-center">
              <Loader2 size={48} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-4 animate-spin"/>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Carregando...</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Verificando permissões de acesso.</p>
          </div>
      );
  }

  // Show access denied only after loading is complete
  if (!isAdmin) {
      return (
          <div className="p-8 text-center">
              <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4"/>
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-600 mb-2">Acesso Restrito</h3>
              <p className="text-amber-600 dark:text-amber-400 text-sm">Apenas administradores podem acessar esta configuração.</p>
          </div>
      );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center">
          <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{t('institutionType.title')}</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{t('institutionType.description')}</p>
          </div>
          <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <input 
                      type="checkbox" 
                      checked={showDeleted} 
                      onChange={e => setShowDeleted(e.target.checked)} 
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="font-bold">{t('common.showDeleted')}</span>
              </label>
              <button onClick={() => { setShowForm(!showForm); if (showForm) handleCancel(); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                  {showForm ? t('common.cancel') : <><Plus size={20}/> {t('institutionType.new')}</>}
              </button>
          </div>
      </div>

      {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3 text-red-700 dark:text-red-400 items-center">
              <AlertTriangle size={20}/> {error}
          </div>
      )}

      <ConfirmationModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig({ isOpen: false, id: null, name: '', action: 'delete' })}
          onConfirm={executeAction}
          title={modalConfig.action === 'delete' ? t('institutionType.deleteTitle') : t('institutionType.restoreTitle')}
          message={
              modalConfig.action === 'delete'
              ? <span dangerouslySetInnerHTML={{ __html: t('institutionType.deleteMessage', { name: modalConfig.name }) }} />
              : <span dangerouslySetInnerHTML={{ __html: t('institutionType.restoreMessage', { name: modalConfig.name }) }} />
          }
          confirmLabel={modalConfig.action === 'delete' ? t('common.delete') : t('common.restore')}
          isDestructive={modalConfig.action === 'delete'}
          isLoading={isActionLoading}
      />

      {showForm && (
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 mb-6">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{editingId ? t('institutionType.edit') : t('institutionType.createNew')}</h3>
              </div>

              <div className="p-8">
                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('institutionType.name')} *</label>
                          <div className="relative">
                              <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
                              <input 
                                  required 
                                  value={formData.name} 
                                  onChange={e => setFormData({...formData, name: e.target.value})} 
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                  placeholder={t('institutionType.namePlaceholder')}
                              />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold flex gap-2 items-center shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                      {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20}/>}
                      {isSubmitting ? t('institutionType.saving') : (editingId ? t('institutionType.update') : t('institutionType.create'))}
                  </button>
              </div>
          </form>
      )}

      {/* Search and Filter */}
      {!showForm && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex-1 w-full md:w-auto">
                      <input 
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder={t('institutionType.searchPlaceholder')}
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">
                          {filteredTypes.length === 1 
                              ? t('institutionType.typesCount', { count: filteredTypes.length })
                              : t('institutionType.typesCountPlural', { count: filteredTypes.length })
                          }
                      </span>
                  </div>
              </div>
          </div>
      )}

      {/* List */}
      {!showForm && (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                  <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider" style={{ width: '80%' }}>{t('common.name')}</th>
                  <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right" style={{ width: '20%', minWidth: '100px' }}>{t('common.actions')}</th>
              </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                  <tr><td colSpan={2} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> {t('common.loading')}</td></tr>
              ) : paginatedTypes.length === 0 ? (
                  <tr><td colSpan={2} className="p-12 text-center text-slate-400">
                      {searchTerm ? t('institutionType.noTypeFound', { search: searchTerm }) : t('institutionType.noTypeRegistered')}
                  </td></tr>
              ) : paginatedTypes.map(type => {
                  const isDeleted = type.deleted;
                  return (
                      <tr key={type.id} className={`transition-colors group ${isDeleted ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-l-4 border-l-red-400 dark:border-l-red-600' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                          <td className="p-4">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDeleted ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                      <Layers size={20}/>
                                  </div>
                                  <div>
                                      <div className={`font-semibold text-slate-900 dark:text-slate-100 ${isDeleted ? 'line-through text-red-700 dark:text-red-400' : ''} truncate`}>{type.name}</div>
                                      {isDeleted && <span className="text-[10px] text-red-500 font-bold uppercase">{t('common.deleted')}</span>}
                                  </div>
                              </div>
                          </td>
                          <td className="p-4 text-right overflow-visible">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 min-w-fit">
                                  {isDeleted ? (
                                      <button onClick={() => openRestoreModal(type)} className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-all shrink-0 flex-shrink-0" title={t('common.restore')}>
                                          <RotateCcw size={16}/>
                                      </button>
                                  ) : (
                                      <>
                                          <button onClick={() => handleEdit(type)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-all shrink-0 flex-shrink-0" title={t('common.edit')}><Edit2 size={16}/></button>
                                          <button onClick={() => openDeleteModal(type)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all shrink-0 flex-shrink-0" title={t('common.delete')}><Trash2 size={16}/></button>
                                      </>
                                  )}
                              </div>
                          </td>
                      </tr>
                  );
              })}
          </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <span>Itens por página:</span>
                          <select 
                              value={itemsPerPage} 
                              onChange={e => {
                                  setItemsPerPage(Number(e.target.value));
                                  setCurrentPage(1);
                              }}
                              className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                          >
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                          </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Página anterior"
                          >
                              <ChevronLeft size={18}/>
                          </button>
                          
                          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                              Página {currentPage} de {totalPages}
                          </span>
                          
                          <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Próxima página"
                          >
                              <ChevronRight size={18}/>
                          </button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <span>Ir para:</span>
                          <input
                              type="number"
                              min={1}
                              max={totalPages}
                              value={currentPage}
                              onChange={e => {
                                  const page = Math.max(1, Math.min(totalPages, Number(e.target.value)));
                                  setCurrentPage(page);
                              }}
                              className="w-16 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                          />
                      </div>
                  </div>
              </div>
          )}
      </div>
      )}
    </div>
  );
};

export default InstitutionTypeManager;
