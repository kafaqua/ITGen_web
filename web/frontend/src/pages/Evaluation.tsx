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
  EyeOutlined,
  FileTextOutlined
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
  attack_method: string;
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
    
    // 组件卸载时清理定时器
    return () => {
      if ((window as any).evaluationInterval) {
        clearInterval((window as any).evaluationInterval);
        (window as any).evaluationInterval = null;
      }
    };
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

  const handleFileUpload = async (info: any) => {
    console.log('Upload onChange triggered:', info);
    const { file } = info;
    
    // 获取实际的文件对象
    const actualFile = file.originFileObj || file;
    
    if (!actualFile) {
      console.error('No file object found');
      return;
    }

    // 需先选择任务类型
    const taskType = form.getFieldValue('task_type');
    if (!taskType) {
      message.warning('请先选择任务类型再上传测试数据');
      return;
    }

    console.log('Processing file:', actualFile.name, 'Type:', actualFile.type);
    
    // 设置上传的文件信息
    setUploadedFile(file);

    // 实际上传到后端（可选）
    try {
      await ApiService.uploadFile(actualFile, {
        fileType: 'dataset',
        purpose: 'evaluation',
        taskType: taskType,
        datasetName: actualFile.name,
      });
      console.log('File uploaded to backend successfully');
    } catch (e) {
      // 即使上传失败，也允许继续在前端解析以演示
      console.warn('数据集上传失败，继续本地解析:', e);
    }

    // 本地解析文件内容
    message.loading({ content: '正在解析数据集...', key: 'parsing' });
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        console.log('File content loaded, length:', content.length);
        
        // 根据文件类型解析
        let data: TestData[] = [];
        
        if (actualFile.name.endsWith('.json')) {
          // JSON格式
          const jsonData = JSON.parse(content);
          data = Array.isArray(jsonData) ? jsonData.map((item, index) => ({
            id: `sample_${index + 1}`,
            code_sample: item.code || item.code_sample || JSON.stringify(item),
            label: item.label || 'unknown',
            difficulty: (item.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
            status: 'pending' as const
          })) : [];
        } else if (actualFile.name.endsWith('.csv')) {
          // CSV格式
          const lines = content.split('\n').filter(line => line.trim());
          // 跳过表头
          const dataLines = lines.slice(1);
          data = dataLines.map((line, index) => {
            const parts = line.split(',');
            return {
              id: `sample_${index + 1}`,
              code_sample: parts[0] ? parts[0].trim() : line.trim(),
              label: parts[1] ? parts[1].trim() : 'unknown',
              difficulty: 'medium' as const,
              status: 'pending' as const
            };
          });
        } else {
          // TXT格式 - 每行格式：代码样本|标签
          const lines = content.split('\n').filter(line => line.trim());
          data = lines.map((line, index) => {
            const parts = line.split('|');
            return {
              id: `sample_${index + 1}`,
              code_sample: parts[0] || '',
              label: parts[1] || 'unknown',
              difficulty: 'medium' as const,
              status: 'pending' as const
            };
          });
        }
        
        console.log('Parsed test data:', data.length);
        
        if (data.length === 0) {
          message.error({ content: '数据集为空或格式不正确', key: 'parsing' });
          return;
        }
        
        setTestData(data);
        message.success({ 
          content: `成功加载 ${data.length} 个测试样本`, 
          key: 'parsing',
          duration: 2
        });
      } catch (error) {
        console.error('Parse error:', error);
        message.error({ content: '数据集解析失败: ' + (error as Error).message, key: 'parsing' });
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      message.error({ content: '文件读取失败', key: 'parsing' });
    };
    
    reader.readAsText(actualFile);
  };

  const handleStartTest = async (values: any) => {
    if (testData.length === 0) {
      message.warning('请先上传测试数据');
      return;
    }

    // 清除上一次的轮询定时器
    if ((window as any).evaluationInterval) {
      clearInterval((window as any).evaluationInterval);
      (window as any).evaluationInterval = null;
    }

    // 清除上一次的测试结果
    setEvaluationResult(null);
    setTestProgress(null);
    setTestComplete(false);
    setCurrentStep(0);

    setLoading(true);
    setTestRunning(true);
    
    try {
      const config: TestConfig = {
        model_id: values.model_id,
        base_model: values.base_model,
        max_queries: values.max_queries,
        timeout: values.timeout,
        attack_method: values.attack_method,
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
        
        // 开始轮询任务状态
        pollEvaluationStatus(taskId);
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

  const pollEvaluationStatus = async (taskId: string) => {
    let errorCount = 0;
    const maxErrors = 3; // 最大连续错误次数
    
    const interval = setInterval(async () => {
      try {
        console.log('📡 轮询安全测试状态，taskId:', taskId);
        const statusResponse = await ApiService.getEvaluationStatus(taskId);
        
        // 重置错误计数
        errorCount = 0;
        
        console.log('📦 状态响应:', statusResponse);
        
        if (statusResponse.success) {
          const status = statusResponse.status;
          
          // 更新进度信息
          if (status.progress) {
            const progress: TestProgress = {
              current_sample: status.progress.current_sample || 0,
              total_samples: status.progress.total_samples || testData.length,
              current_iteration: status.progress.current_iteration || 0,
              max_iterations: status.progress.max_iterations || 10,
              asr: status.progress.asr || 0,
              ami: status.progress.ami || 0,
              art: status.progress.art || 0,
              eta: status.progress.eta || '计算中...'
            };
            setTestProgress(progress);
            setCurrentStep(Math.min(Math.floor((progress.current_sample / progress.total_samples) * 3), 3));
          }
          
          // 更新状态消息
          if (status.message) {
            setTaskStatus(status.message);
          }
          
          // 检查是否完成
          if (status.status === 'completed' || status.status === 'success') {
            console.log('✅ 安全测试完成');
            clearInterval(interval);
            (window as any).evaluationInterval = null;
            setTaskStatus('安全测试完成');
            setTestRunning(false);
            setTestComplete(true);
            setCurrentStep(3);
            
            // 使用 report_id 获取测试结果（如果有），否则使用 task_id
            const reportId = status.report_id || status.result?.report_id || taskId;
            console.log('📊 使用ID获取结果:', reportId);
            console.log('  - report_id from status:', status.report_id);
            console.log('  - report_id from result:', status.result?.report_id);
            console.log('  - 最终使用:', reportId);
            
            // 获取测试结果
            fetchEvaluationResults(reportId);
            message.success('安全测试完成');
          } else if (status.status === 'failed' || status.status === 'error') {
            console.error('❌ 安全测试失败');
            clearInterval(interval);
            (window as any).evaluationInterval = null;
            setTestRunning(false);
            setTaskStatus('安全测试失败');
            message.error(status.error || '安全测试失败');
          }
        } else {
          console.warn('⚠️ 状态响应未成功:', statusResponse);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ 轮询状态时出错 (${errorCount}/${maxErrors}):`, error);
        
        // 如果是404错误，说明后端接口不存在
        if (error?.response?.status === 404) {
          console.warn('⚠️ 状态接口不存在 (404)，停止轮询');
          clearInterval(interval);
          (window as any).evaluationInterval = null;
          
          // 显示友好提示
          message.warning('后端状态接口未实现，请等待测试完成后手动刷新查看结果');
          
          // 设置一个备用提示
          setTaskStatus('测试执行中... (无法获取实时状态，请等待执行完成)');
        } else if (errorCount >= maxErrors) {
          // 连续失败多次，停止轮询
          console.error(`❌ 连续失败 ${maxErrors} 次，停止轮询`);
          clearInterval(interval);
          (window as any).evaluationInterval = null;
          setTestRunning(false);
          setTaskStatus('无法获取测试状态');
          message.error('无法连接到后端服务，请检查网络连接');
        }
        // 否则继续轮询
      }
    }, 2000); // 每2秒轮询一次
    
    // 存储interval ID以便停止时清除
    (window as any).evaluationInterval = interval;
  };

  const fetchEvaluationResults = async (reportId: string) => {
    try {
      console.log('📥 获取安全测试结果，reportId:', reportId);
      const resultsResponse = await ApiService.getEvaluationResults(reportId);
      
      console.log('📦 后端返回的结果:', resultsResponse);
      
      if (resultsResponse.success && resultsResponse.data) {
        // 后端返回的完整评估报告数据
        const reportData = resultsResponse.data;
        
        // 更新测试数据状态
        const updatedTestData = testData.map(sample => ({
          ...sample,
          status: 'completed' as const
        }));
        setTestData(updatedTestData);
        
        // 设置评估结果（用于页面显示摘要）
        const result: EvaluationResult = {
          model_id: reportData.report_id || `tested_${Date.now()}`,
          model_name: reportData.model_name || '测试模型',
          test_time: 0, // 后端没有返回total_time，使用默认值
          asr: reportData.summary_stats?.asr || 0,
          ami: reportData.summary_stats?.ami || 0,
          art: reportData.summary_stats?.art || 0,
          total_samples: reportData.summary_stats?.total_samples || 0,
          successful_attacks: reportData.summary_stats?.successful_attacks || 0,
          failed_attacks: reportData.summary_stats?.failed_attacks || 0,
          identifier_replacements: reportData.summary_stats?.avg_identifiers || 0,
          test_logs: []
        };
        
        setEvaluationResult(result);
        
        // 存储完整的评估报告到sessionStorage，供结果页面使用
        sessionStorage.setItem('evaluationReport', JSON.stringify(reportData));
        
        console.log('✅ 评估结果已设置:', result);
        console.log('✅ 完整报告已存储到sessionStorage');
      } else {
        console.error('⚠️ 后端返回失败:', resultsResponse);
        message.error('获取测试结果失败');
      }
    } catch (error) {
      console.error('❌ 获取测试结果时出错:', error);
      message.error('获取测试结果失败: ' + (error as Error).message);
    }
  };

  const handleViewResult = () => {
    if (evaluationResult) {
      // 评估报告已经在 fetchEvaluationResults 中存储到 sessionStorage
      // 直接导航到结果页面
      navigate('/evaluation/result');
    } else {
      message.warning('暂无测试结果可查看');
    }
  };

  const handleStopTest = () => {
    // 清除轮询定时器
    if ((window as any).evaluationInterval) {
      clearInterval((window as any).evaluationInterval);
      (window as any).evaluationInterval = null;
    }
    
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
                    name="model_name"
                    label="被测模型"
                    rules={[{ required: true, message: '请选择被测模型' }]}
                  >
                    <Select placeholder="请选择被测模型">
                      {models.map(model => (
                        <Option key={model.model_name} value={model.model_name}>
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
                    initialValue="clone-detection"
                  >
                    <Select placeholder="请选择任务类型">
                      <Option value="clone-detection">克隆检测</Option>
                      <Option value="vulnerability-detection">漏洞检测</Option>
                      <Option value="code-summarization">代码摘要</Option>
                      <Option value="code-generation">代码生成</Option>
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
                    name="attack_method"
                    label="攻击方法"
                    initialValue="itgen"
                  >
                    <Select placeholder="请选择攻击方法">
                      <Option value="itgen">ITGen</Option>
                      <Option value="alert">ALERT</Option>
                      <Option value="beam_attack">Beam Attack</Option>
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

              <Divider orientation="left">数据集</Divider>

              <Form.Item 
                label="上传数据集"
                tooltip="请先选择任务类型，然后上传数据集文件"
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Upload
                    accept=".txt,.csv,.json"
                    beforeUpload={(file) => {
                      console.log('beforeUpload called with file:', file.name);
                      return false; // 阻止自动上传，由onChange手动处理
                    }}
                    onChange={handleFileUpload}
                    showUploadList={false}
                    maxCount={1}
                  >
                    <Button 
                      icon={<UploadOutlined />}
                      size="large"
                      type={testData.length === 0 ? 'primary' : 'default'}
                    >
                      {testData.length === 0 ? '选择数据集文件' : '重新选择数据集'}
                    </Button>
                  </Upload>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    点击按钮选择文件，支持 .txt, .csv, .json 格式
                  </Text>
                  {uploadedFile && (
                    <Alert
                      message="数据集已加载"
                      description={
                        <div>
                          <Text strong>
                            <FileTextOutlined /> {uploadedFile.name}
                          </Text>
                          <br />
                          <Text type="secondary">
                            共加载 {testData.length} 个测试用例
                          </Text>
                        </div>
                      }
                      type="success"
                      showIcon
                    />
                  )}
                </Space>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                <Space size="large" direction="vertical" style={{ width: '100%' }}>
                  {testData.length === 0 && !testRunning && (
                    <Alert
                      message="请先上传数据集"
                      description="请在上方选择并上传包含测试用例的数据集文件（支持.txt, .csv, .json格式）"
                      type="warning"
                      showIcon
                    />
                  )}
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
                    <Text strong>已完成样本数：{testData.filter(item => item.status === 'completed').length}</Text>
                  </Space>
                </div>
                {evaluationResult && (
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
                )}
                {!evaluationResult && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Alert
                      message="结果加载中"
                      description="正在获取测试报告，请稍候..."
                      type="info"
                      showIcon
                    />
                  </div>
                )}
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
