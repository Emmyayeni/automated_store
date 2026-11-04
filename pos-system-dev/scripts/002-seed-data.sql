-- Insert sample users
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@hardypos.com', '$2b$10$example_hash_admin', 'Admin', 'User', 'admin'),
('manager@hardypos.com', '$2b$10$example_hash_manager', 'Manager', 'User', 'manager'),
('cashier@hardypos.com', '$2b$10$example_hash_cashier', 'Cashier', 'User', 'cashier');

INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Food & Beverage', 'Food and drink products'),
('Books', 'Books and educational materials');

INSERT INTO products (name, description, sku, barcode, price, cost, category_id, stock_quantity) VALUES
('Wireless Headphones', 'Bluetooth wireless headphones', 'WH001', '1234567890123', 99.99, 50.00, (SELECT id FROM categories WHERE name = 'Electronics'), 25),
('Cotton T-Shirt', 'Basic cotton t-shirt', 'TS001', '1234567890124', 19.99, 8.00, (SELECT id FROM categories WHERE name = 'Clothing'), 50),
('Coffee Beans', 'Premium coffee beans 1lb', 'CB001', '1234567890125', 12.99, 6.00, (SELECT id FROM categories WHERE name = 'Food & Beverage'), 30),
('Programming Book', 'Learn JavaScript programming', 'BK001', '1234567890126', 39.99, 20.00, (SELECT id FROM categories WHERE name = 'Books'), 15);

INSERT INTO customers (first_name, last_name, email, phone, loyalty_points) VALUES
('John', 'Doe', 'john.doe@email.com', '555-0123', 150),
('Jane', 'Smith', 'jane.smith@email.com', '555-0124', 75),
('Bob', 'Johnson', 'bob.johnson@email.com', '555-0125', 200);
