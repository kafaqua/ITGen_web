# 深度代码模型鲁棒性评估与增强平台 - API接口文档

本文档详细描述了深度代码模型鲁棒性评估与增强平台的API接口，包括后端API服务、算法服务以及ITGen算法接口。

---

## 📝 更新日志

### 2025-10-29 - v1.1.0 ⭐ 图表数据流完善
**新增接口**:
- `GET /api/finetuning/results/{task_id}` - 获取微调结果（含15个训练日志数据点）
- `GET /api/evaluation/status/{task_id}` - 获取安全测试状态
- `GET /api/evaluation/results/{task_id}` - 获取安全测试详细结果

**增强功能**:
- 算法服务生成完整的训练日志数据（15个数据点）
- 支持前端四大图表可视化（损失、准确率、ASR、学习率）
- 实现三级数据降级策略（API → sessionStorage → mock）
- 新增图表数据流说明章节

**数据结构**:
- `training_logs`: 包含epoch, step, loss, accuracy, asr, learning_rate
- `identifier_replacements`: 标识符替换详细列表
- 完整的性能对比指标（微调前后、改进幅度）

---

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

#### 3.4 获取安全测试状态 ⭐ 新增
```http
GET /api/evaluation/status/{task_id}
```

**说明**: 获取安全测试任务的状态信息。

**响应示例**:
```json
{
  "success": true,
  "status": {
    "status": "running",
    "progress": 45,
    "message": "正在测试第5个样本...",
    "current_sample": 5,
    "total_samples": 10
  }
}
```

#### 3.5 获取安全测试结果 ⭐ 新增
```http
GET /api/evaluation/results/{task_id}
```

**说明**: 获取安全测试任务的详细结果，包含对抗样本数据和性能指标。

**响应示例**:
```json
{
  "success": true,
  "task_id": "eval_xyz789abc",
  "sample_id": "sample_001",
  "code": "def calculate_sum(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result",
  "label": 1,
  "difficulty": "medium",
  "attack_success": true,
  
  "asr": 0.75,
  "ami": 92.5,
  "art": 28.7,
  
  "original_code": "def calculate_sum(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result",
  
  "adversarial_code": "def calc_sum(nums):\n    res = 0\n    for num in nums:\n        res += num\n    return res",
  
  "identifier_replacements": [
    {
      "original": "calculate_sum",
      "adversarial": "calc_sum",
      "line": 1
    },
    {
      "original": "numbers",
      "adversarial": "nums",
      "line": 1
    },
    {
      "original": "result",
      "adversarial": "res",
      "line": 2
    },
    {
      "original": "number",
      "adversarial": "num",
      "line": 3
    }
  ],
  
  "query_times": 45,
  "time_cost": 12.5,
  "created_at": "2025-10-29T10:35:00Z"
}
```

**字段说明**:
- `asr`: 攻击成功率 (0-1范围)
- `ami`: 平均修改索引
- `art`: 对抗响应时间
- `identifier_replacements`: 标识符替换列表，包含原始、对抗和所在行号
- `query_times`: 查询次数
- `time_cost`: 时间成本（秒）
- 用于前端性能指标可视化和代码差异对比

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

**响应示例**:
```json
{
  "success": true,
  "status": {
    "status": "running",
    "progress": 60,
    "message": "正在进行第3轮训练...",
    "current_epoch": 3,
    "total_epochs": 5
  }
}
```

#### 4.3 获取微调结果 ⭐ 新增
```http
GET /api/finetuning/results/{task_id}
```

**说明**: 获取微调任务的完整结果，包含15个训练日志数据点，用于前端图表可视化。

