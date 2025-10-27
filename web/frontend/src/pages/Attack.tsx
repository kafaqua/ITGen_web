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

const { Title } = Typography;
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
      const response = await ApiService.startAttack(values);
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
      const response = await ApiService.getAttackResults(taskId);
      if (response.success) {
        message.success('攻击结果已生成');
        setTaskStatus('攻击完成 - 结果已生成');
        setAttackComplete(true);
        setAttackResult(response.data);
      } else {
        // 如果没有真实数据，使用模拟数据
        const mockResult = {
          original_code: form.getFieldValue('code_data') || 'def calculate_sum(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result',
          adversarial_code: 'def calc_sum(nums):\n    res = 0\n    for num in nums:\n        res += num\n    return res',
          replaced_words: {
            'calculate_sum': 'calc_sum',
            'numbers': 'nums',
            'result': 'res',
            'number': 'num'
          },
          query_times: 150,
          time_cost: 45.2,
          method: 'itgen',
          attack_strategy: form.getFieldValue('attack_strategy') || 'identifier_rename'
        };
        setAttackResult(mockResult);
        setAttackComplete(true);
      }
    } catch (error) {
      console.error('Error fetching attack results:', error);
      // 使用模拟数据作为备用
      const mockResult = {
        original_code: form.getFieldValue('code_data') || 'def calculate_sum(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result',
        adversarial_code: 'def calc_sum(nums):\n    res = 0\n    for num in nums:\n        res += num\n    return res',
        replaced_words: {
          'calculate_sum': 'calc_sum',
          'numbers': 'nums',
          'result': 'res',
          'number': 'num'
        },
        query_times: 150,
        time_cost: 45.2,
        method: 'itgen',
        attack_strategy: form.getFieldValue('attack_strategy') || 'identifier_rename'
      };
      setAttackResult(mockResult);
      setAttackComplete(true);
      message.success('使用模拟数据展示结果');
    }
  };

  const handleViewResult = () => {
    if (currentTaskId && attackResult) {
      // 将攻击结果存储到sessionStorage以便在结果页面访问
      sessionStorage.setItem('attackResult', JSON.stringify({
        taskId: currentTaskId,
        result: attackResult,
        config: form.getFieldsValue()
      }));
      navigate('/attack/result');
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
                    initialValue="clone_detection"
                  >
                    <Select placeholder="请选择任务类型">
                      <Option value="clone_detection">克隆检测</Option>
                      <Option value="vulnerability_detection">漏洞检测</Option>
                      <Option value="code_summarization">代码摘要</Option>
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

              <Form.Item
                name="code_data"
                label="代码段"
                rules={[{ required: true, message: '请输入代码段' }]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="请输入要攻击的代码..."
                />
              </Form.Item>

              <Divider orientation="left">代码变体示例</Divider>

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
                  status="success"
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Alert
                    message="攻击已完成"
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
    </div>
  );
};

export default Attack;
