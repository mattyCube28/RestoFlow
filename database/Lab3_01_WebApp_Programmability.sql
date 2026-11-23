-- ============================================================================
-- Лабораторна робота №3: Програмні об'єкти T-SQL для REST Веб-застосунку RestoFlow
-- Студент: Єрьоменко М.М., гр. ПЗПІ-24-2, Варіант 5 (15)
-- ============================================================================

USE RestaurantDB;
GO

-- 1. Очищення тестових дублікатів страв із Лаб 2 та додавання повноцінного асортименту меню
DELETE FROM dbo.Dishes
WHERE DishID > 7
  AND NOT EXISTS (SELECT 1 FROM dbo.Orders o WHERE o.DishID = dbo.Dishes.DishID);
GO

-- Тимчасово вимикаємо тригер обмеження робочого часу для початкового наповнення демо-меню
DISABLE TRIGGER dbo.createOrdersTrigger ON dbo.Dishes;
GO

INSERT INTO dbo.Dishes (Name, CategoryID, Price, Quantity, Producer, SupplierID, RestID, Description)
VALUES
(N'Піца Пепероні Supreme', 5, 295.0, 35, N'Власне виробництво', 1, 3, N'Хрустка скоринка, пікантна салямі пепероні, моцарела та томатний соус'),
(N'Піца Чотири Сири Melt', 5, 315.0, 28, N'Власне виробництво', 1, 1, N'Моцарела, горгонзола, пармезан та витриманий чеддер на вершковій основі'),
(N'Локшина WOK з куркою теріякі', 4, 235.0, 45, N'Імпорт "Азія-Фуд Преміум"', 4, 4, N'Пшенична локшина удон, філе курки на вогні, кунжут та овочі вок'),
(N'Каре телятини на грилі', 2, 520.0, 18, N'Ферма "М''ясна Традиція"', 2, 1, N'Соковите каре на кістці з розмарином та соусом деміглас'),
(N'Салат Грецький із фетою', 3, 175.0, 50, N'Агрокомплекс "Свіжі Овочі"', 3, 2, N'Свіжі томати, огірки, маслини Каламата, сир фета та орегано');
GO

ENABLE TRIGGER dbo.createOrdersTrigger ON dbo.Dishes;
GO

-- 2. Скалярна функція №1 (з Лабораторної роботи №1, Варіант 5):
-- Повертає інформацію про найбільше замовлення за назвою страви
CREATE OR ALTER FUNCTION dbo.fn_GetMaxOrderForDish (@DishName NVARCHAR(60))
RETURNS NVARCHAR(200)
AS
BEGIN
    DECLARE @Result NVARCHAR(200);
    DECLARE @MaxQty INT;
    DECLARE @OrdID INT;
    DECLARE @CheckNo INT;

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
        @CheckNo = o.Check_no,
        @MaxQty = o.Quantity
    FROM dbo.Orders o
    JOIN dbo.Dishes d ON o.DishID = d.DishID
    WHERE d.Name = @DishName
    ORDER BY o.Quantity DESC, o.OrderID DESC;

    SET @Result = N'Найбільше замовлення №' + CAST(@OrdID AS NVARCHAR)
                + N' (Чек #' + CAST(@CheckNo AS NVARCHAR) + N'), Кількість: '
                + CAST(@MaxQty AS NVARCHAR) + N' порц.';
    RETURN @Result;
END;
GO

-- 3. Скалярна функція №2:
-- Підрахунок кількості позицій страв у заданому цеху/категорії (відділі)
CREATE OR ALTER FUNCTION dbo.fn_GetCategoryDishCount (@CategoryID INT)
RETURNS INT
AS
BEGIN
    DECLARE @Count INT;
    SELECT @Count = COUNT(*)
    FROM dbo.Dishes
    WHERE (@CategoryID = 0 OR CategoryID = @CategoryID);
    RETURN ISNULL(@Count, 0);
END;
GO

