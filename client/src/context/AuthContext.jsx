import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [character, setCharacter] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dnd_character')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function selectCharacter(char) {
    setCharacter(char);
    sessionStorage.setItem('dnd_character', JSON.stringify(char));
  }

  function clearCharacter() {
    setCharacter(null);
    sessionStorage.removeItem('dnd_character');
  }

  async function login(username, password) {
    const data = await api.post('/auth/login', { username, password });
    setUser(data);
    clearCharacter();
    return data;
  }

  async function register(username, password, role = 'player') {
    const data = await api.post('/auth/register', { username, password, role });
    setUser(data);
    clearCharacter();
    return data;
  }

  async function logout() {
    await api.post('/auth/logout', {});
    setUser(null);
    clearCharacter();
  }

  return (
    <AuthContext.Provider value={{ user, character, loading, login, register, logout, selectCharacter, clearCharacter }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
