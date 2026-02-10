
import React, { useState, useEffect } from 'react';
import { useInstitutionManager } from '../presentation/hooks/useInstitutionManager';
import { useSettingsManager } from '../presentation/hooks/useSettingsManager';
import { useCountryStates } from '../presentation/hooks/useCountryStates';
import { Building2, Plus, Trash2, Loader2, Landmark, AlertTriangle, RotateCcw, MapPin, Eye, User, Mail, ShieldCheck, Edit2, Save, Archive, ChevronRight, Home } from 'lucide-react';
import { Address, UserRegistrationDTO, Institution } from '../types';
import InstitutionDetails from './InstitutionDetails';
import ConfirmationModal from './ConfirmationModal'; // Import Modal
import { getSupabaseClient } from '../services/supabaseService';
import { getFriendlyErrorMessage } from '../utils/errorHandling';

interface InstitutionManagerProps {
  hasSupabase: boolean;
  onBreadcrumbChange?: (items: { label: string; onClick?: () => void }[]) => void;
}

const InstitutionManager: React.FC<InstitutionManagerProps> = ({ hasSupabase, onBreadcrumbChange }) => {
  const { 
      institutions, loading, error, 
      addInstitution, updateInstitution, deleteInstitution, restoreInstitution, 
      isAdmin, showDeleted, setShowDeleted, refresh 
  } = useInstitutionManager(hasSupabase);
  const { types } = useSettingsManager(hasSupabase);
  
  // Country/States dynamic dropdowns
  const { 
    countries, 
    states, 
    loadingCountries, 
    loadingStates, 
    selectedCountry, 
    selectedState,
    setSelectedCountry, 
    setSelectedState,
    getCountryDisplayName 
  } = useCountryStates();
  
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      id: string | null;
      action: 'delete' | 'restore';
      name: string;
  }>({ isOpen: false, id: null, action: 'delete', name: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newTypeId, setNewTypeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Address State
  const [address, setAddress] = useState<Partial<Address>>({
      address_line_1: '', city: '', state_province: '', postal_code: '', country: ''
  });

  // Manager State
  const [manager, setManager] = useState<UserRegistrationDTO>({
      first_name: '', last_name: '', email: '', password: '', 
      // Required by type but not used for Manager specifically in UI
      address_line_1: '', city: '', postal_code: '', country: '' 
  });

  const resetForm = () => {
      setEditingId(null);
      setNewName('');
      setNewTypeId('');
      setAddress({ address_line_1: '', city: '', state_province: '', postal_code: '', country: '' });
      setManager({ first_name: '', last_name: '', email: '', password: '', address_line_1: '', city: '', postal_code: '', country: '' });
      setSelectedCountry('');
      setSelectedState('');
      setShowForm(false);
  };

  const handleEditClick = (i: Institution) => {
      setEditingId(i.id);
      setNewName(i.name);
      setNewTypeId(i.type_id || (i.institution_types as any)?.id || '');
      
      if (i.addresses) {
          setAddress({
              address_line_1: i.addresses.address_line_1,
              city: i.addresses.city,
              state_province: i.addresses.state_province,
              postal_code: i.addresses.postal_code,
              country: i.addresses.country
          });
          // Setar país e estado nos dropdowns
          setSelectedCountry(i.addresses.country || '');
          // O estado será carregado quando o país for selecionado
          setTimeout(() => setSelectedState(i.addresses?.state_province || ''), 500);
      } else {
          setAddress({ address_line_1: '', city: '', state_province: '', postal_code: '', country: '' });
          setSelectedCountry('');
          setSelectedState('');
      }

      // Populate Manager if available in the fetched object
      const mgr = (i as any).manager;
      if (mgr) {
          setManager({
              first_name: mgr.first_name,
              last_name: mgr.last_name,
              email: mgr.email,
              password: '', 
              address_line_1: '', city: '', postal_code: '', country: ''
          });
      } else {
          setManager({ first_name: '', last_name: '', email: '', password: '', address_line_1: '', city: '', postal_code: '', country: '' });
      }

      setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    setIsSubmitting(true);
    try {
        const payload = { 
            name: newName, 
            type_id: newTypeId || undefined
        };
        const hasAddress = address.address_line_1 || address.city || address.country;

        if (editingId) {
            await updateInstitution(
                editingId,
                payload,
                hasAddress ? address : undefined,
                manager
            );
        } else {
            await addInstitution(
                payload, 
                hasAddress ? address : undefined,
                manager
            );
        }
        
        resetForm();
    } finally {
        setIsSubmitting(false);
    }
  };

  // Open Modal logic
  const openDeleteModal = (i: Institution) => {
      setModalConfig({ isOpen: true, id: i.id, action: 'delete', name: i.name });
  };

  const openRestoreModal = (i: Institution) => {
      setModalConfig({ isOpen: true, id: i.id, action: 'restore', name: i.name });
  };

  const executeAction = async () => {
      if (!modalConfig.id) return;
      setIsActionLoading(true);
      try {
          if (modalConfig.action === 'delete') {
              await deleteInstitution(modalConfig.id);
          } else {
              await restoreInstitution(modalConfig.id);
          }
          setModalConfig({ ...modalConfig, isOpen: false });
      } catch (err: any) {
          alert(getFriendlyErrorMessage(err));
      } finally {
          setIsActionLoading(false);
      }
  };

  const handleViewDetails = (id: string) => {
      const inst = institutions.find(i => i.id === id);
      setSelectedInstId(id);
      setView('detail');
      
      // Update breadcrumb
      if (onBreadcrumbChange && inst) {
          onBreadcrumbChange([
              { label: 'Instituições', onClick: () => { setView('list'); setSelectedInstId(null); } },
              { label: inst.name }
          ]);
      }
  };

  if (!hasSupabase) return <div className="p-8 text-center text-slate-500">Configure database first.</div>;

  if (view === 'detail' && selectedInstId) {
      const selectedInst = institutions.find(i => i.id === selectedInstId);
      return (
          <div>
              <InstitutionDetails 
                  institutionId={selectedInstId} 
                  hasSupabase={hasSupabase} 
                  onBack={() => { setView('list'); setSelectedInstId(null); }} 
              />
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
          <div>
              <h2 className="text-3xl font-bold text-slate-900">Instituições</h2>
              <p className="text-slate-500 mt-1">Gerencie Escolas e Universidades</p>
          </div>
          <div className="flex items-center gap-3">
              {isAdmin && (
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <input 
                          type="checkbox" 
                          checked={showDeleted} 
                          onChange={e => setShowDeleted(e.target.checked)} 
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="font-bold">Mostrar Excluídos</span>
                  </label>
              )}
              {isAdmin && (
                  <button onClick={() => { if(showForm) resetForm(); else setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                      {showForm ? 'Cancelar' : <><Plus size={20}/> Cadastrar Instituição</>}
                  </button>
              )}
          </div>
      </div>

      <ConfirmationModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          onConfirm={executeAction}
          title={modalConfig.action === 'delete' ? "Excluir Instituição" : "Restaurar Instituição"}
          message={
              modalConfig.action === 'delete' 
              ? <span>Tem certeza que deseja excluir <strong>{modalConfig.name}</strong>? Esta ação irá desativar a instituição.</span>
              : <span>Tem certeza que deseja restaurar <strong>{modalConfig.name}</strong>? Isso tornará a instituição ativa novamente.</span>
          }
          confirmLabel={modalConfig.action === 'delete' ? "Excluir" : "Restaurar"}
          isDestructive={modalConfig.action === 'delete'}
          isLoading={isActionLoading}
      />

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-lg font-bold text-red-700 mb-2">Falha ao carregar Instituições</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button onClick={refresh} className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium">
                <RotateCcw size={16}/> Tentar Novamente
            </button>
        </div>
      ) : (
        <>
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-8 animate-in fade-in slide-in-from-top-4">
                    {/* ... (Form Content Same as Before) ... */}
                    <div className="border-b border-slate-100 dark:border-slate-700 pb-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {editingId ? <Edit2 size={20} className="text-indigo-600 dark:text-indigo-400"/> : <Building2 size={20} className="text-indigo-600 dark:text-indigo-400"/>} 
                            {editingId ? 'Editar Instituição' : 'Nova Instituição'}
                        </h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Nome da Instituição *</label>
                            <input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" placeholder="Escola Municipal de Ensino"/>
                        </div>
                        <div className="w-full md:w-64">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Tipo</label>
                            <select value={newTypeId} onChange={e => setNewTypeId(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer">
                                <option value="">Selecionar Tipo</option>
                                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Endereço</label>
                            <input required={!editingId} value={address.address_line_1} onChange={e => setAddress({...address, address_line_1: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Rua, Número"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Cidade</label>
                            <input required={!editingId} value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">País</label>
                            <select 
                                required={!editingId} 
                                value={selectedCountry}
                                onChange={e => {
                                    setSelectedCountry(e.target.value);
                                    setAddress({...address, country: e.target.value, state_province: ''});
                                }} 
                                disabled={loadingCountries}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800"
                            >
                                <option value="">{loadingCountries ? 'Carregando...' : 'Selecionar País'}</option>
                                {countries.map(c => (
                                    <option key={c.iso2 || c.name} value={c.name}>{getCountryDisplayName(c.name)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Estado/Província</label>
                            <select 
                                value={selectedState}
                                onChange={e => {
                                    setSelectedState(e.target.value);
                                    setAddress({...address, state_province: e.target.value});
                                }}
                                disabled={!selectedCountry || loadingStates}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800"
                            >
                                <option value="">
                                    {!selectedCountry ? 'Selecione um país primeiro' : loadingStates ? 'Carregando...' : states.length === 0 ? 'Nenhum estado encontrado' : 'Selecionar Estado'}
                                </option>
                                {states.map(s => (
                                    <option key={s.state_code || s.name} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">CEP</label>
                            <input required={!editingId} value={address.postal_code} onChange={e => setAddress({...address, postal_code: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"/>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400"/> {editingId ? 'Atualizar Info do Gestor' : 'Gestor Responsável'}</h4>
                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Nome</label>
                                    <input required={!editingId} value={manager.first_name} onChange={e => setManager({...manager, first_name: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Sobrenome</label>
                                    <input required={!editingId} value={manager.last_name} onChange={e => setManager({...manager, last_name: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Email (Login)</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
                                        <input type="email" required={!editingId} value={manager.email} onChange={e => setManager({...manager, email: e.target.value})} className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"/>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 italic">
                                * Este usuário tem o papel de 'Instituição' e gerencia esta entidade.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold flex gap-2 items-center shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                            {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : (editingId ? <Save size={20}/> : <Plus size={20}/>)} 
                            {isSubmitting ? 'Salvando...' : (editingId ? 'Atualizar Instituição' : 'Criar Instituição e Gestor')}
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nome</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Localização</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Responsável</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Carregando dados...</td></tr>
                    ) : institutions.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-400">Nenhuma instituição encontrada. Adicione uma acima.</td></tr>
                    ) : institutions.map(i => (
                        <tr key={i.id} onClick={() => handleViewDetails(i.id)} className={`transition-colors cursor-pointer group ${i.deleted ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border-l-4 border-l-red-400 dark:border-l-red-600' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            <td className="p-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    {i.name}
                                    {i.deleted && <span className="bg-red-200 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Deleted</span>}
                                </div>
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400"><span className="inline-flex gap-2 items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs font-bold uppercase"><Landmark size={12}/> {i.type || i.institution_types?.name || 'School'}</span></td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">
                                {i.addresses ? (
                                    <div className="text-sm">
                                        <div className="flex items-center gap-1"><MapPin size={12} className="text-slate-400"/> {i.addresses.city}, {i.addresses.country}</div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Sem endereço</span>
                                )}
                            </td>
                            <td className="p-4 text-slate-600">
                                {(i as any).manager ? (
                                    <div className="text-sm">
                                        <div className="flex items-center gap-1 font-medium"><User size={12} className="text-slate-400"/> {(i as any).manager.first_name} {(i as any).manager.last_name}</div>
                                        <div className="text-xs text-slate-400 pl-4 truncate max-w-[150px]">{(i as any).manager.email}</div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Não atribuído</span>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                    {isAdmin && !i.deleted && (
                                        <button onClick={(e) => {e.stopPropagation(); handleEditClick(i);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all" title="Editar"><Edit2 size={18}/></button>
                                    )}
                                    <button onClick={(e) => {e.stopPropagation(); handleViewDetails(i.id);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all" title="Visualizar"><Eye size={18}/></button>
                                    {isAdmin && (
                                        i.deleted ? (
                                            <button onClick={(e) => {e.stopPropagation(); openRestoreModal(i);}} className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all font-bold flex items-center gap-1" title="Restaurar">
                                                <RotateCcw size={18}/>
                                            </button>
                                        ) : (
                                            <button onClick={(e) => {e.stopPropagation(); openDeleteModal(i);}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Excluir">
                                                <Trash2 size={18}/>
                                            </button>
                                        )
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </>
      )}
    </div>
  );
};

export default InstitutionManager;
