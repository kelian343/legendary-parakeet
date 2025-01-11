@echo off
REM 打开bat文件所在的目录
cd /d %~dp0

REM 进入 prosemirror-multi-editor 目录
cd prosemirror-multi-editor

REM 执行 npm start
npm start

REM 暂停，以便查看输出
pause