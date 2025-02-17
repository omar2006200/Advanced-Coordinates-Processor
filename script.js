let additionalNearDistance = 5;

// تحويل الإحداثيات إلى مفتاح نصي
const toKey = (coord) => coord.map(n => n.toFixed(2)).join(',');

// حساب المسافة الإقليدية بين إحداثيتين
const calculateEuclideanDistance = (c1, c2) => {
    const dx = c1[0] - c2[0];
    const dy = c1[1] - c2[1];
    const dz = c1[2] - c2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// البحث عن المجموعات القريبة (باستثناء التكرارات التامة)
const findNearGroups = (coords, maxDist) => {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < coords.length; i++) {
        if (processed.has(i)) continue;

        const group = [coords[i]];
        processed.add(i);

        for (let j = i + 1; j < coords.length; j++) {
            if (processed.has(j)) continue;

            const distance = calculateEuclideanDistance(coords[i], coords[j]);
            if (distance > 0 && distance <= maxDist) { 
                group.push(coords[j]);
                processed.add(j);
            }
        }

        if (group.length > 1) groups.push(group);
    }

    return groups;
};

// استخراج الإحداثيات من أي نص
const extractCoordinates = (text) => {
    const regex = /[-+]?\d*\.?\d+/g;
    const numbers = text.match(regex)?.map(Number) || [];
    const coords = [];

    for (let i = 0; i < numbers.length; i += 3) {
        const x = numbers[i];
        const y = numbers[i + 1];
        const z = numbers[i + 2] || 0; // افتراضيًا 0 إذا كانت الإحداثيات ثنائية الأبعاد
        if (!isNaN(x) && !isNaN(y)) {
            coords.push([x, y, z]);
        }
    }

    return coords;
};

// معالجة JSON Input
const parseJSONInput = (jsonInput) => {
    try {
        const coords = extractCoordinates(jsonInput);
        return coords.map((position, index) => ({
            name: `Point ${index + 1}`,
            description: "",
            position
        }));
    } catch (e) {
        throw new Error(`JSON Error: ${e.message}`);
    }
};

// تطبيق طريقة الاختيار على المجموعات القريبة
const applySelectionMethod = (group, method) => {
    switch (method) {
        case 'highestY':
            return group.reduce((a, b) => (a.position[1] > b.position[1] ? a : b));
        case 'closestToAvg':
            const avgY = group.reduce((sum, c) => sum + c.position[1], 0) / group.length;
            return group.reduce((a, b) => 
                Math.abs(a.position[1] - avgY) < Math.abs(b.position[1] - avgY) ? a : b
            );
        default:
            return group[0]; // First in Group
    }
};

