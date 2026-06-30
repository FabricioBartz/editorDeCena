import { vs, fs } from './shaders.js';

const singleThumbCanvas = document.createElement("canvas");
singleThumbCanvas.width = 128;
singleThumbCanvas.height = 128;
const tgl = singleThumbCanvas.getContext("webgl2");

twgl.setAttributePrefix("a_");
const thumbProgramInfo = twgl.createProgramInfo(tgl, [vs, fs]);

function degToRad(deg) { return deg * Math.PI / 180; }

// Função para gerar uma miniatura (thumbnail) de um objeto 3D e retornar como Data URL
export function gerarThumbnailDataURL(obj, geomData, atlasImageLoaded) {
  if (!tgl) return "";

  tgl.enable(tgl.DEPTH_TEST);
  tgl.viewport(0, 0, 128, 128);
  tgl.clearColor(0.18, 0.18, 0.18, 1.0); 
  tgl.clear(tgl.COLOR_BUFFER_BIT | tgl.DEPTH_BUFFER_BIT);

  var thumbTexture = twgl.createTexture(tgl, {
    src: atlasImageLoaded,
    flipY: true,
  });

  const thumbParts = obj.geometries.map(({data}) => {
    if (!data.color) data.color = { value: [1, 1, 1, 1] };
    if (!data.texcoord) data.texcoord = { value: [0, 0] };
    const bufferInfo = twgl.createBufferInfoFromArrays(tgl, data);
    const vao = twgl.createVAOFromBufferInfo(tgl, thumbProgramInfo, bufferInfo);
    return { bufferInfo, vao };
  });

  const projection = m4.perspective(degToRad(45), 1, 0.1, 10.0);
  
  const maxDimReal = Math.max(geomData.range[0], geomData.range[1], geomData.range[2]);
  const escalaAplicada = maxDimReal > 0 ? (1.5 / maxDimReal) : 1.0;
  const raioNormalizado = (Math.max(geomData.range[0], geomData.range[1], geomData.range[2]) * escalaAplicada) * 0.5;

  const recuoZ = -(raioNormalizado * 2.8 + 1.1);
  const compensacaoY = -(raioNormalizado * 0.7);

  var view = m4.translation(0, compensacaoY, recuoZ); 
  view = m4.xRotate(view, degToRad(20));
  view = m4.yRotate(view, degToRad(45));

  tgl.useProgram(thumbProgramInfo.program);
  twgl.setUniforms(thumbProgramInfo, {
    u_lightDirection: m4.normalize([-1, 3, 5]),
    u_view: view,
    u_projection: projection,
    u_world: geomData.baseMatrix,
    u_textureMatrix: m4.identity(),
    u_texture: thumbTexture,
    u_drawPicking: false,
    u_pickingColor: [0, 0, 0, 0],
    u_drawGrid: false
  });

  thumbParts.forEach(part => {
    tgl.bindVertexArray(part.vao);
    twgl.drawBufferInfo(tgl, part.bufferInfo);
  });

  return singleThumbCanvas.toDataURL("image/png");
}