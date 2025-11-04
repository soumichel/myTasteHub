import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService, AnalyticsFilters } from '../../core/services/analytics.service';
import { AnalyticsFiltersComponent } from '../../shared/components/analytics-filters/analytics-filters.component';

interface OverviewData {
  totalRevenue: number;
  totalSales: number;
  avgTicket: number;
  completedSales: number;
  cancelledSales: number;
  growthRate: number;
}

interface TopChannel {
  channel: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  productName: string;
  quantity: number;
  revenue: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  overview: OverviewData | null = null;
  topChannel: TopChannel | null = null;
  topProduct: TopProduct | null = null;
  loading = false;
  Math = Math;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    
    // Fixed filters: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const filters: AnalyticsFilters = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    Promise.all([
      this.analyticsService.getSalesOverview(filters).toPromise(),
      this.analyticsService.getChannelPerformance(filters).toPromise(),
      this.analyticsService.getTopProducts(filters, 1).toPromise()
    ]).then(([overview, channels, products]) => {
      this.overview = overview || null;
      
      if (channels && channels.length > 0) {
        const sorted = [...channels].sort((a, b) => b.revenue - a.revenue);
        this.topChannel = {
          channel: sorted[0].channel,
          revenue: sorted[0].revenue,
          orders: sorted[0].orders
        };
      }
      
      if (products && products.length > 0) {
        this.topProduct = {
          productName: products[0].productName,
          quantity: products[0].quantity,
          revenue: products[0].revenue
        };
      }
      
      this.loading = false;
    }).catch(error => {
      console.error('Error loading dashboard:', error);
      this.loading = false;
    });
  }

  getChannelName(channel: string): string {
    const names: Record<string, string> = {
      'balcao': 'Vendas na Loja',
      'in_store': 'Vendas na Loja',
      'ifood': 'iFood',
      'rappi': 'Rappi',
      'whatsapp': 'WhatsApp',
      'app_proprio': 'App Próprio',
      'own_app': 'App Próprio',
      'phone': 'Telefone'
    };
    return names[channel] || channel;
  }

  getSuccessRate(): string {
    if (!this.overview || this.overview.totalSales === 0) return '0.0';
    const rate = (this.overview.completedSales / this.overview.totalSales) * 100;
    return rate.toFixed(1);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
  }
}
