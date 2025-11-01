from flask import Blueprint, request, jsonify
from app.models.model import ModelInfo, ModelListResponse
from app.services.model_service import ModelService
import logging

logger = logging.getLogger(__name__)
bp = Blueprint('models', __name__)

# 初始化模型服务
model_service = ModelService()

@bp.route('/models', methods=['GET'])
def get_models():
    """获取模型列表"""
    print("有请求进来了/models接口")
    try:
        models = model_service.get_all_models()
        return jsonify({
            'success': True,
            'data': [model.model_dump() for model in models]
        }), 200
    except Exception as e:
        logger.error(f"获取模型列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/models/<model_id>', methods=['GET'])
def get_model(model_id):
    """获取模型列表"""
    try:
        model = model_service.get_model(model_id)
        return jsonify({
            'success': True,
            'data': [model.model_dump()]
        }), 200
    except Exception as e:
        logger.error(f"获取模型列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/models', methods=['POST'])
def add_model():
    """添加新模型"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求体不能为空'}), 400
        
        model_info = ModelInfo(**data)
        model_id = model_service.add_model(model_info)
        
        return jsonify({
            'success': True,
            'message': '模型添加成功',
            'model_id': model_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logger.error(f"添加模型失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/models/<int:model_id>', methods=['DELETE'])
def delete_model(model_id):
    """删除模型"""
    try:
        success = model_service.delete_model(model_id)
        if success:
            return jsonify({
                'success': True,
                'message': '模型删除成功'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '模型不存在'
            }), 404
    except Exception as e:
        logger.error(f"删除模型失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/models/<int:model_id>/test', methods=['POST'])
def test_model(model_id):
    """测试模型"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求体不能为空'}), 400
        
        task_type = data.get('task_type')
        code1 = data.get('code1')
        code2 = data.get('code2')
        
        # 执行模型测试
        result = model_service.test_model(model_id, task_type, code1, code2)
        
        return jsonify({
            'success': True,
            'result': result
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logger.error(f"测试模型失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

