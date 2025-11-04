/**
 * Script para gerar 500.000 vendas realistas de 6 meses
 * 50 lojas, múltiplos canais, dados consistentes
 * 
 * Execute: npm run seed
 */

import { db } from '../index';
import { subMonths, addDays, addHours, addMinutes, startOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Configuração
const CONFIG = {
  STORES_COUNT: 50,
  CUSTOMERS_COUNT: 10000,
  PRODUCTS_COUNT: 200,
  PRODUCT_OPTIONS_COUNT: 50,
  SALES_TARGET: 500000,
  MONTHS: 6,
};

// Dados base
const CITIES = [
  { name: 'São Paulo', state: 'SP', neighborhoods: ['Centro', 'Jardins', 'Vila Mariana', 'Pinheiros', 'Itaim'] },
  { name: 'Rio de Janeiro', state: 'RJ', neighborhoods: ['Copacabana', 'Ipanema', 'Botafogo', 'Leblon', 'Centro'] },
  { name: 'Belo Horizonte', state: 'MG', neighborhoods: ['Savassi', 'Lourdes', 'Centro', 'Pampulha', 'Funcionários'] },
];

const PRODUCT_CATEGORIES = [
  'Hambúrgueres', 'Pizzas', 'Lanches', 'Bebidas', 'Sobremesas',
  'Saladas', 'Porções', 'Massas', 'Pratos Executivos', 'Combos'
];

const CHANNELS: Array<'in_store' | 'ifood' | 'rappi' | 'whatsapp' | 'own_app' | 'phone'> = [
  'in_store', 'ifood', 'rappi', 'whatsapp', 'own_app', 'phone'
];

const CHANNEL_WEIGHTS = {
  'in_store': 0.30,
  'ifood': 0.25,
  'rappi': 0.15,
  'whatsapp': 0.15,
  'own_app': 0.10,
  'phone': 0.05,
};

const PAYMENT_METHODS: Array<'cash' | 'debit_card' | 'credit_card' | 'pix' | 'voucher'> = [
  'cash', 'debit_card', 'credit_card', 'pix', 'voucher'
];

// Helpers
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function randomItem<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  
  return items[0];
}

function generatePhone(): string {
  return `(${randomInt(11, 99)}) ${randomInt(90000, 99999)}-${randomInt(1000, 9999)}`;
}

function generateEmail(name: string): string {
  const normalized = name.toLowerCase().replace(/\s+/g, '.');
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];
  return `${normalized}@${randomItem(domains)}`;
}

// Geração de dados
async function seedStores() {
  console.log('🏪 Gerando lojas...');
  const stores = [];

  for (let i = 1; i <= CONFIG.STORES_COUNT; i++) {
    const city = randomItem(CITIES);
    const neighborhood = randomItem(city.neighborhoods);
    
    stores.push({
      name: `Loja ${i} - ${city.name}`,
      slug: `loja-${i}-${city.name.toLowerCase().replace(/\s+/g, '-')}`,
      address: `Rua ${randomInt(1, 500)}, ${neighborhood}, ${city.name}`,
      latitude: randomFloat(-23.5, -22.5, 6),
      longitude: randomFloat(-46.8, -43.2, 6),
      phone: generatePhone(),
      is_active: true,
    });
  }

  await db('stores').insert(stores);
  console.log(`✅ ${stores.length} lojas criadas`);
  return stores;
}

