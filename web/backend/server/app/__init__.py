from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from app.config import Config
from app.utils.logger import setup_logger
from app.extensions import db

# 初始化扩展
cors = CORS()

def create_app(config_class=Config):
    """Flask应用工厂"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 初始化CORS
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    
    # 初始化数据库
    db.init_app(app)
    
    # 创建数据库表
    with app.app_context():
        try:
            from app.models.db_models import Model
            from app.models.db_tasks import ModelTask, Task
            from app.models.db_evaluation import EvaluationReport
            db.create_all()
        except Exception as e:
            # 忽略数据库连接警告（如果数据库尚未设置）
            if 'HY000' not in str(e):
                pass
    
    # 配置日志
    setup_logger(app)
    
    # 注册蓝图
    from app.api.health import bp as health_bp
    app.register_blueprint(health_bp, url_prefix='/api')
    
    from app.api.models import bp as models_bp
    app.register_blueprint(models_bp, url_prefix='/api')
    
    from app.api.attack import bp as attack_bp
    app.register_blueprint(attack_bp, url_prefix='/api')
    
    from app.api.evaluation import bp as evaluation_bp
    app.register_blueprint(evaluation_bp, url_prefix='/api')
    
    from app.api.finetuning import bp as finetuning_bp
    app.register_blueprint(finetuning_bp, url_prefix='/api')
    
    from app.api.upload import bp as upload_bp
    app.register_blueprint(upload_bp, url_prefix='/api')
    
    from app.api.tasks import bp as tasks_bp
    app.register_blueprint(tasks_bp, url_prefix='/api')
    
    # 初始化SocketIO（在蓝图注册后）
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    
    # 将socketio附加到app上以便访问
    app.socketio = socketio
    
    return app

# 导出
__all__ = ['create_app']
