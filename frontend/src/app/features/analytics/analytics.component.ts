import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AnalyticsService, AnalyticsFilters } from '../../core/services/analytics.service';
import { AnalyticsFiltersComponent } from '../../shared/components/analytics-filters/analytics-filters.component';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, AnalyticsFiltersComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('timeSeriesChart') timeSeriesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('channelsChart') channelsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsChart') productsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthComparisonChart') monthComparisonCanvas!: ElementRef<HTMLCanvasElement>;

  loading = false;
  error: string | null = null;
  currentFilters: AnalyticsFilters = {};
  viewInitialized = false;
  private retryAttempts = {
    timeSeries: 0,
    channels: 0,
    products: 0,
    monthComparison: 0
  };
  private readonly MAX_RETRY_ATTEMPTS = 5;

  // Charts instances
  private timeSeriesChart: Chart | null = null;
  private channelsChart: Chart | null = null;
  private productsChart: Chart | null = null;
  private monthComparisonChart: Chart | null = null;

  // Data cache for rendering after loading completes
  timeSeriesData: any[] = [];  // Public para uso no template
  private channelsData: any[] = [];
  private productsData: any[] = [];
  monthComparisonData: any[] = [];

  // Hourly heatmap data
  hourlyData: any[] = [];
  heatmapData: any[] = [];
  daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  hours = Array.from({ length: 24 }, (_, i) => i);

  // Month selection
  selectedMonth: string = 'all';
  availableMonths: Array<{ value: string; label: string }> = [];
  private allTimeSeriesData: any[] = [];  // Cache de todos os dados

  constructor(
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Small delay to ensure filters component is ready before loading data
    setTimeout(() => {
      this.loadData();
    }, 500);
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    // Load month comparison after view is initialized
    this.loadMonthComparison();
    // Charts will be created when data loads
  }

  onFiltersChange(filters: AnalyticsFilters) {
    this.currentFilters = filters;
    // Reset month selector when filters change
    this.selectedMonth = 'all';
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;

    Promise.all([
      this.loadTimeSeries(),
      this.loadChannels(),
      this.loadProducts(),
      this.loadHourly(),
      this.loadMonthComparison()
    ])
      .then(() => {
        this.loading = false;
        // Now that loading is false, DOM is updated and canvas elements exist
        // Use ChangeDetectorRef and setTimeout to ensure rendering
        this.cdr.detectChanges();
        setTimeout(() => {
          this.renderAllCharts();
        }, 100);
      })
      .catch((err) => {
        this.loading = false;
        this.error = err.message || 'Erro ao carregar dados';
        console.error('Error loading analytics:', err);
      });
  }

  private async loadMonthComparison() {
    try {
      // Load all data (no date filter) to get monthly comparison
      const data = await this.analyticsService.getTimeSeries({}).toPromise();
      if (data && data.length > 0) {
        // Store all data for month selection
        this.allTimeSeriesData = data;
        
        // Extract available months
        this.extractAvailableMonths(data);
        
        // Group by month and sum revenue
        const monthlyData = this.groupByMonth(data);
        this.monthComparisonData = monthlyData;
        
        // Render chart after a delay to ensure DOM is ready
        setTimeout(() => {
          this.renderMonthComparisonChart(monthlyData);
        }, 300);
      } else {
        this.monthComparisonData = [];
        this.availableMonths = [];
      }
    } catch (err) {
      console.error('Error loading month comparison:', err);
      this.monthComparisonData = [];
      this.availableMonths = [];
    }
  }

  private extractAvailableMonths(data: any[]) {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const monthsSet = new Set<string>();
    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });

    this.availableMonths = Array.from(monthsSet)
      .sort()
      .map(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthIndex = parseInt(month) - 1;
        return {
          value: monthKey,
          label: `${monthNames[monthIndex]} ${year}`
        };
      });
  }

  onMonthChange() {
    if (this.selectedMonth === 'all') {
      // Show all data (sem filtros de data)
      this.timeSeriesData = [...this.allTimeSeriesData];
    } else {
      // Filter data for selected month
      this.timeSeriesData = this.allTimeSeriesData.filter(item => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === this.selectedMonth;
      });
    }

    // Re-render chart
    setTimeout(() => {
      if (this.timeSeriesData.length > 0) {
        this.renderTimeSeriesChart(this.timeSeriesData);
      } else {
        // Clear chart if no data
        if (this.timeSeriesChart) {
          this.timeSeriesChart.destroy();
          this.timeSeriesChart = null;
        }
      }
    }, 100);
  }

  private groupByMonth(data: any[]): any[] {
    const monthMap = new Map<string, { month: string, revenue: number, orders: number }>();
    
    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          revenue: 0,
          orders: 0
        });
      }
      
      const monthData = monthMap.get(monthKey)!;
      monthData.revenue += Number(item.revenue) || 0;
      monthData.orders += Number(item.orders) || 0;
    });
    
    // Convert to array and sort by month
    return Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private renderAllCharts() {
    // Ensure view is initialized before rendering
    if (!this.viewInitialized) {
      console.warn('View not initialized yet, deferring chart rendering');
      return;
    }
    
    if (this.timeSeriesData.length > 0) {
      this.renderTimeSeriesChart(this.timeSeriesData);
    }
    if (this.channelsData.length > 0) {
      this.renderChannelsChart(this.channelsData);
    }
    if (this.productsData.length > 0) {
      this.renderProductsChart(this.productsData);
    }
    if (this.monthComparisonData.length > 0) {
      this.renderMonthComparisonChart(this.monthComparisonData);
    }
  }

  private async loadTimeSeries() {
    try {
      // Se há mês selecionado específico, usar dados filtrados do cache
      if (this.selectedMonth !== 'all' && this.allTimeSeriesData.length > 0) {
        this.timeSeriesData = this.allTimeSeriesData.filter(item => {
          const date = new Date(item.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          return monthKey === this.selectedMonth;
        });
        return;
      }
      
      // Verificar se há filtros aplicados
      const hasFilters = !!(
        this.currentFilters.startDate || 
        this.currentFilters.endDate || 
        this.currentFilters.storeIds?.length || 
        this.currentFilters.channels?.length
      );
      
      // Se não há filtros, usar todos os dados (sem date range filter)
      if (!hasFilters) {
        // Usar dados do cache se já foram carregados
        if (this.allTimeSeriesData.length > 0) {
          this.timeSeriesData = [...this.allTimeSeriesData];
          return;
        }
        
        // Caso contrário, carregar sem filtros
        const data = await this.analyticsService.getTimeSeries({}).toPromise();
        if (data && data.length > 0) {
          this.timeSeriesData = data;
          // Atualizar cache se ainda não tem dados
          if (this.allTimeSeriesData.length === 0) {
            this.allTimeSeriesData = data;
          }
        } else {
          this.timeSeriesData = [];
        }
        return;
      }
      
      // Carregar do servidor com filtros aplicados
      const data = await this.analyticsService.getTimeSeries(this.currentFilters).toPromise();
      if (data && data.length > 0) {
        this.timeSeriesData = data;
      } else {
        this.timeSeriesData = [];
      }
    } catch (err) {
      console.error('Error loading time series:', err);
      throw err;
    }
  }

  private async loadChannels() {
    try {
      const data = await this.analyticsService.getChannelPerformance(this.currentFilters).toPromise();
      if (data && data.length > 0) {
        this.channelsData = data;
      } else {
        this.channelsData = [];
      }
    } catch (err) {
      console.error('Error loading channels:', err);
      throw err;
    }
  }

  private async loadProducts() {
    try {
      const data = await this.analyticsService.getTopProducts(this.currentFilters, 10).toPromise();
      if (data && data.length > 0) {
        this.productsData = data;
      } else {
        this.productsData = [];
      }
    } catch (err) {
      console.error('Error loading products:', err);
      throw err;
    }
  }

  private async loadHourly() {
    try {
      const data = await this.analyticsService.getHourlyPerformance(this.currentFilters).toPromise();
      if (data && data.length > 0) {
        this.hourlyData = data;
        this.processHeatmapData(data);
      } else {
        this.hourlyData = [];
      }
    } catch (err) {
      console.error('Error loading hourly:', err);
      throw err;
    }
  }

  private renderTimeSeriesChart(data: any[]) {
    if (!data || data.length === 0) {
      return;
    }

    // Ensure canvas is available
    if (!this.timeSeriesCanvas || !this.timeSeriesCanvas.nativeElement) {
      console.warn('Time series canvas not available, retrying...');
      // Retry after a delay
      setTimeout(() => {
        if (this.timeSeriesCanvas && this.timeSeriesCanvas.nativeElement) {
          this.renderTimeSeriesChart(data);
        }
      }, 200);
      return;
    }

    if (this.timeSeriesChart) {
      this.timeSeriesChart.destroy();
    }

    const ctx = this.timeSeriesCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.warn('Could not get canvas context');
      return;
    }

    // Create labels - show fewer labels if data is large (more than 60 days)
    const isLargeDataset = data.length > 60;
    const labelInterval = isLargeDataset ? 7 : 1; // Show every 7th label for large datasets
    const labels = data.map((d, idx) => {
      if (isLargeDataset && idx % labelInterval !== 0) {
        return '';
      }
      return new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Receita (R$)',
            data: data.map(d => d.revenue),
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.05)',
            yAxisID: 'y',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: isLargeDataset ? 0 : 3,
            pointHoverRadius: 5,
            fill: true,
          },
          {
            label: 'Pedidos',
            data: data.map(d => d.orders),
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.05)',
            yAxisID: 'y1',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: isLargeDataset ? 0 : 3,
            pointHoverRadius: 5,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 13
            },
            bodyFont: {
              size: 12
            },
            callbacks: {
              title: (context) => {
                return `Data: ${context[0].label}`;
              },
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (context.datasetIndex === 0) {
                    label += this.formatCurrency(context.parsed.y);
                  } else {
                    label += context.parsed.y.toLocaleString('pt-BR');
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 11
              }
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => this.formatCurrency(Number(value)),
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: 'Receita (R$)',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: 'Pedidos',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          },
        }
      }
    };

    this.timeSeriesChart = new Chart(ctx, config);
  }

  private renderChannelsChart(data: any[]) {
    if (!data || data.length === 0) {
      return;
    }

    // Ensure canvas is available
    if (!this.channelsCanvas || !this.channelsCanvas.nativeElement) {
      console.warn('Channels canvas not available, retrying...');
      // Retry after a delay
      setTimeout(() => {
        if (this.channelsCanvas && this.channelsCanvas.nativeElement) {
          this.renderChannelsChart(data);
        }
      }, 200);
      return;
    }

    if (this.channelsChart) {
      this.channelsChart.destroy();
    }

    const ctx = this.channelsCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.warn('Could not get channels canvas context');
      return;
    }

    const channelNames: Record<string, string> = {
      'balcao': 'Vendas na Loja',
      'in_store': 'Vendas na Loja',
      'ifood': 'iFood',
      'rappi': 'Rappi',
      'whatsapp': 'WhatsApp',
      'app_proprio': 'App Próprio',
      'own_app': 'App Próprio',
      'phone': 'Telefone'
    };

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(d => channelNames[d.channel] || d.channel),
        datasets: [
          {
            label: 'Receita Bruta',
            data: data.map(d => d.revenue),
            backgroundColor: 'rgba(13, 110, 253, 0.7)',
          },
          {
            label: 'Receita Líquida',
            data: data.map(d => d.netRevenue),
            backgroundColor: 'rgba(25, 135, 84, 0.7)',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += this.formatCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    };

    this.channelsChart = new Chart(ctx, config);
  }

  private renderProductsChart(data: any[]) {
    if (!data || data.length === 0) {
      return;
    }

    // Ensure canvas is available
    if (!this.productsCanvas || !this.productsCanvas.nativeElement) {
      console.warn('Products canvas not available, retrying...');
      // Retry after a delay
      setTimeout(() => {
        if (this.productsCanvas && this.productsCanvas.nativeElement) {
          this.renderProductsChart(data);
        }
      }, 200);
      return;
    }

    if (this.productsChart) {
      this.productsChart.destroy();
    }

    const ctx = this.productsCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.warn('Could not get products canvas context');
      return;
    }

    const colors = [
      '#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1',
      '#fd7e14', '#20c997', '#0dcaf0', '#6610f2', '#d63384'
    ];

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.productName),
        datasets: [{
          data: data.map(d => d.revenue),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = this.formatCurrency(Number(context.parsed));
                const total = context.dataset.data.reduce((a: number, b: any) => a + Number(b), 0);
                const percentage = ((Number(context.parsed) / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    this.productsChart = new Chart(ctx, config);
  }

  private renderMonthComparisonChart(data: any[]) {
    if (!data || data.length === 0) {
      return;
    }

    // Ensure canvas is available
    if (!this.monthComparisonCanvas || !this.monthComparisonCanvas.nativeElement) {
      if (this.retryAttempts.monthComparison < this.MAX_RETRY_ATTEMPTS) {
        console.warn(`Month comparison canvas not available, retry ${this.retryAttempts.monthComparison + 1}/${this.MAX_RETRY_ATTEMPTS}...`);
        this.retryAttempts.monthComparison++;
        setTimeout(() => {
          if (this.monthComparisonCanvas && this.monthComparisonCanvas.nativeElement) {
            this.renderMonthComparisonChart(data);
          }
        }, 200);
      } else {
        console.error('Month comparison canvas not available after max retries');
      }
      return;
    }

    if (this.monthComparisonChart) {
      this.monthComparisonChart.destroy();
    }

    // Reset retry counter on successful render
    this.retryAttempts.monthComparison = 0;

    const ctx = this.monthComparisonCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.warn('Could not get month comparison canvas context');
      return;
    }

    // Format month labels
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const labels = data.map(d => {
      const [year, month] = d.month.split('-');
      const monthIndex = parseInt(month) - 1;
      return `${monthNames[monthIndex]} ${year}`;
    });

    // Find top 3 months by revenue
    const sortedByRevenue = [...data].sort((a, b) => b.revenue - a.revenue);
    const top3Months = sortedByRevenue.slice(0, 3);
    
    // Create background colors - highlight top 3
    const backgroundColors = data.map(d => {
      const isTop3 = top3Months.some(top => top.month === d.month);
      return isTop3 ? 'rgba(25, 135, 84, 0.8)' : 'rgba(13, 110, 253, 0.7)';
    });

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Receita Total',
          data: data.map(d => d.revenue),
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: data.map(d => {
            const isTop3 = top3Months.some(top => top.month === d.month);
            return isTop3 ? 'rgba(25, 135, 84, 1)' : 'rgba(13, 110, 253, 1)';
          })
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = this.formatCurrency(Number(context.parsed.y));
                const dataPoint = data[context.dataIndex];
                const isTop3 = top3Months.some(top => top.month === dataPoint.month);
                const ranking = isTop3 ? ` ⭐ Top ${sortedByRevenue.findIndex(d => d.month === dataPoint.month) + 1}` : '';
                return [
                  `Receita: ${value}${ranking}`,
                  `Pedidos: ${dataPoint.orders.toLocaleString('pt-BR')}`
                ];
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    };

    this.monthComparisonChart = new Chart(ctx, config);
  }

  private processHeatmapData(data: any[]) {
    // Create a map for quick lookup
    const dataMap = new Map();
    data.forEach(item => {
      const key = `${item.day_of_week}-${item.hour}`;
      dataMap.set(key, item.avg_revenue || 0);
    });

    // Generate heatmap cells
    this.heatmapData = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const value = dataMap.get(key) || 0;
        this.heatmapData.push({ day, hour, value });
      }
    }
  }

  getHeatmapColor(value: number): string {
    if (value === 0) return '#f8f9fa';
    
    const maxValue = Math.max(...this.heatmapData.map(d => d.value));
    const intensity = value / maxValue;
    
    // Color gradient from light blue to dark blue
    const r = Math.round(13 + (255 - 13) * (1 - intensity));
    const g = Math.round(110 + (255 - 110) * (1 - intensity));
    const b = 253;
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  getHeatmapTooltip(cell: any): string {
    return `${this.daysOfWeek[cell.day]} ${cell.hour}h: ${this.formatCurrency(cell.value)}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatNumber(value: number): string {
    const num = Number(value);
    if (!num || num === 0) return '';
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toFixed(0);
  }
}
