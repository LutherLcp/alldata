/**
 * 异常告警组件
 * 展示异常检测结果，支持展开 AI 解读详情
 */
import { useState } from 'react';
import {
    Card, List, Tag, Typography, Button, Space, Collapse, Spin, Empty, Badge,
} from 'antd';
import {
    WarningOutlined, ThunderboltOutlined, DownOutlined, UpOutlined,
    ExperimentOutlined, FireOutlined,
} from '@ant-design/icons';
import { useAIStore } from '@/stores/ai-store';
import type { AnomalyResult } from '@/services-new/ai';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AnomalyAlertProps {
    /** 指标名称（用于 AI 解读） */
    metricName?: string;
    /** 额外上下文 */
    context?: string;
    /** 自定义样式 */
    style?: React.CSSProperties;
}

/** 严重度颜色映射 */
const severityColor: Record<string, string> = {
    low: '#52c41a',
    medium: '#faad14',
    high: '#fa8c16',
    critical: '#ff4d4f',
};

/** 严重度标签 */
const severityLabel: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
};

/** 异常分类标签 */
const categoryLabel: Record<string, { label: string; color: string }> = {
    spike: { label: '突刺', color: 'red' },
    trend_shift: { label: '趋势偏移', color: 'orange' },
    seasonal_break: { label: '季节性中断', color: 'purple' },
    gradual_drift: { label: '渐进漂移', color: 'blue' },
};

/** 偏离度计算 */
const deviation = (a: AnomalyResult) => {
    if (a.expected === 0) return 'N/A';
    const pct = Math.abs((a.value - a.expected) / a.expected) * 100;
    return `${pct.toFixed(1)}%`;
};

export default function AnomalyAlert({ metricName = '指标', context, style }: AnomalyAlertProps) {
    const { anomalies, anomalyInterpretation, anomalyLoading, interpretAnomalies } = useAIStore();
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    // 无异常数据
    if (!anomalies.length && !anomalyLoading) {
        return null;
    }

    return (
        <Card
            style={{ borderColor: anomalies.length ? '#ff4d4f' : '#52c41a', ...style }}
            title={
                <Space>
                    <WarningOutlined style={{ color: anomalies.length ? '#ff4d4f' : '#52c41a' }} />
                    <span>异常检测结果</span>
                    {anomalies.length > 0 && (
                        <Badge count={anomalies.length} style={{ backgroundColor: '#ff4d4f' }} />
                    )}
                </Space>
            }
            extra={
                anomalies.length > 0 && (
                    <Button
                        type="link"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        loading={anomalyLoading}
                        onClick={() => interpretAnomalies(metricName, context)}
                        style={{ color: '#722ED1' }}
                    >
                        AI 解读
                    </Button>
                )
            }
        >
            <Spin spinning={anomalyLoading && !anomalies.length}>
                {anomalies.length === 0 ? (
                    <Empty description="未检测到异常" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <>
                        {/* 异常列表 */}
                        <List
                            dataSource={anomalies}
                            renderItem={(item, idx) => (
                                <List.Item
                                    key={idx}
                                    style={{
                                        borderLeft: `3px solid ${severityColor[item.severity]}`,
                                        paddingLeft: 12,
                                        marginBottom: 8,
                                        cursor: 'pointer',
                                        background: expandedIdx === idx ? '#fafafa' : 'transparent',
                                        borderRadius: 4,
                                    }}
                                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                >
                                    <div style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Space>
                                                <FireOutlined style={{ color: severityColor[item.severity] }} />
                                                <Text strong style={{ fontSize: 13 }}>
                                                    {new Date(item.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                                <Tag color={categoryLabel[item.category]?.color ?? 'default'}>
                                                    {categoryLabel[item.category]?.label ?? item.category}
                                                </Tag>
                                                <Tag color={severityColor[item.severity]}>
                                                    {severityLabel[item.severity]}
                                                </Tag>
                                            </Space>
                                            <Space size={4}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    偏离 {deviation(item)}
                                                </Text>
                                                {expandedIdx === idx ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
                                            </Space>
                                        </div>

                                        {/* 数值行 */}
                                        <div style={{ marginTop: 4 }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                实际值：<Text style={{ color: severityColor[item.severity] }}>{item.value.toLocaleString()}</Text>
                                                {' · '}期望值：{item.expected.toLocaleString()}
                                                {item.z_score !== undefined && ` · Z-Score: ${item.z_score.toFixed(2)}`}
                                            </Text>
                                        </div>

                                        {/* 展开详情 */}
                                        {expandedIdx === idx && (
                                            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    检测方法：{item.methods.join('、')}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </List.Item>
                            )}
                        />

                        {/* AI 解读结果 */}
                        {anomalyInterpretation && (
                            <Card
                                size="small"
                                style={{ marginTop: 12, borderColor: '#722ED1', background: '#f9f0ff' }}
                                title={
                                    <Space>
                                        <ExperimentOutlined style={{ color: '#722ED1' }} />
                                        <span style={{ color: '#722ED1', fontWeight: 600 }}>AI 智能解读</span>
                                        <Tag color={severityColor[anomalyInterpretation.severity_assessment]}>
                                            {severityLabel[anomalyInterpretation.severity_assessment]}风险
                                        </Tag>
                                    </Space>
                                }
                            >
                                <Collapse ghost defaultActiveKey={['analysis', 'causes', 'recs']}>
                                    <Panel header="详细分析" key="analysis">
                                        <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                            {anomalyInterpretation.detailed_analysis}
                                        </Paragraph>
                                    </Panel>
                                    <Panel header={`可能原因 (${anomalyInterpretation.possible_causes.length})`} key="causes">
                                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                                            {anomalyInterpretation.possible_causes.map((c, i) => (
                                                <li key={i} style={{ marginBottom: 4 }}><Text>{c}</Text></li>
                                            ))}
                                        </ul>
                                    </Panel>
                                    <Panel header={`处置建议 (${anomalyInterpretation.recommendations.length})`} key="recs">
                                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                                            {anomalyInterpretation.recommendations.map((r, i) => (
                                                <li key={i} style={{ marginBottom: 4 }}><Text>{r}</Text></li>
                                            ))}
                                        </ul>
                                    </Panel>
                                </Collapse>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    解读时间：{new Date(anomalyInterpretation.created_at).toLocaleString('zh-CN')}
                                </Text>
                            </Card>
                        )}
                    </>
                )}
            </Spin>
        </Card>
    );
}
