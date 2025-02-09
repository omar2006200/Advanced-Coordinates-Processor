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

// البحث عن المجموعات القريبة
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
            if (distance <= maxDist) {
                group.push(coords[j]);
                processed.add(j);
            }
        }

        if (group.length > 1) groups.push(group);
    }

    return groups;
};

// معالجة JSON Input
const parseJSONInput = (jsonInput) => {
    try {
        // إصلاح الصيغة لتحويلها إلى مصفوفة JSON صالحة
        const fixedInput = jsonInput
            .replace(/\s*}\s*{\s*/g, '},{') // إصلاح الفواصل بين الكائنات
            .replace(/^\s*\[?\s*/, '[') // إضافة أقواس المصفوفة إذا لم تكن موجودة
            .replace(/\s*\]?\s*$/, ']');

        const jsonArray = JSON.parse(fixedInput);

        // استخراج الإحداثيات
        const coords = jsonArray
            .filter(item => item.position && item.position.length === 3)
            .map(item => item.position.map(Number));

        return coords;
    } catch (e) {
        throw new Error(`Invalid JSON format: ${e.message}`);
    }
};

// تطبيق طريقة الاختيار على المجموعات القريبة
const applySelectionMethod = (group, method) => {
    if (method === 'highestY') {
        return group.reduce((a, b) => (a[1] > b[1] ? a : b));
    } else if (method === 'closestToAvg') {
        const avgY = group.reduce((sum, c) => sum + c[1], 0) / group.length;
        return group.reduce((a, b) => 
            Math.abs(a[1] - avgY) < Math.abs(b[1] - avgY) ? a : b
        );
    } else {
        // First in Group
        return group[0];
    }
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
                    const jsonCoords = parseJSONInput(jsonInput);
                    allCoords.push(...jsonCoords);
                } catch (e) {
                    errors.push(`JSON Error: ${e.message}`);
                }
            }
        }

        // معالجة الإحداثيات النصية
        const textCoords = document.getElementById('coordinatesInput').value.trim();
        if (textCoords) {
            textCoords.split('\n').forEach((line, idx) => {
                const coords = line.split(',').map(Number).filter(n => !isNaN(n));
                if (coords.length === 3) allCoords.push(coords);
                else errors.push(`Line ${idx + 1}: Invalid format`);
            });
        }

        if (errors.length > 0) {
            showError(errors.join('<br>'));
            return;
        }

        let resultCoords = [...allCoords];
        let exactCount = 0;
        let nearCount = 0;

        // التكرارات التامة
        if (document.getElementById('removeDuplicatesOption').checked) {
            const seen = new Set();
            const duplicates = new Set();
            resultCoords = resultCoords.filter(coord => {
                const key = toKey(coord);
                if (seen.has(key)) {
                    duplicates.add(key);
                    exactCount++;
                    return false;
                }
                seen.add(key);
                return true;
            });
        } else {
            exactCount = 0;
        }

        // التكرارات القريبة
        if (document.getElementById('nearDuplicatesOption').checked) {
            const nearGroups = findNearGroups(resultCoords, additionalNearDistance);
            nearCount = nearGroups.reduce((sum, g) => sum + g.length - 1, 0);

            const method = document.getElementById('selectionMethod').value;
            const selected = nearGroups.map(group => applySelectionMethod(group, method));

            resultCoords = [...selected, ...resultCoords.filter(c => 
                !nearGroups.some(g => g.includes(c))
            )];
        } else {
            nearCount = 0;
        }

        // ترتيب النتائج حسب قرب الإحداثيات من بعضها البعض
        resultCoords.sort((a, b) => {
            const distanceA = calculateEuclideanDistance(a, [0, 0, 0]); // المسافة من نقطة الأصل
            const distanceB = calculateEuclideanDistance(b, [0, 0, 0]);
            return distanceA - distanceB;
        });

        // تحديث النتائج
        document.getElementById('total-results').textContent = resultCoords.length;
        document.getElementById('exact-duplicates').textContent = exactCount;
        document.getElementById('near-duplicates').textContent = nearCount;
        document.getElementById('output').textContent = JSON.stringify(
            resultCoords.map((pos, i) => ({ 
                checked: false,
                description: "",
                name: String(i),
                position: pos 
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
            .then(() => alert('Copied!'))
            .catch(() => alert('Failed to copy!'));
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

// الأحداث
document.getElementById('nearDuplicatesOption').addEventListener('change', function() {
    document.getElementById('nearDistanceInput').disabled = !this.checked;
});

document.getElementById('nearDistanceInput').addEventListener('input', function() {
    additionalNearDistance = Math.max(0, Math.min(50, parseFloat(this.value) || 5));
});