**响应示例**:
```json
{
  "success": true,
  "task_id": "ft_abc123xyz",
  "model_id": "codebert",
  "model_name": "CodeBERT",
  "model_path": "/models/codebert_finetuned",
  "training_time": 285,
  "final_loss": 0.150,
  
  "original_accuracy": 0.78,
  "final_accuracy": 0.88,
  "accuracy_improvement": 0.10,
  
  "original_bleu": 65.5,
  "final_bleu": 72.3,
  "bleu_improvement": 6.8,
  
  "original_asr": 0.45,
  "final_asr": 0.28,
  "asr_improvement": -0.17,
  
  "original_ami": 95.5,
  "final_ami": 85.2,
  "ami_improvement": -10.3,
  
  "original_art": 32.5,
  "final_art": 28.3,
  "art_improvement": -4.2,
  
  "overall_improvement": 12.5,
  
  "training_logs": [
    {
      "epoch": 1,
      "step": 10,
      "loss": 0.850,
      "accuracy": 0.65,
      "asr": 0.45,
      "learning_rate": 0.0001
    },
    {
      "epoch": 1,
      "step": 20,
      "loss": 0.780,
      "accuracy": 0.68,
      "asr": 0.43,
      "learning_rate": 0.0001
    },
    {
      "epoch": 1,
      "step": 30,
      "loss": 0.720,
      "accuracy": 0.70,
      "asr": 0.42,
      "learning_rate": 0.0001
    },
    {
      "epoch": 2,
      "step": 10,
      "loss": 0.650,
      "accuracy": 0.73,
      "asr": 0.40,
      "learning_rate": 0.0001
    },
    {
      "epoch": 2,
      "step": 20,
      "loss": 0.580,
      "accuracy": 0.75,
      "asr": 0.39,
      "learning_rate": 0.00009
    },
    {
      "epoch": 2,
      "step": 30,
      "loss": 0.520,
      "accuracy": 0.77,
      "asr": 0.37,
      "learning_rate": 0.00009
    },
    {
      "epoch": 3,
      "step": 10,
      "loss": 0.450,
      "accuracy": 0.80,
      "asr": 0.35,
      "learning_rate": 0.00008
    },
    {
      "epoch": 3,
      "step": 20,
      "loss": 0.380,
      "accuracy": 0.82,
      "asr": 0.34,
      "learning_rate": 0.00008
    },
    {
      "epoch": 3,
      "step": 30,
      "loss": 0.320,
      "accuracy": 0.84,
      "asr": 0.32,
      "learning_rate": 0.00008
    },
    {
      "epoch": 4,
      "step": 10,
      "loss": 0.280,
      "accuracy": 0.85,
      "asr": 0.31,
      "learning_rate": 0.00007
    },
    {
      "epoch": 4,
      "step": 20,
      "loss": 0.240,
      "accuracy": 0.86,
      "asr": 0.30,
      "learning_rate": 0.00007
    },
    {
      "epoch": 4,
      "step": 30,
      "loss": 0.200,
      "accuracy": 0.87,
      "asr": 0.29,
      "learning_rate": 0.00007
    },
    {
      "epoch": 5,
      "step": 10,
      "loss": 0.180,
      "accuracy": 0.87,
      "asr": 0.29,
      "learning_rate": 0.00007
    },
    {
      "epoch": 5,
      "step": 20,
      "loss": 0.165,
      "accuracy": 0.88,
      "asr": 0.28,
      "learning_rate": 0.00007
    },
    {
      "epoch": 5,
      "step": 30,
      "loss": 0.150,
      "accuracy": 0.88,
      "asr": 0.28,
      "learning_rate": 0.00007
    }
  ],
  
  "task_type": "clone_detection",
  "finetuning_params": {
    "learning_rate": 0.0001,
    "batch_size": 8,
    "epochs": 5,
    "warmup_steps": 100,
    "max_length": 512,
    "adversarial_ratio": 0.3
  },
  "created_at": "2025-10-29T10:30:00Z",
  "status": "completed"
}
```

**字段说明**:
- `training_logs`: 15个训练日志数据点（每个epoch 3步，共5个epoch）
  - `epoch`: 训练轮次 (1-5)
  - `step`: 当前步数 (10, 20, 30)
  - `loss`: 损失函数值 (0.850 → 0.150，递减)
  - `accuracy`: 准确率 (0.65 → 0.88，递增)
  - `asr`: 攻击成功率 (0.45 → 0.28，递减表示鲁棒性提升)
  - `learning_rate`: 学习率 (0.0001 → 0.00007，衰减)
- 改进指标为负数表示降低（如ASR降低是好事）
- 用于前端四大图表可视化

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

## 图表数据流说明 ⭐ 新增

### 概述
本平台实现了完整的图表数据流，从算法执行、后端存储到前端可视化展示。

