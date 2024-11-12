function enableEditing() {
    var codeField = document.getElementById('codigo');
    codeField.readOnly = false;
    codeField.focus();
}

function createExternalCode() {
    
    if($('#codigo').val().startsWith('5000')) {
        $('#codigoExterno').val($('#codigo').val().substring(6, 12));
    }
}

function validateCode(msgValue) {
    var errorMessage = document.getElementById('error-message');
    if(msgValue != null && msgValue != "") {
        errorMessage.style.display = 'block';
        errorMessage.innerText = msgValue;
    } else {
        errorMessage.style.display = 'none';
    }
    
}


$(document).ready(function () {

  //$('#myForm')[0].reset();
  $('#codigo').val('');
  $('#codigoExterno').val('');

  // Initialize QuaggaJS
  Quagga.init({
      inputStream: {
          name: "Live",
          type: "LiveStream",
          target: document.querySelector('#scannerModal .modal-body')
      },
      decoder: {
          readers: ['ean_reader']
      }
  }, function (err) {
      if (err) {
          console.error(err);
          return;
      }
      console.log("QuaggaJS initialized");
      Quagga.start();
  });

  // On barcode detected, fill the code input and close the modal
  Quagga.onDetected(function (data) {
      var code = data.codeResult.code;
      $('#codigo').val(code);
      $('#codigoExterno').val(code.substring(6, 12));
      $('#scannerModal').modal('hide');
      Quagga.stop();
      checkFormValidity();
  });

  // Stop Quagga when modal is closed
  $('#scannerModal').on('hidden.bs.modal', function () {
      Quagga.stop();
  });

  // Form submit handler
  document.getElementById("myForm").addEventListener("submit", function(event) {
      event.preventDefault(); // Evita que el formulario se envíe de forma convencional
      
      showLoading(true);
      
      enviarTicket($('#codigoExterno').val(), this);
      
  });

  // Check form validity
  function checkFormValidity() {
      var instructorValue = $('#instructor').val();
      var codigoValue = $('#codigo').val();
      var codigoExternoValue = $('#codigoExterno').val();
      
      if (codigoValue.startsWith('5000') && instructorValue && codigoValue && codigoExternoValue) {
          $('#submitButton').prop('disabled', false);
      } else {
          $('#submitButton').prop('disabled', true);
      }
      if(!instructorValue){
          validateCode("Debe seleccionar un instructor");
      } else if(!codigoValue || !codigoExternoValue) {
          validateCode("Debe escanear un código o introducirlo manualmente");
      } else if(!codigoValue.startsWith('5000')) {
          validateCode("El codigo introducido no es correcto, vuelva a intentarlo");
      } else {
          validateCode("");
      }
  }

  // Listen for changes in form fields
  $('#instructor, #codigo, #codigoExterno').on('input', checkFormValidity);
});

//-----------------------------------------------------------//

async function enviarTicket(ticketCode, formdata) {
    const url = "https://script.google.com/macros/s/AKfycbzYP0LtUU8_-X224x4XUa6XFMI_J_zZm29zmGXM1jf4W6Cn2DZamTnEPpWSP1RbSuEhvw/exec"; // Reemplaza con la URL del script

    const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
        "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `ticketCode=${ticketCode}`
    });

    const message = await response.text();

    if(message == 'OK'){
      const formData = new FormData(formdata);
      fetch('https://docs.google.com/forms/d/1soBaAihwYg2IJf7icGPvTKzgAlDHK9wAgP05pxrWgYY/formResponse', {
          method: 'POST',
          mode: 'cors', // Para evitar errores de CORS
          body: formData
      })
      .then(response => {
          // Maneja la respuesta según necesites
          console.log('Respuesta recibida:', response);
          alert("Datos enviados correctamente");
          window.location.reload();
      })
      .catch(error => alert('Error al enviar los datos:\n' + error));
    } else {
      alert(message);
      window.location.reload();
    }

    console.log(message); // Este mensaje será "Ticket registrado correctamente" o "Este ticket ya ha sido registrado anteriormente"
}

//-----------------------------------------------------------//


  // Función para mostrar/ocultar la pantalla de carga con Spin.js
  function showLoading(isLoading) {
    const loadingOverlay = document.getElementById('loadingOverlay');
  
    if (isLoading) {
      // Crear el spinner con las opciones de Spin.js
      const options = {
        lines: 13, // Número de líneas
        length: 28, // Longitud de las líneas
        width: 14, // Ancho de las líneas
        radius: 42, // Radio del círculo
        scale: 1, // Escala del spinner
        corners: 1, // Bordes de las líneas (más redondeados)
        color: '#fff', // Color del spinner
        fadeColor: 'transparent', // Color de desvanecimiento
        speed: 1, // Velocidad de rotación
        rotate: 0, // Rotación
        animation: 'spin', // Animación
        direction: 1, // Dirección
        zIndex: 2e9, // Índice Z
        top: '50%', // Posición top del spinner
        left: '50%', // Posición left del spinner
        shadow: '0 0 1px transparent', // Sombra del spinner
        position: 'absolute' // Posición absoluta
      };
  
      // Iniciar el spinner
      const spinner = new Spinner(options).spin();
      loadingOverlay.appendChild(spinner.el);
  
      // Mostrar el overlay
      loadingOverlay.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Bloquear el scroll
    } else {
      // Detener el spinner y ocultar el overlay
      loadingOverlay.innerHTML = ''; // Eliminar spinner
      loadingOverlay.style.display = 'none';
      document.body.style.overflow = 'auto'; // Permitir el scroll
    }
  }
  
