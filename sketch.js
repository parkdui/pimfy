// p5.js sketch that overlays on top of Three.js canvas
let p5Canvas;
let caseNum = null; // Initialize caseNum

let rectPositions = []; // Store rect positions for case 3
let maxRects = 5; // Maximum number of rects for case 3

let textPositions = []; // Store text positions for case 4
let textArray = ['Installing...', 'Searching for home...', 'Finding the way...', 'Arriving at destination...', 'Initializing navigation system...', 'Flying through the sky...'];
let maxTexts = 10; // Maximum number of texts for case 4 (increased for full canvas)
let typewriterSpeed = 2; // Characters per frame for typewriter effect
let textDuration = 300; // Frames to keep text visible after completion (increased)
let textAddInterval = 60; // Frames between adding new texts (decreased for more texts)

let numberPositions = []; // Store random number positions for case 4
let maxNumbers = 15; // Maximum number of random numbers
let numberAddInterval = 3; // Frames between adding new numbers
let numberDuration = 200; // Frames to keep numbers visible

// Audio analysis for case 5 and 6
let mic;
let fft;
let audioLevel = 0;
let audioData = { level: 0, spectrum: [] }; // Shared audio data

// Case 5 glitch text animation
let glitchTexts = []; // Store glitch text positions for case 5
let glitchChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
let maxGlitchTexts = 20;

// Case 6 image
let case6Image = null;
let case6ImagePositions = [];

// Preload image for case 6 (optional - you can add your image path)
function preload() {
  // case6Image = loadImage('path/to/your/image.jpg');
}

function setup() {
  // Create canvas that matches window size
  p5Canvas = createCanvas(windowWidth, windowHeight);
  
  // Position p5.js canvas on top of Three.js canvas
  p5Canvas.position(0, 0);
  p5Canvas.style('z-index', '10');
  p5Canvas.style('pointer-events', 'auto'); // Enable pointer events for keyboard input
  
  // Set background to transparent
  background(0, 0, 0, 0);
  
  // Initialize audio analysis
  try {
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT();
    fft.setInput(mic);
    console.log('Audio input initialized');
  } catch (e) {
    console.log('Audio input not available:', e);
  }
  
  // Also listen to window keyboard events as backup
  window.addEventListener('keydown', handleKeyDown);
  
  // Make audio data available globally
  window.audioData = audioData;
  
  console.log('p5.js setup complete');
  console.log('Press keys 1-6 to switch cases');
}

function handleKeyDown(event) {
  // Handle number keys 1-6
  if (event.key >= '1' && event.key <= '6') {
    caseNum = event.key;
    console.log('Case switched to:', caseNum);
  }
}

function draw() {
  // Check caseNum (can be string '1'-'6' or number 1-6)
  if (caseNum !== null) {
    const caseValue = typeof caseNum === 'string' ? parseInt(caseNum) : caseNum;
    
    switch (caseValue) {
      case 1:
        // Don't clear for case 1 - let rects accumulate
        clear();
        case1Vis();
        break;
      case 2:
        // Clear for case 2 to see animation
        clear();
        case2Vis();
        break;
      case 3:
        clear();
        case3Vis();
        break;
      case 4:
        clear();
        case4Vis();
        break;
      case 5:
        clear();
        case5Vis();
        break;
      case 6:
        clear();
        case6Vis();
        break;
      default:
        clear();
    }
  } else {
    // Clear when no case is selected
    clear();
  }
}

function case1Vis() {
    noFill(); // Make sure fill is disabled
    stroke(255, 255, 255, random(0, 250));
    strokeWeight(2);
    rect(random(0, width), random(0, height), random(100, 150), random(100, 150));
}

function case2Vis() {
    noFill(); // Make sure fill is disabled
    stroke(0, 0, 255);
    strokeWeight(2);
    rect(random(0, width), random(0, height), random(10, 100), random(10, 100));
}

function case3Vis() {
    // Add new rect position periodically
    if (frameCount % 2 === 0) { // Add a new rect every 10 frames
        let newRect = {
            x: random(0, width),
            y: random(0, height),
            w: random(50, 150),
            h: random(50, 150)
        };
        rectPositions.push(newRect);
        
        // Limit the number of rects
        if (rectPositions.length > maxRects) {
            rectPositions.shift(); // Remove oldest rect
        }
    }
    
    // Draw connecting lines between all rects
    stroke(0, 0, 255);
    strokeWeight(2);
    noFill();
    
    for (let i = 0; i < rectPositions.length; i++) {
        for (let j = i + 1; j < rectPositions.length; j++) {
            let r1 = rectPositions[i];
            let r2 = rectPositions[j];
            
            // Calculate center points of rects
            let center1X = r1.x + r1.w / 2;
            let center1Y = r1.y + r1.h / 2;
            let center2X = r2.x + r2.w / 2;
            let center2Y = r2.y + r2.h / 2;
            
            // Draw line connecting the centers
            line(center1X, center1Y, center2X, center2Y);
        }
    }
    
    // Draw the rects themselves
    stroke(0, 0, 255, 200);
    strokeWeight(2);
    noFill();
    
    for (let i = 0; i < rectPositions.length; i++) {
        let r = rectPositions[i];
        noFill();
        rect(r.x, r.y, r.w, r.h);
        noStroke();
        fill(0, 0, 255);
        ellipse(r.x + r.w / 2, r.y + r.h / 2, 10, 10);
    }
}

