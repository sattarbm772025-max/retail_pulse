import { api } from "./axios";


export type Category = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  product_count: number;
};


export type Product = {
  id: number;
  name: string;
  sku: string;
  category_id: number;
  category_name: string;
  brand: string | null;
  description: string | null;
  unit_price: number;
  cost_price: number;
  stock_quantity: number;
  unit_of_measure: string;
  status: string;
};


export type CatalogSummary = {
  total_products: number;
  active_products: number;
  inactive_products: number;
  total_categories: number;
};


export type CategoryPayload = {
  name: string;
  description: string;
  status: string;
};


export type ProductPayload = {
  name: string;
  sku: string;
  category_id: number;
  brand: string;
  description: string;
  unit_price: number;
  cost_price: number;
  stock_quantity: number;
  unit_of_measure: string;
  status: string;
};


export const catalogApi = {
  summary: () =>
    api.get<CatalogSummary>(
      "/products/summary"
    ),


  categories: (
    search = ""
  ) =>
    api.get<Category[]>(
      "/categories/",
      {
        params: {
          search: search || undefined,
        },
      }
    ),


  createCategory: (
    payload: CategoryPayload
  ) =>
    api.post<Category>(
      "/categories/",
      payload
    ),


  updateCategory: (
    id: number,
    payload: CategoryPayload
  ) =>
    api.put<Category>(
      `/categories/${id}`,
      payload
    ),


  deleteCategory: (
    id: number
  ) =>
    api.delete(
      `/categories/${id}`
    ),


  products: (
    params: Record<
      string,
      string | number | undefined
    >
  ) =>
    api.get<Product[]>(
      "/products/",
      {
        params,
      }
    ),


  createProduct: (
    payload: ProductPayload
  ) =>
    api.post<Product>(
      "/products/",
      payload
    ),


  updateProduct: (
    id: number,
    payload: ProductPayload
  ) =>
    api.put<Product>(
      `/products/${id}`,
      payload
    ),


  deleteProduct: (
    id: number
  ) =>
    api.delete(
      `/products/${id}`
    ),
};