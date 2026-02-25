import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Same Id as what we set on the generated HTML
createRoot(document.getElementById('root')!).render(<App />)
