import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
    persist(
        (set, get) => ({
            cart: [],
            isSenior: false,

            addToCart: (product) => {
                const { cart } = get();
                const existingItem = cart.find(item => item.id === product.id);
                if (existingItem) {
                    if (existingItem.quantity + 1 > product.stock_quantity) return;
                    set({ cart: cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) });
                } else {
                    if (product.stock_quantity < 1) return;
                    set({ cart: [...cart, { ...product, quantity: 1 }] });
                }
            },

            removeFromCart: (productId) => {
                const { cart } = get();
                const existingItem = cart.find(item => item.id === productId);
                if (existingItem.quantity > 1) {
                    set({ cart: cart.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item) });
                } else {
                    set({ cart: cart.filter(item => item.id !== productId) });
                }
            },

            clearCart: () => set({ cart: [], isSenior: false }),
            setCart: (newCart) => set({ cart: newCart }),
            toggleSenior: () => set((state) => ({ isSenior: !state.isSenior })),

            // THIS IS THE FUNCTION CAUSING THE ERROR IF MISSING
            getComputations: () => {
                const { cart, isSenior } = get();
                const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                let discount = 0;
                let total = subtotal;

                if (isSenior) {
                    discount = subtotal * 0.20;
                    total = subtotal - discount;
                }

                return {
                    subtotal: subtotal,
                    discount: Math.round(discount),
                    total: Math.round(total)
                };
            }
        }),
        { name: 'pos-cart-storage' }
    )
);

export default useCartStore;