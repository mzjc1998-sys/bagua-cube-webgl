/**
 * WebGL 3D渲染引擎 - Minecraft风格
 */

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!this.gl) {
      throw new Error('WebGL不支持');
    }

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);

    this.shaderProgram = null;
    this.buffers = {};
    this.textures = {};

    this.viewMatrix = this.createIdentityMatrix();
    this.projectionMatrix = this.createPerspectiveMatrix(70, canvas.width / canvas.height, 0.1, 1000);

    this.initShaders();
    this.initBlockTextures();
  }

  // 创建单位矩阵
  createIdentityMatrix() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }

  // 创建透视投影矩阵
  createPerspectiveMatrix(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov * Math.PI / 360);
    const rangeInv = 1 / (near - far);

    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  // 创建视图矩阵（摄像机）
  createViewMatrix(position, rotation) {
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);

    // 旋转矩阵
    const rotX = new Float32Array([
      1, 0, 0, 0,
      0, cosX, sinX, 0,
      0, -sinX, cosX, 0,
      0, 0, 0, 1
    ]);

    const rotY = new Float32Array([
      cosY, 0, -sinY, 0,
      0, 1, 0, 0,
      sinY, 0, cosY, 0,
      0, 0, 0, 1
    ]);

    // 平移矩阵
    const trans = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -position.x, -position.y, -position.z, 1
    ]);

    return this.multiplyMatrices(this.multiplyMatrices(rotX, rotY), trans);
  }

  // 矩阵乘法
  multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
        }
      }
    }
    return result;
  }

  // 初始化着色器
  initShaders() {
    const vsSource = `
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      attribute vec3 aNormal;
      attribute float aBlockType;

      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;

      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying float vBlockType;
      varying vec3 vPosition;

      void main() {
        vec4 worldPos = uModel * vec4(aPosition, 1.0);
        gl_Position = uProjection * uView * worldPos;
        vTexCoord = aTexCoord;
        vNormal = mat3(uModel) * aNormal;
        vBlockType = aBlockType;
        vPosition = worldPos.xyz;
      }
    `;

    const fsSource = `
      precision mediump float;

      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying float vBlockType;
      varying vec3 vPosition;

      uniform sampler2D uTexture;
      uniform vec3 uLightDir;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;

      void main() {
        // 基础颜色根据方块类型
        vec3 baseColor;
        if (vBlockType < 0.5) {
          // 草方块顶部
          baseColor = vec3(0.3, 0.7, 0.2);
        } else if (vBlockType < 1.5) {
          // 泥土
          baseColor = vec3(0.6, 0.4, 0.2);
        } else if (vBlockType < 2.5) {
          // 石头
          baseColor = vec3(0.5, 0.5, 0.5);
        } else if (vBlockType < 3.5) {
          // 木头
          baseColor = vec3(0.6, 0.4, 0.2);
        } else if (vBlockType < 4.5) {
          // 树叶
          baseColor = vec3(0.2, 0.6, 0.1);
        } else if (vBlockType < 5.5) {
          // 沙子
          baseColor = vec3(0.9, 0.85, 0.6);
        } else if (vBlockType < 6.5) {
          // 水
          baseColor = vec3(0.2, 0.4, 0.8);
        } else if (vBlockType < 7.5) {
          // 玻璃
          baseColor = vec3(0.8, 0.9, 1.0);
        } else {
          // 默认
          baseColor = vec3(1.0, 1.0, 1.0);
        }

        // 简单光照
        vec3 normal = normalize(vNormal);
        float light = max(dot(normal, normalize(uLightDir)), 0.3);

        // 环境光遮蔽模拟
        float ao = 1.0;
        if (abs(normal.y) > 0.9) {
          ao = normal.y > 0.0 ? 1.0 : 0.6;
        } else {
          ao = 0.8;
        }

        vec3 color = baseColor * light * ao;

        // 雾效果
        float dist = length(vPosition);
        float fogFactor = clamp((uFogFar - dist) / (uFogFar - uFogNear), 0.0, 1.0);
        color = mix(uFogColor, color, fogFactor);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const vertexShader = this.compileShader(vsSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fsSource, this.gl.FRAGMENT_SHADER);

    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.error('着色器程序链接失败:', this.gl.getProgramInfoLog(this.shaderProgram));
    }

    this.gl.useProgram(this.shaderProgram);

    // 获取着色器属性和uniform位置
    this.attribs = {
      position: this.gl.getAttribLocation(this.shaderProgram, 'aPosition'),
      texCoord: this.gl.getAttribLocation(this.shaderProgram, 'aTexCoord'),
      normal: this.gl.getAttribLocation(this.shaderProgram, 'aNormal'),
      blockType: this.gl.getAttribLocation(this.shaderProgram, 'aBlockType')
    };

    this.uniforms = {
      projection: this.gl.getUniformLocation(this.shaderProgram, 'uProjection'),
      view: this.gl.getUniformLocation(this.shaderProgram, 'uView'),
      model: this.gl.getUniformLocation(this.shaderProgram, 'uModel'),
      texture: this.gl.getUniformLocation(this.shaderProgram, 'uTexture'),
      lightDir: this.gl.getUniformLocation(this.shaderProgram, 'uLightDir'),
      fogColor: this.gl.getUniformLocation(this.shaderProgram, 'uFogColor'),
      fogNear: this.gl.getUniformLocation(this.shaderProgram, 'uFogNear'),
      fogFar: this.gl.getUniformLocation(this.shaderProgram, 'uFogFar')
    };

    // 设置默认值
    this.gl.uniform3f(this.uniforms.lightDir, 0.5, 1.0, 0.3);
    this.gl.uniform3f(this.uniforms.fogColor, 0.6, 0.8, 1.0);
    this.gl.uniform1f(this.uniforms.fogNear, 50.0);
    this.gl.uniform1f(this.uniforms.fogFar, 100.0);
  }

  // 编译着色器
  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('着色器编译失败:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // 初始化方块纹理（使用程序生成的纹理）
  initBlockTextures() {
    // 创建一个简单的棋盘格纹理作为默认纹理
    const size = 16;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const checker = ((x >> 2) + (y >> 2)) % 2;
        const value = checker ? 255 : 200;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }
    }

    this.defaultTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.defaultTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, size, size, 0,
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
  }

  // 创建方块网格
  createBlockMesh(chunk) {
    const positions = [];
    const texCoords = [];
    const normals = [];
    const blockTypes = [];
    const indices = [];

    let vertexCount = 0;

    const addFace = (x, y, z, face, blockType) => {
      // 面的顶点偏移
      const faceData = {
        top: {
          positions: [[0,1,0], [1,1,0], [1,1,1], [0,1,1]],
          normal: [0, 1, 0]
        },
        bottom: {
          positions: [[0,0,1], [1,0,1], [1,0,0], [0,0,0]],
          normal: [0, -1, 0]
        },
        front: {
          positions: [[0,0,1], [0,1,1], [1,1,1], [1,0,1]],
          normal: [0, 0, 1]
        },
        back: {
          positions: [[1,0,0], [1,1,0], [0,1,0], [0,0,0]],
          normal: [0, 0, -1]
        },
        left: {
          positions: [[0,0,0], [0,1,0], [0,1,1], [0,0,1]],
          normal: [-1, 0, 0]
        },
        right: {
          positions: [[1,0,1], [1,1,1], [1,1,0], [1,0,0]],
          normal: [1, 0, 0]
        }
      };

      const fd = faceData[face];

      for (const pos of fd.positions) {
        positions.push(x + pos[0], y + pos[1], z + pos[2]);
        normals.push(...fd.normal);
        blockTypes.push(blockType);
      }

      texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);

      indices.push(
        vertexCount, vertexCount + 1, vertexCount + 2,
        vertexCount, vertexCount + 2, vertexCount + 3
      );

      vertexCount += 4;
    };

    // 遍历chunk中的所有方块
    const size = chunk.size;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        for (let z = 0; z < size; z++) {
          const block = chunk.getBlock(x, y, z);
          if (block === 0) continue; // 空气

          const worldX = chunk.x * size + x;
          const worldY = chunk.y * size + y;
          const worldZ = chunk.z * size + z;

          // 检查相邻方块，只渲染暴露的面
          if (!chunk.getBlockSafe(x, y + 1, z)) addFace(worldX, worldY, worldZ, 'top', block);
          if (!chunk.getBlockSafe(x, y - 1, z)) addFace(worldX, worldY, worldZ, 'bottom', block);
          if (!chunk.getBlockSafe(x, y, z + 1)) addFace(worldX, worldY, worldZ, 'front', block);
          if (!chunk.getBlockSafe(x, y, z - 1)) addFace(worldX, worldY, worldZ, 'back', block);
          if (!chunk.getBlockSafe(x - 1, y, z)) addFace(worldX, worldY, worldZ, 'left', block);
          if (!chunk.getBlockSafe(x + 1, y, z)) addFace(worldX, worldY, worldZ, 'right', block);
        }
      }
    }

    if (positions.length === 0) return null;

    // 创建VBO
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

    const normalBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);

    const blockTypeBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, blockTypeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(blockTypes), this.gl.STATIC_DRAW);

    const indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

    return {
      position: positionBuffer,
      texCoord: texCoordBuffer,
      normal: normalBuffer,
      blockType: blockTypeBuffer,
      indices: indexBuffer,
      indexCount: indices.length
    };
  }

  // 设置视图矩阵
  setViewMatrix(position, rotation) {
    this.viewMatrix = this.createViewMatrix(position, rotation);
    this.gl.uniformMatrix4fv(this.uniforms.view, false, this.viewMatrix);
  }

  // 渲染chunk
  renderChunk(mesh) {
    if (!mesh) return;

    const gl = this.gl;

    // 设置模型矩阵为单位矩阵
    gl.uniformMatrix4fv(this.uniforms.model, false, this.createIdentityMatrix());

    // 绑定顶点属性
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
    gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.position);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoord);
    gl.vertexAttribPointer(this.attribs.texCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.texCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
    gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.blockType);
    gl.vertexAttribPointer(this.attribs.blockType, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.blockType);

    // 绑定索引和纹理
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    gl.bindTexture(gl.TEXTURE_2D, this.defaultTexture);

    // 绘制
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  // 清屏
  clear() {
    this.gl.clearColor(0.6, 0.8, 1.0, 1.0); // 天空蓝色
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // 设置投影矩阵
    this.gl.uniformMatrix4fv(this.uniforms.projection, false, this.projectionMatrix);
  }

  // 调整画布大小
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.projectionMatrix = this.createPerspectiveMatrix(70, width / height, 0.1, 1000);
  }

  // 删除网格
  deleteMesh(mesh) {
    if (!mesh) return;
    this.gl.deleteBuffer(mesh.position);
    this.gl.deleteBuffer(mesh.texCoord);
    this.gl.deleteBuffer(mesh.normal);
    this.gl.deleteBuffer(mesh.blockType);
    this.gl.deleteBuffer(mesh.indices);
  }
}

export default Renderer;
