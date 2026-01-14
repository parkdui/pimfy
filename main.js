import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
renderer.setClearColor(0xffffff); // Default white background
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
document.body.appendChild( renderer.domElement );

// PMREMGenerator for HDRI environment maps
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
let hdriEnvironment = null; // Store HDRI environment for case 6

// Handle window resize
window.addEventListener( 'resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
} );

// Add lights
const ambientLight = new THREE.AmbientLight( 0xffffff, 1 );
scene.add( ambientLight );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set( 5, 10, 5 );
scene.add( directionalLight );

const loader = new GLTFLoader();
let mainPigeon = null; // Main pigeon that rotates in center (maintained in all cases)
let pigeonInstances = []; // Additional pigeon instances for case 1
let pigeonRotationSpeed = 0.01; // Rotation speed for main pigeon
let pigeonModel = null; // Store the loaded model for cloning

loader.load( 'assets/pigeon.glb', function( gltf ) {
	mainPigeon = gltf.scene;
	scene.add( mainPigeon );
	pigeonModel = gltf.scene.clone(); // Store model for cloning
} );

camera.position.z = 1;

// Case switching system
let currentCase = 1; // Default case
let case3FormationType = 0; // 0: sphere, 1: box, 2: torus

function switchCase(caseNumber) {
	if (caseNumber >= 1 && caseNumber <= 6) {
		currentCase = caseNumber;
		onCaseChange(currentCase);
		console.log('Switched to case:', currentCase);
	}
}

// Background geometries for case 3
let backgroundGeometries = [];
// GIF images for case 3
let gifImages = [];
// Background pigeon instances for case 4
let backgroundPigeons = [];
let case4GradientTime = 0;
// Sun sphere for case 5
let sunSphere = null;
let sunLight = null;
let sunBloomLayers = []; // Bloom effect layers around sun
// 2D shapes for cases
let twoDShapes = []; // Array to store 2D shape meshes

// Initialize case - clean up previous case elements
function initializeCase(caseNumber) {
	// Clean up background geometries from case 3
	backgroundGeometries.forEach(geo => {
		scene.remove(geo);
		if (geo.geometry) geo.geometry.dispose();
		if (geo.material) geo.material.dispose();
	});
	backgroundGeometries = [];
	
	// Clean up GIF images from case 3
	gifImages.forEach(img => {
		if (img.parentNode) {
			img.parentNode.removeChild(img);
		}
	});
	gifImages = [];
	
	// Clean up background pigeons from case 4
	backgroundPigeons.forEach(pigeon => {
		scene.remove(pigeon);
		pigeon.traverse((child) => {
			if (child.isMesh) {
				if (child.geometry) child.geometry.dispose();
				if (child.material) child.material.dispose();
			}
		});
	});
	backgroundPigeons = [];
	
	// Clean up sun sphere, light, and bloom layers from case 5
	if (sunSphere) {
		scene.remove(sunSphere);
		if (sunSphere.geometry) sunSphere.geometry.dispose();
		if (sunSphere.material) sunSphere.material.dispose();
		sunSphere = null;
	}
	if (sunLight) {
		scene.remove(sunLight);
		if (sunLight.target) scene.remove(sunLight.target);
		sunLight = null;
	}
	sunBloomLayers.forEach(layer => {
		scene.remove(layer);
		if (layer.geometry) layer.geometry.dispose();
		if (layer.material) layer.material.dispose();
	});
	sunBloomLayers = [];
	
	// Clean up 2D shapes
	twoDShapes.forEach(shape => {
		scene.remove(shape);
		if (shape.geometry) shape.geometry.dispose();
		if (shape.material) {
			if (shape.material.map) shape.material.map.dispose();
			shape.material.dispose();
		}
	});
	twoDShapes = [];
	
	// Reset lights to default
	ambientLight.intensity = 0.6;
	directionalLight.intensity = 0.8;
	
	// Reset background to white
	renderer.setClearColor(0xffffff);
}

