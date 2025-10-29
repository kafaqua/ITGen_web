"""
后端API服务 - 不包含算法逻辑
Backend API Service - Algorithm-free
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import sys
import json
import time
import uuid
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional
import threading
import queue

# 配置
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])  # 前端地址
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://localhost:3001"])

# 算法服务配置 - 指向ITGen文件夹中的算法服务
ALGORITHM_SERVICE_URL = os.getenv('ALGORITHM_SERVICE_URL', 'http://localhost:8000')

# 任务队列和状态管理
task_queue = queue.Queue()
task_status = {}
active_connections = set()

class TaskManager:
    """任务管理器"""
    
    def __init__(self):
        self.tasks = {}
        self.running = True
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
    
    def _worker(self):
        """后台任务处理工作线程"""
        while self.running:
            try:
                task = task_queue.get(timeout=1)
                if task is None:
                    break
                
                task_id = task['task_id']
                task_type = task['task_type']
                task_data = task['data']
                
                # 更新任务状态
                self.tasks[task_id] = {
                    'status': 'running',
                    'progress': 0,
                    'message': '任务开始执行...',
                    'start_time': datetime.now().isoformat(),
                    'result': None
                }
                
                # 通知前端
                self._notify_frontend(task_id, 'task_started')
                
                try:
                    # 调用算法服务
                    result = self._call_algorithm_service(task_type, task_data, task_id)
                    
                    self.tasks[task_id].update({
                        'status': 'completed',
                        'progress': 100,
                        'message': '任务完成',
                        'end_time': datetime.now().isoformat(),
                        'result': result
                    })
                    
                    # 通知前端
                    self._notify_frontend(task_id, 'task_completed')
                    
                except Exception as e:
                    self.tasks[task_id].update({
                        'status': 'failed',
                        'progress': 0,
                        'message': f'任务失败: {str(e)}',
                        'end_time': datetime.now().isoformat(),
                        'error': str(e)
                    })
                    
                    # 通知前端
                    self._notify_frontend(task_id, 'task_failed')
                
                task_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                print(f"任务处理错误: {e}")
    
    def _call_algorithm_service(self, task_type: str, task_data: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """调用算法服务"""
        try:
            # 根据任务类型调用不同的算法服务端点
            if task_type == 'attack':
                endpoint = f"{ALGORITHM_SERVICE_URL}/api/attack/start"
            elif task_type == 'evaluation':
                endpoint = f"{ALGORITHM_SERVICE_URL}/api/evaluation/start"
            elif task_type == 'finetuning':
                endpoint = f"{ALGORITHM_SERVICE_URL}/api/finetuning/start"
            elif task_type == 'batch_testing':
                endpoint = f"{ALGORITHM_SERVICE_URL}/api/batch-testing/start"
            else:
                raise ValueError(f"不支持的任务类型: {task_type}")
            
            # 添加任务ID到请求数据
            task_data['task_id'] = task_id
            
            # 发送请求到算法服务
            response = requests.post(endpoint, json=task_data, timeout=30)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            # 如果算法服务不可用，返回模拟结果
            print(f"⚠️ 算法服务不可用: {str(e)}")
            return self._get_mock_result(task_type, task_data, task_id)
    
    def _get_mock_result(self, task_type: str, task_data: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """获取模拟结果（当算法服务不可用时）"""
        if task_type == 'attack':
            original_code = task_data.get('code_data', {}).get('code1', 'def test_function():\n    return "hello"')
            attack_strategy = task_data.get('parameters', {}).get('attack_strategy', 'identifier_rename')
            
            # 根据攻击手段生成不同的对抗代码
            if attack_strategy == 'identifier_rename':
                adversarial_code = original_code.replace('function', 'func').replace('variable', 'var')
                replaced_words = {'function': 'func', 'variable': 'var'}
            elif attack_strategy == 'equivalent_transform':
                adversarial_code = original_code  # 等价变换保持不变
                replaced_words = {}
            elif attack_strategy == 'both':
                adversarial_code = original_code.replace('function', 'func').replace('variable', 'var')
                replaced_words = {'function': 'func', 'variable': 'var'}
            else:
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
                'task_id': task_id,
                'note': '算法服务不可用，使用模拟结果'
            }
        elif task_type == 'evaluation':
            return {
                'success': True,
                'task_id': task_id,
                'attack_results': {
                    'itgen': {'asr': 0.75, 'ami': 120.5, 'art': 35.8, 'successful_attacks': 7, 'total_samples': 10}
                },
                'metrics': {'asr': 0.75, 'ami': 120.5, 'art': 35.8},
                'note': '算法服务不可用，使用模拟结果'
            }
        elif task_type == 'finetuning':
            return {
                'success': True,
                'task_id': task_id,
                'finetuned_model_id': f"mock_finetuned_{task_id}",
                'performance_comparison': {
                    'original_model': {'accuracy': 0.85, 'precision': 0.82, 'recall': 0.88, 'f1': 0.85},
                    'finetuned_model': {'accuracy': 0.92, 'precision': 0.90, 'recall': 0.94, 'f1': 0.92}
                },
                'note': '算法服务不可用，使用模拟结果'
            }
        elif task_type == 'batch_testing':
            return {
                'success': True,
                'task_id': task_id,
                'batch_results': {
                    'summary': {'total_models': 1, 'total_tasks': 1, 'overall_metrics': {'asr': 0.68, 'ami': 95.3, 'art': 28.7}}
                },
                'note': '算法服务不可用，使用模拟结果'
            }
        else:
            return {
                'success': False,
                'error': f'不支持的任务类型: {task_type}',
                'note': '算法服务不可用'
            }
    
    def _notify_frontend(self, task_id: str, event_type: str):
        """通知前端任务状态变化"""
        if task_id in self.tasks:
            socketio.emit('task_update', {
                'task_id': task_id,
                'event_type': event_type,
                'task_data': self.tasks[task_id]
            })
    
    def add_task(self, task_type: str, task_data: Dict[str, Any]) -> str:
        """添加任务"""
        task_id = str(uuid.uuid4())
        task_queue.put({
            'task_id': task_id,
            'task_type': task_type,
            'data': task_data
        })
        return task_id
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务状态"""
        return self.tasks.get(task_id)
    
    def get_all_tasks(self) -> Dict[str, Any]:
        """获取所有任务"""
        return self.tasks
    
    def stop(self):
        """停止任务管理器"""
        self.running = False
        task_queue.put(None)

