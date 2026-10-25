import { createContext, useContext } from 'react';

export type UserRole = 'admin' | 'hr' | 'employee';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  employeeId?: string;
  mustChangePassword?: boolean;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
