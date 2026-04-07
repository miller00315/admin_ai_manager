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

export function useBnccCatalog(enabled: boolean) {
    const [curriculumComponents, setCurriculumComponents] = useState<CurriculumComponent[]>([]);
    const [disciplineReferences, setDisciplineReferences] = useState<DisciplineReference[]>([]);
    const [teachingStages, setTeachingStages] = useState<TeachingStage[]>([]);
    const [habilities, setHabilities] = useState<Hability[]>([]);
    const [specificSkills, setSpecificSkills] = useState<SpecificSkill[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = useMemo(() => getSupabaseClient(), []);

    const load = useCallback(async () => {
        if (!enabled || !supabase) return;
        setLoading(true);
        setError(null);
        try {
            const cc = await supabase
                .from('curriculum_component')
                .select('*')
                .eq('deleted', false)
                .order('name');
            if (cc.error) throw cc.error;

            const dr = await supabase
                .from('discipline_reference')
                .select('*')
                .eq('deleted', false)
                .order('name');
            if (dr.error) throw dr.error;

            const ts = await supabase
                .from('teaching_stage')
                .select('*')
                .eq('deleted', false)
                .order('name');
            if (ts.error) throw ts.error;

            const hab = await supabase
                .from('habilities')
                .select('*')
                .eq('deleted', false)
                .order('name');
            if (hab.error) throw hab.error;

            let ss = await supabase
                .from('specific_skills')
                .select('*, hability:habilities(id, name, description)')
                .eq('deleted', false)
                .order('name');
            if (ss.error) {
                ss = await supabase.from('specific_skills').select('*').eq('deleted', false).order('name');
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
    }, [enabled, supabase]);

    useEffect(() => {
        if (enabled) load();
    }, [enabled, load]);

    const createCurriculumComponent = async (name: string, description?: string) => {
        if (!supabase) throw new Error('Sem conexão');
        const { data, error: err } = await supabase
            .from('curriculum_component')
            .insert({ name: name.trim(), description: description?.trim() || null })
            .select('id')
            .single();
        if (err) throw err;
        await load();
        return data.id as string;
    };

    const createDisciplineReference = async (name: string, description?: string) => {
        if (!supabase) throw new Error('Sem conexão');
        const { data, error: err } = await supabase
            .from('discipline_reference')
            .insert({ name: name.trim(), description: description?.trim() || null })
            .select('id')
            .single();
        if (err) throw err;
        await load();
        return data.id as string;
    };

    const createTeachingStage = async (name: string, description?: string) => {
        if (!supabase) throw new Error('Sem conexão');
        const { data, error: err } = await supabase
            .from('teaching_stage')
            .insert({ name: name.trim(), description: description?.trim() || null })
            .select('id')
            .single();
        if (err) throw err;
        await load();
        return data.id as string;
    };

    const createHability = async (name: string, description?: string) => {
        if (!supabase) throw new Error('Sem conexão');
        const { data, error: err } = await supabase
            .from('habilities')
            .insert({ name: name.trim(), description: description?.trim() || null })
            .select('id')
            .single();
        if (err) throw err;
        await load();
        return data.id as string;
    };

    const createSpecificSkill = async (habilityId: string, name: string, description?: string) => {
        if (!supabase) throw new Error('Sem conexão');
        if (!habilityId) throw new Error('Selecione a habilidade pai');
        const { data, error: err } = await supabase
            .from('specific_skills')
            .insert({
                hability_id: habilityId,
                name: name.trim(),
                description: description?.trim() || null
            })
            .select('id')
            .single();
        if (err) throw err;
        await load();
        return data.id as string;
    };

    return {
        curriculumComponents,
        disciplineReferences,
        teachingStages,
        habilities,
        specificSkills,
        loading,
        error,
        refresh: load,
        createCurriculumComponent,
        createDisciplineReference,
        createTeachingStage,
        createHability,
        createSpecificSkill
    };
}
