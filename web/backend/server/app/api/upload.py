from flask import Blueprint, request, jsonify
import logging
from app.services.upload_service import UploadService

logger = logging.getLogger(__name__)
bp = Blueprint('upload', __name__)

# 初始化上传服务
upload_service = UploadService()

@bp.route('/upload', methods=['POST'])
def upload_file():
    """
    上传文件
    
    请求参数:
        file: 文件（必需）
        file_type: 文件类型 (model, dataset, substitutes, code, other)
        task_type: 任务类型 (用于数据集目录分类)
        model_name: 模型名称 (用于模型文件)
      
    返回格式:
    {
        "success": true,
        "file_type": "dataset",
        "filename": "uuid.ext",
        "original_filename": "original.ext",
        "save_path": "/path/to/file",
        "relative_path": "dataset/Clone-detection/file.ext",
        "file_size": 12345,
        "task_type": "clone_detection"
    }
    """
    try:
        # 检查文件
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有文件'
            }), 400
        
        file = request.files['file']
        file_type = request.form.get('file_type')
        task_type = request.form.get('task_type')
        model_name = request.form.get('model_name')
        # 上传文件
        result = upload_service.upload_file(
            file=file,
            file_type=file_type,
            task_type=task_type,
            model_name=model_name,
         
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"上传文件失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/upload/batch', methods=['POST'])
def upload_batch_files():
    """
    批量上传文件
    
    请求参数:
        files: 文件数组
        file_type: 文件类型
        task_type: 任务类型
    """
    try:
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'error': '没有文件'
            }), 400
        
        files = request.files.getlist('files')
        file_type = request.form.get('file_type')
        task_type = request.form.get('task_type')
        
        # 批量上传
        result = upload_service.upload_batch_files(
            files=files,
            file_type=file_type,
            task_type=task_type
        )
        
        return jsonify(result), 200 if result['success'] else 400
    
    except Exception as e:
        logger.error(f"批量上传失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/upload/<file_type>', methods=['GET'])
def list_files(file_type):
    """
    列出指定类型的文件
    
    查询参数:
        task_type: 任务类型（用于数据集）
    """
    try:
        task_type = request.args.get('task_type')
        
        result = upload_service.list_files(
            file_type=file_type,
            task_type=task_type
        )
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"列出文件失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/upload/all', methods=['GET'])
def list_all_files():
    """列出所有文件"""
    try:
        result = upload_service.list_files()
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"列出所有文件失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/upload', methods=['DELETE'])
def delete_file():
    """
    删除文件
    
    请求参数:
        file_path: 文件路径（相对路径）
    """
    try:
        data = request.get_json()
        if not data or 'file_path' not in data:
            return jsonify({
                'success': False,
                'error': '缺少file_path参数'
            }), 400
        
        result = upload_service.delete_file(data['file_path'])
        
        return jsonify(result), 200 if result['success'] else 400
    
    except Exception as e:
        logger.error(f"删除文件失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/upload/info', methods=['GET'])
def upload_info():
    """获取上传信息"""
    return jsonify({
        'success': True,
        'allowed_file_types': {
            'model': list(upload_service.ALLOWED_EXTENSIONS['model']),
            'dataset': list(upload_service.ALLOWED_EXTENSIONS['dataset']),
            'substitutes': list(upload_service.ALLOWED_EXTENSIONS['substitutes']),
            'code': list(upload_service.ALLOWED_EXTENSIONS['code']),
            'other': list(upload_service.ALLOWED_EXTENSIONS['other'])
        },
        'file_type_dirs': upload_service.FILE_TYPE_DIRS,
        'dataset_subdirs': upload_service.DATASET_SUBDIRS
    }), 200
