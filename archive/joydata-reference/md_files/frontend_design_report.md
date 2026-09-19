# 大数据分析平台 — 前端架构设计报告（含升级方案）

> 文档版本：v2.0 · 生成时间：2026-07-24  
> 技术栈：React 16 → React 18 · TypeScript 4 → TypeScript 5 · Vite 5 · Ant Design 5 · Zustand 4 · react-router 5 → 6 · TanStack Query

---

## 第一部分：现状分析

### 1.1 项目定位

本项目是一个**多维度数据分析平台**前端应用，面向数据分析师、运营、财务等多类业务角色，提供：

- 行为分析（事件/留存/漏斗/分布/间隔分析）
- 数据看板（Dashboard 可视化搭建与共享）
- 用户分群与标签管理
- 元数据管理（事件追踪、属性管理）
- 报表与指标管理
- 财务对账与收入管理
- 投放/营销渠道分析（kocrm 模块）
- 早期预警与任务管理

### 1.2 当前技术栈

| 类别 | 当前技术 | 版本 | 风险等级 |
|------|---------|------|---------|
| 框架 | React | **16.9** | 🔴 高危 |
| 语言 | TypeScript | **4.x** | 🟡 中 |
| 构建工具 | Vite + SWC | 5.x | 🟢 正常 |
| UI 组件库 | Ant Design | 5.24 | 🟢 正常 |
| 状态管理 | Redux + Zustand 双轨 | — | 🔴 高危 |
| 路由 | react-router | **5.x** | 🔴 高危 |
| 数据请求 | Axios（裸封装） | 1.7 | 🟡 中 |
| 异步 Hooks | ahooks **2.x + 3.x 双版本** | — | 🔴 高危 |
| 样式 | Tailwind CSS + SCSS 双轨 | 3.4 | 🟡 中 |
| 图表 | G2 / ECharts / @antv/s2 多版本 | — | 🟡 中 |
| 国际化 | react-i18next | 11.x | 🟡 中 |
| 错误监控 | Sentry | 7.x | 🟢 正常 |

### 1.3 项目目录结构（现状）

```
src/
├── App.tsx / index.tsx
├── routes/          # react-router-config 集中式路由
├── pages/           # 65+ 业务页面模块
├── components/      # 68+ 公共组件
├── stores/          # Zustand（新）
├── store/           # Redux（旧）←  待清理
├── services-new/    # Axios 封装 API（新，主推）
├── services/        # 旧 API 层 ← 待清理
├── hooks/           # 30 个自定义 Hooks
├── utils/           # 工具函数
├── lang/            # 8 种语言 i18n
├── typings/         # 全局类型
└── styles/          # 全局样式
```

### 1.4 已识别技术债

| 编号 | 问题 | 影响范围 | 优先级 |
|------|------|---------|-------|
| TD-01 | React 16.9，无并发特性、无自动批处理 | 全局 | P0 |
| TD-02 | react-router 5.x，API 与社区方向已分叉 | 全局路由 | P0 |
| TD-03 | Redux + Zustand 双轨并存（21 个 Redux slice） | 所有分析页面 | P0 |
| TD-04 | ahooks 2.x + 3.x 两个版本同时安装 | 打包体积 +200KB | P1 |
| TD-05 | `new Request()` 每次调用创建新 Axios 实例 | 请求性能 | P1 |
| TD-06 | API 枚举 400+ 条集中在单文件（api.ts 20KB） | 可维护性 | P1 |
| TD-07 | TypeScript 4.x，缺少 satisfies/const type params | 类型安全 | P2 |
| TD-08 | `services/` 旧目录未完全清理 | 代码混乱 | P2 |
| TD-09 | `test.html`（6MB bundle 分析）被提交到仓库 | 仓库体积 | P2 |
| TD-10 | 无服务端状态管理（每次组件挂载重复发请求） | 性能/体验 | P1 |

---

## 第二部分：升级方案

### 2.1 升级总览对比

