from flask import Blueprint, request, jsonify
from app.services.finetuning_service import FinetuningService
from app.models.db_finetuning import FinetuningTask
from app.extensions import db
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
bp = Blueprint('finetuning', __name__)

finetuning_service = FinetuningService()
task_store = {}

# 导出task_store供其他模块使用
__all__ = ['bp', 'task_store']

@bp.route('/finetuning/start', methods=['POST'])
def start_finetuning():
    """开始对抗性微调"""
    print("有finetuning/start请求进来了")
    try:
        data = request.get_json()
        print(data)
        if not data:
            return jsonify({'success': False, 'error': '请求体不能为空'}), 400
        
        # 从请求中获取参数
        model_name = data.get('model_name')
        task_type = data.get('task_type')
        dataset = data.get('dataset')
        attack_methods = data.get('attack_methods', ['itgen', 'alert'])
        parameters = data.get('parameters', {
            'learning_rate': 2e-5,
            'epochs': 3,
            'batch_size': 16
        })
        
        # 验证必填参数
        if not model_name or not task_type or not dataset:
            return jsonify({
                'success': False,
                'error': '缺少必填参数: model_name, task_type, dataset'
            }), 400
        
        task_id = str(uuid.uuid4())
        
        # 创建数据库记录
        try:
            finetuning_task = FinetuningTask(
                task_id=task_id,
                model_name=model_name,
                task_type=task_type,
                dataset=dataset,
                attack_method=','.join(attack_methods),
                parameters=parameters,
                status='running',
                progress=0,
                message='开始微调任务',
                started_at=datetime.utcnow()
            )
            db.session.add(finetuning_task)
            db.session.commit()
            logger.info(f"创建微调任务: {task_id}")
        except Exception as e:
            logger.error(f"创建数据库记录失败: {e}")
            db.session.rollback()
        
        # 存储任务信息到内存
        task_store[task_id] = {
            'task_id': task_id,
            'model_name': model_name,
            'task_type': task_type,
            'status': 'running',
            'progress': 0,
            'message': '开始执行微调'
        }
        
        # 执行微调
        result = finetuning_service.start_finetuning(
            model_name=model_name,
            task_type=task_type,
            dataset=dataset,
            attack_methods=attack_methods,
            parameters=parameters
        )
        
        # 更新任务状态
        task_status = 'completed' if result.get('success') else 'failed'
        task_store[task_id].update({
            'status': task_status,
            'progress': 100,
            'result': result,
            'message': '微调任务完成' if result.get('success') else result.get('error', '微调失败')
        })
        
        # 更新数据库记录
        try:
            finetuning_task = FinetuningTask.query.filter_by(task_id=task_id).first()
            if finetuning_task:
                finetuning_task.status = task_status
                finetuning_task.progress = 100
                finetuning_task.message = task_store[task_id]['message']
                finetuning_task.completed_at = datetime.utcnow()
                
                if result.get('success'):
                    finetuning_task.training_samples = result.get('training_samples', 0)
                    finetuning_task.old_metrics = result.get('old_metrics', {})
                    finetuning_task.new_metrics = result.get('new_metrics', {})
                    finetuning_task.comparison = result.get('comparison', {})
                
                db.session.commit()
        except Exception as e:
            logger.error(f"更新数据库记录失败: {e}")
            db.session.rollback()
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'status': task_status
        }), 200
        
    except Exception as e:
        logger.error(f"微调失败: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/finetuning/status/<task_id>', methods=['GET'])
def get_finetuning_status(task_id):
    """获取微调状态"""
    try:
        # 优先从数据库获取
        try:
            finetuning_task = FinetuningTask.query.filter_by(task_id=task_id).first()
            if finetuning_task:
                return jsonify({
                    'success': True,
                    'status': finetuning_task.to_dict()
                }), 200
        except Exception as e:
            logger.warning(f"从数据库获取任务状态失败: {e}")
        
        # 从内存获取
        if task_id not in task_store:
            return jsonify({
                'success': False,
                'error': '任务不存在'
            }), 404
        
        task_info = task_store[task_id]
        return jsonify({
            'success': True,
            'status': task_info
        }), 200
        
    except Exception as e:
        logger.error(f"获取状态失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/finetuning/results/<task_id>', methods=['GET'])
def get_finetuning_result(task_id):
    """获取微调结果"""
    try:
        # 优先从数据库获取
        try:
            finetuning_task = FinetuningTask.query.filter_by(task_id=task_id).first()
            if finetuning_task:
                # 构建结果数据
                result_data = {
                    'task_id': finetuning_task.task_id,
                    'model_name': finetuning_task.model_name,
                    'task_type': finetuning_task.task_type,
                    'dataset': finetuning_task.dataset,
                    'attack_method': finetuning_task.attack_method,
                    'status': finetuning_task.status,
                    'training_samples': finetuning_task.training_samples,
                    'old_metrics': finetuning_task.old_metrics,
                    'new_metrics': finetuning_task.new_metrics,
                    'comparison': finetuning_task.comparison,
                    'parameters': finetuning_task.parameters,
                    'started_at': finetuning_task.started_at.isoformat() if finetuning_task.started_at else None,
                    'completed_at': finetuning_task.completed_at.isoformat() if finetuning_task.completed_at else None,
                    'created_at': finetuning_task.created_at.isoformat() if finetuning_task.created_at else None
                }
                return jsonify({
                    'success': True,
                    'result': result_data
                }), 200
        except Exception as e:
            logger.warning(f"从数据库获取微调结果失败: {e}")
        
        # 从内存获取
        if task_id not in task_store:
            return jsonify({
                'success': False,
                'error': '任务不存在'
            }), 404
        
        task_info = task_store[task_id]
        # 从内存中提取结果数据
        result_data = {
            'task_id': task_info.get('task_id'),
            'model_name': task_info.get('model_name'),
            'task_type': task_info.get('task_type'),
            'status': task_info.get('status'),
        }
        
        # 如果存在result字段，提取详细结果
        if 'result' in task_info:
            result = task_info['result']
            result_data.update({
                'training_samples': result.get('training_samples'),
                'old_metrics': result.get('old_metrics'),
                'new_metrics': result.get('new_metrics'),
                'comparison': result.get('comparison'),
                'improvement_ratio': result.get('improvement_ratio')
            })
        
        return jsonify({
            'success': True,
            'result': result_data
        }), 200
        
    except Exception as e:
        logger.error(f"获取微调结果失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

