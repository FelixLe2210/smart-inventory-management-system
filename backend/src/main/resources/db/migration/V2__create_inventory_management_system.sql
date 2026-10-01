-- =============================================================================
-- SMART INVENTORY MANAGEMENT SYSTEM (SIMS)
-- Group: C1SE.58 - Duy Tan University
-- Capstone 1 - Database Schema v1.0 (Transact-SQL for SQL Server)
-- =============================================================================

-- =============================================================================
-- 1. MODULE M2: USER, ROLE & MASTER DATA
-- =============================================================================

-- Table: warehouses
CREATE TABLE warehouses (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(20) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    address NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Upgrade users table with Capstone fields using defaults so existing rows are automatically populated
ALTER TABLE users ADD full_name NVARCHAR(100) NOT NULL CONSTRAINT df_users_full_name DEFAULT N'Quản trị viên hệ thống';
ALTER TABLE users ADD phone NVARCHAR(20) NULL;
ALTER TABLE users ADD role_id BIGINT NULL;
ALTER TABLE users ADD warehouse_id BIGINT NULL;
ALTER TABLE users ADD status NVARCHAR(20) NOT NULL CONSTRAINT df_users_status DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- Populate role_id dynamically from user_roles
EXEC('UPDATE u SET u.role_id = ur.role_id FROM users u INNER JOIN user_roles ur ON u.id = ur.user_id WHERE u.role_id IS NULL');

-- Add foreign key constraints to users table
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id);
ALTER TABLE users ADD CONSTRAINT fk_users_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE SET NULL;

-- Ensure ROLE_PROCUREMENT / PROCUREMENT exists in roles
IF NOT EXISTS (SELECT 1 FROM roles WHERE name IN ('PROCUREMENT', 'ROLE_PROCUREMENT'))
BEGIN
    INSERT INTO roles (name, description) VALUES ('PROCUREMENT', N'Nhân viên mua hàng / Cung ứng');
END

