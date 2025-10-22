import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const Evaluation: React.FC = () => {
  return (
    <div>
      <Title level={2}>鲁棒性评估</Title>
      <Card>
        <Paragraph>评估功能开发中...</Paragraph>
      </Card>
    </div>
  );
};

export default Evaluation;
