/* ==========================================================================
   Autoescuela Vivero · Vehículos e ITV
   Lee la hoja publicada en Google Sheets (CSV) y pinta la flota sin librerías.
   ========================================================================== */

(function () {
    'use strict';

    var SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRnLeY61SiuWTw_sDGC1Cw9EAlDR_7XhJK3FeW2IgzKY75WQbdz2miBvlxFaHOuxCEM04FN3ZZ8jezt/pub?gid=0&single=true&output=csv&range=A2:H250';
    var DAY_MS = 86400000;
    var REQUEST_TIMEOUT = 15000;

    var dateFormat = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    var monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' });
    var timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

    var search = document.getElementById('search');
    if (!search) {
        return;
    }

    var statusFilter = document.getElementById('statusFilter');
    var refreshButton = document.getElementById('refreshButton');
    var refreshLabel = document.getElementById('refreshLabel');
    var retryButton = document.getElementById('retryButton');
    var clearFilters = document.getElementById('clearFilters');
    var loadingState = document.getElementById('loadingState');
    var errorState = document.getElementById('errorState');
    var errorText = document.getElementById('errorText');
    var emptyState = document.getElementById('emptyState');
    var notice = document.getElementById('notice');
    var noticeText = document.getElementById('noticeText');
    var vehicleList = document.getElementById('vehicleList');
    var resultCount = document.getElementById('resultCount');
    var updatedAt = document.getElementById('updatedAt');
    var listPanel = document.getElementById('listado');

    var statTotal = document.getElementById('statTotal');
    var statService = document.getElementById('statService');
    var statExpired = document.getElementById('statExpired');
    var statSoon = document.getElementById('statSoon');
    var statTotalHint = document.getElementById('statTotalHint');
    var statServiceHint = document.getElementById('statServiceHint');
    var statExpiredHint = document.getElementById('statExpiredHint');
    var statSoonHint = document.getElementById('statSoonHint');

    var state = {
        vehicles: [],
        query: '',
        filter: 'all',
        loaded: false,
        loading: false
    };

    /* ----------------------------------------------------------------------
       Utilidades
       ---------------------------------------------------------------------- */

    function createNode(tag, className, text) {
        var element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (typeof text === 'string') {
            element.textContent = text;
        }
        return element;
    }

    function clean(value) {
        return value === null || value === undefined ? '' : String(value).trim();
    }

    function normalize(value) {
        return String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function plural(count, singular, pluralForm) {
        return count === 1 ? singular : pluralForm;
    }

    function replaceContent(element, content) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        if (content) {
            element.appendChild(content);
        }
    }

    function parseDate(value) {
        var match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(clean(value));
        if (!match) {
            return null;
        }

        var day = Number(match[1]);
        var month = Number(match[2]);
        var year = Number(match[3]);
        var date = new Date(year, month - 1, day);

        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return null;
        }

        return date;
    }

    function dayNumber(date) {
        return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
    }

    function daysUntil(date) {
        if (!date) {
            return null;
        }

        var today = new Date();
        return Math.round((dayNumber(date) - dayNumber(today)));
    }

    function formatDate(date) {
        return date ? dateFormat.format(date).replace('.', '') : 'Sin dato';
    }

    function formatMonthYear(date) {
        return date ? monthFormat.format(date).replace('.', '') : null;
    }

    function fullDate(date) {
        return date ? date.toLocaleDateString('es-ES') : '';
    }

    function itvInfo(vehicle) {
        var days = daysUntil(vehicle.itvDate);

        if (days === null) {
            return { key: 'none', label: 'Sin dato', days: null };
        }
        if (days < 0) {
            return { key: 'expired', label: 'Caducada', days: days };
        }
        if (days === 0) {
            return { key: 'soon', label: 'Caduca hoy', days: days };
        }
        if (days === 1) {
            return { key: 'soon', label: 'Mañana', days: days };
        }
        if (days <= 30) {
            return { key: 'soon', label: 'En ' + days + ' días', days: days };
        }
        if (days <= 90) {
            return { key: 'upcoming', label: 'En ' + days + ' días', days: days };
        }
        return { key: 'ok', label: 'Al día', days: days };
    }

    function stateInfo(vehicle) {
        if (!vehicle.state) {
            return { label: 'En servicio', className: 'badge--active' };
        }
        if (/baja/i.test(vehicle.state)) {
            return { label: 'Baja temporal', className: 'badge--off' };
        }
        return { label: vehicle.state, className: 'badge--off' };
    }

    function splitName(name) {
        var parts = String(name).split(/\s+-\s+/);
        var make = '';
        var model = name;

        if (parts.length > 1) {
            make = parts.shift();
            model = parts.join(' - ');
        }

        if (make && normalize(model).indexOf(normalize(make) + ' ') === 0) {
            model = model.slice(make.length + 1);
        }

        return { make: make, model: model };
    }

    function friendlyFuel(value) {
        var fuel = clean(value);
        if (fuel === 'GASOLINA') {
            return 'Gasolina';
        }
        if (fuel === 'DIESEL') {
            return 'Diésel';
        }
        if (fuel === 'GAS LICUADO DE PETROLEO') {
            return 'GLP';
        }
        if (!fuel || fuel === '---') {
            return 'Sin dato';
        }
        return fuel;
    }

    function friendlyInsurance(value) {
        var insurer = clean(value);
        if (!insurer || insurer === '---') {
            return 'Sin dato';
        }
        if (/^zurich/i.test(insurer)) {
            return 'Zurich';
        }
        if (/^occident/i.test(insurer)) {
            return 'Occident';
        }
        return insurer;
    }

    function badgeNode(value) {
        var badge = clean(value).toUpperCase();
        var isNone = !badge || badge === '---' || badge === 'SD';
        var badgeClass = 'env';

        if (badge === 'B') {
            badgeClass += ' env--b';
        } else if (badge === 'C') {
            badgeClass += ' env--c';
        } else if (badge === 'ECO') {
            badgeClass += ' env--eco';
        } else if (badge === '0') {
            badgeClass += ' env--zero';
        } else if (isNone) {
            badgeClass += ' env--none';
        }

        var element = createNode('span', badgeClass, isNone ? 'Sin distintivo' : badge);
        element.title = isNone ? 'Sin distintivo ambiental' : 'Distintivo ambiental ' + badge;
        return element;
    }

    /* ----------------------------------------------------------------------
       CSV de Google Sheets
       ---------------------------------------------------------------------- */

    function parseCsv(text) {
        var rows = [];
        var row = [];
        var field = '';
        var quoted = false;
        var source = String(text).replace(/^\uFEFF/, '');

        for (var i = 0; i < source.length; i += 1) {
            var character = source.charAt(i);

            if (quoted) {
                if (character === '"') {
                    if (source.charAt(i + 1) === '"') {
                        field += '"';
                        i += 1;
                    } else {
                        quoted = false;
                    }
                } else {
                    field += character;
                }
            } else if (character === '"') {
                quoted = true;
            } else if (character === ',') {
                row.push(field);
                field = '';
            } else if (character === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
            } else if (character === '\r') {
                if (source.charAt(i + 1) !== '\n') {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                }
            } else {
                field += character;
            }
        }

        if (field.length || row.length) {
            row.push(field);
            rows.push(row);
        }

        return rows;
    }

    function headerIndex(rows) {
        for (var i = 0; i < rows.length; i += 1) {
            var keys = rows[i].map(function (cell) { return normalize(cell); });
            if (keys.indexOf('vehiculo') !== -1 && keys.indexOf('matricula') !== -1) {
                return { row: i, keys: keys };
            }
        }
        return null;
    }

    function column(header, row, name) {
        var index = header.indexOf(name);
        return index === -1 ? '' : clean(row[index]);
    }

    function parseVehicles(text) {
        var rows = parseCsv(text);
        var found = headerIndex(rows);
        var vehicles = [];

        if (!found) {
            throw new Error('La hoja no tiene el formato esperado.');
        }

        for (var i = found.row + 1; i < rows.length; i += 1) {
            var row = rows[i];
            if (!row || !row.some(function (cell) { return clean(cell) !== ''; })) {
                continue;
            }

            var name = column(found.keys, row, 'vehiculo');
            if (!name) {
                continue;
            }

            var rawState = column(found.keys, row, 'estado');
            var insurance = column(found.keys, row, 'seguro');

            vehicles.push({
                name: name,
                plate: column(found.keys, row, 'matricula') || 'Sin matrícula',
                state: rawState,
                inService: !/baja/i.test(rawState),
                fuel: column(found.keys, row, 'combustible'),
                registration: column(found.keys, row, 'matriculacion'),
                badge: column(found.keys, row, 'distintivo'),
                insurance: insurance,
                itv: column(found.keys, row, 'fecha itv'),
                itvDate: parseDate(column(found.keys, row, 'fecha itv'))
            });
        }

        return vehicles;
    }

    /* ----------------------------------------------------------------------
       Estado de la interfaz
       ---------------------------------------------------------------------- */

    function setBusy(busy) {
        state.loading = busy;
        refreshButton.disabled = busy;
        refreshButton.classList.toggle('is-loading', busy);
        refreshLabel.textContent = busy ? 'Actualizando' : 'Actualizar';
        listPanel.setAttribute('aria-busy', busy ? 'true' : 'false');
    }

    function showNotice(message) {
        noticeText.textContent = message;
        notice.hidden = false;
    }

    function hideNotice() {
        notice.hidden = true;
    }

    function setStatsHint(text) {
        statTotalHint.textContent = text;
        statServiceHint.textContent = text;
        statExpiredHint.textContent = text;
        statSoonHint.textContent = text;
    }

    function showInitialLoading() {
        loadingState.hidden = false;
        errorState.hidden = true;
        emptyState.hidden = true;
        vehicleList.hidden = true;
        resultCount.textContent = 'Cargando vehículos…';
        setStatsHint('Cargando datos…');
    }

    function showError(message) {
        errorText.textContent = message;
        loadingState.hidden = true;
        errorState.hidden = false;
        emptyState.hidden = true;
        vehicleList.hidden = true;
        resultCount.textContent = 'No se pudieron cargar los vehículos';
        setStatsHint('No disponible');
    }

    function updateStats(vehicles) {
        var total = vehicles.length;
        var service = 0;
        var expired = 0;
        var soon = 0;
        var off = 0;

        vehicles.forEach(function (vehicle) {
            if (!vehicle.inService) {
                off += 1;
                return;
            }

            service += 1;
            var info = itvInfo(vehicle);
            if (info.key === 'expired') {
                expired += 1;
            } else if (info.key === 'soon') {
                soon += 1;
            }
        });

        statTotal.textContent = String(total);
        statService.textContent = String(service);
        statExpired.textContent = String(expired);
        statSoon.textContent = String(soon);

        statTotalHint.textContent = off
            ? off + ' en baja temporal'
            : 'Sin bajas temporales';
        statServiceHint.textContent = total
            ? Math.round((service / total) * 100) + ' % de la flota'
            : 'Sin vehículos';
        statExpiredHint.textContent = expired
            ? 'En servicio, sin ITV vigente'
            : 'Ninguna en servicio';

        if (soon) {
            var limit = new Date();
            limit.setDate(limit.getDate() + 30);
            statSoonHint.textContent = 'En servicio · antes del ' + formatDate(limit);
        } else {
            statSoonHint.textContent = 'Sin vencimientos próximos';
        }
    }

    function matchesQuery(vehicle) {
        if (!state.query) {
            return true;
        }

        var haystack = normalize([
            vehicle.name,
            vehicle.plate,
            vehicle.fuel,
            vehicle.insurance,
            vehicle.state
        ].join(' '));
        var query = normalize(state.query);
        var compactHaystack = haystack.replace(/\s+/g, '');
        var compactQuery = query.replace(/\s+/g, '');

        return haystack.indexOf(query) !== -1 || compactHaystack.indexOf(compactQuery) !== -1;
    }

    function matchesFilter(vehicle) {
        if (state.filter === 'all') {
            return true;
        }
        if (state.filter === 'off') {
            return !vehicle.inService;
        }
        if (!vehicle.inService) {
            return false;
        }

        var info = itvInfo(vehicle);
        if (state.filter === 'expired') {
            return info.key === 'expired';
        }
        if (state.filter === 'soon') {
            return info.key === 'soon';
        }
        if (state.filter === 'service') {
            return true;
        }
        return true;
    }

    function compareVehicles(a, b) {
        if (a.inService !== b.inService) {
            return a.inService ? -1 : 1;
        }

        var aDate = a.itvDate ? dayNumber(a.itvDate) : Infinity;
        var bDate = b.itvDate ? dayNumber(b.itvDate) : Infinity;
        if (aDate !== bDate) {
            return aDate - bDate;
        }

        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    }

    function buildSpec(label, valueNode, wide, title) {
        var item = createNode('div', wide ? 'specs__wide' : '');
        var term = createNode('dt', '', label);
        var detail = createNode('dd', '');
        detail.appendChild(valueNode);
        if (title) {
            detail.title = title;
        }
        item.appendChild(term);
        item.appendChild(detail);
        return item;
    }

    function buildVehicle(vehicle) {
        var item = createNode('li', 'vehicle');
        var head = createNode('div', 'vehicle__head');
        var identity = createNode('div', 'vehicle__id');

        var plate = createNode('span', 'plate');
        plate.title = 'Matrícula ' + vehicle.plate;
        var band = createNode('span', 'plate__band', 'E');
        band.setAttribute('aria-hidden', 'true');
        plate.appendChild(band);
        plate.appendChild(createNode('span', 'plate__number', vehicle.plate));

        var name = splitName(vehicle.name);
        var make = createNode('span', 'vehicle__make', name.make || 'Vehículo');
        var model = createNode('h3', 'vehicle__model', name.model || vehicle.name);

        identity.appendChild(plate);
        identity.appendChild(make);
        identity.appendChild(model);

        var currentState = stateInfo(vehicle);
        var stateBadge = createNode('span', 'badge ' + currentState.className, currentState.label);
        if (!vehicle.state) {
            stateBadge.title = 'La hoja no indica estado; se considera en servicio.';
        }

        head.appendChild(identity);
        head.appendChild(stateBadge);

        var info = itvInfo(vehicle);
        var itvBlock = createNode('div', 'vehicle__itv');
        itvBlock.setAttribute('data-tone', info.key);

        var itvCopy = createNode('div', '');
        itvCopy.appendChild(createNode('span', 'vehicle__itv-label', 'ITV'));
        var itvDate = createNode('span', 'vehicle__itv-date', formatDate(vehicle.itvDate));
        itvDate.title = vehicle.itvDate ? 'ITV: ' + fullDate(vehicle.itvDate) : 'Fecha de ITV no disponible';
        itvCopy.appendChild(itvDate);

        var itvChip = createNode('span', 'itv-chip itv-chip--' + info.key, info.label);
        if (info.key === 'expired') {
            itvChip.title = 'Caducó el ' + fullDate(vehicle.itvDate);
        } else if (info.key === 'soon' || info.key === 'upcoming') {
            itvChip.title = 'Vence el ' + fullDate(vehicle.itvDate);
        } else if (info.key === 'ok') {
            itvChip.title = 'ITV vigente hasta el ' + fullDate(vehicle.itvDate);
        } else {
            itvChip.title = 'Sin fecha de ITV';
        }

        itvBlock.appendChild(itvCopy);
        itvBlock.appendChild(itvChip);

        var specs = createNode('dl', 'specs');
        specs.appendChild(buildSpec('Combustible', document.createTextNode(friendlyFuel(vehicle.fuel)), false));
        specs.appendChild(buildSpec('Matriculación', document.createTextNode(formatMonthYear(parseDate(vehicle.registration)) || 'Sin dato'), false));
        specs.appendChild(buildSpec('Distintivo', badgeNode(vehicle.badge), false));
        specs.appendChild(buildSpec('Seguro', document.createTextNode(friendlyInsurance(vehicle.insurance)), true, vehicle.insurance));

        item.appendChild(head);
        item.appendChild(itvBlock);
        item.appendChild(specs);
        return item;
    }

    function renderResultCount(count, total) {
        var filtered = state.query !== '' || state.filter !== 'all';
        var text;

        if (!filtered) {
            text = total + ' ' + plural(total, 'vehículo', 'vehículos');
        } else {
            text = 'Mostrando ' + count + ' de ' + total + ' ' + plural(total, 'vehículo', 'vehículos');
        }

        resultCount.textContent = text;
    }

    function render() {
        if (!state.loaded) {
            return;
        }

        updateStats(state.vehicles);

        var filtered = state.vehicles.filter(function (vehicle) {
            return matchesQuery(vehicle) && matchesFilter(vehicle);
        }).sort(compareVehicles);

        renderResultCount(filtered.length, state.vehicles.length);

        if (!filtered.length) {
            vehicleList.hidden = true;
            replaceContent(vehicleList, null);
            emptyState.hidden = false;
            return;
        }

        var fragment = document.createDocumentFragment();
        filtered.forEach(function (vehicle) {
            fragment.appendChild(buildVehicle(vehicle));
        });

        replaceContent(vehicleList, fragment);
        vehicleList.hidden = false;
        emptyState.hidden = true;
    }

    function restoreInitialState() {
        search.value = '';
        statusFilter.value = 'all';
        state.query = '';
        state.filter = 'all';
        render();
        search.focus();
    }

    /* ----------------------------------------------------------------------
       Carga de datos
       ---------------------------------------------------------------------- */

    function loadVehicles() {
        if (state.loading) {
            return;
        }

        var hadData = state.vehicles.length > 0;
        var controller = new AbortController();
        var timeout = window.setTimeout(function () {
            controller.abort();
        }, REQUEST_TIMEOUT);

        hideNotice();
        setBusy(true);

        if (!hadData) {
            showInitialLoading();
        }

        fetch(SHEET_CSV_URL + '&_=' + Date.now(), {
            cache: 'no-store',
            headers: { Accept: 'text/csv' },
            signal: controller.signal
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.text();
        }).then(function (text) {
            var vehicles = parseVehicles(text);
            if (!vehicles.length) {
                throw new Error('La hoja no contiene vehículos.');
            }

            state.vehicles = vehicles;
            state.loaded = true;
            loadingState.hidden = true;
            errorState.hidden = true;
            updatedAt.textContent = 'Consultado a las ' + timeFormat.format(new Date());
            updatedAt.hidden = false;
            render();
        }).catch(function (error) {
            var timedOut = error && error.name === 'AbortError';
            var message = timedOut
                ? 'La consulta ha tardado demasiado. Inténtalo de nuevo.'
                : 'No se han podido cargar los datos de la flota.';

            if (hadData) {
                showNotice('No se pudo actualizar la flota. Se muestran los últimos datos disponibles.');
            } else {
                showError(message);
            }

            if (window.console && window.console.warn) {
                window.console.warn('[flota] No se pudo consultar la hoja:', error);
            }
        }).then(function () {
            window.clearTimeout(timeout);
            setBusy(false);
        });
    }

    /* ----------------------------------------------------------------------
       Eventos
       ---------------------------------------------------------------------- */

    search.addEventListener('input', function () {
        state.query = search.value.trim();
        render();
    });

    statusFilter.addEventListener('change', function () {
        state.filter = statusFilter.value;
        render();
    });

    refreshButton.addEventListener('click', loadVehicles);
    retryButton.addEventListener('click', loadVehicles);
    clearFilters.addEventListener('click', restoreInitialState);

    loadVehicles();
})();
