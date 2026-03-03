# -*- coding: utf-8 -*-
"""
酒馆聊天记录查看器 - 本地服务器启动脚本
双击运行此脚本即可自动启动本地服务器并打开浏览器
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import signal

PORT = 5173

def find_free_port(start=5173, end=5273):
    """寻找可用端口"""
    import socket
    for port in range(start, end):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return start

def main():
    # 切换到脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # 检查 index.html 是否存在
    if not os.path.exists('index.html'):
        print('错误：未找到 index.html 文件！')
        print('请确保此脚本与 index.html 在同一目录下。')
        input('按回车键退出...')
        sys.exit(1)
    
    port = find_free_port(PORT)
    
    handler = http.server.SimpleHTTPRequestHandler
    # 抑制日志输出
    handler.log_message = lambda self, format, *args: None
    
    try:
        httpd = socketserver.TCPServer(('', port), handler)
    except OSError:
        print(f'端口 {port} 被占用，请关闭占用程序后重试。')
        input('按回车键退出...')
        sys.exit(1)
    
    url = f'http://localhost:{port}'
    
    print('=' * 50)
    print('  📚 酒馆聊天记录查看器')
    print('=' * 50)
    print(f'  🌐 服务器已启动: {url}')
    print(f'  📂 工作目录: {script_dir}')
    print()
    print('  浏览器已自动打开，如未打开请手动访问上方地址')
    print('  按 Ctrl+C 或关闭此窗口停止服务器')
    print('=' * 50)
    
    # 自动打开浏览器
    webbrowser.open(url)
    
    # 处理 Ctrl+C
    def signal_handler(sig, frame):
        print('\n正在关闭服务器...')
        httpd.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n正在关闭服务器...')
        httpd.shutdown()

if __name__ == '__main__':
    main()
