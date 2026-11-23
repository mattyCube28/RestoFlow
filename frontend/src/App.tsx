import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  Database,
  Flame,
  FunctionSquare,
  LayoutGrid,
  MapPin,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type {
  DishAnalyticsRow,
  DishCard,
  DishMasterDetail,
  LookupData,
  SqlErrorResponse,
} from './types';

// Кулінарні фото високої роздільної здатності для карток меню (як у референс-дашборді)
const DISH_IMAGES: Record<string, string> = {
  'Борщ український з пампушками':
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  'Стейк Рібай Prime':
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80',
  'Салат Цезар з креветками':
    'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80',
  'Піца Маргарита неаполітанська':
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
  'Том Ям з морепродуктами':
    'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=800&q=80',
  'Картопля фрі крафтова':
    'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
  'Чізкейк Нью-Йорк':
    'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80',
  'Піца Пепероні Supreme':
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
  'Піца Чотири Сири Melt':
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  'Локшина WOK з куркою теріякі':
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=800&q=80',
  'Каре телятини на грилі':
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  'Салат Грецький із фетою':
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
};

const DEFAULT_DISH_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80';

function getDishImage(name: string): string {
  return DISH_IMAGES[name] || DEFAULT_DISH_IMAGE;
}

type NavSection = 'pos' | 'functions' | 'procedures' | 'exceptions';
type RightPanelTab = 'details' | 'order';

