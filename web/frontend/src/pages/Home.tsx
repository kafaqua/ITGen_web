import React from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Space } from 'antd';
import { 
  PlayCircleOutlined, 
  BarChartOutlined, 
  RobotOutlined, 
  BugOutlined,
  SettingOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <RobotOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      title: '模型接入接口',
      description: '支持主流DCM（CodeBERT、GraphCodeBERT、CodeGPT等）的快速接入，提供标准化的预测接口（API或Docker容器），确保模型集成和调用的便捷性。',
      action: () => navigate('/models'),
      actionText: '管理模型'
    },
    {
      icon: <BugOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      title: '对抗样本生成引擎（ITGen核心）',
      description: '基于ITGen核心算法，支持用户自定义攻击预算（最大查询次数、时间限制），生成高质量对抗样本，测试模型脆弱性。',
      action: () => navigate('/attack'),
      actionText: '开始攻击'
    },
    {
      icon: <BarChartOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
      title: '鲁棒性评估报告',
      description: '输出攻击成功率（ASR）、平均模型调用次数（AMI）、平均运行时间（ART），可视化对抗样本与原样本的差异对比。',
      action: () => navigate('/evaluation'),
      actionText: '查看报告'
    },
    {
      icon: <SettingOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
      title: '对抗性微调模块',
      description: '使用生成的对抗样本对原模型进行微调，提升模型鲁棒性，提供微调前后的性能对比（准确率/BLEU分数）。',
      action: () => navigate('/finetuning'),
      actionText: '开始微调'
    },
    {
      icon: <ExperimentOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      title: '批量样本生成与对比分析',
      description: '支持多个模型、多个任务（漏洞检测、克隆检测、代码摘要）的批量测试，与基线方法（ALERT、BeamAttack）自动对比。',
      action: () => navigate('/batch-testing'),
      actionText: '批量对抗样本生成'
    }
  ];

  return (
    <div>
      {/* 欢迎区域 */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <Title level={1} style={{ marginBottom: '16px' }}>
          深度代码模型鲁棒性评估与增强平台
        </Title>
        <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '800px', margin: '0 auto' }}>
          基于ITGen算法的自动化平台，用于评估和提升深度代码模型在面对对抗攻击时的鲁棒性。
          支持CodeBERT、GraphCodeBERT、CodeGPT等主流模型。
        </Paragraph>
        <Space size="large" style={{ marginTop: '24px' }}>
          <Button 
            type="primary" 
            size="large" 
            icon={<PlayCircleOutlined />}
            onClick={() => navigate('/attack')}
          >
            开始攻击
          </Button>
          <Button 
            size="large" 
            icon={<BarChartOutlined />}
            onClick={() => navigate('/evaluation')}
          >
            查看评估
          </Button>
        </Space>
      </div>

      {/* 功能特性 */}
      <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
        核心功能
      </Title>
      <Row gutter={[24, 24]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              hoverable
              className="core-feature-card"
              style={{ height: '100%' }}
              bodyStyle={{ padding: '24px' }}
              onClick={feature.action}
            >
              <div className="feature-content">
                <div className="feature-icon" style={{ textAlign: 'center', marginBottom: '16px' }}>
                  {feature.icon}
                </div>
                <Title level={4} className="feature-title" style={{ textAlign: 'center', marginBottom: '12px' }}>
                  {feature.title}
                </Title>
                <Paragraph style={{ textAlign: 'center', marginBottom: '20px' }}>
                  {feature.description}
                </Paragraph>
                <div style={{ textAlign: 'center' }}>
                  <Button 
                    type="primary" 
                    className="feature-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      feature.action();
                    }}
                  >
                    {feature.actionText}
                  </Button>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 统计数据 */}
      <div style={{ marginTop: '48px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
          平台统计
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="已接入模型"
                value={4}
                prefix={<RobotOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="攻击任务"
                value={12}
                prefix={<BugOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="评估报告"
                value={8}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="微调任务"
                value={3}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 应用价值 */}
      <div style={{ marginTop: '48px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
          应用价值
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card 
              className="core-feature-card" 
              style={{ textAlign: 'center', height: '100%' }}
              onClick={() => navigate('/evaluation')}
            >
              <div className="feature-content">
                <div className="feature-icon">
                  <SettingOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                </div>
                <Title level={4} className="feature-title">鲁棒性验证工具</Title>
                <Paragraph>
                  为模型开发者提供专业的鲁棒性验证工具，帮助发现模型的潜在弱点和安全漏洞。
                </Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card 
              className="core-feature-card" 
              style={{ textAlign: 'center', height: '100%' }}
              onClick={() => navigate('/finetuning')}
            >
              <div className="feature-content">
                <div className="feature-icon">
                  <BugOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                </div>
                <Title level={4} className="feature-title">安全性提升</Title>
                <Paragraph>
                  通过对抗训练提升模型在实际部署中的安全性，确保模型在恶意攻击下的稳定性。
                </Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card 
              className="core-feature-card" 
              style={{ textAlign: 'center', height: '100%' }}
              onClick={() => navigate('/batch-testing')}
            >
              <div className="feature-content">
                <div className="feature-icon">
                  <BarChartOutlined style={{ fontSize: '48px', color: '#fa8c16', marginBottom: '16px' }} />
                </div>
                <Title level={4} className="feature-title">学术研究平台</Title>
                <Paragraph>
                  作为论文中方法的可复现实验平台，推动学术研究的发展和创新。
                </Paragraph>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Home;
