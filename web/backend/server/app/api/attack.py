from flask import Blueprint, request, jsonify, send_file
from app.services.attack_service import AttackService
import uuid
import logging
import time
import json
from pathlib import Path

logger = logging.getLogger(__name__)

bp = Blueprint('attack', __name__)
task_store = {}


@bp.route('/attack/start', methods=['POST'])
def create_attack():
    """
    创建新的攻击任务（异步执行）
    
    请求体格式 (符合API_DOCUMENTATION.md):
    {
        "method": "itgen",              # 攻击方法（itgen, beam, alert, mhm, etc.）
        "model_name": "codebert",         # 模型ID（codebert, codegpt, codet5, etc.）
        "task_type": "clone-detection", # 任务类型（clone-detection, vulnerability-detection, etc.）
        "code_data": {
            "code1": "...",
            "code2": "..."
        },
        "parameters": {
            "true_label": 1,             # 真实标签（0或1）
            "max_queries": 100,          # 最大查询次数
            "timeout": 60,               # 超时时间（秒）
            "seed": 3407,                # 随机种子（可选，默认3407）
        }
    }
    
    替代词获取策略：
    1. 如果parameters.substitutes存在 → 使用外部提供的替代词
    2. 否则从test_subs_clone.jsonl文件加载
    3. 如果load_substitutes_from_file=false → 使用算法自动生成（CodeBERT MLM）
    
    返回格式 (符合API_DOCUMENTATION.md):
    {
        "success": true,
        "task_id": "uuid-string"
    }
    """
    try:
        print("有attack请求进来了")
        # 解析请求
        data = request.get_json()
        print(data)
        if not data:
            return jsonify({'success': False, 'error': '请求体不能为空'}), 400
        
        if 'code_data' not in data:
            return jsonify({'success': False, 'error': '缺少code_data字段'}), 400
        
        # 获取参数（符合API文档格式）
        code_data = data.get('code_data')
        method = data.get('method', 'itgen')  # 攻击方法，默认itgen
        model_name = data.get('model_name', 'codebert').lower()
        task_type = data.get('task_type', 'clone_detection')
        parameters = data.get('parameters', {})
        
        # 创建service实例（用于替代词生成和攻击）
        service = AttackService()
        
        # 设置language（根据task_type或默认为java）
        language = 'java'  # 当前默认支持Java
        
        # 验证code_data
        if 'code1' not in code_data or 'code2' not in code_data:
            return jsonify({
                'success': False,
                'error': 'code_data必须包含code1和code2',
                'details': 'code_data应包含两个代码片段用于克隆检测'
            }), 400
        
        # 验证代码不为空
        if not code_data.get('code1', '').strip() or not code_data.get('code2', '').strip():
            return jsonify({'success': False, 'error': 'code1和code2不能为空'}), 400
        
        # 转换参数格式（保持service层逻辑不变）
        config = {}
        if 'true_label' in parameters:
            config['true_label'] = parameters['true_label']
        if 'max_queries' in parameters:
            # 注意：API文档用的是max_queries，但service层用的是其他参数
            # 我们暂时不转换，保持service层不变
            pass
        if 'timeout' in parameters:
            config['max_time'] = parameters['timeout']
        if 'seed' in parameters:
            config['seed'] = parameters['seed']
        
     
        
        # 使用已创建的service实例获取替代词
        strategy = 'algorithm'
        substitutes = service.get_substitutes_for_code(
            code_data,
            strategy=strategy,
            language=language
        )
        logger.info(f"生成的替换词为: {substitutes}")
        if not substitutes:
            return jsonify({
                'success': False,
                'error': '无法获取替代词',
                'details': '请提供substitutes参数或确保文件中有替代词数据'
            }), 400
        
        logger.info(f"✓ 算法生成了 {len(substitutes)} 个标识符的替代词")
    
        # 将替代词添加到config中
        config['substitutes'] = substitutes
        
        # 生成任务ID
        task_id = str(uuid.uuid4())
        start_time_iso = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime())
        
        logger.info("=" * 60)
        logger.info(f"🎯 [任务 {task_id}] 开始攻击")
        logger.info(f"📦 模型: {model_name}, 方法: {method}")
        logger.info(f"🌐 语言: {language}, 任务类型: {task_type}")
        logger.info(f"📊 真实标签: {config.get('true_label', 1)}")
        logger.info(f"🔤 替代词数量: {len(parameters.get('substitutes', {}))}")
        logger.info("=" * 60)
        
        # 创建任务记录
        task_data = {
            'task_id': task_id,
            'method': method,
            'model_name': model_name,
            'task_type': task_type,
            'status': 'processing',
            'progress': 0,
            'message': '任务已创建，正在处理中',
            'start_time': start_time_iso,
            'end_time': None,
            'result': None,
            'code_data': code_data,
            'config': config,
            'timestamp': time.time()
        }
        
        # 立即返回task_id（符合API文档）
        # 实际执行在后台进行
        task_store[task_id] = task_data
        
        # 检查是否使用脚本执行模式
        use_script = parameters.get('use_script', False)
        
        # 调用服务（同步执行，保持service层逻辑不变）
        try:
            if use_script:
                # 使用脚本执行模式
                logger.info("使用脚本执行模式")
                result = service.execute_script_attack(
                    model_name=model_name,
                    task_type=task_type,
                    attack_method=method,
                    config=parameters
                )
            else:
                # 使用ITGen直接攻击模式
                # service实例已在前面创建
                result = service.attack(
                    code_data=code_data,
                    target_model=model_name,
                    language=language,
                    config=config,
                    method=method
                )
            
            # 更新任务状态
            end_time_iso = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime())
            task_data.update({
                'status': 'completed',
                'progress': 100,
                'message': '任务完成',
                'end_time': end_time_iso,
                'result': {
                    'success': result.get('success', False),
                    'original_code': result.get('original_code'),
                    'adversarial_code': result.get('adversarial_code'),
                    'replaced_words': result.get('replaced_identifiers'),
                    'query_times': result.get('query_times', 0),
                    'time_cost': result.get('time_cost', 0),
                    'method': method,
                    'error': result.get('error')
                }
            })
            
            logger.info(f"✓ [任务 {task_id}] 攻击完成")
            
        except Exception as e:
            logger.error(f"✗ [任务 {task_id}] 攻击失败: {str(e)}", exc_info=True)
            end_time_iso = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime())
            task_data.update({
                'status': 'failed',
                'progress': 0,
                'message': f'任务失败: {str(e)}',
                'end_time': end_time_iso,
                'result': {
                    'success': False,
                    'original_code': code_data.get('code1'),
                    'adversarial_code': None,
                    'replaced_words': None,
                    'query_times': 0,
                    'time_cost': 0,
                    'method': method,
                    'error': str(e)
                }
            })
        
        # 只返回task_id（符合API文档）
        return jsonify({
            'success': True,
            'task_id': task_id
        }), 200
        
    except ValueError as e:
        logger.error(f"参数验证失败: {str(e)}")
        return jsonify({'success': False, 'error': '参数验证失败'}), 400
        
    except Exception as e:
        logger.error(f"攻击失败: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': '服务器内部错误'}), 500

@bp.route('/attack/status/<task_id>', methods=['GET'])
def get_attack_status(task_id):
    """
    获取攻击状态（符合API_DOCUMENTATION.md）
    
    返回格式:
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
                "original_code": "...",
                "adversarial_code": "...",
                "replaced_words": {...},
                "query_times": 150,
                "time_cost": 45.2,
                "method": "itgen"
            }
        }
    }
    """
    try:
        if task_id not in task_store:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
        
        task_data = task_store[task_id]
        
        # 构建符合API文档的响应格式
        status_info = {
            'status': task_data.get('status', 'unknown'),
            'progress': task_data.get('progress', 0),
            'message': task_data.get('message', ''),
            'start_time': task_data.get('start_time'),
            'end_time': task_data.get('end_time'),
            'result': task_data.get('result')
        }
        
        return jsonify({
            'success': True,
            'status': status_info
        }), 200
        
    except Exception as e:
        logger.error(f"获取状态失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/attack/results/<task_id>', methods=['GET'])
def get_attack_results(task_id):
    """
    获取攻击结果（符合API_DOCUMENTATION.md）
    
    返回格式:
    {
        "success": true,
        "result": {
            "success": true,
            "original_code": "...",
            "adversarial_code": "...",
            "replaced_words": {...},
            "query_times": 150,
            "time_cost": 45.2,
            "method": "itgen"
        }
    }
    """
    try:
        if task_id not in task_store:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
        
        task_data = task_store[task_id]
        result = task_data.get('result')
        
        if result is None:
            return jsonify({
                'success': False,
                'error': '结果尚未生成，请稍后再试'
            }), 202  # Accepted但未完成
        
        return jsonify({
            'success': True,
            'result': result
        }), 200
        
    except Exception as e:
        logger.error(f"获取结果失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/attack/history', methods=['GET'])
def get_attack_history():
    """获取攻击历史"""
    try:
        recent_tasks = [
            {
                'task_id': task_id,
                'success': data.get('success', False),
                'time_cost': data.get('time_cost', 0),
                'timestamp': data.get('timestamp', 0)
            }
            for task_id, data in list(task_store.items())[-20:]
        ]
        
        return jsonify({'success': True, 'tasks': recent_tasks}), 200
    except Exception as e:
        logger.error(f"获取历史失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/attack/config', methods=['GET'])
def get_attack_config():
    """获取支持的配置信息"""
    try:
        from app.services.script_execution_service import ScriptExecutionService
        executor = ScriptExecutionService()
        
        return jsonify({
            'success': True,
            'config': {
                'supported_models': executor.get_supported_models(),
                'supported_attacks': executor.get_supported_attacks(),
                'supported_tasks': executor.get_supported_tasks()
            }
        }), 200
    except Exception as e:
        logger.error(f"获取配置失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== 批量攻击脚本接口 ====================

script_task_store = {}

@bp.route('/batch-testing/start', methods=['POST'])
def execute_dataset_attack():
    print("有batch-testing请求进来了")
    """
    对数据集执行批量攻击脚本
    
    请求体:
    {
        "model_name": "codebert",
        "task_type": "clone_detection",
        "attack_method": "itgen",
        "parameters": {
            "eval_data_file": "test_sampled_50.txt",
            "block_size": 512,
            "eval_batch_size": 2,
            "seed": 123456,
            "cuda_device": 0,
            "beam_size": 2,
            "timeout": 3600
        }
    }
    """
    try:
        data = request.get_json()
        print(data)
        if not data:
            return jsonify({
                'success': False,
                'error': '请求体不能为空'
            }), 400
        
        # 获取参数
        model_name = data.get('model_name', 'codebert')
        task_type = data.get('task_type', 'clone_detection')
        attack_method = data.get('attack_method', 'itgen')
        parameters = data.get('parameters', {})
        
        # 生成任务ID
        task_id = str(uuid.uuid4())
        
        logger.info("=" * 60)
        logger.info(f"🎯 [数据集攻击任务 {task_id}]")
        logger.info(f"📦 模型: {model_name}, 任务: {task_type}, 方法: {attack_method}")
        logger.info("=" * 60)
        
        # 构建结果文件路径（用于任务完成后获取结果）
        # 文件名格式与 script_execution_service 中的格式一致
        # 实际格式：{model_name}_{task_type}_{attack_method}_{eval_data_file}.jsonl
        eval_data_file = parameters.get('eval_data_file', '')
        # 注意：实际生成的文件名可能是 clone-detection 格式（带连字符）
        # 但 task_type 传入可能是 clone_detection（下划线），需要兼容处理
        result_file_name = f"{model_name}_{task_type}_{attack_method}_{eval_data_file}.jsonl"
        
        # 创建任务记录
        task_data = {
            'task_id': task_id,
            'model_name': model_name,
            'task_type': task_type,
            'attack_method': attack_method,
            'status': 'running',
            'progress': 0,
            'message': '任务执行中',
            'result': None,
            'result_file': result_file_name  # 保存结果文件名
        }
        
        # 存储任务（在主线程中存储，确保可以被查询到）
        script_task_store[task_id] = task_data
        logger.info(f"✓ 任务已存储到 script_task_store: {task_id}, 当前存储的任务数: {len(script_task_store)}")
        
        # 异步执行脚本（在后台线程中执行）
        import threading
        from flask import has_app_context, current_app
        
        # 在主线程中获取应用实例
        if has_app_context():
            app_instance = current_app._get_current_object()
        else:
            # 如果不在请求上下文中，使用导入的应用实例
            from app import create_app
            app_instance = create_app()
        
        def run_attack():
            # 使用应用实例创建上下文
            with app_instance.app_context():
                try:
                    logger.info(f"开始执行任务 {task_id}")
                    from app.services.script_execution_service import ScriptExecutionService
                    
                    executor = ScriptExecutionService()
                    
                    result = executor.execute_attack_script(
                        model_name=model_name,
                        task_type=task_type,
                        attack_method=attack_method,
                        config=parameters
                    )
                    
                    # 更新任务状态（在原始的 script_task_store 中更新）
                    if task_id in script_task_store:
                        print(task_id+'任务已完成')
                        script_task_store[task_id].update({
                            'status': 'completed' if result.get('success') else 'failed',
                            'state': 'completed' if result.get('success') else 'failed',
                            'progress': 100 if result.get('success') else 0,
                            'message': '任务完成' if result.get('success') else f"任务失败: {result.get('error')}",
                            'result': result
                        })
                        logger.info(f"✓ [任务 {task_id}] 数据集攻击完成" if result.get('success') else f"✗ [任务 {task_id}] 数据集攻击失败")
                    else:
                        logger.warning(f"⚠ 任务 {task_id} 不在 script_task_store 中，无法更新状态")
                except Exception as e:
                    logger.error(f"✗ [任务 {task_id}] 执行异常: {str(e)}", exc_info=True)
                    # 更新任务状态
                    if task_id in script_task_store:
                        script_task_store[task_id].update({
                            'status': 'failed',
                            'message': f'执行异常: {str(e)}',
                            'result': {'success': False, 'error': str(e)}
                        })
                    else:
                        logger.warning(f"⚠ 任务 {task_id} 不在 script_task_store 中，无法更新状态")
        
        # 启动后台线程
        thread = threading.Thread(target=run_attack)
        thread.daemon = True
        thread.start()
        
        logger.info(f"✓ 任务 {task_id} 已提交到后台执行")
        
        # 立即返回task_id
        return jsonify({
            'success': True,
            'task_id': task_id
        }), 200
    
    except Exception as e:
        logger.error(f"数据集攻击失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/batch-testing/status/<task_id>', methods=['GET'])
def get_dataset_attack_status(task_id):
    """获取数据集攻击状态"""
    try:
        logger.info(f"查询任务状态: {task_id}, 当前 script_task_store 中有 {len(script_task_store)} 个任务")
        logger.info(f"任务ID列表: {list(script_task_store.keys())[:5]}")  # 打印前5个任务ID
        
        if task_id not in script_task_store:
            logger.warning(f"任务 {task_id} 不在 script_task_store 中")
            return jsonify({
                'success': False,
                'error': '任务不存在',
                'debug_info': {
                    'task_id': task_id,
                    'available_tasks': len(script_task_store),
                    'sample_task_ids': list(script_task_store.keys())[:3] if script_task_store else []
                }
            }), 404
        
        task_data = script_task_store[task_id]
        
        return jsonify({
            'success': True,
            'status': {
                'task_id': task_data.get('task_id'),
                'model_name': task_data.get('model_name'),
                'task_type': task_data.get('task_type'),
                'attack_method': task_data.get('attack_method'),
                'status': task_data.get('status'),
                'progress': task_data.get('progress'),
                'message': task_data.get('message'),
                'result': task_data.get('result'),
                'result_file': task_data.get('result_file')
            }
        }), 200
    
    except Exception as e:
        logger.error(f"获取状态失败: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/batch-testing/results/<task_id>', methods=['GET'])
def get_batch_testing_result(task_id):
    """获取批量测试任务的结果文件（jsonl格式）"""
    print("有batch-testing/results请求进来了")
    try:
        task_data = None
        result_file_name = None
        
        # 优先从内存中查找任务
        if task_id in script_task_store:
            task_data = script_task_store[task_id]
            # 检查任务是否完成（但不强制要求，允许直接读取文件）
            if task_data.get('status') not in ['completed', 'running', 'failed']:
                logger.warning(f"任务状态异常: {task_data.get('status')}")
            result_file_name = task_data.get('result_file')
        
        # 查找结果文件
        from pathlib import Path
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        
        result_dirs = [
            base_dir / 'result',
            base_dir / 'server' / 'result'
        ]
        
        result_file_path = None
        
        # 策略1: 如果知道文件名，先精确查找
        if result_file_name:
            for result_dir in result_dirs:
                if result_dir.exists():
                    exact_path = result_dir / result_file_name
                    if exact_path.exists():
                        result_file_path = exact_path
                        logger.info(f"通过精确匹配找到结果文件: {result_file_path.name}")
                        break
        
        # 策略2: 如果任务数据存在，使用任务信息进行模式匹配
        if not result_file_path and task_data:
            model_name = task_data.get('model_name', '').lower()
            task_type = task_data.get('task_type', '')
            attack_method = task_data.get('attack_method', '')
            
            patterns = []
            # 尝试下划线格式
            patterns.extend([
                f"{model_name}_{task_type}_{attack_method}*.jsonl",
                f"{model_name}*{task_type}*{attack_method}*.jsonl"
            ])
            # 尝试连字符格式
            if '_' in task_type:
                task_type_hyphen = task_type.replace('_', '-')
                patterns.extend([
                    f"{model_name}_{task_type_hyphen}_{attack_method}*.jsonl",
                    f"{model_name}*{task_type_hyphen}*{attack_method}*.jsonl"
                ])
            
            for result_dir in result_dirs:
                if result_dir.exists():
                    for pattern in patterns:
                        matches = list(result_dir.glob(pattern))
                        if matches:
                            result_file_path = matches[0]
                            logger.info(f"通过模式匹配找到结果文件: {result_file_path.name} (模式: {pattern})")
                            break
                    if result_file_path:
                        break
        
        # 策略3: 如果还是找不到，使用最新的 jsonl 文件（按修改时间）
        if not result_file_path:
            for result_dir in result_dirs:
                if result_dir.exists():
                    jsonl_files = list(result_dir.glob("*.jsonl"))
                    if jsonl_files:
                        # 按修改时间排序，使用最新的
                        jsonl_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                        result_file_path = jsonl_files[0]
                        logger.info(f"使用最新的结果文件: {result_file_path.name}")
                        break
        
        if not result_file_path or not result_file_path.exists():
            available_files = []
            for result_dir in result_dirs:
                if result_dir.exists():
                    available_files.extend([f.name for f in result_dir.glob("*.jsonl")])
            
            return jsonify({
                'success': False,
                'error': f'结果文件不存在',
                'task_id': task_id,
                'expected_file': result_file_name,
                'available_files': available_files[:10]  # 返回前10个文件供参考
            }), 404
        
        # 直接返回文件供下载
        try:
            logger.info(f"返回文件供下载: {result_file_path.name}")
            
            # 使用 send_file 直接返回文件
            return send_file(
                str(result_file_path),
                mimetype='application/json',
                as_attachment=True,
                download_name=result_file_path.name
            )
        except Exception as e:
            logger.error(f"读取结果文件失败: {e}")
            return jsonify({
                'success': False,
                'error': f'读取结果文件失败: {str(e)}'
            }), 500
    
    except Exception as e:
        logger.error(f"获取结果失败: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/attack/dataset/list', methods=['GET'])
def list_dataset_attack_tasks():
    """列出所有数据集攻击任务"""
    try:
        tasks = [
            {
                'task_id': task_id,
                'model_name': data.get('model_name'),
                'task_type': data.get('task_type'),
                'attack_method': data.get('attack_method'),
                'status': data.get('status'),
                'progress': data.get('progress')
            }
            for task_id, data in script_task_store.items()
        ]
        
        return jsonify({
            'success': True,
            'tasks': tasks
        }), 200
    
    except Exception as e:
        logger.error(f"列出任务失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
