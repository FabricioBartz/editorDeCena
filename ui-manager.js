function radToDeg(rad) { return Math.round(rad * 180 / Math.PI); }
function degToRad(deg) { return deg * Math.PI / 180; }

// Função para atualizar os elementos de dropdown na interface com base nas instâncias e na instância selecionada
export function atualizarDropdownsInterface(instancias, selectedInstanceIndex, sceneSelectElement, parentSelectElement) {
  sceneSelectElement.innerHTML = '';
  parentSelectElement.innerHTML = '<option value="none">Nenhum (Raiz da Cena)</option>';

  if (instancias.length === 0) {
    var opt = document.createElement('option');
    opt.value = ""; opt.textContent = "Nenhum objeto na cena";
    sceneSelectElement.appendChild(opt);
    return;
  }

  instancias.forEach((inst, index) => {
    var opt = document.createElement('option');
    opt.value = index;
    opt.textContent = inst.name;
    if (index === selectedInstanceIndex) opt.selected = true;
    sceneSelectElement.appendChild(opt);

    if (index !== selectedInstanceIndex) {
      var optParent = document.createElement('option');
      optParent.value = index;
      optParent.textContent = inst.name;
      if (selectedInstanceIndex !== -1 && instancias[selectedInstanceIndex].parentIndex === index) {
        optParent.selected = true;
      }
      parentSelectElement.appendChild(optParent);
    }
  });
}

// Função para atualizar os valores dos sliders na interface com base na instância selecionada
export function atualizarValoresSlidersInterface(instancias, selectedInstanceIndex) {
  if (selectedInstanceIndex === -1 || !instancias[selectedInstanceIndex]) return;
  var inst = instancias[selectedInstanceIndex];

  document.querySelector('#posX').value = inst.posX !== undefined ? inst.posX : 0.0;
  document.querySelector('#val-posX').textContent = Number(inst.posX !== undefined ? inst.posX : 0.0).toFixed(2);

  document.querySelector('#posY').value = inst.posY !== undefined ? inst.posY : 0.0;
  document.querySelector('#val-posY').textContent = Number(inst.posY !== undefined ? inst.posY : 0.0).toFixed(2);

  document.querySelector('#posZ').value = inst.posZ !== undefined ? inst.posZ : 0.0;
  document.querySelector('#val-posZ').textContent = Number(inst.posZ !== undefined ? inst.posZ : 0.0).toFixed(2);

  var rx = inst.rotX !== undefined ? radToDeg(inst.rotX) : 0;
  document.querySelector('#rotX').value = rx;
  document.querySelector('#val-rotX').textContent = rx + "°";

  var ry = inst.rotY !== undefined ? radToDeg(inst.rotY) : 0;
  document.querySelector('#rotY').value = ry;
  document.querySelector('#val-rotY').textContent = ry + "°";

  var rz = inst.rotZ !== undefined ? radToDeg(inst.rotZ) : 0;
  document.querySelector('#rotZ').value = rz;
  document.querySelector('#val-rotZ').textContent = rz + "°";

  document.querySelector('#escalaX').value = inst.scaleX !== undefined ? inst.scaleX : 1.0;
  document.querySelector('#val-escalaX').textContent = Number(inst.scaleX !== undefined ? inst.scaleX : 1.0).toFixed(2);

  document.querySelector('#escalaY').value = inst.scaleY !== undefined ? inst.scaleY : 1.0;
  document.querySelector('#val-escalaY').textContent = Number(inst.scaleY !== undefined ? inst.scaleY : 1.0).toFixed(2);

  document.querySelector('#escalaZ').value = inst.scaleZ !== undefined ? inst.scaleZ : 1.0;
  document.querySelector('#val-escalaZ').textContent = Number(inst.scaleZ !== undefined ? inst.scaleZ : 1.0).toFixed(2);
  
  document.querySelector('#offsetX').value = inst.offsetX !== undefined ? inst.offsetX : 0.0;
  document.querySelector('#offsetY').value = inst.offsetY !== undefined ? inst.offsetY : 0.0;
  document.querySelector('#repeatX').value = inst.repeatX !== undefined ? inst.repeatX : 1.0;
  document.querySelector('#repeatY').value = inst.repeatY !== undefined ? inst.repeatY : 1.0;
  
  document.querySelector('#animarCheck').checked = inst.animar !== undefined ? inst.animar : false;
  document.querySelector('#vel').value = inst.velocidade !== undefined ? inst.velocidade : 1.0;
  document.querySelector('#val-vel').textContent = Number(inst.velocidade !== undefined ? inst.velocidade : 1.0).toFixed(2);
  
  document.querySelector('#destX').value = inst.destX !== undefined ? inst.destX : 2.0;
  document.querySelector('#val-destX').textContent = Number(inst.destX !== undefined ? inst.destX : 2.0).toFixed(2);
  document.querySelector('#destY').value = inst.destY !== undefined ? inst.destY : 0.0;
  document.querySelector('#val-destY').textContent = Number(inst.destY !== undefined ? inst.destY : 0.0).toFixed(2);
  document.querySelector('#destZ').value = inst.destZ !== undefined ? inst.destZ : 0.0;
  document.querySelector('#val-destZ').textContent = Number(inst.destZ !== undefined ? inst.destZ : 0.0).toFixed(2);

  var drx = inst.destRotX !== undefined ? radToDeg(inst.destRotX) : 0;
  document.querySelector('#destRotX').value = drx;
  document.querySelector('#val-destRotX').textContent = drx + "°";

  var dry = inst.destRotY !== undefined ? radToDeg(inst.destRotY) : 0;
  document.querySelector('#destRotY').value = dry;
  document.querySelector('#val-destRotY').textContent = dry + "°";

  var drz = inst.destRotZ !== undefined ? radToDeg(inst.destRotZ) : 0;
  document.querySelector('#destRotZ').value = drz;
  document.querySelector('#val-destRotZ').textContent = drz + "°";
}

