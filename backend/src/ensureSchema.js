import "./loadEnv.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates the database + all tables automatically (IF NOT EXISTS).
 * Safe to run on every server start.
 */
export async function ensureSchema() {
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "palm_pizza";

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    const schemaPath = path.join(__dirname, "../sql/schema.sql");
    let schema = fs.readFileSync(schemaPath, "utf8");

    // Always target the configured DB name
    schema = schema
      .replace(
        /CREATE DATABASE IF NOT EXISTS\s+\w+/i,
        `CREATE DATABASE IF NOT EXISTS ${database}`,
      )
      .replace(/USE\s+\w+\s*;/i, `USE ${database};`);

    await connection.query(schema);

    // Migrations for existing databases
    const migrations = [
      [
        "email_verified",
        `ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0`,
      ],
      ["verify_code", `ALTER TABLE users ADD COLUMN verify_code VARCHAR(10) NULL`],
      [
        "verify_token",
        `ALTER TABLE users ADD COLUMN verify_token VARCHAR(64) NULL`,
      ],
      [
        "verify_expires_at",
        `ALTER TABLE users ADD COLUMN verify_expires_at DATETIME NULL`,
      ],
      ["reset_code", `ALTER TABLE users ADD COLUMN reset_code VARCHAR(10) NULL`],
      [
        "reset_token",
        `ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) NULL`,
      ],
      [
        "reset_expires_at",
        `ALTER TABLE users ADD COLUMN reset_expires_at DATETIME NULL`,
      ],
    ];

    for (const [column, sql] of migrations) {
      const [cols] = await connection.query(
        `SHOW COLUMNS FROM \`${database}\`.users LIKE ?`,
        [column],
      );
      if (!cols.length) {
        await connection.query(
          sql.replace(
            "ALTER TABLE users",
            `ALTER TABLE \`${database}\`.users`,
          ),
        );
        console.log(`→ Added users.${column}`);
      }
    }

    // Existing accounts stay usable (admins always verified)
    await connection.query(
      `UPDATE \`${database}\`.users SET email_verified = 1 WHERE role = 'admin'`,
    );

    const orderColumns = [
      [
        "customer_email",
        `ALTER TABLE \`${database}\`.orders ADD COLUMN customer_email VARCHAR(190) NULL`,
      ],
      [
        "payment_status",
        `ALTER TABLE \`${database}\`.orders ADD COLUMN payment_status VARCHAR(24) NOT NULL DEFAULT 'pending'`,
      ],
      [
        "paid_at",
        `ALTER TABLE \`${database}\`.orders ADD COLUMN paid_at DATETIME NULL`,
      ],
    ];
    for (const [column, sql] of orderColumns) {
      const [cols] = await connection.query(
        `SHOW COLUMNS FROM \`${database}\`.orders LIKE ?`,
        [column],
      );
      if (!cols.length) {
        await connection.query(sql);
        console.log(`→ Added orders.${column}`);
      }
    }

    // Menu: allow drink + burger categories + editable product details JSON
    try {
      const [catCols] = await connection.query(
        `SHOW COLUMNS FROM \`${database}\`.menu_items LIKE 'category'`,
      );
      const catType = String(catCols?.[0]?.Type || "");
      if (catType && (!catType.includes("drink") || !catType.includes("burger"))) {
        await connection.query(
          `ALTER TABLE \`${database}\`.menu_items
           MODIFY COLUMN category
           ENUM('classic','cheese','veggie','meat','side','combo','drink','burger') NOT NULL`,
        );
        console.log("→ Expanded menu_items.category for drinks/burgers");
      }
    } catch (err) {
      console.error("Menu category migration skipped:", err.message);
    }

    try {
      const [detailCols] = await connection.query(
        `SHOW COLUMNS FROM \`${database}\`.menu_items LIKE 'details'`,
      );
      if (!detailCols.length) {
        await connection.query(
          `ALTER TABLE \`${database}\`.menu_items
           ADD COLUMN details LONGTEXT NULL AFTER category`,
        );
        console.log("→ Added menu_items.details");
      }
    } catch (err) {
      console.error("Menu details migration skipped:", err.message);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${database}\`.payment_transactions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(40) NOT NULL,
        customer_reference VARCHAR(80) NOT NULL UNIQUE,
        gateway_refid VARCHAR(80) NULL,
        gateway_tid VARCHAR(80) NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'RWF',
        pmethod VARCHAR(16) NOT NULL DEFAULT 'momo',
        status VARCHAR(24) NOT NULL DEFAULT 'pending',
        payment_url TEXT NULL,
        gateway_payload LONGTEXT NULL,
        receipt_sent TINYINT(1) NOT NULL DEFAULT 0,
        owner_notified TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES \`${database}\`.orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${database}\`.payouts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        customer_reference VARCHAR(80) NOT NULL UNIQUE,
        internal_ref VARCHAR(80) NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'RWF',
        recipient_name VARCHAR(120) NOT NULL,
        msisdn VARCHAR(20) NOT NULL,
        telecom_provider_id VARCHAR(20) NOT NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'pending',
        status_message TEXT NULL,
        initiated_by INT UNSIGNED NULL,
        gateway_payload LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`${database}\`.webhook_deliveries (
        idempotency_key VARCHAR(190) PRIMARY KEY,
        event_type VARCHAR(80) NOT NULL DEFAULT '',
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const offerColumns = [
      [
        "deal_label",
        `ALTER TABLE \`${database}\`.offers ADD COLUMN deal_label VARCHAR(120) NULL AFTER description`,
      ],
      [
        "terms",
        `ALTER TABLE \`${database}\`.offers ADD COLUMN terms TEXT NULL AFTER deal_label`,
      ],
      [
        "href",
        `ALTER TABLE \`${database}\`.offers ADD COLUMN href VARCHAR(200) NULL AFTER terms`,
      ],
      [
        "image_url",
        `ALTER TABLE \`${database}\`.offers ADD COLUMN image_url VARCHAR(500) NULL AFTER href`,
      ],
      [
        "show_on_home",
        `ALTER TABLE \`${database}\`.offers ADD COLUMN show_on_home TINYINT(1) NOT NULL DEFAULT 1 AFTER image_url`,
      ],
      [
        "menu_item_id",
        `ALTER TABLE \`${database}\`.offers ADD COLUMN menu_item_id VARCHAR(40) NULL AFTER show_on_home`,
      ],
      [
        "size_prices",
        `ALTER TABLE \`${database}\`.offers ADD COLUMN size_prices TEXT NULL AFTER menu_item_id`,
      ],
    ];
    for (const [column, sql] of offerColumns) {
      try {
        const [cols] = await connection.query(
          `SHOW COLUMNS FROM \`${database}\`.offers LIKE ?`,
          [column],
        );
        if (!cols.length) {
          await connection.query(sql);
          console.log(`→ Added offers.${column}`);
        }
      } catch (err) {
        console.error(`Offers migration skipped (${column}):`, err.message);
      }
    }

    await connection.query(
      `UPDATE \`${database}\`.settings
       SET setting_value = 'info@palmpizzakitchen.com'
       WHERE setting_key = 'email'
         AND setting_value IN (
           'hello@palmpizza.com',
           'support@palmpizzakitchen.com',
           'hello@pampizzakitchen.com'
         )`,
    );

    const [tables] = await connection.query(
      `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?`,
      [database],
    );

    console.log(
      `✓ MySQL ready: ${database} (${tables.length} tables)`,
    );
    return { database, tables: tables.map((t) => t.name) };
  } finally {
    await connection.end();
  }
}
