let additionalNearDistance = 5;

function updateMaxNearDistance() {
    additionalNearDistance = parseFloat(document.getElementById('nearDistanceInput').value);
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
    const dx = Math.abs(coord1[0] - coord2[0]);
    const dy = Math.abs(coord1[1] - coord2[1]);
    const dz = Math.abs(coord1[2] - coord2[2]);
    return { dx, dy, dz };
}

function processData() {
    try {
        const coordsInput = document.getElementById('coordinatesInput').value.trim();
        let allCoordinates = [];
        const errors = [];

        if (coordsInput) {
            const lines = coordsInput.split('\n').filter(line => line.trim() !== '');
            lines.forEach((line, index) => {
                const coords = line.split(',').map(Number).filter(n => !isNaN(n));
                if (coords.length === 3) {
                    allCoordinates.push(coords);
                } else {
                    errors.push(`Line ${index + 1}: Invalid coordinates`);
                }
            });
        }

        if (errors.length > 0) {
            showError(errors.join('<br>'));
            return;
        }

        const exactSet = new Set();
        const nearGroups = [];
        const resultCoords = [];
        let exactDupes = 0;
        let nearDupes = 0;

        // إزالة التكرارات التامة
        allCoordinates.forEach(coord => {
            const key = coord.join(',');
            if (exactSet.has(key)) {
                exactDupes++;
            } else {
                exactSet.add(key);
                resultCoords.push(coord);
            }
        });

        const consideredCoords = new Set();

        // البحث عن التكرارات القريبة
        resultCoords.forEach((coord, idx) => {
            if (consideredCoords.has(idx)) return;

            let nearGroup = [coord];

            for (let i = idx + 1; i < resultCoords.length; i++) {
                if (!consideredCoords.has(i)) {
                    const otherCoord = resultCoords[i];
                    const { dx, dy, dz } = calculateDistance(coord, otherCoord);

                    if (
                        (dx === 0 && dy === 0 && dz < additionalNearDistance) ||
                        (dx === 0 && dz === 0 && dy < additionalNearDistance) ||
                        (dy === 0 && dz === 0 && dx < additionalNearDistance)
                    ) {
                        nearGroup.push(otherCoord);
                        consideredCoords.add(i);
                    }
                }
            }

            if (nearGroup.length > 1) {
                nearGroups.push(nearGroup);
                nearDupes += nearGroup.length - 1; // حساب عدد التكرارات القريبة
            }
        });

        // جمع النتائج النهائية
        const displayResults = resultCoords.filter((_, idx) => !consideredCoords.has(idx));

        document.getElementById('total-results').textContent = displayResults.length;
        document.getElementById('exact-duplicates').textContent = exactDupes;
        document.getElementById('near-duplicates').textContent = nearDupes;

        const sortedOutput = displayResults.map((position, index) => ({
            checked: false,
            description: "",
            name: String(index),
            position
        }));

        document.getElementById('output').textContent = JSON.stringify(sortedOutput, null, 2);

    } catch (error) {
        showError(error.message);
    }
}

// بقية الدوال بدون تغيير (showError, copyResults, saveResults)
