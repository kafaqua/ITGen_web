import os
from typing import List, Dict, Any
from datetime import datetime
from app.models.model import ModelInfo
from app.models.db_models import Model as DBModel
from app.models.db_tasks import ModelTask
from app.extensions import db
import logging

logger = logging.getLogger(__name__)

class ModelService:
    """模型服务类"""
    
    def __init__(self):
        """初始化模型服务"""
        self._initialized = False
    
    def _db_model_to_model_info(self, db_model: DBModel) -> ModelInfo:
        """将数据库模型转换为ModelInfo"""
        # 处理支持的任务列表（可能是 JSON 或 列表）
        supported_tasks = []
        if hasattr(db_model, 'supported_tasks') and db_model.supported_tasks:
            if isinstance(db_model.supported_tasks, list):
                supported_tasks = db_model.supported_tasks
            else:
                supported_tasks = []
        
        return ModelInfo(
            id=db_model.id,
            model_name=db_model.model_name,
            model_type=db_model.model_type,
            description=db_model.description,
            model_path=db_model.model_path,
            tokenizer_path=db_model.tokenizer_path,
            max_length=db_model.max_length,
            supported_tasks=supported_tasks,
            status=db_model.status,
            is_predefined=db_model.is_predefined
        )
    
    def get_all_models(self) -> List[ModelInfo]:
        """获取所有模型"""
        db_models = DBModel.query.all()
        return [self._db_model_to_model_info(model) for model in db_models]
    
    def get_model(self, model_id: int) -> ModelInfo:
        """获取指定模型"""
        db_model = DBModel.query.filter_by(id=model_id).first()
        if not db_model:
            raise ValueError(f'模型 {model_id} 不存在')
        return self._db_model_to_model_info(db_model)
    
    def add_model(self, model_info: ModelInfo) -> int:
        """添加模型，返回新创建的模型ID"""
        # 检查是否已存在（通过model_name检查）
        existing_model = DBModel.query.filter_by(model_name=model_info.model_name).first()
        if existing_model:
            raise ValueError(f'模型名称 {model_info.model_name} 已存在')
        
        try:
            # 创建数据库模型（不指定id，由数据库自动生成）
            db_model = DBModel(
                model_name=model_info.model_name,
                model_type=model_info.model_type,
                description=model_info.description,
                model_path=model_info.model_path,
                tokenizer_path=model_info.tokenizer_path,
                max_length=model_info.max_length,
                status='available',
                supported_tasks=model_info.supported_tasks,
                is_predefined=False
            )
            db.session.add(db_model)
            db.session.flush()  # 获取自增ID
            
        
            
            db.session.commit()
            logger.info(f"添加模型: ID={db_model.id}, model_name={model_info.model_name}")
            return db_model.id  # 返回自增ID
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"添加模型失败: {str(e)}")
    
    def delete_model(self, model_id: int) -> bool:
        """删除模型"""
        db_model = DBModel.query.filter_by(id=model_id).first()
        if not db_model:
            return False
        
        if db_model.is_predefined:
            raise ValueError('不能删除预定义模型')
        
        try:
            # 删除模型
            db.session.delete(db_model)
            db.session.commit()
            logger.info(f"删除模型: {model_id}")
            return True
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"删除模型失败: {str(e)}")
    
    def test_model(self, model_id: int, task_type: str, code1: str, code2: str) -> Dict[str, Any]:
        """测试模型"""
        db_model = DBModel.query.filter_by(id=model_id).first()
        if not db_model:
            raise ValueError(f'模型 {model_id} 不存在')
        
        # 这里应该调用实际的模型推理
        # 暂时返回模拟结果
        return {
            'model_id': model_id,
            'task_type': task_type,
            'prediction': 0,  # 0: not clone, 1: clone
            'confidence': 0.85,
            'note': '这是测试结果'
        }
