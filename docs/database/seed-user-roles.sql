/*
    Seeds the canonical roles for the User_Role_WMS database.
    Safe to run repeatedly: existing roles are left unchanged.
    Run this script in SSMS after selecting the target database.
*/

USE [User_Role_WMS];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

INSERT INTO dbo.Roles (RoleName, Description, CreatedAt)
SELECT seed.RoleName, seed.Description, SYSUTCDATETIME()
FROM (VALUES
    (N'Admin', N'Manages users, roles, system configuration, and all warehouse operations.'),
    (N'Warehouse Staff', N'Performs receiving, put-away, picking, packing, dispatch, and stock movement tasks.'),
    (N'Warehouse Manager', N'Supervises warehouse operations, approves adjustments, and reviews inventory reports.'),
    (N'Procurement Staff', N'Creates and tracks purchase requests and purchase orders.' )
) AS seed(RoleName, Description)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.Roles AS existingRole
    WHERE existingRole.RoleName = seed.RoleName
);

COMMIT TRANSACTION;
GO

SELECT RoleId, RoleName, Description, CreatedAt
FROM dbo.Roles
WHERE RoleName IN (
    N'Admin',
    N'Warehouse Staff',
    N'Warehouse Manager',
    N'Procurement Staff'
)
ORDER BY RoleName;
GO