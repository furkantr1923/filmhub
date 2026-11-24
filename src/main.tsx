import { createRoot } from 'react-dom/client';
import { App } from './App';
import './platform/platform';

const container = document.getElementById('root');
if (!container) throw new Error('#root bulunamadı');
createRoot(container).render(<App />);
