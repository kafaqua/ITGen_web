import logging
import json
import os
import time
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime
from app.extensions import db

logger = logging.getLogger(__name__)

class EvaluationService:
    """评估服务类"""
    
    def __init__(self):
        """初始化评估服务"""
        self.reports = {}
        # 查找结果文件：优先查找 result/ 目录，然后是上级 result/ 目录
        self.base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.result_dirs = [
            self.base_dir / 'result',  # 优先使用根目录下的 result 文件夹
            self.base_dir / 'server' / 'result'  # 备用目录
        ]
       
    
    def get_all_reports(self) -> List[Dict[str, Any]]:
        """获取所有报告"""
        try:
            from app.models.db_evaluation import EvaluationReport
            reports = EvaluationReport.query.order_by(EvaluationReport.created_at.desc()).all()
            return [report.to_dict() for report in reports]
        except Exception as e:
            logger.error(f"从数据库获取报告列表失败: {e}")
            # 如果数据库失败，从内存返回
            return list(self.reports.values())
    
    def get_report(self, report_id: str) -> Dict[str, Any]:
        """获取特定报告"""
        try:
            from app.models.db_evaluation import EvaluationReport
            report = EvaluationReport.query.filter_by(report_id=report_id).first()
            if report:
                return report.to_dict()
            else:
                # 如果数据库中不存在，尝试从内存获取
                return self.reports.get(report_id)
        except Exception as e:
            logger.error(f"从数据库获取报告失败: {e}")
            # 如果数据库失败，从内存返回
            return self.reports.get(report_id)
    
    def generate_report_from_results(self, model_name: str, task_type: str, 
                                    attack_methods: List[str], 
                                    evaluation_metrics: List[str] = None) -> Dict[str, Any]:
        """
        从批量攻击结果文件生成鲁棒性评估报告
        
        Args:
            model_name: 模型名称（如 'codebert', 'codet5'）
            task_type: 任务类型（如 'clone_detection'）
            attack_methods: 攻击方法列表（如 ['itgen', 'alert']）
            evaluation_metrics: 评估指标列表（如 ['asr', 'ami', 'art']）
        
        Returns:
            评估报告字典
        """
        try:
            # 默认评估指标
            if evaluation_metrics is None:
                evaluation_metrics = ['asr', 'ami', 'art']
            
            logger.info(f"开始为模型 {model_name} 生成评估报告...")
            logger.info(f"任务类型: {task_type}, 攻击方法: {attack_methods}")
            
            # 1. 为每种攻击方法分别查找对应的结果文件
            attack_results = {}
            

            for method in attack_methods:
                logger.info(f"查找攻击方法 {method} 的结果文件...")
                result_files = []
                
                # 构建文件名模式
                file_patterns = [
                    f"*{model_name}*{task_type}*{method}*.jsonl",
                    f"{model_name}_{task_type}_{method}*.jsonl",
                    f"attack_{model_name}*{method}*.jsonl",
                    f"attack_{model_name}_{task_type}*{method}*.jsonl",
                    f"*{method}*{model_name}*{task_type}*.jsonl"
                ]
                
                # 在所有结果目录中查找文件
                for result_dir in self.result_dirs:
                    if not result_dir.exists():
                        logger.info(f"结果目录不存在: {result_dir}")
                        continue
                        
                    for pattern in file_patterns:
                        files = list(result_dir.glob(pattern))
                        result_files.extend(files)
                
                # 去重
                result_files = list(set(result_files))
                
                if not result_files:
                    logger.warning(f"未找到攻击方法 {method} 的结果文件")
                    attack_results[method] = {
                        'files': [],
                        'all_results': [],
                        'successful_results': [],
                        'failed_results': []
                    }
                    continue
                
                logger.info(f"攻击方法 {method} 找到 {len(result_files)} 个结果文件: {[f.name for f in result_files]}")
                # 2. 读取并处理该攻击方法的结果
                all_results = []
                for file_path in result_files:
                    logger.info(f"处理文件: {file_path.name}")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            for line_num, line in enumerate(f, 1):
                                if line.strip():
                                    try:
                                        result = json.loads(line.strip())
                                        # 添加文件来源信息
                                        result['_file_source'] = file_path.name
                                        all_results.append(result)
                                    except json.JSONDecodeError as e:
                                        logger.warning(f"文件 {file_path.name} 第 {line_num} 行解析JSON失败: {e}")
                    except Exception as e:
                        logger.error(f"读取文件 {file_path.name} 失败: {e}")
                
                # 3. 根据Type字段分类结果
                # Type=0代表攻击失败，Type=攻击方法名代表攻击成功
                successful_results = [r for r in all_results if r.get('Type') == method]
                failed_results = [r for r in all_results if r.get('Type') == '0']
                
                attack_results[method] = {
                    'files': result_files,
                    'all_results': all_results,
                    'successful_results': successful_results,
                    'failed_results': failed_results
                }
            
            # 4. 分别统计各个攻击方法的指标
            method_metrics = {}
            overall_stats = {
                'total_samples': 0,
                'successful_attacks': 0,
                'failed_attacks': 0
            }
            
            for method in attack_methods:
                method_data = attack_results[method]
                all_results = method_data['all_results']
                successful_results = method_data['successful_results']
                failed_results = method_data['failed_results']
                
                total_samples = len(all_results)
                successful_attacks = len(successful_results)
                failed_attacks = len(failed_results)
                
                # 更新总体统计
                overall_stats['total_samples'] += total_samples
                overall_stats['successful_attacks'] += successful_attacks
                overall_stats['failed_attacks'] += failed_attacks
                
                # 计算该攻击方法的各项指标
                # ASR - Attack Success Rate (攻击成功率)
                asr = successful_attacks / total_samples if total_samples > 0 else 0
                
                # AMI - Average Model Invocations (平均模型调用次数)
                if successful_attacks > 0:
                    ami = sum(r.get('Query Times', 0) for r in successful_results) / successful_attacks
                else:
                    ami = 0
                
                # ART - Average Response Time (平均响应时间)
                if successful_attacks > 0:
                    art = sum(r.get('Time Cost', 0) for r in successful_results) / successful_attacks
                else:
                    art = 0
                
                # 平均代码长度
                avg_program_length = sum(r.get('Program Length', 0) for r in all_results) / total_samples if total_samples > 0 else 0
                
                # 平均标识符数量
                avg_identifiers = sum(r.get('Identifier Num', 0) for r in all_results) / total_samples if total_samples > 0 else 0
                
                method_metrics[method] = {
                    'total_samples': total_samples,
                    'successful_attacks': successful_attacks,
                    'failed_attacks': failed_attacks,
                    'asr': round(asr * 100, 2),  # 转换为百分比
                    'ami': round(ami, 2),
                    'art': round(art, 2),
                    'avg_program_length': round(avg_program_length, 2),
                    'avg_identifiers': round(avg_identifiers, 2),
                }
                
                logger.info(f"攻击方法 {method} 统计: ASR={method_metrics[method]['asr']}%, "
                        f"成功={successful_attacks}/{total_samples}")
            
            # 5. 计算总体指标
            total_samples = overall_stats['total_samples']
            successful_attacks = overall_stats['successful_attacks']
            failed_attacks = overall_stats['failed_attacks']
            
            # 总体ASR
            overall_asr = successful_attacks / total_samples if total_samples > 0 else 0
            
            # 总体AMI和ART（加权平均）
            overall_ami = 0
            overall_art = 0
            overall_avg_program_length = 0
            overall_avg_identifiers = 0
            
            for method in attack_methods:
                method_data = method_metrics[method]
                weight = method_data['total_samples'] / total_samples if total_samples > 0 else 0
                
                overall_ami += method_data['ami'] * weight
                overall_art += method_data['art'] * weight
                overall_avg_program_length += method_data['avg_program_length'] * weight
                overall_avg_identifiers += method_data['avg_identifiers'] * weight
            
            # 6. 生成报告ID和完整报告
            report_id = f"{model_name}_{task_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # 汇总统计
            summary_stats = {
                'total_samples': total_samples,
                'successful_attacks': successful_attacks,
                'failed_attacks': failed_attacks,
                'asr': round(overall_asr * 100, 2),
                'ami': round(overall_ami, 2),
                'art': round(overall_art, 2),
                'avg_program_length': round(overall_avg_program_length, 2),
                'avg_identifiers': round(overall_avg_identifiers, 2)
            }
            
            # 收集所有成功结果的样本（用于展示）
            all_successful_results = []
            for method in attack_methods:
                all_successful_results.extend(attack_results[method]['successful_results'])
            
            report = {
                'report_id': report_id,
                'model_name': model_name,
                'task_type': task_type,
                'attack_methods': attack_methods,
                'evaluation_metrics': evaluation_metrics,
                'method_metrics': method_metrics,
                'summary_stats': summary_stats,
                'sample_results': all_successful_results[:5] if len(all_successful_results) > 5 else all_successful_results,
                'generated_at': datetime.now().isoformat()
            }
            
            logger.info(f"报告生成成功: 总体ASR={summary_stats['asr']}%, "
                    f"总成功攻击={successful_attacks}/{total_samples}")
            
            # 7. 保存到数据库（如果数据库可用）
            try:
                from app.models.db_evaluation import EvaluationReport
                
                # 检查是否已存在相同报告
                existing_report = EvaluationReport.query.filter_by(report_id=report_id).first()
                if existing_report:
                    # 更新现有报告
                    existing_report.asr = summary_stats['asr']
                    existing_report.ami = summary_stats['ami']
                    existing_report.art = summary_stats['art']
                    existing_report.total_samples = total_samples
                    existing_report.successful_attacks = successful_attacks
                    existing_report.failed_attacks = failed_attacks
                    existing_report.avg_program_length = summary_stats['avg_program_length']
                    existing_report.avg_identifiers = summary_stats['avg_identifiers']
                    existing_report.method_metrics = method_metrics
                    existing_report.summary_stats = summary_stats
                    existing_report.sample_results = report['sample_results']
                    db.session.commit()
                    logger.info(f"更新现有报告: {report_id}")
                else:
                    # 创建新报告
                    evaluation_report = EvaluationReport(
                        report_id=report_id,
                        model_name=model_name,
                        task_type=task_type,
                        attack_methods=attack_methods,
                        evaluation_metrics=evaluation_metrics,
                        total_samples=total_samples,
                        successful_attacks=successful_attacks,
                        failed_attacks=failed_attacks,
                        asr=summary_stats['asr'],
                        ami=summary_stats['ami'],
                        art=summary_stats['art'],
                        avg_program_length=summary_stats['avg_program_length'],
                        avg_identifiers=summary_stats['avg_identifiers'],
                        method_metrics=method_metrics,
                        summary_stats=summary_stats,
                        sample_results=report['sample_results']
                    )
                    db.session.add(evaluation_report)
                    db.session.commit()
                    logger.info(f"保存新报告到数据库: {report_id}")
                
                # 同时保存到内存缓存
                self.reports[report_id] = report
                
            except Exception as e:
                logger.error(f"保存报告到数据库失败: {e}", exc_info=True)
                # 即使数据库保存失败，也返回报告结果
                self.reports[report_id] = report
            
            return {
                'success': True,
                'report_id': report_id,
                'report': report
            }
            
        except Exception as e:
            logger.error(f"生成报告失败: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }