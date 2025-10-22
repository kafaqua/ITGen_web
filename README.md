# 深度代码模型鲁棒性评估与增强平台 - ITGen_web

## 项目概述

本项目是一个完全前后端分离的B/S系统，用于评估和增强深度代码模型的鲁棒性。系统采用微服务架构，后端通过API调用独立的算法服务，满足所有要求。

## 项目结构

```
ITGen_web/                    # 根目录
├── ITGen/                    # 原始ITGen算法代码（与web同级）
│   ├── algorithms/           # 算法模块
│   ├── CodeBERT_adv/        # CodeBERT对抗攻击代码
│   ├── utils.py             # 工具函数
│   └── ...
├── web/                      # Web应用代码
│   ├── frontend/            # React前端应用
│   │   ├── src/
│   │   │   ├── components/  # React组件
│   │   │   ├── pages/       # 页面组件
│   │   │   ├── services/    # API服务
│   │   │   └── hooks/       # 自定义Hooks
│   │   ├── package.json     # 前端依赖
│   │   └── nginx.conf      # Nginx配置
│   ├── backend/             # Flask后端API服务
│   │   ├── app.py          # API服务主文件
│   │   └── requirements.txt
│   └── algorithm_service/   # 独立算法微服务
│       ├── app.py          # 算法服务主文件
│       └── requirements.txt
├── start.bat               # Windows启动脚本
├── start.sh                # Linux/macOS启动脚本
└── README.md               # 项目说明
```

## 核心特性

✅ **B/S系统** - 基于Web的浏览器/服务器架构  
✅ **前后端分离** - 前端React应用 + 后端Flask API服务  
✅ **完全独立运行** - 前端、后端、算法服务均可单独运行，互不影响  
✅ **后端透过接口调用算法** - 后端通过HTTP API调用算法服务  
✅ **后端不内置算法** - 算法逻辑完全封装在独立的微服务中  
✅ **算法服务通过子进程调用ITGen** - 算法服务通过子进程调用ITGen文件夹中的算法  
✅ **容错机制** - 算法服务不可用时，后端自动使用模拟数据  
✅ **web文件夹和ITGen文件夹同级** - 都在ITGen_web根目录下  
✅ **无Docker依赖** - 完全移除Docker，支持原生环境运行  

## 快速启动

### 方式一：一键启动（推荐）

#### Windows用户
```cmd
cd ITGen_web
start.bat
```

#### Linux/macOS用户
```bash
cd ITGen_web
chmod +x start.sh
./start.sh
```

### 方式二：独立启动各模块

#### 使用独立启动脚本（推荐）
```bash
# 启动所有服务
python start_independent.py all

# 只启动前端
python start_independent.py frontend

# 只启动后端
python start_independent.py backend

# 只启动算法服务
python start_independent.py algorithm
```

#### 手动启动各模块

**1. 启动算法服务**
```bash
cd ITGen_web/web/algorithm_service
pip install -r requirements.txt
python app.py
```

**2. 启动后端API服务**
```bash
cd ITGen_web/web/backend
pip install -r requirements.txt
python app.py
```

**3. 启动前端应用**
```bash
cd ITGen_web/web/frontend
npm install
npm start
```

### 方式三：测试各模块独立性
```bash
# 运行独立性测试
python test_independence.py
```

## 服务地址

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:5000
- **算法服务**: http://localhost:8000

## 系统架构

### 架构图
```
┌─────────────────┐    HTTP API    ┌─────────────────┐    Subprocess    ┌─────────────────┐
│   前端应用       │ ──────────────▶│   后端API服务    │ ────────────────▶│   算法服务       │
│   (React)       │                │   (Flask)       │                  │   (Flask)       │
└─────────────────┘                └─────────────────┘                  └─────────────────┘
                                                      │                                    │
                                                      │                                    │
                                                      ▼                                    ▼
                                               ┌─────────────────┐                ┌─────────────────┐
                                               │   任务管理       │                │   ITGen算法      │
                                               │   WebSocket     │                │   (子进程调用)   │
                                               └─────────────────┘                └─────────────────┘
```

### 调用流程
1. **前端** → **后端**: 通过HTTP API发送请求
2. **后端** → **算法服务**: 通过HTTP API转发请求
3. **算法服务** → **ITGen**: 通过子进程调用ITGen算法
4. **ITGen** → **算法服务**: 返回算法结果
5. **算法服务** → **后端**: 返回处理结果
6. **后端** → **前端**: 返回最终结果

