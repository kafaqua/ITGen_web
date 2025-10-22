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
      description: '支持主流DCM（CodeBERT、GraphCodeBERT、CodeGPT等）的快速接入，提供标准化的预测接口和Docker容器支持。',
      action: () => navigate('/models'),
      actionText: '管理模型'
    },
    {
      icon: <BugOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      title: '对抗样本生成引擎',
      description: '基于ITGen核心算法，支持用户自定义攻击预算，包括最大查询次数、时间限制等参数配置。',
      action: () => navigate('/attack'),
      actionText: '开始攻击'
    },
    {
      icon: <BarChartOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
      title: '鲁棒性评估报告',
      description: '输出攻击成功率（ASR）、平均模型调用次数（AMI）、平均运行时间（ART）等关键指标。',
      action: () => navigate('/evaluation'),
      actionText: '查看报告'
    },
    {
      icon: <SettingOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
      title: '对抗性微调模块',
      description: '使用生成的对抗样本对原模型进行微调，提升模型鲁棒性，提供微调前后性能对比。',
      action: () => navigate('/finetuning'),
      actionText: '开始微调'
    },
    {
      icon: <ExperimentOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      title: '批量测试与对比',
      description: '支持多个模型、多个任务的批量测试，与基线方法（ALERT、BeamAttack）自动对比。',
      action: () => navigate('/batch-testing'),
      actionText: '批量测试'
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
              style={{ height: '100%' }}
              bodyStyle={{ padding: '24px' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                {feature.icon}
              </div>
              <Title level={4} style={{ textAlign: 'center', marginBottom: '12px' }}>
                {feature.title}
              </Title>
              <Paragraph style={{ textAlign: 'center', marginBottom: '20px' }}>
                {feature.description}
              </Paragraph>
              <div style={{ textAlign: 'center' }}>
                <Button type="primary" onClick={feature.action}>
                  {feature.actionText}
                </Button>
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
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <SettingOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={4}>鲁棒性验证工具</Title>
              <Paragraph>
                为模型开发者提供专业的鲁棒性验证工具，帮助发现模型的潜在弱点和安全漏洞。
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <BugOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={4}>安全性提升</Title>
              <Paragraph>
                通过对抗训练提升模型在实际部署中的安全性，确保模型在恶意攻击下的稳定性。
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card style={{ textAlign: 'center', height: '100%' }}>
              <BarChartOutlined style={{ fontSize: '48px', color: '#fa8c16', marginBottom: '16px' }} />
              <Title level={4}>学术研究平台</Title>
              <Paragraph>
                作为论文中方法的可复现实验平台，推动学术研究的发展和创新。
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Home;
