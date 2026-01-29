// 数学计算器工具函数
function calculate(expression) {
    try {
        // 移除所有空白字符
        expression = expression.replace(/\s+/g, '');

        // 使用math.js的BigNumber进行安全计算
        const math = require('mathjs');

        // 使用math.js解析和计算表达式，显式使用BigNumber类型
        const result = math.evaluate(expression, { number: 'BigNumber' });

        return {
            success: true,
            result: math.format(result, { precision: 14 }), // 格式化结果，保留适当精度
            expression: expression
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            expression: expression
        };
    }
}

const definitions = [
    {
        type: "function",
        function: {
            name: "calculate",
            description: "计算数学表达式 使用nodejs的math.js的eveluate",
            parameters: {
                type: "object",
                properties: {
                    expression: {
                        type: "string",
                        description: "数学表达式"
                    }
                },
                required: ["expression"],
                additionalProperties: false
            }
        }
    }
];

const handlers = {
    calculate: async ({ expression }) => {
        console.log(`正在计算表达式: ${expression}`);
        const calculation = calculate(expression);

        if (calculation.success) {
            console.log(`计算结果: ${calculation.result}`);
            return `计算结果: ${calculation.result}`;
        } else {
            console.log(`计算错误: ${calculation.error}`);
            return `计算错误: ${calculation.error}`;
        }
    }
};

module.exports = { definitions, handlers };