// Função para vincular um controle de slider a uma propriedade de instância, atualizando a interface e salvando o estado histórico
export function vincularControleSlider(idInput, idTexto, property, obterArrayInstancias, obterIndexAtivo, callbackAtualizar, salvarEstadoHistorico, isRotation = false) {
  var inputSlider = document.querySelector(`#${idInput}`);
  var textElem = document.querySelector(`#${idTexto}`);
  var flagPrimeiroGatilho = true;

  inputSlider.addEventListener('mousedown', function() {
    flagPrimeiroGatilho = true;
  });

  inputSlider.addEventListener('input', function(event) {
    var value = parseFloat(event.target.value);
    var idx = obterIndexAtivo();
    var atuaisInstancias = obterArrayInstancias();
    if (idx !== -1 && atuaisInstancias[idx]) {
      if (flagPrimeiroGatilho) {
        salvarEstadoHistorico();
        flagPrimeiroGatilho = false;
      }
      if (isRotation) {
        textElem.textContent = value + "°";
        atuaisInstancias[idx][property] = degToRad(value);
      } else {
        textElem.textContent = value.toFixed(2);
        atuaisInstancias[idx][property] = value;
      }
      callbackAtualizar();
    }
  });
}

// Função para vincular um controle numérico (input type="number") a uma propriedade de instância, atualizando a interface e salvando o estado histórico
export function vincularControleNumerico(idInput, property, obterArrayInstancias, obterIndexAtivo, callbackAtualizar, salvarEstadoHistorico) {
  var input = document.querySelector(`#${idInput}`);
  
  input.addEventListener('focus', function() {
    salvarEstadoHistorico();
  });

  input.addEventListener('input', function(event) {
    var value = parseFloat(event.target.value);
    var idx = obterIndexAtivo();
    var atuaisInstancias = obterArrayInstancias();
    if (!isNaN(value) && idx !== -1 && atuaisInstancias[idx]) {
      atuaisInstancias[idx][property] = value;
      callbackAtualizar();
    }
  });
}