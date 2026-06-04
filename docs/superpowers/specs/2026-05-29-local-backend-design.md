# 小兔鲜儿本地后端设计文档

## 概述

为小兔鲜儿 uni-app 前端搭建完全独立的本地后端服务，替代已下线的远程测试 API。

- **技术栈**：Node.js + Express + MySQL 5.7
- **目标**：前端仅改一行 baseURL，所有接口无缝对接

## 项目结构

```
uniapp-shop-vue3-ts-master/
├── src/                    # 前端（不动）
├── server/                 # 后端（新建）
│   ├── app.js              # Express 入口
│   ├── config/
│   │   └── db.js           # MySQL 连接配置
│   ├── middleware/
│   │   └── auth.js         # JWT 认证中间件
│   ├── routes/             # 路由（与前端 services 一一对应）
│   │   ├── home.js
│   │   ├── category.js
│   │   ├── goods.js
│   │   ├── login.js
│   │   ├── member.js       # profile + address
│   │   ├── cart.js
│   │   ├── order.js
│   │   └── pay.js
│   ├── models/             # 数据库查询
│   │   ├── home.js
│   │   ├── category.js
│   │   ├── goods.js
│   │   ├── user.js
│   │   ├── cart.js
│   │   ├── address.js
│   │   └── order.js
│   ├── scripts/
│   │   └── crawl.js        # 爬虫脚本
│   └── package.json
└── package.json            # 前端
```

## 数据库设计

库名：`xiaotuxian`

### users 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 用户ID |
| account | VARCHAR(50) UNIQUE | 账号 |
| password | VARCHAR(255) | bcrypt 加密密码 |
| nickname | VARCHAR(50) | 昵称 |
| avatar | VARCHAR(500) | 头像URL |
| mobile | VARCHAR(20) | 手机号 |
| gender | ENUM('男','女') | 性别 |
| birthday | DATE | 生日 |
| profession | VARCHAR(50) | 职业 |
| full_location | VARCHAR(200) | 省市区 |
| province_code | VARCHAR(10) | 省份编码 |
| city_code | VARCHAR(10) | 城市编码 |
| county_code | VARCHAR(10) | 区县编码 |
| created_at | TIMESTAMP | 创建时间 |

### banners 轮播图表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| img_url | VARCHAR(500) | 图片URL |
| href_url | VARCHAR(200) | 跳转链接 |
| type | TINYINT | 跳转类型 |
| distribution_site | TINYINT | 1=首页 2=分类页 |

### categories 前台分类表（首页快捷入口）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| name | VARCHAR(50) | 分类名称 |
| icon | VARCHAR(500) | 图标URL |

### goods_categories 商品分类表（树形）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| parent_id | INT | 0=一级分类，否则为父级ID |
| name | VARCHAR(50) | 分类名称 |
| picture | VARCHAR(500) | 分类图片 |
| image_banners | JSON | 一级分类图片集 |

### goods 商品表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | 商品ID |
| name | VARCHAR(200) | 商品名称 |
| desc | VARCHAR(500) | 商品描述 |
| price | DECIMAL(10,2) | 当前价格 |
| old_price | DECIMAL(10,2) | 原价 |
| main_pictures | JSON | 主图数组 |
| details_pictures | JSON | 详情图数组 |
| details_properties | JSON | 详情属性 [{name,value}] |
| category_id | INT | 所属二级分类ID |

### goods_skus 商品SKU表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | SKU ID |
| goods_id | INT | 商品ID |
| sku_code | VARCHAR(100) | SKU编码 |
| price | DECIMAL(10,2) | SKU价格 |
| old_price | DECIMAL(10,2) | SKU原价 |
| inventory | INT | 库存 |
| picture | VARCHAR(500) | SKU图片 |
| specs | JSON | [{name,valueName}] |

### goods_specs 商品规格表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| goods_id | INT | 商品ID |
| name | VARCHAR(50) | 规格名称 |
| values | JSON | [{name,desc,picture,available}] |

### hot_items 热门推荐表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| title | VARCHAR(100) | 标题 |
| alt | VARCHAR(200) | 说明 |
| pictures | JSON | 图片数组 |
| target | VARCHAR(200) | 跳转地址 |
| type | VARCHAR(50) | 推荐类型 |

### addresses 收货地址表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| user_id | INT | 用户ID |
| receiver | VARCHAR(50) | 收货人 |
| contact | VARCHAR(20) | 联系方式 |
| province_code | VARCHAR(10) | 省份编码 |
| city_code | VARCHAR(10) | 城市编码 |
| county_code | VARCHAR(10) | 区县编码 |
| full_location | VARCHAR(200) | 省市区 |
| address | VARCHAR(300) | 详细地址 |
| is_default | TINYINT | 是否默认 1=是 0=否 |

### cart_items 购物车表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| user_id | INT | 用户ID |
| sku_id | INT | SKU ID |
| count | INT | 数量 |
| selected | TINYINT | 是否选中 |