-- 4. Таблична функція (Inline Table-Valued Function для ЛР №1/№3):
-- Повертає аналітичну таблицю страв обраної категорії (або всіх при @CategoryID = 0)
-- із підрахунком кількості замовлень, проданих порцій, виручки та залишку до ліміту тригера (100 од.)
CREATE OR ALTER FUNCTION dbo.fn_GetDishesAnalyticsByCategory (@CategoryID INT)
RETURNS TABLE
AS
RETURN
(
    SELECT
        d.DishID,
        d.Name AS DishName,
        ISNULL(c.CategoryName, N'Без категорії') AS CategoryName,
        ISNULL(c.KitchenStation, N'Загальний цех') AS KitchenStation,
        ISNULL(r.Name, N'Усі заклади') AS RestaurantName,
        d.Price,
        d.Quantity AS InStockQuantity,
        COUNT(o.OrderID) AS OrdersCount,
        ISNULL(SUM(o.Quantity), 0) AS TotalSoldQuantity,
        ISNULL(SUM(o.Quantity * d.Price), 0) AS TotalRevenue,
        CASE
            WHEN 100 - ISNULL(SUM(o.Quantity), 0) < 0 THEN 0
            ELSE 100 - ISNULL(SUM(o.Quantity), 0)
        END AS RemainingQuotaTo100
    FROM dbo.Dishes d
    LEFT JOIN dbo.MenuCategories c ON d.CategoryID = c.CategoryID
    LEFT JOIN dbo.Restaurants r ON d.RestID = r.RestID
    LEFT JOIN dbo.Orders o ON d.DishID = o.DishID
    WHERE (@CategoryID = 0 OR d.CategoryID = @CategoryID)
    GROUP BY
        d.DishID, d.Name, c.CategoryName, c.KitchenStation, r.Name, d.Price, d.Quantity
);
GO

-- 5. Збережена процедура №1 (Додавання нового замовлення / продажу з користувацькими виключеннями):
-- Перевіряє коректність параметрів, наявність страви на складі та викликає INSERT у dbo.Orders
-- (де також автоматично спрацьовує тригер tr_PreventOver100Sales із Лаб 2, якщо сума продажів > 100)
CREATE OR ALTER PROCEDURE dbo.sp_CreateOrder
    @CheckNo INT,
    @DishID INT,
    @StaffID INT,
    @Quantity INT,
    @PaymentType NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF @CheckNo <= 0
    BEGIN
        RAISERROR (N'Користувацька помилка БД (sp_CreateOrder): Номер чека (%d) має бути додатним числом!', 16, 1, @CheckNo);
        RETURN;
    END

    IF @Quantity <= 0
    BEGIN
        RAISERROR (N'Користувацька помилка БД (sp_CreateOrder): Кількість порцій (%d) повинна бути більшою за 0!', 16, 1, @Quantity);
        RETURN;
    END

    DECLARE @DishName NVARCHAR(60);
    DECLARE @AvailableStock INT;

    SELECT @DishName = Name, @AvailableStock = Quantity
    FROM dbo.Dishes
    WHERE DishID = @DishID;

    IF @DishName IS NULL
    BEGIN
        RAISERROR (N'Користувацька помилка БД (sp_CreateOrder): Страву з кодом ID=%d не знайдено у меню!', 16, 1, @DishID);
        RETURN;
    END

    IF @Quantity > @AvailableStock
    BEGIN
        RAISERROR (N'Користувацька помилка БД (sp_CreateOrder): Недостатній залишок страви "%s" на складі! Доступно: %d порц., замовлено: %d порц.', 16, 1, @DishName, @AvailableStock, @Quantity);
        RETURN;
    END

    BEGIN TRANSACTION;

    -- Зменшуємо залишок на складі
    UPDATE dbo.Dishes
    SET Quantity = Quantity - @Quantity
    WHERE DishID = @DishID;

    -- Додаємо замовлення (тут також перевіряється тригер tr_PreventOver100Sales на ліміт 100 продажів)
    INSERT INTO dbo.Orders (Check_no, DishID, StaffID, OrderDate, Quantity, PaymentType)
    VALUES (@CheckNo, @DishID, @StaffID, CAST(GETDATE() AS DATE), @Quantity, @PaymentType);

    IF @@ERROR <> 0 OR @@TRANCOUNT = 0
    BEGIN
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        RETURN;
    END

    COMMIT TRANSACTION;
