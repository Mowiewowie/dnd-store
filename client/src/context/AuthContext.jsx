import { createContext, useContext, useState, useEffect } from 'react';
import { api, setCampaignId } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [campaign, setCampaignState] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dnd_campaign')); } catch { return null; }
  });
  const [character, setCharacter] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dnd_character')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Restore campaign header on page load
  useEffect(() => {
    if (campaign?.id) setCampaignId(campaign.id);
  }, []);

  useEffect(() => {
    api.get('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function selectCampaign(camp) {
    setCampaignState(camp);
    sessionStorage.setItem('dnd_campaign', JSON.stringify(camp));
    setCampaignId(camp.id);
    // Clear character when switching campaigns
    clearCharacter();
  }

  function clearCampaign() {
    setCampaignState(null);
    sessionStorage.removeItem('dnd_campaign');
    setCampaignId(null);
    clearCharacter();
  }

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
    clearCampaign();
    return data;
  }

  async function register(username, password, role = 'player') {
    const data = await api.post('/auth/register', { username, password, role });
    setUser(data);
    clearCampaign();
    return data;
  }

  async function logout() {
    await api.post('/auth/logout', {});
    setUser(null);
    clearCampaign();
  }

  return (
    <AuthContext.Provider value={{
      user, campaign, character, loading,
      login, register, logout,
      selectCampaign, clearCampaign,
      selectCharacter, clearCharacter,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
