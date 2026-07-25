/**
 * AI 状态管理 — Zustand store
 * 管理对话历史、侧边栏、洞察与异常检测状态
 */
import {
  aiApi,
  streamChat,
  type AnomalyInterpretation,
  type AnomalyResult,
  type ChatMessage,
  type InsightResponse,
  type ModelInfo,
} from '@/services-new/ai';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 对话会话（用于左侧历史列表） */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
}

interface AIState {
  // ── 对话 ──
  sessions: ChatSession[];
  currentSessionId: string | null;
  isGenerating: boolean;
  streamingContent: string;

  // ── 侧边栏 ──
  sidebarOpen: boolean;

  // ── 模型 ──
  selectedModel: string;
  availableModels: ModelInfo[];

  // ── 洞察 ──
  lastInsight: InsightResponse | null;
  insightLoading: boolean;

  // ── 异常 ──
  anomalies: AnomalyResult[];
  anomalyInterpretation: AnomalyInterpretation | null;
  anomalyLoading: boolean;

  // ── Actions ──
  // 对话
  getCurrentMessages: () => ChatMessage[];
  createSession: () => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearHistory: () => void;
  sendMessage: (content: string) => Promise<void>;
  sendStreamMessage: (content: string) => Promise<void>;

  // 侧边栏
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // 模型
  setModel: (model: string) => void;
  loadModels: () => Promise<void>;

  // 洞察
  runInsight: (data: {
    project_id: number;
    data_type: string;
    data_id: number;
    context?: string;
  }) => Promise<InsightResponse | null>;
  clearInsight: () => void;

  // 异常
  runAnomalyDetection: (data: {
    project_id: number;
    metric_name: string;
    data_points: Array<{ timestamp: string; value: number }>;
    sensitivity?: number;
  }) => Promise<void>;
  interpretAnomalies: (metricName: string, context?: string) => Promise<void>;
  clearAnomalies: () => void;
}

/** 生成唯一 ID */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isGenerating: false,
      streamingContent: '',

      sidebarOpen: false,

      selectedModel: '',
      availableModels: [],

      lastInsight: null,
      insightLoading: false,

      anomalies: [],
      anomalyInterpretation: null,
      anomalyLoading: false,

      // ── 对话管理 ──

      getCurrentMessages: () => {
        const { sessions, currentSessionId } = get();
        const session = sessions.find((s) => s.id === currentSessionId);
        return session?.messages ?? [];
      },

      createSession: () => {
        const id = uid();
        const session: ChatSession = {
          id,
          title: '新对话',
          messages: [],
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          currentSessionId: id,
        }));
        return id;
      },

      switchSession: (id) => set({ currentSessionId: id }),

      deleteSession: (id) =>
        set((s) => {
          const sessions = s.sessions.filter((x) => x.id !== id);
          const currentSessionId =
            s.currentSessionId === id ? (sessions[0]?.id ?? null) : s.currentSessionId;
          return { sessions, currentSessionId };
        }),

      clearHistory: () => set({ sessions: [], currentSessionId: null }),

      /** 非流式发送 */
      sendMessage: async (content: string) => {
        const { currentSessionId, selectedModel } = get();
        let sessionId = currentSessionId;

        // 无会话则自动创建
        if (!sessionId) {
          sessionId = get().createSession();
        }

        const userMsg: ChatMessage = { role: 'user', content };
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: [...sess.messages, userMsg],
                  title: sess.messages.length === 0 ? content.slice(0, 20) : sess.title,
                }
              : sess
          ),
          isGenerating: true,
        }));

        try {
          const messages = get().getCurrentMessages();
          const res = await aiApi.chat(messages, { model: selectedModel || undefined });

          const assistantMsg: ChatMessage = { role: 'assistant', content: res.content };
          set((s) => ({
            sessions: s.sessions.map((sess) =>
              sess.id === sessionId ? { ...sess, messages: [...sess.messages, assistantMsg] } : sess
            ),
          }));
        } finally {
          set({ isGenerating: false });
        }
      },

      /** 流式发送 */
      sendStreamMessage: async (content: string) => {
        const { currentSessionId, selectedModel } = get();
        let sessionId = currentSessionId;

        if (!sessionId) {
          sessionId = get().createSession();
        }

        const userMsg: ChatMessage = { role: 'user', content };
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: [...sess.messages, userMsg],
                  title: sess.messages.length === 0 ? content.slice(0, 20) : sess.title,
                }
              : sess
          ),
          isGenerating: true,
          streamingContent: '',
        }));

        let fullContent = '';
        try {
          const messages = get().getCurrentMessages();
          await streamChat(
            messages,
            (chunk) => {
              fullContent += chunk;
              set({ streamingContent: fullContent });
            },
            { model: selectedModel || undefined }
          );

          const assistantMsg: ChatMessage = { role: 'assistant', content: fullContent };
          set((s) => ({
            sessions: s.sessions.map((sess) =>
              sess.id === sessionId ? { ...sess, messages: [...sess.messages, assistantMsg] } : sess
            ),
          }));
        } finally {
          set({ isGenerating: false, streamingContent: '' });
        }
      },

      // ── 侧边栏 ──
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // ── 模型 ──
      setModel: (model) => set({ selectedModel: model }),

      loadModels: async () => {
        try {
          const models = await aiApi.getModels();
          set({ availableModels: models ?? [] });
          if (models?.length && !get().selectedModel) {
            set({ selectedModel: models[0]!.id });
          }
        } catch {
          // 忽略模型加载失败
        }
      },

      // ── 洞察 ──
      runInsight: async (data) => {
        set({ insightLoading: true });
        try {
          const res = await aiApi.generateInsight(data);
          set({ lastInsight: res ?? null });
          return res ?? null;
        } catch {
          return null;
        } finally {
          set({ insightLoading: false });
        }
      },

      clearInsight: () => set({ lastInsight: null }),

      // ── 异常 ──
      runAnomalyDetection: async (data) => {
        set({ anomalyLoading: true, anomalyInterpretation: null });
        try {
          const res = await aiApi.detectAnomalies(data);
          set({ anomalies: res?.anomalies ?? [] });
        } catch {
          set({ anomalies: [] });
        } finally {
          set({ anomalyLoading: false });
        }
      },

      interpretAnomalies: async (metricName, context) => {
        const { anomalies } = get();
        if (!anomalies.length) return;
        set({ anomalyLoading: true });
        try {
          const res = await aiApi.interpretAnomalies({
            anomalies,
            metric_name: metricName,
            context,
          });
          set({ anomalyInterpretation: res ?? null });
        } finally {
          set({ anomalyLoading: false });
        }
      },

      clearAnomalies: () => set({ anomalies: [], anomalyInterpretation: null }),
    }),
    {
      name: 'alldata-ai',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        selectedModel: state.selectedModel,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
