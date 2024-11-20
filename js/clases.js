// js/clases.js

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

async function cargarProfesores() {
    try {
        const optionX = document.getElementById('profesor-dni');
        showLoading(true);
        const response = await fetch('https://script.google.com/macros/s/AKfycbxNxAn2WdMTiXjwnU3NsbLW9KkNQQ7YG5SZ7fQgoq_XTWlwH6qiZTY-B-rz1zHeuq3K/exec?tipo=consultar_profesores', {
            method: 'GET',
        });

        const result = await response.json();

        if (result.status === 'success') {
            const profesores = result.data;
            optionX.innerHTML = profesores.map(profesor => `
                <option class="list-group-item" value="${profesor.DNI}">${profesor.Nombre}</option>
            `).join('');
        } else {
            alert('Error al cargar los profesores: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error al cargar los profesores.');
    }
    showLoading(false);
}

async function cargarAlumnos() {
    const optionX = document.getElementById('alumno-dni');
    showLoading(true);
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbxNxAn2WdMTiXjwnU3NsbLW9KkNQQ7YG5SZ7fQgoq_XTWlwH6qiZTY-B-rz1zHeuq3K/exec?tipo=consultar_alumnos', {
            method: 'GET',
        });

        const result = await response.json();

        if (result.status === 'success') {
            const alumnos = result.data;
            optionX.innerHTML = alumnos.map(alumno => `
                    <option class="list-group-item" value="${alumno.DNI}">${alumno.Nombre} ${alumno.Apellido1}</option>
                `).join('');
        } else {
            alert('Error al cargar los alumnos: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error al cargar los alumnos.');
    }
    showLoading(false);
}

document.addEventListener('DOMContentLoaded', () => {

    const signaturePad = new SignaturePad(document.getElementById('signature-pad'));
    const form = document.getElementById('form-clases');
    const clearBtn = document.getElementById('clear-signature');

    clearBtn.addEventListener('click', () => {
        signaturePad.clear();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        showLoading(true);

        const hoy = new Date();
        const profesorDni = document.getElementById('profesor-dni').value.trim();
        const alumnoDni = document.getElementById('alumno-dni').value.trim();
        const observacion = document.getElementById('observacion').value.trim();
        const firma = signaturePad.toDataURL();
        const fecha = hoy.getDate() + '/' + hoy.getMonth() + '/' + hoy.getFullYear(); // Fecha y hora actual
        const hora = hoy.getHours() + ':' + hoy.getMinutes();

        if (firma.length > 50000) {
            alert('Firma demasiado larga. Por favor, intenta hacerla más corta.');
            return;
        }

        if (observacion.length > 200) {
            alert('La observación supera los 200 caracteres.');
            return;
        }

        const data = {
            tipo: 'clase',
            profesorDni,
            alumnoDni,
            fecha,
            hora,
            observacion,
            firma
        };

        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbxNxAn2WdMTiXjwnU3NsbLW9KkNQQ7YG5SZ7fQgoq_XTWlwH6qiZTY-B-rz1zHeuq3K/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                mode: 'no-cors',
                body: JSON.stringify(data),
            });

            //const result = await response.json();

            //if (result.status === 'success') {
            alert('Clase registrada con éxito');
            form.reset();
            signaturePad.clear();
            //} else {
            //    alert('Error al registrar la clase: ' + result.message);
            //}
        } catch (error) {
            console.error('Error:', error);
            alert('Ocurrió un error al registrar la clase.');
        }
        showLoading(false);
    });

    //----------------------------------------------
    // cargar campo de alumnos
    cargarAlumnos();
    cargarProfesores();
});
