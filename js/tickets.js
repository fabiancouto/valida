/* ==========================================================================
   Autoescuela Vivero · Validación de tickets
   Sin jQuery ni Bootstrap: solo DOM nativo. Quagga se carga bajo demanda.
   ========================================================================== */
   (function () {
    'use strict';

    var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzYP0LtUU8_-X224x4XUa6XFMI_J_zZm29zmGXM1jf4W6Cn2DZamTnEPpWSP1RbSuEhvw/exec';
    var QUAGGA_URL = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
    var MIN_EXTERNAL_CODE = 230620;
    var STORAGE_INSTRUCTOR = 'selectedInstructor';
    var STORAGE_VEHICLE = 'selectedVehiculo';

    var form = document.getElementById('myForm');
    if (!form) {
        return;
    }
	
	 var instructor = document.getElementById('instructor');
    var vehiculo = document.getElementById('vehiculo');
    var codigo = document.getElementById('codigo');
    var codigoExterno = document.getElementById('codigoExterno');
    var codeHint = document.getElementById('codeHint');
    var submitButton = document.getElementById('submitButton');
    var submitLabel = document.getElementById('submitLabel');
    var errorBox = document.getElementById('error-message');
    var errorText = document.getElementById('error-message-text');
    var manualButton = document.getElementById('manualButton');
    var scanButton = document.getElementById('scanButton');
    var scannerModal = document.getElementById('scannerModal');
    var scannerViewport = document.getElementById('scannerViewport');
    var scannerStage = document.getElementById('scannerStage');
    var scannerStatus = document.getElementById('scannerStatus');
    var scannerStatusText = document.getElementById('scannerStatusText');
    var scannerError = document.getElementById('scannerError');
    var closeScannerButton = document.getElementById('closeScanner');
    var scannerManual = document.getElementById('scannerManual');
    var loadingOverlay = document.getElementById('loadingOverlay');

    var submitting = false;
    var loadingTimer = null;
    var scannerSession = 0;
    var quaggaPromise = null;
    var detectionBound = false;
    var detectedThisSession = false;
    var scannerTimer = null;

    /* ----------------------------------------------------------------------
       Preferencias (mismas claves de localStorage que la versión original)
       ---------------------------------------------------------------------- */

    function readStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }
	
	function writeStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (error) {
            /* Almacenamiento no disponible (modo privado): no es crítico. */
        }
    }
	
	function hasOption(select, value) {
        for (var i = 0; i < select.options.length; i += 1) {
            if (select.options[i].value === value) {
                return true;
            }
        }
        return false;
    }
	
	function restorePreferences() {
        var savedInstructor = readStorage(STORAGE_INSTRUCTOR);
        var savedVehiculo = readStorage(STORAGE_VEHICLE);
		if (savedInstructor && hasOption(instructor, savedInstructor)) {
            instructor.value = savedInstructor;
        }
        if (savedVehiculo && hasOption(vehiculo, savedVehiculo)) {
            vehiculo.value = savedVehiculo;
        }
    }
	
	function syncExternalCode() {
        var code = codigo.value.trim();
        codigoExterno.value = code.indexOf('500000') === 0 && code.length >= 12
            ? code.slice(6, 12)
            : '';
    }
	
	function validateCode(message) {
        var text = (message || '').trim();
        if (text) {
            errorText.textContent = text;
            errorBox.hidden = false;
        } else {
            errorText.textContent = '';
            errorBox.hidden = true;
        }
    }
	
	function isFormValid() {
        return instructor.value !== '' &&
            codigo.value.trim().indexOf('500000') === 0 &&
            Number(codigoExterno.value) >= MIN_EXTERNAL_CODE;
    }

	function setSubmitEnabled(enabled) {
        submitButton.disabled = !enabled || submitting;
    }
	
	function checkFormValidity(options) {
        var showErrors = !options || options.showErrors !== false;
        var code = codigo.value.trim();
        var external = codigoExterno.value;
        var valid = isFormValid();
		setSubmitEnabled(valid);
		  if (!showErrors) {
            return valid;
        }
		if (!instructor.value) {
            validateCode('Debe seleccionar un instructor');
        } else if (!code) {
            validateCode('Debe escanear un código o introducirlo manualmente');
        } else if (code.indexOf('500000') !== 0) {
            validateCode('El código introducido no es correcto, vuelva a intentarlo');
        } else if (code.length < 12) {
            validateCode('El código debe tener 12 dígitos. Vuelve a escanearlo o escríbelo de nuevo.');
        } else if (!external) {
            validateCode('Debe escanear un código o introducirlo manualmente');
        } else if (Number(external) < MIN_EXTERNAL_CODE) {
            validateCode('El ticket no es válido o está caducado. Revisa el código e inténtalo de nuevo.');
        } else {
            validateCode('');
        }
		return valid;
    }
	
	 /* ----------------------------------------------------------------------
       Entrada del código
       ---------------------------------------------------------------------- */

    function applyCode(rawValue) {
        var value = String(rawValue || '').replace(/\s+/g, '');
        codigo.value = value;
        syncExternalCode();
        checkFormValidity();

        if (value) {
            codigo.classList.add('has-value');
        } else {
            codigo.classList.remove('has-value');
        }
    }
	
	 function enableEditing() {
        codigo.readOnly = false;
        codigo.classList.add('is-editable');
        codeHint.textContent = 'Introduce los 12 dígitos del ticket';
        codigo.focus();
        var end = codigo.value.length;
        try {
            codigo.setSelectionRange(end, end);
        } catch (error) {
            /* Algunos navegadores no permiten seleccionar en ciertos inputs. */
        }
    }
	
	 /* ----------------------------------------------------------------------
       Envío: se conserva el GET nativo al script de Google, con los mismos
       nombres de campo (entry.*). Se bloquea un segundo envío.
       ---------------------------------------------------------------------- */

    function showLoading(isLoading) {
        if (!loadingOverlay) {
            return;
        }
        loadingOverlay.hidden = !isLoading;
        document.body.classList.toggle('is-loading', isLoading);
    }
	
	function setSubmittingUI(isLoading) {
        submitting = isLoading;
        submitButton.classList.toggle('is-loading', isLoading);
        submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
        submitLabel.textContent = isLoading ? 'Enviando…' : 'Enviar ticket';
        submitButton.disabled = isLoading || !isFormValid();
    }
	
	function resetSubmitState() {
        window.clearTimeout(loadingTimer);
        loadingTimer = null;
        showLoading(false);
        setSubmittingUI(false);
        checkFormValidity({ showErrors: false });
    }

    function submitTicket() {
        if (submitting) {
            return;
        }

        if (!checkFormValidity()) {
            if (!instructor.value) {
                instructor.focus();
            } else {
                codigo.focus();
            }
            return;
        }

        setSubmittingUI(true);

        /* El formulario conserva la misma URL, método y campos que antes. */
        form.action = APPS_SCRIPT_URL;
        form.method = 'GET';
        form.target = '_self';

        /* El aviso grande solo aparece si la navegación tarda: evita parpadeos. */
        window.clearTimeout(loadingTimer);
        loadingTimer = window.setTimeout(function () {
            if (submitting) {
                showLoading(true);
            }
        }, 350);

        window.requestAnimationFrame(function () {
            window.setTimeout(function () {
                try {
                    form.submit();
                } catch (error) {
                    resetSubmitState();
                    validateCode('No se pudo enviar el ticket. Inténtalo de nuevo.');
                }
            }, 0);
        });
    }

    /* ----------------------------------------------------------------------
       Escáner con QuaggaJS, cargado únicamente al abrir el lector
       ---------------------------------------------------------------------- */

    function setScannerStatus(message, isLoading) {
        scannerStatusText.textContent = message;
        scannerStatus.classList.toggle('is-loading', Boolean(isLoading));
    }

    function showScannerError(message) {
        scannerError.textContent = message || '';
        scannerError.hidden = !message;
        scannerStage.classList.toggle('has-error', Boolean(message));
    }

    function scannerErrorMessage(error) {
        var name = error && (error.name || error.code || '');

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            return 'Permiso de cámara denegado. Actívalo en el navegador o escribe el código manualmente.';
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            return 'No encontramos ninguna cámara en este dispositivo. Escribe el código manualmente.';
        }
        if (name === 'NotReadableError' || name === 'TrackStartError') {
            return 'La cámara está ocupada por otra aplicación. Ciérrala o escribe el código manualmente.';
        }
        return 'No se pudo iniciar la cámara. Revisa los permisos o escribe el código manualmente.';
    }

    function loadQuagga() {
        if (window.Quagga) {
            return Promise.resolve(window.Quagga);
        }
        if (quaggaPromise) {
            return quaggaPromise;
        }

        quaggaPromise = new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = QUAGGA_URL;
            script.async = true;
            script.onload = function () {
                if (window.Quagga) {
                    resolve(window.Quagga);
                } else {
                    quaggaPromise = null;
                    reject(new Error('Quagga no está disponible'));
                }
            };
            script.onerror = function () {
                quaggaPromise = null;
                reject(new Error('No se pudo cargar el lector'));
            };
            document.head.appendChild(script);
        });

        return quaggaPromise;
    }

    function clearScannerTimer() {
        if (scannerTimer) {
            window.clearTimeout(scannerTimer);
            scannerTimer = null;
        }
    }

    function stopScannerStream() {
        clearScannerTimer();
        if (window.Quagga) {
            try {
                window.Quagga.stop();
            } catch (error) {
                /* El lector puede no estar iniciado todavía. */
            }
        }
        if (scannerViewport) {
            scannerViewport.replaceChildren();
        }
    }

    function scannerFailed(error) {
        stopScannerStream();
        setScannerStatus('Escáner no disponible', false);
        showScannerError(scannerErrorMessage(error));
    }

    function handleDetected(result) {
        if (detectedThisSession) {
            return;
        }

        var raw = result && result.codeResult && result.codeResult.code;
        if (!raw) {
            return;
        }

        detectedThisSession = true;

        if (navigator.vibrate) {
            try {
                navigator.vibrate(60);
            } catch (error) {
                /* La vibración es opcional. */
            }
        }

        applyCode(raw);
        closeScanner();

        window.setTimeout(function () {
            if (!submitButton.disabled) {
                submitButton.focus({ preventScroll: true });
            } else {
                codigo.focus({ preventScroll: true });
            }
        }, 60);
    }

    function startScanner(session) {
        detectedThisSession = false;
        showScannerError('');
        setScannerStatus('Preparando la cámara…', true);

        clearScannerTimer();
        scannerTimer = window.setTimeout(function () {
            scannerTimer = null;
            if (session === scannerSession && scannerModal.open && scannerStatus.classList.contains('is-loading')) {
                scannerFailed(new Error('Tiempo de espera agotado'));
            }
        }, 15000);

        loadQuagga().then(function (Quagga) {
            if (session !== scannerSession || !scannerModal.open) {
                return;
            }

            if (!detectionBound) {
                Quagga.onDetected(handleDetected);
                detectionBound = true;
            }

            setScannerStatus('Iniciando la cámara…', true);

            Quagga.init({
                inputStream: {
                    name: 'Live',
                    type: 'LiveStream',
                    target: scannerViewport,
                    constraints: {
                        facingMode: 'environment'
                    }
                },
                locator: {
                    patchSize: 'medium',
                    halfSample: true
                },
                decoder: {
                    readers: ['ean_reader'],
                    multiple: false
                },
                locate: true,
                frequency: 10
            }, function (error) {
                clearScannerTimer();

                if (session !== scannerSession || !scannerModal.open) {
                    stopScannerStream();
                    return;
                }

                if (error) {
                    scannerFailed(error);
                    return;
                }

                try {
                    Quagga.start();
                    showScannerError('');
                    scannerStage.classList.remove('has-error');
                    setScannerStatus('Apunta al código de barras del ticket', false);
                } catch (startError) {
                    scannerFailed(startError);
                }
            });
        }).catch(function (error) {
            clearScannerTimer();
            if (session === scannerSession) {
                scannerFailed(error);
            }
        });
    }

    function openScanner() {
        if (scannerModal.open) {
            return;
        }

        scannerSession += 1;
        var session = scannerSession;

        showScannerError('');
        scannerStage.classList.remove('has-error');
        stopScannerStream();

        if (typeof scannerModal.showModal === 'function') {
            scannerModal.showModal();
        } else {
            scannerModal.setAttribute('open', '');
        }

        document.body.classList.add('modal-open');
        startScanner(session);
    }

    function resetScannerUI() {
        document.body.classList.remove('modal-open');
        scannerStage.classList.remove('has-error');
        showScannerError('');
        setScannerStatus('Apunta al código de barras del ticket', false);
    }

    function closeScanner() {
        if (!scannerModal.open) {
            document.body.classList.remove('modal-open');
            return;
        }

        scannerSession += 1;
        stopScannerStream();

        if (typeof scannerModal.close === 'function') {
            scannerModal.close();
        } else {
            scannerModal.removeAttribute('open');
        }

        /* No dependemos solo del evento «close»: algunos navegadores lo
           retrasan o no lo emiten al cerrar por código. */
        resetScannerUI();
    }

    /* ----------------------------------------------------------------------
       Arranque
       ---------------------------------------------------------------------- */

    /* La versión original limpia el código al cargar: evita reenviar el
       ticket que el navegador pudiera restaurar tras una recarga. */
    codigo.value = '';
    codigoExterno.value = '';
    restorePreferences();
    checkFormValidity({ showErrors: false });

    instructor.addEventListener('change', function () {
        writeStorage(STORAGE_INSTRUCTOR, instructor.value);
        checkFormValidity();
    });

    vehiculo.addEventListener('change', function () {
        writeStorage(STORAGE_VEHICLE, vehiculo.value);
    });

    codigo.addEventListener('input', function () {
        syncExternalCode();
        checkFormValidity();
    });

    codigo.addEventListener('blur', function () {
        syncExternalCode();
        checkFormValidity();
    });

    manualButton.addEventListener('click', enableEditing);

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitTicket();
    });

    window.addEventListener('pageshow', function (event) {
        if (event.persisted || submitting) {
            var wasSubmitting = submitting;

            /* Si se vuelve con «Atrás» después de enviar, se limpia el código
               para que no se pueda reenviar el mismo ticket por accidente. */
            if (wasSubmitting && event.persisted) {
                codigo.value = '';
                codigoExterno.value = '';
                codigo.classList.remove('has-value');
            }

            resetSubmitState();
        }
    });

    scanButton.addEventListener('click', openScanner);
    closeScannerButton.addEventListener('click', closeScanner);

    scannerManual.addEventListener('click', function () {
        closeScanner();
        window.setTimeout(enableEditing, 60);
    });

    scannerModal.addEventListener('click', function (event) {
        if (event.target === scannerModal) {
            closeScanner();
        }
    });

    scannerModal.addEventListener('cancel', function () {
        scannerSession += 1;
        stopScannerStream();
        resetScannerUI();
    });

    scannerModal.addEventListener('close', function () {
        scannerSession += 1;
        stopScannerStream();
        resetScannerUI();
    });

    /* Precarga el lector al acercarse al botón, no en la carga inicial. */
    function prefetchQuagga() {
        loadQuagga().catch(function () {
            /* Si falla, se reintenta al pulsar «Escanear». */
        });
    }

    scanButton.addEventListener('pointerenter', prefetchQuagga, { once: true });
    scanButton.addEventListener('focus', prefetchQuagga, { once: true });
    scanButton.addEventListener('touchstart', prefetchQuagga, { once: true, passive: true });

    /* Compatibilidad con posibles llamadas antiguas desde el HTML. */
    window.enableEditing = enableEditing;
    window.createExternalCode = syncExternalCode;
    window.validateCode = validateCode;
    window.showLoading = showLoading;
}());
