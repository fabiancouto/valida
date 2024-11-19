// js/alumnos.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-alumnos');
    const consultaBtn = document.getElementById('consulta');
    const lista = document.getElementById('lista-alumnos');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dni = document.getElementById('dni').value.trim();
        const permiso = document.getElementById('permiso').value.trim();
        const nombre = document.getElementById('nombre').value.trim();
        const apellido1 = document.getElementById('apellido1').value.trim();
        const apellido2 = document.getElementById('apellido2').value.trim();
        const direccion = document.getElementById('direccion').value.trim();
        const codigoPostal = document.getElementById('codigo_postal').value.trim();
        const poblacion = document.getElementById('poblacion').value.trim();

        const data = {
            tipo: 'alumno',
            dni,
            permiso,
            nombre,
            apellido1,
            apellido2,
            direccion,
            codigoPostal,
            poblacion
        };

        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbxNxAn2WdMTiXjwnU3NsbLW9KkNQQ7YG5SZ7fQgoq_XTWlwH6qiZTY-B-rz1zHeuq3K/exec', {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            
            alert('Alumno registrado con éxito');
            form.reset();
            
        } catch (error) {
            console.error('Error:', error);
            alert('Ocurrió un error al registrar el alumno.');
        }
    });

    consultaBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbxNxAn2WdMTiXjwnU3NsbLW9KkNQQ7YG5SZ7fQgoq_XTWlwH6qiZTY-B-rz1zHeuq3K/exec?tipo=consultar_alumnos', {
                method: 'GET',
            });

            const result = await response.json();

            if (result.status === 'success') {
                const alumnos = result.data;
                lista.innerHTML = alumnos.map(alumno => `
                    <li class="list-group-item">${alumno.DNI} - ${alumno.Nombre} ${alumno.Apellido1}</li>
                `).join('');
            } else {
                alert('Error al cargar los alumnos: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ocurrió un error al cargar los alumnos.');
        }
    });
});
