import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface Class {
  name: string;
  start: string;
  end: string;
}

interface DaySchedule {
  day: number;
  classes: Class[];
}

interface ScheduleData {
  schedule: DaySchedule[];
}

export default function ClassTimer() {
  const translateX = useRef(new Animated.Value(0)).current;
  const [currentScreen, setCurrentScreen] = useState(0);
  const [statusText, setStatusText] = useState('下一节课');
  const [timeText, setTimeText] = useState('--:--');
  const [lessonName, setLessonName] = useState('--');
  const [noClass, setNoClass] = useState(false);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [offset, setOffset] = useState(0);
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [scheduleText, setScheduleText] = useState('');
  const [suggestedOffset, setSuggestedOffset] = useState(0);

  // 示例JSON
  const exampleJson = `{
  "schedule": [
    {
      "day": 1,
      "classes": [
        {"name": "数学", "start": "08:00", "end": "08:45"},
        {"name": "语文", "start": "09:00", "end": "09:45"}
      ]
    }
  ]
}`;

  useEffect(() => {
    loadSavedData();
    startUpdateInterval();
    return () => {
      stopUpdateInterval();
    };
  }, []);

  useEffect(() => {
    if (currentScreen === 0) {
      updateStatus();
    }
  }, [currentScreen, scheduleData, offset]);

  const startUpdateInterval = () => {
    const interval = setInterval(updateStatus, 1000);
    // Store interval ID for cleanup if needed
  };

  const stopUpdateInterval = () => {
    // Cleanup interval if needed
  };

  const loadSavedData = async () => {
    try {
      const savedSchedule = await AsyncStorage.getItem('classSchedule');
      if (savedSchedule) {
        const data = JSON.parse(savedSchedule);
        setScheduleData(data);
        setScheduleText(JSON.stringify(data, null, 2));
      }
      
      const savedOffset = await AsyncStorage.getItem('timeOffset');
      if (savedOffset !== null) {
        setOffset(parseInt(savedOffset) || 0);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const saveScheduleData = async (data: ScheduleData) => {
    try {
      setScheduleData(data);
      await AsyncStorage.setItem('classSchedule', JSON.stringify(data));
      setScheduleText(JSON.stringify(data, null, 2));
      Alert.alert('成功', '课表导入成功！');
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  };

  const validateSchedule = (data: any): data is ScheduleData => {
    if (!data || !Array.isArray(data.schedule)) return false;
    
    return data.schedule.every((daySchedule: any) =>
      typeof daySchedule.day === 'number' &&
      daySchedule.day >= 1 &&
      daySchedule.day <= 7 &&
      Array.isArray(daySchedule.classes) &&
      daySchedule.classes.every((cls: any) =>
        cls && cls.name && cls.start && cls.end
      )
    );
  };

  const handleTextSubmit = () => {
    try {
      const data = JSON.parse(scheduleText);
      if (validateSchedule(data)) {
        saveScheduleData(data);
      } else {
        Alert.alert('错误', '课表格式不正确');
      }
    } catch (error) {
      Alert.alert('错误', '解析失败: ' + (error as Error).message);
    }
  };

  const onOffsetInput = (value: string) => {
    const newOffset = parseInt(value) || 0;
    if (newOffset !== offset) {
      setOffset(newOffset);
      AsyncStorage.setItem('timeOffset', newOffset.toString());
    }
  };

  const handleFillOffset = () => {
    setOffset(suggestedOffset);
    AsyncStorage.setItem('timeOffset', suggestedOffset.toString());
  };

  const formatHHMM = (seconds: number): string => {
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
      setSuggestedOffset(0);
      return;
    }

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    let nearestEvent: any = null;
    let minDiff = Infinity;
    let nearestOriginal: any = null;
    let minOrigDiff = Infinity;

    for (const daySchedule of scheduleData.schedule) {
      if (daySchedule.day === currentDay) {
        for (const cls of daySchedule.classes) {
          const [startH, startM] = cls.start.split(':').map(Number);
          const [endH, endM] = cls.end.split(':').map(Number);

          const startOrig = startH * 3600 + startM * 60;
          const endOrig = endH * 3600 + endM * 60;

          const startTime = startH * 3600 + startM * 60 - offset;
          const endTime = endH * 3600 + endM * 60 - offset;

          if (startTime > currentTime && startTime - currentTime < minDiff) {
            minDiff = startTime - currentTime;
            nearestEvent = {
              name: cls.name,
              type: 'start',
              time: startTime,
              originalTime: startOrig
            };
          }

          if (endTime > currentTime && endTime - currentTime < minDiff) {
            minDiff = endTime - currentTime;
            nearestEvent = {
              name: cls.name,
              type: 'end',
              time: endTime,
              originalTime: endOrig
            };
          }

          // 最近"课表时间"（不考虑偏移），用于时间偏移计算器
          if (startOrig > currentTime && startOrig - currentTime < minOrigDiff) {
            minOrigDiff = startOrig - currentTime;
            nearestOriginal = { name: cls.name, type: 'start', time: startOrig };
          }
          if (endOrig > currentTime && endOrig - currentTime < minOrigDiff) {
            minOrigDiff = endOrig - currentTime;
            nearestOriginal = { name: cls.name, type: 'end', time: endOrig };
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

      const base = nearestOriginal || { name: nearestEvent.name, type: nearestEvent.type, time: nearestEvent.originalTime };
      setSuggestedOffset(base.time - currentTime);
    } else {
      setStatusText('今日课程');
      setTimeText('--:--');
      setLessonName('已结束');
      setNoClass(true);
      setSuggestedOffset(0);
    }
  };

  // PanResponder for gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only allow horizontal gestures
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        const currentX = currentScreen === 0 ? 0 : -screenWidth;
        const delta = gestureState.dx;
        const newPosition = currentX + delta;
        
        // Allow dragging but limit the range
        if ((currentScreen === 0 && delta < 0) || (currentScreen === 1 && delta > 0)) {
          translateX.setValue(newPosition);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 50;
        const swipeDistance = gestureState.dx;
        
        if (Math.abs(swipeDistance) > threshold) {
          if (swipeDistance > 0 && currentScreen === 1) {
            // 向右滑，从设置屏到主屏
            setCurrentScreen(0);
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          } else if (swipeDistance < 0 && currentScreen === 0) {
            // 向左滑，从主屏到设置屏
            setCurrentScreen(1);
            Animated.spring(translateX, {
              toValue: -screenWidth,
              useNativeDriver: true,
            }).start();
          } else {
            // 重置位置
            Animated.spring(translateX, {
              toValue: currentScreen === 0 ? 0 : -screenWidth,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // 重置位置
          Animated.spring(translateX, {
            toValue: currentScreen === 0 ? 0 : -screenWidth,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const switchToMainScreen = () => {
    setCurrentScreen(0);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const switchToSettingsScreen = () => {
    setCurrentScreen(1);
    Animated.spring(translateX, {
      toValue: -screenWidth,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
        {/* 主屏幕 */}
        <View style={styles.screen}>
          <View style={styles.mainScreen}>
            <Text style={styles.status}>{statusText}</Text>
            <Text style={styles.time}>{timeText}</Text>
            <Text style={[styles.lesson, noClass && styles.noClass]}>{lessonName}</Text>
            <TouchableOpacity style={styles.settingsButton} onPress={switchToSettingsScreen}>
              <Text style={styles.settingsButtonText}>设置</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 设置屏幕 */}
        <View style={styles.screen}>
          <ScrollView style={styles.settingsScreen}>
            <Text style={styles.title}>导入课表</Text>

            <View style={styles.importSection}>
              <View style={styles.importMethod}>
                <TouchableOpacity 
                  style={[styles.tabBtn, importMethod === 'file' && styles.tabBtnActive]}
                  onPress={() => setImportMethod('file')}
                >
                  <Text style={styles.tabBtnText}>文件导入</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabBtn, importMethod === 'text' && styles.tabBtnActive]}
                  onPress={() => setImportMethod('text')}
                >
                  <Text style={styles.tabBtnText}>文本输入</Text>
                </TouchableOpacity>
              </View>

              {importMethod === 'file' ? (
                <View style={styles.importContent}>
                  <Text style={styles.hint}>
                    请使用"文本输入"粘贴JSON（文件选择功能需要额外配置）
                  </Text>
                  <Text style={styles.exampleTitle}>格式示例：</Text>
                  <Text style={styles.exampleText}>{exampleJson}</Text>
                </View>
              ) : (
                <View style={styles.importContent}>
                  <TextInput
                    style={styles.textInput}
                    value={scheduleText}
                    onChangeText={setScheduleText}
                    placeholder="请粘贴JSON格式的课表..."
                    placeholderTextColor="#888"
                    multiline
                    numberOfLines={10}
                  />
                  <TouchableOpacity style={styles.submitBtn} onPress={handleTextSubmit}>
                    <Text style={styles.submitBtnText}>提交课表</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={styles.title}>时间偏移设置</Text>
            <View style={styles.offsetContainer}>
              <Text style={styles.offsetLabel}>铃声提前/延后：</Text>
              <TextInput
                style={styles.offsetInput}
                value={offset.toString()}
                onChangeText={onOffsetInput}
                keyboardType="numeric"
              />
              <Text style={styles.offsetUnit}>秒</Text>
            </View>
            <Text style={styles.desc}>(正数表示提前响铃，负数表示延后)</Text>

            <Text style={styles.title}>时间偏移计算器</Text>
            <View style={styles.calculatorContainer}>
              <Text style={styles.calculatorText}>
                建议偏移：<Text style={styles.strong}>{suggestedOffset}</Text> 秒
              </Text>
              <TouchableOpacity style={styles.submitBtn} onPress={handleFillOffset}>
                <Text style={styles.submitBtnText}>填写</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={switchToMainScreen}>
              <Text style={styles.backButtonText}>返回主屏</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    width: screenWidth * 2,
  },
  screen: {
    width: screenWidth,
    height: '100%',
    padding: 24,
  },
  mainScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontSize: 32,
    marginBottom: 16,
    color: '#ffffff',
  },
  time: {
    fontSize: 80,
    fontWeight: 'bold',
    margin: 40,
    color: '#ffffff',
    letterSpacing: 2,
    lineHeight: 80,
  },
  lesson: {
    fontSize: 24,
    margin: 30,
    textAlign: 'center',
    color: '#ffffff',
  },
  noClass: {
    color: '#888888',
  },
  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    padding: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  settingsScreen: {
    flex: 1,
  },
  title: {
    margin: 24,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  importSection: {
    margin: 24,
  },
  importMethod: {
    marginBottom: 24,
    flexDirection: 'row',
  },
  tabBtn: {
    padding: 12,
    marginRight: 16,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#555555',
  },
  tabBtnText: {
    color: '#ffffff',
    fontSize: 16,
  },
  importContent: {
    margin: 16,
  },
  hint: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  exampleTitle: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  exampleText: {
    backgroundColor: '#222222',
    padding: 16,
    borderRadius: 10,
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  textInput: {
    width: '100%',
    height: 200,
    padding: 16,
    margin: 16,
    backgroundColor: '#222222',
    color: '#ffffff',
    borderRadius: 8,
    fontSize: 16,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  submitBtn: {
    padding: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
  },
  offsetContainer: {
    margin: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offsetLabel: {
    fontSize: 18,
    color: '#ffffff',
  },
  offsetInput: {
    width: 80,
    padding: 8,
    backgroundColor: '#333333',
    color: '#ffffff',
    borderRadius: 8,
    fontSize: 18,
    textAlign: 'center',
  },
  offsetUnit: {
    fontSize: 18,
    color: '#ffffff',
  },
  desc: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
  },
  calculatorContainer: {
    margin: 24,
  },
  calculatorText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
  },
  strong: {
    color: '#4CAF50',
  },
  backButton: {
    padding: 12,
    backgroundColor: '#555555',
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
});