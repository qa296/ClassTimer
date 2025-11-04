<template>
  <view class="page">
    <swiper class="container" :current="currentScreen" :duration="300" :circular="false" @change="onSwiperChange">
      <!-- 主屏 -->
      <swiper-item>
        <view class="screen main-screen">
          <text class="status">{{ statusText }}</text>
          <text class="time">{{ timeText }}</text>
          <text class="lesson" :class="{'no-class': noClass}">{{ lessonName }}</text>
        </view>
      </swiper-item>

      <!-- 设置屏 -->
      <swiper-item>
        <scroll-view class="screen settings-screen" scroll-y="true">
          <text class="title">导入课表</text>

          <view class="import-section">
            <view class="import-method">
              <button class="tab-btn" :class="{active: importMethod==='file'}" @click="switchImportMethod('file')">文件导入</button>
              <button class="tab-btn" :class="{active: importMethod==='text'}" @click="switchImportMethod('text')">文本输入</button>
            </view>

            <view v-if="importMethod==='file'" class="import-content">
              <input class="file-input" type="file" accept=".json,application/json" @change="handleFileUpload" />
              <text class="hint">若无法选择文件，请使用“文本输入”粘贴JSON</text>
              <view class="pre"><text>{{ exampleJson }}</text></view>
            </view>

            <view v-else class="import-content">
              <textarea class="text-input" v-model="scheduleText" placeholder="请粘贴JSON格式的课表..."></textarea>
              <button class="submit-btn" @click="handleTextSubmit">提交课表</button>
            </view>
          </view>

          <text class="title">时间偏移设置</text>
          <view class="offset-container">
            <text>铃声提前/延后：</text>
            <input class="offset-input" type="number" :value="offset" @input="onOffsetInput" />
            <text>秒</text>
          </view>
          <text class="desc">(正数表示提前响铃，负数表示延后)</text>

          <text class="title">时间偏移计算器</text>
          <view class="calculator-container">
            <text>建议偏移：<text class="strong">{{ suggestedOffset }}</text> 秒</text>
            <text class="hint">最近课表时间：{{ nearestTargetText }}</text>
            <button class="submit-btn" @click="handleFillOffset">填写</button>
          </view>
        </scroll-view>
      </swiper-item>
    </swiper>
  </view>
</template>

