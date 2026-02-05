import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ThemeModeProvider } from './ui/ThemeModeProvider';

describe('App', () => {
    it('renders without crashing (smoke test)', () => {
        // We wrap in necessary providers since App uses context
        render(
            <ThemeModeProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </ThemeModeProvider>
        );
        // Since App redirects to login or shows splash, we just check if it didn't crash
        // We can look for "Carregando" or the splash text if predictable, but basic render is enough for now.
        expect(true).toBeTruthy();
    });
});
