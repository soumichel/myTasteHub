export type SaleStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_delivery' | 'completed' | 'cancelled';
export type SaleChannel = 'in_store' | 'ifood' | 'rappi' | 'whatsapp' | 'own_app' | 'phone';
export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'pix' | 'voucher';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface Store {
  id: string;
  name: string;
  slug: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birth_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  base_price: number;
  cost?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Sale {
  id: string;
  store_id: string;
  customer_id?: string;
  sale_date: Date;
  status: SaleStatus;
  channel: SaleChannel;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  service_fee: number;
  platform_fee: number;
  total: number;
  preparation_time?: number;
  delivery_time?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProductSale {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paid_at?: Date;
  transaction_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeliverySale {
  id: string;
  sale_id: string;
  driver_name?: string;
  picked_up_at?: Date;
  delivered_at?: Date;
  distance_km?: number;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryAddress {
  id: string;
  delivery_sale_id: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  created_at: Date;
  updated_at: Date;
}

