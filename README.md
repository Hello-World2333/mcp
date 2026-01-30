# 一个MCP服务端

## 简介

这是一个由莫名其妙的库和代码拼出来的MCP服务端  
基于`node.js` 很多功能是`Linux only`的  
MCP的垃圾文档是真的难啃 最后还是把库代码喂给ds才写出来  
本项目一开始甚至没用git  
**文件名以.开头的工具将被禁用**

### 目前有什么工具?
- 高级bash工具套件 `advanced_bash.js`(`Linux only`)
- 数学计算器 `calculate.js`
- GPIO工具套件 `gpio.js`(**BETA** `需要硬件`)
- 系统音量调节 `sysVolume.js`(`Linux only` 支持`pulse`/`alsa`)
- 获取时间 `time.js`

## 使用方法

### 1. 配置环境

需要确保电脑上安装了`node.js`与`npm` 最好安装`git`  
推荐使用`node.js v22.18.0`  

可以通过以下命令检查:
```bash
node -v
npm -v
git -v
```

### 2. 下载项目

如果安装了`git` 可以通过以下命令克隆项目仓库:
```bash
git clone https://github.com/Hello-World2333/mcp.git
```

如果没有 则需要下载项目压缩包并解压  
然后进入项目目录

### 3. 禁用不兼容的工具

如果你是`Windows`用户 需要禁用`Linux only`工具  
打开`tools/`文件夹 将不兼容或不想用的工具重命名 名字前面加个点即可

### 4. 启动项目

第一次启动需要安装依赖:
```bash
npm install
```

然后启动项目:
```bash
npm start
```
如果看到"启动成功!" 就启动成功了

### 5. 配置客户端

服务端默认在`http://0.0.0.0:3001/mcp`运行  

以`Rikka`为例:
1. 打开`设置-MCP`
2. 点击右上角加号
3. 输入一个名称
4. 传输类型选择`Streamable HTTP`
5. 服务器地址填写`http://电脑局域网IP:3001/mcp`
6. 点击保存


~~README写的像一坨真是抱歉~~