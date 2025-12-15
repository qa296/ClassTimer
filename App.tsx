import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import PagerView from 'react-native-pager-view';

interface ClassSchedule {
  day: number;
  classes: Array<{
    name: string;
    start: string;
    end: string;
  }>;
}

interface ScheduleData {
  schedule: ClassSchedule[];
}

interface NextEvent {
  name: string;
  type: 'start' | 'end';
  time: number;
  originalTime: number;
}

// Main CountdownScreen Component
const CountdownScreen = ({ scheduleData, offset }: { scheduleData: ScheduleData | null; offset: number }) => {
  const [statusText, setStatusText] = useState('下一节课');
  const [timeText, setTimeText] = useState('--:--');
  const [lessonName, setLessonName] = useState('--');
  const [noClass, setNoClass] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatHHMM = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const updateStatus = useCallback(() => {
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

    let nearestEvent: NextEvent | null = null;
    let minDiff = Infinity;

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
  }, [scheduleData, offset]);

  useEffect(() => {
    updateStatus();
    updateTimerRef.current = setInterval(updateStatus, 1000);
    return () => {
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
    };
  }, [updateStatus]);

  return (
    <View style={styles.mainScreen}>
      <Text style={styles.status}>{statusText}</Text>
      <Text style={styles.time}>{timeText}</Text>
      <Text style={[styles.lesson, noClass && styles.noClass]}>{lessonName}</Text>
    </View>
  );
};

