import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  Database,
  FunctionSquare,
  History,
  LayoutGrid,
  MapPin,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Terminal,
  Trash2,
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

type NavSection = 'pos' | 'procedures' | 'functions' | 'audit';
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

  // Робоча форма створення замовлення / чека (виклик процедури dbo.sp_CreateOrder)
  const [orderCheckNo, setOrderCheckNo] = useState<number>(3010);
  const [orderQuantity, setOrderQuantity] = useState<number>(2);
  const [orderStaffId, setOrderStaffId] = useState<number>(2);
  const [orderPaymentType, setOrderPaymentType] = useState<string>('Картка');

  // Стан для вкладки Пункту 3 (Скалярна + Таблична функції — автоматичний перерахунок при зміні дропдаунів)
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

  // Робочі форми вкладки Пункту 2 (Керування меню sp_AddMenuDish та персоналом sp_RemoveUnderperformingStaff)
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

  // Перехоплені виключення СУБД (Пункт 4) та сповіщення операцій
  const [sqlError, setSqlError] = useState<SqlErrorResponse | null>(null);
  const [successToast, setSuccessToast] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  // Робоча дія 1: Оформлення продажу обраної страви через процедуру dbo.sp_CreateOrder
  const handleCreateOrder = async () => {
    const targetDishId = selectedDishId || 1;
    const payload = {
      checkNo: orderCheckNo,
      dishID: targetDishId,
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
        title: 'Чек проведено (dbo.sp_CreateOrder)',
        message: data.message,
      });
      setOrderCheckNo((prev) => prev + 1);
      await fetchDashboardData(true);
      await fetchDishMasterDetail(targetDishId);
      await runFunctionsQuery(fnDishName, fnCategoryId);
    }
  };

  // Робоча дія 2: Зміна типу оплати існуючого замовлення (спрацьовує тригер tr_OrdersLoging -> запис в OrdersLogs)
  const handleCycleOrderPayment = async (orderId: number, currentPayment: string) => {
    const types = ['Картка', 'Готівка', 'Безготівковий'];
    const nextType = types[(types.indexOf(currentPayment) + 1) % types.length];

    setSqlError(null);
    setSuccessToast(null);

    const res = await fetch(`/api/restaurant/orders/${orderId}/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentType: nextType }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      setSqlError(data as SqlErrorResponse);
    } else {
      setSuccessToast({
        title: 'Замовлення оновлено (Тригер tr_OrdersLoging)',
        message: data.message,
      });
      if (selectedDishId !== null) {
        await fetchDishMasterDetail(selectedDishId);
      }
      await fetchDashboardData(true);
    }
  };

  // Робоча дія 3: Додавання нової страви в меню через процедуру dbo.sp_AddMenuDish
  const handleAddMenuDish = async () => {
    const payload = {
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
        title: 'Страву додано (dbo.sp_AddMenuDish)',
        message: data.message,
      });
    }
  };

  // Робоча дія 4: Оптимізація персоналу неприбуткових ресторанів через процедуру ЛР №1 dbo.sp_RemoveUnderperformingStaff
  const handleOptimizeStaff = async () => {
    setSqlError(null);
    setSuccessToast(null);

    const res = await fetch('/api/restaurant/procedures/optimize-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minSalesThreshold: staffThreshold }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      setSqlError(data as SqlErrorResponse);
    } else {
      setSuccessToast({
        title: 'Процедуру dbo.sp_RemoveUnderperformingStaff виконано!',
        message: data.message,
      });
      await fetchDashboardData(true);
      if (selectedDishId !== null) {
        await fetchDishMasterDetail(selectedDishId);
      }
    }
  };

  const handleRestoreDemoStaff = async () => {
    setSqlError(null);
    const res = await fetch('/api/restaurant/procedures/restore-demo-staff', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setSuccessToast({
        title: 'Штат персоналу відновлено в БД',
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
      {/* ЛІВИЙ ІКОНКОВИЙ САЙДБАР */}
      <aside className="w-20 bg-[#15151a] border-r border-white/5 flex flex-col items-center py-6 justify-between shrink-0 z-20">
        <div className="flex flex-col items-center gap-8">
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

          <nav className="flex flex-col gap-4">
            <button
              onClick={() => setActiveNav('pos')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                activeNav === 'pos'
                  ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/30'
                  : 'text-zinc-400 hover:bg-[#22222b] hover:text-white'
              }`}
              title="Каса POS & Master-Detail"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('procedures')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                activeNav === 'procedures'
                  ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/30'
                  : 'text-zinc-400 hover:bg-[#22222b] hover:text-white'
              }`}
              title="Керування меню & Персоналом (Збережені процедури)"
            >
              <Terminal className="w-5 h-5" />
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
              title="Аналітика функцій (Скалярні & Таблична)"
            >
              <FunctionSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveNav('audit')}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                activeNav === 'audit'
                  ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/30'
                  : 'text-zinc-400 hover:bg-[#22222b] hover:text-white'
              }`}
              title="Журнали аудиту та тригерів СУБД"
            >
              <Activity className="w-5 h-5" />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => fetchDashboardData(true)}
            className="w-11 h-11 rounded-2xl bg-[#1e1e26] text-zinc-400 hover:text-[#ff6b00] flex items-center justify-center transition cursor-pointer"
            title="Синхронізувати з MS SQL Server"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-[#ff6b00]' : ''}`} />
          </button>
          <div
            className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"
            title="MS SQL Server: RestaurantDB Online"
          />
        </div>
      </aside>

      {/* ОСНОВНИЙ КОНТЕЙНЕР: ЦЕНТРАЛЬНА ОБЛАСТЬ + ПРАВА ПАНЕЛЬ КАСИ */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* ЦЕНТРАЛЬНА РОБОЧА ОБЛАСТЬ */}
        <main className="flex-1 flex flex-col min-w-0 p-5 lg:p-7 overflow-y-auto">
          {/* ВЕРХНІЙ БАР */}
          <header className="bg-[#18181f] border border-white/5 rounded-3xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 mb-5 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#ff6b00] to-amber-400 p-0.5 shrink-0">
                <div className="w-full h-full rounded-full bg-[#18181f] flex items-center justify-center font-bold text-sm text-[#ff6b00]">
                  МЄ
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-semibold text-base tracking-tight text-white">
                    Matvii Yeromenko
                  </h1>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#ff6b00]/15 text-[#ff8533] border border-[#ff6b00]/30">
                    ПЗПІ-24-2 • Варіант 5
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  MS SQL Server (`RestaurantDB`) • ASP.NET Core 8 + Dapper
                </p>
              </div>
            </div>

            <div className="relative flex-1 max-w-md min-w-[220px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук страви за назвою, цехом або рестораном..."
                className="w-full bg-[#22222b] border border-white/5 focus:border-[#ff6b00]/60 rounded-full pl-11 pr-9 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none transition"
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

            <div className="flex items-center gap-2.5">
              <div className="bg-[#22222b] px-3.5 py-2 rounded-2xl border border-white/5">
                <div className="text-[11px] text-zinc-400">Виручка мережі</div>
                <div className="text-sm font-bold text-white whitespace-nowrap">
                  {totalChainRevenue.toLocaleString('uk-UA')} ₴
                </div>
              </div>
              <div className="bg-[#22222b] px-3.5 py-2 rounded-2xl border border-white/5">
                <div className="text-[11px] text-zinc-400">Продано порцій</div>
                <div className="text-sm font-bold text-[#ff8533] whitespace-nowrap">
                  {totalChainSoldPortions} од.
                </div>
              </div>
            </div>
          </header>

          {/* НАВІГАЦІЯ РОБОЧИМИ МОДУЛЯМИ (без обрізання тексту) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
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
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                  1. POS Термінал
                </div>
                <div className="text-xs font-semibold leading-tight mt-0.5">
                  Меню & Master-Detail
                </div>
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
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                  2. Адміністрування
                </div>
                <div className="text-xs font-semibold leading-tight mt-0.5">
                  Процедури: Меню & Штат
                </div>
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
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                  3. Аналітика цехів
                </div>
                <div className="text-xs font-semibold leading-tight mt-0.5">
                  Скалярні & Таблична функції
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveNav('audit')}
              className={`px-4 py-3 rounded-2xl text-left border transition cursor-pointer flex items-center gap-3 ${
                activeNav === 'audit'
                  ? 'bg-[#ff6b00]/15 border-[#ff6b00] text-white'
                  : 'bg-[#18181f] border-white/5 text-zinc-400 hover:bg-[#1f1f29]'
              }`}
            >
              <Activity
                className={`w-5 h-5 shrink-0 ${
                  activeNav === 'audit' ? 'text-[#ff6b00]' : 'text-zinc-500'
                }`}
              />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                  4. Моніторинг СУБД
                </div>
                <div className="text-xs font-semibold leading-tight mt-0.5">
                  Журнали Тригерів & Логи БД
                </div>
              </div>
            </button>
          </div>

          {/* ГЛОБАЛЬНИЙ БАНЕР ПЕРЕХОПЛЕНОГО ВИКЛЮЧЕННЯ СУБД (Спрацьовує при будь-якому порушенні правил БД у формах) */}
          {sqlError && (
            <div className="mb-5 bg-red-950/75 border-2 border-red-500/80 rounded-3xl p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500 text-white">
                        Виключення MS SQL Server
                      </span>
                      <span className="text-xs font-mono text-red-200 bg-red-950 px-2.5 py-0.5 rounded-lg border border-red-500/30">
                        Msg {sqlError.sqlErrorNumber} • Severity {sqlError.sqlClass} • State{' '}
                        {sqlError.sqlState}
                      </span>
                      <span className="text-xs font-mono text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-lg">
                        Джерело: {sqlError.procedureOrTrigger} (Рядок {sqlError.lineNumber})
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-relaxed break-words">
                      {sqlError.message}
                    </p>
                    <p className="text-xs text-red-300/80 mt-1">
                      Транзакцію автоматично відкочено сервером бази даних (RAISERROR / ROLLBACK),
                      перехоплено через SqlException у C# та оброблено клієнтом.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSqlError(null)}
                  className="text-red-300 hover:text-white p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {successToast && (
            <div className="mb-5 bg-emerald-950/60 border border-emerald-500/60 rounded-3xl p-4 flex items-center justify-between gap-4 shadow-xl">
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
                className="text-emerald-300 hover:text-white p-1.5 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =================================================================== */}
          {/* РОЗДІЛ 1: POS МЕНЮ ТА MASTER-DETAIL (Реальне замовлення страв)      */}
          {/* =================================================================== */}
          {activeNav === 'pos' && (
            <>
              {/* Капсульні вкладки категорій меню */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-3 mb-4">
                <button
                  onClick={() => setSelectedCategory(0)}
                  className={`flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
                    selectedCategory === 0
                      ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/25'
                      : 'bg-[#1c1c24] text-zinc-300 hover:bg-[#252530] border border-white/5'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      selectedCategory === 0 ? 'bg-white/20' : 'bg-[#2a2a36]'
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
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
                      className={`flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full text-xs sm:text-sm font-medium transition shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/25'
                          : 'bg-[#1c1c24] text-zinc-300 hover:bg-[#252530] border border-white/5'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-white/20' : 'bg-[#2a2a36]'
                        }`}
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                      </span>
                      <span>{cat.categoryName}</span>
                      <span className="text-xs opacity-75">({cat.dishCount})</span>
                    </button>
                  );
                })}
              </div>

              {/* СІТКА КАРТОК СТРАВ (виправлено бейджі зверху на фото, щоб ніколи не перекривали один одного!) */}
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
                      }}
                      className={`group bg-[#191920] rounded-3xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#ff6b00] ring-2 ring-[#ff6b00]/25 shadow-2xl shadow-[#ff6b00]/10'
                          : 'border-white/5 hover:border-white/15 hover:bg-[#1e1e27]'
                      }`}
                    >
                      <div>
                        {/* Зображення страви з охайним flex-рядком бейджів зверху та знизу */}
                        <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-3.5 bg-[#25252f]">
                          <img
                            src={getDishImage(dish.name)}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40" />

                          {/* Верхній рядок бейджів — flex justify-between gap-2, ніякого накладання! */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                            <div className="bg-black/75 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 min-w-0 max-w-[55%]">
                              <MapPin className="w-3 h-3 text-[#ff6b00] shrink-0" />
                              <span className="truncate">{dish.restaurantName}</span>
                            </div>

                            <div
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border shrink-0 whitespace-nowrap ${
                                isAtLimit
                                  ? 'bg-red-500/90 text-white border-red-400'
                                  : 'bg-black/75 text-emerald-300 border-white/10'
                              }`}
                            >
                              Продано: {dish.totalSoldQuantity}/100
                            </div>
                          </div>

                          {/* Нижній рядок на фото */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 text-[11px] text-zinc-200">
                            <span className="bg-black/70 backdrop-blur-sm px-2.5 py-0.5 rounded-md truncate">
                              {dish.kitchenStation}
                            </span>
                            <span className="bg-black/70 backdrop-blur-sm px-2.5 py-0.5 rounded-md shrink-0">
                              Склад: {dish.quantity} порц.
                            </span>
                          </div>
                        </div>

                        <h3 className="font-bold text-base text-white group-hover:text-[#ff8533] transition leading-snug">
                          {dish.name}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {dish.description ||
                            `${dish.categoryName} • Постачальник: ${dish.supplierCompany}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-extrabold text-white">
                            ₴{dish.price.toFixed(2)}
                          </span>
                          <span className="text-xs text-zinc-500 line-through">
                            ₴{oldPrice.toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDishId(dish.dishID);
                            setRightTab('order');
                          }}
                          className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            isSelected && rightTab === 'order'
                              ? 'bg-[#ff6b00] text-white shadow-md shadow-[#ff6b00]/30'
                              : 'bg-[#262631] text-zinc-200 hover:bg-[#ff6b00] hover:text-white'
                          }`}
                          title="Замовити страву через касу (dbo.sp_CreateOrder)"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Замовити</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* =================================================================== */}
          {/* РОЗДІЛ 2: КЕРУВАННЯ МЕНЮ ТА ШТАТОМ (Виконання збережених процедур)  */}
          {/* =================================================================== */}
          {activeNav === 'procedures' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* ЛІВА КАРТКА: Додавання нової страви в меню (dbo.sp_AddMenuDish) */}
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#ff6b00]/15 text-[#ff6b00] flex items-center justify-center shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white leading-snug">
                        Додавання страви в меню
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Процедура <code className="text-[#ff8533]">dbo.sp_AddMenuDish</code> +
                        тригер робочого часу <code className="text-amber-300">createOrdersTrigger</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#22222b] rounded-2xl p-3.5 border border-white/5 text-xs text-zinc-300 mb-4 leading-relaxed">
                  Додає нову позицію у таблицю <code className="text-white">dbo.Dishes</code>. Якщо
                  ввести ціну <code className="text-red-300">&lt;= 0</code> або порожню назву,
                  процедура БД згенерує виключення <code className="text-red-300">RAISERROR</code>.
                  Також при вставці спрацьовує тригер <code className="text-amber-300">createOrdersTrigger</code>{' '}
                  (перевірка робочого часу 09:00–18:00 пн–пт).
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-zinc-400 block mb-1">Назва страви (@Name)</label>
                    <input
                      type="text"
                      value={newDishName}
                      onChange={(e) => setNewDishName(e.target.value)}
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      Категорія цеху (@CategoryID)
                    </label>
                    <select
                      value={newDishCategory}
                      onChange={(e) => setNewDishCategory(Number(e.target.value))}
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    >
                      {lookup?.categories.map((c) => (
                        <option key={c.categoryID} value={c.categoryID}>
                          #{c.categoryID} — {c.categoryName}
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
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    >
                      {lookup?.restaurants.map((r) => (
                        <option key={r.restID} value={r.restID}>
                          #{r.restID} — {r.name} ({r.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      Ціна страви, грн (@Price)
                    </label>
                    <input
                      type="number"
                      value={newDishPrice}
                      onChange={(e) => setNewDishPrice(Number(e.target.value))}
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">
                      Початковий склад (@Quantity)
                    </label>
                    <input
                      type="number"
                      value={newDishQty}
                      onChange={(e) => setNewDishQty(Number(e.target.value))}
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-zinc-400 block mb-1">
                      Постачальник (@SupplierID)
                    </label>
                    <select
                      value={newDishSupplier}
                      onChange={(e) => setNewDishSupplier(Number(e.target.value))}
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    >
                      {lookup?.suppliers.map((s) => (
                        <option key={s.supplierID} value={s.supplierID}>
                          #{s.supplierID} — {s.companyName} ({s.city})
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
                      className="w-full bg-[#22222b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddMenuDish}
                  className="mt-5 w-full bg-[#ff6b00] hover:bg-[#ff7b1a] text-white font-semibold py-3 rounded-2xl shadow-lg shadow-[#ff6b00]/25 transition cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Додати страву в меню (EXEC dbo.sp_AddMenuDish)</span>
                </button>
              </div>

              {/* ПРАВА КАРТКА: Оптимізація штату персоналу з ЛР №1 (dbo.sp_RemoveUnderperformingStaff) */}
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-white leading-snug">
                      Оптимізація штату персоналу (ЛР №1, Завдання 14)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 break-all">
                      Процедура <code className="text-amber-300">dbo.sp_RemoveUnderperformingStaff</code>
                    </p>
                  </div>
                </div>

                <div className="bg-[#22222b] rounded-2xl p-3.5 border border-white/5 text-xs text-zinc-300 mb-4 leading-relaxed">
                  Звільняє працівників (крім <code className="text-emerald-300">Manager</code>) із
                  ресторанів, чия сумарна виручка менша за поріг{' '}
                  <code className="text-amber-300">@MinSalesThreshold</code>. Працівники, які
                  підпадають під скорочення при поточному порозі, підсвічені червоним бейджем{' '}
                  <b>«Під скорочення»</b>. При введенні від&apos;ємного порогу генерується
                  виключення БД.
                </div>

                <div className="mb-4">
                  <label className="text-xs text-zinc-400 block mb-1.5">
                    Мінімальний поріг виручки ресторану (@MinSalesThreshold, грн):
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
                    <input
                      type="number"
                      value={staffThreshold}
                      onChange={(e) => setStaffThreshold(Number(e.target.value))}
                      className="w-full sm:flex-1 bg-[#22222b] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#ff6b00] focus:outline-none"
                    />
                    <button
                      onClick={handleOptimizeStaff}
                      className="w-full sm:w-auto bg-[#ff6b00] hover:bg-[#ff7b1a] text-white font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shrink-0 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Скоротити штат</span>
                    </button>
                  </div>
                </div>

                {/* Таблиця штату (виправлено внутрішні відступи та висоту рядків — нічого не налізає на шапку!) */}
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#14141a]">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#22222b] text-zinc-300 sticky top-0 z-10 border-b border-white/10">
                        <tr>
                          <th className="py-3 px-3.5 font-semibold">ПІБ працівника</th>
                          <th className="py-3 px-3 font-semibold">Посада</th>
                          <th className="py-3 px-3 font-semibold">Ресторан</th>
                          <th className="py-3 px-3.5 font-semibold text-right">Виручка / Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {lookup?.staff.map((st) => {
                          const isManager = st.information === 'Manager';
                          const isBelowThreshold = st.restaurantRevenue < staffThreshold;
                          const willBeRemoved = !isManager && isBelowThreshold;

                          return (
                            <tr
                              key={st.staffID}
                              className={`transition ${
                                willBeRemoved ? 'bg-red-500/10 hover:bg-red-500/15' : 'hover:bg-white/5'
                              }`}
                            >
                              <td className="py-3 px-3.5 font-medium text-white whitespace-nowrap">
                                #{st.staffID} {st.name}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium inline-block ${
                                    isManager
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-zinc-800 text-zinc-300'
                                  }`}
                                >
                                  {st.information}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-zinc-300 whitespace-nowrap">
                                {st.restaurantName}
                              </td>
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                <div
                                  className={`font-bold ${
                                    isBelowThreshold ? 'text-red-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {st.restaurantRevenue.toLocaleString('uk-UA')} ₴
                                </div>
                                <div className="text-[10px] mt-0.5">
                                  {willBeRemoved ? (
                                    <span className="text-red-300 font-semibold">
                                      Під скорочення
                                    </span>
                                  ) : isManager && isBelowThreshold ? (
                                    <span className="text-emerald-400">Захищений (Manager)</span>
                                  ) : (
                                    <span className="text-zinc-500">Рентабельний</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-zinc-400">
                    Активний штат у БД: <b>{lookup?.staff.length || 0}</b> співроб.
                  </span>
                  <button
                    onClick={handleRestoreDemoStaff}
                    className="text-xs bg-[#22222b] hover:bg-[#2c2c38] text-zinc-200 px-3.5 py-2 rounded-xl border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#ff6b00]" />
                    <span>Повернути звільнених працівників у штат</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* РОЗДІЛ 3: СКАЛЯРНА ТА ТАБЛИЧНА ФУНКЦІЇ (Автоматичний розрахунок)     */}
          {/* =================================================================== */}
          {activeNav === 'functions' && (
            <div className="space-y-6">
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-[#ff6b00]/15 text-[#ff6b00] flex items-center justify-center shrink-0">
                    <FunctionSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Аналітика T-SQL функцій (Скалярні та Таблична функції з ЛР №1)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Оберіть страву або кухонний відділ — результати автоматично обчислюються на
                      сервері MS SQL Server
                    </p>
                  </div>
                </div>

                {/* 2 дропдауни без зайвої кнопки */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">
                      Страва меню — параметр <code className="text-[#ff8533]">@DishName</code> для
                      скалярної функції ЛР №1:
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
                      <option value="Трюфельний Різотто (Відсутній)">
                        Трюфельний Різотто (Перевірка відсутності замовлень)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5">
                      Відділ кухні — параметр <code className="text-emerald-400">@CategoryID</code>{' '}
                      для підрахунку кількості та табличної функції:
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
                </div>

                {/* Картки результатів скалярних функцій */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <div className="bg-[#22222b] border border-[#ff6b00]/30 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-[#ff8533] uppercase tracking-wider">
                        Скалярна функція №1 (Варіант 5 ЛР №1)
                      </span>
                      <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-zinc-300">
                        dbo.fn_GetMaxOrderForDish
                      </code>
                    </div>
                    <div className="text-base font-bold text-white mt-1">
                      {scalarResult?.maxOrderResult || 'Обчислення...'}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-2.5 bg-black/30 px-2.5 py-1.5 rounded-lg break-all">
                      {scalarResult?.sqlExecuted?.[0]}
                    </div>
                  </div>

                  <div className="bg-[#22222b] border border-emerald-500/30 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Скалярна функція №2 (Кількість страв у відділі)
                      </span>
                      <code className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-zinc-300">
                        dbo.fn_GetCategoryDishCount
                      </code>
                    </div>
                    <div className="text-2xl font-extrabold text-white mt-1">
                      {scalarResult?.categoryDishCount ?? 0}{' '}
                      <span className="text-sm font-normal text-zinc-400">
                        позицій меню у вибраному відділі
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-2.5 bg-black/30 px-2.5 py-1.5 rounded-lg break-all">
                      {scalarResult?.sqlExecuted?.[1]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Результат Табличної функції */}
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#ff6b00]" />
                      <span>
                        Таблична функція: dbo.fn_GetDishesAnalyticsByCategory({fnCategoryId})
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Виконується запит:{' '}
                      <code className="text-[#ff8533]">{tvfResult?.sqlExecuted}</code>
                    </p>
                  </div>
                  <span className="text-xs bg-[#22222b] px-3 py-1 rounded-full text-zinc-300 border border-white/5">
                    Рядків у вибірці: <b>{tvfResult?.rows.length || 0}</b>
                  </span>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#22222b] text-zinc-300 uppercase">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Страва</th>
                        <th className="py-3 px-4">Категорія / Цех</th>
                        <th className="py-3 px-4">Ресторан</th>
                        <th className="py-3 px-4 text-right">Ціна</th>
                        <th className="py-3 px-4 text-right">Склад</th>
                        <th className="py-3 px-4 text-right">Чеків</th>
                        <th className="py-3 px-4 text-right">Продано</th>
                        <th className="py-3 px-4 text-right">Виручка</th>
                        <th className="py-3 px-4 text-right">До ліміту 100</th>
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
                          <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                            {row.price.toFixed(2)} ₴
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {row.inStockQuantity} од.
                          </td>
                          <td className="py-2.5 px-4 text-right">{row.ordersCount}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-white whitespace-nowrap">
                            {row.totalSoldQuantity} порц.
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-[#ff8533] whitespace-nowrap">
                            {row.totalRevenue.toLocaleString('uk-UA')} ₴
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-semibold ${
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
          {/* РОЗДІЛ 4: МОНІТОРИНГ ТРИГЕРІВ ТА ЖУРНАЛИ АУДИТУ СУБД (Лаб №2–3)     */}
          {/* =================================================================== */}
          {activeNav === 'audit' && (
            <div className="space-y-6">
              {/* Активні тригери з системного каталогу sys.triggers */}
              <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">
                        Активні DML-тригери бази даних RestaurantDB (з sys.triggers)
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Серверні правила, які автоматично контролюють усі операції INSERT та UPDATE
                        у робочому процесі
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lookup?.triggers.map((tr) => (
                    <div
                      key={tr.triggerName}
                      className="bg-[#22222b] border border-white/5 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-mono font-bold text-[#ff8533]">
                          {tr.triggerName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {tr.isDisabled ? 'Disabled' : 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-300">
                        Таблиця: <b className="text-white">dbo.{tr.tableName}</b> • Тип:{' '}
                        <code className="text-amber-300">{tr.triggerType}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Таблиця аудиту змін замовлень dbo.OrdersLogs (тригер tr_OrdersLoging) */}
                <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <h3 className="font-bold text-base text-white mb-1 flex items-center gap-2">
                    <History className="w-4 h-4 text-[#ff6b00]" />
                    <span>Журнал модифікацій чеків (таблиця dbo.OrdersLogs)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">
                    Заповнюється тригером <code className="text-[#ff8533]">tr_OrdersLoging</code>{' '}
                    (AFTER UPDATE) щоразу, коли касир змінює тип оплати замовлення у правій панелі
                  </p>

                  <div className="overflow-x-auto border border-white/5 rounded-2xl max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#22222b] text-zinc-300 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3.5">Log ID</th>
                          <th className="py-2.5 px-3.5">Замовлення</th>
                          <th className="py-2.5 px-3.5">Страва</th>
                          <th className="py-2.5 px-3.5">Оплата</th>
                          <th className="py-2.5 px-3.5">Час зміни (ModifyDate)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {lookup?.orderLogs.map((ol) => (
                          <tr key={ol.id} className="hover:bg-white/5">
                            <td className="py-2.5 px-3.5 font-mono text-zinc-400">#{ol.id}</td>
                            <td className="py-2.5 px-3.5 font-semibold text-white">
                              №{ol.orderId} {ol.checkNo ? `(Чек #${ol.checkNo})` : ''}
                            </td>
                            <td className="py-2.5 px-3.5 text-zinc-300">
                              {ol.dishName || '—'}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[#ff8533]">
                                {ol.paymentType || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-zinc-400">
                              {new Date(ol.modifyDate).toLocaleString('uk-UA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Таблиця аудиту заблокованих спроб додавання страв dbo.DishesAttemptLogs */}
                <div className="bg-[#18181f] border border-white/5 rounded-3xl p-6 shadow-xl">
                  <h3 className="font-bold text-base text-white mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ff6b00]" />
                    <span>Журнал блокувань меню (таблиця dbo.DishesAttemptLogs)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">
                    Заповнюється тригером <code className="text-[#ff8533]">createOrdersTrigger</code>{' '}
                    (INSTEAD OF INSERT) при спробі додати нову страву у вихідні або поза робочим
                    часом (09:00–18:00)
                  </p>

                  <div className="overflow-x-auto border border-white/5 rounded-2xl max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#22222b] text-zinc-300 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3.5">LogId</th>
                          <th className="py-2.5 px-3.5">Назва страви</th>
                          <th className="py-2.5 px-3.5">Час спроби</th>
                          <th className="py-2.5 px-3.5">Статус тригера</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {lookup?.auditLogs.map((log) => (
                          <tr key={log.logId} className="hover:bg-white/5">
                            <td className="py-2.5 px-3.5 font-mono text-zinc-400">#{log.logId}</td>
                            <td className="py-2.5 px-3.5 font-medium text-white">
                              {log.dishName}
                            </td>
                            <td className="py-2.5 px-3.5 text-zinc-400 whitespace-nowrap">
                              {new Date(log.attemptDate).toLocaleString('uk-UA')}
                            </td>
                            <td className="py-2.5 px-3.5 text-red-300">{log.statusMessage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ===================================================================== */}
        {/* ПРАВА ПАНЕЛЬ КАСИРА: MASTER-DETAIL ТА ОФОРМЛЕННЯ ЗАМОВЛЕННЯ           */}
        {/* ===================================================================== */}
        <aside className="w-full lg:w-[410px] xl:w-[440px] bg-[#15151b] border-t lg:border-t-0 lg:border-l border-white/5 p-6 flex flex-col justify-between shrink-0">
          <div>
            {/* Перемикач режиму правої панелі */}
            <div className="bg-[#202029] p-1.5 rounded-full grid grid-cols-2 gap-1 mb-5 border border-white/5">
              <button
                onClick={() => setRightTab('details')}
                className={`py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  rightTab === 'details'
                    ? 'bg-[#2e2e3a] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Історія продажів (Detail)
              </button>
              <button
                onClick={() => setRightTab('order')}
                className={`py-2 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  rightTab === 'order'
                    ? 'bg-[#ff6b00] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Оформити замовлення
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
                        <span className="text-[11px] font-semibold text-[#ff8533] uppercase tracking-wider truncate">
                          {masterDetail.dish.categoryName}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 shrink-0">
                          ID #{masterDetail.dish.dishID}
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-white leading-snug mt-0.5">
                        {masterDetail.dish.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
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

                  <div className="mt-3 bg-[#ff6b00]/10 border border-[#ff6b00]/25 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-[#ff6b00] shrink-0" />
                    <div className="text-xs min-w-0">
                      <span className="text-zinc-400 block text-[10px] uppercase">
                        Рекордне замовлення (fn_GetMaxOrderForDish):
                      </span>
                      <span className="font-semibold text-white">
                        {masterDetail.maxOrderHighlight}
                      </span>
                    </div>
                  </div>
                </div>

                {/* АБО СПИСОК ПРОДАЖІВ СТРАВИ, АБО ЖИВА ФОРМА КАСИ */}
                {rightTab === 'details' ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#ff6b00]" />
                        <span>Чеки по страві (dbo.Orders)</span>
                      </h4>
                      <span className="text-xs text-zinc-400">
                        Усього: <b>{masterDetail.salesHistory.length}</b>
                      </span>
                    </div>

                    {loadingDetails ? (
                      <div className="py-12 text-center text-xs text-zinc-500">
                        Завантаження чеків...
                      </div>
                    ) : masterDetail.salesHistory.length === 0 ? (
                      <div className="bg-[#1d1d26] border border-white/5 rounded-2xl p-6 text-center">
                        <Package className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                        <p className="text-xs text-zinc-400">
                          Для цієї страви ще немає продажів у таблиці Orders.
                        </p>
                        <button
                          onClick={() => setRightTab('order')}
                          className="mt-3 text-xs text-[#ff8533] hover:underline cursor-pointer font-medium"
                        >
                          + Оформити перше замовлення
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {masterDetail.salesHistory.map((sale) => (
                          <div
                            key={sale.orderID}
                            className="bg-[#1d1d26] hover:bg-[#23232e] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-2 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#272733] flex flex-col items-center justify-center text-xs font-bold text-[#ff8533] shrink-0">
                                <span>#{sale.checkNo}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white flex flex-wrap items-center gap-1.5">
                                  <span>Замовлення №{sale.orderID}</span>
                                  <button
                                    onClick={() =>
                                      handleCycleOrderPayment(sale.orderID, sale.paymentType)
                                    }
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6b00]/15 hover:bg-[#ff6b00] text-[#ff8533] hover:text-white border border-[#ff6b00]/30 transition cursor-pointer"
                                    title="Натисніть, щоб змінити спосіб оплати (спрацює тригер tr_OrdersLoging)"
                                  >
                                    {sale.paymentType} ↻
                                  </button>
                                </div>
                                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                                  {new Date(sale.orderDate).toLocaleDateString('uk-UA')} •{' '}
                                  {sale.staffName}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
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
                  /* РОБОЧА ФОРМА ОФОРМЛЕННЯ ЗАМОВЛЕННЯ КАСИРОМ (dbo.sp_CreateOrder) */
                  <div className="bg-[#1d1d26] border border-white/5 rounded-3xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Оформлення чека (dbo.sp_CreateOrder)
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Доступно: <b>{masterDetail.dish.quantity}</b> порц.
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
                        Обслуговуючий офіціант (@StaffID)
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
                        Спосіб оплати (@PaymentType)
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
                      onClick={handleCreateOrder}
                      className="w-full bg-[#ff6b00] hover:bg-[#ff7b1a] text-white font-semibold py-3 rounded-2xl shadow-lg shadow-[#ff6b00]/25 transition cursor-pointer flex items-center justify-center gap-2 text-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>
                        Провести замовлення (₴
                        {Math.max(0, masterDetail.dish.price * orderQuantity).toFixed(2)})
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

          {/* НИЖНІЙ ПІДСУМКОВИЙ БЛОК */}
          {masterDetail && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Усього продано порцій страви</span>
                  <span className="font-semibold text-white">
                    {masterDetail.dish.totalSoldQuantity} / 100 порц.
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Доступний залишок на складі</span>
                  <span className="font-semibold text-white">
                    {masterDetail.dish.quantity} порц.
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>До ліміту тригера tr_PreventOver100Sales</span>
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
                  <span className="text-sm font-bold text-white">Виручка по страві</span>
                  <span className="text-xl font-extrabold text-[#ff8533]">
                    ₴{masterDetail.dish.totalRevenue.toLocaleString('uk-UA')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setRightTab(rightTab === 'details' ? 'order' : 'details')}
                className="mt-4 w-full bg-[#23232e] hover:bg-[#2c2c3a] text-white font-semibold py-3 px-4 rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-white/5"
              >
                <ShoppingBag className="w-4 h-4 text-[#ff6b00]" />
                <span>
                  {rightTab === 'details'
                    ? 'Перейти до оформлення замовлення'
                    : 'Повернутися до історії чеків'}
                </span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