| 维度 | 升级前 | 升级后 | 迁移成本 |
|------|-------|-------|---------|
| **React** | 16.9 | **18.3** | 高（入口改写 + 严格模式修复） |
| **TypeScript** | 4.x | **5.5** | 低（向前兼容） |
| **路由** | react-router 5 | **react-router 6** | 高（API 全面变更） |
| **状态管理** | Redux + Zustand | **Zustand 全面接管** | 中（逐模块替换） |
| **服务端状态** | 无 | **TanStack Query v5** | 中（与 Zustand 分工） |
| **ahooks** | 2.x + 3.x 双版本 | **只保留 3.x** | 低 |
| **HTTP 层** | Axios 单例问题 | **Axios 单例 + 拦截器重构** | 低 |
| **API 组织** | 单文件 400+ 枚举 | **按领域拆分** | 低 |
| **i18n** | react-i18next 11 | **react-i18next 14** | 低 |
| **Sentry** | 7.x | **8.x** | 低 |

### 2.2 升级阶段规划

```
Phase 1（2周）：低风险依赖升级，不改业务逻辑
  ├── TypeScript 4 → 5.5
  ├── ahooks 精简为仅 3.x
  ├── react-i18next 11 → 14
  ├── Sentry 7 → 8
  └── Axios 单例重构 + API 文件拆分

Phase 2（4周）：状态管理统一
  ├── 逐模块将 Redux 迁移到 Zustand
  └── 引入 TanStack Query 接管服务端状态

Phase 3（4周）：React 18 升级
  ├── ReactDOM.render → createRoot
  ├── 严格模式双调用修复
  ├── 并发特性应用（Transition / Suspense）
  └── 自动批处理验证

Phase 4（4周）：react-router 5 → 6
  ├── 路由表 API 迁移
  ├── 权限路由重构
  └── 组件内 Hook API 升级
```

---

## 三、Phase 1：低风险依赖升级

### 3.1 TypeScript 4 → 5.5

**安装命令：**
```bash
pnpm add -D typescript@^5.5.0
```

**新增收益：**

```typescript
// TS 5.0：const type parameters —— 保持字面量类型
function createRoute<const T extends string>(path: T) {
  return { path } as const;
}
const r = createRoute('/dashboard'); // type: { path: '/dashboard' }

// TS 5.0：satisfies 操作符 —— 精确校验对象字面量类型
const theme = {
  primaryColor: '#247fff',
  fontSize: 14,
} satisfies Record<string, string | number>; // 保留各字段的精确类型

// TS 5.5：--isolatedDeclarations —— 加速类型检查
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",        // 从 ES2020 升级
    "lib": ["ES2023", "DOM"],
    "moduleResolution": "bundler",  // Vite 最优配置
    "isolatedDeclarations": true,   // 新增：加速 IDE 类型提示
    "exactOptionalPropertyTypes": true, // 新增：更严格的可选属性
    "noUncheckedIndexedAccess": true    // 新增：数组下标安全访问
  }
}
```

**对现有代码的影响修复清单：**
```typescript
// noUncheckedIndexedAccess：数组访问需加 ?. 保护
// Before
const first = list[0].name;
// After
const first = list[0]?.name;

// exactOptionalPropertyTypes：可选属性赋值更严格
// Before（会报错）
interface Opts { timeout?: number }
const opts: Opts = { timeout: undefined };
// After
const opts: Opts = {};  // 或删除 undefined 赋值
```

### 3.2 精简 ahooks 为单一版本

**当前问题：** `package.json` 中同时存在 `ahooks@^2.10.14` 和 `ahooks3: npm:ahooks@^3.8.0`，打包重复 ~200KB。

```bash
# 移除旧版本
pnpm remove ahooks

# 保留 ahooks 3.x（以 ahooks3 别名引用），并将别名统一回正常命名
pnpm add ahooks@^3.8.0
```

