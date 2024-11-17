let currentEditingIndex = -1;

document.addEventListener('DOMContentLoaded', function() {
  loadRules();
  setupEventListeners();
});

function setupEventListeners() {
  const addRuleButton = document.getElementById('addRule');
  if (addRuleButton) {
    addRuleButton.addEventListener('click', addRule);
  }

  const saveEditButton = document.getElementById('saveEditButton');
  if (saveEditButton) {
    saveEditButton.addEventListener('click', saveEditedRule);
  }

  const cancelEditButton = document.getElementById('cancelEditButton');
  if (cancelEditButton) {
    cancelEditButton.addEventListener('click', closeEditModal);
  }

  const exportRulesButton = document.getElementById('exportRules');
  if (exportRulesButton) {
    exportRulesButton.addEventListener('click', exportRulesToCSV);
  }

  const importRulesButton = document.getElementById('importRulesButton');
  const importRulesInput = document.getElementById('importRules');
  if (importRulesButton && importRulesInput) {
    importRulesButton.addEventListener('click', () => importRulesInput.click());
    importRulesInput.addEventListener('change', (event) => {
      if (event.target.files.length > 0) {
        importRulesFromCSV(event.target.files[0]);
      }
    });
  }
}

function addRule() {
  const trigger = document.getElementById('triggerInput').value.trim();
  const response = document.getElementById('responseInput').value.trim();
  const caseSensitive = document.getElementById('caseSensitive').checked;
  const exactMatch = document.getElementById('exactMatch').checked;
  const context = document.getElementById('contextSelect').value;
  const fileInput = document.getElementById('fileInput');

  if (!trigger || !response) {
    alert('Por favor, complete todos los campos obligatorios');
    return;
  }

  const newRule = {
    trigger: trigger,
    response: response,
    caseSensitive: caseSensitive,
    exactMatch: exactMatch,
    context: context,
    createdAt: Date.now()
  };

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    readFileAsDataURL(file, function(dataUrl) {
      newRule.file = {
        name: file.name,
        type: file.type,
        content: dataUrl
      };
      saveRule(newRule);
    });
  } else {
    saveRule(newRule);
  }
}

function readFileAsDataURL(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    callback(e.target.result);
  };
  reader.onerror = function(e) {
    console.error("Error al leer el archivo:", e);
    alert("Hubo un error al leer el archivo. Por favor, inténtelo de nuevo.");
  };
  reader.readAsDataURL(file);
}

function saveRule(rule) {
  chrome.storage.local.get('rules', function(data) {
    const rules = data.rules || [];
    
    // Manejar el contenido del archivo si es necesario
    if (rule.file && rule.file.content.length > 8000) {
      const ruleId = Date.now().toString();
      const parts = Math.ceil(rule.file.content.length / 8000);
      for (let i = 0; i < parts; i++) {
        const start = i * 8000;
        const end = (i + 1) * 8000;
        chrome.storage.local.set({[`file_${ruleId}_${i}`]: rule.file.content.slice(start, end)}, handleStorageError);
      }
      rule.file.content = `file_${ruleId}`;
      rule.file.parts = parts;
    }

    rules.push(rule);
    
    chrome.storage.local.set({ rules: rules }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error al guardar reglas:', chrome.runtime.lastError);
        alert('Hubo un error al guardar la regla. Por favor, inténtelo de nuevo.');
      } else {
        loadRules();
        resetForm();
      }
    });
  });
}

function handleStorageError() {
  if (chrome.runtime.lastError) {
    console.error('Error al guardar en storage:', chrome.runtime.lastError);
    alert('Hubo un error al guardar los datos. Es posible que el archivo sea demasiado grande.');
  }
}

function resetForm() {
  const inputs = ['triggerInput', 'responseInput', 'caseSensitive', 'exactMatch', 'contextSelect', 'fileInput'];
  
  inputs.forEach(id => {
    const element = document.getElementById(id);
    
    if (element) {
      if (element.type === 'checkbox') {
        element.checked = false;
      } else if (element.type === 'select-one') {
        element.value = 'all';
      } else {
        element.value = '';
      }
    }
  });
}

function createRuleElement(rule, index) {
  const ruleElement = document.createElement('div');
  
  ruleElement.className = 'rule-item';
  
  let fileInfo = rule.file ? `<br><strong>Archivo:</strong> ${rule.file.name}` : '';
  
  ruleElement.innerHTML = `
    <strong>Palabra Clave:</strong> ${rule.trigger}<br>
    <strong>Respuesta:</strong> ${rule.response}<br>
    <strong>Contexto:</strong> ${rule.context}
    ${fileInfo}
    <div class="rule-actions">
      <button class="edit-button" data-index="${index}">Editar</button>
      <button class="delete-button" data-index="${index}">Eliminar</button>
    </div>
  `;

  ruleElement.querySelector('.edit-button').addEventListener('click', () => openEditModal(index));
  
  ruleElement.querySelector('.delete-button').addEventListener('click', () => deleteRule(index));
  
  return ruleElement;
}

function openEditModal(index) {
  const modal = document.getElementById('editModal');
  
  chrome.storage.local.get('rules', function(data) {
    
    const rules = data.rules || [];
    
    const rule = rules[index];

    if (rule) {
      
      document.getElementById('editTriggerInput').value = rule.trigger;
      
      document.getElementById('editResponseInput').value = rule.response;
      
      document.getElementById('editCaseSensitive').checked = rule.caseSensitive;
      
      document.getElementById('editExactMatch').checked = rule.exactMatch;
      
      document.getElementById('editContextSelect').value = rule.context;

      const fileInfoElement = document.getElementById('editFileInfo');
      
      if (fileInfoElement) {
        
        fileInfoElement.textContent = rule.file ? `Archivo actual: ${rule.file.name}` : 'No hay archivo adjunto';
        
      }

      currentEditingIndex = index;
      
      modal.style.display = 'block';
      
    }
    
   });
}

