# Docker 容器化部署设计文档

## 概述

将小兔鲜儿项目进行 Docker 容器化部署，优先 H5 端。采用 Docker Compose 编排 Nginx + Express 后端 + MySQL 三个容器，通过 GitHub Actions 实现自动部署到 Ubuntu 服务器。

## 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 部署架构 | Docker Compose 三容器 | 一键启停、环境隔离、便于迁移 |
| 前端容器 | 多阶段构建 (node → nginx:alpine) | 最终镜像约 50MB |
| 后端容器 | 多阶段构建 (node → node) | 最终镜像约 150MB |
| 数据库 | mysql:8.0 容器 + volume 持久化 | 数据安全、容器重建不丢 |
| 网络 | Docker bridge 网络 | 容器间通过服务名互通 |
| API 代理 | Nginx 反向代理 `/api/` | 统一入口，无需暴露后端端口 |
| CI/CD | GitHub Actions + SSH 部署 | push 到 main 自动触发部署 |
| 域名/SSL | 暂不配置，IP + 端口访问 | 简化初始部署 |

## 架构图

```
GitHub push → GitHub Actions → SSH → Ubuntu 服务器
                                              ┌─────────────────────────┐
                                              │  docker-compose.yml     │
                                              │                         │
                                              │  ┌─────────┐            │
                                              │  │  Nginx   │ :80       │
                                              │  │ 静态文件  │           │
                                              │  │ /api代理  │           │
                                              │  └────┬────┘            │
                                              │       │ /api/*          │
                                              │  ┌────▼────┐            │
                                              │  │ Backend  │ :3000     │
                                              │  │ Express  │           │
                                              │  └────┬────┘            │
                                              │       │                 │
                                              │  ┌────▼────┐            │
                                              │  │  MySQL   │ :3306     │
                                              │  │  8.0     │           │
                                              │  └─────────┘            │
                                              └─────────────────────────┘
```

## 文件结构

```
uniapp-shop-vue3-ts-master/
├── Dockerfile                    # 前端构建 + Nginx（多阶段）
├── docker-compose.yml            # 编排三容器
├── nginx/
│   └── default.conf              # Nginx 配置
├── server/
│   ├── Dockerfile                # 后端构建（多阶段）
│   └── .env                      # 已有，生产环境通过 compose 注入变量
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions 自动部署
├── .env.production               # 生产环境变量模板
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-06-04-docker-deployment-design.md  # 本文档
```

## Docker 配置

### 前端 Dockerfile

```dockerfile
# === Stage 1: 构建 H5 ===
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:h5

# === Stage 2: Nginx 服务 ===
FROM nginx:alpine
COPY --from=builder /app/dist/build/h5 /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 后端 Dockerfile

```dockerfile
# === Stage 1: 构建 ===
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# === Stage 2: 运行 ===
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

### docker-compose.yml

```yaml
services:
  nginx:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - xiaotuxian-net
    restart: unless-stopped

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD:-123456}
      - DB_NAME=xiaotuxian
      - JWT_SECRET=${JWT_SECRET:-your-secret-key}
      - PORT=3000
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - xiaotuxian-net
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-123456}
      MYSQL_DATABASE: xiaotuxian
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - xiaotuxian-net
    restart: unless-stopped

volumes:
  mysql_data:

networks:
  xiaotuxian-net:
    driver: bridge
```

## Nginx 配置

### nginx/default.conf

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 1024;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 文件上传大小限制
    client_max_body_size 10M;
}
```

## 前端 API 配置调整

修改 `src/config/index.ts` 中的 API_BASE：

```typescript
// #ifdef H5
export const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''
// #endif
```

生产环境下前端调用 `/api/xxx`，Nginx 自动转发到后端容器。

## GitHub Actions 自动部署

### .github/workflows/deploy.yml

```yaml
name: Deploy to Server

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/xiaotuxian
            git pull origin main
            docker compose down
            docker compose up -d --build
            docker image prune -f
```

### GitHub Secrets 配置

| Secret | 说明 | 示例 |
|--------|------|------|
| `SERVER_HOST` | 服务器公网 IP | `123.45.67.89` |
| `SERVER_USER` | SSH 用户名 | `root` 或 `ubuntu` |
| `SSH_PRIVATE_KEY` | SSH 私钥 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

## 服务器初始化

```bash
# 一次性操作
sudo mkdir -p /opt/xiaotuxian
sudo chown $USER:$USER /opt/xiaotuxian
cd /opt/xiaotuxian
git clone <仓库地址> .

# 创建环境变量
cat > .env << 'EOF'
DB_PASSWORD=your_strong_password
JWT_SECRET=your_jwt_secret_key
EOF

# 启动服务
docker compose up -d
```

## 安全配置

| 项目 | 措施 |
|------|------|
| MySQL 密码 | 通过 `.env` 文件注入 |
| JWT Secret | 通过环境变量注入 |
| 后端端口 | 仅 Docker 内部网络，外部通过 Nginx 80 访问 |
| SSH 密钥 | GitHub Actions 使用 ED25519 密钥 |
| 镜像体积 | 多阶段构建，不含构建工具和源码 |

## 运维命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f backend
docker compose logs -f nginx

# 重启服务
docker compose restart backend

# 进入容器
docker compose exec backend sh
docker compose exec mysql mysql -u root -p

# 停止服务
docker compose down

# 停止并删除数据（危险！）
docker compose down -v
```

## 部署检查清单

```
□ 服务器初始化
  □ 安装 Docker + Docker Compose
  □ 配置 SSH 免密登录
  □ 克隆仓库到 /opt/xiaotuxian
  □ 创建 .env 文件

□ GitHub 配置
  □ 创建仓库并推送代码
  □ 配置 Secrets

□ 首次部署
  □ 执行 docker compose up -d
  □ 验证容器状态
  □ 测试访问 http://服务器IP

□ 自动部署验证
  □ push 到 main 分支
  □ 检查 Actions 运行状态
  □ 验证容器已更新
```
