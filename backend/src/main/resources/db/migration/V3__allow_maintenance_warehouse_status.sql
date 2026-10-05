IF OBJECT_ID(N'dbo.warehouses', N'U') IS NULL
BEGIN
    THROW 50001, 'Required table dbo.warehouses does not exist.', 1;
END;

DECLARE @statusConstraintName sysname;
DECLARE @dropStatusConstraintSql nvarchar(max);

SELECT TOP (1) @statusConstraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID(N'dbo.warehouses')
  AND definition LIKE N'%status%'
  AND definition LIKE N'%ACTIVE%'
  AND definition LIKE N'%INACTIVE%';

IF @statusConstraintName IS NOT NULL
BEGIN
    SET @dropStatusConstraintSql =
            N'ALTER TABLE dbo.warehouses DROP CONSTRAINT '
            + QUOTENAME(@statusConstraintName);
    EXEC sys.sp_executesql @dropStatusConstraintSql;
END;

ALTER TABLE dbo.warehouses
    ADD CONSTRAINT ck_warehouses_status
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'));
