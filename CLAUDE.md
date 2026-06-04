# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

小兔鲜儿 (XiaoTuXian) — 鲜食电商平台，基于 uni-app (Vue3 + TypeScript) 构建，主要面向微信小程序，通过条件编译兼容 H5 和 App 端。

## Tech Stack

- **Framework**: uni-app (Vue 3 + TypeScript) via `@dcloudio/vite-plugin-uni`
- **State**: Pinia + pinia-plugin-persistedstate (持久化用户信息/购物车)
- **UI**: uni-ui (easycom 自动引入，`uni-*` 组件直接使用)
- **Styles**: SCSS, `uni.scss` 全局变量

## Commands

```bash
# 安装依赖
pnpm i --registry=https://registry.npmmirror.com

# H5 开发 (浏览器调试，localhost:5173)
pnpm dev:h5

# 微信小程序开发 (产物在 dist/dev/mp-weixin，用微信开发者工具导入)
pnpm dev:mp-weixin

# App 端开发 (需 HBuilderX)
pnpm dev:app

# 构建
pnpm build:h5
pnpm build:mp-weixin

# TypeScript 类型检查
pnpm tsc

# Lint
pnpm lint
```

## Architecture

### API Layer

- Base URL: `https://pcapi-xiaotuxian-front-devtest.itheima.net` (定义在 `src/utils/http.ts`)
- `http<T>()` 封装了 `uni.request`，支持泛型，自动拼接 baseURL、添加 token、处理 401 跳转登录
- 所有 API 函数在 `src/services/` 下按模块拆分（home.ts, goods.ts, cart.ts, login.ts, order.ts 等）

### State Management

- `src/stores/index.ts` — 创建 Pinia 实例
- `src/stores/modules/member.ts` — 用户信息/token 持久化
- `src/stores/modules/address.ts` — 收货地址

### Pages & Routing

- 主包页面（`src/pages/`）：首页、分类、购物车、我的、登录、商品详情、热门推荐
- 分包 `pagesMember`：用户设置、个人信息、地址管理
- 分包 `pagesOrder`：订单创建、详情、列表、支付结果
- TabBar: 首页 / 分类 / 购物车 / 我的
- 路由配置在 `src/pages.json`

### Component Convention

- `src/components/` 下全局组件以 `Xtx` 前缀命名，pages.json easycom 规则自动引入
- `uni-*` 组件来自 @dcloudio/uni-ui，同样 easycom 自动引入
- 不需要手动 import 组件，直接在模板中使用 `<Xtx* />` 或 `<uni-* />`

### Type Definitions

- `src/types/` 存放接口响应和业务实体的类型声明
- `src/types/component.d.ts` — 组件 Props 类型

## Notes

- 项目使用 husky + lint-staged，但需要先 `git init` 才能生效
- pnpm 的 `onlyBuiltDependencies` 已在 package.json 中配置了 esbuild 和 core-js
