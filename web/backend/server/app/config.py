import os
from pathlib import Path

class Config:
    """应用配置"""
    
    # Flask基础配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 模型路径配置
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    MODEL_PATH = BASE_DIR / 'CodeBERT_adv' / 'Clone-detection' / 'saved_models'
    MODEL_NAME = 'codebert'
    
    # CUDA配置
    CUDA_DEVICE = os.environ.get('CUDA_DEVICE', 'cuda:0')
    
    # 攻击参数配置
    DEFAULT_MAX_ITERATIONS = 100
    DEFAULT_QUERY_BUDGET = 500
    DEFAULT_BATCH_SIZE = 4
    
    # 上传文件配置
    UPLOAD_FOLDER = BASE_DIR / 'app' / 'static' / 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # Redis配置（用于Celery任务队列）
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    # MySQL数据库配置
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = os.environ.get('MYSQL_PORT', '3306')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '20040619yl...')
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'itgen_db')
    
    # 数据库配置
    # 注意：如果使用 sha256_password 或 caching_sha2_password，需要安装 cryptography 包
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 10,
        'max_overflow': 20
    }

