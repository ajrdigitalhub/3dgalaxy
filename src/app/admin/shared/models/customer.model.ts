import { Review } from './product.model';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  spent: number;
  orders: number;
  points: number;
  tier?: string;
  date?: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  discount: string;
  members: number;
}
