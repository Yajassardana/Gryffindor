const meta = {
	0: 3,
	1: 6,
	2: 10,
	// 3: 15,
	// 4: 21,
	3: 27,
};
let challengeSquats = Object.keys(meta).length;
let challengeTime = 30;
let squatCount = 0;
var seconds = 0;
let timer = document.getElementById('timer');
let counter = document.getElementById('counter');
let status = document.getElementById('status');
function incrementSeconds() {
	seconds += 1;
	if (reps > challengeSquats) {
		status.innerText = 'You Won!';
		video.pause();
		clearInterval(cancel);
	} else if (seconds >= challengeTime) {
		timer.innerText = 'Completed ' + squatCount + ' reps';
		counter.innerText = '';
		status.innerText = 'Sorry! Challenger Won.';
		clearInterval(cancel);
	} else {
		timer.innerText = seconds + ' s';
	}
	if (meta[squatCount] <= seconds) {
		squatCount += 1;
		counter.innerText = squatCount + ' Reps';
	}
}

var cancel;
