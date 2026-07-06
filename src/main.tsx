import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Note: intentionally NOT wrapped in <StrictMode>. Strict mode double-invokes
// effects in dev, which double-initializes the Rapier physics world and can
// crash the WebGL context. Physics-heavy R3F apps commonly opt out.
createRoot(document.getElementById('root')!).render(<App />)
