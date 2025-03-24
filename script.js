const container = document.querySelector(".container"),
      mainVideo = container.querySelector("#mainVideo"),
      videoTimeline = container.querySelector(".video-timeline"),
      progressBar = container.querySelector(".progress-bar"),
      volumeBtn = container.querySelector(".volume i"),
      volumeSlider = container.querySelector(".left input"),
      currentVidTime = container.querySelector(".current-time"),
      videoDuration = container.querySelector(".video-duration"),
      skipBackward = container.querySelector(".skip-backward i"),
      skipForward = container.querySelector(".skip-forward i"),
      playPauseBtn = container.querySelector(".play-pause i"),
      speedBtn = container.querySelector(".playback-speed span"),
      speedOptions = container.querySelector(".speed-options"),
      pipBtn = container.querySelector(".pic-in-pic span"),
      fullScreenBtn = container.querySelector(".fullscreen i"),
      qualityBtn = container.querySelector(".quality-btn"),
      qualityOptions = container.querySelector(".quality-options"),
      audioBtn = container.querySelector(".audio-btn"),
      audioOptions = container.querySelector(".audio-options"),
      spinner = container.querySelector(".spinner");

let timer;
let hls;
let hlsAudio;
let audioPlayer;
let syncInterval;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const sources = {
  video: {
    '1080': 'https://your-video-source/1080p.m3u8',
    '720': 'https://your-video-source/720p.m3u8',
    '480': 'https://your-video-source/480p.m3u8',
    '360': 'https://your-video-source/360p.m3u8'
  },
  audio: {
    '0': 'https://your-audio-source/english.m3u8',
    '1': 'https://your-audio-source/hindi.m3u8',
    '2': 'https://your-audio-source/spanish.m3u8'
  }
};

// Initialize player
function initPlayer() {
  showSpinner();
  
  // Set default quality based on device
  const defaultQuality = isMobile ? '480' : '720';
  loadVideo(defaultQuality);
  loadAudio('0');
  
  // Hide controls after delay
  hideControls();
}

function showSpinner() {
  spinner.style.display = 'block';
}

function hideSpinner() {
  spinner.style.display = 'none';
}

function loadVideo(quality) {
  if (hls) hls.destroy();
  
  if (Hls.isSupported()) {
    hls = new Hls({
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      fragLoadingTimeOut: 20000,
      manifestLoadingTimeOut: 20000,
      levelLoadingTimeOut: 20000
    });
    
    hls.loadSource(sources.video[quality]);
    hls.attachMedia(mainVideo);
    
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      hideSpinner();
      videoDuration.innerText = formatTime(mainVideo.duration);
    });
    
    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS error:', data);
      if (data.fatal) {
        switch(data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            break;
        }
      }
    });
  } else if (mainVideo.canPlayType('application/vnd.apple.mpegurl')) {
    mainVideo.src = sources.video[quality];
    mainVideo.addEventListener('loadedmetadata', () => {
      hideSpinner();
      videoDuration.innerText = formatTime(mainVideo.duration);
    });
  } else {
    alert('HLS is not supported in your browser');
  }
}

function loadAudio(track) {
  if (!audioPlayer) {
    audioPlayer = new Audio();
    document.body.appendChild(audioPlayer);
    audioPlayer.style.display = 'none';
  }
  
  if (Hls.isSupported()) {
    if (hlsAudio) hlsAudio.destroy();
    
    hlsAudio = new Hls({
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      fragLoadingTimeOut: 20000,
      manifestLoadingTimeOut: 20000,
      levelLoadingTimeOut: 20000
    });
    
    hlsAudio.loadSource(sources.audio[track]);
    hlsAudio.attachMedia(audioPlayer);
    
    hlsAudio.on(Hls.Events.MANIFEST_PARSED, () => {
      syncAudioWithVideo();
    });
    
    hlsAudio.on(Hls.Events.ERROR, (event, data) => {
      console.error('Audio error:', data);
      if (data.fatal && track !== '0') {
        loadAudio('0'); // Fallback to English
      }
    });
  }
  
  // Setup sync interval
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(syncAudioWithVideo, 2000);
}

