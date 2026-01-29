const definitions = [
    {
        type: "function",
        function: {
            name: "get_time",
            description: "获取当前本地时间或指定时区时间",
            parameters: {
                type: "object",
                properties: {
                    timezone: {
                        type: "string",
                        description: "时区标识，如 'UTC+8', 'UTC-5', 'Asia/Shanghai', 'America/New_York'"
                    }
                },
                required: [],
                additionalProperties: false
            }
        }
    }
];

const handlers = {
    get_time: async ({ timezone }) => {
        console.log(`获取时间请求 - 时区: ${timezone || '本地时间'}`);
        
        try {
            let date;
            
            if (!timezone) {
                // 获取本地时间
                date = new Date();
            } else if (timezone.startsWith('UTC')) {
                // 处理 UTC+/-X 格式
                const offsetMatch = timezone.match(/UTC([+-])(\d{1,2})/);
                if (offsetMatch) {
                    const sign = offsetMatch[1] === '+' ? 1 : -1;
                    const offsetHours = parseInt(offsetMatch[2]);
                    
                    // 计算相对于UTC的时间偏移
                    const utcTime = new Date();
                    const localOffset = utcTime.getTimezoneOffset() * 60000; // 分钟转毫秒
                    const targetOffset = offsetHours * 3600000; // 小时转毫秒
                    
                    date = new Date(utcTime.getTime() + localOffset + (targetOffset * sign));
                } else {
                    // 未知UTC格式，返回本地时间
                    date = new Date();
                }
            } else {
                // 使用IANA时区标识符
                try {
                    date = new Date(new Intl.DateTimeFormat('en-US', {
                        timeZone: timezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3
                    }).format(new Date()));
                } catch (tzError) {
                    console.warn(`无效时区标识符: ${timezone}, 返回本地时间`);
                    date = new Date();
                }
            }
            
            const timeString = date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            });
            
            return `当前时间: ${timeString}`;
        } catch (error) {
            console.error(`获取时间时出错: ${error.message}`);
            return `获取时间失败: ${error.message}`;
        }
    }
};

module.exports = { definitions, handlers };