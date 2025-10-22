# 深度代码模型鲁棒性评估与增强平台 - 前后端分离架构

## 项目概述

本项目实现了一个完全前后端分离的B/S系统，用于评估和增强深度代码模型的鲁棒性。系统采用微服务架构，后端通过API调用独立的算法服务，满足您提出的所有要求。

## 架构设计

### 系统架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   后端API服务    │    │   算法服务      │
│   (React)       │◄──►│   (Flask)       │◄──►│   (Flask)       │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx代理     │    │   WebSocket     │    │   算法核心      │
│   静态文件服务   │    │   实时通信      │    │   ITGen等      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 核心特性

✅ **前后端完全分离** - 前端和后端可独立运行和部署  
✅ **后端不内置算法** - 后端只负责API转发和任务管理  
✅ **算法服务独立** - 算法逻辑封装在独立的微服务中  
✅ **实时通信** - 通过WebSocket实现任务状态实时更新  
✅ **容器化部署** - 支持Docker和Docker Compose部署  

## 目录结构

```
ITGen/
├── frontend/                 # 前端React应用
│   ├── src/
│   │   ├── components/       # React组件
│   │   ├── pages/           # 页面组件
│   │   ├── services/        # API服务
│   │   ├── hooks/           # 自定义Hooks
│   │   └── ...
│   ├── package.json         # 前端依赖
│   ├── Dockerfile          # 前端Docker配置
│   └── nginx.conf          # Nginx配置
├── backend/                 # 后端API服务
│   ├── app.py              # Flask应用主文件
│   ├── requirements.txt    # 后端依赖
│   └── Dockerfile         # 后端Docker配置
├── algorithm_service/       # 算法微服务
│   ├── app.py             # 算法服务主文件
│   ├── requirements.txt   # 算法服务依赖
│   └── Dockerfile        # 算法服务Docker配置
├── docker-compose.yml     # Docker Compose配置
├── start.bat             # Windows启动脚本
├── start.sh              # Linux/macOS启动脚本
└── README.md             # 项目说明
```

## 技术栈

### 前端技术
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Ant Design** - UI组件库
- **Axios** - HTTP客户端
- **Socket.IO Client** - WebSocket客户端
- **Chart.js** - 图表库
- **React Router** - 路由管理

### 后端技术
- **Flask** - Python Web框架
- **Flask-CORS** - 跨域支持
- **Flask-SocketIO** - WebSocket支持
- **Requests** - HTTP客户端
- **Threading** - 多线程任务处理

### 算法服务技术
- **Flask** - 算法服务框架
- **PyTorch** - 深度学习框架
- **Transformers** - 预训练模型库
- **ITGen算法** - 对抗样本生成核心
- **Tree-sitter** - 代码解析器

### 部署技术
- **Docker** - 容器化
- **Docker Compose** - 多容器编排
- **Nginx** - 反向代理和静态文件服务

## 快速开始

### 方式一：Docker Compose部署（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd ITGen

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 停止服务
docker-compose down
```

### 方式二：本地开发部署

#### Windows用户
```cmd
# 运行启动脚本
start.bat
```

#### Linux/macOS用户
```bash
# 给脚本执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

### 方式三：手动启动

#### 1. 启动算法服务
```bash
cd algorithm_service
pip install -r requirements.txt
python app.py
```

#### 2. 启动后端API服务
```bash
cd backend
pip install -r requirements.txt
python app.py
```

#### 3. 启动前端应用
```bash
cd frontend
npm install
npm start
```

## 服务地址

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:5000
- **算法服务**: http://localhost:8000

## API接口文档

### 模型管理API

#### 获取模型列表
```http
GET /api/models
```

#### 添加模型
```http
POST /api/models
Content-Type: application/json

{
  "name": "模型名称",
  "description": "模型描述",
  "model_path": "microsoft/codebert-base",
  "tokenizer_path": "microsoft/codebert-base",
  "max_length": 512,
  "supported_tasks": ["clone_detection", "vulnerability_detection"]
}
```

#### 删除模型
```http
DELETE /api/models/{model_id}
```

#### 测试模型
```http
POST /api/models/{model_id}/test
Content-Type: application/json

{
  "task_type": "clone_detection",
  "test_code": "def test_function():\n    return 'test'"
}
```

### 对抗攻击API

#### 开始攻击
```http
POST /api/attack/start
Content-Type: application/json

{
  "model_id": "codebert",
  "method": "itgen",
  "task_type": "clone_detection",
  "language": "python",
  "code_data": "def function():\n    return 'hello'",
  "parameters": {
    "max_query_times": 200,
    "time_limit": 60,
    "max_substitutions": 10
  }
}
```

