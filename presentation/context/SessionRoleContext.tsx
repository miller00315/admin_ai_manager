import React, { createContext, useContext, useMemo } from 'react';
import { UserRole } from '../../types';

export interface SessionRoleValue {
    userRole: UserRole;
    /** Definido uma vez após o login em App.tsx; não repetir query em app_users só para isso */
    isAdministrator: boolean;
    isInstitutionManager: boolean;
    isTeacher: boolean;
    isStudent: boolean;
}

const SessionRoleContext = createContext<SessionRoleValue | null>(null);

export function SessionRoleProvider({
    userRole,
    children
}: {
    userRole: UserRole;
    children: React.ReactNode;
}) {
    const value = useMemo<SessionRoleValue>(
        () => ({
            userRole,
            isAdministrator: userRole === 'Administrator',
            isInstitutionManager: userRole === 'Institution',
            isTeacher: userRole === 'Teacher',
            isStudent: userRole === 'Student'
        }),
        [userRole]
    );

    return <SessionRoleContext.Provider value={value}>{children}</SessionRoleContext.Provider>;
}

/**
 * Papel do usuário resolvido no fluxo de autenticação (sem nova ida ao banco só para checar admin).
 */
export function useSessionRole(): SessionRoleValue {
    const ctx = useContext(SessionRoleContext);
    if (!ctx) {
        return {
            userRole: 'Student',
            isAdministrator: false,
            isInstitutionManager: false,
            isTeacher: false,
            isStudent: true
        };
    }
    return ctx;
}
