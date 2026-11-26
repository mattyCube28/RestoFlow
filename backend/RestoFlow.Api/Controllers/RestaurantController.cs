using System.Data;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using RestoFlow.Api.Data;
using RestoFlow.Api.Models;

namespace RestoFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RestaurantController : ControllerBase
{
    private readonly DbConnectionFactory _dbFactory;

    public RestaurantController(DbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    // =========================================================================
    // ПУНКТ 1: Виведення інформації з таблиць та Master-Detail без дублювання
    // =========================================================================

    /// <summary>
    /// Отримати всі страви меню із приєднаними даними категорій, постачальників, ресторанів та підсумками продажів.
    /// </summary>
    [HttpGet("dishes")]
    public async Task<IActionResult> GetAllDishes([FromQuery] int? categoryId = null, [FromQuery] string? search = null)
    {
        using var conn = _dbFactory.CreateConnection();
        const string sql = @"
            SELECT
                d.DishID,
                d.Name,
                d.CategoryID,
                ISNULL(c.CategoryName, N'Без категорії') AS CategoryName,
                ISNULL(c.KitchenStation, N'Загальний цех') AS KitchenStation,
                ISNULL(c.IsSeasonal, 0) AS IsSeasonal,
                ISNULL(d.Price, 0) AS Price,
                ISNULL(d.Quantity, 0) AS Quantity,
                ISNULL(d.Producer, N'Власне виробництво') AS Producer,
                d.SupplierID,
                ISNULL(s.CompanyName, ISNULL(d.Producer, N'Не вказано')) AS SupplierCompany,
                ISNULL(s.City, N'Харків') AS SupplierCity,
                d.RestID,
                ISNULL(r.Name, N'Мережа RestoFlow') AS RestaurantName,
                ISNULL(r.City, N'Харків') AS RestaurantCity,
                ISNULL(r.Rating, 4.80) AS RestaurantRating,
                ISNULL(d.Description, N'') AS Description,
                COUNT(o.OrderID) AS OrdersCount,
                ISNULL(SUM(o.Quantity), 0) AS TotalSoldQuantity,
                ISNULL(SUM(o.Quantity * d.Price), 0) AS TotalRevenue
            FROM dbo.Dishes d
            LEFT JOIN dbo.MenuCategories c ON d.CategoryID = c.CategoryID
            LEFT JOIN dbo.Suppliers s ON d.SupplierID = s.SupplierID
            LEFT JOIN dbo.Restaurants r ON d.RestID = r.RestID
            LEFT JOIN dbo.Orders o ON d.DishID = o.DishID
            WHERE (@CategoryId IS NULL OR @CategoryId = 0 OR d.CategoryID = @CategoryId)
              AND (@Search IS NULL OR @Search = N'' OR d.Name LIKE N'%' + @Search + N'%' OR c.CategoryName LIKE N'%' + @Search + N'%' OR r.Name LIKE N'%' + @Search + N'%')
            GROUP BY
                d.DishID, d.Name, d.CategoryID, c.CategoryName, c.KitchenStation, c.IsSeasonal,
                d.Price, d.Quantity, d.Producer, d.SupplierID, s.CompanyName, s.City,
                d.RestID, r.Name, r.City, r.Rating, d.Description
            ORDER BY d.DishID;";

        var dishes = await conn.QueryAsync<DishCardDto>(sql, new { CategoryId = categoryId, Search = search });
        return Ok(dishes);
    }

    /// <summary>
    /// ПУНКТ 1 (Master-Detail без дублювання):
    /// Повертає детальну інформацію про одну страву (1 об'єкт) + повний список її продажів з таблиці Orders/Staff
    /// за допомогою Dapper QueryMultipleAsync.
    /// </summary>
    [HttpGet("dishes/{id:int}/details")]
    public async Task<IActionResult> GetDishMasterDetail(int id)
    {
        using var conn = _dbFactory.CreateConnection();
        const string multiSql = @"
            -- Запит 1: Master-інформація про страву (без дублювання рядків)
            SELECT
                d.DishID,
                d.Name,
                d.CategoryID,
                ISNULL(c.CategoryName, N'Без категорії') AS CategoryName,
                ISNULL(c.KitchenStation, N'Загальний цех') AS KitchenStation,
                ISNULL(c.IsSeasonal, 0) AS IsSeasonal,
                ISNULL(d.Price, 0) AS Price,
                ISNULL(d.Quantity, 0) AS Quantity,
                ISNULL(d.Producer, N'Власне виробництво') AS Producer,
                d.SupplierID,
                ISNULL(s.CompanyName, ISNULL(d.Producer, N'Не вказано')) AS SupplierCompany,
                ISNULL(s.City, N'Харків') AS SupplierCity,
                d.RestID,
                ISNULL(r.Name, N'Мережа RestoFlow') AS RestaurantName,
                ISNULL(r.City, N'Харків') AS RestaurantCity,
                ISNULL(r.Rating, 4.80) AS RestaurantRating,
                ISNULL(d.Description, N'') AS Description,
                COUNT(o.OrderID) AS OrdersCount,
                ISNULL(SUM(o.Quantity), 0) AS TotalSoldQuantity,
                ISNULL(SUM(o.Quantity * d.Price), 0) AS TotalRevenue
            FROM dbo.Dishes d
            LEFT JOIN dbo.MenuCategories c ON d.CategoryID = c.CategoryID
            LEFT JOIN dbo.Suppliers s ON d.SupplierID = s.SupplierID
            LEFT JOIN dbo.Restaurants r ON d.RestID = r.RestID
            LEFT JOIN dbo.Orders o ON d.DishID = o.DishID
            WHERE d.DishID = @DishID
            GROUP BY
                d.DishID, d.Name, d.CategoryID, c.CategoryName, c.KitchenStation, c.IsSeasonal,
                d.Price, d.Quantity, d.Producer, d.SupplierID, s.CompanyName, s.City,
                d.RestID, r.Name, r.City, r.Rating, d.Description;

            -- Запит 2: Detail-список усіх продажів цієї страви з інформацією про офіціанта
            SELECT
                o.OrderID,
                o.Check_no AS CheckNo,
                o.OrderDate,
                o.Quantity,
                (o.Quantity * ISNULL(d.Price, 0)) AS LineTotal,
                ISNULL(o.PaymentType, N'Картка') AS PaymentType,
                o.StaffID,
                ISNULL(st.Name, N'Не призначено') AS StaffName,
                ISNULL(st.Information, N'Waiter') AS StaffRole
            FROM dbo.Orders o
            JOIN dbo.Dishes d ON o.DishID = d.DishID
            LEFT JOIN dbo.Staff st ON o.StaffID = st.StaffID
            WHERE o.DishID = @DishID
            ORDER BY o.OrderDate DESC, o.OrderID DESC;";

        using var multi = await conn.QueryMultipleAsync(multiSql, new { DishID = id });
        var dish = await multi.ReadFirstOrDefaultAsync<DishCardDto>();
        if (dish == null)
        {
            return NotFound(new { error = true, message = $"Страву з ID={id} не знайдено." });
        }

        var sales = (await multi.ReadAsync<DishOrderItemDto>()).ToList();

        // Викликаємо також скалярну функцію з ЛР №1 для відображення рекордного замовлення
        var maxOrderText = await conn.ExecuteScalarAsync<string>(
            "SELECT dbo.fn_GetMaxOrderForDish(@DishName)",
            new { DishName = dish.Name }) ?? string.Empty;

        return Ok(new DishMasterDetailDto
        {
            Dish = dish,
            MaxOrderHighlight = maxOrderText,
            SalesHistory = sales
        });
    }

    /// <summary>
    /// Довідкові дані: категорії меню, ресторани, постачальники, персонал та журнали аудиту.
    /// </summary>
    [HttpGet("lookup")]
    public async Task<IActionResult> GetLookupData()
    {
        using var conn = _dbFactory.CreateConnection();
        const string sql = @"
            SELECT
                c.CategoryID,
                c.CategoryName,
                c.KitchenStation,
                c.IsSeasonal,
                dbo.fn_GetCategoryDishCount(c.CategoryID) AS DishCount
            FROM dbo.MenuCategories c
            ORDER BY c.CategoryID;

            SELECT
                r.RestID,
                r.Name,
                ISNULL(r.City, N'Харків') AS City,
                ISNULL(r.Rating, 4.75) AS Rating,
                ISNULL(r.Info, N'') AS Info,
                ISNULL((
                    SELECT SUM(d.Price * o.Quantity)
                    FROM dbo.Dishes d
                    JOIN dbo.Orders o ON d.DishID = o.DishID
                    WHERE d.RestID = r.RestID
                ), 0) AS TotalRevenue,
                (SELECT COUNT(*) FROM dbo.Staff st WHERE st.RestID = r.RestID) AS StaffCount
            FROM dbo.Restaurants r
            ORDER BY r.RestID;

            SELECT SupplierID, CompanyName, ContactPhone, City, ReliabilityScore
            FROM dbo.Suppliers
            ORDER BY SupplierID;

            SELECT
                st.StaffID,
                st.Name,
                ISNULL(st.Address, N'') AS Address,
                st.Phone,
                st.Salary,
                st.RestID,
                ISNULL(r.Name, N'Невідомий') AS RestaurantName,
                ISNULL(st.Information, N'Waiter') AS Information,
                ISNULL((
                    SELECT SUM(d.Price * o.Quantity)
                    FROM dbo.Dishes d
                    JOIN dbo.Orders o ON d.DishID = o.DishID
                    WHERE d.RestID = st.RestID
                ), 0) AS RestaurantRevenue
            FROM dbo.Staff st
            LEFT JOIN dbo.Restaurants r ON st.RestID = r.RestID
            ORDER BY st.RestID, st.StaffID;

            SELECT TOP 15 LogId, DishName, AttemptDate, UserLogin, StatusMessage
            FROM dbo.DishesAttemptLogs
            ORDER BY LogId DESC;

            SELECT TOP 15
                ol.Id,
                ol.OrderId,
                o.Check_no AS CheckNo,
                d.Name AS DishName,
                o.PaymentType,
                ol.ModifyDate
            FROM dbo.OrdersLogs ol
            LEFT JOIN dbo.Orders o ON ol.OrderId = o.OrderID
            LEFT JOIN dbo.Dishes d ON o.DishID = d.DishID
            ORDER BY ol.Id DESC;

            SELECT
                OBJECT_NAME(t.parent_id) AS TableName,
                t.name AS TriggerName,
                CASE
                    WHEN t.is_instead_of_trigger = 1 THEN 'INSTEAD OF INSERT'
                    WHEN OBJECTPROPERTY(t.object_id, 'ExecIsUpdateTrigger') = 1 THEN 'AFTER UPDATE'
                    WHEN OBJECTPROPERTY(t.object_id, 'ExecIsInsertTrigger') = 1 THEN 'AFTER INSERT'
                    ELSE 'DML TRIGGER'
                END AS TriggerType,
                t.is_disabled AS IsDisabled,
                t.create_date AS CreatedDate
            FROM sys.triggers t
            WHERE t.parent_class = 1
            ORDER BY TableName, TriggerName;";

        using var multi = await conn.QueryMultipleAsync(sql);
        var categories = await multi.ReadAsync<MenuCategoryDto>();
        var restaurants = await multi.ReadAsync<RestaurantDto>();
        var suppliers = await multi.ReadAsync<SupplierDto>();
        var staff = await multi.ReadAsync<StaffMemberDto>();
        var auditLogs = await multi.ReadAsync<AuditLogDto>();
        var orderLogs = await multi.ReadAsync<OrderAuditLogDto>();
        var triggers = await multi.ReadAsync<SystemTriggerInfoDto>();

        return Ok(new
        {
            categories,
            restaurants,
            suppliers,
            staff,
            auditLogs,
            orderLogs,
            triggers
        });
    }

    // =========================================================================
    // ПУНКТ 3: Виконання скалярної та табличної функцій (ЛР №1)
    // =========================================================================

    /// <summary>
    /// ПУНКТ 3 (Скалярні функції):
    /// 1) dbo.fn_GetMaxOrderForDish(@DishName) — рекордна кількість проданих порцій для обраної страви (Варіант 5 ЛР №1).
    /// 2) dbo.fn_GetCategoryDishCount(@CategoryID) — підрахунок кількості страв у заданому цеху/відділі.
    /// </summary>
    [HttpGet("functions/scalar")]
    public async Task<IActionResult> ExecuteScalarFunctions([FromQuery] string dishName, [FromQuery] int categoryId = 0)
    {
        using var conn = _dbFactory.CreateConnection();

        var maxOrderInfo = await conn.ExecuteScalarAsync<string>(
            "SELECT dbo.fn_GetMaxOrderForDish(@DishName);",
            new { DishName = dishName });

        var dishCountInCategory = await conn.ExecuteScalarAsync<int>(
            "SELECT dbo.fn_GetCategoryDishCount(@CategoryID);",
            new { CategoryID = categoryId });

        return Ok(new
        {
            dishName,
            maxOrderResult = (maxOrderInfo ?? $"Замовлення для страви відсутні").Replace("«", "").Replace("»", "").Replace("\"", ""),
            categoryId,
            categoryDishCount = dishCountInCategory
        });
    }

    /// <summary>
    /// ПУНКТ 3 (Таблична функція / Table-Valued Function):
    /// Виклик SELECT * FROM dbo.fn_GetDishesAnalyticsByCategory(@CategoryID)
    /// </summary>
    [HttpGet("functions/table")]
    public async Task<IActionResult> ExecuteTableValuedFunction([FromQuery] int categoryId = 0)
    {
        using var conn = _dbFactory.CreateConnection();
        const string sql = @"
            SELECT *
            FROM dbo.fn_GetDishesAnalyticsByCategory(@CategoryID)
            ORDER BY TotalRevenue DESC, DishID ASC;";

        var rows = await conn.QueryAsync<DishAnalyticsRowDto>(sql, new { CategoryID = categoryId });
        var countInDept = await conn.ExecuteScalarAsync<int>(
            "SELECT dbo.fn_GetCategoryDishCount(@CategoryID);",
            new { CategoryID = categoryId });

        return Ok(new
        {
            categoryId,
            totalDishesInDepartment = countInDept,
            sqlExecuted = $"SELECT * FROM dbo.fn_GetDishesAnalyticsByCategory({categoryId});",
            rows
        });
    }

    // =========================================================================
    // ПУНКТ 2 та ПУНКТ 4: Виконання збережених процедур + Обробка виключень БД
    // =========================================================================

    /// <summary>
    /// ПУНКТ 2 та 4: Виклик процедури dbo.sp_CreateOrder для реєстрації продажу.
    /// Перехоплює SqlException від RAISERROR у процедурі або від тригера tr_PreventOver100Sales (ліміт 100 порцій).
    /// </summary>
    [HttpPost("procedures/create-order")]
    public async Task<IActionResult> ExecuteCreateOrderProcedure([FromBody] CreateOrderRequest request)
    {
        using var conn = _dbFactory.CreateConnection();
        try
        {
            var parameters = new DynamicParameters();
            parameters.Add("@CheckNo", request.CheckNo, DbType.Int32);
            parameters.Add("@DishID", request.DishID, DbType.Int32);
            parameters.Add("@StaffID", request.StaffID, DbType.Int32);
            parameters.Add("@Quantity", request.Quantity, DbType.Int32);
            parameters.Add("@PaymentType", request.PaymentType, DbType.String);

            await conn.ExecuteAsync(
                "dbo.sp_CreateOrder",
                parameters,
                commandType: CommandType.StoredProcedure);

            return Ok(new
            {
                success = true,
                procedure = "dbo.sp_CreateOrder",
                message = $"Чек №{request.CheckNo} ({request.Quantity} порц.) успішно оформлено та передано на кухню."
            });
        }
        catch (SqlException ex)
        {
            return BadRequest(BuildSqlErrorResponse(ex, "dbo.sp_CreateOrder / tr_PreventOver100Sales"));
        }
    }

    /// <summary>
    /// ПУНКТ 2 та 4: Виклик процедури dbo.sp_AddMenuDish для додавання нової страви.
    /// Демонструє роботу тригера INSTEAD OF INSERT (createOrdersTrigger з ЛР №2) та користувацьких перевірок RAISERROR.
    /// </summary>
    [HttpPost("procedures/add-dish")]
    public async Task<IActionResult> ExecuteAddMenuDishProcedure([FromBody] AddMenuDishRequest request)
    {
        using var conn = _dbFactory.CreateConnection();
        try
        {
            var parameters = new DynamicParameters();
            parameters.Add("@Name", request.Name, DbType.String);
            parameters.Add("@CategoryID", request.CategoryID, DbType.Int32);
            parameters.Add("@Price", request.Price, DbType.Double);
            parameters.Add("@Quantity", request.Quantity, DbType.Int32);
            parameters.Add("@SupplierID", request.SupplierID, DbType.Int32);
            parameters.Add("@RestID", request.RestID, DbType.Int32);
            parameters.Add("@Description", request.Description, DbType.String);

            await conn.ExecuteAsync(
                "dbo.sp_AddMenuDish",
                parameters,
                commandType: CommandType.StoredProcedure);

            return Ok(new
            {
                success = true,
                procedure = "dbo.sp_AddMenuDish",
                message = $"Страву {request.Name} успішно додано до меню закладу."
            });
        }
        catch (SqlException ex)
        {
            return BadRequest(BuildSqlErrorResponse(ex, "dbo.sp_AddMenuDish / createOrdersTrigger"));
        }
    }

    /// <summary>
    /// ПУНКТ 2 та 4: Виклик процедури з ЛР №1 (Варіант 5, Завдання 14) dbo.sp_RemoveUnderperformingStaff(@MinSalesThreshold).
    /// </summary>
    [HttpPost("procedures/optimize-staff")]
    public async Task<IActionResult> ExecuteRemoveUnderperformingStaff([FromBody] OptimizeStaffRequest request)
    {
        using var conn = _dbFactory.CreateConnection();
        try
        {
            var beforeCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Staff;");

            var parameters = new DynamicParameters();
            parameters.Add("@MinSalesThreshold", request.MinSalesThreshold, DbType.Double);

            await conn.ExecuteAsync(
                "dbo.sp_RemoveUnderperformingStaff",
                parameters,
                commandType: CommandType.StoredProcedure);

            var afterCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Staff;");
            var removedCount = beforeCount - afterCount;

            return Ok(new
            {
                success = true,
                procedure = "dbo.sp_RemoveUnderperformingStaff",
                removedCount,
                remainingCount = afterCount,
                message = $"Оптимізацію змін за планом виручки {request.MinSalesThreshold} грн завершено. Скорочено позицій: {removedCount}."
            });
        }
        catch (SqlException ex)
        {
            return BadRequest(BuildSqlErrorResponse(ex, "dbo.sp_RemoveUnderperformingStaff"));
        }
    }

    /// <summary>
    /// Допоміжний ендпоінт для відновлення повного штату персоналу (включно з Сидоренко С.М. та Ткаченко Т.І.) після демонстрації sp_RemoveUnderperformingStaff
    /// </summary>
    [HttpPost("procedures/restore-demo-staff")]
    public async Task<IActionResult> RestoreDemoStaff()
    {
        using var conn = _dbFactory.CreateConnection();
        const string sql = @"
            IF NOT EXISTS (SELECT 1 FROM dbo.Staff WHERE Name = N'Сидоренко С.М.')
            BEGIN
                INSERT INTO dbo.Staff (Name, Address, Phone, Salary, RestID, Information)
                VALUES (N'Сидоренко С.М.', N'пров. Морський, 7', '+380672002001', 18500.00, 2, N'Waiter');
            END

            IF NOT EXISTS (SELECT 1 FROM dbo.Staff WHERE Name = N'Ткаченко Т.І.')
            BEGIN
                INSERT INTO dbo.Staff (Name, Address, Phone, Salary, RestID, Information)
                VALUES (N'Ткаченко Т.І.', N'вул. Лісова, 8', '+380974004002', 19000.00, 4, N'Waiter');
            END

            IF NOT EXISTS (SELECT 1 FROM dbo.Staff WHERE Name = N'Ковальчук О.В.')
            BEGIN
                INSERT INTO dbo.Staff (Name, Address, Phone, Salary, RestID, Information)
                VALUES (N'Ковальчук О.В.', N'вул. Університетська, 21', '+380503334455', 18000.00, 5, N'Waiter');
            END

            IF NOT EXISTS (SELECT 1 FROM dbo.Staff WHERE Name = N'Мельник Д.С.')
            BEGIN
                INSERT INTO dbo.Staff (Name, Address, Phone, Salary, RestID, Information)
                VALUES (N'Мельник Д.С.', N'вул. Приморська, 14', '+380678889900', 18500.00, 2, N'Bartender');
            END";

        await conn.ExecuteAsync(sql);
        return Ok(new { success = true, message = "Повний склад зміни працівників відновлено." });
    }

    /// <summary>
    /// Реальна робоча дія: Зміна способу оплати чека (UPDATE dbo.Orders), що автоматично запускає тригер tr_OrdersLoging
    /// </summary>
    [HttpPut("orders/{orderId:int}/payment")]
    public async Task<IActionResult> UpdateOrderPayment(int orderId, [FromBody] UpdateOrderPaymentRequest request)
    {
        using var conn = _dbFactory.CreateConnection();
        try
        {
            var affected = await conn.ExecuteAsync(
                "UPDATE dbo.Orders SET PaymentType = @PaymentType WHERE OrderID = @OrderID;",
                new { OrderID = orderId, PaymentType = request.PaymentType });

            if (affected == 0)
            {
                return NotFound(new { error = true, message = $"Чек №{orderId} не знайдено." });
            }

            return Ok(new
            {
                success = true,
                message = $"Спосіб оплати замовлення №{orderId} змінено на {request.PaymentType}."
            });
        }
        catch (SqlException ex)
        {
            return BadRequest(BuildSqlErrorResponse(ex, "dbo.Orders / tr_OrdersLoging"));
        }
    }

    private static object BuildSqlErrorResponse(SqlException ex, string sourceObject)
    {
        var primaryError = ex.Errors.Count > 0 ? ex.Errors[0] : null;
        var cleanMsg = (ex.Message ?? string.Empty)
            .Replace("The transaction ended in the trigger. The batch has been aborted.", "")
            .Replace("\"", "")
            .Replace("«", "")
            .Replace("»", "")
            .Trim();

        return new
        {
            error = true,
            isDatabaseException = true,
            source = sourceObject,
            sqlErrorNumber = ex.Number,
            sqlState = ex.State,
            sqlClass = ex.Class,
            procedureOrTrigger = string.IsNullOrWhiteSpace(ex.Procedure) ? sourceObject : ex.Procedure,
            lineNumber = primaryError?.LineNumber ?? ex.LineNumber,
            message = cleanMsg,
            timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        };
    }
}
