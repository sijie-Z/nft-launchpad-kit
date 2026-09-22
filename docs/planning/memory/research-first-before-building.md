---
name: research-first-before-building
description: User wants GitHub/ecosystem research before implementing new features — check for existing wheels first
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 144eefe9-94f8-409c-965e-b91ce24c09e7
  modified: 2026-08-29T08:13:38.566Z
---

用户明确要求：**实现新功能/新想法前，先到 GitHub（和生态）调研有没有现成的轮子/方案**，不要闭门造车。"有想法的东西我建议先去GitHub看看有没有相应的轮子，我觉得这个想法一定要有，毕竟GitHub是全球级别的！"

**Why:** GitHub 是全球最大的开源生态，大多数问题已经有人解决过；借鉴成熟方案能避免重复造轮子、踩已知的坑，也能让设计跟上业界最佳实践。

**How to apply:** 在实现任何有设计空间的功能前（如 #34 一键创建集合、#40 agent 身份 API），先用 WebSearch/WebFetch 调研：同类开源项目、业界领先者的实现方式（thirdweb/Zora/Manifold 等）、可复用的库/组件。在 PR 里注明"借鉴了什么、为什么不用某方案"。参见 [[nft-launchpad-ai-native-direction]]。
