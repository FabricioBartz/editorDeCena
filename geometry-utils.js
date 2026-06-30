import { vs, fs } from './shaders.js';

// Função para criar a geometria de um grid no plano XZ
export function criarGeometriaGrid(gl, programInfo, tamanho, divisoes) {
  const linhasPosicoes = [];
  const passo = tamanho / divisoes;
  const metade = tamanho / 2;

  for (let i = 0; i <= divisoes; i++) {
    const coord = -metade + (i * passo);
    linhasPosicoes.push(coord, 0, -metade, coord, 0, metade);
    linhasPosicoes.push(-metade, 0, coord, metade, 0, coord);
  }

  const arrays = {
    position: { numComponents: 3, data: linhasPosicoes }, 
    normal: { numComponents: 3, data: new Float32Array(linhasPosicoes.length) },
    texcoord: { numComponents: 2, data: new Float32Array((linhasPosicoes.length / 3) * 2) }
  };

  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  const vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);
  
  return { bufferInfo, vao };
}