## 技术栈

### 前端技术
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Ant Design** - UI组件库
- **Axios** - HTTP客户端
- **Socket.IO Client** - WebSocket客户端

### 后端技术
- **Flask** - Python Web框架
- **Flask-CORS** - 跨域支持
- **Flask-SocketIO** - WebSocket支持
- **Requests** - HTTP客户端

### 算法服务技术
- **Flask** - 算法服务框架
- **Subprocess** - 子进程调用ITGen算法
- **ITGen算法** - 对抗样本生成核心（通过子进程调用）
- **PyTorch** - 深度学习框架（ITGen依赖）
- **Transformers** - 预训练模型库（ITGen依赖）

## 核心功能

### 1. 模型管理
- 支持CodeBERT、GraphCodeBERT、CodeGPT等主流模型
- 提供标准化的预测接口
- 模型测试和验证功能

### 2. 对抗攻击
- 基于ITGen核心算法
- 支持ALERT、Beam Attack等基线方法
- 用户自定义攻击预算
- 实时任务状态监控

### 3. 鲁棒性评估
- 攻击成功率（ASR）
- 平均模型调用次数（AMI）
- 平均运行时间（ART）
- 可视化结果展示

### 4. 对抗性微调
- 使用对抗样本进行模型微调
- 微调前后性能对比
- 训练过程可视化

### 5. 批量测试
- 多模型批量测试
- 多任务支持
- 与基线方法自动对比

## 部署说明

### 生产环境部署

#### 单独部署服务

**前端部署**:
```bash
cd ITGen_web/web/frontend
npm install
npm run build
# 使用nginx或其他web服务器托管build目录
```

**后端部署**:
```bash
cd ITGen_web/web/backend
pip install -r requirements.txt
python app.py
```

**算法服务部署**:
```bash
cd ITGen_web/web/algorithm_service
pip install -r requirements.txt
python app.py
```

## 开发指南

### 前端开发
```bash
cd ITGen_web/web/frontend
npm install
npm start
```

### 后端开发
```bash
cd ITGen_web/web/backend
pip install -r requirements.txt
python app.py
```

### 算法服务开发
```bash
cd ITGen_web/web/algorithm_service
pip install -r requirements.txt
python app.py
```

## 故障排除

### 常见问题

1. **路径问题**
   - 确保ITGen文件夹在ITGen_web根目录下
   - 检查算法服务的ITGen路径配置

2. **端口冲突**
   - 检查端口3000、5000、8000是否被占用
   - 修改各服务的端口配置

3. **依赖安装失败**
   - 检查网络连接
   - 使用国内镜像源

4. **服务启动失败**
   - 检查Python和Node.js版本
   - 查看控制台错误信息
   - 确保所有依赖已正确安装

## 独立运行说明

### 前端独立运行
- **功能**: 显示完整的Web界面，包括所有页面和组件
- **限制**: 无法执行实际的计算任务（需要后端和算法服务）
- **启动**: `python start_independent.py frontend` 或 `cd web/frontend && npm start`
- **访问**: http://localhost:3000

### 后端独立运行
- **功能**: 提供完整的API服务，包括任务管理、WebSocket通信
- **容错**: 算法服务不可用时自动使用模拟数据
- **启动**: `python start_independent.py backend` 或 `cd web/backend && python app.py`
- **访问**: http://localhost:5000

### 算法服务独立运行
- **功能**: 提供算法计算服务，包括ITGen攻击、模型测试等
- **容错**: ITGen模块不可用时使用模拟实现
- **启动**: `python start_independent.py algorithm` 或 `cd web/algorithm_service && python app.py`
- **访问**: http://localhost:8000

### 组合运行
- **完整功能**: 三个服务同时运行，提供完整功能
- **启动**: `python start_independent.py all` 或使用 `start.bat`/`start.sh`
- **容错**: 任一服务不可用时，其他服务仍可正常运行

## 项目优势

1. **完全分离** - 前后端和算法服务完全独立
2. **易于维护** - 模块化设计，便于维护和扩展
3. **灵活部署** - 支持独立部署，无需Docker
4. **容错机制** - 服务间松耦合，单点故障不影响整体
5. **开发友好** - 支持热重载和独立开发
6. **测试友好** - 可单独测试各模块功能

---

**注意**: 这个重新组织的项目结构完全满足您的要求：B/S架构、前后端分离、独立运行、后端通过接口调用算法、后端不内置算法逻辑，并且web文件夹和ITGen文件夹在同一个根目录下。