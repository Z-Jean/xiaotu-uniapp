import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    multipleStatements: true,
  })

  console.log('连接 MySQL 成功，正在创建数据库...')
  await conn.query('CREATE DATABASE IF NOT EXISTS xiaotuxian DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci')
  await conn.query('USE xiaotuxian')
  console.log('数据库 xiaotuxian 已就绪，正在建表...')

  const sql = `
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar VARCHAR(500),
  mobile VARCHAR(20),
  gender ENUM('男','女') DEFAULT NULL,
  birthday DATE DEFAULT NULL,
  profession VARCHAR(50) DEFAULT NULL,
  full_location VARCHAR(200) DEFAULT NULL,
  province_code VARCHAR(10) DEFAULT NULL,
  city_code VARCHAR(10) DEFAULT NULL,
  county_code VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS banners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  img_url VARCHAR(500) NOT NULL,
  href_url VARCHAR(200),
  type TINYINT DEFAULT 1,
  distribution_site TINYINT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goods_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT DEFAULT 0,
  name VARCHAR(50) NOT NULL,
  picture VARCHAR(500),
  image_banners JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  \`desc\` VARCHAR(500),
  price DECIMAL(10,2),
  old_price DECIMAL(10,2),
  main_pictures JSON,
  details_pictures JSON,
  details_properties JSON,
  category_id INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goods_skus (
  id INT PRIMARY KEY AUTO_INCREMENT,
  goods_id INT NOT NULL,
  sku_code VARCHAR(100),
  price DECIMAL(10,2),
  old_price DECIMAL(10,2),
  inventory INT DEFAULT 0,
  picture VARCHAR(500),
  specs JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goods_specs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  goods_id INT NOT NULL,
  name VARCHAR(50),
  \`values\` JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hot_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100),
  alt VARCHAR(200),
  pictures JSON,
  target VARCHAR(200),
  type VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS addresses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  receiver VARCHAR(50) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  province_code VARCHAR(10),
  city_code VARCHAR(10),
  county_code VARCHAR(10),
  full_location VARCHAR(200),
  address VARCHAR(300),
  is_default TINYINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  sku_id INT NOT NULL,
  count INT DEFAULT 1,
  selected TINYINT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  order_state TINYINT DEFAULT 1,
  address_snapshot JSON,
  total_money DECIMAL(10,2),
  post_fee DECIMAL(10,2) DEFAULT 0,
  pay_money DECIMAL(10,2),
  buyer_message VARCHAR(500),
  delivery_time_type TINYINT DEFAULT 1,
  pay_type TINYINT DEFAULT 1,
  pay_channel TINYINT DEFAULT 2,
  countdown INT DEFAULT 1800,
  receiver_contact VARCHAR(50),
  receiver_mobile VARCHAR(20),
  receiver_address VARCHAR(300),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_skus (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  sku_id INT NOT NULL,
  name VARCHAR(200),
  image VARCHAR(500),
  attrs_text VARCHAR(300),
  quantity INT DEFAULT 1,
  cur_price DECIMAL(10,2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`

  await conn.query(sql)
  console.log('所有表创建完成！')

  const hash = await bcrypt.hash('123456', 10)
  await conn.query(
    'INSERT IGNORE INTO users (account, password, nickname, avatar, mobile) VALUES (?, ?, ?, ?, ?)',
    ['test', hash, '测试用户', '', '13800138000']
  )
  console.log('测试用户已创建: test / 123456')

  await conn.end()
  console.log('数据库初始化完成！')
}

main().catch(err => {
  console.error('初始化失败:', err.message)
  process.exit(1)
})
