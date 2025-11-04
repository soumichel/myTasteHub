import { Router, Request, Response } from 'express';
import analyticsRepository, { AnalyticsFilters } from '../repositories/analytics.repository';
import { db } from '../database';

// Analytics routes v1.2
const router = Router();

// Helper para parsear filters das query params (manter datas como string)
function parseFilters(req: Request): AnalyticsFilters {
  return {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    storeIds: req.query.storeIds ? (req.query.storeIds as string).split(',') : undefined,
    channels: req.query.channels ? (req.query.channels as string).split(',') : undefined,
  };
}

/**
 * GET /api/v1/analytics/filters/stores
 * Retorna lista de lojas disponíveis
 */
router.get('/filters/stores', async (_req: Request, res: Response, next) => {
  try {
    const stores = await db('stores')
      .select('id', 'name')
      .where('is_active', true)
      .orderBy('name', 'asc');

    res.json({
      status: 'success',
      data: stores,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/filters/channels
 * Retorna lista de canais disponíveis
 */
router.get('/filters/channels', async (_req: Request, res: Response, next) => {
  try {
    const channels = await db('sales')
      .distinct('channel')
      .select('channel')
      .orderBy('channel', 'asc');

    res.json({
      status: 'success',
      data: channels.map(c => c.channel),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/overview
 * Retorna visão geral de vendas com comparação de período
 */
router.get('/overview', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const overview = await analyticsRepository.getSalesOverview(filters);

    res.json({
      status: 'success',
      data: overview,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/channels
 * Performance por canal de venda
 */
router.get('/channels', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const channels = await analyticsRepository.getChannelPerformance(filters);

    res.json({
      status: 'success',
      data: channels,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/products/top
 * Top produtos mais vendidos
 */
router.get('/products/top', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const products = await analyticsRepository.getTopProducts(filters, limit);

    res.json({
      status: 'success',
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/time-series
 * Série temporal de vendas
 */
router.get('/time-series', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const timeSeries = await analyticsRepository.getTimeSeries(filters);

    res.json({
      status: 'success',
      data: timeSeries,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/hourly
 * Performance por horário
 */
router.get('/hourly', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const hourly = await analyticsRepository.getHourlyPerformance(filters);

    res.json({
      status: 'success',
      data: hourly,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/customers/churn-risk
 * Clientes em risco de churn
 */
router.get('/customers/churn-risk', async (req: Request, res: Response, next) => {
  try {
    const daysSinceLastOrder = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const minOrders = req.query.minOrders ? parseInt(req.query.minOrders as string, 10) : 3;

    const customers = await analyticsRepository.getChurnRiskCustomers(daysSinceLastOrder, minOrders);

    res.json({
      status: 'success',
      data: customers,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/ticket-average/channel
 * Ticket médio por canal
 */
router.get('/ticket-average/channel', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const ticketData = await analyticsRepository.getAverageTicketByChannel(filters);

    res.json({
      status: 'success',
      data: ticketData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/ticket-average/store
 * Ticket médio por loja
 */
router.get('/ticket-average/store', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const ticketData = await analyticsRepository.getAverageTicketByStore(filters);

    res.json({
      status: 'success',
      data: ticketData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/products/by-channel
 * Top produtos por canal específico (ex: iFood, Rappi)
 */
router.get('/products/by-channel', async (req: Request, res: Response, next) => {
  try {
    const channel = req.query.channel as string;
    if (!channel) {
      res.status(400).json({ status: 'error', message: 'Channel parameter required' });
      return;
    }

    const filters = parseFilters(req);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    console.log(`📊 Fetching top products for channel: ${channel}, filters:`, filters);
    
    const products = await analyticsRepository.getTopProductsByChannel(channel, filters, limit);
    
    console.log(`✅ Found ${products.length} products for channel ${channel}`);

    res.json({
      status: 'success',
      data: products,
    });
  } catch (error) {
    console.error('❌ Error in /products/by-channel:', error);
    next(error);
  }
});

/**
 * GET /api/v1/analytics/stores/compare
 * Comparar performance entre duas lojas
 */
router.get('/stores/compare', async (req: Request, res: Response, next) => {
  try {
    const storeIds = req.query.storeIds ? (req.query.storeIds as string).split(',') : [];
    if (storeIds.length < 2) {
      res.status(400).json({ status: 'error', message: 'At least 2 store IDs required' });
      return;
    }

    const filters = parseFilters(req);
    const comparison = await analyticsRepository.compareStoresPerformance(storeIds, filters);

    res.json({
      status: 'success',
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/delivery/regions
 * Performance de delivery por região
 */
router.get('/delivery/regions', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const regions = await analyticsRepository.getDeliveryPerformanceByRegion(filters);

    res.json({
      status: 'success',
      data: regions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/weekday/time-series
 * Time series com dia da semana (útil para análise de padrões semanais)
 */
router.get('/weekday/time-series', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const timeSeries = await analyticsRepository.getTimeSeriesByWeekday(filters);

    res.json({
      status: 'success',
      data: timeSeries,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/weekday/aggregated
 * Performance agregada por dia da semana (segunda vs terça vs quarta, etc)
 */
router.get('/weekday/aggregated', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    const aggregated = await analyticsRepository.getAggregatedWeekdayPerformance(filters);

    res.json({
      status: 'success',
      data: aggregated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/analytics/hourly/by-channel
 * Performance por hora + canal combinados
 */
router.get('/hourly/by-channel', async (req: Request, res: Response, next) => {
  try {
    const filters = parseFilters(req);
    console.log(`📊 Fetching hourly performance by channel, filters:`, filters);
    
    const hourlyData = await analyticsRepository.getHourlyPerformanceByChannel(filters);
    
    console.log(`✅ Found ${hourlyData.length} hourly records`);

    res.json({
      status: 'success',
      data: hourlyData,
    });
  } catch (error) {
    console.error('❌ Error in /hourly/by-channel:', error);
    next(error);
  }
});

export default router;
