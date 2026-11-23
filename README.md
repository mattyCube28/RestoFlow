# RestoFlow — Restaurant Chain POS & DBMS Analytics Platform

Enterprise-grade restaurant chain management & POS analytics platform powered by **MS SQL Server**, **ASP.NET Core 8 Web API + Dapper**, and **React + TypeScript + Vite + Tailwind CSS**.

> **Дисципліна:** Серверні рішення баз даних (СРБД) — Лабораторна робота №3  
> **Виконав:** ст. гр. ПЗПІ-24-2 Єрьоменко М.М. (Варіант 5 / 15)  
> **Публічний репозиторій:** [https://github.com/mattyCube28/RestoFlow](https://github.com/mattyCube28/RestoFlow)

---

## Перелік використаних технологій (для звіту)

| Рівень архітектури | Технології та бібліотеки | Призначення у застосунку |
| :--- | :--- | :--- |
| **Сервер бази даних (СУБД)** | **Microsoft SQL Server (T-SQL)**, SSMS | Збереження даних (`RestaurantDB`), збережені процедури (`sp_CreateOrder`, `sp_AddMenuDish`, `sp_RemoveUnderperformingStaff`), скалярні функції (`fn_GetMaxOrderForDish`, `fn_GetCategoryDishCount`), таблична функція (`fn_GetDishesAnalyticsByCategory`), DML-тригери (`tr_PreventOver100Sales`, `createOrdersTrigger`, `tr_OrdersLoging`) та генерація користувацьких виключень `RAISERROR`. |
| **Серверна частина (Back-end)** | **C# 12, ASP.NET Core Web API (.NET 8)** | Побудова RESTful API контролера (`RestaurantController`), маршрутизація HTTP-запитів (`GET`, `POST`), налаштування CORS та обробка помилок. |
| **Доступ до даних (Data Access)** | **Dapper Micro-ORM (v2.1)**, `Microsoft.Data.SqlClient` | Виконання параметризованих SQL-запитів, мульти-запитів `QueryMultipleAsync` (для Master-Detail без дублювання), виклик збережених процедур із `CommandType.StoredProcedure` та перехоплення `SqlException` (Error 50000, Severity 16). |
| **Документація REST API** | **Swagger / OpenAPI (`Swashbuckle.AspNetCore`)** | Інтерактивна документація та тестування REST-ендпоінтів за адресою `/swagger`. |
| **Клієнтська частина (Front-end)** | **React 19, TypeScript, Vite 8** | Побудова односторінкового веб-застосунку (SPA) з реактивним станом, типізацією DTO-моделей та проксуванням запитів до REST API. |
| **Стилізація та UI** | **Tailwind CSS v4, Lucide React Icons** | Темний POS-дашборд із картками страв, капсульними фільтрами цехів, правою панеллю Master-Detail чеків та інтерактивними банерами перехоплених виключень СУБД. |
| **Контроль версій** | **Git, GitHub** | Розміщення вихідного коду, SQL-скриптів та документації у публічному репозиторії. |

---

## Реалізація функціональних вимог Лабораторної роботи №3

### 1. Виведення інформації з пов'язаних таблиць (Master-Detail без дублювання)
* **Ендпоінт списку:** `GET /api/restaurant/dishes` — об'єднує дані з таблиць `Dishes`, `MenuCategories`, `Suppliers`, `Restaurants` та агрегує кількість чеків і суму продажів із `Orders`.
* **Ендпоінт Master-Detail:** `GET /api/restaurant/dishes/{id}/details` — використовує метод Dapper **`QueryMultipleAsync`**, який за одне звернення до БД повертає:
  1. **Master-об'єкт** — докладну інформацію про обрану страву, її категорію, кухонний цех, постачальника та ресторан **без жодного дублювання рядків**.
  2. **Detail-масив** — повну історію продажів цієї страви з таблиці `Orders` разом із ПІБ та посадою офіціанта з таблиці `Staff`.

### 2. Виконання збережених процедур із передачею параметрів
* `POST /api/restaurant/procedures/create-order` — викликає процедуру `dbo.sp_CreateOrder(@CheckNo, @DishID, @StaffID, @Quantity, @PaymentType)`, списує залишок зі складу та реєструє продаж у `dbo.Orders`.
* `POST /api/restaurant/procedures/add-dish` — викликає процедуру `dbo.sp_AddMenuDish(@Name, @CategoryID, @Price, @Quantity, @SupplierID, @RestID, @Description)` для додавання нової страви в меню.
* `POST /api/restaurant/procedures/optimize-staff` — викликає збережену процедуру з Лабораторної роботи №1 (Варіант 5, Завдання 14) `dbo.sp_RemoveUnderperformingStaff(@MinSalesThreshold)`, яка звільняє персонал (окрім `Manager`) у ресторанах із сумарним обсягом продажів менше заданого порогу.

### 3. Виконання скалярної та табличної функцій (ЛР №1)
* **Скалярні функції (`GET /api/restaurant/functions/scalar`):**
  * `SELECT dbo.fn_GetMaxOrderForDish(@DishName)` (ЛР №1, Варіант 5, Завдання 5) — повертає інформацію про найбільше замовлення заданої страви або повідомлення про відсутність замовлень.
  * `SELECT dbo.fn_GetCategoryDishCount(@CategoryID)` — повертає кількість страв у вибраному кухонному цеху/відділі.
* **Таблична функція (`GET /api/restaurant/functions/table`):**
  * `SELECT * FROM dbo.fn_GetDishesAnalyticsByCategory(@CategoryID)` — повертає аналітичну таблицю страв обраного відділу з розрахунком виручки, кількості чеків та залишку квоти до ліміту тригера (100 порцій).

### 4. Оброблення виключних ситуацій, згенерованих на боці сервера БД
Серверна частина перехоплює `SqlException` (зокрема користувацькі помилки `RAISERROR` з кодом `50000` та рівнем серйозності `16`) і повертає клієнту структуровану відповідь із назвою процедури/тригера, номером рядка T-SQL та точним повідомленням СУБД:
1. **Тригер `dbo.tr_PreventOver100Sales` (ЛР №2):** блокує продаж (`RAISERROR` + `ROLLBACK TRANSACTION`), якщо сумарна кількість проданих порцій страви перевищує 100 одиниць.
2. **Тригер `dbo.createOrdersTrigger` (ЛР №2):** блокує додавання страв у вихідні дні або поза робочим часом (09:00–18:00) із записом спроби в таблицю аудиту `dbo.DishesAttemptLogs`.
3. **Користувацькі перевірки у збережених процедурах:** контроль достатнього залишку порцій на складі (`@Quantity > @AvailableStock`), додатного номера чека, додатної ціни страви та невід'ємного порогу виручки ресторану.

---

## Структура проєкту

```text
RestoFlow/
├── database/
│   ├── Lab1_01_Initial_Schema_And_Programmability.sql
│   ├── Lab2_01_Database_Setup.sql
│   ├── Lab2_02_Task_2_3_1_Auditing.sql
│   ├── Lab2_03_Task_2_3_2_Permissions.sql
│   ├── Lab2_04_Task_2_3_3_SystemTriggers.sql
│   ├── Lab2_05_Task_2_3_4_Variant3.sql
│   └── Lab3_01_WebApp_Programmability.sql
├── backend/
│   └── RestoFlow.Api/
│       ├── Controllers/RestaurantController.cs
│       ├── Data/DbConnectionFactory.cs
│       ├── Models/RestaurantModels.cs
│       ├── Program.cs
│       └── appsettings.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── types.ts
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Інструкція із запуску

### 1. Підготовка бази даних (MS SQL Server)
Виконайте скрипт `database/Lab3_01_WebApp_Programmability.sql` у SSMS (або через `sqlcmd`) на базі даних `RestaurantDB`.

### 2. Запуск Back-end (ASP.NET Core 8 Web API)
```powershell
cd backend/RestoFlow.Api
dotnet run --urls "http://localhost:5272"
```
* Swagger UI доступний за адресою: `http://localhost:5272/swagger`

### 3. Запуск Front-end (React + TypeScript + Vite)
```powershell
cd frontend
npm install
npm run dev
```
* Веб-застосунок доступний за адресою: `http://localhost:5173`
