import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        console.log('API请求:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('API请求错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log('API响应:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('API响应错误:', error);
        return Promise.reject(error);
      }
    );
  }

  // ===== 模型管理API =====
  // 基础类型定义
  public static readonly SupportedTasks = ['clone_detection','vulnerability_detection','code_summarization','code_generation'] as const;
  public static readonly ModelTypes = ['encoder','decoder','encoder-decoder'] as const;

  async getModels(): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      description: string;
      model_path: string;
      tokenizer_path: string;
      max_length: number;
      supported_tasks: string[];
      model_type?: string;
      status: string;
      is_predefined: boolean;
    }>;
  }> {
    const response = await this.api.get('/api/models');
    return response.data;
  }

  async addModel(modelData: {
    name: string;
    model_type: string; // 前端必填：模型类型
    description: string;
    model_path: string;
    tokenizer_path: string;
    max_length: number;
    supported_tasks: string[];
  }): Promise<{ success: boolean; model_id?: string; error?: string }> {
    const response = await this.api.post('/api/models', modelData);
    return response.data;
  }

  async deleteModel(modelId: string): Promise<{ success: boolean; error?: string }> {
    const response = await this.api.delete(`/api/models/${modelId}`);
    return response.data;
  }

  async testModel(modelId: string, testData: { task_type: string; [k: string]: any }): Promise<any> {
    const response = await this.api.post(`/api/models/${modelId}/test`, testData);
    return response.data;
  }

  // 对抗攻击API
  async startAttack(attackData: any) {
    const response = await this.api.post('/api/attack/start', attackData);
    return response.data;
  }

  async getAttackStatus(taskId: string) {
    const response = await this.api.get(`/api/attack/status/${taskId}`);
    return response.data;
  }

  async getAttackResults(taskId: string) {
    const response = await this.api.get(`/api/attack/results/${taskId}`);
    return response.data;
  }

  async startAttackWithConfig(config: any) {
    const response = await this.api.post('/api/attack/start', config);
    return response.data;
  }

  // 评估报告API
  async startEvaluation(evaluationData: any) {
    const response = await this.api.post('/api/evaluation/start', evaluationData);
    return response.data;
  }

  async getEvaluationReports() {
    const response = await this.api.get('/api/evaluation/reports');
    return response.data;
  }

  async getEvaluationReport(reportId: string) {
    const response = await this.api.get(`/api/evaluation/reports/${reportId}`);
    return response.data;
  }

  // 对抗性微调API
  async startFinetuning(finetuningData: any) {
    const response = await this.api.post('/api/finetuning/start', finetuningData);
    return response.data;
  }

  async getFinetuningStatus(taskId: string) {
    const response = await this.api.get(`/api/finetuning/status/${taskId}`);
    return response.data;
  }

  async getFinetuningResults(taskId: string) {
    const response = await this.api.get(`/api/finetuning/results/${taskId}`);
    return response.data;
  }

  async downloadModel(modelId: string) {
    const response = await this.api.get(`/api/models/${modelId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // 批量测试API
  async startBatchTesting(batchData: any) {
    const response = await this.api.post('/api/batch-testing/start', batchData);
    return response.data;
  }

  async getBatchTestingStatus(taskId: string) {
    const response = await this.api.get(`/api/batch-testing/status/${taskId}`);
    return response.data;
  }

  // 批量测试结果API（如果需要）
  async getBatchTestingResults(taskId: string) {
    const response = await this.api.get(`/api/batch-testing/results/${taskId}`);
    return response.data;
  }

  // 数据/模型上传API（支持元数据）
  async uploadFile(
    file: File,
    options?: {
      fileType?: 'model' | 'dataset';
      taskType?: 'clone_detection' | 'vulnerability_detection' | 'code_summarization' | 'code_generation';
      purpose?: 'attack' | 'evaluation' | 'finetuning' | 'batch_testing';
      modelName?: string; // 若为模型文件可附带
      modelType?: string; // 若为模型文件可附带
      datasetName?: string; // 若为数据集可附带
    }
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.fileType) formData.append('file_type', options.fileType);
    if (options?.taskType) formData.append('task_type', options.taskType);
    if (options?.purpose) formData.append('purpose', options.purpose);
    if (options?.modelName) formData.append('model_name', options.modelName);
    if (options?.modelType) formData.append('model_type', options.modelType);
    if (options?.datasetName) formData.append('dataset_name', options.datasetName);
    
    const response = await this.api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // 任务状态API
  async getTaskStatus(taskId: string) {
    const response = await this.api.get(`/api/tasks/status/${taskId}`);
    return response.data;
  }

  async getAllTasks() {
    const response = await this.api.get('/api/tasks');
    return response.data;
  }

  // 健康检查API
  async healthCheck() {
    const response = await this.api.get('/api/health');
    return response.data;
  }

  // 模型下载API
  async downloadModelFile(modelPath: string, fileName: string) {
    const response = await this.api.get(`/api/models/download`, {
      params: { path: modelPath },
      responseType: 'blob'
    });
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  }
}

export default new ApiService();