function onCaseChange(caseNumber) {
	// Initialize: clean up previous case
	initializeCase(caseNumber);
	
	switch(caseNumber) {
		case 1:
			// Case 1: Black background (already set in initializeCase)
			break;
		case 2:
			// Case 2: Prepare for texture/light changes
			break;
		case 3:
			// Case 3: Switch to next formation type
			case3FormationType = (case3FormationType + 1) % 3; // Cycle through 0, 1, 2
			console.log('Case 3 formation type:', case3FormationType === 0 ? 'Sphere' : case3FormationType === 1 ? 'Box' : 'Torus');
			
			// Assign audio type to each pigeon instance (bass or treble)
			pigeonInstances.forEach((pigeon, index) => {
				// Randomly assign audio type: bass or treble
				pigeon.userData.audioType = Math.random() > 0.5 ? 'bass' : 'treble';
				// Store initial position for smooth transition
				pigeon.userData.startPosition = pigeon.position.clone();
			});
			break;
		case 4:
			// Case 4: Setup texture change for pigeon instances and background pigeons
			// Store original materials for each pigeon instance
			pigeonInstances.forEach((pigeon) => {
				pigeon.traverse((child) => {
					if (child.isMesh && child.material) {
						// Store original material
						if (!child.userData.originalMaterial) {
							child.userData.originalMaterial = child.material.clone();
						}
						// Assign audio threshold for this instance
						if (child.userData.audioThreshold === undefined) {
							child.userData.audioThreshold = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
						}
					}
				});
			});
			
			// Create background pigeons with different colors (simple kaleidoscope effect)
			if (pigeonModel) {
				const bgPigeonCount = 12; // Number of background pigeons
				const colors = [
					0xff6b6b, // Red
					0x4ecdc4, // Cyan
					0x45b7d1, // Blue
					0xf9ca24, // Yellow
					0x6c5ce7, // Purple
					0xa29bfe  // Light purple
				];
				
				for (let i = 0; i < bgPigeonCount; i++) {
					const bgPigeon = pigeonModel.clone();
					
					// Apply different color to each pigeon
					bgPigeon.traverse((child) => {
						if (child.isMesh && child.material) {
							const material = child.material.clone();
							const colorIndex = i % colors.length;
							material.color.setHex(colors[colorIndex]);
							material.emissive.setHex(colors[colorIndex]);
							material.emissiveIntensity = 0.3;
							child.material = material;
						}
					});
					
					// Position in a circle pattern behind everything
					const angle = (i / bgPigeonCount) * Math.PI * 2;
					const radius = 8;
					bgPigeon.position.set(
						Math.cos(angle) * radius,
						Math.sin(angle) * radius,
						-15 // Behind everything
					);
					
					// Scale down
					bgPigeon.scale.set(2, 2, 2);
					
					// Rotate to face center
					bgPigeon.lookAt(0, 0, -15);
					
					scene.add(bgPigeon);
					backgroundPigeons.push(bgPigeon);
				}
			}
			break;
		case 5:
			// Case 5: Create sun sphere with bloom effect behind main pigeon
			const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
			const sunMaterial = new THREE.MeshBasicMaterial({
				color: 0xffff00,
				emissive: 0xffff00,
				emissiveIntensity: 2.0
			});
			sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
			sunSphere.position.set(0, 0, -20); // Far behind main pigeon (z = -20)
			scene.add(sunSphere);
			
			// Create bloom layers around sun (soft glow effect)
			const bloomLayerCount = 5;
			for (let i = 0; i < bloomLayerCount; i++) {
				const bloomGeometry = new THREE.SphereGeometry(1.5 + i * 0.8, 32, 32);
				const bloomMaterial = new THREE.MeshBasicMaterial({
					color: 0xffff00,
					emissive: 0xffff00,
					emissiveIntensity: 0.3 - i * 0.05,
					transparent: true,
					opacity: 0.4 - i * 0.07,
					side: THREE.BackSide // Render inside out for glow
				});
				const bloomLayer = new THREE.Mesh(bloomGeometry, bloomMaterial);
				bloomLayer.position.set(0, 0, -20);
				scene.add(bloomLayer);
				sunBloomLayers.push(bloomLayer);
			}
			
			// Store main pigeon's original materials to protect from light
			if (mainPigeon) {
				mainPigeon.traverse((child) => {
					if (child.isMesh && child.material) {
						if (!child.userData.originalMainPigeonMaterial) {
							child.userData.originalMainPigeonMaterial = child.material.clone();
							child.userData.originalMainPigeonColor = child.material.color.clone();
							child.userData.originalMainPigeonEmissive = child.material.emissive.clone();
							child.userData.originalMainPigeonEmissiveIntensity = child.material.emissiveIntensity || 0;
						}
					}
				});
			}
			
			// Add spotlight at sun position (pointing forward, away from main pigeon)
			sunLight = new THREE.SpotLight(0xffffff, 3, 50, Math.PI / 6, 0.5);
			sunLight.position.set(0, 0, -20);
			sunLight.target.position.set(0, 0, 5); // Point forward, past main pigeon
			scene.add(sunLight);
			scene.add(sunLight.target);
			break;
		case 6:
			// Case 6: HDRI Background with audio-reactive elements
			// Load HDRI environment map
			const rgbeLoader = new RGBELoader();
			// Note: Replace 'path/to/your/hdri.hdr' with your actual HDRI file path
			// For now, create a procedural HDRI-like environment
			const envMap = pmremGenerator.fromScene(new THREE.Scene()).texture;
			
			// Set HDRI as environment
			scene.environment = envMap;
			scene.background = envMap;
			
			// Alternative: Create a gradient background that reacts to audio
			// This creates an HDRI-like effect without requiring an HDRI file
			const audioReactiveBackground = () => {
				if (window.audioData && window.audioData.level) {
					const intensity = window.audioData.level;
					const color1 = new THREE.Color(0x000033); // Dark blue
					const color2 = new THREE.Color(0x003366); // Medium blue
					const color3 = new THREE.Color(0x0066cc); // Bright blue
					
					// Mix colors based on audio
					const bgColor = new THREE.Color();
					bgColor.lerpColors(color1, color2, intensity * 0.5);
					bgColor.lerp(bgColor, color3, intensity * 0.3);
					
					renderer.setClearColor(bgColor);
				} else {
					// Default gradient-like background
					renderer.setClearColor(0x001122);
				}
			};
			
			// Set up audio-reactive background update
			hdriEnvironment = { update: audioReactiveBackground };
			
			// Create spheres and boxes
			for (let i = 0; i < 10; i++) {
				if (Math.random() > 0.5) {
					const geometry = new THREE.SphereGeometry(0.2, 16, 16);
					const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
					const sphere = new THREE.Mesh(geometry, material);
					sphere.position.set(
						(Math.random() - 0.5) * 20,
						(Math.random() - 0.5) * 20,
						(Math.random() - 0.5) * 20 - 5
					);
					scene.add(sphere);
					backgroundGeometries.push(sphere);
				} else {
					const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
					const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
					const box = new THREE.Mesh(geometry, material);
					box.position.set(
						(Math.random() - 0.5) * 20,
						(Math.random() - 0.5) * 20,
						(Math.random() - 0.5) * 20 - 5
					);
					scene.add(box);
					backgroundGeometries.push(box);
				}
			}
			
			// Create multiple GIF images on canvas
			const gifCount = 8; // Number of GIF images to create
			for (let i = 0; i < gifCount; i++) {
				const img = document.createElement('img');
				img.src = 'assets/pigeon-walk.gif';
				img.style.position = 'absolute';
				img.style.width = '150px'; // Adjust size as needed
				img.style.height = 'auto';
				img.style.pointerEvents = 'none'; // Allow clicks to pass through
				img.style.zIndex = '1';
				
				// Random position on screen
				const x = Math.random() * (window.innerWidth - 150);
				const y = Math.random() * (window.innerHeight - 150);
				img.style.left = x + 'px';
				img.style.top = y + 'px';
				
				// Random rotation
				const rotation = (Math.random() - 0.5) * 360;
				img.style.transform = `rotate(${rotation}deg)`;
				
				// Random opacity
				img.style.opacity = 0.7 + Math.random() * 0.3;
				
				document.body.appendChild(img);
				gifImages.push(img);
			}
			break;
	}
}

