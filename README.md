# Clash Get

自用的 Clash 订阅托管面板。把 Clash 配置文件粘贴或上传进来，每个订阅生成一个独立的链接，在 Clash 客户端里用这个链接导入即可。

技术栈：Next.js 16（App Router，全栈）+ React 19 + HeroUI v3 + Tailwind CSS v4，数据存本地文件，不需要数据库。

## 功能

- **首次访问即注册**：系统里没有账号时，第一个打开页面的人设置用户名和密码；创建后注册入口关闭，只能登录
- **订阅管理**：新建 / 编辑 / 删除，支持粘贴、点击上传、拖拽 `.yaml` 文件
- **保存时校验**：YAML 语法错误会指出行列；自动统计节点、策略组、规则数量
- **独立订阅链接**：`https://你的域名/sub/<随机token>`，无需登录即可拉取；泄露了可以一键重置
- **快速导入**：复制链接、`clash://install-config` 一键导入、二维码（手机扫码）
- **拉取记录**：显示最近一次被哪个客户端拉取、累计次数
- 修改密码（会让其它设备上的登录失效）、深色模式、手机适配

## 部署

需要 Node.js 20.9 及以上（推荐 24 LTS）。

```bash
npm ci
npm run build
npm start          # 监听 56665 端口
```

`npm start` 默认监听所有网卡。如果反代和应用在同一台机器上，建议只监听本机，把 `package.json` 里的 start 改成：

```json
"start": "next start -p 56665 -H 127.0.0.1"
```

### 进程守护（任选其一）

pm2：

```bash
pm2 start npm --name clash-get -- start
pm2 save
```

systemd（`/etc/systemd/system/clash-get.service`）：

```ini
[Unit]
Description=Clash Get
After=network.target

[Service]
WorkingDirectory=/opt/clash-get
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 反代示例（nginx）

```nginx
location / {
    proxy_pass http://127.0.0.1:56665;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50m;
}
```

- `X-Forwarded-Proto` 用来判断是否给登录 Cookie 加 `Secure`
- `X-Real-IP` 用来做登录失败限流（同一 IP 15 分钟内最多失败 10 次）
- `client_max_body_size` 要大于你最大的配置文件（应用本身上限 20 MB）
- 需要部署在域名根路径下，不支持子路径（如 `/clash/`）

## 数据

所有数据都在 `data/` 目录（可以用环境变量 `DATA_DIR` 改位置），备份这个目录就行：

```
data/
├── db.json          # 账号（scrypt 哈希）、会话密钥、订阅元数据
└── subs/<id>.yaml   # 订阅原文，原样保存
```

## 注意事项

- **部署后请立刻打开页面注册**，在注册之前，任何能访问到这个地址的人都可以抢先注册。
- 订阅链接本身就是凭证，不要公开。泄露了就在面板里点「重置链接」，旧链接会立即失效。
- **忘记密码**：停掉服务，把 `data/db.json` 里的 `"user"` 改成 `null`，重启后重新注册即可，订阅不受影响。

## 订阅接口

`GET /sub/<token>` 返回原始 YAML，响应头：

| 响应头 | 值 |
| --- | --- |
| `Content-Type` | `text/yaml; charset=utf-8` |
| `Content-Disposition` | `attachment; filename*=UTF-8''<订阅名称>.yaml`（Clash Verge、Mihomo Party 等用它作为配置名） |
| `profile-update-interval` | `24`（建议客户端每 24 小时更新一次） |
| `Cache-Control` | `no-store` |

## 开发

```bash
npm run dev        # 开发模式，同样是 56665 端口
npm run typecheck
```

## 许可

[MIT](LICENSE)
