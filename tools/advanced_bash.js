const { exec, spawn } = require('child_process');
const { confirm, question } = require('../utils');

class Konsole {
    constructor() {
        this.sessionName = 'advanced_bash';
    }

    async init() {
        if (await this.isOpen()) {
            this.konsole = spawn('tmux', ['attach', '-t', this.sessionName]);
        } else {
            this.konsole = spawn('tmux', ['new-session', '-s', this.sessionName]);
            await this.waitForLoad();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('PID: ', this.konsole.pid);
        const panes = await this.getPanes();
        if (panes.length > 1) {
            throw new Error('预期外的行为: 需要1个进程 实际有', panes.length, '个进程')
        }
        this.bashPID = panes[0];
        console.log('Bash PID: ', this.bashPID);

        await this.sendkey(['source ./bashrc.sh', 'Enter']);

        await new Promise(resolve => setTimeout(resolve, 500));
    }
    exec(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (stderr) {
                    reject(stderr)
                }
                if (error) {
                    reject(error.message)
                }
                resolve(stdout);
            })
        })
    }

    async isOpen() {
        try {
            await this.exec(`tmux has-session -t ${this.sessionName}`);
            return true;
        } catch {
            return false;
        }
    }

    waitForLoad() {
        return new Promise(async (resolve, reject) => {
            while (await this.isOpen() === false) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            resolve();
        })
    }

    async getScreen(s = 0) {
        return await this.exec(`tmux capture-pane -p -t ${this.sessionName} -S ${s}`);
    }

    async sendkey(args) {
        spawn('tmux', ['send-keys', '-t', this.sessionName, ...args]);
    }

    async getPanes() {
        const panes = await this.exec(`tmux list-panes -t ${this.sessionName} -F '#{pane_pid}'`);
        return panes.split('\n').filter(Boolean).map(pid => parseInt(pid));
    }

    async getChildren(pid) {
        try {
            const children = await this.exec(`pgrep -P ${pid}`);
            const directChildren = children.split('\n').filter(Boolean).map(pid => parseInt(pid));

            // 递归获取所有子进程
            let allChildren = [...directChildren];
            for (const childPid of directChildren) {
                const grandchildren = await this.getChildren(childPid);
                allChildren = allChildren.concat(grandchildren);
            }

            return allChildren;
        } catch {
            return [];
        }
    }

    async getWchan(pid) {
        try {
            return await this.exec(`sudo cat /proc/${pid}/wchan`);
        } catch {
            return '';
        }
    }

    async getCommandOutput() {
        const screen = await this.getScreen(-999999);
        const start = screen.lastIndexOf('==========COMMAND=START==========');
        const end = screen.lastIndexOf('==========COMMAND=-END-==========');
        if (start !== -1) {
            const isEnd = end !== -1 && end > start;
            return {
                output: screen.slice(start + 33, isEnd ? end : -1).trim(),
                end: isEnd
            };
        } else {
            return {
                output: '',
                end: false
            }
        }
    }

    async close() {
        await this.exec(`tmux kill-session -t ${this.sessionName}`);
    }
}

const ksl = new Konsole();

// 定义工具，现在是数组格式以支持多个工具在一个文件中
const definitions = [
    {
        type: "function",
        function: {
            name: "advanced_bash_exec",
            description: "高级bash工具，相当于一个连续的工作区",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "bash命令"
                    }
                },
                required: ["command"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "advanced_bash_get_screen",
            description: "获取当前bash终端屏幕的内容，可能包含其他命令的输出",
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
            name: "advanced_bash_send_key",
            description: "向bash终端发送按键",
            parameters: {
                type: "object",
                properties: {
                    args: {
                        type: "array",
                        description: "按键参数 在所有按键前添加\"-l\"代表RAW模式 传入的其他文本将不会被转义 如果不添加则支持: C-x(Ctrl+x) M-x(Alt+x) ^[(escape) ^M(enter) ^I(tab)",
                    }
                },
                required: ['args'],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "advanced_bash_wait_for_command",
            description: "等待当前命令执行完成或等待输入，返回当前输出内容，如果在命令完成后调用则可以获取输出内容",
            parameters: {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false
            }
        }
    }
];

const handlers = {
    advanced_bash_exec: async function ({ command }) {
        console.log('高级bash工具: exec')
        const isYes = await confirm('执行命令吗?\n' + command);
        if (!isYes) {
            const reason = await question('拒绝原因: ');
            return `用户拒绝了调用 因为: ${reason}`;
        }

        // 在实际使用前初始化Konsole实例
        if (!ksl.konsole) {
            console.log('初始化Konsole实例...');
            await ksl.init();
        }

        ksl.sendkey(['__run ', JSON.stringify(command), 'Enter']);

        while (true) {
            const out = await ksl.getCommandOutput();
            if (out.end) {
                console.log('命令执行完成');
                return `命令执行完成 输出:\n${out.output}`;
            }
            const children = [...(await ksl.getChildren(ksl.bashPID)), ksl.bashPID];
            const wchans = await Promise.all(children.map(child => ksl.getWchan(child)));
            if (wchans.some(w => ['wait_woken'].indexOf(w) !== -1)) {
                console.log('命令正在等待输入');
                return `命令正在等待输入 当前输出:\n${out.output}`
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    },
    advanced_bash_get_screen: async function () {
        console.log('高级bash工具: getScreen')

        // 在实际使用前初始化Konsole实例
        if (!ksl.konsole) {
            console.log('初始化Konsole实例...');
            await ksl.init();
        }

        const screenContent = await ksl.getScreen();
        return screenContent;
    },
    advanced_bash_send_key: async function ({ args }) {
        console.log('高级bash工具: sendkey')

        const isYes = await confirm('发送按键吗?\n' + JSON.stringify(args));
        if (!isYes) {
            const reason = await question('拒绝原因: ');
            return `用户拒绝了调用 因为: ${reason}`;
        }

        if (!ksl.konsole) {
            console.log('初始化Konsole实例...');
            await ksl.init();
        }

        await ksl.sendkey(args);
        return 'OK';
    },
    advanced_bash_wait_for_command: async function () {
        console.log('高级bash工具: wait_for_command')

        // 在实际使用前初始化Konsole实例
        if (!ksl.konsole) {
            console.log('初始化Konsole实例...');
            await ksl.init();
        }

        while (true) {
            const out = await ksl.getCommandOutput();
            if (out.end) {
                console.log('命令执行完成');
                return `命令已执行完成 输出:\n${out.output}`;
            }

            const children = [...(await ksl.getChildren(ksl.bashPID)), ksl.bashPID];
            const wchans = await Promise.all(children.map(child => ksl.getWchan(child)));
            if (wchans.some(w => ['wait_woken'].indexOf(w) !== -1)) {
                console.log('命令正在等待输入');
                return `命令正在等待输入 当前输出:\n${out.output}`;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

module.exports = { definitions, handlers };