# 深度代码模型鲁棒性评估与增强平台 - API接口文档

本文档详细描述了深度代码模型鲁棒性评估与增强平台的API接口，包括后端API服务、算法服务以及ITGen算法接口。

## 系统架构

```
前端 (React + TypeScript) 
    ↓ HTTP/WebSocket
后端API服务 (Flask + SocketIO) 
    ↓ HTTP
算法服务 (Flask) 
    ↓ subprocess
ITGen算法模块 (Python)
```

## 服务配置

### 端口配置
- **前端服务**: `http://localhost:5173`
- **后端API服务**: `http://localhost:5000`
- **算法服务**: `http://localhost:8000`

### 环境变量
```bash
# 后端API服务
ALGORITHM_SERVICE_URL=http://localhost:8000

# 前端API服务
REACT_APP_API_URL=http://localhost:5000
```

## 后端API服务接口

### 基础信息
- **服务地址**: `http://localhost:5000`
- **协议**: HTTP/HTTPS, WebSocket
- **数据格式**: JSON
- **认证**: 无（开发环境）

### 1. 模型管理接口

#### 1.1 获取模型列表
```http
GET /api/models
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "codebert",
      "name": "CodeBERT",
      "model_type": "encoder",
      "description": "Microsoft CodeBERT for code understanding",
      "model_path": "microsoft/codebert-base",
      "tokenizer_path": "microsoft/codebert-base",
      "max_length": 512,
      "supported_tasks": ["clone_detection", "vulnerability_detection", "code_summarization"],
      "status": "available",
      "is_predefined": true
    }
  ]
}
```

#### 1.2 添加模型
```http
POST /api/models
Content-Type: application/json

{
  "name": "Custom Model",
  "model_type": "encoder",
  "description": "Custom model description",
  "model_path": "path/to/model",
  "tokenizer_path": "path/to/tokenizer",
  "max_length": 512,
  "supported_tasks": ["clone_detection"]
}
```

#### 1.3 删除模型
```http
DELETE /api/models/{model_id}
```

#### 1.4 测试模型
```http
POST /api/models/{model_id}/test
Content-Type: application/json

{
  "task_type": "clone_detection",
  "code1": "def test_function():\n    return 'hello'",
  "code2": "def test_func():\n    return 'hello'"
}
```

### 2. 对抗攻击接口

#### 2.1 开始对抗攻击
```http
POST /api/attack/start
Content-Type: application/json

{
  "method": "itgen",
  "model_id": "codebert",
  "task_type": "clone_detection",
  "language": "python",
  "code_data": {
    "code1": "def test_function():\n    return 'hello'",
    "code2": "def test_func():\n    return 'hello'"
  },
  "parameters": {
    "attack_strategy": "identifier_rename",
    "max_queries": 100,
    "timeout": 60
  }
}
```
说明：
- language 可选：python | java | c
- parameters.attack_strategy 可选：identifier_rename | equivalent_transform | both

**响应示例**:
```json
{
  "success": true,
  "task_id": "uuid-string"
}
```

#### 2.2 获取攻击状态
```http
GET /api/attack/status/{task_id}
```

**响应示例**:
```json
{
  "success": true,
  "status": {
    "status": "completed",
    "progress": 100,
    "message": "任务完成",
    "start_time": "2024-01-01T10:00:00",
    "end_time": "2024-01-01T10:05:00",
    "result": {
      "success": true,
      "original_code": "def test_function():\n    return 'hello'",
      "adversarial_code": "def test_func():\n    return 'hello'",
      "replaced_words": {"function": "func"},
      "query_times": 150,
      "time_cost": 45.2,
      "method": "itgen",
      "attack_strategy": "identifier_rename"
    }
  }
}
```

#### 2.3 获取攻击结果
```http
GET /api/attack/results/{task_id}
```

### 3. 鲁棒性评估接口

