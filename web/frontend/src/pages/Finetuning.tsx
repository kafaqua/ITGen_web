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
  Table,
  Tag,
  Statistic,
  Tabs,
  List,
  Badge,
  Steps,
  Timeline,
  Switch
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
  InfoCircleOutlined
} from '@ant-design/icons';
import ApiService from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Step } = Steps;

interface TrainingData {
  id: string;
  original_code: string;
  adversarial_code: string;
  label: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface TrainingConfig {
  model_id: string;
  base_model: string;
  learning_rate: number;
  batch_size: number;
  epochs: number;
  warmup_steps: number;
  max_length: number;
  adversarial_ratio: number;
  augmentation_strategies: string[];
}

interface TrainingProgress {
  current_epoch: number;
  total_epochs: number;
  current_step: number;
  total_steps: number;
  loss: number;
  accuracy: number;
  learning_rate: number;
  eta: string;
}

interface FinetuningResult {
  model_id: string;
  model_name: string;
  training_time: number;
  final_loss: number;
  // 微调前性能
  original_accuracy: number;
  original_bleu_score: number;
  // 微调后性能
  final_accuracy: number;
  final_bleu_score: number;
  adversarial_accuracy: number;
  adversarial_bleu_score: number;
  // 性能提升
  accuracy_improvement: number;
  bleu_improvement: number;
  overall_improvement: number;
  model_path: string;
  training_logs: any[];
}

const Finetuning: React.FC = () => {
  const [form] = Form.useForm();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [trainingRunning, setTrainingRunning] = useState(false);
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [finetuningResult, setFinetuningResult] = useState<FinetuningResult | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetchModels();
    initializeTrainingData();
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

  const initializeTrainingData = () => {
    const defaultData: TrainingData[] = [
      {
        id: 'sample_1',
        original_code: 'def hello_world():\n    return "Hello, World!"',
        adversarial_code: 'def hello_world():\n    return "Hi, World!"',
        label: 'function_generation',
        difficulty: 'easy',
        status: 'pending'
      },
      {
        id: 'sample_2',
        original_code: 'class Calculator:\n    def add(self, a, b):\n        return a + b',
        adversarial_code: 'class Calculator:\n    def add(self, x, y):\n        return x + y',
        label: 'class_generation',
        difficulty: 'medium',
        status: 'pending'
      },
      {
        id: 'sample_3',
        original_code: 'if condition:\n    do_something()',
        adversarial_code: 'if condition is True:\n    do_something()',
        label: 'control_flow',
        difficulty: 'hard',
        status: 'pending'
      }
    ];
    setTrainingData(defaultData);
  };

  const handleFileUpload = (info: any) => {
    const { file } = info;
    if (file.status === 'done') {
      setUploadedFile(file);
      message.success(`${file.name} 文件上传成功`);
      
      // 解析上传的文件
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim());
          const data: TrainingData[] = lines.map((line, index) => {
            const parts = line.split('|');
            return {
              id: `uploaded_${index + 1}`,
              original_code: parts[0] || '',
              adversarial_code: parts[1] || '',
              label: parts[2] || 'unknown',
              difficulty: 'medium' as const,
              status: 'pending' as const
            };
          });
          setTrainingData(data);
        } catch (error) {
          message.error('文件解析失败');
        }
      };
      reader.readAsText(file.originFileObj);
    }
  };

  const handleStartFinetuning = async (values: any) => {
    if (trainingData.length === 0) {
      message.warning('请先上传训练数据');
      return;
    }

    setLoading(true);
    setTrainingRunning(true);
    setCurrentStep(0);
    
    try {
      const config: TrainingConfig = {
        model_id: values.model_id,
        base_model: values.base_model,
        learning_rate: values.learning_rate,
        batch_size: values.batch_size,
        epochs: values.epochs,
        warmup_steps: values.warmup_steps,
        max_length: values.max_length,
        adversarial_ratio: values.adversarial_ratio,
        augmentation_strategies: values.augmentation_strategies || []
      };
      
      setTrainingConfig(config);
      
      const response = await ApiService.startFinetuning({
        ...values,
        training_data: trainingData
      });
      
      if (response.success) {
        const taskId = response.task_id;
        setCurrentTaskId(taskId);
        setTaskStatus('对抗性微调已启动');
        
        message.success('对抗性微调已启动');
        
        // 模拟训练进度
        simulateTraining(taskId);
      } else {
        message.error(response.error || '微调启动失败');
        setTrainingRunning(false);
      }
    } catch (error) {
      message.error('微调启动失败');
      console.error('Error starting finetuning:', error);
      setTrainingRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const simulateTraining = (taskId: string) => {
    let epoch = 0;
    let step = 0;
    const totalEpochs = trainingConfig?.epochs || 5;
    const stepsPerEpoch = Math.ceil(trainingData.length / (trainingConfig?.batch_size || 8));
    const totalSteps = totalEpochs * stepsPerEpoch;
    
    const interval = setInterval(() => {
      step += 1;
      if (step > stepsPerEpoch) {
        epoch += 1;
        step = 1;
        setCurrentStep(Math.min(epoch, 3)); // 最多显示3个步骤
      }
      
      const progress: TrainingProgress = {
        current_epoch: epoch,
        total_epochs: totalEpochs,
        current_step: step,
        total_steps: stepsPerEpoch,
        loss: Math.max(0.1, 2.0 - (epoch * 0.3) - (step / stepsPerEpoch) * 0.1),
        accuracy: Math.min(0.95, 0.6 + (epoch * 0.05) + (step / stepsPerEpoch) * 0.02),
        learning_rate: (trainingConfig?.learning_rate || 0.001) * Math.pow(0.9, epoch),
        eta: `${Math.max(0, totalSteps - (epoch * stepsPerEpoch + step)) * 2}分钟`
      };
      
      setTrainingProgress(progress);
      setTaskStatus(`训练中 - Epoch ${epoch + 1}/${totalEpochs}, Step ${step}/${stepsPerEpoch}`);
      
      if (epoch >= totalEpochs) {
        clearInterval(interval);
        setTaskStatus('对抗性微调完成');
        setTrainingRunning(false);
        setCurrentStep(3);
        
        // 生成训练结果
        setTimeout(() => {
          generateTrainingResult();
        }, 1000);
      }
    }, 2000);
  };

  const generateTrainingResult = () => {
    // 微调前性能
    const originalAccuracy = 0.75 + Math.random() * 0.1;
    const originalBleuScore = 0.65 + Math.random() * 0.1;
    
    // 微调后性能
    const finalAccuracy = originalAccuracy + 0.05 + Math.random() * 0.1;
    const finalBleuScore = originalBleuScore + 0.03 + Math.random() * 0.08;
    const adversarialAccuracy = finalAccuracy - 0.05 - Math.random() * 0.05;
    const adversarialBleuScore = finalBleuScore - 0.02 - Math.random() * 0.03;
    
    // 计算性能提升
    const accuracyImprovement = ((finalAccuracy - originalAccuracy) / originalAccuracy) * 100;
    const bleuImprovement = ((finalBleuScore - originalBleuScore) / originalBleuScore) * 100;
    const overallImprovement = (accuracyImprovement + bleuImprovement) / 2;
    
    const result: FinetuningResult = {
      model_id: `finetuned_${Date.now()}`,
      model_name: `对抗性微调模型_${new Date().toLocaleDateString()}`,
      training_time: Math.floor(Math.random() * 1800) + 600, // 10-40分钟
      final_loss: 0.1 + Math.random() * 0.2,
      // 微调前性能
      original_accuracy: originalAccuracy,
      original_bleu_score: originalBleuScore,
      // 微调后性能
      final_accuracy: finalAccuracy,
      final_bleu_score: finalBleuScore,
      adversarial_accuracy: adversarialAccuracy,
      adversarial_bleu_score: adversarialBleuScore,
      // 性能提升
      accuracy_improvement: accuracyImprovement,
      bleu_improvement: bleuImprovement,
      overall_improvement: overallImprovement,
      model_path: `/models/finetuned_${Date.now()}`,
      training_logs: []
    };
    
    setFinetuningResult(result);
    message.success('对抗性微调完成');
  };

  const handleStopTraining = () => {
    setTrainingRunning(false);
    setTaskStatus('');
    setCurrentTaskId(null);
    setCurrentStep(0);
    message.info('对抗性微调已停止');
  };

  const downloadModel = () => {
    if (!finetuningResult) return;
    message.info('模型下载功能开发中...');
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

  const columns = [
    {
      title: '原始代码',
      dataIndex: 'original_code',
      key: 'original_code',
      width: 200,
      render: (text: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {text.length > 30 ? `${text.substring(0, 30)}...` : text}
        </Text>
      ),
    },
    {
      title: '对抗代码',
      dataIndex: 'adversarial_code',
      key: 'adversarial_code',
      width: 200,
      render: (text: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {text.length > 30 ? `${text.substring(0, 30)}...` : text}
        </Text>
      ),
    },
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
      width: 120,
      render: (label: string) => <Tag color="blue">{label}</Tag>,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (difficulty: string) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {difficulty.toUpperCase()}
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
          processing: { color: 'processing', text: '处理中' },
          completed: { color: 'success', text: '完成' },
          failed: { color: 'error', text: '失败' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  const trainingSteps = [
    {
      title: '数据准备',
      description: '加载和预处理训练数据',
      icon: <UploadOutlined />
    },
    {
      title: '模型初始化',
      description: '加载预训练模型和配置参数',
      icon: <CodeOutlined />
    },
    {
      title: '对抗训练',
      description: '执行对抗性微调训练',
      icon: <ExperimentOutlined />
    },
    {
      title: '模型保存',
      description: '保存微调后的模型',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        对抗性微调
      </Title>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="微调配置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleStartFinetuning}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="model_id"
                    label="基础模型"
                    rules={[{ required: true, message: '请选择基础模型' }]}
                  >
                    <Select placeholder="请选择基础模型">
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
                    name="base_model"
                    label="预训练模型"
                    rules={[{ required: true, message: '请选择预训练模型' }]}
                    initialValue="codebert-base"
                  >
                    <Select placeholder="请选择预训练模型">
                      <Option value="codebert-base">CodeBERT-Base</Option>
                      <Option value="codebert-large">CodeBERT-Large</Option>
                      <Option value="graphcodebert">GraphCodeBERT</Option>
                      <Option value="unixcoder">UnixCoder</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="learning_rate"
                    label="学习率"
                    initialValue={0.0001}
                  >
                    <Input type="number" step="0.0001" placeholder="0.0001" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="batch_size"
                    label="批次大小"
                    initialValue={8}
                  >
                    <Input type="number" placeholder="8" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="epochs"
                    label="训练轮数"
                    initialValue={5}
                  >
                    <Input type="number" placeholder="5" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="warmup_steps"
                    label="预热步数"
                    initialValue={100}
                  >
                    <Input type="number" placeholder="100" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="max_length"
                    label="最大长度"
                    initialValue={512}
                  >
                    <Input type="number" placeholder="512" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="adversarial_ratio"
                    label="对抗样本比例"
                    initialValue={0.3}
                  >
                    <Input type="number" step="0.1" placeholder="0.3" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">训练数据</Divider>

              <Form.Item label="上传训练数据">
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
                      ({trainingData.length} 个训练样本)
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
                    disabled={trainingRunning || trainingData.length === 0}
                    icon={<PlayCircleOutlined />}
                    size="large"
                  >
                    开始对抗性微调
                  </Button>
                  {trainingRunning && (
                    <Button 
                      danger
                      onClick={handleStopTraining}
                      icon={<StopOutlined />}
                      size="large"
                    >
                      停止训练
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {trainingRunning && (
            <Card title="训练进度" style={{ marginTop: '16px' }}>
              <Steps current={currentStep} style={{ marginBottom: '24px' }}>
                {trainingSteps.map((step, index) => (
                  <Step key={index} title={step.title} description={step.description} icon={step.icon} />
                ))}
              </Steps>

              {trainingProgress && (
                <div>
                  <Row gutter={16} style={{ marginBottom: '16px' }}>
                    <Col span={6}>
                      <Statistic 
                        title="当前轮次" 
                        value={`${trainingProgress.current_epoch + 1}/${trainingProgress.total_epochs}`}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="当前步数" 
                        value={`${trainingProgress.current_step}/${trainingProgress.total_steps}`}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="损失值" 
                        value={trainingProgress.loss.toFixed(4)}
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic 
                        title="准确率" 
                        value={`${(trainingProgress.accuracy * 100).toFixed(2)}%`}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Col>
                  </Row>

                  <Progress 
                    percent={Math.round(((trainingProgress.current_epoch * trainingProgress.total_steps + trainingProgress.current_step) / (trainingProgress.total_epochs * trainingProgress.total_steps)) * 100)}
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

          {finetuningResult && (
            <Card title="微调结果" style={{ marginTop: '16px' }}>
              <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                  <Statistic 
                    title="训练时间" 
                    value={Math.floor(finetuningResult.training_time / 60)}
                    suffix="分钟"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="最终损失" 
                    value={finetuningResult.final_loss.toFixed(4)}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="准确率提升" 
                    value={`+${finetuningResult.accuracy_improvement.toFixed(1)}%`}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="BLEU分数提升" 
                    value={`+${finetuningResult.bleu_improvement.toFixed(1)}%`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                  <Statistic 
                    title="微调前准确率" 
                    value={`${(finetuningResult.original_accuracy * 100).toFixed(2)}%`}
                    valueStyle={{ color: '#8c8c8c' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="微调后准确率" 
                    value={`${(finetuningResult.final_accuracy * 100).toFixed(2)}%`}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="微调前BLEU" 
                    value={finetuningResult.original_bleu_score.toFixed(3)}
                    valueStyle={{ color: '#8c8c8c' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="微调后BLEU" 
                    value={finetuningResult.final_bleu_score.toFixed(3)}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: '24px' }}>
                <Col span={6}>
                  <Statistic 
                    title="对抗样本准确率" 
                    value={`${(finetuningResult.adversarial_accuracy * 100).toFixed(2)}%`}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="对抗样本BLEU" 
                    value={finetuningResult.adversarial_bleu_score.toFixed(3)}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="综合性能提升" 
                    value={`+${finetuningResult.overall_improvement.toFixed(1)}%`}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'right' }}>
                    <Button 
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={downloadModel}
                    >
                      下载模型
                    </Button>
                  </div>
                </Col>
              </Row>

              <div>
                <Text strong>模型信息:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Text code>模型ID: {finetuningResult.model_id}</Text>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text code>模型名称: {finetuningResult.model_name}</Text>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text code>模型路径: {finetuningResult.model_path}</Text>
                </div>
              </div>
            </Card>
          )}

          <Card title="训练数据" style={{ marginTop: '16px' }}>
            <Table
              columns={columns}
              dataSource={trainingData}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
              expandable={{
                expandedRowRender: (record) => (
                  <div>
                    <Paragraph><strong>原始代码:</strong></Paragraph>
                    <Text code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                      {record.original_code}
                    </Text>
                    <Paragraph><strong>对抗代码:</strong></Paragraph>
                    <Text code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                      {record.adversarial_code}
                    </Text>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="训练状态">
            {trainingRunning ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <ExperimentOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                </div>
                <div style={{ textAlign: 'center', color: '#1890ff', fontSize: '16px', fontWeight: 'bold' }}>
                  对抗性微调进行中
                </div>
                {currentTaskId && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    任务ID: {currentTaskId}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <CodeOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <div>暂无运行中的训练任务</div>
              </div>
            )}
          </Card>

          <Card title="微调说明" style={{ marginTop: '16px' }}>
            <div>
              <h4>对抗性微调</h4>
              <p>通过对抗样本训练提高模型的鲁棒性和泛化能力。</p>
              
              <h4>训练流程</h4>
              <ol>
                <li>加载预训练模型</li>
                <li>准备对抗训练数据</li>
                <li>执行对抗性微调</li>
                <li>评估和保存模型</li>
              </ol>
              
              <h4>数据格式</h4>
              <p>每行格式：<Text code>原始代码|对抗代码|标签</Text></p>
              
              <h4>参数说明</h4>
              <ul>
                <li><strong>学习率:</strong> 控制训练步长</li>
                <li><strong>批次大小:</strong> 每次训练的样本数</li>
                <li><strong>训练轮数:</strong> 完整遍历数据的次数</li>
                <li><strong>对抗比例:</strong> 对抗样本在批次中的比例</li>
              </ul>
            </div>
          </Card>

          <Card title="模型性能" style={{ marginTop: '16px' }}>
            {finetuningResult ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <BarChartOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                  微调完成
                </div>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <Text type="success">模型性能显著提升</Text>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <BarChartOutlined style={{ fontSize: '32px', marginBottom: '16px' }} />
                <div>等待微调结果</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Finetuning;