**代码迁移：**
```typescript
// Before：部分文件用 ahooks（v2），部分用 ahooks3（v3）
import { useRequest } from 'ahooks';   // v2
import { useRequest } from 'ahooks3';  // v3

// After：统一使用 ahooks v3
import { useRequest, useInfiniteScroll, usePagination } from 'ahooks';

// ahooks 2.x → 3.x 主要 API 变化：
// useRequest: options.formatResult → options.select（修改回调名）
// useRequest: options.onSuccess 参数顺序不变
// useBoolean → useToggle（更通用）
```

### 3.3 react-i18next 11 → 14

```bash
pnpm add react-i18next@^14 i18next@^23
```

**新增收益：**
```typescript
// v14：TypeScript 类型安全的 t 函数（需配置 i18n 类型声明）
// src/typings/i18next.d.ts
import zhCN from '@/lang/zh-cn.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: typeof zhCN;  // t('xxx') 会有 key 自动补全
    };
  }
}

// 使用时获得完整 key 提示
const { t } = useTranslation();
t('eventAnalysis');  // TS 检查 key 是否存在，拼错立即报错
```

### 3.4 Sentry 7 → 8

```bash
pnpm add @sentry/react@^8
pnpm remove @sentry/tracing  # 8.x 已内置，不再需要单独安装
```

```typescript
// src/index.tsx  ——  Sentry 8.x 初始化（移除废弃的 Integrations）
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),  // 替代旧 BrowserTracing
    Sentry.replayIntegration({           // 新增：Session Replay
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.VITE_APP_ENV,
});
```

### 3.5 Axios 单例重构

**当前问题：** 每次调用 `request()` 都 `new Request()`，创建独立 Axios 实例和拦截器链。

```typescript
// src/utils/request.ts ——  重构为全局单例

import axios, { AxiosInstance } from 'axios';

// 单例：全局唯一 Axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_URL,
  withCredentials: true,
  transformResponse: [
    (data: string) => {
      if (typeof data !== 'string') return data;
      try {
        return parseJsonWithBigNumberSupport(data);
      } catch {
        return JSON.parse(data);
      }
    },
  ],
});

// 请求拦截器（只注册一次）
axiosInstance.interceptors.request.use(config => {
  useGlobalStore.getState().setStoreState({ [config.url!]: true });

  const token = getAuthToken();
  config.headers = {
    ...config.headers,
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    'PROJECT-ID': getProjectId(),
    'trace-id': getRequestId(),
    'config': JSON.stringify(config.headers?.config ?? {}),
    'X-UA': getXUa(),
    'href': window.location.href,
    'language': LANGUAGE_MAP[localStorage.getItem('lang') as keyof typeof LANGUAGE_MAP],
    ...getExternalLinkHeaders(),
  } as any;
  return config;
});

// 响应拦截器（只注册一次）
axiosInstance.interceptors.response.use(
  handleSuccessResponse,
  handleErrorResponse,
);

// 导出单例函数
export const request = <T = any>(options: IRequestOptions): Promise<IResponse<T>> => {
  return axiosInstance.request<T>(options).then(response => ({
    code: response.status,
    message: response.statusText,
    data: response.data,
    headers: response.headers,
  }));
};
```

### 3.6 API 文件按领域拆分

**当前问题：** `services-new/api.ts` 单文件 400+ 枚举（~20KB），所有模块全量引入。

```
# 拆分后结构
src/services-new/
├── index.ts              ← 统一 re-export（向后兼容）
├── enums/
│   ├── global.enum.ts    ← 全局 / 项目 / 用户相关 API
│   ├── dashboard.enum.ts ← 看板相关 API
│   ├── analysis.enum.ts  ← 行为分析相关 API
│   ├── event.enum.ts     ← 埋点/事件元数据 API
│   ├── tag.enum.ts       ← 标签/人群包 API
│   ├── report.enum.ts    ← 报表/指标 API
│   ├── finance.enum.ts   ← 财务 API
│   ├── notice.enum.ts    ← 站内信 API
│   ├── warning.enum.ts   ← 预警 API
│   └── kocrm.enum.ts     ← 投放/营销 API
```

