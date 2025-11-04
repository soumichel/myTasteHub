import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, AnalyticsFilters } from '../../core/services/analytics.service';

interface Store {
  id: string;
  name: string;
}

interface StoreComparison {
  store_id: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  active_days: number;
}

interface ComparisonData {
  store1: StoreComparison | null;
  store2: StoreComparison | null;
  metrics: Array<{
    name: string;
    store1_value: number;
    store2_value: number;
    store1_formatted: string;
    store2_formatted: string;
    winner: 'store1' | 'store2' | 'tie';
  }>;
}

@Component({
  selector: 'app-store-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './store-comparison.component.html',
  styleUrls: ['./store-comparison.component.scss']
})
export class StoreComparisonComponent implements OnInit {
  stores: Store[] = [];
  selectedStore1: string = '';
  selectedStore2: string = '';
  comparisonData: ComparisonData | null = null;
  loading = false;
  error: string | null = null;

  startDate: string;
  endDate: string;

  // Helper properties for template
  store1WinsCount = 0;
  store2WinsCount = 0;
  revenueDifferencePercent = 0;
  ticketDifference = 0;
  ticketBetterStore = '';

  Math = Math;

  constructor(private analyticsService: AnalyticsService) {
    const today = new Date();
    this.endDate = today.toISOString().split('T')[0];
    
    // Last 30 days to match seed data
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.startDate = thirtyDaysAgo.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.analyticsService.getStores().subscribe({
      next: (stores) => {
        this.stores = stores;
        // Auto-select first two stores
        if (stores.length >= 2) {
          this.selectedStore1 = stores[0].id;
          this.selectedStore2 = stores[1].id;
          this.compareStores();
        }
      },
      error: (err) => {
        console.error('Error loading stores:', err);
        this.error = 'Erro ao carregar lojas';
      }
    });
  }

  compareStores() {
    if (!this.selectedStore1 || !this.selectedStore2) {
      this.error = 'Selecione duas lojas para comparar';
      return;
    }

    if (this.selectedStore1 === this.selectedStore2) {
      this.error = 'Selecione lojas diferentes para comparar';
      return;
    }

    this.loading = true;
    this.error = null;

    const filters: AnalyticsFilters = {
      startDate: this.startDate,
      endDate: this.endDate
    };

    this.analyticsService.compareStoresPerformance([this.selectedStore1, this.selectedStore2], filters).subscribe({
      next: (data) => {
        this.buildComparisonData(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error comparing stores:', err);
        this.error = 'Erro ao comparar lojas';
        this.loading = false;
      }
    });
  }

  buildComparisonData(data: any[]) {
    const store1 = data.find(d => d.store_id === this.selectedStore1);
    const store2 = data.find(d => d.store_id === this.selectedStore2);

    if (!store1 || !store2) {
      this.error = 'Dados de lojas não encontrados';
      return;
    }

    const metrics = [
      {
        name: 'Receita Total',
        store1_value: store1.total_revenue,
        store2_value: store2.total_revenue,
        store1_formatted: this.formatCurrency(store1.total_revenue),
        store2_formatted: this.formatCurrency(store2.total_revenue),
        winner: this.getWinner(store1.total_revenue, store2.total_revenue)
      },
      {
        name: 'Número de Pedidos',
        store1_value: store1.total_orders,
        store2_value: store2.total_orders,
        store1_formatted: this.formatNumber(store1.total_orders),
        store2_formatted: this.formatNumber(store2.total_orders),
        winner: this.getWinner(store1.total_orders, store2.total_orders)
      },
      {
        name: 'Ticket Médio',
        store1_value: store1.avg_ticket,
        store2_value: store2.avg_ticket,
        store1_formatted: this.formatCurrency(store1.avg_ticket),
        store2_formatted: this.formatCurrency(store2.avg_ticket),
        winner: this.getWinner(store1.avg_ticket, store2.avg_ticket)
      },
      {
        name: 'Dias Ativos',
        store1_value: store1.active_days,
        store2_value: store2.active_days,
        store1_formatted: this.formatNumber(store1.active_days),
        store2_formatted: this.formatNumber(store2.active_days),
        winner: this.getWinner(store1.active_days, store2.active_days)
      }
    ];

    // Calculate helper properties
    this.store1WinsCount = metrics.filter(m => m.winner === 'store1').length;
    this.store2WinsCount = metrics.filter(m => m.winner === 'store2').length;
    
    this.revenueDifferencePercent = store2.total_revenue > 0
      ? ((store1.total_revenue / store2.total_revenue - 1) * 100)
      : 0;
    
    this.ticketDifference = Math.abs(store1.avg_ticket - store2.avg_ticket);
    this.ticketBetterStore = store1.avg_ticket > store2.avg_ticket ? this.selectedStore1 : this.selectedStore2;

    this.comparisonData = {
      store1,
      store2,
      metrics
    };
  }

  getWinner(value1: number, value2: number): 'store1' | 'store2' | 'tie' {
    if (value1 > value2) return 'store1';
    if (value2 > value1) return 'store2';
    return 'tie';
  }

  getStoreName(storeId: string): string {
    return this.stores.find(s => s.id === storeId)?.name || storeId;
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

  getDifference(value1: number, value2: number, isPercentage: boolean = false): string {
    const diff = value1 - value2;
    const percentage = Math.abs((diff / Math.max(value1, value2, 1)) * 100).toFixed(1);
    
    if (isPercentage) {
      return `${Math.abs(diff).toFixed(1)}%`;
    }
    
    return `${Math.abs(diff).toFixed(0)} (${percentage}%)`;
  }

  getMetricDifference(metric: any): string {
    const diff = metric.store1_value - metric.store2_value;
    const percentage = ((diff / Math.max(metric.store1_value, metric.store2_value, 1)) * 100).toFixed(1);
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${(diff).toFixed(2)} (${percentage}%)`;
  }
}
