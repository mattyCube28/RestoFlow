export interface DishCard {
  dishID: number;
  name: string;
  categoryID: number | null;
  categoryName: string;
  kitchenStation: string;
  isSeasonal: boolean;
  price: number;
  quantity: number;
  producer: string;
  supplierID: number | null;
  supplierCompany: string;
  supplierCity: string;
  restID: number | null;
  restaurantName: string;
  restaurantCity: string;
  restaurantRating: number;
  description: string;
  ordersCount: number;
  totalSoldQuantity: number;
  totalRevenue: number;
}

export interface DishOrderItem {
  orderID: number;
  checkNo: number;
  orderDate: string;
  quantity: number;
  lineTotal: number;
  paymentType: string;
  staffID: number | null;
  staffName: string;
  staffRole: string;
}

export interface DishMasterDetail {
  dish: DishCard;
  maxOrderHighlight: string;
  salesHistory: DishOrderItem[];
}

export interface MenuCategory {
  categoryID: number;
  categoryName: string;
  kitchenStation: string;
  isSeasonal: boolean;
  dishCount: number;
}

export interface Restaurant {
  restID: number;
  name: string;
  city: string;
  rating: number;
  info: string;
  totalRevenue: number;
  staffCount: number;
}

export interface Supplier {
  supplierID: number;
  companyName: string;
  contactPhone: string;
  city: string;
  reliabilityScore: number;
}

export interface StaffMember {
  staffID: number;
  name: string;
  address: string;
  phone: string | null;
  salary: number | null;
  restID: number;
  restaurantName: string;
  information: string;
  restaurantRevenue: number;
}

export interface AuditLog {
  logId: number;
  dishName: string;
  attemptDate: string;
  userLogin: string;
  statusMessage: string;
}

export interface OrderAuditLog {
  id: number;
  orderId: number;
  checkNo: number | null;
  dishName: string | null;
  paymentType: string | null;
  modifyDate: string;
}

export interface SystemTriggerInfo {
  tableName: string;
  triggerName: string;
  triggerType: string;
  isDisabled: boolean;
  createdDate: string;
}

export interface LookupData {
  categories: MenuCategory[];
  restaurants: Restaurant[];
  suppliers: Supplier[];
  staff: StaffMember[];
  auditLogs: AuditLog[];
  orderLogs: OrderAuditLog[];
  triggers: SystemTriggerInfo[];
}

export interface DishAnalyticsRow {
  dishID: number;
  dishName: string;
  categoryName: string;
  kitchenStation: string;
  restaurantName: string;
  price: number;
  inStockQuantity: number;
  ordersCount: number;
  totalSoldQuantity: number;
  totalRevenue: number;
  remainingQuotaTo100: number;
}

export interface SqlErrorResponse {
  error: boolean;
  isDatabaseException: boolean;
  source: string;
  sqlErrorNumber: number;
  sqlState: number;
  sqlClass: number;
  procedureOrTrigger: string;
  lineNumber: number;
  message: string;
  timestamp: string;
}
