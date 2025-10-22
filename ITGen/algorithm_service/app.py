"""
算法服务 - 独立的算法微服务
Algorithm Service - Standalone Algorithm Microservice
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
import threading
import queue

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入算法模块
from algorithms.gp_model import MyGPModel
from CodeBERT_adv.Clone_detection.attack.ITGenAttacker import ITGen_Attacker
from utils import CodeDataset, convert_examples_to_features

app = Flask(__name__)
CORS(app)

# 任务队列和状态管理
task_queue = queue.Queue()
task_status = {}

class AlgorithmService:
    """算法服务类"""
    
    def __init__(self):
        self.loaded_models = {}
        self.supported_models = {
            'codebert': {
                'name': 'CodeBERT',
                'description': 'Microsoft CodeBERT for code understanding',
                'model_path': 'microsoft/codebert-base',
                'tokenizer_path': 'microsoft/codebert-base',
                'max_length': 512,
                'supported_tasks': ['clone_detection', 'vulnerability_detection', 'code_summarization']
            },
            'graphcodebert': {
                'name': 'GraphCodeBERT',
                'description': 'GraphCodeBERT with data flow graph',
                'model_path': 'microsoft/graphcodebert-base',
                'tokenizer_path': 'microsoft/graphcodebert-base',
                'max_length': 512,
                'supported_tasks': ['clone_detection', 'vulnerability_detection']
            }
        }
    
    def get_models(self) -> List[Dict[str, Any]]:
        """获取所有可用模型"""
        return [
            {
                'id': model_id,
                'name': model_info['name'],
                'description': model_info['description'],
                'model_path': model_info['model_path'],
                'tokenizer_path': model_info['tokenizer_path'],
                'max_length': model_info['max_length'],
                'supported_tasks': model_info['supported_tasks'],
                'status': 'available',
                'is_predefined': True
            }
            for model_id, model_info in self.supported_models.items()
        ]
    
    def add_model(self, model_data: Dict[str, Any]) -> str:
        """添加新模型"""
        model_id = f"custom_{len(self.supported_models) + 1}"
        
        # 验证模型数据
        required_fields = ['name', 'model_path', 'tokenizer_path', 'max_length', 'supported_tasks']
        for field in required_fields:
            if field not in model_data:
                raise ValueError(f"缺少必需字段: {field}")
        
        # 添加到支持的模型列表
        self.supported_models[model_id] = {
            'name': model_data['name'],
            'description': model_data.get('description', ''),
            'model_path': model_data['model_path'],
            'tokenizer_path': model_data['tokenizer_path'],
            'max_length': model_data['max_length'],
            'supported_tasks': model_data['supported_tasks']
        }
        
        return model_id
    
    def delete_model(self, model_id: str) -> None:
        """删除模型"""
        if model_id in self.supported_models:
            del self.supported_models[model_id]
        else:
            raise ValueError(f"模型不存在: {model_id}")
    
    def test_model(self, model_id: str, test_data: Dict[str, Any]) -> Dict[str, Any]:
        """测试模型"""
        try:
            if model_id not in self.supported_models:
                raise ValueError(f"模型不存在: {model_id}")
            
            model_info = self.supported_models[model_id]
            task_type = test_data.get('task_type', 'clone_detection')
            
            # 模拟模型测试
            if task_type == 'clone_detection':
                result = {
                    'similarity': 0.85,
                    'prediction': 1,
                    'confidence': 0.92
                }
            elif task_type == 'vulnerability_detection':
                result = {
                    'vulnerability_score': 0.73,
                    'prediction': 1,
                    'confidence': 0.88
                }
            elif task_type == 'code_summarization':
                result = {
                    'summary': 'This function performs data processing',
                    'confidence': 0.91
                }
            else:
                raise ValueError(f"不支持的任务类型: {task_type}")
            
            return {
                'success': True,
                'result': result,
                'model_info': {
                    'id': model_id,
                    'name': model_info['name'],
                    'task_type': task_type
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def run_attack(self, attack_data: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """运行对抗攻击"""
        try:
            method = attack_data.get('method', 'itgen')
            model_id = attack_data.get('model_id')
            task_type = attack_data.get('task_type', 'clone_detection')
            code_data = attack_data.get('code_data', {})
            parameters = attack_data.get('parameters', {})
            
            # 验证参数
            if not model_id:
                raise ValueError("缺少模型ID")
            
            if method not in ['itgen', 'alert', 'beam_attack']:
                raise ValueError(f"不支持的攻击方法: {method}")
            
            # 模拟攻击过程
            time.sleep(2)  # 模拟处理时间
            
            if method == 'itgen':
                result = self._run_itgen_attack(code_data, parameters, task_id)
            elif method == 'alert':
                result = self._run_alert_attack(code_data, parameters, task_id)
            elif method == 'beam_attack':
                result = self._run_beam_attack(code_data, parameters, task_id)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _run_itgen_attack(self, code_data: Dict[str, Any], parameters: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """运行ITGen攻击"""
        # 模拟ITGen攻击结果
        return {
            'success': True,
            'original_code': code_data.get('code1', ''),
            'adversarial_code': code_data.get('code1', '').replace('function', 'func'),
            'replaced_words': {'function': 'func'},
            'query_times': 150,
            'time_cost': 45.2,
            'method': 'itgen',
            'task_id': task_id
        }
    
    def _run_alert_attack(self, code_data: Dict[str, Any], parameters: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """运行ALERT攻击"""
        return {
            'success': False,
            'original_code': code_data.get('code1', ''),
            'adversarial_code': None,
            'replaced_words': {},
            'query_times': 0,
            'time_cost': 0,
            'method': 'alert',
            'task_id': task_id,
            'error': 'ALERT攻击尚未实现'
        }
    
    def _run_beam_attack(self, code_data: Dict[str, Any], parameters: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """运行Beam Attack"""
        return {
            'success': False,
            'original_code': code_data.get('code1', ''),
            'adversarial_code': None,
            'replaced_words': {},
            'query_times': 0,
            'time_cost': 0,
            'method': 'beam_attack',
            'task_id': task_id,
            'error': 'Beam Attack尚未实现'
        }
    
    def run_evaluation(self, evaluation_data: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """运行鲁棒性评估"""
        try:
            model_id = evaluation_data.get('model_id')
            task_type = evaluation_data.get('task_type', 'clone_detection')
            test_dataset = evaluation_data.get('test_dataset', [])
            attack_methods = evaluation_data.get('attack_methods', ['itgen'])
            
            # 模拟评估过程
            time.sleep(3)  # 模拟处理时间
            
            attack_results = {}
            for method in attack_methods:
                attack_results[method] = {
                    'asr': 0.75,
                    'ami': 120.5,
                    'art': 35.8,
                    'total_samples': len(test_dataset),
                    'successful_attacks': int(len(test_dataset) * 0.75)
                }
            
            result = {
                'success': True,
                'model_info': {
                    'id': model_id,
                    'name': 'Test Model',
                    'task_type': task_type
                },
                'attack_results': attack_results,
                'metrics': {
                    'asr': 0.75,
                    'ami': 120.5,
                    'art': 35.8
                },
                'summary': {
                    'overall_metrics': {'asr': 0.75, 'ami': 120.5, 'art': 35.8},
                    'method_comparison': attack_results,
                    'recommendations': ['模型对对抗攻击的鲁棒性较低，建议进行对抗训练']
                },
                'task_id': task_id
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def run_finetuning(self, finetuning_data: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """运行对抗性微调"""
        try:
            model_id = finetuning_data.get('model_id')
            task_type = finetuning_data.get('task_type', 'clone_detection')
            training_data = finetuning_data.get('training_data', [])
            adversarial_data = finetuning_data.get('adversarial_data', [])
            parameters = finetuning_data.get('parameters', {})
            
            # 模拟微调过程
            time.sleep(5)  # 模拟训练时间
            
            result = {
                'success': True,
                'task_id': task_id,
                'original_model_id': model_id,
                'finetuned_model_id': f"{model_id}_finetuned_{task_id}",
                'task_type': task_type,
                'finetuning_params': parameters,
                'performance_comparison': {
                    'original_model': {
                        'accuracy': 0.85,
                        'precision': 0.82,
                        'recall': 0.88,
                        'f1': 0.85
                    },
                    'finetuned_model': {
                        'accuracy': 0.92,
                        'precision': 0.90,
                        'recall': 0.94,
                        'f1': 0.92
                    },
                    'improvement': {
                        'accuracy': 0.07,
                        'precision': 0.08,
                        'recall': 0.06,
                        'f1': 0.07
                    }
                },
                'training_history': [
                    {'epoch': 1, 'train_loss': 0.45, 'train_accuracy': 0.78, 'val_loss': 0.52, 'val_accuracy': 0.75, 'learning_rate': 2e-5},
                    {'epoch': 2, 'train_loss': 0.32, 'train_accuracy': 0.85, 'val_loss': 0.38, 'val_accuracy': 0.82, 'learning_rate': 2e-5},
                    {'epoch': 3, 'train_loss': 0.28, 'train_accuracy': 0.92, 'val_loss': 0.31, 'val_accuracy': 0.89, 'learning_rate': 2e-5}
                ],
                'created_at': datetime.now().isoformat(),
                'status': 'completed'
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def run_batch_testing(self, batch_data: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """运行批量测试"""
        try:
            models = batch_data.get('models', [])
            tasks = batch_data.get('tasks', ['clone_detection'])
            attack_methods = batch_data.get('attack_methods', ['itgen'])
            test_datasets = batch_data.get('test_datasets', [])
            baseline_methods = batch_data.get('baseline_methods', ['alert', 'beam_attack'])
            
            # 模拟批量测试过程
            time.sleep(8)  # 模拟处理时间
            
            batch_results = {
                'models': {},
                'tasks': {},
                'attack_methods': {},
                'summary': {
                    'total_models': len(models),
                    'total_tasks': len(tasks),
                    'total_attack_methods': len(attack_methods),
                    'overall_metrics': {'asr': 0.68, 'ami': 95.3, 'art': 28.7}
                }
            }
            
            # 生成模拟结果
            for model_id in models:
                batch_results['models'][model_id] = {}
                for task_type in tasks:
                    batch_results['models'][model_id][task_type] = {
                        'dataset1': {
                            'evaluation_results': {
                                'metrics': {'asr': 0.70, 'ami': 100.0, 'art': 30.0},
                                'attack_results': {
                                    'itgen': {'asr': 0.70, 'ami': 100.0, 'art': 30.0, 'successful_attacks': 7, 'total_samples': 10}
                                }
                            }
                        }
                    }
            
            comparison_report = {
                'baseline_comparison': {
                    'alert': {'average_success_rate': 0.65, 'average_query_times': 120.0, 'average_time_cost': 35.0},
                    'beam_attack': {'average_success_rate': 0.60, 'average_query_times': 150.0, 'average_time_cost': 40.0}
                },
                'method_ranking': {
                    'by_success_rate': [['itgen', {'success_rate': 0.70}], ['alert', {'success_rate': 0.65}], ['beam_attack', {'success_rate': 0.60}]]
                },
                'performance_analysis': {
                    'best_overall': 'itgen',
                    'most_efficient': 'itgen',
                    'fastest': 'itgen'
                }
            }
            
            result = {
                'success': True,
                'task_id': task_id,
                'batch_results': batch_results,
                'comparison_report': comparison_report,
                'created_at': datetime.now().isoformat(),
                'status': 'completed'
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# 初始化算法服务
algorithm_service = AlgorithmService()

# ==================== API 路由 ====================

# 模型管理 API
@app.route('/api/models', methods=['GET'])
def get_models():
    """获取模型列表"""
    try:
        models = algorithm_service.get_models()
        return jsonify({'success': True, 'data': models})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models', methods=['POST'])
def add_model():
    """添加模型"""
    try:
        data = request.get_json()
        model_id = algorithm_service.add_model(data)
        return jsonify({'success': True, 'model_id': model_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/<model_id>', methods=['DELETE'])
def delete_model(model_id):
    """删除模型"""
    try:
        algorithm_service.delete_model(model_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/<model_id>/test', methods=['POST'])
def test_model(model_id):
    """测试模型"""
    try:
        data = request.get_json()
        result = algorithm_service.test_model(model_id, data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 对抗攻击 API
@app.route('/api/attack/start', methods=['POST'])
def start_attack():
    """开始对抗攻击"""
    try:
        data = request.get_json()
        task_id = data.get('task_id', str(uuid.uuid4()))
        result = algorithm_service.run_attack(data, task_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attack/results/<task_id>')
def get_attack_results(task_id):
    """获取攻击结果"""
    try:
        # 这里应该从数据库或缓存中获取结果
        return jsonify({'success': True, 'data': {'task_id': task_id, 'status': 'completed'}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 评估报告 API
@app.route('/api/evaluation/start', methods=['POST'])
def start_evaluation():
    """开始鲁棒性评估"""
    try:
        data = request.get_json()
        task_id = data.get('task_id', str(uuid.uuid4()))
        result = algorithm_service.run_evaluation(data, task_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/evaluation/reports')
def get_evaluation_reports():
    """获取评估报告列表"""
    try:
        # 这里应该从数据库获取报告列表
        return jsonify({'success': True, 'data': []})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/evaluation/reports/<report_id>')
def get_evaluation_report(report_id):
    """获取特定评估报告"""
    try:
        # 这里应该从数据库获取特定报告
        return jsonify({'success': True, 'data': {'report_id': report_id}})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 对抗性微调 API
@app.route('/api/finetuning/start', methods=['POST'])
def start_finetuning():
    """开始对抗性微调"""
    try:
        data = request.get_json()
        task_id = data.get('task_id', str(uuid.uuid4()))
        result = algorithm_service.run_finetuning(data, task_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 批量测试 API
@app.route('/api/batch-testing/start', methods=['POST'])
def start_batch_testing():
    """开始批量测试"""
    try:
        data = request.get_json()
        task_id = data.get('task_id', str(uuid.uuid4()))
        result = algorithm_service.run_batch_testing(data, task_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 文件上传 API
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """文件上传"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '没有文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': '没有选择文件'}), 400
        
        # 模拟文件处理
        file_id = str(uuid.uuid4())
        return jsonify({'success': True, 'file_id': file_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 健康检查
@app.route('/api/health')
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'service': 'algorithm_service'
    })

if __name__ == '__main__':
    print("=" * 60)
    print("深度代码模型鲁棒性评估与增强平台 - 算法服务")
    print("Deep Code Model Robustness Platform - Algorithm Service")
    print("=" * 60)
    print(f"算法服务地址: http://localhost:8000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=8000)
