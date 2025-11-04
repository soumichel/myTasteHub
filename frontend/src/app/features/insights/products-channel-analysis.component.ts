import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, AnalyticsFilters } from '../../core/services/analytics.service';
import Chart from 'chart.js/auto';

interface TopProduct {
  productName: string;
  quantity: number;
  revenue: number;
  channel?: string;
}

interface HourlyChannelData {
  hour: number;
  channel: string;
  orders: number;
  revenue: number;
  avgTicket: number;
}

@Component({
  selector: 'app-products-channel-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products-channel-analysis.component.html',
  styleUrls: ['./products-channel-analysis.component.scss']
})
export class ProductsChannelAnalysisComponent implements OnInit {
  channels: Array<{ name: string; value: string }> = [
    { name: 'iFood', value: 'ifood' },
    { name: 'Rappi', value: 'rappi' },
    { name: 'Balcão', value: 'in_store' },
    { name: 'WhatsApp', value: 'whatsapp' },
    { name: 'App Próprio', value: 'own_app' },
    { name: 'Telefone', value: 'phone' }
  ];

  selectedChannel: string = 'ifood';
  topProducts: TopProduct[] = [];
  hourlyData: HourlyChannelData[] = [];

  loading = false;
  error: string | null = null;

  startDate: string;
  endDate: string;

  hourlyChart: any = null;
  hourlyChartCanvas: any;

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
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;

    const filters: AnalyticsFilters = {
      startDate: this.startDate,
      endDate: this.endDate
    };

    Promise.all([
      this.analyticsService.getTopProductsByChannel(this.selectedChannel, filters, 10).toPromise(),
      this.analyticsService.getHourlyPerformanceByChannel(filters).toPromise()
    ])
      .then(([products, hourly]) => {
        this.topProducts = products || [];
        this.processHourlyData(hourly || []);
        this.updateChart();
        this.loading = false;
      })
      .catch(err => {
        console.error('Error loading data:', err);
        this.error = 'Erro ao carregar dados';
        this.loading = false;
      });
  }

  processHourlyData(data: HourlyChannelData[]) {
    // Filter data by selected channel
    this.hourlyData = data.filter(d => d.channel === this.selectedChannel);
    
    // Update chart after data is processed
    setTimeout(() => {
      this.updateChart();
    }, 100);
  }

  selectChannel(channel: string) {
    this.selectedChannel = channel;
    this.loadData();
  }

  updateChart() {
    const ctx = document.getElementById('hourlyChart') as HTMLCanvasElement;
    if (!ctx) return;

    // Prepare data for chart
    const hourlyByHour = Array(24).fill(0).map((_, i) => ({
      hour: i,
      orders: 0,
      revenue: 0,
      avgTicket: 0
    }));

    this.hourlyData.forEach(d => {
      const hour = hourlyByHour[d.hour];
      if (hour) {
        hour.orders = d.orders;
        hour.revenue = d.revenue;
        hour.avgTicket = d.avgTicket;
      }
    });

    if (this.hourlyChart) {
      this.hourlyChart.destroy();
    }

    this.hourlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hourlyByHour.map(h => `${h.hour}h`),
        datasets: [
          {
            label: 'Pedidos',
            data: hourlyByHour.map(h => h.orders),
            backgroundColor: 'rgba(0, 123, 255, 0.6)',
            borderColor: 'rgba(0, 123, 255, 1)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Faturamento',
            data: hourlyByHour.map(h => h.revenue),
            backgroundColor: 'rgba(40, 167, 69, 0.6)',
            borderColor: 'rgba(40, 167, 69, 1)',
            borderWidth: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Número de Pedidos'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Faturamento'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }

  getChannelName(value: string): string {
    return this.channels.find(c => c.value === value)?.name || value;
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

  getPeakHour(): number | null {
    if (this.hourlyData.length === 0) return null;
    return this.hourlyData.reduce((max, current) =>
      current.revenue > (max.revenue || 0) ? current : max
    ).hour;
  }

  getTotalOrdersByChannel(): number {
    return this.hourlyData.reduce((sum, d) => sum + d.orders, 0);
  }

  getTotalRevenueByChannel(): number {
    return this.hourlyData.reduce((sum, d) => sum + d.revenue, 0);
  }
}
