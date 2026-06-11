# WebGL Filters

WebGL Filters is a small TypeScript and WebGL workbench for experimenting with GPU-backed image filters in the browser. It loads a source image into a WebGL2 texture, applies selectable 3x3 convolution kernels through framebuffer ping-pong passes, and renders the final result to a canvas.

Each filter is represented as shader input and each enabled effect becomes a real render pass. That makes it useful for learning and prototyping:

- how image data moves from the DOM into GPU textures;
- how vertex and fragment shaders cooperate to draw a textured quad;
- how convolution kernels create blur, sharpen, emboss, Sobel, Prewitt, and edge-detection effects;
- how framebuffer rendering lets multiple effects compose without reading pixels back to the CPU.

<img width="1169" height="922" alt="image" src="https://github.com/user-attachments/assets/4a03a327-22ec-4497-8389-408e128e6c75" />

## Install

```sh
pnpm install
```

## Develop

```sh
pnpm dev
```

## Build

```sh
pnpm build
```

This runs TypeScript type checking and the Vite production build.

## Quality Checks

```sh
pnpm typecheck
pnpm lint
pnpm check
```

## Project Layout

- `src/` contains the Vue app, views, and components.
- `src/webgl/` contains shared WebGL utilities plus box and image renderers.
- `src/webgl/image/shaders/` and `src/webgl/box/shaders/` contain GLSL shaders.
- `src/assets/` contains images imported by the app.
