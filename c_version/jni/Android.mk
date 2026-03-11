LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE    := classtimer
LOCAL_SRC_FILES := classtimer.c
LOCAL_LDLIBS    := -llog
LOCAL_CFLAGS    := -O2 -Wall

include $(BUILD_EXECUTABLE)
