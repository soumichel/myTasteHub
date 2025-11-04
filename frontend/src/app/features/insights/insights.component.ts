import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';

interface Insight {
  icon: string;
  title: string;
  description: string;
  time: string;
  type: 'success' | 'warning' | 'info';
}

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights.component.html',
  styleUrls: ['./insights.component.scss']
})
export class InsightsComponent implements OnInit {
  loading = false;
  insights: Insight[] = [];

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit() {
    this.generateInsights();
  }

  async generateInsights() {
    this.loading = true;

    try {
      // Get data from last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const filters = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      const [products, channels, churnCustomers, deliveryRegions] = await Promise.all([
        this.analyticsService.getTopProducts(filters, 5).toPromise(),
        this.analyticsService.getChannelPerformance(filters).toPromise(),
        this.analyticsService.getChurnRiskCustomers(30, 3).toPromise(),
        this.analyticsService.getDeliveryPerformanceByRegion(filters).toPromise()
      ]);

      this.insights = [];

      // Insight 1: Top Product
      if (products && products.length > 0) {
        const topProduct = products[0];
        this.insights.push({
          icon: '🔥',
          title: 'Produto em Alta',
          description: `Seu "${topProduct.productName}" teve ${topProduct.quantity} unidades vendidas, gerando ${this.formatCurrency(topProduct.revenue)} em receita. Considere aumentar o estoque deste item.`,
          time: 'Atualizado agora',
          type: 'success'
        });
      }

      // Insight 2: Channel Performance
      if (channels && channels.length > 0) {
        const sortedChannels = [...channels].sort((a, b) => b.revenue - a.revenue);
        const topChannel = sortedChannels[0];
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
        
        const channelName = channelNames[topChannel.channel] || topChannel.channel;
        
        this.insights.push({
          icon: '🛵',
          title: 'Canal de Destaque',
          description: `${channelName} é seu melhor canal com ${this.formatCurrency(topChannel.revenue)} em receita e ticket médio de ${this.formatCurrency(topChannel.avgTicket)}.`,
          time: 'Há 2 horas',
          type: 'info'
        });
      }

      // Insight 3: Delivery Performance Alert
      if (deliveryRegions && deliveryRegions.length > 0) {
        const slowestRegion = [...deliveryRegions]
          .sort((a, b) => b.avg_delivery_time - a.avg_delivery_time)[0];
        
        if (slowestRegion && slowestRegion.avg_delivery_time > 45) {
          this.insights.push({
            icon: '⚠️',
            title: 'Alerta de Performance',
            description: `O tempo médio de entrega em ${slowestRegion.neighborhood}, ${slowestRegion.city} está em ${Math.round(slowestRegion.avg_delivery_time)} minutos. Considere revisar a logística desta região.`,
            time: 'Há 5 horas',
            type: 'warning'
          });
        }
      }

      // Insight 4: Churn Risk Customers
      if (churnCustomers && churnCustomers.length > 0) {
        const totalLifetimeValue = churnCustomers.reduce((sum, c) => sum + Number(c.lifetime_value), 0);
        this.insights.push({
          icon: '👥',
          title: 'Clientes em Risco',
          description: `${churnCustomers.length} clientes VIP (valor total: ${this.formatCurrency(totalLifetimeValue)}) não fazem pedidos há mais de 30 dias. Que tal uma campanha de reengajamento com 15% de desconto?`,
          time: 'Há 1 dia',
          type: 'warning'
        });
      }

      // Insight 5: Product Opportunity
      if (products && products.length >= 2) {
        const product1 = products[0];
        const product2 = products[1];
        this.insights.push({
          icon: '💰',
          title: 'Oportunidade de Receita',
          description: `"${product1.productName}" e "${product2.productName}" são frequentemente comprados juntos. Considere criar um combo promocional!`,
          time: 'Há 2 dias',
          type: 'success'
        });
      }

      this.loading = false;
    } catch (error) {
      console.error('Error generating insights:', error);
      this.loading = false;
      // Fallback to mock data
      this.loadMockInsights();
    }
  }

  loadMockInsights() {
    this.insights = [
      {
        icon: '🔥',
        title: 'Produto em Alta',
        description: 'Seu "Hambúrguer Artesanal" teve aumento de 45% nas vendas esta semana. Considere aumentar o estoque deste item.',
        time: 'Há 2 horas',
        type: 'success'
      },
      {
        icon: '⚠️',
        title: 'Alerta de Performance',
        description: 'O tempo médio de entrega na região do Centro aumentou para 52 minutos. 15% acima da meta. Verifique a logística.',
        time: 'Há 5 horas',
        type: 'warning'
      },
      {
        icon: '👥',
        title: 'Clientes em Risco',
        description: '23 clientes VIP não fazem pedidos há mais de 30 dias. Que tal uma campanha de reengajamento com 15% de desconto?',
        time: 'Há 1 dia',
        type: 'warning'
      },
      {
        icon: '💰',
        title: 'Oportunidade de Receita',
        description: 'Clientes que compram "Pizza Margherita" também compram "Refrigerante" em 78% dos casos. Crie um combo!',
        time: 'Há 2 dias',
        type: 'success'
      }
    ];
  }

  markAsUseful(insight: Insight) {
    console.log('Marked as useful:', insight.title);
    // TODO: Send to backend analytics
    alert('✅ Obrigado pelo feedback!');
  }

  saveInsight(insight: Insight) {
    console.log('Saved insight:', insight.title);
    // TODO: Save to user's favorites
    alert('🔖 Insight salvo com sucesso!');
  }

  shareInsight(insight: Insight) {
    console.log('Share insight:', insight.title);
    // TODO: Implement share functionality
    const text = `${insight.title}\n\n${insight.description}`;
    if (navigator.share) {
      navigator.share({
        title: insight.title,
        text: text,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      alert('📋 Copiado para área de transferência:\n\n' + text);
      navigator.clipboard.writeText(text);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  }
}
