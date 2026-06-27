import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
    persist(
        (set, get) => ({
            cart: [],
            isSenior: false,

            addToCart: (product, quantity = 1, priceOverride = null) => {
                const { cart } = get();
                const existingItem = cart.find(item => item.id === product.id);
                const appliedPrice = priceOverride !== null ? priceOverride : product.price;

                if (existingItem) {
                    const newQty = existingItem.quantity + quantity;
                    if (newQty > product.stock_quantity) {
                        const allowedQty = product.stock_quantity - existingItem.quantity;
                        if (allowedQty <= 0) return;
                        set({
                            cart: cart.map(item => item.id === product.id
                                ? { ...item, price: appliedPrice, quantity: product.stock_quantity }
                                : item)
                        });
                        return;
                    }
                    set({
                        cart: cart.map(item => item.id === product.id
                            ? { ...item, price: appliedPrice, quantity: newQty }
                            : item)
                    });
                } else {
                    const finalQty = Math.min(quantity, product.stock_quantity);
                    if (finalQty < 1) return;
                    set({ cart: [...cart, { ...product, price: appliedPrice, quantity: finalQty }] });
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