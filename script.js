let maxNearDistance = 5;

function updateMaxNearDistance() {
    maxNearDistance = parseInt(document.getElementById('nearDistanceInput').value, 10);
}

function clearAll() {
    document.getElementById('coordinatesInput').value = '';
    document.getElementById('jsonInput').value = '';
    document.getElementById('output').textContent = '';
    document.getElementById('total-results').textContent = '0';
    document.getElementById('exact-duplicates').textContent = '0';
    document.getElementById('near-duplicates').textContent = '0';
    document.getElementById('error-container').classList.add('hidden');
}

function calculateDistance(coord1, coord2) {
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    const dz = coord1[2] - coord2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function processData() {
    document.querySelector('.progress-container').classList.remove('hidden');

    try {
        const coordsInput = document.getElementById('coordinatesInput').value.trim();
        const jsonInput = document.getElementById('jsonInput').value.trim();
        let allCoordinates = [];
        const errors = [];

        if (coordsInput) {
            const lines = coordsInput.split('\n').filter(line => line.trim() !== '');
            lines.forEach((line, index) => {
                const coords = line.split(',').map(Number).filter(n => !isNaN(n));
                if (coords.length === 3) {
                    allCoordinates.push({
                        position: coords,
                        checked: false,
                        description: ""
                    });
                } else {
                    errors.push(`Line ${index + 1}: Invalid coordinates`);
                }
            });
        }

        if (jsonInput) {
            const jsonEntries = jsonInput.split(/\}\s*\{/).map(entry => {
                if (!entry.startsWith('{')) entry = '{' + entry;
                if (!entry.endsWith('}')) entry = entry + '}';
                return entry;
            });

            jsonEntries.forEach((entry, index) => {
                try {
                    const json = JSON.parse(entry);
                    if (json.position && Array.isArray(json.position) && json.position.length === 3) {
                        allCoordinates.push(json);
                    } else {
                        errors.push(`Entry ${index + 1}: Invalid JSON structure`);
                    }
                } catch {
                    errors.push(`Entry ${index + 1}: Invalid JSON format`);
                }
            });
        }

        if (errors.length > 0) {
            showError(errors.join('<br>'));
            return;
        }

        let finalUniqueCoords = [];
        let exactDupes = 0;
        let nearDupes = 0;
        const coordMap = new Map();
        const nearMap = new Map();

        allCoordinates.forEach((coord, index) => {
            const key = coord.position.join(',');
            if (!coordMap.has(key)) {
                let isNearDuplicate = false;
                for (let i = index + 1; i < allCoordinates.length; i++) {
                    const otherCoord = allCoordinates[i];
                    const distance = calculateDistance(coord.position, otherCoord.position);
                    if (distance < maxNearDistance) {
                        isNearDuplicate = true;
                        nearMap.set(otherCoord.position.join(','), true);
                        break;
                    }
                }
                if (!isNearDuplicate && !nearMap.has(key)) {
                    coordMap.set(key, true);
                    finalUniqueCoords.push(coord);
                } else {
                    nearDupes++;
                }
            } else {
                exactDupes++;
            }
        });

        nearDupes = Math.ceil(nearDupes / 2); // لأننا نضيف واحدة من القريبات في النتيجة

        document.getElementById('total-results').textContent = finalUniqueCoords.length;
        document.getElementById('exact-duplicates').textContent = exactDupes;
        document.getElementById('near-duplicates').textContent = nearDupes;

        document.getElementById('output').textContent = JSON.stringify(finalUniqueCoords, null, 2);

    } catch (error) {
        showError(error.message);
    } finally {
        document.querySelector('.progress-container').classList.add('hidden');
    }
}

function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = message;
    errorContainer.classList.remove('hidden');
    setTimeout(() => errorContainer.classList.add('hidden'), 5000);
}

function copyResults() {
    const output = document.getElementById('output').textContent;
    navigator.clipboard.writeText(output)
        .then(() => alert('Results copied!'))
        .catch(err => console.error('Failed to copy text: ', err));
}

function saveResults() {
    const output = document.getElementById('output').textContent;
    const fileName = document.getElementById('fileName').value || 'result.txt';
    const blob = new Blob([output], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}
