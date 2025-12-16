import React, { useState, useEffect, useCallback, useRef } from 'react'

interface Class {
  name: string
  start: string
  end: string
}

interface DaySchedule {
  day: number
  classes: Class[]
}

interface ScheduleData {
  schedule: DaySchedule[]
}

interface NearestEvent {
  name: string
  type: 'start' | 'end'
  time: number
  originalTime: number
}

function App() {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [offset, setOffset] = useState(0)
  const [statusText, setStatusText] = useState('下一节课')
  const [timeText, setTimeText] = useState('--:--')
  const [lessonName, setLessonName] = useState('--')
  const [noClass, setNoClass] = useState(false)
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file')
  const [scheduleText, setScheduleText] = useState('')
  const [suggestedOffset, setSuggestedOffset] = useState(0)
  const [nearestTargetText, setNearestTargetText] = useState('—')
  
  const updateTimer = useRef<number | null>(null)

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
}`

  const formatHHMM = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const loadSavedData = useCallback(() => {
    try {
      const saved = localStorage.getItem('classSchedule')
      if (saved) {
        const data = JSON.parse(saved)
        setScheduleData(data)
        setScheduleText(JSON.stringify(data, null, 2))
      }
    } catch (e) {
      console.error('解析课表失败:', e)
    }
    
    const savedOffset = localStorage.getItem('timeOffset')
    if (savedOffset !== null && savedOffset !== undefined) {
      setOffset(parseInt(savedOffset) || 0)
    }
  }, [])

  const saveScheduleData = (data: ScheduleData) => {
    setScheduleData(data)
    try {
      localStorage.setItem('classSchedule', JSON.stringify(data))
    } catch (e) {
      console.error('保存课表失败:', e)
    }
  }

  const validateSchedule = (data: any): data is ScheduleData => {
    if (!data || !Array.isArray(data.schedule)) return false
    return data.schedule.every((daySchedule: any) =>
      typeof daySchedule.day === 'number' &&
      daySchedule.day >= 1 &&
      daySchedule.day <= 7 &&
      Array.isArray(daySchedule.classes) &&
      daySchedule.classes.every((cls: any) => cls && cls.name && cls.start && cls.end)
    )
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !files[0]) {
      alert('未选择文件')
      return
    }
    
    const file = files[0]
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string
        const data = JSON.parse(content)
        if (validateSchedule(data)) {
          saveScheduleData(data)
          setScheduleText(JSON.stringify(data, null, 2))
          alert('导入成功')
        } else {
          alert('格式不正确')
        }
      } catch (err) {
        alert('解析失败: ' + (err as Error).message)
      }
    }
    reader.onerror = () => alert('读取失败')
    reader.readAsText(file)
  }

  const handleTextSubmit = () => {
    try {
      const data = JSON.parse(scheduleText)
      if (validateSchedule(data)) {
        saveScheduleData(data)
        alert('导入成功')
      } else {
        alert('格式不正确')
      }
    } catch (err) {
      alert('解析失败: ' + (err as Error).message)
    }
  }

  const onOffsetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value) || 0
    if (v !== offset) {
      setOffset(v)
      try {
        localStorage.setItem('timeOffset', String(v))
      } catch (e) {}
    }
  }

  const handleFillOffset = () => {
    setOffset(suggestedOffset)
    try {
      localStorage.setItem('timeOffset', String(suggestedOffset))
    } catch (e) {}
  }

  const updateStatus = useCallback(() => {
    if (!scheduleData) {
      setStatusText('下一节课')
      setTimeText('--:--')
      setLessonName('未导入课表')
      setNoClass(true)
      setSuggestedOffset(0)
      setNearestTargetText('—')
      return
    }

    const now = new Date()
    const currentDay = now.getDay() === 0 ? 7 : now.getDay()
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

    let nearestEvent: NearestEvent | null = null
    let minDiff = Infinity
    let nearestOriginal: NearestEvent | null = null
    let minOrigDiff = Infinity

    for (const daySchedule of scheduleData.schedule) {
      if (daySchedule.day === currentDay) {
        for (const cls of daySchedule.classes) {
          const [startH, startM] = cls.start.split(':').map(Number)
          const [endH, endM] = cls.end.split(':').map(Number)

          const startOrig = startH * 3600 + startM * 60
          const endOrig = endH * 3600 + endM * 60

          const startTime = startH * 3600 + startM * 60 - offset
          const endTime = endH * 3600 + endM * 60 - offset

          if (startTime > currentTime && startTime - currentTime < minDiff) {
            minDiff = startTime - currentTime
            nearestEvent = {
              name: cls.name,
              type: 'start',
              time: startTime,
              originalTime: startOrig
            }
          }

          if (endTime > currentTime && endTime - currentTime < minDiff) {
            minDiff = endTime - currentTime
            nearestEvent = {
              name: cls.name,
              type: 'end',
              time: endTime,
              originalTime: endOrig
            }
          }

          // 最近"课表时间"（不考虑偏移），用于时间偏移计算器
          if (startOrig > currentTime && startOrig - currentTime < minOrigDiff) {
            minOrigDiff = startOrig - currentTime
            nearestOriginal = { name: cls.name, type: 'start', time: startOrig, originalTime: startOrig }
          }
          if (endOrig > currentTime && endOrig - currentTime < minOrigDiff) {
            minOrigDiff = endOrig - currentTime
            nearestOriginal = { name: cls.name, type: 'end', time: endOrig, originalTime: endOrig }
          }
        }
      }
    }

    if (nearestEvent) {
      setStatusText(nearestEvent.type === 'start' ? '距离上课' : '距离下课')
      setLessonName(nearestEvent.name)
      setNoClass(false)

      if (minDiff <= 120) {
        setTimeText(`${minDiff}秒`)
      } else {
        const minutes = Math.floor(minDiff / 60)
        const seconds = minDiff % 60
        setTimeText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
      }

      const base = nearestOriginal || { name: nearestEvent.name, type: nearestEvent.type, time: nearestEvent.originalTime, originalTime: nearestEvent.originalTime }
      setSuggestedOffset(base.time - currentTime)
      setNearestTargetText(`${base.type === 'start' ? '上课' : '下课'} ${formatHHMM(base.time)} ${base.name}`)
    } else {
      setStatusText('今日课程')
      setTimeText('--:--')
      setLessonName('已结束')
      setNoClass(true)
      setSuggestedOffset(0)
      setNearestTargetText('—')
    }
  }, [scheduleData, offset])

  const stopUpdateInterval = useCallback(() => {
    if (updateTimer.current !== null) {
      clearInterval(updateTimer.current)
      updateTimer.current = null
    }
  }, [])

  const startUpdateInterval = useCallback(() => {
    stopUpdateInterval()
    updateTimer.current = window.setInterval(updateStatus, 1000)
    updateStatus()
  }, [updateStatus, stopUpdateInterval])

  useEffect(() => {
    loadSavedData()
  }, [loadSavedData])

  useEffect(() => {
    if (currentScreen === 0) {
      startUpdateInterval()
    } else {
      stopUpdateInterval()
    }
    
    return () => stopUpdateInterval()
  }, [currentScreen, startUpdateInterval, stopUpdateInterval])

  useEffect(() => {
    if (currentScreen === 0) {
      updateStatus()
    }
  }, [updateStatus, currentScreen])

  return (
    <div className="page">
      <div className="container">
        {/* 主屏 */}
        <div className="screen main-screen">
          <div className="status">{statusText}</div>
          <div className="time">{timeText}</div>
          <div className={`lesson ${noClass ? 'no-class' : ''}`}>{lessonName}</div>
          
          {/* 滑动提示 */}
          <div className="swipe-hint">← 左滑进入设置 →</div>
          
          {/* 页面指示器 */}
          <div className="tab-indicator">
            <div className={`tab-dot ${currentScreen === 0 ? 'active' : ''}`}></div>
            <div className={`tab-dot ${currentScreen === 1 ? 'active' : ''}`}></div>
          </div>
        </div>

        {/* 设置屏 */}
        <div className="screen settings-screen">
          <div className="title">导入课表</div>

          <div className="import-section">
            <div className="import-method">
              <button 
                className={`tab-btn ${importMethod === 'file' ? 'active' : ''}`}
                onClick={() => setImportMethod('file')}
              >
                文件导入
              </button>
              <button 
                className={`tab-btn ${importMethod === 'text' ? 'active' : ''}`}
                onClick={() => setImportMethod('text')}
              >
                文本输入
              </button>
            </div>

            {importMethod === 'file' ? (
              <div className="import-content">
                <input 
                  className="file-input" 
                  type="file" 
                  accept=".json,application/json" 
                  onChange={handleFileUpload} 
                />
                <div className="hint">若无法选择文件，请使用"文本输入"粘贴JSON</div>
                <div className="pre"><code>{exampleJson}</code></div>
              </div>
            ) : (
              <div className="import-content">
                <textarea 
                  className="text-input" 
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  placeholder="请粘贴JSON格式的课表..."
                />
                <button className="submit-btn" onClick={handleTextSubmit}>提交课表</button>
              </div>
            )}
          </div>

          <div className="title">时间偏移设置</div>
          <div className="offset-container">
            <span>铃声提前/延后：</span>
            <input 
              className="offset-input" 
              type="number" 
              value={offset} 
              onChange={onOffsetInput} 
            />
            <span>秒</span>
          </div>
          <div className="desc">(正数表示提前响铃，负数表示延后)</div>

          <div className="title">时间偏移计算器</div>
          <div className="calculator-container">
            <div>建议偏移：<span className="strong">{suggestedOffset}</span> 秒</div>
            <div className="hint">最近课表时间：{nearestTargetText}</div>
            <button className="submit-btn" onClick={handleFillOffset}>填写</button>
          </div>
          
          {/* 页面指示器 */}
          <div className="tab-indicator">
            <div className={`tab-dot ${currentScreen === 0 ? 'active' : ''}`}></div>
            <div className={`tab-dot ${currentScreen === 1 ? 'active' : ''}`}></div>
          </div>
        </div>
      </div>

      {/* 手势检测 */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1000,
          touchAction: 'pan-x'
        }}
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX
          let startY = e.touches[0].clientY
          
          const handleTouchEnd = (endEvent: TouchEvent) => {
            const endX = endEvent.changedTouches[0].clientX
            const endY = endEvent.changedTouches[0].clientY
            const deltaX = endX - startX
            const deltaY = endY - startY
            
            // 只处理水平滑动
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
              if (deltaX > 0 && currentScreen === 1) {
                setCurrentScreen(0) // 右滑，从设置页回到主页
              } else if (deltaX < 0 && currentScreen === 0) {
                setCurrentScreen(1) // 左滑，从主页进入设置页
              }
            }
            
            document.removeEventListener('touchend', handleTouchEnd)
          }
          
          document.addEventListener('touchend', handleTouchEnd)
        }}
      />
    </div>
  )
}

export default App
