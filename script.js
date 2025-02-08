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

        // معالجة إحداثيات الإدخال
        if (coordsInput) {
            const lines = coordsInput.split('\n').filter(line => line.trim() !== '');
            lines.forEach((line, index) => {
                const coords = line.split(',').map(Number).filter(n => !isNaN(n));
                if (coords.length === 3) {
                    allCoordinates.push({
                        position: coords,
                        checked: false,
                        description: "",
                        duplicateType: "unique" // إفتراضيًا غير مكرر
                    });
                } else {
                    errors.push(`Line ${index + 1}: Invalid coordinates`);
                }
            });
        }

        // معالجة JSON
        if (jsonInput) {
            // تحسين معالجة JSON ليقبل أكواد بدون فواصل
            const jsonEntries = jsonInput.split(/\}\s*\{/).map(entry => {
                if (!entry.startsWith('{')) entry = '{' + entry;
                if (!entry.endsWith('}')) entry = entry + '}';
                return entry;
            });

            jsonEntries.forEach((entry, index) => {
                try {
                    const json = JSON.parse(entry);
                    if (json.position && Array.isArray(json.position) && json.position.length === 3) {
                        allCoordinates.push({
                            ...json,
                            duplicateType: "unique" // إفتراضيًا غير مكرر
                        });
                    } else {
                        errors.push(`Entry ${index + 1}: Invalid JSON structure`);
                    }
                } catch (error) {
                    errors.push(`Entry ${index + 1}: Invalid JSON format - ${error.message}`);
                }
            });
        }

        // عرض الأخطاء إذا وجدت
        if (errors.length > 0) {
            showError(errors.join('<br>'));
            return;
        }

        // تحديد المتطابقات والمكررات
        const finalCoords = [];
        let exactDupes = 0;
        let nearDupes = 0;

        allCoordinates.forEach((coord, index) => {
            let isExactDuplicate = false;
            let isNearDuplicate = false;

            for (let i = 0; i < allCoordinates.length; i++) {
                if (i !== index) {
                    const otherCoord = allCoordinates[i];
                    const distance = calculateDistance(coord.position, otherCoord.position);

                    // تحديد التطابق التام
                    if (distance === 0) {
                        isExactDuplicate = true;
                    }

                    // تحديد التطابق القريب
                    if (distance > 0 && distance < maxNearDistance) {
                        isNearDuplicate = true;
                    }
                }
            }

            // تحديث نوع التكرار
            if (isExactDuplicate) {
                coord.duplicateType = "exact";
                exactDupes++;
            } else if (isNearDuplicate) {
                coord.duplicateType = "near";
                nearDupes++;
            }

            finalCoords.push(coord);
        });

        // تحديث النتائج
        document.getElementById('total-results').textContent = finalCoords.length;
        document.getElementById('exact-duplicates').textContent = exactDupes;
        document.getElementById('near-duplicates').textContent = nearDupes;

        // إعداد الناتج النهائي
        const sortedOutput = finalCoords.map((coord, index) => ({
            ...coord,
            name: String(index)
        }));

        document.getElementById('output').textContent = JSON.stringify(sortedOutput, null, 2);

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