#### 3.1 开始鲁棒性评估
```http
POST /api/evaluation/start
Content-Type: application/json

{
  "model_id": "codebert",
  "task_type": "clone_detection",
  "test_dataset": [
    {
      "code1": "def func1():\n    return 1",
      "code2": "def func2():\n    return 2",
      "label": 0
    }
  ],
  "attack_methods": ["itgen", "alert"],
  "evaluation_metrics": ["asr", "ami", "art"]
}
```

#### 3.2 获取评估报告列表
```http
GET /api/evaluation/reports
```

#### 3.3 获取特定评估报告
```http
GET /api/evaluation/reports/{report_id}
```

### 4. 对抗性微调接口

#### 4.1 开始对抗性微调
```http
POST /api/finetuning/start
Content-Type: application/json

{
  "model_id": "codebert",
  "task_type": "clone_detection",
  "training_data": [
    {
      "code1": "def func1():\n    return 1",
      "code2": "def func2():\n    return 2",
      "label": 0
    }
  ],
  "adversarial_data": [
    {
      "original_code": "def func1():\n    return 1",
      "adversarial_code": "def func1():\n    return 1",
      "label": 0
    }
  ],
  "parameters": {
    "learning_rate": 2e-5,
    "epochs": 3,
    "batch_size": 16
  }
}
```

#### 4.2 获取微调状态
```http
GET /api/finetuning/status/{task_id}
```

### 5. 批量测试接口

#### 5.1 开始批量测试
```http
POST /api/batch-testing/start
Content-Type: application/json

{
  "models": ["codebert", "graphcodebert"],
  "tasks": ["clone_detection", "vulnerability_detection"],
  "attack_methods": ["itgen", "alert", "beam_attack"],
  "test_datasets": ["dataset1", "dataset2"],
  "baseline_methods": ["alert", "beam_attack"]
}
```

#### 5.2 获取批量测试结果（可选）
```http
GET /api/batch-testing/results/{task_id}
```

#### 5.2 获取批量测试状态
```http
GET /api/batch-testing/status/{task_id}
```

### 6. 文件上传接口

#### 6.1 上传文件（支持文件元数据）
```http
POST /api/upload
Content-Type: multipart/form-data

file: [binary data]
file_type: model | dataset
purpose: attack | evaluation | finetuning | batch_testing
task_type: clone_detection | vulnerability_detection | code_summarization | code_generation
model_name: 可选（file_type=model 时建议）
model_type: 可选（file_type=model 时建议）
dataset_name: 可选（file_type=dataset 时建议）
```

**响应示例**:
```json
{
  "success": true,
  "file_id": "uuid-string",
  "file_type": "dataset",
  "purpose": "attack",
  "task_type": "clone_detection",
  "dataset_name": "my_attack_set_v1"
}
```

### 7. 任务状态接口

#### 7.1 获取任务状态
```http
GET /api/tasks/status/{task_id}
```

#### 7.2 获取所有任务
```http
GET /api/tasks
```

### 8. 健康检查接口

#### 8.1 系统健康检查
```http
GET /api/health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00",
  "version": "1.0.0",
  "algorithm_service_available": true,
  "active_connections": 1,
  "note": "后端服务正常运行，算法服务状态见algorithm_service_available字段"
}
```

## 算法服务接口

### 基础信息
- **服务地址**: `http://localhost:8000`
- **协议**: HTTP
- **数据格式**: JSON
- **调用方式**: 子进程调用ITGen算法

### 1. 模型管理接口

#### 1.1 获取模型列表
```http
GET /api/models
```

#### 1.2 添加模型
```http
POST /api/models
```

#### 1.3 删除模型
```http
DELETE /api/models/{model_id}
```

#### 1.4 测试模型
```http
POST /api/models/{model_id}/test
```

### 2. 对抗攻击接口

#### 2.1 开始对抗攻击
```http
POST /api/attack/start
```

