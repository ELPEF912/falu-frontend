import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

export interface ItemCarrito {
  id_producto: number;
  id_vendedor?: number;
  titulo: string;
  precio: number;
  imagen_url?: string | null;
  stock_maximo: number;
  cantidad: number;
}

interface CartContextType {
  items: ItemCarrito[];
  agregarAlCarrito: (producto: {
    id_producto: number;
    id_vendedor?: number;
    titulo: string;
    precio: number;
    precio_oferta?: number | null;
    imagen_url?: string | null;
    stock: number;
  }) => void;
  cambiarCantidad: (id_producto: number, nuevaCantidad: number) => void;
  eliminarDelCarrito: (id_producto: number) => void;
  vaciarCarrito: () => void;
  sincronizarStockCarrito: () => void;
  totalItems: number;
  precioTotal: number;
  hayProductosSinStock: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const storageKey = user
    ? `falu_carrito_usuario_${user.id_usuario}`
    : 'falu_carrito_invitado';

  // Sincroniza el stock_maximo de los ítems del carrito con el catálogo actual
  const sincronizarStockCarrito = () => {
    const guardado = localStorage.getItem(storageKey);
    if (!guardado) {
      setItems([]);
      return;
    }

    try {
      const listaCarrito: ItemCarrito[] = JSON.parse(guardado);
      const catalogoLocal = JSON.parse(
        localStorage.getItem('falu_productos_locales') || '[]'
      );

      const sincronizados = listaCarrito.map((item) => {
        const prodActual = catalogoLocal.find(
          (p: any) => String(p.id_producto) === String(item.id_producto)
        );
        if (!prodActual) return item;

        const stockReal = Math.max(0, Number(prodActual.stock ?? 0));
        return {
          ...item,
          precio: Number(prodActual.precio ?? item.precio),
          stock_maximo: stockReal,
          // Si no hay stock, mantenemos el 1 en carrito para mostrar la alerta y bloquear la compra
          cantidad: stockReal === 0 ? 1 : Math.min(item.cantidad, stockReal)
        };
      });

      setItems(sincronizados);
      localStorage.setItem(storageKey, JSON.stringify(sincronizados));
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    sincronizarStockCarrito();

    if (isAuthenticated) {
      api
        .get('/cart')
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setItems(res.data);
          }
        })
        .catch(() => {});
    }

    window.addEventListener('storage', sincronizarStockCarrito);
    window.addEventListener('falu_actualizacion', sincronizarStockCarrito);
    return () => {
      window.removeEventListener('storage', sincronizarStockCarrito);
      window.removeEventListener('falu_actualizacion', sincronizarStockCarrito);
    };
  }, [storageKey, isAuthenticated]);

  const persistirCarrito = (nuevosItems: ItemCarrito[]) => {
    setItems(nuevosItems);
    localStorage.setItem(storageKey, JSON.stringify(nuevosItems));
  };

  // Registra al usuario en la lista de espera para notificarle cuando vuelva el stock
  const registrarSuscripcionStock = (idProducto: number, titulo: string) => {
    if (!user) return;
    const alertas: { id_usuario: number; id_producto: number; titulo: string }[] =
      JSON.parse(localStorage.getItem('falu_alertas_stock') || '[]');

    const yaExiste = alertas.some(
      (a) =>
        Number(a.id_usuario) === Number(user.id_usuario) &&
        String(a.id_producto) === String(idProducto)
    );

    if (!yaExiste) {
      alertas.push({
        id_usuario: user.id_usuario,
        id_producto: idProducto,
        titulo
      });
      localStorage.setItem('falu_alertas_stock', JSON.stringify(alertas));
    }
  };

  const agregarAlCarrito: CartContextType['agregarAlCarrito'] = (prod) => {
    if (user && prod.id_vendedor && Number(prod.id_vendedor) === Number(user.id_usuario)) {
      return;
    }

    const stockActual = Math.max(0, Number(prod.stock ?? 0));

    // Si no tiene stock, igual lo dejamos añadir con cantidad 1 y lo anotamos para avisarle por notificación
    if (stockActual === 0) {
      registrarSuscripcionStock(prod.id_producto, prod.titulo);
    }

    const precioFinal =
      prod.precio_oferta && prod.precio_oferta > 0 && prod.precio_oferta < prod.precio
        ? Number(prod.precio_oferta)
        : Number(prod.precio);

    const existente = items.find(
      (i) => String(i.id_producto) === String(prod.id_producto)
    );

    if (existente) {
      if (stockActual === 0) {
        const actualizados = items.map((i) =>
          String(i.id_producto) === String(prod.id_producto)
            ? { ...i, cantidad: 1, stock_maximo: 0 }
            : i
        );
        persistirCarrito(actualizados);
      } else {
        const nuevaCant = Math.min(existente.cantidad + 1, stockActual);
        const actualizados = items.map((i) =>
          String(i.id_producto) === String(prod.id_producto)
            ? { ...i, cantidad: nuevaCant, stock_maximo: stockActual }
            : i
        );
        persistirCarrito(actualizados);
      }
    } else {
      const nuevoItem: ItemCarrito = {
        id_producto: prod.id_producto,
        id_vendedor: prod.id_vendedor,
        titulo: prod.titulo,
        precio: precioFinal,
        imagen_url: prod.imagen_url,
        stock_maximo: stockActual,
        cantidad: 1 // Aparece un 1 incluso si stock_maximo es 0
      };
      persistirCarrito([...items, nuevoItem]);
    }
  };

  const cambiarCantidad = (id_producto: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(id_producto);
      return;
    }
    const actualizados = items.map((item) => {
      if (String(item.id_producto) !== String(id_producto)) return item;
      if (item.stock_maximo === 0) return { ...item, cantidad: 1 };
      const cantValidada = Math.min(nuevaCantidad, item.stock_maximo);
      return { ...item, cantidad: cantValidada };
    });
    persistirCarrito(actualizados);
  };

  const eliminarDelCarrito = (id_producto: number) => {
    const actualizados = items.filter(
      (item) => String(item.id_producto) !== String(id_producto)
    );
    persistirCarrito(actualizados);

    if (user) {
      const alertas = JSON.parse(localStorage.getItem('falu_alertas_stock') || '[]');
      const filtradas = alertas.filter(
        (a: any) =>
          !(
            Number(a.id_usuario) === Number(user.id_usuario) &&
            String(a.id_producto) === String(id_producto)
          )
      );
      localStorage.setItem('falu_alertas_stock', JSON.stringify(filtradas));
    }
  };

  const vaciarCarrito = () => {
    persistirCarrito([]);
  };

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
  const precioTotal = items.reduce(
    (acc, item) => acc + Number(item.precio) * item.cantidad,
    0
  );
  const hayProductosSinStock = items.some((item) => item.stock_maximo <= 0);

  return (
    <CartContext.Provider
      value={{
        items,
        agregarAlCarrito,
        cambiarCantidad,
        eliminarDelCarrito,
        vaciarCarrito,
        sincronizarStockCarrito,
        totalItems,
        precioTotal,
        hayProductosSinStock
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de un CartProvider');
  return context;
};