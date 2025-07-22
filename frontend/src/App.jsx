import './index.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/common/Navbar/Navbar';
import Reserva from './pages/Reserva';
import HomePage from './pages/HomePage';
import BuscarCliente from './pages/BuscarCliente';
import Admin from './pages/Admin';
import { AuthProvider } from './context/AuthContext'; // Solo AuthProvider
import Unauthorized from './pages/Unauthorized';
import Preferencias from './pages/Preferencia';
import MisReservas from './pages/MisReservas';
import AdminRoute from './components/admin/AdminRoute';
import React from 'react';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reserva" element={<Reserva />} />
            <Route path="/clientes/buscar" element={<BuscarCliente />} />
            <Route path="/preferencias" element={<Preferencias />} />
            <Route path="/mis-reservas" element={<MisReservas />} />
            <Route path="/Admin/*" element={<AdminRoute />}>
              <Route index element={<Admin />} />
            </Route>
            <Route path="/unauthorized" element={<Unauthorized />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;