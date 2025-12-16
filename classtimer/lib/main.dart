import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:async';

void main() {
  runApp(const ClassTimerApp());
}

class ClassTimerApp extends StatelessWidget {
  const ClassTimerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ClassTimer',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
          elevation: 0,
        ),
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentScreen = 0;
  Map<String, dynamic>? _scheduleData;
  int _offset = 0;
  String _statusText = '下一节课';
  String _timeText = '--:--';
  String _lessonName = '--';
  bool _noClass = false;
  Timer? _updateTimer;
  String _importMethod = 'file';
  String _scheduleText = '';
  int _suggestedOffset = 0;
  String _nearestTargetText = '—';

  @override
  void initState() {
    super.initState();
    _loadSavedData();
    _startUpdateInterval();
  }

  @override
  void dispose() {
    _stopUpdateInterval();
    super.dispose();
  }

  void _loadSavedData() async {
    final prefs = await SharedPreferences.getInstance();
    final savedSchedule = prefs.getString('classSchedule');
    if (savedSchedule != null) {
      try {
        _scheduleData = json.decode(savedSchedule);
        _scheduleText = savedSchedule;
      } catch (e) {
        print('解析课表失败: $e');
      }
    }
    _offset = prefs.getInt('timeOffset') ?? 0;
    setState(() {});
    _updateStatus();
  }

  void _startUpdateInterval() {
    _stopUpdateInterval();
    _updateTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _updateStatus();
    });
    _updateStatus();
  }

  void _stopUpdateInterval() {
    _updateTimer?.cancel();
    _updateTimer = null;
  }

  String _formatHHMM(int seconds) {
    int h = seconds ~/ 3600;
    int m = (seconds % 3600) ~/ 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
  }

  void _updateStatus() {
    if (_scheduleData == null) {
      setState(() {
        _statusText = '下一节课';
        _timeText = '--:--';
        _lessonName = '未导入课表';
        _noClass = true;
        _suggestedOffset = 0;
        _nearestTargetText = '—';
      });
      return;
    }

    final now = DateTime.now();
    int currentDay = now.weekday == 7 ? 1 : now.weekday + 1; // 转换为1-7
    int currentTime = now.hour * 3600 + now.minute * 60 + now.second;

    int? nearestEventTime;
    String? nearestEventName;
    String? nearestEventType;
    int? nearestOriginalTime;
    
    int? nearestOriginalForCalc;
    
    if (_scheduleData!['schedule'] is List) {
      for (var daySchedule in _scheduleData!['schedule']) {
        if (daySchedule['day'] == currentDay && daySchedule['classes'] is List) {
          for (var cls in daySchedule['classes']) {
            final startParts = (cls['start'] as String).split(':');
            final endParts = (cls['end'] as String).split(':');
            
            int startOrig = int.parse(startParts[0]) * 3600 + int.parse(startParts[1]) * 60;
            int endOrig = int.parse(endParts[0]) * 3600 + int.parse(endParts[1]) * 60;
            
            int startTime = startOrig - _offset;
            int endTime = endOrig - _offset;

            // 检查开始时间
            if (startTime > currentTime) {
              int diff = startTime - currentTime;
              if (nearestEventTime == null || diff < (nearestEventTime! - currentTime)) {
                nearestEventTime = startTime;
                nearestEventName = cls['name'];
                nearestEventType = 'start';
                nearestOriginalTime = startOrig;
              }
            }

            // 检查结束时间
            if (endTime > currentTime) {
              int diff = endTime - currentTime;
              if (nearestEventTime == null || diff < (nearestEventTime! - currentTime)) {
                nearestEventTime = endTime;
                nearestEventName = cls['name'];
                nearestEventType = 'end';
                nearestOriginalTime = endOrig;
              }
            }

            // 计算原始时间用于偏移计算器
            if (startOrig > currentTime) {
              if (nearestOriginalForCalc == null || startOrig - currentTime < (nearestOriginalForCalc - currentTime)) {
                nearestOriginalForCalc = startOrig;
              }
            }
            if (endOrig > currentTime) {
              if (nearestOriginalForCalc == null || endOrig - currentTime < (nearestOriginalForCalc - currentTime)) {
                nearestOriginalForCalc = endOrig;
              }
            }
          }
        }
      }
    }

    setState(() {
      if (nearestEventName != null) {
        _statusText = nearestEventType == 'start' ? '距离上课' : '距离下课';
        _lessonName = nearestEventName!;
        _noClass = false;
        
        int diff = nearestEventTime! - currentTime;
        if (diff <= 120) {
          _timeText = '${diff}秒';
        } else {
          int minutes = diff ~/ 60;
          int seconds = diff % 60;
          _timeText = '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
        }

        if (nearestOriginalForCalc != null) {
          _suggestedOffset = nearestOriginalForCalc! - currentTime;
          _nearestTargetText = '${nearestEventType == 'start' ? '上课' : '下课'} ${_formatHHMM(nearestOriginalForCalc!)} $nearestEventName';
        }
      } else {
        _statusText = '今日课程';
        _timeText = '--:--';
        _lessonName = '已结束';
        _noClass = true;
        _suggestedOffset = 0;
        _nearestTargetText = '—';
      }
    });
  }

  void _onSwiperChange(int index) {
    setState(() {
      _currentScreen = index;
    });
    if (index == 0) {
      _updateStatus();
    }
  }

  void _switchImportMethod(String method) {
    setState(() {
      _importMethod = method;
    });
  }

  bool _validateSchedule(Map<String, dynamic> data) {
    if (!data.containsKey('schedule') || data['schedule'] is! List) {
      return false;
    }
    
    for (var daySchedule in data['schedule']) {
      if (daySchedule['day'] is! int || 
          daySchedule['day'] < 1 || 
          daySchedule['day'] > 7 ||
          daySchedule['classes'] is! List) {
        return false;
      }
      
      for (var cls in daySchedule['classes']) {
        if (cls['name'] == null || 
            cls['start'] == null || 
            cls['end'] == null) {
          return false;
        }
      }
    }
    return true;
  }

  void _saveScheduleData(Map<String, dynamic> data) async {
    _scheduleData = data;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('classSchedule', json.encode(data));
    _updateStatus();
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('导入成功')),
    );
  }

  void _handleFileUpload(String content) {
    try {
      final data = json.decode(content);
      if (_validateSchedule(data)) {
        _saveScheduleData(data);
      } else {
        _showError('格式不正确');
      }
    } catch (e) {
      _showError('解析失败: $e');
    }
  }

  void _handleTextSubmit() {
    try {
      final data = json.decode(_scheduleText);
      if (_validateSchedule(data)) {
        _saveScheduleData(data);
      } else {
        _showError('格式不正确');
      }
    } catch (e) {
      _showError('解析失败: $e');
    }
  }

  void _showError(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('错误'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  void _onOffsetInput(String value) {
    final v = int.tryParse(value) ?? 0;
    if (v != _offset) {
      setState(() {
        _offset = v;
      });
      _updateOffset(v);
      _updateStatus();
    }
  }

  void _updateOffset(int offset) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('timeOffset', offset);
  }

  void _handleFillOffset() {
    _onOffsetInput(_suggestedOffset.toString());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: PageView(
              onPageChanged: _onSwiperChange,
              children: [
                // 主屏
                Container(
                  color: Colors.black,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _statusText,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _timeText,
                          style: TextStyle(
                            fontSize: _timeText.contains('秒') ? 48 : 72,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 40),
                        Text(
                          _lessonName,
                          style: TextStyle(
                            fontSize: 24,
                            color: _noClass ? Colors.grey : Colors.white,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                
                // 设置屏
                Container(
                  color: Colors.black,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '导入课表',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        // 导入方法切换
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => _switchImportMethod('file'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _importMethod == 'file' ? Colors.blue : Colors.grey[800],
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('文件导入'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => _switchImportMethod('text'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _importMethod == 'text' ? Colors.blue : Colors.grey[800],
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text('文本输入'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        
                        if (_importMethod == 'file') ...[
                          const Text(
                            '请选择JSON文件：',
                            style: TextStyle(fontSize: 16),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: () async {
                              // 这里需要实现文件选择功能
                              showDialog(
                                context: context,
                                builder: (context) => AlertDialog(
                                  title: const Text('提示'),
                                  content: const Text('请使用"文本输入"方式复制粘贴JSON数据'),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.of(context).pop(),
                                      child: const Text('确定'),
                                    ),
                                  ],
                                ),
                              );
                            },
                            child: const Text('选择文件'),
                          ),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.grey[800],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              '''{\n  "schedule": [\n    {\n      "day": 1,\n      "classes": [\n        {"name": "数学", "start": "08:00", "end": "08:45"},\n        {"name": "语文", "start": "09:00", "end": "09:45"}\n      ]\n    }\n  ]\n}''',
                              style: TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ] else ...[
                          TextField(
                            controller: TextEditingController(text: _scheduleText),
                            onChanged: (value) => _scheduleText = value,
                            maxLines: 10,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 14,
                            ),
                            decoration: const InputDecoration(
                              hintText: '请粘贴JSON格式的课表...',
                              border: OutlineInputBorder(),
                              filled: true,
                              fillColor: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _handleTextSubmit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('提交课表'),
                          ),
                        ],
                        
                        const SizedBox(height: 24),
                        
                        // 时间偏移设置
                        const Text(
                          '时间偏移设置',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            const Text('铃声提前/延后：'),
                            Expanded(
                              child: TextField(
                                keyboardType: TextInputType.number,
                                controller: TextEditingController(text: _offset.toString()),
                                onChanged: _onOffsetInput,
                                decoration: const InputDecoration(
                                  suffixText: '秒',
                                  border: OutlineInputBorder(),
                                  filled: true,
                                  fillColor: Colors.grey,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Text(
                          '(正数表示提前响铃，负数表示延后)',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                        
                        const SizedBox(height: 24),
                        
                        // 时间偏移计算器
                        const Text(
                          '时间偏移计算器',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text('建议偏移：$_suggestedOffset 秒'),
                        Text('最近课表时间：$_nearestTargetText'),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: _handleFillOffset,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('填写'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}