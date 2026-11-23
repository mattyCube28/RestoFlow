

USE RestaurantDB;
GO

DELETE FROM dbo.Orders WHERE Check_no IN (2001, 2002, 2003, 2004);
GO

SELECT
    d.DishID,
    d.Name AS DishName,
    COUNT(o.OrderID) AS OrdersCount,
    ISNULL(SUM(o.Quantity), 0) AS TotalSoldQuantity
FROM dbo.Dishes d
LEFT JOIN dbo.Orders o ON d.DishID = o.DishID
GROUP BY d.DishID, d.Name
ORDER BY d.DishID;
GO
)
IF OBJECT_ID('dbo.tr_PreventOver100Sales', 'TR') IS NOT NULL
    DROP TRIGGER dbo.tr_PreventOver100Sales;
GO

CREATE TRIGGER tr_PreventOver100Sales
ON dbo.Orders
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM dbo.Orders o
        WHERE o.DishID IN (SELECT DISTINCT DishID FROM inserted)
        GROUP BY o.DishID
        HAVING SUM(o.Quantity) > 100 OR COUNT(o.OrderID) > 100
    )
    BEGIN
        DECLARE @ExceededDishName NVARCHAR(60);
        DECLARE @TotalQty INT;

        SELECT TOP 1
            @ExceededDishName = d.Name,
            @TotalQty = SUM(o.Quantity)
        FROM dbo.Orders o
        JOIN dbo.Dishes d ON o.DishID = d.DishID
        WHERE o.DishID IN (SELECT DISTINCT DishID FROM inserted)
        GROUP BY d.Name
        HAVING SUM(o.Quantity) > 100 OR COUNT(o.OrderID) > 100;

        RAISERROR (N'Помилка! Додавання заборонено: для страви "%s" загальний обсяг продажів (%d од.) перевищує ліміт у 100 продажів!', 16, 1, @ExceededDishName, @TotalQty);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END
GO

INSERT INTO dbo.Orders (Check_no, DishID, StaffID, OrderDate, Quantity, PaymentType)
VALUES
    (2001, 1, 2, GETDATE(), 5, N'Картка'),
    (2002, 2, 2, GETDATE(), 6, N'Готівка');
GO

SELECT
    d.DishID,
    d.Name AS DishName,
    COUNT(o.OrderID) AS OrdersCount,
    ISNULL(SUM(o.Quantity), 0) AS TotalSoldQuantity
FROM dbo.Dishes d
JOIN dbo.Orders o ON d.DishID = o.DishID
WHERE d.DishID IN (1, 2)
GROUP BY d.DishID, d.Name;
GO


IF OBJECT_ID('tempdb..#NewOrdersBatch') IS NOT NULL
    DROP TABLE #NewOrdersBatch;

CREATE TABLE #NewOrdersBatch (
    Check_no INT,
    DishID INT,
    StaffID INT,
    OrderDate DATE,
    Quantity INT,
    PaymentType NVARCHAR(20)
);

INSERT INTO #NewOrdersBatch VALUES
    (2003, 3, 4, GETDATE(), 5, N'Картка'),  
    (2004, 1, 2, GETDATE(), 3, N'Картка');  

INSERT INTO dbo.Orders (Check_no, DishID, StaffID, OrderDate, Quantity, PaymentType)
SELECT Check_no, DishID, StaffID, OrderDate, Quantity, PaymentType
FROM #NewOrdersBatch;
GO

SELECT
    d.DishID,
    d.Name AS DishName,
    COUNT(o.OrderID) AS OrdersCount,
    ISNULL(SUM(o.Quantity), 0) AS TotalSoldQuantity
FROM dbo.Dishes d
JOIN dbo.Orders o ON d.DishID = o.DishID
WHERE d.DishID IN (1, 2, 3)
GROUP BY d.DishID, d.Name;
GO
