import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '../../services/supabaseService';
import {
    CurriculumComponent,
    DisciplineReference,
    TeachingStage,
    Hability,
    SpecificSkill
} from '../../types';
import { getFriendlyErrorMessage } from '../../utils/errorHandling';
import { useSessionRole } from '../context/SessionRoleContext';

export type BnccCatalogTable =
    | 'curriculum_component'
    | 'discipline_reference'
    | 'teaching_stage'
    | 'habilities'
    | 'specific_skills';

export class BnccCatalogDependencyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BnccCatalogDependencyError';
    }
}

/**
 * CRUD administrativo das tabelas de referência da BNCC (mesmo critério de acesso do BNCCManager: administrador).
 */
export function useBnccCatalogAdmin(hasSupabase: boolean) {
    const { isAdministrator } = useSessionRole();
    const [curriculumComponents, setCurriculumComponents] = useState<CurriculumComponent[]>([]);
    const [disciplineReferences, setDisciplineReferences] = useState<DisciplineReference[]>([]);
    const [teachingStages, setTeachingStages] = useState<TeachingStage[]>([]);
    const [habilities, setHabilities] = useState<Hability[]>([]);
    const [specificSkills, setSpecificSkills] = useState<SpecificSkill[]>([]);
    const [loading, setLoading] = useState(() => !!hasSupabase);
    const [error, setError] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);

    const supabase = useMemo(() => getSupabaseClient(), []);

    const load = useCallback(async () => {
        if (!supabase || !hasSupabase) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (!isAdministrator) {
                setLoading(false);
                return;
            }

            const applyDeleted = <T extends { eq: (c: string, v: boolean) => T }>(q: T) =>
                showDeleted ? q : q.eq('deleted', false);

            let ccQ = supabase.from('curriculum_component').select('*');
            ccQ = applyDeleted(ccQ);
            const cc = await ccQ.order('name');
            if (cc.error) throw cc.error;

            let drQ = supabase.from('discipline_reference').select('*');
            drQ = applyDeleted(drQ);
            const dr = await drQ.order('name');
            if (dr.error) throw dr.error;

            let tsQ = supabase.from('teaching_stage').select('*');
            tsQ = applyDeleted(tsQ);
            const ts = await tsQ.order('name');
            if (ts.error) throw ts.error;

            let habQ = supabase.from('habilities').select('*');
            habQ = applyDeleted(habQ);
            const hab = await habQ.order('name');
            if (hab.error) throw hab.error;

            let ssQ = supabase
                .from('specific_skills')
                .select('*, hability:habilities(id, name, description)');
            ssQ = applyDeleted(ssQ);
            let ss = await ssQ.order('name');
            if (ss.error) {
                let ssQ2 = supabase.from('specific_skills').select('*');
                ssQ2 = applyDeleted(ssQ2);
                ss = await ssQ2.order('name');
                if (ss.error) throw ss.error;
            }

            setCurriculumComponents((cc.data || []) as CurriculumComponent[]);
            setDisciplineReferences((dr.data || []) as DisciplineReference[]);
            setTeachingStages((ts.data || []) as TeachingStage[]);
            setHabilities((hab.data || []) as Hability[]);
            setSpecificSkills((ss.data || []) as SpecificSkill[]);
        } catch (e: unknown) {
            setError(getFriendlyErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [supabase, hasSupabase, showDeleted, isAdministrator]);

    useEffect(() => {
        if (hasSupabase) load();
    }, [hasSupabase, load]);

    const assertDepsBeforeDelete = async (table: BnccCatalogTable, id: string) => {
        if (!supabase) return;

        if (table === 'curriculum_component') {
            const { count } = await supabase
                .from('bncc')
                .select('id', { count: 'exact', head: true })
                .eq('curriculum_component_id', id)
                .eq('deleted', false);
            if (count && count > 0) {
                throw new BnccCatalogDependencyError(
                    `Existem ${count} registro(s) BNCC usando este componente. Desvincule ou altere-os antes.`
                );
            }
        }
        if (table === 'discipline_reference') {
            const { count } = await supabase
                .from('bncc')
                .select('id', { count: 'exact', head: true })
                .eq('discipline_reference_id', id)
                .eq('deleted', false);
            if (count && count > 0) {
                throw new BnccCatalogDependencyError(
                    `Existem ${count} registro(s) BNCC usando esta disciplina.`
                );
            }
        }
        if (table === 'teaching_stage') {
            const { count } = await supabase
                .from('bncc')
                .select('id', { count: 'exact', head: true })
                .eq('teaching_stage_id', id)
                .eq('deleted', false);
            if (count && count > 0) {
                throw new BnccCatalogDependencyError(
                    `Existem ${count} registro(s) BNCC usando esta etapa de ensino.`
                );
            }
        }
        if (table === 'specific_skills') {
            const { count } = await supabase
                .from('bncc')
                .select('id', { count: 'exact', head: true })
                .eq('specific_skills_id', id)
                .eq('deleted', false);
            if (count && count > 0) {
                throw new BnccCatalogDependencyError(
                    `Existem ${count} registro(s) BNCC usando esta habilidade.`
                );
            }
        }
        if (table === 'habilities') {
            const { count } = await supabase
                .from('specific_skills')
                .select('id', { count: 'exact', head: true })
                .eq('hability_id', id)
                .eq('deleted', false);
            if (count && count > 0) {
                throw new BnccCatalogDependencyError(
                    `Existem ${count} habilidade(s) vinculada(s) a esta competência específica. Remova ou reatribua antes.`
                );
            }
        }
    };

    const updateRow = async (table: BnccCatalogTable, id: string, payload: Record<string, unknown>) => {
        if (!supabase) throw new Error('Sem conexão');
        const { error: err } = await supabase.from(table).update(payload).eq('id', id);
        if (err) throw err;
        await load();
    };

    const softDelete = async (table: BnccCatalogTable, id: string) => {
        if (!supabase) throw new Error('Sem conexão');
        await assertDepsBeforeDelete(table, id);
        const { error: err } = await supabase.from(table).update({ deleted: true }).eq('id', id);
        if (err) throw err;
        await load();
    };

    const restoreRow = async (table: BnccCatalogTable, id: string) => {
        if (!supabase) throw new Error('Sem conexão');
        const { error: err } = await supabase.from(table).update({ deleted: false }).eq('id', id);
        if (err) throw err;
        await load();
    };

    const createRow = async (table: BnccCatalogTable, payload: Record<string, unknown>) => {
        if (!supabase) throw new Error('Sem conexão');
        const { error: err } = await supabase.from(table).insert(payload);
        if (err) throw err;
        await load();
    };

    return {
        curriculumComponents,
        disciplineReferences,
        teachingStages,
        habilities,
        specificSkills,
        loading,
        error,
        isAdmin: isAdministrator,
        showDeleted,
        setShowDeleted,
        refresh: load,
        updateRow,
        softDelete,
        restoreRow,
        createRow
    };
}
