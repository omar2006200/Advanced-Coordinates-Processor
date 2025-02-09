let additionalNearDistance = 5;

// تحويل الإحداثيات إلى مفتاح نصي
function toKey(coord) {
    return coord.map(num => num.toFixed(2)).join(',');
}

// حساب المسافة الإقليدية
function calculateEuclideanDistance(coord1, coord2) {
    return Math.sqrt(
        Math.pow(coord1[0] - coord2[0], 2) +
        Math.pow(coord1[1] - coord2[1], 2) +
        Math.pow(coord1[2] - coord2[2], 2)
    );
}

// ترتيب الإحداثيات حسب القرب
function sortByProximity(coords) {
    if (coords.length === 0) return coords;
    const reference = coords[0];
    return [...coords].sort((a, b) => 
        calculateEuclideanDistance(a, reference) - calculateEuclideanDistance(b, reference)
    );
}

// البحث عن التكرارات القريبة
function findNearGroups(coords, maxDistance) {
    const groups = [];
    const considered = new Set();

    for (let i = 0; i < coords.length; i++) {
        if (considered.has(i)) continue;

        const group = [coords[i]];
        considered.add(i);

        for (let j = i + 1; j < coords.length; j++) {
            if (considered.has(j)) continue;

            const dx = Math.abs(coords[i][0] - coords[j][0]);
            const dy = Math.abs(coords[i][1] - coords[j][1]);
            const dz = Math.abs(coords[i][2] - coords[j][2]);

            if ((dx === 0 && dy === 0 && dz < maxDistance) ||
                (dx === 0 && dz === 0 && dy < maxDistance) ||
                (dy === 0 && dz === 0 && dx < maxDistance)) {
                group.push(coords[j]);
                considered.add(j);
            }
        }

        if (group.length > 1) groups.push(group);
    }

    return groups;
}

function processData() {
    try {
        let allCoordinates = [];
        const errors = [];

        // معالجة JSON
        if (document.getElementById('mergeOption').checked) {
            const jsonInput = document.getElementById('jsonInput').value.trim();
            if (jsonInput) {
                try {
                    JSON.parse(jsonInput).forEach(item => {
                        if (item.position?.length === 3) {
                            allCoordinates.push(item.position.map(Number));
                        }
                    });
                } catch (e) {
                    errors.push("Invalid JSON format");
                }
            }
        }

        // معالجة الإحداثيات النصية
        const coordsInput = document.getElementById('coordinatesInput').value.trim();
        if (coordsInput) {
            coordsInput.split('\n').forEach((line, index) => {
                const coords = line.split(',').map(Number).filter(n => !isNaN(n));
                if (coords.length === 3) allCoordinates.push(coords);
                else errors.push(`Line ${index + 1}: Invalid coordinates`);
            });
        }

        if (errors.length > 0) {
            showError(errors.join('<br>'));
            return;
        }

        let resultCoords = [...allCoordinates];
        let exactDupes = 0, nearDupes = 0;

        // إزالة التكرارات التامة
        if (document.getElementById('removeDuplicatesOption').checked) {
            const exactSet = new Set();
            resultCoords = resultCoords.filter(coord => {
                const key = toKey(coord);
                if (exactSet.has(key)) {
                    exactDupes++;
                    return false;
                }
                exactSet.add(key);
                return true;
            });
        }

        // إزالة التكرارات القريبة
        if (document.getElementById('nearDuplicatesOption').checked) {
            const nearGroups = findNearGroups(resultCoords, additionalNearDistance);
            nearDupes = nearGroups.reduce((sum, group) => sum + (group.length - 1), 0);

            const selectionMethod = document.getElementById('selectionMethod').value;
            const selectedCoords = nearGroups.map(group => {
                switch (selectionMethod) {
                    case 'highestY': return group.reduce((a, b) => a[1] > b[1] ? a : b);
                    case 'closestToAvg': 
                        const avgY = group.reduce((sum, c) => sum + c[1], 0) / group.length;
                        return group.reduce((a, b) => Math.abs(a[1] - avgY) < Math.abs(b[1] - avgY) ? a : b);
                    default: return group[0];
                }
            });

            resultCoords = [...selectedCoords, ...resultCoords.filter(c => 
                !nearGroups.some(g => g.includes(c))
            )];
        }

        // ترتيب النتائج وتحديث الواجهة
        resultCoords = sortByProximity(resultCoords);
        document.getElementById('output').textContent = JSON.stringify(
            resultCoords.map((pos, i) => ({ 
                checked: false, 
                description: "", 
                name: String(i), 
                position: pos 
            })), 
            null, 2
        );

        document.getElementById('total-results').textContent = resultCoords.length;
        document.getElementById('exact-duplicates').textContent = exactDupes;
        document.getElementById('near-duplicates').textContent = nearDupes;

    } catch (error) {
        showError(error.message);
    }
}

function copyResults() {
    const output = document.getElementById('output').textContent;
    if (output) {
        navigator.clipboard.writeText(output)
            .then(() => alert('Copied to clipboard!'))
            .catch(() => alert('Copy failed!'));
    } else {
        alert('No results to copy!');
    }
}

function clearAll() {
    document.getElementById('coordinatesInput').value = '';
    document.getElementById('jsonInput').value = '';
    document.getElementById('output').textContent = '';
    document.getElementById('total-results').textContent = '0';
    document.getElementById('exact-duplicates').textContent = '0';
    document.getElementById('near-duplicates').textContent = '0';
    document.getElementById('nearDistanceInput').value = '5';
    additionalNearDistance = 5;
}

function saveResults() {
    const output = document.getElementById('output').textContent;
    const fileName = document.getElementById('fileName').value || 'result.txt';
    const blob = new Blob([output], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = message;
    errorContainer.classList.remove('hidden');
    setTimeout(() => errorContainer.classList.add('hidden'), 5000);
}

// الأحداث الجانبية
document.getElementById('nearDuplicatesOption').addEventListener('change', function() {
    document.getElementById('nearDistanceInput').disabled = !this.checked;
});

document.getElementById('nearDistanceInput').addEventListener('input', function() {
    additionalNearDistance = parseFloat(this.value) || 5;
});
