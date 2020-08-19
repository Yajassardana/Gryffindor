let video;
let poseNet;
let noseX0 = 0;
let noseY0 = 0;
let noseX1 = 0;
let noseY1 = 0;
let ref = { x: 0, y: 0 };
let similarityScoreStanding = 0;
let similarityScoreSitting = 0;
let isPlaying = false;
let poses = [];
let standingVector = [
	278.3973312259845,
	281.0986954277556,
	282.1958909000214,
	274.04133166522325,
	273.2643188938574,
	241.61304279447182,
	243.0825231581508,
	205.6761252520117,
	205.21494800328878,
	192.29413317081108,
	192.12446337738243,
	145.35496005600908,
	150.64426340657096,
	73.83240613263285,
	77.65162167643507,
	14.15572022851707,
	33.30284386074422,
];
let sittingVector = [
	163.6483680970063,
	160.78723571170406,
	164.01457989447323,
	161.10645614112482,
	162.96736685034,
	140.7431547763037,
	138.218065643686,
	107.51078061956174,
	109.65758234631387,
	108.01137645668257,
	103.22585893713737,
	74.9278012898156,
	70.76861914506568,
	72.90663213174054,
	64.46683427137673,
	36.852587578536834,
	30.29555912607725,
];
let weight = 0.7;
let reps = 0;
let scoreHistory = [];
let lastTimeStamp = Date.now();

function setup() {
	createCanvas(352, 640);
	// video = createCapture(VIDEO);
	video = createVideo('assets/testVideo.mp4', vidLoad);
	video.hide();
	poseNet = ml5.poseNet(video, modelReady);
	poseNet.on('pose', gotPoses);
}
function vidLoad() {
	video.loop();
	video.volume(0);
	isPlaying = true;
}

function gotPoses(posesLocal) {
	// if (Date.now() - lastTimeStamp < 100)
	// 	return
	// console.log(poses.length);
	poses = posesLocal;
	if (posesLocal.length > 0) {
		ref = getRef(poses[0].pose);
		let userVector = getVector(poses[0].pose, ref);
		let similarityScoreSittingcurrent = getSimilarityScore(
			userVector,
			sittingVector
		);
		let similarityScoreStandingcurrent = getSimilarityScore(
			userVector,
			standingVector
		);

		similarityScoreStanding =
			similarityScoreStanding * weight +
			similarityScoreStandingcurrent * (1 - weight);
		similarityScoreSitting =
			similarityScoreSitting * weight +
			similarityScoreSittingcurrent * (1 - weight);

		if (similarityScoreSitting > similarityScoreStanding) updateReps(1);
		else updateReps(0);
	}
	lastTimeStamp = Date.now();
}

function updateReps(currentBestmatch) {
	if (
		scoreHistory.length == 0 ||
		scoreHistory[scoreHistory.length - 1] != currentBestmatch
	) {
		scoreHistory.push(currentBestmatch);
		if (scoreHistory.length > 3) {
			let length = scoreHistory.length;
			let last = scoreHistory[length - 1];
			let secondLast = scoreHistory[length - 2];
			let thirdLast = scoreHistory[length - 3];
			if (last == 0 && secondLast == 1 && thirdLast == 0) {
				reps++;
				if ((reps / challengeSquats) * 100 < 50)
					userCounter.className = `progress-circle p${Math.floor(
						(reps / challengeSquats) * 100
					)}`;
				else
					userCounter.className = `progress-circle over50 p${Math.floor(
						(reps / challengeSquats) * 100
					)}`;
				userCount.innerText = reps;
			}
		}
	}
	// console.log(scoreHistory);
}

function getSimilarityScore(userVector, refVector) {
	let score = 0;
	for (i = 0; i < userVector.length; i++) {
		score += Math.pow(refVector[i] - userVector[i], 2);
	}
	return Math.sqrt(score);
}

function getRef(pose) {
	const ref = {
		x: 0,
		y: 0,
	};
	let yMax = 0;
	pose.keypoints.forEach((keypoint) => {
		if (keypoint.position.y > yMax) yMax = keypoint.position.y;
	});
	ref.y = yMax;
	ref.x = (pose.keypoints[5].position.x + pose.keypoints[6].position.x) / 2;
	return ref;
}

function getVector(pose, ref) {
	let resultVector = [];
	for (i = 0; i < pose.keypoints.length; i++) {
		resultVector.push(getDistance(ref, pose.keypoints[i].position));
	}

	// console.log(resultVector)
	return resultVector;
}

function getDistance(A, B) {
	return Math.sqrt(Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2));
}

function modelReady() {
	console.log('model ready');
	// document.getElementById('status').innerText = 'Ready!';
}

function draw() {
	image(video, 0, 0);

	fill(0, 255, 0);
	ellipse(ref.x, ref.y, 10);
	textSize(10);
	// text('' + similarityScoreStanding, 10, 10);
	// text('' + similarityScoreSitting, 10, 40);
	textSize(20);
	// text('' + reps, 10, 80);
	//fill(0,0,255);
	//ellipse(eyelX, eyelY, 50);
	fill(255, 0, 0);
	drawKeypoints();
}

// function mouseClicked() {
// 	console.log('clicked', isPlaying);
// 	if (isPlaying) video.pause();
// 	else video.play();
// 	isPlaying = !isPlaying;
// }

function drawKeypoints() {
	// Loop through all the poses detected
	// for (let i = 0; i < poses.length; i++) {
	// For each pose detected, loop through all the keypoints
	if (poses.length < 1) return;
	let pose = poses[0].pose;
	for (let j = 0; j < pose.keypoints.length; j++) {
		// A keypoint is an object describing a body part (like rightArm or leftShoulder)
		let keypoint = pose.keypoints[j];
		// Only draw an ellipse is the pose probability is bigger than 0.2
		if (keypoint.score > 0.2) {
			fill(255, 0, 0);
			noStroke();
			ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
		}
	}
	// }
}
