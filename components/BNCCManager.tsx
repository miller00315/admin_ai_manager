
import React, { useState, useRef, useMemo } from 'react';
import { useBNCCManager } from '../presentation/hooks/useBNCCManager';
import { useBnccCatalog } from '../presentation/hooks/useBnccCatalog';
import { BNCCItem } from '../types';
import { Plus, Trash2, Edit2, Loader2, Save, RotateCcw, AlertTriangle, Search, Filter, Upload, ArrowLeft } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { parseFile } from '../services/fileParser';
import { extractBNCCsFromPDF, BNCCExtractionResult } from '../services/geminiService';
import BNCCExtractionSummary from './BNCCExtractionSummary';
import {
    bnccCurriculumLabel,
    bnccDisciplineRefLabel,
    bnccTeachingStageLabel,
    bnccSkillDescription,
    bnccHabilityLabel,
    bnccSearchBlob
} from '../utils/bnccDisplay';

/**
 * BNCCManager - ADMIN ONLY
 * CRUD da tabela bncc: código e vínculos (FKs) a registros já existentes no Catálogo BNCC.
 * Componentes, referências, etapas e habilidades não são criados nesta tela.
 */
interface BNCCManagerProps {
  hasSupabase: boolean;
}

type FormState = {
    codigo_alfanumerico: string;
    curriculum_component_id: string;
    discipline_reference_id: string;
    teaching_stage_id: string;
    specific_skills_id: string;
    skillFilterHabilityId: string;
};

const emptyForm = (): FormState => ({
    codigo_alfanumerico: '',
    curriculum_component_id: '',
    discipline_reference_id: '',
    teaching_stage_id: '',
    specific_skills_id: '',
    skillFilterHabilityId: ''
});