function case4Vis() {
    // Add new text periodically - canvas full coverage
    if (frameCount % textAddInterval === 0) {
        // Generate random position anywhere on canvas
        let fullText = textArray[floor(random(0, textArray.length))];
        let newText = {
            x: random(50, width - 50), // Margin from edges
            y: random(50, height - 50),
            text: fullText,
            fullText: fullText, // Store the complete text
            size: random(12, 28),
            currentLength: 0, // Current number of characters displayed
            startFrame: frameCount, // Frame when this text was created
            isComplete: false,
            glitchOffsetX: 0, // For glitch effect
            glitchOffsetY: 0,
            glitchIntensity: random(0.5, 1.5) // Random glitch intensity
        };
        textPositions.push(newText);
        
        // Limit the number of texts
        if (textPositions.length > maxTexts) {
            textPositions.shift(); // Remove oldest text
        }
    }

    // Add new random numbers periodically
    if (frameCount % numberAddInterval === 0) {
        // Generate random number (can be integer or float)
        let randomNumber;
        if (random() > 0.5) {
            // Integer
            randomNumber = floor(random(0, 10000)).toString();
        } else {
            // Float with decimals
            randomNumber = random(0, 10000).toFixed(2);
        }
        
        let newNumber = {
            x: random(30, width - 30), // Margin from edges
            y: random(30, height - 30),
            number: randomNumber,
            size: random(10, 20),
            startFrame: frameCount,
            glitchOffsetX: 0,
            glitchOffsetY: 0,
            glitchIntensity: random(0.5, 2.0)
        };
        numberPositions.push(newNumber);
        
        // Limit the number of numbers
        if (numberPositions.length > maxNumbers) {
            numberPositions.shift(); // Remove oldest number
        }
    }

    // Update and draw all texts with glitch effect
    for (let i = textPositions.length - 1; i >= 0; i--) {
        let t = textPositions[i];
        let framesSinceStart = frameCount - t.startFrame;
        
        // Calculate how many characters should be displayed
        let targetLength = floor(framesSinceStart * typewriterSpeed);
        
        // Update current length for typewriter effect
        if (targetLength < t.fullText.length) {
            t.currentLength = targetLength;
            t.isComplete = false;
        } else {
            t.currentLength = t.fullText.length;
            t.isComplete = true;
        }
        
        // Remove text if it's been displayed for too long after completion
        if (t.isComplete && framesSinceStart > (t.fullText.length / typewriterSpeed + textDuration)) {
            textPositions.splice(i, 1);
            continue;
        }
        
        // Glitch effect: random offset that changes frequently
        if (random() > 0.7) { // 30% chance to glitch each frame
            t.glitchOffsetX = random(-5, 5) * t.glitchIntensity;
            t.glitchOffsetY = random(-3, 3) * t.glitchIntensity;
        } else {
            // Gradually return to original position
            t.glitchOffsetX *= 0.8;
            t.glitchOffsetY *= 0.8;
        }
        
        // Display only the current length of characters
        let displayText = t.fullText.substring(0, t.currentLength);
        
        // RGB channel separation glitch effect
        let glitchChance = random();
        if (glitchChance > 0.85) { // 15% chance for RGB glitch
            // Red channel
            fill(255, 0, 0, 200);
            noStroke();
            textSize(t.size);
            textAlign(LEFT, CENTER);
            text(displayText, t.x + t.glitchOffsetX - 2, t.y + t.glitchOffsetY);
            
            // Blue channel
            fill(0, 0, 255, 200);
            text(displayText, t.x + t.glitchOffsetX + 2, t.y + t.glitchOffsetY);
            
            // Green channel (main text)
            fill(0, 255, 0, 200);
            text(displayText, t.x + t.glitchOffsetX, t.y + t.glitchOffsetY);

        } else {
            // Normal rendering with slight glitch offset
            fill(0, 0, 255, 180 + random(-30, 30)); // Slight opacity variation
            noStroke();
            textSize(t.size);
            textAlign(LEFT, CENTER);
            text(displayText, t.x + t.glitchOffsetX, t.y + t.glitchOffsetY);
            
            // Sometimes add a duplicate with different color for glitch
            if (random() > 0.9) {
                fill(255, 0, 255, 100);
                text(displayText, t.x + t.glitchOffsetX + random(-3, 3), t.y + t.glitchOffsetY + random(-2, 2));
            }
        }
    }

    // Update and draw all random numbers with glitch effect
    for (let i = numberPositions.length - 1; i >= 0; i--) {
        let n = numberPositions[i];
        let framesSinceStart = frameCount - n.startFrame;
        
        // Remove number if it's been displayed for too long
        if (framesSinceStart > numberDuration) {
            numberPositions.splice(i, 1);
            continue;
        }
        
        // Glitch effect: random offset that changes frequently
        if (random() > 0.6) { // 40% chance to glitch each frame
            n.glitchOffsetX = random(-4, 4) * n.glitchIntensity;
            n.glitchOffsetY = random(-4, 4) * n.glitchIntensity;
        } else {
            // Gradually return to original position
            n.glitchOffsetX *= 0.7;
            n.glitchOffsetY *= 0.7;
        }
        
        // RGB channel separation glitch effect for numbers
        let glitchChance = random();
        if (glitchChance > 0.8) { // 20% chance for RGB glitch
            // Red channel
            fill(255, 0, 0, 200);
            noStroke();
            textSize(n.size);
            textAlign(LEFT, CENTER);
            text(n.number, n.x + n.glitchOffsetX - 1, n.y + n.glitchOffsetY);
            
            // Blue channel
            fill(0, 0, 255, 200);
            text(n.number, n.x + n.glitchOffsetX + 1, n.y + n.glitchOffsetY);
            
            // Green channel (main number)
            fill(0, 255, 0, 200);
            text(n.number, n.x + n.glitchOffsetX, n.y + n.glitchOffsetY);

            noFill();
            stroke(255, 255, 255, 200);
            strokeWeight(2);
            ellipse(n.x - n.glitchOffsetX*1.5, n.y + n.glitchOffsetY*1.5, 10, 10);
        } else {
            // Normal rendering with glitch offset
            fill(0, 255, 255, 200 + random(-40, 40)); // Cyan color with opacity variation
            noStroke();
            textSize(n.size);
            textAlign(LEFT, CENTER);
            text(n.number, n.x + n.glitchOffsetX, n.y + n.glitchOffsetY);
            
            // Sometimes add a duplicate with different color for glitch
            if (random() > 0.85) {
                fill(255, 255, 0, 120);
                text(n.number, n.x + n.glitchOffsetX + random(-2, 2), n.y + n.glitchOffsetY + random(-2, 2));
            }
        }
    }
}

