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
 * ルート(GeoJSON)ファイルの読み込みを設定
 */
export function setupGeoJsonInput(dataLayer) {
    document.getElementById('geojsonInput').addEventListener('change', async function (e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        let totalFeatures = 0;

        for (const file of files) {
            try {
                const text = await file.text();
                const json = JSON.parse(text);

                if (!json.features || !Array.isArray(json.features)) {
                    showMessage(`読み込みエラー (${file.name}): 有効なGeoJSONではありません`, 'error');
                    continue;
                }

                json.features.forEach(f => {
                    if (!f.geometry) return;

                    if (f.geometry.type === 'LineString') {
                        const latLngs = f.geometry.coordinates.map(c => [c[1], c[0]]);
                        const line = L.polyline(latLngs, DEFAULTS.ROUTE_STYLE);
                        const name = f.properties && f.properties.name;
                        if (name) line.bindPopup(name);
                        dataLayer.addLayer(line);
                        totalFeatures++;
                    } else if (f.geometry.type === 'Point') {
                        const [lng, lat] = f.geometry.coordinates;
                        const marker = L.circleMarker([lat, lng], DEFAULTS.GPS_POINT_STYLE);
                        const name = f.properties && f.properties.name;
                        if (name) marker.bindPopup(name);
                        dataLayer.addLayer(marker);
                        totalFeatures++;
                    }
                });
            } catch (error) {
                showMessage(`読み込みエラー (${file.name}): ${error.message}`, 'error');
            }
        }

        if (totalFeatures > 0) {
            showMessage(`${totalFeatures}件のデータを読み込みました`);
        }

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
