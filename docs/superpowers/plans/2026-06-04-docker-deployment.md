# Docker 容器化部署实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将小兔鲜儿项目 Docker 容器化部署到 Ubuntu 服务器，优先 H5 端，通过 GitHub Actions 实现自动部署

**架构：** Docker Compose 编排 Nginx（前端静态文件 + /api 反向代理）+ Express 后端 + MySQL 三容器，通过 Docker bridge 网络互通

**技术栈：** Docker, Docker Compose, Nginx, Node.js 20, pnpm, GitHub Actions, SSH

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `Dockerfile` | 创建 | 前端多阶段构建（node → nginx:alpine） |
| `docker-compose.yml` | 创建 | 编排三容器 |
| `nginx/default.conf` | 创建 | Nginx 配置（静态文件 + /api 代理） |
| `server/Dockerfile` | 创建 | 后端多阶段构建（node → node） |
| `.github/workflows/deploy.yml` | 创建 | GitHub Actions 自动部署 |
| `.env.production` | 创建 | 生产环境变量模板 |
| `.gitignore` | 修改 | 添加 Docker 相关忽略规则 |
| `src/config/index.ts` | 修改 | 生产环境 API 地址改为空字符串 |
| `server/app.ts` | 修改 | PORT 改为环境变量读取 |

---

### 任务 1：修改后端 PORT 配置为环境变量

**文件：**
- 修改：`server/app.ts:94-97`

- [ ] **步骤 1：修改 PORT 为环境变量**

```typescript
// server/app.ts 第 94-97 行
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`小兔鲜儿后端服务已启动: http://localhost:${PORT}`)
})
```

- [ ] **步骤 2：验证本地开发不受影响**

运行：`cd server && pnpm dev`
预期：服务正常启动在 http://localhost:3000

- [ ] **步骤 3：Commit**

```bash
git add server/app.ts
git commit -m "feat: make backend PORT configurable via env"
```

---

### 任务 2：修改前端 API 配置

**文件：**
- 修改：`src/config/index.ts`

- [ ] **步骤 1：修改 H5 端 API_BASE**

```typescript
// src/config/index.ts
/**
 * 平台配置：统一管理各端 API 地址
 *
 * - H5 端：开发环境 localhost:3000，生产环境通过 Nginx 反向代理（空字符串）
 * - 小程序/真机：必须填局域网 IP 或生产域名（小程序不允许 localhost）
 * - App 端：同上
 *
 * ⚠️ 部署前务必修改 #ifndef H5 中的地址！
 */

// #ifdef H5
export const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''
// #endif

// #ifndef H5
// 小程序/App 端：改为你的服务器 IP 或域名
export const API_BASE = 'http://10.107.246.104:3000'
// #endif
```

- [ ] **步骤 2：验证本地开发不受影响**

运行：`pnpm dev:h5`
预期：浏览器打开 http://localhost:5173，API 请求正常（指向 localhost:3000）

- [ ] **步骤 3：Commit**

```bash
git add src/config/index.ts
git commit -m "feat: use relative API path in H5 production mode"
```

---

### 任务 3：创建 Nginx 配置

**文件：**
- 创建：`nginx/default.conf`

- [ ] **步骤 1：创建 nginx 目录和配置文件**

```bash
mkdir -p nginx
```

- [ ] **步骤 2：编写 nginx/default.conf**

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

- [ ] **步骤 3：Commit**

```bash
git add nginx/default.conf
git commit -m "feat: add nginx config for SPA routing and API proxy"
```

---

### 任务 4：创建前端 Dockerfile

**文件：**
- 创建：`Dockerfile`

- [ ] **步骤 1：创建前端 Dockerfile**

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

- [ ] **步骤 2：Commit**

```bash
git add Dockerfile
git commit -m "feat: add frontend Dockerfile with multi-stage build"
```

---

### 任务 5：创建后端 Dockerfile

**文件：**
- 创建：`server/Dockerfile`

- [ ] **步骤 1：创建后端 Dockerfile**

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

- [ ] **步骤 2：Commit**

```bash
git add server/Dockerfile
git commit -m "feat: add backend Dockerfile with multi-stage build"
```

---

### 任务 6：创建 docker-compose.yml

**文件：**
- 创建：`docker-compose.yml`

- [ ] **步骤 1：创建 docker-compose.yml**

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

- [ ] **步骤 2：Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose for nginx, backend, mysql"
```

---

### 任务 7：创建生产环境变量模板

**文件：**
- 创建：`.env.production`

- [ ] **步骤 1：创建 .env.production**

```env
# 生产环境配置（复制为 .env 并修改实际值）
DB_PASSWORD=your_strong_password_here
JWT_SECRET=your_jwt_secret_key_here
```

- [ ] **步骤 2：Commit**

```bash
git add .env.production
git commit -m "feat: add production env template"
```

---

### 任务 8：更新 .gitignore

**文件：**
- 修改：`.gitignore`

- [ ] **步骤 1：添加 Docker 相关忽略规则**

在 `.gitignore` 末尾追加：

```gitignore
# Docker
.env.production.local

# 服务器部署
scripts/deploy.sh
```

