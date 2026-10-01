-- =============================================================================
-- V3: Fix duplicate / dead columns added to `users` by V2
-- =============================================================================
-- V2 added two columns to `users` that duplicate data already modeled and
-- working since V1, and neither was ever mapped in User.java (dead columns):
--
--   - `status`  (NVARCHAR 'ACTIVE'/'INACTIVE') duplicates the existing
--     `is_active` BOOLEAN, which AuthService already checks on every login.
--   - `role_id` (single FK to roles) duplicates the existing `user_roles`
--     many-to-many table, which User.roles (@ManyToMany) already uses.
--     V2's one-time backfill picked an ARBITRARY role for any user with more
--     than one row in `user_roles` (non-deterministic UPDATE...FROM JOIN).
--
-- Decision: keep the original, already-working mechanism for each
-- (`is_active`, `user_roles`), drop the newer duplicates. `full_name`,
-- `phone`, `warehouse_id` are NOT duplicates — they're genuinely new and are
-- now mapped in User.java in this same change, so they are kept as-is.
-- =============================================================================

-- --- Drop `status` (duplicate of is_active) ---------------------------------

-- The CHECK constraint on `status` was declared inline in V2, so SQL Server
-- gave it an auto-generated name — look it up before dropping.
DECLARE @checkConstraintName NVARCHAR(200);
SELECT @checkConstraintName = cc.name
FROM sys.check_constraints cc
JOIN sys.columns col
  ON cc.parent_object_id = col.object_id AND cc.parent_column_id = col.column_id
WHERE cc.parent_object_id = OBJECT_ID('users') AND col.name = 'status';

IF @checkConstraintName IS NOT NULL
    EXEC('ALTER TABLE users DROP CONSTRAINT ' + @checkConstraintName);

IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'df_users_status')
    ALTER TABLE users DROP CONSTRAINT df_users_status;

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'status')
    ALTER TABLE users DROP COLUMN status;

-- --- Drop `role_id` (duplicate of user_roles) -------------------------------

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_users_role')
    ALTER TABLE users DROP CONSTRAINT fk_users_role;

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'role_id')
    ALTER TABLE users DROP COLUMN role_id;
