import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface ProductoCarrito {
  id_producto: number;
  id_vendedor?: number;
  titulo: string;
  precio: number;
  precio_oferta?: number | null;
  stock: number;
  categoria: string;
  imagen_url?: string | null;
  cantidad: number;
  estado?: 'activo' | 'pausado' | 'oculto';
}

interface CartContextType {
  carrito: ProductoCarrito[];
  agregarAlCarrito: (producto: Omit<ProductoCarrito, 'cantidad'>) => void;
  cambiarCantidad: (id_producto: number, nuevaCantidad: number) => void;
  sincronizarStockRealCarrito: (catalogoActualizado: any[]) => void;
  quitarDelCarrito: (id_producto: number) => void;
  vaciarCarrito: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `falu_carrito_${user.id_usuario}` : 'falu_carrito_invitado';

  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);

  useEffect(() => {
    const guardado = localStorage.getItem(storageKey);
    if (guardado) {
      try {
        setCarrito(JSON.parse(guardado));
      } catch {
        setCarrito([]);
      }
    } else {
      setCarrito([]);
    }
  }, [storageKey]);

  const guardar = (items: ProductoCarrito[]) => {
    setCarrito(items);
    localStorage.setItem(storageKey, JSON.stringify(items));
  };

  const agregarAlCarrito = (producto: Omit<ProductoCarrito, 'cantidad'>) => {
    if (user && producto.id_vendedor && Number(producto.id_vendedor) === Number(user.id_usuario)) {
      alert('No podés agregar a tu carrito un producto publicado por vos mismo.');
      return;
    }

    const stockDisponible = Math.max(0, Number(producto.stock ?? 0));
    const existente = carrito.find((item) => item.id_producto === producto.id_producto);

    if (existente) {
      if (stockDisponible === 0) {
        const actualizadoSinStock = carrito.map((item) =>
          item.id_producto === producto.id_producto
            ? { ...item, stock: 0, cantidad: 1 }
            : item
        );
        guardar(actualizadoSinStock);
        return;
      }

      if (existente.cantidad >= stockDisponible) {
        alert(`Solo hay ${stockDisponible} unidades disponibles en stock.`);
        return;
      }

      const actualizado = carrito.map((item) =>
        item.id_producto === producto.id_producto
          ? { ...item, stock: stockDisponible, cantidad: item.cantidad + 1 }
          : item
      );
      guardar(actualizado);
    } else {
      guardar([
        ...carrito,
        {
          ...producto,
          stock: stockDisponible,
          cantidad: 1
        }
      ]);
    }
  };

  const cambiarCantidad = (id_producto: number, nuevaCantidad: number) => {
    const itemActual = carrito.find((item) => item.id_producto === id_producto);
    if (!itemActual) return;

    const stockMax = Math.max(0, Number(itemActual.stock ?? 0));

    if (stockMax === 0) {
      const fijadoEnUno = carrito.map((item) =>
        item.id_producto === id_producto ? { ...item, cantidad: 1 } : item
      );
      guardar(fijadoEnUno);
      return;
    }

    if (nuevaCantidad < 1) return;

    const cantidadValidada = Math.min(nuevaCantidad, stockMax);
    const actualizado = carrito.map((item) =>
      item.id_producto === id_producto ? { ...item, cantidad: cantidadValidada } : item
    );
    guardar(actualizado);
  };

  // Actualiza el stock, precio y estado de los productos del carrito contra la base de datos en tiempo real
  const sincronizarStockRealCarrito = (catalogoActualizado: any[]) => {
    if (!Array.isArray(catalogoActualizado) || catalogoActualizado.length === 0) return;

    setCarrito((prev) => {
      let huboCambios = false;
      const nuevoCarrito = prev.map((item) => {
        const prodReal = catalogoActualizado.find(
          (p) => String(p.id_producto) === String(item.id_producto)
        );
        if (!prodReal) return item;

        const stockReal = Math.max(0, Number(prodReal.stock ?? 0));
        const precioReal = Number(prodReal.precio ?? item.precio);
        const estadoReal = prodReal.estado || 'activo';

        if (
          stockReal !== item.stock ||
          precioReal !== item.precio ||
          estadoReal !== item.estado
        ) {
          huboCambios = true;
          return {
            ...item,
            stock: stockReal,
            precio: precioReal,
            estado: estadoReal
          };
        }
        return item;
      });

      if (huboCambios) {
        localStorage.setItem(storageKey, JSON.stringify(nuevoCarrito));
        return nuevoCarrito;
      }
      return prev;
    });
  };

  const quitarDelCarrito = (id_producto: number) => {
    guardar(carrito.filter((item) => item.id_producto !== id_producto));
  };

  const vaciarCarrito = () => {
    guardar([]);
  };

  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const subtotal = carrito.reduce((acc, item) => {
    const precioFinal =
      item.precio_oferta && item.precio_oferta > 0 && item.precio_oferta < item.precio
        ? item.precio_oferta
        : item.precio;
    return acc + precioFinal * item.cantidad;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        cambiarCantidad,
        sincronizarStockRealCarrito,
        quitarDelCarrito,
        vaciarCarrito,
        totalItems,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider');
  }
  return context;
};
