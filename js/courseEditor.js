// コースの作成・編集

export function isEditingMode() { return editingMode; }

// courses[i] = { id, name, points: [{ pointId, name }], fixed: bool }
const courses = [];
let currentIndex = -1;
let nextId = 1;
let editingMode = false;
let nameAreaMode = null; // 'new' | 'rename' | null
let _map = null;

// ========================================
// 初期化
// ========================================
export function setupCourseEditor(map) {
    _map = map;

    document.getElementById('courseNewBtn').addEventListener('click', openNewMode);
    document.getElementById('courseRenameBtn').addEventListener('click', openRenameMode);
    document.getElementById('courseDeleteBtn').addEventListener('click', deleteCourse);
    document.getElementById('courseSelect').addEventListener('change', onSelectChange);
    document.getElementById('courseConfirmBtn').addEventListener('click', confirmName);
    document.getElementById('courseCancelBtn').addEventListener('click', closeNameArea);
    document.getElementById('courseName').addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmName();
        if (e.key === 'Escape') closeNameArea();
    });
    document.getElementById('editStartBtn').addEventListener('click', startEditing);
    document.getElementById('fixBtn').addEventListener('click', fixCourse);

    document.addEventListener('gpsPointClicked', onGpsPointClicked);

    renderSelect();
    updateButtons();
}

// ========================================
// 名称入力エリア
// ========================================
function openNewMode() {
    nameAreaMode = 'new';
    document.getElementById('courseName').value = '';
    document.getElementById('courseNameArea').style.display = 'block';
    document.getElementById('courseName').focus();
}

function openRenameMode() {
    if (currentIndex < 0) return;
    nameAreaMode = 'rename';
    document.getElementById('courseName').value = courses[currentIndex].name;
    document.getElementById('courseNameArea').style.display = 'block';
    document.getElementById('courseName').focus();
}

function closeNameArea() {
    nameAreaMode = null;
    document.getElementById('courseNameArea').style.display = 'none';
    document.getElementById('courseName').value = '';
}

function confirmName() {
    const name = document.getElementById('courseName').value.trim();
    if (!name) return;

    if (nameAreaMode === 'new') {
        courses.push({ id: nextId++, name, points: [], fixed: false });
        currentIndex = courses.length - 1;
        renderSelect();
        renderPointList();
    } else if (nameAreaMode === 'rename' && currentIndex >= 0) {
        courses[currentIndex].name = name;
        const opt = document.getElementById('courseSelect').options[currentIndex];
        if (opt) opt.textContent = name;
    }

    closeNameArea();
    updateButtons();
}

// ========================================
// コース操作
// ========================================
function deleteCourse() {
    if (currentIndex < 0 || currentIndex >= courses.length) return;
    if (editingMode) exitEditingMode();
    closeNameArea();
    courses.splice(currentIndex, 1);
    currentIndex = courses.length > 0 ? Math.min(currentIndex, courses.length - 1) : -1;
    renderSelect();
    renderPointList();
    updateButtons();
}

function onSelectChange() {
    if (editingMode) exitEditingMode();
    closeNameArea();
    const val = parseInt(document.getElementById('courseSelect').value, 10);
    currentIndex = isNaN(val) ? -1 : val;
    renderPointList();
    updateButtons();
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
    } else {
        courses.forEach((c, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = c.name;
            sel.appendChild(opt);
        });
        sel.value = currentIndex;
    }
}

// ========================================
// 編集モード
// ========================================
function startEditing() {
    if (currentIndex < 0) return;
    courses[currentIndex].points = [];
    courses[currentIndex].fixed = false;
    editingMode = true;
    if (_map) _map.getContainer().style.cursor = 'crosshair';
    renderPointList();
    updateButtons();
}

function fixCourse() {
    if (currentIndex < 0) return;
    courses[currentIndex].fixed = true;
    exitEditingMode();
    renderPointList();
}

function exitEditingMode() {
    editingMode = false;
    if (_map) _map.getContainer().style.cursor = '';
    updateButtons();
}

function onGpsPointClicked(e) {
    if (!editingMode || currentIndex < 0) return;
    const { pointId, name } = e.detail;
    courses[currentIndex].points.push({ pointId, name });
    renderPointList();
}

// ========================================
// ボタン有効/無効
// ========================================
function updateButtons() {
    const hasCourse = currentIndex >= 0 && currentIndex < courses.length;
    document.getElementById('courseRenameBtn').disabled = !hasCourse;
    document.getElementById('courseDeleteBtn').disabled = !hasCourse;
    document.getElementById('editStartBtn').disabled = !hasCourse || editingMode;
    document.getElementById('fixBtn').disabled = !editingMode;
}

// ========================================
// ポイントリスト描画
// ========================================
function getNoLabel(index, total, fixed) {
    if (index === 0) return '開始';
    if (fixed && index === total - 1) return '終了';
    return `中間${index}`;
}

function renderPointList() {
    const container = document.getElementById('pointListContainer');
    container.innerHTML = '';
    if (currentIndex < 0 || currentIndex >= courses.length) return;

    const { points, fixed } = courses[currentIndex];
    const total = points.length;

    points.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'point-row';

        const noCell = document.createElement('span');
        noCell.className = 'point-no';
        noCell.textContent = getNoLabel(i, total, fixed);

        const idCell = document.createElement('span');
        idCell.className = 'point-id-cell';
        idCell.textContent = p.pointId;

        const nameCell = document.createElement('span');
        nameCell.className = 'point-name-cell';
        nameCell.textContent = p.name;

        row.appendChild(noCell);
        row.appendChild(idCell);
        row.appendChild(nameCell);
        container.appendChild(row);
    });
}
