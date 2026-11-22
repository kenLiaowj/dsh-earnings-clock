# 今天赚了多少钱 · Earnings Clock

A small always-on panel **above the composer** in DeepSeek Harness. It turns your preset work hours and daily wage into a live "earned so far today" figure — no more mental math at 15:42 on a Tuesday.

输入框上方一条常驻小面板：根据你预设的**上下班时间**与**每日工资**，实时算出今天到目前为止已经赚了多少钱。

## Features / 功能

- **Live earnings** — recomputed every second from the share of the shift already worked. / **实时金额**：按班次已过比例每秒刷新。
- **Progress bar** — how much of today's shift (and wage) is done, with a percentage. / **进度条**：今日班次与工资完成度，带百分比。
- **Phase-aware** — `Not started` / `Remaining` / `Done for today` / `Off duty · overtime` / `Rest day`, with overtime tracked after the end time. / **状态感知**：距上班 / 距下班 / 今日已完成 / 已下班 · 加班（自动统计加班时长）/ 今天休息。
- **Theme-aware** — built only from `--dsw-alias-*` tokens, so it follows light and dark themes with no hard-coded colors. / **跟随主题**：只用主题 token，深浅色自动适配，零字面颜色。
- **Bilingual** — Chinese and English through the DSH locale service. / **中英双语**：走 DSH locale 服务。
- **Settings page** — its own page under Settings, saved automatically. / **自带设置页**：设置里独立一页，修改即时保存。

## Install / 安装

```sh
dsh plugin --profile desktop add dsh-earnings-clock
```

Or in the SDK/Web GUI: **Settings → Plugins** and install `dsh-earnings-clock`. After installing, reload the page — the panel appears directly above the input box.

也可以在 Web GUI 的 **设置 → 插件** 里安装；安装后刷新页面，面板会出现在输入框正上方。

## Settings / 设置

Open **Settings → Earnings Clock** and fill in:

| Field | Meaning |
| --- | --- |
| Start time | 24-hour `HH:MM`, e.g. `09:00` |
| End time | Must be later than the start, e.g. `18:00` |
| Daily wage | Pay for the whole shift, e.g. `800` |
| Currency | Prefix symbol, e.g. `¥`, `$`, `€` |
| Weekdays only | When on, Saturdays and Sundays show as rest days |

设置 → 今天赚了多少钱：上班时间、下班时间（需晚于上班时间）、每日工资、货币符号、只在工作日计算。修改即时生效并自动保存。

## Storage / 数据保存

Settings live in the browser's `localStorage` under `dsh-earnings-clock:v1`. Nothing leaves your machine — there is no host config, no network call, no account.

设置保存在浏览器 `localStorage`（键 `dsh-earnings-clock:v1`），不上传、不发网络请求。换浏览器或清站点数据会重置，重新填一次即可。

## License / 许可

[MIT](LICENSE)
