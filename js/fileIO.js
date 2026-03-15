// ファイル入出力機能

import { DEFAULTS } from './constants.js';
import { showMessage } from './message.js';
import { loadExcelFile } from './excelLoader.js';

/**
 * ポイントGPS(Excel)の読み込みを設定
 */
export function setupExcelInput(dataLayer) {
    document.getElementById('excelInput').addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const points = await loadExcelFile(file);

            if (!points || points.length === 0) {
                showMessage('有効なポイントデータが見つかりませんでした', 'warning');
                return;
            }

            points.forEach(p => {
                const marker = L.circleMarker([p.lat, p.lng], DEFAULTS.GPS_POINT_STYLE);
                const popup = `${p.pointId}<br>${p.name}`;
                marker.bindPopup(popup);
                dataLayer.addLayer(marker);
            });

            showMessage(`${points.length}件のポイントGPSを読み込みました`);
        } catch (error) {
            showMessage(`読み込みエラー: ${error.message}`, 'error');
        } finally {
            this.value = '';
        }
    });
}

/**
 * フィーチャーの種別を判定する
 * ポイント: type='point' または type='ポイントGPS' のPoint
 * ルート: LineString
 * スポット: type='spot' のPoint
 */
function classifyFeature(f) {
    if (!f.geometry) return null;
    const geomType = f.geometry.type;
    const type = f.properties && f.properties.type;

    if (geomType === 'LineString') return 'route';
    if (geomType === 'Point') {
        if (type === 'spot') return 'spot';
        return 'point';
    }
    return null;
}

/**
 * 読み込み種別選択モーダルを表示し、選択結果をPromiseで返す
 */
function showImportModal(features) {
    return new Promise((resolve) => {
        const counts = { point: 0, route: 0, spot: 0 };
        features.forEach(f => {
            const cls = classifyFeature(f);
            if (cls) counts[cls]++;
        });

        document.getElementById('importPointCount').textContent = `${counts.point}点`;
        document.getElementById('importRouteCount').textContent = `${counts.route}本`;
        document.getElementById('importSpotCount').textContent = `${counts.spot}個`;

        // デフォルト: ポイントはオフ、ルート・スポットはオン
        document.getElementById('importPoint').checked = false;
        document.getElementById('importRoute').checked = counts.route > 0;
        document.getElementById('importSpot').checked = counts.spot > 0;

        const modal = document.getElementById('geojsonImportModal');
        modal.style.display = 'flex';

        const confirmBtn = document.getElementById('importConfirmBtn');
        const cancelBtn = document.getElementById('importCancelBtn');

        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };

        const onConfirm = () => {
            const selection = {
                point: document.getElementById('importPoint').checked,
                route: document.getElementById('importRoute').checked,
                spot: document.getElementById('importSpot').checked
            };
            cleanup();
            resolve(selection);
        };

        const onCancel = () => {
            cleanup();
            resolve(null);
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}

/**
 * ルート(GeoJSON)ファイルの読み込みを設定
 */
export function setupGeoJsonInput(dataLayer) {
    document.getElementById('geojsonInput').addEventListener('change', async function (e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 全ファイルのフィーチャーを収集
        const allFeatures = [];
        for (const file of files) {
            try {
                const text = await file.text();
                const json = JSON.parse(text);
                if (!json.features || !Array.isArray(json.features)) {
                    showMessage(`読み込みエラー (${file.name}): 有効なGeoJSONではありません`, 'error');
                    continue;
                }
                allFeatures.push(...json.features);
            } catch (error) {
                showMessage(`読み込みエラー (${file.name}): ${error.message}`, 'error');
            }
        }

        if (allFeatures.length === 0) { this.value = ''; return; }

        // モーダルで読み込み種別を選択
        const selection = await showImportModal(allFeatures);
        if (!selection) { this.value = ''; return; }

        // 選択に応じてフィーチャーをフィルタリングして表示
        let count = 0;
        allFeatures.forEach(f => {
            const cls = classifyFeature(f);
            if (!cls) return;
            if (!selection[cls]) return;

            const props = f.properties || {};
            const name = props.name || '';

            if (cls === 'route') {
                const latLngs = f.geometry.coordinates.map(c => [c[1], c[0]]);
                const line = L.polyline(latLngs, DEFAULTS.ROUTE_STYLE);
                if (name) line.bindPopup(name);
                dataLayer.addLayer(line);
                count++;
            } else if (cls === 'point') {
                const [lng, lat] = f.geometry.coordinates;
                const marker = L.circleMarker([lat, lng], DEFAULTS.GPS_POINT_STYLE);
                if (name) marker.bindPopup(name);
                dataLayer.addLayer(marker);
                count++;
            } else if (cls === 'spot') {
                const [lng, lat] = f.geometry.coordinates;
                const marker = L.circleMarker([lat, lng], { ...DEFAULTS.GPS_POINT_STYLE, fillColor: '#0000ff', color: '#0000ff' });
                if (name) marker.bindPopup(name);
                dataLayer.addLayer(marker);
                count++;
            }
        });

        if (count > 0) showMessage(`${count}件のデータを読み込みました`);

        this.value = '';
    });
}

/**
 * ハイキングコースのファイル出力ボタンを設定（仕様未定）
 */
export function setupExportButton() {
    document.getElementById('exportBtn').addEventListener('click', function () {
        showMessage('ハイキングコースのファイル出力は準備中です', 'warning');
    });
}
