ALTER TABLE dbo.inventory_transactions
    ADD transaction_no NVARCHAR(50) NULL,
        line_no INT NULL;
GO

UPDATE dbo.inventory_transactions
SET transaction_no = CASE
        WHEN transaction_type = 'TRANSFER_OUT' AND RIGHT(transaction_code, 4) = '-OUT'
            THEN LEFT(transaction_code, LEN(transaction_code) - 4)
        WHEN transaction_type = 'TRANSFER_IN' AND RIGHT(transaction_code, 3) = '-IN'
            THEN LEFT(transaction_code, LEN(transaction_code) - 3)
        ELSE transaction_code
    END,
    line_no = CASE
        WHEN transaction_type = 'TRANSFER_IN' THEN 2
        ELSE 1
    END;
GO

ALTER TABLE dbo.inventory_transactions
    ALTER COLUMN transaction_no NVARCHAR(50) NOT NULL;
GO

ALTER TABLE dbo.inventory_transactions
    ALTER COLUMN line_no INT NOT NULL;
GO

ALTER TABLE dbo.inventory_transactions
    ADD CONSTRAINT chk_inv_txn_line_no_positive CHECK (line_no > 0),
        CONSTRAINT uq_inv_txn_transaction_line UNIQUE (transaction_no, line_no);
