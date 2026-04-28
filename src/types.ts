export type UserRole = 'user' | 'admin' | 'rider';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  verified: boolean;
  createdAt: Date;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  categoryId?: string;
  image: string;
  description: string;
  available?: boolean;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'online';

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'pending' | 'paid';
  createdAt: Date;
  updatedAt: Date;
  address: string;
}