- [ ] **步骤 2：Commit**

```bash
git add .gitignore
git commit -m "chore: add Docker and deploy related gitignore rules"
```

---

### 任务 9：创建 GitHub Actions 部署工作流

**文件：**
- 创建：`.github/workflows/deploy.yml`

- [ ] **步骤 1：创建目录结构**

```bash
mkdir -p .github/workflows
```

- [ ] **步骤 2：编写 deploy.yml**

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

- [ ] **步骤 3：Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions deploy workflow"
```

---

### 任务 10：初始化 Git 仓库并推送到 GitHub

- [ ] **步骤 1：初始化 Git 仓库**

```bash
cd d:\专高六\uniapp-shop-vue3-ts-master
git init
git branch -M main
```

- [ ] **步骤 2：添加远程仓库**

```bash
git remote add origin https://github.com/你的用户名/xiaotu-uniapp.git
```

- [ ] **步骤 3：提交所有文件**

```bash
git add .
git commit -m "feat: initial project with Docker deployment setup"
```

- [ ] **步骤 4：推送到 GitHub**

```bash
git push -u origin main
```

---

### 任务 11：服务器初始化部署

**前提：** 服务器已安装 Docker + Docker Compose，SSH 免密已配置

- [ ] **步骤 1：在服务器上克隆仓库**

```bash
# SSH 登录服务器
ssh user@server-ip

# 创建项目目录
sudo mkdir -p /opt/xiaotuxian
sudo chown $USER:$USER /opt/xiaotuxian
cd /opt/xiaotuxian

# 克隆仓库
git clone https://github.com/你的用户名/xiaotu-uniapp.git .
```

- [ ] **步骤 2：创建生产环境变量文件**

```bash
cat > .env << 'EOF'
DB_PASSWORD=your_strong_password_here
JWT_SECRET=your_jwt_secret_key_here
EOF
```

- [ ] **步骤 3：首次启动服务**

```bash
docker compose up -d
```

- [ ] **步骤 4：验证容器状态**

```bash
docker compose ps
```

预期输出：

```
NAME                    STATUS          PORTS
xiaotuxian-nginx-1      Up              0.0.0.0:80->80/tcp
xiaotuxian-backend-1    Up              3000/tcp
xiaotuxian-mysql-1      Up (healthy)    3306/tcp
```

- [ ] **步骤 5：查看日志确认启动成功**

```bash
docker compose logs backend
docker compose logs nginx
```

预期：后端显示"小兔鲜儿后端服务已启动: http://localhost:3000"

- [ ] **步骤 6：测试访问**

在浏览器打开：`http://服务器公网IP`
预期：显示小兔鲜儿 H5 首页

---

### 任务 12：配置 GitHub Secrets

- [ ] **步骤 1：获取服务器公网 IP**

```bash
# 在服务器上执行
curl -s ifconfig.me
```

- [ ] **步骤 2：获取 SSH 私钥内容**

```bash
# 在本地执行
cat ~/.ssh/id_ed25519
# 或
cat ~/.ssh/id_rsa
```

- [ ] **步骤 3：在 GitHub 仓库配置 Secrets**

1. 打开 https://github.com/你的用户名/xiaotu-uniapp/settings/secrets/actions
2. 点击 "New repository secret"
3. 添加以下 Secrets：
   - `SERVER_HOST`：服务器公网 IP
   - `SERVER_USER`：SSH 用户名（如 root 或 ubuntu）
   - `SSH_PRIVATE_KEY`：SSH 私钥完整内容（包含 BEGIN 和 END 行）

---

### 任务 13：验证自动部署

- [ ] **步骤 1：在本地做一次小改动并推送**

```bash
# 修改任意文件的注释
git add .
git commit -m "test: verify auto deploy"
git push origin main
```

- [ ] **步骤 2：在 GitHub Actions 页面查看部署状态**

打开：https://github.com/你的用户名/xiaotu-uniapp/actions
预期：Deploy to Server 工作流运行成功（绿色勾）

- [ ] **步骤 3：在服务器上验证容器已更新**

```bash
# SSH 登录服务器
ssh user@server-ip

cd /opt/xiaotuxian
docker compose ps
docker compose logs --tail=5 backend
```

预期：容器状态为 Up，日志显示最新启动时间

- [ ] **步骤 4：在浏览器验证网站正常**

打开：`http://服务器公网IP`
预期：网站正常加载，功能正常

---

## 部署检查清单

```
□ 任务 1-2：代码修改（后端 PORT、前端 API 地址）
□ 任务 3-9：Docker 配置文件创建
□ 任务 10：Git 初始化并推送到 GitHub
□ 任务 11：服务器初始化部署
□ 任务 12：GitHub Secrets 配置
□ 任务 13：验证自动部署
```

## 运维命令速查

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f backend
docker compose logs -f nginx

# 重启单个服务
docker compose restart backend

# 进入容器调试
docker compose exec backend sh
docker compose exec mysql mysql -u root -p

# 停止所有服务
docker compose down

# 停止并删除数据（危险！）
docker compose down -v
```
