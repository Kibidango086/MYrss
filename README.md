# MYrss

> [!WARNING]
> 此项目基本不可用

一个用 [GPUIX](https://github.com/remorses/gpuix)（原生 GPU 渲染，无 WebView/DOM）构建的桌面 RSS 阅读器。

内嵌（vendored）**material-you-gpuix** 0.2.0 组件库（见 `src/material/`、`src/theme.ts`、`src/motion.tsx`、`src/rich-text.tsx`），运行在 **GPUIX 0.10.x** 上：MD3 色调/表面层级/形状/字阶/状态层，加上 0.10.0 的退场动画与 0.8.0 的无障碍（`role` / `aria-*`）。

## 功能

- **订阅**：RSS 2.0 / Atom / JSON Feed，可直接粘贴网站首页自动探测；订阅列表按来源显示未读数，读取失败的来源会显示失败原因而不是装作正常。
- **自动更新**：启动时自动拉取全部订阅（可在设置里关掉），以及可配置的后台刷新间隔（关闭 / 15 / 30 / 60 分钟）。后台刷新失败不会弹提示，手动刷新会报告结果。
- **阅读**：三栏布局（订阅抽屉 / 文章列表 / 阅读器），正文里的图片**按原文位置内联显示**，不会被堆到文末；首图（enclosure）作为横幅显示在正文之前。
- **筛选**：全文/星标/单个来源切换，标题+摘要搜索，「只看未读」筛选。
- **已读/星标**：打开文章自动标已读，可标回未读，可一键把当前列表标为已读，可星标收藏；删除订阅会一并清理该来源的已读与星标记录。
- **外观**：浅色/深色，8 个预设强调色加自定义色值（非法输入会即时提示并禁用「应用」）。
- **快捷键**：`Esc` 关闭当前对话框。

## 运行

```bash
bun install
bun run start       # 开发运行（--hot 热重载）
bun run typecheck   # 类型检查（含 test/）
bun run test        # 用真实 GPUIX reconciler 驱动 App
```

`bun run test` 不需要 GPU 或窗口：它在桩 host 上跑真实 reconciler，把真实的点击事件派发回 App 注册的处理器，然后断言 —— 挂载、启动自动更新、正文图片的内联顺序、列表→阅读器交互、星标切换、未读筛选、对话框的 scrim/role/Esc/退场动画、设置迁移，以及 MD3 颜色令牌。

每一步都是**可证伪**的：把对应实现改回去，测试就会失败（图片顺序、启动刷新、Esc 接线、星标闭包、标为未读条件、scrim 不透明度都做过变异验证）。

## 字体

Flutter 把 Roboto 编进每个 app；GPUIX 没有加载字体文件的 API，只能按名字查系统字体。
本项目的 `MaterialProvider` 会自动挑选本机已装的、最接近 Roboto 的字族（Roboto → Inter →
Noto Sans → …），所以任何机器上都不会退化成无名默认字体；装了 Roboto 就是与 Flutter 一致。

要让**分发后**在任何系统上都是 Flutter 的样子，需要随包携带字体并在首次运行时安装：

```bash
../material-you-gpuix/scripts/install-roboto.sh --into ./assets/fonts
```

然后在 `src/main.tsx` 中 `render()` 之前调用 `installFontFiles(...)`（见组件库 README）。
安装目录是各平台的用户级字体目录，不需要管理员权限。

## 已知限制

- **对话框不锁定焦点。** 打开后焦点不会自动移入，关闭后也不会还原到触发控件。
- **Slider / RangeSlider 是静态的**（组件库现状），滑块不能拖动。
- 文章正文由 GPUIX 原生 `<markdown>` 绘制，其中的链接点击会交给系统浏览器；正文里的图片由 React 侧插入，因此与文字块之间是分段渲染。
- 真实窗口下的像素级观感未经自动化验证（本机没有 GPU 测试渲染器）。
