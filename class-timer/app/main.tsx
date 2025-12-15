import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScheduleData {
  schedule: Array<{
    day: number;
    classes: Array<{
      name: string;
      start: string;
      end: string;
    }>;
  }>;
}

export default function MainScreen() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusText, setStatusText] = useState('下一节课');
  const [timeText, setTimeText] = useState('--:--');
  const [lessonName, setLessonName] = useState('未导入课表');
  const [noClass, setNoClass] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadSavedData();
    updateStatus();
    const timer = setInterval(updateStatus, 1000);
    
    // 添加闪烁效果
    const scaleTimer = setInterval(() => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, 60000); // 每分钟闪烁一次

    return () => {
      clearInterval(timer);
      clearInterval(scaleTimer);
    };
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem('classSchedule');
      if (saved) {
        setScheduleData(JSON.parse(saved));
      }
      const savedOffset = await AsyncStorage.getItem('timeOffset');
      if (savedOffset) {
        setOffset(parseInt(savedOffset) || 0);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const formatHHMM = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const updateStatus = () => {
    if (!scheduleData) {
      setStatusText('下一节课');
      setTimeText('--:--');
      setLessonName('未导入课表');
      setNoClass(true);
      return;
    }

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    let nearestEvent: any = null;
    let minDiff = Infinity;

    for (const daySchedule of scheduleData.schedule) {
      if (daySchedule.day === currentDay) {
        for (const cls of daySchedule.classes) {
          const [startH, startM] = cls.start.split(':').map(Number);
          const [endH, endM] = cls.end.split(':').map(Number);

          const startTime = startH * 3600 + startM * 60 - offset;
          const endTime = endH * 3600 + endM * 60 - offset;

          if (startTime > currentTime && startTime - currentTime < minDiff) {
            minDiff = startTime - currentTime;
            nearestEvent = {
              name: cls.name,
              type: 'start',
              time: startTime,
            };
          }

          if (endTime > currentTime && endTime - currentTime < minDiff) {
            minDiff = endTime - currentTime;
            nearestEvent = {
              name: cls.name,
              type: 'end',
              time: endTime,
            };
          }
        }
      }
    }

    if (nearestEvent) {
      setStatusText(nearestEvent.type === 'start' ? '距离上课' : '距离下课');
      setLessonName(nearestEvent.name);
      setNoClass(false);

      if (minDiff <= 120) {
        setTimeText(`${minDiff}秒`);
      } else {
        const minutes = Math.floor(minDiff / 60);
        const seconds = minDiff % 60;
        setTimeText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    } else {
      setStatusText('今日课程');
      setTimeText('--:--');
      setLessonName('已结束');
      setNoClass(true);
    }
  };

  const handleMainScreenTap = () => {
    router.push('/settings');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.screen} onPress={handleMainScreenTap} activeOpacity={1}>
        <Animated.View style={[styles.mainContent, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.status}>{statusText}</Text>
          <Text style={styles.time}>{timeText}</Text>
          <Text style={[styles.lesson, noClass && styles.noClass]}>{lessonName}</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainContent: {
    alignItems: 'center',
  },
  status: {
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 15,
    fontWeight: '300',
  },
  time: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 30,
    letterSpacing: 3,
    lineHeight: 100,
  },
  lesson: {
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 30,
    fontWeight: '400',
  },
  noClass: {
    color: '#666666',
  },
});