const BNCCManager: React.FC<BNCCManagerProps> = ({ hasSupabase }) => {
  const { items, loading, error, saveItem, deleteItem, restoreItem, isAdmin, showDeleted, setShowDeleted } = useBNCCManager(hasSupabase);
  const catalog = useBnccCatalog(hasSupabase && !!isAdmin);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [componentFilter, setComponentFilter] = useState('All');

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<BNCCExtractionResult | null>(null);
  const [extractionFileName, setExtractionFileName] = useState('');
  const [isSavingExtracted, setIsSavingExtracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      id: string | null;
      action: 'delete' | 'restore';
      name: string;
  }>({ isOpen: false, id: null, action: 'delete', name: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const filteredSpecificSkills = useMemo(() => {
      if (!formData.skillFilterHabilityId) return catalog.specificSkills;
      return catalog.specificSkills.filter(s => s.hability_id === formData.skillFilterHabilityId);
  }, [catalog.specificSkills, formData.skillFilterHabilityId]);

  const handleCreate = () => {
      setEditingId(null);
      setFormData(emptyForm());
      setIsFormOpen(true);
  };

  const handleEdit = (item: BNCCItem) => {
      setEditingId(item.id);
      setFormData({
          codigo_alfanumerico: item.codigo_alfanumerico,
          curriculum_component_id: item.curriculum_component_id || '',
          discipline_reference_id: item.discipline_reference_id || '',
          teaching_stage_id: item.teaching_stage_id || '',
          specific_skills_id: item.specific_skills_id || '',
          skillFilterHabilityId: item.specific_skills?.hability_id || ''
      });
      setIsFormOpen(true);
  };

  const closeForm = () => {
      setIsFormOpen(false);
      setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.codigo_alfanumerico?.trim()) {
          alert('O código alfanumérico é obrigatório.');
          return;
      }

      setIsSaving(true);
      try {
          const payload: Partial<BNCCItem> = {
              codigo_alfanumerico: formData.codigo_alfanumerico.trim(),
              curriculum_component_id: formData.curriculum_component_id.trim() || null,
              discipline_reference_id: formData.discipline_reference_id.trim() || null,
              teaching_stage_id: formData.teaching_stage_id.trim() || null,
              specific_skills_id: formData.specific_skills_id.trim() || null
          };
          const success = await saveItem(editingId, payload);
          if (success) {
              closeForm();
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

          const result = await extractBNCCsFromPDF(pdfText);
          setExtractionResult(result);
      } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Erro desconhecido';
          console.error('Error extracting BNCCs:', error);
          alert('Erro ao processar o PDF: ' + msg);
          setExtractionResult({
              bnccs: [],
              hasBNCCContent: false,
              message: 'Erro ao processar o documento: ' + msg
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
          const codes = bnccs
              .map(b => (b.codigo_alfanumerico || '').trim().toUpperCase())
              .filter(Boolean);
          for (const code of codes) {
              await saveItem(null, { codigo_alfanumerico: code });
          }
          setExtractionResult(null);
          setExtractionFileName('');
          alert(
              `${codes.length} código(s) BNCC salvo(s) (somente código alfanumérico). ` +
                  'Use Catálogo BNCC para as entidades de apoio e volte aqui para vincular cada código.'
          );
      } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Erro desconhecido';
          alert('Erro ao salvar BNCCs: ' + msg);
      } finally {
          setIsSavingExtracted(false);
      }
  };

  const filteredItems = items.filter(i => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || bnccSearchBlob(i).includes(term);
      const matchComp =
          componentFilter === 'All' || i.curriculum_component_id === componentFilter;
      return matchSearch && matchComp;
  });

  if (!hasSupabase) return <div className="p-8 text-center text-slate-500">Configure database first.</div>;

  if (loading && isAdmin === false) {
      return (
          <div className="p-8 text-center">
              <Loader2 size={48} className="mx-auto text-indigo-600 mb-4 animate-spin"/>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Carregando...</h3>
              <p className="text-slate-500 text-sm">Verificando permissões de acesso.</p>
          </div>
      );
  }

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
          <ConfirmationModal
              isOpen={modalConfig.isOpen}
              onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
              onConfirm={executeAction}
              title={modalConfig.action === 'delete' ? 'Excluir Item BNCC' : 'Restaurar Item BNCC'}
              message={
                  modalConfig.action === 'delete'
                  ? <span>Excluir <strong>{modalConfig.name}</strong>? Esta é uma exclusão lógica.</span>
                  : <span>Restaurar <strong>{modalConfig.name}</strong>?</span>
              }
              confirmLabel={modalConfig.action === 'delete' ? 'Excluir' : 'Restaurar'}
              isDestructive={modalConfig.action === 'delete'}
              isLoading={isActionLoading}
          />

          {isFormOpen ? (
              <div className="min-h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-200">
                  <div className="mb-6">
                      <button
                          type="button"
                          onClick={closeForm}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-4"
                      >
                          <ArrowLeft size={18} aria-hidden/>
                          Voltar à lista
                      </button>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {editingId ? 'Editar código BNCC' : 'Novo código BNCC'}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl text-sm sm:text-base">
                          Preencha o código e os vínculos com o <strong className="text-slate-700 dark:text-slate-200">Catálogo BNCC</strong>.
                          Os registros do catálogo são criados na tela própria do menu lateral.
                      </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3 text-red-700 dark:text-red-300 items-center mb-6">
                        <AlertTriangle size={20}/> {error}
                    </div>
                  )}

                  {catalog.error && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-800 dark:text-amber-200 text-sm mb-6">
                        Catálogo curricular: {catalog.error}
                    </div>
                  )}

                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-lg p-6 sm:p-8 max-w-3xl w-full">
                      <form onSubmit={handleSave} className="space-y-5">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Código alfanumérico (ex: EF01MA01) *</label>
                              <input
                                  required
                                  value={formData.codigo_alfanumerico}
                                  onChange={e => setFormData({ ...formData, codigo_alfanumerico: e.target.value.toUpperCase() })}
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                  placeholder="Código"
                              />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Componente curricular</label>
                                  <select
                                      value={formData.curriculum_component_id}
                                      onChange={e => setFormData({ ...formData, curriculum_component_id: e.target.value })}
                                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                  >
                                      <option value="">— Não vinculado —</option>
                                      {catalog.curriculumComponents.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Disciplina</label>
                                  <select
                                      value={formData.discipline_reference_id}
                                      onChange={e => setFormData({ ...formData, discipline_reference_id: e.target.value })}
                                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                  >
                                      <option value="">— Não vinculado —</option>
                                      {catalog.disciplineReferences.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Etapa de ensino</label>
                                  <select
                                      value={formData.teaching_stage_id}
                                      onChange={e => setFormData({ ...formData, teaching_stage_id: e.target.value })}
                                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                  >
                                      <option value="">— Não vinculado —</option>
                                      {catalog.teachingStages.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Filtrar habilidades por competência específica</label>
                                  <select
                                      value={formData.skillFilterHabilityId}
                                      onChange={e =>
                                          setFormData(f => ({
                                              ...f,
                                              skillFilterHabilityId: e.target.value,
                                              specific_skills_id: ''
                                          }))
                                      }
                                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                  >
                                      <option value="">— Todas —</option>
                                      {catalog.habilities.map(h => (
                                          <option key={h.id} value={h.id}>{h.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Habilidade</label>
                              <select
                                  value={formData.specific_skills_id}
                                  onChange={e => setFormData({ ...formData, specific_skills_id: e.target.value })}
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                              >
                                  <option value="">— Não vinculado —</option>
                                  {filteredSpecificSkills.map(s => (
                                      <option key={s.id} value={s.id}>
                                          {s.name}
                                          {s.description ? ` — ${s.description.slice(0, 48)}${s.description.length > 48 ? '…' : ''}` : ''}
                                      </option>
                                  ))}
                              </select>
                              {catalog.loading && <p className="text-xs text-slate-500">Carregando catálogo…</p>}
                          </div>

                          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                              <button type="button" onClick={closeForm} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent">
                                  Cancelar
                              </button>
                              <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-md disabled:opacity-70 disabled:cursor-not-allowed">
                                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          ) : (
          <>
          <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Base Nacional Comum Curricular</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Vincule cada código a registros já cadastrados em <strong className="text-slate-700 dark:text-slate-200">Catálogo BNCC</strong>.
                  </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
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
                  <button type="button" onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                      <Plus size={20}/> Novo código BNCC
                  </button>
              </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3 text-red-700 dark:text-red-300 items-center">
                <AlertTriangle size={20}/> {error}
            </div>
          )}

          {catalog.error && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-800 dark:text-amber-200 text-sm">
                Catálogo curricular: {catalog.error}
            </div>
          )}

          <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              Nesta tela você apenas <strong className="text-slate-800 dark:text-slate-100">escolhe vínculos</strong> nos selects.
              Para <strong className="text-slate-800 dark:text-slate-100">criar ou editar</strong> componentes curriculares, disciplinas, etapas, competências específicas ou habilidades, use o menu{' '}
              <strong className="text-indigo-700 dark:text-indigo-300">Catálogo BNCC</strong>.
              A extração por PDF grava somente o <strong className="text-slate-800 dark:text-slate-100">código alfanumérico</strong>; os vínculos ficam para você definir depois.
          </div>

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

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18}/>
                  <input
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar por código, componente, descrição..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter className="text-slate-400 dark:text-slate-500" size={18}/>
                  <select
                      value={componentFilter}
                      onChange={e => setComponentFilter(e.target.value)}
                      className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full md:w-56"
                  >
                      <option value="All">Todos os componentes</option>
                      {catalog.curriculumComponents.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-28">Código</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-36">Componente</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-32">Disciplina</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-28">Etapa</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Competência e habilidade</th>
                          <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-24 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {loading ? (
                          <tr><td colSpan={6} className="p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Carregando dados...</td></tr>
                      ) : filteredItems.length === 0 ? (
                          <tr><td colSpan={6} className="p-12 text-center text-slate-400">Nenhum item encontrado com os filtros aplicados.</td></tr>
                      ) : filteredItems.map(item => (
                          <tr key={item.id} className={`transition-colors group ${item.deleted ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                              <td className="p-4 font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm align-top">
                                  {item.codigo_alfanumerico}
                                  {item.deleted && <div className="text-[10px] text-red-600 dark:text-red-400 mt-1 uppercase">Excluído</div>}
                              </td>
                              <td className="p-4 align-top text-sm text-slate-800 dark:text-slate-200">{bnccCurriculumLabel(item) || '—'}</td>
                              <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300">{bnccDisciplineRefLabel(item) || '—'}</td>
                              <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300">{bnccTeachingStageLabel(item) || '—'}</td>
                              <td className="p-4 align-top text-sm text-slate-600 dark:text-slate-300">
                                  {bnccHabilityLabel(item) && (
                                      <div className="font-medium text-slate-800 dark:text-slate-100 text-xs mb-0.5">{bnccHabilityLabel(item)}</div>
                                  )}
                                  <span className="line-clamp-3">{bnccSkillDescription(item) || '—'}</span>
                              </td>
                              <td className="p-4 text-right align-top">
                                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {!item.deleted && (
                                          <button type="button" onClick={() => handleEdit(item)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"><Edit2 size={16}/></button>
                                      )}
                                      {item.deleted ? (
                                          <button type="button" onClick={() => openRestoreModal(item)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"><RotateCcw size={16}/></button>
                                      ) : (
                                          <button type="button" onClick={() => openDeleteModal(item)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
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

export default BNCCManager;
