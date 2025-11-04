import { db } from '../database';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

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

export class AnalyticsRepository {
  /**
   * Overview geral de vendas com comparação de período
   * Performance target: <200ms
   */
  async getSalesOverview(filters: AnalyticsFilters): Promise<SalesOverview> {
    const { startDate, endDate, storeIds, channels } = filters;

    let query = db('sales')
      .select(
        db.raw('SUM(total) as total_revenue'),
        db.raw('COUNT(*) as total_sales'),
        db.raw('AVG(total) as avg_ticket'),
        db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed_sales"),
        db.raw("COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sales")
      )
      .whereBetween('sale_date', [
        startDate || subDays(new Date(), 30),
        endDate || new Date()
      ]);

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    if (channels?.length) {
      query = query.whereIn('channel', channels);
    }

    const current = await query.first();

    // Período anterior para comparação
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : subDays(new Date(), 30);
    
    const daysRange = Math.ceil(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    const previousQuery = db('sales')
      .select(db.raw('SUM(total) as total_revenue'))
      .whereBetween('sale_date', [
        subDays(startDateObj, daysRange),
        subDays(startDateObj, 1)
      ]);

    if (storeIds?.length) {
      previousQuery.whereIn('store_id', storeIds);
    }

    const previous = await previousQuery.first();

    const growthRate = previous?.total_revenue
      ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100
      : 0;

    return {
      totalRevenue: parseFloat(current.total_revenue || 0),
      totalSales: parseInt(current.total_sales || 0, 10),
      avgTicket: parseFloat(current.avg_ticket || 0),
      completedSales: parseInt(current.completed_sales || 0, 10),
      cancelledSales: parseInt(current.cancelled_sales || 0, 10),
      growthRate: parseFloat(growthRate.toFixed(2)),
    };
  }

  /**
   * Performance por canal (usa materialized view para performance)
   * Performance target: <150ms
   */
  async getChannelPerformance(filters: AnalyticsFilters): Promise<ChannelPerformance[]> {
    const { startDate, endDate, storeIds } = filters;

    let query = db('daily_sales_summary')
      .select(
        'channel',
        db.raw('SUM(total_revenue) as revenue'),
        db.raw('SUM(total_sales) as orders'),
        db.raw('AVG(avg_ticket) as avg_ticket'),
        db.raw('SUM(total_platform_fee) as platform_fee'),
        db.raw('SUM(total_revenue - total_platform_fee) as net_revenue')
      )
      .whereBetween('sale_day', [
        startOfDay(startDate || subDays(new Date(), 30)),
        endOfDay(endDate || new Date())
      ])
      .groupBy('channel')
      .orderBy('revenue', 'desc');

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    const results = await query;

    return results.map(row => ({
      channel: row.channel,
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders, 10),
      avgTicket: parseFloat(row.avg_ticket),
      platformFee: parseFloat(row.platform_fee),
      netRevenue: parseFloat(row.net_revenue),
    }));
  }

