import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  storeIds?: string[];
  channels?: string[];
}

export interface SalesOverview {
  totalRevenue: number;
  totalSales: number;
  avgTicket: number;
  completedSales: number;
  cancelledSales: number;
  growthRate: number;
}

export interface ChannelPerformance {
  channel: string;
  revenue: number;
  orders: number;
  avgTicket: number;
  platformFee: number;
  netRevenue: number;
}

export interface ProductRanking {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  orders: number;
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  avgTicket: number;
}

export interface HourlyPerformance {
  hour: number;
  day_of_week: number;
  avg_sales: number;
  avg_revenue: number;
  avg_ticket: number;
}

export interface ChurnRiskCustomer {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  lifetime_value: number;
  last_order_date: string;
  days_since_last_order: number;
}

export interface DeliveryRegionPerformance {
  city: string;
  neighborhood: string;
  total_deliveries: number;
  avg_delivery_time: number;
  avg_distance: number;
  avg_order_value: number;
}

export interface Store {
  id: string;
  name: string;
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  private buildParams(filters: AnalyticsFilters): HttpParams {
    let params = new HttpParams();
    
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.storeIds?.length) {
      params = params.set('storeIds', filters.storeIds.join(','));
    }
    if (filters.channels?.length) {
      params = params.set('channels', filters.channels.join(','));
    }
    
    return params;
  }

  getSalesOverview(filters: AnalyticsFilters = {}): Observable<SalesOverview> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<SalesOverview>>(`${this.apiUrl}/overview`, { params })
      .pipe(map(response => response.data));
  }

  getChannelPerformance(filters: AnalyticsFilters = {}): Observable<ChannelPerformance[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<ChannelPerformance[]>>(`${this.apiUrl}/channels`, { params })
      .pipe(map(response => response.data));
  }

  getTopProducts(filters: AnalyticsFilters = {}, limit: number = 20): Observable<ProductRanking[]> {
    let params = this.buildParams(filters);
    params = params.set('limit', limit.toString());
    return this.http.get<ApiResponse<ProductRanking[]>>(`${this.apiUrl}/products/top`, { params })
      .pipe(map(response => response.data));
  }

  getTimeSeries(filters: AnalyticsFilters = {}): Observable<TimeSeriesData[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<TimeSeriesData[]>>(`${this.apiUrl}/time-series`, { params })
      .pipe(map(response => response.data));
  }

  getHourlyPerformance(filters: AnalyticsFilters = {}): Observable<HourlyPerformance[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<HourlyPerformance[]>>(`${this.apiUrl}/hourly`, { params })
      .pipe(map(response => response.data));
  }

  getChurnRiskCustomers(days: number = 30, minOrders: number = 3): Observable<ChurnRiskCustomer[]> {
    const params = new HttpParams()
      .set('days', days.toString())
      .set('minOrders', minOrders.toString());
    return this.http.get<ApiResponse<ChurnRiskCustomer[]>>(`${this.apiUrl}/customers/churn-risk`, { params })
      .pipe(map(response => response.data));
  }

  getDeliveryPerformanceByRegion(filters: AnalyticsFilters = {}): Observable<DeliveryRegionPerformance[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<DeliveryRegionPerformance[]>>(`${this.apiUrl}/delivery/regions`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Ticket médio por canal
   */
  getAverageTicketByChannel(filters: AnalyticsFilters = {}): Observable<any[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/ticket-average/channel`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Ticket médio por loja
   */
  getAverageTicketByStore(filters: AnalyticsFilters = {}): Observable<any[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/ticket-average/store`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Top produtos por canal específico
   */
  getTopProductsByChannel(channel: string, filters: AnalyticsFilters = {}, limit: number = 10): Observable<any[]> {
    let params = this.buildParams(filters);
    params = params.set('channel', channel);
    params = params.set('limit', limit.toString());
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/products/by-channel`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Comparar performance entre duas lojas
   */
  compareStoresPerformance(storeIds: string[], filters: AnalyticsFilters = {}): Observable<any[]> {
    let params = this.buildParams(filters);
    params = params.set('storeIds', storeIds.join(','));
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/stores/compare`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Time series com dia da semana
   */
  getTimeSeriesByWeekday(filters: AnalyticsFilters = {}): Observable<any[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/weekday/time-series`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Performance agregada por dia da semana
   */
  getAggregatedWeekdayPerformance(filters: AnalyticsFilters = {}): Observable<any[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/weekday/aggregated`, { params })
      .pipe(map(response => response.data));
  }

  /**
   * Performance por hora + canal combinados
   */
  getHourlyPerformanceByChannel(filters: AnalyticsFilters = {}): Observable<any[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/hourly/by-channel`, { params })
      .pipe(map(response => response.data));
  }

  getStores(): Observable<Store[]> {
    return this.http.get<ApiResponse<Store[]>>(`${this.apiUrl}/filters/stores`)
      .pipe(map(response => response.data));
  }

  getChannels(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/filters/channels`)
      .pipe(map(response => response.data));
  }
}
