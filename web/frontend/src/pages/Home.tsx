import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Steps } from 'antd';
import { 
  PlayCircleOutlined, 
  RobotOutlined, 
  BugOutlined,
  SettingOutlined,
  ExperimentOutlined,
  ArrowRightOutlined,
  CloudUploadOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <RobotOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      title: '模型管理',
      description: '支持主流DCM（CodeBERT、GraphCodeBERT、CodeGPT等）的快速接入，提供标准化的预测接口（API或Docker容器），确保模型集成和调用的便捷性。',
      action: () => navigate('/models'),
      actionText: '管理模型'
    },
    {
      icon: <BugOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      title: '对抗攻击',
      description: '基于ITGen核心算法，支持用户自定义攻击预算（最大查询次数、时间限制），生成单个代码段的代码变体，即单个对抗样本生成，测试模型脆弱性。',
      action: () => navigate('/attack'),
      actionText: '开始攻击'
    },
    {
      icon: <ExperimentOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      title: '批量对抗样本生成',
      description: '支持多个模型、多个任务（漏洞检测、克隆检测、代码摘要）的批量测试，与基线方法（ALERT、BeamAttack）自动对比，批量生成对抗样本。',
      action: () => navigate('/batch-testing'),
      actionText: '批量对抗样本生成'
    },
    {
      icon: <SettingOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
      title: '对抗性微调',
      description: '使用批量生成的对抗样本对代码模型进行鲁棒性评估，并通过对抗训练提升模型鲁棒性，提供微调前后的性能对比（准确率/BLEU/ASR/AMI/ART）。',
      action: () => navigate('/finetuning'),
      actionText: '开始微调'
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
        </Space>
      </div>

      {/* 功能特性 */}
      <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
        核心功能
      </Title>
      <Row gutter={[24, 24]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
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
                <Paragraph style={{ textAlign: 'center', marginBottom: '20px', minHeight: '120px' }}>
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

      {/* 平台使用流程 */}
      <div style={{ marginTop: '48px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
          平台使用流程
        </Title>
        
        {/* 第一排：模型管理 → 对抗攻击 */}
        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          {/* 步骤1: 模型管理 */}
          <Col xs={24} md={6}>
            <Card
              hoverable
              style={{ height: '100%', borderColor: '#1890ff', borderWidth: '2px' }}
              bodyStyle={{ padding: '24px' }}
              onClick={() => navigate('/models')}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: '#e6f7ff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <CloudUploadOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                </div>
                <div style={{ 
                  background: '#1890ff', 
                  color: '#fff', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>1</div>
                <Title level={4} style={{ marginBottom: '12px' }}>模型管理</Title>
                <Paragraph style={{ color: '#666', marginBottom: '16px' }}>
                  上传并管理深度代码模型（CodeBERT、GraphCodeBERT等），配置模型参数
                </Paragraph>
                <Button type="primary" size="small">上传模型</Button>
              </div>
            </Card>
          </Col>

          {/* 箭头 */}
          <Col xs={0} md={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRightOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          </Col>

          {/* 步骤2: 对抗攻击 */}
          <Col xs={24} md={6}>
            <Card
              hoverable
              style={{ height: '100%', borderColor: '#52c41a', borderWidth: '2px' }}
              bodyStyle={{ padding: '24px' }}
              onClick={() => navigate('/attack')}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: '#f6ffed', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <ThunderboltOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                </div>
                <div style={{ 
                  background: '#52c41a', 
                  color: '#fff', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>2</div>
                <Title level={4} style={{ marginBottom: '12px' }}>对抗攻击</Title>
                <Paragraph style={{ color: '#666', marginBottom: '16px' }}>
                  生成单个代码段的代码变体，即单个对抗样本生成，测试模型脆弱性
                </Paragraph>
                <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} size="small">生成对抗样本</Button>
              </div>
            </Card>
          </Col>

          {/* 占位列，保持对齐 */}
          <Col xs={0} md={11}></Col>
        </Row>

        {/* 第二排：批量对抗样本生成 和 对抗性微调 */}
        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          {/* 步骤3: 批量对抗样本生成 */}
          <Col xs={24} md={6}>
            <Card
              hoverable
              style={{ height: '100%', borderColor: '#722ed1', borderWidth: '2px' }}
              bodyStyle={{ padding: '24px' }}
              onClick={() => navigate('/batch-testing')}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: '#f9f0ff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <AppstoreOutlined style={{ fontSize: '32px', color: '#722ed1' }} />
                </div>
                <div style={{ 
                  background: '#722ed1', 
                  color: '#fff', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>3</div>
                <Title level={4} style={{ marginBottom: '12px' }}>批量对抗样本生成</Title>
                <Paragraph style={{ color: '#666', marginBottom: '16px' }}>
                  批量生成对抗样本，支持多模型、多任务的对比测试
                </Paragraph>
                <Button type="primary" style={{ background: '#722ed1', borderColor: '#722ed1' }} size="small">批量生成</Button>
              </div>
            </Card>
          </Col>

          {/* 箭头 */}
          <Col xs={0} md={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRightOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
          </Col>

          {/* 步骤4: 对抗性微调 */}
          <Col xs={24} md={6}>
            <Card
              hoverable
              style={{ height: '100%', borderColor: '#eb2f96', borderWidth: '2px' }}
              bodyStyle={{ padding: '24px' }}
              onClick={() => navigate('/finetuning')}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: '#fff0f6', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <LineChartOutlined style={{ fontSize: '32px', color: '#eb2f96' }} />
                </div>
                <div style={{ 
                  background: '#eb2f96', 
                  color: '#fff', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>4</div>
                <Title level={4} style={{ marginBottom: '12px' }}>对抗性微调</Title>
                <Paragraph style={{ color: '#666', marginBottom: '16px' }}>
                  使用批量生成的对抗样本进行鲁棒性评估与模型微调
                </Paragraph>
                <Button type="primary" style={{ background: '#eb2f96', borderColor: '#eb2f96' }} size="small">开始微调</Button>
              </div>
            </Card>
          </Col>

          {/* 占位列，保持对齐 */}
          <Col xs={0} md={11}></Col>
        </Row>

        {/* 流程说明 */}
        <Card style={{ background: '#f0f2f5', borderColor: '#d9d9d9' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} md={6} style={{ textAlign: 'center', padding: '16px' }}>
              <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
                <CloudUploadOutlined style={{ marginRight: '8px' }} />
                上传模型
              </Text>
            </Col>
            <Col xs={24} md={6} style={{ textAlign: 'center', padding: '16px' }}>
              <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
                <ThunderboltOutlined style={{ marginRight: '8px' }} />
                单个样本测试
              </Text>
            </Col>
            <Col xs={24} md={6} style={{ textAlign: 'center', padding: '16px' }}>
              <Text strong style={{ fontSize: '14px', color: '#722ed1' }}>
                <AppstoreOutlined style={{ marginRight: '8px' }} />
                批量样本生成
              </Text>
            </Col>
            <Col xs={24} md={6} style={{ textAlign: 'center', padding: '16px' }}>
              <Text strong style={{ fontSize: '14px', color: '#eb2f96' }}>
                <LineChartOutlined style={{ marginRight: '8px' }} />
                评估与微调
              </Text>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default Home;
