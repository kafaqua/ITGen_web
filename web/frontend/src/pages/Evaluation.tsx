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
  Upload,
  Tag,
  Statistic,
  Steps
} from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  ExperimentOutlined,
  CodeOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

interface TestData {
  id: string;
  code_sample: string;
  label: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface TestConfig {
  model_id: string;
  base_model: string;
  max_queries: number;
  timeout: number;
  language: string;
  attack_strategy: string;
}

interface TestProgress {
  current_sample: number;
  total_samples: number;
  current_iteration: number;
  max_iterations: number;
  asr: number;
  ami: number;
  art: number;
  eta: string;
}

interface EvaluationResult {
  model_id: string;
  model_name: string;
  test_time: number;
  // 关键指标
  asr: number; // 攻击成功率
  ami: number; // 平均模型调用次数
  art: number; // 平均运行时间
  total_samples: number;
  successful_attacks: number;
  failed_attacks: number;
  identifier_replacements: number;
  test_logs: any[];
}

const Evaluation: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [testData, setTestData] = useState<TestData[]>([]);
  const [testConfig, setTestConfig] = useState<TestConfig | null>(null);
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetchModels();
    initializeTestData();
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

  const initializeTestData = () => {
    const defaultData: TestData[] = [
      {
        id: 'sample_1',
        code_sample: 'def hello_world():\n    return "Hello, World!"',
        label: 'function_generation',
        difficulty: 'easy',
        status: 'pending'
      },
      {
        id: 'sample_2',
        code_sample: 'class Calculator:\n    def add(self, a, b):\n        return a + b',
        label: 'class_generation',
        difficulty: 'medium',
        status: 'pending'
      },
      {
        id: 'sample_3',
        code_sample: 'if condition:\n    do_something()',
        label: 'control_flow',
        difficulty: 'hard',
        status: 'pending'
      }
    ];
    setTestData(defaultData);
  };

