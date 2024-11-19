// js/profesores.js

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

            const result = await response.json();

            if (result.status === 'success') {
                alert('Profesor registrado con éxito');
                form.reset();
                signaturePad.clear();
            } else {
                alert('Error al registrar el profesor: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ocurrió un error al registrar el profesor.');
        }
    });

    consultaBtn.addEventListener('click', async () => {
        try {
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
    });
});