function case5Vis() {
    // Update audio analysis
    if (fft) {
        let spectrum = fft.analyze();
        audioLevel = fft.getEnergy(20, 200); // Get energy in low-mid frequency range
        audioData.level = map(audioLevel, 0, 255, 0, 1); // Normalize to 0-1
        audioData.spectrum = spectrum;
    }
    
    // Calculate ellipse size based on audio
    let baseSize = min(width, height) * 0.2;
    let audioMultiplier = 1 + audioData.level * 2; // Scale from 1x to 3x
    let ellipseWidth = baseSize * audioMultiplier;
    let ellipseHeight = baseSize * 1.2 * audioMultiplier;
    
    // Draw ellipse with audio-reactive size
    noFill();
    stroke(random(200,255), random(200,255), 255);
    strokeWeight(2);
    ellipse(width/2, height/2, ellipseWidth, ellipseHeight);
    
    // Add glitch text animation - random characters appearing and disappearing
    if (frameCount % 5 === 0) { // Add new glitch text frequently
        let newGlitchText = {
            x: random(0, width),
            y: random(0, height),
            char: glitchChars[floor(random(0, glitchChars.length))],
            size: random(15, 35),
            startFrame: frameCount,
            duration: random(30, 90), // Random duration
            glitchOffsetX: 0,
            glitchOffsetY: 0,
            glitchIntensity: random(0.5, 2.0)
        };
        glitchTexts.push(newGlitchText);
        
        // Limit the number of glitch texts
        if (glitchTexts.length > maxGlitchTexts) {
            glitchTexts.shift();
        }
    }
    
    // Update and draw glitch texts
    for (let i = glitchTexts.length - 1; i >= 0; i--) {
        let gt = glitchTexts[i];
        let framesSinceStart = frameCount - gt.startFrame;
        
        // Remove if duration exceeded
        if (framesSinceStart > gt.duration) {
            glitchTexts.splice(i, 1);
            continue;
        }
        
        // Glitch effect
        if (random() > 0.5) {
            gt.glitchOffsetX = random(-3, 3) * gt.glitchIntensity;
            gt.glitchOffsetY = random(-3, 3) * gt.glitchIntensity;
        } else {
            gt.glitchOffsetX *= 0.8;
            gt.glitchOffsetY *= 0.8;
        }
        
        // RGB glitch effect
        let glitchChance = random();
        if (glitchChance > 0.7) {
            // Red channel
            fill(255, 0, 0, 200);
            noStroke();
            textSize(gt.size);
            textAlign(CENTER, CENTER);
            text(gt.char, gt.x + gt.glitchOffsetX - 1, gt.y + gt.glitchOffsetY);
            
            // Blue channel
            fill(0, 0, 255, 200);
            text(gt.char, gt.x + gt.glitchOffsetX + 1, gt.y + gt.glitchOffsetY);
            
            // Green channel
            fill(0, 255, 0, 200);
            text(gt.char, gt.x + gt.glitchOffsetX, gt.y + gt.glitchOffsetY);
        } else {
            fill(255, 255, 255, 150 + random(-50, 50));
            noStroke();
            textSize(gt.size);
            textAlign(CENTER, CENTER);
            text(gt.char, gt.x + gt.glitchOffsetX, gt.y + gt.glitchOffsetY);
        }
    }
}

