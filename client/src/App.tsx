import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Landing from './routes/Landing';
import NotFound from './routes/NotFound';

// The application routes (/apply/*) arrive with the application shell. Until then they show the 404 page.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
