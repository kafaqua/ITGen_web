"""任务服务"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from app.models.db_tasks import Task
from app.extensions import db
import logging

logger = logging.getLogger(__name__)

class TaskService:
    """任务服务类"""
    
    @staticmethod
    def create_task(task_id: str, task_type: str, model_id: Optional[str] = None, parameters: Optional[Dict] = None) -> Task:
        """创建新任务"""
        try:
            task = Task(
                id=task_id,
                task_type=task_type,
                model_id=model_id,
                status='pending',
                progress=0.0,
                parameters=parameters,
                created_at=datetime.utcnow()
            )
            db.session.add(task)
            db.session.commit()
            logger.info(f"创建任务: {task_id} ({task_type})")
            return task
        except Exception as e:
            db.session.rollback()
            logger.error(f"创建任务失败: {str(e)}")
            raise
    
    @staticmethod
    def get_task(task_id: str) -> Optional[Task]:
        """获取任务"""
        return Task.query.filter_by(id=task_id).first()
    
    @staticmethod
    def update_task_status(task_id: str, status: str, progress: float = None, result: Dict = None, error_message: str = None):
        """更新任务状态"""
        task = Task.query.filter_by(id=task_id).first()
        if not task:
            raise ValueError(f'任务 {task_id} 不存在')
        
        try:
            task.status = status
            if progress is not None:
                task.progress = progress
            if result is not None:
                task.result = result
            if error_message is not None:
                task.error_message = error_message
            
            # 更新时间
            if status == 'running' and not task.started_at:
                task.started_at = datetime.utcnow()
            elif status in ['completed', 'failed']:
                task.completed_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"更新任务状态: {task_id} -> {status}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"更新任务状态失败: {str(e)}")
            raise
    
    @staticmethod
    def get_all_tasks(task_type: Optional[str] = None) -> List[Task]:
        """获取所有任务"""
        query = Task.query
        if task_type:
            query = query.filter_by(task_type=task_type)
        return query.order_by(Task.created_at.desc()).all()
    
    @staticmethod
    def delete_task(task_id: str) -> bool:
        """删除任务"""
        task = Task.query.filter_by(id=task_id).first()
        if not task:
            return False
        
        try:
            db.session.delete(task)
            db.session.commit()
            logger.info(f"删除任务: {task_id}")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"删除任务失败: {str(e)}")
            raise

