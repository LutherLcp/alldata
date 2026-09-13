/**
 * 筛选条件 UI 状态管理 (Zustand 纯客户端状态)
 *
 * 管理分析组件与看板共享的通用筛选条件、时间范围及临时组装条件。
 */
import { create } from 'zustand';

export interface DateRangePreset {
  label: string;
  start: string;
  end: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface FilterCondition {
  field: string;
  op: 'equal' | 'not_equal' | 'contains' | 'gt' | 'lt' | 'in' | 'not_in';
  value: any;
}

interface FilterState {
  // 当前通用的时间范围设置
  dateRange: {
    start: string;
    end: string;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  // 选中的事件/属性筛选条件列表
  conditions: FilterCondition[];
  // 当前分组维度
  dimensions: string[];

  // Actions
  setDateRange: (range: {
    start: string;
    end: string;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }) => void;
  addCondition: (condition: FilterCondition) => void;
  updateCondition: (index: number, condition: FilterCondition) => void;
  removeCondition: (index: number) => void;
  clearConditions: () => void;
  setDimensions: (dims: string[]) => void;
  resetFilter: () => void;
}

const defaultDateRange = {
  start: 'now-7d',
  end: 'now',
  granularity: 'day' as const,
};

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: defaultDateRange,
  conditions: [],
  dimensions: [],

  setDateRange: (range) =>
    set((state) => ({
      dateRange: {
        ...state.dateRange,
        ...range,
        granularity: range.granularity ?? state.dateRange.granularity,
      },
    })),

  addCondition: (condition) =>
    set((state) => ({
      conditions: [...state.conditions, condition],
    })),

  updateCondition: (index, condition) =>
    set((state) => {
      const next = [...state.conditions];
      next[index] = condition;
      return { conditions: next };
    }),

  removeCondition: (index) =>
    set((state) => ({
      conditions: state.conditions.filter((_, i) => i !== index),
    })),

  clearConditions: () => set({ conditions: [] }),

  setDimensions: (dimensions) => set({ dimensions }),

  resetFilter: () =>
    set({
      dateRange: defaultDateRange,
      conditions: [],
      dimensions: [],
    }),
}));
