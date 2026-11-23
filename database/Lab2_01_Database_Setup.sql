USE RestaurantDB;
GO

IF OBJECT_ID('dbo.MenuCategories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuCategories (
        CategoryID INT IDENTITY(1,1) CONSTRAINT PK_MenuCategories PRIMARY KEY,
        CategoryName NVARCHAR(50) NOT NULL UNIQUE,
        KitchenStation NVARCHAR(50) NOT NULL,
        IsSeasonal BIT NOT NULL DEFAULT 0
    );

    INSERT INTO dbo.MenuCategories (CategoryName, KitchenStation, IsSeasonal) VALUES
    (N'Перші страви', N'Гарячий цех', 0),
    (N'М''ясні страви та гриль', N'Мангал-цех', 0),
    (N'Салати та закуски', N'Холодний цех', 0),
    (N'Паназія та WOK', N'WOK-станція', 0),
    (N'Піца та випічка', N'Піца-піч', 1);
END
GO

IF OBJECT_ID('dbo.Suppliers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Suppliers (
        SupplierID INT IDENTITY(1,1) CONSTRAINT PK_Suppliers PRIMARY KEY,
        CompanyName NVARCHAR(80) NOT NULL UNIQUE,
        ContactPhone VARCHAR(20) NOT NULL,
        City NVARCHAR(40) NOT NULL,
        ReliabilityScore INT CONSTRAINT CK_Suppliers_Score CHECK (ReliabilityScore BETWEEN 1 AND 10) DEFAULT 8
    );

    INSERT INTO dbo.Suppliers (CompanyName, ContactPhone, City, ReliabilityScore) VALUES
    (N'Власне виробництво мережі', '+380501112233', N'Харків', 10),
    (N'Ферма "М''ясна"', '+380672223344', N'Полтава', 9),
    (N'Агрокомплекс', '+380633334455', N'Херсон', 8),
    (N'Азія-Фуд', '+380974445566', N'Київ', 9);
END
GO


IF COL_LENGTH('dbo.Restaurants', 'City') IS NULL
BEGIN
    ALTER TABLE dbo.Restaurants
    ADD City NVARCHAR(40) NOT NULL CONSTRAINT DF_Restaurants_City DEFAULT N'Харків',
        Rating DECIMAL(3,2) NOT NULL CONSTRAINT DF_Restaurants_Rating DEFAULT 4.75
        CONSTRAINT CK_Restaurants_Rating CHECK (Rating BETWEEN 1.00 AND 5.00);
END
GO

IF COL_LENGTH('dbo.Dishes', 'CategoryID') IS NULL
BEGIN
    ALTER TABLE dbo.Dishes
    ADD CategoryID INT NULL CONSTRAINT FK_Dishes_Categories FOREIGN KEY REFERENCES dbo.MenuCategories(CategoryID),
        SupplierID INT NULL CONSTRAINT FK_Dishes_Suppliers FOREIGN KEY REFERENCES dbo.Suppliers(SupplierID);
END
GO

IF COL_LENGTH('dbo.Orders', 'StaffID') IS NULL
BEGIN
    ALTER TABLE dbo.Orders
    ADD StaffID INT NULL CONSTRAINT FK_Orders_Staff FOREIGN KEY REFERENCES dbo.Staff(StaffID),
        PaymentType NVARCHAR(20) NOT NULL CONSTRAINT DF_Orders_Payment DEFAULT N'Картка';
END
GO

UPDATE dbo.Dishes SET CategoryID = 1, SupplierID = 1 WHERE DishID = 1; 
UPDATE dbo.Dishes SET CategoryID = 2, SupplierID = 2 WHERE DishID = 2; 
UPDATE dbo.Dishes SET CategoryID = 3, SupplierID = 3 WHERE DishID = 3; 
UPDATE dbo.Dishes SET CategoryID = 5, SupplierID = 1 WHERE DishID = 4; 
UPDATE dbo.Dishes SET CategoryID = 4, SupplierID = 4 WHERE DishID = 5; 
UPDATE dbo.Dishes SET CategoryID = 3, SupplierID = 3 WHERE DishID = 6; 
GO

IF (SELECT ISNULL(SUM(Quantity), 0) FROM dbo.Orders WHERE DishID = 1) < 95
BEGIN
    DECLARE @CurrentSum INT = (SELECT ISNULL(SUM(Quantity), 0) FROM dbo.Orders WHERE DishID = 1);
    INSERT INTO dbo.Orders (Check_no, DishID, StaffID, OrderDate, Quantity, PaymentType)
    VALUES (1003, 1, 2, '2026-10-03', 95 - @CurrentSum, N'Картка');
END
GO

SELECT * FROM dbo.Restaurants;
SELECT * FROM dbo.MenuCategories;
SELECT * FROM dbo.Suppliers;
SELECT * FROM dbo.Staff;
SELECT * FROM dbo.Dishes;
SELECT * FROM dbo.Orders;
GO
