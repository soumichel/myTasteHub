import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enum types
  await knex.raw(`
    CREATE TYPE sale_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'completed', 'cancelled');
    CREATE TYPE sale_channel AS ENUM ('in_store', 'ifood', 'rappi', 'whatsapp', 'own_app', 'phone');
    CREATE TYPE payment_method AS ENUM ('cash', 'debit_card', 'credit_card', 'pix', 'voucher');
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
  `);

  // Stores table
  await knex.schema.createTable('stores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.text('address');
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.string('phone', 20);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index(['slug']);
    table.index(['is_active']);
  });

  // Customers table
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 150).notNullable();
    table.string('email', 150);
    table.string('phone', 20);
    table.date('birth_date');
    table.timestamps(true, true);

    table.index(['email']);
    table.index(['phone']);
  });

  // Products table
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 150).notNullable();
    table.string('slug', 150).notNullable();
    table.string('category', 100).notNullable();
    table.text('description');
    table.decimal('base_price', 10, 2).notNullable();
    table.decimal('cost', 10, 2);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index(['category']);
    table.index(['is_active']);
    table.index(['slug']);
  });

  // Product options (complementos/customizações)
  await knex.schema.createTable('product_options', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable(); // ex: "Adicionar bacon", "Remover cebola"
    table.string('type', 50).notNullable(); // 'add', 'remove', 'swap'
    table.decimal('price_modifier', 10, 2).defaultTo(0); // +5.00 ou -2.00
    table.timestamps(true, true);
  });

  // Sales table (main transaction)
  await knex.schema.createTable('sales', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('store_id').notNullable().references('id').inTable('stores').onDelete('RESTRICT');
    table.uuid('customer_id').references('id').inTable('customers').onDelete('SET NULL');
    
    table.timestamp('sale_date').notNullable().defaultTo(knex.fn.now());
    table.specificType('status', 'sale_status').notNullable().defaultTo('pending');
    table.specificType('channel', 'sale_channel').notNullable();
    
    // Financial
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('discount', 10, 2).defaultTo(0);
    table.decimal('delivery_fee', 10, 2).defaultTo(0);
    table.decimal('service_fee', 10, 2).defaultTo(0);
    table.decimal('platform_fee', 10, 2).defaultTo(0); // comissão iFood/Rappi
    table.decimal('total', 10, 2).notNullable();
    
    // Operational times (in minutes)
    table.integer('preparation_time');
    table.integer('delivery_time');
    
    table.text('notes');
    table.timestamps(true, true);

    // Indexes para performance
    table.index(['sale_date']);
    table.index(['store_id', 'sale_date']);
    table.index(['channel']);
    table.index(['status']);
    table.index(['customer_id', 'sale_date']);
    table.index(['created_at']);
  });

  // Product sales (items in a sale)
  await knex.schema.createTable('product_sales', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sale_id').notNullable().references('id').inTable('sales').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 10, 2).notNullable();
    table.decimal('total_price', 10, 2).notNullable();
    table.text('notes');
    
    table.timestamps(true, true);

    table.index(['sale_id']);
    table.index(['product_id']);
  });

  // Item customizations (opções escolhidas por produto)
  await knex.schema.createTable('item_product_sales', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('product_sale_id').notNullable().references('id').inTable('product_sales').onDelete('CASCADE');
    table.uuid('product_option_id').notNullable().references('id').inTable('product_options').onDelete('RESTRICT');
    
    table.integer('quantity').defaultTo(1);
    table.decimal('price_modifier', 10, 2).notNullable();
    
    table.timestamps(true, true);

    table.index(['product_sale_id']);
  });

  // Payments
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sale_id').notNullable().references('id').inTable('sales').onDelete('CASCADE');
    
    table.specificType('payment_method', 'payment_method').notNullable();
    table.specificType('status', 'payment_status').notNullable().defaultTo('pending');
    table.decimal('amount', 10, 2).notNullable();
    table.timestamp('paid_at');
    table.text('transaction_id');
    
    table.timestamps(true, true);

    table.index(['sale_id']);
    table.index(['payment_method']);
    table.index(['status']);
  });

  // Delivery sales
  await knex.schema.createTable('delivery_sales', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sale_id').notNullable().unique().references('id').inTable('sales').onDelete('CASCADE');
    
    table.string('driver_name', 100);
    table.timestamp('picked_up_at');
    table.timestamp('delivered_at');
    table.decimal('distance_km', 8, 2);
    
    table.timestamps(true, true);

    table.index(['sale_id']);
  });

  // Delivery addresses
  await knex.schema.createTable('delivery_addresses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('delivery_sale_id').notNullable().unique().references('id').inTable('delivery_sales').onDelete('CASCADE');
    
    table.string('street', 200).notNullable();
    table.string('number', 20);
    table.string('complement', 100);
    table.string('neighborhood', 100);
    table.string('city', 100).notNullable();
    table.string('state', 2).notNullable();
    table.string('zip_code', 10);
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    
    table.timestamps(true, true);

    table.index(['delivery_sale_id']);
    table.index(['city', 'neighborhood']);
    // GiST index para queries geoespaciais
    table.index(['latitude', 'longitude']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('delivery_addresses');
  await knex.schema.dropTableIfExists('delivery_sales');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('item_product_sales');
  await knex.schema.dropTableIfExists('product_sales');
  await knex.schema.dropTableIfExists('sales');
  await knex.schema.dropTableIfExists('product_options');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('customers');
  await knex.schema.dropTableIfExists('stores');
  
  await knex.raw(`
    DROP TYPE IF EXISTS payment_status;
    DROP TYPE IF EXISTS payment_method;
    DROP TYPE IF EXISTS sale_channel;
    DROP TYPE IF EXISTS sale_status;
  `);
}
