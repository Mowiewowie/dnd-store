import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export function renderWithProviders(ui, { route = '/' } = {}) {
  window.history.pushState({}, '', route);
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
}
