// コースの作成・編集

const courses = []; // [{ id, name, points: [{ pointId }] }]
let currentIndex = -1;
let nextId = 1;

// ========================================
// 初期化
// ========================================
export function setupCourseEditor() {
    document.getElementById('courseAddBtn').addEventListener('click', addCourse);
    document.getElementById('courseDeleteBtn').addEventListener('click', deleteCourse);
    document.getElementById('courseSelect').addEventListener('change', onSelectChange);
    document.getElementById('courseName').addEventListener('input', onNameInput);
    document.getElementById('pointAddBtn').addEventListener('click', addPointRow);
    renderSelect();
}

// ========================================
// コース操作
// ========================================
function addCourse() {
    const name = document.getElementById('courseName').value.trim();
    if (!name) return;
    courses.push({ id: nextId++, name, points: [] });
    currentIndex = courses.length - 1;
    renderSelect();
    renderPointList();
}

function deleteCourse() {
    if (currentIndex < 0 || currentIndex >= courses.length) return;
    courses.splice(currentIndex, 1);
    currentIndex = courses.length > 0 ? Math.min(currentIndex, courses.length - 1) : -1;
    renderSelect();
    renderPointList();
}

function onSelectChange() {
    const val = parseInt(document.getElementById('courseSelect').value, 10);
    currentIndex = isNaN(val) ? -1 : val;
    document.getElementById('courseName').value =
        currentIndex >= 0 ? courses[currentIndex].name : '';
    renderPointList();
}

function onNameInput() {
    if (currentIndex < 0 || currentIndex >= courses.length) return;
    courses[currentIndex].name = document.getElementById('courseName').value;
    const opt = document.getElementById('courseSelect').options[currentIndex];
    if (opt) opt.textContent = courses[currentIndex].name;
}

// ========================================
// コース選択リスト描画
// ========================================
function renderSelect() {
    const sel = document.getElementById('courseSelect');
    sel.innerHTML = '';
    if (courses.length === 0) {
        const opt = document.createElement('option');
        opt.value = -1;
        opt.textContent = '（コースなし）';
        sel.appendChild(opt);
        currentIndex = -1;
        document.getElementById('courseName').value = '';
    } else {
        courses.forEach((c, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = c.name;
            sel.appendChild(opt);
        });
        sel.value = currentIndex;
        document.getElementById('courseName').value = courses[currentIndex]?.name || '';
    }
}

// ========================================
// ポイントリスト操作
// ========================================
function addPointRow() {
    if (currentIndex < 0) return;
    courses[currentIndex].points.push({ pointId: '' });
    renderPointList();
}

function insertPointRow(index) {
    if (currentIndex < 0) return;
    courses[currentIndex].points.splice(index, 0, { pointId: '' });
    renderPointList();
}

function deletePointRow(index) {
    if (currentIndex < 0) return;
    courses[currentIndex].points.splice(index, 1);
    renderPointList();
}

// ========================================
// ポイントリスト描画
// ========================================
function renderPointList() {
    const container = document.getElementById('pointListContainer');
    container.innerHTML = '';
    if (currentIndex < 0 || currentIndex >= courses.length) return;
    courses[currentIndex].points.forEach((p, i) => {
        container.appendChild(createRow(i, p.pointId));
    });
}

function createRow(index, pointId) {
    const row = document.createElement('div');
    row.className = 'point-row';

    const noCell = document.createElement('span');
    noCell.className = 'point-no';
    noCell.textContent = index + 1;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'point-id-input';
    input.value = pointId || '';
    input.addEventListener('change', () => {
        courses[currentIndex].points[index].pointId = input.value;
    });

    const insertBtn = document.createElement('button');
    insertBtn.className = 'point-act-btn';
    insertBtn.title = 'この行の前に挿入';
    insertBtn.textContent = '挿';
    insertBtn.addEventListener('click', () => insertPointRow(index));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'point-act-btn';
    deleteBtn.title = '削除';
    deleteBtn.textContent = '削';
    deleteBtn.addEventListener('click', () => deletePointRow(index));

    row.appendChild(noCell);
    row.appendChild(input);
    row.appendChild(insertBtn);
    row.appendChild(deleteBtn);
    return row;
}
