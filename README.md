# A Birthday Surprise

A responsive four-page birthday story for Anisha. Its full-screen opening counts down from `05` to `00`, marks the moment with a glowing `12:00`, then reveals the birthday message and an animated gift button. Opening the gift transitions into a React Three Fiber cake scene with animated candles, a knife-and-split interaction, and a synthesized Happy Birthday melody.

The intro, cake, memories, and final surprise are separate full-viewport screens. Only the current screen is rendered; later screens unlock as the story progresses. The cake page unlocks Continue after the blow-and-cut interaction is complete.

Balloons continuously rise from the bottom and fireworks burst across every page. Cake and memories pages additionally show tiny floating cake decorations. Particles remain behind the content, and their size/count is reduced on mobile. The background uses animated gradients rather than a background photo.

## Personalize it

Edit `src/config/birthday.ts` to change the name and final message in one place.

## Run locally

Use Node.js 20 or newer (required by Vite 8):

```sh
npm install
npm run dev
```

The cake and celebration scenes use WebGL and hardware acceleration. The birthday melody begins after the cake-cutting animation; the music control can mute or unmute it.

## Verify

```sh
npm run build
npm run lint
```
