# 部署到 GitHub Pages

这个文件夹里的所有文件就是要部署的网站（纯前端，数据存手机本地，无需服务器）。

## 前提：找回 GitHub 账号

如果你记得注册时绑定的邮箱，但登录不上：
1. 打开 https://github.com/password_reset
2. 输入注册邮箱 → 点 Send password reset email
3. 去邮箱收信，点链接设置新密码
4. 用新密码登录 https://github.com

## 部署步骤（约 5 分钟）

### 第一步：创建仓库
1. 登录 GitHub 后，点右上角 **+** → **New repository**
2. Repository name 填：`dance-workbench`
3. 选 **Public**（免费版 GitHub Pages 只支持公开仓库）
4. 其他保持默认，点 **Create repository**

### 第二步：上传文件
1. 进入刚创建的仓库页面，点 **uploading an existing file**
2. 把这个文件夹里的**所有内容**拖进上传区：
   - index.html、app.js、db.js、seed.js、style.css、sw.js、manifest.json、kitty-bg.jpg、icons/ 文件夹、_headers
   - 注意：**不要**把文件夹本身拖进去，要拖里面的文件（拖动文件夹可保留 icons/ 子目录结构）
3. 拖完后点 **Commit changes**

### 第三步：开启 Pages
1. 仓库页面点 **Settings** → 左侧菜单点 **Pages**
2. Source（构建来源）选 **Deploy from a branch**
3. Branch 选 `main`，文件夹选 `/ (root)` → 点 **Save**
4. 等 1-2 分钟，页面顶部会显示绿色提示，你的链接是：
   `https://<你的用户名>.github.io/dance-workbench/`

## 手机使用（变成桌面 app）

1. 手机浏览器打开上面的链接
2. 浏览器菜单 → 「**添加到主屏幕**」（iPhone Safari）/「添加到主屏幕」或「安装应用」（安卓）
3. 手机桌面出现「zii记录」图标，之后像 app 一样点开就能用，**离线也能打开**

## 数据说明

- 所有数据存在**当前手机的浏览器本地**，每次打开都在
- 首次打开会自动导入你电脑上已有的历史文字记录（舞蹈/心情/朋友圈/日记/课表）
- 手机和电脑各自独立存数据
- 注意：GitHub Pages 在国内访问可能不稳定，打不开时可考虑换 Cloudflare Pages（更稳定）
