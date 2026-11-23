namespace RestoFlow.Api.Models;

// 1. Картка страви для головного меню (з приєднаними назвами категорії, ресторану, постачальника та статистикою)
public class DishCardDto
{
    public int DishID { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? CategoryID { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string KitchenStation { get; set; } = string.Empty;
    public bool IsSeasonal { get; set; }
    public double Price { get; set; }
    public int Quantity { get; set; }
    public string Producer { get; set; } = string.Empty;
    public int? SupplierID { get; set; }
    public string SupplierCompany { get; set; } = string.Empty;
    public string SupplierCity { get; set; } = string.Empty;
    public int? RestID { get; set; }
    public string RestaurantName { get; set; } = string.Empty;
    public string RestaurantCity { get; set; } = string.Empty;
    public decimal RestaurantRating { get; set; }
    public string Description { get; set; } = string.Empty;
    public int OrdersCount { get; set; }
    public int TotalSoldQuantity { get; set; }
    public double TotalRevenue { get; set; }
}

// 2. Пов'язаний запис продажу страви (деталізація чеків)
public class DishOrderItemDto
{
    public int OrderID { get; set; }
    public int CheckNo { get; set; }
    public DateTime OrderDate { get; set; }
    public int Quantity { get; set; }
    public double LineTotal { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public int? StaffID { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string StaffRole { get; set; } = string.Empty;
}

// 3. Master-Detail модель: повна інформація про страву БЕЗ дублювання + масив усіх її продажів
public class DishMasterDetailDto
{
    public DishCardDto Dish { get; set; } = new();
    public string MaxOrderHighlight { get; set; } = string.Empty;
    public IEnumerable<DishOrderItemDto> SalesHistory { get; set; } = Enumerable.Empty<DishOrderItemDto>();
}

// 4. Категорії, Ресторани, Постачальники та Персонал
public class MenuCategoryDto
{
    public int CategoryID { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string KitchenStation { get; set; } = string.Empty;
    public bool IsSeasonal { get; set; }
    public int DishCount { get; set; }
}

public class RestaurantDto
{
    public int RestID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public string Info { get; set; } = string.Empty;
    public double TotalRevenue { get; set; }
    public int StaffCount { get; set; }
}

public class SupplierDto
{
    public int SupplierID { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public int ReliabilityScore { get; set; }
}

public class StaffMemberDto
{
    public int StaffID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public decimal? Salary { get; set; }
    public int RestID { get; set; }
    public string RestaurantName { get; set; } = string.Empty;
    public string Information { get; set; } = string.Empty;
    public double RestaurantRevenue { get; set; }
}

// 5. Результат табличної функції dbo.fn_GetDishesAnalyticsByCategory(@CategoryID)
public class DishAnalyticsRowDto
{
    public int DishID { get; set; }
    public string DishName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string KitchenStation { get; set; } = string.Empty;
    public string RestaurantName { get; set; } = string.Empty;
    public double Price { get; set; }
    public int InStockQuantity { get; set; }
    public int OrdersCount { get; set; }
    public int TotalSoldQuantity { get; set; }
    public double TotalRevenue { get; set; }
    public int RemainingQuotaTo100 { get; set; }
}

// 6. Запити на виконання збережених процедур (Stored Procedures)
public class CreateOrderRequest
{
    public int CheckNo { get; set; }
    public int DishID { get; set; }
    public int StaffID { get; set; }
    public int Quantity { get; set; }
    public string PaymentType { get; set; } = "Картка";
}

public class AddMenuDishRequest
{
    public string Name { get; set; } = string.Empty;
    public int CategoryID { get; set; }
    public double Price { get; set; }
    public int Quantity { get; set; }
    public int SupplierID { get; set; }
    public int RestID { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class OptimizeStaffRequest
{
    public double MinSalesThreshold { get; set; }
}

// 7. Журнал аудиту спроб порушення тригерів із Лаб 2
public class AuditLogDto
{
    public int LogId { get; set; }
    public string DishName { get; set; } = string.Empty;
    public DateTime AttemptDate { get; set; }
    public string UserLogin { get; set; } = string.Empty;
    public string StatusMessage { get; set; } = string.Empty;
}
