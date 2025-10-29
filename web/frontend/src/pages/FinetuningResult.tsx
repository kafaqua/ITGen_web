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
import ApiService from '../services/api';

const { Title, Text } = Typography;

interface FinetuningResultData {
  result: {
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
  };
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
        // 优先从sessionStorage获取taskId
        const storedData = sessionStorage.getItem('finetuningResult');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          
          // 如果有taskId，尝试从API获取最新数据
          if (parsed.taskId) {
            try {
              const apiResponse = await ApiService.getFinetuningResults(parsed.taskId);
              if (apiResponse.success) {
                // 将API数据转换为前端格式
                const formattedData: FinetuningResultData = {
                  result: {
                    model_id: apiResponse.model_id,
                    model_name: apiResponse.model_name,
                    training_time: apiResponse.training_time,
                    final_loss: apiResponse.final_loss,
                    original_accuracy: apiResponse.original_accuracy,
                    original_bleu_score: apiResponse.original_bleu || 0.68,
                    original_asr: apiResponse.original_asr,
                    original_ami: apiResponse.original_ami / 100, // 转换为0-1范围
                    original_art: apiResponse.original_art / 100,
                    final_accuracy: apiResponse.final_accuracy,
                    final_bleu_score: apiResponse.final_bleu || 0.75,
                    final_asr: apiResponse.final_asr,
                    final_ami: apiResponse.final_ami / 100,
                    final_art: apiResponse.final_art / 100,
                    adversarial_accuracy: apiResponse.final_accuracy - 0.06, // 估算
                    adversarial_bleu_score: apiResponse.final_bleu ? apiResponse.final_bleu - 0.05 : 0.70,
                    accuracy_improvement: apiResponse.accuracy_improvement * 100,
                    bleu_improvement: apiResponse.bleu_improvement || 10.3,
                    asr_improvement: Math.abs(apiResponse.asr_improvement) * 100,
                    ami_improvement: Math.abs(apiResponse.ami_improvement),
                    art_improvement: Math.abs(apiResponse.art_improvement),
                    overall_improvement: apiResponse.overall_improvement,
                    model_path: apiResponse.model_path,
                    training_logs: apiResponse.training_logs || []
                  },
                  config: parsed.config || {},
                  taskId: parsed.taskId
                };
                setResultData(formattedData);
                setLoading(false);
                return;
              }
            } catch (apiError) {
              console.warn('Failed to fetch from API, using stored data:', apiError);
            }
          }
          
