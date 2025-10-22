import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const BatchTesting: React.FC = () => {
  return (
    <div>
      <Title level={2}>批量测试</Title>
      <Card>
        <Paragraph>批量测试功能开发中...</Paragraph>
      </Card>
    </div>
  );
};

export default BatchTesting;
