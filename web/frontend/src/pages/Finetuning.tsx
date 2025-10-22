import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const Finetuning: React.FC = () => {
  return (
    <div>
      <Title level={2}>对抗性微调</Title>
      <Card>
        <Paragraph>微调功能开发中...</Paragraph>
      </Card>
    </div>
  );
};

export default Finetuning;
