import { createContext, useContext } from 'react';

export const AuthKeyboardContext = createContext(null);

export function useAuthKeyboardContext() {
  return useContext(AuthKeyboardContext);
}
