/**
 * ECharts 按需注册入口
 *
 * 项目当前使用的图表能力：
 *  - ChartSet：折线 / 柱状 / 饼图 / 面积图（含 dataZoom 缩放、legend、grid、tooltip）
 *  - 客户旅程页：桑基图（sankey + title + tooltip）
 *
 * 通过 `echarts/core` + 显式 `use()` 注册替代整包 `import * as echarts from 'echarts'`，
 * 避免把未使用的图表类型（地图/关系图/树图/富文本工具栏等）打进图表路由 chunk。
 * 注意：新增图表类型或组件（如 toolbox/visualMap/markLine）时，必须在此处补充注册，
 * 否则运行时会出现 "Component xxx not exists" 且图表不渲染。
 */
import { BarChart, LineChart, PieChart, SankeyChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  // 图表类型
  LineChart,
  BarChart,
  PieChart,
  SankeyChart,
  // 组件（TooltipComponent 内部会自动注册 AxisPointerComponent，十字准星可用）
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent, // 含 inside + slider 两种缩放
  // 渲染器
  CanvasRenderer,
]);

export default echarts;
