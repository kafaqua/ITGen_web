import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Models from './pages/Models';
import Attack from './pages/Attack';
import AttackResult from './pages/AttackResult';
import Evaluation from './pages/Evaluation';
import Finetuning from './pages/Finetuning';
import BatchTesting from './pages/BatchTesting';
import './App.css';

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/models" element={<Models />} />
            <Route path="/attack" element={<Attack />} />
            <Route path="/attack/result" element={<AttackResult />} />
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/finetuning" element={<Finetuning />} />
            <Route path="/batch-testing" element={<BatchTesting />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