async function seedCustomers() {
  console.log('👥 Gerando clientes...');
  const firstNames = ['João', 'Maria', 'José', 'Ana', 'Pedro', 'Paula', 'Carlos', 'Juliana', 'Fernando', 'Beatriz'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Ferreira', 'Lima'];
  
  const batchSize = 1000;
  let totalCreated = 0;

  for (let batch = 0; batch < CONFIG.CUSTOMERS_COUNT / batchSize; batch++) {
    const customers = [];
    
    for (let i = 0; i < batchSize; i++) {
      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const name = `${firstName} ${lastName}`;
      
      customers.push({
        name,
        email: Math.random() > 0.3 ? generateEmail(name) : null,
        phone: Math.random() > 0.2 ? generatePhone() : null,
        birth_date: Math.random() > 0.5 ? new Date(randomInt(1960, 2005), randomInt(0, 11), randomInt(1, 28)) : null,
      });
    }

    await db('customers').insert(customers);
    totalCreated += customers.length;
    console.log(`  ↳ ${totalCreated}/${CONFIG.CUSTOMERS_COUNT} clientes criados`);
  }

  console.log(`✅ ${totalCreated} clientes criados`);
}

async function seedProducts() {
  console.log('🍔 Gerando produtos...');
  const productNames = {
    'Hambúrgueres': ['Classic Burger', 'Cheese Burger', 'Bacon Burger', 'Veggie Burger', 'Double Burger'],
    'Pizzas': ['Margherita', 'Pepperoni', 'Calabresa', 'Portuguesa', 'Quatro Queijos'],
    'Lanches': ['Hot Dog', 'Misto Quente', 'Bauru', 'X-Tudo', 'Sanduíche Natural'],
    'Bebidas': ['Coca-Cola', 'Suco Natural', 'Água', 'Cerveja', 'Refrigerante'],
    'Sobremesas': ['Brownie', 'Sorvete', 'Pudim', 'Torta', 'Petit Gateau'],
    'Saladas': ['Caesar', 'Caprese', 'Grega', 'Verde', 'Tropical'],
    'Porções': ['Batata Frita', 'Onion Rings', 'Nuggets', 'Frango à Passarinho', 'Mandioca'],
    'Massas': ['Espaguete', 'Penne', 'Lasanha', 'Ravioli', 'Nhoque'],
    'Pratos Executivos': ['Filé com Fritas', 'Frango Grelhado', 'Peixe Assado', 'Strogonoff', 'Feijoada'],
    'Combos': ['Combo 1', 'Combo 2', 'Combo Família', 'Combo Casal', 'Combo Individual'],
  };

  const products = [];
  
  for (const category of PRODUCT_CATEGORIES) {
    const names = productNames[category as keyof typeof productNames];
    for (const name of names) {
      products.push({
        name: `${name} - ${category}`,
        slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${category.toLowerCase()}`,
        category,
        description: `Delicioso ${name}`,
        base_price: randomFloat(10, 80),
        cost: randomFloat(5, 40),
        is_active: true,
      });
    }
  }

  await db('products').insert(products);
  console.log(`✅ ${products.length} produtos criados`);
}

async function seedProductOptions() {
  console.log('➕ Gerando opções de produtos...');
  const options = [
    { name: 'Adicionar Bacon', type: 'add', price_modifier: 5.00 },
    { name: 'Adicionar Queijo Extra', type: 'add', price_modifier: 3.50 },
    { name: 'Adicionar Ovo', type: 'add', price_modifier: 2.00 },
    { name: 'Remover Cebola', type: 'remove', price_modifier: 0 },
    { name: 'Remover Tomate', type: 'remove', price_modifier: 0 },
    { name: 'Trocar Pão Integral', type: 'swap', price_modifier: 2.00 },
    { name: 'Molho Extra', type: 'add', price_modifier: 1.50 },
    { name: 'Batata Grande', type: 'swap', price_modifier: 5.00 },
  ];

  await db('product_options').insert(options);
  console.log(`✅ ${options.length} opções criadas`);
}

async function seedSales() {
  console.log('💰 Gerando vendas...');
  
  const stores = await db('stores').select('id');
  const customers = await db('customers').select('id');
  const products = await db('products').select('id', 'base_price', 'category');
  const options = await db('product_options').select('id', 'price_modifier');

  const startDate = subMonths(new Date(), CONFIG.MONTHS);
  const batchSize = 1000;
  let totalSales = 0;

  for (let batch = 0; batch < CONFIG.SALES_TARGET / batchSize; batch++) {
    const salesBatch: any[] = [];
    const productSalesBatch: any[] = [];
    const itemProductSalesBatch: any[] = [];
    const paymentsBatch: any[] = [];
    const deliverySalesBatch: any[] = [];
    const deliveryAddressesBatch: any[] = [];

    for (let i = 0; i < batchSize; i++) {
      // Gera data/hora realista
      const daysOffset = randomInt(0, CONFIG.MONTHS * 30);
      const baseDate = addDays(startDate, daysOffset);
      
      // Horários de pico: almoço (11-14h) e jantar (18-22h)
      const isPeakHour = Math.random() > 0.3;
      const hour = isPeakHour 
        ? (Math.random() > 0.5 ? randomInt(11, 14) : randomInt(18, 22))
        : randomInt(8, 23);
      
      const saleDate = addMinutes(addHours(startOfDay(baseDate), hour), randomInt(0, 59));

      // Canal com pesos
      const channel = weightedRandom(CHANNELS, Object.values(CHANNEL_WEIGHTS));
      const isDelivery = ['ifood', 'rappi', 'whatsapp', 'own_app'].includes(channel);

      // Produtos na venda (1-5 itens)
      const productCount = weightedRandom([1, 2, 3, 4, 5], [0.4, 0.3, 0.2, 0.07, 0.03]);
      const selectedProducts = [];
      for (let p = 0; p < productCount; p++) {
        selectedProducts.push(randomItem(products));
      }

      let subtotal = 0;
      const saleId = uuidv4();

      // Criar product_sales
      selectedProducts.forEach((product) => {
        const quantity = randomInt(1, 3);
        // Garantir que unitPrice seja numérico
        const unitPrice = Number(product.base_price);
        let totalPrice = unitPrice * quantity;

        // Adicionar customizações (30% de chance)
        const productSaleId = uuidv4();
        
        if (Math.random() > 0.7) {
          const optionCount = randomInt(1, 2);
          for (let o = 0; o < optionCount; o++) {
            const option = randomItem(options);
            // Garantir que price_modifier seja numérico
            totalPrice += Number(option.price_modifier);
            
            itemProductSalesBatch.push({
              id: uuidv4(),
              product_sale_id: productSaleId,
              product_option_id: option.id,
              quantity: 1,
              price_modifier: Number(option.price_modifier),
            });
          }
        }

        subtotal += totalPrice;

        productSalesBatch.push({
          id: productSaleId,
          sale_id: saleId,
          product_id: product.id,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        });
      });

      // Calcular taxas
      // Garantir que subtotal seja numérico - aplicar toFixed separadamente
      const numericSubtotal = typeof subtotal === 'string' ? Number(subtotal) : subtotal;
      const formattedSubtotal = Number(numericSubtotal.toFixed(2));
      
      const discount = Math.random() > 0.8 ? randomFloat(5, 15) : 0;
      const deliveryFee = isDelivery ? randomFloat(5, 15) : 0;
      const serviceFee = Math.random() > 0.7 ? randomFloat(2, 5) : 0;
      
      // Converter TODOS para Number antes de fazer os cálculos
      const subtotalNum = Number(formattedSubtotal);
      const discountNum = Number(discount);
      const deliveryFeeNum = Number(deliveryFee);
      const serviceFeeNum = Number(serviceFee);
      
      const platformFeeCalc = channel === 'ifood' ? subtotalNum * 0.27 : (channel === 'rappi' ? subtotalNum * 0.25 : 0);
      const platformFee = Number(platformFeeCalc.toFixed(2));
      const totalCalc = subtotalNum - discountNum + deliveryFeeNum + serviceFeeNum;
      const total = Number(totalCalc.toFixed(2));

      // Status (95% completadas)
      const status = Math.random() > 0.95 ? 'cancelled' : 'completed';

      salesBatch.push({
        id: saleId,
        store_id: randomItem(stores).id,
        customer_id: Math.random() > 0.2 ? randomItem(customers).id : null,
        sale_date: saleDate,
        status,
        channel,
        subtotal: formattedSubtotal,
        discount,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        platform_fee: platformFee,
        total,
        preparation_time: status === 'completed' ? randomInt(10, 45) : null,
        delivery_time: isDelivery && status === 'completed' ? randomInt(15, 60) : null,
      });

      // Payment
      paymentsBatch.push({
        id: uuidv4(),
        sale_id: saleId,
        payment_method: randomItem(PAYMENT_METHODS),
        status: status === 'completed' ? 'paid' : 'failed',
        amount: total,
        paid_at: status === 'completed' ? saleDate : null,
        transaction_id: `txn-${Date.now()}-${i}`,
      });

      // Delivery
      if (isDelivery) {
        const deliveryId = uuidv4();
        deliverySalesBatch.push({
          id: deliveryId,
          sale_id: saleId,
          driver_name: status === 'completed' ? `Entregador ${randomInt(1, 50)}` : null,
          picked_up_at: status === 'completed' ? addMinutes(saleDate, randomInt(20, 40)) : null,
          delivered_at: status === 'completed' ? addMinutes(saleDate, randomInt(30, 90)) : null,
          distance_km: randomFloat(0.5, 15, 1),
        });

        const city = randomItem(CITIES);
        deliveryAddressesBatch.push({
          id: uuidv4(),
          delivery_sale_id: deliveryId,
          street: `Rua ${randomInt(1, 1000)}`,
          number: `${randomInt(1, 999)}`,
          complement: Math.random() > 0.7 ? `Apto ${randomInt(1, 200)}` : null,
          neighborhood: randomItem(city.neighborhoods),
          city: city.name,
          state: city.state,
          zip_code: `${randomInt(10000, 99999)}-${randomInt(100, 999)}`,
          latitude: randomFloat(-23.5, -22.5, 8),
          longitude: randomFloat(-46.8, -43.2, 8),
        });
      }
    }

    // Insert em batch
    if (salesBatch.length > 0) {
      await db('sales').insert(salesBatch);
      await db('product_sales').insert(productSalesBatch);
      if (itemProductSalesBatch.length > 0) {
        await db('item_product_sales').insert(itemProductSalesBatch);
      }
      await db('payments').insert(paymentsBatch);
      if (deliverySalesBatch.length > 0) {
        await db('delivery_sales').insert(deliverySalesBatch);
        await db('delivery_addresses').insert(deliveryAddressesBatch);
      }
    }

    totalSales += salesBatch.length;
    console.log(`  ↳ ${totalSales}/${CONFIG.SALES_TARGET} vendas criadas (${((totalSales / CONFIG.SALES_TARGET) * 100).toFixed(1)}%)`);
  }

  console.log(`✅ ${totalSales} vendas criadas`);
}

async function refreshMaterializedViews() {
  console.log('🔄 Atualizando materialized views...');
  await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary');
  await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY product_performance');
  await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY customer_behavior');
  await db.raw('REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_performance');
  console.log('✅ Views atualizadas');
}

// Main
async function main() {
  try {
    console.log('🚀 Iniciando seed do banco de dados...\n');
    
    // Limpar dados existentes
    console.log('🗑️  Limpando dados existentes...');
    await db.raw('TRUNCATE TABLE payments, delivery_addresses, delivery_sales, item_product_sales, product_sales, sales, customers, products, product_options, stores RESTART IDENTITY CASCADE');
    console.log('✅ Dados limpos\n');
    
    const startTime = Date.now();

    await seedStores();
    await seedCustomers();
    await seedProducts();
    await seedProductOptions();
    await seedSales();
    await refreshMaterializedViews();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Seed concluído em ${duration}s!`);
    console.log('\n📊 Resumo:');
    console.log(`  - ${CONFIG.STORES_COUNT} lojas`);
    console.log(`  - ${CONFIG.CUSTOMERS_COUNT} clientes`);
    console.log(`  - ${await db('products').count('* as count').first().then(r => r?.count || 0)} produtos`);
    console.log(`  - ${CONFIG.SALES_TARGET} vendas`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

main();