function syncAudioWithVideo() {
  if (audioPlayer && !mainVideo.paused) {
    const syncThreshold = 0.3;
    if (Math.abs(audioPlayer.currentTime - mainVideo.currentTime) > syncThreshold) {
      audioPlayer.currentTime = mainVideo.currentTime;
    }
  }
}

function changeQuality(quality) {
  showSpinner();
  const currentTime = mainVideo.currentTime;
  const isPaused = mainVideo.paused;
  
  loadVideo(quality);
  
  mainVideo.addEventListener('canplay', () => {
    mainVideo.currentTime = currentTime;
    if (!isPaused) {
      Promise.all([
        mainVideo.play().catch(e => console.error(e)),
        audioPlayer.play().catch(e => console.error(e))
      ]).finally(hideSpinner);
    } else {
      hideSpinner();
    }
  }, { once: true });
}

function changeAudio(track) {
  loadAudio(track);
  audioPlayer.currentTime = mainVideo.currentTime;
  if (!mainVideo.paused) {
    audioPlayer.play().catch(e => console.error(e));
  }
}

// Block developer tools
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
    e.preventDefault();
  }
});

// Original player functions
const hideControls = () => {
  if(mainVideo.paused) return;
  timer = setTimeout(() => {
    container.classList.remove("show-controls");
  }, 3000);
}
hideControls();

container.addEventListener("mousemove", () => {
  container.classList.add("show-controls");
  clearTimeout(timer);
  hideControls();   
});

const formatTime = time => {
  let seconds = Math.floor(time % 60),
      minutes = Math.floor(time / 60) % 60,
      hours = Math.floor(time / 3600);

  seconds = seconds < 10 ? `0${seconds}` : seconds;
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  hours = hours < 10 ? `0${hours}` : hours;

  if(hours == 0) {
    return `${minutes}:${seconds}`
  }
  return `${hours}:${minutes}:${seconds}`;
}

videoTimeline.addEventListener("mousemove", e => {
  let timelineWidth = videoTimeline.clientWidth;
  let offsetX = e.offsetX;
  let percent = Math.floor((offsetX / timelineWidth) * mainVideo.duration);
  const progressTime = videoTimeline.querySelector("span");
  offsetX = offsetX < 20 ? 20 : (offsetX > timelineWidth - 20) ? timelineWidth - 20 : offsetX;
  progressTime.style.left = `${offsetX}px`;
  progressTime.innerText = formatTime(percent);
});

videoTimeline.addEventListener("click", e => {
  let timelineWidth = videoTimeline.clientWidth;
  mainVideo.currentTime = (e.offsetX / timelineWidth) * mainVideo.duration;
  if (audioPlayer) audioPlayer.currentTime = mainVideo.currentTime;
});

mainVideo.addEventListener("timeupdate", e => {
  let {currentTime, duration} = e.target;
  let percent = (currentTime / duration) * 100;
  progressBar.style.width = `${percent}%`;
  currentVidTime.innerText = formatTime(currentTime);
});

mainVideo.addEventListener("loadeddata", () => {
  videoDuration.innerText = formatTime(mainVideo.duration);
});

const draggableProgressBar = e => {
  let timelineWidth = videoTimeline.clientWidth;
  progressBar.style.width = `${e.offsetX}px`;
  mainVideo.currentTime = (e.offsetX / timelineWidth) * mainVideo.duration;
  currentVidTime.innerText = formatTime(mainVideo.currentTime);
  if (audioPlayer) audioPlayer.currentTime = mainVideo.currentTime;
}

volumeBtn.addEventListener("click", () => {
  if(!volumeBtn.classList.contains("fa-volume-high")) {
    mainVideo.volume = 0.5;
    if (audioPlayer) audioPlayer.volume = 0.5;
    volumeBtn.classList.replace("fa-volume-xmark", "fa-volume-high");
  } else {
    mainVideo.volume = 0.0;
    if (audioPlayer) audioPlayer.volume = 0.0;
    volumeBtn.classList.replace("fa-volume-high", "fa-volume-xmark");
  }
  volumeSlider.value = mainVideo.volume;
});