// ترتيب النتائج حسب قرب الإحداثيات من بعضها البعض
const sortByProximity = (coords) => {
    if (coords.length === 0) return coords;

    const sortedCoords = [coords[0]];
    const remainingCoords = [...coords.slice(1)];

    while (remainingCoords.length > 0) {
        const lastCoord = sortedCoords[sortedCoords.length - 1];
        let closestIndex = 0;
        let closestDistance = calculateEuclideanDistance(lastCoord.position, remainingCoords[0].position);

        for (let i = 1; i < remainingCoords.length; i++) {
            const distance = calculateEuclideanDistance(lastCoord.position, remainingCoords[i].position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        }

        sortedCoords.push(remainingCoords[closestIndex]);
        remainingCoords.splice(closestIndex, 1);
    }

    return sortedCoords;
};

// المعالجة الرئيسية
const processData = () => {
    try {
        let allCoords = [];
        const errors = [];

        // معالجة JSON
        if (document.getElementById('mergeOption').checked) {
            const jsonInput = document.getElementById('jsonInput').value.trim();
            if (jsonInput) {
                try {
                    allCoords.push(...parseJSONInput(jsonInput));
                } catch (e) {
                    errors.push(`JSON Error: ${e.message}`);
                }
            }
        }

        // معالجة الإحداثيات النصية
        const textCoords = document.getElementById('coordinatesInput').value.trim();
        if (textCoords) {
            const coords = extractCoordinates(textCoords);
            allCoords.push(...coords.map((position, index) => ({
                name: `Point ${index + 1}`,
                description: "",
                position
            })));
        }

        if (errors.length > 0) {
            showError(errors.join('<br>'));
            return;
        }

        let resultCoords = [...allCoords];
        let exactCount = 0;
        let nearCount = 0;

        // إزالة التكرارات التامة (إذا مفعّل)
        if (document.getElementById('removeDuplicatesOption').checked) {
            const seen = new Set();
            resultCoords = resultCoords.filter(coord => {
                const key = toKey(coord.position);
                if (seen.has(key)) {
                    exactCount++;
                    return false;
                }
                seen.add(key);
                return true;
            });
        }

        // إزالة التكرارات القريبة (إذا مفعّل)
        if (document.getElementById('nearDuplicatesOption').checked) {
            const positions = resultCoords.map(c => c.position);
            const nearGroups = findNearGroups(positions, additionalNearDistance);
            nearCount = nearGroups.reduce((sum, g) => sum + g.length - 1, 0);

            const method = document.getElementById('selectionMethod').value;
            const selected = nearGroups.map(group => {
                const groupObjects = group.map(pos => 
                    resultCoords.find(c => toKey(c.position) === toKey(pos))
                );
                return applySelectionMethod(groupObjects, method);
            });

            resultCoords = [
                ...selected,
                ...resultCoords.filter(c => 
                    !nearGroups.some(g => g.some(pos => toKey(pos) === toKey(c.position))
                )
                )
            ];
        }

        // ترتيب النتائج حسب القرب
        resultCoords = sortByProximity(resultCoords);

        // تحديث النتائج مع إعادة ترقيم الأسماء
        document.getElementById('total-results').textContent = resultCoords.length;
        document.getElementById('exact-duplicates').textContent = exactCount;
        document.getElementById('near-duplicates').textContent = nearCount;
        document.getElementById('output').textContent = JSON.stringify(
            resultCoords.map((item, i) => ({
                checked: false,
                description: item.description,
                name: String(i), // إعادة الترقيم من 0
                position: item.position
            })), 
            null, 2
        );

    } catch (error) {
        showError(error.message);
    }
};

// الدوال المساعدة
const showError = (msg) => {
    const errDiv = document.getElementById('error-container');
    errDiv.innerHTML = msg;
    errDiv.classList.remove('hidden');
    setTimeout(() => errDiv.classList.add('hidden'), 5000);
};

const copyResults = () => {
    const output = document.getElementById('output').textContent;
    if (output) {
        navigator.clipboard.writeText(output)
            .then(() => alert('تم النسخ بنجاح!'))
            .catch(() => alert('فشل النسخ!'));
    }
};

const clearAll = () => {
    document.getElementById('coordinatesInput').value = '';
    document.getElementById('jsonInput').value = '';
    document.getElementById('output').textContent = '';
    document.getElementById('total-results').textContent = '0';
    document.getElementById('exact-duplicates').textContent = '0';
    document.getElementById('near-duplicates').textContent = '0';
    document.getElementById('nearDistanceInput').value = '5';
    additionalNearDistance = 5;
};

const saveResults = () => {
    const output = document.getElementById('output').textContent;
    const fileName = document.getElementById('fileName').value || 'result.txt';
    const blob = new Blob([output], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
};

// ربط الأحداث بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('processBtn').addEventListener('click', processData);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('copyBtn').addEventListener('click', copyResults);
    document.getElementById('saveBtn').addEventListener('click', saveResults);

    document.getElementById('nearDuplicatesOption').addEventListener('change', function() {
        document.getElementById('nearDistanceInput').disabled = !this.checked;
    });

    document.getElementById('nearDistanceInput').addEventListener('input', function() {
        additionalNearDistance = Math.max(0, Math.min(50, parseFloat(this.value) || 5));
    });
});
