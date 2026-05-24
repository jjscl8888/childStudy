#!/bin/bash
WSL_IP=$(hostname -I | awk '{print $1}')
echo "WSL IP: $WSL_IP"
echo "请在 Windows 管理员 PowerShell 中执行："
echo "netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0"
echo "netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$WSL_IP"
