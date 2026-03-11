/*
 * ClassTimer - Native C Android App
 * This is a native Android application written in C that uses WebView
 * to display the ClassTimer interface.
 *
 * Building requires Android NDK:
 *   $NDK/ndk-build
 */

#include <android/log.h>
#include <android_native_app_glue.h>
#include <jni.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>

#define LOGI(...) ((void)__android_log_print(ANDROID_LOG_INFO, "ClassTimer", __VA_ARGS__))
#define LOGE(...) ((void)__android_log_print(ANDROID_LOG_ERROR, "ClassTimer", __VA_ARGS__))

/*
 * For a full native C Android app with WebView, we would use JNI to:
 * 1. Create a WebView
 * 2. Load the HTML/JS interface from assets
 * 3. Implement the ClassTimer logic in C
 *
 * However, for practical deployment, the APK uses a hybrid approach:
 * - Java/Kotlin for Android framework integration
 * - WebView for UI (based on the original HTML/JS code)
 * - LocalStorage for persistence
 *
 * This C implementation would be compiled with Android NDK as a native library.
 */

/* Time calculation utilities in C */
typedef struct {
    int day;           /* 1-7, Monday=1, Sunday=7 */
    int hour;          /* 0-23 */
    int minute;        /* 0-59 */
    int second;        /* 0-59 */
    int total_seconds; /* Seconds since midnight */
} ClassTime;

typedef struct {
    int day;
    char name[64];
    int start_sec;     /* Start time in seconds since midnight */
    int end_sec;       /* End time in seconds since midnight */
} ClassInfo;

typedef struct {
    ClassInfo classes[100];
    int count;
    int offset;        /* Time offset in seconds */
} Schedule;

/* Get current time info */
void get_current_time(ClassTime* time);

/* Calculate next class event */
int find_next_class(const Schedule* schedule, const ClassTime* now, 
                    ClassInfo* next_class, int* is_start, int* seconds_until);

/* Format time as HH:MM */
void format_hhmm(int seconds, char* buffer);

/* Format countdown */
void format_countdown(int seconds, char* buffer);

/* Load schedule from JSON file */
int load_schedule(const char* filename, Schedule* schedule);

/* Save schedule to JSON file */
int save_schedule(const char* filename, const Schedule* schedule);

/* JNI interface for Java to call these functions */
JNIEXPORT jstring JNICALL
Java_com_classtimer_app_NativeBridge_getCountdown(JNIEnv* env, jobject thiz);

JNIEXPORT jstring JNICALL  
Java_com_classtimer_app_NativeBridge_getStatus(JNIEnv* env, jobject thiz);

JNIEXPORT jint JNICALL
Java_com_classtimer_app_NativeBridge_getSuggestedOffset(JNIEnv* env, jobject thiz);

#ifdef __ANDROID__
/* Main entry point for native activity */
void android_main(struct android_app* state) {
    LOGI("ClassTimer native app started");
    
    /* In a full implementation, we would:
     * 1. Initialize native window
     * 2. Set up OpenGL/Vulkan rendering
     * 3. Render the UI directly
     * 
     * For this hybrid approach, the Java layer handles WebView setup
     * and calls native code for time calculations.
     */
    
    while (1) {
        struct android_poll_source* source;
        int ident;
        int events;
        
        while ((ident = ALooper_pollAll(0, NULL, &events, (void**)&source)) >= 0) {
            if (source != NULL) {
                source->process(state, source);
            }
            if (state->destroyRequested != 0) {
                LOGI("App exiting");
                return;
            }
        }
    }
}
#endif

/* Implementation stubs */
void get_current_time(ClassTime* time) {
    /* Get current local time */
    time_t t = time(NULL);
    struct tm* tm_info = localtime(&t);
    
    time->day = tm_info->tm_wday == 0 ? 7 : tm_info->tm_wday;
    time->hour = tm_info->tm_hour;
    time->minute = tm_info->tm_min;
    time->second = tm_info->tm_sec;
    time->total_seconds = time->hour * 3600 + time->minute * 60 + time->second;
}

void format_hhmm(int seconds, char* buffer) {
    int h = seconds / 3600;
    int m = (seconds % 3600) / 60;
    sprintf(buffer, "%02d:%02d", h, m);
}

void format_countdown(int seconds, char* buffer) {
    if (seconds <= 120) {
        sprintf(buffer, "%d秒", seconds);
    } else {
        int m = seconds / 60;
        int s = seconds % 60;
        sprintf(buffer, "%02d:%02d", m, s);
    }
}

JNIEXPORT jstring JNICALL
Java_com_classtimer_app_NativeBridge_getCountdown(JNIEnv* env, jobject thiz) {
    /* Native implementation would calculate countdown */
    return (*env)->NewStringUTF(env, "--:--");
}

JNIEXPORT jstring JNICALL  
Java_com_classtimer_app_NativeBridge_getStatus(JNIEnv* env, jobject thiz) {
    return (*env)->NewStringUTF(env, "下一节课");
}

JNIEXPORT jint JNICALL
Java_com_classtimer_app_NativeBridge_getSuggestedOffset(JNIEnv* env, jobject thiz) {
    return 0;
}
