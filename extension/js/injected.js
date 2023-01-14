const runtimeId = null;
const domain = 'back.denizaksu.dev';
const signallingChannelUrl = `wss://${domain}/${runtimeId}`;
const connectSignalingChannel = (signallingChannelUrl) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(signallingChannelUrl);
    ws.onopen = () => {
      resolve(ws);
    };
    ws.onerror = (error) => {
      reject(error);
    };
  });
};
const overrideEnumerateDevices = () => {
  const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(
    navigator.mediaDevices
  );
  window.navigator.mediaDevices.enumerateDevices = () =>
    originalEnumerateDevices().then((devices) => {
      if (devices.filter((device) => device.label !== '').length === 0) {
        return devices;
      }
      const videoDevice = {
        __proto__: InputDeviceInfo.prototype,
        deviceId: 'rtc-camera',
        kind: 'videoinput',
        label: 'RTC Camera',
        groupId: 'rtc-camera',
        getCapabilities: () => {
          return {
            aspectRatio: { max: 2, min: 0.00001 },
            deviceId: 'rtc-camera',
            facingMode: [],
            frameRate: { max: 30, min: 1 },
            groupId: 'rtc-camera',
            height: { max: 1080, min: 1 },
            resizeMode: ['none', 'crop-and-scale'],
            width: { max: 1920, min: 1 },
          };
        },
        toJSON: () => {
          return {
            __proto__: InputDeviceInfo.prototype,
            deviceId: 'rtc-camera',
            kind: 'videoinput',
            label: 'RTC Camera',
            groupId: 'rtc-camera',
          };
        },
      };
      devices.push(videoDevice);
      return devices;
    });
};
const overrideGetUserMedia = (mediaStreamGenerator) => {
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices
  );
  const overrideMethod = (constraints) =>
    new Promise((resolve, reject) => {
      const hasVideo = 'video' in constraints && constraints.video !== false;
      if (!hasVideo) {
        return originalGetUserMedia(constraints).then(resolve).catch(reject);
      }
      const videoConstraints = JSON.stringify(constraints.video);
      if (videoConstraints.includes('rtc-camera')) {
        mediaStreamGenerator().then(resolve).catch(reject);
      } else {
        originalGetUserMedia(constraints).then(resolve).catch(reject);
      }
    });
  window.navigator.mediaDevices.getUserMedia = (constraints) =>
    overrideMethod(constraints);
  window.navigator.getUserMedia = (
    constraints,
    successCallback,
    errorCallback
  ) => overrideMethod(constraints).then(successCallback).catch(errorCallback);
};
const establishPeerConnection = (ws) =>
  new Promise((resolve, reject) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });
    pc.onicecandidate = (event) => {
      const { candidate } = event;
      if (candidate) {
        ws.send(JSON.stringify({ type: 'candidate', candidate }));
      }
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      resolve(stream);
    };
    ws.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (message.type === 'offer') {
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        pc.createAnswer().then((answer) => {
          pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
        });
      }
      if (message.type === 'candidate') {
        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
      if (message.type === 'answer') {
        mediaStreamGenerator().then(resolve).catch(reject);
      }

      // handle new offer from server and change media stream
      if (message.type === 'new-offer') {
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        pc.createAnswer().then((answer) => {
          pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
        });

        mediaStreamGenerator().then(resolve).catch(reject);

        pc.ontrack = (event) => {
          const [stream] = event.streams;
          resolve(stream);
        };        
      }
    };
  });
const mediaStreamGenerator = () =>
  connectSignalingChannel(signallingChannelUrl)
    .then((ws) => {
      return establishPeerConnection(ws);
    })
    .then((stream) => {
      const mediaStream = new MediaStream();
      const [videoTrack] = stream.getVideoTracks();
      mediaStream.addTrack(videoTrack);
      return mediaStream;
    });
overrideEnumerateDevices();
overrideGetUserMedia(mediaStreamGenerator);
console.log('Ok injected file worked');