function saveEditedRule() {

   if (currentEditingIndex === -1) return;

   const editedRule = {

     trigger: document.getElementById('editTriggerInput').value.trim(),

     response: document.getElementById('editResponseInput').value.trim(),

     caseSensitive: document.getElementById('editCaseSensitive').checked,

     exactMatch: document.getElementById('editExactMatch').checked,

     context: document.getElementById('editContextSelect').value

   };

   const fileInput = document.getElementById('editFileInput');

   if (fileInput.files.length > 0) {

     const file = fileInput.files[0];

     readFileAsDataURL(file, function(dataUrl) {

       editedRule.file = {

         name: file.name,

         type: file.type,

         content: dataUrl

       };

       updateRule(editedRule);

     });

   } else {

     chrome.storage.local.get('rules', function(data) {

       const rules = data.rules || [];

       if (rules[currentEditingIndex].file) {

         editedRule.file = rules[currentEditingIndex].file;

       }

       updateRule(editedRule);

     });

   }

}

function updateRule(editedRule) {

   chrome.storage.local.get('rules', function(data) {

     const rules = data.rules || [];

     // Manejar el contenido del archivo si es necesario

     if (editedRule.file && editedRule.file.content.length > 8000) {

       const ruleId = Date.now().toString();

       const parts = Math.ceil(editedRule.file.content.length / 8000);

       for (let i = 0; i < parts; i++) {

         const start = i * 8000;

         const end = (i + 1) * 8000;

         chrome.storage.local.set({[`file_${ruleId}_${i}`]: editedRule.file.content.slice(start, end)}, handleStorageError);

       }

       editedRule.file.content = `file_${ruleId}`;

       editedRule.file.parts = parts;

     }

     rules[currentEditingIndex] = editedRule;

     chrome.storage.local.set({ rules: rules }, function() {

       if (chrome.runtime.lastError) {

         console.error('Error al actualizar regla:', chrome.runtime.lastError);

         alert('Hubo un error al actualizar la regla. Por favor, inténtelo de nuevo.');

       } else {

         loadRules();

         closeEditModal();

       }

     });

   });

}

function deleteRule(index) {

   chrome.storage.local.get('rules', function(data) {

     const rules = data.rules || [];

     rules.splice(index,1);

     chrome.storage.local.set({rules:rules}, function() {

       loadRules();

     });

   });

}

// Exportar reglas a CSV
function exportRulesToCSV() {
   chrome.storage.local.get("rules", function(data){
       let rules=data.rules||[];
       let csvContent="data:text/csv;charset=utf-8,";

       // Agregar encabezados
       csvContent+="Trigger,Response,CaseSensitive,ExactMatch,Context\n";

       // Agregar cada regla como una fila en el CSV
       rules.forEach(rule=>{
           let row=[
               rule.trigger,
               rule.response,
               rule.caseSensitive,
               rule.exactMatch,
               rule.context
           ].map(field=>`"${field}"`).join(",");
           csvContent+=row+"\n";
       });

       // Crear un enlace para descargar el CSV
       let encodedUri=encodeURI(csvContent);
       let link=document.createElement("a");
       link.setAttribute("href",encodedUri);
       link.setAttribute("download","rules.csv");
       document.body.appendChild(link); // Necesario para Firefox
       link.click(); // Iniciar descarga
       document.body.removeChild(link); // Limpiar el DOM
   });
}

// Importar reglas desde un archivo CSV
function importRulesFromCSV(file){
   let reader=new FileReader();
   reader.onload=function(e){
       let content=e.target.result;
       let lines=content.split("\n");
       let newRules=[];

       // Comenzar desde el índice uno para saltar la cabecera
       for(let i=1;i<lines.length;i++){
           if(lines[i].trim()==='') continue; // Saltar líneas vacías
           let fields=lines[i].split(",").map(field=>field.replace(/^"(.*)"$/, '$1'));
           newRules.push({
               trigger: fields[0],
               response: fields[1],
               caseSensitive: fields[2]==='true',
               exactMatch: fields[3]==='true',
               context: fields[4],
               createdAt: Date.now()
           });
       }

       chrome.storage.local.get("rules",function(data){
           let rules=data.rules||[];
           let updatedRules=rules.concat(newRules); // Combinar reglas existentes con las nuevas
           chrome.storage.local.set({rules:updatedRules},function(){
               loadRules(); // Cargar las reglas actualizadas
               alert("Reglas importadas con éxito");
           });
       });
   };
   reader.readAsText(file); // Leer el archivo como texto
}

function loadRules() {
   chrome.storage.local.get("rules", function(data){
       let rules=data.rules||[];
       let rulesList=document.getElementById("rulesList");
       
       if(rulesList){
           rulesList.innerHTML=''; // Limpiar la lista existente

           rules.forEach((rule,index)=>{
               let ruleElement=createRuleElement(rule,index);
               rulesList.appendChild(ruleElement); // Añadir cada regla a la lista
           });
       }
   });
}

function closeEditModal() {
   const modal=document.getElementById("editModal");
   
   if(modal){
       modal.style.display="none"; // Cerrar modal de edición
   }
   
   currentEditingIndex=-1; // Reiniciar índice de edición actual
}