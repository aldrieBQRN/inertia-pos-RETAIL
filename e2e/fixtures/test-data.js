export const TEST_USERS = {
    admin: {
        email: 'admin@email.com',
        password: 'password',
        name: 'Store Manager (Admin)',
    },
    cashier: {
        email: 'cashier@email.com',
        password: 'password',
        name: 'John (Cashier 1)',
    },
    super_admin: {
        email: 'dev@email.com',
        password: 'password',
        name: 'System Developer',
    },
};

export const SAMPLE_PRODUCTS = {
    newProduct: {
        name: 'Automated Test Product',
        sku: 'AUTO-' + Date.now().toString().slice(-6),
        barcode: '880' + Math.floor(100000000 + Math.random() * 900000000),
        cost_price: '50.00',
        price: '99.00',
        wholesale_price: '79.00',
        stock_quantity: '50',
    }
};
