/*
 * ClassTimer Native - 等下课
 * 纯C语言原生实现 - 可在Linux测试和Android运行
 * 极速启动 < 1秒
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef ANDROID
#include <android/log.h>
#define LOG_TAG "ClassTimer"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#else
#define LOGI(...) printf(__VA_ARGS__)
#define LOGE(...) fprintf(stderr, __VA_ARGS__)
#endif

#define MAX_CLASSES 30
#define MAX_DAYS 7
#define CONFIG_FILE "schedule.json"
#define OFFSET_FILE "offset.txt"

typedef struct {
    char name[64];
    int start_hour;
    int start_min;
    int end_hour;
    int end_min;
} ClassInfo;

typedef struct {
    int day;
    ClassInfo classes[MAX_CLASSES];
    int count;
} DaySchedule;

typedef struct {
    DaySchedule days[MAX_DAYS];
    int day_count;
    int offset;
} Schedule;

static Schedule g_schedule = {0};

/* 快速JSON解析 - 完全自定义实现 */
static int parse_json(const char *json, Schedule *sched) {
    memset(sched, 0, sizeof(Schedule));
    
    const char *p = json;
    DaySchedule *curr_day = NULL;
    ClassInfo *curr_class = NULL;
    
    while (*p) {
        if (*p == '"') {
            p++;
            if (strncmp(p, "day", 3) == 0 && *(p+3) == '"') {
                p += 4;
                while (*p && *p != ':') p++;
                if (*p == ':') p++;
                while (*p && (*p < '0' || *p > '9')) p++;
                if (sched->day_count < MAX_DAYS) {
                    curr_day = &sched->days[sched->day_count++];
                    curr_day->day = atoi(p);
                    curr_day->count = 0;
                    curr_class = NULL;
                }
            }
            else if (strncmp(p, "name", 4) == 0 && *(p+4) == '"' && curr_day) {
                p += 5;
                while (*p && *p != ':') p++;
                if (*p == ':') p++;
                while (*p && *p != '"') p++;
                if (*p == '"') p++;
                int i = 0;
                while (*p && *p != '"' && i < 63 && curr_day->count < MAX_CLASSES) {
                    curr_class = &curr_day->classes[curr_day->count++];
                    curr_class->name[i++] = *p++;
                }
                if (curr_class) curr_class->name[i] = '\0';
            }
            else if (strncmp(p, "start", 5) == 0 && *(p+5) == '"' && curr_class) {
                p += 6;
                while (*p && *p != ':') p++;
                if (*p == ':') p++;
                while (*p && *p != '"') p++;
                if (*p == '"') {
                    p++;
                    curr_class->start_hour = (p[0] - '0') * 10 + (p[1] - '0');
                    curr_class->start_min = (p[3] - '0') * 10 + (p[4] - '0');
                }
            }
            else if (strncmp(p, "end", 3) == 0 && *(p+3) == '"' && curr_class) {
                p += 4;
                while (*p && *p != ':') p++;
                if (*p == ':') p++;
                while (*p && *p != '"') p++;
                if (*p == '"') {
                    p++;
                    curr_class->end_hour = (p[0] - '0') * 10 + (p[1] - '0');
                    curr_class->end_min = (p[3] - '0') * 10 + (p[4] - '0');
                }
            }
        }
        p++;
    }
    
    return sched->day_count > 0;
}

/* 时间转秒 */
static inline int to_seconds(int h, int m) {
    return h * 3600 + m * 60;
}

/* 获取当前时间 */
static void get_now(int *day, int *sec) {
    time_t t = time(NULL);
    struct tm *tm = localtime(&t);
    *day = tm->tm_wday;
    if (*day == 0) *day = 7;
    *sec = tm->tm_hour * 3600 + tm->tm_min * 60 + tm->tm_sec;
}

/* 查找下一个事件 */
static int find_next_event(int current_day, int current_sec, 
                           const char **name, const char **type, 
                           int *diff, int *suggested) {
    if (g_schedule.day_count == 0) return 0;
    
    int min_diff = 86400;
    ClassInfo *best = NULL;
    int is_start = 0;
    int target_sec = 0;
    
    for (int i = 0; i < g_schedule.day_count; i++) {
        DaySchedule *d = &g_schedule.days[i];
        if (d->day != current_day) continue;
        
        for (int j = 0; j < d->count; j++) {
            ClassInfo *c = &d->classes[j];
            
            int start = to_seconds(c->start_hour, c->start_min) - g_schedule.offset;
            int end = to_seconds(c->end_hour, c->end_min) - g_schedule.offset;
            
            int sd = start - current_sec;
            int ed = end - current_sec;
            
            if (sd > 0 && sd < min_diff) {
                min_diff = sd;
                best = c;
                is_start = 1;
                target_sec = start + g_schedule.offset;
            }
            if (ed > 0 && ed < min_diff) {
                min_diff = ed;
                best = c;
                is_start = 0;
                target_sec = end + g_schedule.offset;
            }
        }
    }
    
    if (best) {
        *name = best->name;
        *type = is_start ? "距离上课" : "距离下课";
        *diff = min_diff;
        *suggested = target_sec - current_sec;
        return 1;
    }
    return 0;
}

