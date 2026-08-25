import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { ThemeProvider } from './components/theme-provider'
import { CommandPaletteProvider } from './contexts/CommandPaletteContext'
import { SessionGate } from './components/SessionGate'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <CommandPaletteProvider>
        <SessionGate>
          <RouterProvider router={router} />
        </SessionGate>
        <Toaster position="bottom-center" richColors />
      </CommandPaletteProvider>
    </ThemeProvider>
  </StrictMode>,
)