-- Table: categories
CREATE TABLE categories (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(30) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Table: suppliers
CREATE TABLE suppliers (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code NVARCHAR(30) NOT NULL UNIQUE,
    name NVARCHAR(150) NOT NULL,
    contact_name NVARCHAR(100) NULL,
    email NVARCHAR(100) NULL,
    phone NVARCHAR(20) NULL,
    address NVARCHAR(255) NULL,
    lead_time_days INT NOT NULL DEFAULT 7,
    reliability_score DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Table: products
CREATE TABLE products (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sku NVARCHAR(50) NOT NULL UNIQUE,
    barcode NVARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(150) NOT NULL,
    description NVARCHAR(MAX) NULL,
    category_id BIGINT NOT NULL,
    supplier_id BIGINT NULL,
    unit NVARCHAR(30) NOT NULL DEFAULT N'Cái',
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    min_stock_level INT NOT NULL DEFAULT 10,
    max_stock_level INT NOT NULL DEFAULT 500,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL
);
CREATE NONCLUSTERED INDEX idx_products_sku ON products(sku);
CREATE NONCLUSTERED INDEX idx_products_barcode ON products(barcode);

-- =============================================================================
-- 2. MODULE M1: CORE INVENTORY & TRANSACTIONS
-- =============================================================================

-- Table: inventories (Product x Warehouse current balance)
CREATE TABLE inventories (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    reserved_stock INT NOT NULL DEFAULT 0,
    location_in_warehouse NVARCHAR(50) NULL,
    last_stock_count_at DATETIME2 NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uk_inventories_prod_wh UNIQUE (product_id, warehouse_id),
    CONSTRAINT fk_inventories_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_inventories_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT chk_current_stock_non_negative CHECK (current_stock >= 0),
    CONSTRAINT chk_reserved_stock_non_negative CHECK (reserved_stock >= 0)
);

-- Table: inventory_transactions (Audit trail of every stock change)
CREATE TABLE inventory_transactions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    transaction_code NVARCHAR(50) NOT NULL UNIQUE,
    transaction_type NVARCHAR(30) NOT NULL CHECK (transaction_type IN ('RECEIVING', 'ISSUING', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT')),
    product_id BIGINT NOT NULL,
    source_warehouse_id BIGINT NULL,
    destination_warehouse_id BIGINT NULL,
    quantity INT NOT NULL,
    balance_before INT NOT NULL,
    balance_after INT NOT NULL,
    reference_doc_type NVARCHAR(50) NULL,
    reference_doc_id BIGINT NULL,
    reason NVARCHAR(255) NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_inv_txn_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_inv_txn_source_wh FOREIGN KEY (source_warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_inv_txn_dest_wh FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_inv_txn_user FOREIGN KEY (created_by) REFERENCES users (id)
);
CREATE NONCLUSTERED INDEX idx_txn_type_date ON inventory_transactions(transaction_type, created_at);
CREATE NONCLUSTERED INDEX idx_txn_product_wh ON inventory_transactions(product_id, source_warehouse_id, destination_warehouse_id);

-- =============================================================================
-- 3. MODULE M3: PURCHASING & PURCHASE ORDERS
-- =============================================================================

-- Table: purchase_orders
CREATE TABLE purchase_orders (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    po_number NVARCHAR(50) NOT NULL UNIQUE,
    supplier_id BIGINT NOT NULL,
    destination_warehouse_id BIGINT NOT NULL,
    status NVARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    order_date DATETIME2 NOT NULL DEFAULT GETDATE(),
    expected_delivery_date DATE NULL,
    actual_delivery_date DATE NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    note NVARCHAR(MAX) NULL,
    ai_recommendation_id BIGINT NULL,
    created_by BIGINT NOT NULL,
    approved_by BIGINT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
    CONSTRAINT fk_po_warehouse FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_po_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
);
CREATE NONCLUSTERED INDEX idx_po_status ON purchase_orders(status);

-- Table: purchase_order_items
CREATE TABLE purchase_order_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    ordered_qty INT NOT NULL,
    received_qty INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT chk_ordered_qty_positive CHECK (ordered_qty > 0),
    CONSTRAINT chk_received_qty_valid CHECK (received_qty >= 0)
);

-- =============================================================================
-- 4. MODULE M4: AI SUPPORTING DATA & REAL-TIME ALERTS
-- =============================================================================

-- Table: demand_forecasts (AI #1 Output)
CREATE TABLE demand_forecasts (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    forecast_date DATE NOT NULL,
    target_date DATE NOT NULL,
    horizon_days INT NOT NULL,
    predicted_quantity DECIMAL(10,2) NOT NULL,
    actual_quantity DECIMAL(10,2) NULL,
    model_name NVARCHAR(50) NOT NULL DEFAULT 'XGBOOST',
    model_version NVARCHAR(20) NOT NULL DEFAULT 'v1.0',
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_forecast_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_forecast_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
);
CREATE NONCLUSTERED INDEX idx_forecast_lookup ON demand_forecasts(product_id, warehouse_id, target_date);

-- Table: reorder_recommendations (AI #2 Output)
CREATE TABLE reorder_recommendations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    recommendation_code NVARCHAR(50) NOT NULL UNIQUE,
    product_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    demand_forecast_id BIGINT NULL,
    current_stock INT NOT NULL,
    incoming_stock INT NOT NULL DEFAULT 0,
    supplier_lead_time_days INT NOT NULL,
    safety_stock INT NOT NULL,
    reorder_point INT NOT NULL,
    recommended_order_qty INT NOT NULL,
    suggested_order_date DATE NOT NULL,
    urgency_level NVARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (urgency_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED')),
    purchase_order_id BIGINT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_rec_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_rec_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_rec_forecast FOREIGN KEY (demand_forecast_id) REFERENCES demand_forecasts (id),
    CONSTRAINT fk_rec_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id)
);
CREATE NONCLUSTERED INDEX idx_rec_status_urgency ON reorder_recommendations(status, urgency_level);

-- Table: notifications (Real-time Alert Center)
CREATE TABLE notifications (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NULL,
    target_role NVARCHAR(50) NULL,
    type NVARCHAR(30) NOT NULL CHECK (type IN ('LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_SUGGESTION', 'PO_STATUS_CHANGED', 'SYSTEM')),
    title NVARCHAR(150) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    reference_id BIGINT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE NONCLUSTERED INDEX idx_notif_unread ON notifications(user_id, is_read, created_at);
