"""任务数据库模型定义"""
from datetime import datetime
from typing import Dict, Any
from app.extensions import db


class ModelTask(db.Model):
    """模型-任务关联表"""
    __tablename__ = 'model_tasks'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True, comment='自增ID')
    model_id = db.Column(db.Integer, db.ForeignKey('models.id'), nullable=False, comment='模型ID')
    task_type = db.Column(db.String(100), nullable=False, comment='任务类型')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'model_id': self.model_id,
            'task_type': self.task_type
        }
    
    def __repr__(self):
        return f'<ModelTask {self.model_id}: {self.task_type}>'


class Task(db.Model):
    """任务表"""
    __tablename__ = 'tasks'
    
    id = db.Column(db.String(100), primary_key=True, comment='任务ID')
    task_type = db.Column(db.String(100), nullable=False, comment='任务类型: attack/evaluation/finetuning/batch_testing')
    model_id = db.Column(db.Integer, db.ForeignKey('models.id'), nullable=True, comment='使用的模型ID')
    status = db.Column(db.String(50), default='pending', comment='任务状态: pending/running/completed/failed')
    progress = db.Column(db.Float, default=0.0, comment='进度(0-100)')
    result = db.Column(db.JSON, comment='任务结果')
    error_message = db.Column(db.Text, comment='错误信息')
    parameters = db.Column(db.JSON, comment='任务参数')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    started_at = db.Column(db.DateTime, comment='开始时间')
    completed_at = db.Column(db.DateTime, comment='完成时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_type': self.task_type,
            'model_id': self.model_id,
            'status': self.status,
            'progress': self.progress,
            'result': self.result,
            'error_message': self.error_message,
            'parameters': self.parameters,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def __repr__(self):
        return f'<Task {self.id}: {self.task_type} ({self.status})>'

