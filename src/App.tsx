import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 移除外部依赖，优化启动速度
import type { ScheduleData, NearestEvent } from './types/Schedule';

const { width, height } = Dimensions.get('window');

// 优化启动 - 移除启动屏幕，立即启动
const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusText, setStatusText] = useState('下一节课');
  const [timeText, setTimeText] = useState('--:--');
  const [lessonName, setLessonName] = useState('未导入课表');
  const [noClass, setNoClass] = useState(true);
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [scheduleText, setScheduleText] = useState('');
  const [suggestedOffset, setSuggestedOffset] = useState(0);
  const [nearestTargetText, setNearestTargetText] = useState('—');

  // 立即启动应用，无需等待
  useEffect(() => {
    loadSavedData();
    startUpdateInterval();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem('classSchedule');
      if (saved) {
        const data = JSON.parse(saved);
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
      await AsyncStorage.setItem('classSchedule', JSON.stringify(data));
      setScheduleData(data);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const saveOffset = async (newOffset: number) => {
    try {
      await AsyncStorage.setItem('timeOffset', String(newOffset));
      setOffset(newOffset);
    } catch (error) {
      console.error('保存偏移失败:', error);
    }
  };

  const validateSchedule = (data: any): data is ScheduleData => {
    if (!data || !Array.isArray(data.schedule)) return false;
    return data.schedule.every((daySchedule: any) =>
      typeof daySchedule.day === 'number' &&
      daySchedule.day >= 1 &&
      daySchedule.day <= 7 &&
      Array.isArray(daySchedule.classes) &&
      daySchedule.classes.every((cls: any) => cls && cls.name && cls.start && cls.end)
    );
  };

  const handleFileUpload = () => {
    Alert.alert(
      '文件导入',
      '请使用"文本输入"方式粘贴JSON课表数据',
      [{ text: '确定' }]
    );
  };

  const handleTextSubmit = async () => {
    try {
      const data = JSON.parse(scheduleText);
      if (validateSchedule(data)) {
        await saveScheduleData(data);
        Alert.alert('成功', '课表导入成功');
      } else {
        Alert.alert('错误', '课表格式不正确');
      }
    } catch (error) {
      Alert.alert('错误', 'JSON格式错误');
    }
  };

  const formatHHMM = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const updateStatus = useCallback(() => {
    if (!scheduleData) {
      setStatusText('下一节课');
      setTimeText('--:--');
      setLessonName('未导入课表');
      setNoClass(true);
      setSuggestedOffset(0);
      setNearestTargetText('—');
      return;
    }

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    let nearestEvent: NearestEvent | null = null;
    let minDiff = Infinity;
    let nearestOriginal: NearestEvent | null = null;
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
              originalTime: startOrig,
            };
          }

          if (endTime > currentTime && endTime - currentTime < minDiff) {
            minDiff = endTime - currentTime;
            nearestEvent = {
              name: cls.name,
              type: 'end',
              time: endTime,
              originalTime: endOrig,
            };
          }

          // 最近"课表时间"（不考虑偏移）
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
      setNearestTargetText(`${base.type === 'start' ? '上课' : '下课'} ${formatHHMM(base.time)} ${base.name}`);
    } else {
      setStatusText('今日课程');
      setTimeText('--:--');
      setLessonName('已结束');
      setNoClass(true);
      setSuggestedOffset(0);
      setNearestTargetText('—');
    }
  }, [scheduleData, offset]);

  const startUpdateInterval = useCallback(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [updateStatus]);

  const handleFillOffset = async () => {
    await saveOffset(suggestedOffset);
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* 主要倒计时界面 */}
      <View style={styles.screen}>
        <Text style={styles.status}>{statusText}</Text>
        <Text style={styles.time}>{timeText}</Text>
        <Text style={[styles.lesson, noClass && styles.noClass]}>{lessonName}</Text>
      </View>

      {/* 导航切换 */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navBtn, currentScreen === 0 && styles.navBtnActive]}
          onPress={() => setCurrentScreen(0)}
        >
          <Text style={styles.navBtnText}>主界面</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, currentScreen === 1 && styles.navBtnActive]}
          onPress={() => setCurrentScreen(1)}
        >
          <Text style={styles.navBtnText}>设置</Text>
        </TouchableOpacity>
      </View>

      {/* 设置面板 */}
      {currentScreen === 1 && (
        <ScrollView style={styles.settingsPanel} contentContainerStyle={styles.settingsContent}>
          <Text style={styles.title}>导入课表</Text>

          {/* 导入方式选择 */}
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

          {/* 文件导入 */}
          {importMethod === 'file' && (
            <View style={styles.importContent}>
              <TouchableOpacity style={styles.fileUploadBtn} onPress={handleFileUpload}>
                <Text style={styles.fileUploadText}>选择JSON文件</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>支持格式: {"{"} "schedule": [...] {"}"}</Text>
              <Text style={styles.previewText}>{exampleJson}</Text>
            </View>
          )}

          {/* 文本输入 */}
          {importMethod === 'text' && (
            <View style={styles.importContent}>
              <TextInput
                style={styles.textInput}
                value={scheduleText}
                onChangeText={setScheduleText}
                placeholder="请粘贴JSON格式的课表..."
                placeholderTextColor="#888"
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleTextSubmit}>
                <Text style={styles.submitBtnText}>提交课表</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 时间偏移设置 */}
          <Text style={styles.title}>时间偏移设置</Text>
          <View style={styles.offsetContainer}>
            <Text style={styles.offsetLabel}>铃声提前/延后：</Text>
            <TextInput
              style={styles.offsetInput}
              value={offset.toString()}
              onChangeText={(value) => {
                const newOffset = parseInt(value) || 0;
                saveOffset(newOffset);
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#888"
            />
            <Text style={styles.offsetUnit}>秒</Text>
          </View>
          <Text style={styles.desc}>(正数表示提前响铃，负数表示延后)</Text>

          {/* 时间偏移计算器 */}
          <Text style={styles.title}>时间偏移计算器</Text>
          <View style={styles.calculatorContainer}>
            <Text style={styles.calculatorText}>
              建议偏移：<Text style={styles.strong}>{suggestedOffset}</Text> 秒
            </Text>
            <Text style={styles.hint}>最近课表时间：{nearestTargetText}</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={handleFillOffset}>
              <Text style={styles.submitBtnText}>填写</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  status: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 16,
  },
  time: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 40,
    letterSpacing: 2,
  },
  lesson: {
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'center',
  },
  noClass: {
    color: '#888888',
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: '#333333',
  },
  navBtn: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  navBtnActive: {
    backgroundColor: '#555555',
  },
  navBtnText: {
    color: '#ffffff',
    fontSize: 16,
  },
  settingsPanel: {
    maxHeight: height * 0.5,
    backgroundColor: '#111111',
  },
  settingsContent: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  importMethod: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    padding: 12,
    marginRight: 10,
    backgroundColor: '#333333',
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#555555',
  },
  tabBtnText: {
    color: '#ffffff',
    fontSize: 14,
  },
  importContent: {
    marginBottom: 20,
  },
  fileUploadBtn: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  fileUploadText: {
    color: '#ffffff',
    fontSize: 16,
  },
  textInput: {
    backgroundColor: '#222222',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    minHeight: 200,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 10,
  },
  previewText: {
    backgroundColor: '#222222',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
  },
  offsetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  offsetLabel: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  offsetInput: {
    width: 80,
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 8,
    borderRadius: 8,
    textAlign: 'right',
    marginHorizontal: 10,
  },
  offsetUnit: {
    color: '#ffffff',
    fontSize: 14,
  },
  desc: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 20,
  },
  calculatorContainer: {
    marginBottom: 20,
  },
  calculatorText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  strong: {
    color: '#4CAF50',
  },
});

export default App;