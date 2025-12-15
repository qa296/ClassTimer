import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';

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

export default function SettingsScreen() {
  const [scheduleText, setScheduleText] = useState('');
  const [offset, setOffset] = useState('0');
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [suggestedOffset, setSuggestedOffset] = useState(0);
  const [nearestTargetText, setNearestTargetText] = useState('—');

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
      if (savedOffset) {
        setOffset(savedOffset);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
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

  const saveScheduleData = async (data: ScheduleData) => {
    try {
      await AsyncStorage.setItem('classSchedule', JSON.stringify(data));
      setScheduleData(data);
      Alert.alert('成功', '课表导入成功！');
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };

  const handleTextSubmit = () => {
    try {
      const data = JSON.parse(scheduleText);
      if (validateSchedule(data)) {
        saveScheduleData(data);
      } else {
        Alert.alert('错误', 'JSON格式不正确');
      }
    } catch (err) {
      Alert.alert('解析失败', String(err?.message || err));
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        multiple: false,
      });

      if (result.assets && result.assets[0]) {
        const response = await fetch(result.assets[0].uri);
        const content = await response.text();
        const data = JSON.parse(content);
        if (validateSchedule(data)) {
          setScheduleText(JSON.stringify(data, null, 2));
          saveScheduleData(data);
        } else {
          Alert.alert('错误', 'JSON格式不正确');
        }
      }
    } catch (error) {
      Alert.alert('错误', '读取文件失败');
    }
  };

  const handleOffsetChange = async (text: string) => {
    setOffset(text);
    try {
      await AsyncStorage.setItem('timeOffset', text);
    } catch (error) {
      console.error('Error saving offset:', error);
    }
  };

  const handleFillOffset = () => {
    setOffset(suggestedOffset.toString());
    AsyncStorage.setItem('timeOffset', suggestedOffset.toString());
  };

  const calculateSuggestedOffset = () => {
    if (!scheduleData) return;

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    let nearestEvent = null;
    let minDiff = Infinity;

    for (const daySchedule of scheduleData.schedule) {
      if (daySchedule.day === currentDay) {
        for (const cls of daySchedule.classes) {
          const [startH, startM] = cls.start.split(':').map(Number);
          const [endH, endM] = cls.end.split(':').map(Number);

          const startOrig = startH * 3600 + startM * 60;
          const endOrig = endH * 3600 + endM * 60;

          if (startOrig > currentTime && startOrig - currentTime < minDiff) {
            minDiff = startOrig - currentTime;
            nearestEvent = { name: cls.name, type: 'start', time: startOrig };
          }

          if (endOrig > currentTime && endOrig - currentTime < minDiff) {
            minDiff = endOrig - currentTime;
            nearestEvent = { name: cls.name, type: 'end', time: endOrig };
          }
        }
      }
    }

    if (nearestEvent) {
      const suggested = nearestEvent.time - currentTime;
      setSuggestedOffset(suggested);
      setNearestTargetText(`${nearestEvent.type === 'start' ? '上课' : '下课'} ${formatHHMM(nearestEvent.time)} ${nearestEvent.name}`);
    }
  };

  const formatHHMM = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  useEffect(() => {
    calculateSuggestedOffset();
  }, [scheduleData]);

  const handleBack = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>导入课表</Text>

        <View style={styles.importSection}>
          <TouchableOpacity style={styles.fileButton} onPress={handleFileUpload}>
            <Text style={styles.fileButtonText}>选择文件导入</Text>
          </TouchableOpacity>

          <Text style={styles.label}>或手动输入JSON:</Text>
          <TextInput
            style={styles.textInput}
            value={scheduleText}
            onChangeText={setScheduleText}
            placeholder="请粘贴JSON格式的课表..."
            placeholderTextColor="#666666"
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
          
          <Text style={styles.exampleText}>示例格式:</Text>
          <Text style={styles.codeBlock}>{exampleJson}</Text>

          <TouchableOpacity style={styles.submitButton} onPress={handleTextSubmit}>
            <Text style={styles.submitButtonText}>提交课表</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        <Text style={styles.title}>时间偏移设置</Text>
        <View style={styles.offsetContainer}>
          <Text style={styles.offsetLabel}>铃声提前/延后：</Text>
          <TextInput
            style={styles.offsetInput}
            value={offset}
            onChangeText={handleOffsetChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#666666"
          />
          <Text style={styles.offsetUnit}>秒</Text>
        </View>
        <Text style={styles.desc}>(正数表示提前响铃，负数表示延后)</Text>

        <View style={styles.separator} />

        <Text style={styles.title}>时间偏移计算器</Text>
        <View style={styles.calculatorContainer}>
          <Text style={styles.calculatorText}>
            建议偏移：<Text style={styles.strong}>{suggestedOffset}</Text> 秒
          </Text>
          <Text style={styles.hint}>最近课表时间：{nearestTargetText}</Text>
          <TouchableOpacity style={styles.fillButton} onPress={handleFillOffset}>
            <Text style={styles.fillButtonText}>填写</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  importSection: {
    marginBottom: 30,
  },
  fileButton: {
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  fileButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#222222',
    color: '#ffffff',
    padding: 15,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 200,
  },
  exampleText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 15,
    marginBottom: 5,
  },
  codeBlock: {
    backgroundColor: '#222222',
    color: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 30,
  },
  offsetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  offsetLabel: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  offsetInput: {
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 8,
    borderRadius: 8,
    width: 80,
    textAlign: 'right',
    fontSize: 16,
  },
  offsetUnit: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 10,
  },
  desc: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 20,
  },
  calculatorContainer: {
    alignItems: 'center',
  },
  calculatorText: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 10,
  },
  strong: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  hint: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  fillButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    width: 100,
  },
  fillButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
  },
  backButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 18,
  },
});