# 初始化任务管理器
task_manager = TaskManager()

# ==================== WebSocket 事件处理 ====================

@socketio.on('connect')
def handle_connect():
    """客户端连接"""
    active_connections.add(request.sid)
    print(f"客户端连接: {request.sid}")
    emit('connected', {'message': '连接成功'})

@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开连接"""
    active_connections.discard(request.sid)
    print(f"客户端断开: {request.sid}")

@socketio.on('subscribe_task')
def handle_subscribe_task(data):
    """订阅任务更新"""
    task_id = data.get('task_id')
    if task_id:
        emit('subscribed', {'task_id': task_id, 'message': '订阅成功'})

# ==================== API 路由 ====================

# 模型管理 API
@app.route('/api/models', methods=['GET'])
def get_models():
    """获取模型列表"""
    try:
        # 调用算法服务获取模型列表
        response = requests.get(f"{ALGORITHM_SERVICE_URL}/api/models", timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        # 如果算法服务不可用，返回模拟模型列表
        print(f"⚠️ 算法服务不可用: {str(e)}")
        mock_models = {
            'success': True,
            'data': [
                {
                    'id': 'codebert',
                    'name': 'CodeBERT',
                    'description': 'Microsoft CodeBERT for code understanding',
                    'model_path': 'microsoft/codebert-base',
                    'tokenizer_path': 'microsoft/codebert-base',
                    'max_length': 512,
                    'supported_tasks': ['clone_detection', 'vulnerability_detection', 'code_summarization'],
                    'model_type': 'encoder',
                    'status': 'available',
                    'is_predefined': True
                },
                {
                    'id': 'graphcodebert',
                    'name': 'GraphCodeBERT',
                    'description': 'GraphCodeBERT with data flow graph',
                    'model_path': 'microsoft/graphcodebert-base',
                    'tokenizer_path': 'microsoft/graphcodebert-base',
                    'max_length': 512,
                    'supported_tasks': ['clone_detection', 'vulnerability_detection'],
                    'model_type': 'encoder',
                    'status': 'available',
                    'is_predefined': True
                },
                {
                    'id': 'itgen_status',
                    'name': 'ITGen算法状态',
                    'description': 'ITGen算法模块不可用',
                    'model_path': 'Not found',
                    'tokenizer_path': '',
                    'max_length': 0,
                    'supported_tasks': ['itgen_attack'],
                    'model_type': '',
                    'status': 'unavailable',
                    'is_predefined': True
                }
            ]
        }
        return jsonify(mock_models)

@app.route('/api/models', methods=['POST'])
def add_model():
    """添加模型"""
    try:
        data = request.get_json()
        response = requests.post(f"{ALGORITHM_SERVICE_URL}/api/models", json=data, timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"⚠️ 算法服务不可用: {str(e)}")
        return jsonify({'success': False, 'error': '算法服务不可用，无法添加模型'}), 503

@app.route('/api/models/<model_id>', methods=['DELETE'])
def delete_model(model_id):
    """删除模型"""
    try:
        response = requests.delete(f"{ALGORITHM_SERVICE_URL}/api/models/{model_id}", timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"⚠️ 算法服务不可用: {str(e)}")
        return jsonify({'success': False, 'error': '算法服务不可用，无法删除模型'}), 503

@app.route('/api/models/<model_id>/test', methods=['POST'])
def test_model(model_id):
    """测试模型"""
    try:
        data = request.get_json()
        response = requests.post(f"{ALGORITHM_SERVICE_URL}/api/models/{model_id}/test", json=data, timeout=30)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"⚠️ 算法服务不可用: {str(e)}")
        # 返回模拟测试结果
        mock_result = {
            'success': True,
            'result': {
                'similarity': 0.85,
                'prediction': 1,
                'confidence': 0.92
            },
            'model_info': {
                'id': model_id,
                'name': 'Test Model',
                'task_type': data.get('task_type', 'clone_detection')
            },
            'note': '算法服务不可用，使用模拟结果'
        }
        return jsonify(mock_result)

# 对抗攻击 API
@app.route('/api/attack/start', methods=['POST'])
def start_attack():
    """开始对抗攻击"""
    try:
        data = request.get_json()
        task_id = task_manager.add_task('attack', data)
        return jsonify({'success': True, 'task_id': task_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attack/status/<task_id>')
def get_attack_status(task_id):
    """获取攻击任务状态"""
    try:
        status = task_manager.get_task_status(task_id)
        if status:
            return jsonify({'success': True, 'status': status})
        else:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/attack/results/<task_id>')
def get_attack_results(task_id):
    """获取攻击结果"""
    try:
        response = requests.get(f"{ALGORITHM_SERVICE_URL}/api/attack/results/{task_id}", timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"⚠️ 算法服务不可用: {str(e)}")
        return jsonify({'success': True, 'data': {'task_id': task_id, 'status': 'completed', 'note': '算法服务不可用'}})

# 评估报告 API
@app.route('/api/evaluation/start', methods=['POST'])
def start_evaluation():
    """开始鲁棒性评估"""
    try:
        data = request.get_json()
        task_id = task_manager.add_task('evaluation', data)
        return jsonify({'success': True, 'task_id': task_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/evaluation/reports')
def get_evaluation_reports():
    """获取评估报告列表"""
    try:
        response = requests.get(f"{ALGORITHM_SERVICE_URL}/api/evaluation/reports", timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"⚠️ 算法服务不可用: {str(e)}")
        return jsonify({'success': True, 'data': []})

@app.route('/api/evaluation/reports/<report_id>')
def get_evaluation_report(report_id):
    """获取特定评估报告"""
    try:
        response = requests.get(f"{ALGORITHM_SERVICE_URL}/api/evaluation/reports/{report_id}", timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"⚠️ 算法服务不可用: {str(e)}")
        return jsonify({'success': True, 'data': {'report_id': report_id, 'note': '算法服务不可用'}})

# 对抗性微调 API
@app.route('/api/finetuning/start', methods=['POST'])
def start_finetuning():
    """开始对抗性微调"""
    try:
        data = request.get_json()
        task_id = task_manager.add_task('finetuning', data)
        return jsonify({'success': True, 'task_id': task_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finetuning/status/<task_id>')
def get_finetuning_status(task_id):
    """获取微调任务状态"""
    try:
        status = task_manager.get_task_status(task_id)
        if status:
            return jsonify({'success': True, 'status': status})
        else:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finetuning/results/<task_id>')
def get_finetuning_results(task_id):
    """获取微调任务结果（包含训练日志）"""
    try:
        # 从算法服务获取完整结果
        response = requests.get(f'{ALGORITHM_SERVICE_URL}/api/finetuning/results/{task_id}')
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'success': False, 'error': '结果不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 安全测试结果 API
@app.route('/api/evaluation/results/<task_id>')
def get_evaluation_results(task_id):
    """获取安全测试结果（包含详细数据）"""
    try:
        # 从算法服务获取完整结果
        response = requests.get(f'{ALGORITHM_SERVICE_URL}/api/evaluation/results/{task_id}')
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'success': False, 'error': '结果不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/evaluation/status/<task_id>')
def get_evaluation_status(task_id):
    """获取安全测试任务状态"""
    try:
        status = task_manager.get_task_status(task_id)
        if status:
            return jsonify({'success': True, 'status': status})
        else:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 批量测试 API
@app.route('/api/batch-testing/start', methods=['POST'])
def start_batch_testing():
    """开始批量测试"""
    try:
        data = request.get_json()
        task_id = task_manager.add_task('batch_testing', data)
        return jsonify({'success': True, 'task_id': task_id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/batch-testing/status/<task_id>')
def get_batch_testing_status(task_id):
    """获取批量测试状态"""
    try:
        status = task_manager.get_task_status(task_id)
        if status:
            return jsonify({'success': True, 'status': status})
        else:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
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
        # 元数据（file_type、task_type、purpose 等）
        form = request.form.to_dict() if request.form else {}
        
        # 转发到算法服务（multipart）
        files = {'file': (file.filename, file.stream, file.content_type)}
        response = requests.post(
            f"{ALGORITHM_SERVICE_URL}/api/upload",
            files=files,
            data=form,
            timeout=30
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"⚠️ 算法服务不可用: {str(e)}")
        # 返回模拟文件上传结果
        import uuid
        file_id = str(uuid.uuid4())
        mock = {'success': True, 'file_id': file_id, 'note': '算法服务不可用，使用模拟结果'}
        # 透传前端的元数据，便于前端后续逻辑
        if request.form:
            mock.update({k: v for k, v in request.form.items()})
        return jsonify(mock)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 任务状态 API
@app.route('/api/tasks/status/<task_id>')
def get_task_status(task_id):
    """获取任务状态"""
    try:
        status = task_manager.get_task_status(task_id)
        if status:
            return jsonify({'success': True, 'status': status})
        else:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/tasks')
def get_all_tasks():
    """获取所有任务状态"""
    try:
        return jsonify({'success': True, 'tasks': task_manager.get_all_tasks()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# 健康检查
@app.route('/api/health')
def health_check():
    """健康检查"""
    try:
        # 检查算法服务是否可用
        response = requests.get(f"{ALGORITHM_SERVICE_URL}/api/health", timeout=5)
        algorithm_service_status = response.status_code == 200
    except:
        algorithm_service_status = False
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'algorithm_service_available': algorithm_service_status,
        'active_connections': len(active_connections),
        'note': '后端服务正常运行，算法服务状态见algorithm_service_available字段'
    })

# 静态文件服务（用于前端构建后的文件）
@app.route('/')
def serve_frontend():
    """服务前端应用"""
    return send_from_directory('../frontend/build', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """服务静态文件"""
    return send_from_directory('../frontend/build', path)

if __name__ == '__main__':
    print("=" * 60)
    print("深度代码模型鲁棒性评估与增强平台 - 后端API服务")
    print("Deep Code Model Robustness Platform - Backend API Service")
    print("=" * 60)
    print(f"算法服务地址: {ALGORITHM_SERVICE_URL}")
    print(f"API服务地址: http://localhost:5000")
    print("=" * 60)
    
    try:
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n正在停止服务...")
        task_manager.stop()
        print("服务已停止")
