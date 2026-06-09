import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { ProtectedRoute, DMRoute } from './components/ProtectedRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { CampaignSelectPage } from './pages/CampaignSelectPage.jsx';
import { CharacterSelectPage } from './pages/CharacterSelectPage.jsx';
import { MarketPage } from './pages/MarketPage.jsx';
import { StoreDetailPage } from './pages/StoreDetailPage.jsx';
import { CharacterPage } from './pages/CharacterPage.jsx';
import { DMDashboardPage } from './pages/DMDashboardPage.jsx';
import { DMStorePage } from './pages/DMStorePage.jsx';
import { DMCharactersPage } from './pages/DMCharactersPage.jsx';
import { DMCharacterPage } from './pages/DMCharacterPage.jsx';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#1a1208]">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Campaign selection — shown after login, no campaign required */}
          <Route path="/" element={
            <ProtectedRoute>
              <CampaignSelectPage />
            </ProtectedRoute>
          } />

          {/* Character selection — requires campaign */}
          <Route path="/characters" element={
            <ProtectedRoute requireCampaign>
              <CharacterSelectPage />
            </ProtectedRoute>
          } />

          <Route path="/market" element={
            <ProtectedRoute requireCampaign requireCharacter>
              <Layout><MarketPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/market/:id" element={
            <ProtectedRoute requireCampaign requireCharacter>
              <Layout><StoreDetailPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/character" element={
            <ProtectedRoute requireCampaign requireCharacter>
              <Layout><CharacterPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/dm" element={
            <DMRoute>
              <Layout><DMDashboardPage /></Layout>
            </DMRoute>
          } />

          <Route path="/dm/stores/:id" element={
            <DMRoute>
              <Layout><DMStorePage /></Layout>
            </DMRoute>
          } />

          <Route path="/dm/characters" element={
            <DMRoute>
              <Layout><DMCharactersPage /></Layout>
            </DMRoute>
          } />

          <Route path="/dm/characters/:id" element={
            <DMRoute>
              <Layout><DMCharacterPage /></Layout>
            </DMRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
