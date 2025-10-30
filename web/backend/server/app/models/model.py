from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class ModelInfo(BaseModel):
    """模型信息模型"""
    model_config = ConfigDict(
        protected_namespaces=(),
        extra='allow'
    )
    
    id: Optional[int] = Field(None, description="模型ID（自增，添加时无需提供）")
    model_name: str = Field(..., description="模型名称（唯一）")
    model_type: str = Field(..., description="模型类型（如 roberta, gpt2, codet5）")
    description: Optional[str] = Field(None, description="模型描述")
    model_path: str = Field(..., description="模型路径")
    tokenizer_path: str = Field(..., description="Tokenizer路径")
    max_length: int = Field(default=512, description="最大长度")
    supported_tasks: List[str] = Field(default_factory=list, description="支持的任务")
    status: str = Field(default='available', description="状态: available/unavailable")
    is_predefined: bool = Field(default=False, description="是否预定义")
    
    def to_dict(self):
        """转换为字典"""
        return self.model_dump()

class ModelListResponse(BaseModel):
    """模型列表响应"""
    success: bool
    data: List[ModelInfo]