```typescript
// src/services-new/enums/dashboard.enum.ts
export enum DashboardAPI {
  detail     = '/api/dashboard',
  list       = '/api/dashboards',
  copy       = '/api/dashboard/copy',
  move       = '/api/dashboard/move',
  folderTree = '/api/dashboard/folder/tree',
  softLink   = '/api/dashboard/soft-link/v1/add',
  aiSummary  = '/api/dashboard/v1/ai-summary',
  // ...
}

// src/services-new/index.ts ——  向后兼容的 re-export
export { DashboardAPI } from './enums/dashboard.enum';
export { AnalysisAPI }  from './enums/analysis.enum';
// 合并导出为旧的 API 枚举名（零侵入）
export const API = {
  ...DashboardAPI,
  ...AnalysisAPI,
  // ...
} as const;
```

---

## 四、Phase 2：状态管理统一

### 4.1 Redux → Zustand 完整迁移清单

当前 Redux store 包含 **21 个 reducer**，按影响范围分批迁移：

| 批次 | Redux Reducer | 迁移到 Zustand Store | 优先级 |
|------|-------------|-------------------|-------|
| Batch 1 | login, categories, user | `stores/auth.ts` | P0 |
| Batch 1 | metaEvents, eventProps, userProps | `stores/metaData.ts` | P0 |
| Batch 2 | eventAnalysis, keepAnalysis, funnelAnalysis, scatterAnalysis, intervalAnalysis | `stores/analysis/` | P1 |
| Batch 2 | selfServiceAnalysis, userPropsAnalysis | `stores/analysis/` | P1 |
| Batch 3 | dashboard, DashboardManage | 已有 `stores/` 部分，合并 | P2 |
| Batch 3 | Tags | 已有 `stores/tag.ts`，合并 | P2 |
| Batch 4 | project, dataSource, dataGroupManage, DictManage | `stores/manage.ts` | P3 |
| Batch 4 | workFlowModelCategory, workFlowTask, workFlowJob | `stores/workflow.ts` | P3 |
| Batch 4 | eventApprove | `stores/event.ts` | P3 |

**迁移模板（以 eventAnalysis 为例）：**

```typescript
// Before：pages/EventAnalysis/store/reducer.ts（Redux）
const eventAnalysisReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_EVENT_LIST':
      return { ...state, eventList: action.payload };
    default:
      return state;
  }
};

// After：stores/analysis/eventAnalysis.ts（Zustand）
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface EventAnalysisState {
  eventList:     EventItem[];
  filterList:    FilterItem[];
  groupList:     GroupItem[];
  dateRange:     DateRange;
  queryResult:   QueryResult | null;
  isQuerying:    boolean;

  setEventList:  (list: EventItem[]) => void;
  setFilterList: (list: FilterItem[]) => void;
  setGroupList:  (list: GroupItem[]) => void;
  setDateRange:  (range: DateRange) => void;
  reset:         () => void;
}

const initialState = {
  eventList:   [],
  filterList:  [],
  groupList:   [],
  dateRange:   { type: '7d' },
  queryResult: null,
  isQuerying:  false,
};

export const useEventAnalysisStore = create<EventAnalysisState>()(
  devtools(
    (set) => ({
      ...initialState,
      setEventList:  (eventList)  => set({ eventList },  false, 'setEventList'),
      setFilterList: (filterList) => set({ filterList }, false, 'setFilterList'),
      setGroupList:  (groupList)  => set({ groupList },  false, 'setGroupList'),
      setDateRange:  (dateRange)  => set({ dateRange },  false, 'setDateRange'),
      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'EventAnalysis' },
  ),
);
```

**完成迁移后删除：**
```bash
# 所有 Redux 模块迁移完毕后执行
pnpm remove redux redux-thunk react-redux immer
rm -rf src/store
```

### 4.2 引入 TanStack Query v5 管理服务端状态

**设计原则**：Zustand 管理**客户端 UI 状态**，TanStack Query 管理**服务端异步数据**，两者不重叠。

