"""微调任务数据库模型定义"""
from datetime import datetime
from typing import Dict, Any
from app.extensions import db


class FinetuningTask(db.Model):
    """微调任务表"""
    __tablename__ = 'finetuning_tasks'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True, comment='任务ID（自增）')
    task_id = db.Column(db.String(200), unique=True, nullable=False, comment='任务ID（唯一标识）')
    model_name = db.Column(db.String(200), nullable=False, comment='模型名称')
    task_type = db.Column(db.String(100), nullable=False, comment='任务类型')
    dataset = db.Column(db.String(200), nullable=False, comment='数据集名称')
    attack_method = db.Column(db.String(100), nullable=False, comment='攻击方法')
    
    # 微调参数
    parameters = db.Column(db.JSON, comment='微调参数（learning_rate, epochs, batch_size）')
    
    # 任务状态
    status = db.Column(db.String(50), default='pending', comment='任务状态（pending/running/completed/failed）')
    progress = db.Column(db.Integer, default=0, comment='进度（0-100）')
    message = db.Column(db.String(500), comment='状态消息')
    
    # 微调结果
    old_metrics = db.Column(db.JSON, comment='微调前的指标')
    new_metrics = db.Column(db.JSON, comment='微调后的指标')
    comparison = db.Column(db.JSON, comment='指标对比')
    training_samples = db.Column(db.Integer, default=0, comment='训练样本数')
    
    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    started_at = db.Column(db.DateTime, comment='开始时间')
    completed_at = db.Column(db.DateTime, comment='完成时间')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'model_name': self.model_name,
            'task_type': self.task_type,
            'dataset': self.dataset,
            'attack_method': self.attack_method,
            'parameters': self.parameters,
            'status': self.status,
            'progress': self.progress,
            'message': self.message,
            'old_metrics': self.old_metrics,
            'new_metrics': self.new_metrics,
            'comparison': self.comparison,
            'training_samples': self.training_samples,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def __repr__(self):
        return f'<FinetuningTask {self.task_id}: {self.model_name} ({self.task_type})>'

