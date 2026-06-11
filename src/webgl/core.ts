import { mat3 } from 'gl-matrix';

/**
 * Resize canvas to match display size with device pixel ratio
 */
export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.floor(canvas.clientWidth * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);

  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}

/**
 * Creates an orthographic projection matrix for 2D rendering
 */
export function createProjectionMatrix(width: number, height: number): mat3 {
  // This maps pixel coords (0,0 at top-left) to clip space (-1,-1 at bottom-left)
  const matrix = mat3.create();
  mat3.projection(matrix, width, height);

  return matrix;
}

export function createShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Unable to create WebGL shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;

  const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compilation error';
  gl.deleteShader(shader);
  throw new Error(message);
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Unable to create WebGL program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;

  const message = gl.getProgramInfoLog(program) ?? 'Unknown program link error';
  gl.deleteProgram(program);
  throw new Error(message);
}
