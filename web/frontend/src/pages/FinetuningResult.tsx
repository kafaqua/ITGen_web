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
  Statistic,
  Progress,
  Space
} from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const { Title, Text } = Typography;

// 后端返回的结果格式
interface BackendFinetuningResult {
  task_id: string;
  status: string;
  model_name: string;
  task_type: string;
  dataset: string;
  attack_method: string;
  parameters: {
    learning_rate: number;
    epochs: number;
    batch_size: number;
  };
  training_samples: number;
  old_metrics: {
    asr: number;
    ami: number;
    art: number;
  };
  new_metrics: {
    [method: string]: {
      asr: number;
      ami: number;
      art: number;
    };
  };
  comparison: {
    [method: string]: {
      old_asr: number;
      old_ami: number;
      old_art: number;
      new_asr: number;
      new_ami: number;
      new_art: number;
      asr_change: number;
      ami_change: number;
      art_change: number;
    };
  };
  created_at: string;
  started_at: string;
  completed_at: string;
}

interface FinetuningResultData {
  result: BackendFinetuningResult;
  config: any;
  taskId: string | null;
}

const FinetuningResult: React.FC = () => {
  const navigate = useNavigate();
  const [resultData, setResultData] = useState<FinetuningResultData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // 从sessionStorage获取结果数据
        const storedData = sessionStorage.getItem('finetuningResult');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          console.log('📊 加载鲁棒性增强结果:', parsed);
          setResultData(parsed);
        } else {
          console.warn('⚠️ 未找到鲁棒性增强结果');
          navigate('/finetuning');
        }
      } catch (error) {
        console.error('❌ 加载鲁棒性增强结果失败:', error);
        navigate('/finetuning');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate]);

  const handleBack = () => {
    navigate('/finetuning');
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // 模拟下载
      await new Promise(resolve => setTimeout(resolve, 2000));
      const link = document.createElement('a');
      link.href = '#';
      link.download = `${resultData?.result.model_name || 'model'}_enhanced.pth`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('模型下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Alert
            message="正在加载鲁棒性增强结果..."
            description="请稍候"
            type="info"
            showIcon
          />
        </div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Alert
            message="未找到鲁棒性增强结果"
            description="请返回鲁棒性增强页面重新开始训练"
            type="warning"
            showIcon
          />
          <Button onClick={handleBack} style={{ marginTop: '16px' }}>
            返回鲁棒性增强页面
          </Button>
        </div>
      </div>
    );
  }

  const { result } = resultData;

  // 计算平均comparison数据（如果有多个攻击方法）
  const getAverageComparison = () => {
    if (!result.comparison || Object.keys(result.comparison).length === 0) {
      return null;
    }
    
    const methods = Object.keys(result.comparison);
    const avgComparison = {
      old_asr: 0,
      old_ami: 0,
      old_art: 0,
      new_asr: 0,
      new_ami: 0,
      new_art: 0,
      asr_change: 0,
      ami_change: 0,
      art_change: 0
    };
    
    methods.forEach(method => {
      const comp = result.comparison[method];
      avgComparison.old_asr += comp.old_asr;
      avgComparison.old_ami += comp.old_ami;
      avgComparison.old_art += comp.old_art;
      avgComparison.new_asr += comp.new_asr;
      avgComparison.new_ami += comp.new_ami;
      avgComparison.new_art += comp.new_art;
      avgComparison.asr_change += comp.asr_change;
      avgComparison.ami_change += comp.ami_change;
      avgComparison.art_change += comp.art_change;
    });
    
    const count = methods.length;
    Object.keys(avgComparison).forEach(key => {
      avgComparison[key as keyof typeof avgComparison] /= count;
    });
    
    return avgComparison;
  };

  const avgComp = getAverageComparison();

  return (
    <div style={{ padding: '24px' }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={handleBack}
        style={{ marginBottom: '16px' }}
      >
        返回鲁棒性增强页面
      </Button>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Title level={2}>鲁棒性增强结果</Title>
      </div>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="模型信息" style={{ marginBottom: '16px' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="任务ID" span={2}>{result.task_id}</Descriptions.Item>
              <Descriptions.Item label="模型名称">
                <Tag color="blue">{result.model_name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                <Tag color="purple">
                  {result.task_type === 'clone-detection' ? '克隆检测' :
                   result.task_type === 'vulnerability-detection' ? '漏洞检测' :
                   result.task_type === 'code-summarization' ? '代码摘要' : result.task_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="数据集">{result.dataset || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="训练样本数">{result.training_samples || 0}</Descriptions.Item>
              <Descriptions.Item label="攻击方法">
                {result.attack_method ? result.attack_method.split(',').map((method: string) => (
                  <Tag key={method.trim()} color="green" style={{ marginRight: '4px' }}>
                    {method.trim().toUpperCase()}
                  </Tag>
                )) : <Tag color="default">未指定</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="学习率">
                {result.parameters?.learning_rate || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="训练周期">{result.parameters?.epochs || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="批次大小">{result.parameters?.batch_size || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {result.created_at ? new Date(result.created_at).toLocaleString('zh-CN') : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {result.completed_at ? new Date(result.completed_at).toLocaleString('zh-CN') : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="鲁棒性增强前模型性能" bordered={false}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic 
                  title="ASR (攻击成功率)" 
                  value={result.old_metrics?.asr || 0} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="AMI (平均调用次数)" 
                  value={result.old_metrics?.ami || 0} 
                  precision={1}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="ART (平均响应时间)" 
                  value={result.old_metrics?.art || 0} 
                  precision={2}
                  suffix="分"
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="鲁棒性增强后模型性能" bordered={false}>
            {result.new_metrics && Object.keys(result.new_metrics).length > 0 ? (
              <div>
                {Object.entries(result.new_metrics).map(([method, metrics]: [string, any]) => (
                  <div key={method} style={{ marginBottom: '16px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                      {method.toUpperCase()} 方法
                    </Text>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic 
                          title="ASR" 
                          value={metrics.asr || 0} 
                          precision={2}
                          suffix="%"
                          valueStyle={{ color: '#3f8600' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="AMI" 
                          value={metrics.ami || 0} 
                          precision={1}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="ART" 
                          value={metrics.art || 0} 
                          precision={2}
                          suffix="分"
                          valueStyle={{ color: '#fa8c16' }}
                        />
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            ) : (
              <Alert message="暂无微调后数据" type="info" />
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 性能变化统计 */}
      {avgComp && (
        <Row gutter={16}>
          <Col span={24}>
            <Card title="性能变化统计" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="ASR变化" 
                    value={avgComp.asr_change} 
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: avgComp.asr_change < 0 ? '#3f8600' : '#cf1322' }}
                    prefix={avgComp.asr_change < 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    {avgComp.old_asr.toFixed(2)}% → {avgComp.new_asr.toFixed(2)}%
                  </div>
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="AMI变化" 
                    value={avgComp.ami_change} 
                    precision={1}
                    valueStyle={{ color: avgComp.ami_change > 0 ? '#1890ff' : '#666' }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    {avgComp.old_ami.toFixed(1)} → {avgComp.new_ami.toFixed(1)}
                  </div>
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="ART变化" 
                    value={avgComp.art_change} 
                    precision={2}
                    suffix="分"
                    valueStyle={{ color: avgComp.art_change < 0 ? '#3f8600' : '#fa8c16' }}
                    prefix={avgComp.art_change < 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    {avgComp.old_art.toFixed(2)}分 → {avgComp.new_art.toFixed(2)}分
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* 性能对比柱状图 */}
      {avgComp && (
        <Row gutter={16} style={{ marginTop: '16px' }}>
          <Col span={24}>
            <Card title="增强前后性能对比图表" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <Title level={5}>攻击成功率 (ASR)</Title>
                    <Text type="secondary" style={{ fontSize: '12px' }}>数值越低表示模型越鲁棒</Text>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: '增强前', value: avgComp.old_asr, fill: '#ff4d4f' },
                        { name: '增强后', value: avgComp.new_asr, fill: '#52c41a' }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        label={{ value: 'ASR (%)', angle: -90, position: 'insideLeft' }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(2)}%`, 'ASR']}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {[0, 1].map((index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ff4d4f' : '#52c41a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <Text strong style={{ color: avgComp.asr_change < 0 ? '#52c41a' : '#ff4d4f' }}>
                      {avgComp.asr_change > 0 ? '+' : ''}{avgComp.asr_change.toFixed(2)}%
                    </Text>
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <Title level={5}>平均调用次数 (AMI)</Title>
                    <Text type="secondary" style={{ fontSize: '12px' }}>数值越高表示攻击越困难</Text>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: '增强前', value: avgComp.old_ami, fill: '#1890ff' },
                        { name: '增强后', value: avgComp.new_ami, fill: '#722ed1' }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        label={{ value: 'AMI', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value.toFixed(1), 'AMI']}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {[0, 1].map((index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#1890ff' : '#722ed1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <Text strong style={{ color: avgComp.ami_change > 0 ? '#52c41a' : '#666' }}>
                      {avgComp.ami_change > 0 ? '+' : ''}{avgComp.ami_change.toFixed(1)}
                    </Text>
                  </div>
                </Col>

                <Col span={8}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <Title level={5}>平均响应时间 (ART)</Title>
                    <Text type="secondary" style={{ fontSize: '12px' }}>攻击生成对抗样本所需时间</Text>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: '增强前', value: avgComp.old_art, fill: '#fa8c16' },
                        { name: '增强后', value: avgComp.new_art, fill: '#13c2c2' }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        label={{ value: 'ART (分)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(2)}分`, 'ART']}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {[0, 1].map((index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#fa8c16' : '#13c2c2'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <Text strong style={{ color: avgComp.art_change < 0 ? '#52c41a' : '#fa8c16' }}>
                      {avgComp.art_change > 0 ? '+' : ''}{avgComp.art_change.toFixed(2)}分
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* 各攻击方法详细对比 */}
      {result.comparison && Object.keys(result.comparison).length > 0 && (
        <Row gutter={16}>
          <Col span={24}>
            <Card title="各攻击方法性能对比" style={{ marginBottom: '16px' }}>
              {Object.entries(result.comparison).map(([method, comp]: [string, any]) => (
                <div key={method} style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #f0f0f0' }}>
                  <Text strong style={{ display: 'block', marginBottom: '16px', fontSize: '16px' }}>
                    {method.toUpperCase()} 方法
                  </Text>
                  
                  {/* 数值统计 */}
                  <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="ASR变化"
                          value={comp.asr_change}
                          precision={2}
                          suffix="%"
                          valueStyle={{ color: comp.asr_change < 0 ? '#3f8600' : '#cf1322' }}
                          prefix={comp.asr_change < 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {comp.old_asr.toFixed(2)}% → {comp.new_asr.toFixed(2)}%
                        </div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="AMI变化"
                          value={comp.ami_change}
                          precision={1}
                          valueStyle={{ color: comp.ami_change > 0 ? '#1890ff' : '#666' }}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {comp.old_ami.toFixed(1)} → {comp.new_ami.toFixed(1)}
                        </div>
                      </Card>
                    </Col>
                    <Col span={8}>
                      <Card size="small">
                        <Statistic
                          title="ART变化"
                          value={comp.art_change}
                          precision={2}
                          suffix="分"
                          valueStyle={{ color: comp.art_change < 0 ? '#3f8600' : '#fa8c16' }}
                          prefix={comp.art_change < 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {comp.old_art.toFixed(2)}分 → {comp.new_art.toFixed(2)}分
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* 柱状图可视化 */}
                  <div style={{ marginTop: '16px' }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={[
                          {
                            name: 'ASR (%)',
                            增强前: comp.old_asr,
                            增强后: comp.new_asr
                          },
                          {
                            name: 'AMI',
                            增强前: comp.old_ami,
                            增强后: comp.new_ami
                          },
                          {
                            name: 'ART (分)',
                            增强前: comp.old_art,
                            增强后: comp.new_art
                          }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === '增强前' || name === '增强后') {
                              return [value.toFixed(2), name];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="增强前" fill="#ff7875" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="增强后" fill="#95de64" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      )}

      <Divider />

      {/* 训练过程可视化 - 后端未提供training_logs数据，已隐藏 */}
      {/* 由于后端不返回training_logs，所有训练曲线图已被移除 */}

      <Row justify="center" style={{ marginTop: '24px' }}>
        <Col>
          <Space size="large">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
              size="large"
              style={{ minWidth: '200px' }}
            >
              返回鲁棒性增强
            </Button>
            <Button 
              type="primary"
              icon={<DownloadOutlined />} 
              onClick={handleDownload}
              loading={downloading}
              size="large"
              style={{ minWidth: '200px' }}
            >
              下载增强模型
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default FinetuningResult;