// Keyboard interaction structure
const keys = {
	p: false,
	i: false,
	m: false,
	f: false,
	y: false
};

function handleKeyDown(event) {
	const key = event.key.toLowerCase();
	
	// Handle case switching (1-6)
	if (key >= '1' && key <= '6') {
		const caseNumber = parseInt(key);
		switchCase(caseNumber);
		return;
	}
	
	// Handle other keys (p, i, m, f, y)
	if (keys.hasOwnProperty(key)) {
		keys[key] = true;
		onKeyPress(key);
	}
}

function handleKeyUp(event) {
	const key = event.key.toLowerCase();
	if (keys.hasOwnProperty(key)) {
		keys[key] = false;
		onKeyRelease(key);
	}
}

function onKeyPress(key) {
	switch(key) {
		case 'p':
			// Increase rotation speed (all cases)
			pigeonRotationSpeed += 0.1;
			console.log('Rotation speed increased to:', pigeonRotationSpeed);
			break;
		case 'i':
			// Decrease rotation speed (all cases)
			pigeonRotationSpeed = Math.max(0, pigeonRotationSpeed - 0.1);
			console.log('Rotation speed decreased to:', pigeonRotationSpeed);
			break;
		case 'm':
			// Add pigeon at random position (all cases)
			if (pigeonModel) {
				const newPigeon = pigeonModel.clone();
				newPigeon.position.set(
					(Math.random() - 0.5) * 10,
					(Math.random() - 0.5) * 10,
					(Math.random() - 0.5) * 10
				);
				scene.add(newPigeon);
				pigeonInstances.push(newPigeon);
				console.log('Pigeon added. Total:', pigeonInstances.length);
			}
			break;
		case 'f':
			// Remove one pigeon (all cases)
			if (pigeonInstances.length > 0) {
				const removedPigeon = pigeonInstances.pop();
				scene.remove(removedPigeon);
				console.log('Pigeon removed. Remaining:', pigeonInstances.length);
			}
			break;
		case 'y':
			// Move camera closer (all cases)
			camera.position.z = Math.max(0.1, camera.position.z - 0.01);
			console.log('Camera z position:', camera.position.z);
			break;
	}
}

