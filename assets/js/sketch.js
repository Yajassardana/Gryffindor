//firebase setup
// const firebase = require('firebase');
// // const firebaseConfig = {
// // 	apiKey: 'AIzaSyBiVNI771U_hB6paK4WYvQujoipNzF7PY8',
// // 	authDomain: 'cult-155917.firebaseapp.com',
// // 	databaseURL: 'https://cult-155917.firebaseio.com',
// // 	projectId: 'cult-155917',
// // 	storageBucket: 'cult-155917.appspot.com',
// // 	messagingSenderId: '710378156821',
// // 	appId: '1:710378156821:web:b0657b364c60d271',
// // };
// // Required for side-effects
// require('firebase/firestore');
firebase.initializeApp({
	apiKey: 'AIzaSyBiVNI771U_hB6paK4WYvQujoipNzF7PY8',
	authDomain: 'cult-155917.firebaseapp.com',
	projectId: 'cult-155917',
});

let db = firebase.firestore();
let challenges = db.collection('challenges');

let CHALLENGE_ID = 'curefit-gryffindor'; //arbitrary right now

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
	0.9999904138864386,
	1.0096935898985475,
	1.0136346655891575,
	0.9843438637400261,
	0.9815528695900052,
	0.8678629410720972,
	0.8731412469761164,
	0.7387791855316513,
	0.7371226580577902,
	0.6907116852399824,
	0.6901022391428967,
	0.5221083335345154,
	0.5411072679833727,
	0.26520260823503183,
	0.27892105487225244,
	0.050846696223121664,
	0.11962228398255827,
];
let sittingVector = [
	0.5878174141415458,
	0.5775403581598566,
	0.5891328300807228,
	0.5786869832655346,
	0.5853712889739224,
	0.505542941006838,
	0.49647293693852734,
	0.3861737809610695,
	0.3938849940600355,
	0.387971898192107,
	0.3707825392856946,
	0.26913721727663653,
	0.2541976262394601,
	0.2618772705881485,
	0.23156190471040491,
	0.13237280021026163,
	0.10882025548159933,
];
let weight = 0.7;
let reps = 0;
let scoreHistory = [];
let lastTimeStamp = Date.now();
let maxDist = 290;
let isMaxComputed = false;

function getAngle(A, B, C) {
	let P1 = A.position;
	let P2 = B.position;
	let P3 = C.position;
	return atan2(P3.y - P1.y, P3.x - P1.x) - atan2(P2.y - P1.y, P2.x - P1.x);
}

function detectStanding(pose) {
	var isTopVisible = pose.keypoints[0].score > 0.7;
	var isBottomVisible =
		pose.keypoints[15].score > 0.7 && pose.keypoints[16].score > 0.7;

	rightAngle =
		getAngle(pose.keypoints[12], pose.keypoints[14], pose.keypoints[16]) * 57;
	leftAngle =
		getAngle(pose.keypoints[11], pose.keypoints[13], pose.keypoints[15]) * 57;
	var isLeft = Math.abs(leftAngle) < 15;
	var isRight = Math.abs(rightAngle) < 15;
	var isStanding = isTopVisible && isBottomVisible && isLeft && isRight;
	// console.log( isStanding)
	return isStanding;
}

function setup() {
	createCanvas(533, 400);
	video = createCapture(VIDEO);
	// video = createVideo('assets/testVideo.mp4', vidLoad);
	video.hide();
	// video.pause();
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
	if (posesLocal.length > 0 && poses[0].pose.score > 0.7) {
		ref = getRef(poses[0].pose);
		if (!isMaxComputed && detectStanding(poses[0].pose)) {
			maxDist = getDistance(ref, poses[0].pose.keypoints[0].position);
			console.log(poses[0].pose.score, maxDist);
			isMaxComputed = true;
		}
		let userVector = getVector(poses[0].pose, ref, maxDist);
		console.log(userVector);
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
		if (scoreHistory.length > 2) {
			let length = scoreHistory.length;
			let last = scoreHistory[length - 1];
			let secondLast = scoreHistory[length - 2];
			if (last == 1 && secondLast == 0) {
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

function getVector(pose, ref, maxDist) {
	let resultVector = [];
	for (i = 0; i < pose.keypoints.length; i++) {
		resultVector.push(getDistance(ref, pose.keypoints[i].position) / maxDist);
	}

	// console.log(resultVector)
	return resultVector;
}

function getDistance(A, B) {
	return Math.sqrt(Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2));
}

function modelReady() {
	console.log('model ready');
}

function draw() {
	if (count <= 0) {
		// timer is about so start
		translate(video.width, 0);
	}
	scale(-1, 1);
	image(video, 0, 0);
	fill(0, 255, 0);
	ellipse(ref.x, ref.y, 10);
	textSize(10);
	text('' + similarityScoreStanding, 10, 10);
	text('' + similarityScoreSitting, 10, 40);
	textSize(100);
	fill(0, 0, 0);
	text('' + reps, 10, 80);
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
