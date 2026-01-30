const config = require('../configs/gpio.json');
const utils = require('../utils');
const { SerialPort } = require('serialport');

class GPIO {
    constructor() {
        this.port = null;
        this.isConnected = false;
        this.receiveBuffer = '';
    }

    connect() {
        try {
            if (this.port && this.port.isOpen) {
                this.port.close();
            }
            
            this.port = new SerialPort({
                path: config.serialPort,
                baudRate: config.baudRate
            });
            
            this.port.on('open', () => {
                console.log('串口连接已建立');
                this.isConnected = true;
            });

            this.port.on('close', () => {
                console.log('串口连接已关闭');
                this.isConnected = false;
            });

            this.port.on('error', (err) => {
                console.error('串口错误:', err);
                this.isConnected = false;
            });

            this.port.on('data', (data) => {
                this.receiveBuffer += data.toString();

                let lines = this.receiveBuffer.split('\n');
                this.receiveBuffer = lines.pop();
                for (let line of lines) {
                    line = line.trim();
                    if (line) {
                        this.handleResponse(line);
                    }
                }
            });
        } catch (error) {
            console.error('串口连接失败:', error.message);
            this.isConnected = false;
        }
    }

    pendingRequests = new Map();

    handleResponse(responseStr) {
        // 响应格式: ID 或 ID.value
        const match = responseStr.match(/^([a-zA-Z0-9]+)(?:\.(.*))?$/);
        console.log(match);
        if (!match) return;

        const resId = match[1];
        const returnValue = match[2] || null; // 如果没有 . 后内容，则为 null

        if (this.pendingRequests.has(resId)) {
            const { resolve, reject } = this.pendingRequests.get(resId);
            this.pendingRequests.delete(resId);
            resolve(returnValue);
        }
    }

    async ensureConnection() {
        if (!this.isConnected) {
            console.log('检测到串口未连接，尝试重连...');
            this.connect();
            
            // 等待一段时间确认连接状态
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            if (!this.isConnected) {
                throw new Error('无法连接到串口设备');
            }
        }
    }

    getPinsDefinitions() {
        return config.pins;
    }

    async sendCommand(command, args, timeout = 5000) {
        await this.ensureConnection();

        const reqId = this.generateRandomId(6);
        const argStr = Array.isArray(args) ? args.join(',') : (args ? String(args) : '');
        const commandStr = `${reqId}.${command}` + (argStr ? `.${argStr}` : '') + '\n';

        return new Promise((resolve, reject) => {
            // 设置超时
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(reqId);
                reject(new Error(`串口命令 '${command}' 超时（${timeout}ms）`));
            }, timeout);

            // 注册 pending 请求
            this.pendingRequests.set(reqId, {
                resolve: (value) => {
                    clearTimeout(timeoutId);
                    resolve(value === undefined || value === null ? null : value);
                },
                reject: (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });

            // 发送命令
            console.log(`正在执行命令: ${commandStr}`);
            this.port.write(commandStr, (err) => {
                if (err) {
                    clearTimeout(timeoutId);
                    this.pendingRequests.delete(reqId);
                    reject(new Error(`串口写入失败: ${err.message}`));
                }
                this.port.drain(() => {
                    console.log('数据已刷新');
                });
            });
        });
    }

    generateRandomId(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

const gpio = new GPIO();

const definitions = [
    {
        type: "function",
        function: {
            name: "gpio_get_pins_definitions",
            description: "获取GPIO引脚定义",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "gpio_pinmode_set",
            description: "GPIO: 设置针脚模式",
            parameters: {
                type: "object",
                properties: {
                    pin: {
                        type: "string",
                        description: "针脚 取值D2-D13或A0-A7"
                    },
                    mode: {
                        type: "boolean",
                        description: "针脚模式 false=输入 true=输出"
                    }
                },
                required: ["pin", "mode"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "gpio_pinmode_get",
            description: "GPIO: 获取针脚模式",
            parameters: {
                type: "object",
                properties: {
                    pin: {
                        type: "string",
                        description: "针脚 取值D2-D13或A0-A7"
                    }
                },
                required: ["pin"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "gpio_digital_write",
            description: "GPIO: 写入数字信号 如果针脚在INPUT模式 则会修改为OUTPUT",
            parameters: {
                type: "object",
                properties: {
                    pin: {
                        type: "string",
                        description: "针脚 取值D2-D13或A0-A7"
                    },
                    value: {
                        type: "boolean",
                        description: "写入的值 高电平或低电平"
                    }
                },
                required: ["pin", "value"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "gpio_digital_read",
            description: "GPIO: 读取数字信号",
            parameters: {
                type: "object",
                properties: {
                    pin: {
                        type: "string",
                        description: "针脚 取值D2-D13或A0-A7"
                    }
                },
                required: ["pin"],
                additionalProperties: false
            }
        }
    },
];

const handlers = {
    gpio_get_pins_definitions: (args) => {
        return JSON.stringify(gpio.getPinsDefinitions());
    },
    gpio_pinmode_set: async (args) => {
        await gpio.sendCommand('PM', [args.pin, args.mode ? 1 : 0]);
        return 'OK';
    },
    gpio_pinmode_get: async (args) => {
        const res = await gpio.sendCommand('GM', [args.pin]);
        return res === '1' ? 'OUTPUT' : 'INPUT';
    },
    gpio_digital_write: async (args) => {
        await gpio.sendCommand('PM', [args.pin, 1]);
        await gpio.sendCommand('DW', [args.pin, args.value ? 1 : 0]);
        return 'OK';
    },
    gpio_digital_read: async (args) => {
        const res = await gpio.sendCommand('DR', [args.pin]);
        const value = res === '1' ? 'HIGH' : 'LOW';
        const pinmode = await gpio.sendCommand('GM', [args.pin]);
        return pinmode === '1' ? `正在输出：${value}` : `读取到：${value}`
    }
}

module.exports = { definitions, handlers };