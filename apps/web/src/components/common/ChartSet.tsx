/**
 * ChartSet — 通用图表渲染组件
 * 支持折线/柱状/饼图/面积图
 */
import ReactEChartsCore from 'echarts-for-react';
import type { AnalysisResult } from '@/services-new/analysis';

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
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
        })),
      };
    }

    // 折线/柱状/面积图
    const seriesConfig = series.map((s, idx) => ({
      name: s.alias,
      type: chartType === 'area' ? 'line' : chartType,
      data: s.data.map((d) => d.value),
      smooth: true,
      areaStyle: chartType === 'area' ? { opacity: 0.3 } : undefined,
      itemStyle: { color: colors[idx % colors.length] },
    }));

    return {
      color: colors,
      tooltip: { trigger: 'axis' },
      legend: showLegend ? { data: series.map((s) => s.alias) } : undefined,
      grid: showGrid ? { left: '3%', right: '4%', bottom: '3%', containLabel: true } : undefined,
      xAxis: { type: 'category', data: dates, boundaryGap: chartType === 'bar' },
      yAxis: { type: 'value' },
      series: seriesConfig,
    };
  })();

  return (
    <ReactEChartsCore
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      lazyUpdate
    />
  );
}
