let additionalNearDistance = 5;

function toKey(coord) {
    return coord.map(num => num.toFixed(2)).join(',');
}

function calculateDistance(coord1, coord2) {
    const dx = Math.abs(coord1[0] - coord2[0]);
    const dy = Math.abs(coord1[1] - coord2[1]);
    const dz = Math.abs(coord1[2] - coord2[2]);
    return { dx, dy, dz };
}

function findNearGroups(coords, maxDistance) {
    const groups = [];
    const considered = new Set();

    for (let i = 0; i < coords.length; i++) {
        if (considered.has(i)) continue;

        const group = [coords[i]];
        considered.add(i);

        for (let j = i + 1; j < coords.length; j++) {
            if (considered.has(j)) continue;

            const { dx, dy, dz } = calculateDistance(coords[i], coords[j]);
            // استبعاد التكرارات التامة من التكرارات القريبة
            if (
                (dx === 0 && dy === 0 && dz < maxDistance && dz !== 0) ||
                (dx === 0 && dz === 0 && dy < maxDistance && dy !== 0) ||
                (dy === 0 && dz === 0 && dx < maxDistance && dx !== 0)
            ) {
                group.push(coords[j]);
                considered.add(j);
            }
        }

        if (group.length > 1) {
            groups.push(group);
        }
    }

    return groups;
}

function processData() {
    try {
        const coordsInput = document.getElementById('coordinatesInput').value.trim();
        let allCoordinates = [];
        const errors = [];

        if (document.getElementById('mergeOption').checked) {
            const jsonInput = document.getElementById('jsonInput').value.trim();
            if (jsonInput) {
                try {
                    const jsonData = JSON.parse(jsonInput);
                    jsonData.forEach(item => {
                        if (item.position && item.position.length === 3) {
                            allCoordinates.push(item.position.map(Number));
                        }
                    });
                } catch (e) {
                    errors.push("Invalid JSON format");
                }
            }
        }

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

        let resultCoords = [...allCoordinates];
        let exactDupes = 0;
        let nearDupes = 0;

        // إزالة التكرارات التامة إذا كان الخيار مفعلاً
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
                    case 'highestY':
                        return group.reduce((a, b) => a[1] > b[1] ? a : b);
                    case 'closestToAvg':
                        const avgY = group.reduce((sum, c) => sum + c[1], 0) / group.length;
                        return group.reduce((a, b) => 
                            Math.abs(a[1] - avgY) < Math.abs(b[1] - avgY) ? a : b
                        );
                    default:
                        return group[0];
                }
            });

            const remainingCoords = resultCoords.filter(coord => 
                !nearGroups.some(group => group.includes(coord))
            );

            resultCoords = [...selectedCoords, ...remainingCoords];
        }

        // تحديث النتائج
        document.getElementById('total-results').textContent = resultCoords.length;
        document.getElementById('exact-duplicates').textContent = exactDupes;
        document.getElementById('near-duplicates').textContent = nearDupes;

        const sortedOutput = resultCoords.map((position, index) => ({
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
