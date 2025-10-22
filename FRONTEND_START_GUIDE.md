# 前端启动指南

## 问题诊断

根据测试，发现以下问题：
1. npm命令可以找到并运行
2. 前端依赖已安装
3. 但是前端服务启动后无法正常响应

## 解决方案

### 方法一：手动启动前端

1. **打开命令提示符或PowerShell**
2. **进入前端目录**：
   ```cmd
   cd D:\ITGen\ITGen_web\web\frontend
   ```
3. **检查npm版本**：
   ```cmd
   npm --version
   ```
4. **启动前端**：
   ```cmd
   npm start
   ```
   或
   ```cmd
   npm run dev
   ```

### 方法二：使用批处理文件

运行项目根目录下的 `start_frontend_simple.bat` 文件。

### 方法三：检查端口冲突

如果端口3000被占用，可以：

1. **检查端口占用**：
   ```cmd
   netstat -an | findstr :3000
   ```

2. **使用不同端口**：
   ```cmd
   set PORT=3001
   npm start
   ```

### 方法四：重新安装依赖

如果仍有问题，尝试重新安装依赖：

1. **删除node_modules**：
   ```cmd
   rmdir /s node_modules
   ```

2. **重新安装**：
   ```cmd
   npm install
   ```

3. **启动前端**：
   ```cmd
   npm start
   ```

## 预期结果

成功启动后，您应该看到：
- 类似 "webpack compiled successfully" 的消息
- 前端应用运行在 http://localhost:3000
- 浏览器自动打开（如果配置了BROWSER环境变量）

## 故障排除

### 常见错误

1. **"Something is already running on port 3000"**
   - 解决方案：使用不同端口或停止占用端口的进程

2. **"Invalid options object"**
   - 解决方案：检查package.json配置，移除有问题的proxy设置

3. **"npm command not found"**
   - 解决方案：确保Node.js和npm已正确安装并添加到PATH

### 检查清单

- [ ] Node.js已安装 (node --version)
- [ ] npm已安装 (npm --version)
- [ ] 在正确的目录中 (web/frontend)
- [ ] 依赖已安装 (node_modules存在)
- [ ] 端口3000未被占用
- [ ] 没有防火墙阻止

## 成功启动后的访问

前端成功启动后，在浏览器中访问：
- http://localhost:3000

您应该看到深度代码模型鲁棒性评估与增强平台的主页。