volumeSlider.addEventListener("input", e => {
  mainVideo.volume = e.target.value;
  if (audioPlayer) audioPlayer.volume = e.target.value;
  if(e.target.value == 0) {
    return volumeBtn.classList.replace("fa-volume-high", "fa-volume-xmark");
  }
  volumeBtn.classList.replace("fa-volume-xmark", "fa-volume-high");
});

speedOptions.querySelectorAll("li").forEach(option => {
  option.addEventListener("click", () => {
    mainVideo.playbackRate = option.dataset.speed;
    speedOptions.querySelector(".active").classList.remove("active");
    option.classList.add("active");
  });
});

qualityOptions.querySelectorAll("li").forEach(option => {
  option.addEventListener("click", () => {
    changeQuality(option.dataset.quality);
    qualityOptions.querySelector(".active").classList.remove("active");
    option.classList.add("active");
  });
});

audioOptions.querySelectorAll("li").forEach(option => {
  option.addEventListener("click", () => {
    changeAudio(option.dataset.audio);
    audioOptions.querySelector(".active").classList.remove("active");
    option.classList.add("active");
  });
});

document.addEventListener("click", e => {
  if(!e.target.closest(".playback-speed") && !e.target.closest(".speed-options")) {
    speedOptions.classList.remove("show");
  }
  if(!e.target.closest(".quality-btn") && !e.target.closest(".quality-options")) {
    qualityOptions.classList.remove("show");
  }
  if(!e.target.closest(".audio-btn") && !e.target.closest(".audio-options")) {
    audioOptions.classList.remove("show");
  }
});

fullScreenBtn.addEventListener("click", () => {
  container.classList.toggle("fullscreen");
  if(document.fullscreenElement) {
    fullScreenBtn.classList.replace("fa-compress", "fa-expand");
    return document.exitFullscreen();
  }
  fullScreenBtn.classList.replace("fa-expand", "fa-compress");
  container.requestFullscreen();
});

speedBtn.addEventListener("click", () => speedOptions.classList.toggle("show"));
qualityBtn.addEventListener("click", () => {
  qualityOptions.classList.toggle("show");
  audioOptions.classList.remove("show");
});
audioBtn.addEventListener("click", () => {
  audioOptions.classList.toggle("show");
  qualityOptions.classList.remove("show");
});
pipBtn.addEventListener("click", () => mainVideo.requestPictureInPicture());
skipBackward.addEventListener("click", () => {
  mainVideo.currentTime -= 5;
  if (audioPlayer) audioPlayer.currentTime = mainVideo.currentTime;
});
skipForward.addEventListener("click", () => {
  mainVideo.currentTime += 5;
  if (audioPlayer) audioPlayer.currentTime = mainVideo.currentTime;
});
mainVideo.addEventListener("play", () => {
  playPauseBtn.classList.replace("fa-play", "fa-pause");
  if (audioPlayer) audioPlayer.play().catch(e => console.error(e));
});
mainVideo.addEventListener("pause", () => {
  playPauseBtn.classList.replace("fa-pause", "fa-play");
  if (audioPlayer) audioPlayer.pause();
});
playPauseBtn.addEventListener("click", () => {
  mainVideo.paused ? mainVideo.play() : mainVideo.pause();
});
videoTimeline.addEventListener("mousedown", () => {
  videoTimeline.addEventListener("mousemove", draggableProgressBar);
});
document.addEventListener("mouseup", () => {
  videoTimeline.removeEventListener("mousemove", draggableProgressBar);
});

// Error handling
mainVideo.addEventListener('error', () => {
  console.error('Video error:', mainVideo.error);
});

mainVideo.addEventListener('waiting', () => {
  showSpinner();
});

mainVideo.addEventListener('playing', () => {
  hideSpinner();
});

// Initialize player
initPlayer();
