# Copyright (c) Microsoft Corporation. 
# Licensed under the MIT license.

from tree_sitter import Language, Parser

# 为Windows系统构建.dll文件
Language.build_library(
  # Store the library in the uild directory
  'build/my-languages.dll',  # 改为.dll并放到build目录

  # Include one or more languages
  [
    'tree-sitter-python',
    'tree-sitter-java',
    'tree-sitter-cpp',
    'tree-sitter-c',
  ]
)

print('tree-sitter解析器构建完成！')

# 验证构建
try:
    # 测试Python解析器
    PYTHON_LANGUAGE = Language('build/my-languages.dll', 'python')
    parser = Parser()
    parser.set_language(PYTHON_LANGUAGE)
    
    python_code = b'''
def hello():
    return \"world\"
'''
    tree = parser.parse(python_code)
    print(f' Python解析器验证成功 - 根节点: {tree.root_node.type}')
    
    # 测试Java解析器
    JAVA_LANGUAGE = Language('build/my-languages.dll', 'java')
    parser.set_language(JAVA_LANGUAGE)
    
    java_code = b'''
public class Test {
    public static void main(String[] args) {
        System.out.println(\"test\");
    }
}
'''
    tree = parser.parse(java_code)
    print(f' Java解析器验证成功 - 根节点: {tree.root_node.type}')
    
except Exception as e:
    print(f'验证过程中出现错误: {e}')