function case6Vis() {
    // Update audio analysis
    if (fft) {
        let spectrum = fft.analyze();
        audioLevel = fft.getEnergy(20, 200);
        audioData.level = map(audioLevel, 0, 255, 0, 1);
        audioData.spectrum = spectrum;
    }
    
    // Add image with outline based on audio
    if (audioData.level > 0.05) { // Show when audio is detected
        // Calculate image size based on audio
        let baseSize = min(width, height) * 0.25;
        let audioMultiplier = 0.6 + audioData.level * 1.4; // Scale from 0.6x to 2x
        let imgSize = baseSize * audioMultiplier;
        
        // Add new image position periodically based on audio
        if (frameCount % max(1, floor(30 / (audioData.level + 0.1))) === 0) {
            let newImgPos = {
                x: random(50, width - 50),
                y: random(50, height - 50),
                size: imgSize * random(0.8, 1.2),
                startFrame: frameCount,
                duration: 120 + audioData.level * 60
            };
            case6ImagePositions.push(newImgPos);
            
            // Limit number of images
            if (case6ImagePositions.length > 8) {
                case6ImagePositions.shift();
            }
        }
        
        // Draw all images with outlines
        for (let i = case6ImagePositions.length - 1; i >= 0; i--) {
            let imgPos = case6ImagePositions[i];
            let framesSinceStart = frameCount - imgPos.startFrame;
            
            // Remove if duration exceeded
            if (framesSinceStart > imgPos.duration) {
                case6ImagePositions.splice(i, 1);
                continue;
            }
            
            // Update size based on current audio
            let currentSize = imgPos.size * (0.8 + audioData.level * 0.4);
            
            // Draw outline (stroke) - blue color
            noFill();
            stroke(0, 0, 255);
            strokeWeight(2);
            
            // Draw multiple outlines based on audio level
            let numOutlines = floor(audioData.level * 4) + 1;
            for (let j = 0; j < numOutlines; j++) {
                let offset = j * 3;
                let outlineSize = currentSize + offset;
                rect(imgPos.x - outlineSize/2, imgPos.y - outlineSize/2, outlineSize, outlineSize);
            }
            
            // Draw image (or placeholder if no image loaded)
            if (case6Image) {
                image(case6Image, imgPos.x - currentSize/2, imgPos.y - currentSize/2, currentSize, currentSize);
            } else {
                // Placeholder rectangle
                fill(0, 0, 255, 30);
                noStroke();
                rect(imgPos.x - currentSize/2, imgPos.y - currentSize/2, currentSize, currentSize);
            }
        }
    }
}

function keyPressed() {
  // Handle number keys 1-6
  if (key >= '1' && key <= '6') {
    caseNum = key;
    console.log('Case switched to:', caseNum);
    // Clear canvas when switching cases (optional - remove if you want to keep previous drawings)
    if (key !== '1') {
      clear();
    }
    // Reset positions when switching cases
    if (key === '3') {
      rectPositions = [];
    }
    if (key === '4') {
      textPositions = [];
      numberPositions = [];
    }
    if (key === '5') {
      glitchTexts = [];
    }
    if (key === '6') {
      case6ImagePositions = [];
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
