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
  InfoCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
  original_asr: number;
  original_ami: number;
  original_art: number;
  // 微调后性能
  final_accuracy: number;
  final_bleu_score: number;
  final_asr: number;
  final_ami: number;
  final_art: number;
  adversarial_accuracy: number;
  adversarial_bleu_score: number;
  // 性能提升
  accuracy_improvement: number;
  bleu_improvement: number;
  asr_improvement: number;
  ami_improvement: number;
  art_improvement: number;
  overall_improvement: number;
  model_path: string;
  training_logs: any[];
}

const Finetuning: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [trainingRunning, setTrainingRunning] = useState(false);
  const [trainingComplete, setTrainingComplete] = useState(false);
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

  const handleFileUpload = async (info: any) => {
    const { file } = info;
    // 需先选择任务类型
    const taskType = form.getFieldValue('task_type');
    if (!taskType) {
      message.warning('请先选择任务类型再上传训练数据');
      return;
    }

    // 上传到后端，携带任务类型与用途
    if (file && file.originFileObj) {
      try {
        await ApiService.uploadFile(file.originFileObj as File, {
          fileType: 'dataset',
          purpose: 'finetuning',
          taskType: taskType,
          datasetName: file.name,
        });
      } catch (e) {
        console.warn('训练数据上传失败，继续本地解析:', e);
      }
    }

    // 本地解析
    if (file && file.originFileObj) {
      setUploadedFile(file);
      message.success(`${file.name} 文件已选择并提交`);
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
        setTrainingComplete(true);
        setCurrentStep(3);
        
        // 生成训练结果
        setTimeout(() => {
          generateTrainingResult();
        }, 1000);
      }
    }, 2000);
  };

  const handleViewResult = () => {
    if (finetuningResult) {
      sessionStorage.setItem('finetuningResult', JSON.stringify({
        result: finetuningResult,
        config: trainingConfig,
        taskId: currentTaskId
      }));
      navigate('/finetuning/result');
    }
  };

  const generateTrainingResult = () => {
    // 微调前性能
    const originalAccuracy = 0.75 + Math.random() * 0.1;
    const originalBleuScore = 0.65 + Math.random() * 0.1;
    const originalASR = 0.35 + Math.random() * 0.15; // 攻击成功率应该降低（模型更鲁棒）
    const originalAMI = 0.65 + Math.random() * 0.1;
    const originalART = 0.45 + Math.random() * 0.15;
    
    // 微调后性能
    const finalAccuracy = originalAccuracy + 0.05 + Math.random() * 0.1;
    const finalBleuScore = originalBleuScore + 0.03 + Math.random() * 0.08;
    const finalASR = originalASR - 0.1 - Math.random() * 0.1; // 攻击成功率降低
    const finalAMI = originalAMI + 0.05 + Math.random() * 0.08;
    const finalART = originalART - 0.1 - Math.random() * 0.1; // 攻击响应时间降低（模型更鲁棒）
    const adversarialAccuracy = finalAccuracy - 0.05 - Math.random() * 0.05;
    const adversarialBleuScore = finalBleuScore - 0.02 - Math.random() * 0.03;
    
    // 计算性能提升
    const accuracyImprovement = ((finalAccuracy - originalAccuracy) / originalAccuracy) * 100;
    const bleuImprovement = ((finalBleuScore - originalBleuScore) / originalBleuScore) * 100;
    const asrImprovement = ((originalASR - finalASR) / originalASR) * 100; // ASR降低是好事
    const amiImprovement = ((finalAMI - originalAMI) / originalAMI) * 100;
    const artImprovement = ((originalART - finalART) / originalART) * 100; // ART降低是好事
    const overallImprovement = (accuracyImprovement + bleuImprovement + asrImprovement + amiImprovement + artImprovement) / 5;
    
    const result: FinetuningResult = {
      model_id: `finetuned_${Date.now()}`,
      model_name: `对抗性微调模型_${new Date().toLocaleDateString()}`,
      training_time: Math.floor(Math.random() * 1800) + 600, // 10-40分钟
      final_loss: 0.1 + Math.random() * 0.2,
      // 微调前性能
      original_accuracy: originalAccuracy,
      original_bleu_score: originalBleuScore,
      original_asr: originalASR,
      original_ami: originalAMI,
      original_art: originalART,
      // 微调后性能
      final_accuracy: finalAccuracy,
      final_bleu_score: finalBleuScore,
      final_asr: finalASR,
      final_ami: finalAMI,
      final_art: finalART,
      adversarial_accuracy: adversarialAccuracy,
      adversarial_bleu_score: adversarialBleuScore,
      // 性能提升
      accuracy_improvement: accuracyImprovement,
      bleu_improvement: bleuImprovement,
      asr_improvement: asrImprovement,
      ami_improvement: amiImprovement,
      art_improvement: artImprovement,
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
                    label="测试模型"
                    rules={[{ required: true, message: '请选择测试模型' }]}
                  >
                    <Select placeholder="请选择测试模型">
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

              <Form.Item label="数据格式">
                <Text type="secondary">每行格式：<Text code>原始代码|对抗代码|标签</Text></Text>
              </Form.Item>

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
        </Col>

        <Col span={8}>
          <Card title="训练状态">
            {trainingComplete ? (
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
                    message="微调已完成"
                    type="success"
                    showIcon
                  />
                </div>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Button 
                    type="primary" 
                    icon={<EyeOutlined />}
                    onClick={handleViewResult}
                    size="large"
                  >
                    查看结果
                  </Button>
                </div>
                {currentTaskId && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    任务ID: {currentTaskId}
                  </div>
                )}
              </div>
            ) : trainingRunning ? (
              <div>
                <Progress 
                  percent={Math.min(100, ((trainingProgress?.current_epoch || 0) * 100) / (trainingConfig?.epochs || 1))}
                  status="active"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                {trainingProgress && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>Epoch: </Text>
                      <Text>{trainingProgress.current_epoch} / {trainingProgress.total_epochs}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>损失: </Text>
                      <Text>{trainingProgress.loss.toFixed(4)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>准确率: </Text>
                      <Text>{trainingProgress.accuracy.toFixed(4)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>剩余时间: </Text>
                      <Text>{trainingProgress.eta}</Text>
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
            </div>
      </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={24}>
          <Card title="参数说明" style={{ marginTop: '16px' }}>
            <Row gutter={[16, 8]}>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>学习率 (Learning Rate)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>控制模型权重更新的步长，影响收敛速度和训练稳定性。过高可能导致震荡，过低可能导致收敛缓慢。推荐值：0.0001</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>批次大小 (Batch Size)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>每次迭代处理的样本数，影响训练速度和梯度稳定性。推荐值：8</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>训练轮数 (Epochs)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>模型遍历整个数据集的次数，需平衡欠拟合与过拟合。推荐值：5</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>预热步数 (Warmup Steps)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>学习率从初始值逐步增加至目标值的训练步数，有助于稳定训练初期的收敛。推荐值：100</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>最大长度 (Max Length)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>输入序列的最大长度，影响模型的内存使用和计算效率。推荐值：512</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>对抗样本比例 (Adversarial Sample Ratio)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>训练集中对抗样本的比例，影响模型对对抗攻击的鲁棒性。推荐值：0.3</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>ASR (Attack Success Rate)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>攻击成功率，衡量模型对对抗样本的脆弱性。值越低表示模型鲁棒性越好。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>AMI (Average Modification Index)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>平均修改率，生成对抗样本时输入被修改的平均比例，反映对抗样本的扰动程度。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>ART (Adversarial Robustness Training)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>对抗训练鲁棒性，模型经过对抗训练后的鲁棒性指标，评估模型抵抗对抗攻击的能力。值越高表示鲁棒性越好。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>准确率 (Accuracy)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>模型正确预测的样本数占总样本数的比例，衡量模型的整体预测准确性。值越高表示模型性能越好。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>BLEU分数 (BLEU Score)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>评估模型生成代码质量的标准指标，通过对比生成代码与参考代码的n-gram重叠度来衡量。值越高表示生成质量越好。</Text>
                </div>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: '16px' }}>整体提升 (Overall Improvement)</Text>
                <div style={{ marginTop: '4px', color: '#000' }}>
                  <Text style={{ color: '#000' }}>综合多个性能指标（准确率、BLEU、ASR、AMI、ART）的提升程度，全面反映模型微调后的改进效果。值越高表示整体性能提升越明显。</Text>
                </div>
              </Col>
            </Row>
      </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Finetuning;