<script>
export default {
  data() {
    return {
      currentScreen: 0,
      scheduleData: null,
      offset: 0,
      statusText: '下一节课',
      timeText: '--:--',
      lessonName: '--',
      noClass: false,
      updateTimer: null,
      importMethod: 'file',
      scheduleText: '',
      suggestedOffset: 0,
      nearestTargetText: '—',
      exampleJson: `{
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
    }
  },
  onLoad() {
    this.loadSavedData();
  },
  onShow() {
    this.startUpdateInterval();
  },
  onHide() {
    this.stopUpdateInterval();
  },
  onUnload() {
    this.stopUpdateInterval();
  },
  methods: {
    formatHHMM(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
    onSwiperChange(e) {
      this.currentScreen = e.detail.current || 0;
      if (this.currentScreen === 0) this.updateStatus();
    },
    loadSavedData() {
      try {
        const saved = uni.getStorageSync('classSchedule');
        if (saved) {
          this.scheduleData = typeof saved === 'string' ? JSON.parse(saved) : saved;
          this.scheduleText = JSON.stringify(this.scheduleData, null, 2);
        }
      } catch (e) {
        console.error('解析课表失败:', e);
      }
      const savedOffset = uni.getStorageSync('timeOffset');
      this.offset = savedOffset !== '' && savedOffset !== undefined ? parseInt(savedOffset) || 0 : 0;
    },
    switchImportMethod(method) {
      this.importMethod = method;
    },
    handleFileUpload(e) {
      const files = (e.target && e.target.files) || (e.detail && e.detail.files);
      if (!files || !files[0]) {
        uni.showToast({ title: '未选择文件', icon: 'none' });
        return;
      }
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target.result;
          const data = JSON.parse(content);
          if (this.validateSchedule(data)) {
            this.saveScheduleData(data);
            uni.showToast({ title: '导入成功', icon: 'success' });
          } else {
            uni.showToast({ title: '格式不正确', icon: 'none' });
          }
        } catch (err) {
          console.error('解析失败:', err);
          uni.showModal({ title: '解析失败', content: String(err?.message || err) });
        }
      };
      reader.onerror = () => uni.showToast({ title: '读取失败', icon: 'none' });
      reader.readAsText(file);
    },
    handleTextSubmit() {
      try {
        const data = JSON.parse(this.scheduleText);
        if (this.validateSchedule(data)) {
          this.saveScheduleData(data);
          uni.showToast({ title: '导入成功', icon: 'success' });
        } else {
          uni.showToast({ title: '格式不正确', icon: 'none' });
        }
      } catch (err) {
        uni.showModal({ title: '解析失败', content: String(err?.message || err) });
      }
    },
    saveScheduleData(data) {
      this.scheduleData = data;
      try {
        uni.setStorageSync('classSchedule', JSON.stringify(data));
      } catch (e) {}
      this.updateStatus();
    },
    validateSchedule(data) {
      if (!data || !Array.isArray(data.schedule)) return false;
      return data.schedule.every(daySchedule =>
        typeof daySchedule.day === 'number' &&
        daySchedule.day >= 1 &&
        daySchedule.day <= 7 &&
        Array.isArray(daySchedule.classes) &&
        daySchedule.classes.every(cls => cls && cls.name && cls.start && cls.end)
      );
    },
    onOffsetInput(e) {
      const v = parseInt((e.detail && e.detail.value) || e.target?.value) || 0;
      if (v !== this.offset) {
        this.offset = v;
        try {
          uni.setStorageSync('timeOffset', String(v));
        } catch (e) {}
        this.updateStatus();
      }
    },
    handleFillOffset() {
      this.onOffsetInput({ detail: { value: this.suggestedOffset } });
    },
    startUpdateInterval() {
      this.stopUpdateInterval();
      this.updateTimer = setInterval(this.updateStatus, 1000);
      this.updateStatus();
    },
    stopUpdateInterval() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.updateTimer = null;
      }
    },
    updateStatus() {
      if (!this.scheduleData) {
        this.statusText = '下一节课';
        this.timeText = '--:--';
        this.lessonName = '未导入课表';
        this.noClass = true;
        this.suggestedOffset = 0;
        this.nearestTargetText = '—';
        return;
      }

      const now = new Date();
      const currentDay = now.getDay() === 0 ? 7 : now.getDay();
      const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      let nearestEvent = null;
      let minDiff = Infinity;
      let nearestOriginal = null;
      let minOrigDiff = Infinity;

      for (const daySchedule of this.scheduleData.schedule) {
        if (daySchedule.day === currentDay) {
          for (const cls of daySchedule.classes) {
            const [startH, startM] = cls.start.split(':').map(Number);
            const [endH, endM] = cls.end.split(':').map(Number);

            const startOrig = startH * 3600 + startM * 60;
            const endOrig = endH * 3600 + endM * 60;

            const startTime = startH * 3600 + startM * 60 - this.offset;
            const endTime = endH * 3600 + endM * 60 - this.offset;

            if (startTime > currentTime && startTime - currentTime < minDiff) {
              minDiff = startTime - currentTime;
              nearestEvent = {
                name: cls.name,
                type: 'start',
                time: startTime,
                originalTime: startH * 3600 + startM * 60
              };
            }

            if (endTime > currentTime && endTime - currentTime < minDiff) {
              minDiff = endTime - currentTime;
              nearestEvent = {
                name: cls.name,
                type: 'end',
                time: endTime,
                originalTime: endH * 3600 + endM * 60
              };
            }

            // 最近“课表时间”（不考虑偏移），用于时间偏移计算器
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
        this.statusText = nearestEvent.type === 'start' ? '距离上课' : '距离下课';
        this.lessonName = nearestEvent.name;
        this.noClass = false;

        if (minDiff <= 120) {
          this.timeText = `${minDiff}秒`;
        } else {
          const minutes = Math.floor(minDiff / 60);
          const seconds = minDiff % 60;
          this.timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        const base = nearestOriginal || { name: nearestEvent.name, type: nearestEvent.type, time: nearestEvent.originalTime };
        this.suggestedOffset = base.time - currentTime;
        this.nearestTargetText = `${base.type === 'start' ? '上课' : '下课'} ${this.formatHHMM(base.time)} ${base.name}`;
      } else {
        this.statusText = '今日课程';
        this.timeText = '--:--';
        this.lessonName = '已结束';
        this.noClass = true;
        this.suggestedOffset = 0;
        this.nearestTargetText = '—';
      }
    }
  }
}
</script>

<style scoped>
.page { width: 750rpx; min-height: 100%; background: #000000; color: #ffffff; }
.container { width: 750rpx; height: 100%; }
.screen { padding: 24rpx; display: flex; flex-direction: column; min-height: 100%; }
.main-screen { align-items: center; justify-content: center; }
.status { font-size: 60rpx; margin-bottom: 16rpx; }
.time { font-size: 210rpx; font-weight: 700; margin: 40rpx 0; letter-spacing: 2rpx; line-height: 1; }
.lesson { font-size: 60rpx; margin: 0 30rpx; text-align: center; word-break: break-all; }
.no-class { color: #888; }

.title { margin: 24rpx 0; text-align: center; font-size: 48rpx; font-weight: 600; }
.import-section { margin: 24rpx 0; }
.import-method { margin-bottom: 24rpx; display: flex; }
.tab-btn { padding: 12rpx 18rpx; margin-right: 16rpx; background: #333; color: #fff; border-radius: 8rpx; font-size: 32rpx; }
.tab-btn.active { background: #555; }

.file-input { margin: 16rpx 0; width: 100%; font-size: 30rpx; color: #fff; }
.text-input { width: 100%; height: 300rpx; padding: 16rpx; margin: 16rpx 0; background: #222; color: #fff; border-radius: 8rpx; font-family: monospace; }
.hint { font-size: 24rpx; color: #888; }
.pre { background: #222; padding: 16rpx; border-radius: 10rpx; margin: 16rpx 0; }

.offset-container { margin: 24rpx 0; display: flex; align-items: center; justify-content: space-between; font-size: 36rpx; }
.offset-input { width: 160rpx; padding: 8rpx; background: #333; color: #fff; border-radius: 8rpx; font-size: 36rpx; text-align: right; }
.desc { font-size: 28rpx; color: #888; }

.calculator-container { margin: 24rpx 0; }
.strong { color: #4CAF50; }
.submit-btn { padding: 12rpx 24rpx; background: #4CAF50; color: #fff; border-radius: 8rpx; margin-top: 12rpx; font-size: 36rpx; width: 100%; }
</style>