/* 显示倒计时 */
static void show_countdown(void) {
    int day, sec;
    get_now(&day, &sec);
    
    printf("\n=== 课程提醒 ===\n");
    printf("当前时间: %02d:%02d:%02d\n", sec/3600, (sec%3600)/60, sec%60);
    printf("偏移设置: %d秒\n", g_schedule.offset);
    
    const char *name, *type;
    int diff, suggested;
    
    if (find_next_event(day, sec, &name, &type, &diff, &suggested)) {
        printf("\n%s\n", type);
        printf("课程: %s\n", name);
        if (diff <= 120) {
            printf("剩余: %d秒\n", diff);
        } else {
            printf("剩余: %02d:%02d\n", diff/60, diff%60);
        }
        printf("建议偏移: %d秒\n", suggested);
    } else {
        printf("\n今日课程已结束\n");
    }
    printf("================\n");
}

/* 从文件加载 */
static int load_from_file(void) {
    FILE *fp = fopen(CONFIG_FILE, "r");
    if (!fp) return 0;
    
    fseek(fp, 0, SEEK_END);
    long sz = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    
    char *buf = malloc(sz + 1);
    if (!buf) {
        fclose(fp);
        return 0;
    }
    
    fread(buf, 1, sz, fp);
    buf[sz] = '\0';
    fclose(fp);
    
    int r = parse_json(buf, &g_schedule);
    free(buf);
    
    // 加载偏移
    fp = fopen(OFFSET_FILE, "r");
    if (fp) {
        fscanf(fp, "%d", &g_schedule.offset);
        fclose(fp);
    }
    
    return r;
}

/* 保存配置 */
static void save_config(const char *json, int offset) {
    FILE *fp = fopen(CONFIG_FILE, "w");
    if (fp) {
        fprintf(fp, "%s", json);
        fclose(fp);
    }
    g_schedule.offset = offset;
    fp = fopen(OFFSET_FILE, "w");
    if (fp) {
        fprintf(fp, "%d", offset);
        fclose(fp);
    }
}

/* 示例JSON */
static void print_sample(void) {
    printf("\n示例课表格式:\n");
    printf("{\n");
    printf("  \"schedule\": [\n");
    printf("    {\"day\": 1, \"classes\": [\n");
    printf("      {\"name\": \"数学\", \"start\": \"08:00\", \"end\": \"08:45\"}\n");
    printf("    ]}\n");
    printf("  ]\n");
    printf("}\n");
}

/* 交互式导入 */
static void import_schedule(void) {
    print_sample();
    printf("\n请输入JSON课表 (输入END结束):\n");
    
    char buf[4096] = {0};
    char line[256];
    
    while (fgets(line, sizeof(line), stdin)) {
        if (strncmp(line, "END", 3) == 0) break;
        strcat(buf, line);
    }
    
    if (parse_json(buf, &g_schedule)) {
        save_config(buf, g_schedule.offset);
        printf("课表导入成功!\n");
    } else {
        printf("解析失败，请检查格式\n");
    }
}

/* 设置偏移 */
static void set_offset(void) {
    printf("请输入时间偏移(秒，正数=提前): ");
    int off;
    if (scanf("%d", &off) == 1) {
        g_schedule.offset = off;
        FILE *fp = fopen(OFFSET_FILE, "w");
        if (fp) {
            fprintf(fp, "%d", off);
            fclose(fp);
        }
        printf("已设置偏移: %d秒\n", off);
    }
    while (getchar() != '\n');
}

/* 显示菜单 */
static void show_menu(void) {
    printf("\n");
    printf("╔══════════════════╗\n");
    printf("║    等下课 v1.0   ║\n");
    printf("╠══════════════════╣\n");
    printf("║ 1. 查看倒计时    ║\n");
    printf("║ 2. 导入课表      ║\n");
    printf("║ 3. 设置偏移      ║\n");
    printf("║ 0. 退出          ║\n");
    printf("╚══════════════════╝\n");
    printf("选择: ");
}

int main(int argc, char **argv) {
    printf("ClassTimer Native - 极速启动\n");
    
    load_from_file();
    
    if (argc > 1 && strcmp(argv[1], "--show") == 0) {
        show_countdown();
        return 0;
    }
    
    int running = 1;
    while (running) {
        show_menu();
        
        int choice;
        if (scanf("%d", &choice) != 1) {
            while (getchar() != '\n');
            continue;
        }
        while (getchar() != '\n');
        
        switch (choice) {
            case 1: show_countdown(); break;
            case 2: import_schedule(); break;
            case 3: set_offset(); break;
            case 0: running = 0; break;
            default: printf("无效选择\n");
        }
    }
    
    printf("再见!\n");
    return 0;
}