**请求体**:
```json
{
  "method": "itgen",
  "model_id": "codebert",
  "task_type": "clone_detection",
  "code_data": {
    "code1": "def test_function():\n    return 'hello'"
  },
  "parameters": {
    "max_queries": 100,
    "timeout": 60
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "original_code": "def test_function():\n    return 'hello'",
  "adversarial_code": "def test_func():\n    return 'hello'",
  "replaced_words": {"function": "func"},
  "query_times": 150,
  "time_cost": 45.2,
  "method": "itgen",
  "task_id": "uuid-string"
}
```

### 3. 鲁棒性评估接口

#### 3.1 开始鲁棒性评估
```http
POST /api/evaluation/start
```

**请求体**:
```json
{
  "model_id": "codebert",
  "task_type": "clone_detection",
  "test_dataset": [
    {
      "code1": "def func1():\n    return 1",
      "code2": "def func2():\n    return 2",
      "label": 0
    }
  ],
  "attack_methods": ["itgen"]
}
```

**响应示例**:
```json
{
  "success": true,
  "attack_results": {
    "itgen": {
      "asr": 0.75,
      "ami": 120.5,
      "art": 35.8,
      "successful_attacks": 7,
      "total_samples": 10
    }
  },
  "metrics": {
    "asr": 0.75,
    "ami": 120.5,
    "art": 35.8
  },
  "task_id": "uuid-string"
}
```

### 4. 对抗性微调接口

#### 4.1 开始对抗性微调
```http
POST /api/finetuning/start
```

### 5. 批量测试接口

#### 5.1 开始批量测试
```http
POST /api/batch-testing/start
```

### 6. 文件上传接口

#### 6.1 上传文件
```http
POST /api/upload
```

### 7. 健康检查接口

#### 7.1 算法服务健康检查
```http
GET /api/health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00",
  "version": "1.0.0",
  "service": "algorithm_service",
  "itgen_path": "/path/to/ITGen",
  "itgen_available": true,
  "supported_models": 2,
  "call_method": "subprocess"
}
```

## ITGen算法接口

### 基础信息
- **调用方式**: 子进程调用
- **输入格式**: JSON文件
- **输出格式**: JSON文件
- **超时时间**: 300秒（攻击）/ 600秒（评估）

### 1. ITGen攻击算法接口

#### 1.1 脚本路径
```
ITGen/CodeBERT_adv/Clone_detection/attack/run_itgen.py
```

#### 1.2 调用方式
```bash
python run_itgen.py --input input.json --output output.json
```

#### 1.3 输入文件格式
```json
{
  "code_data": {
    "code1": "def test_function():\n    return 'hello'"
  },
  "parameters": {
    "max_queries": 100,
    "timeout": 60
  }
}
```

#### 1.4 输出文件格式
```json
{
  "success": true,
  "original_code": "def test_function():\n    return 'hello'",
  "adversarial_code": "def test_func():\n    return 'hello'",
  "replaced_words": {"function": "func"},
  "query_times": 150,
  "time_cost": 45.2,
  "method": "itgen",
  "note": "使用ITGen算法框架"
}
```

### 2. ITGen评估算法接口

#### 2.1 脚本路径
```
ITGen/evaluation/run_eval.py
```

#### 2.2 调用方式
```bash
python run_eval.py --input input.json --output output.json
```

#### 2.3 输入文件格式
```json
{
  "model_id": "codebert",
  "task_type": "clone_detection",
  "test_dataset": [
    {
      "code1": "def func1():\n    return 1",
      "code2": "def func2():\n    return 2",
      "label": 0
    }
  ],
  "attack_methods": ["itgen"]
}
```

#### 2.4 输出文件格式
```json
{
  "success": true,
  "attack_results": {
    "itgen": {
      "asr": 0.75,
      "ami": 120.5,
      "art": 35.8,
      "total_samples": 10,
      "successful_attacks": 7
    }
  },
  "metrics": {
    "asr": 0.75,
    "ami": 120.5,
    "art": 35.8
  },
  "summary": {
    "overall_metrics": {"asr": 0.75, "ami": 120.5, "art": 35.8},
    "method_comparison": {...},
    "recommendations": ["模型对对抗攻击的鲁棒性较低，建议进行对抗训练"]
  },
  "note": "使用ITGen算法框架"
}
```

