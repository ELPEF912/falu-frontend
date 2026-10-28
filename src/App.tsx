import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Vender from './pages/Vender';
import ProductDetail from './pages/ProductDetail';
import MisProductos from './pages/MisProductos';
import MisCompras from './pages/MisCompras';
import Favoritos from './pages/Favoritos';
import Carrito from './pages/Carrito';
import Perfil from './pages/Perfil';
import CondicionesUso from './pages/CondicionesUso';
import Ayuda from './pages/Ayuda';
import TiendaVendedor from './pages/TiendaVendedor';
import Notificaciones from './pages/Notificaciones';
import AdminPanel from './pages/AdminPanel';
import AuditoriaDetalle from './pages/AuditoriaDetalle';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/vender" element={<Vender />} />
            <Route path="/producto/:id" element={<ProductDetail />} />
            <Route path="/vendedor/:idVendedor" element={<TiendaVendedor />} />
            <Route path="/mis-productos" element={<MisProductos />} />
            <Route path="/mis-compras" element={<MisCompras />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/condiciones-uso" element={<CondicionesUso />} />
            <Route path="/ayuda" element={<Ayuda />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/auditoria/:idLog" element={<AuditoriaDetalle />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;