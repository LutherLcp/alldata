/**
 * AI 智能洞察卡片
 * 在看板/报表上方展示 AI 生成的洞察分析
 */
import { useState, useCallback } from 'react';
import {
    Card, Collapse, Skeleton, Button, Space, Tag, Typography, Tooltip, Divider, Empty,
} from 'antd';
import {
    BulbOutlined, ReloadOutlined, LikeOutlined, DislikeOutlined,
    LikeFilled, DislikeFilled, ThunderboltOutlined, AimOutlined,
    RocketOutlined,
} from '@ant-design/icons';
import { useAIStore } from '@/stores/ai-store';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface InsightCardProps {
    /** 项目 ID */
    projectId: number;
    /** 数据类型 */
    dataType?: string;
    /** 数据 ID */
    dataId?: number;
    /** 额外上下文 */
    context?: string;
    /** 自定义样式 */
    style?: React.CSSProperties;
}

/** 置信度标签颜色 */
const confidenceColor = (v: number) => (v >= 0.8 ? 'green' : v >= 0.5 ? 'orange' : 'red');

export default function InsightCard({ projectId, dataType = 'dashboard', dataId = 0, context, style }: InsightCardProps) {
    const { lastInsight, insightLoading, runInsight } = useAIStore();
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

    const handleGenerate = useCallback(() => {
        setFeedback(null);
        runInsight({ project_id: projectId, data_type: dataType, data_id: dataId, context });
    }, [projectId, dataType, dataId, context, runInsight]);

    // Loading 骨架屏
    if (insightLoading) {
        return (
            <Card
                style={{ borderColor: '#722ED1', ...style }}
                title={
                    <Space>
                        <BulbOutlined style={{ color: '#722ED1' }} />
                        <span style={{ color: '#722ED1' }}>AI 智能洞察</span>
                    </Space>
                }
            >
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 2 }} style={{ marginTop: 16 }} />
            </Card>
        );
    }

    // 无数据时显示生成按钮
    if (!lastInsight) {
        return (
            <Card
                style={{ borderColor: '#d9d9d9', borderStyle: 'dashed', ...style }}
                bodyStyle={{ textAlign: 'center', padding: '32px 16px' }}
            >
                <BulbOutlined style={{ fontSize: 36, color: '#722ED1', marginBottom: 12 }} />
                <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        使用 AI 分析当前数据，生成智能洞察与建议
                    </Text>
                    <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleGenerate} style={{ background: '#722ED1', borderColor: '#722ED1' }}>
                        生成 AI 洞察
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card
            style={{ borderColor: '#722ED1', borderTopWidth: 3, ...style }}
            title={
                <Space>
                    <BulbOutlined style={{ color: '#722ED1' }} />
                    <span style={{ fontWeight: 600, color: '#722ED1' }}>AI 智能洞察</span>
                    <Tag color={confidenceColor(lastInsight.confidence)}>
                        置信度 {Math.round(lastInsight.confidence * 100)}%
                    </Tag>
                </Space>
            }
            extra={
                <Space>
                    <Tooltip title={feedback === 'up' ? '已点赞' : '点赞此洞察'}>
                        <Button
                            type="text" size="small"
                            icon={feedback === 'up' ? <LikeFilled style={{ color: '#722ED1' }} /> : <LikeOutlined />}
                            onClick={() => setFeedback('up')}
                        />
                    </Tooltip>
                    <Tooltip title={feedback === 'down' ? '已点踩' : '反馈不准确'}>
                        <Button
                            type="text" size="small"
                            icon={feedback === 'down' ? <DislikeFilled style={{ color: '#ff4d4f' }} /> : <DislikeOutlined />}
                            onClick={() => setFeedback('down')}
                        />
                    </Tooltip>
                    <Tooltip title="重新生成">
                        <Button type="text" size="small" icon={<ReloadOutlined />} onClick={handleGenerate} />
                    </Tooltip>
                </Space>
            }
        >
            <Collapse defaultActiveKey={['summary', 'findings', 'recommendations']} ghost bordered={false}>
                {/* 总结摘要 */}
                <Panel
                    header={<Space><BulbOutlined />总结摘要</Space>}
                    key="summary"
                >
                    <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                        {lastInsight.summary || '暂无摘要'}
                    </Paragraph>
                </Panel>

                {/* 关键发现 */}
                <Panel
                    header={
                        <Space>
                            <AimOutlined />
                            关键发现
                            <Tag color="purple">{lastInsight.key_findings?.length ?? 0}</Tag>
                        </Space>
                    }
                    key="findings"
                >
                    {lastInsight.key_findings?.length ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {lastInsight.key_findings.map((finding, i) => (
                                <li key={i} style={{ marginBottom: 6 }}>
                                    <Text>{finding}</Text>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty description="暂无关键发现" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                </Panel>

                {/* 行动建议 */}
                <Panel
                    header={
                        <Space>
                            <RocketOutlined />
                            行动建议
                            <Tag color="blue">{lastInsight.recommendations?.length ?? 0}</Tag>
                        </Space>
                    }
                    key="recommendations"
                >
                    {lastInsight.recommendations?.length ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {lastInsight.recommendations.map((rec, i) => (
                                <li key={i} style={{ marginBottom: 6 }}>
                                    <Text>{rec}</Text>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty description="暂无行动建议" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                </Panel>
            </Collapse>

            <Divider style={{ margin: '12px 0 8px' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
                生成时间：{new Date(lastInsight.created_at).toLocaleString('zh-CN')}
            </Text>
        </Card>
    );
}
