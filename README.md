# RestoFlow

Enterprise-grade restaurant chain management & POS analytics platform powered by **MS SQL Server**, **ASP.NET Core 8 Web API + Dapper**, and **React + TypeScript + Tailwind CSS**.

> **Дисципліна:** Серверні рішення баз даних (СРБД) — Лабораторна робота №3  
> **Виконав:** ст. гр. ПЗПІ-24-2 Єрьоменко М.М. (Варіант 5 / 15)

---

## Технологічний стек

| Рівень | Технології |
| :--- | :--- |
| **База даних (СУБД)** | Microsoft SQL Server (T-SQL: Stored Procedures, Scalar & Table-Valued Functions, DML Triggers, Custom `RAISERROR` Exceptions) |
| **Back-end (REST API)** | C# 12, ASP.NET Core Web API (.NET 8), Dapper Micro-ORM, Microsoft.Data.SqlClient, Swagger / OpenAPI |
| **Front-end (SPA)** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Контроль версій** | Git & GitHub |

---

## Структура репозиторію

```text
RestoFlow/
├── database/       # SQL-скрипти ініціалізації БД RestaurantDB (Лаб №1–3: таблиці, функції, процедури, тригери)
├── backend/        # Серверна частина ASP.NET Core 8 Web API + Dapper
├── frontend/       # Клієнтський веб-додаток React + TypeScript + Vite + Tailwind CSS
├── docs/           # Документація, скріншоти та матеріали для звіту
├── .gitignore      # Конфігурація ігнорованих файлів (.NET + Node.js)
└── README.md       # Загальний опис проєкту та документація
```

---

## Функціональні вимоги Лабораторної роботи №3

1. **Виведення даних із пов'язаних таблиць (Master-Detail без дублювання):**
   - Відображення меню страв (`Dishes`) із прив'язкою до категорій цехів (`MenuCategories`), постачальників (`Suppliers`) та закладів мережі (`Restaurants`).
   - Перегляд картки страви без дублювання основних атрибутів разом із повною історією її продажів/чеків (`Orders` + офіціанти `Staff`).
2. **Виконання збережених процедур із передачею параметрів:**
   - Виклик процедури оптимізації персоналу `dbo.sp_RemoveUnderperformingStaff(@MinSalesThreshold)` та процедур керування замовленнями/меню з клієнтського інтерфейсу.
3. **Виконання скалярної та табличної функцій (ЛР №1):**
   - Скалярна функція `dbo.fn_GetMaxOrderForDish(@DishName)` — пошук рекордного замовлення для обраної страви.
   - Таблична функція (Table-Valued Function) — аналітична вибірка страв та статистики продажів за параметром.
4. **Оброблення виключних ситуацій на боці СУБД:**
   - Перехоплення користувацьких T-SQL виключень (`RAISERROR` у тригерах `tr_PreventOver100Sales` — ліміт 100 продажів на страву, та `createOrdersTrigger` — блокування змін меню у неробочий час із логуванням у `DishesAttemptLogs`) та їх виведення у клієнтському інтерфейсі.
