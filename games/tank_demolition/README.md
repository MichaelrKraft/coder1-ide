# Tank Demolition Game 🎮

An isometric tank demolition game built in Python with pygame. Destroy buildings block by block!

## About This Project

This game is designed as a progressive learning project across 4 development sessions. Perfect for learning game development concepts!

**Target Age**: 12+ years old
**Difficulty**: Beginner-friendly
**Language**: Python 3.x
**Library**: pygame

## Current Status

- ✅ **Session 1**: Tank Movement & Basic Rendering - **COMPLETE**
- ⏳ **Session 2**: Turret & Shooting Mechanics - Coming next!
- ⏳ **Session 3**: Buildings & Destruction
- ⏳ **Session 4**: Game Loop, Scoring & Polish

## Installation

### Prerequisites

Make sure you have Python 3.x installed. You can check by running:
```bash
python3 --version
```

### Install pygame

```bash
pip3 install pygame
```

Or if you're using a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install pygame
```

## How to Run

```bash
cd games/tank_demolition
python3 main.py
```

## Controls (Session 1)

- **UP Arrow**: Move tank forward
- **DOWN Arrow**: Move tank backward
- **LEFT Arrow**: Rotate tank counter-clockwise
- **RIGHT Arrow**: Rotate tank clockwise
- **ESC**: Quit game

## What's Working Now

✅ Tank appears on screen in isometric view
✅ Tank rotates smoothly with arrow keys
✅ Tank moves forward/backward based on rotation
✅ Shadow follows tank
✅ Tank stays within screen boundaries
✅ Smooth 60 FPS gameplay

## Next Steps (Session 2)

In the next session, we'll add:
- Tank turret that aims independently
- Shooting mechanics with projectiles
- Muzzle flash and trail effects
- Ammo limit (max 3 projectiles on screen)

## File Structure

```
tank_demolition/
├── main.py          # Game loop and main logic
├── tank.py          # Tank class with movement
└── README.md        # This file
```

## Learning Goals

This project teaches:
- Game loop fundamentals
- Sprite rendering and rotation
- Input handling
- Collision detection (coming in Session 3)
- Game state management
- Object-oriented programming in Python

## Tips for Success

1. **Experiment!** Try changing colors, speeds, and sizes to see what happens
2. **Read the comments** - They explain what each part does
3. **Break things** - It's okay! That's how we learn
4. **Ask questions** - There's no such thing as a silly question
5. **Have fun!** - This is supposed to be enjoyable

## Troubleshooting

**Problem**: pygame not found
**Solution**: Make sure you installed pygame with `pip3 install pygame`

**Problem**: Game runs slowly
**Solution**: Close other programs or try reducing the window size in `main.py`

**Problem**: Tank moves too fast/slow
**Solution**: Adjust the `self.speed` value in `tank.py` (line 32)

## Credits

Built with ❤️ by a father and son team learning game development together!

## Future Ideas

After completing all 4 sessions, you could add:
- Multiple levels
- Power-ups
- Enemy tanks
- Two-player mode
- Sound effects and music
- High score system

Have fun building! 🚀