#### 获取攻击状态
```http
GET /api/attack/status/{task_id}
```

#### 获取攻击结果
```http
GET /api/attack/results/{task_id}
```

### 评估报告API

#### 开始评估
```http
POST /api/evaluation/start
Content-Type: application/json

{
  "model_id": "codebert",
  "task_type": "clone_detection",
  "test_dataset": [...],
  "attack_methods": ["itgen", "alert"]
}
```

#### 获取评估报告
```http
GET /api/evaluation/reports/{report_id}
```

### 对抗性微调API

#### 开始微调
```http
POST /api/finetuning/start
Content-Type: application/json

{
  "model_id": "codebert",
  "task_type": "clone_detection",
  "training_data": [...],
  "adversarial_data": [...],
  "parameters": {
    "learning_rate": 2e-5,
    "epochs": 3,
    "batch_size": 16
  }
}
```

### 批量测试API

#### 开始批量测试
```http
POST /api/batch-testing/start
Content-Type: application/json

{
  "models": ["codebert", "graphcodebert"],
  "tasks": ["clone_detection", "vulnerability_detection"],
  "attack_methods": ["itgen", "alert", "beam_attack"],
  "test_datasets": [...],
  "baseline_methods": ["alert", "beam_attack"]
}
```

## WebSocket事件

### 连接事件
```javascript
// 连接成功
socket.on('connected', (data) => {
  console.log('连接成功:', data);
});

// 任务状态更新
socket.on('task_update', (data) => {
  console.log('任务更新:', data);
});
```

### 发送事件
```javascript
// 订阅任务更新
socket.emit('subscribe_task', { task_id: 'task_123' });
```

## 核心功能

### 1. 模型接入接口
- 支持CodeBERT、GraphCodeBERT、CodeGPT等主流模型
- 提供标准化的预测接口
- 支持Docker容器部署
- 模型测试和验证功能

### 2. 对抗样本生成引擎
- 基于ITGen核心算法
- 支持ALERT、Beam Attack等基线方法
- 用户自定义攻击预算
- 实时任务状态监控

### 3. 鲁棒性评估报告
- 攻击成功率（ASR）
- 平均模型调用次数（AMI）
- 平均运行时间（ART）
- 可视化结果展示
- 代码对比高亮

### 4. 对抗性微调模块
- 使用对抗样本进行模型微调
- 微调前后性能对比
- 训练过程可视化
- 模型性能指标分析

### 5. 批量测试与对比分析
- 多模型批量测试
- 多任务支持
- 与基线方法自动对比
- 性能排名和分析报告

## 部署说明

### 生产环境部署

#### 1. 使用Docker Compose
```bash
# 构建并启动服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 2. 单独部署服务

**前端部署**:
```bash
cd frontend
docker build -t code-robustness-frontend .
docker run -p 3000:80 code-robustness-frontend
```

**后端部署**:
```bash
cd backend
docker build -t code-robustness-backend .
docker run -p 5000:5000 code-robustness-backend
```

**算法服务部署**:
```bash
cd algorithm_service
docker build -t code-robustness-algorithm .
docker run -p 8000:8000 code-robustness-algorithm
```

### 环境变量配置

#### 后端服务环境变量
```bash
ALGORITHM_SERVICE_URL=http://algorithm-service:8000
FLASK_ENV=production
```

#### 算法服务环境变量
```bash
FLASK_ENV=production
MODEL_CACHE_DIR=/app/models
DATA_DIR=/app/data
```

## 开发指南

### 前端开发

```bash
cd frontend
npm install
npm start
```

### 后端开发

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 算法服务开发

```bash
cd algorithm_service
pip install -r requirements.txt
python app.py
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口3000、5000、8000是否被占用
   - 修改docker-compose.yml中的端口映射

2. **依赖安装失败**
   - 检查网络连接
   - 使用国内镜像源

3. **服务启动失败**
   - 查看Docker日志: `docker-compose logs service_name`
   - 检查环境变量配置

4. **API调用失败**
   - 检查服务是否正常启动
   - 验证API地址和端口

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f algorithm-service
```

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 查看[LICENSE](LICENSE)文件了解详情

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 邮箱: your-email@example.com

---

**注意**: 这是一个前后端完全分离的B/S系统，后端通过API调用独立的算法服务，满足您提出的所有要求。系统可以独立运行和部署，具有良好的可扩展性和维护性。
