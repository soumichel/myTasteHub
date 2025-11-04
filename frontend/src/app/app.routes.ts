import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'kpi-dashboard',
    pathMatch: 'full'
  },
  {
    path: 'kpi-dashboard',
    loadComponent: () => import('./features/dashboard/kpi-dashboard.component').then(m => m.KpiDashboardComponent),
    title: 'Dashboard'
  },
  {
    path: 'analytics',
    loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent)
  },
  {
    path: 'store-comparison',
    loadComponent: () => import('./features/analytics/store-comparison.component').then(m => m.StoreComparisonComponent)
  },
  {
    path: 'insights',
    loadComponent: () => import('./features/insights/insights.component').then(m => m.InsightsComponent)
  },
  {
    path: 'products-channel-analysis',
    loadComponent: () => import('./features/insights/products-channel-analysis.component').then(m => m.ProductsChannelAnalysisComponent)
  },
  {
    path: '**',
    redirectTo: 'kpi-dashboard'
  }
];
