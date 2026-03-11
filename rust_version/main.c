/*
 * ClassTimer - 等下课
 * C语言实现的课程提醒应用
 * 支持Android平台（通过JNI或Termux）
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define MAX_CLASSES 20
#define MAX_DAYS 7
#define CONFIG_FILE "schedule.json"
#define OFFSET_FILE "offset.txt"

// 课程结构体
typedef struct {
    char name[64];
    char start[6];  // HH:MM
    char end[6];    // HH:MM
} Class;

// 每日课程表
typedef struct {
    int day;  // 1-7, 1=周一
    Class classes[MAX_CLASSES];
    int class_count;
} DaySchedule;

// 完整课表
typedef struct {
    DaySchedule days[MAX_DAYS];
    int day_count;
} Schedule;

// 全局变量
Schedule g_schedule = {0};
int g_offset = 0;

// 函数声明
void clear_screen();
void print_menu();
int load_offset();
void save_offset(int offset);
int load_schedule(const char* filename);
void save_schedule(const char* filename);
void show_countdown();
void import_schedule();
int validate_time(const char* time_str);
void parse_time(const char* time_str, int* hour, int* minute);
int time_to_seconds(int hour, int minute);
void print_help();

// 清屏函数
void clear_screen() {
    #ifdef _WIN32
        system("cls");
    #else
        system("clear");
    #endif
}

// 加载偏移设置
int load_offset() {
    FILE* fp = fopen(OFFSET_FILE, "r");
    if (fp) {
        int offset = 0;
        fscanf(fp, "%d", &offset);
        fclose(fp);
        return offset;
    }
    return 0;
}

// 保存偏移设置
void save_offset(int offset) {
    FILE* fp = fopen(OFFSET_FILE, "w");
    if (fp) {
        fprintf(fp, "%d", offset);
        fclose(fp);
    }
}

// 简单JSON解析（简化版）
int parse_json_schedule(const char* json) {
    // 简化的JSON解析 - 实际应用中应使用完整JSON库
    // 这里使用字符串查找方式
    g_schedule.day_count = 0;
    
    // 查找 schedule 数组
    const char* schedule_start = strstr(json, "\"schedule\"");
    if (!schedule_start) return 0;
    
    const char* ptr = schedule_start;
    int day_idx = 0;
    
    while ((ptr = strstr(ptr, "\"day\"")) != NULL && day_idx < MAX_DAYS) {
        ptr += 5;
        int day;
        sscanf(ptr, "%*[^0-9]%d", &day);
        g_schedule.days[day_idx].day = day;
        g_schedule.days[day_idx].class_count = 0;
        
        // 解析当天的课程
        const char* classes_start = strstr(ptr, "\"classes\"");
        if (classes_start) {
            const char* class_ptr = classes_start;
            int class_idx = 0;
            
            while ((class_ptr = strstr(class_ptr, "\"name\"")) != NULL && class_idx < MAX_CLASSES) {
                // 检查是否还在当前day范围内
                const char* next_day = strstr(class_ptr + 1, "\"day\"");
                if (next_day) {
                    const char* classes_end = strstr(class_ptr, "]");
                    if (classes_end && next_day < classes_end) break;
                }
                
                class_ptr += 7;
                // 跳过冒号和引号
                while (*class_ptr && (*class_ptr == ':' || *class_ptr == ' ' || *class_ptr == '"')) class_ptr++;
                
                // 读取课程名
                int name_len = 0;
                while (class_ptr[name_len] && class_ptr[name_len] != '"' && name_len < 63) {
                    g_schedule.days[day_idx].classes[class_idx].name[name_len] = class_ptr[name_len];
                    name_len++;
                }
                g_schedule.days[day_idx].classes[class_idx].name[name_len] = '\0';
                
                // 解析开始时间
                const char* start_ptr = strstr(class_ptr, "\"start\"");
                if (start_ptr) {
                    start_ptr += 8;
                    while (*start_ptr && (*start_ptr == ':' || *start_ptr == ' ' || *start_ptr == '"')) start_ptr++;
                    sscanf(start_ptr, "%5[^\"]", g_schedule.days[day_idx].classes[class_idx].start);
                }
                
                // 解析结束时间
                const char* end_ptr = strstr(class_ptr, "\"end\"");
                if (end_ptr) {
                    end_ptr += 6;
                    while (*end_ptr && (*end_ptr == ':' || *end_ptr == ' ' || *end_ptr == '"')) end_ptr++;
                    sscanf(end_ptr, "%5[^\"]", g_schedule.days[day_idx].classes[class_idx].end);
                }
                
                class_idx++;
                g_schedule.days[day_idx].class_count = class_idx;
            }
        }
        
        day_idx++;
        g_schedule.day_count = day_idx;
    }
    
    return g_schedule.day_count > 0;
}

// 加载课表
int load_schedule(const char* filename) {
    FILE* fp = fopen(filename, "r");
    if (!fp) return 0;
    
    fseek(fp, 0, SEEK_END);
    long size = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    
    char* buffer = (char*)malloc(size + 1);
    if (!buffer) {
        fclose(fp);
        return 0;
    }
    
    fread(buffer, 1, size, fp);
    buffer[size] = '\0';
    fclose(fp);
    
    int result = parse_json_schedule(buffer);
    free(buffer);
    return result;
}

// 保存课表
void save_schedule(const char* filename) {
    FILE* fp = fopen(filename, "w");
    if (!fp) return;
    
    fprintf(fp, "{\n  \"schedule\": [\n");
    for (int i = 0; i < g_schedule.day_count; i++) {
        fprintf(fp, "    {\n      \"day\": %d,\n      \"classes\": [\n", g_schedule.days[i].day);
        for (int j = 0; j < g_schedule.days[i].class_count; j++) {
            Class* c = &g_schedule.days[i].classes[j];
            fprintf(fp, "        {\"name\": \"%s\", \"start\": \"%s\", \"end\": \"%s\"}%s\n",
                   c->name, c->start, c->end,
                   j < g_schedule.days[i].class_count - 1 ? "," : "");
        }
        fprintf(fp, "      ]\n    }%s\n", i < g_schedule.day_count - 1 ? "," : "");
    }
    fprintf(fp, "  ]\n}\n");
    fclose(fp);
}

// 验证时间格式
int validate_time(const char* time_str) {
    int hour, minute;
    if (sscanf(time_str, "%d:%d", &hour, &minute) != 2) return 0;
    return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

// 时间转秒数
int time_to_seconds(int hour, int minute) {
    return hour * 3600 + minute * 60;
}

// 解析时间
void parse_time(const char* time_str, int* hour, int* minute) {
    sscanf(time_str, "%d:%d", hour, minute);
}

// 显示倒计时
void show_countdown() {
    if (g_schedule.day_count == 0) {
        printf("\n未导入课表，请先导入！\n");
        return;
    }
    
    time_t now = time(NULL);
    struct tm* tm_now = localtime(&now);
    
    int current_day = tm_now->tm_wday;
    if (current_day == 0) current_day = 7;  // 周日转为7
    
    int current_seconds = tm_now->tm_hour * 3600 + tm_now->tm_min * 60 + tm_now->tm_sec;
    
    printf("\n当前时间: %02d:%02d:%02d\n", tm_now->tm_hour, tm_now->tm_min, tm_now->tm_sec);
    printf("时间偏移: %d 秒\n", g_offset);
    printf("================================\n");
    
    int min_diff = 86400;  // 24小时
    const char* nearest_name = NULL;
    const char* nearest_type = NULL;
    int original_time = 0;
    int found = 0;
    
    for (int i = 0; i < g_schedule.day_count; i++) {
        if (g_schedule.days[i].day == current_day) {
            for (int j = 0; j < g_schedule.days[i].class_count; j++) {
                Class* c = &g_schedule.days[i].classes[j];
                
                int start_h, start_m, end_h, end_m;
                parse_time(c->start, &start_h, &start_m);
                parse_time(c->end, &end_h, &end_m);
                
                int start_sec = time_to_seconds(start_h, start_m) - g_offset;
                int end_sec = time_to_seconds(end_h, end_m) - g_offset;
                
                int start_diff = start_sec - current_seconds;
                int end_diff = end_sec - current_seconds;
                
                if (start_diff > 0 && start_diff < min_diff) {
                    min_diff = start_diff;
                    nearest_name = c->name;
                    nearest_type = "距离上课";
                    original_time = time_to_seconds(start_h, start_m);
                    found = 1;
                }
                
                if (end_diff > 0 && end_diff < min_diff) {
                    min_diff = end_diff;
                    nearest_name = c->name;
                    nearest_type = "距离下课";
                    original_time = time_to_seconds(end_h, end_m);
                    found = 1;
                }
            }
        }
    }
    
    if (found) {
        printf("%s\n", nearest_type);
        printf("课程: %s\n", nearest_name);
        
        if (min_diff <= 120) {
            printf("剩余: %d 秒\n", min_diff);
        } else {
            int minutes = min_diff / 60;
            int seconds = min_diff % 60;
            printf("剩余: %02d:%02d\n", minutes, seconds);
        }
        
        int suggested_offset = original_time - current_seconds;
        printf("建议偏移: %d 秒\n", suggested_offset);
    } else {
        printf("今日课程已结束\n");
    }
    
    printf("================================\n");
}

// 导入课表
void import_schedule() {
    printf("\n请输入课表JSON数据 (输入END结束):\n");
    printf("格式示例:\n");
    printf("{\n");
    printf("  \"schedule\": [\n");
    printf("    {\"day\": 1, \"classes\": [\n");
    printf("      {\"name\": \"数学\", \"start\": \"08:00\", \"end\": \"08:45\"}\n");
    printf("    ]}\n");
    printf("  ]\n");
    printf("}\n\n");
    
    char buffer[4096] = {0};
    char line[256];
    
    while (fgets(line, sizeof(line), stdin)) {
        if (strncmp(line, "END", 3) == 0) break;
        strcat(buffer, line);
    }
    
    if (parse_json_schedule(buffer)) {
        save_schedule(CONFIG_FILE);
        printf("课表导入成功！\n");
    } else {
        printf("课表解析失败，请检查格式！\n");
    }
}

// 设置偏移
void set_offset() {
    printf("\n请输入时间偏移（秒，正数表示提前响铃）: ");
    int new_offset;
    if (scanf("%d", &new_offset) == 1) {
        g_offset = new_offset;
        save_offset(g_offset);
        printf("时间偏移已设置为 %d 秒\n", g_offset);
    } else {
        printf("输入无效\n");
    }
    while (getchar() != '\n');  // 清空输入缓冲区
}

// 显示当前课表
void show_schedule() {
    if (g_schedule.day_count == 0) {
        printf("\n未导入课表！\n");
        return;
    }
    
    printf("\n当前课表:\n");
    for (int i = 0; i < g_schedule.day_count; i++) {
        printf("\n星期%d:\n", g_schedule.days[i].day);
        for (int j = 0; j < g_schedule.days[i].class_count; j++) {
            Class* c = &g_schedule.days[i].classes[j];
            printf("  %s: %s - %s\n", c->name, c->start, c->end);
        }
    }
}

// 打印菜单
void print_menu() {
    printf("\n");
    printf("╔══════════════════════════════╗\n");
    printf("║     课程提醒 - 等下课        ║\n");
    printf("╠══════════════════════════════╣\n");
    printf("║ 1. 查看倒计时                ║\n");
    printf("║ 2. 导入课表                  ║\n");
    printf("║ 3. 设置时间偏移              ║\n");
    printf("║ 4. 查看当前课表              ║\n");
    printf("║ 0. 退出                      ║\n");
    printf("╚══════════════════════════════╝\n");
    printf("请选择: ");
}

// 主函数
int main(int argc, char* argv[]) {
    // 加载保存的数据
    g_offset = load_offset();
    load_schedule(CONFIG_FILE);
    
    // 如果有命令行参数，直接显示倒计时
    if (argc > 1 && strcmp(argv[1], "--show") == 0) {
        show_countdown();
        return 0;
    }
    
    clear_screen();
    printf("课程提醒 - 等下课 v1.0\n");
    printf("快速启动课程倒计时工具\n");
    
    int running = 1;
    while (running) {
        print_menu();
        
        int choice;
        if (scanf("%d", &choice) != 1) {
            while (getchar() != '\n');
            continue;
        }
        while (getchar() != '\n');
        
        switch (choice) {
            case 1:
                show_countdown();
                break;
            case 2:
                import_schedule();
                break;
            case 3:
                set_offset();
                break;
            case 4:
                show_schedule();
                break;
            case 0:
                running = 0;
                printf("\n再见！\n");
                break;
            default:
                printf("\n无效选项，请重新输入\n");
        }
    }
    
    return 0;
}
