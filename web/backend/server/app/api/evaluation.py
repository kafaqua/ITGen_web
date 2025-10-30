from flask import Blueprint, request, jsonify
from app.services.evaluation_service import EvaluationService
import uuid
import logging

logger = logging.getLogger(__name__)
bp = Blueprint('evaluation', __name__)

evaluation_service = EvaluationService()
task_store = {}

# 导出task_store供其他模块使用
__all__ = ['bp', 'task_store']

@bp.route('/evaluation/start', methods=['POST'])
def start_evaluation():
    """开始鲁棒性评估"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求体不能为空'}), 400
        
        task_id = str(uuid.uuid4())
        
        # 启动评估任务（异步）
        model_name = data.get('model_name')
        task_type = data.get('task_type')
        attack_methods = data.get('attack_methods', ['itgen'])
        evaluation_metrics = data.get('evaluation_metrics', ['asr', 'ami', 'art'])
        
        # 存储任务信息
        task_store[task_id] = {
            'task_id': task_id,
            'model_name': model_name,
            'task_type': task_type,
            'status': 'processing',
            'progress': 0
        }
        
        # 执行评估
        result = evaluation_service.generate_report_from_results(
            model_name=model_name,
            task_type=task_type,
            attack_methods=attack_methods,
            evaluation_metrics=evaluation_metrics
        )
        
        # 更新任务状态
        task_store[task_id].update({
            'status': 'completed',
            'progress': 100,
            'result': result
        })
        
        return jsonify({
            'success': True,
            'task_id': task_id
        }), 200
        
    except Exception as e:
        logger.error(f"评估失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/evaluation/reports', methods=['GET'])
def get_evaluation_reports():
    """获取评估报告列表"""
    try:
        reports = evaluation_service.get_all_reports()
        return jsonify({
            'success': True,
            'data': reports  # reports 已经是字典列表
        }), 200
    except Exception as e:
        logger.error(f"获取报告列表失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/evaluation/results/<report_id>', methods=['GET'])
def get_evaluation_report(report_id):
    """获取特定评估报告"""
    try:
        report = evaluation_service.get_report(report_id)
        if report:
            return jsonify({
                'success': True,
                'data': report
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '报告不存在'
            }), 404
    except Exception as e:
        logger.error(f"获取报告失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/evaluation/status/<task_id>', methods=['GET'])
def get_evaluation_status(task_id):
    """获取评估任务状态"""
    try:
        # 从内存获取任务状态
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

@bp.route('/evaluation/generate-report', methods=['POST'])
def generate_report():
    """从批量攻击结果生成鲁棒性评估报告"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求体不能为空'}), 400
        
        # 获取必需参数
        model_name = data.get('model_name')
        task_type = data.get('task_type')
        attack_methods = data.get('attack_methods', ['itgen','alert'])
        evaluation_metrics = data.get('evaluation_metrics', ['asr', 'ami', 'art'])
        
        # 参数验证
        if not model_name:
            return jsonify({'success': False, 'error': '缺少model_name参数'}), 400
        if not task_type:
            return jsonify({'success': False, 'error': '缺少task_type参数'}), 400
        if not isinstance(attack_methods, list) or len(attack_methods) == 0:
            return jsonify({'success': False, 'error': 'attack_methods必须是非空列表'}), 400
        
        logger.info(f"为模型 {model_name} 的任务 {task_type} 生成评估报告...")
        logger.info(f"攻击方法: {attack_methods}, 评估指标: {evaluation_metrics}")
        
        result = evaluation_service.generate_report_from_results(
            model_name=model_name,
            task_type=task_type,
            attack_methods=attack_methods,
            evaluation_metrics=evaluation_metrics
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'report_id': result['report_id'],
                'report': result['report']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
            
    except Exception as e:
        logger.error(f"生成报告失败: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

