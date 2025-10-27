import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Row, 
  Col,
  Tag,
  Descriptions,
  Button,
  Divider,
  Alert,
  message
} from 'antd';
import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Paragraph } = Typography;

const AttackResult: React.FC = () => {
  const navigate = useNavigate();
  const [resultData, setResultData] = useState<any>(null);
  const [copiedType, setCopiedType] = useState<string>('');

  useEffect(() => {
    // 从sessionStorage获取攻击结果
    const storedData = sessionStorage.getItem('attackResult');
    if (storedData) {
      setResultData(JSON.parse(storedData));
    } else {
      // 如果没有存储的数据，使用模拟数据进行展示
      const mockData = {
        taskId: 'mock-task-12345',
        result: {
          original_code: 'def calculate_sum(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result',
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
          attack_strategy: 'identifier_rename'
        },
        config: {
          method: 'itgen',
          model_id: 'codebert',
          task_type: 'clone_detection',
          language: 'python',
          attack_strategy: 'identifier_rename'
        }
      };
      setResultData(mockData);
    }
  }, [navigate]);

  const handleBack = () => {
    navigate('/attack');
  };

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      message.success('代码已复制到剪贴板');
      
      // 2秒后清除复制状态
      setTimeout(() => {
        setCopiedType('');
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
      message.error('复制失败，请手动复制');
      
      // 备用方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        message.success('代码已复制到剪贴板');
        setCopiedType(type);
        setTimeout(() => {
          setCopiedType('');
        }, 2000);
      } catch (fallbackErr) {
        message.error('复制失败，请手动复制');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  if (!resultData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="未找到攻击结果"
          description="请返回攻击页面重新开始攻击"
          type="warning"
          showIcon
        />
        <Button onClick={handleBack} style={{ marginTop: '16px' }}>
          返回攻击页面
        </Button>
      </div>
    );
  }

  const { taskId, result, config } = resultData;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          style={{ marginBottom: '16px' }}
        >
          返回攻击页面
        </Button>
        <Title level={2}>对抗攻击结果</Title>
      </div>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="攻击信息" style={{ marginBottom: '16px' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="任务ID">{taskId}</Descriptions.Item>
              <Descriptions.Item label="攻击方法">
                <Tag color="blue">{config?.method || 'ITGen'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="攻击手段">
                <Tag color="green">
                  {config?.attack_strategy === 'identifier_rename' ? '标识符重命名' : 
                   config?.attack_strategy === 'equivalent_transform' ? '等价变换' : 
                   config?.attack_strategy === 'both' ? '两种手段结合' : '未知'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="测试模型">
                <Tag color="purple">{config?.model_id || 'CodeBERT'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                <Tag color="orange">
                  {config?.task_type === 'clone_detection' ? '克隆检测' : 
                   config?.task_type === 'vulnerability_detection' ? '漏洞检测' : 
                   config?.task_type === 'code_summarization' ? '代码摘要' : '未知'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="编程语言">
                <Tag>{config?.language || 'Python'}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {result && (
        <>
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={12}>
              <Card title="原始代码" extra={
                <Button 
                  type="text" 
                  icon={<CopyOutlined />} 
                  size="small"
                  onClick={() => handleCopy(result.original_code || '', 'original')}
                  style={{ 
                    color: copiedType === 'original' ? '#52c41a' : undefined,
                    fontWeight: copiedType === 'original' ? 'bold' : 'normal'
                  }}
                >
                  {copiedType === 'original' ? '已复制' : '复制'}
                </Button>
              }>
                <Paragraph style={{ margin: 0 }}>
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '4px',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {result.original_code || '暂无数据'}
                  </pre>
                </Paragraph>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="代码变体" extra={
                <Button 
                  type="text" 
                  icon={<CopyOutlined />} 
                  size="small"
                  onClick={() => handleCopy(result.adversarial_code || '', 'adversarial')}
                  style={{ 
                    color: copiedType === 'adversarial' ? '#52c41a' : undefined,
                    fontWeight: copiedType === 'adversarial' ? 'bold' : 'normal'
                  }}
                >
                  {copiedType === 'adversarial' ? '已复制' : '复制'}
                </Button>
              }>
                <Paragraph style={{ margin: 0 }}>
                  <pre style={{ 
                    background: '#e6f7ff', 
                    padding: '12px', 
                    borderRadius: '4px',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {result.adversarial_code || '暂无数据'}
                  </pre>
                </Paragraph>
              </Card>
            </Col>
          </Row>

          {result.replaced_words && Object.keys(result.replaced_words).length > 0 && (
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={24}>
                <Card title="标识符替换映射">
                  <Descriptions bordered column={3}>
                    {Object.entries(result.replaced_words).map(([key, value]) => (
                      <Descriptions.Item key={key} label={<Text style={{ color: '#1890ff' }}>{key}</Text>}>
                        <Text style={{ color: '#52c41a' }}>{value as string}</Text>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Card title="查询次数">
                <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {result.query_times || 'N/A'}
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="时间成本">
                <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                  {result.time_cost ? `${result.time_cost}s` : 'N/A'}
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="攻击方法">
                <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                  {result.method || 'ITGen'}
                </Text>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Divider />

      <Row justify="center" style={{ marginTop: '24px' }}>
        <Col>
          <Button 
            type="primary" 
            onClick={handleBack}
            size="large"
            style={{ minWidth: '200px' }}
          >
            返回攻击页面
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default AttackResult;
