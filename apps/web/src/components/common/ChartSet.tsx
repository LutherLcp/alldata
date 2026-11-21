import echarts from '@/components/chart/echarts-core';
import type { AnalysisResult } from '@/services/analysis';
/**
 * ChartSet — 通用图表渲染组件
 * 支持折线/柱状/饼图/面积图
 */
// 使用 core 版本 + 项目自定义的按需注册（echarts-core.ts），避免整包 echarts 进入 chunk
import ReactEChartsCore from 'echarts-for-react/esm/core';

interface ChartSetProps {
  data: AnalysisResult;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  colorScheme?: string;
}

const COLOR_SCHEMES: Record<string, string[]> = {
  default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
  blue: ['#1890ff', '#36cfc9', '#597ef7', '#85a5ff', '#adc6ff', '#2f54eb', '#1d39c4', '#10239e'],
  warm: ['#ff4d4f', '#ff7a45', '#ffa940', '#ffc53d', '#ffec3d', '#fadb14', '#faad14', '#d48806'],
  cool: ['#36cfc9', '#5cdbd3', '#87e8de', '#b5f5ec', '#13c2c2', '#08979c', '#006d75', '#00474f'],
  rainbow: ['#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#faad14'],
};

export default function ChartSet({
  data,
  chartType = 'line',
  height = 350,
  showLegend = true,
  showGrid = true,
  colorScheme = 'default',
}: ChartSetProps) {
  const colors: string[] = COLOR_SCHEMES[colorScheme] ?? COLOR_SCHEMES.default ?? [];
  const series = data.series ?? [];

  // 提取日期轴
  const dates = series[0]?.data.map((d) => d.date) ?? [];

  const option = (() => {
    if (chartType === 'pie') {
      // 饼图：取每个系列的总和
      return {
        color: colors,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: showLegend ? { orient: 'vertical', left: 'left' } : undefined,
        series: series.map((s) => ({
          name: s.alias,
          type: 'pie',
          radius: ['40%', '70%'],
          data: s.data.map((d) => ({ name: d.date, value: d.value })),
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
          },
        })),
      };
    }

    // 折线/柱状/面积图 (带 LTTB 降采样与大数组渐进渲染)
    const isLargeData = dates.length > 2000;
    const seriesConfig = series.map((s, idx) => ({
      name: s.alias,
      type: chartType === 'area' ? 'line' : chartType,
      data: s.data.map((d) => d.value),
      smooth: true,
      // LTTB 降采样：保留数据形态的同时大幅度提升渲染性能
      sampling: 'lttb' as const,
      // 大数据量渐进式分批渲染
      large: isLargeData,
      largeThreshold: 2000,
      progressive: isLargeData ? 2000 : 0,
      progressiveThreshold: 3000,
      areaStyle: chartType === 'area' ? { opacity: 0.3 } : undefined,
      itemStyle: { color: colors[idx % colors.length] },
    }));

    return {
      color: colors,
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: showLegend ? { data: series.map((s) => s.alias) } : undefined,
      grid: showGrid
        ? { left: '3%', right: '4%', bottom: dates.length > 100 ? '12%' : '3%', containLabel: true }
        : undefined,
      xAxis: { type: 'category', data: dates, boundaryGap: chartType === 'bar' },
      yAxis: { type: 'value' },
      // 大数据量自动展示缩放滑动条
      dataZoom:
        dates.length > 100
          ? [
              { type: 'inside', start: 0, end: 100 },
              { type: 'slider', start: 0, end: 100, height: 18, bottom: 8 },
            ]
          : undefined,
      series: seriesConfig,
    };
  })();

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      lazyUpdate
    />
  );
}