```bash
pnpm add @tanstack/react-query@^5 @tanstack/react-query-devtools@^5
```

**应用入口集成：**
```typescript
// src/index.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5分钟内不重新请求
      gcTime:    10 * 60 * 1000,  // 10分钟内保留缓存
      retry: 1,
      refetchOnWindowFocus: false, // 分析平台不需要窗口聚焦重新请求
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ConfigProvider ...>
      <App />
    </ConfigProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

**典型用法——看板列表：**
```typescript
// src/pages/Dashboard/hooks/useDashboardList.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDashboardList, deleteDashboard } from '@/services-new/dashboard';

// Query Keys 集中管理（防止魔法字符串）
export const dashboardKeys = {
  all:    ()              => ['dashboard'] as const,
  lists:  ()              => [...dashboardKeys.all(), 'list'] as const,
  list:   (projectId: string) => [...dashboardKeys.lists(), projectId] as const,
  detail: (id: number)   => [...dashboardKeys.all(), 'detail', id] as const,
};

// 查询看板列表
export function useDashboardList(projectId: string) {
  return useQuery({
    queryKey: dashboardKeys.list(projectId),
    queryFn:  () => getDashboardList({ project_id: projectId }),
    select:   (res) => res.data?.data?.list ?? [],
    enabled:  !!projectId,
  });
}

// 删除看板（自动使列表缓存失效）
export function useDeleteDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDashboard(id),
    onSuccess: () => {
      // 删除成功后，使所有看板列表缓存失效，触发重新请求
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });
}
```

**分析查询（耗时请求 + 轮询）：**
```typescript
// src/pages/EventAnalysis/hooks/useEventAnalysisQuery.ts

export function useEventAnalysis(params: EventAnalysisParams | null) {
  return useQuery({
    queryKey: ['event-analysis', params],
    queryFn:  () => queryEventAnalysis(params!),
    enabled:  !!params,                // params 为 null 时不请求
    staleTime: 0,                      // 分析结果不做缓存（每次提交重新请求）
    gcTime: 30 * 1000,                 // 结果保留 30s（用于页面切换返回时）
    select: (res) => res.data?.data,
  });
}
```

**Zustand vs TanStack Query 职责划分：**

```
Zustand（客户端状态）：
  ✅ 分析查询条件（eventList / filterList / groupList）
  ✅ 用户 UI 偏好（主题色、折叠状态、全屏）
  ✅ 跨路由持久数据（projectId、userInfo、dpType）
  ✅ 临时编辑状态（报表编辑草稿）

TanStack Query（服务端状态）：
  ✅ 看板列表 / 详情
  ✅ 报表列表 / 详情
  ✅ 分析查询结果
  ✅ 事件元数据（事件列表、属性列表、枚举）
  ✅ 用户列表、项目列表
  ✅ 标签列表、指标列表
```

---

## 五、Phase 3：React 16 → React 18

### 5.1 入口文件改写

```typescript
// src/index.tsx ——  核心改动：ReactDOM.render → createRoot

// Before（React 16）
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// After（React 18）
import { createRoot } from 'react-dom/client';
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
```

### 5.2 StrictMode 双调用修复

React 18 开发模式下，`useEffect` 会执行两次（用于检测副作用纯净性）。需修复以下场景：

```typescript
// ❌ 常见问题：未清理的订阅/WebSocket
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handler;
  // 忘记 return 清理函数 → StrictMode 下出现双连接
}, []);

// ✅ 修复后：始终返回清理函数
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handler;
  return () => ws.close();  // 关键：StrictMode 第一次 effect 会被清理
}, []);

// ❌ 常见问题：mitt 事件重复绑定
useEffect(() => {
  emitter.on('refresh', handleRefresh);
  // 未 off → StrictMode 下绑定两次
}, []);

// ✅ 修复后
useEffect(() => {
  emitter.on('refresh', handleRefresh);
  return () => emitter.off('refresh', handleRefresh);
}, []);
```

### 5.3 并发特性应用

```typescript
// 1. useTransition：分析查询不阻塞 UI 交互
import { useTransition, useState } from 'react';