export function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('pos');
  const [rightTab, setRightTab] = useState<RightPanelTab>('details');

  const [dishes, setDishes] = useState<DishCard[]>([]);
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedDishId, setSelectedDishId] = useState<number | null>(null);
  const [masterDetail, setMasterDetail] = useState<DishMasterDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Форма створення продажу (виклик процедури dbo.sp_CreateOrder)
  const [orderCheckNo, setOrderCheckNo] = useState<number>(3001);
  const [orderQuantity, setOrderQuantity] = useState<number>(2);
  const [orderStaffId, setOrderStaffId] = useState<number>(2);
  const [orderPaymentType, setOrderPaymentType] = useState<string>('Картка');

  // Стан для вкладки Пункту 3 (Скалярна + Таблична функції)
  const [fnDishName, setFnDishName] = useState<string>('Борщ український з пампушками');
  const [fnCategoryId, setFnCategoryId] = useState<number>(0);
  const [scalarResult, setScalarResult] = useState<{
    dishName: string;
    maxOrderResult: string;
    categoryId: number;
    categoryDishCount: number;
    sqlExecuted: string[];
  } | null>(null);
  const [tvfResult, setTvfResult] = useState<{
    categoryId: number;
    totalDishesInDepartment: number;
    sqlExecuted: string;
    rows: DishAnalyticsRow[];
  } | null>(null);

  // Стан для вкладки Пункту 2 (Збережені процедури sp_AddMenuDish та sp_RemoveUnderperformingStaff)
  const [newDishName, setNewDishName] = useState<string>('Піца Баффало Гостра');
  const [newDishCategory, setNewDishCategory] = useState<number>(5);
  const [newDishPrice, setNewDishPrice] = useState<number>(285);
  const [newDishQty, setNewDishQty] = useState<number>(25);
  const [newDishSupplier, setNewDishSupplier] = useState<number>(1);
  const [newDishRest, setNewDishRest] = useState<number>(1);
  const [newDishDesc, setNewDishDesc] = useState<string>(
    'Фірмова піца з соусом баффало, куркою гриль, халапеньйо та моцарелою'
  );
  const [staffThreshold, setStaffThreshold] = useState<number>(3000);

  // Сповіщення про успіх та перехоплені SQL-виключення (Пункт 4)
  const [sqlError, setSqlError] = useState<SqlErrorResponse | null>(null);
  const [successToast, setSuccessToast] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Завантаження страв та довідників
  const fetchDashboardData = async (keepSelection = true) => {
    try {
      setIsLoading(true);
      const [dishesRes, lookupRes] = await Promise.all([
        fetch('/api/restaurant/dishes'),
        fetch('/api/restaurant/lookup'),
      ]);

      if (dishesRes.ok) {
        const dishesData: DishCard[] = await dishesRes.json();
        setDishes(dishesData);
        if (dishesData.length > 0 && (!keepSelection || selectedDishId === null)) {
          setSelectedDishId(dishesData[0].dishID);
        }
      }

      if (lookupRes.ok) {
        const lookupData: LookupData = await lookupRes.json();
        setLookup(lookupData);
      }
    } catch (err) {
      console.error('Помилка завантаження даних:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Завантаження Master-Detail інформації про обрану страву без дублювання
  const fetchDishMasterDetail = async (id: number) => {
    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/restaurant/dishes/${id}/details`);
      if (res.ok) {
        const data: DishMasterDetail = await res.json();
        setMasterDetail(data);
      }
    } catch (err) {
      console.error('Помилка Master-Detail:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Завантаження результатів скалярної та табличної функцій
  const runFunctionsQuery = async (dishNameParam = fnDishName, catIdParam = fnCategoryId) => {
    try {
      const [scalarRes, tableRes] = await Promise.all([
        fetch(
          `/api/restaurant/functions/scalar?dishName=${encodeURIComponent(dishNameParam)}&categoryId=${catIdParam}`
        ),
        fetch(`/api/restaurant/functions/table?categoryId=${catIdParam}`),
      ]);

      if (scalarRes.ok) {
        setScalarResult(await scalarRes.json());
      }
      if (tableRes.ok) {
        setTvfResult(await tableRes.json());
      }
    } catch (err) {
      console.error('Помилка виконання функцій:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
    runFunctionsQuery('Борщ український з пампушками', 0);
  }, []);

  useEffect(() => {
    if (selectedDishId !== null) {
      fetchDishMasterDetail(selectedDishId);
    }
  }, [selectedDishId]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      const matchesCat = selectedCategory === 0 || d.categoryID === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.categoryName.toLowerCase().includes(q) ||
        d.restaurantName.toLowerCase().includes(q) ||
        d.supplierCompany.toLowerCase().includes(q) ||
        `#${d.dishID}`.includes(q);
      return matchesCat && matchesSearch;
    });
  }, [dishes, selectedCategory, searchQuery]);

  // Виклик збереженої процедури dbo.sp_CreateOrder
  const handleCreateOrder = async (customPayload?: {
    checkNo: number;
    dishID: number;
    staffID: number;
    quantity: number;
    paymentType: string;
  }) => {
    const payload = customPayload || {
      checkNo: orderCheckNo,
      dishID: selectedDishId || 1,
      staffID: orderStaffId,
      quantity: orderQuantity,
      paymentType: orderPaymentType,
    };

    setSqlError(null);
    setSuccessToast(null);

    const res = await fetch('/api/restaurant/procedures/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      setSqlError(data as SqlErrorResponse);
    } else {
      setSuccessToast({
        title: 'Процедуру dbo.sp_CreateOrder виконано!',
        message: data.message,
      });
      setOrderCheckNo((prev) => prev + 1);
      await fetchDashboardData(true);
      if (payload.dishID) {
        await fetchDishMasterDetail(payload.dishID);
      }
      await runFunctionsQuery(fnDishName, fnCategoryId);
    }
  };

  // Виклик збереженої процедури dbo.sp_AddMenuDish
  const handleAddMenuDish = async (customPayload?: {
    name: string;
    categoryID: number;
    price: number;
    quantity: number;
    supplierID: number;
    restID: number;
    description: string;
  }) => {
    const payload = customPayload || {
      name: newDishName,
      categoryID: newDishCategory,
      price: newDishPrice,
      quantity: newDishQty,
      supplierID: newDishSupplier,
      restID: newDishRest,
      description: newDishDesc,
    };

    setSqlError(null);
    setSuccessToast(null);

    const res = await fetch('/api/restaurant/procedures/add-dish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    await fetchDashboardData(true);
    await runFunctionsQuery(fnDishName, fnCategoryId);

    if (!res.ok || data.error) {
      setSqlError(data as SqlErrorResponse);
    } else {
      setSuccessToast({
        title: 'Процедуру dbo.sp_AddMenuDish виконано!',
        message: data.message,
      });
    }
  };

  // Виклик збереженої процедури з ЛР №1 dbo.sp_RemoveUnderperformingStaff
  const handleOptimizeStaff = async (thresholdOverride?: number) => {
    const threshold = thresholdOverride !== undefined ? thresholdOverride : staffThreshold;
    setSqlError(null);
    setSuccessToast(null);

    const res = await fetch('/api/restaurant/procedures/optimize-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minSalesThreshold: threshold }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      setSqlError(data as SqlErrorResponse);
    } else {
      setSuccessToast({
        title: 'Процедуру ЛР №1 dbo.sp_RemoveUnderperformingStaff виконано!',
        message: data.message,
      });
      await fetchDashboardData(true);
    }
  };

  const handleRestoreDemoStaff = async () => {
    const res = await fetch('/api/restaurant/procedures/restore-demo-staff', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setSuccessToast({
        title: 'Демо-персонал відновлено',
        message: data.message,
      });
      await fetchDashboardData(true);
    }
  };

  const totalChainRevenue = useMemo(
    () => dishes.reduce((acc, d) => acc + d.totalRevenue, 0),
    [dishes]
  );
  const totalChainSoldPortions = useMemo(
    () => dishes.reduce((acc, d) => acc + d.totalSoldQuantity, 0),
    [dishes]
  );

  return (
    <div className="min-h-screen bg-[#0e0e11] text-[#f4f4f6] flex selection:bg-[#ff6b00] selection:text-white">
      {/* ЛІВИЙ ІКОНКОВИЙ САЙДБАР (як на фото-референсі) */}
      <aside className="w-20 bg-[#15151a] border-r border-white/5 flex flex-col items-center py-6 justify-between shrink-0 z-20">
        <div className="flex flex-col items-center gap-8">
          {/* Логотип із 4 помаранчевими крапками як на фото */}
          <div
            onClick={() => setActiveNav('pos')}
            className="w-12 h-12 rounded-2xl bg-[#1e1e26] border border-[#ff6b00]/30 flex items-center justify-center cursor-pointer shadow-lg shadow-[#ff6b00]/10 hover:scale-105 transition"
            title="RestoFlow POS & DBMS"
          >
            <div className="grid grid-cols-2 gap-1.5 rotate-45">
              <span className="w-2 h-2 rounded-full bg-[#ff6b00]" />
              <span className="w-2 h-2 rounded-full bg-[#ff8533]" />
              <span className="w-2 h-2 rounded-full bg-[#ff8533]" />
              <span className="w-2 h-2 rounded-full bg-[#ff6b00]" />
            </div>
          </div>

          {/* Навігаційні кнопки по 4 пунктах лабораторної */}
          <nav className="flex flex-col gap-4">
            <button
              onClick={() => setActiveNav('pos')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                activeNav === 'pos'
                  ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/30'
                  : 'text-zinc-400 hover:bg-[#22222b] hover:text-white'
              }`}
              title="1. Меню та Master-Detail продажі (Пункт 1)"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="absolute left-16 bg-[#22222b] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition border border-white/10 shadow-xl">
                1. Меню & Master-Detail
              </span>
            </button>

            <button
              onClick={() => {
                setActiveNav('procedures');
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                activeNav === 'procedures'
                  ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/30'
                  : 'text-zinc-400 hover:bg-[#22222b] hover:text-white'
              }`}
              title="2. Збережені процедури T-SQL (Пункт 2)"
            >
              <Terminal className="w-5 h-5" />
              <span className="absolute left-16 bg-[#22222b] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition border border-white/10 shadow-xl">
                2. Збережені процедури
              </span>
            </button>

            <button
              onClick={() => {
                setActiveNav('functions');
                runFunctionsQuery(fnDishName, fnCategoryId);
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                activeNav === 'functions'
                  ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/30'
                  : 'text-zinc-400 hover:bg-[#22222b] hover:text-white'
              }`}
              title="3. Скалярна та Таблична функції (Пункт 3)"
            >
              <FunctionSquare className="w-5 h-5" />
              <span className="absolute left-16 bg-[#22222b] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition border border-white/10 shadow-xl">
                3. Функції (Скалярна & TVF)
              </span>
            </button>

            <button
              onClick={() => setActiveNav('exceptions')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                activeNav === 'exceptions'
                  ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/30'
                  : 'text-zinc-400 hover:bg-[#22222b] hover:text-white'
              }`}
              title="4. Обробка виключень сервера БД (Пункт 4)"
            >
              <ShieldAlert className="w-5 h-5" />
              <span className="absolute left-16 bg-[#22222b] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition border border-white/10 shadow-xl">
                4. Виключення СУБД (Triggers)
              </span>
            </button>
          </nav>
        </div>

        {/* Нижні іконки статусу БД та оновлення */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => fetchDashboardData(true)}
            className="w-11 h-11 rounded-2xl bg-[#1e1e26] text-zinc-400 hover:text-[#ff6b00] flex items-center justify-center transition cursor-pointer"
            title="Оновити дані з MS SQL Server"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-[#ff6b00]' : ''}`} />
          </button>
          <div
            className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
            title="MS SQL Server: RestaurantDB Online"
          />
        </div>
      </aside>

      {/* ОСНОВНА РОБОЧА ОБЛАСТЬ + ПРАВА ПАНЕЛЬ ДЕТАЛЕЙ */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* ЦЕНТРАЛЬНА КОЛОНКА */}
        <main className="flex-1 flex flex-col min-w-0 p-6 lg:p-8 overflow-y-auto">
          {/* ВЕРХНІЙ БАР (Профіль студента/оператора + Пошук як на референсі) */}
          <header className="bg-[#18181f] border border-white/5 rounded-3xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 mb-6 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#ff6b00] to-amber-400 p-0.5">
                <div className="w-full h-full rounded-full bg-[#18181f] flex items-center justify-center font-bold text-sm text-[#ff6b00]">
                  МЄ
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-base tracking-tight text-white">
                    Matvii Yeromenko
                  </h1>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#ff6b00]/15 text-[#ff8533] border border-[#ff6b00]/30">
                    ПЗПІ-24-2 • Варіант 5
                  </span>
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>MS SQL Server • RestaurantDB</span>
                  <span>•</span>
                  <span className="text-emerald-400">ASP.NET Core 8 + Dapper REST</span>
                </p>
              </div>
            </div>

            {/* Поле пошуку як у референсі */}
            <div className="relative flex-1 max-w-md min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dish by name, category, restaurant or ID..."
                className="w-full bg-[#22222b] border border-white/5 focus:border-[#ff6b00]/60 rounded-full pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Швидкі KPI мережі */}
            <div className="hidden xl:flex items-center gap-3">
              <div className="bg-[#22222b] px-4 py-2 rounded-2xl border border-white/5">
                <div className="text-[11px] text-zinc-400">Виручка мережі</div>
                <div className="text-sm font-bold text-white">
                  {totalChainRevenue.toLocaleString('uk-UA')} ₴
                </div>
              </div>
              <div className="bg-[#22222b] px-4 py-2 rounded-2xl border border-white/5">
                <div className="text-[11px] text-zinc-400">Продано порцій</div>
                <div className="text-sm font-bold text-[#ff8533]">{totalChainSoldPortions} од.</div>
              </div>
            </div>
          </header>

          {/* ПЕРЕМИКАЧ РОЗДІЛІВ ЛАБОРАТОРНОЇ РОБОТИ (4 вимоги завдання) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            <button
              onClick={() => setActiveNav('pos')}
              className={`px-4 py-3 rounded-2xl text-left border transition cursor-pointer flex items-center gap-3 ${
                activeNav === 'pos'
                  ? 'bg-[#ff6b00]/15 border-[#ff6b00] text-white'
                  : 'bg-[#18181f] border-white/5 text-zinc-400 hover:bg-[#1f1f29]'
              }`}
            >
              <LayoutGrid
                className={`w-5 h-5 shrink-0 ${
                  activeNav === 'pos' ? 'text-[#ff6b00]' : 'text-zinc-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400">Вимога №1</div>
                <div className="text-xs font-semibold truncate">Таблиці & Master-Detail</div>
              </div>
            </button>

            <button
              onClick={() => setActiveNav('procedures')}
              className={`px-4 py-3 rounded-2xl text-left border transition cursor-pointer flex items-center gap-3 ${
                activeNav === 'procedures'
                  ? 'bg-[#ff6b00]/15 border-[#ff6b00] text-white'
                  : 'bg-[#18181f] border-white/5 text-zinc-400 hover:bg-[#1f1f29]'
              }`}
            >
              <Terminal
                className={`w-5 h-5 shrink-0 ${
                  activeNav === 'procedures' ? 'text-[#ff6b00]' : 'text-zinc-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400">Вимога №2</div>
                <div className="text-xs font-semibold truncate">Збережені процедури</div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveNav('functions');
                runFunctionsQuery(fnDishName, fnCategoryId);
              }}
              className={`px-4 py-3 rounded-2xl text-left border transition cursor-pointer flex items-center gap-3 ${
                activeNav === 'functions'
                  ? 'bg-[#ff6b00]/15 border-[#ff6b00] text-white'
                  : 'bg-[#18181f] border-white/5 text-zinc-400 hover:bg-[#1f1f29]'
              }`}
            >
              <FunctionSquare
                className={`w-5 h-5 shrink-0 ${
                  activeNav === 'functions' ? 'text-[#ff6b00]' : 'text-zinc-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400">Вимога №3</div>
                <div className="text-xs font-semibold truncate">Скалярна & Таблична функції</div>
              </div>
            </button>

            <button
              onClick={() => setActiveNav('exceptions')}
              className={`px-4 py-3 rounded-2xl text-left border transition cursor-pointer flex items-center gap-3 ${
                activeNav === 'exceptions'
                  ? 'bg-[#ff6b00]/15 border-[#ff6b00] text-white'
                  : 'bg-[#18181f] border-white/5 text-zinc-400 hover:bg-[#1f1f29]'
              }`}
            >
              <ShieldAlert
                className={`w-5 h-5 shrink-0 ${
                  activeNav === 'exceptions' ? 'text-[#ff6b00]' : 'text-zinc-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400">Вимога №4</div>
                <div className="text-xs font-semibold truncate">Виключення СУБД (Triggers)</div>
              </div>
            </button>
          </div>

          {/* БАНЕРИ СПОВІЩЕНЬ ТА ВИКЛЮЧЕНЬ СУБД (Пункт 4 — видно на будь-якій вкладці) */}
          {sqlError && (
            <div className="mb-6 bg-red-950/60 border-2 border-red-500/80 rounded-3xl p-5 shadow-2xl shadow-red-950/50 animate-in fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500 text-white">
                        SQL Server Exception Caught
                      </span>
                      <span className="text-xs font-mono text-red-300 bg-red-950 px-2.5 py-0.5 rounded-lg border border-red-500/30">
                        Msg {sqlError.sqlErrorNumber}, Level {sqlError.sqlClass}, State{' '}
                        {sqlError.sqlState}
                      </span>
                      <span className="text-xs font-mono text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-lg">
                        Об&apos;єкт: {sqlError.procedureOrTrigger} (Рядок {sqlError.lineNumber})
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1.5 leading-relaxed">
                      {sqlError.message}
                    </p>
                    <p className="text-xs text-red-300/80 mt-1">
                      Виключну ситуацію згенеровано на боці MS SQL Server (RAISERROR / ROLLBACK
                      TRANSACTION), перехоплено у C# контролері через SqlException та оброблено
                      клієнтським додатком.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSqlError(null)}
                  className="text-red-300 hover:text-white p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {successToast && (
            <div className="mb-6 bg-emerald-950/50 border border-emerald-500/60 rounded-3xl p-4 flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{successToast.title}</h4>
                  <p className="text-xs text-emerald-200/90 mt-0.5">{successToast.message}</p>
                </div>
              </div>
              <button
                onClick={() => setSuccessToast(null)}
                className="text-emerald-300 hover:text-white p-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =================================================================== */}
          {/* ВКЛАДКА 1: POS МЕНЮ ТА MASTER-DETAIL (exact match до фото-референсу) */}
          {/* =================================================================== */}
          {activeNav === 'pos' && (
            <>
              {/* Капсульні вкладки категорій меню (як Pizza, Hot drinks, Cold drinks на фото) */}
              <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-5">
                <button
                  onClick={() => setSelectedCategory(0)}
                  className={`flex items-center gap-2.5 pl-2.5 pr-5 py-2 rounded-full text-sm font-medium transition shrink-0 cursor-pointer ${
                    selectedCategory === 0
                      ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/25'
                      : 'bg-[#1c1c24] text-zinc-300 hover:bg-[#252530] border border-white/5'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedCategory === 0 ? 'bg-white/20' : 'bg-[#2a2a36]'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                  </span>
                  <span>Усі страви</span>
                  <span className="text-xs opacity-80">({dishes.length})</span>
                </button>

                {lookup?.categories.map((cat) => {
                  const isActive = selectedCategory === cat.categoryID;
                  return (
                    <button
                      key={cat.categoryID}
                      onClick={() => setSelectedCategory(cat.categoryID)}
                      className={`flex items-center gap-2.5 pl-2.5 pr-5 py-2 rounded-full text-sm font-medium transition shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/25'
                          : 'bg-[#1c1c24] text-zinc-300 hover:bg-[#252530] border border-white/5'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-[#2a2a36]'
                        }`}
                      >
                        <ChefHat className="w-4 h-4" />
                      </span>
                      <span>{cat.categoryName}</span>
                      <span className="text-xs opacity-75">({cat.dishCount})</span>
                    </button>
                  );
                })}
              </div>

              {/* СІТКА КАРТОК СТРАВ (3 колонки як на фото) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredDishes.map((dish) => {
                  const isSelected = dish.dishID === selectedDishId;
                  const isAtLimit = dish.totalSoldQuantity >= 100;
                  const oldPrice = Math.round(dish.price * 1.18);

                  return (
                    <div
                      key={dish.dishID}
                      onClick={() => {
                        setSelectedDishId(dish.dishID);
                        setRightTab('details');
                      }}
                      className={`group bg-[#191920] rounded-3xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#ff6b00] ring-2 ring-[#ff6b00]/25 shadow-2xl shadow-[#ff6b00]/10'
                          : 'border-white/5 hover:border-white/15 hover:bg-[#1e1e27]'
                      }`}
                    >
                      <div>
                        {/* Зображення страви з бейджами закладу та ліміту продажів */}
                        <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-3.5 bg-[#25252f]">
                          <img
                            src={getDishImage(dish.name)}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                          {/* Бейдж ресторану */}
                          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10">
                            <MapPin className="w-3 h-3 text-[#ff6b00]" />
                            <span>
                              {dish.restaurantName} ({dish.restaurantCity})
                            </span>
                          </div>

                          {/* Бейдж проданих порцій (контроль ліміту тригера 100 од.) */}
                          <div
                            className={`absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border ${
                              isAtLimit
                                ? 'bg-red-500/90 text-white border-red-400'
                                : 'bg-black/70 text-emerald-300 border-white/10'
                            }`}
                          >
                            Продано: {dish.totalSoldQuantity}/100
                          </div>

                          {/* Нижній підпис цеху на фото */}
                          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-zinc-200">
                            <span className="bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-md">
                              {dish.kitchenStation}
                            </span>
                            <span className="bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-md">
                              Склад: {dish.quantity} порц.
                            </span>
                          </div>
                        </div>

                        {/* Назва та опис страви */}
                        <h3 className="font-bold text-base text-white group-hover:text-[#ff8533] transition line-clamp-1">
                          {dish.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {dish.description || `${dish.categoryName} • Постачальник: ${dish.supplierCompany}`}
                        </p>
                      </div>

                      {/* Ціна, стара ціна та кругла кнопка кошика/продажу як на фото */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-extrabold text-white">
                            ₴{dish.price.toFixed(2)}
                          </span>
                          <span className="text-xs text-zinc-500 line-through">
                            ₴{oldPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDishId(dish.dishID);
                              setRightTab('order');
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#ff6b00] text-white shadow-md shadow-[#ff6b00]/30'
                                : 'bg-[#262631] text-zinc-300 hover:bg-[#ff6b00] hover:text-white'
                            }`}
                            title="Провести продаж через процедуру sp_CreateOrder"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* =================================================================== */}
          {/* ВКЛАДКА 2: ВИКОНАННЯ ЗБЕРЕЖЕНИХ ПРОЦЕДУР ІЗ ПАРАМЕТРАМИ (Пункт 2)   */}
          {/* =================================================================== */}
          {activeNav === 'procedures' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Картка Процедури №1: Додавання нової страви в меню (dbo.sp_AddMenuDish) */}
                <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#ff6b00]/15 text-[#ff6b00] flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">
                          Збережена процедура: dbo.sp_AddMenuDish
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Додавання страви в таблицю Dishes (з перевіркою тригера робочого часу)
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono bg-[#22222b] text-[#ff8533] px-2.5 py-1 rounded-lg border border-white/5">
                      EXEC sp_AddMenuDish
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-zinc-400 block mb-1">Назва страви (@Name)</label>
                      <input
                        type="text"
                        value={newDishName}
                        onChange={(e) => setNewDishName(e.target.value)}
                        className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">
                        Категорія цеху (@CategoryID)
                      </label>
                      <select
                        value={newDishCategory}
                        onChange={(e) => setNewDishCategory(Number(e.target.value))}
                        className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                      >
                        {lookup?.categories.map((c) => (
                          <option key={c.categoryID} value={c.categoryID}>
                            #{c.categoryID} — {c.categoryName} ({c.kitchenStation})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">
                        Заклад мережі (@RestID)
                      </label>
                      <select
                        value={newDishRest}
                        onChange={(e) => setNewDishRest(Number(e.target.value))}
                        className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                      >
                        {lookup?.restaurants.map((r) => (
                          <option key={r.restID} value={r.restID}>
                            #{r.restID} — {r.name} ({r.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Ціна, грн (@Price)</label>
                      <input
                        type="number"
                        value={newDishPrice}
                        onChange={(e) => setNewDishPrice(Number(e.target.value))}
                        className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">
                        Залишок порцій (@Quantity)
                      </label>
                      <input
                        type="number"
                        value={newDishQty}
                        onChange={(e) => setNewDishQty(Number(e.target.value))}
                        className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs text-zinc-400 block mb-1">
                        Постачальник (@SupplierID)
                      </label>
                      <select
                        value={newDishSupplier}
                        onChange={(e) => setNewDishSupplier(Number(e.target.value))}
                        className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                      >
                        {lookup?.suppliers.map((s) => (
                          <option key={s.supplierID} value={s.supplierID}>
                            #{s.supplierID} — {s.companyName} ({s.city}, Рейтинг {s.reliabilityScore}/10)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs text-zinc-400 block mb-1">
                        Опис рецептури (@Description)
                      </label>
                      <input
                        type="text"
                        value={newDishDesc}
                        onChange={(e) => setNewDishDesc(e.target.value)}
                        className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddMenuDish()}
                    className="mt-5 w-full bg-[#ff6b00] hover:bg-[#ff7b1a] text-white font-semibold py-3 rounded-2xl shadow-lg shadow-[#ff6b00]/25 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>Виконати процедуру dbo.sp_AddMenuDish</span>
                  </button>
                </div>

                {/* Картка Процедури №2 (з Лаби №1, Завдання 14): dbo.sp_RemoveUnderperformingStaff */}
                <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white">
                            Процедура ЛР №1: dbo.sp_RemoveUnderperformingStaff
                          </h3>
                          <p className="text-xs text-zinc-400">
                            Варіант 5 (Завдання 14): Оптимізація персоналу неприбуткових ресторанів
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#22222b] rounded-2xl p-3.5 border border-white/5 text-xs text-zinc-300 mb-4 leading-relaxed">
                      Видаляє співробітників (окрім посади <code className="text-[#ff8533]">Manager</code>),
                      які працюють у ресторанах, де сумарний обсяг продажів менший за заданий параметр{' '}
                      <code className="text-amber-300">@MinSalesThreshold</code>.
                    </div>

                    <div className="mb-4">
                      <label className="text-xs text-zinc-400 block mb-1.5">
                        Мінімальний поріг виручки ресторану (@MinSalesThreshold, грн):
                      </label>
                      <div className="flex gap-2.5">
                        <input
                          type="number"
                          value={staffThreshold}
                          onChange={(e) => setStaffThreshold(Number(e.target.value))}
                          className="flex-1 bg-[#22222b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                        />
                        <button
                          onClick={() => handleOptimizeStaff()}
                          className="bg-[#ff6b00] hover:bg-[#ff7b1a] text-white font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Виконати</span>
                        </button>
                      </div>
                    </div>

                    {/* Таблиця поточного персоналу та виручки їхніх ресторанів */}
                    <div className="overflow-x-auto max-h-60 border border-white/5 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#22222b] text-zinc-400 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">ПІБ працівника</th>
                            <th className="py-2.5 px-3">Посада</th>
                            <th className="py-2.5 px-3">Ресторан</th>
                            <th className="py-2.5 px-3 text-right">Виручка закладу</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {lookup?.staff.map((st) => {
                            const isManager = st.information === 'Manager';
                            const isBelow = st.restaurantRevenue < staffThreshold;
                            return (
                              <tr key={st.staffID} className="hover:bg-white/5">
                                <td className="py-2 px-3 font-medium text-white">{st.name}</td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                      isManager
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-zinc-800 text-zinc-300'
                                    }`}
                                  >
                                    {st.information}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-zinc-300">{st.restaurantName}</td>
                                <td
                                  className={`py-2 px-3 text-right font-semibold ${
                                    isBelow ? 'text-red-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {st.restaurantRevenue.toLocaleString('uk-UA')} ₴
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">
                      Всього у штаті: <b>{lookup?.staff.length || 0}</b> співроб.
                    </span>
                    <button
                      onClick={handleRestoreDemoStaff}
                      className="text-xs bg-[#22222b] hover:bg-[#2c2c38] text-zinc-200 px-3.5 py-2 rounded-xl border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#ff6b00]" />
                      <span>Додати демо-персонал для тесту звільнення</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* ВКЛАДКА 3: СКАЛЯРНА ТА ТАБЛИЧНА ФУНКЦІЇ З ЛАБИ №1 (Пункт 3)        */}
          {/* =================================================================== */}
          {activeNav === 'functions' && (
            <div className="space-y-6">
              {/* Панель параметрів для виклику функцій */}
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#ff6b00]/15 text-[#ff6b00] flex items-center justify-center">
                      <FunctionSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Виконання скалярних та табличної T-SQL функцій (ЛР №1)
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Передайте параметри з клієнтського додатку для обчислення на боці MS SQL Server
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">
                      Параметр @DishName (для fn_GetMaxOrderForDish):
                    </label>
                    <select
                      value={fnDishName}
                      onChange={(e) => {
                        setFnDishName(e.target.value);
                        runFunctionsQuery(e.target.value, fnCategoryId);
                      }}
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    >
                      {dishes.map((d) => (
                        <option key={d.dishID} value={d.name}>
                          {d.name} (Продано: {d.totalSoldQuantity} порц.)
                        </option>
                      ))}
                      <option value="Неіснуюча страва (Тест)">
                        Неіснуюча страва (Перевірка гілки IF NOT EXISTS)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">
                      Параметр @CategoryID / Відділ кухні (для fn_GetCategoryDishCount & TVF):
                    </label>
                    <select
                      value={fnCategoryId}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFnCategoryId(val);
                        runFunctionsQuery(fnDishName, val);
                      }}
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    >
                      <option value={0}>0 — Усі відділи та кухонні цехи мережі</option>
                      {lookup?.categories.map((c) => (
                        <option key={c.categoryID} value={c.categoryID}>
                          #{c.categoryID} — {c.categoryName} ({c.kitchenStation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => runFunctionsQuery(fnDishName, fnCategoryId)}
                    className="bg-[#ff6b00] hover:bg-[#ff7b1a] text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-[#ff6b00]/25 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Обчислити функції в СУБД</span>
                  </button>
                </div>

                {/* Результати скалярних функцій */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-[#22222b] border border-[#ff6b00]/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#ff8533] uppercase tracking-wider">
                        Скалярна функція №1 (Варіант 5 ЛР №1)
                      </span>
                      <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-zinc-300">
                        dbo.fn_GetMaxOrderForDish
                      </code>
                    </div>
                    <div className="text-base font-bold text-white mt-1">
                      {scalarResult?.maxOrderResult || 'Завантаження...'}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-2 bg-black/30 px-2.5 py-1.5 rounded-lg">
                      {scalarResult?.sqlExecuted?.[0]}
                    </div>
                  </div>

                  <div className="bg-[#22222b] border border-emerald-500/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Скалярна функція №2 (Кількість товарів у відділі)
                      </span>
                      <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-zinc-300">
                        dbo.fn_GetCategoryDishCount
                      </code>
                    </div>
                    <div className="text-2xl font-extrabold text-white mt-1">
                      {scalarResult?.categoryDishCount ?? 0}{' '}
                      <span className="text-sm font-normal text-zinc-400">
                        страв у вибраному цеху/відділі
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-2 bg-black/30 px-2.5 py-1.5 rounded-lg">
                      {scalarResult?.sqlExecuted?.[1]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Результат Табличної функції (Inline Table-Valued Function) */}
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#ff6b00]" />
                      <span>
                        Результат табличної функції: dbo.fn_GetDishesAnalyticsByCategory(
                        {fnCategoryId})
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      SQL-запит:{' '}
                      <code className="text-[#ff8533]">{tvfResult?.sqlExecuted}</code>
                    </p>
                  </div>
                  <span className="text-xs bg-[#22222b] px-3 py-1 rounded-full text-zinc-300 border border-white/5">
                    Повернуто рядків: <b>{tvfResult?.rows.length || 0}</b>
                  </span>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#22222b] text-zinc-400 uppercase">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Страва</th>
                        <th className="py-3 px-4">Категорія / Цех</th>
                        <th className="py-3 px-4">Ресторан</th>
                        <th className="py-3 px-4 text-right">Ціна</th>
                        <th className="py-3 px-4 text-right">Залишок</th>
                        <th className="py-3 px-4 text-right">Чеків</th>
                        <th className="py-3 px-4 text-right">Продано</th>
                        <th className="py-3 px-4 text-right">Виручка</th>
                        <th className="py-3 px-4 text-right">Квота до 100 (Тригер)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tvfResult?.rows.map((row) => (
                        <tr key={row.dishID} className="hover:bg-white/5">
                          <td className="py-2.5 px-4 font-mono text-zinc-400">#{row.dishID}</td>
                          <td className="py-2.5 px-4 font-semibold text-white">{row.dishName}</td>
                          <td className="py-2.5 px-4 text-zinc-300">
                            {row.categoryName}{' '}
                            <span className="text-zinc-500">({row.kitchenStation})</span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300">{row.restaurantName}</td>
                          <td className="py-2.5 px-4 text-right font-medium">
                            {row.price.toFixed(2)} ₴
                          </td>
                          <td className="py-2.5 px-4 text-right">{row.inStockQuantity} од.</td>
                          <td className="py-2.5 px-4 text-right">{row.ordersCount}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-white">
                            {row.totalSoldQuantity} порц.
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-[#ff8533]">
                            {row.totalRevenue.toLocaleString('uk-UA')} ₴
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold ${
                                row.remainingQuotaTo100 === 0
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {row.remainingQuotaTo100} порц.
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* ВКЛАДКА 4: ЦЕНТР ТЕСТУВАННЯ ВИКЛЮЧНИХ СИТУАЦІЙ СУБД (Пункт 4)       */}
          {/* =================================================================== */}
          {activeNav === 'exceptions' && (
            <div className="space-y-6">
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-11 h-11 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Лабораторія виключних ситуацій СУБД (T-SQL RAISERROR & Triggers)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Натисніть на будь-який сценарій нижче, щоб ініціювати реальне користувацьке
                      виключення на боці MS SQL Server і перевірити його перехоплення у клієнтському
                      застосунку
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  {/* Сценарій 1: Тригер tr_PreventOver100Sales (Лаб 2 Варіант 3/5) */}
                  <div className="bg-[#22222b] border border-red-500/30 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-red-400">
                          Сценарій №1 • Тригер AFTER INSERT
                        </span>
                        <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-amber-300">
                          dbo.tr_PreventOver100Sales
                        </code>
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        Перевищення ліміту 100 проданих порцій для однієї страви
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        У страви «Борщ український з пампушками» (DishID=1) вже продано 100 порцій.
                        Спроба додати ще 5 порцій викликає <code className="text-red-300">RAISERROR</code>{' '}
                        та <code className="text-red-300">ROLLBACK TRANSACTION</code> у тригері.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleCreateOrder({
                          checkNo: 9901,
                          dishID: 1,
                          staffID: 2,
                          quantity: 5,
                          paymentType: 'Картка',
                        })
                      }
                      className="mt-4 w-full bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white border border-red-500/40 font-semibold py-2.5 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-2"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Ініціювати виключення tr_PreventOver100Sales</span>
                    </button>
                  </div>

                  {/* Сценарій 2: Перевищення складського залишку у sp_CreateOrder */}
                  <div className="bg-[#22222b] border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-amber-400">
                          Сценарій №2 • Збережена процедура
                        </span>
                        <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-amber-300">
                          dbo.sp_CreateOrder
                        </code>
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        Замовлення кількості порцій, що перевищує складський залишок
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        Спроба продати 500 порцій «Стейк Рібай Prime» (DishID=2), коли на складі
                        доступно лише 25 порцій. Процедура генерує користувацький{' '}
                        <code className="text-amber-300">RAISERROR (Severity 16)</code>.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleCreateOrder({
                          checkNo: 9902,
                          dishID: 2,
                          staffID: 2,
                          quantity: 500,
                          paymentType: 'Картка',
                        })
                      }
                      className="mt-4 w-full bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-black border border-amber-500/40 font-semibold py-2.5 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Ініціювати виключення дефіциту складу (500 порц.)</span>
                    </button>
                  </div>

                  {/* Сценарій 3: Некоректна від'ємна ціна у sp_AddMenuDish */}
                  <div className="bg-[#22222b] border border-orange-500/30 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-orange-400">
                          Сценарій №3 • Валідація параметрів БД
                        </span>
                        <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-amber-300">
                          dbo.sp_AddMenuDish
                        </code>
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        Передача некоректної ціни страви (@Price = -150 грн)
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        Перевірка бізнес-правила на боці СУБД у збереженій процедурі додавання
                        страви при передачі від&apos;ємної або нульової вартості.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleAddMenuDish({
                          name: 'Тестова страва з помилкою',
                          categoryID: 1,
                          price: -150,
                          quantity: 10,
                          supplierID: 1,
                          restID: 1,
                          description: 'Перевірка RAISERROR',
                        })
                      }
                      className="mt-4 w-full bg-orange-500/20 hover:bg-orange-500 text-orange-200 hover:text-white border border-orange-500/40 font-semibold py-2.5 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Ініціювати виключення некоректної ціни (-150 ₴)</span>
                    </button>
                  </div>

                  {/* Сценарій 4: Від'ємний поріг виручки у sp_RemoveUnderperformingStaff */}
                  <div className="bg-[#22222b] border border-purple-500/30 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-purple-400">
                          Сценарій №4 • Процедура ЛР №1
                        </span>
                        <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-amber-300">
                          dbo.sp_RemoveUnderperformingStaff
                        </code>
                      </div>
                      <h4 className="font-bold text-sm text-white">
                        Передача від&apos;ємного порогу виручки (@MinSalesThreshold = -500)
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        Захист процедури оптимізації штату від некоректного порогового значення
                        обсягу продажів ресторану.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOptimizeStaff(-500)}
                      className="mt-4 w-full bg-purple-500/20 hover:bg-purple-500 text-purple-200 hover:text-white border border-purple-500/40 font-semibold py-2.5 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Ініціювати виключення sp_RemoveUnderperformingStaff</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Журнал аудиту заблокованих спроб (DishesAttemptLogs з Лаб 2) */}
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold text-base text-white mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#ff6b00]" />
                  <span>
                    Журнал аудиту тригера createOrdersTrigger (таблиця dbo.DishesAttemptLogs з ЛР №2)
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Записи, автоматично збережені тригером INSTEAD OF INSERT при спробі модифікації
                  таблиці Dishes у вихідні дні або поза робочим часом (09:00–18:00)
                </p>

                <div className="overflow-x-auto border border-white/5 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#22222b] text-zinc-400">
                      <tr>
                        <th className="py-2.5 px-4">LogId</th>
                        <th className="py-2.5 px-4">Назва страви</th>
                        <th className="py-2.5 px-4">Час спроби</th>
                        <th className="py-2.5 px-4">Користувач СУБД</th>
                        <th className="py-2.5 px-4">Статус тригера</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {lookup?.auditLogs.map((log) => (
                        <tr key={log.logId} className="hover:bg-white/5">
                          <td className="py-2.5 px-4 font-mono text-zinc-400">#{log.logId}</td>
                          <td className="py-2.5 px-4 font-medium text-white">{log.dishName}</td>
                          <td className="py-2.5 px-4 text-zinc-300">
                            {new Date(log.attemptDate).toLocaleString('uk-UA')}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[#ff8533]">{log.userLogin}</td>
                          <td className="py-2.5 px-4 text-red-300">{log.statusMessage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ===================================================================== */}
        {/* ПРАВА ПАНЕЛЬ MASTER-DETAIL ТА ОФОРМЛЕННЯ ЧЕКА (як панель Items/Receipt на фото) */}
        {/* ===================================================================== */}
        <aside className="w-full lg:w-[410px] xl:w-[440px] bg-[#15151b] border-t lg:border-t-0 lg:border-l border-white/5 p-6 flex flex-col justify-between shrink-0">
          <div>
            {/* Капсульний перемикач режиму правої панелі (як "Take away / Dine in" на фото) */}
            <div className="bg-[#202029] p-1.5 rounded-full grid grid-cols-2 gap-1 mb-6 border border-white/5">
              <button
                onClick={() => setRightTab('details')}
                className={`py-2 px-4 rounded-full text-xs font-semibold transition cursor-pointer ${
                  rightTab === 'details'
                    ? 'bg-[#2e2e3a] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Master-Detail Продажі
              </button>
              <button
                onClick={() => setRightTab('order')}
                className={`py-2 px-4 rounded-full text-xs font-semibold transition cursor-pointer ${
                  rightTab === 'order'
                    ? 'bg-[#ff6b00] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Новий чек (Процедура)
              </button>
            </div>

            {masterDetail ? (
              <>
                {/* ШАПКА ОБРАНОЇ СТРАВИ (MASTER-ОБ'ЄКТ БЕЗ ДУБЛЮВАННЯ) */}
                <div className="bg-[#1d1d26] rounded-3xl p-4 border border-white/5 mb-5">
                  <div className="flex gap-3.5 items-center">
                    <img
                      src={getDishImage(masterDetail.dish.name)}
                      alt={masterDetail.dish.name}
                      className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#ff8533] uppercase tracking-wider">
                          {masterDetail.dish.categoryName}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          ID #{masterDetail.dish.dishID}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white truncate mt-0.5">
                        {masterDetail.dish.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>{masterDetail.dish.restaurantRating}</span>
                        <span>•</span>
                        <span className="truncate">{masterDetail.dish.restaurantName}</span>
                      </div>
                      <div className="text-base font-extrabold text-white mt-1.5">
                        ₴{masterDetail.dish.price.toFixed(2)}{' '}
                        <span className="text-xs font-normal text-zinc-400">
                          / порція (Склад: {masterDetail.dish.quantity} од.)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Додаткові Master-атрибути з пов'язаних таблиць Suppliers та MenuCategories */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-white/5 text-xs">
                    <div className="bg-[#15151b] rounded-xl p-2.5">
                      <div className="text-zinc-500 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#ff6b00]" />
                        <span>Постачальник:</span>
                      </div>
                      <div className="font-semibold text-zinc-200 truncate mt-0.5">
                        {masterDetail.dish.supplierCompany}
                      </div>
                    </div>
                    <div className="bg-[#15151b] rounded-xl p-2.5">
                      <div className="text-zinc-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#ff6b00]" />
                        <span>Кухонний цех:</span>
                      </div>
                      <div className="font-semibold text-zinc-200 truncate mt-0.5">
                        {masterDetail.dish.kitchenStation}
                      </div>
                    </div>
                  </div>

                  {/* Результат скалярної функції fn_GetMaxOrderForDish для обраної страви */}
                  <div className="mt-3 bg-[#ff6b00]/10 border border-[#ff6b00]/25 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-[#ff6b00] shrink-0" />
                    <div className="text-xs">
                      <span className="text-zinc-400 block text-[10px] uppercase">
                        Скалярна функція fn_GetMaxOrderForDish:
                      </span>
                      <span className="font-semibold text-white">
                        {masterDetail.maxOrderHighlight}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ВМІСТ ПРАВОЇ ПАНЕЛІ: або ІСТОРІЯ ПРОДАЖІВ (Detail), або ФОРМА ПРОЦЕДУРИ ПРОДАЖУ */}
                {rightTab === 'details' ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#ff6b00]" />
                        <span>Історія продажів страви (Orders)</span>
                      </h4>
                      <span className="text-xs text-zinc-400">
                        Чеків: <b>{masterDetail.salesHistory.length}</b>
                      </span>
                    </div>

                    {loadingDetails ? (
                      <div className="py-12 text-center text-xs text-zinc-500">
                        Завантаження пов&apos;язаних продажів...
                      </div>
                    ) : masterDetail.salesHistory.length === 0 ? (
                      <div className="bg-[#1d1d26] border border-white/5 rounded-2xl p-6 text-center">
                        <Package className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                        <p className="text-xs text-zinc-400">
                          Для цієї страви ще немає зареєстрованих продажів у таблиці Orders.
                        </p>
                        <button
                          onClick={() => setRightTab('order')}
                          className="mt-3 text-xs text-[#ff8533] hover:underline cursor-pointer font-medium"
                        >
                          + Провести перший продаж через процедуру
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                        {masterDetail.salesHistory.map((sale) => (
                          <div
                            key={sale.orderID}
                            className="bg-[#1d1d26] hover:bg-[#23232e] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#272733] flex flex-col items-center justify-center text-xs font-bold text-[#ff8533]">
                                <span>#{sale.checkNo}</span>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-white flex items-center gap-2">
                                  <span>Замовлення №{sale.orderID}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300">
                                    {sale.paymentType}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                  {new Date(sale.orderDate).toLocaleDateString('uk-UA')} • Офіціант:{' '}
                                  {sale.staffName}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-extrabold text-white">
                                ₴{sale.lineTotal.toLocaleString('uk-UA')}
                              </div>
                              <div className="text-[11px] text-[#ff8533] font-medium">
                                {sale.quantity} порц.
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ФОРМА ВИКОНАННЯ ЗБЕРЕЖЕНОЇ ПРОЦЕДУРИ dbo.sp_CreateOrder */
                  <div className="bg-[#1d1d26] border border-white/5 rounded-3xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Новий продаж (EXEC dbo.sp_CreateOrder)
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Ліміт: {masterDetail.dish.totalSoldQuantity}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Номер чека (@CheckNo)
                        </label>
                        <input
                          type="number"
                          value={orderCheckNo}
                          onChange={(e) => setOrderCheckNo(Number(e.target.value))}
                          className="w-full bg-[#15151b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">
                          Кількість порцій (@Quantity)
                        </label>
                        <input
                          type="number"
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(Number(e.target.value))}
                          className="w-full bg-[#15151b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Офіціант (@StaffID)
                      </label>
                      <select
                        value={orderStaffId}
                        onChange={(e) => setOrderStaffId(Number(e.target.value))}
                        className="w-full bg-[#15151b] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#ff6b00] focus:outline-none"
                      >
                        {lookup?.staff.map((s) => (
                          <option key={s.staffID} value={s.staffID}>
                            #{s.staffID} — {s.name} ({s.information}, {s.restaurantName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Тип оплати (@PaymentType)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Картка', 'Готівка', 'Безготівковий'].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => setOrderPaymentType(pt)}
                            className={`py-2 px-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                              orderPaymentType === pt
                                ? 'bg-[#ff6b00]/20 border-[#ff6b00] text-white'
                                : 'bg-[#15151b] border-white/5 text-zinc-400'
                            }`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCreateOrder()}
                      className="w-full bg-[#ff6b00] hover:bg-[#ff7b1a] text-white font-semibold py-3 rounded-2xl shadow-lg shadow-[#ff6b00]/25 transition cursor-pointer flex items-center justify-center gap-2 text-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>
                        Провести чек (₴{(masterDetail.dish.price * orderQuantity).toFixed(2)})
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-sm text-zinc-500">
                Оберіть страву зі списку зліва
              </div>
            )}
          </div>

          {/* НИЖНІЙ БЛОК ПІДСУМКІВ (Subtotal / Tax / Total / Print Receipt як на фото-референсі) */}
          {masterDetail && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Усього продано порцій страви</span>
                  <span className="font-semibold text-white">
                    {masterDetail.dish.totalSoldQuantity} порц. (ліміт 100)
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Кількість чеків по страві</span>
                  <span className="font-semibold text-white">{masterDetail.dish.ordersCount}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Залишок квоти тригера tr_PreventOver100Sales</span>
                  <span
                    className={`font-bold ${
                      100 - masterDetail.dish.totalSoldQuantity <= 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {Math.max(0, 100 - masterDetail.dish.totalSoldQuantity)} порц.
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-white/10">
                  <span className="text-sm font-bold text-white">Total Revenue (Страва)</span>
                  <span className="text-xl font-extrabold text-[#ff8533]">
                    ₴{masterDetail.dish.totalRevenue.toLocaleString('uk-UA')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <button
                  onClick={() => setRightTab(rightTab === 'details' ? 'order' : 'details')}
                  className="bg-[#23232e] hover:bg-[#2c2c3a] text-white font-semibold py-3 px-4 rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-white/5"
                >
                  <TrendingUp className="w-4 h-4 text-[#ff6b00]" />
                  <span>{rightTab === 'details' ? 'Оформити продаж' : 'Історія чеків'}</span>
                </button>

                <button
                  onClick={() =>
                    handleCreateOrder({
                      checkNo: 9999,
                      dishID: masterDetail.dish.dishID,
                      staffID: 2,
                      quantity: 105,
                      paymentType: 'Картка',
                    })
                  }
                  className="bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white font-semibold py-3 px-4 rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-red-500/30"
                  title="Швидкий тест користувацького виключення тригера tr_PreventOver100Sales"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Тест ліміту &gt;100</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
