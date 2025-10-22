#!/usr/bin/env python3
"""
测试前端是否运行
Test if frontend is running
"""

import requests
import time

def test_frontend():
    """测试前端"""
    ports = [5173, 3000, 3001, 3002, 3003, 3004, 3005]
    
    print("测试前端端口...")
    
    for port in ports:
        try:
            url = f"http://localhost:{port}"
            response = requests.get(url, timeout=2)
            if response.status_code == 200:
                print(f"前端运行在端口 {port}: {url}")
                return True
        except:
            continue
    
    print("未找到运行中的前端服务")
    return False

if __name__ == "__main__":
    test_frontend()
