-- ============================================================================
-- Лабораторна робота №1: Створення БД RestaurantDB, таблиць, функції та процедури
-- Студент: Єрьоменко М.М., гр. ПЗПІ-24-2, Варіант 5 (15)
-- ============================================================================

IF DB_ID('RestaurantDB') IS NULL
BEGIN
    CREATE DATABASE RestaurantDB;
END
GO

USE RestaurantDB;
GO

-- 1. Базові таблиці (Restaurants, Staff, Dishes, Orders)
IF OBJECT_ID('dbo.Restaurants', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Restaurants (
        RestID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL,
        Info NVARCHAR(100)
    );

    INSERT INTO dbo.Restaurants (Name, Info) VALUES
    (N'Центральний', N'Головний ресторан'),
    (N'Південний', N'Ресторан біля моря'),
    (N'Західний', N'Заміський комплекс'),
    (N'Східний', N'Ресторан паназійської кухні'),
    (N'Молодіжний', N'Кафе-бар біля університету');
END
GO

IF OBJECT_ID('dbo.Staff', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Staff (
        StaffID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL,
        Address NVARCHAR(100),
        RestID INT FOREIGN KEY REFERENCES dbo.Restaurants(RestID),
        Information NVARCHAR(50)
    );

    INSERT INTO dbo.Staff (Name, Address, RestID, Information) VALUES
    (N'Іванченко І.', N'вул. Головна, 1', 1, N'Manager'),
    (N'Петренко П.', N'вул. Садова, 15', 1, N'Waiter'),
    (N'Сидоренко С.', N'пров. Морський, 7', 2, N'Waiter'),
    (N'Коваленко К.', N'вул. Студентська, 12', 3, N'Manager'),
    (N'Бойко Б.', N'проспект Миру, 45', 1, N'Chef'),
    (N'Шевченко Ш.', N'вул. Центральна, 99', 4, N'Manager'),
    (N'Ткаченко Т.', N'вул. Лісова, 8', 4, N'Waiter');
END
GO

IF OBJECT_ID('dbo.Dishes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dishes (
        DishID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL,
        Price FLOAT,
        Quantity INT,
        Producer NVARCHAR(50),
        RestID INT FOREIGN KEY REFERENCES dbo.Restaurants(RestID),
        Description NVARCHAR(100)
    );

    INSERT INTO dbo.Dishes (Name, Price, Quantity, Producer, RestID, Description) VALUES
    (N'Борщ', 120.0, 50, N'Власне виробництво', 1, N'Український традиційний'),
    (N'Стейк', 450.0, 20, N'Ферма "М''ясна"', 1, N'Прожарка Medium'),
    (N'Салат Цезар', 150.0, 30, N'Агрокомплекс', 2, N'Свіжі овочі та курка'),
    (N'Піца Маргарита', 250.0, 15, N'Власне виробництво', 3, N'Класична італійська'),
    (N'Том Ям', 320.0, 10, N'Азія-Фуд', 4, N'Гострий тайський суп'),
    (N'Картопля фрі', 80.0, 100, N'Агрокомплекс', 3, N'З кетчупом');
END
GO

IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        Check_no INT NOT NULL,
        DishID INT FOREIGN KEY REFERENCES dbo.Dishes(DishID),
        OrderDate DATE NOT NULL,
        Quantity INT
    );

    INSERT INTO dbo.Orders (Check_no, DishID, OrderDate, Quantity) VALUES
    (1001, 1, '2026-10-01', 2),
    (1002, 1, '2026-10-02', 5),
    (1002, 2, '2026-10-02', 1);
END
GO

-- 2. Скалярна функція (Завдання 5, Лаб 1):
-- За назвою страви повертає дані щодо найбільшого замовлення цього товару
CREATE OR ALTER FUNCTION dbo.fn_GetMaxOrderForDish (@DishName NVARCHAR(50))
RETURNS NVARCHAR(200)
AS
BEGIN
    DECLARE @Result NVARCHAR(200);
    DECLARE @MaxQty INT;
    DECLARE @OrdID INT;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.Orders o
        JOIN dbo.Dishes d ON o.DishID = d.DishID
        WHERE d.Name = @DishName
    )
    BEGIN
        SET @Result = N'Відсутні замовлення товару «' + @DishName + N'»';
        RETURN @Result;
    END

    SELECT TOP 1
        @OrdID = o.OrderID,
        @MaxQty = o.Quantity
    FROM dbo.Orders o
    JOIN dbo.Dishes d ON o.DishID = d.DishID
    WHERE d.Name = @DishName
    ORDER BY o.Quantity DESC;

    SET @Result = N'Найбільше замовлення №' + CAST(@OrdID AS NVARCHAR) + N', Кількість: ' + CAST(@MaxQty AS NVARCHAR);
    RETURN @Result;
END;
GO

-- 3. Збережена процедура (Завдання 14, Лаб 1):
-- Видаляє співробітників (крім Manager), що працюють у ресторанах із сумарним обсягом продажів менше заданого
CREATE OR ALTER PROCEDURE dbo.sp_RemoveUnderperformingStaff
    @MinSalesThreshold FLOAT
AS
BEGIN
    DELETE FROM dbo.Staff
    WHERE Information <> N'Manager'
      AND RestID IN (
          SELECT r.RestID
          FROM dbo.Restaurants r
          LEFT JOIN dbo.Dishes d ON r.RestID = d.RestID
          LEFT JOIN dbo.Orders o ON d.DishID = o.DishID
          GROUP BY r.RestID
          HAVING ISNULL(SUM(d.Price * o.Quantity), 0) < @MinSalesThreshold
      );
END;
GO
