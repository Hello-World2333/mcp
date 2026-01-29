__run() {
    echo -e "\033[36m==========\033[36mCOMMAND=START==========\033[0m";
    
    # 设置信号处理函数
    local original_traps=$(trap -p INT)
    trap '__echo_end; eval "$original_traps"; return 130' INT
    
    eval $1;
    
    # 恢复原始陷阱
    if [ -n "$original_traps" ]; then
        eval "$original_traps"
    else
        trap - INT
    fi
    
    __echo_end
}

# 添加辅助函数用于输出结束标志
__echo_end() {
    echo -e "\033[36m==========\033[36mCOMMAND=-END-==========\033[0m";
}

echo -e "\033[36m==========\033[36mLOADED==========\033[0m";