## WebSocket接口

### 连接信息
- **地址**: `ws://localhost:5000`
- **协议**: Socket.IO
- **认证**: 无

### 事件列表

#### 1. 连接事件
```javascript
// 客户端连接
socket.emit('connect');

// 服务器响应
socket.on('connected', (data) => {
  console.log(data.message); // "连接成功"
});
```

#### 2. 任务订阅
```javascript
// 订阅任务更新
socket.emit('subscribe_task', { task_id: 'uuid-string' });

// 服务器响应
socket.on('subscribed', (data) => {
  console.log(data.message); // "订阅成功"
});
```

#### 3. 任务状态更新
```javascript
// 接收任务状态更新
socket.on('task_update', (data) => {
  console.log('任务ID:', data.task_id);
  console.log('事件类型:', data.event_type);
  console.log('任务数据:', data.task_data);
});
```

**事件类型**:
- `task_started`: 任务开始
- `task_completed`: 任务完成
- `task_failed`: 任务失败

## 数据模型

### 1. 模型信息
```typescript
interface Model {
  id: string;
  name: string;
  description: string;
  model_path: string;
  tokenizer_path: string;
  max_length: number;
  supported_tasks: string[];
  status: 'available' | 'unavailable';
  is_predefined: boolean;
}
```

### 2. 攻击结果
```typescript
interface AttackResult {
  success: boolean;
  original_code: string;
  adversarial_code: string;
  replaced_words: Record<string, string>;
  query_times: number;
  time_cost: number;
  method: string;
  task_id: string;
  note?: string;
}
```

### 3. 评估结果
```typescript
interface EvaluationResult {
  success: boolean;
  attack_results: Record<string, {
    asr: number;
    ami: number;
    art: number;
    successful_attacks: number;
    total_samples: number;
  }>;
  metrics: {
    asr: number;
    ami: number;
    art: number;
  };
  task_id: string;
}
```

### 4. 微调结果
```typescript
interface FinetuningResult {
  success: boolean;
  task_id: string;
  original_model_id: string;
  finetuned_model_id: string;
  task_type: string;
  performance_comparison: {
    original_model: ModelPerformance;
    finetuned_model: ModelPerformance;
    improvement: ModelPerformance;
  };
  training_history: TrainingEpoch[];
  created_at: string;
  status: string;
}
```

## 快速开始

### 1. 启动服务

#### 启动后端API服务
```bash
cd web/backend
python app.py
```

#### 启动算法服务
```bash
cd web/algorithm_service
python app.py
```

#### 启动前端服务
```bash
cd web/frontend
npm start
```

### 2. 测试API

#### 健康检查
```bash
curl http://localhost:5000/api/health
curl http://localhost:8000/api/health
```

#### 获取模型列表
```bash
curl http://localhost:5000/api/models
```

#### 开始对抗攻击
```bash
curl -X POST http://localhost:5000/api/attack/start \
  -H "Content-Type: application/json" \
  -d '{
    "method": "itgen",
    "model_id": "codebert",
    "task_type": "clone_detection",
    "code_data": {
      "code1": "def test_function():\n    return \"hello\""
    },
    "parameters": {
      "max_queries": 100,
      "timeout": 60
    }
  }'
```

##  错误处理

### 常见错误码
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误
- `503`: 服务不可用

### 错误响应格式
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

## 注意事项

1. **超时设置**: 攻击任务默认超时300秒，评估任务默认超时600秒
2. **文件大小**: 上传文件大小限制为100MB
3. **并发限制**: 同时运行的任务数量有限制
4. **ITGen依赖**: 算法服务需要ITGen模块可用才能执行真实算法
5. **模拟模式**: 当ITGen不可用时，系统会自动切换到模拟模式

