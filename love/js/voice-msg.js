// 语音留言 - 共享逻辑，返回 { audioUrl, duration }
function initVoiceMsg(btn, onRecorded) {
  if (!btn || !onRecorded) return;
  let mediaRecorder = null;
  let chunks = [];
  let startTime = 0;

  btn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];
      startTime = Date.now();
      mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        btn.classList.remove('recording');
        if (chunks.length === 0) return;
        const duration = Math.round((Date.now() - startTime) / 1000);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          onRecorded({ audioUrl: reader.result, duration });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      btn.classList.add('recording');
      btn.title = '点击结束录音';
    } catch (e) {
      alert('无法访问麦克风，请检查权限');
    }
  });
}
