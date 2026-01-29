import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import express from 'express'  // 需要安装 express
import cors from 'cors' // 导入 cors 中间件，需要安装
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

// Create an MCP server
const server = new McpServer({
    name: 'demo-server',
    version: '1.0.0'
})

// 将工具定义和处理器转换为注册格式的函数
function convertToTools(definitions, handlers) {
    return definitions.map(def => ({
        name: def.function.name,
        description: def.function.description,
        inputSchema: {
            type: "object",
            properties: def.function.parameters.properties,
            required: def.function.parameters.required,
            additionalProperties: def.function.parameters.additionalProperties
        },
        handler: handlers[def.function.name]
    }));
}

// 自动导入tools目录下的所有工具
async function loadTools() {
    const toolsDir = path.join(process.cwd(), 'tools');
    
    if (!fs.existsSync(toolsDir)) {
        console.log('tools目录不存在，跳过工具加载');
        return;
    }
    
    const files = fs.readdirSync(toolsDir);
    
    for (const file of files) {
        if (file.endsWith('.js') && !file.startsWith('.')) {
            try {
                const toolPath = path.join(toolsDir, file);
                const toolModule = await import(`./${path.relative(process.cwd(), toolPath)}`);
                
                // 检查是否是包含 definitions 和 handlers 的模块
                if (toolModule.definitions && toolModule.handlers) {
                    const tools = convertToTools(toolModule.definitions, toolModule.handlers);
                    
                    for (const tool of tools) {
                        // 检查 inputSchema 是否是 Zod schema，如果不是则直接使用对象
                        let processedInputSchema = tool.inputSchema;
                        if (processedInputSchema && typeof processedInputSchema !== 'function' && 
                            !processedInputSchema.parse && !processedInputSchema.safeParse) {
                            // 如果不是 Zod schema，则将其作为普通对象处理
                            processedInputSchema = z.object(
                                Object.keys(processedInputSchema.properties || {}).reduce((acc, key) => {
                                    let prop = processedInputSchema.properties[key];
                                    let schema;
                                    
                                    if (prop.type === 'string') {
                                        schema = z.string();
                                        if (prop.minLength !== undefined) schema = schema.min(prop.minLength);
                                        if (prop.maxLength !== undefined) schema = schema.max(prop.maxLength);
                                    } else if (prop.type === 'number' || prop.type === 'integer') {
                                        schema = z.number();
                                        if (prop.minimum !== undefined) schema = schema.min(prop.minimum);
                                        if (prop.maximum !== undefined) schema = schema.max(prop.maximum);
                                    } else if (prop.type === 'boolean') {
                                        schema = z.boolean();
                                    } else if (prop.type === 'array') {
                                        schema = z.array(z.any());
                                        if (prop.items) {
                                            if (prop.items.type === 'string') {
                                                schema = z.array(z.string());
                                            } else if (prop.items.type === 'number') {
                                                schema = z.array(z.number());
                                            }
                                        }
                                    } else if (prop.type === 'object') {
                                        schema = z.object({});
                                    } else {
                                        schema = z.any();
                                    }
                                    
                                    if (!processedInputSchema.required?.includes(key)) {
                                        schema = schema.optional();
                                    }
                                    
                                    acc[key] = schema;
                                    return acc;
                                }, {})
                            );
                        }

                        const handler = async (args) => {
                            console.log(`工具调用: ${tool.name}\n参数: `, args);
                            try {
                                const res = await tool.handler(args);
                                console.log(`工具返回: `, res, '\n')
                                return { content: [{ type: 'text', text: res }] }
                            } catch (error) {
                                console.log(`工具调用失败: ${error.message}`);
                                return { content: [{ type: 'text', text: `工具调用失败: ${error.message}` }] }
                            }
                        }

                        server.registerTool(
                            tool.name,
                            {
                                title: tool.name,
                                description: tool.description,
                                inputSchema: processedInputSchema
                            },
                            handler
                        );
                        console.log(`已注册工具: ${tool.name}`);
                    }
                } else {
                    console.warn(`工具文件 ${file} 格式不正确，跳过`);
                }
            } catch (error) {
                console.error(`加载工具文件 ${file} 时出错:`, error);
            }
        }
    }
}

// 启动服务器
async function startServer() {
    try {
        // 加载所有工具
        await loadTools();

        // 1. 创建 HTTP 服务器
        const app = express()
        app.use(express.json())  // 解析 JSON 请求体
        
        // 添加 CORS 中间件处理预检请求
        app.use(cors())

        // 2. 创建 MCP 传输层
        const transport = new StreamableHTTPServerTransport()

        // 3. 将 MCP 服务器连接到传输层
        await server.connect(transport)

        // 4. 设置 HTTP 路由，将请求转发给 MCP 传输层
        app.post('/mcp', async (req, res) => {
            await transport.handleRequest(req, res, req.body)
        })

        app.get('/mcp/sse', async (req, res) => {
            await transport.handleRequest(req, res)
        })

        // 5. 启动 HTTP 服务器
        const PORT = 3001
        app.listen(PORT, () => {
            console.log(`MCP 服务器运行在 http://localhost:${PORT}`)
            console.log('启动成功!')
        })

    } catch (error) {
        console.error('服务器错误:', error)
        process.exit(1)
    }
}

startServer().catch((error) => {
    console.error('主程序错误:', error)
    process.exit(1)
})