# 别人家的造物：Linger · 造物手记 VOL.23

线上：<https://starrysea1412.github.io/vol23-linger/>

拆一台别人的机器：`simplexai-labs/linger`（PolyStrata 三层专家放置 + Model Autopilot 五层筛子 + Wiki/Change Log + Another Me / Dreaming + Guardrail 沙箱）。单文件 · 零运行时依赖 · 三枚确定性小样。产品数字均标注为该项目自述、未复现；插图与三枚小样为本文自编的机制示意。

单文件 `index.html`，无构建步骤。字体 LXGW 文楷（OFL，`assets/`）。

`node verify.mjs`（playwright-core + 本机 Chrome）跑 27 条行为断言：三枚小样的状态迁移与复位、390px 溢出扫描、1280px 无横向滚动、零 JS 错误。需要本机能解析到 `playwright-core`。