END;
GO

-- 6. Збережена процедура №2 (Додавання нової страви в меню з валідацією та перевіркою тригера createOrdersTrigger):
CREATE OR ALTER PROCEDURE dbo.sp_AddMenuDish
    @Name NVARCHAR(60),
    @CategoryID INT,
    @Price FLOAT,
    @Quantity INT,
    @SupplierID INT,
    @RestID INT,
    @Description NVARCHAR(250)
AS
BEGIN
    SET NOCOUNT ON;

    IF LTRIM(RTRIM(ISNULL(@Name, N''))) = N''
    BEGIN
        RAISERROR (N'Користувацька помилка БД (sp_AddMenuDish): Назва страви не може бути порожньою!', 16, 1);
        RETURN;
    END

    IF @Price <= 0
    BEGIN
        DECLARE @PriceStr NVARCHAR(30) = CAST(CAST(@Price AS DECIMAL(10,2)) AS NVARCHAR(30));
        RAISERROR (N'Користувацька помилка БД (sp_AddMenuDish): Ціна страви (%s грн) має бути більшою за 0!', 16, 1, @PriceStr);
        RETURN;
    END

    IF @Quantity < 0
    BEGIN
        RAISERROR (N'Користувацька помилка БД (sp_AddMenuDish): Кількість порцій (%d) не може бути від''ємною!', 16, 1, @Quantity);
        RETURN;
    END

    DECLARE @ProducerName NVARCHAR(80);
    SELECT @ProducerName = CompanyName FROM dbo.Suppliers WHERE SupplierID = @SupplierID;
    SET @ProducerName = ISNULL(@ProducerName, N'Власне виробництво');

    -- Вставка в dbo.Dishes проходить через INSTEAD OF INSERT тригер createOrdersTrigger (Лаб 2)
    INSERT INTO dbo.Dishes (Name, CategoryID, Price, Quantity, Producer, SupplierID, RestID, Description)
    VALUES (@Name, @CategoryID, @Price, @Quantity, @ProducerName, @SupplierID, @RestID, @Description);
END;
GO

-- 7. Збережена процедура №3 (з Лабораторної роботи №1, Завдання 14):
-- Видаляє співробітників (крім Manager), що працюють у ресторанах із сумарним обсягом продажів менше заданого порогу
CREATE OR ALTER PROCEDURE dbo.sp_RemoveUnderperformingStaff
    @MinSalesThreshold FLOAT
AS
BEGIN
    SET NOCOUNT ON;

    IF @MinSalesThreshold < 0
    BEGIN
        RAISERROR (N'Користувацька помилка БД (sp_RemoveUnderperformingStaff): Поріг виручки не може бути від''ємним!', 16, 1);
        RETURN;
    END

    -- Знаходимо співробітників (окрім Manager) із ресторанів, де виручка менша за @MinSalesThreshold
    DECLARE @StaffToRemove TABLE (StaffID INT);

    INSERT INTO @StaffToRemove (StaffID)
    SELECT s.StaffID
    FROM dbo.Staff s
    WHERE s.Information <> N'Manager'
      AND s.RestID IN (
          SELECT r.RestID
          FROM dbo.Restaurants r
          LEFT JOIN dbo.Dishes d ON r.RestID = d.RestID
          LEFT JOIN dbo.Orders o ON d.DishID = o.DishID
          GROUP BY r.RestID
          HAVING ISNULL(SUM(d.Price * o.Quantity), 0) < @MinSalesThreshold
      );

    -- Відв'язуємо історичні замовлення (Orders.StaffID = NULL), щоб не порушувати FK_Orders_Staff при звільненні
    UPDATE dbo.Orders
    SET StaffID = NULL
    WHERE StaffID IN (SELECT StaffID FROM @StaffToRemove);

    -- Реально видаляємо співробітників із таблиці dbo.Staff
    DELETE FROM dbo.Staff
    WHERE StaffID IN (SELECT StaffID FROM @StaffToRemove);
END;
GO
