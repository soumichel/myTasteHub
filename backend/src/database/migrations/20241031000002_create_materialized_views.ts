import { Knex } from 'knex';

/**
 * Materialized views para analytics rápidos
 * Atualização: Pode ser agendada (ex: a cada hora) ou sob demanda
 */
export async function up(knex: Knex): Promise<void> {
  // Daily sales summary
  await knex.raw(`
    CREATE MATERIALIZED VIEW daily_sales_summary AS
    SELECT 
      DATE(sale_date) as sale_day,
      store_id,
      channel,
      status,
      COUNT(*) as total_sales,
      SUM(total) as total_revenue,
      SUM(subtotal) as total_subtotal,
      SUM(discount) as total_discount,
      SUM(platform_fee) as total_platform_fee,
      AVG(total) as avg_ticket,
      AVG(preparation_time) as avg_preparation_time,
      AVG(delivery_time) as avg_delivery_time
    FROM sales
    WHERE status = 'completed'
    GROUP BY DATE(sale_date), store_id, channel, status;

    CREATE UNIQUE INDEX ON daily_sales_summary (sale_day, store_id, channel, status);
    CREATE INDEX ON daily_sales_summary (sale_day);
    CREATE INDEX ON daily_sales_summary (store_id);
  `);

  // Product performance summary
  await knex.raw(`
    CREATE MATERIALIZED VIEW product_performance AS
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.category,
      DATE(s.sale_date) as sale_day,
      s.store_id,
      s.channel,
      COUNT(ps.id) as times_sold,
      SUM(ps.quantity) as total_quantity,
      SUM(ps.total_price) as total_revenue,
      AVG(ps.unit_price) as avg_price
    FROM products p
    INNER JOIN product_sales ps ON p.id = ps.product_id
    INNER JOIN sales s ON ps.sale_id = s.id
    WHERE s.status = 'completed'
    GROUP BY p.id, p.name, p.category, DATE(s.sale_date), s.store_id, s.channel;

    CREATE UNIQUE INDEX ON product_performance (product_id, sale_day, store_id, channel);
    CREATE INDEX ON product_performance (sale_day);
    CREATE INDEX ON product_performance (product_id);
    CREATE INDEX ON product_performance (category);
  `);

  // Customer behavior summary
  await knex.raw(`
    CREATE MATERIALIZED VIEW customer_behavior AS
    SELECT 
      c.id as customer_id,
      c.name as customer_name,
      COUNT(s.id) as total_orders,
      SUM(s.total) as lifetime_value,
      AVG(s.total) as avg_order_value,
      MIN(s.sale_date) as first_order_date,
      MAX(s.sale_date) as last_order_date,
      EXTRACT(DAY FROM (NOW() - MAX(s.sale_date))) as days_since_last_order
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id
    WHERE s.status = 'completed'
    GROUP BY c.id, c.name;

    CREATE UNIQUE INDEX ON customer_behavior (customer_id);
    CREATE INDEX ON customer_behavior (total_orders DESC);
    CREATE INDEX ON customer_behavior (lifetime_value DESC);
  `);

  // Hourly performance (para identificar horários de pico)
  await knex.raw(`
    CREATE MATERIALIZED VIEW hourly_performance AS
    SELECT 
      DATE(sale_date) as sale_day,
      EXTRACT(HOUR FROM sale_date) as hour,
      EXTRACT(DOW FROM sale_date) as day_of_week,
      store_id,
      channel,
      COUNT(*) as total_sales,
      SUM(total) as total_revenue,
      AVG(total) as avg_ticket,
      AVG(preparation_time) as avg_preparation_time
    FROM sales
    WHERE status = 'completed'
    GROUP BY DATE(sale_date), EXTRACT(HOUR FROM sale_date), EXTRACT(DOW FROM sale_date), store_id, channel;

    CREATE UNIQUE INDEX ON hourly_performance (sale_day, hour, day_of_week, store_id, channel);
    CREATE INDEX ON hourly_performance (sale_day);
    CREATE INDEX ON hourly_performance (hour);
    CREATE INDEX ON hourly_performance (day_of_week);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS hourly_performance');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS customer_behavior');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS product_performance');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS daily_sales_summary');
}
