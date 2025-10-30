import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)

class UploadService:
    """文件上传服务"""
    
    # 文件类型到目录的映射
    FILE_TYPE_DIRS = {
        'model': 'models',
        'dataset': 'dataset',
        'substitutes': 'dataset/preprocess',
        'code': 'uploads',
        'other': 'uploads'
    }
    
    # 支持的文件扩展名
    ALLOWED_EXTENSIONS = {
        'model': {'bin', 'pth', 'pt', 'onnx', 'ckpt'},
        'dataset': {'txt', 'json', 'jsonl', 'csv', 'pkl'},
        'substitutes': {'json', 'jsonl'},
        'code': {'java', 'py', 'c', 'cpp', 'js', 'ts'},
        'other': {'txt', 'json', 'csv', 'log'}
    }
    
    # 数据集子目录映射（根据任务类型）
    DATASET_SUBDIRS = {
        'clone_detection': 'Clone-detection',
        'vulnerability_detection': 'Vulnerability-detection',
        'vulnerability_prediction': 'Vulnerability-prediction',
        'code_summarization': 'Code-summarization',
        'authorship_attribution': 'Authorship-attribution'
    }
    
    def __init__(self, base_dir: Optional[Path] = None):
        """
        初始化上传服务
        
        Args:
            base_dir: 基础目录，默认为项目根目录
        """
        if base_dir is None:
            self.base_dir = Path(__file__).resolve().parent.parent.parent.parent
        else:
            self.base_dir = base_dir
    
    def _get_file_type(self, filename: str) -> str:
        """
        根据文件名推断文件类型
        
        Args:
            filename: 文件名
            
        Returns:
            文件类型 ('model', 'dataset', 'substitutes', 'code', 'other')
        """
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        
        # 模型文件
        if ext in self.ALLOWED_EXTENSIONS['model']:
            return 'model'
        
        # 替代词文件
        if 'sub' in filename.lower() or 'substitute' in filename.lower():
            return 'substitutes'
        
        # 代码文件
        if ext in self.ALLOWED_EXTENSIONS['code']:
            return 'code'
        
        # 数据集文件
        if ext in self.ALLOWED_EXTENSIONS['dataset']:
            return 'dataset'
        
        # 其他
        return 'other'
    
    def _get_save_path(
        self,
        file_type: str,
        filename: str,
        task_type: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> Path:
        """
        获取文件保存路径
        
        Args:
            file_type: 文件类型
            filename: 文件名
            task_type: 任务类型（用于数据集子目录）
            model_name: 模型名称（用于模型文件）
            
        Returns:
            保存路径
        """
        # 获取基础目录
        base_dir = self.base_dir / self.FILE_TYPE_DIRS.get(file_type, 'uploads')
        
        # 根据文件类型构建子目录
        if file_type == 'dataset' and task_type:
            # 数据集根据任务类型分目录
            subdir = self.DATASET_SUBDIRS.get(task_type, 'Clone-detection')
            base_dir = base_dir / subdir
        elif file_type == 'model' and model_name:
            # 模型文件放入saved_models/checkpoint-best-f1/
            base_dir = self.base_dir / 'saved_models' / 'checkpoint-best-f1'
        
        # 创建目录
        base_dir.mkdir(parents=True, exist_ok=True)
        
        return base_dir / filename
    
    def upload_file(
        self,
        file: FileStorage,
        file_type: Optional[str] = None,
        task_type: Optional[str] = None,
        model_name: Optional[str] = None,
        keep_original_name: bool = False
    ) -> Dict[str, Any]:
        """
        上传文件
        
        Args:
            file: Flask文件对象
            file_type: 文件类型（如果为None则自动推断）
            task_type: 任务类型（用于数据集Schema定位）
            model_name: 模型名称（用于模型文件）
            keep_original_name: 是否保持原始文件名
            
        Returns:
            上传结果字典
        """
        try:
            # 检查文件
            if not file or not file.filename:
                return {
                    'success': False,
                    'error': '没有文件或文件名为空'
                }
            
            # 确定文件类型
            if file_type is None:
                file_type = self._get_file_type(file.filename)
            
            # 检查文件扩展名
            if file_type not in self.ALLOWED_EXTENSIONS:
                return {
                    'success': False,
                    'error': f'不支持的文件类型: {file_type}'
                }
            
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            if ext not in self.ALLOWED_EXTENSIONS[file_type]:
                return {
                    'success': False,
                    'error': f'文件类型 {file_type} 不支持扩展名 .{ext}'
                }
            
            filename = secure_filename(file.filename)
           
            
            # 获取保存路径
            save_path = self._get_save_path(file_type, filename, task_type, model_name)
            
            # 保存文件
            file.save(str(save_path))
            
            # 获取文件大小
            file_size = os.path.getsize(save_path)
            
            logger.info(f"✓ 文件上传成功: {save_path} ({file_size} bytes)")
            
            return {
                'success': True,
                'file_type': file_type,
                'filename': filename,
                'original_filename': file.filename,
                'save_path': str(save_path),
                'relative_path': str(save_path.relative_to(self.base_dir)),
                'file_size': file_size,
                'task_type': task_type
            }
        
        except Exception as e:
            logger.error(f"✗ 文件上传失败: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_batch_files(
        self,
        files: list,
        file_type: Optional[str] = None,
        task_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        批量上传文件
        
        Args:
            files: 文件对象列表
            file_type: 文件类型
            task_type: 任务类型
            
        Returns:
            上传结果字典（包含成功和失败的文件）
        """
        results = {
            'success': True,
            'total': len(files),
            'succeeded': 0,
            'failed': 0,
            'files': []
        }
        
        for file in files:
            result = self.upload_file(file, file_type, task_type)
            
            if result['success']:
                results['succeeded'] += 1
            else:
                results['failed'] += 1
                results['success'] = False
            
            results['files'].append(result)
        
        return results
    
    def delete_file(self, file_path: str) -> Dict[str, Any]:
        """
        删除文件
        
        Args:
            file_path: 文件路径（相对或绝对路径）
            
        Returns:
            删除结果字典
        """
        try:
            # 如果是相对路径，转换为绝对路径
            if not Path(file_path).is_absolute():
                file_path = self.base_dir / file_path
            
            file_path = Path(file_path)
            
            # 安全检查：确保文件在项目目录内
            if not str(file_path).startswith(str(self.base_dir)):
                return {
                    'success': False,
                    'error': '禁止删除项目外的文件'
                }
            
            if not file_path.exists():
                return {
                    'success': False,
                    'error': '文件不存在'
                }
            
            # 删除文件
            file_path.unlink()
            
            logger.info(f"✓ 文件删除成功: {file_path}")
            
            return {
                'success': True,
                'file_path': str(file_path)
            }
        
        except Exception as e:
            logger.error(f"✗ 文件删除失败: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_files(
        self,
        file_type: Optional[str] = None,
        task_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        列出文件
        
        Args:
            file_type: 文件类型（可选）
            task_type: 任务类型（用于数据集）
            
        Returns:
            文件列表
        """
        try:
            if file_type is None:
                # 列出所有类型
                all_files = []
                for ft, _ in self.FILE_TYPE_DIRS.items():
                    dir_path = self.base_dir / self.FILE_TYPE_DIRS[ft]
                    if dir_path.exists():
                        for file in dir_path.rglob('*'):
                            if file.is_file():
                                all_files.append({
                                    'filename': file.name,
                                    'file_type': ft,
                                    'path': str(file.relative_to(self.base_dir)),
                                    'size': file.stat().st_size
                                })
                return {'success': True, 'files': all_files}
            else:
                # 列出指定类型
                dir_path = self.base_dir / self.FILE_TYPE_DIRS.get(file_type, 'uploads')
                
                if file_type == 'dataset' and task_type:
                    subdir = self.DATASET_SUBDIRS.get(task_type, 'Clone-detection')
                    dir_path = dir_path / subdir
                
                if not dir_path.exists():
                    return {'success': True, 'files': []}
                
                files = []
                for file in dir_path.glob('*'):
                    if file.is_file():
                        files.append({
                            'filename': file.name,
                            'file_type': file_type,
                            'path': str(file.relative_to(self.base_dir)),
                            'size': file.stat().st_size
                        })
                
                return {'success': True, 'files': files}
        
        except Exception as e:
            logger.error(f"✗ 列出文件失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