function onKeyRelease(key) {
	switch(key) {
		case 'p':
			// Handle 'p' key release
			break;
		case 'i':
			// Handle 'i' key release
			break;
		case 'm':
			// Handle 'm' key release
			break;
		case 'f':
			// Handle 'f' key release
			break;
		case 'y':
			// Handle 'y' key release
			break;
	}
}

// Add event listeners
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Audio listener for interactive visuals
let audioContext = null;
let analyser = null;
let audioSource = null;
let dataArray = null;
let bufferLength = 0;

// Audio data for visualization
const audioData = {
	frequencyData: null,
	timeData: null,
	averageVolume: 0,
	peakFrequency: 0
};

// Initialize audio context
function initAudio() {
	try {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
		analyser = audioContext.createAnalyser();
		analyser.fftSize = 256; // Frequency resolution
		bufferLength = analyser.frequencyBinCount;
		dataArray = new Uint8Array(bufferLength);
		
		audioData.frequencyData = new Uint8Array(bufferLength);
		audioData.timeData = new Uint8Array(bufferLength);
		
		console.log('Audio context initialized');
	} catch (error) {
		console.error('Error initializing audio:', error);
	}
}

// Load and play audio file
function loadAudioFile(url) {
	if (!audioContext) {
		initAudio();
	}
	
	const audio = new Audio(url);
	const source = audioContext.createMediaElementSource(audio);
	source.connect(analyser);
	analyser.connect(audioContext.destination);
	
	audioSource = audio;
	audio.play();
	
	console.log('Audio file loaded:', url);
}

// Start microphone input
async function startMicrophone() {
	try {
		if (!audioContext) {
			initAudio();
		}
		
		// Resume audio context if suspended (required by some browsers)
		if (audioContext.state === 'suspended') {
			await audioContext.resume();
		}
		
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const source = audioContext.createMediaStreamSource(stream);
		source.connect(analyser);
		
		audioSource = stream;
		console.log('Microphone input started');
		return true;
	} catch (error) {
		console.error('Error accessing microphone:', error);
		throw error;
	}
}

// Update audio data (call this in animate loop)
function updateAudioData() {
	if (!analyser || !audioData.frequencyData) return;
	
	// Get frequency data
	analyser.getByteFrequencyData(audioData.frequencyData);
	
	// Get time domain data
	analyser.getByteTimeDomainData(audioData.timeData);
	
	// Calculate average volume
	let sum = 0;
	for (let i = 0; i < bufferLength; i++) {
		sum += audioData.frequencyData[i];
	}
	audioData.averageVolume = sum / bufferLength;
	
	// Find peak frequency
	let max = 0;
	let maxIndex = 0;
	for (let i = 0; i < bufferLength; i++) {
		if (audioData.frequencyData[i] > max) {
			max = audioData.frequencyData[i];
			maxIndex = i;
		}
	}
	audioData.peakFrequency = maxIndex;
}

// Get frequency value at specific index (0-1 normalized)
function getFrequencyValue(normalizedIndex) {
	if (!audioData.frequencyData) return 0;
	const index = Math.floor(normalizedIndex * (bufferLength - 1));
	return audioData.frequencyData[index] / 255;
}

// Get bass, mid, treble levels
function getFrequencyBands() {
	if (!audioData.frequencyData) return { bass: 0, mid: 0, treble: 0 };
	
	const bassEnd = Math.floor(bufferLength * 0.1);
	const midEnd = Math.floor(bufferLength * 0.5);
	
	let bass = 0, mid = 0, treble = 0;
	
	for (let i = 0; i < bassEnd; i++) {
		bass += audioData.frequencyData[i];
	}
	for (let i = bassEnd; i < midEnd; i++) {
		mid += audioData.frequencyData[i];
	}
	for (let i = midEnd; i < bufferLength; i++) {
		treble += audioData.frequencyData[i];
	}
	
	return {
		bass: (bass / bassEnd) / 255,
		mid: (mid / (midEnd - bassEnd)) / 255,
		treble: (treble / (bufferLength - midEnd)) / 255
	}
}

// Initialize audio on user interaction (required by browsers)
async function initAudioOnInteraction() {
	if (!audioContext) {
		initAudio();
	}
	// Start microphone on first click
	try {
		await startMicrophone();
		console.log('Microphone initialized successfully');
	} catch (error) {
		console.error('Failed to start microphone:', error);
		alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
	}
}

