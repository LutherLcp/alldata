# 历史遗留测试（已停用）

本目录下的测试编写于早期迭代（V2 前后），**针对的是已被废弃的 API 契约**，无法通过，因此在 `vitest.config.ts` 中被显式排除，不参与 CI。

## 为什么不通过

| 遗留测试的假设 | 当前实现 |
|---|---|
| 路由前缀 `/api/v1/*` | `/api/*`（见 `src/routes/index.ts`） |
| `buildApp()` 工厂从 `@/main` 导出 | `src/main.ts` 是启动脚本，直接 `app.listen()`，未导出工厂 |
| 响应体 `{ success, error }` / `body.data.accessToken` | 统一响应 `{ code, message, data }`；健康检查为 `{ success, data }` |
| `/api/v1/events` 事件接口 | 事件能力位于 `/api/tracking/*` |
| `tests/setup.ts` 全局连接 Prisma | 使所有测试强制依赖数据库，未启动 PG 时直接 P1001 |

## 处置

- 保留在此仅作意图参考（记录的测试场景仍有价值），**不要**直接启用。
- `tests/health.test.ts` 是当前唯一生效的 api 测试，针对真实路由且不需要数据库。

## R1 待办

重写 api 集成测试以匹配现行契约，建议顺序：

1. 从 `src/main.ts` 抽出 `buildApp()` 工厂（保留直接运行时的启动逻辑），使测试可注入实例；
2. 将 `tests/setup.ts` 的数据库连接改为**按需**（仅需要 DB 的用例外层 beforeEach 中连接）；
3. 按模块补冒烟用例：auth / project / dashboard / analysis / tag / warning；
4. 恢复后再删除本目录。
