
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProfessorUseCases, UserRuleUseCases } from '../../domain/usecases';
import { ProfessorRepositoryImpl, UserRuleRepositoryImpl } from '../../data/repositories';
import { getSupabaseClient } from '../../services/supabaseService';
import { Professor, UserRegistrationDTO, UserRule, Address } from '../../types';
import { getFriendlyErrorMessage } from '../../utils/errorHandling';
import { useSessionRole } from '../context/SessionRoleContext';

export const useProfessorManager = (hasSupabase: boolean, institutionId?: string) => {
  const { isAdministrator } = useSessionRole();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<UserRule[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  const supabase = getSupabaseClient();
  const useCase = useMemo(() => supabase ? new ProfessorUseCases(new ProfessorRepositoryImpl(supabase)) : null, [supabase]);
  const ruleUseCase = useMemo(() => supabase ? new UserRuleUseCases(new UserRuleRepositoryImpl(supabase)) : null, [supabase]);

  const fetchProfessors = useCallback(async () => {
    if (!useCase || !supabase) return;
    setLoading(true);
    setError(null);
    try {
      let targetInstId = institutionId;
      const adminStatus = isAdministrator;

      const { data: { user } } = await supabase.auth.getUser();
      let appUserId: string | null = null;
      if (user) {
          const { data: au } = await supabase.from('app_users').select('id').eq('auth_id', user.id).maybeSingle();
          appUserId = au?.id ?? null;
      }

      if (!targetInstId && !adminStatus && appUserId) {
          const { data: managedInst } = await supabase.from('institutions').select('id').eq('manager_id', appUserId).maybeSingle();
          if (managedInst) targetInstId = managedInst.id;
      }

      const includeDeleted = adminStatus && showDeleted;

      let data;
      if (targetInstId) {
          // Managers only see active, Admins see all for specific inst based on flag
          data = await useCase.getProfessorsByInstitution(targetInstId, includeDeleted);
      } else {
          // Only admins typically see the global list
          data = await useCase.getProfessors(includeDeleted);
      }
      
      setProfessors(data);
    } catch (err: any) {
      console.error("Error fetching professors:", err);
      const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError(msg || "Failed to load professors.");
    } finally {
      setLoading(false);
    }
  }, [useCase, supabase, institutionId, showDeleted, isAdministrator]);

  const fetchRules = useCallback(async () => {
    if (!ruleUseCase) return;
    try {
        const data = await ruleUseCase.getRules();
        setRules(data);
    } catch (err) {
        console.error("Error fetching rules:", err);
    }
  }, [ruleUseCase]);

  useEffect(() => {
    if (hasSupabase) {
        fetchProfessors();
        fetchRules();
    }
  }, [hasSupabase, fetchProfessors, fetchRules]);

  const registerProfessor = async (data: UserRegistrationDTO, file?: File, address?: Partial<Address>) => {
    if (!useCase || !ruleUseCase) return;
    try {
      const registrationData = { ...data };
      if (!registrationData.rule_id) {
        const rules = await ruleUseCase.getRules();
        const teacherRule = rules.find(r => !r.deleted && ['teacher', 'professor', 'docente'].includes(r.rule_name?.toLowerCase()?.trim()));
        if (teacherRule?.id) {
            registrationData.rule_id = teacherRule.id;
        } else {
            // Teacher rule not found - will use default
            throw new Error("Regra de usuário 'Teacher' não encontrada. Por favor, verifique se a regra existe no banco de dados.");
        }
      }

      // Garante compatibilidade se o repositório esperar camelCase ruleId
      if (registrationData.rule_id) {
          (registrationData as any).ruleId = registrationData.rule_id;
          (registrationData as any).user_rule_id = registrationData.rule_id;
          (registrationData as any).userRuleId = registrationData.rule_id;
      }

      // Registering professor
      await useCase.registerProfessor(registrationData, file, address);
      await fetchProfessors();
      return true;
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err);
      alert("Failed to register professor: " + msg);
      return false;
    }
  };

  const deleteProfessor = async (id: string) => {
    if (!useCase) return;
    try {
      await useCase.removeProfessor(id);
      await fetchProfessors();
    } catch (err: any) {
      throw err; // Propagate promise
    }
  };

  const restoreProfessor = async (id: string) => {
      if (!useCase) return;
      try {
          await useCase.restoreProfessor(id);
          await fetchProfessors();
      } catch (err: any) {
          throw err;
      }
  };

  const refresh = useCallback(async () => {
    await Promise.all([fetchProfessors(), fetchRules()]);
  }, [fetchProfessors, fetchRules]);

  return { 
      professors, loading, error, 
      registerProfessor, deleteProfessor, restoreProfessor,
      rules, 
      isAdmin: isAdministrator, showDeleted, setShowDeleted, refresh 
  };
};