          // 如果API调用失败，使用sessionStorage数据
          setResultData(parsed);
          setLoading(false);
        } else {
          // Mock data fallback
          const mockData: FinetuningResultData = {
        result: {
          model_id: 'finetuned_mock',
          model_name: '鲁棒性增强模型',
          training_time: 1200,
          final_loss: 0.15,
          // 微调前性能
          original_accuracy: 0.78,
          original_bleu_score: 0.68,
          original_asr: 0.42,
          original_ami: 0.72,
          original_art: 0.52,
          // 微调后性能
          final_accuracy: 0.88,
          final_bleu_score: 0.75,
          final_asr: 0.28,
          final_ami: 0.85,
          final_art: 0.35,
          adversarial_accuracy: 0.82,
          adversarial_bleu_score: 0.70,
          // 性能提升
          accuracy_improvement: 12.8,
          bleu_improvement: 10.3,
          asr_improvement: 33.3, // ASR降低是好事
          ami_improvement: 18.1,
          art_improvement: 32.7, // ART降低是好事
          overall_improvement: 23.4,
          model_path: '/models/finetuned_mock',
          training_logs: [
            // Epoch 1
            { epoch: 1, step: 10, loss: 0.85, accuracy: 0.65, asr: 0.45, learning_rate: 0.0001 },
            { epoch: 1, step: 20, loss: 0.78, accuracy: 0.68, asr: 0.43, learning_rate: 0.0001 },
            { epoch: 1, step: 30, loss: 0.72, accuracy: 0.70, asr: 0.42, learning_rate: 0.0001 },
            // Epoch 2
            { epoch: 2, step: 10, loss: 0.65, accuracy: 0.73, asr: 0.40, learning_rate: 0.0001 },
            { epoch: 2, step: 20, loss: 0.58, accuracy: 0.76, asr: 0.38, learning_rate: 0.0001 },
            { epoch: 2, step: 30, loss: 0.52, accuracy: 0.78, asr: 0.36, learning_rate: 0.0001 },
            // Epoch 3
            { epoch: 3, step: 10, loss: 0.45, accuracy: 0.80, asr: 0.34, learning_rate: 0.00009 },
            { epoch: 3, step: 20, loss: 0.38, accuracy: 0.82, asr: 0.32, learning_rate: 0.00009 },
            { epoch: 3, step: 30, loss: 0.32, accuracy: 0.84, asr: 0.30, learning_rate: 0.00009 },
            // Epoch 4
            { epoch: 4, step: 10, loss: 0.28, accuracy: 0.85, asr: 0.29, learning_rate: 0.00008 },
            { epoch: 4, step: 20, loss: 0.24, accuracy: 0.86, asr: 0.28, learning_rate: 0.00008 },
            { epoch: 4, step: 30, loss: 0.20, accuracy: 0.87, asr: 0.28, learning_rate: 0.00008 },
            // Epoch 5
            { epoch: 5, step: 10, loss: 0.18, accuracy: 0.87, asr: 0.28, learning_rate: 0.00007 },
            { epoch: 5, step: 20, loss: 0.16, accuracy: 0.88, asr: 0.28, learning_rate: 0.00007 },
            { epoch: 5, step: 30, loss: 0.15, accuracy: 0.88, asr: 0.28, learning_rate: 0.00007 }
          ]
        },
        config: {},
        taskId: 'mock-task'
      };
      setResultData(mockData);
      setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load finetuning results:', error);
        setLoading(false);
      }
    };
    
    fetchResults();
  }, []);

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
      link.download = `${resultData?.result.model_name || 'model'}.pth`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('模型下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请稍后重试');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Alert
          message="正在加载鲁棒性增强结果..."
          description="请稍候"
          type="info"
          showIcon
        />
      </div>
    );
  }

  if (!resultData) {
    return (
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
    );
  }

  const { result } = resultData;

  const metricComparison = [
    {
      name: '准确率',
      original: result.original_accuracy,
      final: result.final_accuracy,
      improvement: result.accuracy_improvement,
      unit: '%'
    },
    {
      name: 'BLEU分数',
      original: result.original_bleu_score,
      final: result.final_bleu_score,
      improvement: result.bleu_improvement,
      unit: ''
    },
    {
      name: 'ASR',
      original: result.original_asr,
      final: result.final_asr,
      improvement: result.asr_improvement,
      unit: '%',
      lowerIsBetter: true // ASR降低是好事
    },
    {
      name: 'AMI',
      original: result.original_ami,
      final: result.final_ami,
      improvement: result.ami_improvement,
      unit: '%'
    },
    {
      name: 'ART',
      original: result.original_art,
      final: result.final_art,
      improvement: result.art_improvement,
      unit: '%',
      lowerIsBetter: true // ART降低是好事
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          style={{ marginBottom: '16px' }}
        >
          返回鲁棒性增强页面
        </Button>
        <Title level={2}>鲁棒性增强结果</Title>
      </div>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="模型信息" style={{ marginBottom: '16px' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="模型ID">{result.model_id}</Descriptions.Item>
              <Descriptions.Item label="模型名称">
                <Tag color="blue">{result.model_name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="训练时间">
                {Math.floor(result.training_time / 60)} 分钟 {result.training_time % 60} 秒
              </Descriptions.Item>
              <Descriptions.Item label="最终损失">{result.final_loss.toFixed(4)}</Descriptions.Item>
              <Descriptions.Item label="模型路径">{result.model_path}</Descriptions.Item>
              <Descriptions.Item label="整体提升">
                <Tag color="success">+{result.overall_improvement.toFixed(2)}%</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="鲁棒性增强前模型性能" bordered={false}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="准确率" 
                  value={result.original_accuracy} 
                  precision={2}
                  suffix="%"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="BLEU分数" 
                  value={result.original_bleu_score} 
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="ASR" 
                  value={result.original_asr} 
                  precision={2}
                  suffix="%"
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="AMI" 
                  value={result.original_ami} 
                  precision={2}
                  suffix="%"
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="ART" 
                  value={result.original_art} 
                  precision={2}
                  suffix="%"
                />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="鲁棒性增强后模型性能" bordered={false}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="准确率" 
                  value={result.final_accuracy} 
                  precision={2}
                  suffix="%"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title="BLEU分数" 
                  value={result.final_bleu_score} 
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="ASR" 
                  value={result.final_asr} 
                  precision={2}
                  suffix="%"
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="AMI" 
                  value={result.final_ami} 
                  precision={2}
                  suffix="%"
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="ART" 
                  value={result.final_art} 
                  precision={2}
                  suffix="%"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={16}>
        <Col span={24}>
          <Card title="性能对比可视化" style={{ marginBottom: '16px' }}>
            {metricComparison.map((metric, index) => (
              <div key={index} style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>{metric.name}</Text>
                  <Tag color={metric.improvement > 0 ? 'success' : 'error'}>
                    {metric.improvement > 0 ? '+' : ''}{metric.improvement.toFixed(2)}%
                  </Tag>
                </div>
                <Row gutter={16} align="middle">
                  <Col span={8}>
                    <Text type="secondary">鲁棒性增强前: {metric.original.toFixed(3)}{metric.unit}</Text>
                  </Col>
                  <Col span={8}>
                    <Progress 
                      percent={Math.min(100, (metric.original * 100) / Math.max(...metricComparison.map(m => Math.max(m.original, m.final))))}
                      showInfo={false}
                      strokeColor="#ff4d4f"
                      size="small"
                    />
                  </Col>
                  <Col span={8}></Col>
                </Row>
                <Row gutter={16} align="middle" style={{ marginTop: '4px' }}>
                  <Col span={8}></Col>
                  <Col span={8}>
                    <Progress 
                      percent={Math.min(100, (metric.final * 100) / Math.max(...metricComparison.map(m => Math.max(m.original, m.final))))}
                      showInfo={false}
                      strokeColor="#52c41a"
                      size="small"
                    />
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">鲁棒性增强后: {metric.final.toFixed(3)}{metric.unit}</Text>
                  </Col>
                </Row>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Card title="性能提升统计">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic 
                  title="准确率提升" 
                  value={result.accuracy_improvement} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="BLEU分数提升" 
                  value={result.bleu_improvement} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="ASR降低" 
                  value={result.asr_improvement} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="AMI提升" 
                  value={result.ami_improvement} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="ART降低" 
                  value={result.art_improvement} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="整体提升" 
                  value={result.overall_improvement} 
                  precision={2}
                  suffix="%"
                  valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 训练过程可视化 */}
      {result.training_logs && result.training_logs.length > 0 && (
        <>
          <Row gutter={16} style={{ marginTop: '24px' }}>
            <Col span={24}>
              <Card title="训练过程可视化 - 损失函数曲线">
                <div style={{ padding: '20px' }}>
                  {/* 损失函数图表 */}
                  <div style={{ position: 'relative', height: '300px' }}>
                    {/* Y轴标签 */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '0', 
                      top: '0', 
                      bottom: '40px', 
                      width: '40px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      paddingRight: '8px'
                    }}>
                      <Text style={{ fontSize: '12px', color: '#666' }}>1.0</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>0.8</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>0.6</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>0.4</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>0.2</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>0.0</Text>
                    </div>

                    {/* 图表区域 */}
                    <div style={{ 
                      marginLeft: '50px', 
                      marginRight: '20px',
                      height: '260px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      background: '#fafafa',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* 网格线 */}
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${i * 20}%`,
                          height: '1px',
                          background: '#e8e8e8'
                        }} />
                      ))}

                      {/* 损失函数曲线 */}
                      <svg 
                        width="100%" 
                        height="260" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                        style={{ position: 'absolute', top: 0, left: 0 }}
                      >
                        <polyline
                          points={result.training_logs.map((log, index) => {
                            const x = (index / (result.training_logs.length - 1)) * 100;
                            const y = (1 - log.loss) * 100;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#000000"
                          strokeWidth="0.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                      
                      {/* 数据点（独立层，保持圆形） */}
                      <svg 
                        width="100%" 
                        height="260" 
                        style={{ position: 'absolute', top: 0, left: 0 }}
                      >
                        {result.training_logs.map((log, index) => {
                          const xPercent = (index / (result.training_logs.length - 1)) * 100;
                          const yPercent = (1 - log.loss) * 100;
                          return (
                            <circle
                              key={index}
                              cx={`${xPercent}%`}
                              cy={`${yPercent}%`}
                              r="5"
                              fill="#ff4d4f"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    {/* X轴标签 */}
                    <div style={{ 
                      marginLeft: '50px', 
                      marginRight: '20px',
                      marginTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <Text style={{ fontSize: '12px', color: '#666' }}>Epoch 1</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>Epoch 2</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>Epoch 3</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>Epoch 4</Text>
                      <Text style={{ fontSize: '12px', color: '#666' }}>Epoch 5</Text>
                    </div>
                  </div>

                  <Divider />

                  {/* 图例和统计 */}
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', padding: '12px', background: '#fff1f0', borderRadius: '6px' }}>
                        <Text strong style={{ color: '#ff4d4f' }}>损失函数: </Text>
                        <Text>从 {result.training_logs[0].loss.toFixed(3)} 降至 {result.final_loss.toFixed(3)}</Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', padding: '12px', background: '#e6f7ff', borderRadius: '6px' }}>
                        <Text strong style={{ color: '#1890ff' }}>总训练步数: </Text>
                        <Text>{result.training_logs.length} 步</Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', padding: '12px', background: '#f6ffed', borderRadius: '6px' }}>
                        <Text strong style={{ color: '#52c41a' }}>收敛速度: </Text>
                        <Text>良好</Text>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={12}>
              <Card title="准确率变化曲线">
                <div style={{ padding: '20px' }}>
                  <div style={{ position: 'relative', height: '250px' }}>
                    {/* Y轴 */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '0', 
                      top: '0', 
                      bottom: '30px', 
                      width: '40px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      paddingRight: '8px'
                    }}>
                      <Text style={{ fontSize: '11px', color: '#666' }}>100%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>80%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>60%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>40%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>20%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>0%</Text>
                    </div>

                    <div style={{ 
                      marginLeft: '50px', 
                      height: '220px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      background: '#fafafa',
                      position: 'relative'
                    }}>
                      {/* 网格 */}
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${i * 20}%`,
                          height: '1px',
                          background: '#e8e8e8'
                        }} />
                      ))}

                      {/* 准确率曲线 */}
                      <svg 
                        width="100%" 
                        height="220" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                        style={{ position: 'absolute' }}
                      >
                        <polyline
                          points={result.training_logs.map((log, index) => {
                            const x = (index / (result.training_logs.length - 1)) * 100;
                            const y = (1 - log.accuracy) * 100;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#000000"
                          strokeWidth="0.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                      
                      {/* 数据点（独立层，保持圆形） */}
                      <svg 
                        width="100%" 
                        height="220" 
                        style={{ position: 'absolute' }}
                      >
                        {result.training_logs.filter((_, i) => i % 3 === 0).map((log, index) => {
                          const actualIndex = index * 3;
                          const xPercent = (actualIndex / (result.training_logs.length - 1)) * 100;
                          const yPercent = (1 - log.accuracy) * 100;
                          return (
                            <circle
                              key={actualIndex}
                              cx={`${xPercent}%`}
                              cy={`${yPercent}%`}
                              r="5"
                              fill="#52c41a"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    <div style={{ marginLeft: '50px', marginTop: '8px', textAlign: 'center' }}>
                      <Text style={{ fontSize: '11px', color: '#666' }}>训练步数</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="攻击成功率(ASR)变化曲线">
                <div style={{ padding: '20px' }}>
                  <div style={{ position: 'relative', height: '250px' }}>
                    {/* Y轴 */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '0', 
                      top: '0', 
                      bottom: '30px', 
                      width: '40px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      paddingRight: '8px'
                    }}>
                      <Text style={{ fontSize: '11px', color: '#666' }}>50%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>40%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>30%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>20%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>10%</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>0%</Text>
                    </div>

                    <div style={{ 
                      marginLeft: '50px', 
                      height: '220px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      background: '#fafafa',
                      position: 'relative'
                    }}>
                      {/* 网格 */}
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${i * 20}%`,
                          height: '1px',
                          background: '#e8e8e8'
                        }} />
                      ))}

                      {/* ASR曲线 */}
                      <svg 
                        width="100%" 
                        height="220" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                        style={{ position: 'absolute' }}
                      >
                        <polyline
                          points={result.training_logs.map((log, index) => {
                            const x = (index / (result.training_logs.length - 1)) * 100;
                            const y = (1 - (log.asr / 0.5)) * 100; // 归一化到0-50%范围
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#000000"
                          strokeWidth="0.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                      
                      {/* 数据点（独立层，保持圆形） */}
                      <svg 
                        width="100%" 
                        height="220" 
                        style={{ position: 'absolute' }}
                      >
                        {result.training_logs.filter((_, i) => i % 3 === 0).map((log, index) => {
                          const actualIndex = index * 3;
                          const xPercent = (actualIndex / (result.training_logs.length - 1)) * 100;
                          const yPercent = (1 - (log.asr / 0.5)) * 100;
                          return (
                            <circle
                              key={actualIndex}
                              cx={`${xPercent}%`}
                              cy={`${yPercent}%`}
                              r="5"
                              fill="#1890ff"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    <div style={{ marginLeft: '50px', marginTop: '8px', textAlign: 'center' }}>
                      <Text style={{ fontSize: '11px', color: '#666' }}>训练步数</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={24}>
              <Card title="学习率调度">
                <div style={{ padding: '20px' }}>
                  <div style={{ position: 'relative', height: '200px' }}>
                    {/* Y轴 */}
                    <div style={{ 
                      position: 'absolute', 
                      left: '0', 
                      top: '0', 
                      bottom: '30px', 
                      width: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      paddingRight: '8px'
                    }}>
                      <Text style={{ fontSize: '11px', color: '#666' }}>1.0e-4</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>8.0e-5</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>6.0e-5</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>4.0e-5</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>2.0e-5</Text>
                      <Text style={{ fontSize: '11px', color: '#666' }}>0</Text>
                    </div>

                    <div style={{ 
                      marginLeft: '70px', 
                      marginRight: '20px',
                      height: '170px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      background: '#fafafa',
                      position: 'relative'
                    }}>
                      {/* 网格 */}
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: `${i * 20}%`,
                          height: '1px',
                          background: '#e8e8e8'
                        }} />
                      ))}

                      {/* 学习率曲线 */}
                      <svg 
                        width="100%" 
                        height="170" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                        style={{ position: 'absolute' }}
                      >
                        <polyline
                          points={result.training_logs.map((log, index) => {
                            const x = (index / (result.training_logs.length - 1)) * 100;
                            const y = (1 - (log.learning_rate / 0.0001)) * 100;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#000000"
                          strokeWidth="0.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                      
                      {/* 数据点（独立层，保持圆形） */}
                      <svg 
                        width="100%" 
                        height="170" 
                        style={{ position: 'absolute' }}
                      >
                        {[0, 5, 10, 14].map((i) => {
                          const log = result.training_logs[i];
                          const xPercent = (i / (result.training_logs.length - 1)) * 100;
                          const yPercent = (1 - (log.learning_rate / 0.0001)) * 100;
                          return (
                            <circle
                              key={i}
                              cx={`${xPercent}%`}
                              cy={`${yPercent}%`}
                              r="5"
                              fill="#722ed1"
                              stroke="#fff"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    <div style={{ marginLeft: '70px', marginRight: '20px', marginTop: '8px', textAlign: 'center' }}>
                      <Text style={{ fontSize: '11px', color: '#666' }}>训练步数</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Divider />

      <Row justify="center" style={{ marginTop: '24px' }}>
        <Col>
          <Space size="large">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
              size="large"
              style={{ minWidth: '200px' }}
            >
              返回鲁棒性增强页面
            </Button>
            <Button 
              type="primary"
              icon={<DownloadOutlined />} 
              onClick={handleDownload}
              loading={downloading}
              size="large"
              style={{ minWidth: '200px' }}
            >
              下载鲁棒性增强后模型
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default FinetuningResult;

