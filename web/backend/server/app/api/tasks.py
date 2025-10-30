from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)
bp = Blueprint('tasks', __name__)

# 导入所有任务存储
from app.api import attack as attack_module
from app.api import evaluation as evaluation_module
from app.api import finetuning as finetuning_module


# 任务存储集合
task_stores = {
    'attack': attack_module.task_store,
    'evaluation': evaluation_module.task_store,
    'finetuning': finetuning_module.task_store,
}

@bp.route('/tasks/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """获取任务状态"""
    try:
        # 在所有任务存储中查找
        for task_type, store in task_stores.items():
            if task_id in store:
                task_info = store[task_id]
                return jsonify({
                    'success': True,
                    'task_type': task_type,
                    'status': task_info
                }), 200
        
        return jsonify({
            'success': False,
            'error': '任务不存在'
        }), 404
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/tasks', methods=['GET'])
def get_all_tasks():
    """获取所有任务"""
    try:
        all_tasks = {}
        
        for task_type, store in task_stores.items():
            for task_id, task_info in store.items():
                all_tasks[task_id] = {
                    'task_type': task_type,
                    'task_info': task_info
                }
        
        return jsonify({
            'success': True,
            'total': len(all_tasks),
            'tasks': all_tasks
        }), 200
    except Exception as e:
        logger.error(f"获取所有任务失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

