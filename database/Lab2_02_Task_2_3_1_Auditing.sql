USE RestaurantDB;
GO

IF OBJECT_ID('dbo.OrdersLogs', 'U') IS NOT NULL
    DROP TABLE dbo.OrdersLogs;
GO

CREATE TABLE dbo.OrdersLogs
(
    Id int NOT NULL IDENTITY(1,1),
    OrderId int NOT NULL,
    ModifyDate datetime NOT NULL,
    CONSTRAINT PK_ORDERLOGS PRIMARY KEY(Id)
);
GO


IF OBJECT_ID('dbo.tr_OrdersLoging', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_OrdersLoging;
GO

CREATE TRIGGER tr_OrdersLoging
ON dbo.Orders
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.OrdersLogs(OrderId, ModifyDate)
    SELECT OrderID, GETDATE()
    FROM inserted;
END
GO

UPDATE dbo.Orders
SET [Check_no] = 12345
WHERE OrderID = 1;
GO

UPDATE dbo.Orders
SET PaymentType = N'Безготівковий'
WHERE OrderID IN (2, 3);
GO

SELECT * FROM dbo.OrdersLogs;
GO
