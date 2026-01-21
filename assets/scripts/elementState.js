// util simples para remover classes que terminam com "-state"
function clearStateClasses(el) {
  [...el.classList].forEach(cls => {
    if (cls.endsWith('-state')) el.classList.remove(cls);
  });
}

// seta o estado no container e propaga para presets descendentemente
function setElementState(container, newState) {
  // 1) altera state do próprio container
  clearStateClasses(container);
  container.classList.add(`${newState}-state`);

  // 2) propaga: atualiza presets que NÃO estão dentro de outro "state container"
  propagateStateToDescendants(container, newState);
}

// percorre presets dentro do container e mostra apenas os elegíveis
function propagateStateToDescendants(container, newState) {
  const presets = container.querySelectorAll('.preset');

  presets.forEach(preset => {
    // verifica se existe um container intermediário com classe "*-state"
    let ancestor = preset.parentElement;
    let hasIntermediateStateContainer = false;

    while (ancestor && ancestor !== container) {
      // detectar qualquer classe que termine com "-state"
      if ([...ancestor.classList].some(c => c.endsWith('-state'))) {
        hasIntermediateStateContainer = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }

    // se houver container de estado entre container e preset -> não mexe (preserve local behavior)
    if (hasIntermediateStateContainer) return;

    // caso contrário, marca visível se o preset corresponde ao estado atual
    if (preset.classList.contains(`preset-${newState}`)) {
      preset.classList.add('is-visible');
    } else {
      preset.classList.remove('is-visible');
    }
  });
}

function initStatePropagation(root = document) {
    const stateContainers = [];

    // encontra TODOS os elementos que possuem alguma classe "*-state"
    const allElements = root.querySelectorAll('*');

    allElements.forEach(el => {
        const stateClass = [...el.classList].find(c => c.endsWith('-state'));
        if (stateClass) {
            const state = stateClass.replace('-state', '');
            stateContainers.push({ el, state });
        }
    });

    // ordena por profundidade (pai primeiro)
    stateContainers.sort((a, b) => {
        return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_CONTAINED_BY
            ? -1
            : 1;
    });

    // propaga estado respeitando escopos
    stateContainers.forEach(({ el, state }) => {
        propagateStateToDescendants(el, state);
    });
}

initStatePropagation();