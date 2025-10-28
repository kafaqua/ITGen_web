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

  useEffect(() => {
    const storedData = sessionStorage.getItem('finetuningResult');
    if (storedData) {
      setResultData(JSON.parse(storedData));
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
          training_logs: []
        },
        config: {},
        taskId: 'mock-task'
      };
      setResultData(mockData);
    }
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

