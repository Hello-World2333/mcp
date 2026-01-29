const { exec, spawn } = require('child_process');
const readline = require('readline');

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function confirm(question) {
    return new Promise((resolve, reject) => {
        const child = spawn('kdialog', ["--yesno", question])
        let executedFallback = false;
        
        child.on('exit', (code) => {
            if (!executedFallback) {
                resolve(code === 0);
            }
        })

        child.on('error', (error) => {
            // kdialog执行失败时，fallback到readline
            executedFallback = true;
            console.log(question + ' (y/N): ');
            rl.question('', (answer) => {
                const result = answer.toLowerCase().startsWith('y');
                resolve(result);
            });
        })
    })
}

function question(question) {
    return new Promise((resolve, reject) => {
        const child = spawn('kdialog', ["--inputbox", question]);
        let answer = '';
        let executedFallback = false;
        
        child.stdout.on('data', (data) => {
            answer += data.toString().trim();
        })
        child.on('exit', () => {
            if (!executedFallback) {
                resolve(answer);
            }
        })
        child.on('error', (error) => {
            // kdialog执行失败时，fallback到readline
            executedFallback = true;
            rl.question(question + ': ', (input) => {
                resolve(input);
            });
        })
    })
}

function execCommand(command) {
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

module.exports = { confirm, question, exec: execCommand };