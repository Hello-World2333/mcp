const utils = require("../utils");

const definitions = [
    {
        type: "function",
        function: {
            name: "sys_volume_alsa_get",
            description: "通过amixer获取系统主设备音量",
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
            name: "sys_volume_pulse_get",
            description: "通过pactl获取系统音量",
            parameters: {
                type: "object",
                properties: {
                    "device": {
                        type: "string",
                        description: "设备名称 不填则为@DEFAULT_SINK@"
                    }
                },
                required: [],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "sys_volume_pulse_get_devices",
            description: "获取pulseaudio设备列表",
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
            name: "sys_volume_alsa_set",
            description: "通过amixer设置系统主设备音量",
            parameters: {
                type: "object",
                properties: {
                    "volume": {
                        type: "integer",
                        description: "音量值 百分比 0-100"
                    }
                },
                required: ["volume"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: "sys_volume_pulse_set",
            description: "通过pactl设置系统音量",
            parameters: {
                type: "object",
                properties: {
                    "volume": {
                        type: "integer",
                        description: "音量值 百分比 0-100"
                    },
                    "device": {
                        type: "string",
                        description: "设备名称 不填则为@DEFAULT_SINK@"
                    }
                },
                required: ["volume"],
                additionalProperties: false
            }
        }
    }
]

const handlers = {
    sys_volume_alsa_get: async () => {
        const res = await utils.exec("amixer get Master | grep -oP '\\d+%'");
        const sp = res.split("\n");
        return `左声道: ${sp[0]}\n右声道: ${sp[1]}`;
    },
    sys_volume_pulse_get: async ({ device }) => {
        const res = await utils.exec(`pactl get-sink-volume ${JSON.stringify(device) || "@DEFAULT_SINK@"} | grep -oP '\\d+%'`);
        const sp = res.split("\n");
        return `左声道: ${sp[0]}\n右声道: ${sp[1]}`;
    },
    sys_volume_pulse_get_devices: async () => { 
        const res = await utils.exec("pactl list sinks | grep -A 9 'Sink '");
        const devices = res.split("--\n");
        return JSON.stringify(devices.map(device => {
            const id = device.match(/Sink #(\d+)/)[1];
            const name = device.match(/Name: (.*)/)[1];
            const description = device.match(/Description: (.*)/)[1];
            const volume = device.match(/Volume: (.*)/)[1];
            const state = device.match(/State: (.*)/)[1];
            return {
                id,
                name,
                description,
                volume,
                state
            }
        }))
    },
    sys_volume_alsa_set: async ({ volume }) => {
        if (volume < 0 || volume > 100) {
            throw new Error("音量值必须在0-100之间");
        }
        const res = await utils.exec(`amixer set Master ${volume}%`);
        return `音量已设置为 ${volume}%`;
    },
    sys_volume_pulse_set: async ({ volume, device }) => {
        if (volume < 0 || volume > 100) {
            throw new Error("音量值必须在0-100之间");
        }
        const res = await utils.exec(`pactl set-sink-volume ${JSON.stringify(device) || "@DEFAULT_SINK@"} ${volume}%`);
        return `设备 ${device || "@DEFAULT_SINK@"} 音量已设置为 ${volume}%`;
    }
}

module.exports = { definitions, handlers };