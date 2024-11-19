// js/clases.js

document.addEventListener('DOMContentLoaded', () => {
    const signaturePad = new SignaturePad(document.getElementById('signature-pad'));
    const form = document.getElementById('form-clases');
    const clearBtn = document.getElementById('clear-signature');

    clearBtn.addEventListener('click', () => {
        signaturePad.clear();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const profesorDni = document.getElementById('profesor-dni').value.trim();
        const alumnoDni = document.getElementById('alumno-dni').value.trim();
        const observacion = document.getElementById('observacion').value.trim();
        const firma = signaturePad.toDataURL();
        const fecha = new Date().toISOString(); // Fecha y hora actual

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
    });
});