  /**
   * Top produtos vendidos
   * Performance target: <300ms
   */
  async getTopProducts(filters: AnalyticsFilters, limit: number = 20): Promise<ProductRanking[]> {
    const { startDate, endDate, storeIds, channels } = filters;

    let query = db('product_sales as ps')
      .select(
        'p.id as product_id',
        'p.name as product_name',
        'p.category',
        db.raw('SUM(ps.quantity) as quantity'),
        db.raw('SUM(ps.total_price) as revenue'),
        db.raw('COUNT(DISTINCT ps.sale_id) as orders')
      )
      .innerJoin('products as p', 'ps.product_id', 'p.id')
      .innerJoin('sales as s', 'ps.sale_id', 's.id')
      .where('s.status', 'completed')
      .whereBetween('s.sale_date', [
        startDate || subDays(new Date(), 30),
        endDate || new Date()
      ])
      .groupBy('p.id', 'p.name', 'p.category')
      .orderBy('revenue', 'desc')
      .limit(limit);

    if (storeIds?.length) {
      query = query.whereIn('s.store_id', storeIds);
    }

    if (channels?.length) {
      query = query.whereIn('s.channel', channels);
    }

    const results = await query;

    return results.map(row => ({
      productId: row.product_id,
      productName: row.product_name,
      category: row.category,
      quantity: parseInt(row.quantity, 10),
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders, 10),
    }));
  }

  /**
   * Série temporal de vendas (diária)
   * Performance target: <250ms
   */
  async getTimeSeries(filters: AnalyticsFilters): Promise<TimeSeriesData[]> {
    const { startDate, endDate, storeIds, channels } = filters;

    // If no dates specified, get all data (not just last 30 days)
    const hasDateRange = !!(startDate || endDate);
    
    let query = db('daily_sales_summary')
      .select(
        'sale_day as date',
        db.raw('SUM(total_revenue) as revenue'),
        db.raw('SUM(total_sales) as orders'),
        db.raw('AVG(avg_ticket) as avg_ticket')
      );
    
    // Only apply date filter if dates are provided
    if (hasDateRange) {
      query = query.whereBetween('sale_day', [
        startOfDay(startDate || subDays(new Date(), 30)),
        endOfDay(endDate || new Date())
      ]);
    }

    query = query
      .groupBy('sale_day')
      .orderBy('sale_day', 'asc');

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    if (channels?.length) {
      query = query.whereIn('channel', channels);
    }

    const results = await query;

    return results.map(row => ({
      date: format(new Date(row.date), 'yyyy-MM-dd'),
      revenue: parseFloat(row.revenue),
      orders: parseInt(row.orders, 10),
      avgTicket: parseFloat(row.avg_ticket),
    }));
  }

  /**
   * Performance por horário (identifica picos)
   * Performance target: <200ms
   */
  async getHourlyPerformance(filters: AnalyticsFilters) {
    const { startDate, endDate, storeIds } = filters;

    let query = db('hourly_performance')
      .select(
        'hour',
        'day_of_week',
        db.raw('AVG(total_sales) as avg_sales'),
        db.raw('AVG(total_revenue) as avg_revenue'),
        db.raw('AVG(avg_ticket) as avg_ticket')
      )
      .whereBetween('sale_day', [
        startOfDay(startDate || subDays(new Date(), 30)),
        endOfDay(endDate || new Date())
      ])
      .groupBy('hour', 'day_of_week')
      .orderBy('day_of_week', 'asc')
      .orderBy('hour', 'asc');

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    return await query;
  }

  /**
   * Clientes que compraram 3+ vezes mas não voltam há X dias
   * Performance target: <400ms
   */
  async getChurnRiskCustomers(daysSinceLastOrder: number = 30, minOrders: number = 3) {
    const results = await db('customer_behavior')
      .select('customer_id', 'customer_name', 'total_orders', 'lifetime_value', 'last_order_date', 'days_since_last_order')
      .where('total_orders', '>=', minOrders)
      .where('days_since_last_order', '>=', daysSinceLastOrder)
      .orderBy('lifetime_value', 'desc')
      .limit(100);

    return results;
  }

  /**
   * Performance de delivery por região
   * Performance target: <350ms
   */
  async getDeliveryPerformanceByRegion(filters: AnalyticsFilters) {
    const { startDate, endDate, storeIds } = filters;

    let query = db('delivery_addresses as da')
      .select(
        'da.city',
        'da.neighborhood',
        db.raw('COUNT(DISTINCT ds.id) as total_deliveries'),
        db.raw('AVG(s.delivery_time) as avg_delivery_time'),
        db.raw('AVG(ds.distance_km) as avg_distance'),
        db.raw('AVG(s.total) as avg_order_value')
      )
      .innerJoin('delivery_sales as ds', 'da.delivery_sale_id', 'ds.id')
      .innerJoin('sales as s', 'ds.sale_id', 's.id')
      .where('s.status', 'completed')
      .whereBetween('s.sale_date', [
        startDate || subDays(new Date(), 30),
        endDate || new Date()
      ])
      .groupBy('da.city', 'da.neighborhood')
      .orderBy('total_deliveries', 'desc');

    if (storeIds?.length) {
      query = query.whereIn('s.store_id', storeIds);
    }

    return await query;
  }

  /**
   * Ticket médio por canal, loja e período
   */
  async getAverageTicketByChannel(filters: AnalyticsFilters) {
    const { startDate, endDate, storeIds, channels } = filters;

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    let query = db('sales')
      .select(
        'channel',
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('AVG(total) as avg_ticket'),
        db.raw('MIN(total) as min_ticket'),
        db.raw('MAX(total) as max_ticket')
      )
      .whereBetween('sale_date', [start, end])
      .groupBy('channel')
      .orderBy('avg_ticket', 'desc');

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    if (channels?.length) {
      query = query.whereIn('channel', channels);
    }

    return await query;
  }

  /**
   * Ticket médio por loja
   */
  async getAverageTicketByStore(filters: AnalyticsFilters) {
    const { startDate, endDate, storeIds, channels } = filters;

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    let query = db('sales')
      .select(
        'store_id',
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('AVG(total) as avg_ticket'),
        db.raw('MIN(total) as min_ticket'),
        db.raw('MAX(total) as max_ticket')
      )
      .whereBetween('sale_date', [start, end])
      .groupBy('store_id')
      .orderBy('avg_ticket', 'desc');

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    if (channels?.length) {
      query = query.whereIn('channel', channels);
    }

    return await query;
  }

  /**
   * Top produtos por canal específico
   */
  async getTopProductsByChannel(channel: string, filters: AnalyticsFilters, limit: number = 10) {
    const { startDate, endDate, storeIds } = filters;

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    let query = db('product_sales')
      .select([
        'product_sales.product_id',
        'products.name as product_name',
        db.raw('COUNT(DISTINCT product_sales.sale_id) as orders'),
        db.raw('SUM(product_sales.quantity) as total_quantity'),
        db.raw('COALESCE(SUM(product_sales.total_price), 0) as total_revenue'),
        db.raw('COALESCE(AVG(product_sales.unit_price), 0) as avg_unit_price')
      ])
      .innerJoin('sales', 'product_sales.sale_id', 'sales.id')
      .innerJoin('products', 'product_sales.product_id', 'products.id')
      .where('sales.channel', channel)
      .whereBetween('sales.sale_date', [start, end])
      .groupBy('product_sales.product_id', 'products.name')
      .orderByRaw('COALESCE(SUM(product_sales.total_price), 0) desc')
      .limit(limit);

    if (storeIds?.length) {
      query = query.whereIn('sales.store_id', storeIds);
    }

    const results = await query;
    
    return results.map((row: any) => ({
      product_id: row.product_id,
      productName: row.product_name,
      orders: parseInt(row.orders || 0, 10),
      quantity: parseInt(row.total_quantity || 0, 10),
      revenue: parseFloat(row.total_revenue || 0),
      avgUnitPrice: parseFloat(row.avg_unit_price || 0)
    }));
  }

  /**
   * Comparação de performance entre duas lojas
   */
  async compareStoresPerformance(storeIds: string[], filters: AnalyticsFilters) {
    const { startDate, endDate, channels } = filters;

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    let query = db('sales')
      .select(
        'store_id',
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('AVG(total) as avg_ticket'),
        db.raw('COUNT(DISTINCT DATE(sale_date)) as active_days')
      )
      .whereBetween('sale_date', [start, end])
      .whereIn('store_id', storeIds)
      .groupBy('store_id')
      .orderBy('total_revenue', 'desc');

    if (channels?.length) {
      query = query.whereIn('channel', channels);
    }

    return await query;
  }

  /**
   * Time series com dia da semana (segunda, terça, quarta, etc)
   * Permite análise de padrões semanais
   */
  async getTimeSeriesByWeekday(filters: AnalyticsFilters) {
    const { startDate, endDate, storeIds, channels } = filters;

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    let query = db('sales')
      .select(
        db.raw("to_char(sale_date, 'Day') as weekday_name"),
        db.raw("EXTRACT(DOW FROM sale_date)::int as weekday_num"),
        db.raw('DATE(sale_date) as sale_date'),
        db.raw('COUNT(*) as orders'),
        db.raw('SUM(total) as revenue'),
        db.raw('AVG(total) as avg_ticket')
      )
      .whereBetween('sale_date', [start, end])
      .groupBy(db.raw('EXTRACT(DOW FROM sale_date)::int, to_char(sale_date, \'Day\'), DATE(sale_date)'))
      .orderByRaw('EXTRACT(DOW FROM sale_date)::int');

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    if (channels?.length) {
      query = query.whereIn('channel', channels);
    }

    const results = await query;

    return results.map((row: any) => ({
      weekdayName: row.weekday_name.trim(),
      weekdayNum: row.weekday_num,
      saleDate: format(new Date(row.sale_date), 'yyyy-MM-dd'),
      orders: parseInt(row.orders, 10),
      revenue: parseFloat(row.revenue),
      avgTicket: parseFloat(row.avg_ticket),
    }));
  }

  /**
   * Performance agregada por dia da semana (segunda vs terça vs quarta, etc)
   * Útil para identificar melhor dia da semana
   */
  async getAggregatedWeekdayPerformance(filters: AnalyticsFilters) {
    const { startDate, endDate, storeIds, channels } = filters;

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    let query = db('sales')
      .select(
        db.raw("to_char(sale_date, 'Day') as weekday_name"),
        db.raw("EXTRACT(DOW FROM sale_date)::int as weekday_num"),
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('AVG(total) as avg_ticket'),
        db.raw('COUNT(DISTINCT DATE(sale_date)) as days_count'),
        db.raw('SUM(total) / COUNT(DISTINCT DATE(sale_date))::float as revenue_per_day')
      )
      .whereBetween('sale_date', [start, end])
      .groupBy(db.raw("EXTRACT(DOW FROM sale_date)::int, to_char(sale_date, 'Day')"))
      .orderByRaw('EXTRACT(DOW FROM sale_date)::int');

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    if (channels?.length) {
      query = query.whereIn('channel', channels);
    }

    const results = await query;

    return results.map((row: any) => ({
      weekdayName: row.weekday_name.trim(),
      weekdayNum: row.weekday_num,
      totalOrders: parseInt(row.total_orders, 10),
      totalRevenue: parseFloat(row.total_revenue),
      avgTicket: parseFloat(row.avg_ticket),
      daysCount: parseInt(row.days_count, 10),
      revenuePerDay: parseFloat(row.revenue_per_day),
    }));
  }

  /**
   * Performance por hora e canal combinados
   * Identifica melhor hora + melhor canal
   */
  async getHourlyPerformanceByChannel(filters: AnalyticsFilters) {
    const { startDate, endDate, storeIds } = filters;

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();

    let query = db('sales')
      .select([
        db.raw("EXTRACT(HOUR FROM sale_date)::int as hour"),
        db.raw("channel"),
        db.raw('COUNT(*) as orders'),
        db.raw('COALESCE(SUM(total), 0) as revenue'),
        db.raw('COALESCE(AVG(total), 0) as avg_ticket')
      ])
      .whereBetween('sale_date', [start, end])
      .whereNotNull('sale_date')
      .whereNotNull('channel')
      .groupByRaw("EXTRACT(HOUR FROM sale_date)::int, channel")
      .orderByRaw("EXTRACT(HOUR FROM sale_date)::int, channel");

    if (storeIds?.length) {
      query = query.whereIn('store_id', storeIds);
    }

    const results = await query;

    return results.map((row: any) => ({
      hour: parseInt(row.hour || 0, 10),
      channel: row.channel || 'unknown',
      orders: parseInt(row.orders || 0, 10),
      revenue: parseFloat(row.revenue || 0),
      avgTicket: parseFloat(row.avg_ticket || 0),
    }));
  }
}

export default new AnalyticsRepository();
