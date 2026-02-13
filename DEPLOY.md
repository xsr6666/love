# 部署到线上，让别人也能访问

本项目是纯静态网站（HTML + CSS + JS）。

- **未配置腾讯云**：数据存在浏览器 localStorage，每人访问有各自独立的数据
- **已配置腾讯云**：数据存云端，多人共享、换设备也能用（详见 `TENCENT_SETUP.md`）

## 方式一：Vercel（推荐，免费）

1. 注册 [Vercel](https://vercel.com)（可用 GitHub 登录）
2. 将项目推送到 GitHub
3. 在 Vercel 点击「Import Project」导入你的仓库
4. 直接部署，无需额外配置
5. 部署完成后会得到一个网址，如 `https://xxx.vercel.app`

## 方式二：Netlify（免费）

1. 注册 [Netlify](https://netlify.com)
2. 拖拽整个 `love` 文件夹到 Netlify 的「Deploy」区域
3. 或连接 GitHub 仓库自动部署
4. 获得网址如 `https://xxx.netlify.app`

## 方式三：GitHub Pages（免费）

1. 在 GitHub 新建仓库，上传项目
2. 仓库设置 → Pages → Source 选「Deploy from a branch」
3. 分支选 `main`，目录选 `/ (root)`
4. 保存后访问 `https://你的用户名.github.io/仓库名/`

## 方式四：Cloudflare Pages（免费）

1. 注册 [Cloudflare](https://pages.cloudflare.com)
2. 连接 GitHub 或直接上传项目
3. 构建命令留空，输出目录填 `/`
4. 部署后获得 `https://xxx.pages.dev`

---

**注意**：数据存在访问者的浏览器里，换设备或清缓存会丢失。如需多人共享数据，需要后续接入后端数据库。