### orders 订单表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| order_no | VARCHAR(50) UNIQUE | 订单编号 |
| user_id | INT | 用户ID |
| order_state | TINYINT | 1待付款 2待发货 3待收货 4待评价 5已完成 6已取消 |
| address_snapshot | JSON | 下单时地址快照 |
| total_money | DECIMAL(10,2) | 商品总价 |
| post_fee | DECIMAL(10,2) | 运费 |
| pay_money | DECIMAL(10,2) | 应付金额 |
| buyer_message | VARCHAR(500) | 订单备注 |
| delivery_time_type | TINYINT | 配送时间 1不限 2工作日 3假日 |
| pay_type | TINYINT | 1在线支付 2货到付款 |
| pay_channel | TINYINT | 1支付宝 2微信 |
| countdown | INT | 倒计时秒数 |
| created_at | TIMESTAMP | 创建时间 |

### order_skus 订单商品表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO_INCREMENT | ID |
| order_id | INT | 订单ID |
| sku_id | INT | SKU ID |
| name | VARCHAR(200) | 商品名称 |
| image | VARCHAR(500) | 商品图片 |
| attrs_text | VARCHAR(300) | 属性文字 |
| quantity | INT | 数量 |
| cur_price | DECIMAL(10,2) | 购买时单价 |

## API 路由设计

Base URL: `http://localhost:3000`

所有接口统一返回格式：
```json
{ "code": "1", "msg": "操作成功", "result": ... }
```

错误返回：
```json
{ "code": "0", "msg": "错误信息", "result": null }
```

### 公开接口（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/home/banner?distributionSite=1` | 轮播图 |
| GET | `/home/category/mutli` | 前台分类 |
| GET | `/home/hot/mutli` | 热门推荐 |
| GET | `/home/goods/guessLike?page=1&pageSize=10` | 猜你喜欢 |
| GET | `/hot/{type}?page=1&pageSize=10&subType=xxx` | 热门推荐子页面 |
| POST | `/search` | 搜索商品 |
| GET | `/search/hint?keywords=xxx` | 搜索提示 |
| GET | `/category/top` | 分类列表(树形) |
| GET | `/goods?id=xxx` | 商品详情 |
| POST | `/login` | 账号密码登录 |
| POST | `/login/wxMin` | 微信登录 |
| POST | `/login/wxMin/simple` | 简易登录 |

### 认证接口（需 Authorization 头）

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/login/refresh` | 刷新 token |
| GET | `/member/profile` | 个人信息 |
| PUT | `/member/profile` | 修改个人信息 |
| POST | `/member/profile/avatar` | 上传头像 |
| GET | `/member/address` | 地址列表 |
| POST | `/member/address` | 添加地址 |
| GET | `/member/address/{id}` | 地址详情 |
| PUT | `/member/address/{id}` | 修改地址 |
| DELETE | `/member/address/{id}` | 删除地址 |
| GET | `/member/cart` | 购物车列表 |
| POST | `/member/cart` | 加入购物车 |
| PUT | `/member/cart/{skuId}` | 修改购物车 |
| PUT | `/member/cart/selected` | 全选/取消全选 |
| DELETE | `/member/cart` | 删除购物车商品 |
| GET | `/member/order/pre` | 预付订单 |
| GET | `/member/order/pre/now` | 立即购买 |
| GET | `/member/order/repurchase/{id}` | 再次购买 |
| POST | `/member/order` | 提交订单 |
| GET | `/member/order` | 订单列表 |
| GET | `/member/order/{id}` | 订单详情 |
| PUT | `/member/order/{id}/cancel` | 取消订单 |
| PUT | `/member/order/{id}/receipt` | 确认收货 |
| GET | `/member/order/{id}/logistics` | 物流信息 |
| GET | `/member/order/consignment/{id}` | 模拟发货 |
| DELETE | `/member/order` | 删除订单 |
| GET | `/pay/wxPay/miniPay` | 微信支付参数 |
| GET | `/pay/mock` | 模拟支付 |

## 认证方案

- 密码加密：bcrypt
- Token：JWT，有效期 7 天
- 中间件：拦截 `/member/*` 路径，校验 `Authorization` 头
- 401 响应：`{ "code": "0", "msg": "未登录或token已过期", "result": null }`
- 客户端标识：`source-client` 请求头（miniapp/app/h5），记录日志用

## 数据爬取策略

脚本：`server/scripts/crawl.js`

1. 爬取所有公开 GET 接口的数据
2. 图片 URL 保持原样（阿里云 OSS），不下载到本地
3. 远程 ID 为字符串，本地 MySQL 用自增 INT，脚本维护 ID 映射
4. 执行：`node server/scripts/crawl.js`

## 前端改动

仅修改 `src/utils/http.ts` 第 15 行：
```typescript
// 原来
const baseURL = 'https://pcapi-xiaotuxian-front-devtest.itheima.net'
// 改为
const baseURL = 'http://localhost:3000'
```

## 启动流程

```bash
# 1. 安装后端依赖
cd server && pnpm i

# 2. 创建数据库并导入数据
mysql -u root -proot < scripts/init.sql
node scripts/crawl.js

# 3. 启动后端
node app.js          # 运行在 http://localhost:3000

# 4. 启动前端（另一个终端）
cd .. && pnpm dev:h5  # 运行在 http://localhost:5173
```
