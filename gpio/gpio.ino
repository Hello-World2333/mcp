#include <string.h>
// 通义灵码写的
void setup() {
  Serial.begin(115200);
}

void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim(); // 移除末尾的换行符和空格
    
    // 解析输入格式 [Req ID].[Type].[Arg],[Arg]
    int firstDot = input.indexOf('.');
    int secondDot = input.indexOf('.', firstDot + 1);
    int comma = input.indexOf(',');
    
    if (firstDot == -1 || secondDot == -1) {
      return; // 格式错误，忽略
    }
    
    String reqID = input.substring(0, firstDot);
    String type = input.substring(firstDot + 1, secondDot);
    String arg1;
    String arg2;
    
    if (comma != -1) {
      arg1 = input.substring(secondDot + 1, comma);
      arg2 = input.substring(comma + 1);
    } else {
      arg1 = input.substring(secondDot + 1);
    }
    
    // 执行对应的操作
    String result = executeCommand(type, arg1, arg2);
    
    // 发送响应 [Res ID].[返回值]
    Serial.print(reqID);
    if (result.length() > 0) {
      Serial.print(".");
      Serial.print(result);
    }
    Serial.println();
  }
}

int parsePin(String pinStr) {
  if (pinStr.charAt(0) == 'D') {
    return pinStr.substring(1).toInt(); // D开头表示数字引脚
  } else if (pinStr.charAt(0) == 'A') {
    return A0 + pinStr.substring(1).toInt(); // A开头表示模拟引脚
  }
  return -1; // 无效引脚
}

bool parseBool(String boolStr) {
  return boolStr == "1" || boolStr == "true";
}

String executeCommand(String type, String arg1, String arg2) {
  if (type == "PM") { // 针脚模式
    int pin = parsePin(arg1);
    if (pin == -1) return "";
    
    bool mode = parseBool(arg2);
    pinMode(pin, mode ? OUTPUT : INPUT);
    return "";
  } 
  else if (type == "DW") { // 数字写入
    int pin = parsePin(arg1);
    if (pin == -1) return "";
    
    bool value = parseBool(arg2);
    digitalWrite(pin, value ? HIGH : LOW);
    return "";
  } 
  else if (type == "DR") { // 数字读取
    int pin = parsePin(arg1);
    if (pin == -1) return "";
    
    int value = digitalRead(pin);
    return value ? "1" : "0";
  } 
  else if (type == "AW") { // 模拟写入
    int pin = parsePin(arg1);
    if (pin == -1) return "";
    
    int value = arg2.toInt();
    analogWrite(pin, value);
    return "";
  } 
  else if (type == "AR") { // 模拟读取
    int pin = parsePin(arg1);
    if (pin == -1) return "";
    
    int value = analogRead(pin);
    return String(value);
  }
  else if (type == "GM") { // 获取针脚模式
    int pin = parsePin(arg1);
    if (pin == -1) return "";

    // 检查引脚方向寄存器，确定引脚模式
    // 数字引脚范围是0-19，根据引脚号确定对应的寄存器
    uint8_t bit = digitalPinToBitMask(pin);
    uint8_t port = digitalPinToPort(pin);
    volatile uint8_t *ddr = portModeRegister(port);

    // 如果位在DDR寄存器中被设置，则为输出模式，否则为输入模式
    if (*ddr & bit) {
        return "1";  // 输出模式
    } else {
        return "0";  // 输入模式
    }
  }
  
  return ""; // 未知命令
}