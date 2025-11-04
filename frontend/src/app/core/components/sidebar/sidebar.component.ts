import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  menuItems: MenuItem[] = [
    { icon: '📊', label: 'Dashboard', route: '/kpi-dashboard' },
    { icon: '📈', label: 'Analytics', route: '/analytics' },
    { icon: '🏪', label: 'Comparar Lojas', route: '/store-comparison' },
    { icon: '🛍️', label: 'Produtos por Canal', route: '/products-channel-analysis' },
    { icon: '💡', label: 'Insights', route: '/insights' },
  ];
}
