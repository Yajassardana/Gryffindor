const meta = {
	0: 3,
	1: 7,
	2: 12,
	3: 18,
	4: 22,
	5: 29,
	6: 36,
	7: 42,
	8: 48,
	9: 54,
}; // Challenge time stamps
let challengeSquats = 10; //total number of squads to cross to tie the challenge
let challengeTime = 60; //challenge duration in secs
let squatCount = 0; //current squad count of the challenge video
var seconds = 0;

let challengeCounter = document.getElementById('challengeCounter'); //progress and rep count of challenge video
let challengeCount = document.getElementById('challengeCount');

let start = document.querySelector('.fa-play'); //play button
let challengeVideo = document.getElementById('challengeVideo');
let userCounter = document.getElementById('userCounter'); //progress and rep count of current user
let userCount = document.getElementById('userCount');
let result = document.getElementById('result'); //result of the challenge

start.addEventListener('click', () => {
	let count = 3;
	document.getElementById('base-timer-label').innerHTML = count;
	count -= 1;
	let countDown = setInterval(() => {
		if (count == 0) {
			document.getElementById('base-timer-label').innerHTML = 'Go!';
			video.play();
			challengeVideo.style.opacity = 1;
			challengeVideo.play();
			cancel = setInterval(incrementSeconds, 1000); //starting the challenge time
			startTimer();
			clearInterval(countDown); //stopping the countdown
		} else {
			document.getElementById('base-timer-label').innerHTML = count;
			count -= 1;
		}
	}, 1000);
});

function incrementSeconds() {
	seconds += 1;

	if (reps > challengeSquats) {
		result.innerText = 'Congratulations, You Won!';
		video.pause();
		challengeVideo.pause();
		clearInterval(cancel); //stopiping logic clock
		clearInterval(timerInterval); //stopping challenge clock
	} else if (seconds >= challengeTime) {
		result.innerText = 'Sorry, Better Luck Next Time';
		video.pause(); //pausing user input
		challengeVideo.pause(); //pausing challenge video
		clearInterval(cancel);
	}
	if (meta[squatCount] <= seconds) {
		// manipulating challenge video rep progress
		squatCount += 1;
		if ((squatCount / challengeSquats) * 100 < 50)
			challengeCounter.className = `progress-circle p${Math.floor(
				(squatCount / challengeSquats) * 100
			)}`;
		else
			challengeCounter.className = `progress-circle over50 p${Math.floor(
				(squatCount / challengeSquats) * 100
			)}`;
		challengeCount.innerText = squatCount;
	}
}

var cancel;
