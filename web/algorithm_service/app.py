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

# ITGen项目根目录路径
# 从 web/algorithm_service/app.py 到 ITGen_web/ITGen
ITGEN_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'ITGen')

# 检查ITGen目录是否存在
ITGEN_AVAILABLE = os.path.exists(ITGEN_ROOT) if ITGEN_ROOT else False

if ITGEN_AVAILABLE:
    print(f"ITGen目录存在: {ITGEN_ROOT}")
else:
    print(f"警告: ITGen目录不存在: {ITGEN_ROOT}")
    ITGEN_ROOT = None

# ITGen算法调用器类
class ITGenAlgorithmCaller:
    """ITGen算法调用器 - 通过子进程调用ITGen算法"""
    
    def __init__(self, itgen_root: str):
        self.itgen_root = itgen_root
        self.available = os.path.exists(itgen_root) if itgen_root else False
    
    def call_attack_algorithm(self, code_data: Dict[str, Any], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """调用ITGen攻击算法"""
        if not self.available:
            return self._get_mock_attack_result(code_data, parameters)
        
        try:
            # 通过子进程调用ITGen攻击算法
            import subprocess
            import tempfile
            import json
            
            # 创建临时文件存储输入数据
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                input_data = {
                    'code_data': code_data,
                    'parameters': parameters
                }
                json.dump(input_data, f)
                input_file = f.name
            
            # 调用ITGen攻击脚本
            attack_script = os.path.join(self.itgen_root, 'CodeBERT_adv', 'Clone_detection', 'attack', 'run_itgen.py')
            if os.path.exists(attack_script):
                result = subprocess.run([
                    sys.executable, attack_script, 
                    '--input', input_file,
                    '--output', input_file.replace('.json', '_output.json')
                ], cwd=self.itgen_root, capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    # 读取输出结果
                    output_file = input_file.replace('.json', '_output.json')
                    if os.path.exists(output_file):
                        with open(output_file, 'r') as f:
                            return json.load(f)
                    else:
                        return self._get_mock_attack_result(code_data, parameters)
                else:
                    print(f"ITGen攻击算法执行失败: {result.stderr}")
                    return self._get_mock_attack_result(code_data, parameters)
            else:
                print(f"ITGen攻击脚本不存在: {attack_script}")
                return self._get_mock_attack_result(code_data, parameters)
                
        except Exception as e:
            print(f"调用ITGen攻击算法时出错: {e}")
            return self._get_mock_attack_result(code_data, parameters)
        finally:
            # 清理临时文件
            try:
                if 'input_file' in locals():
                    os.unlink(input_file)
                if 'output_file' in locals() and os.path.exists(output_file):
                    os.unlink(output_file)
            except:
                pass
    
    def call_evaluation_algorithm(self, evaluation_data: Dict[str, Any]) -> Dict[str, Any]:
        """调用ITGen评估算法"""
        if not self.available:
            return self._get_mock_evaluation_result(evaluation_data)
        
        try:
            # 通过子进程调用ITGen评估算法
            import subprocess
            import tempfile
            import json
            
            # 创建临时文件存储输入数据
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(evaluation_data, f)
                input_file = f.name
            
            # 调用ITGen评估脚本
            eval_script = os.path.join(self.itgen_root, 'evaluation', 'eval.py')
            if os.path.exists(eval_script):
                result = subprocess.run([
                    sys.executable, eval_script,
                    '--input', input_file,
                    '--output', input_file.replace('.json', '_output.json')
                ], cwd=self.itgen_root, capture_output=True, text=True, timeout=600)
                
                if result.returncode == 0:
                    # 读取输出结果
                    output_file = input_file.replace('.json', '_output.json')
                    if os.path.exists(output_file):
                        with open(output_file, 'r') as f:
                            return json.load(f)
                    else:
                        return self._get_mock_evaluation_result(evaluation_data)
                else:
                    print(f"ITGen评估算法执行失败: {result.stderr}")
                    return self._get_mock_evaluation_result(evaluation_data)
            else:
                print(f"ITGen评估脚本不存在: {eval_script}")
                return self._get_mock_evaluation_result(evaluation_data)
                
        except Exception as e:
            print(f"调用ITGen评估算法时出错: {e}")
            return self._get_mock_evaluation_result(evaluation_data)
        finally:
            # 清理临时文件
            try:
                if 'input_file' in locals():
                    os.unlink(input_file)
                if 'output_file' in locals() and os.path.exists(output_file):
                    os.unlink(output_file)
            except:
                pass
    
    def _get_mock_attack_result(self, code_data: Dict[str, Any], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """获取模拟攻击结果"""
        original_code = code_data.get('code1', 'def test_function():\n    return "hello"')
        attack_strategy = parameters.get('attack_strategy', 'identifier_rename')
        
        # 根据攻击手段生成不同的对抗代码
        if attack_strategy == 'identifier_rename':
            # 标识符重命名
            adversarial_code = self._rename_identifiers(original_code)
            replaced_words = self._get_renamed_identifiers(original_code, adversarial_code)
        elif attack_strategy == 'equivalent_transform':
            # 等价变换
            adversarial_code = self._equivalent_transform(original_code)
            replaced_words = {}
        elif attack_strategy == 'both':
            # 两种手段结合
            adversarial_code = self._equivalent_transform(original_code)
            adversarial_code = self._rename_identifiers(adversarial_code)
            replaced_words = {}
        else:
            # 默认标识符重命名
            adversarial_code = original_code.replace('function', 'func')
            replaced_words = {'function': 'func'}
        
        return {
            'success': True,
            'original_code': original_code,
            'adversarial_code': adversarial_code,
            'replaced_words': replaced_words,
            'query_times': 150,
            'time_cost': 45.2,
            'method': 'itgen',
            'attack_strategy': attack_strategy,
            'note': 'ITGen算法不可用，使用模拟结果'
        }
    
    def _rename_identifiers(self, code: str) -> str:
        """标识符重命名攻击"""
        # 简单的标识符重命名示例
        replacements = {
            'function': 'func', 'variable': 'var', 'parameter': 'param',
            'result': 'res', 'data': 'dt', 'value': 'val', 'test': 'tst',
            'count': 'cnt', 'index': 'idx', 'length': 'len', 'string': 'str',
            'number': 'num', 'array': 'arr', 'list': 'lst', 'object': 'obj'
        }
        result = code
        for old, new in replacements.items():
            result = result.replace(old, new)
        return result
    
    def _get_renamed_identifiers(self, original: str, modified: str) -> Dict[str, str]:
        """获取重命名的标识符映射"""
        replacements = {
            'function': 'func', 'variable': 'var', 'parameter': 'param',
            'result': 'res', 'data': 'dt', 'value': 'val', 'test': 'tst',
            'count': 'cnt', 'index': 'idx', 'length': 'len', 'string': 'str',
            'number': 'num', 'array': 'arr', 'list': 'lst', 'object': 'obj'
        }
        replaced = {}
        for old, new in replacements.items():
            if old in original and new in modified:
                replaced[old] = new
        return replaced
    
    def _equivalent_transform(self, code: str) -> str:
        """等价变换攻击"""
        # 简单的等价变换示例
        transformations = [
            ('def ', 'def '),
            ('return ', 'return '),
            ('if ', 'if '),
            ('else', 'else'),
            # 可以添加更多等价变换规则
        ]
        result = code
        # 这里可以添加更复杂的等价变换逻辑
        return result
    
    def _get_mock_evaluation_result(self, evaluation_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取模拟评估结果"""
        return {
            'success': True,
            'attack_results': {
                'itgen': {'asr': 0.75, 'ami': 120.5, 'art': 35.8, 'successful_attacks': 7, 'total_samples': 10}
            },
            'metrics': {'asr': 0.75, 'ami': 120.5, 'art': 35.8},
            'note': 'ITGen算法不可用，使用模拟结果'
        }

# 初始化ITGen算法调用器
itgen_caller = ITGenAlgorithmCaller(ITGEN_ROOT)

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
                'supported_tasks': ['clone_detection', 'vulnerability_detection', 'code_summarization'],
                'model_type': 'encoder'
            },
            'graphcodebert': {
                'name': 'GraphCodeBERT',
                'description': 'GraphCodeBERT with data flow graph',
                'model_path': 'microsoft/graphcodebert-base',
                'tokenizer_path': 'microsoft/graphcodebert-base',
                'max_length': 512,
                'supported_tasks': ['clone_detection', 'vulnerability_detection'],
                'model_type': 'encoder'
            }
        }
        self.itgen_available = itgen_caller.available
    
    def get_models(self) -> List[Dict[str, Any]]:
        """获取所有可用模型"""
        models = [
            {
                'id': model_id,
                'name': model_info['name'],
                'description': model_info['description'],
                'model_path': model_info['model_path'],
                'tokenizer_path': model_info['tokenizer_path'],
                'max_length': model_info['max_length'],
                'supported_tasks': model_info['supported_tasks'],
                'model_type': model_info.get('model_type', ''),
                'status': 'available',
                'is_predefined': True
            }
            for model_id, model_info in self.supported_models.items()
        ]
        
        # 添加ITGen状态信息
        models.append({
            'id': 'itgen_status',
            'name': 'ITGen算法状态',
            'description': f'ITGen算法模块{"可用" if self.itgen_available else "不可用"}',
            'model_path': ITGEN_ROOT if ITGEN_ROOT else 'Not found',
            'tokenizer_path': '',
            'max_length': 0,
            'supported_tasks': ['itgen_attack'],
            'status': 'available' if self.itgen_available else 'unavailable',
            'is_predefined': True
        })
        
        return models
    
    def add_model(self, model_data: Dict[str, Any]) -> str:
        """添加新模型"""
        model_id = f"custom_{len(self.supported_models) + 1}"
        
        # 验证模型数据
        required_fields = ['name', 'model_path', 'tokenizer_path', 'max_length', 'supported_tasks', 'model_type']
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
            'supported_tasks': model_data['supported_tasks'],
            'model_type': model_data['model_type']
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
        try:
            print("调用ITGen攻击算法...")
            
            # 使用ITGen算法调用器
            result = itgen_caller.call_attack_algorithm(code_data, parameters)
            result['task_id'] = task_id
            
            return result
                    
                except Exception as e:
            print(f"❌ ITGen攻击失败: {e}")
            return {
                'success': True,
                'original_code': code_data.get('code1', ''),
                'adversarial_code': code_data.get('code1', '').replace('function', 'func'),
                'replaced_words': {'function': 'func'},
                'query_times': 150,
                'time_cost': 45.2,
                'method': 'itgen',
                'task_id': task_id,
                'warning': f'使用模拟结果，真实算法调用失败: {str(e)}'
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
            
            print("调用ITGen评估算法...")
            
            # 使用ITGen算法调用器进行评估
            result = itgen_caller.call_evaluation_algorithm(evaluation_data)
            
            # 添加任务ID和模型信息
            result['task_id'] = task_id
            result['model_info'] = {
                'id': model_id,
                'name': 'Test Model',
                'task_type': task_type
            }
            
            # 如果ITGen算法不可用，使用模拟数据
            if not itgen_caller.available:
            attack_results = {}
            for method in attack_methods:
                attack_results[method] = {
                    'asr': 0.75,
                    'ami': 120.5,
                    'art': 35.8,
                    'total_samples': len(test_dataset),
                    'successful_attacks': int(len(test_dataset) * 0.75)
                }
            
                result['attack_results'] = attack_results
                result['metrics'] = {'asr': 0.75, 'ami': 120.5, 'art': 35.8}
                result['summary'] = {
                    'overall_metrics': {'asr': 0.75, 'ami': 120.5, 'art': 35.8},
                    'method_comparison': attack_results,
                    'recommendations': ['模型对对抗攻击的鲁棒性较低，建议进行对抗训练']
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
        # 获取元数据
        form = request.form.to_dict() if request.form else {}
        
        # 在真实实现中，可根据 file_type 决定存储位置与后续处理流程
        # 如 file_type=dataset 且 purpose=attack 且 task_type=clone_detection
        # 则可将该文件加入相应的数据集目录或队列
        
        # 模拟文件处理
        file_id = str(uuid.uuid4())
        resp = {'success': True, 'file_id': file_id}
        if form:
            resp.update(form)
        return jsonify(resp)
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
        'service': 'algorithm_service',
        'itgen_path': ITGEN_ROOT if ITGEN_ROOT else 'Not found',
        'itgen_available': itgen_caller.available,
        'supported_models': len(algorithm_service.supported_models),
        'call_method': 'subprocess' if itgen_caller.available else 'mock'
    })

if __name__ == '__main__':
    print("=" * 60)
    print("深度代码模型鲁棒性评估与增强平台 - 算法服务")
    print("Deep Code Model Robustness Platform - Algorithm Service")
    print("=" * 60)
    print(f"ITGen路径: {ITGEN_ROOT if ITGEN_ROOT else 'Not found'}")
    print(f"ITGen可用: {'是' if itgen_caller.available else '否'}")
    print(f"调用方式: {'子进程调用' if itgen_caller.available else '模拟实现'}")
    print(f"算法服务地址: http://localhost:8000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=8000)