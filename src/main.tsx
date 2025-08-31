import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW, initPWAInstall } from "./utils/pwa.ts";

// Register service worker and initialize PWA install prompt
registerSW();
initPWAInstall();

createRoot(document.getElementById("root")!).render(<App />);
