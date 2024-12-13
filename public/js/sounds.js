let context = null;
let usingWebAudio = true;

if (typeof AudioContext !== 'undefined') {
  context = new AudioContext();
} else if (typeof webkitAudioContext !== 'undefined') {
  context = new webkitAudioContext();
} else {
  usingWebAudio = false;
}

const sound = new Sfx(context);