# 归档：JoyData 参考材料

本目录下均为**另一个项目（JoyData / 内部代号 `big-data-platform`）**的文档，不是 AllData 的资产。保留在此仅供设计思路参考。

| 文件 | 内容 | 来源项目技术栈 |
|---|---|---|
| `docs-combined.txt` | JoyData 前端完整设计文档 | React 16 / Redux |
| `md_files/frontend_design_report.md` | 前端架构升级方案（React 16→18、Redux→Zustand、react-router 5→6） | React 16 / Redux |
| `md_files/backend_go_design_report.md` | 后端架构设计（含 **MySQL** 表设计） | Go + MySQL |

## 为什么要单独标注

这些文档的技术前提与 AllData **不一致**，直接当成本项目文档使用会造成误导：

- **数据库**：JoyData 用 MySQL，AllData 用 PostgreSQL（Prisma schema 35 个模型）
- **前端**：JoyData 起点是 React 16 + Redux，AllData 已是 React 18 + Zustand + TanStack Query
- **后端**：`backend_go_design_report.md` 描述的 Go 全量后端**并非**本项目现状——AllData 的权威业务后端是 TypeScript（Fastify + Prisma），`apps/api-go` 定位见架构设计报告的决策 T-1

## 现行文档在哪

本项目当前有效的文档：

- `README.md` — 项目总览与快速开始
- `docs/product-design.md` — 产品设计
- `docs/reports/analysis-report-2026-09.md` — 现状分析
- `docs/reports/architecture-design-2026-09.md` — 架构设计与 ADR
- `docs/reports/roadmap-2026-2027.md` — 长期迭代计划（唯一现行计划）
