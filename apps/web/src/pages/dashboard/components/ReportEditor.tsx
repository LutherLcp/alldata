/**
 * 报表编辑器 — 配置报表类型/图表/查询/样式
 */
import { useState } from 'react';
import {
  Modal, Form, Input, Select, Tabs, Row, Col,
  Switch, Typography, message,
} from 'antd';
import { dashboardApi } from '@/services-new/dashboard';

const { TextArea } = Input;
const { Text } = Typography;

interface ReportEditorProps {
  open: boolean;
  dashboardId: number;
  projectId: number;
  report?: any;
  onClose: () => void;
  onSaved: () => void;
}

const REPORT_TYPES = [
  { value: 'chart', label: '图表' },
  { value: 'table', label: '表格' },
  { value: 'metric', label: '指标卡' },
  { value: 'sql', label: 'SQL 查询' },
  { value: 'text', label: '文本' },
];

const CHART_TYPES = [
  { value: 'line', label: '折线图' },
  { value: 'bar', label: '柱状图' },
  { value: 'pie', label: '饼图' },
  { value: 'area', label: '面积图' },
  { value: 'scatter', label: '散点图' },
  { value: 'table', label: '表格' },
  { value: 'number', label: '数字指标' },
];

export default function ReportEditor({ open, dashboardId, projectId, report, onClose, onSaved }: ReportEditorProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = !!report;

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        project_id: projectId,
        dashboard_id: dashboardId,
        name: values.name,
        type: values.type,
        chart_type: values.chart_type,
        query_config: {
          event_name: values.event_name,
          metrics: values.metrics || [],
          dimensions: values.dimensions || [],
          filters: values.filters || [],
          time_range: values.time_range || {},
          sql: values.sql_content,
        },
        chart_config: {
          show_legend: values.show_legend ?? true,
          show_grid: values.show_grid ?? true,
          color_scheme: values.color_scheme || 'default',
          stack: values.stack ?? false,
        },
        sql_content: values.sql_content,
      };

      if (isEdit) {
        await dashboardApi.updateReport(report.id, payload);
        message.success('报表已更新');
      } else {
        await dashboardApi.createReport(payload as any);
        message.success('报表已创建');
      }
      onSaved();
      onClose();
    } catch (err) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 编辑时回填
  const initialValues = report ? {
    name: report.name,
    type: report.type,
    chart_type: report.chart_type,
    event_name: report.query_config?.event_name,
    sql_content: report.sql_content || report.query_config?.sql,
    show_legend: report.chart_config?.show_legend ?? true,
    show_grid: report.chart_config?.show_grid ?? true,
    color_scheme: report.chart_config?.color_scheme || 'default',
    stack: report.chart_config?.stack ?? false,
  } : {
    type: 'chart',
    chart_type: 'bar',
    show_legend: true,
    show_grid: true,
    color_scheme: 'default',
    stack: false,
  };

  return (
    <Modal
      title={isEdit ? '编辑报表' : '新建报表'}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="报表名称" rules={[{ required: true }]}>
              <Input placeholder="输入报表名称" maxLength={200} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select options={REPORT_TYPES} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="chart_type" label="图表类型">
              <Select options={CHART_TYPES} allowClear placeholder="选择图表" />
            </Form.Item>
          </Col>
        </Row>

        <Tabs items={[
          {
            key: 'query',
            label: '数据查询',
            children: (
              <>
                <Form.Item name="event_name" label="事件名称">
                  <Input placeholder="例: page_view, button_click" />
                </Form.Item>
                <Form.Item name="sql_content" label="SQL 内容（SQL 类型专用）">
                  <TextArea rows={4} placeholder="SELECT * FROM events WHERE ..." />
                </Form.Item>
                <Text type="secondary">提示: 图表类型选择事件名，SQL 类型填写查询语句</Text>
              </>
            ),
          },
          {
            key: 'style',
            label: '图表样式',
            children: (
              <>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="show_legend" label="显示图例" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="show_grid" label="显示网格" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="stack" label="堆叠" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="color_scheme" label="配色方案">
                  <Select options={[
                    { value: 'default', label: '默认' },
                    { value: 'blue', label: '蓝色系' },
                    { value: 'warm', label: '暖色系' },
                    { value: 'cool', label: '冷色系' },
                    { value: 'rainbow', label: '彩虹' },
                  ]} />
                </Form.Item>
              </>
            ),
          },
        ]} />
      </Form>
    </Modal>
  );
}
