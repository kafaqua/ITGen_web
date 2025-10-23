import React from 'react';
import { Layout, Typography } from 'antd';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

const Header: React.FC = () => {
  return (
    <AntHeader style={{ 
      background: '#fff', 
      padding: '0 24px', 
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
    }}>
      <Title level={3} style={{ margin: 0, color: '#080808ff' }}>
        基于《Iterative_Generation_of_Adversarial_Example_for_Deep_Code_Models》
      </Title>
    </AntHeader>
  );
};

export default Header;
