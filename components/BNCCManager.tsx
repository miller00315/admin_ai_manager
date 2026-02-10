
import React, { useState, useRef } from 'react';
import { useBNCCManager } from '../presentation/hooks/useBNCCManager';
import { BNCCItem } from '../types';
import { BookOpen, Plus, Trash2, Edit2, Loader2, Save, X, RotateCcw, AlertTriangle, Search, Filter, Upload, FileText } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { parseFile } from '../services/fileParser';
import { extractBNCCsFromPDF, BNCCExtractionResult } from '../services/geminiService';
import BNCCExtractionSummary from './BNCCExtractionSummary';

/**
 * BNCCManager - ADMIN ONLY
 * Full CRUD operations for BNCC items.
 * This component is isolated and should only be used in AdminLayout.
 */
interface BNCCManagerProps {
  hasSupabase: boolean;
}

const BNCCManager: React.FC<BNCCManagerProps> = ({ hasSupabase }) => {
  const { items, loading, error, saveItem, deleteItem, restoreItem, refresh, isAdmin, showDeleted, setShowDeleted } = useBNCCManager(hasSupabase);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<BNCCItem>>({ codigo_alfanumerico: '', componente_curricular: '', descricao_habilidade: '', ano_serie: '', unidade_tematica: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [componentFilter, setComponentFilter] = useState('All');

  // PDF Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<BNCCExtractionResult | null>(null);
  const [extractionFileName, setExtractionFileName] = useState('');
  const [isSavingExtracted, setIsSavingExtracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setFormData({ codigo_alfanumerico: '', componente_curricular: '', descricao_habilidade: '', ano_serie: '', unidade_tematica: '' });
      setIsFormOpen(true);
  };

  const handleEdit = (item: BNCCItem) => {
      setEditingId(item.id);
      setFormData({ 
          codigo_alfanumerico: item.codigo_alfanumerico, 
          componente_curricular: item.componente_curricular, 
          descricao_habilidade: item.descricao_habilidade, 
          ano_serie: item.ano_serie,
          unidade_tematica: item.unidade_tematica 
      });
      setIsFormOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.codigo_alfanumerico || !formData.componente_curricular) return alert("Código e Componente Curricular são obrigatórios");
      
      setIsSaving(true);
      try {
          const success = await saveItem(editingId, formData);
          if (success) {
              setIsFormOpen(false);
          }
      } finally {
          setIsSaving(false);
      }
  };

  const openDeleteModal = (item: BNCCItem) => {
      setModalConfig({ isOpen: true, id: item.id, action: 'delete', name: item.codigo_alfanumerico });
  };

  const openRestoreModal = (item: BNCCItem) => {
      setModalConfig({ isOpen: true, id: item.id, action: 'restore', name: item.codigo_alfanumerico });
  };

  const executeAction = async () => {
      if (!modalConfig.id) return;
      setIsActionLoading(true);
      try {
          if (modalConfig.action === 'delete') {
              await deleteItem(modalConfig.id);
          } else {
              await restoreItem(modalConfig.id);
          }
          setModalConfig({ ...modalConfig, isOpen: false });
      } finally {
          setIsActionLoading(false);
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
          alert('Por favor, selecione um arquivo PDF.');
          return;
      }

      setIsExtracting(true);
      setExtractionResult(null);
      setExtractionFileName(file.name);

      try {
          // Extract text from PDF
          const pdfText = await parseFile(file);
          
          if (!pdfText || pdfText.trim().length === 0) {
              setExtractionResult({
                  bnccs: [],
                  hasBNCCContent: false,
                  message: 'Não foi possível extrair texto do PDF. O arquivo pode estar corrompido ou protegido.'
              });
              setIsExtracting(false);
              return;
          }

          // Extract BNCCs using Gemini
          const result = await extractBNCCsFromPDF(pdfText);
          setExtractionResult(result);
      } catch (error: any) {
          console.error('Error extracting BNCCs:', error);
          alert('Erro ao processar o PDF: ' + (error.message || 'Erro desconhecido'));
          setExtractionResult({
              bnccs: [],
              hasBNCCContent: false,
              message: 'Erro ao processar o documento: ' + (error.message || 'Erro desconhecido')
          });
      } finally {
          setIsExtracting(false);
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
      }
  };

  const handleSaveExtracted = async (bnccs: Partial<BNCCItem>[]) => {
      setIsSavingExtracted(true);
      try {
          for (const bncc of bnccs) {
              await saveItem(null, bncc);
          }
          setExtractionResult(null);
          setExtractionFileName('');
          alert(`${bnccs.length} habilidade(s) BNCC salva(s) com sucesso!`);
      } catch (error: any) {
          alert('Erro ao salvar BNCCs: ' + (error.message || 'Erro desconhecido'));
      } finally {
          setIsSavingExtracted(false);
      }
  };

  const uniqueComponents = Array.from(new Set(items.map(i => i.componente_curricular).filter(Boolean))).sort();

  const filteredItems = items.filter(i => {
      const matchSearch = (i.codigo_alfanumerico || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.descricao_habilidade || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchComp = componentFilter === 'All' || i.componente_curricular === componentFilter;
      return matchSearch && matchComp;
  });

  if (!hasSupabase) return <div className="p-8 text-center text-slate-500">Configure database first.</div>;

  // Show loading while checking admin status
  if (loading && isAdmin === false) {
      return (
          <div className="p-8 text-center">
              <Loader2 size={48} className="mx-auto text-indigo-600 mb-4 animate-spin"/>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Carregando...</h3>
              <p className="text-slate-500 text-sm">Verificando permissões de acesso.</p>
          </div>
      );
  }

  // Only admins can access this component
  if (!loading && !isAdmin) {
      return (
          <div className="p-8 text-center">
              <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4"/>
              <h3 className="text-lg font-bold text-amber-800 mb-2">Acesso Restrito</h3>
              <p className="text-amber-600 text-sm">Apenas administradores podem acessar esta configuração.</p>
          </div>
      );
  }

  return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-3xl font-bold text-slate-900">Base Nacional Comum Curricular</h2>
                  <p className="text-slate-500 mt-1">Gerenciar competências e habilidades padronizadas (BNCC)</p>
              </div>
              <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none bg-white border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <input 
                          type="checkbox" 
                          checked={showDeleted} 
                          onChange={e => setShowDeleted(e.target.checked)} 
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="font-bold">Mostrar Excluídos</span>
                  </label>
                  <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="bncc-pdf-upload"
                  />
                  <label
                      htmlFor="bncc-pdf-upload"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all cursor-pointer"
                  >
                      {isExtracting ? (
                          <>
                              <Loader2 size={20} className="animate-spin"/>
                              Processando...
                          </>
                      ) : (
                          <>
                              <Upload size={20}/>
                              Extrair do PDF
                          </>
                      )}
                  </label>
                  <button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                      <Plus size={20}/> Nova Habilidade
                  </button>
              </div>
          </div>

          <ConfirmationModal
              isOpen={modalConfig.isOpen}
              onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
              onConfirm={executeAction}
              title={modalConfig.action === 'delete' ? "Excluir Item BNCC" : "Restaurar Item BNCC"}
              message={
                  modalConfig.action === 'delete'
                  ? <span>Excluir <strong>{modalConfig.name}</strong>? Esta é uma exclusão lógica.</span>
                  : <span>Restaurar <strong>{modalConfig.name}</strong>?</span>
              }
              confirmLabel={modalConfig.action === 'delete' ? "Excluir" : "Restaurar"}
              isDestructive={modalConfig.action === 'delete'}
              isLoading={isActionLoading}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-700 items-center">
                <AlertTriangle size={20}/> {error}
            </div>
          )}

          {(extractionResult || isExtracting) && (
              <BNCCExtractionSummary
                  result={extractionResult}
                  fileName={extractionFileName}
                  onSave={handleSaveExtracted}
                  onClose={() => {
                      setExtractionResult(null);
                      setExtractionFileName('');
                  }}
                  isSaving={isSavingExtracted}
                  isExtracting={isExtracting}
              />
          )}

          {isFormOpen && (
              <div className="bg-white rounded-xl border border-indigo-200 shadow-lg p-6 mb-8 animate-in fade-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Editar Competência' : 'Adicionar Nova Competência'}</h3>
                      <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSave} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Código Alfanumérico (ex: EF01MA01)</label>
                              <input 
                                  required
                                  value={formData.codigo_alfanumerico} 
                                  onChange={e => setFormData({...formData, codigo_alfanumerico: e.target.value.toUpperCase()})} 
                                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                  placeholder="Código"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Componente Curricular</label>
                              <input 
                                  required
                                  value={formData.componente_curricular} 
                                  onChange={e => setFormData({...formData, componente_curricular: e.target.value})} 
                                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                  placeholder="ex: Matemática"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Ano/Série</label>
                              <input 
                                  value={formData.ano_serie} 
                                  onChange={e => setFormData({...formData, ano_serie: e.target.value})} 
                                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                  placeholder="ex: 1º Ano"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Unidade Temática</label>
                          <input 
                              value={formData.unidade_tematica} 
                              onChange={e => setFormData({...formData, unidade_tematica: e.target.value})} 
                              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                              placeholder="ex: Números"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Descrição da Habilidade</label>
                          <textarea 
                              required
                              value={formData.descricao_habilidade} 
                              onChange={e => setFormData({...formData, descricao_habilidade: e.target.value})} 
                              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" 
                              placeholder="Descreva a habilidade..."
                          />
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                          <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                          <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                              {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                          </button>
                      </div>
                  </form>
              </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18}/>
                  <input 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar por código ou descrição..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter className="text-slate-400 dark:text-slate-500" size={18}/>
                  <select 
                      value={componentFilter} 
                      onChange={e => setComponentFilter(e.target.value)}
                      className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full md:w-48"
                  >
                      <option value="All">Todos os Componentes</option>
                      {uniqueComponents.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-32">Código</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-48">Componente</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Descrição</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-24 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {loading ? (
                          <tr><td colSpan={4} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Carregando dados...</td></tr>
                      ) : filteredItems.length === 0 ? (
                          <tr><td colSpan={4} className="p-12 text-center text-slate-400">Nenhum item encontrado com os filtros aplicados.</td></tr>
                      ) : filteredItems.map(item => (
                          <tr key={item.id} className={`transition-colors group ${item.deleted ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                              <td className="p-4 font-mono font-bold text-indigo-700 text-sm align-top">
                                  {item.codigo_alfanumerico}
                                  {item.deleted && <div className="text-[10px] text-red-600 mt-1 uppercase">Excluído</div>}
                              </td>
                              <td className="p-4 align-top">
                                  <div className="font-medium text-slate-800 text-sm">{item.componente_curricular}</div>
                                  {item.ano_serie && <div className="text-xs text-slate-500 mt-0.5">{item.ano_serie}</div>}
                                  {item.unidade_tematica && <div className="text-xs text-slate-400 mt-0.5">{item.unidade_tematica}</div>}
                              </td>
                              <td className="p-4 text-sm text-slate-600 align-top">{item.descricao_habilidade}</td>
                              <td className="p-4 text-right align-top">
                                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {!item.deleted && (
                                          <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={16}/></button>
                                      )}
                                      {item.deleted ? (
                                          <button onClick={() => openRestoreModal(item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><RotateCcw size={16}/></button>
                                      ) : (
                                          <button onClick={() => openDeleteModal(item)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );
};

export default BNCCManager;