// Add click listener to initialize audio
window.addEventListener('click', initAudioOnInteraction, { once: true });

// 2D Shape creation functions
function create2DRectangle(width, height, color, position = { x: 0, y: 0, z: 0 }) {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d');
	
	// Draw rectangle
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	const texture = new THREE.CanvasTexture(canvas);
	const geometry = new THREE.PlaneGeometry(width, height);
	const material = new THREE.MeshBasicMaterial({ 
		map: texture,
		transparent: true,
		side: THREE.DoubleSide
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.position.set(position.x, position.y, position.z);
	
	scene.add(mesh);
	twoDShapes.push(mesh);
	return mesh;
}

function create2DEllipse(width, height, color, position = { x: 0, y: 0, z: 0 }) {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d');
	
	// Draw ellipse
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2);
	ctx.fill();
	
	const texture = new THREE.CanvasTexture(canvas);
	const geometry = new THREE.PlaneGeometry(width, height);
	const material = new THREE.MeshBasicMaterial({ 
		map: texture,
		transparent: true,
		side: THREE.DoubleSide
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.position.set(position.x, position.y, position.z);
	
	scene.add(mesh);
	twoDShapes.push(mesh);
	return mesh;
}

function create2DCircle(radius, color, position = { x: 0, y: 0, z: 0 }) {
	return create2DEllipse(radius * 2, radius * 2, color, position);
}

// Helper functions for easy usage
function add2DRectangle(width, height, color, x, y, z) {
	return create2DRectangle(width, height, color, { x, y, z });
}

function add2DEllipse(width, height, color, x, y, z) {
	return create2DEllipse(width, height, color, { x, y, z });
}

function add2DCircle(radius, color, x, y, z) {
	return create2DCircle(radius, color, { x, y, z });
}

// Gradient background function for case 4 and 5
function updateGradientBackground(isCase5 = false) {
	// Faster color transition for case 5
	const speed = isCase5 ? 0.03 : 0.01;
	case4GradientTime += speed;
	
	const gradientColors = [
		new THREE.Color(0x0000ff), // Bright blue
		new THREE.Color(0x0066ff), // Medium blue
		new THREE.Color(0x0099ff), // Light blue
		new THREE.Color(0x00ccff), // Cyan blue
		new THREE.Color(0x0000cc), // Dark blue
		new THREE.Color(0x0033ff)  // Medium bright blue
	];
	
	// For case 5, add audio-reactive color variation
	let audioIntensity = 0;
	if (isCase5) {
		const freqBands = getFrequencyBands();
		audioIntensity = (freqBands.bass + freqBands.mid + freqBands.treble) / 3;
	}
	
	// Interpolate between colors based on time
	const colorIndex = Math.floor(case4GradientTime) % gradientColors.length;
	const nextColorIndex = (colorIndex + 1) % gradientColors.length;
	const t = case4GradientTime % 1;
	
	const currentColor = gradientColors[colorIndex].clone();
	const nextColor = gradientColors[nextColorIndex].clone();
	currentColor.lerp(nextColor, t);
	
	// For case 5, add dynamic brightness variation based on audio
	if (isCase5 && audioIntensity > 0) {
		// Add slight brightness variation
		const brightnessVariation = 0.2 + audioIntensity * 0.3;
		currentColor.multiplyScalar(brightnessVariation);
	}
	
	// Apply gradient background color (darker version for less white)
	const bgColor = currentColor.clone();
	bgColor.multiplyScalar(0.3); // Make it darker (less white)
	renderer.setClearColor(bgColor);
}

function animate() {
	// Update audio data
	updateAudioData();
	
	// Main pigeon rotation (maintained in all cases)
	if (mainPigeon) {
		mainPigeon.rotation.y += pigeonRotationSpeed;
		mainPigeon.rotation.z += pigeonRotationSpeed;
	}
	
	// Case-specific behaviors
	switch(currentCase) {
		case 1:
			// Case 1: Visual interaction based on audio volume
			if (audioData.averageVolume > 0) {
				const volumeNormalized = audioData.averageVolume / 255;
				
				// Background brightness: subtle change from black (0) to dark gray (0.15)
				const brightness = volumeNormalized * 0.15;
				renderer.setClearColor(new THREE.Color(brightness, brightness, brightness));
				
				// Optional: Scale main pigeon based on volume
				if (mainPigeon) {
					const scale = 1 + volumeNormalized * 0.3; // Scale from 1.0 to 1.3
					mainPigeon.scale.set(scale, scale, scale);
				}
			} else {
				// No audio: keep white background
				renderer.setClearColor(0xffffff);
				if (mainPigeon) {
					mainPigeon.scale.set(1, 1, 1);
				}
			}
			break;
			
		case 2:
			// Case 2: Y scale of pigeon instances based on bass
			const bands = getFrequencyBands();
			// Y scale changes based on bass (0.5 to 2.0)
			const yScale = 0.5 + bands.bass * 1.5;
			
			// Apply y scale to all pigeon instances created by 'm' key
			pigeonInstances.forEach(pigeon => {
				pigeon.scale.y = yScale;
			});
			break;
			
		case 3:
			// Case 3: Dynamic formations and audio-reactive y scale
			if (pigeonInstances.length > 0) {
				const freqBands = getFrequencyBands();
				const lerpSpeed = 0.05;
				let targetX, targetY, targetZ;
				
				// Move pigeon instances to formation based on type (smooth transition)
				pigeonInstances.forEach((pigeon, index) => {
					const total = pigeonInstances.length;
					
					if (case3FormationType === 0) {
						// Sphere formation
						const radius = 3;
						const u = index / (total - 1); // 0 to 1
						const v = index / total; // 0 to 1
						const theta = u * Math.PI * 2; // Longitude
						const phi = v * Math.PI; // Latitude
						
						targetX = radius * Math.sin(phi) * Math.cos(theta);
						targetY = radius * Math.cos(phi);
						targetZ = radius * Math.sin(phi) * Math.sin(theta);
						
					} else if (case3FormationType === 1) {
						// Box formation
						const size = 2.5;
						const perSide = Math.ceil(Math.cbrt(total)); // Cube root
						const x = index % perSide;
						const y = Math.floor(index / perSide) % perSide;
						const z = Math.floor(index / (perSide * perSide));
						
						targetX = (x / (perSide - 1) - 0.5) * size * 2;
						targetY = (y / (perSide - 1) - 0.5) * size * 2;
						targetZ = (z / (perSide - 1) - 0.5) * size * 2;
						
					} else if (case3FormationType === 2) {
						// Torus formation
						const majorRadius = 2.5;
						const minorRadius = 1.0;
						const angle = (index / total) * Math.PI * 2;
						const minorAngle = (index * 3) % (Math.PI * 2); // Multiple rotations
						
						targetX = (majorRadius + minorRadius * Math.cos(minorAngle)) * Math.cos(angle);
						targetY = minorRadius * Math.sin(minorAngle);
						targetZ = (majorRadius + minorRadius * Math.cos(minorAngle)) * Math.sin(angle);
					}
					
					// Smooth transition to target position
					pigeon.position.x += (targetX - pigeon.position.x) * lerpSpeed;
					pigeon.position.y += (targetY - pigeon.position.y) * lerpSpeed;
					pigeon.position.z += (targetZ - pigeon.position.z) * lerpSpeed;
					
					// Y scale based on audio type
					if (pigeon.userData.audioType === 'bass') {
						// Bass-reactive: y scale changes with bass
						const yScale = 0.5 + freqBands.bass * 1.5; // 0.5 to 2.0
						pigeon.scale.y = yScale;
					} else if (pigeon.userData.audioType === 'treble') {
						// Treble-reactive: y scale changes with treble
						const yScale = 0.5 + freqBands.treble * 1.5; // 0.5 to 2.0
						pigeon.scale.y = yScale;
					}
				});
			}
			break;
			
		case 4:
			// Case 4: Texture change based on audio for each pigeon instance + dynamic rotating background pigeons + gradient background
			// Animated gradient background
			updateGradientBackground(false);
			
			// Get audio data for dynamic movement
			const case4FreqBands = getFrequencyBands();
			const audioIntensity = (case4FreqBands.bass + case4FreqBands.mid + case4FreqBands.treble) / 3;
			
			// Dynamic rotation and movement of background pigeons
			backgroundPigeons.forEach((bgPigeon, index) => {
				// Rotation speed based on audio intensity
				const baseRotationSpeed = 0.01;
				const audioRotationSpeed = audioIntensity * 0.05;
				bgPigeon.rotation.y += baseRotationSpeed + audioRotationSpeed;
				bgPigeon.rotation.x += (baseRotationSpeed * 0.5) * (index % 2 === 0 ? 1 : -1); // Alternate direction
				bgPigeon.rotation.z += (baseRotationSpeed * 0.3) * (index % 3 === 0 ? 1 : -1);
				
				// Dynamic radius based on audio
				const baseRadius = 8;
				const dynamicRadius = baseRadius + audioIntensity * 3; // Expand/contract with audio
				
				// Slight rotation around center with audio-reactive speed
				const angle = (index / backgroundPigeons.length) * Math.PI * 2;
				const rotationSpeed = 0.5 + audioIntensity * 2; // Faster rotation with audio
				bgPigeon.position.x = Math.cos(angle + bgPigeon.rotation.y * rotationSpeed) * dynamicRadius;
				bgPigeon.position.y = Math.sin(angle + bgPigeon.rotation.y * rotationSpeed) * dynamicRadius;
				
				// Dynamic scale based on audio
				const baseScale = 2;
				const scaleVariation = 1 + audioIntensity * 0.5; // Scale up with audio
				bgPigeon.scale.set(
					baseScale * scaleVariation,
					baseScale * scaleVariation,
					baseScale * scaleVariation
				);
				
				// Slight vertical movement
				bgPigeon.position.z = -15 + Math.sin(bgPigeon.rotation.y * 2) * 2;
			});
			
			// Texture change and vertical movement for pigeon instances
			if (pigeonInstances.length > 0) {
				const audioLevel = audioIntensity; // Use same audio intensity
				
				pigeonInstances.forEach((pigeon, index) => {
					// Initialize vertical movement properties
					if (pigeon.userData.verticalOffset === undefined) {
						pigeon.userData.verticalOffset = 0;
						pigeon.userData.verticalSpeed = 0.02 + Math.random() * 0.03; // Random speed for each pigeon
						pigeon.userData.verticalAmplitude = 1 + Math.random() * 2; // Random amplitude
						pigeon.userData.verticalPhase = Math.random() * Math.PI * 2; // Random phase
					}
					
					// Update vertical movement (up and down)
					pigeon.userData.verticalOffset += pigeon.userData.verticalSpeed;
					const verticalMovement = Math.sin(pigeon.userData.verticalOffset + pigeon.userData.verticalPhase) * pigeon.userData.verticalAmplitude;
					
					// Apply vertical movement with audio-reactive intensity
					const baseY = pigeon.userData.baseY !== undefined ? pigeon.userData.baseY : pigeon.position.y;
					if (pigeon.userData.baseY === undefined) {
						pigeon.userData.baseY = pigeon.position.y;
					}
					pigeon.position.y = baseY + verticalMovement * (1 + audioIntensity * 0.5); // More movement with audio
					
					pigeon.traverse((child) => {
						if (child.isMesh && child.material && child.userData.originalMaterial) {
							const threshold = child.userData.audioThreshold || 0.5;
							
							if (audioLevel > threshold) {
								// Change texture/material when audio exceeds threshold
								if (!child.userData.textureChanged) {
									// Create a new material with bright white color
									const newMaterial = child.userData.originalMaterial.clone();
									newMaterial.color.setHex(0xffffff); // Bright white
									newMaterial.emissive.setHex(0xffffff); // Emissive white
									newMaterial.emissiveIntensity = 1.0; // Strong emissive
									child.material = newMaterial;
									child.userData.textureChanged = true;
								}
							} else {
								// Restore original texture/material when audio is below threshold
								if (child.userData.textureChanged) {
									child.material = child.userData.originalMaterial.clone();
									child.userData.textureChanged = false;
								}
							}
						}
					});
				});
			}
			break;
			
		case 5:
			// Case 5: Starfield effect for pigeon instances + sun with bloom + dynamic gradient background
			// Dynamic animated gradient background (blue-based, audio-reactive)
			updateGradientBackground(true);
			
			// Update sun brightness and bloom based on audio
			if (sunSphere && sunLight) {
				const case5FreqBands = getFrequencyBands();
				const audioIntensity = (case5FreqBands.bass + case5FreqBands.mid + case5FreqBands.treble) / 3;
				
				// Sun brightness reacts to audio (1.0 to 3.0)
				const sunBrightness = 1.0 + audioIntensity * 2.0;
				sunSphere.material.emissiveIntensity = sunBrightness;
				sunLight.intensity = sunBrightness;
				
				// Slight pulsing animation
				const pulse = Math.sin(Date.now() * 0.005) * 0.1;
				sunSphere.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
				
				// Update bloom layers - expand/contract with audio
				sunBloomLayers.forEach((layer, index) => {
					const baseScale = 1 + index * 0.8;
					const audioScale = 1 + audioIntensity * 0.5;
					const pulseScale = 1 + Math.sin(Date.now() * 0.003 + index) * 0.1;
					layer.scale.set(baseScale * audioScale * pulseScale, baseScale * audioScale * pulseScale, baseScale * audioScale * pulseScale);
					
					// Update opacity based on audio
					const baseOpacity = 0.4 - index * 0.07;
					layer.material.opacity = baseOpacity * (0.7 + audioIntensity * 0.3);
					layer.material.emissiveIntensity = (0.3 - index * 0.05) * (1 + audioIntensity);
				});
			}
			
			// Starfield effect: move pigeon instances towards camera (z+)
			if (pigeonInstances.length > 0) {
				const speed = 0.1; // Movement speed
				pigeonInstances.forEach((pigeon, index) => {
					// Initialize different x rotation for each pigeon
					if (pigeon.userData.initialRotationX === undefined) {
						pigeon.userData.initialRotationX = (Math.random() - 0.5) * Math.PI * 2; // Random rotation
					}
					
					// Initialize different reset z position for continuous flow
					if (pigeon.userData.resetZ === undefined) {
						// Stagger the reset positions so they don't all reset at once
						pigeon.userData.resetZ = -20 - (index * 2); // Each pigeon starts at different z
					}
					
					// Apply different x rotation
					pigeon.rotation.x = pigeon.userData.initialRotationX;
					
					// Move towards camera (towards sun at center)
					pigeon.position.z += speed;
					
					// If pigeon passes camera, reset to back with staggered position
					if (pigeon.position.z > camera.position.z + 5) {
						// Reset to staggered back position for continuous flow
						pigeon.position.z = pigeon.userData.resetZ;
						// Randomize x, y position for variety
						pigeon.position.x = (Math.random() - 0.5) * 10;
						pigeon.position.y = (Math.random() - 0.5) * 10;
						// Reset rotation to new random value
						pigeon.userData.initialRotationX = (Math.random() - 0.5) * Math.PI * 2;
					}
					
					// Scale based on distance (closer = bigger)
					const distance = Math.abs(pigeon.position.z - camera.position.z);
					const scale = Math.max(0.1, 1.0 - distance / 20);
					pigeon.scale.set(scale, scale, scale);
					
					// Apply light influence from sun (only for pigeon instances, not main pigeon)
					// Sun is at z = -10, so calculate distance from sun
					const sunPosition = new THREE.Vector3(0, 0, -10);
					const distanceToSun = pigeon.position.distanceTo(sunPosition);
					const lightInfluence = Math.max(0, 1 - distanceToSun / 15); // Max influence within 15 units
					
					pigeon.traverse((child) => {
						if (child.isMesh && child.material) {
							// Increase emissive based on proximity to sun
							if (!child.userData.originalEmissive) {
								child.userData.originalEmissive = child.material.emissive.clone();
								child.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;
							}
							
							const emissiveIntensity = child.userData.originalEmissiveIntensity + lightInfluence * 0.5;
							child.material.emissiveIntensity = emissiveIntensity;
							
							// Add slight yellow tint when close to sun
							if (lightInfluence > 0.3) {
								const sunTint = new THREE.Color(0xffff00);
								sunTint.multiplyScalar(lightInfluence * 0.3);
								child.material.emissive.lerp(sunTint, lightInfluence);
							}
						}
					});
				});
			}
			
			// Ensure main pigeon is not affected by sun light - restore original material
			if (mainPigeon) {
				mainPigeon.traverse((child) => {
					if (child.isMesh && child.material && child.userData.originalMainPigeonMaterial) {
						// Completely restore original material properties
						child.material.color.copy(child.userData.originalMainPigeonColor);
						child.material.emissive.copy(child.userData.originalMainPigeonEmissive);
						child.material.emissiveIntensity = child.userData.originalMainPigeonEmissiveIntensity;
						
						// If material was replaced, restore it
						if (child.material !== child.userData.originalMainPigeonMaterial) {
							child.material.dispose();
							child.material = child.userData.originalMainPigeonMaterial.clone();
						}
					}
				});
			}
			break;
			
		case 6:
			// Case 6: HDRI Background reacts to audio
			// Update HDRI background based on audio
			if (hdriEnvironment && hdriEnvironment.update) {
				hdriEnvironment.update();
			}
			
			// Light intensity based on audio
			if (window.audioData && window.audioData.level !== undefined) {
				directionalLight.intensity = 0.8 + window.audioData.level * 0.6;
				ambientLight.intensity = 0.4 + window.audioData.level * 0.4;
			}
			
			// Update geometry scales based on frequency data
			if (window.audioData && window.audioData.spectrum && backgroundGeometries.length > 0) {
				backgroundGeometries.forEach((geo, index) => {
					const freqIndex = index % window.audioData.spectrum.length;
					const freqValue = window.audioData.spectrum[freqIndex] / 255;
					const scale = 0.5 + freqValue * 1.5; // Scale from 0.5 to 2.0
					geo.scale.set(scale, scale, scale);
					
					// Also update rotation based on audio
					geo.rotation.x += freqValue * 0.02;
					geo.rotation.y += freqValue * 0.02;
				});
			}
			break;
	}

	renderer.render( scene, camera );

}
