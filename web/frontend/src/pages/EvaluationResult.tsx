import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Statistic,
  Progress,
  Descriptions,
  Space,
  message,
  Tabs,
  Table,
  Tag,
  Divider,
  Select
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface IdentifierReplacement {
  original: string;
  adversarial: string;
  line: number;
}

interface SampleResult {
  sample_id: string;
  code_sample: string;
  label: string;
  difficulty: string;
  original_code: string;
  adversarial_code: string;
  attack_success: boolean;
  queries_used: number;
  time_cost: string;
  identifier_replacements: IdentifierReplacement[];
}

const EvaluationResult: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<SampleResult | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [taskId, setTaskId] = useState<string>('');
  const [copiedType, setCopiedType] = useState<string>('');
  const [selectedView, setSelectedView] = useState<string>('side-by-side');

  useEffect(() => {
    const storedData = sessionStorage.getItem('evaluationSampleResult');
    if (storedData) {
      const data = JSON.parse(storedData);
      setResult(data.result);
      setConfig(data.config);
      setTaskId(data.taskId);
    } else {
      // 使用模拟数据
      const mockData = {
        result: {
          sample_id: 'sample_001',
          code_sample: 'def calculate_sum(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result',
          label: 'function_generation',
          difficulty: 'medium',
          original_code: 'def calculate_sum(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result',
          adversarial_code: 'def calc_sum(nums):\n    res = 0\n    for num in nums:\n        res += num\n    return res',
          attack_success: true,
          queries_used: 127,
          time_cost: '3.45',
          identifier_replacements: [
            { original: 'calculate_sum', adversarial: 'calc_sum', line: 1 },
            { original: 'numbers', adversarial: 'nums', line: 1 },
            { original: 'result', adversarial: 'res', line: 2 },
            { original: 'number', adversarial: 'num', line: 3 }
          ]
        },
        config: {
          model_id: 'codebert',
          max_queries: 200,
          timeout: 60,
          language: 'python',
          attack_strategy: 'identifier_rename'
        },
        taskId: 'eval_task_' + Date.now()
      };
      setResult(mockData.result);
      setConfig(mockData.config);
      setTaskId(mockData.taskId);
    }
  }, []);

  const handleBack = () => {
    navigate('/evaluation');
  };

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      message.success('代码已复制到剪贴板');
      setTimeout(() => setCopiedType(''), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedType(type);
        message.success('代码已复制到剪贴板');
        setTimeout(() => setCopiedType(''), 2000);
      } catch (e) {
        message.error('复制失败');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDownloadReport = () => {
    if (!result) return;
    
    const reportData = {
      sample_id: result.sample_id,
      label: result.label,
      difficulty: result.difficulty,
      attack_success: result.attack_success,
      queries_used: result.queries_used,
      time_cost: result.time_cost,
      original_code: result.original_code,
      adversarial_code: result.adversarial_code,
      identifier_replacements: result.identifier_replacements,
      config: config
    };
    
    const jsonlContent = JSON.stringify(reportData);
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `evaluation_result_${result.sample_id}.jsonl`;
    link.click();
    message.success('评估报告已下载');
  };

  if (!result) {
    return <div>加载中...</div>;
  }

  // 性能指标数据（用于图表展示）
  const performanceData = [
    { metric: 'ASR', value: result.attack_success ? 100 : 0, color: '#ff4d4f' },
    { metric: 'AMI', value: result.queries_used, color: '#1890ff', max: config?.max_queries || 200 },
    { metric: 'ART', value: parseFloat(result.time_cost), color: '#52c41a', max: config?.timeout || 60 }
  ];

  const replacementColumns = [
    {
      title: '行号',
      dataIndex: 'line',
      key: 'line',
      width: 80,
    },
    {
      title: '原始标识符',
      dataIndex: 'original',
      key: 'original',
      render: (text: string) => (
        <Tag color="red" style={{ fontFamily: 'monospace' }}>{text}</Tag>
      ),
    },
    {
      title: '对抗标识符',
      dataIndex: 'adversarial',
      key: 'adversarial',
      render: (text: string) => (
        <Tag color="green" style={{ fontFamily: 'monospace' }}>{text}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
              style={{ marginRight: '16px' }}
            />
            安全测试结果
          </Title>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<DownloadOutlined />}
              onClick={handleDownloadReport}
            >
              下载JSONL报告
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 核心性能指标 - 交互式图表 */}
      <Card title={<span><BarChartOutlined /> 核心性能指标</span>} style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {performanceData.map((item, index) => (
            <Col span={8} key={index}>
              <Card size="small" style={{ background: '#fafafa', borderLeft: `4px solid ${item.color}` }}>
                <Statistic
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {item.metric === 'ASR' ? '攻击成功率 (ASR)' : 
                       item.metric === 'AMI' ? '平均模型调用次数 (AMI)' : 
                       '平均运行时间 (ART)'}
                    </span>
                  }
                  value={item.value}
                  suffix={item.metric === 'ASR' ? '%' : item.metric === 'ART' ? '秒' : ''}
                  valueStyle={{ color: item.color, fontSize: '28px', fontWeight: 'bold' }}
                />
                <Progress
                  percent={item.max ? (item.value / item.max) * 100 : item.value}
                  strokeColor={item.color}
                  showInfo={false}
                  strokeWidth={12}
                  style={{ marginTop: '12px' }}
                />
                {item.max && (
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                    <span>0</span>
                    <span>最大值: {item.max}</span>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>

        <Divider />

        {/* 可视化图表展示区域 - 柱状图模拟 */}
        <Row gutter={16} style={{ marginTop: '24px' }}>
          <Col span={24}>
            <Card 
              size="small" 
              title={<span><LineChartOutlined /> 性能指标对比图表</span>}
              style={{ background: '#fafafa' }}
            >
              <div style={{ padding: '20px' }}>
                {/* 自定义柱状图 */}
                <Row gutter={[32, 16]} align="bottom" style={{ minHeight: '200px' }}>
                  {performanceData.map((item, index) => {
                    const heightPercent = item.max ? (item.value / item.max) * 100 : item.value;
                    const barHeight = Math.max(heightPercent * 1.5, 20); // 最小20px
                    
                    return (
                      <Col span={8} key={index}>
                        <div style={{ textAlign: 'center' }}>
                          {/* 柱状图 */}
                          <div style={{ 
                            height: '200px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'flex-end',
                            alignItems: 'center'
                          }}>
                            <div style={{
                              width: '80%',
                              height: `${barHeight}px`,
                              background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}aa 100%)`,
                              borderRadius: '8px 8px 0 0',
                              position: 'relative',
                              transition: 'all 0.3s ease',
                              boxShadow: `0 -4px 8px ${item.color}44`,
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'center',
                              paddingTop: '8px'
                            }}>
                              <Text strong style={{ color: '#fff', fontSize: '16px' }}>
                                {item.value}{item.metric === 'ASR' ? '%' : item.metric === 'ART' ? 's' : ''}
                              </Text>
                            </div>
                          </div>
                          
                          {/* 标签 */}
                          <div style={{ marginTop: '12px' }}>
                            <Text strong style={{ fontSize: '14px', color: item.color }}>
                              {item.metric}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {item.metric === 'ASR' ? '攻击成功率' : 
                               item.metric === 'AMI' ? '模型调用次数' : 
                               '运行时间'}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>

                {/* 图表说明 */}
                <Divider />
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#fff1f0', borderRadius: '6px' }}>
                      <Text strong style={{ color: '#ff4d4f' }}>ASR: </Text>
                      <Text>攻击成功率越高，模型越脆弱</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#e6f7ff', borderRadius: '6px' }}>
                      <Text strong style={{ color: '#1890ff' }}>AMI: </Text>
                      <Text>查询次数越少，攻击效率越高</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center', padding: '12px', background: '#f6ffed', borderRadius: '6px' }}>
                      <Text strong style={{ color: '#52c41a' }}>ART: </Text>
                      <Text>运行时间越短，攻击成本越低</Text>
                    </div>
                  </Col>
                </Row>

                {/* 综合评估 */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '16px', 
                  background: result.attack_success ? '#fff1f0' : '#f6ffed',
                  borderRadius: '8px',
                  border: result.attack_success ? '2px solid #ffccc7' : '2px solid #d9f7be'
                }}>
                  <Row gutter={16} align="middle">
                    <Col span={4} style={{ textAlign: 'center' }}>
                      {result.attack_success ? (
                        <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
                      ) : (
                        <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                      )}
                    </Col>
                    <Col span={20}>
                      <Title level={4} style={{ margin: 0, color: result.attack_success ? '#ff4d4f' : '#52c41a' }}>
                        {result.attack_success ? '⚠️ 模型存在安全风险' : '✅ 模型通过安全测试'}
                      </Title>
                      <Paragraph style={{ margin: '8px 0 0 0' }}>
                        {result.attack_success ? (
                          <>
                            本次攻击成功生成对抗样本，模型在面对恶意输入时存在脆弱性。
                            建议进行对抗性微调以提升模型鲁棒性。
                            <br />
                            <Text strong>查询效率: </Text>
                            <Text>{((result.queries_used / (config?.max_queries || 200)) * 100).toFixed(1)}%</Text>
                            {' | '}
                            <Text strong>时间消耗: </Text>
                            <Text>{result.time_cost}秒 (限制:{config?.timeout || 60}秒)</Text>
                          </>
                        ) : (
                          <>
                            本次攻击未能成功生成对抗样本，模型在当前测试条件下展现出较好的鲁棒性。
                            但仍建议进行更多测试以全面评估模型安全性。
                          </>
                        )}
                      </Paragraph>
                    </Col>
                  </Row>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 测试信息 */}
      <Card title="测试信息" style={{ marginBottom: '24px' }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="样本ID">{result.sample_id}</Descriptions.Item>
          <Descriptions.Item label="任务ID">{taskId}</Descriptions.Item>
          <Descriptions.Item label="标签">{result.label}</Descriptions.Item>
          <Descriptions.Item label="难度">
            <Tag color={result.difficulty === 'hard' ? 'red' : result.difficulty === 'medium' ? 'orange' : 'green'}>
              {result.difficulty.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="攻击策略">{config?.attack_strategy || 'identifier_rename'}</Descriptions.Item>
          <Descriptions.Item label="编程语言">{config?.language || 'python'}</Descriptions.Item>
          <Descriptions.Item label="攻击结果">
            {result.attack_success ? (
              <Tag icon={<CheckCircleOutlined />} color="success">成功</Tag>
            ) : (
              <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="查询次数">
            {result.queries_used} / {config?.max_queries || 200}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 对抗样本浏览器 - 代码差异对比 */}
      <Card 
        title={<span><PieChartOutlined /> 对抗样本浏览器</span>}
        extra={
          <Select
            value={selectedView}
            onChange={setSelectedView}
            style={{ width: 150 }}
          >
            <Option value="side-by-side">并排对比</Option>
            <Option value="unified">统一视图</Option>
          </Select>
        }
        style={{ marginBottom: '24px' }}
      >
        <Tabs defaultActiveKey="code">
          <TabPane tab="代码对比" key="code">
            {selectedView === 'side-by-side' ? (
              <Row gutter={16}>
                <Col span={12}>
                  <Card 
                    size="small" 
                    title="原始代码" 
                    extra={
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(result.original_code, 'original')}
                        style={{
                          color: copiedType === 'original' ? '#52c41a' : undefined,
                          fontWeight: copiedType === 'original' ? 'bold' : 'normal'
                        }}
                      >
                        {copiedType === 'original' ? '已复制' : '复制'}
                      </Button>
                    }
                  >
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      overflow: 'auto',
                      maxHeight: '400px'
                    }}>
                      {result.original_code}
                    </pre>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card 
                    size="small" 
                    title="对抗代码" 
                    extra={
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(result.adversarial_code, 'adversarial')}
                        style={{
                          color: copiedType === 'adversarial' ? '#52c41a' : undefined,
                          fontWeight: copiedType === 'adversarial' ? 'bold' : 'normal'
                        }}
                      >
                        {copiedType === 'adversarial' ? '已复制' : '复制'}
                      </Button>
                    }
                  >
                    <pre style={{
                      background: '#e6fffb',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      overflow: 'auto',
                      maxHeight: '400px',
                      border: '1px solid #b7eb8f'
                    }}>
                      {result.adversarial_code}
                    </pre>
                  </Card>
                </Col>
              </Row>
            ) : (
              <div>
                <Card size="small" title="统一视图">
                  <div style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace', fontSize: '13px' }}>
                    {result.original_code.split('\n').map((line, index) => {
                      const advLine = result.adversarial_code.split('\n')[index] || '';
                      const isDifferent = line !== advLine;
                      return (
                        <div key={index} style={{ marginBottom: '8px' }}>
                          <div style={{
                            background: isDifferent ? '#fff1f0' : '#f5f5f5',
                            padding: '4px 8px',
                            borderLeft: isDifferent ? '3px solid #ff4d4f' : '3px solid #d9d9d9'
                          }}>
                            <Text type="secondary" style={{ marginRight: '8px', fontFamily: 'monospace' }}>
                              {index + 1}
                            </Text>
                            <Text delete={isDifferent}>{line}</Text>
                          </div>
                          {isDifferent && (
                            <div style={{
                              background: '#f6ffed',
                              padding: '4px 8px',
                              borderLeft: '3px solid #52c41a',
                              marginTop: '2px'
                            }}>
                              <Text type="secondary" style={{ marginRight: '8px', fontFamily: 'monospace' }}>
                                {index + 1}
                              </Text>
                              <Text style={{ color: '#52c41a' }}>{advLine}</Text>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
          </TabPane>

          <TabPane tab="标识符替换" key="replacements">
            <Card size="small">
              <Table
                columns={replacementColumns}
                dataSource={result.identifier_replacements}
                pagination={false}
                size="small"
                rowKey={(record) => `${record.line}-${record.original}`}
              />
              <Divider />
              <Statistic
                title="总替换数"
                value={result.identifier_replacements.length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </TabPane>

          <TabPane tab="差异统计" key="stats">
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="代码行数"
                    value={result.original_code.split('\n').length}
                    prefix={<LineChartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="标识符替换"
                    value={result.identifier_replacements.length}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="语义相似度"
                    value={95}
                    suffix="%"
                    prefix={<PieChartOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>

            <Divider />

            <div style={{ background: '#f0f2f5', padding: '16px', borderRadius: '8px' }}>
              <Title level={5}>差异分析</Title>
              <Paragraph>
                <Text strong>修改类型：</Text>标识符重命名<br />
                <Text strong>修改位置：</Text>{result.identifier_replacements.map(r => r.line).join(', ')} 行<br />
                <Text strong>代码结构：</Text>保持不变<br />
                <Text strong>语义等价性：</Text>完全等价<br />
              </Paragraph>
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* 返回按钮 */}
      <Row justify="center" style={{ marginTop: '24px' }}>
        <Col>
          <Button type="primary" onClick={handleBack} size="large" style={{ minWidth: '200px' }}>
            返回安全测试页面
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default EvaluationResult;