function EventAnalysisPage() {
  const [isPending, startTransition] = useTransition();
  const [queryParams, setQueryParams] = useState(null);

  const handleQuery = (params) => {
    startTransition(() => {
      // 更新 queryParams（低优先级），不阻塞用户与筛选器的交互
      setQueryParams(params);
    });
  };

  return (
    <>
      <FilterPanel onChange={handleQuery} />
      {isPending && <Spin tip="计算中..." />}
      <ChartArea params={queryParams} />
    </>
  );
}

// 2. useDeferredValue：图表数据延迟渲染，优先保持筛选器响应
import { useDeferredValue } from 'react';

function ChartArea({ params }) {
  const deferredParams = useDeferredValue(params);
  const { data } = useEventAnalysis(deferredParams);
  // deferredParams 滞后于 params，用户快速切换时减少无效请求渲染
  return <Chart data={data} />;
}

// 3. Suspense（配合 TanStack Query）：更优雅的 Loading
import { Suspense } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';

function DashboardContent({ id }) {
  // useSuspenseQuery：数据未就绪时自动 suspend，由外层 Suspense 显示 Loading
  const { data } = useSuspenseQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn:  () => getDashboardDetail(id),
  });
  return <Dashboard data={data} />;
}

// 父组件
function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DashboardContent id={id} />
    </Suspense>
  );
}
```

### 5.4 自动批处理收益

```typescript
// React 18 自动批处理：多个 setState 自动合并为一次渲染
// 在 setTimeout / Promise 中同样生效（React 16 不支持）

// 之前（React 16）：在 async 回调中，每个 setState 都触发一次渲染 → 3次渲染
async function handleSave() {
  const result = await saveReport(data);
  setLoading(false);    // 渲染1
  setData(result);      // 渲染2
  setSuccess(true);     // 渲染3
}

// React 18：自动合并 → 1次渲染，无需任何代码修改
```

---

## 六、Phase 4：react-router 5 → 6

### 6.1 API 差异对照表

| 功能 | react-router 5 | react-router 6 |
|------|---------------|----------------|
| 路由渲染 | `renderRoutes(routes)` | `<Routes>` + `<Route>` |
| 编程导航 | `useHistory().push()` | `useNavigate()` |
| 参数获取 | `useParams()` | `useParams()`（相同） |
| 重定向 | `<Redirect to="">` | `<Navigate to="" replace>` |
| 路由匹配 | `useRouteMatch()` | `useMatch()` |
| 嵌套路由 | `renderRoutes(route.routes)` | `<Outlet />` |
| 权限路由 | 自定义 `renderRoutes` | 自定义 `<ProtectedRoute>` |

### 6.2 路由表重构

```typescript
// Before：react-router-config 风格（v5）
const routes = [
  {
    path: '/',
    component: Layout,
    routes: [
      {
        path: '/dashboard',
        component: Dashboard,
        checkAuth: true,
      },
      {
        path: '/behavior-analysis',
        component: DataManage,
        routes: [
          { path: '/behavior-analysis/event-analysis', component: EventAnalysis },
        ],
      },
    ],
  },
];

// After：react-router 6 声明式路由（搭配 createBrowserRouter）
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,  // 替代 ErrorBoundary
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute authKey="dashboard">
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'behavior-analysis',
        element: <DataManage />,
        children: [
          {
            path: 'event-analysis',
            element: (
              <ProtectedRoute authKey="event-analysis">
                <EventAnalysis />
              </ProtectedRoute>
            ),
          },
          // ...
        ],
      },
    ],
  },
]);

// src/App.tsx
function App() {
  return <RouterProvider router={router} />;
}
```

### 6.3 权限路由组件重构

```typescript
// Before（v5）：renderRouters.jsx 中硬编码权限校验
function renderRoutes(routes, allAuth) {
  return routes.map(route => {
    if (route.checkAuth && !allAuth[route.path]) {
      return <Redirect to="/no-power" />;
    }
    return <Route path={route.path} component={route.component} />;
  });
}

