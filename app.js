import { parseOBJ } from './obj-parser.js';
import { vs, fs } from './shaders.js';
import { criarGeometriaGrid } from './geometry-utils.js';
import { gerarThumbnailDataURL } from './thumb-generator.js';
import { 
  atualizarDropdownsInterface, 
  atualizarValoresSlidersInterface, 
  vincularControleSlider, 
  vincularControleNumerico 
} from './ui-manager.js';

// Função principal que inicializa a aplicação  
async function main() {
  const canvas = document.querySelector("#canvas3d"); // Obtém o elemento canvas do HTML
  const gl = canvas.getContext("webgl2"); // Obtém o contexto WebGL2 do canvas
  if (!gl) {
    return;
  }

  // Elementos da interface
  const sceneSelectElement = document.querySelector('#sceneObjectsSelect');
  const parentSelectElement = document.querySelector('#parentObjectSelect');
  const btnExcluir = document.querySelector('#btnExcluirObjeto');
  const btnSalvar = document.querySelector('#btnSalvarCena');
  const btnCarregar = document.querySelector('#btnCarregarCena');
  const inputJsonFile = document.querySelector('#inputJsonFile');
  const listaModelosContainer = document.querySelector('#lista-modelos');

  twgl.setAttributePrefix("a_");
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  // Criação da textura do atlas
  var currentTexture = twgl.createTexture(gl, { 
    src: 'models/halloween/atlas.png',
    flipY: true,
  });

  var modelosCarregados = {}; 
  var instancias = []; 
  var selectedInstanceIndex = -1; 
  var instanceCounter = 0; 

  var historicoEstados = []; // Armazena o histórico dos estados das instâncias para ser possível desfazer ações por meio do Ctrl+Z ou Cmd+Z.

  var mouseX = -1;
  var mouseY = -1;
  var executouCliqueMouse = false;
  var bEstaArrastando = false;
  var modoInteracaoRato = ""; 
  var mouseUltimoX = 0;
  var mouseUltimoY = 0;

  var cameraSettings = {
    camAngle: 0.0,   
    camHeight: 1.5,  
    camRadius: 4.0,
  };

  function degToRad(deg) { return deg * Math.PI / 180; }
  function radToDeg(rad) { return Math.round(rad * 180 / Math.PI); }
  function obterIndexAtivo() { return selectedInstanceIndex; }
  function obterArrayInstancias() { return instancias; }
  function forcarAtualizacaoInterface() {
    atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
  }

  // Funções para salvar e desfazer ações
  function salvarEstadoHistorico() {
    if (historicoEstados.length >= 30) {
      historicoEstados.shift();
    }
    historicoEstados.push(JSON.stringify(instancias));
  }

  function desfazerUltimaAcao() {
    if (historicoEstados.length === 0) return;
    var estadoAnterior = historicoEstados.pop();
    instancias = JSON.parse(estadoAnterior);
    if (selectedInstanceIndex >= instancias.length) {
      selectedInstanceIndex = instancias.length - 1;
    }
    atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement);
    atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
  }

  // Criação da geometria do grid 20x20
  const gridGeometria = criarGeometriaGrid(gl, meshProgramInfo, 20.0, 20);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Atalhos de teclado para desfazer ações
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      desfazerUltimaAcao();
    }
  });

  // Controle do zoom da câmera com a roda do mouse
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraSettings.camRadius += e.deltaY * 0.005;
    cameraSettings.camRadius = Math.max(1.0, Math.min(cameraSettings.camRadius, 15.0));
    document.querySelector('#camRadius').value = cameraSettings.camRadius;
    document.querySelector('#val-camRadius').textContent = cameraSettings.camRadius.toFixed(2);
  }, { passive: false });

  // Atualização da interface quando o usuário seleciona um objeto na lista de objetos da cena
  sceneSelectElement.addEventListener('change', function(event) {
    if (event.target.value === "") {
      selectedInstanceIndex = -1;
    } else {
      selectedInstanceIndex = parseInt(event.target.value);
      atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement);
      atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
    }
  });

  // Atualização do objeto pai quando o usuário seleciona um novo pai na lista de objetos da cena
  parentSelectElement.addEventListener('change', function(event) {
    if (selectedInstanceIndex === -1) return;
    salvarEstadoHistorico();
    if (event.target.value === "none") {
      instancias[selectedInstanceIndex].parentIndex = null;
    } else {
      instancias[selectedInstanceIndex].parentIndex = parseInt(event.target.value);
    }
    atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement);
  });

  // Botão para excluir o objeto selecionado
  btnExcluir.addEventListener('click', function() {
    if (selectedInstanceIndex === -1) return;
    salvarEstadoHistorico();
    instancias.splice(selectedInstanceIndex, 1);
    instancias.forEach(inst => {
      if (inst.parentIndex === selectedInstanceIndex) {
        inst.parentIndex = null; 
      } else if (inst.parentIndex > selectedInstanceIndex) {
        inst.parentIndex--; 
      }
    });
    selectedInstanceIndex = instancias.length > 0 ? 0 : -1;
    atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement);
    atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
  });

  // Botão para salvar a cena em um arquivo JSON
  btnSalvar.addEventListener('click', function() {
    if (instancias.length === 0) {
      alert("A cena está vazia! Adicione alguns objetos antes de salvar.");
      return;
    }
    const dadosCenaString = JSON.stringify(instancias, null, 2);
    const blob = new Blob([dadosCenaString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const linkGatilho = document.createElement('a');
    linkGatilho.href = url;
    linkGatilho.download = "minha_cena_halloween.json";
    linkGatilho.click();
    URL.revokeObjectURL(url);
  });

  btnCarregar.addEventListener('click', function() {
    inputJsonFile.click();
  });

  // Carregamento de cena a partir de um arquivo JSON
  inputJsonFile.addEventListener('change', function(event) {
    const arquivoMarcado = event.target.files[0];
    if (!arquivoMarcado) return;

    const leitorArquivo = new FileReader();
    leitorArquivo.onload = async function(e) {
      try {
        const dadosCarregados = JSON.parse(e.target.result);
        if (!Array.isArray(dadosCarregados)) throw new Error("Formato inválido.");

        salvarEstadoHistorico();

        for (const inst of dadosCarregados) {
          if (inst.scale !== undefined && inst.scaleX === undefined) {
            inst.scaleX = inst.scale;
            inst.scaleY = inst.scale;
            inst.scaleZ = inst.scale;
          }
          if (inst.scaleX === undefined) inst.scaleX = 1.0;
          if (inst.scaleY === undefined) inst.scaleY = 1.0;
          if (inst.scaleZ === undefined) inst.scaleZ = 1.0;
          if (inst.posX === undefined) inst.posX = 0.0;
          if (inst.posY === undefined) inst.posY = 0.0;
          if (inst.posZ === undefined) inst.posZ = 0.0;
          if (inst.rotX === undefined) inst.rotX = 0.0;
          if (inst.rotY === undefined) inst.rotY = 0.0;
          if (inst.rotZ === undefined) inst.rotZ = 0.0;
          if (inst.destRotX === undefined) inst.destRotX = 0.0;
          if (inst.destRotY === undefined) inst.destRotY = 0.0;
          if (inst.destRotZ === undefined) inst.destRotZ = 0.0;

          if (!modelosCarregados[inst.type]) {
            const response = await fetch(`models/halloween/${inst.type}.obj`);
            const text = await response.text();
            const objParsed = parseOBJ(text);
            modelosCarregados[inst.type] = obterDadosGeometria(objParsed);
          }
        }
        instancias = dadosCarregados;
        instanceCounter = instancias.reduce((max, inst) => {
          const num = parseInt(inst.id.split('_').pop());
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);

        selectedInstanceIndex = instancias.length > 0 ? 0 : -1;
        atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement);
        atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
        alert("Cena importada com sucesso!");
      } catch (err) {
        alert("Falha ao ler o arquivo JSON: " + err.message);
      }
    };
    leitorArquivo.readAsText(arquivoMarcado);
    event.target.value = "";
  });

  // Função para converter coordenadas da janela para coordenadas do canvas
  function windowToCanvasCoordinations(x, y) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: x - rect.left,
      y: y - rect.top
    };
  }

  // Eventos de mouse para interação com objetos e câmera
  canvas.addEventListener('mousedown', (e) => {
    const coords = windowToCanvasCoordinations(e.clientX, e.clientY);
    mouseX = coords.x;
    mouseY = coords.y;
    
    mouseUltimoX = e.clientX;
    mouseUltimoY = e.clientY;
    bEstaArrastando = true;

    if (e.button === 0) {
      modoInteracaoRato = "mover_objeto";
      executouCliqueMouse = true; 
      salvarEstadoHistorico();
    } else if (e.button === 2) {
      modoInteracaoRato = "mover_camera";
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!bEstaArrastando) return;

    const deltaX = e.clientX - mouseUltimoX;
    const deltaY = e.clientY - mouseUltimoY;

    if (modoInteracaoRato === "mover_objeto" && selectedInstanceIndex !== -1) {
      if (mouseUltimoX === e.clientX && mouseUltimoY === e.clientY) return;
      
      const sensibilidadeObjeto = 0.01;
      const cosseno = Math.cos(cameraSettings.camAngle);
      const seno = Math.sin(cameraSettings.camAngle);

      instancias[selectedInstanceIndex].posX += (deltaX * cosseno - deltaY * seno) * sensibilidadeObjeto;
      instancias[selectedInstanceIndex].posZ += (deltaX * seno + deltaY * cosseno) * sensibilidadeObjeto;
      atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
    } else if (modoInteracaoRato === "mover_camera") {
      cameraSettings.camAngle -= deltaX * 0.007;
      cameraSettings.camHeight += deltaY * 0.02;

      const rCam = radToDeg(cameraSettings.camAngle) % 360;
      document.querySelector('#camAngle').value = rCam < 0 ? rCam + 360 : rCam;
      document.querySelector('#val-camAngle').textContent = document.querySelector('#camAngle').value + "°";
      document.querySelector('#camHeight').value = cameraSettings.camHeight;
      document.querySelector('#val-camHeight').textContent = cameraSettings.camHeight.toFixed(2);
    }

    mouseUltimoX = e.clientX;
    mouseUltimoY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    bEstaArrastando = false;
    modoInteracaoRato = "";
  });

  // Função para processar os dados de geometria do modelo OBJ e criar buffers WebGL
  function obterDadosGeometria(obj) {
    const parts = obj.geometries.map(({data}) => {
      if (data.color) {
        if (data.position.length === data.color.length) {
          data.color = { numComponents: 3, data: data.color };
        }
      } else { data.color = { value: [1, 1, 1, 1] }; }
      if (!data.texcoord) { data.texcoord = { value: [0, 0] }; }
      
      const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
      const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
      return { bufferInfo, vao };
    });

    var min = obj.geometries[0].data.position.slice(0, 3);
    var max = obj.geometries[0].data.position.slice(0, 3);
    obj.geometries.forEach(({data}) => {
      for (var i = 0; i < data.position.length; i += 3) {
        for (var j = 0; j < 3; ++j) {
          var v = data.position[i + j];
          min[j] = Math.min(v, min[j]); max[j] = Math.max(v, max[j]);
        }
      }
    });
    
    const range = m4.subtractVectors(max, min);
    const maxDim = Math.max(range[0], range[1], range[2]);
    const escalaNormalizacao = maxDim > 0 ? (1.5 / maxDim) : 1.0; 

    var centerOffset = [
      -(min[0] + range[0] * 0.5), 
      -min[1], 
      -(min[2] + range[2] * 0.5)
    ];

    var baseMatrix = m4.scaling(escalaNormalizacao, escalaNormalizacao, escalaNormalizacao);
    baseMatrix = m4.translate(baseMatrix, ...centerOffset);

    return { parts, baseMatrix, range };
  }

  vincularControleSlider('posX', 'val-posX', 'posX', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('posY', 'val-posY', 'posY', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('posZ', 'val-posZ', 'posZ', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('rotX', 'val-rotX', 'rotX', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico, true);
  vincularControleSlider('rotY', 'val-rotY', 'rotY', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico, true);
  vincularControleSlider('rotZ', 'val-rotZ', 'rotZ', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico, true);
  vincularControleSlider('escalaX', 'val-escalaX', 'scaleX', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('escalaY', 'val-escalaY', 'scaleY', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('escalaZ', 'val-escalaZ', 'scaleZ', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('vel', 'val-vel', 'velocidade', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('destX', 'val-destX', 'destX', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('destY', 'val-destY', 'destY', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleSlider('destZ', 'val-destZ', 'destZ', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);

  vincularControleSlider('destRotX', 'val-destRotX', 'destRotX', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico, true);
  vincularControleSlider('destRotY', 'val-destRotY', 'destRotY', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico, true);
  vincularControleSlider('destRotZ', 'val-destRotZ', 'destRotZ', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico, true);

  vincularControleNumerico('offsetX', 'offsetX', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleNumerico('offsetY', 'offsetY', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleNumerico('repeatX', 'repeatX', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);
  vincularControleNumerico('repeatY', 'repeatY', obterArrayInstancias, obterIndexAtivo, forcarAtualizacaoInterface, salvarEstadoHistorico);

  document.querySelector('#animarCheck').addEventListener('change', function(event) {
    if (selectedInstanceIndex !== -1) {
      salvarEstadoHistorico();
      instancias[selectedInstanceIndex].animar = event.target.checked;
    }
  });

  document.querySelector('#camAngle').addEventListener('input', (e) => {
    cameraSettings.camAngle = degToRad(parseFloat(e.target.value));
    document.querySelector('#val-camAngle').textContent = e.target.value + "°";
  });
  document.querySelector('#camHeight').addEventListener('input', (e) => {
    cameraSettings.camHeight = parseFloat(e.target.value);
    document.querySelector('#val-camHeight').textContent = cameraSettings.camHeight.toFixed(2);
  });
  document.querySelector('#camRadius').addEventListener('input', (e) => {
    cameraSettings.camRadius = parseFloat(e.target.value);
    document.querySelector('#val-camRadius').textContent = cameraSettings.camRadius.toFixed(2);
  });

  const atlasImageHTML = new Image();
  atlasImageHTML.src = 'models/halloween/atlas.png';
  
  atlasImageHTML.onload = async function() {
    try {
      const jsonResponse = await fetch('models/json/models.json');
      if (!jsonResponse.ok) throw new Error();
      const modelosDisponiveis = await jsonResponse.json();

      let renderQueue = Promise.resolve();

      modelosDisponiveis.forEach(model => {
        const card = document.createElement('div');
        card.className = 'card-modelo';
        card.setAttribute('data-model-type', model.id);

        card.innerHTML = `
          <img id="thumb_${model.id}" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'><rect width='128' height='128' fill='%23222'/></svg>" alt="${model.name}">
          <div class="card-info">
              <span class="nome-modelo">${model.name}</span>
              <span class="tag-modelo">.obj file</span>
          </div>
        `;

        card.addEventListener('click', async function() {
          if (bEstaArrastando) return;
          var modelType = card.getAttribute('data-model-type'); 
          instanceCounter++;

          if (!modelosCarregados[modelType]) {
            try {
              const response = await fetch(`models/halloween/${modelType}.obj`);
              const text = await response.text();
              const obj = parseOBJ(text);
              modelosCarregados[modelType] = obterDadosGeometria(obj);
            } catch (err) {
              console.error("Erro crítico ao carregar malha do modelo: " + modelType, err);
              return;
            }
          }
          
          salvarEstadoHistorico();

          var novaInstancia = {
            id: modelType + "_" + instanceCounter,
            name: model.name + " (" + instanceCounter + ")",
            type: modelType,
            parentIndex: null,
            posX: 0.0, posY: 0.0, posZ: 0.0,
            rotX: 0.0, rotY: 0.0, rotZ: 0.0,
            scaleX: 1.0, scaleY: 1.0, scaleZ: 1.0,
            offsetX: 0.0, offsetY: 0.0,
            repeatX: 1.0, repeatY: 1.0,
            animar: false, velocidade: 1.0,
            destX: 2.0, destY: 0.0, destZ: 0.0,
            destRotX: 0.0, destRotY: 0.0, destRotZ: 0.0
          };

          instancias.push(novaInstancia);
          selectedInstanceIndex = instancias.length - 1;
          atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement);
          atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
        });

        listaModelosContainer.appendChild(card);

        // Gerar miniatura para o modelo
        renderQueue = renderQueue.then(() => {
          return new Promise(async (resolve) => {
            try {
              const response = await fetch(`models/halloween/${model.id}.obj`);
              const text = await response.text();
              const parsed = parseOBJ(text);
              const tempGeomData = obterDadosGeometria(parsed);
              
              const imgDataURL = gerarThumbnailDataURL(parsed, tempGeomData, atlasImageHTML);
              const imgElement = document.getElementById(`thumb_${model.id}`);
              if (imgElement && imgDataURL) {
                imgElement.src = imgDataURL; // Atualiza a miniatura com a imagem gerada
              }
            } catch (e) {
              console.warn("Falha ao gerar miniatura para: " + model.id);
            }
            setTimeout(resolve, 5);
          });
        });
      });
    } catch (error) {
      console.error("Erro ao estruturar catálogo via models.json:", error);
    }
  };
  
  var zNear = 0.1; var zFar = 50.0;
  // Função para calcular a matriz local de uma instância, considerando animação
  function calcularMatrizLocal(inst, time) {
    var currentX = inst.posX; var currentY = inst.posY; var currentZ = inst.posZ;
    var currentRotX = inst.rotX !== undefined ? inst.rotX : 0.0;
    var currentRotY = inst.rotY !== undefined ? inst.rotY : 0.0;
    var currentRotZ = inst.rotZ !== undefined ? inst.rotZ : 0.0;

    if (inst.animar) {  // Se a animação estiver ativada
      var factor = (Math.sin(time * inst.velocidade) + 1) * 0.5; 
      currentX = inst.posX + (inst.destX - inst.posX) * factor;
      currentY = inst.posY + (inst.destY - inst.posY) * factor;
      currentZ = inst.posZ + (inst.destZ - inst.posZ) * factor;

      var dRotX = inst.destRotX !== undefined ? inst.destRotX : currentRotX;
      var dRotY = inst.destRotY !== undefined ? inst.destRotY : currentRotY;
      var dRotZ = inst.destRotZ !== undefined ? inst.destRotZ : currentRotZ;

      currentRotX = currentRotX + (dRotX - currentRotX) * factor;
      currentRotY = currentRotY + (dRotY - currentRotY) * factor;
      currentRotZ = currentRotZ + (dRotZ - currentRotZ) * factor;
    }

    // Criação da matriz de transformação local
    var mat = m4.translation(currentX, currentY, currentZ);
    mat = m4.xRotate(mat, currentRotX); 
    mat = m4.yRotate(mat, currentRotY); 
    mat = m4.zRotate(mat, currentRotZ);
    mat = m4.scale(mat, inst.scaleX, inst.scaleY, inst.scaleZ);
    return mat;
  }
  
  function render(now) {
    var time = now * 0.001; 

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    var fieldOfViewRadians = degToRad(60);
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Configuração da câmera
    var cameraMatrix = m4.yRotation(cameraSettings.camAngle);
    cameraMatrix = m4.translate(cameraMatrix, 0, cameraSettings.camHeight, cameraSettings.camRadius);
    var cameraPosition = [cameraMatrix[12], cameraMatrix[13], cameraMatrix[14]];
    var up = [0, 1, 0];
    var cameraMatrixLookAt = m4.lookAt(cameraPosition, [0, 0, 0], up);
    var view = m4.inverse(cameraMatrixLookAt);

    // Grafo de cenas para criar a herança entre os objetos
    var matrizesLocais = instancias.map(inst => calcularMatrizLocal(inst, time));
    var matrizesMundoFinais = instancias.map((inst, index) => {
      var mFim = m4.copy(matrizesLocais[index]);
      var pIdx = inst.parentIndex;
      while (pIdx !== null && pIdx !== undefined && pIdx < instancias.length) {
        mFim = m4.multiply(matrizesLocais[pIdx], mFim);
        pIdx = instancias[pIdx].parentIndex;
      }
      return mFim;
    });

    // Detecção de clique e seleção de instâncias - Color Picking
    if (executouCliqueMouse) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.0, 0.0, 0.0, 0.0); 
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(meshProgramInfo.program);

      instancias.forEach((inst, index) => {
        var geomData = modelosCarregados[inst.type];
        if (!geomData) return;

        var u_world = m4.multiply(matrizesMundoFinais[index], geomData.baseMatrix);
        const idQuimico = index + 1;
        const pickingColor = [idQuimico / 255.0, 0.0, 0.0, 1.0];

        twgl.setUniforms(meshProgramInfo, {
          u_view: view,
          u_projection: projection,
          u_world: u_world,
          u_textureMatrix: m4.identity(),
          u_drawPicking: true,
          u_pickingColor: pickingColor,
          u_drawGrid: false
        });

        geomData.parts.forEach(part => {
          gl.bindVertexArray(part.vao);
          twgl.drawBufferInfo(gl, part.bufferInfo);
        });
      });

      const pixelRead = new Uint8Array(4);
      gl.readPixels(mouseX, gl.canvas.height - mouseY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelRead); // Lê o pixel na posição do clique
      
      const idDetectado = pixelRead[0]; 
      if (idDetectado > 0 && idDetectado <= instancias.length) {
        selectedInstanceIndex = idDetectado - 1; 
      } else {
        selectedInstanceIndex = -1; 
      }

      atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement);
      atualizarValoresSlidersInterface(instancias, selectedInstanceIndex);
      executouCliqueMouse = false; 
    }

    // Renderização normal da cena
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.11, 0.11, 0.11, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(meshProgramInfo.program);

    gl.bindVertexArray(gridGeometria.vao);
    twgl.setUniforms(meshProgramInfo, {
      u_view: view,
      u_projection: projection,
      u_world: m4.identity(),
      u_textureMatrix: m4.identity(),
      u_drawPicking: false,
      u_drawGrid: true,
      u_pickingColor: [0, 0, 0, 0]
    });
    gl.drawArrays(gl.LINES, 0, gridGeometria.bufferInfo.numElements);

    // Renderização das instâncias
    instancias.forEach((inst, index) => {
      var geomData = modelosCarregados[inst.type];
      if (!geomData) return; 

      var u_world = m4.multiply(matrizesMundoFinais[index], geomData.baseMatrix);
      var textureMatrix = m4.identity();
      textureMatrix = m4.translate(textureMatrix, inst.offsetX, inst.offsetY, 0);
      textureMatrix = m4.scale(textureMatrix, inst.repeatX, inst.repeatY, 1);

      twgl.setUniforms(meshProgramInfo, {
        u_lightDirection: m4.normalize([-1, 3, 5]), // Direção da luz
        u_view: view,
        u_projection: projection,
        u_world: u_world,
        u_textureMatrix: textureMatrix,
        u_texture: currentTexture,
        u_drawPicking: false,
        u_drawGrid: false,
        u_pickingColor: [0, 0, 0, 0]
      });

      for (var ii = 0; ii < geomData.parts.length; ++ii) {
        var part = geomData.parts[ii];
        gl.bindVertexArray(part.vao);
        twgl.drawBufferInfo(gl, part.bufferInfo);
      }
    });

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

window.onload = main;