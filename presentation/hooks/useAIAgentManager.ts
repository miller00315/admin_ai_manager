
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AIAgentUseCases } from '../../domain/usecases';
import { AIAgentRepositoryImpl, AIRepositoryImpl } from '../../data/repositories';
import { getSupabaseClient } from '../../services/supabaseService';
import { AIAgent } from '../../types';
import { getFriendlyErrorMessage } from '../../utils/errorHandling';
import { useSessionRole } from '../context/SessionRoleContext';

export const useAIAgentManager = (hasSupabase: boolean) => {
    const { isAdministrator } = useSessionRole();
    const [agents, setAgents] = useState<AIAgent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([]);
    const [isChatting, setIsChatting] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);

    const supabase = getSupabaseClient();
    
    const useCase = useMemo(() => {
        if (!supabase) return null;
        return new AIAgentUseCases(
            new AIAgentRepositoryImpl(supabase),
            new AIRepositoryImpl()
        );
    }, [supabase]);

    const fetchAgents = useCallback(async () => {
        if (!useCase || !supabase) return;
        setLoading(true);
        setError(null);
        try {
            const data = await useCase.getAgents();
            const filteredData = data.filter(a => (isAdministrator && showDeleted) ? true : !a.deleted);
            
            setAgents(filteredData);
        } catch (err: any) {
            console.error("Error fetching agents:", err);
            // Handle specifically the "relation does not exist" error (missing table)
            if (err?.code === '42P01') {
                setError("Table 'ai_agents' missing. Go to Dashboard to copy/run SQL.");
            } else {
                setError(err.message || JSON.stringify(err) || "Failed to load agents.");
            }
        } finally {
            setLoading(false);
        }
    }, [useCase, supabase, showDeleted, isAdministrator]);

    useEffect(() => {
        if (hasSupabase) fetchAgents();
    }, [hasSupabase, fetchAgents]);

    const saveAgent = async (id: string | null, agent: Partial<AIAgent>) => {
        if (!useCase) return false;
        try {
            await useCase.saveAgent(id, agent);
            await fetchAgents();
            return true;
        } catch (err: any) {
            const msg = getFriendlyErrorMessage(err);
            alert("Error saving agent: " + msg);
            return false;
        }
    };

    const deleteAgent = async (id: string) => {
        if (!useCase) return;
        try {
            await useCase.deleteAgent(id);
            await fetchAgents();
        } catch (err: any) {
                const msg = getFriendlyErrorMessage(err);
                alert("Error deleting agent: " + msg);
        }
    };

    const restoreAgent = async (id: string) => {
        if (!useCase) return;
        try {
            await useCase.restoreAgent(id);
            await fetchAgents();
        } catch (err: any) {
            const msg = getFriendlyErrorMessage(err);
            alert("Error restoring agent: " + msg);
        }
    };

    const sendMessage = async (agent: AIAgent, message: string) => {
        if (!useCase) return;
        setIsChatting(true);
        try {
            // Optimistic update
            const newHistory = [...chatHistory, { role: 'user' as const, parts: [{ text: message }] }];
            setChatHistory(newHistory);

            const responseText = await useCase.chatWithAgent(agent, chatHistory, message);
            
            setChatHistory([...newHistory, { role: 'model' as const, parts: [{ text: responseText }] }]);
        } catch (err: any) {
            console.error(err);
            setChatHistory(prev => [...prev, { role: 'model' as const, parts: [{ text: "Error: " + (err.message || "Unknown error") }] }]);
        } finally {
            setIsChatting(false);
        }
    };

    const clearChat = () => {
        setChatHistory([]);
    };

    return {
        agents,
        loading,
        error,
        chatHistory,
        isChatting,
        fetchAgents,
        saveAgent,
        deleteAgent,
        restoreAgent,
        isAdmin: isAdministrator, showDeleted, setShowDeleted,
        sendMessage,
        clearChat
    };
};