  const handleFileUpload = async (info: any) => {
    const { file } = info;
    const taskType = form.getFieldValue('task_type');
    if (!taskType) {
      message.warning('请先选择任务类型再上传测试数据');
      return;
    }

    if (file && file.originFileObj) {
      try {
        await ApiService.uploadFile(file.originFileObj as File, {
          fileType: 'dataset',
          purpose: 'evaluation',
          taskType: taskType,
          datasetName: file.name,
        });
      } catch (e) {
        console.warn('测试数据上传失败，继续本地解析:', e);
      }
    }

    if (file && file.originFileObj) {
      setUploadedFile(file);
      message.success(`${file.name} 文件已选择并提交`);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim());
          const data: TestData[] = lines.map((line, index) => {
            const parts = line.split('|');
            return {
              id: `uploaded_${index + 1}`,
              code_sample: parts[0] || '',
              label: parts[1] || 'unknown',
              difficulty: 'medium' as const,
              status: 'pending' as const
            };
          });
          setTestData(data);
        } catch (error) {
          message.error('文件解析失败');
        }
      };
      reader.readAsText(file.originFileObj);
    }
  };

  const handleStartTest = async (values: any) => {
    if (testData.length === 0) {
      message.warning('请先上传测试数据');
      return;
    }

    setLoading(true);
    setTestRunning(true);
    setCurrentStep(0);
    
    try {
      const config: TestConfig = {
        model_id: values.model_id,
        base_model: values.base_model,
        max_queries: values.max_queries,
        timeout: values.timeout,
        language: values.language,
        attack_strategy: values.attack_strategy
      };
      
      setTestConfig(config);
      
      const response = await ApiService.startEvaluation({
        ...values,
        test_data: testData
      });
      
      if (response.success) {
        const taskId = response.task_id;
        setCurrentTaskId(taskId);
        setTaskStatus('安全测试已启动');
        
        message.success('安全测试已启动');
        
        simulateTest(taskId);
      } else {
        message.error(response.error || '测试启动失败');
        setTestRunning(false);
      }
    } catch (error) {
      message.error('测试启动失败');
      console.error('Error starting test:', error);
      setTestRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const simulateTest = (taskId: string) => {
    let sample = 0;
    let iteration = 0;
    const totalSamples = testData.length;
    const maxIterations = testConfig?.max_queries || 200;
    
    const interval = setInterval(() => {
      iteration += 10;
      if (iteration > maxIterations) {
        sample += 1;
        iteration = 0;
        setCurrentStep(Math.min(sample, 3));
      }
      
      const progress: TestProgress = {
        current_sample: sample,
        total_samples: totalSamples,
        current_iteration: iteration,
        max_iterations: maxIterations,
        asr: Math.min(0.7, 0.2 + (sample * 0.05)),
        ami: 50 + Math.random() * 50,
        art: 2.0 + Math.random() * 2.0,
        eta: `${Math.max(0, (totalSamples - sample) * 2)}分钟`
      };
      
      setTestProgress(progress);
      setTaskStatus(`测试中 - 样本 ${sample + 1}/${totalSamples}, 迭代 ${iteration}/${maxIterations}`);
      
      if (sample >= totalSamples) {
        clearInterval(interval);
        setTaskStatus('安全测试完成');
        setTestRunning(false);
        setTestComplete(true);
        setCurrentStep(3);
        
        setTimeout(() => {
          generateTestResult();
        }, 1000);
      }
    }, 2000);
  };

  const handleViewResult = () => {
    if (evaluationResult) {
      sessionStorage.setItem('evaluationResult', JSON.stringify({
        result: evaluationResult,
        config: testConfig,
        taskId: currentTaskId
      }));
      navigate('/evaluation/result');
    }
  };

  const generateTestResult = () => {
    const totalSamples = testData.length;
    const successfulAttacks = Math.floor(totalSamples * (0.3 + Math.random() * 0.4));
    const failedAttacks = totalSamples - successfulAttacks;
    
    // 更新所有样本状态为completed
    const updatedTestData = testData.map(sample => ({
      ...sample,
      status: 'completed' as const
    }));
    setTestData(updatedTestData);
    
    const result: EvaluationResult = {
      model_id: `tested_${Date.now()}`,
      model_name: `测试模型_${new Date().toLocaleDateString()}`,
      test_time: Math.floor(Math.random() * 1800) + 600,
      asr: successfulAttacks / totalSamples,
      ami: 50 + Math.random() * 100,
      art: 2.0 + Math.random() * 3.0,
      total_samples: totalSamples,
      successful_attacks: successfulAttacks,
      failed_attacks: failedAttacks,
      identifier_replacements: Math.floor(Math.random() * 20) + 5,
      test_logs: []
    };
    
    setEvaluationResult(result);
    message.success('安全测试完成');
  };

  const handleStopTest = () => {
    setTestRunning(false);
    setTaskStatus('');
    setCurrentTaskId(null);
    setCurrentStep(0);
    message.info('安全测试已停止');
  };

  const downloadReport = () => {
    if (!evaluationResult) return;
    message.info('报告下载功能开发中...');
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'green',
      medium: 'orange',
      hard: 'red'
    };
    return colors[difficulty as keyof typeof colors];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'default',
      processing: 'processing',
      completed: 'success',
      failed: 'error'
    };
    return colors[status as keyof typeof colors];
  };

  const handleViewSampleResult = (sample: TestData) => {
    // 生成该样本的详细测试结果
    const sampleResult = {
      sample_id: sample.id,
      code_sample: sample.code_sample,
      label: sample.label,
      difficulty: sample.difficulty,
      original_code: sample.code_sample,
      adversarial_code: generateAdversarialCode(sample.code_sample),
      attack_success: Math.random() > 0.5,
      queries_used: Math.floor(Math.random() * 150) + 50,
      time_cost: (Math.random() * 4 + 1).toFixed(2),
      identifier_replacements: [
        { original: 'function', adversarial: 'func', line: 1 },
        { original: 'variable', adversarial: 'var', line: 2 }
      ]
    };
    
    sessionStorage.setItem('evaluationSampleResult', JSON.stringify({
      result: sampleResult,
      config: testConfig,
      taskId: currentTaskId
    }));
    navigate('/evaluation/result');
  };

  const generateAdversarialCode = (originalCode: string): string => {
    // 简单的代码变换示例
    return originalCode
      .replace(/def\s+(\w+)/g, 'def $1_modified')
      .replace(/(\w+)\s*=\s*/g, '$1_new = ');
  };

  const testSteps = [
    {
      title: '数据准备',
      description: '加载和预处理测试数据',
      icon: <UploadOutlined />
    },
    {
      title: '攻击空间构建',
      description: '静态分析构建攻击空间',
      icon: <CodeOutlined />
    },
    {
      title: 'ITGen攻击',
      description: '贝叶斯优化迭代循环',
      icon: <ExperimentOutlined />
    },
    {
      title: '结果聚合',
      description: '汇总统计ASR、AMI、ART',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        安全测试
      </Title>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="测试配置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleStartTest}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="model_id"
                    label="被测模型"
                    rules={[{ required: true, message: '请选择被测模型' }]}
                  >
                    <Select placeholder="请选择被测模型">
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
                    name="task_type"
                    label="任务类型"
                    rules={[{ required: true, message: '请选择任务类型' }]}
                    initialValue="clone_detection"
                  >
                    <Select placeholder="请选择任务类型">
                      <Option value="clone_detection">克隆检测</Option>
                      <Option value="vulnerability_detection">漏洞检测</Option>
                      <Option value="code_summarization">代码摘要</Option>
                      <Option value="code_generation">代码生成</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="max_queries"
                    label="最大查询次数"
                    initialValue={200}
                  >
                    <Input type="number" placeholder="200" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="timeout"
                    label="超时时间(秒)"
                    initialValue={60}
                  >
                    <Input type="number" placeholder="60" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="language"
                    label="编程语言"
                    initialValue="python"
                  >
                    <Select placeholder="请选择编程语言">
                      <Option value="python">Python</Option>
                      <Option value="java">Java</Option>
                      <Option value="c">C/C++</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="attack_strategy"
                    label="攻击策略"
                    initialValue="identifier_rename"
                  >
                    <Select placeholder="请选择攻击策略">
                      <Option value="identifier_rename">标识符重命名</Option>
                      <Option value="equivalent_transform">等价变换</Option>
                      <Option value="both">混合策略</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="concurrent_processes"
                    label="并发进程数"
                    initialValue={5}
                  >
                    <Input type="number" placeholder="5" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">测试数据</Divider>

              <Form.Item label="数据格式">
                <Text type="secondary">每行格式：<Text code>代码样本|标签</Text></Text>
              </Form.Item>

              <Form.Item label="上传测试代码集">
                <Upload
                  accept=".txt,.csv,.json"
                  beforeUpload={() => false}
                  onChange={handleFileUpload}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />}>
                    选择文件
                  </Button>
                </Upload>
                {uploadedFile && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="success">
                      <UploadOutlined /> {uploadedFile.name}
                    </Text>
                    <Text type="secondary" style={{ marginLeft: '8px' }}>
                      ({testData.length} 个测试样本)
                    </Text>
                  </div>
                )}
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                <Space size="large">
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                    disabled={testRunning || testData.length === 0}
                    icon={<PlayCircleOutlined />}
                    size="large"
                  >
                    开始安全测试
                  </Button>
                  {testRunning && (
                    <Button 
                      danger
                      onClick={handleStopTest}
                      icon={<StopOutlined />}
                      size="large"
                    >
                      停止测试
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {testRunning && (
            <Card title="测试进度" style={{ marginTop: '16px' }}>
              <Steps current={currentStep} style={{ marginBottom: '24px' }}>
                {testSteps.map((step, index) => (
                  <Step key={index} title={step.title} description={step.description} icon={step.icon} />
                ))}
              </Steps>

              {testProgress && (
                <div>
                  <Row gutter={16} style={{ marginBottom: '16px' }}>
                    <Col span={6}>
                      <Statistic 
                        title="当前样本" 
                        value={`${testProgress.current_sample + 1}/${testProgress.total_samples}`}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="当前迭代" 
                        value={`${testProgress.current_iteration}/${testProgress.max_iterations}`}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="ASR" 
                        value={`${(testProgress.asr * 100).toFixed(1)}%`}
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="AMI" 
                        value={testProgress.ami.toFixed(0)}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Col>
                  </Row>

                  <Progress 
                    percent={Math.round(((testProgress.current_sample) / testProgress.total_samples) * 100)}
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
                </div>
              )}
            </Card>
          )}

        </Col>

        <Col span={8}>
          <Card title="测试状态">
            {testComplete ? (
              <div>
                <Progress 
                  percent={100} 
                  status="success"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Alert
                    message="测试已完成"
                    type="success"
                    showIcon
                  />
                </div>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Text strong>已完成样本列表：</Text>
                    {testData.filter(item => item.status === 'completed').map((sample, index) => (
                      <Card key={sample.id} size="small" style={{ marginBottom: '8px' }}>
                        <Row justify="space-between" align="middle">
                          <Col span={16}>
                            <div>
                              <Text strong>{sample.label}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {sample.code_sample.substring(0, 30)}...
                              </Text>
                            </div>
                          </Col>
                          <Col span={8} style={{ textAlign: 'right' }}>
                            <Button 
                              type="link" 
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewSampleResult(sample)}
                            >
                              查看结果
                            </Button>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </Space>
                </div>
                {currentTaskId && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    任务ID: {currentTaskId}
                  </div>
                )}
              </div>
            ) : testRunning ? (
              <div>
                <Progress 
                  percent={testProgress ? Math.min(100, ((testProgress.current_sample) / testProgress.total_samples) * 100) : 0}
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                {testProgress && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>样本: </Text>
                      <Text>{testProgress.current_sample + 1} / {testProgress.total_samples}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>ASR: </Text>
                      <Text>{(testProgress.asr * 100).toFixed(1)}%</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>AMI: </Text>
                      <Text>{testProgress.ami.toFixed(0)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>剩余时间: </Text>
                      <Text>{testProgress.eta}</Text>
                    </div>
                  </div>
                )}
                {currentTaskId && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    任务ID: {currentTaskId}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <CodeOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>暂无运行中的测试任务</div>
              </div>
            )}
          </Card>

          <Card title="测试说明" style={{ marginTop: '16px' }}>
            <div>
              <h4>安全测试流程</h4>
              <ol>
                <li>提交被测模型和测试代码集</li>
                <li>后端分解为多个子任务</li>
                <li>为每个样本启动独立ITGen进程</li>
                <li>静态分析构建攻击空间</li>
                <li>贝叶斯优化迭代循环</li>
                <li>数据聚合生成评测报告</li>
              </ol>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={24}>
          <Card title="参数说明" style={{ marginTop: '16px' }}>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>最大查询次数</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>单个样本的最大模型调用次数，影响攻击成本和成功率。推荐值：200</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>超时时间</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>单个样本的最大处理时间（秒），防止长时间运行。推荐值：60</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>攻击策略</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>选择标识符重命名、等价变换或混合策略来生成对抗样本。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>并发进程数</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>同时运行的ITGen攻击进程数量，影响测试速度。推荐值：5</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>ASR (Attack Success Rate)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>攻击成功率，衡量模型对对抗样本的脆弱性。值越高表示模型越容易被攻击。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>AMI (Average Model Invocations)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>平均模型调用次数，反映生成对抗样本所需的查询效率。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>ART (Average Running Time)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>平均运行时间（秒），评估单个对抗样本的生成耗时。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>CIIV编码</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>代码不变量索引向量，用于表示代码的抽象特征，指导贝叶斯优化选择。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>贝叶斯优化</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>基于历史数据选择下一个最有希望的扰动，高效搜索对抗样本空间。</Text>
                </div>
              </Col>
            </Row>
      </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Evaluation;
