
import React, { useState, useEffect, useMemo } from 'react';
import { useSettingsManager } from '../presentation/hooks/useSettingsManager';
import { useBNCCManager } from '../presentation/hooks/useBNCCManager';
import { BookOpen, Plus, Trash2, Loader2, AlertTriangle, Building2, GraduationCap, User, Edit2, Save, X, ScrollText, Link2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Discipline } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { getSupabaseClient } from '../services/supabaseService';

/**
 * DisciplineManager - INSTITUTION ONLY
 * Manage disciplines with BNCC linking capability.
 * This component is isolated for Institution role.
 */
interface DisciplineManagerProps {
  hasSupabase: boolean;
  institutionId?: string;
}

const DisciplineManager: React.FC<DisciplineManagerProps> = ({ hasSupabase, institutionId }) => {
  const { 
      disciplines, grades, professors, institutions, loading, error, 
      fetchAllDisciplines, addDiscipline, updateDiscipline, deleteDiscipline, restoreDiscipline,
      isManager, isAdmin, showDeleted, setShowDeleted
  } = useSettingsManager(hasSupabase, institutionId);

  // Fetch BNCC items for linking
  const { items: bnccItems, loading: bnccLoading } = useBNCCManager(hasSupabase);
  const supabase = getSupabaseClient();

  const [selectedInstId, setSelectedInstId] = useState(institutionId || '');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter and Pagination State
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterProfessor, setFilterProfessor] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // BNCC Relations State
  const [disciplineBnccs, setDisciplineBnccs] = useState<Record<string, string[]>>({});

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      id: string | null;
      secondaryId: string; // for gradeId
      name: string;
      action: 'delete' | 'restore';
  }>({ isOpen: false, id: null, secondaryId: '', name: '', action: 'delete' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Form State - including bncc_ids for linking (Many-to-Many)
  const [formData, setFormData] = useState<{name: string, description: string, grade_id: string, professor_id: string, bncc_ids: string[]}>({
      name: '', description: '', grade_id: '', professor_id: '', bncc_ids: []
  });

  // Auto-select & Fetch
  useEffect(() => {
      if (institutionId) {
          setSelectedInstId(institutionId);
          fetchAllDisciplines(institutionId);
      } else if (isManager && institutions.length > 0) {
          const myInstId = institutions[0].id;
          setSelectedInstId(myInstId);
          fetchAllDisciplines(myInstId);
      }
  }, [institutionId, isManager, institutions]);

  // Fetch BNCC Relations when disciplines change
  const fetchBnccRelations = async () => {
      if (!supabase || disciplines.length === 0) return;
      const ids = disciplines.map(d => d.id);
      const { data, error } = await supabase
        .from('disciplines_bnccs')
        .select('discipline_id, bncc_id')
        .in('discipline_id', ids);
      
      if (data) {
          const map: Record<string, string[]> = {};
          data.forEach((row: any) => {
              if (!map[row.discipline_id]) map[row.discipline_id] = [];
              map[row.discipline_id].push(row.bncc_id);
          });
          setDisciplineBnccs(map);
      }
  };

  useEffect(() => {
      fetchBnccRelations();
  }, [disciplines]);

  const filteredGrades = useMemo(() => {
      if (!selectedInstId) return [];
      return grades.filter(g => g.institution_id === selectedInstId);
  }, [grades, selectedInstId]);

  const filteredProfessors = useMemo(() => {
      if (!selectedInstId) return [];
      return professors.filter(p => p.departments?.institution_id === selectedInstId || p.departments?.institutions?.id === selectedInstId);
  }, [professors, selectedInstId]);

  // Filter BNCC items (only active ones)
  const activeBnccItems = useMemo(() => {
      return bnccItems.filter(b => !b.deleted);
  }, [bnccItems]);

  // Helper to find BNCC item by ID
  const getBnccInfo = (bnccId?: string) => {
      if (!bnccId) return null;
      return activeBnccItems.find(b => b.id === bnccId);
  };

  const handleEdit = (d: Discipline) => {
      setEditingId(d.id);
      const currentBnccs = disciplineBnccs[d.id] || [];
      setFormData({
          name: d.name,
          description: d.description || '',
          grade_id: d.grade_id,
          professor_id: d.professor_id || '',
          bncc_ids: currentBnccs
      });
      setIsFormOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.grade_id) return alert("Nome e Série são obrigatórios.");
      
      setIsSaving(true);
      try {
          const payload = {
              name: formData.name,
              description: formData.description,
              grade_id: formData.grade_id,
              professor_id: formData.professor_id || null
          };

          let targetId = editingId;
          const previousProfessorId = editingId ? disciplines.find(d => d.id === editingId)?.professor_id : null;
          const isProfessorChanged = editingId && previousProfessorId !== formData.professor_id;
          const isNewProfessor = !editingId && formData.professor_id;

          if (editingId) {
              await updateDiscipline(editingId, payload);
          } else {
              // Manual insert to get ID immediately for relation creation
              if (supabase) {
                  const { data, error } = await supabase.from('disciplines').insert(payload).select().single();
                  if (error) throw error;
                  targetId = data.id;
              }
          }
          
          if (targetId && supabase) {
              // Manage relations in disciplines_bnccs
              // 1. Delete existing relations for this discipline
              await supabase.from('disciplines_bnccs').delete().eq('discipline_id', targetId);
              
              // 2. Insert new relations
              if (formData.bncc_ids.length > 0) {
                  const relations = formData.bncc_ids.map(bnccId => ({
                      discipline_id: targetId,
                      bncc_id: bnccId
                  }));
                  await supabase.from('disciplines_bnccs').insert(relations);
              }

              // 3. Auto-link professor to classes if professor is assigned
              if (formData.professor_id && (isNewProfessor || isProfessorChanged)) {
                  // Find all classes with the same grade_id as this discipline
                  const { data: classes, error: classesError } = await supabase
                      .from('classes')
                      .select('id, name')
                      .eq('grade_id', formData.grade_id)
                      .eq('deleted', false);

                  if (!classesError && classes && classes.length > 0) {
                      // Check which classes the professor is not already linked to
                      const { data: existingLinks } = await supabase
                          .from('class_professors')
                          .select('class_id')
                          .eq('professor_id', formData.professor_id)
                          .in('class_id', classes.map(c => c.id));

                      const existingClassIds = new Set((existingLinks || []).map((l: any) => l.class_id));
                      const classesToLink = classes.filter(c => !existingClassIds.has(c.id));

                      if (classesToLink.length > 0) {
                          // Auto-link professor to these classes
                          const linksToInsert = classesToLink.map(c => ({
                              professor_id: formData.professor_id,
                              class_id: c.id
                          }));

                          const { error: linkError } = await supabase
                              .from('class_professors')
                              .insert(linksToInsert);

                          // Auto-link completed (errors handled silently)
                      }
                  }
              }
          }

          await fetchAllDisciplines(selectedInstId);
          // Relations will be refreshed by useEffect
          
          setIsFormOpen(false);
          setEditingId(null);
          setFormData({ name: '', description: '', grade_id: '', professor_id: '', bncc_ids: [] });
      } finally {
          setIsSaving(false);
      }
  };

  const openDeleteModal = (d: Discipline) => {
      setModalConfig({ isOpen: true, id: d.id, secondaryId: d.grade_id, name: d.name, action: 'delete' });
  };

  const openRestoreModal = (d: Discipline) => {
      setModalConfig({ isOpen: true, id: d.id, secondaryId: d.grade_id, name: d.name, action: 'restore' });
  };

  const executeModalAction = async () => {
      if (!modalConfig.id) return;
      if (modalConfig.action === 'delete') {
          setIsDeleting(true);
          try {
              await deleteDiscipline(modalConfig.id, modalConfig.secondaryId);
              fetchAllDisciplines(selectedInstId);
          } finally {
              setIsDeleting(false);
          }
      } else {
          setIsRestoring(true);
          try {
              await restoreDiscipline(modalConfig.id);
              fetchAllDisciplines(selectedInstId);
          } finally {
              setIsRestoring(false);
          }
      }
      setModalConfig({ isOpen: false, id: null, secondaryId: '', name: '', action: 'delete' });
  };

  // Filter disciplines based on showDeleted, grade and professor
  const filteredDisciplines = useMemo(() => {
      let filtered = disciplines.filter(d => showDeleted ? true : !d.deleted);
      
      // Filter by grade
      if (filterGrade) {
          filtered = filtered.filter(d => d.grade_id === filterGrade);
      }
      
      // Filter by professor
      if (filterProfessor) {
          filtered = filtered.filter(d => d.professor_id === filterProfessor);
      }
      
      return filtered;
  }, [disciplines, showDeleted, filterGrade, filterProfessor]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDisciplines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedDisciplines = useMemo(() => {
      return filteredDisciplines.slice(startIndex, endIndex);
  }, [filteredDisciplines, startIndex, endIndex]);

  // Reset page when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [selectedInstId, filterGrade, filterProfessor]);

  if (!hasSupabase) return <div className="p-8 text-center text-slate-500">Configure o banco de dados primeiro.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Disciplinas</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie as disciplinas e vincule à BNCC</p>
            </div>
            <div className="flex items-center gap-4">
                {isAdmin && selectedInstId && (
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={showDeleted} 
                            onChange={e => setShowDeleted(e.target.checked)} 
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="font-bold">Mostrar Excluídos</span>
                    </label>
                )}
                {!isFormOpen && selectedInstId && (
                    <button onClick={() => { setIsFormOpen(true); setEditingId(null); setFormData({name:'', description:'', grade_id:'', professor_id:'', bncc_ids:[]}); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                        <Plus size={20}/> Nova Disciplina
                    </button>
                )}
            </div>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-700 items-center">
                <AlertTriangle size={20}/> {error}
            </div>
        )}

        <ConfirmationModal
            isOpen={modalConfig.isOpen}
            onClose={() => setModalConfig({ isOpen: false, id: null, secondaryId: '', name: '', action: 'delete' })}
            onConfirm={executeModalAction}
            title={modalConfig.action === 'delete' ? "Excluir Disciplina" : "Restaurar Disciplina"}
            message={<span>Tem certeza que deseja {modalConfig.action === 'delete' ? 'excluir' : 'restaurar'} <strong>{modalConfig.name}</strong>?</span>}
            confirmLabel={modalConfig.action === 'delete' ? "Excluir" : "Restaurar"}
            isDestructive={modalConfig.action === 'delete'}
            isLoading={isDeleting || isRestoring}
        />

        {/* Institution Context (Read-only if manager) */}
        {!institutionId && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contexto da Instituição</label>
                <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <select 
                        value={selectedInstId} 
                        onChange={e => { 
                            setSelectedInstId(e.target.value); 
                            fetchAllDisciplines(e.target.value);
                            setFilterGrade(''); // Reset filters when institution changes
                            setFilterProfessor('');
                        }}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="">Selecione a Instituição</option>
                        {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                </div>
            </div>
        )}

        {/* Filters Section - Only show when institution is selected */}
        {selectedInstId && !isFormOpen && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400"/>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">Filtros de Listagem</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                {filteredDisciplines.length} disciplina{filteredDisciplines.length !== 1 ? 's' : ''} encontrada{filteredDisciplines.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Série</label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
                  <select 
                    value={filterGrade} 
                    onChange={e => setFilterGrade(e.target.value)} 
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="">Todas as Séries</option>
                    {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Professor</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"/>
                  <select 
                    value={filterProfessor} 
                    onChange={e => setFilterProfessor(e.target.value)} 
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="">Todos os Professores</option>
                    {filteredProfessors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterGrade('');
                    setFilterProfessor('');
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <X size={16}/> Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Institution Selected Message */}
        {!selectedInstId && !loading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 text-center">
                <Building2 size={48} className="mx-auto text-amber-400 dark:text-amber-500 mb-4"/>
                <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-2">Nenhuma Instituição Selecionada</h3>
                <p className="text-amber-600 dark:text-amber-400 text-sm">Selecione uma instituição acima para visualizar e gerenciar as disciplinas.</p>
            </div>
        )}

        {selectedInstId && isFormOpen && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-lg mb-8 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{editingId ? 'Editar Disciplina' : 'Criar Nova Disciplina'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><X size={20}/></button>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome da Disciplina *</label>
                            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="ex: Física"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Série *</label>
                            <select required value={formData.grade_id} onChange={e => setFormData({...formData, grade_id: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer">
                                <option value="">-- Selecione a Série --</option>
                                {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Professor Responsável (Opcional)</label>
                            <select value={formData.professor_id} onChange={e => setFormData({...formData, professor_id: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer">
                                <option value="">-- Nenhum --</option>
                                {filteredProfessors.map(p => <option key={p.id} value={p.id}>{p.name} ({p.department})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                            <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" placeholder="Notas opcionais..."/>
                        </div>
                    </div>

                    {/* BNCC Linking Section */}
                    <div className="bg-gradient-to-r from-purple-50 dark:from-purple-900/20 to-indigo-50 dark:to-indigo-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                        <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 uppercase mb-2 flex items-center gap-2">
                            <Link2 size={14}/> Vincular à BNCC (Múltipla Escolha)
                        </label>
                        <div className="max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg p-2 space-y-1">
                            {bnccLoading ? (
                                <div className="text-center p-4 text-purple-400 dark:text-purple-500"><Loader2 className="animate-spin inline mr-2"/> Carregando BNCC...</div>
                            ) : activeBnccItems.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400 p-2">Nenhuma competência BNCC cadastrada.</p>
                            ) : (
                                activeBnccItems.map(b => (
                                    <label key={b.id} className="flex items-start gap-2 p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={formData.bncc_ids.includes(b.id)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setFormData(prev => ({...prev, bncc_ids: [...prev.bncc_ids, b.id]}));
                                                } else {
                                                    setFormData(prev => ({...prev, bncc_ids: prev.bncc_ids.filter(id => id !== b.id)}));
                                                }
                                            }}
                                            className="mt-1 w-4 h-4 text-purple-600 dark:text-purple-400 rounded border-gray-300 dark:border-slate-600 focus:ring-purple-500 cursor-pointer"
                                        />
                                        <div className="text-sm">
                                            <span className="font-bold text-purple-700 dark:text-purple-300">{b.codigo_alfanumerico}</span>
                                            <span className="text-slate-600 dark:text-slate-300 ml-1">- {b.componente_curricular}</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{b.descricao_habilidade}</p>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-2">
                            💡 Selecione as competências que esta disciplina aborda.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-70">
                            {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Salvar
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* List */}
        {selectedInstId && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Disciplina</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Série</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Professor</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">BNCC</th>
                        <th className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {loading ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-500"><Loader2 className="animate-spin inline mr-2"/> Carregando...</td></tr>
                    ) : filteredDisciplines.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-500">Nenhuma disciplina encontrada.</td></tr>
                    ) : displayedDisciplines.map(d => {
                        const isDeleted = d.deleted;
                        const linkedBnccs = disciplineBnccs[d.id] || [];
                        
                        return (
                            <tr key={d.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700 group ${isDeleted ? 'bg-red-50/50 dark:bg-red-900/20 opacity-60' : ''}`}>
                                <td className="p-4">
                                    <div className={`font-bold ${isDeleted ? 'text-red-700 dark:text-red-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{d.name}</div>
                                    {d.description && <div className="text-xs text-slate-500 dark:text-slate-400">{d.description}</div>}
                                    {isDeleted && <span className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase">Excluído</span>}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold uppercase ${isDeleted ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'}`}>
                                        <GraduationCap size={12}/> {d.school_grades?.name}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                                    {d.professors?.name ? (
                                        <span className="flex items-center gap-2"><User size={14} className="text-slate-400 dark:text-slate-500"/> {d.professors.name}</span>
                                    ) : (
                                        <span className="text-slate-400 dark:text-slate-500 italic text-xs">Não atribuído</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    {linkedBnccs.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {linkedBnccs.map(bnccId => {
                                                const bncc = getBnccInfo(bnccId);
                                                return bncc ? (
                                                    <div key={bnccId} className="group/bncc relative">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-help border ${isDeleted ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800'}`}>
                                                            <ScrollText size={10}/> {bncc.codigo_alfanumerico}
                                                        </span>
                                                        {/* Tooltip */}
                                                        <div className="absolute z-20 hidden group-hover/bncc:block w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg -top-2 left-full ml-2">
                                                            <div className="font-bold text-purple-300 mb-1">{bncc.componente_curricular}</div>
                                                            <p className="line-clamp-4">{bncc.descricao_habilidade}</p>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-slate-300 italic text-xs">Não vinculado</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isDeleted ? (
                                            <button onClick={() => openRestoreModal(d)} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-all" title="Restaurar">
                                                <RotateCcw size={18}/>
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEdit(d)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-all"><Edit2 size={18}/></button>
                                                <button onClick={() => openDeleteModal(d)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"><Trash2 size={18}/></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        )}

        {/* Pagination Controls */}
        {selectedInstId && !isFormOpen && filteredDisciplines.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page selector and info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 font-medium">Itens por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
                <span className="text-sm text-slate-500">
                  Mostrando {startIndex + 1} - {Math.min(endIndex, filteredDisciplines.length)} de {filteredDisciplines.length} disciplina{filteredDisciplines.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft size={18} />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Próxima página"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Jump to page */}
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-300">
                  <span className="text-xs text-slate-500">Ir para:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1));
                      setCurrentPage(page);
                    }}
                    className="w-16 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                  />
                  <span className="text-xs text-slate-500">/ {totalPages}</span>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default DisciplineManager;
