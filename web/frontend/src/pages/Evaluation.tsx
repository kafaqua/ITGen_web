import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  message, 
  Space, 
  Typography, 
  Row, 
  Col,
  Progress,
  Alert,
  Divider,
  Table,
  Tag,
  Statistic,
  Tabs,
  List,
  Badge,
  Tooltip
} from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  FileTextOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import ApiService from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface TestCase {
  id: string;
  name: string;
  description: string;
  input: string;
  expected_output: string;
  category: 'boundary' | 'edge' | 'malicious' | 'noise' | 'adversarial';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

interface EvaluationResult {
  overall_score: number;
  robustness_score: number;
  accuracy_score: number;
  stability_score: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  critical_failures: number;
  // 关键指标
  asr: number; // 攻击成功率 (Attack Success Rate)
  ami: number; // 平均模型调用次数 (Average Model Invocations)
  art: number; // 平均运行时间 (Average Running Time)
  identifier_replacements: number; // 替换标识符数量
  code_differences: any[]; // 代码差异对比
  test_results: TestCase[];
  recommendations: string[];
  report_url?: string;
}

const Evaluation: React.FC = () => {
  const [form] = Form.useForm();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluationRunning, setEvaluationRunning] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState<string>('');

  useEffect(() => {
    fetchModels();
    initializeTestCases();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await ApiService.getModels();
      if (response.success) {
        setModels(response.data);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const initializeTestCases = () => {
    const defaultTestCases: TestCase[] = [
      {
        id: 'boundary_1',
        name: '边界值测试 - 空输入',
        description: '测试模型对空输入的处理能力',
        input: '',
        expected_output: 'error_handling',
        category: 'boundary',
        severity: 'medium',
        status: 'pending'
      },
      {
        id: 'edge_1',
        name: '边界值测试 - 超长输入',
        description: '测试模型对超长输入的处理能力',
        input: 'x'.repeat(10000),
        expected_output: 'truncation_or_error',
        category: 'edge',
        severity: 'high',
        status: 'pending'
      },
      {
        id: 'malicious_1',
        name: '恶意输入测试 - SQL注入',
        description: '测试模型对SQL注入攻击的防护能力',
        input: "'; DROP TABLE users; --",
        expected_output: 'safe_handling',
        category: 'malicious',
        severity: 'critical',
        status: 'pending'
      },
      {
        id: 'noise_1',
        name: '噪声测试 - 随机字符',
        description: '测试模型对随机噪声的鲁棒性',
        input: 'asdfghjklqwertyuiop',
        expected_output: 'error_or_ignore',
        category: 'noise',
        severity: 'low',
        status: 'pending'
      },
      {
        id: 'adversarial_1',
        name: '对抗样本测试 - 同义词替换',
        description: '测试模型对同义词替换的鲁棒性',
        input: 'def function_name(): return "hello"',
        expected_output: 'similar_behavior',
        category: 'adversarial',
        severity: 'medium',
        status: 'pending'
      }
    ];
    setTestCases(defaultTestCases);
  };

  const handleStartEvaluation = async (values: any) => {
    setLoading(true);
    setEvaluationRunning(true);
    
    try {
      const response = await ApiService.startEvaluation({
        ...values,
        test_cases: testCases
      });
      
      if (response.success) {
        const taskId = response.task_id;
        setCurrentTaskId(taskId);
        setTaskStatus('鲁棒性评估已启动');
        setTaskProgress(10);
        
        message.success('鲁棒性评估已启动');
        
        // 模拟进度更新
        simulateProgress(taskId);
      } else {
        message.error(response.error || '评估启动失败');
        setEvaluationRunning(false);
      }
    } catch (error) {
      message.error('评估启动失败');
      console.error('Error starting evaluation:', error);
      setEvaluationRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const simulateProgress = (taskId: string) => {
    let progress = 10;
    const interval = setInterval(() => {
      progress += Math.random() * 12;
      if (progress >= 100) {
        progress = 100;
        setTaskStatus('鲁棒性评估完成');
        setEvaluationRunning(false);
        clearInterval(interval);
        
        // 模拟评估结果
        setTimeout(() => {
          generateMockResults();
        }, 1000);
      } else {
        setTaskProgress(Math.min(progress, 95));
        setTaskStatus(`鲁棒性评估进行中... ${Math.round(progress)}%`);
      }
    }, 2500);
  };

  const generateMockResults = () => {
    const total = testCases.length;
    const passed = Math.floor(total * 0.7);
    const failed = total - passed;
    const critical = Math.floor(failed * 0.3);
    
    const results: EvaluationResult = {
      overall_score: 75 + Math.random() * 20,
      robustness_score: 70 + Math.random() * 25,
      accuracy_score: 80 + Math.random() * 15,
      stability_score: 75 + Math.random() * 20,
      total_tests: total,
      passed_tests: passed,
      failed_tests: failed,
      critical_failures: critical,
      // 关键指标
      asr: 0.3 + Math.random() * 0.4, // 攻击成功率 30%-70%
      ami: 50 + Math.random() * 100, // 平均模型调用次数 50-150
      art: 2.0 + Math.random() * 3.0, // 平均运行时间 2-5秒
      identifier_replacements: Math.floor(Math.random() * 10) + 1, // 替换标识符数量 1-10
      code_differences: [
        {
          type: 'identifier_replacement',
          original: 'function_name',
          adversarial: 'func_name',
          line: 1
        },
        {
          type: 'variable_rename',
          original: 'user_input',
          adversarial: 'input_data',
          line: 3
        }
      ],
      test_results: testCases.map((testCase, index) => ({
        ...testCase,
        status: index < passed ? 'completed' : 'failed',
        result: index < passed ? {
          success: true,
          confidence: 0.8 + Math.random() * 0.2,
          response_time: 1.0 + Math.random() * 2,
          actual_output: '符合预期'
        } : {
          success: false,
          confidence: 0.3 + Math.random() * 0.4,
          response_time: 0.5 + Math.random() * 1,
          actual_output: '不符合预期'
        },
        error: index >= passed ? '测试失败' : undefined
      })),
      recommendations: [
        '建议增加对空输入的边界值处理',
        '需要改进对恶意输入的防护机制',
        '考虑增加输入长度限制和验证',
        '建议添加更多的对抗样本训练数据'
      ]
    };
    
    setEvaluationResult(results);
    message.success('鲁棒性评估结果已生成');
  };

  const handleStopEvaluation = () => {
    setEvaluationRunning(false);
    setTaskProgress(0);
    setTaskStatus('');
    setCurrentTaskId(null);
    message.info('鲁棒性评估已停止');
  };

  const downloadReport = () => {
    if (!evaluationResult) return;
    
    const reportContent = `
鲁棒性评估报告
================

总体评分: ${evaluationResult.overall_score.toFixed(1)}/100
鲁棒性评分: ${evaluationResult.robustness_score.toFixed(1)}/100
准确性评分: ${evaluationResult.accuracy_score.toFixed(1)}/100
稳定性评分: ${evaluationResult.stability_score.toFixed(1)}/100

测试统计:
- 总测试数: ${evaluationResult.total_tests}
- 通过测试: ${evaluationResult.passed_tests}
- 失败测试: ${evaluationResult.failed_tests}
- 严重失败: ${evaluationResult.critical_failures}

建议:
${evaluationResult.recommendations.map(rec => `- ${rec}`).join('\n')}
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `robustness_evaluation_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      critical: 'purple'
    };
    return colors[severity as keyof typeof colors];
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      boundary: <InfoCircleOutlined />,
      edge: <WarningOutlined />,
      malicious: <CloseCircleOutlined />,
      noise: <FileTextOutlined />,
      adversarial: <BarChartOutlined />
    };
    return icons[category as keyof typeof icons];
  };

  const columns = [
    {
      title: '测试用例',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: TestCase) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {getCategoryIcon(record.category)} {record.category}
          </div>
        </div>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'default', text: '等待中' },
          running: { color: 'processing', text: '运行中' },
          completed: { color: 'success', text: '通过' },
          failed: { color: 'error', text: '失败' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '结果',
      key: 'result',
      width: 100,
      render: (_: any, record: TestCase) => {
        if (record.status === 'completed') {
          return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        } else if (record.status === 'failed') {
          return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
        }
        return '-';
      },
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        鲁棒性评估
      </Title>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="评估配置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleStartEvaluation}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="model_id"
                    label="目标模型"
                    rules={[{ required: true, message: '请选择目标模型' }]}
                  >
                    <Select placeholder="请选择目标模型">
                      {models.map(model => (
                        <Option key={model.id} value={model.id}>
                          {model.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="evaluation_type"
                    label="评估类型"
                    rules={[{ required: true, message: '请选择评估类型' }]}
                    initialValue="comprehensive"
                  >
                    <Select placeholder="请选择评估类型">
                      <Option value="comprehensive">综合评估</Option>
                      <Option value="boundary">边界值测试</Option>
                      <Option value="adversarial">对抗样本测试</Option>
                      <Option value="security">安全性测试</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="language"
                    label="编程语言"
                    rules={[{ required: true, message: '请选择编程语言' }]}
                    initialValue="python"
                  >
                    <Select placeholder="请选择编程语言">
                      <Option value="python">Python</Option>
                      <Option value="java">Java</Option>
                      <Option value="c">C/C++</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="test_intensity"
                    label="测试强度"
                    initialValue="medium"
                  >
                    <Select placeholder="请选择测试强度">
                      <Option value="low">低强度</Option>
                      <Option value="medium">中等强度</Option>
                      <Option value="high">高强度</Option>
                      <Option value="extreme">极限测试</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                <Space size="large">
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                    disabled={evaluationRunning}
                    icon={<PlayCircleOutlined />}
                    size="large"
                  >
                    开始鲁棒性评估
                  </Button>
                  {evaluationRunning && (
                    <Button 
                      danger
                      onClick={handleStopEvaluation}
                      icon={<StopOutlined />}
                      size="large"
                    >
                      停止评估
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Card title="评估说明" style={{ marginTop: '16px' }}>
            <Row gutter={24}>
              <Col span={8}>
                <div>
                  <h4>评估维度</h4>
                  <ul>
                    <li><strong>鲁棒性:</strong> 对异常输入的抵抗能力</li>
                    <li><strong>准确性:</strong> 在正常输入下的表现</li>
                    <li><strong>稳定性:</strong> 输出的一致性和可靠性</li>
                  </ul>
                </div>
              </Col>
              <Col span={8}>
                <div>
                  <h4>测试类型</h4>
                  <ul>
                    <li><strong>边界值测试:</strong> 空输入、极值等</li>
                    <li><strong>对抗样本测试:</strong> 同义词替换、语法变换等</li>
                    <li><strong>安全性测试:</strong> 恶意输入、注入攻击等</li>
                    <li><strong>噪声测试:</strong> 随机字符、格式错误等</li>
                  </ul>
                </div>
              </Col>
              <Col span={8}>
                <div>
                  <h4>关键指标说明</h4>
                  <ul>
                    <li><strong>ASR (攻击成功率):</strong> 对抗样本成功欺骗模型的比例，数值越高表示模型防御能力越弱</li>
                    <li><strong>AMI (平均模型调用次数):</strong> 生成对抗样本所需的平均查询次数，反映攻击效率</li>
                    <li><strong>ART (平均运行时间):</strong> 单次攻击的平均耗时，用于评估攻击成本</li>
                  </ul>
                </div>
              </Col>
            </Row>
          </Card>

          {evaluationResult && (
            <Card title="评估结果" style={{ marginTop: '16px' }}>
              <Tabs defaultActiveKey="overview">
                <TabPane tab="概览" key="overview">
                  <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={6}>
                      <Statistic 
                        title="总体评分" 
                        value={evaluationResult.overall_score} 
                        precision={1}
                        suffix="/100"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="鲁棒性评分" 
                        value={evaluationResult.robustness_score} 
                        precision={1}
                        suffix="/100"
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="准确性评分" 
                        value={evaluationResult.accuracy_score} 
                        precision={1}
                        suffix="/100"
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="稳定性评分" 
                        value={evaluationResult.stability_score} 
                        precision={1}
                        suffix="/100"
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Col>
                  </Row>

                  <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={6}>
                      <Statistic 
                        title="攻击成功率(ASR)" 
                        value={evaluationResult.asr * 100} 
                        precision={1}
                        suffix="%"
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="平均模型调用次数(AMI)" 
                        value={evaluationResult.ami} 
                        precision={0}
                        valueStyle={{ color: '#13c2c2' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="平均运行时间(ART)" 
                        value={evaluationResult.art} 
                        precision={2}
                        suffix="秒"
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="标识符替换数" 
                        value={evaluationResult.identifier_replacements} 
                        precision={0}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                  </Row>

                  <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={6}>
                      <Statistic title="总测试数" value={evaluationResult.total_tests} />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="通过测试" 
                        value={evaluationResult.passed_tests} 
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="失败测试" 
                        value={evaluationResult.failed_tests} 
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="严重失败" 
                        value={evaluationResult.critical_failures} 
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </Col>
                  </Row>

                  <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={downloadReport}
                    >
                      下载评估报告
                    </Button>
                  </div>
                </TabPane>

                <TabPane tab="详细结果" key="details">
                  <Table
                    columns={columns}
                    dataSource={evaluationResult.test_results}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    expandable={{
                      expandedRowRender: (record) => (
                        <div>
                          <Paragraph><strong>描述:</strong> {record.description}</Paragraph>
                          <Paragraph><strong>输入:</strong> <Text code>{record.input}</Text></Paragraph>
                          <Paragraph><strong>期望输出:</strong> {record.expected_output}</Paragraph>
                          {record.result && (
                            <Paragraph><strong>实际输出:</strong> {record.result.actual_output}</Paragraph>
                          )}
                          {record.error && (
                            <Paragraph><strong>错误信息:</strong> <Text type="danger">{record.error}</Text></Paragraph>
                          )}
                        </div>
                      ),
                    }}
                  />
                </TabPane>

                <TabPane tab="建议" key="recommendations">
                  <List
                    dataSource={evaluationResult.recommendations}
                    renderItem={(item, index) => (
                      <List.Item>
                        <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
                        <div style={{ marginLeft: '16px' }}>
                          <Text>{item}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </TabPane>

                <TabPane tab="代码差异对比" key="code_diff">
                  <div>
                    <Row gutter={16} style={{ marginBottom: '16px' }}>
                      <Col span={12}>
                        <Card size="small" title="原始代码">
                          <div style={{ 
                            background: '#f8f9fa', 
                            border: '1px solid #e9ecef',
                            borderRadius: '4px',
                            padding: '12px',
                            fontSize: '12px',
                            lineHeight: '1.6',
                            maxHeight: '300px',
                            overflow: 'auto',
                            fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                          }}>
                            {evaluationResult.code_differences.length > 0 ? (
                              <div>
                                <div style={{ color: '#6f42c1', fontWeight: 'bold' }}>def <span style={{ color: '#e83e8c' }}>function_name</span>():</div>
                                <div style={{ marginLeft: '20px', color: '#6c757d' }}>user_input = input("Enter data: ")</div>
                                <div style={{ marginLeft: '20px', color: '#6c757d' }}>result = process_data(user_input)</div>
                                <div style={{ marginLeft: '20px', color: '#6c757d' }}>return result</div>
                              </div>
                            ) : (
                              '暂无代码差异数据'
                            )}
                          </div>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small" title="对抗样本代码">
                          <div style={{ 
                            background: '#f8f9fa', 
                            border: '1px solid #e9ecef',
                            borderRadius: '4px',
                            padding: '12px',
                            fontSize: '12px',
                            lineHeight: '1.6',
                            maxHeight: '300px',
                            overflow: 'auto',
                            fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                          }}>
                            {evaluationResult.code_differences.length > 0 ? (
                              <div>
                                <div style={{ color: '#6f42c1', fontWeight: 'bold' }}>def <span style={{ color: '#e83e8c', background: '#fff3cd', padding: '1px 2px', borderRadius: '2px' }}>func_name</span>():</div>
                                <div style={{ marginLeft: '20px', color: '#6c757d' }}>input_data = input("Enter data: ")</div>
                                <div style={{ marginLeft: '20px', color: '#6c757d' }}>result = process_data(input_data)</div>
                                <div style={{ marginLeft: '20px', color: '#6c757d' }}>return result</div>
                              </div>
                            ) : (
                              '暂无代码差异数据'
                            )}
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    <Card size="small" title="差异统计" style={{ marginBottom: '16px' }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic 
                            title="标识符替换数量" 
                            value={evaluationResult.identifier_replacements}
                            valueStyle={{ color: '#1890ff' }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic 
                            title="代码行数变化" 
                            value={0}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic 
                            title="语法结构变化" 
                            value={evaluationResult.code_differences.length}
                            valueStyle={{ color: '#faad14' }}
                          />
                        </Col>
                      </Row>
                      
                      <div style={{ marginTop: '16px' }}>
                        <Text strong>差异类型分布：</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Tag color="blue" style={{ marginRight: '8px', marginBottom: '4px' }}>
                            标识符替换 {evaluationResult.identifier_replacements}
                          </Tag>
                          <Tag color="green" style={{ marginRight: '8px', marginBottom: '4px' }}>
                            变量重命名 {Math.floor(evaluationResult.identifier_replacements * 0.6)}
                          </Tag>
                          <Tag color="orange" style={{ marginRight: '8px', marginBottom: '4px' }}>
                            函数名修改 {Math.floor(evaluationResult.identifier_replacements * 0.4)}
                          </Tag>
                        </div>
                      </div>
                    </Card>

                    <Card size="small" title="详细差异分析">
                      <List
                        dataSource={evaluationResult.code_differences}
                        renderItem={(item, index) => (
                          <List.Item>
                            <div style={{ width: '100%' }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '12px'
                              }}>
                                <Text strong style={{ fontSize: '14px' }}>差异 #{index + 1}</Text>
                                <Tag color="blue" style={{ fontSize: '12px' }}>{item.type}</Tag>
                              </div>
                              
                              <div style={{ 
                                background: '#f8f9fa', 
                                border: '1px solid #e9ecef',
                                borderRadius: '6px',
                                padding: '12px',
                                fontSize: '12px',
                                fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                              }}>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  marginBottom: '8px',
                                  padding: '4px 8px',
                                  background: '#fff5f5',
                                  borderRadius: '4px',
                                  border: '1px solid #fed7d7'
                                }}>
                                  <Text type="danger" strong style={{ marginRight: '8px' }}>原始:</Text>
                                  <Text code style={{ 
                                    background: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    color: '#e53e3e'
                                  }}>
                                    {item.original}
                                  </Text>
                                </div>
                                
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  marginBottom: '8px',
                                  padding: '4px 8px',
                                  background: '#f0fff4',
                                  borderRadius: '4px',
                                  border: '1px solid #c6f6d5'
                                }}>
                                  <Text type="success" strong style={{ marginRight: '8px' }}>对抗:</Text>
                                  <Text code style={{ 
                                    background: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    color: '#38a169'
                                  }}>
                                    {item.adversarial}
                                  </Text>
                                </div>
                                
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  color: '#666',
                                  fontSize: '11px'
                                }}>
                                  <span>行号: {item.line}</span>
                                  <span>影响程度: 中等</span>
                                </div>
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    </Card>
                  </div>
                </TabPane>
              </Tabs>
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card title="评估状态">
            {evaluationRunning ? (
              <div>
                <Progress 
                  percent={taskProgress} 
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Alert
                    message={taskStatus}
                    type="info"
                    showIcon
                  />
                </div>
                {currentTaskId && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
                    任务ID: {currentTaskId}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <PlayCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>暂无运行中的评估任务</div>
              </div>
            )}
          </Card>

          <Card title="测试用例" style={{ marginTop: '16px' }}>
            <List
              dataSource={testCases}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>{item.name}</Text>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {getCategoryIcon(item.category)} {item.category}
                        </div>
                      </div>
                      <Tag color={getSeverityColor(item.severity)}>
                        {item.severity}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              )}
            />
      </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Evaluation;
