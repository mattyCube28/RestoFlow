USE RestaurantDB;
GO

IF OBJECT_ID('dbo.createOrdersTrigger', 'TR') IS NOT NULL
    DROP TRIGGER dbo.createOrdersTrigger;
GO

CREATE TRIGGER createOrdersTrigger
ON dbo.Dishes
INSTEAD OF INSERT
AS
BEGIN
    IF ((DATEPART(dw, GETDATE()) = 7) OR (DATEPART(dw, GETDATE()) = 1))
        RAISERROR ('You cannot modify orders at Saturday or Sunday', 16, 1);
    ELSE
        INSERT INTO dbo.Dishes (Name, CategoryID, Price, Quantity, Producer, SupplierID, RestID, Description)
        SELECT Name, CategoryID, ISNULL(Price, 100.0), ISNULL(Quantity, 10), Producer, SupplierID, RestID, Description
        FROM inserted;
END
GO

INSERT INTO dbo.Dishes (Name, CategoryID, Price, Quantity, Producer, SupplierID, RestID, Description)
VALUES (N'Нова страва (тест)', 1, 180.0, 15, N'Власне виробництво', 1, 1, N'Тестова страва');
GO

IF OBJECT_ID('dbo.DishesAttemptLogs', 'U') IS NOT NULL
    DROP TABLE dbo.DishesAttemptLogs;
GO

CREATE TABLE dbo.DishesAttemptLogs
(
    LogId INT NOT NULL IDENTITY(1,1) CONSTRAINT PK_DISHES_ATTEMPT_LOGS PRIMARY KEY,
    DishName NVARCHAR(60) NOT NULL,
    AttemptDate DATETIME NOT NULL DEFAULT GETDATE(),
    UserLogin NVARCHAR(100) NOT NULL DEFAULT SYSTEM_USER,
    StatusMessage NVARCHAR(200) NOT NULL
);
GO

ALTER TRIGGER createOrdersTrigger
ON dbo.Dishes
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;

    IF (
        ((DATEPART(dw, GETDATE()) + @@DATEFIRST - 1) % 7) IN (0, 6)
        OR DATEPART(HOUR, GETDATE()) < 9
        OR DATEPART(HOUR, GETDATE()) >= 18
    )
    BEGIN
        INSERT INTO dbo.DishesAttemptLogs (DishName, AttemptDate, UserLogin, StatusMessage)
        SELECT
            Name,
            GETDATE(),
            SYSTEM_USER,
            N'Спроба додавання страви у вихідний день або поза робочим часом (09:00-18:00)'
        FROM inserted;
        RAISERROR ('You cannot modify orders at Saturday/Sunday or outside working hours (09:00-18:00). Attempt logged.', 16, 1);
    END
    ELSE
    BEGIN
        INSERT INTO dbo.Dishes (Name, CategoryID, Price, Quantity, Producer, SupplierID, RestID, Description)
        SELECT Name, CategoryID, ISNULL(Price, 100.0), ISNULL(Quantity, 10), Producer, SupplierID, RestID, Description
        FROM inserted;
    END
END
GO

INSERT INTO dbo.Dishes (Name) VALUES (N'New Dish Weekend Test');
GO

SELECT * FROM dbo.DishesAttemptLogs;
GO
