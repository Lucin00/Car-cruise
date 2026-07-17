# Slow Drive — Endless Chill Driving

An immersive, relaxing 3D driving experience with no missions, no traffic, and no rush. Just you, the horizon, and the hum of the engine.

## Overview

**Slow Drive** is a browser-based driving simulator built with **Three.js** that generates an endless procedural road across beautiful landscapes. Drive through different environments with varied vehicles, experience dynamic time-of-day lighting, and enjoy a meditative, stress-free driving experience.

## Features

### 🚗 Multiple Vehicles
- **Coupe** - Nimble and responsive (Red, max speed 42 km/h)
- **Cruiser** - Smooth and relaxed (Blue, max speed 50 km/h)
- **Rally** - Agile and quick (Yellow, max speed 38 km/h)
- **Classic** - Vintage charm (Beige, max speed 34 km/h)

Each vehicle has unique handling characteristics:
- Different acceleration rates
- Varied turning speeds
- Unique visual styles

### 🌍 Diverse Maps
- **Coastal Hills** - Lush green rolling terrain
- **Desert Dunes** - Golden sands and sparse vegetation
- **Snowy Pines** - Frozen landscapes with dense forests
- **Red Canyon** - Dramatic red rock formations

### 🌞 Dynamic Lighting
Switch between three time-of-day presets:
- **Day** - Bright, clear skies (Sky: #9fd8ff)
- **Sunset** - Warm, golden hour lighting (Sky: #ff9a5c)
- **Night** - Serene, starlit atmosphere (Sky: #0a1029)

Each preset adjusts:
- Sky and fog colors
- Ambient and directional light intensity
- Overall scene mood

### 🎮 Intuitive Controls
| Control | Action |
|---------|--------|
| `W`/`↑` | Accelerate |
| `A`/`←` | Turn Left |
| `S`/`↓` | Brake |
| `D`/`→` | Turn Right |
| `R` | Toggle Auto-drive |
| `F` | Snap back to road |
| `Esc` | Pause/Resume |

### 🌳 Procedurally Generated World
- Endless road with organic curves and elevation changes
- Dynamically spawned trees and vegetation based on environment
- Fog effects for depth perception
- Realistic shadows and lighting

### 📊 HUD (Heads-Up Display)
- Real-time speed display (km/h)
- Auto-drive indicator
- Time-of-day selector buttons
- Menu access
- Pause hints

## Technical Stack

- **Three.js** (v0.160.0) - 3D graphics rendering
- **WebGL** - Hardware-accelerated graphics
- **Vanilla JavaScript** - No frameworks, pure ES6 modules
- **HTML5 Canvas** - Rendering surface
- **CSS3** - Modern styling with blur effects and glass-morphism

## Project Structure

```
.
├── index.html        # Main HTML document with HUD markup
├── script.js         # Game logic and Three.js scene
├── style.css         # UI styling and animations
└── README.md         # This file
```

## Getting Started

### Requirements
- Modern web browser with WebGL support
- Stable internet connection (loads Three.js from CDN)

### Installation

1. Clone or download this project
2. Open `index.html` in your web browser
3. Select your vehicle and map
4. Click **Start Driving**

No build process or dependencies to install!

## How to Play

1. **Choose Your Vehicle** - Each has different performance characteristics
2. **Choose Your Map** - Pick an environment that suits your mood
3. **Start Driving** - Accelerate and enjoy the journey
4. **Auto-drive** - Press `R` to let the car drive itself (perfect for relaxation)
5. **Switch Environments** - Use the time-toggle buttons to change lighting
6. **Pause Anytime** - Press `Esc` to pause and take a moment

## Game Mechanics

### Speed System
- Each vehicle has a maximum speed limit
- Different acceleration rates affect how quickly you can speed up
- The HUD displays your current speed in real-time

### Auto-drive Mode
- Press `R` to toggle automatic driving
- The car will maintain a steady speed and follow the road naturally
- Perfect for enjoying the scenery without active input

### Road Dynamics
- The road curves procedurally based on mathematical functions
- Terrain elevation changes add visual interest
- Trees spawn based on map-specific density settings
- Fog creates atmospheric depth

### Lighting System
Each time-of-day preset includes:
- Dynamic ambient lighting
- Directional sunlight with realistic shadows
- Fog color matching the atmosphere
- Sky color reflecting the time

## Browser Compatibility

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Any browser with WebGL 2.0 support

**Not supported:**
- Internet Explorer
- Mobile browsers with limited WebGL support

## Performance Tips

- Close other applications to improve frame rate
- Use Day mode for the smoothest performance
- Disable browser extensions if experiencing lag
- Ensure your GPU drivers are up to date

## Credits

Built with:
- **Three.js** - 3D JavaScript library
- **Google Fonts** - Space Grotesk font family

## License

Open source. Feel free to modify and use!

## Future Enhancements

Potential additions for future versions:
- Weather effects (rain, snow)
- Traffic and other vehicles
- Fuel and damage systems
- Screenshot/screen recording feature
- Custom color and vehicle customization
- Leaderboards (distance driven)
- VR support
- Mobile touch controls

---

**Enjoy the drive. No rush. No pressure. Just the road ahead.** 🚗✨
