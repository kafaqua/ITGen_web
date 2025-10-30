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
  Divider
} from 'antd';
import { PlayCircleOutlined, StopOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Attack: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [attackRunning, setAttackRunning] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [attackComplete, setAttackComplete] = useState(false);
  const [attackResult, setAttackResult] = useState<any>(null);
  const { sendMessage } = useWebSocket();

  useEffect(() => {
    fetchModels();
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

  const handleStartAttack = async (values: any) => {
    setLoading(true);
    setAttackRunning(true);
    
    try {
      console.log('📤 发送攻击请求，原始数据:', values);
      
      // 构造请求数据，按照新的格式结构
      const attackData = {
        method: values.method,                    // 攻击方法（itgen, beam, alert, mhm, etc.）
        model_name: values.model_name,            // 模型ID（codebert, codegpt, codet5, etc.）
        task_type: values.task_type,              // 任务类型（clone-detection, vulnerability-detection, etc.）
        code_data: {
          code1: values.code1,                    // 第一个代码段
          code2: values.code2                     // 第二个代码段
        },
        parameters: {
          true_label: values.label,               // 真实标签（0或1）
          max_queries: parseInt(values.max_query_times) || 100,  // 最大查询次数
          timeout: parseInt(values.time_limit) || 60,            // 超时时间（秒）
          language: values.language,              // 编程语言
          attack_strategy: values.attack_strategy, // 攻击手段
          max_modifications: parseInt(values.max_modifications) || 5, // 最大修改次数
          max_substitutions: parseInt(values.max_substitutions) || 10 // 最大替换数
        }
      };
      
      console.log('📦 构造后的攻击数据:', JSON.stringify(attackData, null, 2));
      
      const response = await ApiService.startAttack(attackData);
      if (response.success) {
        const taskId = response.task_id;
        setCurrentTaskId(taskId);
        setTaskStatus('攻击任务已启动');
        setTaskProgress(10);
        
        // 订阅任务更新
        sendMessage({ task_id: taskId });
        
        message.success('攻击任务已启动');
        
        // 模拟进度更新
        simulateProgress(taskId);
      } else {
        message.error(response.error || '攻击启动失败');
        setAttackRunning(false);
      }
    } catch (error) {
      message.error('攻击启动失败');
      console.error('Error starting attack:', error);
      setAttackRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const simulateProgress = (taskId: string) => {
    let progress = 10;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        setTaskStatus('攻击完成');
        setAttackRunning(false);
        clearInterval(interval);
        
        // 获取攻击结果
        setTimeout(() => {
          fetchAttackResults(taskId);
        }, 1000);
      } else {
        setTaskProgress(Math.min(progress, 95));
        setTaskStatus(`攻击进行中... ${Math.round(progress)}%`);
      }
    }, 2000);
  };

  const fetchAttackResults = async (taskId: string) => {
    try {
      console.log('📥 获取攻击结果，taskId:', taskId);
      const response = await ApiService.getAttackResults(taskId);
      
      console.log('📦 后端返回的结果:', response);
      
      // 后端返回的数据可能在 response.result 或 response.data 中
      const resultData = response.result || response.data;
      
      if (response.success && resultData) {
        // 无论攻击成功还是失败，都设置为已完成
        setAttackComplete(true);
        setAttackRunning(false);
        setLoading(false);
        setTaskProgress(100);
        setAttackResult(resultData);
        
        // 判断攻击是否成功
        // 方式1: 检查后端返回的 success 字段
        // 方式2: 检查是否有 adversarial_code
        const isSuccess = resultData.success === true || 
                         (resultData.adversarial_code && resultData.adversarial_code !== resultData.original_code);
        
        if (isSuccess) {
          message.success('攻击成功！');
          setTaskStatus('已完成 - 攻击成功');
        } else {
          message.warning('攻击失败');
          setTaskStatus('已完成 - 攻击失败');
        }
        
        console.log('✅ 攻击结果已设置，攻击状态:', isSuccess ? '成功' : '失败');
        console.log('  - resultData.success:', resultData.success);
        console.log('  - 有对抗代码:', !!resultData.adversarial_code);
      } else {
        // 即使获取结果失败，也标记为已完成
        setAttackComplete(true);
        setAttackRunning(false);
        setLoading(false);
        message.error('获取攻击结果失败');
        setTaskStatus('已完成 - 获取结果失败');
        console.error('⚠️ 后端返回失败:', response);
      }
    } catch (error) {
      console.error('❌ 获取攻击结果时出错:', error);
      // 即使出错，也标记为已完成
      setAttackComplete(true);
      setAttackRunning(false);
      setLoading(false);
      message.error('获取攻击结果失败: ' + (error as Error).message);
      setTaskStatus('已完成 - 获取结果失败');
    }
  };

  const handleViewResult = () => {
    console.log('🔍 查看结果按钮被点击');
    console.log('  - currentTaskId:', currentTaskId);
    console.log('  - attackResult:', attackResult);
    console.log('  - attackComplete:', attackComplete);
    
    if (!currentTaskId) {
      console.error('❌ currentTaskId为空');
      message.error('任务ID不存在，无法查看结果');
      return;
    }
    
    if (!attackResult) {
      console.error('❌ attackResult为空');
      message.error('攻击结果不存在，无法查看结果');
      return;
    }
    
    try {
      // 将攻击结果存储到sessionStorage以便在结果页面访问
      const dataToStore = {
        taskId: currentTaskId,
        result: attackResult,
        config: form.getFieldsValue()
      };
      
      console.log('💾 准备存储到sessionStorage:', dataToStore);
      sessionStorage.setItem('attackResult', JSON.stringify(dataToStore));
      console.log('✅ 数据已存储到sessionStorage');
      
      console.log('🚀 准备导航到 /attack/result');
      navigate('/attack/result');
      console.log('✅ 导航命令已执行');
    } catch (error) {
      console.error('❌ 查看结果时出错:', error);
      message.error('查看结果失败: ' + (error as Error).message);
    }
  };

  const handleStopAttack = () => {
    setAttackRunning(false);
    setTaskProgress(0);
    setTaskStatus('');
    setCurrentTaskId(null);
    setAttackComplete(false);
    setAttackResult(null);
    message.info('攻击已停止');
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        对抗攻击配置
      </Title>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="攻击参数配置">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleStartAttack}
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
                    name="method"
                    label="攻击方法"
                    rules={[{ required: true, message: '请选择攻击方法' }]}
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
                    name="task_type"
                    label="任务类型"
                    rules={[{ required: true, message: '请选择任务类型' }]}
                    initialValue="clone-detection"
                  >
                    <Select placeholder="请选择任务类型">
                      <Option value="clone-detection">克隆检测</Option>
                      <Option value="vulnerability-detection">漏洞检测</Option>
                      <Option value="code-summarization">代码摘要</Option>
                    </Select>
                  </Form.Item>
                </Col>
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
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="attack_strategy"
                    label="攻击手段"
                    rules={[{ required: true, message: '请选择攻击手段' }]}
                    initialValue="identifier_rename"
                  >
                    <Select placeholder="请选择攻击手段">
                      <Option value="identifier_rename">标识符重命名</Option>
                      <Option value="equivalent_transform">等价变换</Option>
                      <Option value="both">两种手段结合</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="max_modifications"
                    label="最大修改次数"
                    initialValue={5}
                  >
                    <Input type="number" placeholder="5" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">代码段输入</Divider>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="code1"
                    label="代码段1 (Code1)"
                    rules={[{ required: true, message: '请输入代码段1' }]}
                  >
                    <TextArea 
                      rows={8} 
                      placeholder="请输入第一个代码段..."
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="code2"
                    label="代码段2 (Code2)"
                    rules={[{ required: true, message: '请输入代码段2' }]}
                  >
                    <TextArea 
                      rows={8} 
                      placeholder="请输入第二个代码段..."
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="label"
                label="标签 (Label)"
                rules={[{ required: true, message: '请选择标签' }]}
                tooltip="0表示两个代码段不相似，1表示相似"
              >
                <Select placeholder="请选择标签">
                  <Option value={0}>0 - 不相似</Option>
                  <Option value={1}>1 - 相似</Option>
                </Select>
              </Form.Item>

              <Divider orientation="left">攻击参数</Divider>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="max_query_times"
                    label="最大查询次数"
                    initialValue={200}
                  >
                    <Input type="number" placeholder="200" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="time_limit"
                    label="时间限制(秒)"
                    initialValue={60}
                  >
                    <Input type="number" placeholder="60" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="max_substitutions"
                    label="最大替换数"
                    initialValue={10}
                  >
                    <Input type="number" placeholder="10" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                <Space size="large">
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    loading={loading}
                    disabled={attackRunning}
                    icon={<PlayCircleOutlined />}
                    size="large"
                  >
                    开始攻击
                  </Button>
                  {attackRunning && (
                    <Button 
                      danger
                      onClick={handleStopAttack}
                      icon={<StopOutlined />}
                      size="large"
                    >
                      停止攻击
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="攻击状态">
            {attackComplete ? (
              <div>
                <Progress 
                  percent={100} 
                  status={taskStatus.includes('成功') ? 'success' : 'exception'}
                  strokeColor={taskStatus.includes('成功') ? {
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  } : '#ff4d4f'}
                />
                <div style={{ marginTop: '16px' }}>
                  <Alert
                    message={taskStatus}
                    description={
                      <div>
                        {taskStatus.includes('成功') ? (
                          <Text type="success">✓ 攻击成功，标签已翻转</Text>
                        ) : taskStatus.includes('失败') ? (
                          <Text type="warning">✗ 攻击失败，标签未改变</Text>
                        ) : (
                          <Text type="secondary">请查看详细结果</Text>
                        )}
                      </div>
                    }
                    type={taskStatus.includes('成功') ? 'success' : taskStatus.includes('失败') ? 'warning' : 'info'}
                    showIcon
                  />
                </div>
                {attackResult && (
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
                {!attackResult && taskStatus.includes('获取结果失败') && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Alert
                      message="无法查看结果"
                      description="攻击结果获取失败，请重新执行攻击"
                      type="error"
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
            ) : attackRunning ? (
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
                <div>暂无运行中的攻击任务</div>
              </div>
            )}
          </Card>

          <Card title="攻击方法说明" style={{ marginTop: '16px' }}>
            <div>
              <h4>ITGen</h4>
              <p>基于高斯过程的迭代生成算法，通过探索和利用策略生成对抗样本。</p>
              
              <h4>ALERT</h4>
              <p>基于注意力机制的对抗攻击方法，通过修改注意力权重生成对抗样本。</p>
              
              <h4>Beam Attack</h4>
              <p>基于束搜索的对抗攻击方法，通过多候选搜索生成对抗样本。</p>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <h4>攻击手段说明</h4>
              <p><strong>标识符重命名：</strong>对代码中的变量、函数名等标识符进行重命名，生成语义等价的代码变体。</p>
              <p><strong>等价变换：</strong>通过改变代码结构、逻辑表达等方式，生成功能等价的代码变体。</p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 代码变体示例 */}
      <Row gutter={16} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="代码变体示例">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '16px 8px' }}>
              <thead>
                <tr>
                  <th style={{ width: '48%', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                    标识符重命名示例
                  </th>
                  <th style={{ width: '48%', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}>
                    等价变换示例
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>原代码：</div>
                    <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '14px', margin: 0 }}>
{`def calculate_sum(numbers):
    result = 0
    for number in numbers:
        result += number
    return result`}
                    </pre>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>原代码：</div>
                    <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '14px', margin: 0 }}>
{`def get_max_value(data_list):
    max_value = data_list[0]
    for item in data_list:
        if item > max_value:
            max_value = item
    return max_value`}
                    </pre>
                  </td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>代码变体（红色为变更部分）：</div>
                    <div style={{ background: '#e6f7ff', padding: '8px', borderRadius: '4px', fontSize: '14px', fontFamily: 'monospace', whiteSpace: 'pre' }}>
                    {`def `}<span style={{ color: 'red', fontWeight: 'bold' }}>calc_sum</span>{`(`}<span style={{ color: 'red', fontWeight: 'bold' }}>nums</span>{`):
    `}<span style={{ color: 'red', fontWeight: 'bold' }}>res</span>{` = 0
    for `}<span style={{ color: 'red', fontWeight: 'bold' }}>num</span>{` in `}<span style={{ color: 'red', fontWeight: 'bold' }}>nums</span>{`:
        `}<span style={{ color: 'red', fontWeight: 'bold' }}>res</span>{` += `}<span style={{ color: 'red', fontWeight: 'bold' }}>num</span>{`
    return `}<span style={{ color: 'red', fontWeight: 'bold' }}>res</span>
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>代码变体（红色为变更部分）：</div>
                    <div style={{ background: '#e6f7ff', padding: '8px', borderRadius: '4px', fontSize: '14px', fontFamily: 'monospace', whiteSpace: 'pre' }}>
                    {`def get_max_value(data_list):
    max_value = data_list[0]
    for `}<span style={{ color: 'red', fontWeight: 'bold' }}>index in range(len(data_list))</span>{`:
        if data_list`}<span style={{ color: 'red', fontWeight: 'bold' }}>[index]</span>{` > max_value:
            max_value = data_list`}<span style={{ color: 'red', fontWeight: 'bold' }}>[index]</span>{`
    return max_value`}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Attack;
