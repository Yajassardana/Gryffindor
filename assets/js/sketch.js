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
let CHALLENGE_ID = 'curefit-gryffindor_' + new Date(); //arbitrary right now
console.log(CHALLENGE_ID);
let userMeta = {};

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
let scene,
	renderer,
	camera,
	model, // Our character
	neck, // Reference to the neck bone in the skeleton
	waist, // Reference to the waist bone in the skeleton
	possibleAnims, // Animations found in our file
	mixer, // THREE.js animations mixer
	idle, // Idle, the default state our character returns to
	clock = new THREE.Clock(), // Used for anims, which run to a clock instead of frame rate
	currentlyAnimating = false, // Used to check whether characters neck is being used in another anim
	raycaster = new THREE.Raycaster(), // Used to detect the click on our character
	loaderAnim = document.getElementById('js-loader');
let squatAction = null;
let idleAction = null;

function init() {
	const MODEL_PATH = './assets/char1.glb';
	const canvas = document.querySelector('#c');
	const backgroundColor = 0x000000;
	// Init the scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color(backgroundColor);
	scene.fog = new THREE.Fog(backgroundColor, 40, 50);
	// Init the renderer
	renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.shadowMap.enabled = true;
	renderer.setPixelRatio(window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);
	// Add a camera
	camera = new THREE.PerspectiveCamera(
		50,
		window.innerWidth - 400 / window.innerHeight - 400,
		0.1,
		1000
	);
	camera.position.z = 30;
	camera.position.x = 0;
	camera.position.y = -3;
	let stacy_txt = new THREE.TextureLoader().load('./assets/char.png');
	stacy_txt.flipY = false;
	const stacy_mtl = new THREE.MeshPhongMaterial({
		map: stacy_txt,
		color: 0xffffff,
		skinning: true,
	});
	var loader = new THREE.GLTFLoader();
	loader.load(
		MODEL_PATH,
		function (gltf) {
			model = gltf.scene;
			fileAnimations = gltf.animations;
			model.traverse((o) => {
				if (o.isMesh) {
					o.castShadow = true;
					o.receiveShadow = true;
					o.material = stacy_mtl;
				}
				// Reference the neck and waist bones
				if (o.isBone && o.name === 'mixamorigNeck') {
					neck = o;
				}
				if (o.isBone && o.name === 'mixamorigSpine') {
					waist = o;
				}
			});
			model.scale.set(7, 7, 7);
			model.position.y = -11;
			scene.add(model);
			//loaderAnim.remove();
			mixer = new THREE.AnimationMixer(model);
			let clips = fileAnimations.filter((val) => val.name !== 'idle');
			possibleAnims = clips.map((val) => {
				let clip = THREE.AnimationClip.findByName(clips, val.name);
				// clip.tracks.splice(3, 3);
				// clip.tracks.splice(9, 3);
				clip = mixer.clipAction(clip);
				return clip;
			});
			let squatAnim = THREE.AnimationClip.findByName(fileAnimations, 'Squat');
			squatAction = mixer.clipAction(squatAnim);
			squatAction.setLoop(THREE.LoopOnce);
			// let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'Idle');
			// idleAction = mixer.clipAction(idleAnim);
			// idleAction.setLoop(THREE.LoopOnce);
			// let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'TPose');
			// idleAnim.tracks.splice(3, 3);
			// idleAnim.tracks.splice(9, 3);
			// idle = mixer.clipAction(idleAnim);
			// idle.play();
		},
		undefined, // We don't need this function
		function (error) {
			console.error(error);
		}
	);
	// Add lights
	let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
	hemiLight.position.set(0, 50, 0);
	// Add hemisphere light to scene
	scene.add(hemiLight);
	let d = 8.25;
	let dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
	dirLight.position.set(-8, 12, 8);
	dirLight.castShadow = true;
	dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
	dirLight.shadow.camera.near = 0.1;
	dirLight.shadow.camera.far = 1500;
	dirLight.shadow.camera.left = d * -1;
	dirLight.shadow.camera.right = d;
	dirLight.shadow.camera.top = d;
	dirLight.shadow.camera.bottom = d * -1;
	// Add directional Light to scene
	scene.add(dirLight);
	// Floor
	let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
	let floorMaterial = new THREE.MeshPhongMaterial({
		color: 0xeeeeee,
		shininess: 0,
	});
	let floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = -0.5 * Math.PI;
	floor.receiveShadow = true;
	floor.position.y = -11;
	scene.add(floor);
	let geometry = new THREE.SphereGeometry(8, 32, 32);
	let material = new THREE.MeshBasicMaterial({ color: 0x9bffaf }); // 0xf2ce2e
	let sphere = new THREE.Mesh(geometry, material);
	sphere.position.z = -15;
	sphere.position.y = -2.5;
	sphere.position.x = -0.25;
	scene.add(sphere);
}

function update() {
	if (mixer) {
		mixer.update(clock.getDelta());
	}
	if (resizeRendererToDisplaySize(renderer)) {
		const canvas = renderer.domElement;
		camera.aspect = canvas.clientWidth / canvas.clientHeight;
		camera.updateProjectionMatrix();
	}
	renderer.render(scene, camera);
	requestAnimationFrame(update);
}

function resizeRendererToDisplaySize(renderer) {
	const canvas = renderer.domElement;
	let width = window.innerWidth - 1480;
	let height = window.innerHeight - 500;
	let canvasPixelWidth = canvas.width / window.devicePixelRatio;
	let canvasPixelHeight = canvas.height / window.devicePixelRatio;
	const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
	if (true) {
		renderer.setSize(200, 200, false);
	}
	return needResize;
}

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
	createCanvas(133, 100);
	video = createCapture(VIDEO);
	// video = createVideo('assets/challenge_creator.mp4', vidLoad);
	video.size(640, 480);
	video.hide();
	// console.log(video);
	// video.height = 100;
	// video.width = 150;
	// video.pause();
	poseNet = ml5.poseNet(video, modelReady);
	poseNet.on('pose', gotPoses);
	init();
	update();
}
function vidLoad() {
	// video.loop();
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
			// console.log(poses[0].pose.score, maxDist);
			isMaxComputed = true;
		}
		let userVector = getVector(poses[0].pose, ref, maxDist);
		// console.log(userVector);
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
				userMeta[reps] = seconds;
				reps++;
				console.log(userMeta);
				if ((reps / challengeSquats) * 100 < 50)
					userCounter.className = `progress-circle p${Math.floor(
						(reps / challengeSquats) * 100
					)}`;
				else
					userCounter.className = `progress-circle over50 p${Math.floor(
						(reps / challengeSquats) * 100
					)}`;
				userCount.innerText = reps;
				// squat.clampWhenFinished = true;
				if (squatAction != null) {
					squatAction.stop();
					squatAction.play();
				}
				// challenges.doc(CHALLENGE_ID).set({ data: userMeta }); //sending to firestore
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
	if (count <= 4) {
		// timer is about so start
		translate(133, 0);
	}
	scale(-1, 1);
	image(video, 0, 0, 133, 100);
	// ellipse(ref.x, ref.y, 10);
	// textSize(10);
	// text('' + similarityScoreStanding, 10, 10);
	// text('' + similarityScoreSitting, 10, 40);
	// // textSize(100);
	// // fill(0, 0, 0);
	// // text('' + reps, 10, 80);
	// //fill(0,0,255);
	// //ellipse(eyelX, eyelY, 50);
	// fill(255, 0, 0);
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
			// fill(255, 0, 0);
			// noStroke();
			// ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
		}
	}
	// }
}