### 数据流架构
```
ITGen算法服务 (8000)
    ↓ 执行算法，生成训练日志
后端API服务 (5000)
    ↓ 转发请求，缓存结果
前端React应用 (3000)
    ↓ 获取数据，可视化展示
```

### 鲁棒性增强数据流

#### 1. 训练日志生成
算法服务在执行微调时生成15个训练日志数据点：
- **数据点数量**: 15个（每个epoch 3步，共5个epoch）
- **包含字段**: epoch, step, loss, accuracy, asr, learning_rate
- **数据趋势**:
  - loss: 0.850 → 0.150（递减）
  - accuracy: 0.65 → 0.88（递增）
  - asr: 0.45 → 0.28（递减，表示鲁棒性提升）
  - learning_rate: 0.0001 → 0.00007（衰减）

#### 2. 完整流程
```
1. 用户配置参数 → POST /api/finetuning/start
2. 后端转发到算法服务 → POST http://localhost:8000/api/finetuning/start
3. 算法服务执行ITGen微调 → 生成training_logs
4. 算法服务存储结果 → task_results[task_id]
5. 返回task_id → {success: true, task_id: "ft_abc123"}
6. 前端保存到sessionStorage
7. 用户查看结果 → GET /api/finetuning/results/{task_id}
8. 前端获取完整数据 → 包含15个training_logs
9. 前端渲染四大图表 → 损失、准确率、ASR、学习率
```

#### 3. 四大核心图表
| 图表 | 数据源 | 数据点数 | 曲线颜色 | 数据点颜色 |
|------|--------|---------|---------|-----------|
| 损失函数曲线 | training_logs[].loss | 15个 | 黑色 #000000 | 红色 #ff4d4f |
| 准确率曲线 | training_logs[].accuracy | 5个（每3步） | 黑色 #000000 | 绿色 #52c41a |
| ASR曲线 | training_logs[].asr | 5个（每3步） | 黑色 #000000 | 蓝色 #1890ff |
| 学习率曲线 | training_logs[].learning_rate | 4个（关键点） | 黑色 #000000 | 紫色 #722ed1 |

### 安全测试数据流

#### 1. 测试结果生成
算法服务对每个代码样本执行ITGen攻击：
- 贝叶斯优化选择CIIV
- 生成对抗样本
- 记录标识符替换
- 计算ASR、AMI、ART指标

#### 2. 数据结构
```json
{
  "asr": 0.75,              // 攻击成功率
  "ami": 92.5,              // 平均修改索引
  "art": 28.7,              // 对抗响应时间
  "identifier_replacements": [  // 标识符替换列表
    {"original": "calculate_sum", "adversarial": "calc_sum", "line": 1}
  ]
}
```

#### 3. 前端可视化
- **性能指标图表**: 条形图显示ASR、AMI、ART
- **对抗样本浏览器**: 代码差异对比
- **标识符替换表**: 显示所有替换详情

### 数据降级策略
前端实现三级降级机制确保数据可用性：
```
1. API调用 (优先)
   ↓ 失败
2. sessionStorage (缓存)
   ↓ 失败
3. Mock数据 (兜底)
```

### API调用示例

#### 获取微调结果
```bash
curl http://localhost:5000/api/finetuning/results/ft_abc123
```

**响应包含**:
- 15个训练日志数据点
- 微调前后性能对比
- 完整的性能指标

#### 获取安全测试结果
```bash
curl http://localhost:5000/api/evaluation/results/eval_xyz789
```

**响应包含**:
- ASR、AMI、ART指标
- 原始代码与对抗代码
- 标识符替换映射

### 前端数据转换
```typescript
// API响应 → 前端格式
const formattedData = {
  training_logs: apiResponse.training_logs,  // 直接使用
  original_ami: apiResponse.original_ami / 100,  // 转为0-1范围
  asr_improvement: Math.abs(apiResponse.asr_improvement) * 100  // 转为百分比
};
```

### 技术特点
- ✅ **完整数据流**: 算法 → 后端 → 前端
- ✅ **实时生成**: 每次训练生成新的日志数据
- ✅ **持久化存储**: 算法服务内存存储（task_results）
- ✅ **降级保障**: 三级降级策略确保可用性
- ✅ **响应式图表**: SVG分层渲染，支持任意缩放

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

