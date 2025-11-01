import os
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from app.models.db_models import Model as DBModel
from flask import has_app_context
from app.extensions import db

logger = logging.getLogger(__name__)


class ScriptExecutionService:
    """脚本执行服务 - 用于调用后台攻击脚本"""
    
    # 模型配置映射
    MODEL_CONFIGS = {
        'codebert': {
            'model_type': 'roberta',
            'model_name': 'codebert',
            'model_path': 'microsoft/codebert-base',
            'base_model': 'microsoft/codebert-base-mlm',
            'tokenizer_path': 'microsoft/codebert-base'
        },
        'codegpt': {
            'model_type': 'gpt2',
            'model_name': 'microsoft/CodeGPT-small-java-adaptedGPT2',
            'base_model': 'microsoft/codebert-base-mlm'
        },
        'codet5': {
            'model_type': 'codet5',
            'model_name': 'Salesforce/codet5-base-multi-sum',
            'base_model': 'microsoft/codebert-base-mlm'
        },
        'graphcodebert': {
            'model_type': 'roberta',
            'model_name': 'microsoft/graphcodebert-base',
            'base_model': 'microsoft/codebert-base-mlm'
        }
    }
    
    # 攻击方法映射
    ATTACK_METHODS = {
        'itgen': {
            'script': 'attack_itgen.py',
            'params': []
        },
        'beam': {
            'script': 'attack_beam.py',
            'params': ['beam_size']
        },
        'alert': {
            'script': 'attack_alert.py',
            'params': []
        },
        'mhm': {
            'script': 'attack_mhm.py',
            'params': []
        },
        'wir': {
            'script': 'attack_wir.py',
            'params': []
        },
        'rnns': {
            'script': 'attack_rnns.py',
            'params': []
        },
        'bayes': {
            'script': 'attack_bayes.py',
            'params': []
        },
        'style': {
            'script': 'attack_style.py',
            'params': []
        }
    }
    
    # 任务类型映射到目录结构
    TASK_DIRS = {
        'clone-detection': 'clone-detection',
        'vulnerability-detection': 'Vulnerability-detection',
        'vulnerability-prediction': 'Vulnerability-prediction',
        'code-summarization': 'Code-summarization',
        'authorship-attribution': 'Authorship-attribution'
    }
    
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent.parent.parent
    
    def _get_model_config_from_db(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        从数据库获取模型配置
        
        Args:
            model_name: 模型名称
            
        Returns:
            模型配置字典，如果不存在则返回None
        """
        try:
            db_model = DBModel.query.filter_by(model_name=model_name, status='available').first()
            if db_model:
                return {
                    'model_type': db_model.model_type,
                    'model_name': db_model.model_name,
                    'model_path': db_model.model_path,  # 数据库中的model_path
                    'tokenizer_path': db_model.tokenizer_path,
                    'base_model': 'microsoft/codebert-base-mlm'  # 默认使用microsoft/codebert-base-mlm
                }
        except Exception as e:
            logger.warning(f"从数据库获取模型配置失败: {e}")
        return None
    
    def get_attack_script_path(self, model_name: str, task_type: str, attack_method: str) -> Path:
        """
        获取攻击脚本路径
        
        Args:
            model_name: 模型名称 (codebert, codegpt, codet5, graphcodebert)
            task_type: 任务类型 (Clone-detection, vulnerability_detection, etc.)
            attack_method: 攻击方法 (itgen, beam, alert, etc.)
        
        Returns:
            脚本文件路径
        """
        # 模型目录映射
        model_dirs = {
            'codebert': 'CodeBERT',
            'codegpt': 'CodeGPT',
            'codet5': 'CodeT5',
            'graphcodebert': 'GraphCodeBERT',
            'codebert_adv': 'CodeBERT_adv'
        }
        
        # 获取任务目录
        task_dir = self.TASK_DIRS.get(task_type, 'clone-detection')
 
        model_dir = model_dirs.get(model_name, 'CodeBERT')
        script_path = self.base_dir / model_dir / task_dir / 'attack' / self.ATTACK_METHODS[attack_method]['script']
        
        return script_path
    
    def build_command(
        self,
        model_name: str,
        task_type: str,
        attack_method: str,
        config: Dict[str, Any]
    ) -> str:
        """
        构建命令行命令
        
        Args:
            model_name: 模型名称
            task_type: 任务类型
            attack_method: 攻击方法
            config: 配置参数字典
        
        Returns:
            完整的命令行字符串
        """
        # 优先从数据库获取模型配置
        model_config = self._get_model_config_from_db(model_name)
        
        # 如果数据库中没有，使用默认配置
        if model_config is None:
            model_config = self.MODEL_CONFIGS.get(model_name, self.MODEL_CONFIGS['codebert'])
            logger.info(f"使用默认模型配置: {model_name}")
        else:
            logger.info(f"从数据库获取模型配置: {model_name}")
        
        attack_config = self.ATTACK_METHODS.get(attack_method, self.ATTACK_METHODS['itgen'])
        
        # 获取脚本路径
        script_path = self.get_attack_script_path(model_name, task_type, attack_method)
        
        # 基本参数
        cmd_parts = [
            f"python {script_path}",
            f"--output_dir=../saved_models",
            f"--model_type={model_config['model_type']}",
            f"--tokenizer_name={model_config['tokenizer_path']}",
            f"--model_name_or_path={model_config['model_path']}",
            f"--base_model={model_config['base_model']}",
            f"--eval_data_file=../../../dataset/{task_type}/{config.get('eval_data_file')}",
            f"--block_size={config.get('block_size', 512)}",
            f"--eval_batch_size={config.get('eval_batch_size', 2)}",
            f"--seed={config.get('seed', 123456)}",
            f"--csv_store_path=../../../result/{model_name}_{task_type}_{attack_method}_{config.get('eval_data_file')}.jsonl"
        ]
        # 创建结果文件夹
        os.makedirs(f"../../../result/attack", exist_ok=True)
        # 添加方法特定参数
        for param in attack_config.get('params', []):
            if param in config:
                cmd_parts.append(f"--{param} {config[param]}")
        
        # 添加额外标志
        if 'use_ga' in config and config['use_ga']:
            cmd_parts.append('--use_ga')
        
        if 'original' in config and config['original']:
            cmd_parts.append('--original')
        
        # 如果是 CodeT5，添加 config_name
        if model_name == 'codet5':
            cmd_parts.insert(3, f"--config_name={model_config['model_name']}")
        
        # 组合命令
        full_cmd = " ".join(cmd_parts)
        
        # Windows环境下不需要CUDA_VISIBLE_DEVICES前缀，因为
        # subprocess.run会在环境变量字典中设置
        return full_cmd
    
    def execute_attack_script(
        self,
        model_name: str,
        task_type: str,
        attack_method: str,
        config: Dict[str, Any],
        cwd: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        执行攻击脚本
        
        Args:
            model_name: 模型名称
            task_type: 任务类型
            attack_method: 攻击方法
            config: 配置参数字典
            cwd: 工作目录（如果为None，使用脚本所在目录）
        
        Returns:
            执行结果字典
        """
        logger.info("=" * 60)
        logger.info(f"🎯 开始执行攻击脚本")
        logger.info(f"📦 模型: {model_name}, 任务: {task_type}, 方法: {attack_method}")
        logger.info("=" * 60)
        
        # 获取脚本路径并设置工作目录
        script_path = self.get_attack_script_path(model_name, task_type, attack_method)
        
        if not script_path.exists():
            error_msg = f"攻击脚本不存在: {script_path}"
            logger.error(f"✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
        
        # 如果没有指定cwd，使用脚本所在目录
        if cwd is None:
            cwd = str(script_path.parent)
        
        # 构建命令
        command = self.build_command(model_name, task_type, attack_method, config)
        
        logger.info(f"📝 工作目录: {cwd}")
        logger.info(f"📝 执行命令: {command}...")  # 只打印前200个字符
        
        try:
            # 准备环境变量（用于CUDA设备设置）
            env = os.environ.copy()
            
            # 确保config是字典类型
            if not isinstance(config, dict):
                config = {}
            
            cuda_device = config.get('cuda_device', 0)
            if cuda_device is not None:
                env['CUDA_VISIBLE_DEVICES'] = str(cuda_device)
                logger.info(f"✓ 设置CUDA设备: {cuda_device}")
            
            # 执行命令
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                env=env,  # 传递环境变量
                capture_output=True,
                text=True,
                timeout=config.get('timeout', 3600)
            )
            
            # 检查返回码
            if result.returncode == 0:
                logger.info("✓ 脚本执行成功")
                # 打印部分输出用于调试
                if result.stdout:
                    logger.info(f"✓ 输出信息: {result.stdout[:500]}")
                return {
                    'success': True,
                    'state': 'completed',
                    'returncode': result.returncode,
                    'stdout': result.stdout,
                    'stderr': result.stderr,
                    'config': config
                }
            else:
                error_msg = f"脚本执行失败，返回码: {result.returncode}"
                logger.error(f"✗ {error_msg}")
                
                # 打印完整的stdout和stderr用于调试
                if result.stdout:
                    logger.error(f"标准输出: {result.stdout[-2000:]}")
                if result.stderr:
                    logger.error(f"错误输出: {result.stderr[-2000:]}")
                
                return {
                    'success': False,
                    'error': error_msg,
                    'returncode': result.returncode,
                    'stdout': result.stdout,
                    'stderr': result.stderr
                }
        
        except subprocess.TimeoutExpired:
            error_msg = f"脚本执行超时（超过{config.get('timeout', 3600)}秒）"
            logger.error(f"✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
        
        except Exception as e:
            error_msg = f"执行脚本时出错: {str(e)}"
            logger.error(f"✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def get_supported_models(self) -> list:
        """获取支持的模型列表（优先从数据库获取）"""
        try:
            # 从数据库获取所有可用模型
            db_models = DBModel.query.filter_by(status='available').all()
            if db_models:
                models = [model.name for model in db_models]
                logger.info(f"从数据库获取模型列表: {len(models)} 个模型")
                return models
        except Exception as e:
            logger.warning(f"从数据库获取模型列表失败: {e}，使用默认配置")
        
        # 如果数据库中没有，返回默认配置的模型列表
        return list(self.MODEL_CONFIGS.keys())
    
    def get_supported_attacks(self) -> list:
        """获取支持的攻击方法列表"""
        return list(self.ATTACK_METHODS.keys())
    
    def get_supported_tasks(self) -> list:
        """获取支持的任务类型列表"""
        return list(self.TASK_DIRS.keys())
