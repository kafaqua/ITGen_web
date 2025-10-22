import React, { useState, useEffect } from 'react';
import { Layout, Badge, Button, Space, Typography, message } from 'antd';
import { BellOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { useWebSocket } from '../hooks/useWebSocket';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { isConnected, lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      if (data.event_type === 'task_completed' || data.event_type === 'task_failed') {
        setNotificationCount(prev => prev + 1);
        message.info(`任务${data.event_type === 'task_completed' ? '完成' : '失败'}: ${data.task_data.task_id}`);
      }
    }
  }, [lastMessage]);

  const handleNotificationClick = () => {
    setNotificationCount(0);
    message.info('暂无新通知');
  };

  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 24px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div>
        <Text strong style={{ fontSize: '18px' }}>
          深度代码模型鲁棒性评估与增强平台
        </Text>
      </div>
      
      <Space size="middle">
        <Badge count={notificationCount} size="small">
          <Button 
            type="text" 
            icon={<BellOutlined />} 
            onClick={handleNotificationClick}
          />
        </Badge>
        
        <Button type="text" icon={<SettingOutlined />} />
        
        <Button type="text" icon={<UserOutlined />} />
        
        <div style={{ 
          padding: '4px 8px', 
          borderRadius: '4px', 
          backgroundColor: isConnected ? '#f6ffed' : '#fff2e8',
          border: `1px solid ${isConnected ? '#b7eb8f' : '#ffd591'}`
        }}>
          <Text style={{ 
            fontSize: '12px', 
            color: isConnected ? '#52c41a' : '#fa8c16' 
          }}>
            {isConnected ? '已连接' : '连接断开'}
          </Text>
        </div>
      </Space>
    </AntHeader>
  );
};

export default Header;
