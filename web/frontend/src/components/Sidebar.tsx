import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  RobotOutlined,
  BugOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExperimentOutlined,
  SafetyOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/models',
      icon: <RobotOutlined />,
      label: '模型管理',
    },
    {
      key: '/attack',
      icon: <BugOutlined />,
      label: '对抗攻击',
    },
    {
      key: '/evaluation',
      icon: <BarChartOutlined />,
      label: '鲁棒性评估',
    },
    {
      key: '/finetuning',
      icon: <SettingOutlined />,
      label: '对抗性微调',
    },
    {
      key: '/batch-testing',
      icon: <ExperimentOutlined />,
      label: '批量测试',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      width={200}
      style={{
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ 
        padding: '16px', 
        textAlign: 'center', 
        borderBottom: '1px solid #f0f0f0',
        marginBottom: '16px'
      }}>
        <SafetyOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#1890ff' }}>
            深度代码模型
        </div>
        <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#1890ff' }}>
            鲁棒性评估与增强平台
        </div>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ border: 'none' }}
      />
    </Sider>
  );
};

export default Sidebar;
