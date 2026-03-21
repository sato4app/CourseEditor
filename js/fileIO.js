// ファイル入出力機能

import { DEFAULTS } from './constants.js';
import { showMessage } from './message.js';
import { loadExcelFile } from './excelLoader.js';

// ========================================
// ポイント・スポットのストア（ルート端点検索用）
// ========================================
// ポイントGPS (Excel): pointId -> {lat, lng}
const gpsPointStore = new Map();
// GeoJSONポイント (type=point): pointId -> {lat, lng}
const geojsonPointStore = new Map();
// スポット: [{name, lat, lng}]
const spotStore = [];

/**
 * ルート端点の座標を検索する
 * 優先順位: ポイントGPS > GeoJSONポイント > スポット(名称一致、複数なら最近傍)
 * @param {string} id - 検索するID/名称
 * @param {number} refLat - 最近傍判定の基準緯度（スポット検索時）
 * @param {number} refLng - 最近傍判定の基準経度（スポット検索時）
 * @returns {{lat, lng}|null}
 */
function findEndpoint(id, refLat, refLng) {
    if (gpsPointStore.has(id)) return gpsPointStore.get(id);
    if (geojsonPointStore.has(id)) return geojsonPointStore.get(id);

    // スポットを名称で検索
    const matches = spotStore.filter(s => s.name === id);
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // 複数一致 → 基準点に最も近いものを返す
    let nearest = null;
    let minDist = Infinity;
    for (const s of matches) {
        const d = Math.pow(s.lat - refLat, 2) + Math.pow(s.lng - refLng, 2);
        if (d < minDist) { minDist = d; nearest = s; }
    }
    return nearest;
}

// ========================================
// フィーチャー種別判定
// ========================================
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

// ========================================
// 読み込み種別選択モーダル
// ========================================
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

        const onCancel = () => { cleanup(); resolve(null); };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}

// ========================================
// ポイントGPS(Excel)の読み込み
// ========================================
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
                const pid = String(p.pointId);
                const pname = p.name || '';

                // ストアに登録（ルート端点検索用）
                gpsPointStore.set(pid, { lat: p.lat, lng: p.lng });

                // 地図に表示
                const marker = L.circleMarker([p.lat, p.lng], DEFAULTS.GPS_POINT_STYLE);
                marker.bindPopup(`${pid}<br>${pname}<br>(PointGPS)`);
                marker.on('click', () => {
                    document.dispatchEvent(new CustomEvent('gpsPointClicked', {
                        detail: { pointId: pid, name: pname }
                    }));
                });
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

// ========================================
// ルート(GeoJSON)ファイルの読み込み
// ========================================
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

        // ─── 第1パス: ポイント・スポットをストアに登録 ───
        // 選択状態に関わらず全ポイント/スポットを登録（ルート端点検索に使用）
        allFeatures.forEach(f => {
            const cls = classifyFeature(f);
            const props = f.properties || {};

            if (cls === 'point') {
                const [lng, lat] = f.geometry.coordinates;
                const id = String(props.id || props.pointId || '');
                if (id && !gpsPointStore.has(id)) {
                    geojsonPointStore.set(id, { lat, lng });
                }
            } else if (cls === 'spot') {
                const [lng, lat] = f.geometry.coordinates;
                const name = props.name || '';
                if (name) spotStore.push({ name, lat, lng });
            }
        });

        // ─── 第2パス: 選択された種別を地図に表示 ───
        let count = 0;
        allFeatures.forEach(f => {
            const cls = classifyFeature(f);
            if (!cls) return;
            if (!selection[cls]) return;

            const props = f.properties || {};
            const name = props.name || '';

            if (cls === 'route') {
                const waypointCoords = f.geometry.coordinates.map(c => [c[1], c[0]]);

                // startPoint / endPoint プロパティから開始・終了ポイントIDを取得
                const startId = props.startPoint != null ? String(props.startPoint) : null;
                const endId   = props.endPoint   != null ? String(props.endPoint)   : null;

                // 基準点: 中間点の先頭・末尾（最近傍スポット判定用）
                const refFirst = waypointCoords.length > 0 ? waypointCoords[0] : [0, 0];
                const refLast  = waypointCoords.length > 0 ? waypointCoords[waypointCoords.length - 1] : [0, 0];

                const startCoord = startId ? findEndpoint(startId, refFirst[0], refFirst[1]) : null;
                const endCoord   = endId   ? findEndpoint(endId,   refLast[0],  refLast[1])  : null;

                const fullCoords = [
                    ...(startCoord ? [[startCoord.lat, startCoord.lng]] : []),
                    ...waypointCoords,
                    ...(endCoord   ? [[endCoord.lat,   endCoord.lng]]   : [])
                ];

                L.polyline(fullCoords, DEFAULTS.ROUTE_STYLE).addTo(dataLayer);
                count++;

            } else if (cls === 'point') {
                // ポイント: 赤の円形、ポイントID + "Point"
                const [lng, lat] = f.geometry.coordinates;
                const pointId = props.id || props.pointId || '';
                const marker = L.circleMarker([lat, lng], DEFAULTS.POINT_STYLE);
                marker.bindPopup(`${pointId}<br>(Point)`);
                dataLayer.addLayer(marker);
                count++;

            } else if (cls === 'spot') {
                // スポット: 青の正方形、スポット名 + "Spot"
                const [lng, lat] = f.geometry.coordinates;
                const icon = L.divIcon({
                    className: '',
                    html: '<div style="width:10px;height:10px;background:#0000ff;border:1px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>',
                    iconSize: [10, 10],
                    iconAnchor: [5, 5]
                });
                const marker = L.marker([lat, lng], { icon });
                marker.bindPopup(`${name}<br>(Spot)`);
                dataLayer.addLayer(marker);
                count++;
            }
        });

        if (count > 0) showMessage(`${count}件のデータを読み込みました`);

        this.value = '';
    });
}

// ========================================
// ハイキングコースのファイル出力（仕様未定）
// ========================================
export function setupExportButton() {
    document.getElementById('exportBtn').addEventListener('click', function () {
        showMessage('ハイキングコースのファイル出力は準備中です', 'warning');
    });
}