// After（v6）：独立的 ProtectedRoute 组件，职责清晰
// src/components/ProtectedRoute/index.tsx
interface ProtectedRouteProps {
  authKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function ProtectedRoute({ authKey, children, fallback }: ProtectedRouteProps) {
  const allAuth = useAllAuth();  // 从 @joyu/auth 获取权限树

  if (!allAuth[authKey]) {
    return fallback ?? <Navigate to="/no-power" replace />;
  }
  return <>{children}</>;
}

// 嵌套路由：Layout 组件内直接使用 <Outlet />
// src/components/Layout/index.tsx
function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main>
        <Outlet />  {/* 替代原来的 renderRoutes */}
      </main>
    </div>
  );
}
```

### 6.4 组件内导航 API 升级

```typescript
// Before（v5）
import { useHistory } from 'react-router-dom';
const history = useHistory();
history.push('/dashboard');
history.replace('/login');
history.goBack();

// After（v6）
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/dashboard');
navigate('/login', { replace: true });
navigate(-1);  // goBack

// 带状态传参
navigate('/event-analysis', {
  state: { fromDashboard: true },
});
// 读取 state
const location = useLocation();
const { fromDashboard } = location.state ?? {};
```

---

## 七、升级后整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React 18 + TypeScript 5                     │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐   │
│  │  createBrowserRouter │    │         TanStack Query v5                │   │
│  │  (react-router 6)│    │  服务端状态：列表/详情/分析结果缓存   │   │
│  └─────────────────┘    └──────────────────────────────────────┘   │
│           ↓                              ↓                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                   Zustand v4（统一状态管理）                 │    │
│  │  global.ts  │  analysis/*  │  event.ts  │  tag.ts  │ ...   │    │
│  │  （客户端 UI 状态，无服务端数据）                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│           ↓                                                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              Axios 单例 + 领域化 API 枚举                    │    │
│  │  dashboard.enum  │  analysis.enum  │  finance.enum  │ ...   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Ant Design 5  │  Tailwind CSS 3  │  ahooks 3.x（单一版本）         │
│  G2 / ECharts  │  react-i18next 14（类型安全）  │  Sentry 8        │
└─────────────────────────────────────────────────────────────────────┘
```

### 升级后收益汇总

| 指标 | 升级前 | 升级后（预估） |
|------|-------|-------------|
| 首次内容渲染（FCP） | baseline | 快 15-25%（自动批处理 + 并发渲染） |
| 打包体积 | baseline | 减少 ~200KB（精简 ahooks 双版本） |
| 状态管理代码量 | Redux 21 slices + Zustand | 只保留 Zustand，减少 ~40% 样板代码 |
| 重复请求 | 每次组件挂载重复请求 | TanStack Query 缓存，减少 60-80% |
| TS 类型覆盖率 | i18n key 无检查 | 所有 t() 调用编译期检查 |
| 开发体验 | Redux DevTools + 手动调试 | Zustand DevTools + TanStack Query DevTools |
| 错误监控 | Sentry 7 | Sentry 8 + Session Replay |

---

## 八、风险评估与回滚策略

| 阶段 | 主要风险 | 缓解措施 |
|------|---------|---------|
| Phase 1 | TS 严格模式新增报错 | 逐步开启严格选项，先 `warn` 后 `error` |
| Phase 2 | Redux 迁移遗漏某 reducer 依赖 | 迁移前为旧模块添加集成测试，迁移后 E2E 验证 |
| Phase 3 | StrictMode 双调用引发第三方库 Bug | 先不启用 StrictMode，留作后期开启 |
| Phase 4 | react-router 6 路由路径匹配规则变化 | 逐路由对照测试，保持旧路由 301 跳转兼容 |

> **总迁移周期预估：14 周**（可与业务需求并行推进，Phase 1 + Phase 2 并行，Phase 3 + Phase 4 串行）
