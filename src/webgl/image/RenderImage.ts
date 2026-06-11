import { createProgram, createProjectionMatrix, createShader, resizeCanvasToDisplaySize } from '../core';

import fragmentSource from './shaders/fragment.glsl';
import vertexSource from './shaders/vertex.glsl';

export const kernels = {
  normal: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  gaussianBlur: [0.045, 0.122, 0.045, 0.122, 0.332, 0.122, 0.045, 0.122, 0.045],
  gaussianBlur2: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  gaussianBlur3: [0, 1, 0, 1, 1, 1, 0, 1, 0],
  unsharpen: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
  sharpness: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  sharpen: [-1, -1, -1, -1, 16, -1, -1, -1, -1],
  edgeDetect: [-0.125, -0.125, -0.125, -0.125, 1, -0.125, -0.125, -0.125, -0.125],
  edgeDetect2: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
  edgeDetect3: [-5, 0, 0, 0, 0, 0, 0, 0, 5],
  edgeDetect4: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  edgeDetect5: [-1, -1, -1, 2, 2, 2, -1, -1, -1],
  edgeDetect6: [-5, -5, -5, -5, 39, -5, -5, -5, -5],
  sobelHorizontal: [1, 2, 1, 0, 0, 0, -1, -2, -1],
  sobelVertical: [1, 0, -1, 2, 0, -2, 1, 0, -1],
  previtHorizontal: [1, 1, 1, 0, 0, 0, -1, -1, -1],
  previtVertical: [1, 0, -1, 1, 0, -1, 1, 0, -1],
  boxBlur: [0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111, 0.111],
  triangleBlur: [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
} satisfies Record<string, number[]>;

export type KernelName = keyof typeof kernels;

export type Effect = {
  name: KernelName;
  on: boolean;
};

type ProgramInfo = {
  program: WebGLProgram;
  attributeLocations: {
    vertexPosition: GLint;
    textureCoord: GLint;
  };
  uniformLocations: {
    projection: WebGLUniformLocation;
    image: WebGLUniformLocation;
    kernel: WebGLUniformLocation;
    kernelWeight: WebGLUniformLocation;
  };
};

type Geometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class RenderImage {
  static instance: RenderImage | undefined;

  readonly kernels = kernels;

  private readonly gl: WebGL2RenderingContext;
  private readonly image: HTMLImageElement;
  private readonly programInfo: ProgramInfo;
  private originalTexture: WebGLTexture | undefined;
  private textures: WebGLTexture[] = [];
  private frameBuffers: WebGLFramebuffer[] = [];
  private frameBufferVertexArray: WebGLVertexArrayObject | undefined;
  private canvasVertexArray: WebGLVertexArrayObject | undefined;

  constructor(gl: WebGL2RenderingContext, image: HTMLImageElement) {
    RenderImage.instance = this;

    this.gl = gl;
    this.image = image;

    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentSource);
    const program = createProgram(this.gl, vertexShader, fragmentShader);

    this.programInfo = {
      program,
      attributeLocations: {
        vertexPosition: this.getAttributeLocation(program, 'a_position'),
        textureCoord: this.getAttributeLocation(program, 'a_uv'),
      },
      uniformLocations: {
        projection: this.getUniformLocation(program, 'u_projection'),
        image: this.getUniformLocation(program, 'u_image'),
        kernel: this.getUniformLocation(program, 'u_kernel[0]'),
        kernelWeight: this.getUniformLocation(program, 'u_kernelWeight'),
      },
    };
  }

  static getCurrent(): RenderImage {
    if (!RenderImage.instance) {
      throw new Error('RenderImage has not been initialized');
    }

    return RenderImage.instance;
  }

  drawImage(effects: Effect[]): void {
    resizeCanvasToDisplaySize(this.canvas);

    this.setFrameBufferAttributeState();
    this.setCanvasAttributeState();

    this.originalTexture = this.createTexture();
    this.uploadImageToTexture(this.image);

    const { textures, frameBuffers } = this.generateTextures();
    this.textures = textures;
    this.frameBuffers = frameBuffers;

    this.drawEffects(effects.filter((effect) => effect.on));
  }

  drawEffects(effects: Effect[]): void {
    const { program, uniformLocations } = this.programInfo;
    const originalTexture = this.requireTexture(this.originalTexture, 'Original texture has not been created');
    const frameBufferVertexArray = this.requireVertexArray(
      this.frameBufferVertexArray,
      'Framebuffer vertex array has not been created',
    );
    const canvasVertexArray = this.requireVertexArray(
      this.canvasVertexArray,
      'Canvas vertex array has not been created',
    );

    this.gl.useProgram(program);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, originalTexture);
    this.gl.uniform1i(uniformLocations.image, 0);

    this.gl.bindVertexArray(frameBufferVertexArray);

    const frameBufferProjection = createProjectionMatrix(this.image.width, this.image.height);
    this.gl.uniformMatrix3fv(uniformLocations.projection, false, frameBufferProjection);

    let count = 0;
    for (const effect of effects) {
      this.setFrameBuffer(this.frameBuffers[count % 2], this.image.width, this.image.height);
      this.drawWithKernel(effect.name);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[count % 2]);
      count++;
    }

    this.gl.bindVertexArray(canvasVertexArray);

    const canvasProjection = createProjectionMatrix(this.canvas.width, this.canvas.height);
    this.gl.uniformMatrix3fv(uniformLocations.projection, false, canvasProjection);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.drawWithKernel();
  }

  private get canvas(): HTMLCanvasElement {
    const { canvas } = this.gl;

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('WebGL renderer requires an HTML canvas');
    }

    return canvas;
  }

  private shapeGeometry(): Geometry {
    const dpr = window.devicePixelRatio || 1;
    const imageWidth = this.image.width * dpr;
    const imageHeight = this.image.height * dpr;
    const maxSize = Math.min(this.canvas.width, this.canvas.height) * 0.8;
    const scale = Math.min(1, maxSize / Math.max(imageWidth, imageHeight));
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
    };
  }

  private createTexture(): WebGLTexture {
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Unable to create WebGL texture');
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    return texture;
  }

  private uploadImageToTexture(image: HTMLImageElement): void {
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
  }

  private setFrameBufferAttributeState(): void {
    this.frameBufferVertexArray = this.createVertexArray();
    this.gl.bindVertexArray(this.frameBufferVertexArray);

    this.setPositionBuffer(0, 0, this.image.width, this.image.height);
    this.enablePositionAttribute();

    this.setTextureCoordBufferFlipped();
    this.enableTextureCoordAttribute();
  }

  private setCanvasAttributeState(): void {
    this.canvasVertexArray = this.createVertexArray();
    this.gl.bindVertexArray(this.canvasVertexArray);

    const { x, y, width, height } = this.shapeGeometry();

    this.setPositionBuffer(x, y, width, height);
    this.enablePositionAttribute();

    this.setTextureCoordBuffer();
    this.enableTextureCoordAttribute();
  }

  private setPositionBuffer(x: number, y: number, width: number, height: number): WebGLBuffer {
    const positionBuffer = this.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
      this.gl.STATIC_DRAW,
    );

    return positionBuffer;
  }

  private enablePositionAttribute(): void {
    const {
      attributeLocations: { vertexPosition },
    } = this.programInfo;

    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(vertexPosition);
  }

  private setTextureCoordBufferFlipped(): WebGLBuffer {
    const textureCoordBuffer = this.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0]),
      this.gl.STATIC_DRAW,
    );

    return textureCoordBuffer;
  }

  private setTextureCoordBuffer(): WebGLBuffer {
    const textureCoordBuffer = this.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
      this.gl.STATIC_DRAW,
    );

    return textureCoordBuffer;
  }

  private enableTextureCoordAttribute(): void {
    const {
      attributeLocations: { textureCoord },
    } = this.programInfo;

    this.gl.vertexAttribPointer(textureCoord, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(textureCoord);
  }

  private generateTextures(): { textures: WebGLTexture[]; frameBuffers: WebGLFramebuffer[] } {
    const textures: WebGLTexture[] = [];
    const frameBuffers: WebGLFramebuffer[] = [];

    for (let i = 0; i < 2; ++i) {
      const texture = this.createTexture();
      textures.push(texture);

      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.image.width,
        this.image.height,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        null,
      );

      const frameBuffer = this.gl.createFramebuffer();
      if (!frameBuffer) {
        throw new Error('Unable to create WebGL framebuffer');
      }

      frameBuffers.push(frameBuffer);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);
      this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    }

    return { textures, frameBuffers };
  }

  private setFrameBuffer(frameBuffer: WebGLFramebuffer | undefined, width: number, height: number): void {
    if (!frameBuffer) {
      throw new Error('Framebuffer has not been created');
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer);
    this.gl.viewport(0, 0, width, height);
  }

  private drawWithKernel(name: KernelName = 'normal'): void {
    const kernel = this.kernels[name];

    this.gl.uniform1fv(this.programInfo.uniformLocations.kernel, kernel);
    this.gl.uniform1f(this.programInfo.uniformLocations.kernelWeight, this.computeKernelWeight(kernel));
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  private computeKernelWeight(kernel: number[]): number {
    const weight = kernel.reduce((prev, curr) => prev + curr, 0);
    return weight <= 0 ? 1 : weight;
  }

  private getAttributeLocation(program: WebGLProgram, name: string): GLint {
    const location = this.gl.getAttribLocation(program, name);
    if (location === -1) {
      throw new Error(`Missing WebGL attribute: ${name}`);
    }

    return location;
  }

  private getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = this.gl.getUniformLocation(program, name);
    if (!location) {
      throw new Error(`Missing WebGL uniform: ${name}`);
    }

    return location;
  }

  private createBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error('Unable to create WebGL buffer');
    }

    return buffer;
  }

  private createVertexArray(): WebGLVertexArrayObject {
    const vertexArray = this.gl.createVertexArray();
    if (!vertexArray) {
      throw new Error('Unable to create WebGL vertex array');
    }

    return vertexArray;
  }

  private requireTexture(texture: WebGLTexture | undefined, message: string): WebGLTexture {
    if (!texture) {
      throw new Error(message);
    }

    return texture;
  }

  private requireVertexArray(vertexArray: WebGLVertexArrayObject | undefined, message: string): WebGLVertexArrayObject {
    if (!vertexArray) {
      throw new Error(message);
    }

    return vertexArray;
  }
}
