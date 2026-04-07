import { BNCCItem } from '../types';

export function bnccCurriculumLabel(b: BNCCItem): string {
    return b.curriculum_component?.name?.trim() || b.componente_curricular?.trim() || '';
}

export function bnccSkillDescription(b: BNCCItem): string {
    const d = b.specific_skills?.description?.trim();
    if (d) return d;
    return (b.descricao_habilidade || '').trim();
}

export function bnccSkillName(b: BNCCItem): string {
    return b.specific_skills?.name?.trim() || '';
}

export function bnccTeachingStageLabel(b: BNCCItem): string {
    return b.teaching_stage?.name?.trim() || b.ano_serie?.trim() || '';
}

export function bnccDisciplineRefLabel(b: BNCCItem): string {
    return b.discipline_reference?.name?.trim() || b.unidade_tematica?.trim() || '';
}

export function bnccHabilityLabel(b: BNCCItem): string {
    const h = b.specific_skills?.hability ?? b.specific_skills?.habilities;
    return h?.name?.trim() || '';
}

/** Texto para filtros / busca (código + rótulos + descrição) */
export function bnccSearchBlob(b: BNCCItem): string {
    return [
        b.codigo_alfanumerico,
        bnccCurriculumLabel(b),
        bnccDisciplineRefLabel(b),
        bnccTeachingStageLabel(b),
        bnccHabilityLabel(b),
        bnccSkillName(b),
        bnccSkillDescription(b)
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

/** Rótulo para `<select>` de BNCC (código + trecho da descrição ou componente). */
export function bnccSelectLabel(b: BNCCItem, maxSlice = 40): string {
    const sub = bnccSkillDescription(b) || bnccCurriculumLabel(b);
    if (!sub) return b.codigo_alfanumerico;
    const tail = sub.length > maxSlice ? `${sub.slice(0, maxSlice)}…` : sub;
    return `${b.codigo_alfanumerico} – ${tail}`;
}

export function bnccSummaryLines(b: BNCCItem): string[] {
    const lines: string[] = [`Código: ${b.codigo_alfanumerico || '—'}`];
    const comp = bnccCurriculumLabel(b);
    if (comp) lines.push(`Componente curricular: ${comp}`);
    const ref = bnccDisciplineRefLabel(b);
    if (ref) lines.push(`Disciplina: ${ref}`);
    const stage = bnccTeachingStageLabel(b);
    if (stage) lines.push(`Etapa de ensino: ${stage}`);
    const hab = bnccHabilityLabel(b);
    if (hab) lines.push(`Competência específica: ${hab}`);
    const sk = bnccSkillName(b);
    if (sk) lines.push(`Habilidade: ${sk}`);
    const desc = bnccSkillDescription(b);
    if (desc) lines.push(`Descrição:\n${desc}`);
    return lines;
}
