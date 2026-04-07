import React, { useMemo, useState, useEffect } from 'react';
import {
    useBnccCatalogAdmin,
    BnccCatalogTable,
    BnccCatalogDependencyError
} from '../presentation/hooks/useBnccCatalogAdmin';
import {
    CurriculumComponent,
    DisciplineReference,
    TeachingStage,
    Hability,
    SpecificSkill
} from '../types';
import {
    Layers,
    Bookmark,
    Milestone,
    Brain,
    Target,
    Plus,
    Edit2,
    Trash2,
    RotateCcw,
    Loader2,
    AlertTriangle,
    Save,
    X,
    Search
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { getFriendlyErrorMessage } from '../utils/errorHandling';

type TabId = 'curriculum_component' | 'discipline_reference' | 'teaching_stage' | 'habilities' | 'specific_skills';

const TABS: { id: TabId; label: string; short: string; createLabel: string; icon: React.ElementType }[] = [
    { id: 'curriculum_component', label: 'Componentes curriculares', short: 'Componente', createLabel: 'Novo componente', icon: Layers },
    { id: 'discipline_reference', label: 'Disciplinas', short: 'Disciplina', createLabel: 'Nova disciplina', icon: Bookmark },
    { id: 'teaching_stage', label: 'Etapas de ensino', short: 'Etapa', createLabel: 'Nova etapa', icon: Milestone },
    { id: 'habilities', label: 'Competências específicas', short: 'Competência', createLabel: 'Nova competência específica', icon: Brain },
    { id: 'specific_skills', label: 'Habilidade', short: 'Habilidade', createLabel: 'Nova habilidade', icon: Target }
];

interface BnccCatalogManagerProps {
    hasSupabase: boolean;
}

const BnccCatalogManager: React.FC<BnccCatalogManagerProps> = ({ hasSupabase }) => {
    const {
        curriculumComponents,
        disciplineReferences,
        teachingStages,
        habilities,
        specificSkills,
        loading,
        error,
        isAdmin,
        showDeleted,
        setShowDeleted,
        refresh,
        updateRow,
        softDelete,
        restoreRow,
        createRow
    } = useBnccCatalogAdmin(hasSupabase);

    const [tab, setTab] = useState<TabId>('curriculum_component');
    const [searchTerm, setSearchTerm] = useState('');

    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formHabilityId, setFormHabilityId] = useState('');
    const [formSaving, setFormSaving] = useState(false);

    const [modal, setModal] = useState<{
        open: boolean;
        table: BnccCatalogTable | null;
        id: string | null;
        name: string;
        action: 'delete' | 'restore';
    }>({ open: false, table: null, id: null, name: '', action: 'delete' });
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        setSearchTerm('');
        setFormOpen(false);
        setEditingId(null);
    }, [tab]);

    const rowsForTab = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        const match = (name: string, desc?: string | null) => {
            if (!term) return true;
            return (
                name.toLowerCase().includes(term) ||
                (desc && desc.toLowerCase().includes(term))
            );
        };

        switch (tab) {
            case 'curriculum_component':
                return curriculumComponents.filter(c => match(c.name, c.description));
            case 'discipline_reference':
                return disciplineReferences.filter(c => match(c.name, c.description));
            case 'teaching_stage':
                return teachingStages.filter(c => match(c.name, c.description));
            case 'habilities':
                return habilities.filter(c => match(c.name, c.description));
            case 'specific_skills':
                return specificSkills.filter(c => {
                    const habLabel = c.hability?.name || c.habilities?.name || '';
                    if (!term) return true;
                    return (
                        match(c.name, c.description) ||
                        habLabel.toLowerCase().includes(term)
                    );
                });
            default:
                return [];
        }
    }, [tab, curriculumComponents, disciplineReferences, teachingStages, habilities, specificSkills, searchTerm]);

    const openCreate = () => {
        setEditingId(null);
        setFormName('');
        setFormDesc('');
        setFormHabilityId(habilities[0]?.id || '');
        setFormOpen(true);
    };

    const openEdit = (id: string, name: string, description?: string | null, habilityId?: string) => {
        setEditingId(id);
        setFormName(name);
        setFormDesc(description || '');
        setFormHabilityId(habilityId || '');
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) {
            alert('Nome é obrigatório.');
            return;
        }
        if (tab === 'specific_skills' && !formHabilityId) {
            alert('Selecione a competência específica vinculada.');
            return;
        }

        setFormSaving(true);
        try {
            if (tab === 'specific_skills') {
                if (editingId) {
                    await updateRow('specific_skills', editingId, {
                        name: formName.trim(),
                        description: formDesc.trim() || null,
                        hability_id: formHabilityId
                    });
                } else {
                    await createRow('specific_skills', {
                        name: formName.trim(),
                        description: formDesc.trim() || null,
                        hability_id: formHabilityId
                    });
                }
            } else {
                const payload = {
                    name: formName.trim(),
                    description: formDesc.trim() || null
                };
                if (editingId) {
                    await updateRow(tab, editingId, payload);
                } else {
                    await createRow(tab, payload);
                }
            }
            closeForm();
        } catch (err: unknown) {
            alert(getFriendlyErrorMessage(err));
        } finally {
            setFormSaving(false);
        }
    };

    const runModalAction = async () => {
        if (!modal.table || !modal.id) return;
        setModalLoading(true);
        try {
            if (modal.action === 'delete') {
                await softDelete(modal.table, modal.id);
            } else {
                await restoreRow(modal.table, modal.id);
            }
            setModal(m => ({ ...m, open: false }));
        } catch (err: unknown) {
            const msg =
                err instanceof BnccCatalogDependencyError
                    ? err.message
                    : getFriendlyErrorMessage(err);
            alert(msg);
        } finally {
            setModalLoading(false);
        }
    };

    const renderRows = () => {
        if (tab === 'curriculum_component') {
            return (rowsForTab as CurriculumComponent[]).map(row => (
                <tr
                    key={row.id}
                    className={
                        row.deleted
                            ? 'bg-red-50/80 dark:bg-red-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }
                >
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400 max-w-md line-clamp-2">
                        {row.description || '—'}
                    </td>
                    <td className="p-3 text-right">
                        <RowActions
                            deleted={!!row.deleted}
                            onEdit={() => openEdit(row.id, row.name, row.description)}
                            onDelete={() =>
                                setModal({
                                    open: true,
                                    table: 'curriculum_component',
                                    id: row.id,
                                    name: row.name,
                                    action: 'delete'
                                })
                            }
                            onRestore={() =>
                                setModal({
                                    open: true,
                                    table: 'curriculum_component',
                                    id: row.id,
                                    name: row.name,
                                    action: 'restore'
                                })
                            }
                        />
                    </td>
                </tr>
            ));
        }
        if (tab === 'discipline_reference') {
            return (rowsForTab as DisciplineReference[]).map(row => (
                <tr
                    key={row.id}
                    className={
                        row.deleted
                            ? 'bg-red-50/80 dark:bg-red-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }
                >
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400 max-w-md line-clamp-2">
                        {row.description || '—'}
                    </td>
                    <td className="p-3 text-right">
                        <RowActions
                            deleted={!!row.deleted}
                            onEdit={() => openEdit(row.id, row.name, row.description)}
                            onDelete={() =>
                                setModal({
                                    open: true,
                                    table: 'discipline_reference',
                                    id: row.id,
                                    name: row.name,
                                    action: 'delete'
                                })
                            }
                            onRestore={() =>
                                setModal({
                                    open: true,
                                    table: 'discipline_reference',
                                    id: row.id,
                                    name: row.name,
                                    action: 'restore'
                                })
                            }
                        />
                    </td>
                </tr>
            ));
        }
        if (tab === 'teaching_stage') {
            return (rowsForTab as TeachingStage[]).map(row => (
                <tr
                    key={row.id}
                    className={
                        row.deleted
                            ? 'bg-red-50/80 dark:bg-red-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }
                >
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400 max-w-md line-clamp-2">
                        {row.description || '—'}
                    </td>
                    <td className="p-3 text-right">
                        <RowActions
                            deleted={!!row.deleted}
                            onEdit={() => openEdit(row.id, row.name, row.description)}
                            onDelete={() =>
                                setModal({
                                    open: true,
                                    table: 'teaching_stage',
                                    id: row.id,
                                    name: row.name,
                                    action: 'delete'
                                })
                            }
                            onRestore={() =>
                                setModal({
                                    open: true,
                                    table: 'teaching_stage',
                                    id: row.id,
                                    name: row.name,
                                    action: 'restore'
                                })
                            }
                        />
                    </td>
                </tr>
            ));
        }
        if (tab === 'habilities') {
            return (rowsForTab as Hability[]).map(row => (
                <tr
                    key={row.id}
                    className={
                        row.deleted
                            ? 'bg-red-50/80 dark:bg-red-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }
                >
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400 max-w-md line-clamp-2">
                        {row.description || '—'}
                    </td>
                    <td className="p-3 text-right">
                        <RowActions
                            deleted={!!row.deleted}
                            onEdit={() => openEdit(row.id, row.name, row.description)}
                            onDelete={() =>
                                setModal({
                                    open: true,
                                    table: 'habilities',
                                    id: row.id,
                                    name: row.name,
                                    action: 'delete'
                                })
                            }
                            onRestore={() =>
                                setModal({
                                    open: true,
                                    table: 'habilities',
                                    id: row.id,
                                    name: row.name,
                                    action: 'restore'
                                })
                            }
                        />
                    </td>
                </tr>
            ));
        }
        return (rowsForTab as SpecificSkill[]).map(row => {
            const habName = row.hability?.name || row.habilities?.name || '—';
            return (
                <tr
                    key={row.id}
                    className={
                        row.deleted
                            ? 'bg-red-50/80 dark:bg-red-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }
                >
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="p-3 text-sm text-indigo-700 dark:text-indigo-300">{habName}</td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400 max-w-md line-clamp-2">
                        {row.description || '—'}
                    </td>
                    <td className="p-3 text-right">
                        <RowActions
                            deleted={!!row.deleted}
                            onEdit={() =>
                                openEdit(row.id, row.name, row.description, row.hability_id)
                            }
                            onDelete={() =>
                                setModal({
                                    open: true,
                                    table: 'specific_skills',
                                    id: row.id,
                                    name: row.name,
                                    action: 'delete'
                                })
                            }
                            onRestore={() =>
                                setModal({
                                    open: true,
                                    table: 'specific_skills',
                                    id: row.id,
                                    name: row.name,
                                    action: 'restore'
                                })
                            }
                        />
                    </td>
                </tr>
            );
        });
    };

    if (!hasSupabase) {
        return <div className="p-8 text-center text-slate-500">Configure o banco de dados primeiro.</div>;
    }

    if (loading) {
        return (
            <div className="p-8 text-center">
                <Loader2 size={48} className="mx-auto text-indigo-600 mb-4 animate-spin"/>
                <p className="text-slate-500 text-sm">Carregando catálogo…</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="p-8 text-center">
                <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4"/>
                <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200 mb-2">Acesso restrito</h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Apenas administradores podem gerenciar o catálogo BNCC.
                </p>
            </div>
        );
    }

    const tabMeta = TABS.find(t => t.id === tab)!;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Catálogo BNCC</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                        Cadastre e edite componentes curriculares, disciplinas, etapas de ensino, competências específicas e
                        habilidades usados nos códigos BNCC. Use as abas abaixo para alternar entre as tabelas.
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2">
                    <input
                        type="checkbox"
                        checked={showDeleted}
                        onChange={e => setShowDeleted(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="font-bold">Mostrar excluídos</span>
                </label>
            </div>

            <nav
                className="sticky top-0 z-30 px-4 py-4 sm:px-5 sm:py-5 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-sm"
                aria-label="Seções do catálogo BNCC"
            >
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 sm:mb-4">
                    Navegação rápida
                </p>
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-0.5 sm:pb-0 sm:flex-wrap sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                title={t.label}
                                className={`flex shrink-0 items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                                    active
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/40'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/80 dark:hover:bg-slate-700/80'
                                }`}
                            >
                                <Icon size={17} className={active ? 'opacity-100' : 'opacity-80'} aria-hidden/>
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 flex gap-2 items-center">
                    <AlertTriangle size={20}/> {error}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={`Buscar em ${tabMeta.label.toLowerCase()}…`}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => void refresh()}
                        className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Atualizar
                    </button>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700"
                    >
                        <Plus size={18}/> {tabMeta.createLabel}
                    </button>
                </div>
            </div>

            {formOpen && (
                <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                            {editingId ? `Editar ${tabMeta.short}` : `Novo ${tabMeta.short}`}
                        </h3>
                        <button type="button" onClick={closeForm} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                            <X size={22}/>
                        </button>
                    </div>
                    <form onSubmit={e => void submitForm(e)} className="space-y-4">
                        {tab === 'specific_skills' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                                    Competência específica (vínculo) *
                                </label>
                                <select
                                    value={formHabilityId}
                                    onChange={e => setFormHabilityId(e.target.value)}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                    required
                                >
                                    <option value="">— Selecione —</option>
                                    {habilities.filter(h => !h.deleted).map(h => (
                                        <option key={h.id} value={h.id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Nome *</label>
                            <input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Descrição</label>
                            <textarea
                                value={formDesc}
                                onChange={e => setFormDesc(e.target.value)}
                                rows={3}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={formSaving}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-60"
                            >
                                {formSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[520px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase">Nome</th>
                            {tab === 'specific_skills' && (
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase w-48">Competência específica</th>
                            )}
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right w-36">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan={tab === 'specific_skills' ? 4 : 3} className="p-12 text-center text-slate-400">
                                    <Loader2 className="animate-spin inline mr-2"/> Carregando…
                                </td>
                            </tr>
                        ) : rowsForTab.length === 0 ? (
                            <tr>
                                <td colSpan={tab === 'specific_skills' ? 4 : 3} className="p-12 text-center text-slate-400">
                                    Nenhum registro encontrado.
                                </td>
                            </tr>
                        ) : (
                            renderRows()
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                isOpen={modal.open}
                onClose={() => setModal(m => ({ ...m, open: false }))}
                onConfirm={() => void runModalAction()}
                title={modal.action === 'delete' ? 'Excluir registro' : 'Restaurar registro'}
                message={
                    <span>
                        {modal.action === 'delete' ? 'Excluir' : 'Restaurar'}{' '}
                        <strong>{modal.name}</strong>? {modal.action === 'delete' ? 'Exclusão lógica.' : ''}
                    </span>
                }
                confirmLabel={modal.action === 'delete' ? 'Excluir' : 'Restaurar'}
                isDestructive={modal.action === 'delete'}
                isLoading={modalLoading}
            />
        </div>
    );
};

function RowActions({
    deleted,
    onEdit,
    onDelete,
    onRestore
}: {
    deleted: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onRestore: () => void;
}) {
    return (
        <div className="flex justify-end gap-1">
            {!deleted && (
                <button type="button" onClick={onEdit} className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30" title="Editar">
                    <Edit2 size={16}/>
                </button>
            )}
            {deleted ? (
                <button type="button" onClick={onRestore} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg" title="Restaurar">
                    <RotateCcw size={16}/>
                </button>
            ) : (
                <button type="button" onClick={onDelete} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Excluir">
                    <Trash2 size={16}/>
                </button>
            )}
        </div>
    );
}

export default BnccCatalogManager;
