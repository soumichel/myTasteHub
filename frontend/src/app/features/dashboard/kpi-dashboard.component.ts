import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsFilters } from '../../core/services/analytics.service';

interface KPICard {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  trend?: number;
  status: 'positive' | 'negative' | 'neutral';
}

interface TicketMetric {
  channel: string;
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  minTicket: number;
  maxTicket: number;
}

interface TopProduct {
  productName: string;
  channel: string;
  quantity: number;
  revenue: number;
}

interface WeekdayPerformance {
  weekdayName: string;
  weekdayNum: number;
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  revenuePerDay: number;
}

@Component({
  selector: 'app-kpi-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-dashboard.component.html',
  styleUrls: ['./kpi-dashboard.component.scss']
})
export class KpiDashboardComponent implements OnInit {
  // KPI Cards
  kpiCards: KPICard[] = [];

  // Data
  ticketMetrics: TicketMetric[] = [];
  topProducts: TopProduct[] = [];
  weekdayPerformance: WeekdayPerformance[] = [];

  // State
  loading = false;
  error: string | null = null;
  selectedChannel: string = 'all';
  
  // Date range (default: last 30 days to match seed data)
  startDate: string;
  endDate: string;

  Math = Math;

  constructor(private analyticsService: AnalyticsService) {
    const today = new Date();
    this.endDate = today.toISOString().split('T')[0];
    
    // Last 30 days to ensure we get seed data
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.startDate = thirtyDaysAgo.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    this.error = null;

    const filters: AnalyticsFilters = {
      startDate: this.startDate,
      endDate: this.endDate
    };

    // Load only data that has concrete backend endpoints
    Promise.all([
      this.analyticsService.getSalesOverview(filters).toPromise(),
      this.analyticsService.getChannelPerformance(filters).toPromise(),
      this.analyticsService.getTopProducts(filters, 10).toPromise()
    ])
      .then(([overview, channels, topProducts]) => {
        this.buildKPICards(overview, channels || []);
        this.topProducts = (topProducts || []).map((p: any) => ({
          productName: p.productName || p.product_name || 'Produto',
          channel: 'Geral',
          quantity: p.quantity || p.total_quantity || 0,
          revenue: p.revenue || p.total_revenue || 0
        }));
        this.weekdayPerformance = [];
        this.ticketMetrics = [];
        this.loading = false;
      })
      .catch((err) => {
        this.error = 'Erro ao carregar dados do dashboard';
        console.error('Error loading dashboard:', err);
        this.loading = false;
      });
  }

  buildKPICards(overview: any, channels: any[]) {
    if (!overview) return;

    // Calculate average ticket from overview
    const avgTicket = overview.avgTicket || 0;

    const topChannel = channels?.[0];
    const totalRevenue = overview.totalRevenue || 0;
    const totalOrders = overview.totalSales || 0;

    this.kpiCards = [
      {
        title: 'Faturamento do Mês',
        value: this.formatCurrency(totalRevenue),
        icon: '💰',
        trend: 5,
        status: 'positive'
      },
      {
        title: 'Número de Pedidos',
        value: this.formatNumber(totalOrders),
        icon: '📦',
        trend: 3,
        status: 'positive'
      },
      {
        title: 'Ticket Médio',
        value: this.formatCurrency(avgTicket),
        icon: '🎯',
        trend: -2,
        status: 'negative'
      },
      {
        title: 'Melhor Canal',
        value: this.getChannelName(topChannel?.channel || ''),
        icon: '⭐',
        status: 'neutral'
      },
      {
        title: 'Taxa de Sucesso',
        value: overview.completedSales && overview.totalSales
          ? ((overview.completedSales / overview.totalSales) * 100).toFixed(1) + '%'
          : '0%',
        icon: '✅',
        status: 'positive'
      },
      {
        title: 'Cancelamentos',
        value: this.formatNumber(overview.cancelledSales || 0),
        icon: '❌',
        status: 'negative'
      }
    ];
  }

  selectChannel(channel: string) {
    this.selectedChannel = channel;
  }

  getChannelName(channel: string): string {
    const names: Record<string, string> = {
      'balcao': 'Balcão',
      'in_store': 'Balcão',
      'ifood': 'iFood',
      'rappi': 'Rappi',
      'whatsapp': 'WhatsApp',
      'app_proprio': 'App Próprio',
      'own_app': 'App Próprio',
      'phone': 'Telefone'
    };
    return names[channel.toLowerCase()] || channel;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
  }

  getWeekdayName(num: number): string {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return names[num] || '';
  }

  getBestWeekday(): WeekdayPerformance | null {
    return this.weekdayPerformance.length > 0
      ? this.weekdayPerformance.reduce((best, current) =>
          current.totalRevenue > (best.totalRevenue || 0) ? current : best
        )
      : null;
  }

  getWorstWeekday(): WeekdayPerformance | null {
    return this.weekdayPerformance.length > 0
      ? this.weekdayPerformance.reduce((worst, current) =>
          current.totalRevenue < (worst.totalRevenue || 0) ? current : worst
        )
      : null;
  }
}
