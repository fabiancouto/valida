// js/profesores.js

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

document.addEventListener('DOMContentLoaded', () => {
    const signaturePad = new SignaturePad(document.getElementById('signature-pad'));
    const form = document.getElementById('form-profesores');
    const clearBtn = document.getElementById('clear-signature');
    const consultaBtn = document.getElementById('consulta');
    const lista = document.getElementById('lista-profesores');



    clearBtn.addEventListener('click', () => {
        signaturePad.clear();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        showLoading(true);
        const dni = document.getElementById('dni').value.trim();
        const nombre = document.getElementById('nombre').value.trim();
        const firma = signaturePad.toDataURL();

        if (firma.length > 50000) {
            alert('Firma demasiado larga. Por favor, intenta hacerla más corta.');
            return;
        }

        const data = {
            tipo: 'profesor',
            dni,
            nombre,
            firma
        };

        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbxNxAn2WdMTiXjwnU3NsbLW9KkNQQ7YG5SZ7fQgoq_XTWlwH6qiZTY-B-rz1zHeuq3K/exec', {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            //const result = await response.json();

            //if (result.status === 'success') {
                alert('Profesor registrado con éxito');
                form.reset();
                signaturePad.clear();
            //} else {
            //    alert('Error al registrar el profesor: ' + result.message);
            //}
        } catch (error) {
            console.error('Error:', error);
            alert('Ocurrió un error al registrar el profesor.');
        }
        showLoading(false);
    });

    consultaBtn.addEventListener('click', async () => {
        try {
            showLoading(true);
            const response = await fetch('https://script.google.com/macros/s/AKfycbxNxAn2WdMTiXjwnU3NsbLW9KkNQQ7YG5SZ7fQgoq_XTWlwH6qiZTY-B-rz1zHeuq3K/exec?tipo=consultar_profesores', {
                method: 'GET',
            });

            const result = await response.json();

            if (result.status === 'success') {
                const profesores = result.data;
                lista.innerHTML = profesores.map(profesor => `
                    <li class="list-group-item">${profesor.DNI} - ${profesor.Nombre}</li>
                `).join('');
            } else {
                alert('Error al cargar los profesores: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ocurrió un error al cargar los profesores.');
        }
        showLoading(false);
    });
});
