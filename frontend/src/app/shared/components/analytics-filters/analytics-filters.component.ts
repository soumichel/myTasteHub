import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsFilters, AnalyticsService, Store } from '../../../core/services/analytics.service';

interface Channel {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-analytics-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-filters.component.html',
  styleUrls: ['./analytics-filters.component.scss']
})
export class AnalyticsFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<AnalyticsFilters>();

  startDate: string = '';
  endDate: string = '';
  selectedStores: string[] = [];
  selectedChannels: string[] = [];

  quickDateRanges = [
    { label: 'Hoje', days: 0 },
    { label: '7 dias', days: 7 },
    { label: '30 dias', days: 30 },
    { label: '90 dias', days: 90 },
  ];

  stores: Store[] = [];
  channels: Channel[] = [];
  
  private channelMapping: Record<string, Channel> = {
    'balcao': { value: 'balcao', label: 'Vendas na Loja', icon: '🏪' },
    'in_store': { value: 'in_store', label: 'Vendas na Loja', icon: '🏪' },
    'ifood': { value: 'ifood', label: 'iFood', icon: '🛵' },
    'rappi': { value: 'rappi', label: 'Rappi', icon: '📦' },
    'whatsapp': { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    'app_proprio': { value: 'app_proprio', label: 'App Próprio', icon: '📱' },
    'own_app': { value: 'own_app', label: 'App Próprio', icon: '📱' },
    'phone': { value: 'phone', label: 'Telefone', icon: '📞' }
  };

  private currentQuickDays: number | null = null;
  private isInitialized = false; // Track if data is loaded

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    // Load stores and channels from backend, then apply default filters
    this.loadFilterOptions();
  }

  loadFilterOptions() {
    // Wait for both requests to complete
    Promise.all([
      this.analyticsService.getStores().toPromise(),
      this.analyticsService.getChannels().toPromise()
    ]).then(([stores, channelsFromDb]) => {
      // Set stores
      this.stores = stores || [];
      
      // Set channels with mapping
      this.channels = (channelsFromDb || []).map(ch => 
        this.channelMapping[ch] || { value: ch, label: ch, icon: '📱' }
      );

      // Mark as initialized
      this.isInitialized = true;

      // Emit empty filters (no default selection)
      this.applyFilters();
    }).catch((error) => {
      console.error('Error loading filter options:', error);
      
      // Set empty arrays as fallback
      this.stores = [];
      this.channels = [
        { value: 'balcao', label: 'Vendas na Loja', icon: '🏪' },
        { value: 'ifood', label: 'iFood', icon: '🛵' },
        { value: 'rappi', label: 'Rappi', icon: '📦' },
        { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
        { value: 'app_proprio', label: 'App Próprio', icon: '📱' },
      ];
      
      // Still mark as initialized to allow filtering
      this.isInitialized = true;
      
      // Emit empty filters
      this.applyFilters();
    });
  }

  applyQuickDate(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    // Fix date order: start should be before end
    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
    this.currentQuickDays = days;
    
    this.onFilterChange();
  }

  isQuickDateActive(days: number): boolean {
    return this.currentQuickDays === days;
  }

  toggleStore(storeId: string) {
    const index = this.selectedStores.indexOf(storeId);
    if (index > -1) {
      this.selectedStores.splice(index, 1);
    } else {
      this.selectedStores.push(storeId);
    }
    this.onFilterChange();
  }

  toggleChannel(channel: string) {
    const index = this.selectedChannels.indexOf(channel);
    if (index > -1) {
      this.selectedChannels.splice(index, 1);
    } else {
      this.selectedChannels.push(channel);
    }
    this.onFilterChange();
  }

  clearFilters() {
    this.startDate = '';
    this.endDate = '';
    this.selectedStores = [];
    this.selectedChannels = [];
    this.currentQuickDays = null;
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    return !!(this.startDate || this.endDate || this.selectedStores.length || this.selectedChannels.length);
  }

  onFilterChange() {
    // Auto-apply on change
    this.applyFilters();
  }

  applyFilters() {
    // Don't emit filters until data is loaded
    if (!this.isInitialized) {
      return;
    }

    const filters: AnalyticsFilters = {};

    if (this.startDate) {
      filters.startDate = this.startDate;
    }
    if (this.endDate) {
      filters.endDate = this.endDate;
    }
    if (this.selectedStores.length > 0) {
      filters.storeIds = this.selectedStores;
    }
    if (this.selectedChannels.length > 0) {
      filters.channels = this.selectedChannels;
    }

    this.filtersChange.emit(filters);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
