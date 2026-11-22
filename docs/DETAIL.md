# 今天赚了多少钱 / Earnings Clock

输入框上方一条常驻的小面板：根据你在插件设置里预设的**上下班时间**与**每日工资**，实时计算今天到目前为止已经赚到的钱。

A small always-on panel above the composer. It converts your preset **work hours** and **daily wage** into a live "earned so far today" figure.

## 设置 / Settings

打开 **设置 → 今天赚了多少钱**，填写：

| 字段 | 说明 |
| --- | --- |
| 上班时间 | 24 小时制，例如 `09:00` |
| 下班时间 | 需晚于上班时间，例如 `18:00` |
| 每日工资 | 这一整个班次的工资，例如 `800` |
| 货币符号 | 显示在前面的符号，例如 `¥`、`$`、`€` |
| 只在工作日计算 | 打开后周六、周日显示为休息日，不计入工资 |

修改即时生效并自动保存（保存在浏览器本地），无需重启。

Open **Settings → Earnings Clock** and fill in the start time, end time, daily wage, currency symbol and the "weekdays only" switch. Changes apply immediately and are saved locally.

## 显示内容 / What the dock shows

- **今日已赚**：按上班时间到当前时刻占整个班次的比例计算，每秒刷新。
- **进度条与百分比**：今天的工作时长完成度。
- **状态**：`距上班` / `距下班` / `今日已完成` / `已下班 · 加班` / `今天休息`。
- 未配置时显示一条引导，点「去设置」直接打开本页。

## 深浅色与语言 / Theme & language

面板与设置页只使用主题 token（`--dsw-alias-*`），跟随浅色 / 深色主题；界面文案随 DSH 的语言切换（中文 / English）。

The panel and settings page use theme tokens only and follow the light/dark theme; all text follows the active DSH locale (Chinese / English).
