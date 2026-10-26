import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage        from './pages/HomePage';
import BlockDashboard  from './pages/BlockDashboard';
import RoomsPage       from './pages/RoomsPage';
import RoomDetailPage  from './pages/RoomDetailPage';
import RecommendPage   from './pages/RecommendPage';
import ConfirmationPage from './pages/ConfirmationPage';
import LookupPage      from './pages/LookupPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <Routes>
          <Route path="/"                        element={<HomePage />} />
          <Route path="/block/:block"            element={<BlockDashboard />} />
          <Route path="/block/:block/floor/:floor" element={<BlockDashboard />} />
          <Route path="/rooms"                   element={<RoomsPage />} />
          <Route path="/rooms/:roomId"           element={<RoomDetailPage />} />
          <Route path="/recommend"               element={<RecommendPage />} />
          <Route path="/confirmation/:id"        element={<ConfirmationPage />} />
          <Route path="/lookup"                  element={<LookupPage />} />
          <Route path="*"                        element={
            <div className="page-container text-center py-20">
              <p className="text-6xl mb-4">404</p>
              <p className="text-slate-400 mb-6">Page not found</p>
              <a href="/" className="btn-primary inline-block">Go Home</a>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
