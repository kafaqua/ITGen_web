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
  Modal,
  Statistic
} from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  UploadOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import ApiService from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface TestCase {
  id: string;
  code: string;
  language: string;
  expected_result: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

interface BatchTestResult {
  total: number;
  completed: number;
  failed: number;
  success_rate: number;
  avg_time: number;
  results: TestCase[];
  // 基线方法对比
  baseline_comparison: {
    alert_performance: {
      accuracy: number;
      bleu_score: number;
      avg_time: number;
    };
    beam_attack_performance: {
      accuracy: number;
      bleu_score: number;
      avg_time: number;
    };
    itgen_performance: {
      accuracy: number;
      bleu_score: number;
      avg_time: number;
    };
  };
  // 任务类型统计
  task_statistics: {
    'vulnerability-detection': { success: number; total: number; };
    'clone-detection': { success: number; total: number; };
    'code-summarization': { success: number; total: number; };
  };
}

const BatchTesting: React.FC = () => {
  const [form] = Form.useForm();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testResults, setTestResults] = useState<BatchTestResult | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  useEffect(() => {
    fetchModels();
    
    // 组件卸载时清理定时器
    return () => {
      if ((window as any).batchTestingInterval) {
        clearInterval((window as any).batchTestingInterval);
        (window as any).batchTestingInterval = null;
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
    const taskType = form.getFieldValue('test_type');
    if (!taskType) {
      message.warning('请先选择测试类型再上传数据集');
      return;
    }

    console.log('Processing file:', actualFile.name, 'Type:', actualFile.type);
    
    // 设置上传的文件信息
    setUploadedFile(file);

    // 实际上传到后端（可选）
    try {
      await ApiService.uploadFile(actualFile, {
        fileType: 'dataset',
        purpose: 'batch_testing',
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
        let cases: TestCase[] = [];
        
        if (actualFile.name.endsWith('.json')) {
          // JSON格式
          const jsonData = JSON.parse(content);
          cases = Array.isArray(jsonData) ? jsonData.map((item, index) => ({
            id: `test_${index + 1}`,
            code: item.code || item.text || JSON.stringify(item),
            language: item.language || 'python',
            expected_result: item.expected_result || '',
            status: 'pending' as const
          })) : [];
        } else if (actualFile.name.endsWith('.csv')) {
          // CSV格式
          const lines = content.split('\n').filter(line => line.trim());
          // 跳过表头
          const dataLines = lines.slice(1);
          cases = dataLines.map((line, index) => {
            const parts = line.split(',');
            return {
              id: `test_${index + 1}`,
              code: parts[0] ? parts[0].trim() : line.trim(),
              language: parts[1] ? parts[1].trim() : 'python',
              expected_result: parts[2] ? parts[2].trim() : '',
              status: 'pending' as const
            };
          });
        } else {
          // TXT格式 - 每行一个测试用例
          const lines = content.split('\n').filter(line => line.trim());
          cases = lines.map((line, index) => ({
            id: `test_${index + 1}`,
            code: line.trim(),
            language: 'python',
            expected_result: '',
            status: 'pending' as const
          }));
        }
        
        console.log('Parsed test cases:', cases.length);
        
        if (cases.length === 0) {
          message.error({ content: '数据集为空或格式不正确', key: 'parsing' });
          return;
        }
        
        setTestCases(cases);
        message.success({ 
          content: `成功加载 ${cases.length} 个测试用例`, 
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

  const handleStartBatchTest = async (values: any) => {
    if (testCases.length === 0) {
      message.warning('请先上传数据集');
      return;
    }

    if (!uploadedFile) {
      message.warning('请先上传数据集文件');
      return;
    }

    // 清除上一次的轮询定时器
    if ((window as any).batchTestingInterval) {
      clearInterval((window as any).batchTestingInterval);
      (window as any).batchTestingInterval = null;
    }

    // 清除上一次的生成结果
    setTestResults(null);
    setTaskProgress(0);
    setTaskStatus('');
    setCurrentTaskId(null);

    setLoading(true);
    setTestRunning(true);
    
    try {
      // 构造符合新格式的请求数据
      const requestData = {
        model_name: values.model_name || 'codebert',
        task_type: values.test_type || 'clone-detection',
        attack_method: values.attack_method || 'itgen',
        parameters: {
          eval_data_file: uploadedFile.name || 'test_dataset.txt',
          block_size: parseInt(values.block_size) || 512,
          eval_batch_size: parseInt(values.eval_batch_size) || 2,
          seed: parseInt(values.seed) || 123456,
          cuda_device: parseInt(values.cuda_device) || 0,
          beam_size: parseInt(values.beam_size) || 2,
          timeout: parseInt(values.timeout) || 3600
        }
      };

      console.log('批量测试请求数据:', JSON.stringify(requestData, null, 2));
      
      const response = await ApiService.startBatchTesting(requestData);
      
      if (response.success) {
        const taskId = response.task_id;
        setCurrentTaskId(taskId);
        setTaskStatus('批量对抗样本生成已启动');
        setTaskProgress(0);
        
        message.success('批量对抗样本生成已启动');
        
        // 开始轮询任务状态
        pollTaskStatus(taskId);
      } else {
        message.error(response.error || '批量对抗样本生成启动失败');
        setTestRunning(false);
      }
    } catch (error) {
      message.error('批量对抗样本生成启动失败');
      console.error('Error starting batch test:', error);
      setTestRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    console.log('🔄 开始轮询任务状态，taskId:', taskId);
    
    const interval = setInterval(async () => {
      try {
        const statusResponse = await ApiService.getBatchTestingStatus(taskId);
        console.log('📊 状态轮询响应:', statusResponse);
        
        if (statusResponse.success) {
          const status = statusResponse.status;
          console.log('  - status:', status.status);
          console.log('  - progress:', status.progress);
          console.log('  - message:', status.message);
          
          // 更新进度
          if (status.progress !== undefined) {
            setTaskProgress(status.progress);
          }
          
          // 更新状态消息
          if (status.message) {
            setTaskStatus(status.message);
          } else {
            setTaskStatus(`批量对抗样本生成进行中... ${status.progress || 0}%`);
          }
          
          // 检查是否完成
          if (status.status === 'completed' || status.status === 'success') {
            console.log('🎉 任务已完成，准备获取结果');
            clearInterval(interval);
            (window as any).batchTestingInterval = null;
            
            setTaskProgress(100);
            setTaskStatus('批量对抗样本生成完成');
            setTestRunning(false);
            
            // 获取结果
            console.log('📞 调用 fetchBatchResults');
            await fetchBatchResults(taskId);
            message.success('批量对抗样本已生成');
          } else if (status.status === 'failed' || status.status === 'error') {
            console.error('❌ 任务失败:', status.error);
            clearInterval(interval);
            (window as any).batchTestingInterval = null;
            
            setTestRunning(false);
            setTaskStatus('批量对抗样本生成失败');
            message.error(status.error || '批量对抗样本生成失败');
          }
        } else {
          console.warn('⚠️ 状态轮询返回失败:', statusResponse);
        }
      } catch (error) {
        console.error('❌ 轮询任务状态时出错:', error);
        // 继续轮询，不中断
      }
    }, 2000); // 每2秒轮询一次
    
    // 存储interval ID以便停止时清除
    (window as any).batchTestingInterval = interval;
  };

  const fetchBatchResults = async (taskId: string) => {
    try {
      console.log('📥 开始获取批量测试结果，taskId:', taskId);
      const resultsResponse = await ApiService.getBatchTestingResults(taskId);
      
      console.log('📦 后端返回的原始结果类型:', typeof resultsResponse);
      console.log('📦 后端返回的原始结果:', resultsResponse);
      
      // 处理JSONL格式的返回数据
      let parsedResults: any[] = [];
      
      if (typeof resultsResponse === 'string') {
        // 如果返回的是JSONL字符串，按行解析
        console.log('🔄 检测到JSONL字符串格式，开始解析...');
        const lines = resultsResponse.split('\n').filter(line => line.trim());
        parsedResults = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            console.warn('解析行失败:', line);
            return null;
          }
        }).filter(item => item !== null);
        console.log(`✅ JSONL解析完成，共 ${parsedResults.length} 条记录`);
      } else if (Array.isArray(resultsResponse)) {
        // 如果已经是数组
        console.log('✅ 检测到数组格式');
        parsedResults = resultsResponse;
      } else if (resultsResponse && resultsResponse.success) {
        // 如果是标准格式的响应对象
        console.log('✅ 检测到标准格式');
        parsedResults = resultsResponse.results || [];
      } else {
        console.warn('⚠️ 未知的返回格式');
        parsedResults = [];
      }
      
      console.log('📊 解析后的结果数量:', parsedResults.length);
      
      // 统计数据
      const successCount = parsedResults.filter(item => 
        item['Adversarial Code'] !== null && item['Adversarial Code'] !== undefined
      ).length;
      const failedCount = parsedResults.length - successCount;
      const totalQueries = parsedResults.reduce((sum, item) => sum + (item['Query Times'] || 0), 0);
      const totalTime = parsedResults.reduce((sum, item) => sum + (item['Time Cost'] || 0), 0);
      
      console.log('📈 统计信息:');
      console.log('  - 总数:', parsedResults.length);
      console.log('  - 成功:', successCount);
      console.log('  - 失败:', failedCount);
      console.log('  - 平均查询次数:', totalQueries / parsedResults.length);
      console.log('  - 平均时间:', totalTime / parsedResults.length);
      
      // 将后端结果映射到前端数据结构
      const results: BatchTestResult = {
        total: parsedResults.length,
        completed: parsedResults.length,
        failed: failedCount,
        success_rate: parsedResults.length > 0 ? (successCount / parsedResults.length) * 100 : 0,
        avg_time: parsedResults.length > 0 ? totalTime / parsedResults.length : 0,
        results: parsedResults.map((item, index) => ({
          id: `test_${item['Index'] !== undefined ? item['Index'] : index}`,
          code: item['Original Code'] || `Sample ${index + 1}`,
          language: 'java', // 根据实际情况设置
          expected_result: 'success',
          status: item['Adversarial Code'] ? 'completed' : 'failed',
          result: item['Adversarial Code'] ? {
            success: true,
            time_cost: item['Time Cost'] || 0,
            confidence: 0.9,
            original_code: item['Original Code'],
            adversarial_code: item['Adversarial Code'],
            query_times: item['Query Times'],
            replaced_identifiers: item['Replaced Identifiers'],
            program_length: item['Program Length'],
            identifier_num: item['Identifier Num']
          } : undefined,
          error: !item['Adversarial Code'] ? '攻击失败' : undefined
        })),
        baseline_comparison: {
          alert_performance: { accuracy: 0, bleu_score: 0, avg_time: 0 },
          beam_attack_performance: { accuracy: 0, bleu_score: 0, avg_time: 0 },
          itgen_performance: { 
            accuracy: parsedResults.length > 0 ? (successCount / parsedResults.length) : 0, 
            bleu_score: 0, 
            avg_time: parsedResults.length > 0 ? totalTime / parsedResults.length : 0
          }
        },
        task_statistics: {
          'vulnerability-detection': { success: 0, total: 0 },
          'clone-detection': { success: successCount, total: parsedResults.length },
          'code-summarization': { success: 0, total: 0 }
        }
      };
      
      console.log('🎯 映射后的结果:', results);
      console.log('📊 准备设置testResults状态');
      
      setTestResults(results);
      message.success(`批量对抗样本生成完成！成功 ${successCount}/${parsedResults.length} 个样本`);
      
      console.log('✅ testResults状态已更新');
    } catch (error) {
      console.error('❌ 获取批量测试结果时出错:', error);
      console.error('错误详情:', error);
      message.error('获取测试结果失败: ' + (error as Error).message);
    }
  };

  const handleStopTest = () => {
    // 清除轮询定时器
    if ((window as any).batchTestingInterval) {
      clearInterval((window as any).batchTestingInterval);
      (window as any).batchTestingInterval = null;
    }
    
    setTestRunning(false);
    setTaskProgress(0);
    setTaskStatus('');
    setCurrentTaskId(null);
    message.info('批量对抗样本生成已停止');
  };

  const downloadResults = () => {
    if (!testResults) return;
    
    const csvContent = [
      '测试用例ID,代码,语言,状态,结果,错误信息',
      ...testResults.results.map(result => 
        `${result.id},"${result.code}",${result.language},${result.status},"${result.result ? '成功' : '失败'}",${result.error || ''}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `batch_test_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const columns = [
    {
      title: '测试用例ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
      ellipsis: true,
      render: (text: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {text.length > 50 ? `${text.substring(0, 50)}...` : text}
        </Text>
      ),
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 80,
      render: (language: string) => <Tag color="blue">{language}</Tag>,
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
          completed: { color: 'success', text: '完成' },
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
        批量对抗样本生成
      </Title>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="测试配置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleStartBatchTest}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="model_name"
                    label="测试模型"
                    rules={[{ required: true, message: '请选择测试模型' }]}
                  >
                    <Select placeholder="请选择测试模型">
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
                    name="test_type"
                    label="测试类型"
                    rules={[{ required: true, message: '请选择测试类型' }]}
                    initialValue="clone-detection"
                  >
                    <Select placeholder="请选择测试类型">
                      <Option value="clone-detection">克隆检测</Option>
                      <Option value="vulnerability-detection">漏洞检测</Option>
                      <Option value="code-summarization">代码摘要</Option>
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

              <Divider orientation="left">生成参数</Divider>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="block_size"
                    label="Block Size"
                    initialValue={512}
                    tooltip="代码块最大长度"
                  >
                    <Input type="number" placeholder="512" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="eval_batch_size"
                    label="Batch Size"
                    initialValue={2}
                    tooltip="评估批次大小"
                  >
                    <Input type="number" placeholder="2" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="beam_size"
                    label="Beam Size"
                    initialValue={2}
                    tooltip="Beam搜索宽度"
                  >
                    <Input type="number" placeholder="2" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="seed"
                    label="Random Seed"
                    initialValue={123456}
                    tooltip="随机种子，确保结果可复现"
                  >
                    <Input type="number" placeholder="123456" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="cuda_device"
                    label="CUDA Device"
                    initialValue={0}
                    tooltip="GPU设备编号，-1表示使用CPU"
                  >
                    <Input type="number" placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="timeout"
                    label="Timeout (秒)"
                    initialValue={3600}
                    tooltip="任务超时时间"
                  >
                    <Input type="number" placeholder="3600" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">数据集</Divider>

              <Form.Item 
                label="上传数据集"
                tooltip="请先选择测试类型，然后上传数据集文件"
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
                      type={testCases.length === 0 ? 'primary' : 'default'}
                    >
                      {testCases.length === 0 ? '选择数据集文件' : '重新选择数据集'}
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
                            共加载 {testCases.length} 个测试用例
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
                  {testCases.length === 0 && !testRunning && (
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
                      disabled={testRunning || testCases.length === 0}
                      icon={<PlayCircleOutlined />}
                      size="large"
                    >
                      开始批量对抗样本生成
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

          {testResults && (
            <Card title="生成结果" style={{ marginTop: '16px' }}>
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={6}>
                  <Statistic title="总生成数" value={testResults.total} />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="成功数" 
                    value={testResults.completed} 
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="失败数" 
                    value={testResults.failed} 
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="成功率" 
                    value={testResults.success_rate} 
                    precision={1}
                    suffix="%" 
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>

              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={downloadResults}
                >
                  下载结果
                </Button>
              </div>

              <Table
                columns={columns}
                dataSource={testResults.results}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </Card>
          )}
        </Col>

        <Col span={8}>
          <Card title="生成状态">
            {testRunning ? (
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
                <div>暂无运行中的生成任务</div>
              </div>
            )}
          </Card>

          <Card title="使用说明" style={{ marginTop: '16px' }}>
            <div>
              <h4>支持的文件格式</h4>
              <ul>
                <li><Text code>.txt</Text> - 每行一个测试用例</li>
                <li><Text code>.csv</Text> - CSV格式，包含代码列</li>
                <li><Text code>.json</Text> - JSON格式，包含测试用例数组</li>
              </ul>
              
              <h4>生成流程</h4>
              <ol>
                <li>选择测试模型和测试类型</li>
                <li>上传包含测试用例的数据集</li>
                <li>配置并发数量和其他参数</li>
                <li>开始批量对抗样本生成</li>
                <li>查看生成结果和下载报告</li>
              </ol>
            </div>
      </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BatchTesting;