// Settings Screen Component
const SettingsScreen = ({
  scheduleData,
  setScheduleData,
  offset,
  setOffset,
}: {
  scheduleData: ScheduleData | null;
  setScheduleData: (data: ScheduleData) => void;
  offset: number;
  setOffset: (offset: number) => void;
}) => {
  const [importMethod, setImportMethod] = useState('file');
  const [scheduleText, setScheduleText] = useState('');
  const [suggestedOffset, setSuggestedOffset] = useState(0);
  const [nearestTargetText, setNearestTargetText] = useState('—');

  const formatHHMM = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const validateSchedule = (data: any): boolean => {
    if (!data || !Array.isArray(data.schedule)) return false;
    return data.schedule.every((daySchedule: any) =>
      typeof daySchedule.day === 'number' &&
      daySchedule.day >= 1 &&
      daySchedule.day <= 7 &&
      Array.isArray(daySchedule.classes) &&
      daySchedule.classes.every((cls: any) => cls && cls.name && cls.start && cls.end)
    );
  };

  const saveScheduleData = (data: ScheduleData) => {
    setScheduleData(data);
    AsyncStorage.setItem('classSchedule', JSON.stringify(data)).catch(console.error);
    setScheduleText(JSON.stringify(data, null, 2));
    calculateSuggestedOffset(data);
  };

  const calculateSuggestedOffset = (data: ScheduleData) => {
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    let nearestOriginal: any = null;
    let minOrigDiff = Infinity;

    for (const daySchedule of data.schedule) {
      if (daySchedule.day === currentDay) {
        for (const cls of daySchedule.classes) {
          const [startH, startM] = cls.start.split(':').map(Number);
          const [endH, endM] = cls.end.split(':').map(Number);

          const startOrig = startH * 3600 + startM * 60;
          const endOrig = endH * 3600 + endM * 60;

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

    if (nearestOriginal) {
      const suggested = nearestOriginal.time - currentTime;
      setSuggestedOffset(suggested);
      setNearestTargetText(`${nearestOriginal.type === 'start' ? '上课' : '下课'} ${formatHHMM(nearestOriginal.time)} ${nearestOriginal.name}`);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.type === 'success') {
        const fileContent = await FileSystem.readAsStringAsync(result.uri);
        const data = JSON.parse(fileContent);
        if (validateSchedule(data)) {
          saveScheduleData(data);
          Alert.alert('成功', '导入成功');
        } else {
          Alert.alert('错误', '格式不正确');
        }
      }
    } catch (err) {
      Alert.alert('错误', String(err));
    }
  };

  const handleTextSubmit = () => {
    try {
      const data = JSON.parse(scheduleText);
      if (validateSchedule(data)) {
        saveScheduleData(data);
        Alert.alert('成功', '导入成功');
      } else {
        Alert.alert('错误', '格式不正确');
      }
    } catch (err) {
      Alert.alert('错误', String(err));
    }
  };

  const handleOffsetChange = (value: string) => {
    const v = parseInt(value) || 0;
    setOffset(v);
    AsyncStorage.setItem('timeOffset', String(v)).catch(console.error);
  };

  const handleFillOffset = () => {
    handleOffsetChange(String(suggestedOffset));
  };

  useEffect(() => {
    if (scheduleData) {
      calculateSuggestedOffset(scheduleData);
    }
  }, [scheduleData]);

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
    <ScrollView style={styles.settingsScreen}>
      <Text style={styles.title}>导入课表</Text>

      <View style={styles.importSection}>
        <View style={styles.importMethod}>
          <TouchableOpacity
            style={[styles.tabBtn, importMethod === 'file' && styles.activeTab]}
            onPress={() => setImportMethod('file')}
          >
            <Text style={styles.tabBtnText}>文件导入</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, importMethod === 'text' && styles.activeTab]}
            onPress={() => setImportMethod('text')}
          >
            <Text style={styles.tabBtnText}>文本输入</Text>
          </TouchableOpacity>
        </View>

        {importMethod === 'file' ? (
          <View style={styles.importContent}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleFileUpload}>
              <Text style={styles.submitBtnText}>选择JSON文件</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>若无法选择文件，请使用"文本输入"粘贴JSON</Text>
            <View style={styles.pre}>
              <Text style={styles.preText}>{exampleJson}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.importContent}>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={8}
              value={scheduleText}
              onChangeText={setScheduleText}
              placeholder="请粘贴JSON格式的课表..."
              placeholderTextColor="#888"
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
          keyboardType="number-pad"
          value={String(offset)}
          onChangeText={handleOffsetChange}
        />
        <Text style={styles.offsetLabel}>秒</Text>
      </View>
      <Text style={styles.desc}>(正数表示提前响铃，负数表示延后)</Text>

      <Text style={styles.title}>时间偏移计算器</Text>
      <View style={styles.calculatorContainer}>
        <Text style={styles.calcText}>
          建议偏移：<Text style={styles.strong}>{suggestedOffset}</Text> 秒
        </Text>
        <Text style={styles.hint}>最近课表时间：{nearestTargetText}</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={handleFillOffset}>
          <Text style={styles.submitBtnText}>填写</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Main App Component
export default function App() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved data on app launch - INSTANT LAUNCH strategy
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const [savedSchedule, savedOffset] = await Promise.all([
          AsyncStorage.getItem('classSchedule'),
          AsyncStorage.getItem('timeOffset'),
        ]);

        if (savedSchedule) {
          setScheduleData(JSON.parse(savedSchedule));
        }
        if (savedOffset) {
          setOffset(parseInt(savedOffset) || 0);
        }
      } catch (e) {
        console.error('Error loading saved data:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
      >
        {/* Countdown Screen */}
        <View key="1">
          <CountdownScreen scheduleData={scheduleData} offset={offset} />
        </View>

        {/* Settings Screen */}
        <View key="2">
          <SettingsScreen
            scheduleData={scheduleData}
            setScheduleData={setScheduleData}
            offset={offset}
            setOffset={setOffset}
          />
        </View>
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pagerView: {
    flex: 1,
  },
  mainScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 24,
  },
  status: {
    fontSize: 48,
    color: '#ffffff',
    marginBottom: 16,
  },
  time: {
    fontSize: 120,
    fontWeight: '700',
    color: '#ffffff',
    marginVertical: 40,
    letterSpacing: 2,
    lineHeight: 1,
  },
  lesson: {
    fontSize: 48,
    color: '#ffffff',
    marginHorizontal: 30,
    textAlign: 'center',
  },
  noClass: {
    color: '#888888',
  },
  settingsScreen: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 24,
  },
  title: {
    marginVertical: 24,
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '600',
    color: '#ffffff',
  },
  importSection: {
    marginVertical: 24,
  },
  importMethod: {
    marginBottom: 24,
    flexDirection: 'row',
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 16,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#555555',
  },
  tabBtnText: {
    fontSize: 16,
    color: '#ffffff',
  },
  importContent: {
    marginVertical: 16,
  },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#888888',
    marginVertical: 8,
  },
  pre: {
    backgroundColor: '#222222',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 16,
  },
  preText: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  textInput: {
    width: '100%',
    height: 200,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#222222',
    color: '#ffffff',
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  offsetContainer: {
    marginVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offsetLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  offsetInput: {
    width: 100,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#333333',
    color: '#ffffff',
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'right',
  },
  desc: {
    fontSize: 12,
    color: '#888888',
  },
  calculatorContainer: {
    marginVertical: 24,
  },
  calcText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  strong: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});
