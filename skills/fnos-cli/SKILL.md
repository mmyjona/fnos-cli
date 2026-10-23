---
name: fnos-cli
description: >
  Use the `fnos` command-line client to control a 飞牛 fnOS NAS from any node:
  system, storage, network and Docker queries plus download-center task
  management. Trigger: "fnos", "飞牛", "NAS", "下载任务", "add magnet",
  "download center", "fnOS" — whenever the task targets the NAS rather than
  the local machine.
---

# fnos-cli

`fnos` 是 fnOS 的命令行客户端：通过 fnOS 自己的 WebSocket/WSS 接口读写，不需要 SSH，
也不需要直连 NAS 上的 qBittorrent / aria2。

**用法不写在这里**——直接查 CLI 自带的帮助，那里永远是最新的：

```bash
fnos --help                    # 全部领域
fnos download --help           # 某个领域的命令
fnos download addUris --help   # 单条命令的参数
```

## 安装

本 fork（`mmyjona/fnos-cli`）比上游多 6 条下载中心写命令，用本地 tarball 安装：

```bash
npm pack                                  # 在仓库目录里打包
npm install -g ./fnos-cli-<version>.tgz   # 全局模块目录可写时
sudo -n npm install -g ./fnos-cli-<version>.tgz   # 前缀是 /usr 或 /usr/local 时
```

Windows 必须在 Git Bash 里执行，路径写成 `/c/Users/<user>/...`。

`npm update -g fnos-cli` 会从 npm registry 装回上游版本，把写命令覆盖掉；
需要时重新执行上面的 tarball 安装。

## 安装位置

```bash
command -v fnos        # 二进制
npm root -g            # 全局模块目录
npm prefix -g          # 全局前缀（bin 在其下）
```

| 内容 | 位置 |
| --- | --- |
| 凭证（0600） | `~/.fnos/settings.json`，按 server 名分节 |
| zsh 补全（可选） | `fnos completion install zsh` |

## 确认装的是 fork

```bash
fnos download --help | grep addUris   # 有输出 = fork；没有 = 上游版
```

## 登录

endpoint、用户名、密码都由使用者自己提供，不要写死在脚本或文档里：

```bash
fnos login --server <name> -e <ws-or-wss-endpoint> -u <user> -p '<password>'
fnos auth.status --server <name>        # 只看本地记录，不联系服务器
fnos sysinfo getHostName --server <name>  # 真实请求，验证连通与权限
```

已有 `settings.json` 的节点无需重新登录；token 失效时 CLI 会回退到保存的密码重新登录。
