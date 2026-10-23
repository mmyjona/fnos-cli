# 下载中心命令与端点

fnOS 下载中心是 aria2 与 qBittorrent 的统一前端。它把任务记录在 fnOS 自己的数据库里，
通过 WebSocket 端点 `appcgi.downloadcenter.*` 暴露增删改查。

`fnos 0.5.0` 只封装了三个只读方法，本 CLI 通过 `requestPayloadWithResponse` 直接调用其余端点。
下面的端点名与载荷取自 fnOS Web UI 的真实 WebSocket 流量，并在真机上验证过。

## 为什么不用 qBittorrent / aria2 客户端

两个引擎都只监听本机 unix socket：

| 引擎 | 监听 | 说明 |
| --- | --- | --- |
| aria2 | `<fnos-user-home>/aria2.sock` | `--enable-rpc --rpc-sock-path`，secret 不出现在本机可读位置 |
| qBittorrent | `<fnos-user-home>/qbt.sock` | `--webui-sock-path`，WebUI 密码在进程 cmdline 明文可见 |

远端节点连不到这两个 socket，而下载中心的 WebSocket 走 `ws://`/`wss://`，任何已登录节点都能用。
另外直接写引擎会绕过下载中心的任务记录，队列与网页端列表可能不一致。

## 命令

| 命令 | 端点 | 载荷 |
| --- | --- | --- |
| `download addUris` | `task.addUris` | `{"uris": [...], "select_files": false}` |
| `download pause` | `task.pause` | `{"ids": [...]}` |
| `download resume` | `task.resume` | `{"ids": [...]}` |
| `download remove` | `task.delete` | `{"ids": [...], "delete_files": false}` |
| `download taskInfo` | `task.getInfo` | `{"id": 318}` |
| `download taskFiles` | `task.getFiles` | `{"id": 318}` |

任务 ID 来自 `download queryTasks`。`addUris` 不传保存目录时使用下载中心的默认目录
（`download getDefaultSaveDirectory`）。

实测行为：

- `addUris` 返回 `{"rsp": {"ids": [320], "errs": [0]}}`；http 直链任务 `type` 为 `aria2`，
  BT/磁力任务为 `qbt`。
- `task.delete` 加 `delete_files: true` 会同时删除已下载的文件。
- 状态字符串沿用 qBittorrent 词汇：`stalledDL`、`stalledUP`、`pausedUP`、`complete` 等。

## 端点全集（供后续扩展）

从 `/usr/trim/www/apps/download/assets/*.js` 提取，尚未逐个验证：

```
task.addUris          task.addPaths        task.addUploadFile   task.query
task.getInfo          task.getFiles        task.getPeers        task.getTrackers
task.addPeers         task.addTrackers     task.editTracker     task.removeTrackers
task.exportTorrentFile task.search         task.pin             task.unpin
task.resume           task.pause           task.delete          task.retry
task.setFilePriority  task.setForceStart   task.addfnShareLink  task.getfnShareLinkStatus
config.getDefaultSaveDir  config.setDefaultSaveDir  config.getTransferCfg  config.setTransferCfg
config.getNetworkCfg  config.setNetworkCfg  config.getAltCfg    config.setAltCfg
config.getListColumns config.setListColumns
scanDir.query         scanDir.insert       scanDir.delete       tracker.query
tracker.insert        tracker.delete      admin.getUsers       util.getDirFreeSpace
util.isTcpPortInUse   transfer.banPeers    getUserStats         getDownloadDir
getOpt                setOpt               torrentSet           torrentGet
torrentAdd            torrentRemove        pause                list
remove                redownload           sessionGet           sessionSet
addUris               addfnShareLink
```

## 抓包复现方法

在浏览器里打开下载页，给 `WebSocket.prototype.send` 打补丁即可看到发出的帧。
注意三点：下载页运行在 iframe 中（每个 realm 的 `WebSocket` 都要单独打补丁）；
帧格式是 `<base64 签名>=` 加 JSON（签名由 SDK 内部处理，调用方不用管）；
后台标签页会被浏览器节流，抓包前先把标签页切到前台。
