ALTER TABLE dbo.warehouses
    ADD description NVARCHAR(255) NULL,
        region NVARCHAR(20) NOT NULL
            CONSTRAINT df_warehouses_region DEFAULT 'north',
        warehouse_type NVARCHAR(20) NOT NULL
            CONSTRAINT df_warehouses_type DEFAULT 'standard',
        area_sqm DECIMAL(12, 2) NULL,
        capacity_pallets INT NOT NULL
            CONSTRAINT df_warehouses_capacity DEFAULT 0,
        used_pallets INT NOT NULL
            CONSTRAINT df_warehouses_used DEFAULT 0,
        ceiling_height_m DECIMAL(6, 2) NULL,
        dock_count INT NULL,
        floor_load_tons_per_sqm DECIMAL(6, 2) NULL,
        manager_name NVARCHAR(100) NULL,
        manager_email NVARCHAR(100) NULL,
        security_contact NVARCHAR(100) NULL,
        barcode_enabled BIT NOT NULL
            CONSTRAINT df_warehouses_barcode_enabled DEFAULT 1;

GO

ALTER TABLE dbo.warehouses
    ADD CONSTRAINT ck_warehouses_region
        CHECK (region IN ('north', 'central', 'south')),
        CONSTRAINT ck_warehouses_type
        CHECK (warehouse_type IN ('standard', 'cold', 'crossdock', 'fulfillment')),
        CONSTRAINT ck_warehouses_capacity_non_negative
        CHECK (capacity_pallets >= 0 AND used_pallets >= 0),
        CONSTRAINT ck_warehouses_dimensions_non_negative
        CHECK ((area_sqm IS NULL OR area_sqm >= 0)
            AND (ceiling_height_m IS NULL OR ceiling_height_m >= 0)
            AND (dock_count IS NULL OR dock_count >= 0)
            AND (floor_load_tons_per_sqm IS NULL OR floor_load_tons_per_sqm >= 0));
